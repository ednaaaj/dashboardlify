# Curated palettes

Colour comes from curated 12-step scales, not invented hex. Source of truth: [palettes/palettes.json](palettes/palettes.json) (scales light and dark, pairing map, domain defaults, chart sets, contrast table). This page is the readable summary; every hex below is copied from that file.

Step meaning (every scale): 1 app bg, 2 subtle bg, 3 element bg, 4 hovered, 5 active, 6 subtle border, 7 border, 8 strong border / focus ring, 9 solid, 10 hovered solid, 11 low-contrast text, 12 high-contrast text.

## Legibility rule

1. Foreground must always be clearly visible on its background: light text on dark surfaces, dark text on light surfaces. Any text/background pair under 3:1 is a bug; body text needs 4.5:1; text >= 24px (or bold >= 18.66px) and UI components need 3:1.
2. Filled controls (primary buttons, solid badges, active nav, selected chips) use white text by default, in light and dark mode.
3. If white on the accent's step 9 is under 4.5:1, keep the same hue and move the fill to the nearest step where white passes 4.5:1. Search order: 10, 11, 8, 7; take the first that passes. Light mode usually lands on 10-11, dark mode on 7-8. Record it as `fill` (`contrast.accent.<scale>.fill` in palettes.json). Never switch to dark text on a mid-tone or dark fill.
4. Dark text on a fill is allowed only when the fill itself is genuinely light (relative luminance >= 0.4 and white fails by a wide margin: amber, yellow, lime, mint, sky solids). Even then prefer a darker step with white text when the brand allows.
5. Hover, active and disabled states re-check the pair: the hover fill must still pass with its text; disabled may drop to 3:1 but must stay readable.
6. Never put accent text (step 11) on a same-hue subtle background when the pair is under 4.5:1; use step 12.

## 1. How to choose

0. Pick the screen structure with zones (section 9) and a combo (section 10) once the accent and neutral are known.
1. Brand colour known (theme-color, CSS variable, logo): keep the brand hue. Take the paired neutral from section 2 for the nearest accent hue, and the chart set from section 5. Only the brand colour itself may be darkened with the contrast fit.
2. No brand: take the domain row in section 3 (the scan prints the domain). Use the default accent and its paired neutral. Alternates are for when the default clashes with the product.
3. One accent scale, one neutral scale, status scales. Never more.

## 2. Pairing table (neutral to accents)

| Neutral | Accents it pairs with | Feel |
|---|---|---|
| gray | any accent | pure, any accent works (neutral pairing) |
| slate | iris, indigo, blue, sky, cyan | cool blue tint |
| sage | mint, teal, jade, green | green tint |
| olive | grass, lime | lime tint |
| sand | yellow, amber, orange, brown | yellow tint, warm |
| mauve | tomato, red, ruby, crimson, pink, plum, purple, violet | warm-violet tint |

Tinted neutral next to many saturated badges can clash, most of all in dark mode; when the UI is badge-heavy use `gray`. bronze and gold have no documented pair: use `sand` or `gray`.

## 3. Domain defaults

28 domains. Default accent and neutral, two alternates (neutral follows the pairing table), and three combos per domain (`calm`, `paper`, `brand`; section 9 and [palettes/combos.md](palettes/combos.md)). Fill = the step where white text passes 4.5:1 (see Legibility rule, section 4 and the failing list below).

Keyword detection: every domain in palettes.json has a `keywords` array (8-14 lowercase words). The scan (or you, reading the page) counts whole-word hits, plurals and -ing/-ed variants allowed, weighted 3 for the title and h1, 2 for nav labels, 1 for other text. The highest score wins; confidence is its share of all hits. Under 0.25 confidence or fewer than 2 weighted hits means `general admin`. Details: `taxonomy` in palettes.json. A known brand colour always beats the domain default.

| Domain | Default | Alternates | Feel | Avoid | Combos |
|---|---|---|---|---|---|
| finance/payments | blue + slate | indigo, cyan | trust, precise, calm | green as brand (reads as gain), red accents | calm, paper, brand |
| health/clinic/dental/lab | teal + sage | jade, cyan | calm, clean, caring | red-heavy palettes, neon | calm, paper, brand |
| logistics/ops | blue + gray | cyan, indigo | steady, industrial, legible | orange as brand (reads as warning) | calm, paper, brand |
| analytics/BI | indigo + slate | blue, sky | analytical, quiet so data leads | magenta, rainbow series | calm, paper, brand |
| e-commerce | orange + sand | tomato, amber | warm, energetic, retail | small orange text on light surfaces | calm, paper, brand |
| devtools | cyan + gray | blue, indigo | technical, neutral, focused | decorative neon, terminal green as brand | calm, paper, brand |
| HR/people | sky + slate | teal, blue | friendly, open, approachable | harsh red | calm, paper, brand |
| CRM/sales | indigo + gray | blue, teal | confident, professional | many stage colours | calm, paper, brand |
| education | grass + olive | teal, sky | fresh, encouraging, growth | playful multicolour | calm, paper, brand |
| security | iris + slate | indigo, cyan | deep, serious, controlled | alarm red as brand | calm, paper, brand |
| energy/IoT | green + sage | grass, teal | live, natural, efficient | status green clashing with brand green: shift one | calm, paper, brand |
| general admin | blue + slate | indigo, teal | neutral, quiet, utilitarian | anything loud | calm, paper, brand |
| real estate/property | bronze + sand | gold, teal | grounded, established, tactile | loud saturated brand fills over listings and photos | calm, paper, brand |
| insurance | jade + sage | teal, blue | protective, steady, reassuring | red accents (reads as claim denied or alarm) | calm, paper, brand |
| travel/hospitality | amber + sand | orange, sky | warm, welcoming, sunlit | cold grey chrome, amber text on light surfaces | calm, paper, brand |
| food/restaurant | tomato + mauve | orange, amber | appetising, warm, lively | red as an error cue next to the brand red | calm, paper, brand |
| legal/compliance | plum + mauve | iris, indigo | formal, deliberate, discreet | bright magenta, purple-to-pink gradients | calm, paper, brand |
| marketing/ads | crimson + mauve | pink, orange | expressive, confident, campaign-led | rainbow channel colours, hot-pink gradients | calm, paper, brand |
| crypto/web3 | gold + gray | amber, cyan | precise, technical, high-stakes | neon purple gradients, glow effects, rocket imagery | calm, paper, brand |
| media/content | ruby + mauve | crimson, orange | editorial, expressive, reader-first | many category colours competing with imagery | calm, paper, brand |
| nonprofit/community | mint + sage | teal, grass | open, hopeful, human | charity-red urgency, stock-photo overlays | calm, paper, brand |
| government/public sector | cyan + slate | blue, indigo | civic, plain, dependable | party-colour associations, decorative gradients | calm, paper, brand |
| agriculture/farming | lime + olive | grass, amber | earthy, fresh, outdoor | lime text on light surfaces, toy-like greens | calm, paper, brand |
| manufacturing/industrial | yellow + sand | amber, cyan | robust, hard-wearing, no-nonsense | yellow text on light surfaces, hazard-stripe decoration | calm, paper, brand |
| fitness/wellness | pink + mauve | orange, teal | energetic, personal, motivating | neon gradients, shaming red for missed goals | calm, paper, brand |
| construction/field-ops | orange + gray | amber, blue | rugged, high-visibility, practical | orange status colours colliding with the brand orange | calm, paper, brand |
| telecom/network | sky + gray | indigo, teal | connected, technical, always-on | rainbow signal-strength colours as brand | calm, paper, brand |
| gaming/esports | purple + mauve | iris, red | competitive, immersive, high-energy | neon purple gradients, glow-on-everything | calm, paper, brand |

Key tokens of the `calm` combo (app bg = step 1, surface = step 2, border = step 6, fill = the white-text-safe solid step for that mode, on-fill = text on the fill (always white for these defaults), text = step 12). `paper` and `brand` page tokens are in combos.md.

| Domain | Mode | bg | surface | border | fill | on-fill | text |
|---|---|---|---|---|---|---|---|
| finance/payments | light | #fcfcfd | #f9f9fb | #d9d9e0 | #0d74ce (blue-11) | #ffffff | #1c2024 |
| finance/payments | dark | #111113 | #18191b | #363a3f | #2870bd (blue-8) | #ffffff | #edeef0 |
| health/clinic/dental/lab | light | #fbfdfc | #f7f9f8 | #d7dad9 | #008573 (teal-11) | #ffffff | #1a211e |
| health/clinic/dental/lab | dark | #101211 | #171918 | #373b39 | #207e73 (teal-8) | #ffffff | #eceeed |
| logistics/ops | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #0d74ce (blue-11) | #ffffff | #202020 |
| logistics/ops | dark | #111111 | #191919 | #3a3a3a | #2870bd (blue-8) | #ffffff | #eeeeee |
| analytics/BI | light | #fcfcfd | #f9f9fb | #d9d9e0 | #3e63dd (indigo-9) | #ffffff | #1c2024 |
| analytics/BI | dark | #111113 | #18191b | #363a3f | #3e63dd (indigo-9) | #ffffff | #edeef0 |
| e-commerce | light | #fdfdfc | #f9f9f8 | #dad9d6 | #cc4e00 (orange-11) | #ffffff | #21201c |
| e-commerce | dark | #111110 | #191918 | #3b3a37 | #a35829 (orange-8) | #ffffff | #eeeeec |
| devtools | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #107d98 (cyan-11) | #ffffff | #202020 |
| devtools | dark | #111111 | #191919 | #3a3a3a | #11809c (cyan-8) | #ffffff | #eeeeee |
| HR/people | light | #fcfcfd | #f9f9fb | #d9d9e0 | #00749e (sky-11) | #ffffff | #1c2024 |
| HR/people | dark | #111113 | #18191b | #363a3f | #197cae (sky-8) | #ffffff | #edeef0 |
| CRM/sales | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #3e63dd (indigo-9) | #ffffff | #202020 |
| CRM/sales | dark | #111111 | #191919 | #3a3a3a | #3e63dd (indigo-9) | #ffffff | #eeeeee |
| education | light | #fcfdfc | #f8faf8 | #d7dad7 | #2a7e3b (grass-11) | #ffffff | #1d211c |
| education | dark | #111210 | #181917 | #383a36 | #3e7949 (grass-8) | #ffffff | #eceeec |
| security | light | #fcfcfd | #f9f9fb | #d9d9e0 | #5b5bd6 (iris-9) | #ffffff | #1c2024 |
| security | dark | #111113 | #18191b | #363a3f | #5b5bd6 (iris-9) | #ffffff | #edeef0 |
| energy/IoT | light | #fbfdfc | #f7f9f8 | #d7dad9 | #218358 (green-11) | #ffffff | #1a211e |
| energy/IoT | dark | #101211 | #171918 | #373b39 | #2f7c57 (green-8) | #ffffff | #eceeed |
| general admin | light | #fcfcfd | #f9f9fb | #d9d9e0 | #0d74ce (blue-11) | #ffffff | #1c2024 |
| general admin | dark | #111113 | #18191b | #363a3f | #2870bd (blue-8) | #ffffff | #edeef0 |
| real estate/property | light | #fdfdfc | #f9f9f8 | #dad9d6 | #7d5e54 (bronze-11) | #ffffff | #21201c |
| real estate/property | dark | #111110 | #191918 | #3b3a37 | #6f5f58 (bronze-8) | #ffffff | #eeeeec |
| insurance | light | #fbfdfc | #f7f9f8 | #d7dad9 | #208368 (jade-11) | #ffffff | #1a211e |
| insurance | dark | #101211 | #171918 | #373b39 | #2a7e68 (jade-8) | #ffffff | #eceeed |
| travel/hospitality | light | #fdfdfc | #f9f9f8 | #dad9d6 | #ab6400 (amber-11) | #ffffff | #21201c |
| travel/hospitality | dark | #111110 | #191918 | #3b3a37 | #8f6424 (amber-8) | #ffffff | #eeeeec |
| food/restaurant | light | #fdfcfd | #faf9fb | #dbd8e0 | #d13415 (tomato-11) | #ffffff | #211f26 |
| food/restaurant | dark | #121113 | #1a191b | #3c393f | #ac4d39 (tomato-8) | #ffffff | #eeeef0 |
| legal/compliance | light | #fdfcfd | #faf9fb | #dbd8e0 | #ab4aba (plum-9) | #ffffff | #211f26 |
| legal/compliance | dark | #121113 | #1a191b | #3c393f | #ab4aba (plum-9) | #ffffff | #eeeef0 |
| marketing/ads | light | #fdfcfd | #faf9fb | #dbd8e0 | #cb1d63 (crimson-11) | #ffffff | #211f26 |
| marketing/ads | dark | #121113 | #1a191b | #3c393f | #b0436e (crimson-8) | #ffffff | #eeeef0 |
| crypto/web3 | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #71624b (gold-11) | #ffffff | #202020 |
| crypto/web3 | dark | #111111 | #191919 | #3a3a3a | #696256 (gold-8) | #ffffff | #eeeeee |
| media/content | light | #fdfcfd | #faf9fb | #dbd8e0 | #ca244d (ruby-11) | #ffffff | #211f26 |
| media/content | dark | #121113 | #1a191b | #3c393f | #b3445a (ruby-8) | #ffffff | #eeeef0 |
| nonprofit/community | light | #fbfdfc | #f7f9f8 | #d7dad9 | #027864 (mint-11) | #ffffff | #1a211e |
| nonprofit/community | dark | #101211 | #171918 | #373b39 | #277f70 (mint-8) | #ffffff | #eceeed |
| government/public sector | light | #fcfcfd | #f9f9fb | #d9d9e0 | #107d98 (cyan-11) | #ffffff | #1c2024 |
| government/public sector | dark | #111113 | #18191b | #363a3f | #11809c (cyan-8) | #ffffff | #edeef0 |
| agriculture/farming | light | #fcfdfc | #f8faf8 | #d7dad7 | #5c7c2f (lime-11) | #ffffff | #1d211c |
| agriculture/farming | dark | #111210 | #181917 | #383a36 | #577538 (lime-8) | #ffffff | #eceeec |
| manufacturing/industrial | light | #fdfdfc | #f9f9f8 | #dad9d6 | #9e6c00 (yellow-11) | #ffffff | #21201c |
| manufacturing/industrial | dark | #111110 | #191918 | #3b3a37 | #836a21 (yellow-8) | #ffffff | #eeeeec |
| fitness/wellness | light | #fdfcfd | #faf9fb | #dbd8e0 | #cf3897 (pink-10) | #ffffff | #211f26 |
| fitness/wellness | dark | #121113 | #1a191b | #3c393f | #a84885 (pink-8) | #ffffff | #eeeef0 |
| construction/field-ops | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #cc4e00 (orange-11) | #ffffff | #202020 |
| construction/field-ops | dark | #111111 | #191919 | #3a3a3a | #a35829 (orange-8) | #ffffff | #eeeeee |
| telecom/network | light | #fcfcfc | #f9f9f9 | #d9d9d9 | #00749e (sky-11) | #ffffff | #202020 |
| telecom/network | dark | #111111 | #191919 | #3a3a3a | #197cae (sky-8) | #ffffff | #eeeeee |
| gaming/esports | light | #fdfcfd | #faf9fb | #dbd8e0 | #8e4ec6 (purple-9) | #ffffff | #211f26 |
| gaming/esports | dark | #121113 | #1a191b | #3c393f | #8e4ec6 (purple-9) | #ffffff | #eeeef0 |

### Solids that fail white text

White on step 9 is below 4.5:1 for these accents. Keep the hue, move the fill to the first step of 10, 11, 8, 7 where white passes 4.5:1, and keep white text. Light mode lands on step 10-11, dark mode on step 8. Never switch to dark text on these mid-tone fills.

| Accent | White on 9 (light) | Light fill | White on it | Dark fill | White on it |
|---|---|---|---|---|---|
| tomato | 3.8 | step 11 #d13415 | 4.9 | step 8 #ac4d39 | 5.4 |
| red | 3.9 | step 11 #ce2c31 | 5.2 | step 8 #b54548 | 5.3 |
| ruby | 3.8 | step 11 #ca244d | 5.4 | step 8 #b3445a | 5.3 |
| crimson | 3.8 | step 11 #cb1d63 | 5.3 | step 8 #b0436e | 5.4 |
| pink | 4.1 | step 10 #cf3897 | 4.5 | step 8 #a84885 | 5.3 |
| blue | 3.2 | step 11 #0d74ce | 4.7 | step 8 #2870bd | 5 |
| cyan | 3 | step 11 #107d98 | 4.7 | step 8 #11809c | 4.5 |
| teal | 3 | step 11 #008573 | 4.5 | step 8 #207e73 | 4.8 |
| jade | 3.1 | step 11 #208368 | 4.6 | step 8 #2a7e68 | 4.9 |
| green | 3.1 | step 11 #218358 | 4.7 | step 8 #2f7c57 | 5 |
| grass | 3 | step 11 #2a7e3b | 5 | step 8 #3e7949 | 5.2 |
| bronze | 3.5 | step 11 #7d5e54 | 5.8 | step 8 #6f5f58 | 6 |
| gold | 3.6 | step 11 #71624b | 5.9 | step 8 #696256 | 6 |
| brown | 3.5 | step 11 #815e46 | 5.7 | step 8 #7c5f46 | 5.8 |
| orange | 2.9 | step 11 #cc4e00 | 4.5 | step 8 #a35829 | 5.2 |
| amber | 1.5 | step 11 #ab6400 | 4.6 | step 8 #8f6424 | 5.2 |
| yellow | 1.2 | step 11 #9e6c00 | 4.5 | step 8 #836a21 | 5.1 |
| lime | 1.3 | step 11 #5c7c2f | 4.7 | step 8 #577538 | 5.2 |
| mint | 1.4 | step 11 #027864 | 5.4 | step 8 #277f70 | 4.8 |
| sky | 1.4 | step 11 #00749e | 5.2 | step 8 #197cae | 4.6 |

White passes on step 9 in both modes for: plum, purple, violet, iris, indigo (fill = step 9, dark and light).

Very light solids (amber, yellow, lime, mint, sky) are the only scales where dark text on step 9 is allowed (the fill itself is light). Prefer the white-text fills above; they keep the same hue, give a darker and more legible button, and are what the domain defaults use.

Low-contrast text (step 11) on step 2 in light mode is under 4.5:1 for teal, jade, green, orange, amber, yellow. For those, accent text uses step 12 (see `--accent-text` in section 4); the combo cards in section 7 show it, and the scan prints `--accent-text` for the detected accent.

## 4. Mapping scale steps to skill tokens

Let N = the neutral scale, A = the accent scale, mode arrays are `scales.<name>.light` or `.dark` (1-based steps below).

| Token | Rule |
|---|---|
| --bg | N1 |
| --surface | N2 (cards, panels) |
| --surface-sunken | N3 |
| --border | N6 (N7 for inputs) |
| --border-strong | N7; focus ring N8 or A8 |
| --text | N12 |
| --text-muted | N11 |
| --accent-base (the fill) | A9 if white on A9 >= 4.5:1, else the first of A10, A11, A8, A7 that passes (`contrast.accent.<scale>.fill`), per mode |
| --accent-hover | the fill mixed 8% toward black; re-check white on it is still >= 4.5:1 |
| --text-on-accent (on-fill) | #ffffff in light and dark. Dark only when the fill itself is genuinely light (amber, yellow, lime, mint, sky step 9), and even then prefer a darker step with white |
| --accent-text | accent link / active nav text: A11, or A12 when A11 on N2 (the surface) is below 4.5:1 |
| --accent-subtle | A3 (hover A4, selected A5) |
| status fill | success green, warning amber, danger red, info blue (palettes.json `status`): same fill rule as --accent-base |
| status text | step 11 of the status scale (12 if below 4.5:1 on N2); badge background step 3, border step 6 |
| --chart-1 | the accent fill step (same as --accent-base), both modes |
| --chart-2..6 | section 5 |
| --neutral-50..950 | the `tailwind` family matching N: gray=gray, mauve=mauve, slate=slate, sage=mist, olive=olive, sand=stone (keys 50 to 950 map directly) |

Dark mode: write the dark values in the dark selector with the same token names (section 6).

## 5. Charts

- One accent plus neutral series is preferred: chart-1 = the accent fill step, comparison series N7 / N8 / N9. This is the default.
- Categorical, 6 or fewer series, colourblind safe: `chart.okabeIto`, skipping black. Series order: blue #0072b2, orange #e69f00, bluish green #009e73, sky blue #56b4e9, vermillion #d55e00, reddish purple #cc79a7. Yellow #f0e442 only on dark backgrounds. Use these as --chart-1..6 when the data has real categories.
- Softer categorical sets: `chart.brewerSet2` (light backgrounds, fills), `chart.brewerDark2` (lines, small marks, text-adjacent), `chart.brewerPaired` (paired light/dark shades, use for grouped pairs only), `chart.tableau10` (up to 10 categories, last resort).
- Sequential (one measure low to high): `chart.sequential.blue|green|orange|purple|grey`, 7 steps; pick the hue closest to the accent, or grey. Use the light end for low values on light backgrounds; reverse on dark backgrounds.
- Never encode meaning by colour alone: add direct labels, markers or dash styles. Do not use green and red as the only pair; use blue and orange.
- Keep status colours out of the categorical set.

## 6. Dark mode

Use the `dark` arrays of the same scales. Never invert light values and never lighten by formula. Surfaces: N1 / N2 / N3. Text: N12 / N11. Fill: A9 when white passes 4.5:1, else the dark `fill` step (usually step 8) with white text; never a mid-tone fill with dark text. Borders N6 / N7. Re-measure any pair you change.

## 7. Combo cards

Eight ready combinations. Each shows the six key tokens and the measured contrast (WCAG ratios, rounded down).

### Clinic, lab, dental: teal + sage

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fbfdfc | #f7f9f8 | #d7dad9 | #008573 | #ffffff | #1a211e | 16.0 | 4.5 | 11.4 (teal-12) |
| dark | #101211 | #171918 | #373b39 | #207e73 | #ffffff | #eceeed | 16.1 | 4.8 | 9.6 (teal-11) |

### Finance, payments: blue + slate

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fcfcfd | #f9f9fb | #d9d9e0 | #0d74ce | #ffffff | #1c2024 | 15.9 | 4.7 | 4.5 (blue-11) |
| dark | #111113 | #18191b | #363a3f | #2870bd | #ffffff | #edeef0 | 16.2 | 5.0 | 8.3 (blue-11) |

### Analytics, BI: indigo + slate

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fcfcfd | #f9f9fb | #d9d9e0 | #3e63dd | #ffffff | #1c2024 | 15.9 | 5.2 | 5.7 (indigo-11) |
| dark | #111113 | #18191b | #363a3f | #3e63dd | #ffffff | #edeef0 | 16.2 | 5.2 | 8.5 (indigo-11) |

### E-commerce: orange + sand

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fdfdfc | #f9f9f8 | #dad9d6 | #cc4e00 | #ffffff | #21201c | 16.0 | 4.5 | 11.0 (orange-12) |
| dark | #111110 | #191918 | #3b3a37 | #a35829 | #ffffff | #eeeeec | 16.2 | 5.2 | 8.7 (orange-11) |

### Energy, IoT: green + sage

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fbfdfc | #f7f9f8 | #d7dad9 | #218358 | #ffffff | #1a211e | 16.0 | 4.7 | 11.6 (green-12) |
| dark | #101211 | #171918 | #373b39 | #2f7c57 | #ffffff | #eceeed | 16.1 | 5.0 | 9.4 (green-11) |

### Devtools: cyan + gray

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fcfcfc | #f9f9f9 | #d9d9d9 | #107d98 | #ffffff | #202020 | 15.8 | 4.7 | 4.5 (cyan-11) |
| dark | #111111 | #191919 | #3a3a3a | #11809c | #ffffff | #eeeeee | 16.2 | 4.5 | 9.2 (cyan-11) |

### HR, people: sky + slate

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fcfcfd | #f9f9fb | #d9d9e0 | #00749e | #ffffff | #1c2024 | 15.9 | 5.2 | 5.0 (sky-11) |
| dark | #111113 | #18191b | #363a3f | #197cae | #ffffff | #edeef0 | 16.2 | 4.6 | 9.3 (sky-11) |

### Education: grass + olive

| Mode | bg | surface | border | fill | on-fill | text | text on bg | on-fill on fill | accent text on surface |
|---|---|---|---|---|---|---|---|---|---|
| light | #fcfdfc | #f8faf8 | #d7dad7 | #2a7e3b | #ffffff | #1d211c | 16.0 | 5.0 | 4.8 (grass-11) |
| dark | #111210 | #181917 | #383a36 | #3e7949 | #ffffff | #eceeec | 16.1 | 5.2 | 9.2 (grass-11) |

## 8. Anti-patterns

- Purple-to-pink (or any hue-to-hue) gradients as brand or hero.
- More than one accent scale. Status scales are separate and used only for status.
- Mixing neutral families by accident (a slate sidebar next to gray cards). A paper neutral chosen by a combo is deliberate and used for the whole page zone.
- White text on a solid that fails 4.5:1 (see the failing list): move the fill step instead.
- Dark text on a mid-tone or dark button (for example blue step 9 with dark text): use white on the step that passes 4.5:1.
- Saturated pages or data surfaces: a brand-filled zone is for a sidebar, header or hero band only (section 9). Tables, charts and forms stay on page or surface zones; the plain default sidebar stays on N1 / N2 with A3 and A11 for the active item.
- Inventing hex values instead of using these scales; only a brand colour may be darkened with the contrast fit.

## 9. Zones: paper, brand, ink

A screen is not white versus black. Each combo in palettes.json (`combos`) defines three surface zones, in light and dark:

- paper (`zones.<mode>.page`): the working surface. Use a tinted warm or cool paper step of a neutral instead of pure white; cards are step 1 or #ffffff with a step 6 border. Text N12, muted N11, accent text A11 (A12 when A11 is under 4.5:1).
- brand (`zones.<mode>.brand`): the accent as a whole surface (the white-text-safe fill step) with a light foreground: #ffffff, a light tint of the accent for muted text, an inverted button (light accent tint with accent-12 text).
- ink (`zones.<mode>.ink`): a dark neutral surface (dark steps 1-3, in light theme too) with light foreground and an accent text step that passes 4.5:1 on it.

Where to use:
- Brand sidebar or top band over a paper page.
- Ink sidebar over a paper page.
- A hero band or empty-state header in the brand or ink zone.
- Never a fully saturated page. Data surfaces (tables, charts, forms) stay on page or surface zones, neutral.
- At most two non-page zones on one screen. Foreground on brand and ink zones is always light; foreground on paper is always dark. Every pair in `ratios` is >= 4.5:1.

Example, finance/payments `paper` (blue + sand), light: page #f1f0ef with #ffffff cards and #21201c text, brand #0d74ce with #ffffff text, ink #191918 with #eeeeec text.

## 10. Choosing a combo

- calm: dense data, ops and back-office screens. Neutral page (step 1 / 2), data leads, the accent only on actions.
- paper: warm, editorial or consumer-facing products. A tinted paper page with white cards; feels designed, not default.
- brand: product-led or brand-heavy products. A brand-filled sidebar or top band over a paper page.
- The product has a brand colour: keep its hue, pick the nearest scale from `scales`, then use that scale with the combo's neutral. Ask before changing a known brand hue.
- Not sure: start with calm; if the screen reads as white and black, move to paper.

All combos, with hex and the minimum ratio per mode: [palettes/combos.md](palettes/combos.md) (generated from palettes.json).
