# Anti-slop

| # | Slop pattern | Why bad | Fix |
|---|---|---|---|
| 1 | Gradient card backgrounds | Noise; competes with data | Flat `--surface`, 1px border |
| 2 | Radius above the preset max on cards | Toy look, wastes corner space | crisp: 8px max cards, 4-6px controls; soft: 12-16 cards, never above 16 |
| 3 | Heavy shadow (`0 20px 40px`) | Floating cards, no hierarchy | 1px border; shadow only on overlays |
| 4 | Colored shadows (blue/purple glow) | Decorative, dirty on light bg | Neutral shadow, alpha <= 0.08 popover, 0.12 modal |
| 5 | Glassmorphism / backdrop-blur panels | Low contrast, GPU cost | Opaque surface |
| 6 | Rainbow chart palette | No meaning, fails colorblind | 1 accent + neutral series; max 6 series (1 accent + 5 categorical), only if categories need it |
| 7 | Every KPI a different color | Color carries no meaning | All neutral; color only for delta up/down |
| 8 | Emoji as icons | Inconsistent render, unprofessional | One icon set, 14/16/20px by density, 1.5px stroke |
| 9 | Huge padding (32-48px in cards) | Fewer rows visible, scroll fatigue | Card `var(--card-pad)`, table cell 8-12px |
| 10 | Centered text in tables | Hard to scan | Left-align text, right-align numbers (tabular-nums) |
| 11 | Border + shadow stacked | Double edge, muddy | Pick border; drop shadow |
| 12 | Purple/blue AI gradient accent | Instant AI-template tell | One flat accent, 1 hue, solid |
| 13 | Oversized headings (h1 40px+) | Pushes content down | Page title 20-24px, section 14-16px |
| 14 | Spinners everywhere | Layout jump, feels slow | Skeleton matching final layout; inline spinner only for button actions |
| 15 | Count-up number tickers | Delays reading, motion noise | Render final value |
| 16 | Staggered row/card entrance | Slow perceived load | Render all at once or fade `--dur-fast` |
| 17 | Bounce / spring easing | Playful, off-tone | `cubic-bezier(0.2, 0, 0, 1)` |
| 18 | Parallax | Disorienting in an app | Remove |
| 19 | Scroll-reveal animations | Content hidden until scrolled | Static content |
| 20 | Animations > 300ms | Feels laggy | 120-220ms (tokens); chart draw-in exception <=300ms |
| 21 | Hover lift (translateY + shadow) on every card | Only interactive things should react | Lift nothing; hover = bg change `--surface-sunken` on clickable items |
| 22 | Spacing 13px, 18px, 22px | Off-scale, uneven rhythm | 4px scale: 4/8/12/16/20/24/32 |
| 23 | Random font sizes (13, 15, 17) | No type hierarchy | 12, 13, 14, 16, 20, 24 (+32 on one featured KPI hero only) |
| 24 | Low-contrast gray text (#9ca3af on white) | Fails WCAG, unreadable | Body >= 4.5:1; secondary text `--text-muted` (>= 4.5:1) |
| 25 | Mixed icon sizes (14/18/22/28) | Ragged alignment | 14 compact / 16 default / 20 comfortable |
| 26 | Too many font weights (300-900) | Muddy hierarchy | 400, 500, 600 |
| 27 | Full-width content on wide screens | Lines too long, eyes travel | Content max-width 1280px (tables may fill, forms 560px (page 960)) |
| 28 | Missing empty state | Blank box looks broken | Icon-less line + 1 action |
| 29 | Missing loading state | Layout shift, blank flash | Skeleton, same dimensions |
| 30 | Missing error state | Silent failure | Message + retry, inline in region |
| 31 | Lorem ipsum / "John Doe" | Hides real width/overflow issues | Realistic data |
| 32 | Round fake numbers (1,000 / 50% / $10,000) | Obvious placeholder | Irregular realistic values (1,284 / 47.3%) |
| 33 | Pill-shaped everything (radius 9999) | Inconsistent shapes | Pills only for avatars, dot status, switches in crisp; in soft preset controls may be pill-shaped |
| 34 | Bold colored sidebar (saturated bg) | Heavy chrome, fights content | Neutral sidebar, accent on active item only |
| 35 | Card inside card inside card | Visual nesting noise | One level; separate with dividers |
| 36 | Icon in colored circle on every card | Decoration | Drop, or bare 16px icon |
| 37 | Dark mode = pure #000 / pure white text | Harsh glare | Bg `#09090b`, fg off-white |
| 38 | `transition: all` | Animates layout props, janky | Movement: transform/opacity only; color/background-color/border-color fades allowed. List properties explicitly |
| 39 | Gradient text headings | Decorative | Solid `--text` |
| 40 | Zebra stripes + borders + hover all at once | Visual noise | Row bottom border + hover bg |
| 41 | Focus ring removed | Keyboard users lost | 2px accent ring, 2px offset |
| 42 | Badges in 6 colors | No semantic meaning | Neutral default; success/warn/danger only |
| 43 | Hero banners / welcome illustrations | Pushes data below fold | One-line greeting or none |
| 44 | Number columns left-aligned, no tabular-nums | Digits don't line up | Right-align + `font-variant-numeric: tabular-nums` |
| 45 | Identical KPI cards, different data, same chart type | Chart type ignores what the metric is | Pick the visual per metric (references/metric-to-visual.md) |
| 46 | Line chart for a single ratio | Implies a trend that is not there | Progress bar or single value with target |
| 47 | Every card has a gradient header | Decoration, repeats on every card | Flat header, 1px divider if needed |
| 48 | Filters and tabs in the content flow | Scrolls away, shifts layout | Pinned right-aligned toolbar |
| 49 | Number and label the same size | No hierarchy, slow to scan | Number `--text-xl` (24) weight 600 (hero), label 12-13 muted; ratio >= 2x |
| 50 | 3+ accent colors | Color stops carrying meaning | One accent; status colors only for status |
| 51 | Too many borders (box-in-box-in-box) | Grid of lines hides the data | Border on the outer container only; dividers inside |
| 52 | Orphan single-value cards that could merge | Wasted space, fragmented reading | Merge into one stat strip or table |
| 53 | Inconsistent number formats ($ placement, decimals) | Looks unreliable, hard to compare | One formatter: same currency position and decimals per column |
| 54 | Truncated text with no tooltip | Information lost | Ellipsis plus title/tooltip with full value |
| 55 | Empty chart with no empty state | Looks broken | "No data for this range" line plus the filter to change |
| 56 | Hero number of 40px+ or any off-scale size (28/36/40) | Off the type scale, shouts over the page title | Hero = `--text-xl` (24) default; `--text-2xl` (32) max, on one featured card |
| 57 | Rounded-square icon tile above every heading | Decoration, pushes the title down | Icon inline left of the title, or drop it |
