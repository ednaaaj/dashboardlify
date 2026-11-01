---
description: Tighten a whole dashboard app (shell + every page) with visible, token-based changes; CSS only
argument-hint: [optional: path or page; default = whole app] [--copy]
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`) in Mode B: TIGHTEN.

Scope: `$ARGUMENTS` (minus flags). If empty, the scope is the WHOLE APP: the shell (sidebar, topbar, page wrapper, breadcrumb), the dashboard/home page, and every routed page. Never stop after one file.

Procedure:
0. Triage. Run `node <skill dir>/scripts/scan.mjs <url-or-html> --shot before.png --json before.json` (or `--src <dir>` when there is no dev server; layout is then unmeasured). Read the PALETTE block (verdict KEEP/ADJUST/REPLACE, see references/color-match.md; `--no-palette` skips it) and the LAYOUT block. If the layout verdict is ARRANGE or REWORK, say up front in one line: "Values-only pass: positions and hierarchy will not change. Run /dashboardlify:arrange for layout." Then branch on the value verdict:
   - LEAVE: say the screen is already tight, suggest at most 3 refinements with exact values, stop.
   - TIGHTEN: continue.
   - REWORK: tell the user to run /dashboardlify:rework instead, unless they insist on continuing.
1. Discover scope. Read the router (App.js / routes) and list every page and its CSS (global, plain and `*.module.css`). Print the list with line counts. Process all of it.
2. Pass order, each pass finished across the whole app before the next:
   1. token bridge: if `tokens.css` (or a bridge mapping the app's own variables to the skill tokens) is not imported at the app entry, add it first
   2. spacing: onto the 4px scale; density targets topbar 48-56, nav item 32-36, table row 40, card padding 16-20, page padding 24
   3. type and case: sizes to the scale, uppercase body/buttons/tabs/table text to sentence case, weights 400/500/600, page title 20-24/600
   4. colour and shadow: obey the palette verdict (KEEP = do not recolour, contrast fixes and shadow removal only; ADJUST = keep hue, fix L/C/contrast, tint neutrals; REPLACE = stop and tell the user to run /dashboardlify:rework unless they insist), one accent, never greyscale-only, contrast >= 4.5:1, remove card shadows (overlays keep theirs). Print the Color brief first
   5. icons: one size per context (nav 16, buttons 14-16, KPI 16-20), outline weight
   6. radius and borders: radius by preset (crisp: cards 8, controls 4-6; soft: cards 12-16, controls 8-full), max 4 distinct values (5 in soft)
   7. detail rules: components.md "Detail rules" (nested radius, stat cards, number format, keycaps)
   8. motion: 120-220ms, no `transition: all`, no looping decoration
   9. copy: only if `--copy` is in $ARGUMENTS, following references/copy.md. Without the flag, copy and JSX stay untouched.
3. Do not change JSX (except string literals under `--copy`), routes, props or behavior. Preserve all class names. Do not commit or stage.
4. Verify: braces balance, files parse, build passes. Re-run the scan with `--compare before.json --visible-change before.png` (at most 3 renders in total) and run checklist.md. Print the VISIBLE CHANGE verdict honestly. NOT VISIBLE (< 3%) is never "done": diagnose (override lost on specificity or import order, wrong files, dead CSS, or the issue is layout) and say so. SUBTLE (3-8%) is reported as subtle.
5. Report a table per file: before -> after counts (font sizes, radii, hex colors, off-scale spacing, uppercase rules, icon sizes), plus the scan delta table. If a file changed fewer than 5 values, say why. Include the Color brief and a "Cut candidates (not applied)" list per references/render-only.md; delete nothing. Report both verdicts (value and LAYOUT) before and after, the visible-change percent, and a "Layout issues left" list (point to /dashboardlify:arrange or /dashboardlify:rework). List pages and files NOT covered. Be honest if the change would be hard to see; if so say a /dashboardlify:rework is needed.
