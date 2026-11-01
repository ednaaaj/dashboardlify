# Render only what earns its place

A dashboard region exists to support a decision. If it cannot name one, it is cut or merged.

## Which modes use it

- BUILD (A): choose the screen's contents with it before drawing anything.
- REWORK (C): run it in the audit and put the result in the brief's "Removed or moved" table.
- TIGHTEN (B): never deletes anything. It only lists cut candidates in the report.

## Per dashboard type

Typical shape everywhere: 3-5 KPIs with comparisons, one primary visual, one filterable table, one alerts/needs-attention strip.

| Type | Render only | Cut or merge |
|---|---|---|
| Finance / ops | KPIs (balance, inflow, outflow, overdue), one trend chart, transactions table, overdue/failed strip | welcome banner, duplicate totals, second equal-weight chart, vanity lifetime totals |
| Health / clinic | today's appointments or cases, wait/capacity KPIs, one schedule or volume visual, needs-attention list (overdue, unconfirmed) | decorative illustrations, generic health tips, duplicate patient counts |
| Analytics / BI | 3-5 KPIs with period comparison, one hero chart, one breakdown table, anomalies strip | many same-weight charts, "AI insights" fluff, unlabeled sparklines repeating the KPI |
| E-commerce / orders | orders, revenue, refund rate, fulfilment KPIs; one sales chart; orders table; stuck/failed orders strip | social or marketing blocks, product carousels, empty placeholder widgets |
| Devtools / monitoring | health KPIs (error rate, latency, uptime), one time-series, events/logs table, active incidents strip | decorative status art, duplicate uptime numbers, second chart of the same metric |
| Admin / CRUD | one filterable, sortable table, bulk actions, create button, needs-attention count | dashboards on top of a list page, duplicate counts, welcome copy |
| Settings | grouped forms, one save pattern, danger zone last | stats, banners, promotional upsells inside settings |

Always cut or merge: welcome banner, decorative illustrations, duplicate KPIs showing the same fact, vanity totals, a second chart of equal weight, empty placeholder widgets, social/marketing blocks, "AI insights" filler.

## Required states per region

Every data region renders three non-happy states: loading (skeleton), empty (says why and what to do), error (message plus retry).

## Caps

- At most 6 KPIs on one screen.
- At most 1 hero chart.
- At most 2 data visuals of the same kind.
- Table: a default sort and a pinned toolbar (search, filters, actions).

## Six questions per region

1. Which decision does it support, in one sentence?
2. Who makes that decision, and how often?
3. Is the same fact shown elsewhere on this screen?
4. Would removing it change what anyone does?
5. Does it have loading, empty and error states?
6. Does it fit the caps above without crowding a higher-priority region?

A region that fails 1 or 4 is cut. One that fails 3 is merged. Failing 5 or 6 means fix or demote it.

## Cut list format

| Region | Decision it supports | Keep / merge / cut | Reason |
|---|---|---|---|
| Welcome banner | none | cut | greeting only, pushes KPIs below the fold |
| Revenue and Sales KPIs | track income | merge | same number twice |
| Orders table | triage stuck orders | keep | primary working surface |

In TIGHTEN, title this "Cut candidates (not applied)". In REWORK, it feeds the "Removed or moved" table, where every removed item also names its new access point.
