---
name: dashboard-taste
description: Unslop, build and redesign dashboards with tight sizing, spacing, radius, color, shadow and motion. Use when building, redesigning, restructuring, reviewing or polishing any dashboard, admin panel, analytics view, back-office, data table screen or settings page, or when the user says a dashboard looks generic, AI-made, sloppy, asks to "unslop" it, "make it look designed/professional", wants a before/after, transform, reorganize layout, or convert data to charts. Works on new and existing code.
---

# dashboard-taste

Numeric, token-driven dashboard design. Every size, color, radius, shadow and duration comes from a token. No invented values.

## Modes

| Mode | Use for | Scope |
|---|---|---|
| A: BUILD | New dashboard | Whole screen from tokens |
| B: UNSLOP | Existing dashboard | CSS values only. Safe, no structure change |
| C: REDESIGN | Existing dashboard | Structure, hierarchy, charts, compression. May change JSX. Needs user approval of a brief before any code edit |

Choosing: "unslop / polish / tokens" -> B. "redesign / transform / change the layout / position / make it better" -> C. Unclear -> ask once.

## Style presets

Pick one preset per product. Never mix.

- `crisp` (default): radius max 8, hairline borders, no shadows.
- `soft`: cards radius 12/16, pill controls, tinted container behind cards. See the `data-style="soft"` section in [references/tokens.md](references/tokens.md).

In soft, cards may use radius up to 16 and controls may be pill-shaped. Every other rule (4px spacing scale, one accent, motion) is unchanged.

## Reading order

1. [references/tokens.md](references/tokens.md) - scales (space, type, radius, shadow, motion). All modes
2. [references/layout.md](references/layout.md) - shell, grid, page widths. A, C
3. [references/density.md](references/density.md) - compact / default / comfortable. A, C
4. [references/color.md](references/color.md) - neutral ramp, one accent, status colors. All modes
5. [references/components.md](references/components.md) - cards, tables, forms, charts, states. A, C
6. [references/motion.md](references/motion.md) - allowed transitions. All modes
7. [references/tokens.css](references/tokens.css) - copy these variables, do not retype values. All modes
8. [references/anti-slop.md](references/anti-slop.md) - patterns to avoid + fix. All modes
9. [references/redesign.md](references/redesign.md) - the full redesign procedure. C
10. [references/measure.md](references/measure.md) - measuring the existing UI. C
11. [references/metric-to-visual.md](references/metric-to-visual.md) - which visual fits which metric. A, C
12. [references/patterns.md](references/patterns.md) - proven dashboard patterns. A, C
13. [references/examples/](references/examples/) - linear, vercel, stripe, supabase, posthog, mercury, attio, shadcn. Pick 1-2 closest to the product
14. [references/stack.md](references/stack.md) - which free libs to add (icons, charts, table, menus) and which to skip. A, C
15. [checklist.md](checklist.md) - verify before done. All modes

## Hard rules

1. One accent color. Everything else neutral.
2. Neutral-first palette. Color only for status, selection, primary action.
3. 4px spacing scale (0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64). No 10px, 14px, 18px, 22px spacing (13/14px are font sizes only).
4. Radius by preset. crisp: radius max 8 on cards (4-6 controls); soft: cards 12-16, controls 8-full; never above 16 except full.
5. Borders over shadows. 1px border; shadow only on floating layers (menu, modal, popover).
6. One font family. Max 3 sizes per region, 2-3 weights total.
7. Motion 120-220ms via `--dur-fast/base/slow` (120/160/220); chart first-load draw-in is the one exception, max 300ms; nothing over 300ms. Movement animates transform/opacity only (never width/height/top/left/margin); color/background-color/border-color fades are allowed for hover/focus. Skeleton shimmer is the only permitted loop (loading only, off under prefers-reduced-motion). No bounce, spring, parallax, count-up, stagger.
8. No decoration for its own sake: no gradients, glass, emoji icons, illustrations that carry no info.

## Mode A: BUILD (new dashboard)

1. Read tokens.md and layout.md.
2. Pick density (compact for tables/ops, default for mixed, comfortable for settings) and preset (crisp or soft). State both.
3. Import tokens.css. Use `var(--...)` only. No raw px/hex in components.
4. Build shell (sidebar + topbar + content max-width), then page, then components.
5. Add empty, loading (skeleton), error states for every data region.
6. Run checklist.md.

## Mode B: UNSLOP (existing dashboard)

Behavior stays identical. Do not redesign layout unless asked.

1. Scan. Grep the source, excluding `references/tokens.css`. Allowed exceptions, not violations: `rounded-full` (avatars/pills), font-size 13px (table) and 14px (body) from the type scale, `box-shadow` on overlays only (popover/modal), skeleton shimmer `gradient`/`keyframes`:
   - radius (`rounded-full`/50%/9999px allowed for avatars, pills and, in soft, controls; drop 9999px hits after matching): crisp (flag > 8px) `border-radius:\s*(9|[1-9][0-9]+)(\.[0-9]+)?px`; soft (flag > 16px) `border-radius:\s*(1[7-9]|[2-9][0-9]+)(\.[0-9]+)?px`; Tailwind: crisp flag `rounded-(xl|2xl|3xl)`, soft allow xl (12)/2xl (16), flag `rounded-3xl`
   - shadow: `shadow-(lg|xl|2xl)`, `box-shadow`, colored shadows
   - color: `#[0-9a-fA-F]{3,8}`, `gradient`, `bg-(purple|indigo|violet|pink)`
   - spacing (off-scale values only): `(padding|margin|gap|inset|top|left|right|bottom)[^;]*\b(10|14|18|22|26|30)px`, `p-\[`, `gap-\[`, `m-\[`
   - motion (run both; review hits, shimmer and chart draw-in are the allowed exceptions): `rg -n '(transition|animation)(-duration)?:[^;]*[0-9.]+m?s' | rg -v 'var\(--dur-'` and `rg -n 'duration-[0-9]+|transition-all|transition:\s*all'`, plus `bounce|spring|keyframes`
   - type: `text-(4xl|5xl|6xl)`, `font-(black|extrabold)`
2. List violations as `file:line | found | token replacement`.
3. Replace with token values. One rule at a time, smallest diff.
4. Fix missing states and contrast (< 4.5:1) found along the way.
5. Re-run the scan; confirm zero hits. Run checklist.md. Confirm no behavior change (props, handlers, data untouched).

## Mode C: REDESIGN (existing dashboard, structure may change)


Steps (same numbering as redesign.md):
0. Context: product, users, the 3 decisions the screen supports, data shape.
1. Map: regions, components, metrics, current visual per metric. Built from screenshots only when Assessment A will run.
2. Two isolated assessments: A = blind design review (screenshots only, no source or class names), B = mechanical scan (greps, measure.md, contrast, histograms). Sub-agents are mandatory whenever a sub-agent/Task tool exists; A finishes and is recorded before any B output enters the synthesis. If run inline, the FIRST line of the report is `DEGRADED: single-context (<reason>)`.
3. Audit against checklist.md and anti-slop.md (redesign.md audit checks #1-18). Label detector false positives explicitly.
4. Brief: spatial thesis, region order (reading path), visual per metric, preset, density, P0-P3 changes, "Removed or moved" table.
5. Approval gate: stop and wait for the user.
6. Apply: one region at a time.
7. Verify: re-measure, checklist.md.

Hard safety rules:
1. Never edit code before the brief is approved.
2. Behavior unchanged: props, handlers, data flow, routes. Build and tests pass.
3. One region per pass. Re-screenshot between passes.
4. Report findings ranked P0-P3.

## Output

Mode A/B: files changed, violations fixed by rule, anything left and why.
Mode C: ranked findings (P0-P3), approved brief, files and every JSX change listed, before/after counts (cards, colors, radii, font sizes, borders), build/test result.

## Credit

Ideas on isolated assessment and spatial thesis are borrowed from [pbakaus/impeccable](https://github.com/pbakaus/impeccable). This skill adds numeric dashboard tokens and does not replace it.
