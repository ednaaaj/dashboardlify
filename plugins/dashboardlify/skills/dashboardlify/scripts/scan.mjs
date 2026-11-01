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
  --src      static regex scan of a source folder (no browser)
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
        if (page) return { cdp: await connectCdp(page.webSocketDebuggerUrl), cleanup };
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: opts.width, height: 900, deviceScaleFactor: 1, mobile: false });
  if (opts.dark) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await cdp.send('Network.enable');
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
  const r = await cdp.send('Runtime.evaluate', { expression: `(${collect.toString()})(${!opts.noPalette})`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('collector failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

const withTimeout = (p, ms, what) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms).unref()),
]);

function toUrl(t) {
  return /^https?:\/\//i.test(t) ? t : pathToFileURL(path.resolve(t)).href;
}

async function runBrowser(targets, opts) {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Chrome/Chromium not found. Install it or set CHROME_PATH. (--src <dir> mode works without a browser.)');
    process.exit(1);
  }
  const { cdp, cleanup } = await launchChrome(chrome);
  const results = [];
  try {
    for (const t of targets) {
      try {
        if (!/^https?:\/\//i.test(t) && !existsSync(t)) throw new Error(`no such file: ${t}`);
        const raw = await withTimeout(scanPage(cdp, toUrl(t), opts), TARGET_TIMEOUT_MS, t);
        results.push({ target: t, ...analyze(raw) });
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
  if (r.palette) printPalette(r.palette);
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
  return { targets: ok.length, violations: V, score: headline.score, verdict, headline, palette };
}

function printCompare(before, after, targets, palAfter) {
  const b = before.aggregate?.headline || before.headline || {};
  const prev = (before.targets || []).filter((t) => !t.error).map((t) => t.target).sort().join('\n');
  if (prev !== [...targets].sort().join('\n')) console.log('\nWARNING: before and after cover different page sets; counts are summed over different pages.');
  const rows = Object.keys(after).map((k) => [k, b[k] ?? '-', after[k], b[k] === undefined ? '-' : (after[k] - b[k] > 0 ? '+' : '') + (after[k] - b[k])]);
  console.log('\n== Compare (before -> after) ==');
  console.log(table(rows, ['metric', 'before', 'after', 'delta']));
  // Decide on uncapped violations: the 0-100 score saturates and would hide progress.
  const bv = b.violations ?? b.score ?? after.violations;
  const d = after.violations - bv;
  if (palAfter) console.log(`\nPalette: ${before.aggregate?.palette?.verdict ?? '-'} -> ${palAfter}`);
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

function scanSource(dir) {
  const single = statSync(dir).isFile();
  const base = single ? path.dirname(dir) : dir;
  const stats = Object.fromEntries(RULES.map((r) => [r.id, { hits: 0, examples: [] }]));
  const perFile = new Map();
  let lines = 0, files = 0;
  for (const file of single ? [dir] : walk(dir)) {
    files++;
    const ext = path.extname(file);
    const content = readFileSync(file, 'utf8').split('\n');
    lines += content.length;
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
  return { dir, files, lines, rules: stats, total, per1000, verdict, topFiles };
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
}

// ---- CLI --------------------------------------------------------------------
function parseArgs(argv) {
  const o = { targets: [], width: 1440, dark: false, noPalette: false, combo: null, json: null, compare: null, src: null, help: false };
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
    else if (a === '--width') o.width = parseInt(val(i++, a), 10);
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else o.targets.push(a);
  }
  if (!Number.isFinite(o.width) || o.width < 200) throw new Error('--width must be a number >= 200');
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
  const results = await runBrowser(o.targets, o);
  const errs = results.filter((r) => r.error);
  const oks = results.filter((r) => !r.error);
  if (!oks.length) {
    errs.forEach((r) => console.error(`ERROR ${r.target}: ${r.error}`));
    process.exit(1);
  }
  oks.forEach(printTarget);
  const agg = aggregate(results);
  if (oks.length > 1) console.log(`\n== Aggregate (${agg.targets} targets) ==\nSCORE ${agg.score}  VERDICT ${agg.verdict}  (worst verdict; counts summed)`);
  if (agg.palette) console.log(`PALETTE ${agg.palette.verdict}  (worst; ${agg.palette.perTarget.map((t) => `${path.basename(t.target)}: ${t.verdict}`).join(', ')})`);
  if (o.json) writeFileSync(o.json, JSON.stringify({ mode: 'browser', width: o.width, dark: o.dark, targets: results, aggregate: agg }, null, 2));
  if (o.compare) {
    try { printCompare(JSON.parse(readFileSync(o.compare, 'utf8')), agg.headline, oks.map((r) => r.target), agg.palette?.verdict); }
    catch (e) { console.error(`--compare: ${e.message}`); process.exit(2); }
  }
  if (errs.length) {
    console.error('\nErrors:');
    errs.forEach((r) => console.error(`  ${r.target}: ${r.error}`));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
