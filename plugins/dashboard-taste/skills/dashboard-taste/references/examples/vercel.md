# Vercel (Geist)
Sources: vercel.com/geist/* docs + shipped CSS (MEASURED from published stylesheet; PUBLISHED docs). Dashboard shell dims: unknown.

## Shell (unknown)
Sidebar width, topbar height, page padding, content max-width: unknown. Geist docs describe a grid-heavy layout (PUBLISHED, no numbers captured).

## Spacing / radius / border / shadow
Spacing: Tailwind 4px scale; Geist table uses px-2/px-3, py-1/py-2 most often (MEASURED, class counts).
Radius (MEASURED tokens): 4, 6, 8, 12, 16, 24, 32, circle. Buttons/inputs 6, cards/popovers 8-12 (ESTIMATED mapping).
Borders are box-shadows, not border props (MEASURED): --ds-shadow-border-base 0 0 0 1px #00000014 light / #ffffff25 dark; inset variant #00000014 / #ffffff1a.
Shadows (MEASURED): 2xs 0 1px 1px #0000000a; 2xl stacks 3 layers (1px, 8px/16px -4, 24px/32px -8) at 2-4% black. Geist rule: shadows stay translucent; draw each border once.

## Type (MEASURED, utility classes)
Family: Geist Sans, Geist Mono. Copy 14 (14/20, 400) is the most common; Copy 13 (13/16) secondary; Label 13/14; Button 14 (14/20, weight medium) default, 12 small, 16 large.
Heading 24 = 24/32, semibold, letter-spacing -0.96px; headings 14/16/20/24/32/40/48/56 exist, tracking tightens with size.

## Colors (MEASURED)
Two backgrounds: background-100 (#fff light / hsl(0 0% 4%) dark) default; background-200 (hsl 0 0% 98% light / #000 dark) subtle.
Gray scale 1-10: 1-3 component bg (default/hover/active), 4-6 borders (default/hover/active), 7-8 high-contrast bg, 9-10 text (secondary/primary). Dark gray-100/200/300/400 = hsl 0 0% 10/12/16/18%.
Accent blue-700 #0070f7 (hsl 212 100% 48%). amber-700 #ffb200. Red/green/teal/purple/pink scales also 10 steps. Gray-alpha only for overlays/shadows.

## Table: row height unknown; Geist guidance (PUBLISHED): use for same-shape rows, sortable columns; one-action rows use Entity instead.
## Motion: unknown.

## Steal this
- Fixed 10-step semantic scale: steps 1-3 fills, 4-6 borders, 7-8 solids, 9-10 text; never pick hex ad hoc.
- Near-black dark mode (#0a0a0a page), pure-white light.
- Tight negative tracking on headings, default 14/20 for UI copy.
- Mostly grayscale UI; blue only on primary action/links.

## Skip this
- Pure #000 alt background in dark: skill bans pure black; use `--neutral-950`.
- 1px ring borders via shadow: conflicts with shadows-only-on-overlays; use real 1px borders on cards.
- Geist font itself, triangle/branding, marketing grid hero treatments.
