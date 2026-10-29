# Color

Contrast computed with WCAG 2.x relative luminance. Text >= 4.5:1, UI/graphics >= 3:1.

## Neutral ramp (zinc)
| Step | Hex | Step | Hex |
|---|---|---|---|
| 50 | #fafafa | 600 | #52525b |
| 100 | #f4f4f5 | 700 | #3f3f46 |
| 200 | #e4e4e7 | 800 | #27272a |
| 300 | #d4d4d8 | 900 | #18181b |
| 400 | #a1a1aa | 950 | #09090b |
| 500 | #71717a | | |

## Surfaces and text
| Token | Light | Dark |
|---|---|---|
| --bg | 50 #fafafa | 950 #09090b |
| --surface | #ffffff | 900 #18181b |
| --surface-raised (popover, modal) | #ffffff | 800 #27272a |
| --surface-sunken (table head, inset) | 100 #f4f4f5 | #0f0f11 |
| --border | 200 #e4e4e7 | 700 #3f3f46 |
| --border-strong | 300 #d4d4d8 | 600 #52525b |
| --border-input (inputs, needs 3:1) | 500 #71717a | 500 #71717a |
| --text | 900 #18181b | 50 #fafafa |
| --text-muted | 600 #52525b | 300 #d4d4d8 |
| --text-subtle (placeholders, meta; >= 4.5 on --surface, --bg, --surface-sunken) | #6b6b74 (not a ramp step) | 400 #a1a1aa |

Dark depth = lighter surface + border. No shadow reliance.

## Accent (swap `--accent-base` only)
| Token | Light | Dark |
|---|---|---|
| --accent (fills, primary button) | #2563eb | #2563eb |
| --accent-hover | base mixed 12% black = #2157cf | base mixed 12% black = #2157cf (white text 6.31) |
| --accent-text (links, active nav) | #2563eb | base mixed 35% white = #719af2 |
| --accent-subtle (selected row, active nav bg) | #eef3fd | #1a2134 |
| --text-on-accent | #ffffff | #ffffff |

Rule: accent is for primary action, selection, links, focus, chart series 1. Never for decoration, backgrounds of large areas, or more than one primary button per view. Replacement accent must hit >= 4.5:1 with white.

## Semantic
| Role | fg | bg (--*-bg) | border | Dark fg | Dark bg | Dark border |
|---|---|---|---|---|---|---|
| success | #15803d | #f0fdf4 | #bbf7d0 | #4ade80 | #0f2a1a | #166534 |
| warning | #b45309 | #fffbeb | #fde68a | #fbbf24 | #2a1f08 | #92400e |
| danger | #b91c1c | #fef2f2 | #fecaca | #f87171 | #2d1214 | #991b1b |
| info | #1d4ed8 | #eff6ff | #bfdbfe | #60a5fa | #0f1e3a | #1e40af |

Danger destructive button fill: --danger-solid #dc2626 with white text. Status never by color alone: pair with icon or label.

## Chart palette
| # | Role | Light | on #fff | Dark | on #18181b |
|---|---|---|---|---|---|
| 1 | accent | #2563eb | 5.17 | #719af2 | 6.42 |
| 2 | amber | #b45f06 | 4.58 | #f0a030 | 8.25 |
| 3 | green | #00875f | 4.53 | #2fc79a | 8.23 |
| 4 | magenta | #b8447f | 5.03 | #e07fb0 | 6.61 |
| 5 | vermilion | #c2410c | 5.18 | #fb8a5c | 7.50 |
| 6 | teal | #0e7490 | 5.36 | #5cc8e0 | 9.11 |

Hues follow Okabe-Ito (colorblind-safe), darkened for contrast. Default: use series 1 only; add 2-5 only for real categories; max 6; never rainbow. Series 2 vs 5 are close: do not place adjacent. Direct-label or add marker shapes.

Sequential (one hue, light to dark = low to high): #dbeafe, #93c5fd, #3b82f6, #1d4ed8, #1e3a8a (dark mode reverses so high stays brightest). Diverging only with a real midpoint: danger-fg vs info-fg through neutral-100. Gridlines neutral-200 (dark 800), 1px, axis text 12px --chart-axis.

## Contrast verified
| Pair | Ratio |
|---|---|
| text #18181b on #fff | 17.72 |
| text on bg #fafafa | 16.97 |
| muted #52525b on #fff / #fafafa / #f4f4f5 | 7.73 / 7.41 / 7.03 |
| subtle #6b6b74 on #fff / #fafafa / #f4f4f5 (also soft panel) | 5.28 / 5.06 / 4.80 |
| accent #2563eb on #fff; white on accent | 5.17 |
| white on hover #2157cf | 6.31 |
| accent on accent-subtle #eef3fd | 4.65 |
| success / warning / danger / info fg on own bg | 4.79 / 4.84 / 5.91 / 6.16 |
| border-input #71717a on #fff (needs 3) | 4.83 |
| border #e4e4e7 on #fff | 1.27 (decorative divider only) |
| Dark text #fafafa on #09090b / #18181b | 19.06 / 16.97 |
| Dark muted #d4d4d8 on #09090b / #18181b / #27272a / #0f0f11 | 13.46 / 11.99 / 10.08 / 12.96 |
| Dark subtle #a1a1aa on #09090b / #18181b / #27272a / #0f0f11 | 7.76 / 6.91 / 5.81 / 7.47 |
| Dark border-input #71717a on #18181b | 3.67 |
| Dark accent-text #719af2 on #18181b | 6.42 |
| Dark success / warning / danger / info on bg | 8.82 / 9.69 / 6.28 / 6.52 |
| Dark border #3f3f46 on #18181b | 1.70 |
