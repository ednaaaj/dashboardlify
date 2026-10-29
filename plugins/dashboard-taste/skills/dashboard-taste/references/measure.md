# measure.md - mechanical scan snippet (Assessment B input)

Read-only. Paste into DevTools console, or run through Playwright/Puppeteer `page.evaluate`. No deps. Returns one JSON object. Used by [redesign.md](redesign.md) Steps 1, 2B, 7.

## Run

- DevTools: paste the snippet, copy the returned object (`copy(...)` wrapper optional).
- Playwright: `const r = await page.evaluate(fs.readFileSync('measure.js','utf8'))` after `page.setViewportSize({width:1440,height:900})`. Repeat at 390 wide.
- ctx_execute (node): launch playwright-core against a local Chrome (`executablePath`), `evaluate`, then `console.log` only the fields you need.
- Run it BEFORE and AFTER the redesign, same viewport, same data, then diff (Step 7).

## Snippet

```js
(() => {
  const VW = innerWidth, VH = innerHeight, N = 8;
  const vis = e => { try { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0; } catch (_) { return false; } };
  const all = [...document.body.querySelectorAll('*')].filter(vis);
  const hist = {}; const bump = (k, v) => { if (v == null || v === '') return; (hist[k] ||= {})[v] = (hist[k][v] || 0) + 1; };
  const top = h => Object.entries(h || {}).sort((a, b) => b[1] - a[1]);
  const out = { viewport: [VW, VH] };
  const num = v => parseFloat(v) || 0;
  const hasText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const cn = e => String(e.className?.baseVal ?? e.className);
  const SKIP = 'button,input,select,textarea,a,[role=button],[role=tab],svg,img';
  const cardLike = (e, s) => { if (e.matches(SKIP)) return false; const r = e.getBoundingClientRect(); return r.width >= 64 && r.height >= 48 && num(s.borderTopLeftRadius) > 0 && (s.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some(d => num(s['border' + d + 'Width']) > 0 && s['border' + d + 'Style'] !== 'none')); };

  // 1 regions
  const sel = 'header,nav,aside,main,section,[class*=card],table,canvas,svg[width],button';
  out.regions = [...document.querySelectorAll(sel)].filter(vis).slice(0, 200).map(e => {
    const r = e.getBoundingClientRect();
    return { tag: e.tagName.toLowerCase(), cls: cn(e).slice(0, 40), x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), pctW: +(100 * r.width / VW).toFixed(1), pctH: +(100 * r.height / VH).toFixed(1) };
  });

  // 2 histograms + 3 nested cards + 5 contrast
  // every color goes through a 1x1 canvas: handles color-mix(), oklch(), color(srgb ...), hsl, named. null = unparseable.
  const cx = document.createElement('canvas'); cx.width = cx.height = 1;
  const ctx = cx.getContext('2d', { willReadFrequently: true });
  const rgba = c => { try { ctx.fillStyle = '#010203'; ctx.fillStyle = c; if (ctx.fillStyle === '#010203' && !/^#010203$/i.test(c.trim())) return null;
    ctx.clearRect(0, 0, 1, 1); ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; } catch (_) { return null; } };
  const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
  const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  // composite translucent ancestor backgrounds onto the nearest opaque one; null if any layer is unparseable
  const bgOf = e => { const layers = []; let base = [255, 255, 255];
    for (let n = e; n; n = n.parentElement) { const p = rgba(getComputedStyle(n).backgroundColor); if (!p) return null; if (p[3] > 0) layers.push(p); if (p[3] >= 0.99) { base = p; layers.pop(); break; } }
    return layers.reverse().reduce((b, l) => over(l, b), base); };
  let unverified = 0;
  const nested = [], lowContrast = [], cards = new Set();
  all.forEach(e => { try {
    const s = getComputedStyle(e);
    if (hasText(e)) { bump('fontSize', s.fontSize); bump('fontWeight', s.fontWeight); bump('fontFamily', s.fontFamily.split(',')[0].trim()); bump('color', s.color);
      if (s.fontVariantNumeric.includes('tabular') && /\d/.test(e.textContent)) bump('tabularNums', 'yes');
      const f0 = rgba(s.color), b0 = bgOf(e);
      if (!f0 || !b0) unverified++; else { const L1 = lum(over(f0, b0)), L2 = lum(b0), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      if (ratio < 4.5 && lowContrast.length < 40) lowContrast.push({ text: e.textContent.trim().slice(0, 30), ratio: +ratio.toFixed(2), fg: s.color, size: s.fontSize }); } }
    if (num(s.borderTopLeftRadius)) bump('radius', s.borderTopLeftRadius);
    if (s.boxShadow !== 'none') bump('shadow', s.boxShadow.slice(0, 60));
    const bgc = rgba(s.backgroundColor); if (bgc && bgc[3] > 0) bump('background', s.backgroundColor);
    ['paddingTop', 'paddingLeft', 'rowGap', 'columnGap'].forEach(p => { const v = num(s[p]); if (v) bump(p === 'rowGap' || p === 'columnGap' ? 'gap' : 'padding', v + 'px'); });
    s.transitionDuration.split(',').forEach(d => num(d) && bump('transitionDuration', d.trim()));
    if (cardLike(e, s)) { cards.add(e); let p = e.parentElement; while (p && !cards.has(p)) p = p.parentElement;
      if (p && p !== e) nested.push({ inner: e.tagName.toLowerCase() + '.' + cn(e).slice(0, 30), outer: p.tagName.toLowerCase() + '.' + cn(p).slice(0, 30) }); }
  } catch (_) {} });
  out.histograms = Object.fromEntries(Object.entries(hist).map(([k, h]) => [k, { distinct: Object.keys(h).length, top: top(h).slice(0, N) }]));
  out.nestedCards = { count: nested.length, items: nested.slice(0, 20) };
  out.cardCount = cards.size;
  out.lowContrast = { count: lowContrast.length, unverified, items: lowContrast };
  out.counts = { elements: all.length, textNodes: all.reduce((n, e) => n + [...e.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim()).length, 0) };

  // 4 icons
  const svgs = [...document.querySelectorAll('svg')].filter(vis), sizes = {}, strokes = {};
  svgs.forEach(v => { const r = v.getBoundingClientRect(); if (r.width > 40) return; const k = Math.round(r.width) + 'x' + Math.round(r.height); sizes[k] = (sizes[k] || 0) + 1;
    const el = v.querySelector('path,circle,line,rect,polyline') || v; const sw = getComputedStyle(el).strokeWidth; strokes[sw] = (strokes[sw] || 0) + 1; });
  out.icons = { total: svgs.length, sizes, strokeWidths: strokes };

  // 6 alignment
  const main = document.querySelector('main') || document.body, lefts = {};
  [...main.querySelectorAll('*')].filter(vis).forEach(e => { const r = e.getBoundingClientRect(); if (r.width < 24) return; const k = Math.round(r.left); lefts[k] = (lefts[k] || 0) + 1; });
  const keys = Object.keys(lefts).map(Number).sort((a, b) => a - b), merged = [];
  keys.forEach(k => { const last = merged[merged.length - 1]; if (last && k - last.x <= 1) last.n += lefts[k]; else merged.push({ x: k, n: lefts[k] }); });
  out.alignment = { distinctLeftEdges: merged.length, top: merged.sort((a, b) => b.n - a.n).slice(0, 12), off4pxGrid: merged.filter(m => m.x % 4).length };
  return out;
})()
```

## Output fields and how to read them

| Field | Meaning | Healthy | Maps to audit check |
|---|---|---|---|
| `viewport` | `[innerWidth, innerHeight]` at scan time; compare only like with like | same before/after | Step 1, 7 |
| `counts.elements` / `counts.textNodes` | visible elements; non-empty text nodes inside them | falls >=20% after compression | #3 |
| `regions[]` | tag, class, x/y/w/h px, `pctW`/`pctH` of viewport | landmarks tile the viewport; no region <2% unexplained | Step 1 map, #7, #8 |
| `histograms.fontSize.distinct` | distinct text sizes | <=6 | #11 |
| `histograms.fontWeight.distinct` | distinct weights | <=3 | #11 |
| `histograms.fontFamily.distinct` | families | <=2 (sans + mono) | #11 |
| `histograms.radius.distinct` | border-radius values | crisp <=4 / soft <=5 distinct, incl. full | #10 |
| `histograms.shadow.distinct` | non-none shadows | <=2 | #10 |
| `histograms.background` / `.color` | distinct fills / text colors | background <=8, text <=9 | #5, #6 |
| `histograms.padding` / `.gap` | spacing values | <=8, all multiples of 4 | #7, #8 |
| `histograms.transitionDuration` | durations | <=3 values, 120-220ms (draw-in <=300ms) | #16 |
| `histograms.tabularNums` | text nodes with digits using tabular figures | present on number columns | #12 |
| `nestedCards.count` | card-like inside card-like: radius>0 plus border or shadow, >=64x48px, not a button/input/select/textarea/a/role=button/role=tab/svg/img | 0 | #9 |
| `cardCount` | card-like elements | lower after compression | #3, #13 |
| `icons.sizes` / `.strokeWidths` | svg <=40px by size, by stroke | one size, one stroke | #4 |
| `lowContrast.items` | text under 4.5:1 vs translucent layers composited on the nearest opaque ancestor background | empty | #15 |
| `lowContrast.unverified` | text whose color or background could not be parsed (counted, never flagged) | 0; check by eye otherwise | #15 |
| `alignment.distinctLeftEdges` | left edges of elements >=24px wide in `main`, merged within 1px | <=6 | #7 |
| `alignment.off4pxGrid` | merged edges not divisible by 4 | 0-1 | #7 |

Reading tips:
- Histogram `top` is `[value, count]` sorted by count. A long tail of count-1 values is drift to unify, not design.
- `lowContrast` ignores gradients, images, and alpha text over alpha fills; confirm those by eye.
- `alignment` includes nested content, so card padding creates inner edges; judge the top 3-4 edges (page gutter, card edge, card content edge).
- Hidden, zero-size, `opacity:0`, and `display:none` elements are skipped. Open modals, menus, and tabs separately and rerun.
- Charts drawn in canvas have no text nodes; read them from the screenshot (Assessment A).

## Verification status

Syntax-checked with `node --check` and executed in real Chrome (playwright-core) against a fixture covering: button inside a card (not nested), real card in card (nested), `color-mix()` and `oklch()` colors, SVG class names, and a 24px / 32px hero. Colors are normalized through a 1x1 canvas, so modern color syntax is read correctly. Not yet exercised on a large real dashboard; treat counts there as a first pass.

Known false-positive classes (label them in the synthesis, do not silently drop):
- Nested cards: a bordered+rounded wrapper that is a layout grouping rather than a visual card (e.g. an input group, a table inside a card with its own border) is still reported; a tinted block with a radius but no border/shadow is NOT counted (can miss real nesting).
- Contrast: gradients, background images, `backdrop-filter`, and text over `opacity`-faded ancestors are not modeled; unparseable values go to `lowContrast.unverified`.
- Alignment: card padding and nested content create inner left edges.
