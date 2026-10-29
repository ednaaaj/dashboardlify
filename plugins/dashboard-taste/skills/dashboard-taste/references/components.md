# Components

Values reference token names from tokens.md (`--space-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease-out`). Radius numbers below are crisp; under `data-style="soft"` controls use `--control-radius` and cards `--radius-lg` (16); marks under 24px always `--radius-xs`. Do not invent new values.

## Global rules

| Rule | Spec |
|---|---|
| Focus ring | `outline: 2px solid var(--accent); outline-offset: 2px`. Use `:focus-visible` only. Never remove without replacing. |
| Min hit target | 24x24 absolute floor (WCAG 2.2 AA); 32x32 for primary controls; 40x40 on touch (pad invisibly). |
| Icons | `--icon-size` per density (14/16/20), stroke 1.5, `currentColor`; 20 also in empty states/modals. |
| Disabled | opacity .5, `cursor: not-allowed`, no hover change, no tooltip-only explanation (say why in text). |
| Hover | bg/color change only, 120ms (`--dur-fast`). No lift, no shadow growth. |
| Active | `transform: scale(0.98)` max, 120ms. |
| Surface | `--card-border` before shadow. Shadows only on floating layers. |
| Type | 14px body (`--text-body`), 13px tables only (`--text-table`), 12px meta. Weights 400/500/600 only. Numbers `tabular-nums`. |
| Color | One accent. success/warning/danger/info are semantic only, never decorative. |

## Button

| Variant | Bg | Text | Border | Hover | Use |
|---|---|---|---|---|---|
| Primary | accent | white | none | `--accent-hover` | 1 per view region |
| Secondary | surface | `--text` | 1px `--border` | `--surface-sunken` | default action |
| Ghost | transparent | `--text-muted` | none | `--surface-sunken`, `--text` | toolbar, row actions |
| Danger | `--danger-solid` | white | none | `color-mix(in srgb, var(--danger-solid), black 12%)` | destructive confirm only |

| Size | Height | Pad-x | Type | Icon | Radius |
|---|---|---|---|---|---|
| sm | `--button-h-sm` (32) | 8 | 12/500 | 14-16 | `--control-radius` (6 crisp) |
| md (default) | `--button-h` (36); 32 compact / 40 comfortable | 12 | 14/500 (`--text-body`) | 16 | `--control-radius` |
| lg | 40 | 16 | 14/500 | 16 | `--control-radius` |

- Icon-gap 8. Icon-only: square, same height, `aria-label` required.
- Loading: inline 14px spinner replaces icon, width locked, label stays.
- Do: verb labels ("Save changes"). Don't: two primaries side by side, gradient fills, shadows, uppercase, pill radius (unless soft preset via `--control-radius`).

## Input / Select / Search

| Prop | Spec |
|---|---|
| Height | 32 compact / 36 default / 40 comfortable (match density) |
| Pad-x | 12 |
| Radius | `--control-radius` (6 crisp) |
| Border | 1px `--border-input`; bg `--surface` |
| Type | 14/400 (`--text-body`); placeholder `--text-subtle` |
| Hover | border darkens one step |
| Focus | border accent + global focus ring (2px accent, 2px offset) |
| Error | border danger, message 12px danger below, gap 4; icon + text, not color alone |
| Disabled | `--surface-sunken`, `--text-subtle` |

- Select: same box, chevron 16 right, menu = Dropdown spec. Match trigger width min.
- Search: leading 16 icon at pad 8, text pad-left 32, `/` or `Cmd K` hint chip right (12px, border, `--radius-xs`), clear button when filled. Debounce 200ms. Never animate expansion.
- Label: 12/500 above, gap 4. Help text 12/400 muted below. Don't use placeholder as label.

## Badge / Status pill

| Prop | Spec |
|---|---|
| Height | 16 compact / 20 default / 24 comfortable |
| Pad-x | 8 |
| Radius | `--radius-sm` (4 crisp / 8 soft); `--radius-full` only for dot-status |
| Type | 12/500, no uppercase |
| Style | tinted bg (semantic @ 10-12%), text semantic dark, 1px border semantic @ 20% optional |
| Dot | 6px circle, gap 8, for status |

- Neutral badge for counts/tags. Max 1 color per row. Always text label, never color alone.
- Don't: more than 5 distinct badge colors on one screen, solid saturated fills.

## Stat / KPI card

| Part | Spec |
|---|---|
| Container | Card spec, pad `var(--card-pad)` |
| Label | 12/500 muted, one line, truncate |
| Value | `--text-xl` 24 default hero; `--text-2xl` 32 featured card; compact may use `--text-lg` 20. Weight 500-600, `tabular-nums`, tracking -0.02em; gap 4 under label |
| Delta | 12/500, arrow icon 12 + `+4.2%`; gap 8 from value, baseline-aligned |
| Delta color | success up-good, danger down-bad. Invert for cost/churn. Zero = muted. Never accent. |
| Context | "vs last 30d" 12/400 muted |
| Sparkline | optional, 32-40px tall, 1.5px stroke, single series, no axes/tooltip, accent or muted; right-aligned or below |

- Grid gap 16, 3-5 cards per row. Whole card not clickable unless it drills down (then hover `--surface-sunken` + chevron).
- Format: compact (1.2k, 3.4M), consistent decimals, units in label or suffix at 14/400 muted.
- Don't: icon-in-colored-circle, gradient bg, count-up animation, more than 1 delta.

## KPI card anatomy

Top to bottom inside Card spec (`--card-border`, `--panel-bg` behind in soft):
1. Header row: label (12/500 muted, one line) left; optional icon chip right, 32-40px square, radius `--radius-md`, `--surface-sunken` bg, 16-20 icon `currentColor`. Skip the chip in dense layouts.
2. Hero number: `--text-xl` 24 default, `--text-2xl` 32 on one featured card (compact: `--text-lg` 20); weight 500-600, tracking -0.02em, `tabular-nums`; gap 8 under header.
3. Delta pill: 20 high, pad-x 8, 12/500, semantic tinted bg + arrow + `+4.2%`, radius `--radius-sm` (same as status pill); beside the number, baseline-aligned.
4. Footer: "vs last 30d" 12/400 muted; optional sparkline 32-40px high (see Chart rules).

## Card / Panel

| Prop | Spec |
|---|---|
| Bg | `--surface` (on `--panel-bg` in soft) |
| Border | `--card-border` |
| Radius | `--radius-lg` (8 crisp / 16 soft) |
| Shadow | none (border only) |
| Padding | `var(--card-pad)` (12 compact / 20 default / 24 comfortable); table cards 0 with inner header pad 16 |
| Header | 14/600 title, 12/400 muted subtitle, actions right (ghost sm), border-bottom optional, gap 12 to body |

- Don't: nested cards (use divider), hover lift, colored left border stripes, shadow + border together.

## Data table

| Part | Spec |
|---|---|
| Header | 12/500 muted, bg `--surface` or `--surface-sunken`, 1px bottom border, height = row height, sticky `top:0`, z-index above rows |
| Row height | `--row-h`: compact 32 / default 40 / comfortable 48 (soft 48 / 56 / 64) |
| Cell pad-x | `var(--cell-pad-x)` (first col +4) |
| Body type | `--text-table` (13)/400 `--text`; secondary line 12 muted |
| Align | text left; numbers, currency, dates-as-numbers right with `tabular-nums`; header aligns with column; status/badge left; actions right |
| Dividers | 1px bottom `--border`; no vertical lines; **no zebra** |
| Row hover | `--surface-sunken`, `--dur-fast` |
| Selected | bg accent @ 6-8%, checkbox checked; no left stripe |
| Checkbox col | 40 wide, 16 box, `--radius-xs` |
| Sort | header is button; icon 12 chevron-up/down appears on hover, persists on sorted col in `--text`; `aria-sort`; single-col sort default |
| Resize/truncate | single-line truncate with ellipsis, full value in tooltip; max col text ~48ch |
| Pagination | footer height 48, pad 16: "1-25 of 1,240" 12 muted left; rows-per-page select + prev/next ghost icon buttons right. Default 25 rows. |
| Bulk bar | on 1+ selected: replaces header content (or floats bottom-center, `--shadow-popover`, radius 8, height 48). Shows "3 selected", actions (secondary sm), "Clear" ghost. Fade+4px in `--dur-base`. |
| Empty/loading | Empty state spec in-body; skeleton rows at same row height |

- Don't: sticky first col without shadow-free border divider, row entrance animation, icons in every cell, centered text, full-row click plus inner buttons without stopPropagation.

## Chart card

| Part | Spec |
|---|---|
| Container | Card spec |
| Title | 14/600; subtitle/unit 12 muted |
| Legend | top-right or under title, 12/400, 8px swatch (square `--radius-xs` or line), gap 12; omit if 1 series |
| Series | max 6; 1 series = accent; others from categorical ramp; use direct end-of-line labels when <=4 series |
| Gridlines | horizontal only, 1px, `--chart-grid` (dashed ok), 4-5 lines, no vertical grid, no box border |
| Axis | no axis line (x baseline 1px border ok), ticks off, labels 12/400 muted `tabular-nums`, Y labels abbreviated (1k) |
| Marks | line 1.5-2px, no markers except hover point (r4, white stroke 2); bars `--radius-xs` top only, gap 20-30%; heatmap cells `--radius-xs`; area fill 8-12% opacity |
| Tooltip | inverted pill (see Chart rules), pad 4x8, title 12/500, rows 12 with 8px swatch, value right `tabular-nums`; follows cursor, offset 12, no animation beyond `--dur-fast` fade |
| Crosshair | 1px dashed `--border-strong` with dot, line/area only |
| Height | 240 default, 160 compact; min width 280 |

- Don't: 3D, gradients, pie with >4 slices (use bar), dual y-axes, rotated labels, legend plus direct labels both, drop shadows, rainbow palettes, red/green as the only distinction.

## Chart rules

| Rule | Spec |
|---|---|
| Highlight one, mute rest | Bar series: one solid bar in `--chart-1`; all others muted (`--chart-1` at 30-40% opacity) or hatched at the same opacity. Highlight = current period, max, or selected bar. |
| Bar caps | Top corners `--radius-xs`; baseline edge square. Gap 20-30%. |
| Gridlines | Light dashed (`stroke-dasharray: 3 3`, `--chart-grid`, 1px) horizontal only, or none when values are labeled. |
| Tooltip | Inverted pill: dark (`--text` bg, `--bg` text) on light theme, light on dark; 12px; pad 4x8; radius `--radius-md`; no shadow. Dashed vertical crosshair (1px `--border-strong`) with a dot (r4) on the series; follows cursor. |
| Segmented progress / gauge | 8-12 segments, 2px gaps, filled `--chart-1`, empty `--surface-sunken`, value centered 24/600 `tabular-nums`; value also in text (not color alone). |
| KPI mini-visual | Sparkline 32-40px high, 1.5px stroke, no axes; mini bars same height, mute all but last. |

- Don't: gradient fills, glow, 3D, animated re-draw on data change.

## Tabs

| Prop | Spec |
|---|---|
| Height | 36 (32 compact) |
| Type | 14/500; inactive `--text-muted`, active `--text` |
| Indicator | 2px accent underline under active, tab bar 1px bottom border; indicator slides `--dur-base` transform only (or instant) |
| Gap | 16-24 between tabs, pad-x 0-4 |
| Hover | `--text` color change |
| Count | inline neutral badge, gap 8 |

- Segmented control variant: `--surface-sunken` track, radius `--control-radius`, active = surface + border, height 28-32 (36 comfortable).
- Don't: pill-filled tabs with big radius (unless soft preset), more than 7 tabs (use dropdown overflow), tabs for navigation that should be URL-routed without links.

## Sidebar nav item

| Prop | Spec |
|---|---|
| Height | 32 default (28 compact / 36 comfortable). Single source for nav items; do NOT use `--row-h` (table row, 56-64 in soft) |
| Pad | 8 x 12, radius `--radius-md` in both presets (6 crisp / 12 soft), inset from sidebar edge by 8 |
| Icon | `--icon-size`, gap 8, `--text-muted`; active `--text`/accent |
| Type | 14/500 |
| Default | transparent, `--text-muted` |
| Hover | `--surface-sunken`, `--text` |
| Active | `--accent-subtle` bg, `--accent-text` text, 500-600; no left bar, no heavy fill |
| Section label | Sentence case 13/500 `--text-muted`, optional chevron (collapsible), pad 8x12, margin-top 24; never CAPS below 12px |
| Sub-item | Icon + label, 1px `--border` tree connector from parent (not just indent and fade) |
| Group rhythm | Item gap 4, group gap 24 (>= 4x), no divider lines between groups |
| Collapsed (56) | icon only centered, tooltip right 500ms delay |
| Badge/count | Plain right-aligned tabular number, `--text-subtle`; chip only for alerts |
| Identity chip | Optional 24px square, `--radius-md` crisp / `--radius-sm` soft (8, stays a square), white glyph; only for entities (accounts, workspaces), max 4 hues; everything else monochrome |
| Footer | Divider, then framed user card (`--surface`, 1px `--border`, `--radius-lg`, avatar 32); Help/Settings pinned above it, separate from nav groups |

- Don't: more than 2 nest levels, accent solid bg on active, icon-less mixed with icon items, CAPS micro-labels, grey pill count chips on every row.
- Worked example: [before-after/sidebar.md](before-after/sidebar.md).

## Dropdown / Popover / Command menu

| Prop | Dropdown / Popover | Command menu |
|---|---|---|
| Width | trigger min, max 320 | 560 (max 90vw) |
| Surface | `--surface`, 1px border, `--radius-lg` 8 | same, `--radius-lg` |
| Shadow | `--shadow-popover` | `--shadow-modal` |
| Pad | 4 (menu), 12-16 (popover) | input row 48, list pad 4 |
| Item | height 32, pad-x 8, `--radius-md`, 14/400, icon 16 gap 8 | same, group labels 12 muted |
| Hover/focus | `--surface-sunken` (keyboard focus same, no ring inside menu) | active row `--surface-sunken` |
| Shortcut | right, 12 muted, no border | same |
| Separator | 1px `--border`, margin 4 | group gap 8 |
| Offset | 4 from trigger | centered, top 15vh |
| Danger item | text danger, last, after separator | - |

- Motion: see motion.md (fade + 4px, `--dur-base`, origin at trigger). Close on Esc/outside click. Typeahead. Max-height 320 scroll.
- Command menu: open with `Cmd K`, fuzzy search, recent first, max 8 visible rows before scroll, empty = "No results for 'x'".

## Modal / Sheet

| Prop | Modal | Sheet |
|---|---|---|
| Width | sm 400 / md 520 / lg 720 | 480 default (640 wide), full height |
| Radius | `--radius-lg` 8 | 0 (inner edge only if floating: `--radius-lg`) |
| Shadow | `--shadow-modal` | `--shadow-modal` |
| Overlay | black @ 40%, no blur | same |
| Header | pad 16x20, 16/600 title, close ghost icon right | same, border-bottom |
| Body | pad 20, max-height 70vh scroll | pad 20 |
| Footer | pad 12x20, border-top optional, buttons right: secondary then primary | sticky footer |
| Position | centered (top 12vh ok) | right edge |

- Focus trap, Esc closes, return focus to trigger, scroll lock. Primary action rightmost. Destructive confirm: danger button, name the object.
- Use Sheet for edit/detail with context; Modal for short confirms/forms (<=5 fields). Don't stack modals.

## Toast

| Prop | Spec |
|---|---|
| Position | bottom-right (or bottom-center), 16 from edges, stack gap 8, max 3 |
| Size | width 360, min-height 44, pad 12x16, radius 8 |
| Surface | `--surface`, 1px border, `--shadow-popover` |
| Content | 16 icon semantic, 14/500 title, 12/400 muted description, optional action link right |
| Duration | 4s success/info; 6s warning; errors persist until dismissed or have action |
| Motion | fade + 8px translate-y in `--dur-base`, exit `--dur-fast` |

- `role="status"` (error: `role="alert"`). Pause on hover. Plain language, past tense ("Invoice sent"). Don't: toast for validation (use inline), progress bars, emoji, auto-dismiss undo under 6s.

## Tooltip

| Prop | Spec |
|---|---|
| Bg | `--text` (dark) with inverse text, `--radius-md` |
| Type | 12/400, pad 4x8, max-width 240 |
| Delay | open 500ms, no delay when moving between adjacent tooltips; close instant |
| Offset | 8, arrow-less |
| Motion | `--dur-fast` fade only |

- Supplementary only: never the sole carrier of info. Required for icon-only buttons. Show on keyboard focus too. Don't: interactive content (use popover), on disabled without wrapper.

## Empty state

| Part | Spec |
|---|---|
| Layout | centered in container, max-width 360, pad 48 vertical |
| Icon | 20 in 40px circle `--surface-sunken` (or none) |
| Title | 14/600, gap 12 |
| Body | 14/400 muted, 1-2 lines, gap 4 |
| Action | one primary or secondary button md, gap 16; optional ghost "Learn more" |

- Variants: first-use (explain + create CTA), no-results (state filter + "Clear filters"), no-permission (say who to ask). Don't: illustrations, jokes, multiple CTAs.

## Loading skeleton

| Prop | Spec |
|---|---|
| Bg | `--surface-sunken`, radius `--radius-xs` (match target shape) |
| Shimmer | optional, very subtle, see motion.md; else static |
| Shape | match final layout dimensions exactly (row height, text line 12/16 heights, KPI 24) to prevent layout shift |
| Text lines | height 12, widths vary 60-90%, gap 8 |
| Delay | show only if load > 200ms; keep min 300ms to avoid flash |

- Table: 5-8 skeleton rows at density height. Chart: static axis-less block at chart height. Spinner only inline in buttons or for sub-second refresh indicator (16px, muted). Don't: full-page spinner, content-jumping on load.

## Error state

| Variant | Spec |
|---|---|
| Inline field | 12/400 danger text below input + 12 icon; `aria-describedby` |
| Banner | full width of container, pad 12x16, radius 8, 1px border danger @ 30%, bg danger @ 6%, icon 16, 14/500 title + 14/400 body, action right, dismiss optional |
| Panel/section | Empty-state layout with danger icon, title ("Couldn't load orders"), cause in plain words, `Retry` secondary button, request id 12 muted mono |
| Page (404/500) | same layout, centered, code muted 12, primary "Go to dashboard" |

- Say what happened, what to do next. Keep surrounding UI usable. Don't: raw stack traces, "Oops!", blame user, red full-page backgrounds.

## Form layout

| Prop | Spec |
|---|---|
| Layout | single column, max-width 560 (settings), 2-col only for short paired fields (gap 16) |
| Field gap | 16 vertical; section gap 32 with 14/600 heading + 12 muted description |
| Label | above, 12/500, required marked "(optional)" on optionals instead of asterisks |
| Help | 12/400 muted under field, gap 4 |
| Actions | footer left-aligned or right in modals/sheets: Cancel (ghost/secondary) + Save (primary); sticky bottom bar in long forms with unsaved-changes note |
| Validation | on blur then on change; summarize at top only if >3 errors; focus first invalid on submit |
| Controls | checkbox (`--radius-xs`)/radio 16, label 14, gap 8; switch 32x20, immediate-effect settings only |

- Group related fields in a Card per section (settings pages: label+description left col 240, controls right). Don't: horizontal labels in narrow containers, placeholder-only labels, disabled submit with no explanation.
