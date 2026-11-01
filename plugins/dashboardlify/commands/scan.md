---
description: Measure a dashboard and print the slop table and a LEAVE / TIGHTEN / REWORK verdict; makes no edits
argument-hint: <url | file.html | --src dir>
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`), "Triage first" section. Target: $ARGUMENTS (if empty, ask for a URL, an html file or a source dir, once).

Run `node <skill dir>/scripts/scan.mjs $ARGUMENTS` (a URL or html file renders in Chrome; `--src <dir>` gives a source-only estimate). Print the table and the verdict exactly as the script reports them, including the PALETTE block (domain, primary, issues, KEEP/ADJUST/REPLACE verdict). Pass `--no-palette` to skip it. If the verdict surprises you, say so and why.

Make NO edits. Do not commit or stage. Finish by recommending the next command: LEAVE -> nothing (or up to 3 refinements), TIGHTEN -> /dashboardlify:tighten, REWORK -> /dashboardlify:rework.
