# Motion

**Principle: dashboards are tools. Motion confirms, never decorates.**
Tokens: `--dur-fast 120ms`, `--dur-base 160ms`, `--dur-slow 220ms`, `--ease-out cubic-bezier(0.2,0,0,1)` (defined in tokens.css).

## Rules

| Rule | Spec |
|---|---|
| Duration | 120-220ms via tokens (`--dur-fast`/`--dur-base`/`--dur-slow`), chart draw-in <=300ms, nothing over 300ms. Single exception to tokens: chart first-load draw-in |
| Easing (enter) | `cubic-bezier(0.2,0,0,1)` = `--ease-out` |
| Easing (hover) | `ease-out` |
| Never | `ease-in` on UI, linear except skeleton shimmer |
| Properties | Movement: `transform`/`opacity` only; never width/height/top/left/margin/layout. `color`/`background-color`/`border-color` fades allowed for hover/focus state |
| Hover / press | color/bg fade `--dur-fast`; press `scale(0.98)` max |
| Dropdown / popover / modal | fade + 4-8px translate, `--dur-base`; exit `--dur-fast` |
| Sidebar / sheet | slide `translateX` `--dur-slow` |
| Charts | draw-in once on first load, 300ms max (the one explicit exception to token durations); never re-animate on filter/data change |
| Numbers | no count-up numbers of any length |
| Table rows / lists | no stagger, no entrance animation |
| Loading | skeleton; spinner only inline in a button |
| Reduced motion | drop transforms; keep 80ms opacity/color fades (tokens redefine durations to 80ms under `prefers-reduced-motion`) |

## Per-element

| Element | Enter | Exit | Origin |
|---|---|---|---|
| Button hover | bg `--dur-fast` | bg `--dur-fast` | - |
| Button press | scale .98, `--dur-fast` | release `--dur-fast` | center |
| Dropdown / popover | opacity 0>1, y -4>0, `--dur-base` | opacity 1>0, `--dur-fast` | trigger side |
| Tooltip | opacity `--dur-fast` | `--dur-fast` | - |
| Modal | opacity + y 8>0, `--dur-base`; overlay opacity `--dur-base` | `--dur-fast` | center |
| Toast | opacity + y 8>0, `--dur-base` | opacity `--dur-fast` | - |
| Sheet | translateX 100%>0, `--dur-slow` | `--dur-fast` | edge |
| Sidebar collapse | transform/opacity `--dur-slow`; width via snap or `grid-template-columns` snap, no animated width on content | - | - |
| Tabs indicator | translateX `--dur-base` | - | - |
| Row hover / select | bg `--dur-fast` | bg `--dur-fast` | - |
| Bulk bar | opacity + y 4>0, `--dur-base` | `--dur-fast` | bottom |
| Skeleton to content | opacity fade `--dur-fast` or hard swap | - | - |
| Chart first load | stroke-dashoffset / clip draw 300ms max, once (explicit exception) | - | - |

## Banned

Parallax; bounce / spring overshoot; floating or looping animations (except skeleton shimmer in loading states); animated gradients; scroll-triggered reveals; anything over 300ms; scale from 0 (start >= .96); animated page transitions between routes; pulsing badges/dots; confetti.

## CSS snippets

```css
/* transition utility: color/bg/border fades only */
.t-fast {
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    border-color var(--dur-fast) ease-out,
    opacity var(--dur-fast) ease-out,
    transform var(--dur-fast) var(--ease-out);
}
.press:active { transform: scale(0.98); }
```

```css
/* popover enter/exit: exit is faster than enter */
@keyframes pop-in  { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-4px); } }

[data-state="open"]   { animation: pop-in  var(--dur-base) var(--ease-out) both; }
[data-state="closed"] { animation: pop-out var(--dur-fast) ease-out both; }
/* flip sign of translateY when placed above trigger: [data-side="top"] -> +4px */
/* modal: same keyframes with 8px */
```

```css
/* sheet */
@keyframes sheet-in  { from { transform: translateX(100%); } to { transform: none; } }
@keyframes sheet-out { from { transform: none; } to { transform: translateX(100%); } }
.sheet[data-state="open"]   { animation: sheet-in  var(--dur-slow) var(--ease-out) both; }
.sheet[data-state="closed"] { animation: sheet-out var(--dur-fast) ease-out both; }
```

```css
/* skeleton: static by default, subtle shimmer optional; transform-only */
.skeleton { position: relative; overflow: hidden; background: var(--surface-sunken); border-radius: var(--radius-sm); }
.skeleton::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / .35), transparent);
  transform: translateX(-100%);
  animation: shimmer 1.6s linear infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }
/* dark mode: use rgb(255 255 255 / .06) */
```
(Shimmer is the single permitted looping animation: low contrast, loading state only, stops when content arrives.)

```css
/* reduced motion: tokens.css owns durations + transition-property (same block as below).
   Transforms drop because transition-property excludes transform; no [data-state] transform reset
   (it would break Radix/shadcn Switch thumbs and accordion chevrons). This file owns animation overrides only. */
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 80ms; --dur-base: 80ms; --dur-slow: 80ms; }
  *, *::before, *::after { transition-property: opacity, color, background-color, border-color !important; }
  .skeleton::after { animation: none; }
  @keyframes pop-in   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop-out  { from { opacity: 1; } to { opacity: 0; } }
  @keyframes sheet-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sheet-out { from { opacity: 1; } to { opacity: 0; } }
}
```

## React (Motion / Framer Motion)

```tsx
import { motion, AnimatePresence, MotionConfig } from "motion/react";

const ease = [0.2, 0, 0, 1] as const;

// Wrap the app: respects OS setting, drops transforms, keeps opacity
<MotionConfig reducedMotion="user">{children}</MotionConfig>

// Popover / dropdown
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease } }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: "easeOut" } }}
    />
  )}
</AnimatePresence>

// Modal: same, y: 8. Overlay: opacity only, 0.16.
// Sheet
<motion.aside
  initial={{ x: "100%" }}
  animate={{ x: 0, transition: { duration: 0.22, ease } }}
  exit={{ x: "100%", transition: { duration: 0.12, ease: "easeOut" } }}
/>

// Press
<motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.12, ease: "easeOut" }} />
```

- Always `type: "tween"` with explicit `duration`; never `type: "spring"` (overshoot banned). Don't use `layout`/`layoutId` on tables or lists.
- Charts: enable the library's draw-in only when `isFirstLoad`; set `isAnimationActive={false}` after (Recharts: `isAnimationActive={firstLoad}`, `animationDuration={300}`).
- Prefer CSS for hover/press/open-close; reach for Motion only for mount/unmount exit.

## When in doubt: no animation

Skip the animation if any answer is yes:

1. Does the user trigger it 10+ times a day (filter, sort, row click, tab switch, keyboard shortcut)?
2. Is it a keyboard-initiated action?
3. Does it move data or numbers the user is reading/comparing?
4. Does it delay the next action by even one frame?
5. Would it need more than opacity/transform?
6. Is the only reason "it looks nicer"?
7. Would it run on page load, scroll, or data refresh?

Animate only when it answers "where did that come from / where did it go" (popover, sheet, toast) or gives press/hover feedback. Everything else: instant.
