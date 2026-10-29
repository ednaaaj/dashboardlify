# Worked example - fintrack "Financial overview"

The brief [redesign.md](../redesign.md) would produce for a fintech dashboard. **Every number is ESTIMATED from before/after screenshots** (no DOM measured). Preset: **soft** - the target uses cards at ~12-16 and pill controls, which the crisp preset (cards `--radius-lg`, rectangular controls, see [tokens.md](../tokens.md)) cannot reproduce. Crisp could do the ~8px buttons; cards and pill controls are the reason for soft. Density: comfortable.

```
Target: fintrack / Financial overview     Preset: soft     Density: comfortable
Thesis: 1) Title -> 3 KPIs -> tab row -> kanban board, left to right, top to bottom.
        2) KPIs lead (24 hero, 32 featured); board cards support; filters live with the tab row, never in content.
        3) 3-col KPIs and 4 kanban columns at 1440; KPIs stack and board scrolls horizontally at 390.
Mode: DEGRADED: single-context (estimates)
```

## Step 1 - Region map (ESTIMATED, 1440x900, px)

| Region | x | y | w | h | %vp | Pinned |
|---|---|---|---|---|---|---|
| Sidebar (grouped tree, plain counts) | 0 | 0 | 260 | 900 | 18% w | left |
| Topbar (breadcrumb, search, actions) | 260 | 0 | 1180 | 56 | 6% h | top |
| Page header (title, subtitle, avatars) | 292 | 80 | 1116 | 64 | 7% h | primary: none here |
| KPI row (3 cards) | 292 | 168 | 1116 | 152 | 17% h | 3 x ~364, gap 12 |
| Tab row | 292 | 344 | 1116 | 40 | 4% h | tabs left, Filter + year right |
| Kanban board (4 columns) | 292 | 408 | 1116 | 480 | 53% h | cols ~270, gap 12 |

Left edges: sidebar 0/24, content 292 (single gutter, 32) - alignment good in AFTER.

## Step 2/3 - Findings (BEFORE, ESTIMATED)

| # | Check | Finding | Level |
|---|---|---|---|
| 1 | Hero hierarchy | number ~16px vs label ~13px (1.2x); numbers and labels read alike | P1 |
| 2 | Metric-to-visual | same generic line chart on all 3 KPIs, including spending share (a part-of-budget) | P1 |
| 3 | Compression | duplicated labels, per-card headings, meta inline with title (~38 text nodes in KPI+card area) | P1 |
| 8 | Grouping | filters mixed into content flow; gap inside groups ~= gap between (16 vs 16) | P1 |
| 9 | Card nesting | flat cards, 0 nested, but no surface separation between columns and cards | P2 |
| 4 | Icons | mixed or absent icons on tabs and nav | P2 |
| 11 | Type scale | small dense text, ~9 sizes / 4 weights (est.) | P2 |
| 12 | Number format | no tabular figures, units inconsistent | P2 |
| 6 | Semantics | none inverted observed; confirm green/red only for good/bad | P2 (verify) |
| 15 | Contrast | muted grey on white likely <4.5 for 11-12px labels | P0 if confirmed with [measure.md](../measure.md) |

## Step 4 - Brief

| Component | Current | Proposed | Why (check #) | Risk | Priority |
|---|---|---|---|---|---|
| Tokens | mixed radii/sizes | soft preset: controls `--control-radius` (full), radii tokens 8/12/16; type scale 12/13/14/16/20/24 (+`--text-2xl` 32 on one card) | #10, #11 | css-only | P2 |
| Sidebar | flat list | grouped sections, nested tree, plain tabular counts; colored icon chips only for account identity | #4, #5, #6 | jsx-restructure | P2 |
| Topbar | actions in content | breadcrumb + search with cmd-K hint; ghost Export/Share; one blue primary | #8, #13 | jsx-restructure | P1 |
| Page header | title only | title + subtitle + avatar stack right | #3 | jsx-restructure | P3 |
| KPI card | 16px number, line chart | neutral icon chip (`--surface-sunken`) + muted label; hero 24 default / 32 featured (`--text-xl`/`--text-2xl`), 600; one secondary line; visual matched to metric | #1, #2 | jsx-restructure | P1 |
| KPI: Balance | line chart | dot-matrix strip (capacity feel) | #2 | jsx-restructure | P1 |
| KPI: Income | line chart | bar-tick sparkline | #2 | data-needed (history series) | P1 |
| KPI: Spending 61% | line chart | progress bar with 61% fill | #2 | jsx-restructure | P1 |
| Tab row | tabs + filters in flow | icon on every tab, active = filled pill; Filter + year pinned right | #4, #7, #8 | jsx-restructure | P1 |
| Kanban column | bare list | grey-tinted container; header: icon, title, count chip, kebab | #8, #9 | jsx-restructure | P1 |
| Task card | inline meta | row 1 category (icon + label) + status pill right; title; big amount with muted "/of $10,000"; progress bar for goals; divider; footer (date icon left, meta right) | #1, #3, #12 | jsx-restructure | P1 |
| Add action | none/inline | dashed ghost "+ Add" at column bottom | #13 | jsx-restructure | P3 |
| Status | mixed | pastel tinted pills (tint bg + dark text of same hue, >=4.5:1) | #5, #6, #15 | css-only | P2 |

**Removed complexity:** per-KPI line charts (3), duplicated section headings, inline filter row inside content, redundant "Amount:" style labels, mixed icon sets.

**Needs data we may not have:** income history series (bar-tick sparkline), prior-period delta for secondary lines, balance capacity target (dot-matrix fill), member list (avatar stack), per-account identity color, goal target per card (progress + "/of $10,000").

## Counts (ESTIMATED, illustrative)

| Metric | Before | After | Threshold |
|---|---|---|---|
| Distinct font sizes | ~9 | 6 | <=6 |
| Distinct weights | ~4 | 3 | <=3 |
| Distinct radii | ~4 | 5: xs 4 / sm 8 / md 12 / lg 16 / full | <=5 incl. `--radius-full` (soft) |
| Hero ratio (number/label) | 1.2x | ~2x (24 vs 13; 2.5x at 32) | >=2x |
| KPI visuals matched to metric | 0 of 3 | 3 of 3 | all |
| Nested cards | 0 | 0 | 0 |
| Text + element count (KPI + card area) | ~100 | ~78 | -20% |
| Tabs/nav items with icon | partial | all | all or none |
| Contrast failures | unknown (likely labels) | 0 | 0 |

## Notes

- Color on icon chips appears only for account identity (sidebar); KPI and category chips stay neutral. Otherwise check #5/#6 fails.
- Trade-off: the original used a larger (~40px) hero; this skill caps hero at 24 default / 32 featured (`--text-2xl`), so the hierarchy leans on weight, tracking and contrast rather than size.
- ESTIMATED: every px/ratio in this file (region map, findings, counts) is read off screenshots; token values (radii, type scale) are the skill's, not measured.
- Squint test AFTER: KPI numbers are the first dark mass, the active pill second, kanban tints third.
- Apply order per [redesign.md](../redesign.md) Step 6: tokens -> sidebar/topbar -> header -> KPIs -> board -> cards -> states -> motion. See also [patterns.md](../patterns.md) and [components.md](../components.md).
