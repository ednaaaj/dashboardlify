#!/usr/bin/env node
// scan.mjs - zero-dependency dashboard sloppiness audit (Node >= 22).
// Browser mode: headless Chrome over CDP, measures computed styles of a rendered page.
// Source mode (--src): regex pass over a code folder, no browser needed.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---- Thresholds -----------------------------------------------------------
// Heuristics calibrated on the examples in /examples. Tune them there, not on a whim.
const LEAVE_BELOW = 8; // score < 8   -> LEAVE
const REWORK_ABOVE = 35; // score > 35  -> REWORK, otherwise TIGHTEN
const MIN_ELEMENT_BASE = 60; // score denominator floor so tiny pages are not exaggerated
const SPACING_CAP = 30; // max violation points from off-scale spacing
const ROW_BAD_POINTS = 5; // a metric with >= this many points is "bad", 1..4 is "warn"
const SRC_LEAVE_BELOW = 4; // source estimate: hits per 1000 lines
const SRC_REWORK_ABOVE = 20;
const TARGET_TIMEOUT_MS = 40_000;
// Inventory fit rules (--inventory). Tune against examples/northwind-*.html.
const INV_TS_MIN_ROWS = 6; // table-timeseries-to-chart: data rows
const INV_TS_DATE_SHARE = 0.8; // ... share of first-column cells that are dates/periods
const INV_TS_NUM_SHARE = 0.5; // ... share of other cells that are numeric
const INV_KPI_MAX_NUMS = 4; // table-few-to-kpi: numeric cells in the whole table
const INV_COUNTS_MIN_ITEMS = 5; // counts-to-bar: "label + number" items
const INV_BAR_MAX_ITEMS = 6; // <= this many status-like items -> segmented bar, else sorted bar list
const INV_CHART_MIN_W = 280; // chart-undersized
const INV_CHART_MIN_H = 160;
const INV_SPARK_MAX_H = 48; // charts this short are sparklines: exempt
// Status system and content rules (--status, implies --inventory). Tune against examples/northwind-team*.html.
// ponytail: English-only status words; a localized dashboard needs its own list (add it here)
const STATUS_X_WORDS = /^(on track|at risk|behind|ahead|due today|due soon|overdue|late|paid|unpaid|pending|refunded|active|inactive|open|closed|done|blocked|in review|on hold|scheduled|failed|delayed|complete|incomplete|cancell?ed)$/i;
const STATUS_MIN_LABELS = 3; // fewer status labels than this: verdict NONE (no status system to judge)
const STATUS_MAX_STYLES = 1; // status-mixed-style: one style key (pill|text, bg, radius bucket, weight) for all labels
const STATUS_MAX_COLORS = 5; // status-too-many-colors
const STATUS_MIN_CONTRAST = 4.5; // status-low-contrast: label colour vs nearest opaque background
const STATUS_NEUTRAL_SPREAD = 20; // rgb max-min under this counts as grey
const INV_STATUS_COL_SHARE = 0.6; // table column share of status words
const INV_PCT_COL_SHARE = 0.6; // table column share of ^\d{1,3}%$ cells
const INV_DATES_MIN_ITEMS = 6; // flat-dates-to-groups: dated list items with no group heading
const INV_KPI_CONTEXT_MIN_CHARS = 6; // kpi-no-context: letters left in the card after label and numeral
const INV_PEOPLE_MIN = 4; // people-list-to-capacity: person + number items
const INV_FILTER_MIN_ROWS = 8; // long-list-no-filter
const INV_ADVISORY = new Set(['map-check', 'search-no-shortcut', 'no-page-summary']); // never turn FIT into SWAP

const FONT_SCALE = [12, 13, 14, 16, 20, 24, 32];
const WEIGHT_OK = [400, 500, 600];
const VERDICT_TEXT = {
  LEAVE: 'already tight: say so, offer <=3 small refinements, do not rewrite',
  TIGHTEN: 'value-level pass, structure stays',
  REWORK: 'structure/hierarchy also needs redesign',
};
const VERDICT_RANK = { LEAVE: 0, TIGHTEN: 1, REWORK: 2 };

const USAGE = `dashboardlify scan - quantify how sloppy a dashboard looks

Usage:
  node scan.mjs <target...> [--json out.json] [--compare before.json] [--width 1440] [--dark] [--no-palette] [--combo calm|paper|brand]
                   [--height 900] [--no-layout] [--shot first.png] [--visible-change before.png]
                   [--inventory] [--status] [--storage-state state.json] [--block <url-pattern>]
  node scan.mjs --src <dir> [--json out.json]

  <target>   http(s) URL or local .html file (needs Chrome/Chromium; set CHROME_PATH to override)
  --json     write machine-readable results
  --compare  diff against a previous --json file and say IMPROVED / UNCHANGED / WORSE
  --width    viewport width in px (default 1440)
  --dark     emulate prefers-color-scheme: dark
  --no-palette  skip the colour analysis (KEEP / ADJUST / REPLACE, domain, suggested tokens)
                (domain and three precomputed combos (calm, paper, brand) come from ../references/palettes/palettes.json;
                the recommended one follows the page: tinted page -> paper, large coloured sidebar/header -> brand, else calm)
  --combo    print only one option's tokens (calm | paper | brand); in --json only that option
  --height   viewport height in px (default 900); the first screen = width x height
  --no-layout   skip the layout measurements (top bar, hero, equal-weight grid, icon tiles, placeholders, ...)
  --shot     save a first-viewport PNG (several targets: name-1.png, name-2.png)
  --visible-change <before.png>  after the scan, compare the first screen with before.png and say VISIBLE / SUBTLE / NOT VISIBLE
                (never scaled: taller shots are cropped to the shared top area; different widths print INCOMPARABLE, exit 1)
                (single target; pixels are compared inside Chrome, no dependencies)
  --inventory   list the components on the page (tables, charts, KPIs, lists, forms, states) and say FIT or SWAP:
                SWAP = a component shows its data in the wrong shape (table of a time series, 3-number table, counts as a list...)
  --status      implies --inventory; also judge the status system (labels, pills, colours, contrast) and the content/domain rules
                (STATUS OK|FIX|NONE; fit rules table-status-to-rows, flat-dates-to-groups, kpi-no-context, people-list-to-capacity,
                long-list-no-filter; advisory: search-no-shortcut, no-page-summary). English-only word lists; hits are evidence, confirm by hand.
  --storage-state <file>  log in without a form: Playwright-style {cookies, origins[].localStorage} or a bare cookie array
                (values are sent to the browser only; the scan prints counts, never values)
  --block <pattern>  block matching requests (repeatable, '*' wildcard) so the page shows its error/empty state
  --src      static regex scan of a source folder (no browser); also prints ROLES: role names, guards, routes (guarded or not)
`;

// ---- Collector (runs inside the page; must stay self-contained) ------------
function collect(withPal) {
  const FONT_OK = [12, 13, 14, 16, 20, 24, 32];
  const inc = (m, k, n = 1) => { m[k] = (m[k] || 0) + n; };
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const parseColor = (s) => {
    if (!s) return null;
    let m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = s.match(/color\(srgb\s+([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
    }
    return null;
  };
  const hsl = ({ r, g, b }) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return { h, s, l };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const label = (el) => {
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    return el.tagName.toLowerCase() + (c ? '.' + c : '');
  };
  const bgOf = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const st = getComputedStyle(p);
      if (st.backgroundImage !== 'none') return null; // gradient/image backdrop: unknown, skip
      const c = parseColor(st.backgroundColor);
      if (c && c.a >= 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const durations = (s) => s.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000)).filter(Number.isFinite);

  const res = {
    elements: 0, fontSizes: {}, weights: {}, radii: {}, over8: 0,
    spacingTotal: 0, spacingOff: 0, spacingVals: {},
    shadows: 0, coloredShadows: 0, gradients: 0, textGradients: 0, uppercase: 0,
    emojiNodes: 0, emojiExamples: [], hueBuckets: {}, iconSizes: {}, iconCount: 0,
    contrastFail: 0, illegible: 0, darkOnFill: 0, darkOnFillEx: [], darkOnDark: 0, lightOnLight: 0, contrastWorst: [], motionAll: 0, motionSlow: 0, motionLooping: 0,
    rowHeights: {}, heroNumbers: 0,
  };
  // palette sampling (aggregated by colour+kind so the payload stays small)
  const pal = withPal ? { s: {}, grads: [], theme: null, vars: [], t: {} } : null;
  const addS = (c, w, kind, small, inter, area) => {
    if (!pal || !c || !(w > 0) || !Number.isFinite(c.r + c.g + c.b)) return;
    const k = [Math.round(c.r), Math.round(c.g), Math.round(c.b), kind, small ? 1 : 0, inter ? 1 : 0].join(',');
    const e = pal.s[k] || (pal.s[k] = { w: 0, n: 0, big: 0 });
    e.w += w; e.n++;
    if (area >= 30000) e.big++;
  };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);
  const emojiRe = /\p{Extended_Pictographic}/u;
  const overlayRe = /dropdown|popover|modal|tooltip|menu/i;

  for (const el of document.querySelectorAll('body, body *')) {
    if (SKIP.has(el.tagName)) continue;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    res.elements++;

    const textNodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    const ownsText = textNodes.length > 0;
    const fs = px(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const color = parseColor(cs.color);

    if (ownsText) {
      inc(res.fontSizes, Math.round(fs * 10) / 10);
      inc(res.weights, weight);
      if (cs.textTransform === 'uppercase') res.uppercase++;
      if (fs > 32) res.heroNumbers++;
      for (const n of textNodes) {
        if (emojiRe.test(n.textContent)) {
          res.emojiNodes++;
          if (res.emojiExamples.length < 5) res.emojiExamples.push(n.textContent.trim().slice(0, 30));
        }
      }
      if (color) {
        const bg = bgOf(el);
        const fg = bg && color.a < 1 ? blend(color, bg) : color;
        const r = bg ? ratio(fg, bg) : 21;
        const large = fs >= 24 || (fs >= 18.66 && weight >= 700);
        if (bg) {
          const lf = lum(fg), lb = lum(bg);
          if (r < 3) res.illegible++;
          if (lf < 0.35 && lb < 0.2 && r < 4.5) res.darkOnDark++;
          if (lf > 0.65 && lb > 0.65 && r < 3) res.lightOnLight++;
          // dark text on a mid/dark fill the element itself paints, even when the ratio passes 4.5:1
          const own = parseColor(cs.backgroundColor);
          if (r >= 3 && own && own.a >= 0.9 && cs.backgroundImage === 'none' && lb < 0.4 && lf < lb
              && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true' && !(parseFloat(cs.opacity) < 0.7)) {
            res.darkOnFill++;
            if (res.darkOnFillEx.length < 3) res.darkOnFillEx.push({ el: label(el), fg: cs.color, bg: cs.backgroundColor });
          }
        }
        // elements under 3:1 are already counted as `illegible`; failCount (<4.5) skips them so violations are not counted twice
        if (r < (large ? 3 : 4.5)) {
          if (r >= 3) res.contrastFail++;
          res.contrastWorst.push({
            el: label(el), ratio: Math.round(r * 100) / 100,
            fg: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          });
        }
      }
    }

    // radius
    const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => cs['border' + c + 'Radius']);
    const pct = corners.some((c) => c.includes('%'));
    const r = Math.max(...corners.map(px));
    if (r > 0 || pct) {
      const half = Math.min(rect.width, rect.height) / 2;
      const circleLike = pct || r >= 9999 || r >= half;
      if (circleLike) {
        if (!(rect.height <= 48 || Math.abs(rect.width - rect.height) < 1)) res.over8++;
      } else {
        inc(res.radii, Math.round(r * 10) / 10);
        if (r > 8) res.over8++;
      }
    }

    // spacing
    const margins = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs['margin' + s]));
    const centered = cs.display === 'block' && margins[1] === margins[3] && margins[1] > 0;
    const vals = [];
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) vals.push(px(cs['padding' + s]));
    margins.forEach((v, i) => { if (!(centered && (i === 1 || i === 3))) vals.push(v); });
    vals.push(px(cs.rowGap), px(cs.columnGap));
    for (const v of vals) {
      if (v <= 0) continue;
      res.spacingTotal++;
      if (v > 2 && Math.abs(v / 4 - Math.round(v / 4)) > 0.02) {
        res.spacingOff++;
        inc(res.spacingVals, Math.round(v * 10) / 10);
      }
    }

    // shadows
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      const role = el.getAttribute('role') || '';
      const hint = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.getAttribute('aria-haspopup') || '') + ' ' + (el.getAttribute('aria-label') || '');
      const overlay = /^(dialog|menu|listbox|tooltip|alertdialog)$/.test(role) || cs.position === 'fixed' || overlayRe.test(hint);
      if (!overlay) {
        res.shadows++;
        const m = cs.boxShadow.match(/rgba?\([^)]+\)/g) || [];
        if (m.some((c) => { const k = parseColor(c); return k && k.a > 0 && hsl(k).s > 0.25; })) res.coloredShadows++;
      }
    }

    // gradients
    const bgImg = cs.backgroundImage || '';
    if (bgImg.includes('gradient(')) {
      const skeleton = cs.animationName !== 'none' && rect.height <= 24;
      if (!skeleton) res.gradients++;
      if (pal && !skeleton) {
        const stops = (bgImg.match(/rgba?\([^)]+\)/g) || []).map(parseColor).filter((c) => c && c.a >= 0.3);
        if (stops.length >= 2 && pal.grads.length < 40) {
          const area0 = rect.width * rect.height;
          const inter0 = /^(a|button)$/i.test(el.tagName) || el.getAttribute('role') === 'button';
          pal.grads.push({ a: stops[0], b: stops[stops.length - 1], inter: inter0, area: area0 });
          stops.forEach((c) => addS(c, area0 / 2000, 'bg', rect.height <= 36 && !inter0, inter0, area0));
        }
      }
      const clip = cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text';
      if (clip && color && color.a < 0.05) res.textGradients++;
    }

    // hues
    for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      const c = parseColor(v);
      if (!c || c.a <= 0.3) continue;
      const h = hsl(c);
      if (h.s > 0.2 && h.l > 0.12 && h.l < 0.92) inc(res.hueBuckets, Math.floor(h.h / 30) * 30);
    }

    // icons
    const tag = el.tagName.toLowerCase();
    if ((tag === 'svg' || tag === 'img') && rect.width <= 48 && rect.height <= 48) {
      res.iconCount++;
      inc(res.iconSizes, Math.round(rect.width) + 'x' + Math.round(rect.height));
    }

    // palette samples
    if (pal) {
      const cls0 = typeof el.className === 'string' ? el.className : '';
      const inter = tag === 'a' || tag === 'button' || el.getAttribute('role') === 'button' || el.hasAttribute('aria-current')
        || /\b(btn|button|active|selected|current)\b/i.test(cls0);
      const small = rect.height <= 36 && !inter;
      const area = rect.width * rect.height;
      const bgc = parseColor(cs.backgroundColor);
      if (bgc && bgc.a >= 0.5) addS(bgc, area / 1000, 'bg', small, inter, area);
      // large accent-hued band at the left edge (sidebar) or top (header): flat fill only
      if (bgc && bgc.a >= 0.9 && cs.backgroundImage === 'none' && !inter) {
        const q = hsl(bgc);
        if (q.s > 0.25 && q.l > 0.1 && q.l < 0.85) {
          const side = rect.left <= 4 && rect.width >= 160 && rect.height >= 300;
          const head = rect.top <= 4 && rect.height >= 40 && rect.width >= innerWidth * 0.8;
          if ((side || head) && (!pal.band || area > pal.band.area)) pal.band = { kind: side ? 'sidebar' : 'header', area, w: Math.round(rect.width), h: Math.round(rect.height), c: bgc };
        }
      }
      for (const sd of ['Top', 'Right', 'Bottom', 'Left']) {
        if (px(cs['border' + sd + 'Width']) > 0 && cs['border' + sd + 'Style'] !== 'none') {
          const bc = parseColor(cs['border' + sd + 'Color']);
          if (bc && bc.a >= 0.3) addS(bc, 2, 'border', small, inter, 0);
        }
      }
      if (ownsText && color && color.a >= 0.3) addS(color, inter ? 3 : 1, 'text', small, inter, 0);
      if (tag === 'svg') {
        const icon = rect.height <= 36;
        for (const sub of [...el.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')].slice(0, 60)) {
          const sc = getComputedStyle(sub);
          for (const v of [sc.fill, sc.stroke]) {
            const c = parseColor(v);
            if (c && c.a >= 0.3) addS(c, 3, 'svg', icon, false, 0);
          }
        }
      }
    }

    // motion
    const tDur = durations(cs.transitionDuration);
    if (cs.transitionProperty.split(',').some((p) => p.trim() === 'all') && tDur.some((d) => d > 0)) res.motionAll++;
    const aDur = cs.animationName !== 'none' ? durations(cs.animationDuration) : [];
    if ([...tDur, ...aDur].some((d) => d > 300)) res.motionSlow++;
    if (cs.animationName !== 'none' && cs.animationIterationCount.includes('infinite') && rect.height > 24) res.motionLooping++;

    // row heights
    const isRow = tag === 'tr' || el.getAttribute('role') === 'row' || (tag === 'li' && el.parentElement);
    if (isRow && el.parentElement && el.parentElement.children.length >= 3) inc(res.rowHeights, Math.round(rect.height));
  }
  if (pal) {
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden';
    document.body.appendChild(probe);
    const resolve = (v) => {
      probe.style.color = '';
      probe.style.color = v;
      return probe.style.color ? parseColor(getComputedStyle(probe).color) : null;
    };
    for (const e of [document.body, document.documentElement]) {
      const c = parseColor(getComputedStyle(e).backgroundColor);
      if (c && c.a >= 0.9) { pal.page = c; break; }
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && meta.content) pal.theme = resolve(meta.content);
    const names = new Set();
    const rootRe = /(^|,)\s*(:root|html|body)\s*(,|$)/;
    const scan = (rules) => {
      for (const r of rules) {
        if (r.selectorText !== undefined && r.style && rootRe.test(r.selectorText)) {
          for (const p of r.style) if (p.startsWith('--') && /brand|primary|accent/i.test(p)) names.add(p);
        } else if (r.cssRules && r.selectorText === undefined) scan(r.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { scan(sh.cssRules); } catch {} }
    for (const e of [document.documentElement, document.body]) for (const p of e.style) if (/^--.*(brand|primary|accent)/i.test(p)) names.add(p);
    for (const n of [...names].slice(0, 16)) {
      const c = resolve(`var(${n})`);
      if (c) pal.vars.push({ name: n, c });
    }
    probe.remove();
    const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const list = (sel, max) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length).slice(0, max).map(txt).filter(Boolean);
    const desc = document.querySelector('meta[name="description"]');
    pal.t = {
      title: document.title || '', desc: desc ? desc.content : '', h1: list('h1', 5), h23: list('h2,h3', 25),
      nav: list('nav a, aside a, [role=navigation] a, nav button, aside button', 40), th: list('th', 30),
      body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
    };
    res.pal = pal;
  }
  res.contrastWorst.sort((a, b) => a.ratio - b.ratio);
  res.contrastWorst = res.contrastWorst.slice(0, 5);
  return res;
}

// ---- Layout probe (runs inside the page, same evaluation as collect; must stay self-contained) ------
// Measures what a value-only pass cannot fix: bar/hero height, equal-weight grids, icon tiles, empty widgets.
function layoutProbe(VW, VH) {
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const alpha = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);
  const items = [];
  for (const el of document.querySelectorAll('body *')) {
    if (SKIP.has(el.tagName)) continue;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    items.push({ el, cs, r });
  }
  const byEl = new Map(items.map((i) => [i.el, i]));
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
  const headEls = items.filter((i) => ownText(i.el) && (/^H[1-6]$/.test(i.el.tagName) || (px(i.cs.fontSize) >= 14 && (parseInt(i.cs.fontWeight, 10) || 400) >= 500)));
  const hasHeading = (el) => headEls.some((h) => el.contains(h.el));
  const radius = (cs) => Math.max(...['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => px(cs['border' + c + 'Radius'])));
  const L = { viewport: { w: VW, h: VH } };
  const rgb = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const pageBg = [document.body, document.documentElement].map((e) => rgb(getComputedStyle(e).backgroundColor)).find((c) => c && c.a >= 0.9) || { r: 255, g: 255, b: 255, a: 1 };
  const hasBorder = (cs) => ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');

  // topbar: tallest short full-width element touching the top edge
  let top = null;
  for (const it of items) {
    const { r } = it;
    if (r.top <= 8 && r.top >= -1 && r.width >= VW * 0.6 && r.height <= VH * 0.25 && (!top || r.height > top.r.height)) top = it;
  }
  if (top) {
    const logos = [...top.el.querySelectorAll('img,svg')].map((e) => e.getBoundingClientRect().height);
    L.topbar = { height: Math.round(top.r.height), logoHeight: Math.round(Math.max(0, ...logos)) };
  } else L.topbar = null;

  // hero: banner (background image/gradient or large img) in the top 60%, without data inside
  let hero = null;
  for (const it of items) {
    const { el, cs, r } = it;
    if (r.top >= VH * 0.6 || r.bottom <= 0 || r.width < VW * 0.5 || (top && el === top.el)) continue;
    if (r.height > VH * 0.5 && !(r.width > VW * 0.5 && r.top < VH * 0.3)) continue; // tall heroes only when wide and starting near the top
    const bgi = cs.backgroundImage;
    const hasBg = !!bgi && bgi !== 'none';
    const bg = rgb(cs.backgroundColor);
    const solid = !hasBg && bg && bg.a >= 0.9 && r.height <= VH * 0.75 && !hasBorder(cs) && !(bg.r >= 250 && bg.g >= 250 && bg.b >= 250)
      && Math.max(Math.abs(bg.r - pageBg.r), Math.abs(bg.g - pageBg.g), Math.abs(bg.b - pageBg.b)) > 12 && hasHeading(el);
    if (!hasBg && !solid && ![...el.querySelectorAll('img')].some((i) => i.getBoundingClientRect().width >= 240)) continue;
    if (el.querySelector('table,tr,li,[role=row]')) continue;
    const nums = items.filter((i) => el.contains(i.el) && /\d/.test(ownText(i.el)) && px(i.cs.fontSize) >= 20).length;
    if (nums > 1) continue;
    const area = r.width * (Math.min(r.bottom, VH) - Math.max(r.top, 0));
    if (!hero || area > hero.area) hero = { area, height: Math.round(r.height) };
  }
  L.hero = hero && { height: hero.height, sharePct: Math.min(100, Math.round((1000 * hero.area) / (VW * VH)) / 10) };

  // equal-weight grid
  const within = (a) => (Math.max(...a) - Math.min(...a)) / Math.max(...a) <= 0.1;
  let eq = null;
  for (const it of items) {
    if (!/grid|flex/.test(it.cs.display) || (/flex/.test(it.cs.display) && it.cs.flexWrap === 'nowrap')) continue;
    const kids = [...it.el.children].map((c) => byEl.get(c)).filter(Boolean);
    if (kids.length < 4 || !kids.every((k) => k.r.width >= 160 && k.r.height >= 100)) continue;
    if (!within(kids.map((k) => k.r.width)) || !within(kids.map((k) => k.r.height)) || !kids.every((k) => hasHeading(k.el))) continue;
    const columns = new Set(kids.map((k) => Math.round(k.r.left / 4))).size;
    if (columns === kids.length) continue; // a single row of cards is a KPI strip, not a wall of equal cards
    if (!eq || kids.length > eq.count) eq = { count: kids.length, columns };
  }
  L.equalWeight = eq;

  // icon tiles: small square boxes (fill or rounded) around an icon, next to a heading
  let tiles = 0;
  for (const { el, cs, r } of items) {
    if (r.width < 24 || r.width > 72 || r.height < 24 || r.height > 72 || Math.abs(r.width - r.height) > Math.max(4, r.width * 0.15)) continue;
    if (!(alpha(cs.backgroundColor) >= 0.9 || radius(cs) >= 8) || !el.querySelector('svg,img,i') || !el.parentElement) continue;
    const near = headEls.some((h) => h.el.parentElement && el.parentElement.contains(h.el) && !el.contains(h.el) && (h.r.left >= r.right - 2 || h.r.top >= r.bottom - 2));
    if (near) tiles++;
  }
  L.iconTiles = { count: tiles };

  // placeholders and truncation
  const re = /^(-{1,3}|—|–|n\/a|N\/A|\.{3}|0 of 0)$/;
  let ph = 0;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const cardLike = (el) => { const i = byEl.get(el); return i && i.r.width >= 160 && i.r.height >= 80 && (hasBorder(i.cs) || alpha(i.cs.backgroundColor) >= 0.5); };
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const pe = n.parentElement;
    if (!re.test(n.textContent.trim()) || !byEl.has(pe) || pe.closest('td,th,[role=cell],[role=gridcell]')) continue;
    for (let a = pe; a && a !== document.body; a = a.parentElement) if (cardLike(a)) { ph++; break; }
  }
  L.placeholders = { count: ph };
  let tr = 0;
  for (const { el, cs } of items) {
    if (el.closest('td,th,[role=cell],[role=gridcell]')) continue; // ellipsis in table cells is an intended pattern
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
    if ((cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (clamp && el.scrollHeight > el.clientHeight + 1)) tr++;
  }
  L.truncated = { count: tr };

  // data above the fold
  let data = 0;
  for (const { el, cs, r } of items) {
    if (r.top < 0 || r.bottom > VH + 0.5) continue;
    if (el.tagName === 'TR' || el.getAttribute('role') === 'row') { if (!(el.querySelector('th') && !el.querySelector('td'))) data++; }
    else if (el.tagName === 'LI' && /\d/.test(el.textContent)) data++;
    else if (/\d/.test(ownText(el)) && px(cs.fontSize) >= 20) data++;
    else if ((el.tagName === 'svg' || el.tagName === 'CANVAS') && r.width >= 200 && r.height >= 100) data++;
  }
  const formControls = items.filter((i) => /^(INPUT|SELECT|TEXTAREA)$/.test(i.el.tagName) && i.r.top >= 0 && i.r.bottom <= VH + 0.5 && i.el.type !== 'hidden').length;
  const anyNumeric = /\d/.test(document.body.innerText || '');
  L.dataAboveFold = { count: data, formLike: data === 0 && (formControls >= 2 || !anyNumeric) };

  // card padding, sidebar, content width
  const pads = [];
  for (const { cs, r } of items) {
    if (r.width < 160 || r.height < 80 || r.height > VH * 0.8 || radius(cs) <= 0) continue;
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
    if (!border && alpha(cs.backgroundColor) < 0.5) continue;
    pads.push(['Top', 'Right', 'Bottom', 'Left'].reduce((a, s) => a + px(cs['padding' + s]), 0) / 4);
  }
  pads.sort((a, b) => a - b);
  L.cardPadding = { cards: pads.length, median: pads.length ? Math.round(10 * pads[Math.floor(pads.length / 2)]) / 10 : null };
  const side = items.filter((i) => /fixed|sticky/.test(i.cs.position) && i.r.left <= 4 && i.r.height >= VH * 0.8 && i.r.width < VW * 0.5).sort((a, b) => b.r.width - a.r.width)[0];
  L.sidebar = side ? { width: Math.round(side.r.width) } : null;
  const main = document.querySelector('main,[role=main]');
  L.content = main ? { width: Math.round(main.getBoundingClientRect().width) } : null;
  return L;
}

// ---- Inventory probe (--inventory; runs inside the page, self-contained) ------------------------
// Lists what the page is made of so the shape of each component can be checked against its data.
function inventoryProbe(deep, cfg) {
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const alpha = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const VW = window.innerWidth;
  const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
  // ponytail: English month names and numeric formats only; add locales if a real dashboard needs them
  const DATE = new RegExp(`^(\\d{4}[-/]\\d{1,2}([-/]\\d{1,2})?|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}|${MON}\\s+\\d{1,2}(,?\\s*\\d{2,4})?|\\d{1,2}\\s+${MON}(\\s+\\d{2,4})?|${MON}(\\s*'?\\d{2,4})?|q[1-4]\\s*'?\\d{0,4}|w(eek)?\\s*\\d{1,2}|(mon|tue|wed|thu|fri|sat|sun)[a-z]*|(19|20)\\d{2})$`, 'i');
  const NUM = /^[~+\-−–$€£¥(]*\d[\d,.\s]*\s*(%|[kKmMbB]|ms|s|pts?|x)?\)?$/;
  // ponytail: --status also lets a KPI numeral carry a duration unit (6.4d, 3h); plain --inventory keeps the old NUM so its output is unchanged
  const NUMK = deep ? /^[~+\-−–$€£¥(]*\d[\d,.\s]*\s*(%|[kKmMbB]|ms|s|d|h|w|min|hrs?|days?|pts?|x)?\)?$/ : NUM;
  const STATUS = /^(open|closed|pending|active|inactive|paid|unpaid|failed|success|error|done|new|in progress|draft|shipped|delivered|cancell?ed|refunded|resolved|overdue|late|approved|rejected|blocked|processing|completed|queued|running|stopped|warning|ok|healthy|on hold|returned)$/i;
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  const txt = (el) => (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
  const tokens = (el) => (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').toLowerCase();
  // card = nearest ancestor that looks like a container (border, fill, <article>/<section> or card-ish class)
  const cardOf = (el) => {
    for (let a = el.parentElement; a && a !== document.body && a.tagName !== 'MAIN'; a = a.parentElement) {
      const r = a.getBoundingClientRect(), cs = getComputedStyle(a);
      if (r.width < 140 || r.height < 60) continue;
      const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
      // ponytail: a plain white wrapper reads as a card when nothing nearer matches; the narrow-width guard only catches full-bleed ones
      if (border || (alpha(cs.backgroundColor) >= 0.5 && r.width < VW * 0.9) || /^(ARTICLE|SECTION)$/.test(a.tagName) || /(^|[\s_-])(card|panel|widget|tile)([\s_-]|$)/.test(tokens(a))) return a;
    }
    return null;
  };
  const HEAD = 'h1,h2,h3,h4,h5,h6,legend,caption,[class*=title i],[class*=heading i],[class*=label i]';
  const labelOf = (el, card) => {
    const cap = el.querySelector?.('caption');
    const aria = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
    let t = (cap && txt(cap)) || (aria || '').trim();
    if (!t && card) for (const h of card.querySelectorAll(HEAD)) { if (!el.contains(h) && txt(h) && vis(h)) { t = txt(h); break; } }
    return t.slice(0, 48);
  };
  const out = [];
  const outEl = []; // element behind each component (deep annotations)
  const kpiNum = new Map(); // kpi card -> numeral element
  const seen = new Set();
  const push = (type, el, extra, card) => {
    outEl.push(el);
    const r = el.getBoundingClientRect();
    out.push({ type, label: labelOf(el, card === undefined ? cardOf(el) : card), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY), ...extra });
  };
  const topmost = (els) => els.filter((e) => !els.some((o) => o !== e && o.contains(e)));

  // charts: canvas/svg that are big enough or named like a chart, plus chart-library wrappers
  // ponytail: svg icons are skipped by size/name only; a decorative 200x100 svg would count as a chart
  const chartSel = 'canvas,svg,[class*=recharts-wrapper],[class*=highcharts-container],.apexcharts-canvas,.js-plotly-plot,[role=img][aria-label*=chart i]';
  const chartEls = topmost([...document.querySelectorAll(chartSel)].filter((e) => {
    if (e.closest('button,a,th,nav,[role=button]') || (e.parentElement?.closest('svg') && e.tagName.toLowerCase() === 'svg')) return false;
    const r = vis(e); if (!r) return false;
    return (r.width >= 200 && r.height >= 100) || /chart|spark|graph/.test(tokens(e) + ' ' + (e.getAttribute('aria-label') || '').toLowerCase()) && r.width >= 40;
  }));
  const inChart = (e) => chartEls.some((c) => c.contains(e));
  chartEls.forEach((e) => { seen.add(e); push('chart', e, {}); });

  // tables
  const tables = [...document.querySelectorAll('table,[role=table],[role=grid]')].filter((e) => vis(e) && !e.parentElement.closest('table,[role=table],[role=grid]'));
  const cal = [];
  tables.forEach((t) => {
    const rowEls = [...t.querySelectorAll('tr,[role=row]')];
    const cellsOf = (r) => [...r.children].filter((c) => /^(TD|TH)$/.test(c.tagName) || /^(cell|gridcell|columnheader|rowheader)$/.test(c.getAttribute('role') || ''));
    const data = rowEls.map((r) => cellsOf(r)).filter((cs) => cs.length && !(cs.every((c) => c.tagName === 'TH' || /header/.test(c.getAttribute('role') || ''))));
    const cols = Math.max(0, ...rowEls.map((r) => cellsOf(r).length));
    const all = data.reduce((a, cs) => a + cs.length, 0);
    if (cols === 7 && all >= 28 && all <= 42) { cal.push(t); return; }
    const first = data.map((cs) => txt(cs[0]));
    const rest = data.flatMap((cs) => cs.slice(1).map(txt)).filter(Boolean);
    const numCells = data.flatMap((cs) => cs.map(txt)).filter((s) => NUM.test(s)).length;
    const card = cardOf(t);
    const items = cols <= 3 ? data.filter((cs) => cs.length > 1 && /[a-z]/i.test(txt(cs[0])) && !DATE.test(txt(cs[0])) && cs.slice(1).some((c) => NUM.test(txt(c)))).map((cs) => txt(cs[0])) : [];
    push('table', t, {
      rows: data.length, cols, numericCells: numCells,
      numericShare: rest.length ? Math.round((100 * rest.filter((s) => NUM.test(s)).length) / rest.length) / 100 : 0,
      dateFirstCol: first.length ? Math.round((100 * first.filter((s) => DATE.test(s)).length) / first.length) / 100 : 0,
      items: items.length, statusLike: items.length ? Math.round((100 * items.filter((s) => STATUS.test(s)).length) / items.length) / 100 : 0,
      chartInCard: !!card && chartEls.some((c) => card.contains(c)),
    }, card);
  });

  // lists: 3+ items, not navigation
  const lists = [...document.querySelectorAll('ul,ol,[role=list]')].filter((e) => vis(e) && !e.closest('nav,[role=navigation],table,[role=table],[role=menu],[role=tablist]') && !inChart(e));
  topmost(lists).forEach((l) => {
    const lis = [...l.querySelectorAll('li,[role=listitem]')].filter(vis);
    if (lis.length < 3) return;
    const parsed = lis.map((li) => { const t = txt(li); const m = t.match(/^([^\d]*[a-z][^\d]*?)\s*[:\-–·]?\s*(\d[\d,.]*\s*(%|[kKmM])?)$/i); return m ? m[1].trim() : null; }).filter(Boolean);
    const card = cardOf(l);
    push('list', l, {
      items: parsed.length, listItems: lis.length, statusLike: parsed.length ? Math.round((100 * parsed.filter((s) => STATUS.test(s)).length) / parsed.length) / 100 : 0,
      chartInCard: !!card && chartEls.some((c) => card.contains(c)),
    }, card);
  });

  // forms
  const forms = [...document.querySelectorAll('form')].filter(vis);
  forms.forEach((f) => push('form', f, { fields: f.querySelectorAll('input:not([type=hidden]),select,textarea').length }));
  // ponytail: loose controls outside any <form> count as one form when there are 3+; a toolbar of filters will match
  const loose = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((e) => vis(e) && !e.closest('form'));
  if (loose.length >= 3) push('form', loose[0].parentElement, { fields: loose.length, loose: true });

  // KPIs: one big number per card
  const kpiCards = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (/^(SCRIPT|STYLE|H[1-6]|INPUT|SELECT|TEXTAREA|OPTION|BUTTON|A)$/.test(el.tagName) || el instanceof SVGElement) continue;
    const t = own(el);
    if (!t || t.length > 16 || !/\d/.test(t) || !NUMK.test(t.replace(/\s/g, '')) || el.closest('table,[role=table],[role=grid],li,svg,canvas,nav,[role=navigation]') || inChart(el)) continue;
    const r = vis(el); if (!r || px(getComputedStyle(el).fontSize) < 20) continue;
    const card = cardOf(el);
    if (!card || kpiCards.has(card) || card.querySelector('table,[role=table]')) continue;
    kpiCards.add(card);
    kpiNum.set(card, el);
    push('kpi', card, {}, card);
    if (!out[out.length - 1].label) { // no heading element: first other short text in the card
      const sib = [...card.querySelectorAll('*')].find((e) => e !== el && own(e) && own(e).length <= 40 && !NUM.test(own(e)) && vis(e));
      if (sib) out[out.length - 1].label = own(sib).slice(0, 48);
    }
  }

  // states and extras
  const leafText = (re, max) => [...document.querySelectorAll('body *')].filter((e) => { if (!own(e) || own(e).length > max || /^(SCRIPT|STYLE)$/.test(e.tagName) || !vis(e)) return false; return re.test(own(e)); });
  const dedupe = (type, els) => { const keys = new Map(); topmost(els).forEach((e) => { const c = cardOf(e) || e; if (!keys.has(c)) keys.set(c, e); }); keys.forEach((e, c) => { const r = vis(c); if (r) push(type, c, c === e ? {} : { label: labelOf(e, c) }, c); }); };
  // ponytail: wording lists are English-only and short-text-only; upgrade by listing the product's own empty/error copy
  dedupe('empty', leafText(/\b(no (data|results?|items?|records?|entries|orders?|activity|rows|matches|transactions|users|events)\b|nothing (here )?(yet|to show|to see)|nothing found|no .{1,30} (yet|found|available|to show))/i, 100));
  dedupe('placeholder', leafText(/coming soon|lorem ipsum|\blorem\b|\bTODO\b/i, 120));
  // card whose only content besides its heading is "--" / "N/A"
  const phCards = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!/^(-{1,3}|—|–|n\/a)$/i.test(own(el)) || el.closest('td,th,[role=cell],[role=gridcell]') || !vis(el)) continue;
    const c = cardOf(el); if (!c || phCards.has(c)) continue;
    const h = [...c.querySelectorAll(HEAD)].map(txt).join(' ');
    if (txt(c).replace(h, '').replace(/[\s\-—–]|n\/a/gi, '') === '') { phCards.add(c); push('placeholder', c, { label: labelOf(el, c) }, c); }
  }
  const mapEls = [...document.querySelectorAll('.leaflet-container,.mapboxgl-map,.maplibregl-map,.gm-style,.ol-viewport,[class*="map-container"],[class*="map-view"],iframe[src*="maps"],iframe[src*="openstreetmap"]')].filter((e) => vis(e) && vis(e).width >= 100);
  topmost(mapEls).forEach((e) => push('map', e, {}));
  const calEls = topmost([...cal, ...document.querySelectorAll('[class*=calendar i],.fc,[class*=datepicker i]')].filter((e) => vis(e) && vis(e).width >= 180));
  calEls.forEach((e) => push('calendar', e, {}));
  [...document.querySelectorAll('body *')].forEach((e) => { // 7-column grids of 28-42 cells
    if (calEls.some((c) => c.contains(e) || e.contains(c)) || getComputedStyle(e).display !== 'grid') return;
    const n = e.children.length;
    if (n >= 28 && n <= 42 && getComputedStyle(e).gridTemplateColumns.split(' ').length === 7 && vis(e)) push('calendar', e, {});
  });
  dedupe('loading', [...document.querySelectorAll('[class*=skeleton i],[class*=spinner i],[class*=shimmer i],[class*=loading i],[aria-busy=true]')].filter(vis));
  dedupe('error', [...[...document.querySelectorAll('[role=alert]')].filter(vis), ...leafText(/failed to|went wrong|error loading|could not load|couldn.t load|unable to load|request failed/i, 120)]);
  if (!deep) return { components: out };

  // ---- deep (--status): extra facts per component, then the status labels ----
  // ponytail: person/date detection is heuristic and English-only (capitalised names, English month/relative words);
  // it needs an avatar or a people-ish heading to count a person. Hits are evidence, confirm by hand.
  const SX = new RegExp(`(?:${STATUS.source})|(?:${cfg.words})`, 'i');
  const ANYWORD = new RegExp(`\\b(?:${STATUS.source.slice(2, -2)}|${cfg.words.slice(2, -2)})\\b`, 'i');
  const SKIP = 'nav,[role=navigation],button,th,thead,[role=tab],[role=tablist],[role=columnheader],h1,h2,h3,h4,h5,h6,a,option,select,caption,legend,[role=menu],[role=heading]';
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const hexOf = (s) => { const m = (s || '').match(/^rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return p.length >= 3 && p.every(Number.isFinite) ? hex(p[0], p[1], p[2]) : null; };
  const spread = (h) => { const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.max(...n) - Math.min(...n); };
  const cellsOf = (r) => [...r.children].filter((c) => /^(TD|TH)$/.test(c.tagName) || /^(cell|gridcell|columnheader|rowheader)$/.test(c.getAttribute('role') || ''));
  const CTRL = 'select,[role=tablist],[role=search],[role=combobox],input:not([type=hidden]):not([type=checkbox]):not([type=radio])';
  const BARISH = /(^|[\s_-])(bar|progress|meter|gauge|capacity)([\s_-]|$)/;
  const hasBar = (root) => !!root && (!!root.querySelector('progress,meter,[role=progressbar]') || [...root.querySelectorAll('*')].some((e) => BARISH.test(tokens(e))));
  const REL = /\b(today|tomorrow|yesterday|overdue|due (today|tomorrow|in|on)|in \d+ (days?|hours?|weeks?)|\d+ (days?|hours?|weeks?) (ago|late|left))\b/i;
  const DT = new RegExp(`(^|\\s)(${MON}\\s+\\d{1,2}|\\d{1,2}\\s+${MON}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}(/\\d{2,4})?)(?=$|[\\s,.])`, 'i');
  const NAME = /^([A-Z]{1,3}\s+)?[A-Z][a-z]+(?:['-][A-Z][a-z]+)?(?:\s[A-Z][a-z]+(?:['-][A-Z][a-z]+)?){1,2}(\s|$)/;
  const PEOPLE_HEAD = /people|team|member|staff|owner|assignee|user|workload|capacity|contributor|agent|engineer|driver|employee/i;
  const avatarIn = (li) => [...li.querySelectorAll('*')].slice(0, 8).some((e) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); const rad = cs.borderTopLeftRadius;
    const round = rad.endsWith('%') ? parseFloat(rad) >= 40 : px(rad) >= r.width * 0.4;
    return r.width >= 16 && r.width <= 56 && Math.abs(r.width - r.height) < 4 && round && (e.tagName === 'IMG' || /^[A-Z]{1,3}$/.test(txt(e)));
  });
  out.forEach((c, i) => {
    const e = outEl[i];
    if (c.type === 'table') {
      const rows = [...e.querySelectorAll('tr,[role=row]')].map(cellsOf).filter((cs) => cs.length && !cs.every((x) => x.tagName === 'TH' || /header/.test(x.getAttribute('role') || '')));
      const share = (re) => { let best = 0; for (let k = 0; k < Math.max(0, ...rows.map((r) => r.length)); k++) best = Math.max(best, rows.filter((r) => r[k] && re.test(txt(r[k]))).length / Math.max(1, rows.length)); return Math.round(best * 100) / 100; };
      c.statusColShare = share(SX);
      c.pctColShare = share(/^\d{1,3}%$/);
      c.progress = !!e.querySelector('progress,meter,[role=progressbar]');
      // ponytail: "near" = inside the card or in the 2 element siblings before it; a filter further up the page is missed
      const card = cardOf(e) || e; let near = !!card.querySelector(CTRL);
      for (let s = card.previousElementSibling, n = 0; s && n < 2; s = s.previousElementSibling, n++) if (s.matches(CTRL) || s.querySelector(CTRL)) near = true;
      c.ctrlNear = near;
    } else if (c.type === 'list') {
      const lis = [...e.querySelectorAll('li,[role=listitem]')].filter(vis);
      const dated = (li) => { const t = txt(li); return DT.test(t) || REL.test(t); };
      c.dated = lis.filter(dated).length;
      c.grouped = !!e.querySelector('h1,h2,h3,h4,h5,h6,[role=heading],[role=separator],hr,[class*=group i],[class*=divider i]')
        || lis.some((li) => !dated(li) && txt(li).length <= 14 && (+getComputedStyle(li).fontWeight >= 600 || getComputedStyle(li).textTransform === 'uppercase'));
      c.people = lis.filter((li) => { const t = txt(li); return /\d/.test(t) && (avatarIn(li) || (NAME.test(t) && PEOPLE_HEAD.test(c.label))); }).length;
      c.barInCard = hasBar(cardOf(e) || e);
    } else if (c.type === 'kpi') {
      let rest = txt(e);
      for (const s of [c.label, own(kpiNum.get(e) || e)]) if (s) rest = rest.replace(s, ' ');
      c.ctx = (rest.match(/\p{L}/gu) || []).length;
    }
  });

  // status labels: short leaf text that is a status word, outside nav/buttons/headers/tabs/charts
  const behind = (el) => { for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.backgroundImage !== 'none') return null; const al = alpha(cs.backgroundColor); if (al >= 0.99) return hexOf(cs.backgroundColor); if (al > 0) return null; } return /dark/.test(getComputedStyle(document.documentElement).colorScheme) ? null : '#ffffff'; };
  const labels = [];
  let capped = false;
  const kpiEls = out.map((c, i) => (c.type === 'kpi' ? outEl[i] : null)).filter(Boolean);
  for (const el of document.querySelectorAll('body *')) {
    if (el instanceof SVGElement || /^(SCRIPT|STYLE|OPTION)$/.test(el.tagName)) continue;
    const t = own(el);
    if (!t || t.length > 24 || !SX.test(t) || el.closest(SKIP + ',[class*=legend i],[class*=swatch i]') || inChart(el) || !vis(el)) continue;
    if (kpiEls.some((k) => k.contains(el))) continue; // "Delivered" as a KPI label is not a status marker
    // "Pending 12": a label followed by a bare number is a count (counts-to-bar), not a status marker
    // ponytail: only li and rows of <= 2 cells are checked; a custom div row with label + count still counts as a status label
    const row = el.closest('li,tr,[role=row]');
    if (row && (row.tagName === 'LI' || cellsOf(row).length <= 2) && txt(row).startsWith(txt(el)) && /^[\s\d,.%]*$/.test(txt(row).slice(txt(el).length))) continue;
    let pill = null;
    for (let a = el, n = 0; a && a !== document.body && n < 3 && txt(a) === txt(el); a = a.parentElement, n++) {
      const r = a.getBoundingClientRect(), cs = getComputedStyle(a);
      if (a.matches('td,th,li,tr,[role=cell],[role=gridcell],main,section') || r.height > 40 || r.width > 200) break;
      const bw = ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
      if (alpha(cs.backgroundColor) >= 0.05 || (bw && px(cs.borderTopLeftRadius) >= 4)) { pill = a; break; }
    }
    const cs = getComputedStyle(el), fg = alpha(cs.color) >= 0.99 ? hexOf(cs.color) : null;
    let style = 'text/' + (+cs.fontWeight >= 600 ? 'b' : 'n'), bg = null;
    if (pill) {
      const pcs = getComputedStyle(pill), h = pill.getBoundingClientRect().height, rad = pcs.borderTopLeftRadius;
      const rr = rad.endsWith('%') ? (h * parseFloat(rad)) / 100 : px(rad);
      bg = alpha(pcs.backgroundColor) >= 0.05 ? hexOf(pcs.backgroundColor) : null;
      style = `pill/${bg ? 'bg' : 'outline'}/${rr >= h / 2 - 1 ? 'full' : rr >= 6 ? 'md' : rr > 0 ? 'sm' : 'none'}/${+cs.fontWeight >= 600 ? 'b' : 'n'}`;
    }
    labels.push({ word: t.toLowerCase(), pill: !!pill, style, fg, bg, sig: bg || fg || cs.color, behind: pill && bg && alpha(getComputedStyle(pill).backgroundColor) >= 0.99 ? bg : behind(el) });
    if (labels.length >= 500) { capped = true; break; }
  }
  // colour-only dots: a small chromatic round box in a table cell / list item with no status word beside it
  // ponytail: legend swatches are skipped by class name only; a table cell with a dot + series name is flagged
  let colorOnly = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (el instanceof SVGElement || el.children.length || own(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.width > 12 || Math.abs(r.width - r.height) > 1) continue;
    const cs = getComputedStyle(el), rad = cs.borderTopLeftRadius, bgc = hexOf(cs.backgroundColor);
    if (!bgc || alpha(cs.backgroundColor) < 0.5 || spread(bgc) < cfg.spread || !(rad.endsWith('%') ? parseFloat(rad) >= 40 : px(rad) >= r.width / 2 - 1)) continue;
    const host = el.closest('td,[role=cell],[role=gridcell],li');
    if (!host || inChart(el) || host.closest('nav,[role=navigation],[class*=legend i],[class*=swatch i]') || !vis(el)) continue;
    const ht = txt(host);
    if (host.tagName === 'LI' ? ht === '' : !ANYWORD.test(ht)) colorOnly++;
  }
  // advisory: search input without a shortcut hint
  const searches = [...document.querySelectorAll('input')].filter((i) => vis(i) && (i.type === 'search' || /search/i.test(`${i.placeholder} ${i.getAttribute('aria-label') || ''}`)));
  const searchNoShortcut = searches.filter((i) => {
    for (let p = i.parentElement, n = 0; p && n < 2; p = p.parentElement, n++) if (p.querySelector('kbd') || /(ctrl|⌘|cmd|⌥)\s*\+?\s*[a-z]\b|(^|\s)\/(\s|$)/i.test(txt(p))) return false;
    return true;
  }).length;
  // advisory: a sentence of >= 6 words within 120px under the h1 (null = no h1)
  const h1 = [...document.querySelectorAll('h1')].find(vis);
  let summary = null;
  if (h1) {
    const b = h1.getBoundingClientRect().bottom;
    summary = [...document.querySelectorAll('body *')].some((e) => {
      const t = own(e); if (!t || t.split(/\s+/).length < 6 || e.closest(SKIP + ',h1') || /^(SCRIPT|STYLE)$/.test(e.tagName)) return false;
      const r = vis(e); return !!r && r.top >= b - 4 && r.top <= b + 120;
    });
  }
  return { components: out, status: { labels, capped, colorOnly, searches: searches.length, searchNoShortcut, summary } };
}

// ---- Layout analysis: probe metrics -> issues, score, verdict ------------------
const LAYOUT_WEIGHT = {
  'topbar-height': 2, 'hero-height': 3, 'equal-weight-grid': 3, 'icon-tiles': 1, 'placeholder-widgets': 1,
  'truncated-text': 1, 'data-above-fold': 3, 'card-padding': 1, 'sidebar-width': 1, 'content-width': 1,
};
const LAYOUT_RANK = { OK: 0, ARRANGE: 1, REWORK: 2 };
const STATUS_RANK = { NONE: 0, OK: 1, FIX: 2 };
const NEXT_TEXT = {
  ARRANGE: 'values alone will not make this look different. Run /dashboardlify:arrange (CSS-only layout)',
  REWORK: 'values alone will not make this look different. Run /dashboardlify:rework',
};

// ---- Inventory analysis: components -> fit rules, verdict ---------------------------------------
const INV_TYPES = ['table', 'chart', 'kpi', 'list', 'form', 'empty', 'placeholder', 'map', 'calendar', 'loading', 'error'];

function analyzeInventory(raw, deep) {
  const comps = raw.components;
  const counts = Object.fromEntries(INV_TYPES.map((t) => [t, 0]));
  comps.forEach((c) => { counts[c.type]++; });
  const fit = [];
  const add = (rule, c, detail, suggest, ref = 'metric-to-visual.md') => fit.push({ rule, type: c.type, label: c.label || '', detail, suggest, ref });
  for (const c of comps) {
    if (c.type === 'table') {
      if (c.rows >= INV_TS_MIN_ROWS && c.dateFirstCol >= INV_TS_DATE_SHARE && c.numericShare >= INV_TS_NUM_SHARE) {
        add('table-timeseries-to-chart', c, `${c.rows} rows by date, ${Math.round(c.numericShare * 100)}% numeric`, 'line/area chart ("Trend over time")');
      }
      if (c.numericCells <= INV_KPI_MAX_NUMS && (c.rows <= 2 || (c.rows <= 4 && c.cols <= 2))) {
        add('table-few-to-kpi', c, `${c.rows} rows, ${c.numericCells} number${c.numericCells === 1 ? '' : 's'}`, 'KPI cards ("Single number")');
      }
    }
    if ((c.type === 'table' || c.type === 'list') && c.items >= INV_COUNTS_MIN_ITEMS && !c.chartInCard) {
      const bar = c.statusLike >= 0.6 && c.items <= INV_BAR_MAX_ITEMS ? 'segmented/stacked bar' : 'sorted bar list';
      add('counts-to-bar', c, `${c.items} label + number items, no chart beside them`, `${bar} ("Part-to-whole")`);
    }
    if (c.type === 'chart' && c.h > INV_SPARK_MAX_H && (c.w < INV_CHART_MIN_W || c.h < INV_CHART_MIN_H)) {
      add('chart-undersized', c, `${c.w}x${c.h}px`, `min size ${INV_CHART_MIN_W}x${INV_CHART_MIN_H}`);
    }
    if (c.type === 'placeholder') add('placeholder-widget', c, 'placeholder text instead of data', 'fill it or cut it', 'render-only.md');
    if (c.type === 'map') add('map-check', c, 'map present', 'table with flags unless location drives a decision');
    if (!deep) continue;
    if (c.type === 'table') {
      if (c.statusColShare >= INV_STATUS_COL_SHARE && c.pctColShare >= INV_PCT_COL_SHARE && !c.progress) {
        add('table-status-to-rows', c, `${c.rows} rows with a status column and a percent column, no progress bar`, 'project row: progress bar + status pill', 'status.md');
      }
      if (c.rows >= INV_FILTER_MIN_ROWS && c.statusColShare >= INV_STATUS_COL_SHARE && !c.ctrlNear) {
        add('long-list-no-filter', c, `${c.rows} rows with a status column, no tabs/select/search near it`, 'segmented tabs with counts', 'status.md');
      }
    }
    if (c.type === 'list') {
      if (c.dated >= INV_DATES_MIN_ITEMS && !c.grouped) add('flat-dates-to-groups', c, `${c.dated} dated items, no group heading between them`, 'group by Overdue / Today / This week', 'content.md');
      if (c.people >= INV_PEOPLE_MIN && !c.barInCard) add('people-list-to-capacity', c, `${c.people} people with a number each, no bar`, 'capacity bars with state labels (Light / Balanced / Heavy / Over)', 'status.md');
    }
    if (c.type === 'kpi' && c.ctx < INV_KPI_CONTEXT_MIN_CHARS) add('kpi-no-context', c, `${c.ctx} letters besides label and numeral`, 'add a context line (change or next step)', 'content.md');
  }
  const st = deep && raw.status;
  if (st) {
    if (st.searchNoShortcut) fit.push({ rule: 'search-no-shortcut', type: 'form', label: '', detail: `${st.searchNoShortcut} search input${st.searchNoShortcut === 1 ? '' : 's'} without a shortcut hint`, suggest: 'show a kbd hint (Ctrl K or /)', ref: 'content.md' });
    if (st.summary === false) fit.push({ rule: 'no-page-summary', type: 'page', label: '', detail: 'no sentence of 6+ words within 120px under the h1', suggest: 'one summary sentence that carries the numbers', ref: 'content.md' });
  }
  const verdict = fit.some((f) => !INV_ADVISORY.has(f.rule)) ? 'SWAP' : 'FIT';
  return { verdict, counts, components: comps, fit, ...(st ? { status: analyzeStatus(st) } : {}) };
}

// ---- Status analysis: labels -> issues, verdict ------------------------------------------------
function analyzeStatus(st) {
  const L = st.labels;
  const words = [];
  for (const l of L) {
    let w = words.find((x) => x.word === l.word);
    if (!w) words.push(w = { word: l.word, count: 0, colors: [], tone: '' });
    w.count++;
    if (!w.colors.includes(l.sig)) w.colors.push(l.sig);
    if (!w.fg) w.fg = l.fg;
  }
  const spreadOf = (h) => { const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.max(...n) - Math.min(...n); };
  const hexSig = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : null);
  words.forEach((w) => {
    const h = hexSig(w.fg) || w.colors.map(hexSig).find(Boolean);
    w.tone = !h || spreadOf(h) < STATUS_NEUTRAL_SPREAD ? 'grey' : hueName(hexToOklch(h).H);
  });
  words.forEach((w) => delete w.fg);
  const styles = new Set(L.map((l) => l.style)).size;
  const colors = new Set(L.map((l) => l.sig)).size;
  const issues = [];
  const add = (rule, detail, fix) => issues.push({ rule, detail, fix, ref: 'status.md' });
  if (L.length >= STATUS_MIN_LABELS) {
    const grey = (l) => !l.pill && l.fg && spreadOf(l.fg) < STATUS_NEUTRAL_SPREAD;
    if (L.every(grey)) add('status-plain', `${L.length} status labels are plain grey text, no pill`, 'jsx');
    if (styles > STATUS_MAX_STYLES) add('status-mixed-style', `${styles} label styles (${[...new Set(L.map((l) => l.style))].join(', ')})`, 'css');
    const split = words.filter((w) => w.colors.length > 1);
    if (split.length) add('status-word-colors', `${split.map((w) => `"${w.word}" in ${w.colors.length} colours`).join(', ')}`, 'css');
    if (colors > STATUS_MAX_COLORS) add('status-too-many-colors', `${colors} colours across status labels (max ${STATUS_MAX_COLORS})`, 'css');
    const low = L.filter((l) => l.fg && l.behind && contrastRatio(l.fg, l.behind) < STATUS_MIN_CONTRAST);
    if (low.length) add('status-low-contrast', `${low.length} label${low.length === 1 ? '' : 's'} under ${STATUS_MIN_CONTRAST}:1 (worst ${Math.min(...low.map((l) => contrastRatio(l.fg, l.behind))).toFixed(1)}:1)`, 'css');
  }
  if (st.colorOnly) add('status-color-only', `${st.colorOnly} coloured dot${st.colorOnly === 1 ? '' : 's'} with no status word next to ${st.colorOnly === 1 ? 'it' : 'them'}`, 'jsx');
  const verdict = issues.length ? 'FIX' : L.length < STATUS_MIN_LABELS ? 'NONE' : 'OK';
  return { verdict, labels: L.length, ...(st.capped ? { capped: true } : {}), words, styles, distinctColors: colors, issues };
}

function analyzeLayout(L, vw) {
  const issues = [];
  const add = (id, detail, fix) => issues.push({ id, detail, weight: LAYOUT_WEIGHT[id], fix, recipe: id });
  if (L.topbar && L.topbar.height > 64) add('topbar-height', `${L.topbar.height}px tall (want <= 64)${L.topbar.logoHeight > 40 ? `, logo ${L.topbar.logoHeight}px (want <= 40)` : ''}`, 'css');
  if (L.hero && L.hero.sharePct >= 15) add('hero-height', `${L.hero.sharePct}% of the first screen (${L.hero.height}px tall), cap to 120-160px`, 'css');
  if (L.equalWeight) add('equal-weight-grid', `${L.equalWeight.count} equal cards in ${L.equalWeight.columns} columns, no hierarchy`, 'css');
  if (L.iconTiles.count >= 4) add('icon-tiles', `${L.iconTiles.count} icon tiles`, 'css');
  if (L.placeholders.count >= 3) add('placeholder-widgets', `${L.placeholders.count} empty placeholder values`, 'jsx');
  if (L.truncated.count >= 3) add('truncated-text', `${L.truncated.count} truncated texts`, 'css');
  if (L.dataAboveFold.count < 8 && !L.dataAboveFold.formLike) add('data-above-fold', `${L.dataAboveFold.count} data items in the first screen (want >= 8)`, 'css+jsx');
  if (L.cardPadding.median > 24) add('card-padding', `median card padding ${L.cardPadding.median}px (want <= 24)`, 'css');
  if (L.sidebar && L.sidebar.width > 280) add('sidebar-width', `sidebar ${L.sidebar.width}px wide (want <= 280)`, 'css');
  if (vw >= 1440 && L.content && L.content.width > 1440) add('content-width', `main content ${L.content.width}px wide (want <= 1440)`, 'css');
  const score = issues.reduce((a, i) => a + i.weight, 0);
  const jsxOnly = issues.filter((i) => i.fix === 'jsx');
  const jsxAny = issues.filter((i) => i.weight >= 2 && (i.fix === 'jsx' || i.fix === 'css+jsx'));
  const rework = (jsxOnly.some((i) => i.weight >= 2) && score >= 5) || (score >= 14 && jsxAny.length >= 2);
  const verdict = rework ? 'REWORK' : score >= 3 ? 'ARRANGE' : 'OK';
  const jsxIds = jsxOnly.map((i) => i.id);
  const note = verdict === 'OK' && jsxIds.length ? `OK with notes: ${jsxIds.length} issue${jsxIds.length > 1 ? 's' : ''} need${jsxIds.length > 1 ? '' : 's'} JSX (rework)` : null;
  return { verdict, score, issues, note, jsxIds, metrics: L };
}

// ---- Analysis: raw collector output -> metrics, rows, score ------------------
const sortedKeys = (m) => Object.keys(m).map(Number).sort((a, b) => a - b);
const sumVals = (m) => Object.values(m).reduce((a, b) => a + b, 0);

function analyze(raw) {
  const fsList = sortedKeys(raw.fontSizes);
  const fontOff = fsList.filter((v) => !FONT_SCALE.includes(v));
  const fontOffCount = fontOff.reduce((a, v) => a + raw.fontSizes[v], 0);
  const wList = sortedKeys(raw.weights);
  const wFlagged = wList.filter((w) => !WEIGHT_OK.includes(w)).length;
  const rList = sortedKeys(raw.radii);
  const topOff = Object.entries(raw.spacingVals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, n]) => ({ value: +v, count: n }));
  const hueList = sortedKeys(raw.hueBuckets);
  const m = {
    elements: raw.elements,
    fontSizes: { distinct: fsList.length, list: fsList, offScale: fontOffCount, offList: fontOff },
    weights: { distinct: wList.length, list: wList, flagged: wFlagged },
    radii: { distinct: rList.length, list: rList, over8: raw.over8 },
    spacing: {
      total: raw.spacingTotal, offScale: raw.spacingOff, top: topOff,
      offScalePct: raw.spacingTotal ? Math.round((1000 * raw.spacingOff) / raw.spacingTotal) / 10 : 0,
    },
    shadows: { count: raw.shadows, colored: raw.coloredShadows },
    gradients: { count: raw.gradients + raw.textGradients, text: raw.textGradients },
    uppercase: raw.uppercase,
    emoji: { count: raw.emojiNodes, examples: raw.emojiExamples },
    hues: { distinct: hueList.length, list: hueList },
    iconSizes: { count: raw.iconCount, distinct: Object.keys(raw.iconSizes).length, list: Object.keys(raw.iconSizes) },
    contrast: { failCount: raw.contrastFail, worst: raw.contrastWorst },
    legibility: { illegible: raw.illegible, darkOnFill: raw.darkOnFill, darkOnFillEx: raw.darkOnFillEx, darkOnDark: raw.darkOnDark, lightOnLight: raw.lightOnLight },
    motion: { all: raw.motionAll, slow: raw.motionSlow, looping: raw.motionLooping },
    rowHeights: { distinct: sortedKeys(raw.rowHeights).length, list: sortedKeys(raw.rowHeights) },
    heroNumbers: raw.heroNumbers,
  };
  const rows = buildRows(m);
  const V = rows.reduce((a, r) => a + r.points, 0);
  const score = Math.min(100, Math.round((100 * V) / Math.max(m.elements, MIN_ELEMENT_BASE)));
  const verdict = verdictFor(score);
  return { metrics: m, rows, violations: V, score, verdict, headline: headlineOf(m, score, V), palette: raw.pal ? analyzePalette(raw.pal, raw.illegible) : null };
}

const verdictFor = (s) => (s < LEAVE_BELOW ? 'LEAVE' : s > REWORK_ABOVE ? 'REWORK' : 'TIGHTEN');

function buildRows(m) {
  const row = (metric, value, points, hint) => ({ metric, value, points, hint });
  const L = (a) => (a.length ? a.join(', ') : '-');
  return [
    row('font sizes', `${m.fontSizes.distinct} distinct [${L(m.fontSizes.list)}], ${m.fontSizes.offScale} off-scale`,
      m.fontSizes.offScale * 2 + Math.max(0, m.fontSizes.distinct - 6) * 2,
      `off-scale type [${L(m.fontSizes.offList)}] -> 12/13/14/16/20/24/32 via var(--text-*)`),
    row('font weights', `[${L(m.weights.list)}], ${m.weights.flagged} flagged`, m.weights.flagged * 3,
      'weights outside 400/500/600 -> var(--weight-regular|medium|semibold)'),
    row('radii', `${m.radii.distinct} distinct [${L(m.radii.list)}], ${m.radii.over8} over 8`,
      m.radii.over8 + Math.max(0, m.radii.distinct - 4) * 2,
      `radius >8: ${m.radii.over8} elements -> var(--radius-lg) (8px max)`),
    row('spacing', `${m.spacing.offScale}/${m.spacing.total} off-scale (${m.spacing.offScalePct}%) top [${L(m.spacing.top.map((t) => t.value + 'x' + t.count))}]`,
      Math.min(m.spacing.offScale, SPACING_CAP),
      `off-scale spacing: ${m.spacing.offScale} declarations -> var(--space-1..8) (4px scale)`),
    row('shadows', `${m.shadows.count} non-overlay, ${m.shadows.colored} colored`, m.shadows.count + 2 * m.shadows.colored,
      `shadow on ${m.shadows.count} surfaces -> remove; use 1px var(--border) (shadow only on overlays)`),
    row('gradients', `${m.gradients.count} (text ${m.gradients.text})`, m.gradients.count,
      `gradients: ${m.gradients.count} -> flat var(--surface) / var(--accent)`),
    row('uppercase', `${m.uppercase}`, m.uppercase, `uppercase: ${m.uppercase} elements -> sentence case`),
    row('emoji', `${m.emoji.count} ${m.emoji.examples.length ? '[' + m.emoji.examples.join(' ') + ']' : ''}`.trim(), 3 * m.emoji.count,
      `emoji: ${m.emoji.count} nodes -> real icons (16/20px svg) or nothing`),
    row('hues', `${m.hues.distinct} buckets [${L(m.hues.list)}]`, Math.max(0, m.hues.distinct - 4) * 4,
      `hues: ${m.hues.distinct} buckets -> one var(--accent) + status red/green/amber`),
    row('icon sizes', `${m.iconSizes.count} icons, ${m.iconSizes.distinct} sizes [${L(m.iconSizes.list)}]`, 0, ''),
    row('contrast', `${m.contrast.failCount} below AA`, m.contrast.failCount,
      `contrast: ${m.contrast.failCount} elements -> raise to var(--text-muted) or darker (4.5:1)`),
    row('legibility', `${m.legibility.illegible} under 3:1 (dark-on-dark ${m.legibility.darkOnDark}, light-on-light ${m.legibility.lightOnLight}) darkOnFill ${m.legibility.darkOnFill}${m.legibility.darkOnFillEx.length ? ' [' + m.legibility.darkOnFillEx.map((e) => `${e.el} ${e.fg} on ${e.bg}`).join('; ') + ']' : ''}`,
      3 * m.legibility.illegible + 3 * m.legibility.darkOnFill,
      [m.legibility.illegible && `text under 3:1 on ${m.legibility.illegible} elements -> light text on dark surfaces, dark on light, white on a fill that reaches 4.5:1`,
        m.legibility.darkOnFill && `dark text on a mid/dark fill on ${m.legibility.darkOnFill} elements -> white text on a fill step that reaches 4.5:1; if white fails, darken the fill step, keep the hue`].filter(Boolean).join('; ')),
    row('motion', `all:${m.motion.all} slow:${m.motion.slow} looping:${m.motion.looping}`,
      m.motion.all * 2 + m.motion.slow + m.motion.looping * 3,
      `motion: transition:all x${m.motion.all}, slow x${m.motion.slow}, looping x${m.motion.looping} -> named props, var(--dur-fast|base) 120-220ms, no loops`),
    row('row heights', `${m.rowHeights.distinct} distinct [${L(m.rowHeights.list)}]`, 0, ''),
    row('hero numbers', `${m.heroNumbers} over 32px`, m.heroNumbers * 3,
      `oversized numbers: ${m.heroNumbers} -> cap at var(--text-3xl) 32px`),
  ];
}

const statusOf = (points) => (points === 0 ? 'ok' : points < ROW_BAD_POINTS ? 'warn' : 'bad');

function headlineOf(m, score, violations) {
  return {
    score, violations, elements: m.elements, radiusOver8: m.radii.over8, shadows: m.shadows.count, coloredShadows: m.shadows.colored,
    gradients: m.gradients.count, uppercase: m.uppercase, emoji: m.emoji.count, spacingOffScale: m.spacing.offScale,
    fontOffScale: m.fontSizes.offScale, weightsFlagged: m.weights.flagged, contrastFail: m.contrast.failCount,
    illegible: m.legibility.illegible, darkOnFill: m.legibility.darkOnFill, darkOnDark: m.legibility.darkOnDark, lightOnLight: m.legibility.lightOnLight,
    motionAll: m.motion.all, motionSlow: m.motion.slow, motionLooping: m.motion.looping, heroNumbers: m.heroNumbers,
    hueBuckets: m.hues.distinct,
  };
}

// ---- Palette: colour math ----------------------------------------------------
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLin = (x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function rgbToOklch({ r, g, b }) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinear(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

// Reduce chroma until the colour fits sRGB, then return hex.
function oklchToHex(L, C, H) {
  let c = Math.max(0, C);
  while (c > 0 && oklchToLinear(L, c, H).some((v) => v < -1e-4 || v > 1 + 1e-4)) c -= 0.002;
  const [R, G, B] = oklchToLinear(L, Math.max(0, c), H).map((v) => clamp(Math.round(fromLin(clamp(v, 0, 1))), 0, 255));
  return '#' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const hexToRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const hexToOklch = (h) => rgbToOklch(hexToRgb(h));
const rgbToHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const relLum = ({ r, g, b }) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
function contrastRatio(a, b) {
  const x = relLum(hexToRgb(a)), y = relLum(hexToRgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// Same hue and chroma, lightness lowered in 0.01 steps until white-on-colour reaches `min`.
function fitAccentForWhite(hex, min = 4.5) {
  const o = hexToOklch(hex);
  for (let L = o.L; L > 0; L -= 0.01) {
    const h = oklchToHex(L, o.C, o.H);
    if (contrastRatio(h, '#ffffff') >= min) return h;
  }
  return '#000000';
}
const accentTextOnWhite = (hex, min = 5.5) => fitAccentForWhite(hex, min);

// ---- Palette: domain detection ----------------------------------------------
// Fallback only: used when references/palettes/palettes.json is missing (the json carries the 28 domains).
const DOMAINS = [
  { name: 'finance', hue: 255, feel: 'trust, precision, calm blue', kw: ['invoice', 'revenue', 'payout', 'ledger', 'balance', 'transaction', 'bank', 'payment'] },
  { name: 'health', hue: 195, feel: 'clean, clinical, calm teal', kw: ['patient', 'appointment', 'clinic', 'dental', 'lab', 'case', 'treatment', 'prescription'] },
  { name: 'logistics', hue: 235, feel: 'operational, steady blue', kw: ['shipment', 'fleet', 'route', 'delivery', 'warehouse', 'inventory', 'order tracking'] },
  { name: 'analytics', hue: 262, feel: 'calm blue-indigo, data first', kw: ['analytics', 'funnel', 'cohort', 'session', 'conversion', 'retention', 'report'] },
  { name: 'e-commerce', hue: 35, feel: 'warm coral-orange, keep contrast', kw: ['orders', 'products', 'cart', 'sku', 'customers', 'store'] },
  { name: 'devtools', hue: 255, feel: 'technical, restrained blue', kw: ['deploy', 'build', 'pipeline', 'repo', 'api', 'logs', 'incident'] },
  { name: 'HR', hue: 225, feel: 'approachable, people-centred blue', kw: ['employee', 'payroll', 'leave', 'hiring', 'recruit'] },
  { name: 'CRM', hue: 240, feel: 'professional, relationship blue', kw: ['lead', 'deal', 'pipeline stage', 'account', 'contact'] },
  { name: 'education', hue: 200, feel: 'friendly, open cyan-blue', kw: ['student', 'course', 'class', 'grade'] },
  { name: 'security', hue: 215, feel: 'serious, vigilant steel blue', kw: ['threat', 'alert', 'vulnerability', 'audit'] },
  { name: 'energy', hue: 150, feel: 'resourceful green', kw: ['device', 'sensor', 'telemetry', 'energy', 'usage'] },
];
const GENERAL = { name: 'general admin', hue: 245, feel: 'neutral blue, no strong domain cue' };

function detectDomain(t) {
  const P = loadPalettes();
  const table = P && P.domains
    ? Object.entries(P.domains).filter(([, d]) => (d.keywords || []).length).map(([name, d]) => ({ name, feel: d.feel, kw: d.keywords }))
    : DOMAINS;
  const srcs = [[`${t.title} ${(t.h1 || []).join(' ')}`, 3], [(t.nav || []).join(' '), 2],
    [`${t.desc} ${(t.h23 || []).join(' ')} ${(t.th || []).join(' ')} ${t.body}`, 1]];
  const scored = table.map((d) => {
    const hits = {};
    let score = 0;
    for (const k of d.kw) {
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}(?:s|es|ing|ment|ed)?\\b`, 'g');
      for (const [text, w] of srcs) {
        const n = (text.toLowerCase().match(re) || []).length;
        if (n) { hits[k] = (hits[k] || 0) + n * w; score += n * w; }
      }
    }
    return { d, score, hits };
  }).sort((a, b) => b.score - a.score);
  const total = scored.reduce((a, x) => a + x.score, 0);
  const top = scored[0];
  const confidence = total ? Math.min(1, Math.round((100 * top.score) / total) / 100) : 0;
  // A single stray hit is not a domain: require some evidence plus the 0.25 confidence floor.
  if (confidence < 0.25 || top.score < 2) return { ...GENERAL, confidence, signals: [] };
  return {
    name: top.d.name, hue: top.d.hue, feel: top.d.feel, confidence,
    signals: Object.entries(top.hits).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
  };
}

// ---- Palette: analysis -------------------------------------------------------
const HUE_NAMES = [[10, 'pink'], [40, 'red'], [70, 'orange'], [95, 'amber'], [115, 'yellow'], [140, 'lime'], [170, 'green'],
  [200, 'teal'], [230, 'cyan'], [265, 'blue'], [285, 'indigo'], [320, 'violet'], [350, 'pink']];
const hueName = (h) => (HUE_NAMES.find(([max]) => h < max) || [0, 'pink'])[1];
const inRange = (h, lo, hi) => h >= lo && h <= hi;
const isStatusHue = (h) => inRange(h, 10, 40) || inRange(h, 60, 100) || inRange(h, 130, 165);
const PAL_RANK = { KEEP: 0, ADJUST: 1, REPLACE: 2 };
const CHROMATIC = 0.04;

function circMean(items) {
  let x = 0, y = 0, w = 0;
  for (const i of items) { x += i.w * Math.cos((i.H * Math.PI) / 180); y += i.w * Math.sin((i.H * Math.PI) / 180); w += i.w; }
  return w ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360 : 0;
}
const wmean = (items, k) => { const w = items.reduce((a, i) => a + i.w, 0); return w ? items.reduce((a, i) => a + i[k] * i.w, 0) / w : 0; };
const f2 = (v) => (Math.round(v * 100) / 100).toString();
const f3 = (v) => (Math.round(v * 1000) / 1000).toString();

function analyzePalette(pal, illegible = 0) {
  const S = Object.entries(pal.s).map(([k, e]) => {
    const [r, g, b, kind, small, inter] = k.split(',');
    return { ...rgbToOklch({ r: +r, g: +g, b: +b }), hex: rgbToHex({ r: +r, g: +g, b: +b }), kind, small: small === '1', inter: inter === '1', w: e.w, big: e.big };
  });
  const chrom = S.filter((s) => s.C >= CHROMATIC);
  const neutral = S.filter((s) => s.C < CHROMATIC);

  // 30-degree hue buckets, merging neighbours that are comparably heavy
  const bw = Array(12).fill(0);
  chrom.forEach((s) => { bw[Math.floor(s.H / 30) % 12] += s.w; });
  const parent = [...Array(12).keys()];
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < 12; i++) {
    const j = (i + 1) % 12;
    if (bw[i] > 0 && bw[j] > 0 && Math.min(bw[i], bw[j]) >= 0.3 * Math.max(bw[i], bw[j])) parent[find(i)] = find(j);
  }
  const byRoot = new Map();
  chrom.forEach((s) => { const r = find(Math.floor(s.H / 30) % 12); (byRoot.get(r) || byRoot.set(r, []).get(r)).push(s); });
  const totalChrom = chrom.reduce((a, s) => a + s.w, 0);

  const groups = [...byRoot.values()].map((items) => {
    const w = items.reduce((a, s) => a + s.w, 0);
    const smallW = items.filter((s) => s.small).reduce((a, s) => a + s.w, 0);
    const interW = items.filter((s) => s.inter).reduce((a, s) => a + s.w, 0);
    const H = circMean(items);
    // representative colour: heaviest interactive sample, else heaviest saturated one, else weighted mean
    const pool = items.some((s) => s.inter) ? items.filter((s) => s.inter) : items.some((s) => s.C >= 0.08) ? items.filter((s) => s.C >= 0.08) : null;
    const hex = pool ? [...pool].sort((a, b) => b.w - a.w)[0].hex : oklchToHex(wmean(items, 'L'), wmean(items, 'C'), H);
    const o = hexToOklch(hex);
    const status = isStatusHue(H) && smallW / w >= 0.5;
    const bigSurfaces = items.filter((s) => s.kind === 'bg' && s.L < 0.9 && s.C >= 0.06).reduce((a, s) => a + s.big, 0);
    return { hex, ...o, H: o.H, groupH: H, w, share: totalChrom ? w / totalChrom : 0, status, lead: w - smallW + 2 * interW, bigSurfaces };
  }).sort((a, b) => b.w - a.w);

  const accents = groups.filter((g) => !g.status && g.share >= 0.04);

  // primary: brand hint first, else the strongest interactive/large accent
  let primary = null;
  const hints = [];
  if (pal.theme) hints.push({ c: pal.theme, rank: 0 });
  const badName = /(fg|foreground|text|on-|contrast|hover|active|subtle|soft|light|dark|bg|border|ring|muted|tint|focus|\d{2,3}$)/i;
  for (const v of pal.vars || []) {
    const exact = /^--(brand|primary|accent)(-?(color|base|default|main))?$/i.test(v.name);
    if (exact || !badName.test(v.name)) hints.push({ c: v.c, rank: exact ? 1 : 2 });
  }
  hints.sort((a, b) => a.rank - b.rank);
  for (const h of hints) {
    const hex = rgbToHex(h.c), o = hexToOklch(hex);
    if (o.C >= CHROMATIC) { primary = { hex, ...o, source: 'brand-hint' }; break; }
  }
  if (!primary && accents.length) {
    const g = [...accents].sort((a, b) => b.lead - a.lead)[0];
    primary = { hex: g.hex, L: g.L, C: g.C, H: g.H, source: 'dominant' };
  }
  if (!primary) primary = null;

  // neutrals
  const nb = neutral.filter((s) => s.kind === 'bg' || s.kind === 'border');
  const nC = wmean(nb, 'C');
  const nH = circMean(nb);
  const neutrals = { chroma: nC, hue: nH };
  const hd = primary ? hueDiff(nH, primary.H) : 0;
  neutrals.cohesive = nC < 0.008 || (nC <= 0.03 && (!primary || hd <= 45));
  neutrals.mismatched = !!primary && nC > 0.012 && hd > 60;

  // gradients
  const gr = (pal.grads || []).map((g) => ({ a: rgbToOklch(g.a), b: rgbToOklch(g.b), area: g.area }))
    .filter((g) => g.a.C >= CHROMATIC || g.b.C >= CHROMATIC).sort((a, b) => b.area - a.area);
  const hueGrad = gr.find((g) => g.a.C >= CHROMATIC && g.b.C >= CHROMATIC && hueDiff(g.a.H, g.b.H) >= 25);
  const anyGrad = gr.length > 0;

  const domain = detectDomain(pal.t || {});
  const issues = [];
  if (hueGrad) issues.push(`hue gradient (${hueName(hueGrad.a.H)} to ${hueName(hueGrad.b.H)})`);
  if (accents.length >= 3) issues.push(`${accents.length} non-status accent hues`);
  if (primary) {
    const cr = contrastRatio(primary.hex, '#ffffff');
    if (cr < 4.5) {
      const asFill = chrom.some((s) => s.kind === 'bg' && s.inter && hueDiff(s.H, primary.H) < 30);
      issues.push(`primary fails 4.5:1 as ${asFill ? 'white-on-fill' : 'text on white'} (${f2(cr)})`);
    }
    if (primary.C > 0.25) issues.push(`neon chroma ${f2(primary.C)}`);
    else if (primary.C < 0.07) issues.push(`dull accent chroma ${f2(primary.C)}`);
  }
  if (neutrals.mismatched) issues.push('neutrals tinted toward a different hue');
  if (!primary) issues.push('no chromatic accent (grayscale UI)');
  const spread = accents.reduce((a, g) => a + g.bigSurfaces, 0);
  if (spread >= 3) issues.push(`accent used on ${spread} large surfaces (colour spread across chrome)`);

  const violetPink = primary && inRange(primary.H, 255, 345);
  let verdict = 'KEEP';
  if (hueGrad || accents.length >= 3 || (violetPink && anyGrad)) verdict = 'REPLACE';
  else if (issues.length || !primary) verdict = 'ADJUST';
  // a flat brand colour is the owner's choice: tune it, never replace it
  if (verdict === 'REPLACE' && primary?.source === 'brand-hint' && !anyGrad) verdict = 'ADJUST';

  const round = (g) => ({ hex: g.hex, hue: Math.round(g.H), name: hueName(g.H), chroma: f3(g.C) * 1, share: Math.round(g.share * 100) / 100 });
  return {
    domain, verdict, issues, illegible,
    primary: primary && { hex: primary.hex, hue: Math.round(primary.H), chroma: f3(primary.C) * 1, lightness: f3(primary.L) * 1, source: primary.source },
    accents: accents.map(round),
    neutrals: { chroma: f3(nC) * 1, hue: Math.round(nH), cohesive: neutrals.cohesive },
    suggested: suggestCurated(primary, domain, verdict, { page: pal.page, band: pal.band }) || suggestPalette(primary, domain, verdict),
  };
}

// ---- Palette: suggestion -----------------------------------------------------
function suggestPalette(primary, domain, verdict) {
  const fromDomain = !primary || verdict === 'REPLACE';
  const H = fromDomain ? domain.hue : primary.H;
  const startL = fromDomain ? 0.62 : primary.L;
  const C = !fromDomain && primary.C >= 0.08 && primary.C <= 0.2 ? primary.C : 0.16;
  const base = fitAccentForWhite(oklchToHex(startL, C, H));
  const b = hexToOklch(base);
  const v = {
    '--accent-base': base,
    '--accent-hover': oklchToHex(b.L * 0.92, b.C, b.H),
    '--accent-text': accentTextOnWhite(base),
    '--accent-subtle': oklchToHex(0.96, 0.02, H),
  };
  [0.985, 0.967, 0.92, 0.87, 0.71, 0.55, 0.44, 0.37, 0.27, 0.21, 0.145].forEach((L, i) => {
    v[`--neutral-${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950][i]}`] = oklchToHex(L, 0.006 + (0.006 * i) / 10, H);
  });
  v['--chart-1'] = base;
  for (let k = 1; k < 5; k++) {
    let h = (H + 72 * k) % 360;
    for (let t = 0; t < 12 && isStatusHue(h); t++) h = (h + 8) % 360;
    v[`--chart-${k + 1}`] = oklchToHex(0.62, 0.12, h);
  }
  for (const [n, h] of [['success', 150], ['warning', 80], ['danger', 25]]) {
    v[`--${n}`] = oklchToHex(0.55, 0.14, h);
    v[`--${n}-fg`] = oklchToHex(0.42, 0.12, h);
  }
  const why = [];
  const aL = f2(b.L);
  if (fromDomain) {
    why.push(`accent-base ${base}: hue ${Math.round(H)} from domain "${domain.name}" (${domain.feel}), L ${aL} so white text reaches 4.5:1`);
  } else {
    why.push(`accent-base ${primary.hex} -> ${base}: ${primary.L - b.L > 0.005 ? `darkened ${f2(primary.L)}->${aL} so white text reaches 4.5:1` : 'already passes 4.5:1 with white'}; hue kept (${Math.round(H)})`);
  }
  why.push('accent-hover: 8% darker lightness; accent-text: lightness fitted for >=5.5:1 on white; accent-subtle: L 0.96 C 0.02 at the accent hue');
  why.push(`neutrals: 11-step ramp tinted at hue ${Math.round(H)} (chroma 0.006-0.012) so surfaces share the accent hue`);
  why.push('chart-1..5: accent first, then 72-degree hue steps at L 0.62 C 0.12, nudged out of the red/amber/green status zones');
  why.push('success/warning/danger: fixed hues 150/80/25, separate from the accent, with darker -fg text variants');
  return { hue: Math.round(H), basis: fromDomain ? 'domain' : 'primary', vars: v, why };
}

// ---- Palette: curated suggestion ---------------------------------------------
// Scales are human-designed (references/palettes/palettes.json); nothing is invented here except the
// optional brand fit. Fill steps are computed from the scales, never read from the file's contrast table.
let PALETTES;
function loadPalettes() {
  if (PALETTES !== undefined) return PALETTES;
  try { PALETTES = JSON.parse(readFileSync(new URL('../references/palettes/palettes.json', import.meta.url), 'utf8')); }
  catch {
    PALETTES = null;
    console.error('warning: references/palettes/palettes.json not found, falling back to a generated palette suggestion');
  }
  return PALETTES;
}

const WHITE = '#ffffff';
let COMBO_ONLY = null; // set by --combo

// Closest accent scale: hue distance to the nearest of the solid/text steps 9-12 (a scale's hue drifts a little across
// them), plus a small chroma penalty (under ~10 degrees) so a muted scale does not beat a vivid brand on a tie.
function closestAccent(P, primary) {
  let best = null;
  for (const [name, s] of Object.entries(P.scales)) {
    if (s.kind !== 'accent') continue;
    const o = hexToOklch(s.light[8]);
    const hd = Math.min(...[8, 9, 10, 11].map((i) => hueDiff(hexToOklch(s.light[i]).H, primary.H)));
    const key = hd + 40 * Math.abs(o.C - primary.C);
    if (!best || key < best.key) best = { name, key };
  }
  return best && best.name;
}

const COMBO_IDS = ['calm', 'paper', 'brand'];

// Zones of one combo + mode -> CSS custom properties (all values are read from palettes.json).
function comboTokens(z) {
  const { page, brand, ink } = z;
  return {
    '--bg': page.bg, '--surface': page.surface, '--border': page.border, '--text': page.text, '--text-muted': page.muted,
    '--accent-base': brand.bg, '--text-on-accent': brand.fg, '--accent-text': page.accentText,
    '--zone-brand-bg': brand.bg, '--zone-brand-fg': brand.fg, '--zone-brand-muted': brand.fgMuted,
    '--zone-brand-button-bg': brand.button.bg, '--zone-brand-button-fg': brand.button.fg,
    '--zone-ink-bg': ink.bg, '--zone-ink-fg': ink.fg, '--zone-ink-muted': ink.fgMuted, '--zone-ink-accent': ink.accentText,
  };
}
const minRatio = (r) => Math.min(...Object.values(r || {}).filter(Number.isFinite));

// Which of calm / paper / brand fits the current page (ctx = measured page bg + large coloured band, both optional).
function recommendCombo(ctx, ids) {
  const pick = (id, why) => (ids.includes(id) ? { id, why } : null);
  if (ctx && ctx.band) {
    const r = pick('brand', `large ${ctx.band.kind} band ${ctx.band.w}x${ctx.band.h} in the accent hue`);
    if (r) return r;
  }
  if (ctx && ctx.page) {
    const l = relLum(ctx.page);
    if (l < 0.9 && l > 0.05) {
      const r = pick('paper', `tinted page background ${rgbToHex(ctx.page)}`);
      if (r) return r;
    }
  }
  return pick('calm', 'default: white or near-white page, accent kept to controls') || { id: ids[0], why: 'only option' };
}

function suggestCurated(primary, domain, verdict, ctx) {
  const P = loadPalettes();
  if (!P || !P.scales || !P.combos) return null;
  const dKey = P.domains && P.domains[domain.name] ? domain.name : 'general admin';
  const dom = (P.domains && P.domains[dKey]) || { accent: 'blue', neutral: 'slate', alt: [] };
  const dCombos = P.combos[dKey];
  if (!Array.isArray(dCombos) || !dCombos.length) return null;
  const fromDomain = !primary || verdict === 'REPLACE';
  let picked = dCombos, brand, accent = dom.accent, neutral = dom.neutral;
  const notes = [];
  const why = [];
  if (!fromDomain) {
    const scale = closestAccent(P, primary);
    if (primary.source === 'brand-hint') brand = { hex: primary.hex, fitted: contrastRatio(primary.hex, WHITE) >= 4.5 ? primary.hex : fitAccentForWhite(primary.hex), scale };
    const match = (id) => dCombos.find((c) => c.id === id && c.accent === scale)
      || Object.values(P.combos).flat().find((c) => c.id === id && c.accent === scale);
    const m = COMBO_IDS.map(match).filter(Boolean);
    if (m.length) {
      picked = m;
      accent = scale; neutral = m[0].neutral;
      why.push(`accent ${scale} is the curated scale closest in hue to the brand ${primary.hex}; options use its precomputed zones`);
      if (brand) why.push(brand.fitted === brand.hex ? `brand ${brand.hex} already reaches 4.5:1 with white text` : `brand ${brand.hex} -> ${brand.fitted}: same hue, lightness lowered until white text reaches 4.5:1 (light --accent-base and --zone-brand-bg)`);
    } else {
      notes.push(`brand colour maps to ${scale}; no precomputed zones, use palettes.md recipe`);
    }
  } else {
    why.push(`accent ${accent} + neutral ${neutral} come from the "${dKey}" row (${dom.feel || 'domain default'}); ${primary ? 'the current palette is being replaced' : 'there is no usable brand colour'}`);
  }
  const fitted = brand && picked !== dCombos && brand.fitted !== brand.hex ? brand.fitted : null;
  let options = picked.map((c) => {
    const mode = (m) => {
      const z = JSON.parse(JSON.stringify(c.zones[m]));
      if (fitted && m === 'light') z.brand.bg = fitted;
      return { tokens: comboTokens(z), ratios: minRatio(c.ratios && c.ratios[m]) };
    };
    const light = mode('light'), dark = mode('dark');
    return { id: c.id, name: c.name, harmony: c.harmony, use: c.use, accent: c.accent, neutral: c.neutral,
      light: { tokens: light.tokens }, dark: { tokens: dark.tokens }, ratios: { light: light.ratios, dark: dark.ratios, min: Math.min(light.ratios, dark.ratios) } };
  });
  const rec = recommendCombo(ctx, options.map((o) => o.id));
  if (COMBO_ONLY) options = options.filter((o) => o.id === COMBO_ONLY);
  return {
    source: 'curated', domain: dKey, accent, neutral, alt: (dom.alt || []).filter((a) => a !== accent && P.scales[a]).slice(0, 2),
    recommended: rec.id, recommendedWhy: rec.why, options,
    light: (options.find((o) => o.id === rec.id) || options[0]).light, dark: (options.find((o) => o.id === rec.id) || options[0]).dark,
    ...(brand ? { brand } : {}), why, notes,
  };
}

// ---- Chrome / CDP ---------------------------------------------------------
function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const fixed = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    win32: ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].flatMap((e) => (process.env[e] ? [
      path.join(process.env[e], 'Google/Chrome/Application/chrome.exe'),
      path.join(process.env[e], 'Microsoft/Edge/Application/msedge.exe'),
      path.join(process.env[e], 'Chromium/Application/chrome.exe'),
    ] : [])),
  }[process.platform];
  for (const p of fixed || []) if (existsSync(p)) return p;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'microsoft-edge']) {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      const p = path.join(dir, name);
      if (dir && existsSync(p)) return p;
    }
  }
  return null;
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)));
  });
}

async function pickPort() {
  for (let i = 0; i < 50; i++) {
    const p = 9300 + Math.floor(Math.random() * 600);
    if (await portFree(p)) return p;
  }
  throw new Error('no free debugging port in 9300-9899');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Set();
    let id = 0;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      } else for (const l of listeners) l(msg);
    };
    ws.onerror = () => reject(new Error('CDP websocket error'));
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const n = ++id;
        pending.set(n, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id: n, method, params }));
      }),
      once: (method) => new Promise((res) => {
        const l = (m) => { if (m.method === method) { listeners.delete(l); res(m.params); } };
        listeners.add(l);
      }),
      on: (method, fn) => { listeners.add((m) => { if (m.method === method) fn(m.params); }); },
      close: () => ws.close(),
    });
  });
}

async function launchChrome(chromePath) {
  const port = await pickPort();
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dashboardlify-scan-'));
  let proc = null;
  let cleaning = null;
  // Idempotent: kill Chrome, wait for it to exit (max ~2s), then drop the temp profile.
  const cleanup = () => cleaning ??= (async () => {
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      const exited = new Promise((r) => proc.once('exit', r));
      try { proc.kill('SIGKILL'); } catch {}
      await Promise.race([exited, sleep(2000)]);
    }
    try { rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  })();
  const onSig = (code) => () => { cleanup().then(() => process.exit(code)); };
  process.once('SIGINT', onSig(130));
  process.once('SIGTERM', onSig(143));
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ];
  if (process.getuid?.() === 0) args.unshift('--no-sandbox');
  try {
    proc = spawn(chromePath, args, { stdio: 'ignore' });
    proc.on('error', () => {});
    for (let i = 0; i < 60; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        const page = list.find((t) => t.type === 'page');
        if (page) return { cdp: await connectCdp(page.webSocketDebuggerUrl), cleanup, port };
      } catch {}
      await sleep(250);
    }
    throw new Error('Chrome did not expose a page target in time');
  } catch (e) {
    await cleanup();
    throw e;
  }
}

async function scanPage(cdp, url, opts) {
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: opts.width, height: opts.height, deviceScaleFactor: 1, mobile: false });
  if (opts.dark) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await cdp.send('Network.enable');
  if (opts.block.length) await cdp.send('Network.setBlockedURLs', { urls: opts.block });
  if (opts.auth) {
    // values go to the browser only; nothing here is printed or written to --json
    if (opts.auth.cookies.length) await cdp.send('Network.setCookies', { cookies: opts.auth.cookies });
    if (opts.auth.origins.length) await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const O = ${JSON.stringify(opts.auth.origins)}.find((o) => o.origin === location.origin); if (O) for (const i of O.localStorage || []) try { localStorage.setItem(i.name, i.value); } catch {} })()` });
  }
  const status = new Map(); // frameId -> HTTP status of its document
  cdp.on('Network.responseReceived', (p) => { if (p.type === 'Document' && !status.has(p.frameId)) status.set(p.frameId, p.response.status); });
  const loaded = cdp.once('Page.loadEventFired');
  const nav = await cdp.send('Page.navigate', { url });
  if (nav.errorText) throw new Error(`could not load ${url}: ${nav.errorText}`);
  await loaded;
  const code = status.get(nav.frameId);
  if (code >= 400) throw new Error(`${url} returned HTTP ${code}`);
  await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
  await sleep(500);
  const lay = opts.noLayout ? 'null' : `(${layoutProbe.toString()})(${opts.width}, ${opts.height})`;
  const inv = opts.inventory ? `(${inventoryProbe.toString()})(${!!opts.status}, ${JSON.stringify({ words: STATUS_X_WORDS.source, spread: STATUS_NEUTRAL_SPREAD })})` : 'null';
  const r = await cdp.send('Runtime.evaluate', { expression: `({ raw: (${collect.toString()})(${!opts.noPalette}), layout: ${lay}, inventory: ${inv} })`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('collector failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  const out = r.result.value;
  if (opts.shot || opts.visibleChange) {
    await cdp.send('Runtime.evaluate', { awaitPromise: true, expression: `(async () => {
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(st);
      const imgs = [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }));
      await Promise.race([Promise.all([document.fonts.ready, ...imgs]), new Promise((r) => setTimeout(r, 2000))]);
    })()` });
    await sleep(100);
  }
  if (opts.shot || opts.visibleChange) out.png = (await cdp.send('Page.captureScreenshot', { format: 'png' })).data;
  return out;
}

const withTimeout = (p, ms, what) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms).unref()),
]);

function toUrl(t) {
  return /^https?:\/\//i.test(t) ? t : pathToFileURL(path.resolve(t)).href;
}

// Runs inside a blank Chrome tab: both PNGs become canvases, so Node never decodes an image.
async function pixelDiff(aUrl, bUrl) {
  const load = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('cannot decode PNG')); i.src = u; });
  const [a, b] = await Promise.all([load(aUrl), load(bUrl)]);
  const dims = { before: `${a.width}x${a.height}`, after: `${b.width}x${b.height}` };
  if (a.width !== b.width) return { incomparable: true, ...dims };
  const w = a.width, h = Math.min(a.height, b.height); // never scale: crop both to the shared top-left area
  const px = (i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0, w, h, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
  const da = px(a), db = px(b);
  let changed = 0, sum = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d0 = Math.abs(da[i] - db[i]), d1 = Math.abs(da[i + 1] - db[i + 1]), d2 = Math.abs(da[i + 2] - db[i + 2]);
    if (Math.max(d0, d1, d2) > 24) changed++;
    sum += d0 + d1 + d2;
  }
  const n = w * h;
  return { percent: (100 * changed) / n, meanDelta: sum / (3 * n), cropped: a.height !== b.height, ...dims };
}

async function compareShots(port, beforeB64, afterB64) {
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  let cdp;
  try {
    cdp = await connectCdp(tab.webSocketDebuggerUrl);
    const png = (b) => JSON.stringify('data:image/png;base64,' + b);
    const r = await cdp.send('Runtime.evaluate', { expression: `(${pixelDiff.toString()})(${png(beforeB64)}, ${png(afterB64)})`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('compare failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    const v = r.result.value;
    if (v.incomparable) return { verdict: 'INCOMPARABLE', before: v.before, after: v.after };
    const verdict = v.percent >= 8 ? 'VISIBLE' : v.percent >= 3 ? 'SUBTLE' : 'NOT VISIBLE';
    return { percent: Math.round(v.percent * 10) / 10, verdict, meanDelta: Math.round(v.meanDelta * 10) / 10, cropped: v.cropped, before: v.before, after: v.after };
  } finally {
    try { cdp?.close(); } catch {}
    try { await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`); } catch {}
  }
}

async function runBrowser(targets, opts) {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Chrome/Chromium not found. Install it or set CHROME_PATH. (--src <dir> mode works without a browser.)');
    process.exit(1);
  }
  const { cdp, cleanup, port } = await launchChrome(chrome);
  const results = [];
  try {
    for (const [idx, t] of targets.entries()) {
      try {
        if (!/^https?:\/\//i.test(t) && !existsSync(t)) throw new Error(`no such file: ${t}`);
        const { raw, layout, inventory, png } = await withTimeout(scanPage(cdp, toUrl(t), opts), TARGET_TIMEOUT_MS, t);
        const res = { target: t, ...analyze(raw), layout: layout ? analyzeLayout(layout, opts.width) : null };
        if (inventory) res.inventory = analyzeInventory(inventory, opts.status);
        if (opts.shot) {
          res.shot = targets.length > 1 ? opts.shot.replace(/(\.png)?$/i, `-${idx + 1}$1`) : opts.shot;
          writeFileSync(res.shot, Buffer.from(png, 'base64'));
        }
        if (opts.visibleChange) {
          try { res.visibleChange = await compareShots(port, readFileSync(opts.visibleChange).toString('base64'), png); }
          catch (e) { res.visibleChangeError = e.message; }
        }
        results.push(res);
      } catch (e) {
        results.push({ target: t, error: e.message });
      }
    }
  } finally {
    try { cdp.close(); } catch {}
    await cleanup();
  }
  return results;
}

// Playwright-style state file (or a bare cookie array) -> CDP cookies + localStorage per origin.
function loadAuth(file) {
  let j;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('not valid JSON'); } // fixed text: a parse error would quote the file contents
  const list = Array.isArray(j) ? j : j.cookies || [];
  const origins = Array.isArray(j) ? [] : (j.origins || []).filter((o) => o.origin && (o.localStorage || []).length);
  const cookies = list.map((c) => {
    const { expires, sameSite, ...rest } = c;
    const out = { ...rest };
    if (expires > 0) out.expires = expires; // -1 means session cookie: drop it
    if (/^(Strict|Lax|None)$/.test(sameSite)) out.sameSite = sameSite;
    if (!out.url && !out.domain) throw new Error('every cookie needs a url or domain');
    return out;
  });
  return { cookies, origins, keys: origins.reduce((a, o) => a + o.localStorage.length, 0) };
}

// ---- Reporting --------------------------------------------------------------
function table(rows, headers) {
  const all = [headers, ...rows];
  const w = headers.map((_, i) => Math.max(...all.map((r) => String(r[i]).length)));
  return all.map((r) => r.map((c, i) => String(c).padEnd(w[i])).join(' | ').trimEnd()).join('\n');
}

function printTarget(r) {
  console.log(`\n== ${r.target} ==`);
  if (r.error) return console.log(`ERROR: ${r.error}`);
  const rows = [['elements', r.metrics.elements, 'ok'], ...r.rows.map((x) => [x.metric, x.value, statusOf(x.points)])];
  console.log(table(rows, ['metric', 'value', 'status']));
  console.log(`\nSCORE ${r.score}  VERDICT ${r.verdict}  (${VERDICT_TEXT[r.verdict]})`);
  const top = [...r.rows].filter((x) => x.points > 0).sort((a, b) => b.points - a.points).slice(0, 5);
  if (top.length) {
    console.log('Top fixes:');
    top.forEach((x, i) => console.log(`  ${i + 1}. ${x.hint}  [${x.points} pts]`));
  }
  const worst = r.metrics.contrast.worst;
  if (worst.length) {
    console.log('Worst contrast:');
    worst.forEach((w) => console.log(`  ${w.el} ${w.ratio}:1 fg ${w.fg} on ${w.bg}`));
  }
  if (r.layout) printLayout(r.layout, r.verdict);
  if (r.inventory) printInventory(r.inventory);
  if (r.palette) printPalette(r.palette);
}

function printLayout(l, valueVerdict) {
  console.log(`\nLAYOUT ${l.note || l.verdict}  (score ${l.score})`);
  l.issues.forEach((i) => console.log(`- ${i.id}: ${i.detail} -> fix ${i.fix} -> recipe: ${i.recipe}`));
  if (!l.issues.length) console.log('- no layout issues');
  if (l.verdict === 'ARRANGE' && l.jsxIds.length) console.log(`also needs JSX: ${l.jsxIds.join(', ')} (rework)`);
  if (l.verdict === 'ARRANGE' && l.jsxIds.length) console.log('NEXT: /dashboardlify:arrange (CSS) then /dashboardlify:rework for the JSX-only issues');
  else if (l.verdict === 'ARRANGE') console.log('NEXT: /dashboardlify:arrange (CSS-only layout pass)');
  else if (l.jsxIds.length) console.log('NEXT: layout is fine; the JSX-only issues above need /dashboardlify:rework');
  else if (LAYOUT_RANK[l.verdict] > VERDICT_RANK[valueVerdict]) console.log(`NEXT: ${NEXT_TEXT[l.verdict]}`);
}

function printInventory(inv) {
  const seen = INV_TYPES.filter((t) => inv.counts[t]).map((t) => `${t} ${inv.counts[t]}`);
  console.log(`\nINVENTORY ${inv.verdict}  (${seen.join(', ') || 'no components found'})`);
  inv.fit.forEach((f) => console.log(`- ${f.rule}: ${f.type} "${f.label}" ${f.detail} -> ${f.suggest}`));
  if (!inv.fit.length) console.log('- every component matches the shape of its data');
  const s = inv.status;
  if (s) {
    console.log(`\nSTATUS ${s.verdict}  (${s.labels}${s.capped ? '+' : ''} labels, ${s.words.length} words, ${s.styles} styles, ${s.distinctColors} colours)`);
    s.issues.forEach((i) => console.log(`- ${i.rule}: ${i.detail} -> ${i.fix === 'css' ? 'CSS fix (Mode B)' : 'markup fix (Mode C brief)'} (${i.ref})`));
  }
}

const VISIBLE_TEXT = { VISIBLE: '(>=8%)', SUBTLE: '(3-8%)', 'NOT VISIBLE': '(<3%)' };
function printVisibleChange(r) {
  if (r.visibleChangeError) return console.error(`--visible-change: ${r.visibleChangeError}`);
  const v = r.visibleChange;
  if (v.verdict === 'INCOMPARABLE') return console.log(`\nVISIBLE CHANGE: INCOMPARABLE (before is ${v.before}, now is ${v.after}: re-run with the same --width/--height)`);
  console.log(`\nVISIBLE CHANGE ${v.percent}% of the first screen changed: ${v.verdict} ${VISIBLE_TEXT[v.verdict]}  (mean delta ${v.meanDelta}/255)`);
  if (v.cropped) console.log(`note: heights differ (before ${v.before}, after ${v.after}); compared the shared top area, nothing was scaled`);
  if (v.verdict === 'NOT VISIBLE') console.log('This pass did not visibly change the screen. Check specificity/import order of the overrides, or run /dashboardlify:arrange / rework for layout.');
}

function printPalette(p) {
  console.log(`\nPALETTE ${p.verdict}`);
  const d = p.domain;
  console.log(`  domain    ${d.name} (confidence ${d.confidence})${d.signals.length ? ' signals: ' + d.signals.join(', ') : ''}`);
  console.log(`  primary   ${p.primary ? `${p.primary.hex} (${p.primary.source})` : 'none (no chromatic accent)'}`);
  console.log(`  accents   ${p.accents.length ? p.accents.map((a) => `${a.hex} ${a.name} h${a.hue} ${Math.round(a.share * 100)}%`).join(', ') : '-'}`);
  console.log(`  neutrals  tint chroma ${p.neutrals.chroma} hue ${p.neutrals.hue}, cohesive ${p.neutrals.cohesive ? 'yes' : 'no'}`);
  if (p.issues.length) { console.log('  issues'); p.issues.forEach((i) => console.log(`    - ${i}`)); }
  if (p.verdict === 'KEEP') {
    console.log('  KEEP: colours are cohesive, do not recolour');
    if (p.illegible > 0) console.log(`  KEEP, but ${p.illegible} text pairs are illegible: fix contrast by moving the fill/text step, not the hue`);
    return;
  }
  const s = p.suggested;
  if (s.source !== 'curated') {
    console.log('  Suggested tokens (generated):');
    Object.entries(s.vars).forEach(([k, v]) => console.log(`    ${k}: ${v};`));
    s.why.forEach((w) => console.log(`  why: ${w}`));
    return;
  }
  console.log(`  Suggested (curated: ${s.domain}): accent ${s.accent}, neutral ${s.neutral}${s.alt.length ? `; alternates ${s.alt.join(', ')}` : ''}`);
  if (s.brand) console.log(`  brand     ${s.brand.hex}${s.brand.fitted !== s.brand.hex ? ` -> light --accent-base ${s.brand.fitted} (minimal fit for white text)` : ' (passes with white text; the matched scale zones are used)'}`);
  console.log(`  recommended: ${s.recommended} (${s.recommendedWhy})`);
  s.options.forEach((o) => {
    console.log(`\n  Option ${o.id}${o.id === s.recommended ? ' [recommended]' : ''}: ${o.name}`);
    console.log(`    harmony ${o.harmony}`);
    console.log(`    use     ${o.use}`);
    for (const mode of ['light', 'dark']) {
      console.log(`    ${mode}:`);
      Object.entries(o[mode].tokens).forEach(([k, v]) => console.log(`      ${k}: ${v};`));
    }
    console.log(`    ratios  light min ${o.ratios.light}, dark min ${o.ratios.dark} (min ${o.ratios.min})`);
  });
  s.notes.forEach((n) => console.log(`  note: ${n}`));
  s.why.forEach((w) => console.log(`  why: ${w}`));
}

function aggregate(results) {
  const ok = results.filter((r) => !r.error);
  const headline = {};
  for (const r of ok) for (const [k, v] of Object.entries(r.headline)) headline[k] = (headline[k] || 0) + v;
  const V = ok.reduce((a, r) => a + r.violations, 0);
  headline.score = Math.min(100, Math.round((100 * V) / Math.max(headline.elements || 0, MIN_ELEMENT_BASE)));
  const verdict = ok.reduce((w, r) => (VERDICT_RANK[r.verdict] > VERDICT_RANK[w] ? r.verdict : w), 'LEAVE');
  const pals = ok.filter((r) => r.palette);
  const palette = pals.length ? {
    verdict: pals.reduce((w, r) => (PAL_RANK[r.palette.verdict] > PAL_RANK[w] ? r.palette.verdict : w), 'KEEP'),
    perTarget: pals.map((r) => ({ target: r.target, verdict: r.palette.verdict })),
  } : null;
  const lays = ok.filter((r) => r.layout);
  const layout = lays.length ? {
    verdict: lays.reduce((w, r) => (LAYOUT_RANK[r.layout.verdict] > LAYOUT_RANK[w] ? r.layout.verdict : w), 'OK'),
    score: lays.reduce((a, r) => a + r.layout.score, 0),
    perTarget: lays.map((r) => ({ target: r.target, verdict: r.layout.verdict, score: r.layout.score })),
  } : null;
  const invs = ok.filter((r) => r.inventory);
  const inventory = invs.length ? {
    verdict: invs.some((r) => r.inventory.verdict === 'SWAP') ? 'SWAP' : 'FIT',
    perTarget: invs.map((r) => ({ target: r.target, verdict: r.inventory.verdict })),
    ...(invs.some((r) => r.inventory.status) ? { status: invs.filter((r) => r.inventory.status).reduce((w, r) => (STATUS_RANK[r.inventory.status.verdict] > STATUS_RANK[w] ? r.inventory.status.verdict : w), 'NONE') } : {}),
  } : null;
  return { targets: ok.length, violations: V, score: headline.score, verdict, headline, palette, layout, ...(inventory ? { inventory } : {}) };
}

function printCompare(before, after, targets, palAfter, layAfter, invAfter) {
  const b = before.aggregate?.headline || before.headline || {};
  const prev = (before.targets || []).filter((t) => !t.error).map((t) => t.target).sort().join('\n');
  if (prev !== [...targets].sort().join('\n')) console.log('\nWARNING: before and after cover different page sets; counts are summed over different pages.');
  const rows = Object.keys(after).map((k) => [k, b[k] ?? '-', after[k], b[k] === undefined ? '-' : (after[k] - b[k] > 0 ? '+' : '') + (after[k] - b[k])]);
  console.log('\n== Compare (before -> after) ==');
  console.log(table(rows, ['metric', 'before', 'after', 'delta']));
  // Decide on uncapped violations: the 0-100 score saturates and would hide progress.
  const bv = b.violations ?? b.score ?? after.violations;
  const d = after.violations - bv;
  const lb = before.aggregate?.layout;
  if (layAfter && lb) console.log(`\nLayout: ${lb.verdict} (score ${lb.score}) -> ${layAfter.verdict} (score ${layAfter.score})`);
  if (palAfter) console.log(`\nPalette: ${before.aggregate?.palette?.verdict ?? '-'} -> ${palAfter}`);
  const ib = before.aggregate?.inventory;
  if (invAfter && ib) {
    const swaps = (a) => a.perTarget.filter((t) => t.verdict === 'SWAP').length;
    const n = invAfter.perTarget.length;
    console.log(`Inventory: ${swaps(ib)}/${ib.perTarget.length} SWAP (${ib.verdict}) -> ${swaps(invAfter)}/${n} SWAP (${invAfter.verdict})`);
    if (ib.status && invAfter.status) console.log(`Status: ${ib.status} -> ${invAfter.status}`);
  }
  console.log(`\nOverall: ${d < 0 ? 'IMPROVED' : d > 0 ? 'WORSE' : 'UNCHANGED'} (violations ${b.violations ?? '-'} -> ${after.violations}, score ${b.score ?? '-'} -> ${after.score})`);
}

// ---- Source mode ------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor', 'examples']);
const SRC_EXT = new Set(['.css', '.scss', '.less', '.html', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte']);
const MARKUP_EXT = new Set(['.jsx', '.tsx', '.html', '.vue', '.svelte']);

const RULES = [
  { id: 'radiusOver8', res: [/border-radius:\s*(9|[1-9]\d+)(\.\d+)?px/, /\brounded-(xl|2xl|3xl)\b/] },
  { id: 'boxShadow', res: [/box-shadow\s*:/, /\bshadow-(lg|xl|2xl)\b/] },
  { id: 'coloredGlow', res: [/shadow[^;]*rgba?\(\s*(1[0-9]{2}|2[0-9]{2})\s*,\s*([0-9]{1,2})\s*,\s*(1[0-9]{2}|2[0-9]{2})/] },
  { id: 'gradient', res: [/gradient\(/, /bg-gradient|from-(purple|violet|indigo|pink|fuchsia)/] },
  { id: 'uppercase', res: [/text-transform:\s*uppercase|\buppercase\b/] },
  { id: 'offScaleSpacing', res: [/(padding|margin|gap|top|left|right|bottom)[^;{}]*\b(10|14|18|22|26|30)px/, /\b[pm][trblxy]?-\[\d+px\]/] },
  { id: 'fontWeightHeavy', res: [/font-weight:\s*(700|800|900|bold)/, /\bfont-(bold|extrabold|black)\b/] },
  { id: 'transitionAll', res: [/transition:\s*all|transition-all/] },
  {
    id: 'slowMotion',
    test: (line) => (/(transition|animation)[^;]*\b(0?\.[3-9]\d*|[1-9](\.\d+)?)s\b/.test(line) && !/var\(--dur-/.test(line))
      || [...line.matchAll(/\bduration-(\d{3,4})\b/g)].some((m) => +m[1] >= 300),
  },
  { id: 'emojiInSource', markupOnly: true, res: [/\p{Extended_Pictographic}/u] },
  { id: 'pulse', res: [/animate-pulse|animate-ping|animate-bounce/] },
  { id: 'greeting', res: [/Welcome back|👋/] },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.includes('.min.')) continue;
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (SRC_EXT.has(path.extname(name)) && st.size < 500 * 1024) yield full;
  }
}

// ---- Source mode: roles, guards, routes (second pass, separate from RULES so slop numbers stay unchanged) ------
// Answers "who sees this dashboard?" before a redesign: which roles exist, what guards them, which routes are guarded.
// ponytail: regex only, no AST. Guard scope is JSX nesting or the next few lines of a route object; upgrade to a parser if configs get exotic.
const GUARD_NAMES = ['ProtectedRoute', 'PrivateRoute', 'RequireAuth', 'RoleGuard', 'AuthGuard'];
const GUARD_OPEN = new RegExp(`<(${GUARD_NAMES.join('|')})\\b`, 'g');
const GUARD_CLOSE = new RegExp(`</(${GUARD_NAMES.join('|')})>`, 'g');
const GUARD_SELF = new RegExp(`<(${GUARD_NAMES.join('|')})\\b[^>]*/>`, 'g');
const GUARD_OTHER = [['canActivate', /\bcanActivate\b/], ['meta', /\bmeta\??\.(roles|requiresAuth)\b|\brequiresAuth\s*:/], ['UseGuards', /@UseGuards\(/]];
const ROLE_WORDS = ['Admin', 'SuperAdmin', 'Superuser', 'Manager', 'Owner', 'Editor', 'Viewer', 'Moderator', 'Staff', 'Operator', 'Analyst'];
const ROLE_FLAG = new RegExp(`\\bis(${ROLE_WORDS.join('|')})\\b`, 'g');
const ROLE_PATTERNS = [
  /\brole\s*[!=]==?\s*['"`]([\w-]+)['"`]/g,
  /\bhas(?:Any)?Role\(\s*['"`]([\w-]+)['"`]/g,
  /\broles\??\.(?:includes|some)\(\s*['"`]([\w-]+)['"`]/g,
];
const ROLE_LIST = /\b(?:roles?|allowedRoles|allowRoles|hasAnyRole|hasRole)\b\s*[:=(]\s*\{?\s*\[([^\]]*)\]/g;
const CAN_CALL = /\bcan\(\s*['"`]([\w:.-]+)['"`]/g;
const ROUTE_RES = [/<Route\b[^>]*?\bpath=\{?\s*['"`]([^'"`]+)['"`]/, /^\s*path=\{?\s*['"`]([^'"`]+)['"`]/, /\bpath\s*:\s*['"`]([^'"`]+)['"`]/];
const GUARD_WINDOW = 5; // lines after a route path that still belong to the same route object
const literals = (s) => [...s.matchAll(/['"`]([\w-]+)['"`]/g)].map((m) => m[1]);

function scanRoles(file, content, base, acc) {
  const rel = path.relative(base, file);
  const at = (i) => `${rel}:${i + 1}`;
  const ARIA_ROLES = new Set('button dialog tab tabpanel tablist link menu menuitem alert img presentation none listbox option checkbox radio switch tooltip navigation region grid row cell textbox combobox status separator banner main form search article list listitem heading group toolbar'.split(' '));
  const addName = (name, i) => {
    if (ARIA_ROLES.has(name)) return; // ponytail: ARIA stoplist; an app with a real 'editor' or 'viewer' role still passes, a real role named like an ARIA role is dropped

    const n = acc.names.get(name) || { name, hits: 0, examples: [] };
    n.hits++;
    if (n.examples.length < 3) n.examples.push(`${at(i)} | ${content[i].trim().slice(0, 100)}`);
    acc.names.set(name, n);
  };
  const fileHasMeta = content.some((l) => GUARD_OTHER[1][1].test(l));
  if (/^middleware\.[tj]s$/.test(path.basename(file))) acc.guards.push({ at: `${rel}:1`, kind: 'middleware' });
  // Next.js file routes: app/**/page.* and pages/**
  const parts = rel.split(path.sep);
  const ai = parts.lastIndexOf('app'), pi = parts.lastIndexOf('pages');
  if (/^page\.[jt]sx?$/.test(parts[parts.length - 1]) && ai >= 0) {
    const segs = parts.slice(ai + 1, -1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'));
    acc.routes.push({ path: '/' + segs.join('/'), file: rel, line: 1, guarded: false, roles: [], inFile: true, fileIdx: acc.files });
  } else if (pi >= 0 && /\.[jt]sx?$/.test(rel) && !parts.slice(pi + 1).some((s) => s.startsWith('_'))) {
    const segs = parts.slice(pi + 1).map((s) => s.replace(/\.[jt]sx?$/, '')).filter((s) => s !== 'index');
    acc.routes.push({ path: '/' + segs.join('/'), file: rel, line: 1, guarded: false, roles: [], inFile: true, fileIdx: acc.files });
  }
  const fileGuards = [];
  const stack = []; // roles of each open guard element
  let inEnum = false, inType = false;
  content.forEach((line, i) => {
    // role names
    if (inEnum) {
      if (/\}/.test(line)) inEnum = false;
      const lit = literals(line.split('=').slice(1).join('='));
      if (lit.length) lit.forEach((n) => addName(n.toLowerCase(), i));
      else { const m = line.match(/^\s*(\w+)\s*[,}]?\s*$/); if (m) addName(m[1].toLowerCase(), i); }
    } else if (inType) {
      if (/^\s*\|/.test(line)) literals(line).forEach((n) => addName(n.toLowerCase(), i)); else inType = false;
    }
    if (/\benum\s+\w*Role\w*\s*\{/.test(line)) { inEnum = !/\}/.test(line.split('{').slice(1).join('{')); (line.split('{').slice(1).join('{').split('}')[0].match(/=\s*['"`]([\w-]+)/g) || []).forEach((m) => addName(m.replace(/^=\s*['"`]/, '').toLowerCase(), i)); }
    const tm = line.match(/\btype\s+\w*Role\w*\s*=(.*)$/);
    if (tm) { literals(tm[1]).forEach((n) => addName(n.toLowerCase(), i)); inType = !/;\s*$/.test(line) || /\|\s*$/.test(line); }
    for (const re of ROLE_PATTERNS) for (const m of line.matchAll(re)) addName(m[1].toLowerCase(), i);
    for (const m of line.matchAll(ROLE_LIST)) literals(m[1]).forEach((n) => addName(n.toLowerCase(), i));
    for (const m of line.matchAll(ROLE_FLAG)) addName(m[1].toLowerCase(), i);
    for (const m of line.matchAll(CAN_CALL)) addName('can:' + m[1], i);
    // guards
    if (!/^\s*(import|export\s+\{)/.test(line)) {
      for (const m of line.matchAll(GUARD_OPEN)) { acc.guards.push({ at: at(i), kind: m[1] }); fileGuards.push(i); }
      for (const [kind, re] of GUARD_OTHER) if (re.test(line)) { acc.guards.push({ at: at(i), kind }); fileGuards.push(i); }
      if (fileHasMeta && /\.beforeEach\(/.test(line)) acc.guards.push({ at: at(i), kind: 'beforeEach' });
    }
    // route + guard scope
    const open = (line.match(GUARD_OPEN) || []).length, close = (line.match(GUARD_CLOSE) || []).length, self = (line.match(GUARD_SELF) || []).length;
    const rm = ROUTE_RES.map((re) => line.match(re)).find(Boolean);
    if (rm) {
      let guarded = stack.length > 0 || open > 0;
      const roles = new Set(stack.flat());
      const own = (l) => { for (const m of l.matchAll(ROLE_LIST)) literals(m[1]).forEach((n) => roles.add(n.toLowerCase())); };
      own(line);
      for (let j = i; j <= i + GUARD_WINDOW && j < content.length; j++) {
        if (j > i && ROUTE_RES.some((re) => re.test(content[j]))) break;
        if (GUARD_OTHER.some(([, re]) => re.test(content[j]))) { guarded = true; own(content[j]); }
        if (j > i && /\broles\s*:/.test(content[j])) own(content[j]);
      }
      acc.routes.push({ path: rm[1], file: rel, line: i + 1, guarded, roles: [...roles] });
    }
    const net = open - close - self;
    if (net > 0) { const r = []; for (let j = i; j < Math.min(i + 3, content.length); j++) for (const m of content[j].matchAll(ROLE_LIST)) literals(m[1]).forEach((n) => r.push(n.toLowerCase())); for (let k = 0; k < net; k++) stack.push(r); }
    else for (let k = 0; k < -net; k++) stack.pop();
  });
  // file routes are guarded by a guard in the same file
  acc.routes.filter((r) => r.inFile && r.fileIdx === acc.files).forEach((r) => { if (fileGuards.length) r.guarded = true; });
}

function finishRoles(acc) {
  const names = [...acc.names.values()].sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
  const known = new Set(names.filter((n) => !n.name.startsWith('can:')).map((n) => n.name));
  const routes = acc.routes.map(({ inFile, fileIdx, ...r }) => {
    const hit = r.path.toLowerCase().split('/').filter((s) => known.has(s)); // /admin/... is for admin
    return { ...r, guarded: r.guarded || hit.length > 0, roles: [...new Set([...r.roles, ...hit])] };
  });
  return { names, guards: acc.guards, routes };
}

function printRoles(R) {
  if (!R.names.length && !R.guards.length && !R.routes.length) return console.log('\nROLES none found in source: ask the user');
  const g = R.routes.filter((r) => r.guarded).length;
  console.log(`\nROLES ${R.names.length ? R.names.map((n) => n.name).join(', ') : 'none named'} | guards ${R.guards.length} | routes ${R.routes.length} (${g} guarded)`);
  if (R.routes.length) console.log(table(R.routes.map((r) => [r.path, `${r.file}:${r.line}`, r.guarded ? 'guarded' : 'open', r.roles.join(', ') || '-']), ['route', 'at', 'access', 'roles']));
}

function scanSource(dir) {
  const single = statSync(dir).isFile();
  const base = single ? path.dirname(dir) : dir;
  const stats = Object.fromEntries(RULES.map((r) => [r.id, { hits: 0, examples: [] }]));
  const perFile = new Map();
  const racc = { names: new Map(), guards: [], routes: [], files: 0 };
  let lines = 0, files = 0;
  for (const file of single ? [dir] : walk(dir)) {
    files++;
    const ext = path.extname(file);
    const content = readFileSync(file, 'utf8').split('\n');
    lines += content.length;
    racc.files = files;
    scanRoles(file, content, base, racc);
    content.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.markupOnly && !MARKUP_EXT.has(ext)) continue;
        const hit = rule.test ? rule.test(line) : rule.res.some((re) => re.test(line));
        if (!hit) continue;
        const s = stats[rule.id];
        s.hits++;
        perFile.set(file, (perFile.get(file) || 0) + 1);
        if (s.examples.length < 3) s.examples.push(`${path.relative(base, file)}:${i + 1} | ${line.trim().slice(0, 100)}`);
      }
    });
  }
  const total = Object.values(stats).reduce((a, s) => a + s.hits, 0);
  const per1000 = lines ? Math.round((10 * 1000 * total) / lines) / 10 : 0;
  const verdict = per1000 < SRC_LEAVE_BELOW ? 'LEAVE' : per1000 > SRC_REWORK_ABOVE ? 'REWORK' : 'TIGHTEN';
  const topFiles = [...perFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => ({ file: path.relative(base, f), hits: n }));
  return { dir, files, lines, rules: stats, total, per1000, verdict, topFiles, roles: finishRoles(racc) };
}

function printSource(r) {
  console.log(`\n== source scan: ${r.dir} (${r.files} files, ${r.lines} lines) ==`);
  console.log(table(Object.entries(r.rules).map(([id, s]) => [id, s.hits]), ['rule', 'hits']));
  for (const [id, s] of Object.entries(r.rules)) {
    if (s.examples.length) { console.log(`\n${id}:`); s.examples.forEach((e) => console.log('  ' + e)); }
  }
  console.log('\nTop files:');
  r.topFiles.forEach((f) => console.log(`  ${f.hits}  ${f.file}`));
  console.log(`\nSource estimate: ${r.per1000} hits per 1000 lines  VERDICT ${r.verdict}  (${VERDICT_TEXT[r.verdict]})`);
  printRoles(r.roles);
}

// ---- CLI --------------------------------------------------------------------
function parseArgs(argv) {
  const o = { targets: [], width: 1440, dark: false, noPalette: false, combo: null, height: 900, noLayout: false, shot: null, visibleChange: null, json: null, compare: null, src: null, help: false, inventory: false, status: false, storageState: null, block: [], auth: null };
  const val = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--dark') o.dark = true;
    else if (a === '--no-palette') o.noPalette = true;
    else if (a === '--combo') {
      o.combo = val(i++, a);
      if (!COMBO_IDS.includes(o.combo)) throw new Error('--combo must be calm, paper or brand');
    } else if (a === '--json') o.json = val(i++, a);
    else if (a === '--compare') o.compare = val(i++, a);
    else if (a === '--src') o.src = val(i++, a);
    else if (a === '--no-layout') o.noLayout = true;
    else if (a === '--inventory') o.inventory = true;
    else if (a === '--status') o.status = o.inventory = true;
    else if (a === '--storage-state') o.storageState = val(i++, a);
    else if (a === '--block') o.block.push(val(i++, a));
    else if (a === '--shot') o.shot = val(i++, a);
    else if (a === '--visible-change') o.visibleChange = val(i++, a);
    else if (a === '--height') o.height = parseInt(val(i++, a), 10);
    else if (a === '--width') o.width = parseInt(val(i++, a), 10);
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else o.targets.push(a);
  }
  if (!Number.isFinite(o.width) || o.width < 200) throw new Error('--width must be a number >= 200');
  if (!Number.isFinite(o.height) || o.height < 200) throw new Error('--height must be a number >= 200');
  return o;
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n\n' + USAGE); process.exit(2); }
  COMBO_ONLY = o.combo;
  if (o.help || (!o.targets.length && !o.src)) {
    console.log(USAGE);
    process.exit(o.help ? 0 : 2);
  }
  if (o.src) {
    if (!existsSync(o.src)) { console.error(`--src: no such file or directory ${o.src}`); process.exit(2); }
    const r = scanSource(path.resolve(o.src));
    printSource(r);
    if (o.json) writeFileSync(o.json, JSON.stringify({ mode: 'source', ...r }, null, 2));
    return;
  }
  if (o.visibleChange) {
    if (o.targets.length !== 1) { console.error('--visible-change needs exactly one target'); process.exit(2); }
    if (!existsSync(o.visibleChange)) { console.error(`--visible-change: no such file ${o.visibleChange}`); process.exit(2); }
    if (o.shot && path.resolve(o.shot) === path.resolve(o.visibleChange)) { console.error('--shot and --visible-change point to the same file; the new shot would overwrite before.png. Use a different --shot path.'); process.exit(2); }
  }
  if (o.storageState) {
    if (!existsSync(o.storageState)) { console.error(`--storage-state: no such file ${o.storageState}`); process.exit(2); }
    try { o.auth = loadAuth(o.storageState); } catch (e) { console.error(`--storage-state: ${e.message}`); process.exit(2); }
    console.log(`auth: ${o.auth.cookies.length} cookies, ${o.auth.keys} storage keys`);
  }
  const results = await runBrowser(o.targets, o);
  const errs = results.filter((r) => r.error);
  const oks = results.filter((r) => !r.error);
  if (!oks.length) {
    errs.forEach((r) => console.error(`ERROR ${r.target}: ${r.error}`));
    process.exit(1);
  }
  oks.forEach((r) => { printTarget(r); if (r.shot) console.log(`\nScreenshot saved: ${r.shot}`); });
  const agg = aggregate(results);
  if (oks.length > 1) console.log(`\n== Aggregate (${agg.targets} targets) ==\nSCORE ${agg.score}  VERDICT ${agg.verdict}  (worst verdict; counts summed)`);
  if (oks.length > 1 && agg.layout) console.log(`LAYOUT ${agg.layout.verdict}  (worst; score summed ${agg.layout.score}; ${agg.layout.perTarget.map((t) => `${path.basename(t.target)}: ${t.verdict}`).join(', ')})`);
  if (oks.length > 1 && agg.inventory) console.log(`INVENTORY ${agg.inventory.verdict}  (${agg.inventory.perTarget.map((t) => `${path.basename(t.target)}: ${t.verdict}`).join(', ')})`);
  if (agg.palette) console.log(`PALETTE ${agg.palette.verdict}  (worst; ${agg.palette.perTarget.map((t) => `${path.basename(t.target)}: ${t.verdict}`).join(', ')})`);
  if (o.json) writeFileSync(o.json, JSON.stringify({ mode: 'browser', width: o.width, dark: o.dark, targets: results, aggregate: agg, ...(oks[0].visibleChange ? { visibleChange: oks[0].visibleChange } : {}) }, null, 2));
  if (o.compare) {
    try { printCompare(JSON.parse(readFileSync(o.compare, 'utf8')), agg.headline, oks.map((r) => r.target), agg.palette?.verdict, agg.layout, agg.inventory); }
    catch (e) { console.error(`--compare: ${e.message}`); process.exit(2); }
  }
  if (o.visibleChange) printVisibleChange(oks[0]);
  if (oks.some((r) => r.visibleChangeError || r.visibleChange?.verdict === 'INCOMPARABLE')) process.exitCode = 1;
  if (errs.length) {
    console.error('\nErrors:');
    errs.forEach((r) => console.error(`  ${r.target}: ${r.error}`));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
