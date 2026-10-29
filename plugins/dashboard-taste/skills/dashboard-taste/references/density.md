# Density

Set `data-density="compact|comfortable"` on `<html>` or any container. Default = no attribute. Tokens in `tokens.css`.

| Property | Compact | Default | Comfortable |
|---|---|---|---|
| Use for | power users, logs, ops tables | most admin screens | executives, low-volume, touch |
| Table row (--row-h) | 32 | 40 | 48 |
| Table header row | 32 | 40 | 48 (equals --row-h) |
| Cell pad-x (--cell-pad-x) | 8 | 12 | 16 |
| Table text (--text-table) | 13 | 13 | 14 |
| Body text (--text-body) | 13 | 14 | 14 |
| Label text | 12 | 12 | 12 |
| Input height (--input-h) | 32 | 36 | 40 |
| Button height (--button-h) | 32 | 36 | 40 |
| Small button (--button-h-sm) | 28 | 32 | 36 |
| Button pad-x | 8 | 12 | 16 |
| Card pad (--card-pad) | 12 | 20 | 24 |
| Icon (--icon-size) | 14 | 16 | 20 |
| Grid gap (--grid-gap) | 12 | 16 | 20 |
| Section gap (--section-gap) | 16 | 24 | 32 |
| Form field gap | 12 | 16 | 20 |
| Nav item height | 28 | 32 | 36 |
| Badge height (switch 32x20 all modes) | 16 | 20 | 24 |
| Soft row height (`data-style="soft"`, sets `--row-h`) | 48 | 56 | 64 |
| Soft card pad | 16 | 24 | 24 |
| Min hit target | 24 (WCAG 2.2 AA) | 24 (32 target for primary) | 32 (40 on touch, see Rules) |

## Rules
| Rule | Value |
|---|---|
| Never shift | font family, radii within a preset, border width, colors, type scale steps (only body/table size) |
| Never go below | 12px text, 24px minimum hit target (WCAG 2.2 AA), 14px icon |
| Mixed density on one page | forbidden, except compact table inside a default page |
| Touch / under 768px | min hit target 40px, overrides the Min hit target row for every mode |
| Row height vs text | row-h >= text line-height + 2*4px vertical pad |
| Persist | store user choice (localStorage), default to "default" |

## Examples
Row 40, text 13: 20px line-height + 8px pad-y each side = 36, the other 4px is slack. Icon 16 beside 13px text: 8px gap (compact 4px).
