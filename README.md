# dashboardlify

`dashboard-taste`: an AI skill that unslops, builds and redesigns admin dashboards with tight, consistent sizing, spacing, radius, color, type, shadow and restrained motion. Text only, no binary assets.

Modes: **Build** (new dashboard), **Unslop** (fix an existing one with greps + token swaps), **Redesign** (measure, audit, brief, then rebuild).

## Install

Claude Code plugin:

```
/plugin marketplace add ednaaaj/dashboardlify
/plugin install dashboard-taste@dashboardlify
```

Or copy the skill by hand:

```
git clone https://github.com/ednaaaj/dashboardlify
cp -R dashboardlify/plugins/dashboard-taste/skills/dashboard-taste ~/.claude/skills/
```

Then ask: "unslop this dashboard" or run `/dashboard-taste`.

## Credits

Inspired by [taste-skill](https://github.com/Leonxlnx/taste-skill) and [impeccable](https://github.com/pbakaus/impeccable). Reference files were read for ideas only; check their licenses before reusing anything verbatim.
