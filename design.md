# Zawjan — Product Design & Frontend Implementation Handoff

**Version:** 1.1 — 13 November 2026 (dual-output frontend + Figma handoff)  
**Status:** Production-intended frontend source specification **plus** derived HTML/Figma design export specification; backend security and service contracts require implementation and validation  
**Audience:** Claude (frontend implementer), UI/Figma reviewers, Marinasi, Khaslana, BrandyKeun, EAAA, QA/reviewers  
**Product:** **Zawjan**, previously referred to in source documents as *Halal.in*  
**Language:** UI copy in Bahasa Indonesia; code, types, architecture notes may be in English  
**Platform:** Responsive web application. **Mobile-first for participants and pendamping. Desktop-primary for moderators/administrators; mobile-aware where safe and practical.**

> **Two deliverables from ONE source of truth:** **(A)** build Zawjan's actual, editable **React + TypeScript frontend** and **(B)** export that running frontend's key screens/states to **Figma-importable HTML/CSS/assets and visual captures**. The HTML export is for the design team's Figma workflow; the React source is for integration with the Laravel/Inertia repository. Do **not** maintain a second, independently handcrafted HTML application or deliver only a static screenshot / single giant HTML file. Backend security and services belong to the assigned teams and may not yet exist. Use typed service contracts and replaceable mock adapters. Never claim e-KYC, E2EE, moderation, or authorization are real while mocks are active.

**One-repository rule:** the four groups integrate into a **shared Zawjan application/frontend source tree** with feature-based ownership and shared review; **do not** require groups to import separate HTML designs into isolated frontend repos. `figma-export/` is a review/import artifact, **not** executable application source.

---

## 0. Read this first — precedence and status

This specification reconciles six project handoff/reports, the research and editable Figma moodboard, the Mobbin reference search, and the product owner's later explicit decisions. **Later explicit decisions outrank historical report text.** The reports describe proposals/plans, not proof of deployed functionality. This document is the target frontend contract; it does not attest that real security, KYC, messaging, payment, or moderation infrastructure exists.

### Source precedence

1. **Explicit product-owner decisions, 13 Nov 2026, in this conversation**: Zawjan name; 19+; mobile-first participant and pendamping; desktop-primary admin; four-person supervision; mutual introduction acceptance; exclusive one-at-a-time; automated e-KYC plus human fallback; owner-controlled photographs; E2EE with reporter-selected evidence; real, editable frontend with backend adapters.
2. **Combined project division of work:** `Zawjan - Perjodohan Syariah Digital.pdf`.
3. **Team reports:** `Laporan Kemajuan Progress - Kelompok 2.pdf`, `UTS KUVERVAL - Halal.in - Khaslana.pdf`, `UTS KUVERVAL - Halal.in Kelompok Brandykeun.pdf`, `Progress Report UTS - Taaruf Syariah-1.pdf`.
4. **Research/visual handoff:** `handoff zawjan.md` and its editable Figma moodboard, https://www.figma.com/design/o2Bp9svvXAE8LyRfzTnFm5?node-id=2-2 .
5. **Mobbin references** in §16: interaction inspiration only, not authoritative requirements or an instruction to copy designs.
6. **Dual-output build rule (added 13 Nov 2026):** maintain one component-based React frontend and derive static HTML design snapshots / Figma imports from it. The old "do not produce one HTML file" instruction rejects a *monolithic source implementation*, not a separately exported HTML representation.

**Historical requirements superseded:** The old name *Halal.in*; desktop-first for all roles; optional pendamping; exactly three members in chat; purely manual verification; chat open immediately on mutual acceptance; admin ability to decrypt whole chats; universally visible/automatically unblurred photos. All are superseded by the agreed model below.

### Product promise

Zawjan helps **Indonesian Muslim adults aged 19+** make purposeful marriage introductions through structured biodata, privacy-preserving discovery, mutual requests, and explicitly supervised interaction. It is **not** swipe-driven casual dating. Product wording should describe what the system does and has verified, not confer religious/legal certainty or guarantee safety or marriage outcomes.

### Non-negotiable product rules

- No user under 19 may enter the eligible participant discovery and ta'aruf journey. Do not imply identity checks prove marital status, family relationship, sincerity, or Islamic compliance.
- Both prospective participants must have **their own independently identity-verified adult pendamping accounts**; user selection does not prove blood relationship or legal `wali nikah` status. The UI uses **Pendamping Ta'aruf** unless an independently verified legal role exists.
- A request needs **mutual participant acceptance** before exclusivity/reservation begins. Both pendamping must then explicitly approve that particular introduction **before any message can be sent**. An invitation to act as pendamping is separate from approving a specific introduction.
- A conversation has **four authorized human members** (participant A, pendamping A, participant B, pendamping B). Do not hardcode the former three-person design.
- One exclusive ta'aruf per participant. Recipient acceptance starts a 72-hour reservation. Simultaneous acceptance is resolved atomically by backend: first committed acceptance wins; others see neutral conflict/unavailable feedback (not a personal rejection). A pending reservation can be cancelled.
- Declined pendamping approval cancels that request and releases the reservation. Pendamping withdrawal during an active conversation **pauses messaging** pending replacement. A replacement has access only to messages from their authorization onward; the crypto team must rotate membership keys. Preserve former members' already-downloaded data limitations in privacy copy.
- A participant can **unilaterally exit**, block, or report abuse without permission. A profile report does not end or freeze a ta'aruf. Category **Lainnya** requires a one-line reason of at most 100 characters; additional details are optional.
- Photos are private by default. Only the **active ta'aruf partner** may receive access, after the owner grants it and the owner's pendamping confirms. Revocation, replacement, deletion, blocking or closure ends future access, not existing copies.
- Jelajahi shows one text-only opt-in introduction at a time. Private preferences stay out of URLs. Swipe and buttons only change profiles, never signal interest. No ranking or name search.
- Intended E2EE model: authorized members read normal chat; admins cannot freely decrypt history. A user may explicitly **select and submit message evidence** with a report for moderator review. Do not implement fake cryptography or backend plaintext moderation while advertising E2EE. Client-side warning/filtering cannot guarantee a block.
- Automated identity checking with human review on failure/exception is the **target**; the vendor and backend are not defined. While pending/failed/unavailable, a participant can manage their own profile but **cannot discover candidates or request introductions**.
- The frontend is production-intended **React + TypeScript** and editable. Backend ownership is separate. Inertia.js/Laravel alignment is preferred; an independent UI preview/build may use a mock data source but not change domain rules. **Additionally, generate HTML/CSS/assets derived from rendered React screens for Figma design import, with a state/viewport manifest.** This exported HTML must not become a competing runtime codebase.

---

## 1. Experience strategy

### 1.1 Experience principles

1. **Calm, dignified, intentional:** readable biodata, neutral status descriptions, minimal urgency/pressure; no addictive swipe deck, streaks, countdown manipulation, or artificial scarcity.
2. **Trust through specificity:** show *what* is verified. `Email dikonfirmasi`, `Identitas dan usia terverifikasi` only if their actual backend state proves it; self-declared marital status is labeled as a declaration, not verified.
3. **Consent before disclosure:** clearly show audience, contents, access duration/status, guardian confirmation and the ability to revoke before submitting a sensitive permission.
4. **Safety without confinement:** report, block, stop, and cancel controls available from appropriate contexts, including after a conversation has ended.
5. **Status transparency:** user always knows `what happened`, `who must act next`, `what is locked`, and `what they can do now`.
6. **Accessible mobile web, efficient desktop:** touch-first task flows for participant/pendamping; data-density and side-by-side review for admin.
7. **Separation of concerns:** backend decides authorization and truth. Frontend displays server-provided capabilities and errors; no frontend-only enforcement.

### 1.2 Roles and permissions

| Capability | Participant | Pendamping | Moderator | Platform admin |
|---|---|---|---|---|
| Manage own account, session | Own | Own | Own | Own |
| Submit identity check | Own | Own | — | — |
| Read candidate catalog | Verified and eligible | No by role alone | No by role alone | No by role alone |
| Edit own CV and photo grants | Own | No | No | No |
| Create/respond to introduction requests | Eligible participant | No | No | No |
| Approve a specific introduction | No, except participant acceptance | **Own assigned case** | No | No |
| Access active room | Member only | Authorized member only | **No default access** | **No default access** |
| Access submitted report evidence | Reporter/authorized view | If policy authorizes | Assigned case only | No blanket access |
| Review KYC exceptions | No | No | Assigned moderator | Admin only if specifically permissioned |
| Manage users, roles, audit | No | No | Limited enforcement | As explicitly permissioned |

**Permission modeling:** an individual can potentially hold multiple capabilities only if backend authorizes them. Whether a participant can simultaneously be someone else's pendamping is **not decided**; do not assume unrestricted role switching or reuse the same person as their own pendamping. Separate `guardianAssignmentId` from account `userId`.

### 1.3 Navigation model

**Participant mobile primary navigation (proposed):** `Beranda`, `Katalog`, `Ta'aruf`, `Akun`. Notifications accessible from header. `Ta'aruf` groups incoming/outgoing requests, pending approvals, active chat, and closed history. `Akun` contains `CV Saya`, `Pendamping Saya`, `Privasi & Foto`, `Keamanan`, `Pengaturan`.

**Pendamping mobile primary navigation (proposed):** `Beranda`, `Undangan`, `Pendampingan`, `Akun`. Show next actions immediately rather than burying pending approvals.

**Moderator desktop navigation:** `Ringkasan`, `Verifikasi`, `Laporan`, `Pengguna` (if allowed), `Riwayat Aksi`. **Admin desktop navigation:** `Ringkasan`, `Pengguna`, `Peran & Akses`, `Audit`. Distinguish moderator/admin permissions even if sharing a shell.

**Responsive conversion:** bottom navigation on narrow participant/pendamping layouts, sidebar or header on wide screens. Never expose an admin action solely because a sidebar is visible. Mobile admin can support summaries and case detail; complex document comparison and privileged actions may show a clearly labeled desktop-required state until the team confirms safe mobile support.

---

## 2. Visual language and brand system

### 2.1 Brand translation from the legacy Halal.in moodboard

- Final public product name **Zawjan**. Do not show the old `Halal.in` logo or name in the new application (except internal source attribution).
- Brand voice: **Hangat · Terjaga · Terarah**, restrained and approachable. Existing research phrase: **“Saling mengenal, dengan tenang.”** This is a proposed slogan, not a legal or religious claim.
- Use warm, natural, credited photography for the public marketing site. No AI-generated fake couples presented as members; no fabricated community counts, success rates, partnerships, certifications, testimonials, KTP/SKCK check claims, or E2EE claims.
- Do not equate the presence of a pendamping with continuous live monitoring; do not describe self-selected pendamping as legally verified wali nikah.
- **Marketing/public:** more Playfair Display/editorial space. **Application:** Plus Jakarta Sans and information clarity. Keep high-information CV screens calm, not decorative.

### 2.2 Design tokens (source-derived)

| Token | Value | Role |
|---|---|---|
| `brand.primary` | `#137547` | Primary action, active navigation, positive brand emphasis |
| `brand.forest` | `#093721` | Main headings, strong brand surfaces |
| `brand.mint` | `#E8F5EE` | Quiet highlight, selected filter, backgrounds |
| `surface.white` | `#FFFFFF` | Cards, dialogs, forms |
| `surface.canvas` | `#F8FAFC` | Application background |
| `accent.amber` | `#D97706` | Named attention/status accents with legible text |

**Font family:** Playfair Display for large editorial headings; Plus Jakarta Sans for application UI, labels, forms, controls, tables and status text. Suggested scale: hero 32–40px mobile or larger responsive, app page title 24px, card title 18px, body 14–16px, captions ~12px with appropriate contrast and zoom. Implement semantic tokens, not arbitrary repeated hex values.

**Design-system additions to define during build (implementation proposals, not source requirements):** neutral border/grays, semantic danger/success/info colors, radii, elevation, spacing scale, focus ring, skeleton loading, dark-mode policy (not yet approved; default light).

**Avoid:** saturated gradients, gold luxury cues, excessive glassmorphism, fake "100% verified" decorations, romantic swipe animations, confetti after matching.

### 2.3 Component vocabulary

`AppShell`, `MobileBottomNav`, `DesktopSidebar`, `Header`, `Breadcrumbs`, `PageHeader`, `StatusBadge`, `VerificationFacts`, `PrivacyNotice`, `ConsentSummary`, `CandidateCard`, `CVSection`, `CandidateFilterSheet`, `StepForm`, `ProgressSteps`, `DocumentCapture`, `UploadFeedback`, `GuardianCard`, `GuardianApprovalTracker`, `TaArufStatusTimeline`, `RequestCard`, `ConversationMembers`, `EncryptedChatView`, `ConversationSafetyMenu`, `PhotoPrivacyGate`, `ReportEvidencePicker`, `CaseReviewTable`, `KycReviewPane`, `AuditLogTable`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`, `Toast`.

Components must support semantic variants (`default`, `hover`, `focus`, `disabled`, `busy`, `error`, `success` where applicable), appropriate ARIA labels, keyboard operation, and predictable responsive layouts. Prefer shadcn/ui primitives plus Tailwind tokens to custom untested widgets.

### 2.4 Layout guidance (proposed)

| Context | Mobile-first | Tablet / Desktop |
|---|---|---|
| Candidate catalog | Single-column cards, filter bottom-sheet/drawer | Grid/list with filter sidebar; no swipe imperative |
| CV detail | Readable stacked sections, protected portrait, accessible CTA | Two-column biodata when space allows; privacy summary near CTA |
| Registration / KYC | One focused step, persistent progress, clear back behavior | Centered content panel with explanatory side content |
| Requests / approvals | Cards with status and one clear next action | List + detail split layout |
| Chat | Full-height message view; members/safety in sheet | Chat + side panel for four-member roster/status |
| Admin queue | Responsive case cards and summaries | Sortable data table, filters and review/detail panels |

**Testing viewport targets (implementation proposals):** 360px, 390px, 430px mobile; 768px tablet; 1024px small desktop; 1440px large desktop. Do not rely on rigid device-specific breakpoints. Account for dynamic browser bars, mobile keyboard resizing, safe-area insets and `100dvh` where appropriate. Touch targets generally ≥44×44 CSS px. No horizontal scrolling on standard user flows.

---

## 3. Complete screen inventory and routes

Routes below are **proposed frontend routes**; confirm Laravel/Inertia route names with the backend teams before integration. Inertia page props may replace separate REST calls. Use route constants, not hardcoded route strings throughout components.

| ID | Example route | Actor | Primary goal | Required states |
|---|---|---|---|---|
| PUB-01 | `/` | Public | Discover purpose and rules of Zawjan | loading, responsive, informational |
| AUTH-01 | `/masuk` | All | Sign in | invalid, loading, locked/limited, session expired |
| AUTH-02 | `/daftar` | Participant/pendamping | Create account, 19+ eligibility & consent | validation, pending email, duplicate account |
| ONB-01 | `/mulai` | Participant | Understand steps and completion | incomplete, in-progress, ready |
| ONB-02 | `/verifikasi` | Participant/pendamping | KTP/selfie verification | not started, uploading, automated pending, manual review, approved, rejected, retry, unavailable |
| ONB-03 | `/cv/baru` | Participant | Complete structured CV | draft, partial, validation, saved |
| ONB-04 | `/pendamping/undang` | Participant | Nominate adult verified pendamping | not invited, sent, accepted, declined, expired, invalid |
| PAR-01 | `/beranda` | Participant | See current next action/status | unverified, incomplete, browsing, exclusive, paused |
| PAR-02 | `/katalog` | Participant | Search candidates | loading, filtering, no results, restricted, error |
| PAR-03 | `/calon/:id` | Participant | Read CV, actual verification scope, photo privacy | limited, allowed, request pending, unavailable |
| PAR-04 | `/taaruf/pengajuan` | Participant | Incoming/outgoing requests | pending, accepted, rejected, cancelled, expired, conflict |
| PAR-05 | `/taaruf/:id/persetujuan` | Participant | Track both pendamping approvals | waiting, partially approved, declined, timeout, cancelled, active |
| PAR-06 | `/taaruf/:id/obrolan` | Authorized four members | Communicate when allowed | locked, active, paused, frozen, ended, disconnected |
| PAR-07 | `/cv-saya` | Participant | Edit own CV | view, edit, draft saved, validation failure |
| PAR-08 | `/privasi` | Participant | Manage photo recipient grants | hidden, requested, consented, pending pendamping, active, revoked |
| PAR-09 | `/keamanan` | Participant | Block, report, exit, account data controls | confirm, loading, success, failure |
| PAR-10 | `/laporan/baru` | Participant/authorized sender | File evidence-based report | evidence select, consent, submitting, submitted, failed |
| PAR-11 | `/riwayat-taaruf` | Participant | Read completed/closed summary, report after exit | no history, closed, read-only |
| GUA-01 | `/pendamping/beranda` | Pendamping | Own assigned responsibilities | pending invitation, active assignment, no assignment |
| GUA-02 | `/pendamping/undangan/:id` | Pendamping | Accept/decline appointment | pending, accepted, declined, expired |
| GUA-03 | `/pendamping/persetujuan/:id` | Pendamping | Approve/decline a specific ta'aruf | pending, approved, declined, no permission |
| GUA-04 | `/pendamping/taaruf/:id` | Pendamping | Supervise authorized room/withdraw | waiting, active, paused, historical scope |
| GUA-05 | `/pendamping/pengaturan` | Pendamping | Manage assignments | active, withdraw confirm, no assignments |
| MOD-01 | `/moderator` | Moderator | See queues and action items | loading, empty, error, permission denied |
| MOD-02 | `/moderator/verifikasi` | Moderator | Review manual identity exceptions | queue, filter, paginate, empty |
| MOD-03 | `/moderator/verifikasi/:id` | Moderator | Inspect authorized evidence & decide | pending, approve, reject, audit, missing |
| MOD-04 | `/moderator/laporan` | Moderator | Triage submitted user reports | queue, high priority, status filtering |
| MOD-05 | `/moderator/laporan/:id` | Moderator | Examine submitted evidence, action case | evidence-limited, assigned, closed, restricted |
| ADM-01 | `/admin` | Admin | Operational overview | loading, empty, access denied |
| ADM-02 | `/admin/pengguna` | Admin | User search and action | filters, suspend, ban, restore subject to authority |
| ADM-03 | `/admin/akses` | Admin | Role/capability management | inspect, change confirm, audit |
| ADM-04 | `/admin/audit` | Admin | View action/audit trail | filters, pagination, restricted |
| SYS-01 | `/403`, `/404`, `/error` | All | Recover from route or service failure | no access, not found, retry |

These are navigation screens, not requirements to create 30 unrelated layouts. Reuse shells, components, and patterns; keep route guards centralized. **PWA/install prompt is not a confirmed requirement.**

---

## 4. Screen anatomy — participant & onboarding

### PUB-01 — Public home (mobile priority)

**Above fold:** Zawjan wordmark, compact responsive nav, calm editorial heading, one credited contextual photo, short factual explanation, `Mulai Ta'aruf` / `Pelajari Proses`.  
**Then:** process in 4 understandable stages; why privacy is staged; what identity verification does *and does not* check; pendamping explainer; FAQ, privacy/terms and contact footer.  
**Do not display:** fabricated member totals, guarantees, endorsements, quotes, live accounts, fabricated certificates, or unimplemented cryptographic assurances.  
**Mobile:** one-column hero; image below or beside text according to space. **Desktop:** editorial split hero; plenty of whitespace.  
**Primary action:** register; **secondary:** view guidance.

### AUTH-01/02 — Authentication and eligibility

**Fields:** authentication identifiers as agreed with Marinasi, password/credential options **only when supported by backend**; do not invent OAuth, passwordless, or phone OTP.  
**Age gate:** date of birth and a clear **19+** restriction; use backend for authoritative verification.  
**Required policy consent:** purpose is marriage introduction, not ordinary dating; terms and privacy are distinct readable links; don't pre-check consent boxes.  
**State:** validation inline with neutral language, focus first invalid field, no user enumeration in error details.

### ONB-01 — Onboarding progress

Short checklist: `Data akun`, `Verifikasi identitas`, `CV ta'aruf`, `Pendamping`. Distinguish “completed” from “submitted/awaiting review”; progress based on real status, never purely mocked while in production. Allow exit/save/resume.

### ONB-02 — Identity and age verification

1. Intro: explain why KTP/selfie is requested, what is checked, who handles data, what happens if automation fails, and that the service does not verify marriage intent or relationship to pendamping.  
2. Permission and upload/camera capture: separate controls; explain safe handling; previews avoid long-lived exposure; no actual KTP data in fixtures.  
3. `Memeriksa identitas...` with non-misleading progress (indeterminate if no real progress).  
4. Outcomes: `Terverifikasi`, `Perlu tinjauan manual`, `Perlu perbaikan dokumen`, `Belum dapat diproses`, `Tidak memenuhi ketentuan usia`.  
5. On failure: preserve nonsensitive progress, provide retry or support; never unlock catalog on timeout.  
6. Manual review: moderator queue, rationale, audit, and user notification are backend owned.

**Copy examples:** `Identitas dan usia Anda sedang ditinjau. Anda masih dapat mengisi CV, tetapi belum dapat melihat katalog calon.`; `Verifikasi identitas tidak membuktikan status perkawinan.`

### ONB-03 / PAR-07 — CV Ta'aruf editor

Make the data schema configurable rather than hardcoding unapproved categories. Suggested sections, subject to confirmed fields: `Data dasar` (public display identity, age/city), `Tentang saya`, `Tujuan dan kesiapan menikah`, `Kriteria calon`, `Pendidikan & aktivitas`, `Rencana domisili`, `Nilai dan komunikasi`. Sensitive religious practices/health/income details must not be assumed mandatory; exact address and NIK never belong to public CV.  
**UI:** step indicator, save draft, autosave status only if functional, review-and-publish step with visibility preview. `Wajib` vs `Opsional` explicit, clear data audience on each sensitive section.  
**Validation:** inline and on submit; do not discard draft when backing service fails.  
**Verification labels:** independent from CV claims such as declared marital status.

### ONB-04 — Assign pendamping

Explain distinction: `Pendamping Ta'aruf` is a trusted adult chosen by user, **not automatically legal wali nikah**. Provide invite by supported identifier/link/code, show invitation status and identity verification requirement. No direct self-supervision. Account acceptance does not approve any specific future introduction. Separate `Ubah pendamping` with safeguards and impacts on pending/active ta'aruf.

### PAR-01 — Participant home

Prioritize a **single next action**: finish verification/CV, check pendamping, review received request, review pendamping approvals, enter active room, or resolve paused state. Use compact status panels and safe informational copy; avoid gamified “match score” as unverified fact. Secondary sections: relevant pending requests, draft CV, account privacy shortcut.

### PAR-02 — Candidate catalog

**Mobile:** search/summary top, filter sheet, vertical list/cards, accessible pagination or load more; preserve filters on back navigation. **Desktop:** filters in sidebar, cards/grid or readable list.  
**CandidateCard:** limited pseudonym/name, age, broad location, salient *self-declared* compatibility fields, clearly qualified identity facts and limited/blurred portrait placeholder. Actions: `Lihat CV`, `Ajukan Ta'aruf` only if eligible. No clear photo images in unapproved URLs/data; CSS blur is **not** protection.  
**Filter**: age, region, marriage status *as self-declared*, relocation preference, and additional criteria only if data exists. Separate hard requirements from preferences if supported by backend.  
**States:** eligibility gate, empty, partial results, blocked candidates excluded, invalidated filter, server errors, exclusive session locks.

### PAR-03 — Candidate CV detail

Read-focused sections, privacy note, verification facts, explicit `Dideklarasikan pengguna` where appropriate. Photo privacy affordance must state why unavailable and explain owner + pendamping consent process without exposing the real asset. A sticky mobile request CTA can be used as long as it does not obscure content and remains keyboard accessible. Before request: lightweight confirmation of recipient, intention, what information is shared, and exclusivity conditions on mutual acceptance.  
**Error states:** candidate blocked/deleted/unavailable, own verification pending, request already pending, exclusive session active.

### PAR-04 — Requests

Separate `Diterima`, `Dikirim`, `Riwayat` tabs or segmented controls, accessible on mobile. Each request shows direction, other participant's permitted data, date, status, current next action, and `Terima` / `Tolak` / `Batalkan` when allowed. Explicitly confirm that accepting the request **starts one exclusive reservation** but **does not yet allow chat**. A losing concurrent acceptance sees: `Pengajuan ini tidak dapat diproses karena salah satu akun sedang dalam proses ta'aruf lain.` Do not characterize it as interpersonal rejection.  
**Pending conflicts:** any other pending requests become unavailable according to authoritative backend policy. Do not allow duplicate submissions on double tap.

### PAR-05 — Pendamping approvals (most critical UI)

Present a **four-person status tracker** (participant A accepted, participant B accepted, pendamping A pending/approved, pendamping B pending/approved) with reliable and neutral statuses. Show the next decision owner; show cancellation and expiration timestamp if provided by backend; do not invent a timer.  
**Outcomes:** if both approve, room becomes available; one decline cancels request and releases lock; withdrawal after chat activation pauses room; expiration/cancellation returns participants to eligible discovery. No message composer until backend `canSendMessage === true`.

### PAR-06 — Supervised chat

**Mobile:** focused messages with member chips/status and a `Detail ruang` sheet, safety menu always reachable, stable composer under mobile keyboard. **Desktop:** chat main column + optional permanent side panel with four verified membership entries and progression status.  
**Header:** participants and each pendamping clearly named/role-labeled; `Terawasi` must not imply someone is online or reading live. Only show `Terenkripsi end-to-end` if integrated and validated; with mocks show environment indicator `Mode pengembangan — simulasi percakapan` rather than a false security seal.  
**Composer:** only when `active`, membership approved and backend says permitted. Disabled with reason while `waiting`, `paused`, `frozen`, or `ended`; draft composition may be retained locally but not sent silently when access returns.  
**Safety:** `Laporkan`, `Blokir`, `Akhiri Ta'aruf`, `Jeda` (subject to policy) and clear confirmation. Do not require both members' agreement to exit or report.  
**Guidance:** purposeful conversation prompts can appear as optional non-automated templates; do not include a moderation bot falsely pretending to detect everything.

### PAR-08 — Photo privacy and grants

Default hidden; show **owner preview** and exactly named recipients/participants who would gain viewing permission. Request confirmation from **owner's own pendamping**; never auto-reveal solely due to mutual match. Each grant carries states `requested`, `owner_approved`, `pendamping_pending`, `active`, `revoked` as appropriate. Revocation stops future protected retrieval; copy warns it cannot undo prior viewing/screenshots. Do not display clear photo thumbnails outside authorized protected media requests.

### PAR-09/10/11 — Safety, reporting, closed history

Report entry points available from chat, profile, and closed history where allowed. Select relevant decrypted messages on user device; show exactly which messages/attachments will be submitted as evidence. The server receives only submitted report evidence, not a generic chat-decryption capability. On submission: freeze communication, allow immediate unilateral exit, release exclusivity, show a receipt/status, preserve evidence per agreed policy. `Blokir` restricts later discovery/contact; must be enforced by backend. Closed history remains read-only and retains report link if allowed; data retention per policy pending review.

---
## 5. Screen anatomy — pendamping

**Pendamping is a real, independently verified adult account, not a free-text guardian label.** A participant can choose a trusted adult/family member but the system does not verify kinship by KK or claim that selection establishes a legal wali nikah.

### GUA-01 — Pendamping home

- `Menunggu tanggapan Anda` priority area for invites and *specific* introduction approvals.
- `Sedang didampingi` summaries with participant identity, current room status, access window, and next action.
- `Riwayat` contains only assignments and content this pendamping is entitled to see, not unrestricted historical data.
- No candidate catalog access by default and no admin-style user directory.
- On mobile, show one approval task at a time. Desktop can show a two-column request/detail view.

### GUA-02 — Accept assignment invitation

- Explain who is inviting the pendamping, what supervision means, which data they may access, the obligation to preserve confidentiality, how to withdraw, and that this is not verification of family/legal guardian status.
- Authenticate and complete identity verification before allowing the appointment to be accepted.
- Actions: `Terima Undangan`, `Tolak Undangan`, `Lihat Ketentuan` with explicit confirmation.
- States: unopened, not authenticated, unverified, pending, accepted, declined, expired, already assigned, invalid link.

### GUA-03 — Approve a specific introduction

- Display *both prospective participants'* permitted introduction details, the appointing participant, stated purpose, and what approval unlocks.
- Show a precise callout: `Persetujuan Anda diperlukan untuk membuka ruang percakapan. Pihak lain dan pendampingnya juga harus menyetujui.`
- Actions: `Setujui Ta'aruf`, `Tolak`, `Kembali`. Decline cancels the request. No blanket approval for future introductions.
- Two pendamping decision states are visible, but only the assigned pendamping can act on their own decision.
- Do not expose hidden photographs or confidential CV sections solely because a pendamping is reviewing the introduction; access is separately permissioned.

### GUA-04 — Active supervision

- Conversation membership labels: participant A, pendamping A, participant B, pendamping B. Define whether pendamping can send messages from backend capability `canSendMessage`; **active participation versus observe-only is an unresolved policy**. Design for both without giving unauthorized input controls.
- Show `Sedang aktif` vs `Dijeda` and the reason, without claiming continuous online oversight.
- `Mengundurkan diri` warns that the room will pause until a replacement is approved. No unilateral disclosure of historical chat to replacement.
- Replacement pendamping sees messages sent **after** their authorization only. No plaintext replays from prior history to new member.
- Safety actions and support remain available if authorized.

### GUA-05 — Settings and assignments

- Separate `Keluar dari pendampingan`, `Pemberitahuan`, `Profil`, `Privasi`, `Verifikasi` sections.
- Do not allow a user to assign themselves as their own pendamping through a second account; backend verified-identity uniqueness is required.
- Offline status behavior and number of concurrent assignments remain open. Do not invent a `last seen`, `watching live`, or online requirement as a product promise.

---

## 6. Screen anatomy — moderator / platform administrator (desktop-primary)

### Shell and responsive guidance

- 1024px+ is the primary work surface: left persistent navigation, top search/status, content header, filters, data grid, and optional right detail drawer/pane.
- Mobile may support queue counters, search, read-only case summaries and selected safe actions once reviewed. For high-risk verification/document comparison, show `Tinjau di desktop` when the safe mobile UI has not been defined. **Do not render a fake "approve" that cannot work on mobile.**
- All queues need accessible filters, sorting, pagination, keyboard navigation, empty states, and server-driven access restrictions.
- Never include raw sensitive IDs in analytics, frontend logs, public URLs, or debug views.

### MOD-01 — Overview

- Overview cards: pending identity exceptions, pending reports, handled today, relevant operational status. All counts are supplied by backend, not invented production figures.
- Important action list (`Perlu ditinjau`) sorted by permitted policy priority; avoid exposing case details to unauthorized roles.

### MOD-02/03 — Identity review

- Queue columns: case identifier, submission date, verification stage, assigned reviewer, age eligibility status, current case state. No full KTP/NIK in lists.
- Detail: applicant summary with masked metadata; protected, short-lived document access; side-by-side inspection on desktop; clearly labeled automated-check result and reason manual review is required.
- Actions: `Setujui`, `Tolak dengan alasan`, `Minta perbaikan`; confirm consequences and record actor, reason, timestamp. Reject with actionable, nonexposing user message.
- The frontend cannot validate authenticity or legal eligibility by itself. Admins cannot override security server-side rules merely by changing local state.

### MOD-04/05 — Safety reports

- Queue fields: report ID, reporter, category, received date, priority, assignee, status; minimal sensitive details.
- Detail: show **only explicitly submitted report evidence** and relevant case metadata. Label scope `Bukti yang dikirim pelapor`; no full-room access or "Decrypt conversation" button.
- Actions subject to RBAC: record notes, request review, warn, suspend, ban, close, appeal/status if backend exists. Never fabricate a sanctioning workflow as functional if service unavailable.
- Case audit trail shows reviewer changes, status, timestamps and reasons. Distinguish user allegation from proven violation.

### ADM-01/02/03/04 — Administration

- Admin landing: service metrics and operations, **not default access to every KYC document or private chat**.
- User management: account state, restrictions, reasoned suspension/ban/restore and confirm dialogs; backend decides actual permissions.
- Role management: view existing role assignments/capabilities; editing only if real RBAC service exists. Avoid letting an admin grant themselves unreviewed access to sensitive report content.
- Audit records: chronological actions with filter by actor, entity, action and time; masking and authorization enforced server-side.

---

## 7. Canonical workflows and state machines

States below are **domain-level design labels**. They are not a mandate for exact database enum names. The backend teams should map canonical values and return a stable UI-facing DTO. Do not derive permissions from a status string alone: use explicit capabilities from backend.

### 7.1 Verification

`not_started → submitting → automated_check → approved`  
`automated_check → needs_manual_review → approved | rejected | resubmission_required`  
`submitting / automated_check → temporarily_unavailable → retry`  
`rejected / resubmission_required → retry` only when policy permits.

**Invariants:** no catalog and no ta'aruf requests until `approved`; user can still manage their own profile while pending. Do not use a single vague `verified` Boolean for identity, age, email, marital status, pendamping relationship and religious compliance.

### 7.2 Introduction request → exclusive reservation

```
not_requested
  └─ request sent ─▶ pending_recipient
                        ├─ declined ─▶ declined (terminal)
                        ├─ withdrawn ─▶ cancelled (terminal)
                        ├─ expired ─▶ expired (terminal)
                        └─ recipient accepts ─▶ mutually_accepted_reserved [exclusive]
                                                     └─ waiting_for_two_pendamping_approvals
                                                            ├─ either declines ─▶ cancelled (unlock)
                                                            ├─ user cancels ─▶ cancelled (unlock)
                                                            ├─ expiration ─▶ expired (unlock)
                                                            └─ both approve ─▶ active [chat permitted]
```

**Concurrency:** Server commits at most one mutually accepted reservation for each participant. Another simultaneous accept produces a normalized `EXCLUSIVITY_CONFLICT`. It should not turn into a `Tolak` interpersonal event. Participant receives a neutral explanation and option to return to requests/catalog (if eligible).

**Pending sibling requests:** Must become non-actionable when exclusivity starts. Whether to terminally cancel, automatically expire, or store a separate `superseded` state must be agreed with Khaslana; frontend shows them as unavailable and does not imply the other party manually rejected them.

**Expiration:** Backend-supplied `expiresAt` only. The exact interval, renewals, reminders, and expiration reason are **TBD**. Never hardcode 24h/48h/7 days into product logic.

### 7.3 Active room lifecycle

```
active
 ├─ user pauses [if authorized] ─▶ paused_user [resume policy TBD]
 ├─ pendamping withdraws ─▶ paused_guardian_missing ─▶ replacement approved/rekeyed ─▶ active
 ├─ report / safety incident ─▶ frozen_reported + user exits [unlock immediately]
 ├─ either participant exits ─▶ ended [unlock immediately]
 └─ mutually agreed completion ─▶ ended [unlock]
```

**Invariants:** no sending if `!capabilities.canSendMessage`, and no active chat without both guardian approvals. In frozen/ended states composer is unavailable and evidence/report entry point is still visible as permitted. Pausing and resuming due to personal choice are not fully specified: show UI only when backend capability supports it. Always support unilateral exit.

### 7.4 Photo permission lifecycle

`hidden → owner_requested/consented → own_pendamping_confirmation_pending → active_for_named_recipients → revoked`.

**Invariants:** changing or revoking one photo grant does not force termination of the conversation. Images must be fetched via backend-authorized URLs/routes, not public static assets blurred with CSS. New recipient or new pendamping never inherits permission implicitly. Exactly who among the other party and their pendamping receives photo access needs explicit recipient grant selection in UI and server policy.

### 7.5 Report lifecycle

`draft_evidence_selection → confirming_scope → submitting → submitted / failed` at frontend; `received → triaged → reviewing → actioned / closed` at moderator backend. Reporter has immediate safe-exit path independent of report submission success. If evidence submission fails, preserve a safe local retry mechanism without persisting plaintext secrets to local storage or analytics.

---

## 8. UX copy and content contract (Bahasa Indonesia)

All production UI copy must be respectful, short, precise and editable via centralized content files. Avoid overclaiming verification or religious authority. Examples follow, not final approved legal wording.

| Context | Suggested Indonesian copy |
|---|---|
| Registration CTA | `Mulai dengan Niat Baik` / `Daftar` |
| Eligibility | `Zawjan ditujukan bagi pengguna berusia 19 tahun ke atas.` |
| Policy acknowledgement | `Saya memahami bahwa Zawjan memfasilitasi perkenalan dengan tujuan pernikahan.` |
| Verification in progress | `Identitas Anda sedang diperiksa. Anda masih dapat mengelola CV, tetapi belum dapat mengakses katalog.` |
| Verified fact | `Identitas dan usia terverifikasi` only when actually confirmed |
| Marriage status | `Status perkawinan: dinyatakan oleh pengguna` unless independently checked |
| Candidate photo protected | `Foto belum dibagikan. Akses memerlukan persetujuan pemilik dan pendampingnya.` |
| Request CTA | `Ajukan Ta'aruf` |
| Request confirmation | `Jika pengajuan diterima, Anda akan masuk ke satu proses ta'aruf eksklusif sambil menunggu persetujuan kedua pendamping.` |
| Two guardians waiting | `Menunggu persetujuan pendamping` |
| One guardian approved | `1 dari 2 pendamping telah menyetujui` |
| Chat locked | `Percakapan tersedia setelah kedua pendamping menyetujui ta'aruf.` |
| Missing guardian pause | `Percakapan dijeda karena pendamping belum lengkap.` |
| Normal chat supervision | `Ruang ini diikuti oleh kedua peserta dan kedua pendamping.` |
| Conversation privacy | `Akses percakapan terbatas pada anggota yang berwenang.` Do NOT claim functioning E2EE in mocked frontend. |
| Concurrent accept conflict | `Pengajuan ini tidak dapat dilanjutkan karena salah satu pengguna sedang menjalani proses ta'aruf lain.` |
| Consent/revoke photo | `Cabut akses foto` / `Foto tidak akan dapat dibuka lagi melalui Zawjan, tetapi salinan yang pernah dilihat tidak dapat ditarik kembali.` |
| Report evidence | `Pilih pesan yang akan dikirim sebagai bukti. Moderator hanya dapat meninjau bukti yang Anda kirimkan.` |
| Report/exit | `Laporkan dan Akhiri Ta'aruf` plus a separate `Akhiri Ta'aruf` path |
| Simulated backend | `Mode pengembangan: tindakan ini disimulasikan dan belum tersambung ke layanan sebenarnya.` (development builds only) |
| No permission | `Anda tidak memiliki izin untuk membuka halaman ini.` |
| Service error | `Layanan sedang tidak tersedia. Coba lagi atau kembali nanti.` |

**Copy safeguards:** no `100% aman`, `pasti syariah`, `pasti menikah`, `wali sah`, `status lajang terverifikasi`, `admin memantau semua chat`, `end-to-end encrypted` until validated, `online sekarang` unless truthful presence data is available.

---

## 9. Data and TypeScript-facing contract

The following is an **illustrative frontend domain interface**, not a finalized wire API or database schema. Coordinate names and status values with team backend DTOs. Use TypeScript strict mode and discriminated unions for action outcomes. Prefer a service adapter or Inertia page/actions facade so the UI does not depend on a particular transport.

```ts
export type AccountRole = 'participant' | 'pendamping' | 'moderator' | 'admin';
export type IdentityStatus =
  | 'not_started' | 'submitting' | 'automated_check'
  | 'needs_manual_review' | 'approved' | 'rejected'
  | 'resubmission_required' | 'temporarily_unavailable';
export type RequestStatus =
  | 'pending_recipient' | 'mutually_accepted_reserved'
  | 'waiting_pendamping' | 'active'
  | 'declined' | 'cancelled' | 'expired' | 'unavailable';
export type ConversationStatus =
  | 'locked' | 'active' | 'paused_guardian_missing'
  | 'paused_user' | 'frozen_reported' | 'ended';

export interface VerificationFact {
  kind: 'email' | 'identity' | 'age' | 'marital_status';
  status: 'confirmed' | 'declared' | 'not_checked' | 'pending' | 'rejected';
  checkedAt?: string;
  explanation?: string;
}
export interface ViewerCapability {
  canBrowseCandidates: boolean;
  canSendRequest: boolean;
  canAcceptRequest: boolean;
  canSendMessage: boolean;
  canPauseConversation: boolean;
  canResumeConversation: boolean;
  canReadCaseEvidence: boolean;
  canViewProtectedPhoto: boolean;
  canApproveIntroduction: boolean;
  canModerateCase: boolean;
}
export interface ViewerContext {
  id: string;
  roles: AccountRole[];
  identityStatus: IdentityStatus;
  ageEligible: boolean;
  capabilities: ViewerCapability;
  isDevelopmentMock: boolean;
}
export interface CandidateSummary {
  id: string;
  displayName: string;
  age: number;
  city?: string;
  summary?: string;
  declaredCriteria: Record<string, string | number | boolean | null>;
  verificationFacts: VerificationFact[];
  photoVisibility: 'hidden' | 'authorized';
  // DO NOT include a readable original photo URL if the viewer is unauthorized.
  authorizedPhotoUrl?: string;
}
export interface PendampingApproval {
  assignmentId: string;
  participantId: string;
  pendampingAccountId: string;
  displayName: string;
  status: 'invited' | 'verified' | 'pending' | 'approved' | 'declined' | 'withdrawn';
  actedAt?: string;
}
export interface TaArufSummary {
  id: string;
  counterpart: CandidateSummary;
  requestStatus: RequestStatus;
  conversationStatus: ConversationStatus;
  approvals: PendampingApproval[];
  exclusiveReservation: boolean;
  expiresAt?: string; // server authoritative, not hardcoded
  capabilities: ViewerCapability;
}
export interface EncryptedMessageEnvelope {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  ciphertext: string; // opaque transport payload; protocol format TBD
  keyEpochId: string; // membership/rekeying context supplied by reviewed protocol
}
export interface MessageView {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  displayBody: string; // derived ONLY by the authorized client decryptor
  mayReport: boolean;
}
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'IDENTITY_PENDING'
      | 'EXCLUSIVITY_CONFLICT' | 'PENDAMPING_REQUIRED'
      | 'APPROVAL_DECLINED' | 'EXPIRED' | 'VALIDATION_ERROR'
      | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN';
      message?: string; fieldErrors?: Record<string, string>; };
```

**Requirements for domain modeling:**

- Never put real KTP/NIK/selfie payloads, plaintext message history or sensitive report content in general global app state, analytics, browser storage, fixture exports, or URL search parameters.
- A `VerificationFact` is narrower than a generic `Terverifikasi` badge. Automated identity provider details are implementation-deferred.
- UI capability flags are conveniences only; backend must independently authorize every operation and protected resource access.
- Do not force a user to select male/female guardian restrictions or relationship types not established by the product policy. If gender-based candidate discovery is needed, define actual permitted rules with stakeholders and backend before release.
- `active` should mean backend-approved chat state, not “one person clicked accept”.
- Role-based screens should use the same core domain primitives and localized status labels; avoid divergent local business logic.

### 9.1 Replaceable frontend service facade (illustrative)

```ts
export interface AuthService {
  getViewer(): Promise<ActionResult<ViewerContext>>;
  login(input: unknown): Promise<ActionResult<ViewerContext>>;
  logout(): Promise<ActionResult<void>>;
}
export interface IdentityService {
  getStatus(): Promise<ActionResult<IdentityStatus>>;
  submitVerification(input: unknown): Promise<ActionResult<{ status: IdentityStatus }>>;
}
export interface CandidateService {
  search(filters: Record<string, unknown>): Promise<ActionResult<{ items: CandidateSummary[]; nextCursor?: string }>>;
  getDetail(id: string): Promise<ActionResult<CandidateSummary>>;
}
export interface IntroductionService {
  listRequests(): Promise<ActionResult<TaArufSummary[]>>;
  request(candidateId: string): Promise<ActionResult<TaArufSummary>>;
  accept(requestId: string): Promise<ActionResult<TaArufSummary>>;
  decline(requestId: string): Promise<ActionResult<void>>;
  cancel(requestId: string): Promise<ActionResult<void>>;
  approveAsPendamping(introductionId: string): Promise<ActionResult<TaArufSummary>>;
  declineAsPendamping(introductionId: string): Promise<ActionResult<void>>;
}
export interface ConversationService {
  getRoom(id: string): Promise<ActionResult<TaArufSummary>>;
  listEncryptedMessages(id: string): Promise<ActionResult<EncryptedMessageEnvelope[]>>;
  sendEncryptedMessage(id: string, envelope: unknown): Promise<ActionResult<{ messageId: string }>>;
  exit(id: string): Promise<ActionResult<void>>;
}
// The real implementation must use a separately reviewed client cryptographic
// adapter to transform authorized envelopes into MessageView objects.
// A mock may supply fictional MessageView fixtures, but must never be labeled E2EE.
export interface PhotoGrantService {
  listGrants(): Promise<ActionResult<unknown[]>>;
  requestGrant(input: unknown): Promise<ActionResult<unknown>>;
  confirmAsOwnerPendamping(grantId: string): Promise<ActionResult<unknown>>;
  revoke(grantId: string): Promise<ActionResult<void>>;
}
export interface SafetyService {
  submitReport(input: unknown): Promise<ActionResult<{ reportId: string }>>;
  blockUser(userId: string): Promise<ActionResult<void>>;
}
export interface ModeratorService {
  listVerificationCases(filters: unknown): Promise<ActionResult<unknown>>;
  reviewVerification(caseId: string, decision: unknown): Promise<ActionResult<unknown>>;
  listReports(filters: unknown): Promise<ActionResult<unknown>>;
  getReportEvidence(caseId: string): Promise<ActionResult<unknown>>;
  updateReportCase(caseId: string, action: unknown): Promise<ActionResult<unknown>>;
}
```

Do **not** create fake security implementations inside these facade classes. `sendMessage` must be bridged to a reviewed cryptographic client/protocol later; while mocked, show a conspicuous development-mode indicator. Production backend may deliver Inertia page props and form actions rather than REST endpoints — leave transport selection to team integration.

### 9.2 Frontend architecture suggestions

Suggested code organization (adapt to existing repository; don't force a rewrite). **A single shared repo houses all four groups' frontend-facing modules; visual export artifacts live outside `resources/js/` and must not be imported back as runtime components:**

```text
resources/js/
  app.tsx
  layouts/
    PublicLayout.tsx
    ParticipantLayout.tsx
    PendampingLayout.tsx
    AdminLayout.tsx
  pages/
    public/  auth/  onboarding/
    participant/  pendamping/  moderator/  admin/
  features/
    identity/  cv/  discovery/  introductions/
    pendamping/  conversation/  photo-privacy/  safety/  moderation/
  components/
    ui/  shared/  feedback/  navigation/
  domain/
    types.ts  status.ts  capabilities.ts  validation.ts
  services/
    interfaces.ts  mock/  inertia/
  state/
    viewer.ts  ui.ts
  content/
    id.ts
  styles/
    tokens.css  app.css
  tests/
    unit/  integration/  a11y/
figma-export/                  # GENERATED design-review artifacts; never primary UI source
  manifest.json               # screen ID, route, mock state, viewport, HTML and PNG paths
  html/                       # self-contained/static HTML+CSS+local image/font references per view
  captures/                   # companion PNG render, including mobile and desktop views
  README.md                   # tested import method and fidelity limitations
```

Where an existing Laravel repository uses a different case/path (such as `Pages` instead of `pages`), follow the repository convention. Do not create or overwrite a Laravel backend solely to satisfy an export tool. For a new project, supply a standalone frontend development harness *and* document where components mount into Laravel/Inertia. Compile/snapshot exports from the same components and fictional fixtures.

**Shared-source and team integration rules:** keep design tokens, shared components, routing and global session/permission handling centralized. Use feature directories for ownership: **Marinasi** (auth/profile/pendamping account nomination), **Khaslana** (introduction approvals, pendamping oversight, chat), **BrandyKeun** (discovery, KYC initiation, photo privacy, report submission), **EAAA** (moderation/admin). Cross-team flows require one agreed DTO and contract review, not duplicate components or separate frontend copies. Use PRs/code review and coordinate changes to shared UI and route types. The same component implementation must render for normal runtime *and* Figma export states.

**Implementation principles:** separate components from business rules, interfaces from adapters, and theme tokens from layouts. Small typed props; no direct `fetch()` calls in presentation components. Avoid an enormous page or one `App.tsx` containing every role. Routing, status labels, and authorization fallbacks centrally defined. Prefer maintainable project configuration and standard design patterns over aggressive premature abstractions.

### 9.3 Mock adapter requirements

- Use deterministic, clearly **fictional** data with privacy-safe placeholder names, no real KTP scans, faces, NIK, contact details, or production identifiers.
- Provide scenario fixtures for `unverified`, `verification_manual_review`, `cv_incomplete`, `no_pendamping`, `pending_request`, `two_pendamping_waiting`, `one_approved`, `active_four_member_chat`, `guardian_declines`, `guardian_withdrawn`, `simultaneous_acceptance_conflict`, `report_submitted`, `blocked_user`, `photo_revoked`, `moderator_queue_empty`, and `permission_denied`.
- State transitions should be deterministic: simulated user action updates fixture/store, but any security-sensitive mock operation has an obvious development-only marker. Mocking may demonstrate UX, not pretend to protect user data.
- Single switch at bootstrap/DI layer to replace mock services with real adapters, no massive code edits in pages.
- Use server-provided capability values in real mode and fixture capabilities in mock mode. Do not allow production builds to silently default to mocks when a real endpoint fails.

---

## 10. Frontend ↔ backend responsibility contracts

| Domain area | Backend lead / source | Frontend obligation | Nonnegotiable backend behavior |
|---|---|---|---|
| Accounts, roles, sessions, profile, pendamping association | **Marinasi** | Forms, account/profile views, auth/route states, assigned pendamping UI | Auth, RBAC, verified identity mapping, self-supervision prevention, role-bound permissions |
| Requests, exclusive reservation, approvals, conversation lifecycle | **Khaslana** | Requests, trackers, four-member chat, state transitions | Atomic exclusivity; both approvals before messaging; pause/release lifecycle; event timestamps |
| Candidate directory, identity/KYC initiation, photos, blocking, reporting and E2EE integration | **BrandyKeun** | Catalog/filter, KYC flow, photo grant UI, report evidence selection | Protected documents/photos, identity workflow with human fallback, report submission, reviewed crypto protocol, block enforcement |
| Human KYC exception review, reports, user sanctions, access/audit | **EAAA** | Moderator/admin queues, case views, decisions, role-appropriate dashboard | Least privilege, secure evidence/document access, moderation process, audit trail |

**Collaboration rule:** one repository is preferred; assign feature-module ownership, not one HTML website per group. The visual-design export should be imported into a shared Figma design file/pages, while the source components enter the shared frontend tree through reviewed changes. In the absence of an actual repo, Claude should scaffold the frontend once and publish it as a single importable project; each group then integrates its backend with that source. Figma imports are for feedback and visual editing: subsequent approved Figma revisions must be manually reflected back into the React components so they do not drift.

These are module-leading responsibilities from team handoffs; **cross-cutting owners must be agreed** (e.g. identity check initiated by BrandyKeun and approved in EAAA review, account state stored with Marinasi; E2EE transport and conversation membership interoperate with Khaslana). Do not invent a finalized set of HTTP endpoints. Inertia routes and DTO ownership should be documented in the shared repository.

### Integration action examples

**Accept request:** `submit → pending UI → success reserved/waiting_pendamping OR EXCLUSIVITY_CONFLICT`. Do not launch chat optimistically. Server can invalidate other requests.  
**Approve as pendamping:** `submit → confirmation of assigned introduction → approval state → backend conditionally activates room only after both approvals`.  
**Send message:** `type → optional client-side guidance → reviewed client encryption → encrypted envelope only → service authorizes membership and active state → delivery acknowledgment or error`; never plaintext-server scanning masquerading as E2EE.  
**Revoke photo:** `confirm → protected media access invalidated → local cached display removed`; server prevents further retrieval. Browser/device copies cannot be guaranteed erased.  
**Report abuse:** `select messages → preview evidence → explicit submission → freeze/exclusive release → confirmation and report reference`; if upload fails, maintain safe exit and clear retry.

### Integration decisions that require owner sign-off

- [ ] Service transport: Inertia page/action contract, distinct APIs where truly necessary; DTO naming/versioning.
- [ ] Exact `exclusive` reservation and sibling-request terminal statuses; backend-configurable expiration policy.
- [ ] Guardian permissions: can compose messages? Must be online continuously? Multiple assignments/dual participant role?
- [ ] E2EE protocol, key management, key rotation on guardian replacement, secure storage/recovery and report evidence encryption. Do **not** ship a custom ad hoc crypto scheme.
- [ ] e-KYC vendor, KTP/selfie handling and fallback, eligibility proof for 19+, verification label policy.
- [ ] Photo grant recipients and scope, issuance/expiry of protected URLs, cache behavior and revocation semantics.
- [ ] Post-report evidence and KYC document retention, deletion timeline, admin permissions, incident appeals.
- [ ] Client-side content warning/block filters and limitations under E2EE.
- [ ] Privileged admin actions allowed on mobile vs desktop, with accessibility review.

**These are not permission to invent policy.** When a screen depends on an unchecked decision, implement a documented capability-based variant and visible non-destructive fallback. Do not treat a proposed behavior as religiously mandated or production-guaranteed.

---

## 11. Error, empty, loading, and offline behavior

**Every route and interactive component requires:** initial skeleton/placeholder (not fake production data), retryable network error, empty state with appropriate next action, unauthorized response, session-expired handling, optimistic/pending action where safe, duplicate-submit prevention, success confirmation, and recoverable validation error. Status should be expressed in text and icon in addition to color.

- **403**: neutral, no sensitive entity details; provide `Kembali`.
- **404**: no disclosure of whether a candidate/restricted item exists; provide contextual safe destination.
- **409 exclusivity**: neutral `Tidak dapat melanjutkan` with explanation of exclusive process; no assumption of personal rejection.
- **KYC unavailable**: retain profile access and stop discovery; explain next action/automatic fallback only if backend confirms.
- **Upload failure**: show failed file, remove button, retry; never duplicate uploads; no actual sensitive payloads in error logs.
- **Chat disconnected**: do not claim messages sent; show pending/error state with retry when safe; never double-send blindly.
- **Guardian withdrawal**: update immediately to paused, clear composer, reveal replacement path; no access to subsequent messages for withdrawn guardian.
- **Photo grant revoked**: update visible image to protected placeholder, remove in-memory authorized URL where feasible; backend must deny future fetch.
- **Report submitted**: safe exit independent of evidence submission result; show case reference if actually returned.
- **Admin case access denied**: do not cache or display evidence from prior account/context. Clear sensitive views on session/role change.

**Offline behavior:** mobile web may lose connectivity. Cache only non-sensitive static assets/UI scaffolding unless secure storage design is approved. Do not persist protected photographs, decrypted chat content, evidence, or identity documents into offline caches by default.

---

## 12. Accessibility, privacy, and usability acceptance standards

- Semantic headings, landmarks and live regions for changed statuses; meaningful focus management after navigation, validation, confirmation and error banners.
- Fully keyboard-accessible controls and dialogs; visible focus ring; no essential interaction depends only on swipe, hover, color or animation.
- Text contrast targeting WCAG 2.2 AA; test amber accents against white rather than assuming a readable palette. Support browser zoom to 200%+ and user text enlargement without loss of critical content.
- Touch targets typically at least 44×44 CSS px; account for iOS Safari input focus/keyboard, Android viewport, back navigation and safe-area padding.
- Inline form errors linked via `aria-describedby`, field labels always visible, appropriate autocomplete and input modes; intentional order of focus for long biodata forms.
- Prefer explicit confirmation for destructive actions and sensitive disclosures. Make `Tolak`, `Batalkan`, `Akhiri`, and `Laporkan` understandable and reachable.
- Limit personal data collection and UI rendering; KTP/NIK never rendered in candidate or dashboard list; masked case metadata in admin queues.
- Clear consent log expectations and privacy descriptions; product-level report evidence submission is user-selected.
- Content and photograph sources must be attributed where required; visual reference persons are not implied users.
- Conduct testing with real users/stakeholders before release; research and moodboard are **not** evidence of tested usability.

---

## 13. End-to-end acceptance test checklist

These test names are **required frontend/contract scenarios**, not claims of passing tests. Use component tests, role-aware integration tests and backend E2E later.

| ID | Scenario | Acceptance expectation |
|---|---|---|
| T01 | Applicant DOB below 19 | Cannot enter eligible discovery or active ta'aruf; age explanation shown |
| T02 | KYC provider unavailable | Profile editing available; catalog and requests locked; manual review path shown only when backend supports it |
| T03 | Unverified pendamping invited | Cannot approve a specific introduction until own identity-verified account is ready |
| T04 | Self-created secondary account as own pendamping | Backend verified-identity duplicate prevents self-supervision; UI displays generic actionable error |
| T05 | Participant requests candidate | Pending request shown; no chat yet |
| T06 | Recipient accepts | Exclusive reservation appears; two pendamping approvals pending; chat composer absent |
| T07 | Two candidates accept concurrently | First atomic acceptance succeeds; other receives neutral conflict, no second exclusive session |
| T08 | First pendamping approves | Tracker `1 dari 2`; chat still locked |
| T09 | Both pendamping approve | Backend activates room; four members listed; message sending enabled only per capability |
| T10 | Pendamping declines while waiting | Introduction cancelled, exclusivity released, user informed |
| T11 | Pendamping withdraws during active chat | Composer disabled, room paused; replacement flow visible |
| T12 | New pendamping joins | Authorized to future messages only; historical content not backfilled automatically |
| T13 | User revokes photo grant | Subsequent protected fetch denied; UI reverts to hidden; conversation remains |
| T14 | Reporter selects and submits evidence | Moderator sees only submitted messages; no `decrypt all` capability |
| T15 | User reports or exits | User can leave unilaterally; communication frozen/ended; lock released promptly |
| T16 | Blocked candidate | Removed from search/contact according to server, including direct URL enforcement |
| T17 | Ended room | Read-only, no message sending, permitted post-closure reporting remains |
| T18 | Role changed / session expires | Protected admin/guardian content cleared; unauthorized screen inaccessible |
| T19 | Small mobile viewport + keyboard | No unreachable send/confirm buttons or horizontal overflow; bottom nav usable |
| T20 | Desktop moderator complex review | Review panel, queue navigation, audit and confirmation usable by keyboard; no exposed KTP in list |
| T21 | Mock-to-real adapter swap | Page components unchanged; all data access via services; production does not silently use mock data |
| T22 | Loading, empty, error, rate-limited states | All critical screens have clear information and recovery actions |
| T23 | Report failure | User retains immediate safe-exit action without needing successful upload |
| T24 | All marketing claims | No fictitious metrics, guaranteed outcomes, unsupported verification/religious/cryptographic badges |

### Suggested automated testing stack (adapt to repository)

- React Testing Library and Vitest/Jest (choose what's already configured) for component/unit tests.
- Playwright or equivalent for mobile responsive end-to-end UI flows and keyboard/screen reader smoke checks.
- Contract fixtures shared with backend teams for request acceptance, guardian approval, identity status and report access.
- Backend authorization, cryptographic protocol, and real e-KYC verification require independent security and integration testing beyond this frontend deliverable.

---

## 14. Delivery instructions for Claude

### Target deliverable — TWO synchronized outputs

**A. Real application frontend (source of truth):** implement maintainable, production-intended **React + TypeScript** components, Tailwind/shadcn UI where compatible, and typed, replaceable services. Align to the existing repo if provided: inspect its frontend dependencies, Laravel/Inertia integration, route conventions and components before changes. **If no repo exists, scaffold the frontend once** with a runnable local preview and documented integration entry points, without pretending backend functionality is complete. The runtime source must **not** be a monolithic handwritten HTML page.

**B. HTML-to-Figma design export (derived artifact):** use the **same running app/components, theme tokens, fonts and mock fixtures** to export representative pages and important states as **static, importable HTML/CSS with locally available assets**, accompanied by PNG captures. Prefer rendering/capturing the actual pages with a deterministic development scenario tool. Use a workflow such as importing a running local page through `html.to.design` or an equivalent supported HTML-to-Figma importer; when direct file import is supported and verified, provide its HTML package. Do not assume a React source file, Vite entry HTML, or bare `page.content()` without linked styles/assets is itself a faithful, self-contained Figma export.

The two outputs **MUST NOT** be separate implementations. `figma-export/` is a generated snapshot of the app's presentation for review/import, not source code to be merged into `resources/js/`. A Figma import normally creates editable visual layers rather than React components; it may not preserve interactions, auto-layout, fonts or responsive behavior perfectly. Verify representative imported frames and record any manual cleanup required. Never promise perfect editable fidelity across tools.

**Output target:** a ZIP/archive or repo directory containing runnable frontend source **and** `figma-export/` (plus the `design.md` contract), suitable for a single handoff to the user / Claude and later backend teams. Do not require the user to manually gather Mobbin screenshots or rebuild a second Figma design from scratch. External Mobbin flow links are references, not reusable design assets; do not bundle copyrighted reference screenshots or brand assets without rights.

### HTML/Figma export procedure and coverage

1. Launch the **same React application** in a development-only `design-export`/fixture mode. Render each selected route as an authorized **fictional** role and deterministic UI state; never fetch sensitive live API data. Scenario selectors and mock flags must be disabled/removed from production builds.
2. At minimum capture **390px-wide mobile** and **1440px-wide desktop** views of the public landing, login/register, onboarding/KYC, CV editor, catalog, CV detail, request review, pendamping-approval tracker, active/paused conversation, privacy grant and report flow. Additional mobile sample at 360px and tablet check at 768px are strongly encouraged. For **moderator/admin**, make **1440px desktop the primary** export, with at least a 390px mobile fallback/reference for the most important pages. These are reference widths; responsive height and viewport testing remain necessary.
3. Export key alternate states (not every Cartesian combination) that affect visible layout: e-KYC manual review/rejected; no results; pending/one approved/both approved/declined guardian; exclusivity conflict; paused conversation; photo protected/authorized/revoked; report success; case queue empty; forbidden/error/loading. Include each change as its own named frame/snapshot when its visual behavior differs materially.
4. For each exported view, generate a `manifest.json` entry with `screenId`, `actor`, `sourceRoute`, `scenarioId`, `viewportWidth`, `viewportHeight`, `htmlPath`, `pngPath`, `snapshotTimestamp` and `notes`. Route/scenario references belong only in development/export manifests, not user-visible production URLs or payloads.
5. Provide portable HTML with styles, font loading and image assets resolvable in the exported package. If using a captured rendered DOM, preserve or inline its required CSS and localize references safely; do not assume `page.content()` alone includes loaded styles or asset bytes. If the chosen importer needs a running local URL, document the command and URL pattern instead of producing unusable standalone HTML.
6. Test **at least** one mobile catalog/profile screen, one mobile approval or chat state, and one desktop moderator review page by opening or importing the output. Compare against companion PNG, check missing assets, text wrapping, colors, spacing and layer editability. If the importer is not accessible in the environment, include the export assets and an honest `IMPORT_NOT_VALIDATED` note; **do not claim Figma import was tested**.
7. Store design exports separately from runtime code. When the React design changes, **regenerate** the exports. For Figma-only tweaks approved by the team, make the corresponding code changes and regenerate rather than allowing designs and code to diverge.

### Shared-repository collaboration and ownership

- **ONE shared frontend/app repository** is the recommended integration model; feature ownership does **not** mean four separate HTML projects or four forks of the UI.
- **Marinasi:** authentication, participant CV/profile, pendamping account invitation/assignment UI and related domain adapters.
- **Khaslana:** ta'aruf requests, atomic-exclusivity UI states, guardian-specific introduction approval, four-member chat, and pause/end status views.
- **BrandyKeun:** directory/filtering, candidate detail, identity-check initiation, photo visibility/consent, block/report initiation, client crypto integration boundary.
- **EAAA:** moderator/admin desktop-primary queues, case review, enforcement, roles/audit UI.
- **Shared frontend maintainers (assign in GitHub):** application shells, design system, common components, role guards, navigation, error handling, shared types, mock/real adapter interface; team members use feature branches and pull requests rather than overwrite shared files.
- **Cross-module flow contracts:** verify nomination/approval ownership, encrypted messaging interface, KYC review loop and evidence report pipeline in `INTEGRATION_NOTES.md`. Backend teams must agree to actual Inertia props/actions or endpoints; Claude should not invent finalized route URLs.
- **When no repo has been supplied:** do not ask the user to gather one first; provide the scaffolded codebase as a single package and clear instructions for later merging into the team's Laravel application.

### Implementation sequence

1. **Foundation:** theme tokens, fonts, shared components, layouts, mock/service DI boundary, centralized copy and status mapping.
2. **Auth/onboarding:** registration, 19+ gate, verification status UX, CV editor, pendamping invitations.
3. **Participant journeys:** mobile home, catalog/filter, detailed CV, request/send/accept/decline, guardian approval tracker.
4. **Supervised conversation:** four-member chat UI, live/paused/frozen/ended views, reporting/exit, photo consent controls. Only mock interaction until E2EE is reviewed/integrated.
5. **Pendamping experience:** invitation acceptance, individual approvals, oversight and withdrawal; no unauthorized history.
6. **Moderator/admin:** desktop-primary queues/case views, management, audit trail and mobile-safe subsets.
7. **Testing/refinement:** test the stress scenarios, responsive viewports, keyboard/accessibility, error states, replacing mocked service adapters with an integration stub.
8. **Design export:** render key routes/states from the finished components, generate portable HTML/CSS/assets + PNG snapshots and manifest, test representative import paths, document visual differences, package source and export together.

### Definition of frontend completion

- All required screens/routes exist and render with correct role, status and permission variants.
- Core frontend interactions are functional through mock adapters and use non-sensitive fictional data during development.
- Components reusable and editable, typed, tested and not dependent on a single hardcoded viewport.
- Correct responsive strategy per role (mobile-first participant/pendamping; desktop-primary admin).
- No security/verification features falsely described as operational while adapters are mocked.
- Clear documented service API/DTO assumptions and test fixtures supplied to each backend team.
- No unresolved critical rule silently decided by Claude; blockers and capability-dependent variants listed in integration notes.
- Code is suitable for incremental backend hookup, reviews and later UI changes.
- Representative mobile-first screens and desktop-primary admin screens have a reproducible export process into HTML/CSS/assets + PNG, with a route/state/viewport manifest. The design export is derived from runtime components, not independently maintained.
- At least one representative mobile and desktop import is visually checked when importer access exists; any unvalidated import is explicitly documented.

### Expected outputs from Claude

1. **Runnable React + TypeScript frontend source** in a structured shared project, with Tailwind and reusable components, development scripts, and production build instructions.
2. **`figma-export/`** containing rendered screen/state HTML/CSS/assets and corresponding PNG views, with a machine-readable manifest; if HTML file import is unsupported by the chosen importer, provide a tested local-URL capture/import path and retain the HTML package for inspection.
3. **`FIGMA_IMPORT_GUIDE.md`** describing import method, representative test results, required tools/extensions, font/asset notes and any fidelity limitations; do not falsely claim an import succeeded.
4. **README**: install/run/build instructions, repository/architecture layout, source-of-truth rule, mock/real mode, where backend teams connect, how to regenerate design exports.
5. **`INTEGRATION_NOTES.md`** listing assumed DTOs/capabilities, unconnected endpoints/actions, owners per group, and unresolved decisions; do not invent finalized production APIs.
6. Seeded **fictional** fixtures and scenario toggles available **only** in development/export mode, never enabled on a production deployment.
7. Tests/acceptance evidence covering §13 plus export completeness and absence of missing assets.
8. **One package/archive or shared repo tree**, not four independent implementations; no real identity documents, personal message content, credentials or unauthorized third-party visual assets checked in.

---

## 15. Open decisions / no silent assumptions

**These are genuine unresolved rules.** They do not block visual research or the base component implementation, but must be resolved before the affected feature is production-ready.

| Issue | Decision owner | Safe implementation posture |
|---|---|---|
| Pendamping may send messages or only observe | Product owner + Khaslana | Show room roster; conditionally render composer per backend `canSendMessage`, no fixed promise |
| Pendamping must be live online or asynchronous participant | Product owner + Khaslana | Do not assert live supervision; room authorization distinct from presence |
| Concurrent or multiple pendamping assignments; dual participant role | Marinasi + product owner | Model assignments explicitly; do not assume universal role switching |
| Exact timeout and renewal of reserved introduction | Khaslana + product owner | Use server `expiresAt`; no hardcoded expiration |
| Resume rules for voluntary pause; who can resume | Khaslana + product owner | Capability-based UI; no automatic resume assumption |
| Which specific recipients may view protected photo | Product owner + BrandyKeun | Named viewer selection and per-viewer grant; no automatic access to the other guardian |
| E2EE key and report-evidence implementation | BrandyKeun + Khaslana + security review | Mocked UI only until audited implementation; no fake encryption |
| Automated e-KYC vendor, document types and fallback | BrandyKeun + EAAA + Marinasi | Provider-agnostic form and human review states |
| Personal data deletion and report-evidence retention | Privacy/legal stakeholder + EAAA | Explain request; do not promise instant irreversible removal of all records |
| Admin workflows supported on small screens | EAAA + product owner | Mobile summaries first; complex actions disabled with explanation if not safe/implemented |
| Exact CV questions/field sensitivity and relevance filters | Product owner + Marinasi + BrandyKeun | Configurable schema, avoid introducing mandatory sensitive attributes |
| Optional questionnaire, nazhar scheduling, premium, community | Stakeholder priority decision | Do not add as mandatory routes just because historical reports mention them |
| Final visual polish of Zawjan logo/wordmark, imagery license review | Brand owner / design team | Use typographic `Zawjan` name for now, not old Halal.in logo |
| Final HTML-to-Figma importer/tool, editable-layer fidelity and export automation | Design team + frontend lead | Default to capture from locally served React app and portable export; verify imports on representative screens; mark untested tooling as pending |
| Formal religious/legal endorsement or specific fiqh claims | Qualified adviser and stakeholder | Product-policy wording rather than blanket certification |

**Faith/rules caution:** the supervision requirement and mutual approvals are **Zawjan product/stakeholder policies informed by religious concerns**, not a claim that every school of Islamic jurisprudence mandates two online pendamping. The platform does not itself perform a marriage, validate a legal wali nikah, or offer KUA legal services. Where religious rulings or marital eligibility could materially affect use, product copy and implementation must be independently reviewed by qualified stakeholders.

---

## 16. Mobbin references — pattern library, not copy targets

These are specific Mobbin flow links returned during the research phase. Their patterns are **suggested areas to inspect**, not verified descriptions of every individual screenshot. Inspect full flow screens and check licensing/usage before reusing assets. **Do not replicate original trademarks, copyrighted interface compositions, photos or copy.** Zawjan's source design system and domain requirements take precedence.

| Zawjan task | Source flow | Research focus |
|---|---|---|
| Mobile identity verification | [Wise — Verifying identity](https://mobbin.com/flows/898f1907-18b8-4c5a-929a-e24227d5a193?tab=screens) | Multi-stage instructions, recoveries, verification status |
| Web identity flow | [Oyster — Verifying identity](https://mobbin.com/flows/a18b06c1-afea-469e-85bd-8acde3bcde86?tab=screens) | Desktop document verification, transparency |
| Mobile onboarding / CV | [Bumble — Setting up profile](https://mobbin.com/flows/40d27c84-e6a1-487b-b14d-f91f67b7be2c?tab=screens) | One-task-at-a-time profile entry; NOT swiping |
| Candidate filter UX | [Plenty of Fish — Filtering matches](https://mobbin.com/flows/6b62aa64-406b-4c5a-9b1e-c77d0e536ff4?tab=screens) | Editing filters and restoring results |
| In-depth profile browsing | [Badoo — View user profile](https://mobbin.com/flows/af2c5845-b429-456f-8a34-ee472d8d4705?tab=screens) | How profile detail can expose progressive information |
| Profile data reading | [Plenty of Fish — Member profile](https://mobbin.com/flows/64f357df-46a3-4693-b608-b84bdcb81191?tab=screens) | Structured biodata sections |
| Mutual interest intent | [Hinge — Sending a like](https://mobbin.com/flows/34c2cff4-568f-4725-b609-fee531209db8?tab=screens) | Small deliberate request flows, not a swiping clone |
| Appoint a trusted adult | [Monarch — Inviting a household member/advisor](https://mobbin.com/flows/757c3bcc-163e-4e3b-ba5a-85c6b1ce8ad6?tab=screens) | Role invitation vs actual permission |
| Web invitation | [WorkOS — Inviting a user](https://mobbin.com/flows/86a326dc-eac5-40a7-95bb-2da9668e258b?tab=screens) | Invitation progression, confirmation |
| Membership confirmation | [1Password — Confirming a member](https://mobbin.com/flows/27461829-d972-4053-8b8d-8562afb351ca?tab=screens) | Distinct membership acceptance |
| Group member details | [GroupMe — Chat details](https://mobbin.com/flows/7766375f-628e-4848-b116-eec7711f73ea?tab=screens) | Member roster and actions |
| Group detail alternative | [Telegram — Group details](https://mobbin.com/flows/1bd80e7a-7d63-4e84-b7b8-5d6c33ce5b69?tab=screens) | Group overview and membership visibility |
| Web group messaging | [Campsite — Chatting with team members](https://mobbin.com/flows/fc9b1c28-5f28-48e3-81b1-69d96c4e9b60?tab=screens) | Split-pane conversation organization |
| Safety reporting | [Badoo — Blocking and reporting a user](https://mobbin.com/flows/cb8bed88-def7-47e9-92d0-9351c948d418?tab=screens) | Report/block entry points and outcome states |
| Desktop case management | [Zendesk — Dashboard (Support)](https://mobbin.com/flows/2323fc5b-a86f-491b-af6f-073768b6c0de?tab=screens) | Queue and status hierarchy for admin |
| Help-desk workflows | [HubSpot — Help desk](https://mobbin.com/flows/30c64f88-3691-4b55-9ab2-4a80fa7d78ce?tab=screens) | Data-dense review and case navigation |

**Visual source of truth:** [Editable Figma moodboard](https://www.figma.com/design/o2Bp9svvXAE8LyRfzTnFm5?node-id=2-2) and [image/credit source index](https://www.figma.com/design/o2Bp9svvXAE8LyRfzTnFm5?node-id=2-59). Keep the established palette/typography but revise all name/logo usage to **Zawjan**. Figma moodboard was developed under desktop-first assumptions; use it for visual tone, not the final responsive layout.

---

## 17. Explicit handoff instruction to Claude

> **Deliver Zawjan as ONE real, editable frontend codebase plus a derived HTML-to-Figma design export.** Use this `design.md` as the authoritative design and interaction contract, reconciled with any existing repo and backend DTOs. If no repo is given, scaffold one shared React + TypeScript frontend from scratch, compatible with later Laravel/Inertia integration; provide a runnable development preview and build scripts. Implement mobile-first participant/pendamping experiences and desktop-primary moderator/admin experiences. Use typed mock adapters, deterministic fictional fixtures, real navigation and complete screen states, but do not advertise unimplemented e-KYC/E2EE/security as operational. Build the shared design system once and organize feature modules for Marinasi, Khaslana, BrandyKeun and EAAA, with clear ownership and cross-team integration notes.
>
> **In addition**, generate `figma-export/` from the running **same React components**: self-contained/static rendered HTML/CSS/local assets where feasible, companion PNG captures, a screen/role/state/viewport manifest, and `FIGMA_IMPORT_GUIDE.md`. Make these practical to import as editable visual layers using a supported HTML-to-Figma workflow; actually verify representative imports when tools are available or flag the import as unvalidated. The Figma export is **not** a second codebase and should never be merged back as runtime HTML. Future edits must update the React source and regenerate design exports so both remain aligned.
>
> Keep the output suitable to give backend teams as **a single project package**, not independent HTML projects per group. Preserve explicit open decisions; do not invent religious or legal rulings, guardian powers, photo recipients, e-KYC vendors, encryption claims, status transitions or production metrics. Provide README, integration notes, mock-to-real adapter instructions, and acceptance tests. Treat Mobbin as reference links only, not a license to reproduce screens or third-party assets.

**End of handoff — v1.1, dual-output workflow.**
