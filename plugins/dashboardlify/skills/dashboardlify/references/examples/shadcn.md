# shadcn/ui (dashboard-01 block, new-york-v4)
Sources: shadcn-ui/ui repo (apps/v4 globals.css, ui/*.tsx, blocks/dashboard-01). Confidence: PUBLISHED (source code) unless noted.

## Shell (PUBLISHED)
- Sidebar: 18rem (72 spacing units) in dashboard-01; component default 16rem; icon-collapsed 3rem. Variant `inset` (sidebar floats on a muted bg, content in rounded inset card).
- Topbar: 3rem (h-12), border-b only. Inner px-4, lg:px-6, gap-1/2.
- Page padding: px-4 lg:px-6 horizontally; py-4 md:py-6 vertically. Content max-width: none (fluid, container queries).
## Spacing / cards (PUBLISHED)
- Section gap gap-4 md:gap-6. Card: py-6, px-6 inside, gap-6 between header/content, shadow-sm, border.
## Radius (PUBLISHED)
- --radius 0.625rem. sm 0.375rem, md 0.5rem, lg 0.625rem, xl 0.875rem. Button/input rounded-md (0.5rem); card rounded-xl (0.875rem); xs button h-6, sm h-8, default h-9, lg h-10.
## Border / shadow (PUBLISHED)
- Border light oklch(0.922 0 0) (~#e5e5e5); dark oklch(1 0 0 / 10%); input dark 15%. Shadow only shadow-sm on cards; inputs shadow-xs. Focus ring: ring-[3px] ring-ring/50.
## Type
- Family: unknown (--font-sans set per project; docs site uses Geist). text-sm (14px) body and table; label text-sm font-medium; card title font-semibold; muted text-xs/sm. Weights 400/500/600.
## Colors (PUBLISHED, oklch, neutral base)
- bg oklch(1 0 0) / dark 0.145; card white / dark 0.205; muted+accent 0.97 / dark 0.269 and 0.371; fg 0 0 0 / 0.985; muted-fg 0.556 / dark 0.708; primary black / dark 0.922; sidebar 0.985 / dark 0.205; ring 0.708; destructive oklch(0.577 0.245 27.325).
- Accent/semantic: none beyond destructive; charts use chart-1..5 tokens (values not captured here).
## Table (PUBLISHED)
- Head h-10 px-2 text-sm font-medium text-foreground (not uppercase, not muted). Cells p-2 (ESTIMATED ~40-49px rows). Row border-b, hover bg-muted/50, selected bg-muted.
## Motion (PUBLISHED)
- Sidebar width/margin transition duration-200 ease-linear; buttons transition-all (default 150ms). Nothing else specified.
## Steal this
- Border-only chrome: 1px hairlines, one shadow-sm, no gradients.
- Header and table text stay same size/colour; hierarchy via weight not caps.
- Two-step spacing (16 mobile / 24 desktop) applied uniformly to padding and gaps.
- Neutral grayscale + one destructive hue; dark mode uses alpha borders (10%).
- 3px translucent focus ring.
## Skip this
- Black-as-primary identity; oklch token naming; inset sidebar variant if you want classic full-bleed.
