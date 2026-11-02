# Survey

Measuring one screen as one role misses most of the app. Survey first: build a matrix of pages x roles x states, measure each reachable cell, and say plainly which cells were not covered. Used by `/dashboardlify:improve` step 0 and Mode C.

## 1. Pages

List every routed page, from the router config, the file-based routes (`app/**/page.*`, `pages/**`) and the sidebar or top-nav links. `scan.mjs --src <dir>` prints a route table with a guarded flag. Add pages reachable only by a menu or a modal when the nav shows them. A page with a dynamic segment (`/orders/:id`) counts once.

## 2. Roles

Take the roles from the `ROLES` block of `scan.mjs --src <dir>`. It is a regex estimate: check the names against the code. `ROLES none found in source: ask the user`: ask once which roles exist and which pages each can reach. A route is guarded when a guard or role check sits near it or a path segment equals a role name.

## 3. States

Per page: default, empty, loading, error, long-data (names, labels and counts at their worst, see [components.md](components.md) detail rules). Skip a state the page cannot reach (a static settings page has no empty state) and write "n/a" with the reason.

## 4. Producing each state

| State | How |
|---|---|
| default | Render the page as the role |
| error, empty | `scan.mjs <url> --block '<pattern>'` blocks matching requests (repeatable) so the page shows its own error or empty branch. Pattern: the API path, e.g. `'*/api/orders*'` |
| loading | Read the app's own skeleton branch in source. A render only counts if the skeleton is caught on screen |
| long-data | Seed or fixture data, only when the user approves. Never write to a real backend |

## 5. Authentication

- Ask the user for a test account per role, or a `--storage-state <file>` (Playwright-style JSON: cookies and localStorage) for each role. Keep the file OUTSIDE the repo.
- Never store, print or commit credentials, tokens or cookie values. The scan prints only `auth: N cookies, M storage keys`.
- Never log in with real or production data unless the user supplies a test account for it.
- A role that cannot be reached: fall back to a source-only check of that page (`--src`, read the component) and mark the cell `source-checked`.

## 6. Evidence per cell

| Evidence | Meaning |
|---|---|
| rendered | Measured in Chrome with `scan.mjs <target> --inventory` as that role in that state |
| source-checked | Read in source only: no render, so no measured sizes |
| not covered | Not looked at. Always give the reason (no test account, needs seed data, page behind a flow) |

## 7. Per-cell report

One row per page, role and state cell. Never drop a cell silently.

| Page | Role | State | Evidence | INVENTORY | Notes |
|---|---|---|---|---|---|
| /reports | admin | default | rendered | SWAP | table-timeseries-to-chart |
| /reports | viewer | default | not covered | | no test account |
| /orders | manager | error | rendered | FIT | |
| /admin/users | admin | loading | source-checked | | skeleton branch in `Users.tsx` |

## 8. Heuristic false positives

The scan output is evidence, not a ruling. Role names, guards, routes and every INVENTORY rule come from regexes and DOM heuristics. Read the code behind each hit, then label the ones that do not hold ("false positive: the dates are IDs, not a time series"). Do not act on an unlabeled hit you have not checked.
