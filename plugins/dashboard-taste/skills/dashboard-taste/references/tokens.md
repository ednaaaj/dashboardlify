# Tokens

Source of truth: `tokens.css`. Use tokens, never raw values.

## Naming
`--space-N` = N px (`--space-8` = 8px). Colors by role, not hue. Density-aware tokens (row, input, button, card-pad, icon) change under `[data-density]`.

## Spacing (4px base)
| Token | px | Use | Never |
|---|---|---|---|
| --space-0 | 0 | flush joins | |
| --space-2 | 2 | icon-text nudge, focus offset | layout gaps |
| --space-4 | 4 | icon to label, badge pad-y | card padding |
| --space-8 | 8 | tight stack, input pad-x, toolbar gap | section gaps |
| --space-12 | 12 | cell pad-x, compact card pad, button pad-x | |
| --space-16 | 16 | grid gap, form field gap | |
| --space-20 | 20 | default card pad | |
| --space-24 | 24 | page padding, section gap | inside controls |
| --space-32 | 32 | between page regions, empty state pad | |
| --space-40 | 40 | large empty/hero blocks | |
| --space-48 | 48 | page top on wide screens | |
| --space-64 | 64 | auth/empty full-page centering | in-card spacing |

Off-scale values (5px, 10px, 14px, 18px) are bugs.

## Radius
| Token | px | Use | Never |
|---|---|---|---|
| --radius-xs | 4 | marks under 24px: checkbox 16, heatmap cells, bar caps, legend swatches, chips <=20px | cards, buttons |
| --radius-sm | 4 | badges, inner input chips | cards |
| --radius-md | 6 | buttons, inputs, selects, menu items | cards |
| --radius-lg | 8 | cards, panels, popovers, modals | buttons |
| --radius-full | 9999 | avatars, dot status, pill toggles | cards, buttons, inputs |

Crisp max 8px (--radius-lg); soft max 16px; never above 16 except --radius-full. Values above are crisp; soft values in Style presets. Nested radius: inner = outer - padding gap. Marks under 24px use `--radius-xs` in every preset (soft does not override it).

## Style presets
Default = crisp (no attribute). Opt in with `data-style="soft"` on `<html>` or a container. Pick one per product, never mix. Soft changes only the rows below; spacing scale, type, color, motion unchanged.
| Token | Crisp | Soft |
|---|---|---|
| --radius-xs | 4 | 4 |
| --radius-sm | 4 | 8 |
| --radius-md | 6 | 12 |
| --radius-lg | 8 | 16 |
| --radius-full | 9999 | 9999 |
| --card-border | 1px solid var(--border) | light: 1px solid transparent (separation from --panel-bg tint); dark: 1px solid var(--border) (card #18181b on #0f0f11 is only 1.08:1) |
| --panel-bg | var(--bg) | light neutral-100 / dark --surface-sunken (#0f0f11) |
| --control-radius | var(--radius-md) | var(--radius-full) |
| --card-pad | 12 / 20 / 24 (compact / default / comfortable) | 16 compact / 24 default (comfortable stays 24; 28 is off scale) |
| --row-h | 32 / 40 / 48 | 48 / 56 / 64 (nav items never use --row-h) |

Rules:
- Buttons, inputs, selects, tabs, segmented controls, pill toggles and filter chips use `--control-radius`. Status badges and delta pills use `--radius-sm`; `--radius-full` only for dot-status. Cards and containers use `--radius-lg`, `--card-border`; page-level containers use `--panel-bg`.
- Soft light cards sit on `--panel-bg` with `--surface` fill and no visible border; soft dark keeps the border. If a soft card has no tint behind it, use `1px solid var(--border)`.
- Shadows stay overlay-only in both presets.
- Contrast: text on `--panel-bg` light (neutral-100): --text 16.1:1, --text-muted 7.0:1, --text-subtle (#6b6b74) 4.8:1. Dark (#0f0f11): --text 18.3:1, --text-muted 13.0:1, --text-subtle 7.5:1.

## Border and shadow
| Token | Value | Use | Never |
|---|---|---|---|
| border | 1px solid var(--border) | cards, tables, dividers, inputs | 2px+ decoration |
| --shadow-sm | 0 1px 2px rgb(0 0 0/.04) | reserved, unused by default (rule 5: shadows only on overlays) | cards, sticky headers, segmented active |
| --shadow-popover | 0 4px 12px rgb(0 0 0/.08), 0 0 0 1px border | dropdown, popover | static content, tooltip |
| --shadow-modal | 0 8px 24px rgb(0 0 0/.12) | dialog, sheet | anything inline |

Cards: no shadow, border only. No colored shadows, no glow. Dark: shadows near-invisible, rely on border + lighter surface.

## Type
| Token | Value | Use | Never |
|---|---|---|---|
| --font-sans | Inter/Geist + system | all text | second family |
| --font-mono | system mono | IDs, code, hashes | numbers in tables (use tabular-nums) |
| --text-xs | 12 | labels, captions, badges, axis | body |
| --text-sm | 13 | table cells, compact body | |
| --text-base | 14 | body default, inputs, buttons | headings |
| --text-md | 16 | settings card title, modal title | dense tables |
| --text-lg | 20 | page title | |
| --text-xl | 24 | page title max, default KPI hero | |
| --text-2xl | 32 | KPI hero on a featured card; 24 (--text-xl) is the default KPI hero; 40px and 28/36 are not allowed | page title |
| weight 400/500/600 | | body / labels, buttons / titles, KPI | 300, 700, 800 |
| --leading-body | 1.5 | body | headings |
| --leading-heading | 1.3 | all headings | |

Numbers: `font-variant-numeric: tabular-nums` on tables, KPIs, charts. Align numeric columns right. Page title 20/600 (24 max), one per page. Letter-spacing 0 (headings -0.01em; KPI hero numbers -0.02em).

## Color
See `color.md` for hex. Usage:
| Token | Use | Never |
|---|---|---|
| --bg | app canvas | cards |
| --surface | cards, tables, sidebar | page canvas |
| --surface-raised | popovers, modals | base cards |
| --surface-sunken | table header, inset wells | |
| --border / --border-strong | dividers, cards / hover, emphasis | text |
| --border-input | input outline (neutral-500 in both themes: 4.83:1 on white, 3.67:1 on #18181b) | cards |
| --text / --text-muted / --text-subtle | primary / secondary, labels / placeholder, meta (--text-subtle #6b6b74: 5.28 on #fff, 5.06 on #fafafa, 4.80 on #f4f4f5) | disabled-only info |
| --accent, --accent-hover | primary button, selection, focus | decoration |
| --accent-text, --accent-subtle | links, active nav / selected row | |
| --{success,warning,danger,info}-{fg,bg,border} | status badge, alert, inline validation | brand color |
| --chart-1..6, --seq-1..5 | data only | UI chrome |

## Motion
| Token | Value | Use | Never |
|---|---|---|---|
| --dur-fast | 120ms | hover, press, color, tooltip | |
| --dur-base | 160ms | dropdown, popover, modal, toast, toggle | |
| --dur-slow | 220ms | sheet, sidebar collapse | anything longer |
| --ease-out | cubic-bezier(0.2,0,0,1) | all transitions | bounce/spring on data UI |

Animate opacity, transform, color. Never `transition: all`, never layout properties.

Canonical duration range is 120-220ms (`--dur-fast` 120, `--dur-base` 160, `--dur-slow` 220). Only exception: chart first-load draw-in, max 300ms.

Reduced motion: `tokens.css` sets all `--dur-*` to 80ms and limits `transition-property` to opacity/color/background-color/border-color via `!important`, so transform transitions drop and short opacity fades remain. Animation overrides (opacity-only keyframes, skeleton shimmer off) live in motion.md, not tokens.css.

## Layout
| Token | Value |
|---|---|
| --sidebar-w / --sidebar-w-collapsed | 240 / 56 |
| --topbar-h | 52 (48-56 ok) |
| --page-pad | 24 (16 under 640px) |
| --content-max | 1280 (tables may go full) |
| --grid-gap / --section-gap | 16 / 24 |

## Density-aware
| Token | Compact | Default | Comfortable |
|---|---|---|---|
| --row-h | 32 | 40 | 48 |
| --input-h | 32 | 36 | 40 |
| --button-h | 32 | 36 | 40 |
| --card-pad | 12 | 20 | 24 |
| --icon-size | 14 | 16 | 20 |
| --text-body | 13 | 14 | 14 |

Focus: `--focus-ring` (2px gap + 2px accent). Never remove outline without it. --focus-ring, --card-border and --panel-bg are redeclared in the dark blocks so a nested data-theme container recomputes them; still set data-theme on <html>.
