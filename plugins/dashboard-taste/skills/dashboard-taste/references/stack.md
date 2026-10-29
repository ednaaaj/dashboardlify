# Stack: libraries worth reaching for

Source: "50 Free & Open-Source React UI Component Picks (2026)" list, filtered by this skill's rules. Peer ranges checked against npm (Oct 2026). Re-check before installing; licenses and peers change.

Rule zero: if the project already has a component or lib that does the job, restyle it with tokens. Add a dependency only for a real gap (icons, charts, headless table, date picker).

## Use

| Need | Pick | License | React | Why / note |
|---|---|---|---|---|
| Icons | Lucide (`lucide-react`) | ISC | 16.5+ | One outline set, one stroke (skill icon rule). Tabler (MIT, 16+) or Phosphor (MIT, 16.8+, regular weight only) are fine alternates. Pick ONE |
| Charts | Recharts (shadcn Charts is a wrapper) | MIT | 16.8+ | Style with `--chart-1..6`, no gradients/glow, draw-in <=300ms. Nivo (MIT) and ECharts (Apache-2.0) for heavy cases |
| Table engine | TanStack Table | MIT | v8: 16.8+, v9: 18+ | Headless: you apply row height, tabular-nums, right-aligned numbers from tokens |
| Heavy grid | AG Grid Community | MIT | 16.8+ | Enterprise tier is paid. Override its theme vars with tokens |
| Primitives (menu, select, popover, dialog) | Radix (`@radix-ui/react-*`) | MIT | 16.8+ | Headless = skill owns the look: `--radius-md` items, `--shadow-popover`, no shadow on tooltips. Base UI (MIT, 17+) is the alternate, still RC |
| Searchable select | React Select | MIT | 16.8+ | Style via `classNames`/`styles` with tokens |
| Date picker | React DayPicker | MIT | 16.8+ | Flat day cells, accent for selection only |
| Event calendar | FullCalendar (MIT standard, premium paid) or Schedule-X (MIT core, premium paid) | MIT | 17+ / 16.7+ | Only if you need scheduling, not date picking |
| Forms | React Hook Form + Zod (or Yup if already present) | MIT | 16.8+ | State only, no look. Inline error text uses `--danger-fg` |
| Toasts | Sonner | MIT | 18+ | Overlay shadow only, no slide-bounce |

## Styled kits (shadcn, HeroUI, Mantine, Tremor, Chakra)

Fine for NEW Tailwind + React 18/19 projects. Then remap their CSS variables to `tokens.css` (shadcn: `--background`, `--card`, `--border`, `--radius`, `--primary`; map them to `--bg`, `--surface`, `--border`, `--radius-lg`, `--accent`). Do not stack two kits.
Peer notes: Tremor 3.x needs React 18; HeroUI needs React 19 + Tailwind; Mantine 9 needs React 19.2; Material React Table needs React 18 + MUI v5+. On React 17 / MUI v4 / Bootstrap apps these are blockers, skip them.

## Skip (fights the rules)

| Item | Rule it breaks |
|---|---|
| Magic UI Magic Card, Shimmer Button | decorative motion, spotlight/shimmer loops (only skeleton shimmer is allowed) |
| Aceternity 3D Card, Moving Border, Gooey Input | tilt/3D, animated borders, >300ms motion; also "custom terms apply" license |
| Motion Primitives, any spring/bounce lib on data UI | motion.md: transform/opacity, 120-220ms, no bounce |
| `motion` / Framer Motion for simple transitions | CSS transitions with `--dur-*` already cover it; also needs React 18 |

Selective motion lib use is allowed only for sheet/modal enter-exit and layout reorder, still inside the duration tokens.

## Install checklist

1. `npm view <pkg> peerDependencies license` first. React version mismatch = stop.
2. Check the license on the repo, not the list. "Free component" is not "OSS".
3. Wrap the lib once (`Icon`, `Chart`, `DataTable`) only if it will be used in 3+ places. Otherwise import directly.
4. After install, run the Mode B greps: no raw hex, no off-scale spacing, no new radius values from the lib's default theme.

## Legacy stack (React 17, MUI v4, Bootstrap 4) verdict

Typical legacy app already has: `react-hook-form`, `yup`, `react-icons`, `react-calendar`, `material-table`. Likely adds: `lucide-react` (replace mixed `react-icons` sets incrementally, per sidebar), `@radix-ui/react-dropdown-menu`/`select` for new menus, `react-day-picker` if `react-calendar` styling is a fight, `@tanstack/react-table@8` (NOT v9) if `material-table` is replaced. Do not add Tailwind-based kits, Tremor, HeroUI, Mantine, `motion`.
