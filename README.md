# dashboardlify

**`dashboardlify`** is an AI skill for Claude Code that builds, cleans up and redesigns admin dashboards so they look designed instead of generated. Every size, color, radius, shadow and duration comes from a fixed token set, so output is consistent and checkable.

Text files only. No binaries, no build step, no dependencies.

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
| **B. Unslop** | You have a dashboard and want it cleaned up | CSS values only. Behavior and structure stay the same |
| **C. Redesign** | You want layout, hierarchy, charts and density reworked | Structure too. It writes a brief first and waits for your approval before touching code |

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

Update later with `/plugin`.

### Manually

```
git clone https://github.com/ednaaaj/dashboardlify
cp -R dashboardlify/plugins/dashboardlify/skills/dashboardlify ~/.claude/skills/
```

For one project only, copy it into `<project>/.claude/skills/` instead.

## Commands

| Command | Mode |
|---|---|
| `/dashboardlify:unslop <path>` | B: CSS-only cleanup |
| `/dashboardlify:redesign <path>` | C: measure, audit, brief, wait for approval |
| `/dashboardlify:build-dashboard` | A: new dashboard |

Manual installs get the short forms `/unslop`, `/redesign`, `/build-dashboard` by copying `plugins/dashboardlify/commands/*.md` into `~/.claude/commands/`.

## How to use

Open Claude Code in your project and ask in plain words. The skill triggers on dashboards, admin panels, analytics views, data tables and settings pages. You can also call it directly with `/dashboardlify`.

| You say | Mode |
|---|---|
| "Build me an orders dashboard, compact, crisp" | A |
| "Unslop this dashboard" / "clean up the spacing and colors" / "swap in tokens" | B |
| "Redesign the home page" / "reorganize the layout" / "turn this table into charts" | C |

What happens:

1. **Build:** picks density and preset, imports `tokens.css`, builds shell then page then components, adds empty/loading/error states, runs `checklist.md`.
2. **Unslop:** greps your source for off-scale spacing, extra radii, raw hex, shadows and long durations, maps them to tokens, then re-checks.
3. **Redesign:** measures the current UI (`measure.md` snippet gives region sizes, color and font histograms, contrast failures, icon sizes), audits it against 18 checks, writes a before/after brief, and only edits code after you approve.

Tip: commit or branch first. Mode B and C edit files in place.

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

1. One accent color, everything else neutral
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
└─ references/
   ├─ tokens.css       the variables (copy, do not retype)
   ├─ tokens.md        scales and when to use each
   ├─ color.md         neutral ramp, accent, status, charts
   ├─ layout.md        shell, grid, page widths
   ├─ density.md       compact / default / comfortable
   ├─ components.md    cards, tables, forms, charts, nav, states
   ├─ motion.md        allowed transitions and reduced motion
   ├─ anti-slop.md     57 patterns to avoid, each with a fix
   ├─ redesign.md      Mode C procedure, audit, brief template
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

## Credits and license

Inspired by [taste-skill](https://github.com/Leonxlnx/taste-skill) and [impeccable](https://github.com/pbakaus/impeccable). Their files were read for ideas only, not copied. Product examples are original summaries of publicly visible UI patterns.

Licensed under the terms in [LICENSE](LICENSE).
