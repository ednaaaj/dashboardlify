---
name: dashboardlify
description: Build, tighten and rework dashboards, admin panels, analytics views, back-office screens, data tables and settings pages with numeric tokens for spacing, type, radius, colour, shadow and motion. Use when building, restructuring, reviewing or polishing any of these, when a screen "looks generic", "AI-made" or sloppy, or when asked to tighten it, tidy it up, make it look designed, show a before/after, transform it, or convert data to charts. Measures first, matches colour to the product, renders only what earns its place, then edits.
---

# dashboardlify

Numeric, token-driven dashboard design. Every size, color, radius, shadow and duration comes from a token. No invented values.

## Modes

| Mode | Use for | Scope |
|---|---|---|
| A: BUILD | New dashboard | Whole screen from tokens |
| B: TIGHTEN | Existing dashboard | Styling only (CSS, no JSX/behavior change). Whole app by default, changes must be visible |
| C: REWORK | Existing dashboard | Structure, hierarchy, charts, compression. May change JSX. Needs user approval of a brief before any code edit |

Choosing: "tighten / tidy up / polish / tokens" -> B. "rework / restructure / transform / change the layout / make it better" -> C. Unclear -> run the scan and let the verdict decide, else ask once.

## Triage first

Before editing an existing screen, measure it: `node <skill dir>/scripts/scan.mjs <url|file.html>... [--json f] [--compare before.json] [--dark] [--width n]`. Use `--src <dir>` for a source-only estimate when nothing can be rendered. Needs Node 22 and Chrome, no installs.

| Score | Verdict | Action |
|---|---|---|
| < 8 | LEAVE | Say it is already tight; offer at most 3 refinements with exact values. Never change a good screen just to change it |
| 8-35 | TIGHTEN | Mode B |
| > 35 | REWORK | Mode C |

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

1. [scripts/scan.mjs](scripts/scan.mjs) - measures a rendered page or a source dir, prints a verdict and the PALETTE block. B, C
2. [references/tokens.md](references/tokens.md) - scales (space, type, radius, shadow, motion). All modes
3. [references/layout.md](references/layout.md) - shell, grid, page widths. A, C
4. [references/density.md](references/density.md) - compact / default / comfortable. A, C
5. [references/color.md](references/color.md) - neutral ramp, one accent, status colors. All modes
6. [references/color-match.md](references/color-match.md) - palette verdict KEEP/ADJUST/REPLACE, Color brief. All modes
7. [references/palettes.md](references/palettes.md) - curated colour scales, domain defaults, tokens, contrast-safe fills, chart sets, zones and combos (generated table: [references/palettes/combos.md](references/palettes/combos.md)). All modes
8. [references/render-only.md](references/render-only.md) - which regions earn a place, caps, cut list. A, C (B lists cut candidates only)
9. [references/components.md](references/components.md) - cards, tables, forms, charts, states, detail rules. All modes
10. [references/motion.md](references/motion.md) - allowed transitions. All modes
11. [references/tokens.css](references/tokens.css) - copy these variables, do not retype values. All modes
12. [references/anti-slop.md](references/anti-slop.md) - patterns to avoid + fix. All modes
13. [references/copy.md](references/copy.md) - opt-in copy pass (`--copy`). B
14. [references/redesign.md](references/redesign.md) - the full rework procedure. C
15. [references/measure.md](references/measure.md) - measuring the existing UI by hand. C
16. [references/metric-to-visual.md](references/metric-to-visual.md) - which visual fits which metric. A, C
17. [references/patterns.md](references/patterns.md) - proven dashboard patterns. A, C
18. [references/examples/](references/examples/) - linear, vercel, stripe, supabase, posthog, mercury, attio, shadcn. Pick 1-2 closest to the product
19. [references/stack.md](references/stack.md) - which free libs to add (icons, charts, table, menus) and which to skip. A, C
20. [checklist.md](checklist.md) - verify before done. All modes

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

## Mode C: REWORK (existing dashboard, structure may change)

Steps (same numbering as redesign.md):
1. Context: product, users, the 3 decisions the screen supports, data shape.
2. Map: regions, components, metrics, current visual per metric. Built from screenshots only when Assessment A will run.
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
Mode C: scan table, ranked findings (P0-P3), approved brief, files and every JSX change listed, before/after counts (cards, colors, radii, font sizes, borders), build/test result.
