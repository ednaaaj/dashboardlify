---
name: dashboardlify
description: Build, tighten, arrange and rework dashboards, admin panels, analytics views, back-office screens, data tables and settings pages with numeric tokens for spacing, type, radius, colour, shadow and motion. Use when building, restructuring, rearranging the layout of, reviewing or polishing any of these, when a screen "looks generic", "messy" or sloppy, when a tidy-up changed nothing visible, or when asked to tighten, arrange, reposition, make it look designed, show a before/after or convert data to charts. Measures first, proves the change is visible, then edits.
---

# dashboardlify

Numeric, token-driven dashboard design. Every size, color, radius, shadow and duration comes from a token. No invented values.

## Modes

| Mode | Use for | Scope |
|---|---|---|
| A: BUILD | New dashboard | Whole screen from tokens |
| B: TIGHTEN | Existing dashboard | Styling only (CSS, no JSX/behavior change). Whole app by default, changes must be visible |
| C: REWORK | Existing dashboard | Structure, hierarchy, charts, compression. May change JSX. Needs user approval of a brief before any code edit |
| D: ARRANGE | Existing dashboard | Layout via CSS only: shell size, hero height, card grid, order, padding, icon tiles. No JSX. Recipes in [layout-recipes.md](references/layout-recipes.md) |

Choosing: "tighten / tidy up / polish / tokens" -> B. "move / position / layout / looks messy / still the same" -> D. "rework / restructure / transform / make it better" -> C. If D reports issues that only JSX can fix, continue in C. Unclear -> run the scan and let the verdict decide, else ask once.

## Triage first

Before editing an existing screen, measure it: `node <skill dir>/scripts/scan.mjs <url|file.html>... [--json f] [--compare before.json] [--dark] [--width n] [--shot f.png] [--visible-change before.png] [--height px] [--no-layout] [--combo calm|paper|brand] [--inventory] [--status] [--storage-state f.json] [--block pat]`. `--combo` picks the colour combo reported in the PALETTE block (calm: dense data, paper: warm or consumer, brand: brand-heavy). Use `--src <dir>` for a source-only estimate when nothing can be rendered; it also prints a ROLES block (roles, guards, routes). `--inventory` adds an INVENTORY block (`FIT` or `SWAP`): per component, whether it fits the data shape (rules in [metric-to-visual.md](references/metric-to-visual.md) "Component fit"). `--status` implies `--inventory` and adds fit rules for status columns, long lists, dates, people and KPI context, plus a `STATUS OK|FIX|NONE` block (rules in [status.md](references/status.md), [content.md](references/content.md); English-only, heuristic: confirm hits by hand). `--storage-state` loads a test login from a file kept outside the repo; `--block <pattern>` forces the error or empty state. Needs Node 22 and Chrome, no installs.

| Score | Verdict | Action |
|---|---|---|
| < 8 | LEAVE | Say it is already tight; offer at most 3 refinements with exact values. Never change a good screen just to change it |
| 8-35 | TIGHTEN | Mode B |
| > 35 | REWORK | Mode C |

The scan gives two verdicts. The value verdict (table above) measures sizes, colours, radii and spacing. The LAYOUT verdict measures position and hierarchy: top bar and hero height, equal-weight cards, icon tiles, placeholder widgets, truncated text, data above the fold. OK = score under 3, or only low-weight JSX notes. ARRANGE = score 3 or more and fixable by CSS, even if some JSX-only notes remain. REWORK = JSX-only high-weight issues dominate (score 14+ with 2 or more JSX issues, or score 5+ with a weight 2+ JSX-only issue). TIGHTEN alone will not change positions or hierarchy. When the layout verdict is worse than the value verdict, the scan's NEXT line points to Mode D (ARRANGE) or C (REWORK).

Visible-change gate: every TIGHTEN or ARRANGE run saves a before screenshot (`--shot before.png`) and ends with `--visible-change before.png`. VISIBLE (>= 8% of the first screen changed) is success. SUBTLE (3-8%) is reported as subtle. Under 3% say "not visible" and never claim success; INCOMPARABLE (screenshots of different width, exit 1; same width with different height is cropped) is not success either. `--shot` and `--visible-change` must be different paths (exit 2 if equal); diagnose: override lost on specificity or import order, wrong files, dead CSS, or the problem is layout and not values.

Any INVENTORY SWAP routes the work to Mode C: the brief lists the component swaps per rule. STATUS FIX with css issues goes to Mode B (colour values only); STATUS jsx issues go to the Mode C brief. A screen is more than one page and one role: survey pages x roles x states first ([survey.md](references/survey.md)) and measure each reachable cell with `--inventory`.

The scan output is evidence, not a ruling. When the verdict surprises you (a tiny page scoring high, a messy one scoring low), say so and explain before acting.

## Color decision

For any existing screen, the scan prints a PALETTE block (domain, primary, issues, verdict). Read it before touching colour, then follow [color-match.md](references/color-match.md):

- KEEP: colours are cohesive. Do not recolour; only contrast fixes (darken the same hue) and shadow removal.
- ADJUST: keep the hue, fix lightness, chroma and contrast, tint neutrals toward it.
- REPLACE: rainbow or hue-to-hue gradient. Rebuild around ONE hue: brand known (theme-color, CSS variable, logo) -> ask before changing the hue; brand unknown -> propose the domain default from [palettes.md](references/palettes.md) and say why.
- Suggest colours from references/palettes.md (curated scales), not invented values; only a brand colour may be darkened with the contrast fit.
- Foreground must always be legible: light text on dark surfaces, dark on light; filled controls use white text on a fill step that reaches 4.5:1, never dark text on a mid or dark fill.
- Choose a combo (calm, paper or brand) and its zones: a tinted paper page, at most one brand-filled and one ink zone for chrome, light foreground on the dark zones, data surfaces on page or surface ([palettes/combos.md](references/palettes/combos.md)).
- Never output greyscale only: at least one chromatic accent, neutrals tinted toward it.
- Print the Color brief (format in color-match.md) before any recolour. Ask only when REPLACE might change a known brand colour.

The palette verdict is separate from LEAVE/TIGHTEN/REWORK. `--no-palette` skips it (then treat as KEEP).

## Direction in three lines

Derive these from the repo (package name, copy, existing theme); ask only when there is no brand to read.

1. Product and audience, in one sentence.
2. Density (compact / default / comfortable) and preset (crisp / soft), with the reason.
3. Accent: the brand colour if the repo has one (darkened for text when contrast is < 4.5:1), otherwise the domain default accent from [palettes.md](references/palettes.md).

Mode B never waits for an answer. Mode C states them in the brief. Mode A states them before building.

## Style presets

Pick one preset per product. Never mix.

- `crisp` (default): radius max 8, hairline borders, no shadows.
- `soft`: cards radius 12/16, pill controls, tinted container behind cards. See the `data-style="soft"` section in [references/tokens.md](references/tokens.md).

In soft, cards may use radius up to 16 and controls may be pill-shaped. Every other rule (4px spacing scale, one accent, motion) is unchanged.

## Reading order

1. [scripts/scan.mjs](scripts/scan.mjs) - measures a rendered page or a source dir, prints a verdict, the PALETTE and LAYOUT blocks. B, C, D
2. [references/tokens.md](references/tokens.md) - scales (space, type, radius, shadow, motion). All modes
3. [references/layout.md](references/layout.md) - shell, grid, page widths. A, C, D
4. [references/layout-recipes.md](references/layout-recipes.md) - CSS fixes per LAYOUT issue, hierarchy checklist. D, C
5. [references/density.md](references/density.md) - compact / default / comfortable. A, C
6. [references/color.md](references/color.md) - neutral ramp, one accent, status colors. All modes
7. [references/color-match.md](references/color-match.md) - palette verdict KEEP/ADJUST/REPLACE, Color brief. All modes
8. [references/palettes.md](references/palettes.md) - curated colour scales, domain defaults, tokens, contrast-safe fills, chart sets, zones and combos (generated table: [references/palettes/combos.md](references/palettes/combos.md)). All modes
9. [references/render-only.md](references/render-only.md) - which regions earn a place, caps, cut list. A, C (B lists cut candidates only)
10. [references/components.md](references/components.md) - cards, tables, forms, charts, states, detail rules. All modes
11. [references/status.md](references/status.md) - status word to tone, pill, capacity bands. B (values), C
12. [references/content.md](references/content.md) - page summary, KPI context, dates, grouping. C
13. [references/identity.md](references/identity.md) - typeface, sidebar and accent presets; user chooses. C
14. [references/motion.md](references/motion.md) - allowed transitions. All modes
15. [references/tokens.css](references/tokens.css) - copy these variables, do not retype values. All modes
16. [references/anti-slop.md](references/anti-slop.md) - patterns to avoid + fix. All modes
17. [references/copy.md](references/copy.md) - opt-in copy pass (`--copy`). B
18. [references/redesign.md](references/redesign.md) - the full rework procedure. C
19. [references/measure.md](references/measure.md) - measuring the existing UI by hand. C
20. [references/metric-to-visual.md](references/metric-to-visual.md) - which visual fits which metric, plus the scan's component-fit rules. A, C
21. [references/patterns.md](references/patterns.md) - proven dashboard patterns. A, C
22. [references/examples/](references/examples/) - linear, vercel, stripe, supabase, posthog, mercury, attio, shadcn. Pick 1-2 closest to the product
23. [references/stack.md](references/stack.md) - which free libs to add (icons, charts, table, menus) and which to skip. A, C
24. [references/survey.md](references/survey.md) - pages x roles x states matrix, auth rules, per-cell evidence. C, improve
25. [checklist.md](checklist.md) - verify before done. All modes

## Hard rules

1. One accent color. Everything else tinted neutral.
2. Neutral-first palette, tinted toward the accent hue (never plain grey, never grayscale-only). Color only for status, selection, primary action, data.
3. 4px spacing scale (0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64). No 10px, 14px, 18px, 22px spacing (13/14px are font sizes only).
4. Radius by preset. crisp: radius max 8 on cards (4-6 controls); soft: cards 12-16, controls 8-full; never above 16 except full.
5. Borders over shadows. 1px border; shadow only on floating layers (menu, modal, popover).
6. One font family. Max 3 sizes per region, 2-3 weights total.
7. Motion 120-220ms via `--dur-fast/base/slow` (120/160/220); chart first-load draw-in is the one exception, max 300ms; nothing over 300ms. Movement animates transform/opacity only (never width/height/top/left/margin); color/background-color/border-color fades are allowed for hover/focus. Skeleton shimmer is the only permitted loop (loading only, off under prefers-reduced-motion). No bounce, spring, parallax, count-up, stagger.
8. Foreground always legible: light on dark, dark on light; filled controls use white text on a fill step that reaches 4.5:1, never dark text on a mid or dark fill.
9. No decoration for its own sake: no gradients, glass, emoji icons, illustrations that carry no info.

## Mode A: BUILD (new dashboard)

1. Read tokens.md and layout.md.
2. State the three-line direction. Pick density (compact for tables/ops, default for mixed, comfortable for settings) and preset (crisp or soft). State both.
3. Pick the palette: the brand colour if present, otherwise the domain default in [palettes.md](references/palettes.md). Print the Color brief.
4. Choose the contents with [render-only.md](references/render-only.md): every region names its decision; respect the caps.
5. Import tokens.css. Use `var(--...)` only. No raw px/hex in components.
6. Build shell (sidebar + topbar + content max-width), then page, then components.
7. Add empty, loading (skeleton), error states for every data region.
8. Run checklist.md.

## Mode B: TIGHTEN (existing dashboard)

Behavior stays identical (no JSX, props, routes or data changes). Do not redesign layout unless asked.

Scope: unless the user names one file, the scope is the WHOLE APP: shell (sidebar, topbar, breadcrumb, page wrapper), the home dashboard and every routed page. List all pages and their CSS first, then process all of them. Never stop after one file.

Visible, not cosmetic: snapping 30px to 24px is not enough. A pass must change what the eye sees:
- type: collapse font sizes to the scale, uppercase body/buttons/tabs/table text to sentence case, weights 400/500/600, page title 20-24/600
- icons: one size per context (nav 16, buttons 14-16, KPI 16-20), outline weight, no 28px+ solid glyphs in nav; KPI icon wells 32px squares
- density: topbar 48-56px, nav item 32-36px, table row 40px with nowrap + ellipsis (inside overflow-x containers), card padding 16-20, page padding 24
- radius, color, shadow, motion: as the hard rules
Status colours: when the scan reports STATUS FIX with css issues, apply the word-to-tone mapping from [status.md](references/status.md) as values only. Mode B never changes font family, sidebar colour or accent hue ([identity.md](references/identity.md) is a Mode C decision).
Component libraries (MUI/JSS, Bootstrap) override single-class CSS: raise specificity (e.g. `body .MuiButton-root`) in a bridge file instead of adding `!important`.

If the tokens file (or a bridge mapping the app's own variables to the skill tokens) is not imported at the app entry, add it first. Keep dark mode working: map to the app's own variables when it has them.

Also list cut candidates per [render-only.md](references/render-only.md) in the report; delete nothing.

Finish with a per-file report (before -> after counts: font sizes, radii, hex colors, off-scale spacing, uppercase rules). A file that changed fewer than 5 values needs a reason. List what was NOT covered. If the result would be hard to see, say so and recommend Mode C.

Pass order. Finish each pass across the whole app before starting the next:

1. Scan and token bridge: run the scan (Triage first), save `before.json`, then import tokens.css or the bridge at the app entry.
2. Spacing: onto the 4px scale.
3. Type and case: scale sizes, sentence case, weights.
4. Colour and shadow: obey the palette verdict (KEEP = do not recolour; ADJUST = keep hue, fix L/C/contrast, tint neutrals; REPLACE = one hue per color-match.md), one accent, remove card shadows. Print the Color brief first.
5. Icons: one size per context.
6. Radius and borders: few distinct radii, 1px neutral borders.
7. Detail rules: [components.md](references/components.md) "Detail rules".
8. Motion: token durations, no `transition: all`, no loops.
9. Copy: only with `--copy`, per [references/copy.md](references/copy.md). Otherwise copy and JSX stay untouched.
10. Re-scan with `--compare before.json`, run checklist.md, write the per-file report with the delta table.

Render budget: screenshot or re-scan at most 3 times per run. Start the scan and screenshots early, in parallel with reading files.

Source greps for the passes (exclude `references/tokens.css`). Allowed exceptions, not violations: `rounded-full` (avatars/pills), font-size 13px (table) and 14px (body) from the type scale, `box-shadow` on overlays only (popover/modal), skeleton shimmer `gradient`/`keyframes`:
- radius (`rounded-full`/50%/9999px allowed for avatars, pills and, in soft, controls; drop 9999px hits after matching): crisp (flag > 8px) `border-radius:\s*(9|[1-9][0-9]+)(\.[0-9]+)?px`; soft (flag > 16px) `border-radius:\s*(1[7-9]|[2-9][0-9]+)(\.[0-9]+)?px`; Tailwind: crisp flag `rounded-(xl|2xl|3xl)`, soft allow xl (12)/2xl (16), flag `rounded-3xl`
- shadow: `shadow-(lg|xl|2xl)`, `box-shadow`, colored shadows
- color: `#[0-9a-fA-F]{3,8}`, `gradient`, `bg-(purple|indigo|violet|pink)`
- spacing (off-scale values only): `(padding|margin|gap|inset|top|left|right|bottom)[^;]*\b(10|14|18|22|26|30)px`, `p-\[`, `gap-\[`, `m-\[`
- motion (run both; review hits, shimmer and chart draw-in are the allowed exceptions): `rg -n '(transition|animation)(-duration)?:[^;]*[0-9.]+m?s' | rg -v 'var\(--dur-'` and `rg -n 'duration-[0-9]+|transition-all|transition:\s*all'`, plus `bounce|spring|keyframes`
- type: `text-(4xl|5xl|6xl)`, `font-(black|extrabold)`

List violations as `file:line | found | token replacement`. Replace one rule at a time, smallest diff. Fix missing states and contrast (< 4.5:1) found along the way. Confirm zero hits and no behavior change (props, handlers, data untouched).

## Mode D: ARRANGE (existing dashboard, layout via CSS)

Full procedure: [commands/arrange.md](../../commands/arrange.md). Summary:
1. Scan with `--shot before.png --json before.json`; read the LAYOUT block.
2. Map each issue id to its recipe in [layout-recipes.md](references/layout-recipes.md).
3. Find the real selectors (grid or flex parent of the cards, hero, top bar, sidebar). Issues blocked by wrapper divs, inline styles or utility classes are marked "needs JSX -> Mode C".
4. Apply in order: shell, hero cap (120-160px), card grid reflow, card padding, icon tiles, truncation. On legacy stacks raise specificity or use a late-imported bridge file; no `!important` unless the original uses it.
5. Re-scan with `--compare before.json --visible-change before.png`. Must reach VISIBLE (>= 8%) or the report says why not.
6. Report per issue before/after numbers, files and selectors, issues left for JSX, screenshot paths.

No JSX, props, routes or data changes. Class names and text stay. DOM order stays the reading order. Single-column fallback under 900px. Dark mode intact.

## Mode C: REWORK (existing dashboard, structure may change)

Steps (same numbering as redesign.md):
1. Context: product, users, the 3 decisions the screen supports, data shape.
2. Map: regions, components, metrics, current visual per metric. Run the survey ([survey.md](references/survey.md)) and `--inventory` on each reachable cell; the brief lists component swaps per fired rule, and the status ([status.md](references/status.md)), content ([content.md](references/content.md)) and identity changes. Identity ([identity.md](references/identity.md)): show the 2-3 presets with a one-line rationale each and wait for the user; never apply one silently. Built from screenshots only when Assessment A will run.
3. Two isolated assessments: A = blind design review (screenshots only, no source or class names), B = mechanical scan (greps, measure.md, contrast, histograms). Sub-agents are mandatory whenever a sub-agent/Task tool exists; A finishes and is recorded before any B output enters the synthesis. If run inline, the FIRST line of the report is `DEGRADED: single-context (<reason>)`.
4. Audit against checklist.md and anti-slop.md (redesign.md audit checks #1-18), plus the palette verdict and the render-only cut list. Label detector false positives explicitly.
5. Brief: spatial thesis, region order (reading path), visual per metric, preset, density, Color brief, P0-P3 changes, "Removed or moved" table (from the render-only cut list).
6. Approval gate: stop and wait for the user.
7. Apply: one region at a time.
8. Verify: re-measure, checklist.md.

Hard safety rules:
1. Never edit code before the brief is approved.
2. Behavior unchanged: props, handlers, data flow, routes. Build and tests pass.
3. One region per pass. Re-screenshot between passes.
4. Report findings ranked P0-P3.

## Output

Every mode that touches colour: the Color brief.
Mode A/B: files changed, scan delta (B), violations fixed by rule, anything left and why.
Mode C: which status and fit rules fired and which were fixed, per-cell report (page, role, state, evidence rendered / source-checked / not covered with reason), scan table, ranked findings (P0-P3), approved brief, files and every JSX change listed, before/after counts (cards, colors, radii, font sizes, borders), build/test result.
