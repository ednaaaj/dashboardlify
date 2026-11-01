# dashboardlify

[![skills.sh](https://skills.sh/b/ednaaaj/dashboardlify)](https://skills.sh/ednaaaj/dashboardlify)

**`dashboardlify`** is an AI skill for Claude Code that builds, tightens and reworks admin dashboards so they look designed instead of generated. Every size, color, radius, shadow and duration comes from a fixed token set, so output is consistent and checkable.

Text files only. No binaries, no build step, no dependencies. The optional scan needs Node 22 and Chrome, nothing to install.

## What it fixes

Typical "AI dashboard" problems it targets:

- Random spacing (5px, 10px, 18px) and 10+ font sizes
- Five different border radii, heavy shadows on every card, nested cards
- Gradients, glow, glass and emoji icons used as decoration
- Several accent colors, low-contrast grey text, mixed icon sets
- Bouncy, looping or slow animations

## Modes

| Mode | Use it when | What it changes |
|---|---|---|
| **A. Build** | Starting a new dashboard | Whole screen, from tokens |
| **B. Tighten** | You have a dashboard and want it cleaned up | CSS values only. Behavior and structure stay the same |
| **C. Rework** | You want layout, hierarchy, charts and density reworked | Structure too. It writes a brief first and waits for your approval before touching code |

Two style presets, pick one per product:

- `crisp` (default): radius up to 8, hairline borders, no shadows
- `soft`: cards 12-16, pill controls, tinted page behind cards

Three densities: compact (tables, ops), default (mixed), comfortable (settings).

## Install

### As a Claude Code plugin (recommended)

```
/plugin marketplace add ednaaaj/dashboardlify
/plugin install dashboardlify@dashboardlify
```

Update later with `/plugin`. Slash commands need the plugin.

### Any agent (skills CLI)

Skill only: `npx skills add` installs the skill and no slash commands. Works with Claude Code, Cursor, Codex, Windsurf and others:

```
npx skills add ednaaaj/dashboardlify
```

### Manually

```
git clone https://github.com/ednaaaj/dashboardlify
cp -R dashboardlify/plugins/dashboardlify/skills/dashboardlify ~/.claude/skills/
```

For one project only, copy it into `<project>/.claude/skills/` instead.

## Commands

| Command | What it does |
|---|---|
| `/dashboardlify:scan <url\|file\|--src dir>` | Measure and print a verdict, no edits |
| `/dashboardlify:tighten <path> [--copy]` | B: whole-app token pass, CSS only |
| `/dashboardlify:rework <path>` | C: measure, audit, brief, approve, rebuild |
| `/dashboardlify:build` | A: new dashboard from tokens |

## Measure first

Every existing-dashboard run starts with a scan, so the work follows evidence instead of taste.

```
node plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs <url|file.html>... [--json f] [--compare before.json] [--dark] [--width n] [--no-palette]
node plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs --src <dir>   # source-only estimate
```

Needs Node 22 and Chrome. No installs. It counts the things that make a screen look generated: distinct font sizes, radii and colours, off-scale spacing, shadows, gradients, uppercase text, mixed icon sizes, low-contrast text, and long or looping motion.

| Score | Verdict | Meaning |
|---|---|---|
| < 8 | LEAVE | Already tight. At most 3 refinements, no rewrite |
| 8-35 | TIGHTEN | Token pass, CSS only |
| > 35 | REWORK | Structure needs a brief and approval |

Example delta after a tighten run (illustrative numbers):

| Metric | Before | After |
|---|---|---|
| Font sizes | 11 | 5 |
| Radii | 6 | 3 |
| Colours | 24 | 9 |
| Off-scale spacing | 38 | 0 |
| Shadows | 9 | 1 |
| Score | 52 | 6 |

## Colour matching

The scan also prints a PALETTE block: detected domain (finance, health, logistics, ...) with confidence and signals, the primary colour and where it came from, issues, and a verdict. It is separate from the LEAVE / TIGHTEN / REWORK verdict. Skip it with `--no-palette`.

| Verdict | Meaning | What happens |
|---|---|---|
| KEEP | Colours are cohesive | Never recoloured; only contrast fixes |
| ADJUST | Hue is fine, lightness/chroma/contrast off | Hue kept, contrast fixed, mapped to the curated paired neutral |
| REPLACE | Rainbow or violet-to-pink style gradient | Rebuilt around one curated accent and its paired neutral; asks first if a brand colour is known, otherwise proposes the domain default |

Domain detection (keywords per domain in palettes.json, 28 domains from finance and health to real estate, food, legal, crypto, government, agriculture, gaming and more) only supplies a default accent when no brand colour exists. Each domain has three curated combos with three surface zones in light and dark: a tinted paper page instead of pure white, a brand zone (the accent as a whole surface with light foreground) and an ink zone (dark neutral with light foreground). `calm` suits dense data, `paper` warm or consumer products, `brand` brand-heavy products; every pair is measured at 4.5:1 or better. Output is never greyscale-only. Before recolouring, the agent prints a Color brief. Illustrative example:

```
Color brief
Domain:    finance (confidence high; signals: invoice, payout, ledger)
Verdict:   REPLACE
Primary:   none reliable (violet-to-pink gradient, rainbow charts)
Issues:    hue-to-hue gradient, 5 unrelated chart hues
Proposed:  curated blue + slate; --accent-base light #0d74ce / dark #2870bd (white text), neutrals from slate
Contrast:  white on accent-base 4.7:1 (light) / 5.0:1 (dark) | accent-text on surface 4.5:1 (light)
Combo:     paper (warm editorial feel, white cards on tinted paper)
Zones used: paper page, brand sidebar (#0d74ce, white text), no ink zone
Changes only if verdict is ADJUST or REPLACE
```

Details: `references/color-match.md` (rules), `references/palettes.md` (curated pairs, domain defaults, zones) and `references/palettes/combos.md` (all combos, generated).

## Render only what earns its place

Every region must name the decision it supports. Build picks contents with that test, rework puts the cut list in its brief, and tighten only lists cut candidates without deleting anything. Caps: at most 6 KPIs, one hero chart, loading/empty/error states per region. See `references/render-only.md`.

## Try it

Two sample pages ship in `examples/`:

```
node plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs examples/slop-dashboard.html
node plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs examples/clean-dashboard.html
```

The first scores high, the second lands on LEAVE.

## How to use

Open Claude Code in your project and ask in plain words. The skill triggers on dashboards, admin panels, analytics views, data tables and settings pages. You can also call it directly with `/dashboardlify`.

| You say | Mode |
|---|---|
| "Build me an orders dashboard, compact, crisp" | A |
| "Tighten this dashboard" / "clean up the spacing and colors" / "swap in tokens" | B |
| "Rework the home page" / "reorganize the layout" / "turn this table into charts" | C |

What happens:

1. **Build:** picks density and preset, imports `tokens.css`, builds shell then page then components, adds empty/loading/error states, runs `checklist.md`.
2. **Tighten:** scans first, then greps your source for off-scale spacing, extra radii, raw hex, shadows and long durations, maps them to tokens, then re-checks.
3. **Rework:** measures the current UI (`measure.md` snippet gives region sizes, color and font histograms, contrast failures, icon sizes), audits it against 18 checks, writes a before/after brief, and only edits code after you approve.

Tip: commit or branch first. Modes B and C edit files in place.

## Using the tokens directly

`references/tokens.css` is plain CSS variables and works without the skill:

```css
@import './tokens.css';

.card {
  padding: var(--card-pad);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition: border-color var(--dur-fast) var(--ease-out);
}
```

- Light and dark via `data-theme`, density via `data-density`, preset via `data-style="soft"`
- Existing app with its own variables? Map them onto the token names in a small bridge file instead of rewriting every rule

## Core rules (short version)

1. One accent color, everything else neutral (tinted toward the accent, never greyscale-only)
2. 4px spacing scale: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
3. Type sizes 12 / 13 / 14 / 16 / 20 / 24, one font family, weights 400 / 500 / 600
4. Radius by preset, never above 16 except fully round
5. Borders instead of shadows. Shadows only on floating layers (menu, popover, modal)
6. Motion 120-220ms, transform and opacity only, nothing over 300ms, no bounce
7. Text contrast at least 4.5:1, no decoration without information

## What is inside

```
plugins/dashboardlify/skills/dashboardlify/
├─ SKILL.md            entry point: modes, hard rules, procedures
├─ checklist.md        verify before you call it done
├─ scripts/scan.mjs    measure a page or source dir, print a verdict
└─ references/
   ├─ tokens.css       the variables (copy, do not retype)
   ├─ tokens.md        scales and when to use each
   ├─ color.md         neutral ramp, accent, status, charts
   ├─ color-match.md   KEEP / ADJUST / REPLACE rules, legibility, Color brief
   ├─ palettes.md      curated pairs, 28 domains, zones and combos, dark mode, charts
   ├─ palettes/        palettes.json (scales, domains, combos, contrast), combos.md (generated), NOTICE.md
   ├─ render-only.md   which regions earn a place, caps, cut list
   ├─ layout.md        shell, grid, page widths
   ├─ density.md       compact / default / comfortable
   ├─ components.md    cards, tables, forms, charts, nav, states
   ├─ motion.md        allowed transitions and reduced motion
   ├─ copy.md          opt-in copy pass (--copy)
   ├─ anti-slop.md     62 patterns to avoid, each with a fix
   ├─ redesign.md      Mode C (rework) procedure, audit, brief template
   ├─ measure.md       browser snippet to measure an existing UI
   ├─ metric-to-visual.md  which chart or display fits which metric
   ├─ patterns.md      common dashboard layouts
   ├─ stack.md         free libraries worth adding, and which to skip
   └─ examples/        notes on linear, vercel, stripe, supabase, posthog, mercury, attio, shadcn
```

## Limits

- Works best on web dashboards (React, Vue, plain HTML/CSS, Tailwind)
- Does not generate images, logos or illustrations
- Mode C needs a screenshot or running app to measure well. Without one, numbers are estimates and it says so
- Does not replace a designer for brand work

## License

Licensed under the terms in [LICENSE](LICENSE).
