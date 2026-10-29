# REDESIGN procedure

Entry point for restructuring an existing dashboard. Parent: [SKILL.md](../SKILL.md). Final gate: [checklist.md](../checklist.md).

## When to use

| Mode | Scope | Touches |
|---|---|---|
| UNSLOP | token swap: colors, radius, type, spacing values | CSS only |
| REDESIGN | structure: grouping, hierarchy, metric visuals, placement, compression | CSS, and JSX when needed |

Dashboards are OPERATE surfaces: predictable structure, stable density, same place every visit. Redesign for scan speed, not novelty.

**Safety rule (hard):** NEVER edit code before the user approves the brief (Step 5). Behavior must not change: props, handlers, data flow, routes, a11y roles/labels, keyboard order. If a proposal needs new data or new behavior, list it under "needs data" and do not build it unasked.

## Step 0 - Context

Ask at most 3 questions, only for what the code and screenshot cannot answer:
1. Who uses it, how often (daily operator vs weekly exec)?
2. The one primary task or action (approve, triage, monitor, export)?
3. Constraints: framework, UI lib (MUI, Bootstrap, shadcn), dark mode, brand color?

Then pick: preset `crisp` (radius 4-8, hairline borders) or `soft` (radius 12-16, tinted surfaces); density per [density.md](density.md). Tokens: [tokens.md](tokens.md).

## Step 1 - Map

Measure every region: x, y, w, h, % of viewport, gap to each neighbor. Source: screenshots at 1440 and 390 ONLY when Assessment A will run (the map must not be seeded by [measure.md](measure.md) `regions`). `regions` is allowed only on the degraded path or after A is recorded.

| Region | x | y | w | h | %vp | gap to next | Pinned |
|---|---|---|---|---|---|---|---|

Then check:
- Shared left edges (target <=6 distinct), gutters identical (one value), column count (12 or 4/6/8-col steps) - see [layout.md](layout.md).
- Pinning: tabs left, filters right, primary action top-right, one per region.
- Reading path: where does the eye land first, second, third?

## Step 2 - Two isolated assessments

Strict isolation:
- Sub-agents are MANDATORY whenever a sub-agent/Task tool exists. Inline is allowed only when none exists or the user declined; then the FIRST line of the report is `DEGRADED: single-context (<reason>)`.
- Assessment A (blind design review) gets screenshots ONLY: no source, no class names. Finish it and record its findings BEFORE any Assessment B output (measure.md, greps, contrast, histograms) enters the synthesis context.
- B runs separately on code and [measure.md](measure.md) output.

| | A: blind design review | B: mechanical scan |
|---|---|---|
| Input | screenshots only (1440 and 390) | code greps from [SKILL.md](../SKILL.md), [measure.md](measure.md) output incl. `counts`, contrast, distinct-value histograms |
| Checks | squint test, hierarchy, hero numbers, metric-to-visual fit, grouping, what to remove, state coverage, "does it feel designed"; specificity test: could an unrelated product use this layout unchanged? (note the answer); decision load: any decision point with >4 visible options? | font-size/weight/radius/shadow/color counts, nested cards, icon size/stroke, contrast <4.5, off-grid edges, hardcoded colors, motion durations, [anti-slop.md](anti-slop.md) patterns |
| Output | ranked findings P0-P3 with check # | ranked findings P0-P3 with check # and the number |

Synthesize: findings in both = confirmed; A-only = judgment (keep if hierarchy-related); B-only = mechanical (cheap fixes). Label detector false positives explicitly ("measure flagged X; false positive because Y"); never drop them silently.

## Step 3 - Audit checklist

| # | Check | How to measure | Pass threshold | Typical fix |
|---|---|---|---|---|
| 1 | Hero-number hierarchy | one hero per card; hero px / label px | 1 hero, ratio >=2x (hero = `--text-xl` (24) default, `--text-2xl` (32) on one featured card, >=2x label size) | enlarge number, mute label, weight 600 |
| 2 | Metric-to-visual fit | per metric: type (total, trend, share, part-to-whole, distribution) vs shown visual | every metric uses the form in [metric-to-visual.md](metric-to-visual.md) | share to progress bar, trend to sparkline, drop line chart on a single point |
| 3 | Compression | `counts.elements` + `counts.textNodes` from [measure.md](measure.md), before/after | remove >=20% without losing a decision input; secondary info to footer row | merge label+unit, drop repeated headings, move meta to footer |
| 4 | Icon coverage/consistency | `icons.sizes`, `icons.strokeWidths` | one outline set, one stroke, 16px; each nav/tab/column header set is all-icon or none | swap to one set, normalize size/stroke, remove stragglers |
| 5 | Color count | `histograms.color/background` | <=1 accent + 4 semantic (success, warning, danger, info) + neutrals; every color has a meaning | collapse near-duplicates to tokens, neutralize decorative color |
| 6 | Semantic matching | list each green/red/amber usage | green = good only, red = bad only; never used for identity or decoration | recolor identity to neutral/accent chips; fix inverted deltas (cost down = good) |
| 7 | Position/alignment | `alignment.distinctLeftEdges`, `off4pxGrid` | <=6 shared edges, 4px grid, gutters one value | snap to grid, one container padding, align headers with content |
| 8 | Grouping/proximity | gap inside group vs between groups | inner : outer >= 1 : 2 (e.g. 8 vs 16+) | tighten inner gap, widen section gap, replace boxes with whitespace |
| 9 | Card nesting | `nestedCards.count` | 0 cards in cards | flatten inner to divider or tinted block, no border/shadow |
| 10 | Radius consistency | `histograms.radius` | crisp <=4 distinct radii including `--radius-full`; soft <=5 distinct including `--radius-full` (xs 4, sm 8, md 12, lg 16, full); outer >= inner (inner = outer - padding) | map to the preset's tokens: control, card, pill |
| 11 | Type scale | `fontSize/fontWeight/fontFamily` distinct | <=6 sizes, <=3 weights, body 13-14px | snap to scale in [tokens.md](tokens.md) |
| 12 | Number formatting | sample every numeric column/value | `tabular-nums`, right-aligned in tables, units shown, consistent decimals, thousands separators | add `font-variant-numeric`, one formatter, unit suffix muted |
| 13 | Density vs task | rows visible at 1440x900; click depth to primary task | matches the preset in [density.md](density.md) (row height crisp 32/40/48, soft 48/56/64, via `--row-h`); primary task <=2 clicks | adjust `--row-h` (crisp 32/40/48, soft 48/56/64), collapse rarely used filters |
| 14 | States | trigger empty, loading, error, partial | each region has all 3 designed states, layout does not jump | skeletons at final size, empty with next action, inline error + retry |
| 15 | Contrast | `lowContrast.items` | text >=4.5:1 (large >=3:1), UI edges >=3:1 | darken muted text token, not opacity |
| 16 | Motion | `transitionDuration` + [motion.md](motion.md) rules | 120-220ms via `--dur-*` tokens, chart draw-in <=300ms, nothing over 300ms; transform/opacity only, reduced-motion honored, no load choreography | trim durations, remove decorative animation |
| 17 | Responsive | screenshot 390 and 768 | no horizontal page scroll, KPIs reflow 1-2 cols, tables scroll or stack, tap targets >=40px | grid auto-fit, sticky first column, hide tertiary columns |
| 18 | Order & extremes | DOM and keyboard/focus order still match visual order after any JSX move; test long names (60+ chars), empty, 200% zoom, localized string (+30% longer), narrow 390px | no break at any extreme | restore DOM order (not `order:`/absolute), truncate with tooltip, wrap, `min-width: 0` |

**P0-P3 mapping:**

| Level | Rule | Examples |
|---|---|---|
| P0 blocking | breaks use or accessibility, or lies about data | #15 fail on body text, #6 inverted semantics, #14 error state missing, #17 unusable at 390, #18 break that blocks a task |
| P1 major | hurts scanning of the primary task | #1, #2, #8, #3 (heavy), #9, #18 (break, no task blocked) |
| P2 minor | inconsistency, visible on inspection | #4, #5, #7, #10, #11, #12 |
| P3 polish | taste, no task impact | #16, small #13 tweaks, micro-spacing |

Hierarchy and grouping outrank cosmetics: fix P1 layout before touching P2/P3 tokens.

## Step 4 - Spatial thesis + brief

Write the thesis first (3 lines max):
1. Primary reading path (e.g. title -> 3 KPIs -> board -> detail).
2. What groups together; what leads vs supports.
3. Density and how it adapts (3 col -> 1 col, sidebar -> drawer).

Squint test: blur the screenshot; primary, secondary, and the groups must be identifiable in that order. If not, fix hierarchy before details.

Compression guard: every removed, merged or hidden element is recorded with its new access point (moved to X / behind disclosure Y / deleted because duplicate of Z). Never remove a decision input. A decision point with >4 visible options gets progressive disclosure or an overflow menu.

Distill rules while proposing: one primary action per region; never nest cards; progressive disclosure for secondary; remove redundant labels (a column titled "Amount" needs no "Amount:" in cells); flatten.

**REDESIGN BRIEF template**

```
Target: <app / page / route>     Preset: crisp|soft     Density: <level>
Thesis: 1) ...  2) ...  3) ...
Mode: full | DEGRADED: single-context (<reason>)
Region order (reading path 1..n): 1) ... 2) ... n) ...     <- mandatory
Visual per metric: <metric> -> <visual per metric-to-visual.md, or 'none: reason'>     <- mandatory
```

| Component | Current | Proposed | Why (check #) | Risk | Priority |
|---|---|---|---|---|---|
| KPI card | 14px number, line chart | `--text-xl` hero, progress bar | #1, #2 | jsx-restructure | P1 |

Risk levels: `css-only` (class/token change), `jsx-restructure` (markup moves, handlers kept), `data-needed` (requires data not present).

Also list:
- **Removed or moved** (mandatory, one row per element):

| Element | Action | New access point |
|---|---|---|
| Export link | moved | behind overflow menu on card header |
| Duplicate total | deleted | duplicate of hero number |

- **Removed complexity totals:** elements/borders/labels dropped, with counts.
- **Needs data we may not have:** e.g. sparkline needs history series; delta needs prior period; avatar stack needs member list.

## Step 5 - Approval gate

Show the brief and the report. STOP. Ask for approval LAST, after the findings, in one short question (approve all / approve P0-P1 only / edit). Do not write code until answered. The report is the deliverable; the question is its final line.

## Step 6 - Apply order

Tokens bridge -> shell/nav -> page header -> KPI row -> main region -> tables/lists -> states -> motion.

- One region per pass, smallest diff that achieves the brief row.
- Keep selectors, ids, handlers, test ids, aria attributes. Restyle by token/class first, move markup only when the brief says `jsx-restructure`.
- UI lib present (MUI/Bootstrap): override via theme/CSS variables, not by forking components; see [components.md](components.md).
- Keep an ordered list of every JSX change (file, element, reason, brief row). Show it in the final report.
- Stop and re-ask if a change would alter behavior.

## Step 7 - Verify (evidence, not "yes")

| Check | Evidence |
|---|---|
| Squint test | blurred before/after screenshots, hierarchy order named |
| Screenshots | 1440 and 390, before and after, side by side |
| Mechanical scan | re-run [measure.md](measure.md) and the SKILL.md greps; counts table below |
| Histograms | font sizes, radii, colors, shadows: after <= thresholds |
| Contrast | `lowContrast.count` = 0 on body text |
| Behavior unchanged | existing tests and build pass (command + result); manual click-through of primary task |
| Checklist | fill [checklist.md](../checklist.md) with the numbers |

## Report template

```
DEGRADED: single-context (<reason>)     <- FIRST line, only when degraded
REDESIGN REPORT  <target>  <date>
Thesis: ...
Findings: P0 n | P1 n | P2 n | P3 n   (A-only n, B-only n, both n)
```

| Metric | Before | After | Threshold |
|---|---|---|---|
| Distinct font sizes | | | <=6 |
| Distinct weights | | | <=3 |
| Distinct radii | | | crisp <=4 / soft <=5, incl. `--radius-full` |
| Distinct shadows | | | <=2 |
| Distinct text colors | | | <=9 (text, muted, subtle, accent-text, on-accent, + 4 status) |
| Nested cards | | | 0 |
| Icon sizes / strokes | | | 1 / 1 |
| Left edges | | | <=6 |
| Contrast failures | | | 0 |
| `counts.elements` / `counts.textNodes` | | | -20% |
| Order & extremes (#18) | | | no break |

Then: brief table, Removed or moved table, false-positive labels, JSX change list, needs-data list, tests run, screenshots. Last line: approval question (before Step 6) or "done, N files changed" (after).

Worked example: [before-after/fintrack.md](before-after/fintrack.md).
