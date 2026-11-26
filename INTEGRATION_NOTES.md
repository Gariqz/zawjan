# Integration notes (Laravel / Inertia)

This frontend runs today on fictional mock adapters. This document is the contract between the frontend and the backend teams: what each page needs, who owns it, and what must be true before anything is called "secure".

## 1. How the pieces fit

```
Page component (modules/<group>/pages/*)
  └─ useServices()  ──►  Services facade (services/interfaces.ts)
                          ├─ mock adapters      (services/mock/*, dev + design export only)
                          └─ HTTP adapters (services/http/*, used via services/inertia/adapters.ts)
```

- **One switch.** `services/bootstrap.ts` picks the adapters from `VITE_SERVICE_MODE`. Production (`.env.production`) uses the real adapters and throws if mocks are requested. The mock modules sit behind a dynamic import guarded by a compile-time env value, so a production bundle does not contain them (`npm run smoke:production` checks this).
- **One router file.** `routing/navigation.tsx` is the only module that imports `react-router-dom`. For Inertia, replace it with `integration/inertia/navigation.inertia.tsx.example`. The exported API (`AppLink`, `useAppNavigate`, `useRouteParam`, `useQueryParams`…) stays the same, so pages do not change.
- **One page registry.** `app/screenRegistry.ts` lists every screen with its route pattern, **Inertia page name**, owning group and figma-export states. The standalone router, the Inertia resolver (`INERTIA_PAGES`), the dev screen index and the Figma export all read it.
- **Results, not exceptions.** Every service method returns `ActionResult<T>`:
  ```ts
  type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; code: ErrorCode; message?: string; fieldErrors?: Record<string, string> };
  type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'IDENTITY_PENDING' | 'EXCLUSIVITY_CONFLICT'
    | 'PENDAMPING_REQUIRED' | 'APPROVAL_DECLINED' | 'EXPIRED' | 'VALIDATION_ERROR'
    | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNKNOWN';
  ```
  `services/http/client.ts` maps Laravel responses to it: 401 and 419 → `UNAUTHORIZED`, 403 → `FORBIDDEN`, 404 → `NOT_FOUND` (also for "exists but you may not know"), 410 → `EXPIRED`, 400/422 → `VALIDATION_ERROR` with `fieldErrors` from the validator bag, 429 → `RATE_LIMITED`, 5xx → `SERVICE_UNAVAILABLE`, no response or timeout → `NETWORK_ERROR`. Domain outcomes such as `EXCLUSIVITY_CONFLICT` or `IDENTITY_PENDING` must be sent explicitly as `{ "code": "EXCLUSIVITY_CONFLICT", "message": "…" }` with any 4xx status. Server `message` text is shown only with an explicit `code` (or a 422 without field errors), so framework defaults such as "Unauthenticated." never reach users.
- **Capabilities come from the server.** `ViewerContext.capabilities` (`canSendRequest`, `canSendMessage`, `canModerateCase`…) and per-item `capabilities` on `TaArufSummary` decide which buttons appear. The frontend never derives permissions itself. The backend must still authorise every request; hiding a button is not a control.

## 2. Laravel/Inertia integration

### 2.1 The model

Inertia renders pages and owns the session. Screens load and change data through JSON endpoints that use the **same session cookie and CSRF token**. There is one data channel per screen:

- A controller returns `Inertia::render('<inertiaName>', ['id' => $routeKey])`. Page props only carry the route key (names are in `app/screenRegistry.ts`, for example `Participant/Catalog`, `Moderator/ReportCase`).
- The page calls `useServices()`, and the HTTP adapters (`services/http/adapters.ts`) call the endpoints in `services/http/endpoints.ts`.
- `createInertiaServices()` (`services/inertia/adapters.ts`) is the entry used by `bootstrap.ts` in http mode and by `integration/inertia/app.tsx.example`. It returns the HTTP adapters.

The HTTP adapters are **written** against **proposed** endpoints. Nothing is agreed with the backend yet. Until an endpoint exists, the call returns `NOT_FOUND`, `SERVICE_UNAVAILABLE` or `NETWORK_ERROR`, and the screen shows its normal error state. It never falls back to mock data.

### 2.2 Steps

1. In the Laravel app: `composer require inertiajs/inertia-laravel`, `npm i @inertiajs/react laravel-vite-plugin`, register the `HandleInertiaRequests` middleware and add an `app.blade.php` root view.
2. Copy `resources/js` into the Laravel app's `resources/js` (same folder name on purpose), plus `tailwind.config.ts`, `postcss.config.js` and the `@` alias from `vite.config.ts`.
3. Use `integration/inertia/app.tsx.example` as `resources/js/app.tsx`. It resolves pages with `INERTIA_PAGES[name]`, wraps them in `AppProviders`, and refreshes mounted queries after every Inertia visit (`router.on('navigate')`).
4. Replace `routing/navigation.tsx` with `integration/inertia/navigation.inertia.tsx.example`. Pages keep the same API (`AppLink`, `useAppNavigate`, `useRouteParam`…).
5. Each group implements its endpoints in Laravel (table in 2.3) under the `web` middleware group and session guard, so the cookie and `XSRF-TOKEN` apply. To rename a route, edit only `services/http/endpoints.ts`.
6. Keep `services/mock`: it runs the dev server, the tests, the stakeholder demo and the design export.

### 2.3 Proposed endpoints

All paths come from `services/http/endpoints.ts`. Auth routes follow Laravel Fortify/Breeze defaults; everything else is under `/api`. Responses may use Laravel's `{ "data": … }` resource envelope.

| Group | Endpoints |
| --- | --- |
| Marinasi | `POST /login`, `POST /register`, `POST /logout`, `GET /api/viewer`, `GET /api/cv/schema`, `GET /api/cv`, `PUT /api/cv/draft`, `POST /api/cv/publish`, `GET\|POST\|DELETE /api/pendamping-nomination` |
| BrandyKeun | `GET /api/identity/status`, `POST /api/identity/uploads` (multipart: `kind`, `file`), `POST /api/identity/verifications`, `GET /api/candidates/{id}`, `GET\|POST /api/photo-grants`, `POST /api/photo-grants/{id}/confirm`, `POST /api/photo-grants/{id}/revoke`, `POST /api/reports`, `POST /api/blocks` |
| Khaslana | `GET\|POST /api/taaruf`, `GET /api/taaruf/{id}`, `POST /api/taaruf/{id}/{accept\|decline\|cancel\|pendamping-approve\|pendamping-decline}`, `GET /api/taaruf/{id}/room`, `GET\|POST /api/taaruf/{id}/messages`, `POST /api/taaruf/{id}/room/{exit\|pause\|resume}`, `GET /api/pendamping/home`, `GET /api/pendamping/invitations/{id}`, `POST /api/pendamping/invitations/{id}/{accept\|decline}`, `POST /api/pendamping/assignments/{id}/withdraw` |
| EAAA | `GET /api/moderation/overview`, `GET /api/moderation/verification-cases[/{id}]`, `POST /api/moderation/verification-cases/{id}/decision`, `GET /api/moderation/reports[/{id}]`, `POST /api/moderation/reports/{id}/actions`, `GET /api/moderation/my-actions`, `GET /api/admin/users`, `POST /api/admin/users/{id}/actions`, `GET /api/admin/roles`, `GET /api/admin/audit` |

Login: Fortify answers a JSON login with 200/204 and no body, so `auth.login` reads `GET /api/viewer` right after. Registration sends `name`, `password_confirmation` and snake_case consent fields.

### 2.4 Sign-out

`components/navigation/LogoutButton.tsx` (used in the participant/pendamping header, the account pages and the staff sidebar) calls `auth.logout()` (`POST /logout`). Only on success does it go to `/masuk?alasan=keluar` and reload the shared viewer. If the call fails, the user stays on the page and sees "Gagal keluar…", so nobody is shown a login screen while their session is still valid. A `401` or `419` anywhere maps to `UNAUTHORIZED`, and the error state links to `/masuk?alasan=sesi-berakhir`.

### 2.5 Failures never become unhandled rejections

- The HTTP client never throws. A dropped connection or a timeout (default 20 s) becomes `NETWORK_ERROR`. An HTML page where JSON was expected (a web route or SPA fallback) becomes `SERVICE_UNAVAILABLE`.
- `useQuery` and `useAction` also catch rejected promises and synchronous throws from any adapter or the codec (`services/errors.ts`, `failureFromThrown`), and show them as normal error states. Covered by `tests/integration/session-and-failures.test.tsx` and `tests/unit/http-client.test.ts`.

### 2.6 Authorisation rules the mock models (the backend must enforce them)

The mock backend applies these rules so the screens behave correctly in demos and tests. They are **not** a security boundary. Each one is a server-side requirement. Most rows have a test in `tests/unit/mock-authorization.test.ts`:

| Rule | Owner |
| --- | --- |
| Every call except login/register returns `UNAUTHORIZED` when signed out | Marinasi |
| Photo grants are listed, created and revoked only by the photo's owner; only participants can request one | BrandyKeun |
| A pendamping can confirm a photo grant only with approved identity and an **active** assignment to the owner | BrandyKeun + Marinasi |
| A pendamping is a room member only with an approved membership **and** an active assignment; withdrawing ends both | Khaslana + Marinasi |
| A pendamping approves or declines only for their own participant, with approved identity, while the request awaits approval | Khaslana |
| Invitations are visible only to their invitee; withdrawal applies only to the pendamping's own active assignment | Marinasi |
## 3. Contracts by group

Inertia names and routes come from `app/screenRegistry.ts`; service signatures from `services/interfaces.ts`.

### Marinasi — accounts, profile/CV, pendamping assignment

| Inertia page | Route | Service calls |
| --- | --- | --- |
| `Auth/Login`, `Auth/Register` | `/masuk`, `/daftar` | `auth.login`, `auth.register` (`RegisterInput.dateOfBirth` is a hint; the server enforces 19+) |
| `Onboarding/Start`, `Onboarding/CvNew`, `Onboarding/InvitePendamping` | `/mulai`, `/cv/baru`, `/pendamping/undang` | `auth.getViewer`, `profile.getCvSchema/getCv/saveCvDraft/publishCv`, `profile.getNomination/invitePendamping/cancelNomination` |
| `Participant/Home`, `Participant/Account`, `Participant/MyCv` | `/beranda`, `/akun`, `/cv-saya` | `auth.getViewer`, `introductions.listRequests`, `profile.*` |
| `Pendamping/Invitations`, `Pendamping/Invitation`, `Pendamping/Settings` | `/pendamping/undangan[/:id]`, `/pendamping/pengaturan` | `pendamping.getHome/getInvitation/acceptInvitation/declineInvitation/withdraw` |

Backend must: enforce minimum age 19 from verified date of birth, keep the CV schema server-driven, bind each invitation to the recipient's verified email, and require the recipient's own account and identity verification to accept. No family document is required. Mask the recipient email in responses.

### BrandyKeun — identity, candidates, crypto boundary, photos, safety submission

| Inertia page | Route | Service calls |
| --- | --- | --- |
| `Onboarding/Verification` | `/verifikasi` | `identity.getStatus/upload/submitVerification` (upload returns an opaque handle; files go to private storage, never public URLs) |
| `Participant/Catalog`, `Participant/Candidate` | `/jelajahi` (`/katalog` alias), `/calon/:id` | `candidates.browse(preferences)` (mock only), `candidates.getDetail(id)` |
| `Participant/MyCv` | `/cv-saya` | `candidates.getVisibility/setVisibility` (mock only) |
| `Participant/Privacy` | `/privasi` | `photos.getOverview/requestGrant/revoke`; `photos.confirmAsOwnerPendamping` for pendamping |
| `Participant/Safety`, `Participant/ReportNew` | `/keamanan`, `/laporan/baru?ruang=&subjek=` | `safety.submitReport(ReportInput)` with reporter-selected evidence only, `safety.blockUser` |
| — (crypto boundary) | — | `MessageCodec` (`services/interfaces.ts`) |

Before live discovery: enforce participant eligibility, explicit profile opt-in and blocking; return only `{ id, displayName, age, region, introduction }` in browse results. Keep browse preferences out of URLs and other participants' data. Protected detail keeps CV disclosure staged and excludes photos. Opt-out removes discovery access and new requests without cancelling existing introductions.

Backend must: serve photos only to the active ta'aruf partner after the owner grants access and the owner's pendamping confirms. Confirmation returns no photo or preview. Recheck access on each retrieval, invalidate future access on revocation, photo replacement or deletion, blocking or closure, and do not promise deletion of existing copies. No public or blurred variants. Keep KYC artefacts out of moderator views except through the case API, and freeze the room only for an authorised report scoped to that room. A profile report has no room side effect. For category `other`, validate `otherReason` on the server: required, one line, at most 100 characters. Keep the optional `description` separate and return `otherReason` on the moderator case detail.

### Khaslana — introductions, conversation lifecycle, pendamping approvals

| Inertia page | Route | Service calls |
| --- | --- | --- |
| `Participant/Requests`, `Participant/Approvals`, `Participant/History` | `/taaruf/pengajuan?tab=`, `/taaruf/:id/persetujuan`, `/riwayat-taaruf` | `introductions.listRequests/get/request/accept/decline/cancel` |
| `Participant/Chat`, `Pendamping/Room` | `/taaruf/:id/obrolan`, `/pendamping/taaruf/:id` | `conversations.getRoom/listEncryptedMessages/sendEncryptedMessage/exit/pause/resume` |
| `Pendamping/Home`, `Pendamping/Approval`, `Pendamping/Assignments` | `/pendamping/beranda`, `/pendamping/persetujuan/:id`, `/pendamping/taaruf` | `pendamping.getHome`, `introductions.approveAsPendamping/declineAsPendamping` |

Backend must: start a 72-hour reservation on recipient acceptance, enforce exclusivity atomically (one active process per participant; a competing request receives `EXCLUSIVITY_CONFLICT`), open the room only after both participants and both assigned pendamping approve, pause the room when a pendamping withdraws, and limit a replacement pendamping's history to messages after `authorizedFrom`. `events.subscribe` is the hook for real-time updates (Laravel Echo / polling).

### EAAA — moderation, manual review, admin

| Inertia page | Route | Service calls |
| --- | --- | --- |
| `Moderator/Overview`, `Moderator/Actions` | `/moderator`, `/moderator/riwayat` | `moderator.getOverview/listMyActions` |
| `Moderator/VerificationQueue`, `Moderator/VerificationCase` | `/moderator/verifikasi[/:id]` | `moderator.listVerificationCases/getVerificationCase/reviewVerification` |
| `Moderator/Reports`, `Moderator/ReportCase` | `/moderator/laporan?status=&prioritas=&hal=`, `/moderator/laporan/:id` | `moderator.listReports/getReportEvidence/updateReportCase` |
| `Admin/Overview`, `Admin/Users`, `Admin/Access`, `Admin/Audit` | `/admin`, `/admin/pengguna`, `/admin/akses`, `/admin/audit` | `admin.listUsers/actOnUser/listRoleAssignments/listAudit` |

Backend must: verify reporter membership, evidence provenance, and moderator case access. Give moderators only the evidence the reporter submitted, never full room history. Audit every case view and action, require a reason for suspensions and bans, and keep moderator and admin permissions separate. The mock validates against fictional plaintext; the production evidence protocol must not depend on server access to room plaintext. Staff screens are desktop-first; document review is desktop-only by design.

## 4. Security status (read before launch)

| Area | Status in this repository |
| --- | --- |
| End-to-end encryption | **Not implemented.** `MockPlaintextCodec` stores plain text (`isReviewedE2EE = false`); the Inertia placeholder codec refuses to encode or decode. The UI hides every E2EE claim until a reviewed codec sets `isReviewedE2EE = true`. Choosing and reviewing the protocol (group key management for 4 members, rekeying on pendamping replacement, evidence export for reports) is a BrandyKeun + Khaslana + security-review task. |
| Identity / KYC | **Not implemented.** The mock always produces scripted outcomes. |
| Authentication, sessions, CSRF | **Backend not implemented.** The HTTP client sends the session cookie and `X-XSRF-TOKEN`; login, register and logout go through `AuthService`. Use Laravel's session auth and CSRF protection; 401/419 show `UNAUTHORIZED` and link to `/masuk?alasan=sesi-berakhir`. |
| Authorisation | **Backend responsibility.** `RequireRole` and capability flags are UX only. |
| Photo privacy | Frontend never renders a photo without `authorizedPhotoUrl`. The backend must enforce grants and serve signed, expiring URLs. |
| Audit logging | UI only displays audit entries supplied by the server. |
| Mock adapters | Not a security boundary. They model the rules in 2.6 so demos behave correctly, and exist for development, tests, the stakeholder demo and the design export. |

## 5. Keeping designs and code in sync

When a screen or state changes, update the component and (if needed) its entry in `app/screenRegistry.ts`, then run `npm run export:figma && npm run export:validate`. The validator fails if any registry screen has no frame, or if an exported HTML file stops matching the live render.

## 6. Screen IDs, supplemental screens and routes

Screen IDs follow `design.md` §3. All routes are the **proposed** routes from §3. They live in `routing/routes.ts` and must be confirmed with the backend teams; nothing here is a finalised production URL or API.

Three supplemental screens are not in §3 and can be dropped or merged if the teams prefer:

| ID | Route | Why it exists |
| --- | --- | --- |
| `ACC-01` | `/akun` | Account hub reached from the bottom navigation: links to CV, privacy, safety and logout |
| `GUA-02a` | `/pendamping/undangan` | List of invitations, leading to GUA-02 for each one |
| `GUA-04a` | `/pendamping/taaruf` | List of supervised rooms, leading to GUA-04 for each one |

## 7. §13 acceptance checklist coverage

Tests live in `resources/js/tests/acceptance/checklist.test.tsx` unless noted. They exercise the real route table against the fictional mock backend, so they prove the frontend behaviour and the shape of the contract, not backend enforcement.

| ID | Covered by | Note |
| --- | --- | --- |
| T01, T02, T03, T05–T18, T20–T24 | Vitest acceptance tests (`T01` … `T24` test names) | T03, T12, T13 and T15 also assert the service contract directly |
| T04 | Not testable in the frontend | Duplicate-identity detection is a backend rule. The UI shows the generic `FORBIDDEN`/`VALIDATION_ERROR` message the server returns |
| T19 | `scripts/export-figma.mjs` (Playwright) | Every frame at 360, 390, 768 and 1440 px fails the export on horizontal overflow; dialogs and the report flow are clicked through on mobile. The tablet catalogue overflow found this way was fixed |
| T21 | Acceptance test + `services.test.ts` + `npm run smoke:production` | Pages never import mocks; production bundle contains no mock code |
| T20 | Partial | Keyboard opening of the case-action dialog and "no images in the verification queue" are tested. A full screen-reader pass is still needed |

## 8. Open decisions (design.md §15)

None of these were decided in the frontend. The current posture for each:

| Issue | Owner | What the frontend does now |
| --- | --- | --- |
| Pendamping may send messages or only observe | Product owner + Khaslana | Composer rendered only when the server sends `canSendMessage`; otherwise "observe" copy. Mock flag `pendampingMayCompose` shows both variants |
| Live vs asynchronous pendamping | Product owner + Khaslana | No presence indicators; roster states "Status keanggotaan bukan indikator sedang daring" |
| Multiple assignments / dual roles | Marinasi + product owner | Assignments are an explicit list (GUA-04a); no role switching UI |
| Reservation renewal policy | Khaslana + product owner | Mock starts a 72-hour reservation on acceptance. The UI displays server `expiresAt`; no renewal UI |
| Who may resume a voluntary pause | Khaslana + product owner | Pause button follows `canPauseConversation`. No resume button yet: `conversations.resume` and `canResumeConversation` exist in the contract, and the UI waits for this decision |
| Protected photo delivery and backup retention | Privacy/security + BrandyKeun | Only the active partner may receive a grant; the owner's pendamping confirms without viewing. Mock uses fictional illustrations, not secured storage |
| E2EE keys and report-evidence format | BrandyKeun + Khaslana + security review | `MessageCodec` boundary only; dev codec is plaintext and labelled; no encryption claim |
| e-KYC vendor, documents, fallback | BrandyKeun + EAAA + Marinasi | Provider-agnostic upload with opaque handles; manual-review and "unavailable" states |
| Data deletion and evidence retention | Privacy/legal + EAAA | Safety page explains requests; no promise of instant irreversible deletion |
| Admin on small screens | EAAA + product owner | Mobile shows summaries; document review and enforcement actions show "Tinjau di desktop" |
| CV questions and sensitivity | Product owner + Marinasi + BrandyKeun | Server-driven `CvSchema`; mock fields are examples |
| Questionnaire, nazhar, premium, community | Stakeholders | Not added |
| Logo / imagery licensing | Brand owner | Typographic "Zawjan" wordmark; original illustrations only |
| HTML-to-Figma importer and fidelity | Design team + frontend lead | `figma-export/` marked `IMPORT_NOT_VALIDATED`; see FIGMA_IMPORT_GUIDE.md |
| Religious / legal endorsement | Qualified adviser | Copy describes product policy; no certification or fiqh claims (T24 checks the public page for the obvious ones). Copy still needs that review |
