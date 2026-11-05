# Status

Status words (label text such as "Overdue", "Paid") get one tone, one pill style, one colour per word, everywhere in the app. Tokens live in [tokens.css](tokens.css); badge geometry in [components.md](components.md#badge--status-pill); palette ramps in [palettes/palettes.json](palettes/palettes.json) (`status`, `scales`).

## Word to tone

Tones map to the semantic block of tokens.css: fg = text and dot, bg = pill background. Ratios are WCAG 2.x, measured with a node one-liner, rounded to 2 decimals. "on surface" = fg on `--surface` (#ffffff light, #18181b dark); "on pill" = fg on the pill bg.

| Tone | Words (English) | fg light | bg light | on surface / on pill | fg dark | bg dark | on surface / on pill |
|---|---|---|---|---|---|---|---|
| neutral | open, draft, pending, inactive, closed, not started, queued | #52525b | #f4f4f5 | 7.73 / 7.03 | #d4d4d8 | #27272a | 11.99 / 10.08 |
| info | in progress, active, scheduled, ahead, review, new | #1d4ed8 | #eff6ff | 6.70 / 6.16 | #60a5fa | #0f1e3a | 6.97 / 6.52 |
| success | done, paid, on track, complete, approved, resolved, healthy | #15803d | #f0fdf4 | 5.02 / 4.79 | #4ade80 | #0f2a1a | 10.17 / 8.82 |
| warning | at risk, due today, behind, late, pending review, expiring | #b45309 | #fffbeb | 5.02 / 4.84 | #fbbf24 | #2a1f08 | 10.61 / 9.69 |
| danger | overdue, blocked, failed, refunded, rejected, over budget | #b91c1c | #fef2f2 | 6.47 / 5.91 | #f87171 | #2d1214 | 6.40 / 6.28 |

All 20 pairs are >= 4.5:1 (lowest: success light on pill, 4.79). Palette alternative: step 11 of the `status` scales (green, amber, red, blue) on step 3, e.g. light green #218358 on white 4.72, amber #ab6400 4.61, red #ce2c31 5.21, blue #0d74ce 4.77; dark step 11 on #18181b: 9.45, 11.57, 8.41, 8.43. Use the tokens.css values by default; use the scale values when the app uses a palette from palettes.json.

Rules for the mapping:
- A word has one tone for the whole app. If "Pending" is neutral in one table it is neutral everywhere.
- Words that mean a different thing across domains ("Active", "Open") pick the tone once and keep it.
- Max 5 distinct status colours on a screen (one per tone). Neutral counts as one.
- Detection is English-only and heuristic: other languages are not recognised, and a word in a non-status context (a name, a product) can be a false hit. Confirm hits by hand.

## Pill recipe

- Dot (6px circle, `--radius-full`) + text label, gap 8 (`--space-8`). Text is always present: never colour alone.
- ONE pill style per app. Pick it once; every status in every table, card and list uses it. Do not mix tinted pills, plain coloured text and outlined chips.
- Tinted bg, fg text, 12/500, no uppercase, height 20 (16 compact / 24 comfortable), pad-x 8.
- Radius by preset: crisp `--radius-sm` (4px); soft `--radius-sm` (8px); `--radius-full` only if the app already uses full-round badges everywhere. Marks under 24px that are not pills use `--radius-xs`.
- Neutral tone for anything without a state meaning (counts, tags).

### Plain CSS

```css
.status { display: inline-flex; align-items: center; gap: var(--space-8); height: 20px; padding: 0 var(--space-8);
  border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: var(--weight-medium);
  color: var(--status-fg); background: var(--status-bg); }
.status::before { content: ""; width: 6px; height: 6px; border-radius: var(--radius-full); background: currentColor; }
.status[data-tone="neutral"] { --status-fg: var(--text-muted); --status-bg: var(--surface-sunken); }
.status[data-tone="info"]    { --status-fg: var(--info-fg);    --status-bg: var(--info-bg); }
.status[data-tone="success"] { --status-fg: var(--success-fg); --status-bg: var(--success-bg); }
.status[data-tone="warning"] { --status-fg: var(--warning-fg); --status-bg: var(--warning-bg); }
.status[data-tone="danger"]  { --status-fg: var(--danger-fg);  --status-bg: var(--danger-bg); }
```

```html
<span class="status" data-tone="danger">Overdue</span>
```

`--text-muted` is #52525b light and #d4d4d8 dark. The neutral pill bg is `--surface-sunken` (#f4f4f5 light, #0f0f11 dark: 7.03 light, 12.96 dark); the table row uses #27272a (neutral-800) as a lighter dark alternative.

### CSS modules

```css
/* Status.module.css: same body as the plain CSS, tone via composes or a data attribute */
.pill { composes: status from "./status.css"; }
.danger { --status-fg: var(--danger-fg); --status-bg: var(--danger-bg); }
```

```jsx
<span className={`${s.pill} ${s[tone]}`}>{label}</span>
```

Map word to tone in one object (`const TONE = { overdue: "danger", paid: "success" }`), never inline hex per cell.

### MUI v4

Use a style object with `withStyles`. Never target hashed JSS class names (`.makeStyles-root-12`, `.MuiChip-root-45`); use `classes` keys or `data-` attributes.

```jsx
import Chip from "@material-ui/core/Chip";
import { withStyles } from "@material-ui/core/styles";

const tones = {
  success: { color: "var(--success-fg)", background: "var(--success-bg)" },
  danger:  { color: "var(--danger-fg)",  background: "var(--danger-bg)" },
  /* warning, info, neutral likewise */
};
const StatusChip = withStyles({
  root: { height: 20, borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 500 },
  label: { paddingLeft: 8, paddingRight: 8 },
  icon: { marginLeft: 6, marginRight: -2 },
})(Chip);

export const Status = ({ tone, label }) => (
  <StatusChip size="small" label={label} style={tones[tone]}
    icon={<span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />} />
);
```

### Bootstrap 4

Override `.badge` in a stylesheet loaded after bootstrap.css. Same specificity, later source wins: no `!important`.

```css
/* status-overrides.css, linked after bootstrap.css */
.badge { display: inline-flex; align-items: center; gap: 8px; padding: 0 8px; height: 20px;
  border-radius: 4px; font-size: 12px; font-weight: 500; }
.badge::before { content: ""; width: 6px; height: 6px; border-radius: 9999px; background: currentColor; }
.badge-success { color: #15803d; background: #f0fdf4; }
.badge-warning { color: #b45309; background: #fffbeb; }
.badge-danger  { color: #b91c1c; background: #fef2f2; }
.badge-info    { color: #1d4ed8; background: #eff6ff; }
.badge-secondary { color: #52525b; background: #f4f4f5; }
```

Prefer the token variables from the plain CSS recipe when tokens.css is loaded (they flip in dark mode; literals do not).

## Progress bar

Coloured by tone, always with a number or label beside it.

```html
<div class="bar" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100" aria-label="Release 2 progress">
  <span class="bar-fill" data-tone="warning" style="width:72%"></span>
</div>
```

```css
.bar { height: 6px; border-radius: var(--radius-full); background: var(--surface-sunken); overflow: hidden; }
.bar-fill { display: block; height: 100%; background: var(--status-fg); transition: width var(--dur-base) var(--ease-out); }
.bar-fill[data-tone="success"] { --status-fg: var(--success-fg); }
.bar-fill[data-tone="warning"] { --status-fg: var(--warning-fg); }
.bar-fill[data-tone="danger"]  { --status-fg: var(--danger-fg); }
.bar-fill[data-tone="info"]    { --status-fg: var(--info-fg); }
```

- Bar fill against track is a non-text mark: >= 3:1 against `--surface`. All five fg values above clear it (lowest 5.02).
- Tone follows the status word of the same row (a "Blocked" project has a danger bar), not the percentage.
- `aria-valuenow` is the real value; omit the attribute for indeterminate.

## Overdue text

Date or duration text for an overdue item uses `--danger-fg` (6.47 light, 6.40 dark on surface), weight 500, and keeps the word ("3 days overdue", not just a red date). Other dates stay `--text-muted`.

```css
.due.is-overdue { color: var(--danger-fg); font-weight: var(--weight-medium); }
```

## Capacity bands

Named constants; a load percentage always maps to exactly one band, shown as label plus bar. Boundaries: Light < 60, Balanced 60 to 90 (inclusive), Heavy > 90 to 100 (inclusive), Over > 100.

| Constant | Range | Label | Tone |
|---|---|---|---|
| `CAPACITY_LIGHT` | < 60% | Light | info |
| `CAPACITY_BALANCED` | 60-90% | Balanced | success |
| `CAPACITY_HEAVY` | 90-100% | Heavy | warning |
| `CAPACITY_OVER` | > 100% | Over | danger |

```js
const CAPACITY_BANDS = [
  { max: 60, label: "Light", tone: "info" },
  { max: 90, label: "Balanced", tone: "success", inclusive: true },
  { max: 100, label: "Heavy", tone: "warning", inclusive: true },
  { max: Infinity, label: "Over", tone: "danger" },
];
const band = (pct) => CAPACITY_BANDS.find((b) => (b.inclusive ? pct <= b.max : pct < b.max));
```

Bar width caps at 100%; the Over band shows the real number ("112%") in text. Never rely on the bar colour alone: the label ("Heavy") is always visible next to the percentage.

## Rules

Ids mirror the scan rules (`scan.mjs --status`). Fix class: `css` = style change (Mode B), `jsx` = markup change (Mode C brief). Detection is English-only and heuristic: hits are evidence to confirm by hand, not proof. Excluded from detection: nav, buttons, `th`, tabs, headings.

| Id | What fires it | Fix class | Fix |
|---|---|---|---|
| `status-plain` | 3 or more status labels (STATUS_MIN_LABELS) in the page, all plain grey text with no pill | jsx | Wrap each label in the pill: dot + text, tone from the table above. |
| `status-mixed-style` | More than one status style (STATUS_MAX_STYLES = 1). Style key = pill or text, bg yes/no, radius bucket, weight | css | Pick one pill style; apply it to every status. Same radius, weight and bg treatment. |
| `status-word-colors` | The same status word appears in more than one colour | css | One tone per word. Map word to tone once and reuse the class. |
| `status-too-many-colors` | More than 5 distinct status colours (STATUS_MAX_COLORS) | css | Collapse to the five tones (neutral, info, success, warning, danger). |
| `status-low-contrast` | Status text vs its nearest opaque background under 4.5:1 (STATUS_MIN_CONTRAST). Non-opaque and image backgrounds are skipped | css | Use the fg/bg pairs in the table (all >= 4.79). Do not lighten text to "soften" a pill. |
| `status-color-only` | A chromatic dot of 12px or less in a cell or list item with no status word next to it | jsx | Add the label next to the dot (dot + text), or `aria-label` plus visible text. |

Advisory rules (do not change the verdict): `map-check`, `search-no-shortcut`, `no-page-summary`.

Limits: word lists are English; detection is heuristic. Known false positives: changelog-style dates read as a deadline list, Title Case project names under a "Team" heading read as people, a div-built sidebar is not excluded as navigation. Label collection stops at 500 (the STATUS line then shows `500+`, JSON `capped: true`).

Colour thresholds: grey = rgb max-min under STATUS_NEUTRAL_SPREAD (20); anything above counts as chromatic.
