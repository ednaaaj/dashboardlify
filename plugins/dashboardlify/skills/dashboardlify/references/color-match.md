# Colour matching

How to choose, keep or repair a dashboard palette so it fits the product. The scan's PALETTE block gives the evidence (domain, primary, issues, verdict, suggested tokens). This file says what to do with it. Base ramp, status and chart values live in [color.md](color.md).

## Principles

1. Colour carries meaning: primary action, selection, data series, status. Nothing else.
2. Surfaces stay neutral but use the tinted neutral paired with the accent (palettes.md section 2). Plain black, white or untinted grey dashboards read as unfinished.
3. A grayscale-only result is a failure. The output needs at least one chromatic accent that passes contrast.
4. One hue family per product. Hue-to-hue gradients (violet to pink, blue to teal) and rainbow chart sets are the "generated" look; remove them.
5. Brand beats defaults. The domain defaults in palettes.md apply only when no brand colour exists.

## Legibility rule

Foreground must always be legible: light text on dark surfaces, dark on light; any pair under 3:1 is a bug, body text needs 4.5:1. Filled controls use white text on a fill step that reaches 4.5:1 (light and dark mode); never dark text on a mid or dark fill. Full rules 1-6 and the per-accent fill steps: [palettes.md](palettes.md#legibility-rule).

## Verdict table

The scan decides; the pass obeys.

| Verdict | Meaning (scan rule) | What the pass may do |
|---|---|---|
| KEEP | Colours are cohesive: one dominant hue family, no rainbow, no hue-to-hue gradient | Do not recolour. Only contrast fixes: darken the same hue until text hits 4.5:1, remove shadows. Never change hue, never swap the palette |
| ADJUST | Hue is usable but lightness, chroma or contrast is off, or neutrals are untinted | Hue fixed. Fix contrast, move to the paired neutral from palettes.md, re-map tokens from the scale steps |
| REPLACE | Rainbow (several unrelated hues) or a hue-to-hue gradient (violet to pink "AI" look) | Rebuild around ONE curated accent and its paired neutral. Brand known (theme-color, CSS variable, logo): ask before changing the hue. Brand unknown: propose the domain default from palettes.md and state why |

If the scan was skipped (`--no-palette`), treat the verdict as unknown, behave as KEEP, and say so.

## Domains and palettes

Domain defaults, accent and neutral pairs, key tokens in light and dark, chart sets and contrast numbers live in [palettes.md](palettes.md) (data: [palettes/palettes.json](palettes/palettes.json)). They are the source of truth; do not derive or invent hex values. The domains are: finance/payments, health/clinic/dental/lab, logistics/ops, analytics/BI, e-commerce, devtools, HR/people, CRM/sales, education, security, energy/IoT, general admin, real estate/property, insurance, travel/hospitality, food/restaurant, legal/compliance, marketing/ads, crypto/web3, media/content, nonprofit/community, government/public sector, agriculture/farming, manufacturing/industrial, fitness/wellness, construction/field-ops, telecom/network, gaming/esports. Each has three combos (calm, paper, brand) with page, brand and ink zones in [palettes/combos.md](palettes/combos.md); detection keywords live in palettes.json. Use the default only when no brand colour exists.

## Using the palettes

1. Brand known: keep the brand hue. Pick the paired neutral and the chart set from palettes.md. Only the brand colour itself may be darkened until text reaches 4.5:1.
2. No brand: take the domain row (accent, neutral, two alternates) and its key tokens, light and dark.
3. Map scale steps to tokens with the rule table in palettes.md section 4; use the contrast-safe fill step (white text on it >= 4.5:1), never white text on a failing solid and never dark text on a mid-tone fill.
4. Charts: one accent plus neutral series first; categorical sets and sequential ramps are in palettes.md section 5.
5. Status stays on its own scales (success green, warning amber, danger red, info blue), used only for status and never by colour alone.

## Zones and combos
A screen is not white versus black. Pick a combo (palettes.md sections 9 and 10): `calm` for dense data and ops, `paper` for warm or consumer-facing products, `brand` for brand-heavy products. Zones: paper page (tinted, not pure white), brand zone (accent fill, light foreground) for sidebar, header or hero, ink zone (dark neutral, light foreground). At most two non-page zones per screen; data surfaces stay on page or surface zones. Brand colour known: keep its hue and use the nearest scale.
## Dark mode

Use the `dark` arrays from [palettes.md](palettes.md#6-dark-mode) (section 6). Never lighten by formula or invert light values. Filled controls keep white text on the dark-mode fill step. If the app already has a working dark mode, preserve it and only map tokens.

## Color brief

Print this before any recolour, in every mode:

```
Color brief
Domain:    <name> (confidence <low|med|high>; signals: <a, b, c>)
Verdict:   <KEEP|ADJUST|REPLACE>
Primary:   <hex> (source: brand-hint | dominant | none)
Issues:    <list from the scan, or "none">
Proposed tokens (one reason each):
  --accent-base     <hex>  <reason>
  --accent-hover    <hex>  <reason>
  --accent-text     <hex>  <reason> (accent step 11, or step 12 when step 11 on the paired neutral's step 2 is under 4.5:1)
  --accent-subtle   <hex>  <reason>
  --neutral-50..950 paired neutral <name>  <reason>
  --chart-1..5      <hex...>  <reason>
Combo:     calm|paper|brand (and why)
Zones used: <page, brand, ink: which regions use which zone>
Contrast:  white on accent-base <n>:1 | accent-text on surface <n>:1
Legibility: every filled control white-on-fill >= 4.5, min text contrast <X>:1 (all text pairs >= 3:1, body >= 4.5:1)
Changes only if verdict is ADJUST or REPLACE
```

For KEEP, list the proposed tokens as "unchanged" and show only contrast fixes.

## Worked examples (illustrative)

Dental-lab dashboard, verdict ADJUST. Domain: health/lab (high; signals: patient, case, sample). The existing teal is close to the curated teal, but white on its fill is under 4.5:1 and the neutrals are pure grey. Move to curated teal + sage: light fill #008573 (step 11, white text), dark fill #207e73 (step 8, white text), accent text step 12 on the surface in light mode. Values from palettes.json; the hue stays teal because the product already reads teal.

Finance dashboard with a violet-to-pink gradient and rainbow charts, verdict REPLACE. Domain: finance (high; signals: invoice, payout, ledger). No brand colour found, so use the curated default blue + slate: light fill step 11 #0d74ce with white text (4.7:1), dark fill step 8 #2870bd. Remove the gradient. Charts: the accent fill first, then colourblind-safe set colours away from the accent hue; one accent plus neutral series is preferred. If a theme-color or logo existed, ask before changing the hue.
