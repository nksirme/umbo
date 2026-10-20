# UMBO brand audit

Inspected **17 October 2026**, before this refinement. Authoritative reference: <https://umbo-beta.vercel.app/>. Screens inspected: homepage, public navigation and the live stylesheet. Assets are retained locally, unmodified.

## Evidence

- Live stylesheet at inspection: `https://umbo-beta.vercel.app/_next/static/immutable/chunks/2ibl10uhozdjs.css`.
- The stylesheet's `:root` declares `--navy`, `--blue`, `--teal`, `--mint`, `--purple`, `--ink`, `--ink-soft`, `--muted`, `--surface`, `--canvas`, `--line`, `--font`, `--radius`, and both gradients below.
- Logo: `/brand/umbo-logo-inverse.svg`. Original `viewBox="0 0 180 48"`; preserve its aspect ratio. The outlined white wordmark is Inter ExtraBold. Its symbol contains the original green/teal/blue gradient, not a replacement mark.
- Symbol: `/brand/umbo-mark.svg`. Local copies: `public/brand/`.
- Original images: `/images/personal.jpg`, `/images/business.jpg`, `/images/community.jpg`, `/images/umbo-smartmerch.png`. Local copies: `public/images/`.

## Exact palette

| Live token or selector | Exact value | Use |
| --- | --- | --- |
| `--navy` | `#061e49` | Primary dark brand surface |
| `--navy-deep` | `#031634` | Deep contrast |
| `--blue` | `#0866b9` | Primary links, information |
| `--teal` | `#07aa99` | Accent |
| `--mint` | `#30efb1` | Bright brand accent |
| `--purple` | `#6653b8` | Secondary accent |
| `--ink` | `#102748` | Primary text |
| `--ink-soft` | `#586c85` | Secondary text |
| `--muted` | `#65778e` | Muted text |
| `--surface` | `#ffffff` | Cards and fields |
| `--canvas` | `#f2f7fc` | Main background |
| `--line` | `#e1e9f2` | Borders |
| `.status-pill--success` | `#08734d` on `#dcf8e9` | Success |
| `.status-pill--warning` | `#88601c` on `#fff3cf` | Warning |
| `.status-pill--neutral` | `#5f7092` on `#edf2f9` | Neutral |
| `.form-error` | `#a1303c` on `#fff1f1`, border `#f1cbcb` | Error |
| `.button--danger` | `#b52f4c`, hover `#97243e` | Destructive action |
| `.button--outline` | `#0866b9` on white, border `#cbdced` | Secondary action |
| `.button--dark` | `linear-gradient(110deg,#0784b4,#0960b7)` | Filled blue action |
| `.button--dark:hover` | `#075bac` | Action hover |
| Field focus | border `#429cce`, outline `#a6dbee` | Focus |
| `.public-header` | `#061e49f7` | Translucent navy header |

`--brand-gradient: linear-gradient(108deg, #20df9c, #16b9cf 55%, #3160cd)`

`--hero-title-gradient: linear-gradient(100deg, #b992f1, #43d9da 54%, #2bf2b1)`

The live site does not declare a distinct information-status token. The prototype composes its info treatment from the live blue and pale canvas. Selected states use these same brand colors; darker ink is used for small text over pale teal to maintain contrast. Additional pale surfaces are supporting component treatments, not new primary brand colors.

## Typography, shape and rhythm

- Exact live font stack: `"Inter", "Segoe UI", Arial, Helvetica, sans-serif`. The live CSS declares no `@font-face`; this prototype keeps that stack and works offline with system fallbacks.
- 15px base, 1.6 line height. Tight headings with negative tracking; uppercase, tracked eyebrow labels. Responsive display titles, 24–48px section headings, 16px form input text on mobile to avoid browser zoom.
- Live standard button: 45px minimum height, 8px radius, 11px × 21px padding. Gradient and outlined hero buttons are pill-shaped. Hover lifts 1px with a restrained shadow. Visible keyboard focus is retained.
- Live `--radius: 12px`. White cards, pale blue canvas, thin borders, restrained shadows. Profile previews use a larger outer radius.
- Original outline icon style: round caps/joins and approximately 1.8px stroke. Prototype icons follow that treatment.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 80px. Compact mobile headers and 44px minimum touch targets.

## Reusable patterns

- Public header: Examples, Personal, Business, Organizations, SmartMerch, Sign in. Mobile collapses into a labeled menu with expanded state.
- App navigation: overview, profile, sharing, connected workspaces, SmartMerch. Admin is on a separate reviewer-only surface.
- `ProfileView`: one renderer for live builder, review, examples and published visitor view; receives actual visibility settings.
- `ExampleCard`: consistent use case, image, concise description and preview action.
- `ProductRender`: original UMBO symbol and configurable physical product treatment.
- `Status`: text plus icon, never color alone. Draft, pending, needs info, rejected, approved and published remain distinct.
- `Field`: associated labels, optional guidance, native validation and explicit form errors.
- Mobile base; **590px** compact layout; **820px** two-pane builder/workspace transition; **1100px** full public navigation; maximum content width **1200px**.

The in-app **Design system** screen presents these tokens and patterns alongside the journey overview.
