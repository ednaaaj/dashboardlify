# Layout recipes (Mode D: ARRANGE)

CSS-only fixes for the issues in the scan's LAYOUT block. One section per issue id. Each recipe lists the symptom, how the scan detects it, the numeric target, a before/after snippet and when it needs JSX.

Override patterns used below (pick the one that fits the stack):
- Plain CSS: edit the rule in place.
- CSS modules: edit the `.module.css` rule; keep the class name. Class names are hashed, so never target them from another file; use a late-imported bridge file with an attribute selector such as `[class*="Hero_root"]` only if the module cannot be edited.
- MUI v4: raise specificity with `body .MuiAppBar-root` or `#root .MuiCard-root`; JSS injects styles late, so equal specificity loses.
- Bootstrap 4: use `body .navbar` or `.container-fluid .card`; load the bridge file after `bootstrap.css`.
- MUI v4 styles: `makeStyles`/`withStyles`/`styled` style objects are CSS, so editing the style object in place is CSS-only and allowed. Never target generated JSS class names (`[class*=jss]`); they change in production. Prefer the component's own style object or a stable wrapper class, or the `MuiXxx-root` global names (not hashed) with raised specificity.
- Bootstrap 4: override with a later-loaded stylesheet using prefixed selectors such as `.page .card`, not `!important`.
- `!important` only if the original code already uses it for that property.

Children must be DIRECT children of the grid parent for reflow recipes. If a wrapper div sits between, the recipe cannot work in CSS; mark it "needs JSX".

## topbar-height

Symptom: a tall top bar (80px or more) with a large logo pushes content down.
Detected by: measured height of the header or fixed bar at the top of the page.
Target: 48-64px. Logo `max-height` 28-36px, `object-fit: contain`. Icon buttons 32-36px.

```css
/* before */
.topbar { height: 96px; padding: 24px; }
.topbar img.logo { height: 64px; }
.topbar .icon-btn { width: 48px; height: 48px; }

/* after */
.topbar { height: 56px; padding: 0 16px; }
.topbar img.logo { height: auto; max-height: 32px; width: auto; object-fit: contain; }
.topbar .icon-btn { width: 36px; height: 36px; }

/* MUI v4 */
body .MuiAppBar-root .MuiToolbar-root { min-height: 56px; }
/* Bootstrap 4 */
body .navbar { min-height: 56px; padding-top: 0; padding-bottom: 0; }
```

Needs JSX when: the logo size is an inline `style` or an `<img width>` attribute that CSS cannot beat without `!important`, or the bar is built from nested fixed-height wrappers.

## hero-height

Symptom: a welcome banner or hero takes a quarter of the first screen before any data shows.
Detected by: height of the first large banner region, as a share of the viewport.
Target: cap to 120-160px (96 minimum), shaped as a horizontal band (text left, image right).

```css
/* before */
.hero { display: block; padding: 64px 32px; min-height: 280px; }
.hero img { display: block; width: 100%; }

/* after */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 16px 24px;
  min-height: 0;
  max-height: 160px;
  overflow: hidden;
}
.hero img { max-height: 112px; width: auto; object-fit: contain; }
@media (max-width: 1100px) { .hero img { display: none; } } /* decorative image */
```

Plain heading sizes inside the hero drop to the page title size (20-24).
Needs JSX when: the hero should collapse or dismiss after the first visit (state is needed), or the image is the only child and carries the content.

## equal-weight-grid

Symptom: six or more cards of the same size and style, so nothing reads as primary.
Detected by: sibling cards in one container with near-identical width and height.
Target: a KPI strip first (one row of 3-4 small cards), then a 2fr / 1fr split below: the main region on the left, a secondary column on the right. A featured card spans 2 columns.

```css
/* before */
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

/* after: named areas (works when the six cards are direct children) */
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.cards > :nth-child(-n+4) { grid-column: span 1; }          /* KPI strip */
.cards > :nth-child(5)    { grid-column: span 3; }          /* main region */
.cards > :nth-child(6)    { grid-column: span 1; }          /* side column */
@media (max-width: 900px) { .cards { grid-template-columns: 1fr; } .cards > * { grid-column: auto; } }
```

Fallback with named areas, when the card order matches the target:

```css
.cards {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas: "kpi kpi" "main side";
  gap: 16px;
}
```

Use `order` only to pull a key card forward, and only for cards that are not sequence-critical; DOM order stays the reading order for screen readers. Note each use. A featured card: `grid-column: span 2`.
MUI v4 Grid and Bootstrap 4 columns: the `col-md-4` classes fix the width, so set `flex: 1 1 0; max-width: none` on the specific item with a `body` prefix, or move to the CSS grid on the row container.
Needs JSX when: the cards are not direct children of one container, are wrapped in per-card column divs you cannot restyle, or the order must change in the DOM.

## icon-tiles

Symptom: every card begins with the same large coloured icon tile.
Detected by: repeated square icon containers with a background and radius across cards.
Target: no tile background or radius; a 16px icon inline before the title; accent colour only for the primary action.

```css
/* before */
.card .icon-tile { width: 48px; height: 48px; border-radius: 12px; background: #6c5ce7; display: grid; place-items: center; }
.card .icon-tile svg { width: 24px; height: 24px; color: #fff; }

/* after */
.card .icon-tile { width: auto; height: auto; border-radius: 0; background: none; display: inline-flex; margin-right: 8px; }
.card .icon-tile svg { width: 16px; height: 16px; color: var(--text-muted); }
```

Needs JSX when: the tile is a separate element that sits outside the title row and cannot move inline with CSS alone (use `display: contents` or flex on the header first; if that fails, mark it).

## placeholder-widgets

Symptom: widgets that show only "--", "0" or an empty box.
Detected by: widgets whose text is a placeholder or empty. JSX-only issue; CSS can only shrink them.
Target: an empty-state line plus an action, or the widget removed when it has no data.

```css
/* css-only mitigation */
.widget--empty { min-height: 0; padding: 12px 16px; color: var(--text-muted); background: transparent; }
.widget--empty .value { font-size: 14px; font-weight: 400; }
```

Needs JSX: always, for the real fix. Render `No payouts yet` with a `Create payout` action, or hide the widget until it has data.

## truncated-text

Symptom: titles and cells cut off with no way to read them.
Detected by: elements where scrollWidth exceeds clientWidth or line clamping hides text.
Target: titles clamp to 2 lines; table cells use nowrap with ellipsis and a max-width; or the column is widened.

```css
/* before */
.card-title { white-space: nowrap; overflow: hidden; width: 120px; }

/* after: clamp to 2 lines */
.card-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; width: auto; }

/* table cells */
/* table cells with ellipsis are an intended pattern; the scan does not count them as truncation */
td.name { max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

Add a `title` attribute so the full text is available on hover. That is a JSX change; without it, widen the column instead.
Needs JSX when: the full text must be reachable (title attribute, tooltip component).

## data-above-fold

Symptom: the first screen holds few numbers, rows or charts.
Detected by: count of data items (numbers, rows, chart marks) inside the first viewport height (default 900px).
Target: 8 or more data items above the fold. Get there by reducing the hero, padding and row height (40px), not by deleting data.

```css
/* before */
.page { padding: 48px; }
table td { height: 64px; padding: 20px 16px; }

/* after */
.page { padding: 24px; }
table td { height: 40px; padding: 8px 16px; }
```

Needs JSX when: data sits below placeholders or sections that must be reordered in the DOM.

## card-padding

Symptom: cards with 32px or more of inner padding waste space.
Detected by: computed padding on card containers.
Target: 16-20px.

```css
/* before */
.card { padding: 32px; }

/* after */
.card { padding: 16px; }
/* MUI v4 */   body .MuiCardContent-root { padding: 16px; }
/* Bootstrap 4 */ body .card-body { padding: 16px; }
```

Needs JSX when: padding is set by an inline style.

## sidebar-width

Symptom: a wide sidebar (280px or more) takes space from the data.
Detected by: width of the left navigation.
Target: 240px expanded; 56px collapsed.

```css
/* before */
.sidebar { width: 320px; }

/* after */
.sidebar { width: 240px; }
.main { margin-left: 240px; }          /* keep in step with the sidebar if it is offset by margin */
@media (max-width: 1024px) { .sidebar { width: 56px; } .main { margin-left: 56px; } }
/* MUI v4 */ body .MuiDrawer-paper { width: 240px; }
```

Needs JSX when: the width is a JS-computed inline style or a prop on a drawer component.

## content-width

Symptom: content stretches edge to edge on wide screens, or is squeezed into a narrow strip.
Detected by: width of the main content wrapper at 1440.
Target: max-width 1280, centred.

```css
/* before */
.content { width: 100%; }

/* after */
.content { max-width: 1280px; margin-inline: auto; }
/* Bootstrap 4 */ body .container-fluid { max-width: 1280px; }
```

Needs JSX when: there is no single wrapper around the page content.

## Visual hierarchy checklist (home page)

- [ ] One primary region: the biggest or most prominent block answers the page's main question
- [ ] Secondary content in a 2/3 + 1/3 split below or beside it
- [ ] A KPI strip of 3-4 small cards before the primary region
- [ ] Chrome is quiet: top bar 48-64px, no tiles repeated across cards, no banner above the data
- [ ] 8 or more data items visible without scrolling
- [ ] No empty "--" widgets above the fold
- [ ] Only the primary action uses the accent colour
- [ ] Reading order in the DOM matches the visual order, except the noted `order` uses (keep them to cards that are not a sequence)
