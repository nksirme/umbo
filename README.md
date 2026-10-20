# UMBO — one digital presence, connected to the real world

A polished, mobile-first, interactive application prototype that connects **Examples → Templates → Account → Customize → Preview → Visibility → Publish → Share → SmartMerch → Dashboard**.

Brand authority: <https://umbo-beta.vercel.app/>. The original logo, source images, exact live CSS palette, gradients and font stack are preserved. See [BRAND.md](BRAND.md) for the audited colors, source selectors, typography, component patterns and responsive rules.

## Run locally

Requirements: **Node.js 22.23.3** (pinned in `.nvmrc`) and npm. If using nvm:

```bash
nvm use
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Open **http://localhost:5173/**. `make dev` runs the same server. Dependencies are project-local and pinned by `package-lock.json`. There are no environment variables or secrets to configure; `.env.example` documents this.

To serve a fresh production build on the same port:

```bash
npm start
```

`npm run release` performs the pinned production build without starting a server. `make release` is equivalent. `make serve` is equivalent to `npm start`. The production server builds first, binds to all IPv4 interfaces on port 5173, and fails clearly if that port is already in use.

The release banner identifies this as a **Production release · Local browser data** build. That is the correct production state for this self-contained app: the static bundle is optimized and served as production output, while account, publication, verification, quote and order operations remain local simulations until a real backend and service credentials are connected.

### A blank or unreachable local page

- **Run the server where the browser can reach it.** When a coding agent runs in a Linux sandbox/container but the browser runs on your desktop, they have different `localhost` addresses. A successful request inside the container does not prove the desktop can reach it. Publish/forward container port **5173** to desktop port **5173**, or run `npm start` from this project folder in your **desktop terminal**. Binding `0.0.0.0` alone does not publish a container port. Docker deployment below explicitly publishes its port with `-p`.
- **Rebuild and restart:** stop this project’s existing server with Ctrl+C in its terminal, run `npm start`, and open `http://localhost:5173/` on that machine. Keep the terminal open.
- **Visible startup errors:** missing/stale JavaScript now shows an UMBO reload screen. Unexpected rendering errors show a recoverable branded screen rather than a blank root.
- **Saved data:** partial or legacy version-2 browser data is repaired field by field. Valid draft text and published snapshots are retained. Invalid account data returns to simulated sign-in; it never confers reviewer access.

## A good first walkthrough

1. Open **Examples**. Search by name, service or place; combine the category and use-case filters. Six profiles are featured first; the complete library contains nine interactive examples.
2. Open **Nia Wambui** or **Amina Otieno**. Try the public preview’s About, Connect and expandable sections, then choose **Use this template**.
3. Select **Use sample details**, then **Create demo & continue**. Authentication is simulated; no password or real email is required.
4. Edit the essentials, add links, replace a profile/cover image, choose a brand accent, and add optional sections. On a phone, use **Edit / Live preview**. Drafts, account inputs and template selection persist across refreshes.
5. Choose **Preview & review**. Toggle visibility and inspect the visitor preview. Contact details are restricted by default. Missing essentials or private profile basics block publication.
6. Choose **Publish demo profile**. Copy the illustrative permanent link, open the published profile, share by email/native sharing, or download a working QR as SVG.
7. Explore **SmartMerch**. Choose a card, key fob or desk stand; change its finish, name, optional artwork, quantity and linked destination. **Request demo quote** saves an indicative receipt visible in the dashboard.
8. Return to the dashboard to edit a draft, share a published profile, inspect sample engagement, open connected workspaces or revisit quote/application records.

### Business & organization verification

- Start from a Business or Organizations example, or the corresponding navigation link.
- The selected template determines the application type and is preserved throughout the journey.
- Complete details, choose a local evidence file or **Use sample evidence**, confirm authorization and submit.
- Pending profiles can be customized as drafts. Publication is blocked until the corresponding application is approved.
- Use **Reviewer demo** in the footer to enter the explicit **simulated reviewer role**. The separate admin surface can inspect evidence metadata, approve, request more evidence or reject with an actionable note. An empty queue can load clearly labeled sample applications.
- **Exit reviewer role** to return to the member experience. Reviewer authority is deliberately not restored after refresh.
- Business and organization decisions are independent. Approval does not publish a profile; the owner must customize, review visibility and explicitly publish.

## Prototype boundaries & data

- Accounts, publication, ownership decisions, engagement statistics, prices and quote requests are illustrative. No production account, live `umbo.me` profile, order, payment or real verification decision is created.
- State is stored in this browser’s `localStorage` under `umbo.prototype.v2`. There is no backend or cross-device synchronization. Clear that key/site data to reset the prototype.
- Published content is a separate snapshot. Editing a draft does not change the public view until **Publish demo update**. The sample permanent URL stays the same when the profile name changes.
- Visibility settings apply to the builder preview, review and published snapshot. Restricted contact details and social links do not render in the public view.
- `https://umbo.me/...` URLs are illustrative. A downloaded QR encodes the **current local prototype route**, not a production URL. It needs this prototype and its saved browser data to show the published demo. A QR scanned on another device will not transfer your local draft or publication.
- Images and artwork are retained as local data URLs (1.5 MB per profile/cover image; 1 MB artwork). Evidence retains only a filename, never document contents. Storage failures show a visible message.
- The reviewer role is a UI-only demonstration, not production access control.
- Branding and images are served locally. The application and test journeys do not require external APIs, hosted fonts or remote image services.

## Tests — one offline command

For a machine that already has Chromium’s Linux system libraries, install the test browser once while online:

```bash
npm ci
npm run test:setup
```

The browser is installed **inside `node_modules`**, not globally. A minimal Linux machine can use the Docker recipe below, which installs every required system library inside the image.

After setup, the single offline-compatible check is:

```bash
make test
```

This runs:

1. Fourteen Node state/validation tests: persistence, template structure, preservation of edited content, publish prerequisites, stable URLs/snapshots, independent verification, reviewer permissions, safe links, profile assets, vCards, and recovery of malformed saved data.
2. A production Vite build.
3. Twenty-three Chromium browser tests against that production build on loopback port **5175**, with external requests blocked. They cover discovery/search/filtering, the full mobile personal journey, file selection, visibility, copying, QR download, verification and rejection, SmartMerch receipts, route guards, recovery from malformed saved state, missing JavaScript or unexpected rendering failures, and layouts at **375 / 768 / 1440px**.

`test-results/` contains responsive screenshots and failure evidence and is ignored by git. Browser tests use a single worker and disabled GPU to fit small Linux containers. No standalone lint/typecheck tool is configured for this JavaScript prototype.

Useful focused commands:

```bash
npm run test:unit
npm run build
npm run test:e2e
```

`test:e2e` expects a current `dist/` from `npm run build`. Its isolated preview server is started and stopped automatically.

## Clean Linux build, test & deploy with Docker

Requirements: Docker Engine. Everything else is installed by `Dockerfile`, using pinned Node **22.23.3** and Nginx **1.28.0** images. No host-global installs are needed.

```bash
docker build -t umbo-mobile-prototype .
docker run --rm --name umbo -p 8080:80 umbo-mobile-prototype
```

Open **http://localhost:8080/**. The build runs the same `make test` before copying only static output into Nginx. Health check: `GET /healthz`. Hash routes work on static hosts without a routing service.

To repeat the tests in an explicitly offline container after the online image build:

```bash
docker build --target test -t umbo-mobile-test .
docker run --rm --network none umbo-mobile-test make test
```

`make docker-build`, `make docker-run` and `make docker-test` wrap these commands. The Docker recipe is provided; the current development environment does not include a Docker daemon, so container execution was not verified here. Native tests and production output were verified.

### Static deployment

```bash
npm ci
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Deploy the generated **`dist/`** contents to a static web host, or use the production Docker image above. Serve the application at the origin root. All client-side navigation uses hash URLs, so a direct profile/demo link works without a server-side application.

## Screen map

| Screen | Local route |
| --- | --- |
| Homepage | `/#/` |
| Searchable examples | `/#/examples` |
| Example detail | `/#/example/amina` (and eight others) |
| Account / simulated sign-in | `/#/account`, `/#/sign-in` |
| Profile builder | `/#/builder/personal` |
| Preview & visibility | `/#/review/personal` |
| Success, link & QR | `/#/share/personal` |
| Published visitor view | `/#/p/personal/<saved-slug>` |
| SmartMerch configurator | `/#/smartmerch` |
| Personal dashboard | `/#/dashboard` |
| Ownership / authorization application | `/#/application/business`, `/#/application/organization` |
| Business / organization workspace | `/#/workspace/business`, `/#/workspace/organization` |
| Separate reviewer role entry | `/#/reviewer` |
| Role-gated admin | `/#/admin` |
| Application flow overview | `/#/flow` |
| Live-brand design system | `/#/design` |

Builder, review, sharing and public profile routes also support `business` and `organization` with the same components and their independent draft/publication state.

## Source map

- `src/main.jsx` — hash routing, local persistence, role gates, notifications.
- `src/model.js` — state transitions, validation, templates, publication snapshots, verification decisions.
- `src/data.js` — curated examples, template structures, products and the audited palette.
- `src/ui.jsx` — reusable controls, shared public profile renderer, public/workspace navigation.
- `src/public.jsx` — homepage, examples, details, flow overview, design system.
- `src/journey.jsx` — account, media uploads, builder, review, public snapshot, QR/sharing.
- `src/workspaces.jsx` — dashboards, connected identities, applications, reviewer/admin and SmartMerch.
- `src/styles.css`, `src/refinements.css` — shared brand tokens, established patterns, responsive refinements.
- `public/brand/`, `public/images/` — original locally stored UMBO assets.
- `tests/`, `playwright.config.js` — offline model and browser verification.
- `BRAND.md` — exact color evidence and design system documentation.
- `Dockerfile`, `nginx.conf`, `Makefile` — clean Linux build, tests and deployment.
