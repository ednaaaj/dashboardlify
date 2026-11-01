---
description: Measure a dashboard and print the slop table and a LEAVE / TIGHTEN / REWORK verdict; makes no edits
argument-hint: <url | file.html | --src dir>
---

Use the dashboardlify skill (Skill tool, skill `dashboardlify`), "Triage first" section. Target: $ARGUMENTS (if empty, ask for a URL, an html file or a source dir, once).

Run `node <skill dir>/scripts/scan.mjs $ARGUMENTS` (a URL or html file renders in Chrome; `--src <dir>` gives a source-only estimate). Print the table and the verdict exactly as the script reports them, including the PALETTE block (domain, primary, issues, KEEP/ADJUST/REPLACE verdict). Pass `--no-palette` to skip it. If the verdict surprises you, say so and why.

Flags: `--json <f>`, `--compare <before.json>`, `--dark`, `--width <n>`, `--no-palette`, `--combo calm|paper|brand` (colour combo reported in the PALETTE block: calm for dense data, paper for warm or consumer products, brand for brand-heavy ones), plus the layout flags: `--shot <file.png>` saves the first-screen PNG, `--visible-change <before.png>` compares against an earlier shot and prints `VISIBLE CHANGE n% of the first screen changed: VISIBLE (>=8%) | SUBTLE (3-8%) | NOT VISIBLE (<3%) | INCOMPARABLE` (different width: exit 1; same width with a different height is cropped; `--shot` and `--visible-change` must be different paths, exit 2 if equal), `--height <px>` sets the first-screen height (default 900), `--no-layout` skips the layout checks. Print the LAYOUT block (`LAYOUT OK|ARRANGE|REWORK`: OK = score under 3 or only low-weight JSX notes, ARRANGE = score 3+ fixable by CSS even with JSX-only notes left, REWORK = JSX-only high-weight issues dominate (score 14+ with 2+ JSX issues, or 5+ with a weight 2+ JSX-only issue); and the issue lines `- id: detail -> fix class (css|jsx) -> recipe: <id>`) and the `NEXT:` line as reported. The JSON holds `layout:{verdict,score,issues,metrics}` and `visibleChange:{percent,verdict}`.

Make NO edits. Do not commit or stage. Finish by recommending the next command: LEAVE -> nothing (or up to 3 refinements), TIGHTEN -> /dashboardlify:tighten, REWORK -> /dashboardlify:rework. When the LAYOUT verdict is worse than the value verdict, follow the NEXT line: /dashboardlify:arrange (CSS-only layout) or /dashboardlify:rework.
