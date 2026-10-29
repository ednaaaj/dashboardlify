# PostHog (app)
Sources: PostHog/posthog repo: frontend/src/styles/base.scss, vars; LemonTable.scss; common/tailwind/tailwind.css. Confidence: PUBLISHED for tokens below; layout paddings not read, marked unknown.

## Shell
- Project navbar width 215px, collapsed 45px (PUBLISHED, --project-navbar-width). Topbar height unknown. Page padding unknown. Max-width unknown.
## Spacing / cards
- Table cell padding 0.5rem; row horizontal padding 0.5rem (PUBLISHED). Card padding/gap unknown. Button padding-x 7px (6px + 1px border) (PUBLISHED).
## Radius (PUBLISHED)
- --radius 0.375rem (6px, buttons/inputs/tables), --radius-sm 0.25rem, --radius-lg 0.625rem (cards/popovers), full 9999px.
## Border / shadow (PUBLISHED)
- Border light #dadbd2 (bold #c1c2b9); dark #35373e (bold #3f4046). Alpha borders also: rgb(0 0 0/15%), light 8%, bold 24%. Tables 1px border. Elevation shadow is hard offset: `0 3px 0 var(--border-3000)` (flat "3D button" look); modal 0 16px 16px -16px rgb(0 0 0/35%).
## Type (PUBLISHED)
- Family: Inter / system stack (RoundHog custom for brand headings); mono ui-monospace. Base 14px, line-height ~1.57; table text 13px, thead 0.75rem; xxs 0.625rem/0.75rem. Weights 500 and 600.
## Colors (PUBLISHED)
- Light: bg #f3f4ef (warm olive-gray), surface #fff, accent/hover #eeefe9, text #111, secondary rgb(17 17 17/70%), muted 60%, primary #f54e01 (orange), link #f54e00.
- Dark: bg #1d1f27, accent #21242b, border #35373e, text #fff, secondary 70%, muted 50%, primary #f7a503 (yellow-orange), link #f1a82c.
- Semantic: success #388600, warning #f7a501, danger #db3707 (highlight rgb(219 55 7/10%)). Disabled opacity 0.65.
## Table (PUBLISHED / ESTIMATED)
- Surface bg on 1px border + 6px radius; row padding 0.5rem (+0.25rem in dense); header 12px, small. Exact row height unknown (auto, ~36-40px ESTIMATED).
## Motion
- unknown
## Steal this
- Warm tinted neutrals (#f3f4ef bg) instead of cold gray; feels distinctive without color.
- Hard-offset 3px bottom shadow instead of blur.
- Tight 13px table text with 0.5rem padding: dense but readable.
- Alpha-based text tiers (100/70/60% of one ink).
- Single hot accent used sparingly; flips to amber in dark.
## Skip this
- RoundHog font, hedgehog mascot, orange brand, playful copy.
