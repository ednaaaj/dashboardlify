---
description: Rearrange a dashboard's layout with CSS only (shell size, hero, card grid, padding, icon tiles); no JSX changes
argument-hint: [optional: path or page; default = whole app]
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`) in Mode D: ARRANGE. Scope: `$ARGUMENTS`. If empty, the scope is the WHOLE APP (shell plus the home page and every routed page).

Mode D moves and resizes things with CSS. It never touches JSX, props, routes or data. The recipes live in references/layout-recipes.md.

Procedure:
0. Measure. Run `node <skill dir>/scripts/scan.mjs <url-or-html> --shot before.png --json before.json`. If there is no running page, ask the user for a URL once; without one, use `--src <dir>` and state that layout numbers are unmeasured. A `--src` run has no rendered page, so the visible-change gate cannot run: say "gate not run", never claim VISIBLE, and ask for a URL or html file. Read the LAYOUT block (verdict OK / ARRANGE / REWORK and the issue list). OK (score under 3, or only low-weight JSX notes): say so and stop. ARRANGE: continue. REWORK (JSX-only high-weight issues dominate): apply every CSS-fixable issue first, hand the JSX-only issues to /dashboardlify:rework, and say which. Issues that the scan marks `jsx` are never Mode D work.
1. Map. For each issue id in the LAYOUT block, open its section in references/layout-recipes.md (topbar-height, hero-height, equal-weight-grid, icon-tiles, placeholder-widgets, truncated-text, data-above-fold, card-padding, sidebar-width, content-width).
2. Find the real selectors. Read the router, the page component and its CSS. Locate the container whose DIRECT children are the cards (the grid or flex parent), the hero, the top bar and the sidebar. If a wrapper div, an inline style or a utility class stops the CSS from working (children not direct, inline styles), say so and mark that issue "needs JSX -> /dashboardlify:rework". Do not work around it with hacks.
3. Apply, in this order: shell (top bar height, logo max-height, sidebar width), hero cap (to 120-160px), card grid reflow (grid-template-columns or areas, spans, order, gap), card padding, icon tiles, truncation. On legacy stacks (MUI v4, Bootstrap 4, CSS modules) raise specificity or put the overrides in a late-imported bridge file. Never use `!important` unless the original code already does. MUI v4: `makeStyles`/`withStyles`/`styled` style objects are CSS, so editing the style object in place counts as CSS-only and is allowed. Never target generated JSS class names (`[class*=jss]`); they change in production. Prefer the component's own style object or a stable wrapper class, or the `MuiXxx-root` global names (not hashed) with raised specificity. Bootstrap 4: override with a later-loaded stylesheet using prefixed selectors such as `.page .card`, not `!important`.
4. Verify. Re-run `scan.mjs <same target> --compare before.json --visible-change before.png --shot after.png`. The result must read VISIBLE (>= 8%); INCOMPARABLE (different width) means re-shoot both at the same `--width`, and `--shot` and `--visible-change` must use different paths (exit 2 if equal). With `--src` the gate cannot run (see step 0). If it does not, report why (override lost on specificity or import order, wrong file, dead CSS, or the remaining issues need JSX). Never claim success on SUBTLE or NOT VISIBLE.
5. Report: per issue the before and after numbers, files and selectors changed, issues left that need JSX, the screenshot paths, and both verdicts (value and LAYOUT) before and after.

Rules:
- No JSX, props, routes or data changes. Preserve class names. Do not stage or commit.
- Text stays unchanged.
- Content order stays the same for screen readers. Use the visual `order` property only on cards that are not sequence-critical, and note each use in the report.
- Responsive: add a media query fallback to a single column under 900px.
- Keep dark mode intact: use the app's variables, no hard-coded light colours.
- Check 1280, 1440 and 768 widths for new horizontal scroll, then run checklist.md.
