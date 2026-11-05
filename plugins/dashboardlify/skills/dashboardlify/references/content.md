# Content rules (page summary, KPI context, dates, groups, activity, empty states)

Structure and wording of the text a dashboard shows. Word-level rules (labels, tone, sentence case, no hype) live in `copy.md`; do not repeat them here. Word lists are English: on pages in other languages the status, date and person rules find nothing (`kpi-no-context` and `no-page-summary` count letters and words, so they still run), and the rules below are a judgment pass there.

## Rules

| # | Rule | Do | Not | Scan |
|---|---|---|---|---|
| 1 | Page summary | One sentence under the page title (h1) that carries the numbers that matter: `12 projects, 3 need attention, 2 overdue.` At least 6 words | Title alone, or a subtitle with no number | `no-page-summary` (advisory, no sentence of 6+ words within 120px under the h1) |
| 2 | KPI context line | Under each numeral say what changed or what to do next: `+4 since Monday`, `2 invoices past due, review`, `3 of 5 on track` | Label + numeral and nothing else | `kpi-no-context` (fit rule: card text minus label and numeral has fewer than 6 letters) |
| 3 | Relative dates | Near dates relative: `2 days late`, `today 5:00 pm`, `in 3 days`. Absolute after ~7 days: `12 Nov` | `2026-11-03T17:00:00Z`, or `Nov 3` for something due today | `flat-dates-to-groups` sees dates only to count them; wording is judgment |
| 4 | Grouped lists | Time-ordered lists get group headings in this order: Overdue, Today, This week, Later. Heading carries a count: `Overdue (3)` | One flat list of 6+ dated items | `flat-dates-to-groups` (6+ dated items, no heading or group row between) |
| 5 | Activity feed | Bold the entity (person, project, invoice), plain verb, relative time last: `**Maya Chen** closed **Q4 Audit** 2 hours ago`. One line each | Full sentences, bold verbs, absolute timestamps | judgment only |
| 6 | Empty state | Say what is missing, why, and the one next action: `No overdue tasks. Everything due this week is on track.` or `No invoices yet. Create invoice` | `No data`, `Nothing here`, a blank card | judgment only |
| 7 | Numbers in prose | Same unit and precision as the KPI they restate; the summary count equals the list count | Summary says 3, list shows 4 | judgment only |

## Scan coverage

| Check | Type | Where reported |
|---|---|---|
| `kpi-no-context` | fit rule (changes INVENTORY toward SWAP) | `scan.mjs --status` |
| `no-page-summary` | advisory (does not change a verdict) | `scan.mjs --status` |
| Everything else in this file | judgment, no scan | review by hand |

State checks are English-only and heuristic: hits are evidence to confirm by hand, misses are not proof. Text in another language is not matched by the status, date and person rules; apply them manually. Known false positives: changelog-style dates read as a deadline list, Title Case project names under a "Team" heading read as people, and a div-built sidebar is not excluded as navigation.

## Patterns

Summary sentence, built from the real data, most urgent first:

```
<total> <things>, <n> need attention, <n> overdue.
12 projects, 3 need attention, 2 overdue.
```

KPI card:

```
Open invoices            <- label
48                       <- numeral
6 past due, review       <- context line (muted, 12-13px)
```

Grouped list:

```
Overdue (2)
  Send contract to Northwind Supply     2 days late
Today (1)
  Review Q4 budget                      today 5:00 pm
This week (4)
  ...
```

## Rules for the edit

- Take every number from the data or the existing markup; never invent a count. If no source exists, write the sentence with a placeholder and list it for the user.
- The context line is muted text (`--text-muted`), one line, same width as the numeral block.
- Relative dates need a reference clock: compute from the data, not hard-coded text. Keep the absolute value in `title`/`datetime`.
- Labels, tone and punctuation: see `copy.md`.
