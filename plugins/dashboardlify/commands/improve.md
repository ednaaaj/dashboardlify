---
description: One command for an existing dashboard: measure it, decide what it needs (colors, layout, components), do it, and prove the change is visible
argument-hint: <url | file.html | --src dir> [--copy]
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`). This is the single front door for an existing dashboard; the user should not have to pick a mode. Target: $ARGUMENTS (if empty, ask for a URL, an html file or a source dir, once).

1. Measure. Run `node <skill dir>/scripts/scan.mjs <target> --shot before.png --json before.json`. Print the value verdict, the PALETTE verdict and the LAYOUT verdict in three short lines.
2. Decide from the verdicts and print the plan in one line each. Run the needed passes in this order and skip the ones not needed:
   - PALETTE ADJUST or REPLACE, or value verdict TIGHTEN: Mode B (tokens, spacing, type, color, radius, icons, motion). PALETTE REPLACE changes a brand hue: ask first.
   - LAYOUT ARRANGE: Mode D (CSS-only layout).
   - LAYOUT REWORK, value verdict REWORK, or JSX-only issues left (placeholder widgets, wrapper markup, component structure): Mode C. It needs an approved brief, so write the brief and stop for approval before editing anything for this part. Apply the B and D parts first.
   - All three OK/KEEP/LEAVE: say the screen is already tight, give at most 3 refinements, stop.
3. Follow the steps of each chosen mode in SKILL.md exactly (scope, pass order, JSX rules, no commit or stage).
4. Verify with `scan.mjs <target> --compare before.json --visible-change before.png --shot after.png`. NOT VISIBLE (<3%) or SUBTLE is never reported as done: diagnose and say why. With `--src` the gate cannot run: say so.
5. Report: the three verdicts before and after, the visible-change percent, files changed, and anything left with the one command or mode that handles it.

`--copy` also rewrites copy in Mode B. The narrower commands (`scan`, `tighten`, `arrange`, `rework`) still exist for running one step alone.
