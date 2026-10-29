# Verify loop

Run after build, unslop or redesign. Fix, re-screenshot, repeat until all checked (max 3 rounds).

## Capture
- [ ] Screenshot at 1440px wide
- [ ] Screenshot at 390px wide
- [ ] Screenshot each state: loading, empty, error, populated

## Tokens
- [ ] Spacing values all on 4px scale (no 10/14/18/22)
- [ ] Card radius <= 8px; controls 4-6px (soft preset: cards 12-16, controls 8-full, never above 16)
- [ ] No box-shadow except overlays (menu, modal, popover)
- [ ] Borders are 1px neutral
- [ ] One accent color; no gradients, no glass
- [ ] Neutral surfaces; status colors only for status
- [ ] One font family; <= 3 weights; sizes from scale
- [ ] Icons one size per context (14 compact / 16 default / 20 comfortable)
- [ ] No raw hex or px in components, only `var(--...)`

## Contrast and type
- [ ] Body text >= 4.5:1; large text and UI borders >= 3:1
- [ ] Numbers right-aligned with tabular-nums
- [ ] Text left-aligned in tables

## Motion
- [ ] Durations 120-220ms (tokens); chart draw-in exception <=300ms
- [ ] Movement is transform/opacity only; color/bg/border-color fades allowed; no `transition: all`
- [ ] No bounce, spring, parallax, count-up, stagger, scroll-reveal
- [ ] `prefers-reduced-motion` disables transforms

## Layout
- [ ] 1440: content max-width applied, no stretched lines
- [ ] 390: no horizontal page scroll; sidebar collapsed; tables scroll inside container
- [ ] Touch targets >= 40px at 390

## States and data
- [ ] Skeleton loading, empty, error (with retry) for every data region
- [ ] Realistic data; long names truncate with ellipsis
- [ ] Focus ring visible on all interactive elements

## Behavior (unslop only)
- [ ] Props, handlers, data flow unchanged
- [ ] Grep scan from SKILL.md returns zero unjustified hits (skeleton shimmer, tokens.css, allowed exceptions excluded)

## Redesign (mode C only)
- [ ] Squint test: before vs after, the hero numbers and primary action stand out first
- [ ] Screenshots before and after at 1440 and 390
- [ ] Regions align on shared left edges
- [ ] One hero number per card
- [ ] Every metric has a fitting visual (references/metric-to-visual.md) or a stated reason
- [ ] No cards in cards
- [ ] <=4 distinct radii incl. `--radius-full` (crisp); <=5 distinct incl. `--radius-full` (soft: xs 4, sm 8, md 12, lg 16, full); <= 6 font sizes; hero = `--text-xl` (24), `--text-2xl` (32) max
- [ ] Order & extremes (#18): DOM/focus order = visual order; long (60+ chars), empty, 200% zoom, +30% text, 390px all hold
- [ ] Every removed/moved element listed with its new access point; no decision input removed
- [ ] Icons one set, one size per context
- [ ] Color has meaning (status, selection, action) and nothing else
- [ ] Brief approved before any edit; every JSX change listed
- [ ] Behavior unchanged: build + tests pass
- [ ] Before/after counts reported (cards, colors, radii, font sizes, borders)
