---
description: Unslop a whole dashboard app (shell + every page) with visible, token-based changes; CSS only
argument-hint: [optional: path or page; default = whole app]
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`) in Mode B: UNSLOP.

Scope: `$ARGUMENTS`. If empty, the scope is the WHOLE APP: the shell (sidebar, topbar, page wrapper, breadcrumb), the dashboard/home page, and every routed page. Never stop after one file.

Procedure:
1. Discover scope. Read the router (App.js / routes) and list every page and its CSS (global, plain and `*.module.css`). Print the list with line counts. Process all of it.
2. Bridge tokens. If `tokens.css` (or a bridge mapping the app's own variables to the skill tokens) is not imported at the app entry, add it first. Never use `var(--space-*)` etc. without it defined.
3. Scan each file with the Mode B greps and the measure.md checks. Fix the VISIBLE slop, not only 1-2px snaps:
   - type: collapse font sizes to the scale, uppercase body/buttons/tabs/table text to sentence case, weights to 400/500/600, page title 20-24/600
   - icons: one size per context (nav 16, buttons 14-16, KPI 16-20), outline weight, no 28px+ solid glyphs in nav
   - density: topbar 48-56px, sidebar item 32-36px, table row 40px (nowrap long cells, ellipsis), card padding 16-20, page padding 24
   - radius: max 4 distinct values; cards 8, controls 6
   - color: one accent, neutral surfaces and borders, text contrast >= 4.5:1, status colors via tokens
   - shadow: remove card shadows, keep overlay shadows only
   - motion: 120-220ms, no `transition: all`, no looping decoration
4. Do not change JSX, routes, props or behavior. Preserve all class names. Do not commit or stage.
5. Verify: braces balance, files parse, build passes. If a dev server and a login are available, screenshot before and after.
6. Report a table per file: before -> after counts (font sizes, radii, hex colors, off-scale spacing, uppercase rules, icon sizes). If a file changed fewer than 5 values, say why. List pages and files NOT covered. Be honest if the change would be hard to see; if so say a Mode C redesign is needed.
