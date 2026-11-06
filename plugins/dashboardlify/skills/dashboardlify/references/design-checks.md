# Design checks (`--design`)

A page can have clean spacing and still read as flat, noisy or hard to scan. `scan.mjs --design` adds seven opt-in checks (six feed the DESIGN verdict, phone size has its own line) for that. Each one is a general design principle turned into a number you can re-measure after a change.

These are heuristics read from computed styles. Scan output is evidence, not a verdict: a hit says "look here", and a screenshot or the product's intent can overrule it. The flag works alone and together with `--status` or `--inventory`. Without `--design` nothing in the scan output changes.

```
node scripts/scan.mjs page.html --design
DESIGN FIX  (accent orange in 1 role, 1 button fill, 4 hues, type 2.29x (1 style near largest), neutral ~99%, grouping 16x, loud 1)
- <rule>: <numbers> -> CSS fix (Mode B) | markup fix (Mode C brief) (design-checks.md)
advisory: squint: ...

PHONE OK|FIX|SKIP  (...)
```

The DESIGN verdict is `FIX` when any of the six rules fires, `OK` when none does, and `NONE` when the page has fewer than 5 text elements (nothing to judge). The squint line is advisory and never changes it. `PHONE` is reported separately and never changes the DESIGN verdict. JSON: `design` and `phone` per target, `aggregate.design` and `aggregate.phone`. `--compare` prints `Design: X -> Y` and `Phone: X -> Y`.

## The checks

### 1. Colour roles: `accent-no-job`, `primary-button-styles`

Idea: one primary colour, one accent, neutrals for everything else, status colours kept apart. An accent that does every job stops pointing at anything.

- Hue families are 30-degree buckets in HSL. A colour counts as chromatic at saturation 0.25 or more and lightness 0.10 to 0.92 (very dark and pastel tints count as neutral).
- The accent is the hue with the most area among six roles: button, link text, active nav item, chart series, badge/pill fill, border/ring.
- `accent-no-job` fires when that one hue serves more than 3 of the 6 roles. The detail lists the roles.
- `primary-button-styles` fires when more than one filled-button fill (rounded to a 16-step grid, so near-identical shades merge) exists outside destructive and status buttons.
- Summary also shows `neutral ~N%`: the share of text and fill area (element box, or glyph-box estimate for text) that is neutral. Where an opaque box holds other opaque boxes (a card on a page), the inner boxes' area is subtracted from the outer one. Text area is added on top of its background, and images and shadows are ignored, so treat it as approximate, a trend and not a measurement.

### 2. Focal point: `no-focal-point`

Idea: three levels of size, one dominant thing, a middle tier, a small tier. If everything is the same size nothing leads; if several different styles share the top size they compete.

- Text sizes come from every visible element with its own text. The median is character-weighted, so body copy sets the baseline.
- Fires when the largest size is under 1.5x the median, or when 5 or more differently styled text elements sit within 10% of the largest size. Elements with the same tag and class (a row of identical KPI cards) count once; the detail also reports how many elements in all.
- Fix is usually markup or hierarchy work (Mode C), not a value pass.

### 3. Hue count: `too-many-hues`

Idea: neutrals give the eye room, and an accent only stands out against restraint.

- Counts hue families (30-degree buckets) that carry at least 4% of the chromatic weight, text, fills, borders and gradient stops included.
- Excluded: elements recognised as status labels (status/danger/success class, a short state word, a signed delta such as +4%, destructive actions) and chart series (SVG paint and bar/series/segment elements).
- Fires above 3 families. The detail lists each hue with its share.
- Because it is area-weighted, a rainbow of tiny elements can pass and a large coloured surface dominates. A page whose only colourful part is its chart is not flagged.

### 4. Closeness: `weak-grouping`

Idea: things that belong together sit closer than things that do not.

- Outer gap: median distance between neighbouring cards (an element with a border, shadow or its own fill that holds text). Inner gap: median vertical distance between stacked items inside a card (heading to value to note). Padding is not counted.
- Fires when outer / inner is under 1.5. Needs at least one card pair and 3 inner gaps, otherwise the ratio shows `-`.

### 5. Phone size: `phone-size` (own `PHONE` line)

Idea: test at the size people actually use.

- The page's `<meta name="viewport">` is read first. Without `width=device-width` the line is `PHONE SKIP (page declares a desktop viewport or none)` and nothing is measured: a page that never asked to be laid out for a phone is not judged as if it had.
- Otherwise the window is set to 390 x 844 and measured. This runs after everything else (including `--shot`), because resizing can make a page's own scripts react (collapse a sidebar, swap markup). The page is not reloaded afterwards; the next target navigates fresh. Screenshots with and without `--design` are the same.
- Counts text under 12px, buttons / inputs / selects / standalone links with a side under 40px, and whether the page scrolls sideways, with the widest elements and whether a table overflows. Inline links inside a sentence are exempt.
- `PHONE FIX` when the page scrolls sideways, or there are 3 or more tiny texts, or 3 or more small targets; otherwise `PHONE OK`.
- A page that declares `device-width` but has no phone layout is measured honestly and will fail. Whether a desktop-only product needs a phone layout is a product decision (KEEP or ASK).

### 6. Emphasis budget: `contrast-overspent`

Idea: the strongest contrast belongs to the most important thing. If everything shouts, nothing does.

- Counts top-tier elements: filled buttons that are not destructive, solid saturated badges (lightness 0.65 or less), and bold (600+) text of 20px or more in an accent colour. Status-labelled elements are skipped.
- Fires above 3. The detail names up to 4 examples.

### 7. Squint (advisory)

Idea: blur your eyes and see what is still there.

- The first-screen screenshot is shrunk to 160px wide. Each 8px cell scores how far its pixels are from the page's most common luminance. The heaviest 5 x 3-cell window is reported as a position and size in percent of the first screen, what it holds (the biggest text or filled box under it, by tag and class, with a text snippet), and whether it covers any text within 10% of the largest text size (the same set `no-focal-point` uses), naming the one it covers.
- A heavy region that does not cover a largest-size text is a hint, nothing more: a dark sidebar or banner is legitimately heavy. Never counted in OK/FIX.

## How the AI decides

Run `--design` together with `--status`. For every finding choose exactly one of three and write the choice down:

- **CHANGE.** The evidence is real (confirm it in a screenshot or the source) and the fix fits the current mode. Apply the smallest fix: fold a fourth role of the accent back to neutral, give secondary buttons the same fill, step the headline up a tier, raise the card gap, quiet the extra filled badges. For `too-many-hues`, demoting a hue to neutral is a CHANGE; recolouring any hue to another hue is ASK. Mode B changes values only; hierarchy or markup fixes go to the Mode C brief.
- **KEEP.** State the reason, for example a deliberate brand accent used widely, a single-hue brand, a desktop-only product for `phone-size`, a dark sidebar that explains the squint result, or a row of equal KPI cards on purpose. Leave the code alone.
- **ASK.** The fix needs a brand or intent decision (which of the competing hues is the brand, whether the product must work on phones, which button is the primary action). Ask once. Never change identity (font family, sidebar colour, accent hue) in Mode B.

Rules:

1. Never change anything on scan output alone when a screenshot or the context contradicts it (a hue the scan counted is actually a status colour; the "second button style" is a disabled state).
2. Report a decision per finding, in a table: rule, evidence, CHANGE / KEEP / ASK, what was done or why not. `PHONE` gets a row only when it is FIX.
3. After changes, re-run `--design` and report `Design: X -> Y`. A finding that remains because it was KEEP or ASK is not a failure.
4. Do not tune a threshold to get an OK. If the scan looks wrong for a page, say so and explain.

## Limits and false-positive risks

- HSL buckets split a hue family that straddles a boundary (blue at 239 and 241 degrees) into two families.
- Area weighting favours large surfaces; small rainbow details pass.
- Status detection is by class name and short text, so unlabelled status colours (a bare red number) can count as a normal hue.
- `no-focal-point` can fire on dashboards that rely on a row of equal KPI cards with the page title as the only dominant element, if the title is small.
- `weak-grouping` depends on what counts as a card; tables, list rows and unbordered layouts are mostly not seen.
- `phone-size` measures a resized window, not a real phone: no touch, no device pixel ratio, media queries only; the resize can trigger the page's own resize scripts.
- The character-weighted median misbehaves with very little text: a 5-character heading next to four 1-character paragraphs makes the heading the median. `NONE` below 5 text elements only partly protects against this.
- Neutral share is approximate (see above); on mostly neutral pages it reads high by design.
- The phone check needs a viewport meta; pages that size themselves in other ways are skipped.
- The squint pass uses the first screen as rendered at scan time; animations in flight can shift it.
- Colour roles are inferred from tags and class names; an `a` styled as a button is read as a button only when its class contains btn or button.
