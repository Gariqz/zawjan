# Zawjan — frontend (React + TypeScript)

Production-intended frontend for **Zawjan**, implemented from `design.md` v1.1. It ships:

1. A maintainable React 18 + TypeScript + Tailwind frontend, organised by the four development groups.
2. A Figma-ready design export (self-contained HTML/CSS + PNG per screen and state) **generated from the same components**.
3. Fictional mock data and a scenario switcher so every flow is clickable without a backend.
4. Typed service contracts, HTTP adapters for proposed Laravel endpoints, and an Inertia entry, so Laravel can replace the mocks without page changes.
5. A scripted stakeholder demo (`STAKEHOLDER_DEMO.md`) with a public showcase and six journeys checked in Chromium (`npm run demo:check`).

> **Status and honesty notes**
> - All people, messages, documents and photos are **fictional**. Portraits and identity documents are labelled illustrations.
> - **No backend security feature is operational.** There is no end-to-end encryption, no KYC provider, and no server-side authorisation in this repository. The development chat codec sends plain text and the UI says so ("Pesan tidak dienkripsi"). The "Terenkripsi end-to-end" label can only appear when a codec reports `isReviewedE2EE = true`, which no shipped codec does.
> - Route guards and capability flags only shape the UI. The backend must authorise every request.
> - Production builds refuse mock adapters, and the mock code is not even included in the production bundle (`npm run smoke:production` checks this).

## License

Zawjan is **source-available for evaluation and collaboration**, not open source.
You can try the demo locally and contribute via GitHub. Commercial use and
independent releases require written permission. See [LICENSE](LICENSE) for the
full terms. Third-party material remains under its own terms.

## Requirements

- Node.js 20+ (tested with Node 24.14, npm 11.9)
- For the design export only: Playwright Chromium (`npm run playwright:install`)

## Setup

```bash
npm install
npm run playwright:install   # only needed for the Figma export and its validator
```

## View the site

```bash
npm run dev
```

Open <http://localhost:5173>. The development build uses the mock adapters (`.env.development`).

- **Screen index:** <http://localhost:5173/__layar> lists all 39 screens and every state, grouped by owning team. Each link opens the real component with the right scenario.
- **Scenario panel:** the "Skenario" button (bottom-right) switches between 36 fictional scenarios and 4 personas (peserta, pendamping, moderator, admin). It also simulates server events, such as "the other pendamping approves" or "my pendamping withdraws".
- **Demo sign-in:** the login page lists four fictional accounts (`aisyah@`, `fatimah@`, `dewi@`, `rizal@contoh.id`). Logging out and in as another person keeps the demo state, so one presenter can play every role.
- **Mock vs real:** the yellow "Mode pengembangan" bar, the amber scenario pill and the demo-account box only exist in mock builds. Production builds contain none of them (checked by `npm run smoke:production`).
- **URL parameters (development only):** `?scenario=<id>&persona=<participant|pendamping|moderator|admin>&latency=<ms>`. Example: <http://localhost:5173/taaruf/tar-rahman/obrolan?scenario=active_four_member_chat>.

Good starting points:

| What | URL |
| --- | --- |
| Public home | `/` |
| Participant home | `/beranda` |
| Jelajahi | `/jelajahi` (`/katalog` also works) |
| Four-member chat | `/taaruf/tar-rahman/obrolan?scenario=active_four_member_chat` |
| Pendamping approval | `/pendamping/persetujuan/tar-rahman?scenario=two_pendamping_waiting&persona=pendamping` |
| Moderator reports (desktop) | `/moderator/laporan?persona=moderator` |
| Admin users (desktop) | `/admin/pengguna?persona=admin` |

To share a static demo build: `npm run build:demo` writes `dist-demo/`. Serve it with any static server that falls back to `index.html` for unknown paths, for example `npx vite preview --outDir dist-demo`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with mock adapters and the scenario panel |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest unit, integration and §13 acceptance tests (jsdom) |
| `npm run build` | Production build (`.env.production`: real adapters only) |
| `npm run smoke:production` | Builds, then checks the production bundle contains no mock data, scenarios or dev UI |
| `npm run export:figma` | Builds `dist-export/` and writes `figma-export/`: for every state a device-sized frame (`viewport/`) and a full-page frame (`full/`), each as HTML + PNG, plus manifest and tokens. Fails on console errors or horizontal overflow at any exported width |
| `npm run export:validate` | Checks the export against the screen registry and re-renders every HTML file to compare it with its PNG |
| `npm run demo:check` | Builds the demo bundle and checks the public showcase and six `STAKEHOLDER_DEMO.md` journeys in Chromium |
| `npm run verify` | All of the above, in order |

## Project structure

```
resources/js/
  app/            screenRegistry.ts (single source of truth: routes, Inertia names, owners, export states)
                  App.tsx (AppProviders + standalone router), dev-only ScenarioPanel / ScreenIndexPage
  domain/         types, status wording, validation, next-action logic (pure, unit-tested)
  services/       interfaces.ts (backend contracts), bootstrap.ts (the one mock/real switch)
    errors.ts     NetworkError / ServiceError and failureFromThrown (rejections become error states)
    http/         fetch client (session cookie, CSRF, timeout), PROPOSED endpoints, HTTP adapters
    inertia/      createInertiaServices() entry (wraps the HTTP adapters)
    mock/         fictional fixtures, 36 scenarios, in-memory backend with authorisation rules, plaintext dev codec
  components/     ui (button, dialog, table…), shared, feedback, navigation
  content/id/     all Indonesian UI copy
  layouts/        participant/pendamping shell, focused onboarding, staff (desktop-first)
  routing/        ROUTES constants; navigation.tsx is the only file that imports the router
  modules/
    marinasi/     auth, onboarding, CV/profile, account, pendamping nomination & invitations
    brandykeun/   identity verification, catalogue, candidate detail, photo privacy, safety & reports
    khaslana/     introductions, approvals, four-member conversation, history, pendamping rooms
    eaaa/         moderator queues and cases, admin users/roles/audit
  pages/          shared public and system pages
  tests/          Vitest unit + integration tests
scripts/          export-figma.mjs, validate-export.mjs, smoke-production.mjs, demo-walkthrough.mjs
integration/      Laravel/Inertia entry and navigation adapter examples
```

See `STAKEHOLDER_DEMO.md` to present the prototype, `INTEGRATION_NOTES.md` for the per-group contracts, proposed endpoints and the Laravel/Inertia steps, and `FIGMA_IMPORT_GUIDE.md` for the design export.

## Source document

`design.md` (v1.1, "Zawjan — Product Design & Frontend Implementation Handoff") is included at the repository root and is the source for this implementation. Screen IDs (PUB-01 … SYS-01) follow its §3 inventory. Three supplemental screens are not in §3: `ACC-01` account hub (`/akun`), `GUA-02a` invitation list and `GUA-04a` assignment list. The §13 acceptance checklist is covered by `resources/js/tests/acceptance/checklist.test.tsx` (mapping in `INTEGRATION_NOTES.md`). Values marked `[source]` in `resources/js/styles/tokens.css` come from it; all other token values are implementation proposals waiting for design-team review.
