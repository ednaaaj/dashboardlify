# Worked example: sidebar unslop (fintrack, light + dark)

Source: user-supplied before/after image. Every number is ESTIMATED from the screenshot (scale unknown); trust ratios over px. Use as a REDESIGN-mode reference for any app sidebar.

## What changed (before -> after)

| # | Area | Before | After | Why it works |
|---|---|---|---|---|
| 1 | Group labels | CAPS micro-labels, wide tracking, ~11px, pale | Sentence case ("Transactions", "Accounts", "Goals"), muted, with a chevron (collapsible) | Reads as a control, not decoration. Caps at 11px is a legibility and contrast risk |
| 2 | Counts | Grey pill chips (48, 5) | Plain right-aligned tabular numbers (12, 8, 5), muted | Less boxes, same info. Pill only where state needs it |
| 3 | Sub-items | Text only, indented, paler than parents | Icon + label, thin curved tree connector from the parent | Hierarchy shown by structure, not by fading |
| 4 | Icons | Mixed styles and weights, missing on sub-items | One outline set, same stroke, ~18-20px observed (skill: `--icon-size`), on EVERY item | Consistency reads as quality |
| 5 | Identity color | None | Account rows get small colored rounded-square chips (black, blue, orange, green). Everything else stays monochrome | Color is the ONLY color, and it means "which account". This is what makes it feel lively |
| 6 | Status | Red dot on one row | Red dot kept, moved to the far right edge, aligned with counts | One alert color, one position |
| 7 | Active row | Pale fill, small | Full-width rounded row, clearly darker tint, medium weight | Obvious current location |
| 8 | Type | ~13px, light weight, low contrast | ~15px (+2) observed, weight 500, near-black text; skill maps to 14/500 | Primary nav should be the most readable text on the page |
| 9 | Rhythm | Even, tight spacing | Tight within a group (~4px), generous between groups (~24px) | Proximity does the grouping, no divider lines needed |
| 10 | Bottom | Settings + tiny initials avatar jammed at the bottom | Help + Settings pinned with space above; divider; user as a framed card (photo avatar, name 500, email muted) | Utilities separated from navigation; account identity gets a home |
| 11 | Header | Black square logo + bold "FinTrack" | Light wordmark + small bordered collapse button on the right | Quieter brand, a real collapse affordance |
| 12 | Container | Rounded panel | Larger radius panel (soft preset) | Matches the soft style |
| 13 | Dark theme | n/a | Full parity: near-black panel, lighter grey active row, borders over shadows, chips keep their color, the black chip inverts to white | Theme is a token swap, not a redesign |

## The rule set to extract

1. Group headings: sentence case, 13px muted, chevron, collapsible. No caps micro-labels below 12px.
2. Every nav item and sub-item has an icon from ONE outline set at one size and stroke. All-or-none per level.
3. Nested items get a tree connector (1px, `--border`), not just indentation and fading.
4. Counts are plain tabular numbers, right-aligned in a fixed column. Chips only for alerts.
5. Color appears only as identity chips or the single alert dot. Max 4 chip hues.
6. Active = full-row tint + weight 500. Hover = lighter tint of the same.
7. Group gap is at least 4x the item gap (here ~24 vs ~4).
8. Primary nav text 14px/500. Secondary (counts, emails) 12-13px muted.
9. Footer: divider, then a framed user card. Help/Settings sit above it, separated from the nav groups.
10. Collapse control lives in the header, bordered, icon-only, 28-32px.

## Spec in tokens (observed values ESTIMATED; token column is canonical, see [components.md](../components.md))

| Part | Observed (ESTIMATED) | Token / skill value |
|---|---|---|
| Panel width | ~240-260 | `--sidebar-w` |
| Item row | ~40, radius ~12 | height 32 default / 28 compact / 36 comfortable (not `--row-h`, that is the table row); radius `--radius-md` (6 crisp / 12 soft); pad 8x12, group label margin-top 24; icon-label gap 8 |
| Group heading | ~13/500 | 13/500 `--text-muted`, sentence case, padding `--space-12`, group gap `--space-24` |
| Item gap | ~4 | `--space-4` |
| Icon | ~18-20 | `--icon-size` (16 default, 20 comfortable) |
| Identity chip | ~24 square | 24px, radius `--radius-md` crisp / `--radius-sm` soft, white glyph 14px |
| Count | ~12-13 | `--text-xs`/`--text-sm`, `--text-subtle`, `tabular-nums`, right-aligned |
| Active row | darker tint | bg `--accent-subtle`, text `--accent-text`, weight 500 (light and dark via tokens) |
| Footer card | framed card | `--surface`, 1px `--border`, `--radius-lg`, padding `--space-8`, avatar 32px |

## Brief this skill would write for a "before" like the left panel

| Component | Current | Proposed | Check # | Risk | Pri |
|---|---|---|---|---|---|
| Group labels | CAPS 11px | Sentence case 13px + chevron | type, a11y | jsx (adds toggle) | P1 |
| Counts | Grey pills | Plain right-aligned numbers | color, density | css-only | P2 |
| Sub-items | Text only, faded | Icon + connector line | icons, hierarchy | jsx | P1 |
| Icons | Mixed set | One set, one size | icons | css or jsx | P1 |
| Accounts | Monochrome | Identity chips | color meaning | needs data (brand color per account) | P2 |
| Active row | Pale | Full-row tint, weight 500 | hierarchy | css-only | P1 |
| Type | 13px/300 | 14px/500, higher contrast | type, contrast | css-only | P0 (contrast) |
| Footer | Cramped | Divider + framed user card, pin Help/Settings | position | jsx | P2 |
| Rhythm | Even | 4 / 24 spacing contrast | grouping | css-only | P1 |

Do not copy: the logo, the wordmark font, the account colors (those encode fintrack's own data).
