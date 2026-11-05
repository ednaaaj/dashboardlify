# Identity presets (typeface, sidebar, accent)

Three self-consistent identities. All font stacks are system fonts (no webfont download, no layout shift). Every text/background pair below is measured (WCAG relative luminance, node one-liner at the end) and at least 4.5:1 (ratios rounded to 2 decimals). Dark variants are real redesigns of the pair, not an inversion.

## HARD RULE (improve and rework)

1. Show the 2-3 candidate presets (from the domain map) with a one-line rationale each. WAIT for the user to choose. Never apply one silently, never default.
2. Mode B (values-only) never changes font family, sidebar colour or accent hue. Identity is a Mode C / rework decision, and only after the choice in step 1.
3. Foreground is always legible on its surface. White text only on fills that reach 4.5:1; light fills (amber) take a dark on-fill colour.
4. If the user declines all, keep the existing identity and say so.

## Presets (light)

| Token | editorial | product | ink |
|---|---|---|---|
| Heading / KPI stack | `ui-serif, Georgia, Cambria, "Times New Roman", serif` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Body stack | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | same as heading | same as heading |
| H1 / KPI numeral / body | 28 / 36 / 14 px (serif) | 24 / 32 / 14 px | 24 / 32 / 14 px (numerals `tabular-nums`) |
| Page bg | `#fefdfb` | `#f9fafb` | `#f8f9fa` |
| Card bg | `#ffffff` | `#ffffff` | `#ffffff` |
| Border | `#e4e2dc` | `#dde3ea` | `#dcdfe4` |
| Text / muted | `#21201c` / `#65625b` | `#1c2024` / `#5b6068` | `#1c2024` / `#5b6068` |
| Sidebar bg | `#191918` | `#f3f5f8` | `#18191b` |
| Sidebar fg / muted | `#eeeeec` / `#b5b3ad` | `#1c2024` / `#5b6068` | `#edeef0` / `#b0b4ba` |
| Sidebar active bg | `#2e2d2a` | `#e1e7f0` | `#2b2e33` |
| Accent fill | `#ffc53d` | `#0d74ce` | `#008573` |
| On-fill text | `#21201c` (dark) | `#ffffff` | `#ffffff` |
| Accent text | `#ab6400` | `#0b68b8` | `#007767` |

## Presets (dark)

| Token | editorial | product | ink |
|---|---|---|---|
| Page bg | `#151514` | `#0e1012` | `#111213` |
| Card bg | `#1f1e1c` | `#171a1d` | `#18191b` |
| Border | `#34322e` | `#2a3038` | `#2b2e33` |
| Text / muted | `#eeeeec` / `#b5b3ad` | `#edeef0` / `#a4aab3` | `#edeef0` / `#b0b4ba` |
| Sidebar bg | `#0f0f0e` | `#111316` | `#0e0f10` |
| Sidebar fg / muted | `#eeeeec` / `#b5b3ad` | `#edeef0` / `#a4aab3` | `#edeef0` / `#b0b4ba` |
| Sidebar active bg | `#2e2d2a` | `#232a34` | `#2b2e33` |
| Accent fill / on-fill | `#ffc53d` / `#21201c` | `#0d74ce` / `#ffffff` | `#008573` / `#ffffff` |
| Accent text | `#ffc53d` | `#70b8ff` | `#0bd8b6` |

Borders are non-text and decorative; they are not held to 4.5:1 (use 3:1 only if a border is the sole boundary of an input).

## Measured contrast (node, WCAG 2.x)

| Pair | editorial L | editorial D | product L | product D | ink L | ink D |
|---|---|---|---|---|---|---|
| text / page | 16.04 | 15.73 | 15.68 | 16.42 | 15.55 | 16.15 |
| text / card | 16.30 | 14.34 | 16.39 | 15.05 | 16.39 | 15.15 |
| muted / page | 5.99 | 8.72 | 6.06 | 8.15 | 6.00 | 9.01 |
| muted / card | 6.08 | 7.94 | 6.33 | 7.47 | 6.33 | 8.45 |
| sidebar fg / sidebar bg | 15.14 | 16.51 | 15.00 | 16.03 | 15.15 | 16.53 |
| sidebar muted / sidebar bg | 8.39 | 9.15 | 5.80 | 7.96 | 8.45 | 9.21 |
| sidebar fg / active bg | 11.85 | 11.85 | 13.18 | 12.46 | 11.74 | 11.74 |
| sidebar muted / active bg | 6.57 | 6.57 | 5.09 | 6.18 | 6.54 | 6.54 |
| on-fill / accent fill | 10.33 | 10.33 | 4.77 | 4.77 | 4.56 | 4.56 |
| accent text / page | 4.54 | 11.58 | 5.45 | 9.07 | 5.20 | 10.28 |
| accent text / card | 4.61 | 10.55 | 5.70 | 8.31 | 5.48 | 9.64 |

Lowest of the table: 4.54. White on amber `#ffc53d` measures 1.58, which is why editorial uses a dark on-fill. Product and ink fills pass white only narrowly (4.77, 4.56): do not lighten them. Accent text on editorial light passes only on `#fefdfb` / `#ffffff`; do not place it on tinted surfaces without re-measuring.

## Domain to preset map

Keys are the `domains` names in `palettes/palettes.json`. First preset is the lead candidate; show the 2-3 listed and let the user pick.

| Domain | Candidates (lead first) | Rationale |
|---|---|---|
| finance/payments | product, ink | calm, precise, trust |
| health/clinic/dental/lab | ink, product | clean, caring, low noise |
| logistics/ops | product, ink | steady, legible |
| analytics/BI | ink, product | quiet frame so data leads |
| e-commerce | editorial, product | warm, retail |
| devtools | ink, product | technical, focused |
| HR/people | editorial, product | human, warm |
| CRM/sales | product, editorial | familiar, energetic |
| education | editorial, product | reading-led, warm |
| security | ink, product | sober, high contrast |
| energy/IoT | ink, product | technical, numeric |
| general admin | product, ink | neutral default |
| real estate/property | editorial, product | considered, premium |
| insurance | product, ink | trust, plain |
| travel/hospitality | editorial, product | warm, hospitable |
| food/restaurant | editorial, product | warm, appetite |
| legal/compliance | editorial, ink | formal, text-heavy |
| marketing/ads | product, editorial | lively, clear |
| crypto/web3 | ink, product | technical, dense numbers |
| media/content | editorial, ink | reading-led |
| nonprofit/community | editorial, product | human, approachable |
| government/public sector | product, ink | plain, accessible |
| agriculture/farming | editorial, product | grounded, warm |
| manufacturing/industrial | ink, product | sturdy, legible |
| fitness/wellness | editorial, ink | warm or calm |
| construction/field-ops | product, ink | plain, outdoors-legible |
| telecom/network | ink, product | technical, status-heavy |
| gaming/esports | ink, product | dark-first, dense |

If the domain is not in the map, use `general admin`.

## Tokens (per preset)

Map onto `tokens.css` names (`--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`); the `--id-*` names are the identity layer on top.

editorial:

```css
:root {
  --id-font-head: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  --id-font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --bg: #fefdfb; --surface: #ffffff; --border: #e4e2dc;
  --text: #21201c; --text-muted: #65625b;
  --id-side-bg: #191918; --id-side-fg: #eeeeec; --id-side-muted: #b5b3ad; --id-side-active: #2e2d2a;
  --accent: #ffc53d; --accent-fg: #21201c; --accent-text: #ab6400;
}
[data-theme="dark"] {
  --bg: #151514; --surface: #1f1e1c; --border: #34322e;
  --text: #eeeeec; --text-muted: #b5b3ad; --id-side-bg: #0f0f0e; --accent-text: #ffc53d;
}
h1, .kpi-value { font-family: var(--id-font-head); }
```

product:

```css
:root {
  --id-font-head: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --id-font-body: var(--id-font-head);
  --bg: #f9fafb; --surface: #ffffff; --border: #dde3ea;
  --text: #1c2024; --text-muted: #5b6068;
  --id-side-bg: #f3f5f8; --id-side-fg: #1c2024; --id-side-muted: #5b6068; --id-side-active: #e1e7f0;
  --accent: #0d74ce; --accent-fg: #ffffff; --accent-text: #0b68b8;
}
[data-theme="dark"] {
  --bg: #0e1012; --surface: #171a1d; --border: #2a3038;
  --text: #edeef0; --text-muted: #a4aab3;
  --id-side-bg: #111316; --id-side-fg: #edeef0; --id-side-muted: #a4aab3; --id-side-active: #232a34;
  --accent-text: #70b8ff;
}
```

ink:

```css
:root {
  --id-font-head: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --id-font-body: var(--id-font-head);
  --bg: #f8f9fa; --surface: #ffffff; --border: #dcdfe4;
  --text: #1c2024; --text-muted: #5b6068;
  --id-side-bg: #18191b; --id-side-fg: #edeef0; --id-side-muted: #b0b4ba; --id-side-active: #2b2e33;
  --accent: #008573; --accent-fg: #ffffff; --accent-text: #007767;
}
[data-theme="dark"] {
  --bg: #111213; --surface: #18191b; --border: #2b2e33;
  --text: #edeef0; --text-muted: #b0b4ba;
  --id-side-bg: #0e0f10; --accent-text: #0bd8b6;
}
.kpi-value { font-variant-numeric: tabular-nums; }
```

## Applying on legacy stacks

| Stack | How |
|---|---|
| Any (CSS variables bridge) | Define the `--id-*` and token variables above in one stylesheet loaded after the app CSS; point the app's existing colour and font rules at them (`color: var(--text)`). No component rewrite |
| MUI v4 | `createMuiTheme({ palette: { primary: { main: '<accent>', contrastText: '<accent-fg>' }, background: { default: '<bg>', paper: '<surface>' }, text: { primary: '<text>', secondary: '<text-muted>' } }, typography: { fontFamily: '<body stack>', h1: { fontFamily: '<head stack>' } } })`; sidebar via `overrides.MuiDrawer.paper` |
| Bootstrap 4 | No runtime variables: set the Sass variables (`$primary`, `$body-bg`, `$body-color`, `$font-family-base`) before import if you build Sass; otherwise a late stylesheet overriding `.btn-primary`, `.navbar`, `.sidebar`, `body`. Keep `.btn-primary` colour and its text colour paired (`--accent` / `--accent-fg`) |
| Tailwind | `theme.extend.colors` / `fontFamily` reading the CSS variables |

Verify after applying: re-run the contrast check on the rendered colours (`measure.md`), and confirm the sidebar text and the primary button text are legible in both themes.

## Re-measure one-liner

```bash
node -e "const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};const r=(a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};console.log(r('#21201c','#ffc53d'))"
```
