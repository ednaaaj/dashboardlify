# Layout

## Shell
```
+----------+--------------------------------------------+
| Sidebar  | Topbar (52, border-bottom)                 |
| 240      +--------------------------------------------+
| (56      | Page (padding 24; max-width 1280, centered)|
| collapsed| +----------------------------------------+ |
| border-r)| | Page header                            | |
|          | | Content (sections, gap 24)             | |
|          | +----------------------------------------+ |
+----------+--------------------------------------------+
```
| Part | Spec |
|---|---|
| Sidebar | 240 / 56 collapsed, --surface, 1px border-right, full height, own scroll. Nav item per components.md (32 high, radius-md, 8px gap icon-label, `--icon-size`). Active: --accent-subtle bg + --accent-text; hover: --surface-sunken. Group labels 13/500 sentence case muted. Collapse 220ms --ease-out. |
| Topbar | 48-56 (default 52), --surface, 1px border-bottom, sticky. Left: breadcrumb or title. Right: search, actions, avatar (28-32). |
| Content | scrolls independently, bg --bg, padding 24 (16 under 640). Inner wrapper max-width 1280, margin auto. Table pages may go full width. |
| Z-order | content < sidebar/topbar < popover < modal |

## Page header
```
Breadcrumb (12, muted)
Title (20/600)                         [Secondary] [Primary]
Description (14, muted, optional, 1 line)
-- 24px gap --
[Tabs 36 high, border-bottom] (optional)
```
| Rule | Value |
|---|---|
| Title | 20/600, 1.3 leading, one per page |
| Actions | right-aligned, max 1 primary, 8px gap |
| Header to content | 24 |
| Mobile | actions wrap below title, full-width primary |

## Grid recipes
Grid gap 16, section gap 24, card pad var(--card-pad) 12/20/24 (soft: 16/24/24).

KPI row 4-up:
```
+------+ +------+ +------+ +------+     grid-cols-4 gap 16
| KPI  | | KPI  | | KPI  | | KPI  |     < 1024: 2-up   < 640: 1-up
+------+ +------+ +------+ +------+     KPI: label 12 muted, value 24/600 tabular, delta 12
```
2/3 + 1/3 split:
```
+------------------------+ +----------+   grid-cols-3, main col-span-2
| Chart / main (span 2)  | | Side     |   < 1024: stack, main first
+------------------------+ +----------+
```
Table page:
```
Header
[Search] [Filters...]            [Columns] [Export]   toolbar 36 high, gap 8
+------------------------------------------------+
| Head row (sticky, --surface-sunken, 12/500)    |   border + radius-lg, no shadow
| Rows 40 (soft 56), 13px, hairline dividers     |   right-align numbers
+------------------------------------------------+
Footer: "1-20 of 340"                    [< 1 2 3 >]   16 above, 13 muted
```
Settings page:
```
+----------+  +---------------------------------+   max-width 960
| Section  |  | Card: title 16/600, desc muted  |   left nav 200, gap 32
| nav 200  |  | fields (gap 16, label above)    |   form column max 560
|          |  | footer: [Cancel] [Save]         |   < 768: nav becomes tabs
+----------+  +---------------------------------+
```

## Breakpoints
| Name | px | What changes |
|---|---|---|
| base | <640 | page pad 16; sidebar becomes off-canvas drawer (hamburger in topbar); all grids 1-up; tables scroll horizontally or become cards |
| sm | 640 | page pad 24; KPI 2-up |
| md | 768 | settings nav to side; toolbar inline; hit targets may shrink |
| lg | 1024 | sidebar fixed 240; KPI 4-up; splits side by side |
| xl | 1280 | content reaches max 1280 |
| 2xl | 1536 | content stays 1280 centered (tables may go full); no new columns |

Sidebar auto-collapses to 56 between 768 and 1024.

## Max widths
| Element | Max |
|---|---|
| Content | 1280 |
| Settings / form page | 960 (form column 560) |
| Prose / description | 65ch |
| Modal sm / md / lg | 400 / 520 / 720 |
| Popover / dropdown | 240-320 |
| Detail side sheet | 480 |

## Rules
| Do | Don't |
|---|---|
| One scroll container per region | nested scroll in cards |
| Align everything to the 4px scale | mixed gaps within one grid |
| Cards in a row share equal height | nest cards inside cards |
| Primary action top-right of header | primary action in 3 places |
