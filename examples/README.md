# dashboardlify examples

Two fictional admin screens used as scan fixtures.

- `slop-dashboard.html` is a deliberately sloppy, AI-looking dashboard. The scan should flag it heavily.
- `clean-dashboard.html` is the same screen written with tight tokens. The scan should leave it alone.

- `messy-home.html` is a home page with layout problems (scan: `LAYOUT ARRANGE`, score 15, plus the note `also needs JSX: placeholder-widgets (rework)`): tall top bar, big hero, six equal cards with identical icon tiles, an empty widget, truncated text.
- `arranged-home.html` has identical markup. Only the CSS differs (the kind of change `/dashboardlify:arrange` makes), so the scan should print `LAYOUT OK` (with notes) and a visible change against the messy one. Use different paths for `--shot` and `--visible-change` (exit 2 if equal).

## Scan

From this folder:

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs slop-dashboard.html
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs clean-dashboard.html
```

## Try the tighten command

Never run it on the original. Copy first:

```sh
cp slop-dashboard.html /tmp/slop-copy.html
/dashboardlify:tighten /tmp/slop-copy.html
```

Layout fixtures:

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs messy-home.html --shot /tmp/messy.png
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs arranged-home.html --visible-change /tmp/messy.png
```

Then scan the copy again and open both in a browser to compare.

Survey fixtures (components and roles):

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs northwind-admin.html --inventory --no-palette
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs northwind-viewer.html --inventory --no-palette
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs --src northwind-src
```

The admin page prints `INVENTORY SWAP` with `table-timeseries-to-chart` (Monthly revenue), `table-few-to-kpi` (Summary), `counts-to-bar` (Order status) and `placeholder-widget` (Supplier portal). The viewer page prints `INVENTORY FIT`. The source folder prints `ROLES admin, manager, viewer | guards 2 | routes 4 (2 guarded)`: `/admin/users` and `/reports` are admin only, `/` and `/orders` are open.

Status fixtures (same fictional team data, plain vs designed):

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs northwind-team.html --status --no-palette --no-layout
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs northwind-team-designed.html --status --no-palette --no-layout
```

`northwind-team.html` (plain) prints:

```
INVENTORY SWAP  (table 1, kpi 4, list 2)
- table-status-to-rows: table "" 9 rows with a status column and a percent column, no progress bar -> project row: progress bar + status pill
- long-list-no-filter: table "" 9 rows with a status column, no tabs/select/search near it -> segmented tabs with counts
- flat-dates-to-groups: list "" 7 dated items, no group heading between them -> group by Overdue / Today / This week
- people-list-to-capacity: list "" 5 people with a number each, no bar -> capacity bars with state labels (Light / Balanced / Heavy / Over)
- kpi-no-context: kpi "Open projects" 0 letters besides label and numeral -> add a context line (change or next step)
  (3 more kpi-no-context lines: On time rate, Open tasks, Avg cycle time)
- search-no-shortcut: form "" 1 search input without a shortcut hint -> show a kbd hint (Ctrl K or /)
- no-page-summary: page "" no sentence of 6+ words within 120px under the h1 -> one summary sentence that carries the numbers

STATUS FIX  (18 labels, 9 words, 1 styles, 2 colours)
- status-plain: 9 labels in "Status" are plain grey text, no pill -> markup fix (Mode C brief) (status.md)
```

`northwind-team-designed.html` (same data, designed) prints:

```
INVENTORY FIT  (table 1, kpi 4, list 3)
- every component matches the shape of its data

STATUS OK  (18 labels, 9 words, 2 styles, 4 colours)
```

Both score 0 / LEAVE on the spacing metrics. The difference is status, structure and content, which a spacing pass cannot produce. Labels print empty (`""`) for tables and lists whose heading sits outside the card. The label count includes the Owner column (names that repeat), which is counted but not judged because it does not look like a state. Label detection is structural (repeated short text in a column, or pill-styled text) and works for any words; the fit rules that look for a state column and the date and person rules still use English word lists, and all of it is heuristic.

Design checks (opt-in, general rules; see `../plugins/dashboardlify/skills/dashboardlify/references/design-checks.md`):

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs clean-dashboard.html --design --no-palette --no-layout
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs northwind-team-designed.html --design --no-palette --no-layout
```

`clean-dashboard.html` prints:

```
DESIGN OK  (accent azure in 2 roles, 1 button fill, 1 hue, type 1.85x (2 styles near largest), neutral ~100%, grouping 4x, loud 1)
advisory: squint: heaviest region of the first screen at x 70% y 0% (25% x 24%, 14% of the contrast weight) holds div.card; covers a largest-size text "8,742" (likely headline or KPI) (heuristic thumbnail pass, never changes the verdict)

PHONE FIX  (0 texts under 12px, 8 targets under 40px, scrolls sideways)
- phone-size: at 390px wide: page scrolls sideways (802px wide at 390px; widest: main.main to 802px, div.top to 770px, div to 770px; a table overflows); 8 tap targets under 40px (smallest a 36px, a 36px, a 36px) -> CSS fix (Mode B) (design-checks.md)
```

`northwind-team-designed.html` prints:

```
DESIGN FIX  (accent orange in 1 role, 1 button fill, 4 hues, type 2.29x (1 style near largest), neutral ~99%, grouping 16x, loud 1)
- too-many-hues: 4 hue families (max 3): orange 30-59deg 37%, green 120-149deg 33%, red 0-29deg 22%, azure 210-239deg 8% -> CSS fix (Mode B) (design-checks.md)
advisory: squint: heaviest region of the first screen at x 0% y 32% (25% x 24%, 22% of the contrast weight) holds aside; does not cover any of the 4 largest-size texts on this screen (heuristic thumbnail pass, never changes the verdict)

PHONE SKIP (page declares a desktop viewport or none)
```

`clean-dashboard.html` declares `width=device-width` but has no phone layout, so the `PHONE` check measures it and reports FIX. The other fixtures declare no phone viewport and print `PHONE SKIP`. `northwind-team-designed.html` shows `too-many-hues`: its orange, green, red and azure come from the accent, progress bars and dots, and the heuristic cannot always separate those from status colours. Confirm each hit by hand.
