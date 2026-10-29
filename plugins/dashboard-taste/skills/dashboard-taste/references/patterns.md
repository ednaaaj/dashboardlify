# Dashboard patterns

Common dashboard layout patterns. Numbers are guidance, not measurements.

## Patterns

| Pattern | Anatomy (ESTIMATED) | Do | Don't |
|---|---|---|---|
| Layered surfaces | Light: page tint (`--bg`) -> panel -> white card (`--surface`). Dark: near-black bg, card +1 step lighter, 1px border ~6-8% white | Separate by tint step + hairline `--border` | Shadow stacks; pure #000 bg with pure #fff text |
| KPI card | Label 12-13px `--text-muted`; optional icon chip 32-40px; hero 24 default (`--text-xl`), 32 on one featured card (`--text-2xl`), weight 500-600, tracking -0.02em; delta pill; footer 12px muted; optional mini viz 32-40px tall | Label above number, delta beside or under | More than one mini viz; label in caps AND icon AND tooltip |
| Card header | Title 14px/600 left; actions right (select, circular icon button, kebab); flex row, align-items center, gap `--space-8` | Keep title one line | Title and actions on different baselines |
| Table | Header 12-13px sentence-case `--text-muted`; no zebra; hairline dividers; checkbox first; avatar/logo + 2-line cell (name / sub); numbers right-aligned tabular; status pastel pill; kebab last; row 32/40/48px crisp, 48/56/64px soft (compact/default/comfortable) | Right-align numbers, left-align text | Zebra, vertical dividers, ALL CAPS headers (except mono-caps style), 8+ columns without scroll |
| Pastel status pills | bg 10-15% tint, text darker shade, same hue; h 20-24px; `--radius-sm` (4 crisp / 8 soft); `--radius-full` only for dot-status; `--text-xs` | Use `--success-*`, `--warning-*`, `--danger-*`, `--info-*` | Solid saturated fills; color-only meaning (add text) |
| Segmented control | Pale container (`--surface-sunken`), white/filled active segment, h 28-32px (36 comfortable), radius matches preset | 2-4 options, equal width | Use for navigation across pages; 5+ options |
| Highlight-one chart | One bar/point in `--accent`, rest muted; value label above highlighted bar | Default highlight = latest or max | Rainbow bars |
| Inverted tooltip | Dark pill on light, light pill on dark; dashed crosshair; 12px text | Show value + label + delta | Large white card tooltips with shadows |
| Segmented gauge / donut | Ring 12-16px thick in 8-12 segments or 2px-gapped arcs; centered value 24-32px (`--text-xl`/`--text-2xl`) + 12px label | Center total, legend as direct rows | >5 slices; decorative 3D |
| Toolbar | Tabs left; filter, date range, export pinned right; h 40-48px | Date range as one control | Filters scattered across card headers |
| Sidebar | Grouped sections with group labels sentence case 13/500 with chevron; nested tree with plain tabular counts (chip only for alerts); active = `--accent-subtle` bg + `--accent-text`; footer user card; collapse button; width `--sidebar-w` | Max 2 nesting levels, outline icons ~1.5px stroke, 16-20px | Filled active bar plus icon color plus bold all at once |
| Topbar | Breadcrumb left; search with shortcut hint (e.g. Cmd K) center or right; ghost secondary actions; ONE primary button; h `--topbar-h` | One primary per screen | Two filled buttons; search without shortcut hint |
| Page header | Title 20px/600 (24 max) + subtitle 14px muted + avatar stack (3-4, +N) | Actions right | Welcome banners, emoji |
| Kanban | Tinted column container; header: icon + title + count chip + kebab; white cards; dashed "+ Add" ghost at bottom | Column width 280-320px | Column colors per status on whole column |
| Card footer meta row | Divider above; icon + date left, meta (assignee, count) right; 12px muted | Keep to one row | Footers with buttons AND meta |
| Dark mode | Borders over shadows; accent slightly lighter than light-mode accent; text ~90% white, not pure | Re-pick pastel pills for dark (tint 15-20%) | Pure black on pure white or inverse; shadows |
| Entity visuals | Logo/flag/avatar 20-32px in rows, rounded (avatar full, logo `--radius-sm`) | Fallback to initials | Mixed shapes in one column |
| Insight callout | ONE accent-tinted card per page (`--accent-subtle` bg, `--accent-border`), info only: 1-2 lines + link | Put AI/insight text here only | Several tinted cards; callouts that hold primary actions |

## Two families

| | Crisp preset | Soft preset |
|---|---|---|
| Card radius | `--radius-lg` (8) | `--radius-lg` (16) |
| Controls | Rectangular, radius `--radius-sm`/`--radius-md`; heights from density tokens in BOTH presets | Pill (`--control-radius`); soft changes shape, not height |
| Separation | 1px borders, hairlines | Tinted container behind cards, little or no border |
| Row height | 32/40/48px | 48/56/64px (compact/default/comfortable) |
| Density | High, 13-14px text (body 14, table 13) | Airy, 13-14px text |
| Shadows | None (border only); shadow only on overlays | None (border only); shadow only on overlays |
| Pick when | Ops, admin, dense tables, devtools, ads analytics | Consumer, finance, overview, healthcare, CRM |
| Don't mix | Pill buttons with sharp cards | Sharp tables inside soft cards |

Pick one per product. Soft cards on soft tinted containers; crisp cards on flat bg.

## Showpieces to skip

| Skip | Why |
|---|---|
| Particle spheres / orbs | Zero data value, heavy |
| Neon glow, glow borders | Hurts contrast, dates fast |
| Hero photos in dashboards | Pushes data below fold |
| Decorative gradient washes (card headers) | Skip (rule 8); never behind data or text needing contrast |
| 3D charts, 3D icons | Distorts values |
| Glassmorphism stacks | Contrast and perf cost |
| Count-up numbers of any length | Delays reading |
