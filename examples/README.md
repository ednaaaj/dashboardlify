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

STATUS FIX  (9 labels, 3 words, 1 styles, 1 colours)
- status-plain: 9 status labels are plain grey text, no pill -> markup fix (Mode C brief) (status.md)
```

`northwind-team-designed.html` (same data, designed) prints:

```
INVENTORY FIT  (table 1, kpi 4, list 3)
- every component matches the shape of its data

STATUS OK  (9 labels, 3 words, 1 styles, 3 colours)
```

Both score 0 / LEAVE on the spacing metrics. The difference is status, structure and content, which a spacing pass cannot produce. Labels print empty (`""`) for tables and lists whose heading sits outside the card. Detection is English-only and heuristic.
