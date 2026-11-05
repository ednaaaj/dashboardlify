# Metric to visual

Pick the visual from the data shape, not from taste. Colors: `--chart-1..6` categorical, `--seq-1..5` sequential ramp, `--success-fg/-bg`, `--warning-*`, `--danger-*`, `--info-*` semantic.

## Decision table

| Data shape | Best visual | When NOT to use | Sizing / spec | Needs data we may not have |
|---|---|---|---|---|
| Single number, no context | Hero number + label + delta pill, no chart | Never force a chart on it | 24 default (`--text-xl`), 32 on one featured card (`--text-2xl`), weight 500-600, tracking -0.02em, tabular | none |
| Ratio / % of a goal | Progress bar (rounded caps) or segmented bar | Gauge unless bounded KPI with target | bar h 6-8px, track `--surface-sunken`, fill `--accent` | goal value; else show plain number |
| Bounded KPI with target | Gauge (semi-circle, centered value) | Unbounded values, >1 value | min 120x72px, 1 value, target tick | min, max, target |
| Part-to-whole, <=5 parts | Segmented bar, or donut with center total | >5 parts, similar sizes, negatives | donut 120-160px, ring 12-16px, gaps 2px | parts must sum to a total |
| Part-to-whole, >5 parts | Sorted bar list (desc) with inline bars, top 5 + "Other" | Pie/donut | row 32-40px, bar h 6-8px | none |
| Trend over time | Line (rate, price) or area (volume) | <4 points, categorical x | min h 160px; axis text 12px `--chart-axis`; 1px grid `--chart-grid` | history series |
| Trend inside KPI card | Sparkline, no axes, no labels, no tooltip needed | Anything needing reading values | h 32-40px, w 80-120px, stroke 1.5-2px | history (>=7 points); snapshot only: use progress bar or delta pill |
| Compare categories | Horizontal bars, sorted desc | Time on x, <2 or >12 categories | bar h 8-12px, row 32-40px, radius `--radius-xs` | none |
| Many time buckets, one in focus | Vertical bars, ONE highlighted `--accent`, rest muted or hatched | Multi-series stacked | bar w 8-24px, gap 4-8px, top rounded, min h 160px | per-bucket series |
| Distribution | Histogram (contiguous bars, no gaps) | Categories | 10-30 bins, min h 160px | raw values or binned counts |
| Intensity by day x hour | Heatmap, ramp `--seq-1..5` | Fewer than ~20 cells; need exact values | cell 16-24px, gap 2px, radius `--radius-xs`, legend of 5 steps | bucketed counts per cell |
| Delta vs previous | Pill: arrow + value, semantic color | Delta without a baseline | h 20-24px, text `--text-xs`, `--success-bg`/`--success-fg` or `--danger-*` | previous period value |
| Status | Pastel pill: bg tint 10-15% of hue, text darker shade, same hue | Free-text states, more than ~6 states | h 20-24px, `--radius-sm` (4 crisp / 8 soft); `--radius-full` only for dot-status, `--text-xs`, weight 500 | enum of states |
| Rank | Sorted list with inline bars, rank number left | <3 items | row 32/40/48px (crisp) / 48/56/64px (soft), compact/default/comfortable | sortable metric |
| Geographic | Table with flags/logos | Map unless location drives a decision | flag 16-20px, numbers right-aligned | region field; map needs geo data |
| Schedule | Calendar with colored dots (max 3 per day) | Dense events (use list/timeline) | cell 40-48px, dot 6px | event dates |
| Two series compare | Dual line + direct labels | Dual y-axis (avoid); unrelated units | 2 colors `--chart-1`, `--chart-2` | aligned x for both |
| Capacity / limit | Segmented progress with ticks | Open-ended totals | 6-8px bar, tick every 10-25%, warn `--warning-fg` at 80%, `--danger-fg` at 95% | limit value |
| Correlation | Scatter | Time series; <15 points | dot 6-8px, 60% opacity, min h 240px | two numeric fields per entity |

## Rules

| Rule | Spec |
|---|---|
| One chart type per metric kind across product | Same kind of data, same visual, everywhere |
| Max series | 6 (`--chart-1..6`); beyond that group into "Other" |
| Labels | Direct labels over legends; legend only when >2 series and direct labeling does not fit |
| Emphasis | Highlight one, mute the rest (`--chart-1` at 30-40% opacity) |
| Tooltip | Inverted: dark pill on light theme, light pill on dark; dashed vertical crosshair 1px; `--radius-md`; no shadow; pad 4x8 |
| Grid | Light dashed horizontal lines `--chart-grid`, or none; never vertical heavy |
| Shape | Rounded caps on lines and bars (`--radius-xs`) |
| Axis text | 12px, `--chart-axis`; max 5 ticks; abbreviate (1.2k, 3M) |
| Numbers | `font-variant-numeric: tabular-nums` on all values and axis labels |
| Zero baseline | Bars always start at 0; lines may not |
| Min size | KPI sparkline 80x32; chart 280x160; donut 120x120; heatmap 240x120 |
| States | Every visual has empty ("No data yet" + hint), loading (skeleton same size, no spinner), error (inline message + retry) |
| Accessibility | Never color alone: add labels, icon, pattern or position; `aria-label` summarizing ("Revenue up 12% over 30 days, peak Oct 14"); contrast text 4.5:1; tooltips reachable by keyboard |
| Motion | Draw-in <= 300ms, respect `prefers-reduced-motion` |

## Quick-pick flowchart

```
1. One number only?                       -> hero number + delta pill
2. Progress toward a goal?                -> progress bar (gauge only if bounded + target)
3. Share of a total?                      -> <=5 parts: segmented bar/donut; >5: sorted bar list
4. Changes over time?                     -> small card: sparkline; full: line/area
5. Time buckets with one that matters?    -> bars, one highlighted, rest muted
6. Compare categories?                    -> horizontal bars, sorted
7. Day x hour intensity?                  -> heatmap on --seq-1..5
8. Two numeric fields per item?           -> scatter
9. Needs history but we only have a snapshot? -> progress bar or delta pill
10. Still unsure?                         -> table with inline bars
```

## Component fit (scan rules)

`scan.mjs --inventory` checks what each component is against the table above. A rule firing makes the verdict `INVENTORY SWAP`; the work is a component swap (Mode C, approved brief). Heuristic: confirm each hit before swapping (see [survey.md](survey.md)).

| Rule id | Fires when | Suggest | Matching row |
|---|---|---|---|
| table-timeseries-to-chart | Table with 6+ data rows, 80%+ of first-column cells are dates or periods, 50%+ of other cells numeric | Line or area chart | Trend over time |
| table-few-to-kpi | Table with 4 or fewer numeric cells in total and (2 or fewer rows, or 4 or fewer rows with 2 or fewer columns) | KPI cards | Single number, no context |
| counts-to-bar | List or table with 5+ "label + number" items and no chart in the same card | Status-like labels: segmented or stacked bar when 6 or fewer items, else sorted bar list | Part-to-whole, <=5 parts / >5 parts |
| chart-undersized | Chart under 280x160 and taller than 48px (48px or less is a sparkline, exempt) | Grow to 280x160 minimum | Min size |
| placeholder-widget | Card with "Coming soon", "Lorem", "TODO", or only "--" or "N/A" | Fill it or cut it ([render-only.md](render-only.md)) | none |
| map-check | A map is present | Table with flags unless location drives a decision | Geographic |
| table-status-to-rows | Table with a status column and a percent column (60%+ of cells each) and no progress bar | Project row: progress bar + status pill ([status.md](status.md)) | Ratio / % of a goal, Status |
| long-list-no-filter | Table with 8+ rows, a status column, and no tabs, select or search in or just before its card | Segmented tabs with counts ([status.md](status.md)) | Status |
| flat-dates-to-groups | 6+ list items with a date and no heading or group row between them | Group by Overdue / Today / This week ([content.md](content.md)) | Schedule |
| people-list-to-capacity | 4+ items pairing a person (name or avatar) with a number and no bar in the card | Capacity bars with state labels Light / Balanced / Heavy / Over ([status.md](status.md)) | Capacity / limit |
| kpi-no-context | KPI card with fewer than 6 letters besides its label and numeral | Add a context line: change or next step ([content.md](content.md)) | Single number, no context |
| search-no-shortcut | Search input with no kbd and no "Ctrl K", "⌘K" or "/" hint (advisory) | Show a kbd hint ([content.md](content.md)) | none |
| no-page-summary | No sentence of 6+ words within 120px under the h1 (advisory) | One summary sentence that carries the numbers ([content.md](content.md)) | none |

The last seven rules need `--status` (it implies `--inventory`). They are heuristic (the state-column, date and person tests use English word lists): confirm each hit by hand. `map-check`, `search-no-shortcut` and `no-page-summary` are advisory and do not change the verdict.
