# Linear
Sources: linear.app marketing CSS vars (MEASURED, tokens ship in same system as app but app CSS not reachable); linear.app/brand (PUBLISHED); app layout = unknown.

## Shell (unknown, app is logged-in; do not guess numbers)
Sidebar width, topbar height, page padding, max-width: unknown. Known pattern (ESTIMATED): dense left sidebar, no heavy topbar, list rows fill full width.

## Spacing / radius / border / shadow
Spacing rhythm, card padding: unknown. Radius scale (MEASURED): 4, 6, 8, 12, 16, 24, 32, circle 50%. Use 6 for buttons/inputs, 8 for cards/popovers (ESTIMATED mapping).
Borders (MEASURED, dark): hairline 1px; primary #23252a, secondary #34343a, tertiary #3e3e44; translucent #ffffff0d / #ffffff14. Light: #e9e8ea, #e4e2e4, #dcdbdd.
Shadow: unknown; depth comes from stepped bg + borders, not shadows (ESTIMATED).

## Type (MEASURED)
Family: "Inter Variable", SF Pro Display fallback; font-feature-settings "cv01","ss03"; mono "Berkeley Mono".
Weights: 300 light, 400 normal, 510 medium, 590 semibold, 680 bold (variable-font in-between weights).
Sizes: micro .6875-.75rem, mini .75-.8125rem, regular .9375-1rem, large 1.125rem. Table/body size: unknown (ESTIMATED 13px).

## Colors (MEASURED, dark default)
bg: level-0 #08090a, level-1/panel #0f1011, level-2 #141516, level-3 #191a1b; secondary #1c1c1f, tertiary #232326, quaternary #28282c.
Light: #fff, #f8f8f8, #f4f4f4, #f0f0f0.
Text dark: primary #f7f8f8, secondary #d0d6e0, tertiary #8a8f98, quaternary #62666d. Light: #282a30, #3c4149, #6f6e77, #86848d.
Accent #7170ff (hover #828fff, tint #18182f). Semantic: green #27a644, orange #fc7840, red #eb5757, yellow #f0bf00.

## Table: row height, header style: unknown.
## Motion: unknown.

## Steal this
- 4-step bg ladder (#08090a to #191a1b) with only 1-2 hex steps apart; hierarchy without shadows.
- Translucent white borders (5-15% alpha) so borders adapt to any surface.
- Four text tones (primary/secondary/tertiary/quaternary); data is quiet, only the primary row text is bright.
- One accent (#7170ff) used sparingly; status colors small and desaturated.
- Variable weights 510/590 instead of 500/600: slightly lighter, crisper emphasis.

## Skip this
- Berkeley Mono, marketing bg #010102/#000212, the purple-indigo brand accent.
