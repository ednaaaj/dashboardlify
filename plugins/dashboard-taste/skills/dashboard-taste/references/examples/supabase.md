# Supabase (Studio + shared UI package)
Sources: github.com/supabase/supabase master: packages/ui theme CSS, shadcn ui table/button/input/card, ProjectLayout (PUBLISHED, from open source).

## Shell
Sidebar: ProjectLayout resizable panel defaultSize/minSize 256, maxSize 512 when resizable (PUBLISHED, unit assumed px; unverified). Content min-w 600 at xl. Studio root is h-screen w-screen flex-col, main scrolls (PUBLISHED). Topbar height, page padding, max-width: unknown.

## Spacing / radius / border / shadow
Card: rounded-lg, shadow-xs (PUBLISHED). Button/input: rounded-md. Spacing rhythm, card padding: unknown.
Border token names: border-default / border-muted / border-strong / border-control (PUBLISHED); hex unknown (theme generated from hue 157.5 + chroma, OKLCH-style).

## Type
Font/sizes: shadcn default text-sm (14px) for buttons/inputs (PUBLISHED). Studio dense sizes and weights: unknown. Button weight font-medium.
Control heights (ESTIMATED): default h-10, sm h-9, lg h-11, icon 10x10 (shadcn package; Studio often denser, unknown).

## Colors (PUBLISHED, dark theme tokens, HSL)
Generated theme: hue 157.5, chroma 0.005, surface lightness 0.19 dark / 0.995 light, elevation-step .025, foreground lightness .95 dark, muted-fg .8, tertiary-fg .65.
Brand-default dark hsl(153.1 60.2% 52.7%) (Supabase green); brand-600 hsl(154.9 59.5% 70%).
Warning hsl(38.9 100% 42.9%); destructive hsl(10.2 77.9% 53.9%); secondary hsl(247.8 100% 70%).
Surfaces named background-default/surface-100..400/alternative/dash-sidebar; hover = surface-200.

## Table (PUBLISHED)
Header h-10, px-4, left aligned, nowrap, text-foreground-lighter, "heading-meta" style; rows border-b, hover bg-surface-200, selected bg-muted; footer border-t font-medium. Sortable headers with ArrowUp/Down/ChevronsUpDown icons.
## Motion: transition-colors on controls and header text; durations unknown.

## Steal this
- Whole theme generated from a few numbers (hue, chroma, surface, contrast): easy to retheme while staying coherent.
- Named surface ladder (surface-100..400) plus elevation-step so higher = lighter in dark mode.
- Dim table header text (foreground-lighter) over hover-only row highlight; sort state via icon.
- Dark-first with a single green accent and separate dash-sidebar background.
- 5 tint steps per semantic color (200-600) for badges/alerts.

## Skip this
- Supabase green hue 157.5, code-block palette, shadcn sizes verbatim (Studio is denser).
