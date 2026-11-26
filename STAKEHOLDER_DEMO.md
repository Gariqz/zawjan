# Stakeholder demo guide

This guide is for presenting the Zawjan prototype to stakeholders. Everything you click runs in the browser against a **fictional in-memory backend**. No real accounts, documents, messages or photos exist, and nothing is sent anywhere.

**Status: ready for local UX review, not approved for production.** Port backend rules only after stakeholders approve the demo flow.

## Before the meeting

```bash
npm install
npm run dev                  # http://localhost:5173
```

Or, for a laptop without the dev toolchain running, build a static copy once and serve it:

```bash
npm run build:demo           # writes dist-demo/
npx vite preview --outDir dist-demo --port 4173
```

To check the six journeys below plus the public showcase, run `npm run demo:check`. It builds the demo bundle, clicks through all seven in Chromium, and writes a screenshot in `demo-walkthrough/` if a step breaks. First run: `npm run playwright:install`.

## How to tell mock from real

| You see | Meaning |
| --- | --- |
| Yellow bar at the top: "Mode pengembangan: tindakan ini disimulasikan…" | Every screen runs on fictional data. It is never shown in a production build. |
| Amber "Skenario" pill, bottom right | Opens the presenter panel: change scenario, change persona, simulate server events. Production builds do not contain it. |
| "Akun demo (data fiktif)" box on the login page | Fills in a demo account. Any password works except `salah-sandi`, which shows the failed-login message. |
| "Pesan tidak dienkripsi" in chat | True statement: the prototype chat is plain text. The app never claims end-to-end encryption. |
| "(contoh fiktif)", "(ilustrasi fiktif)" on documents and portraits | Illustrations, not real people. |

## Presenter controls

- **Start of every journey:** open the start URL below. Opening a URL (or reloading) resets the fictional world to that scenario. Inside a journey, use only in-app clicks so the state you create carries through.
- **Screen index:** `/__layar` lists all 39 screens and their states by team, with the "Tur demo" list at the top. Each link opens the live screen.
- **Scenario panel ("Skenario" pill):** 36 scenarios, 4 personas, and buttons that simulate what another person or the server would do (a candidate accepting, the other pendamping approving, a message arriving). Changing scenario reloads the page. Changing persona keeps the fictional world in the same tab until reload; nothing syncs between tabs or browsers.
- **Mobile view:** participant and pendamping screens are designed for phones. Use the browser's device toolbar at 390 px wide. Moderator and admin screens are desktop-first (1440 px).
- **Slow network:** add `&latency=1200` to any URL to show loading states.

## Journeys

Each journey lists its start URL, the owning team(s), and the clicks. Button labels are in Indonesian, as in the app.

### 0. Public showcase, about 2 minutes

Start: `/`. Choose **Coba Simulasi**. Browse two fictional introductions, advance four approvals, then try granting, confirming and revoking example photo access. No action leaves this page. Desktop keeps the chapter guide in view; mobile reads top to bottom. The lantern uses three Blender-rendered WebP poses; the GLB is available as an asset but is not loaded by the page.

### 1. Registration to ready-to-browse (Marinasi + BrandyKeun), about 4 minutes

Start: `/daftar?scenario=unverified` (mobile)

1. Fill in **Daftar**: any name, any e-mail, a password of 8+ characters, a birth date that makes the person 19 or older. Tick the three consents (they start unticked on purpose). Click **Daftar**.
2. Click **Lanjutkan ke langkah berikutnya**. Try the three-part mascot guide or **Lewati panduan**. Skipping does not change or bypass the four account preparation steps. Use **Buka panduan** to replay it.
3. **Mulai verifikasi** → **Mulai** → choose any JPG/PNG for **Dokumen identitas (KTP)** and **Swafoto** → **Kirim untuk diperiksa**. After about 2 seconds the simulated check moves to **Identitas dan usia terverifikasi**. Click **Lanjutkan**.
4. **Isi CV** → fill each section → **Bagian berikutnya** … **Tinjau** → **Terbitkan CV**. Point out the "who can see this" label on every section.
5. **Undang pendamping** → `fatimah@contoh.id` → **Kirim undangan**. No email is sent in the demo.
6. In the same tab, switch to **Pendamping** with **Skenario** → **Masuk sebagai**. Choose **Lihat undangan** → **Terima undangan**, then switch back to **Peserta**. Review the next action in **Beranda**. **Jelajahi** is optional.

Talking points: 19+ is enforced by the server, not the form; the pendamping verifies their own identity; consent is separate and explicit.

### 2. Jelajahi and ta'aruf request (BrandyKeun + Khaslana), about 2 minutes

Start: `/jelajahi?scenario=verified_browsing` (mobile)

1. Browse one text-only, opt-in introduction at a time using **Sebelumnya** or **Berikutnya**, or swipe vertically on **Geser ke atas / bawah** on mobile. Moving between cards sends no request or signal. Open Fikri's introduction before making an explicit request.
2. **Ajukan Ta'aruf** → read the confirmation (who receives what, exclusivity, next step) → **Ajukan Ta'aruf**.
3. Bottom navigation **Ta'aruf** → tab **Dikirim**: the request is pending and there is no chat.
4. Scenario panel → **Calon menerima pengajuan**. **Lihat persetujuan** now shows the four-party tracker and "Menunggu persetujuan pendamping".

### 3. Two pendamping approvals (Khaslana), about 3 minutes

Start: `/pendamping/persetujuan/tar-rahman?scenario=two_pendamping_waiting&persona=pendamping` (mobile)

1. As **Ibu Fatimah S.** (Aisyah's pendamping), review the summary → **Setujui ta'aruf** → confirm.
2. Log out with the icon at the top right. The login page says "Anda telah keluar".
3. In **Akun demo**, choose **Peserta — Aisyah R.** → **Masuk**. The approval you just gave is still there, because a logout does not reset the demo world.
4. **Ta'aruf** → **Lihat persetujuan**: "1 dari 2 pendamping telah menyetujui", chat still locked.
5. Scenario panel → **Pendamping pihak lain menyetujui** → **Buka percakapan**: the four-member room is open and the composer is enabled.

### 4. Supervised chat, photo sharing and reporting (Khaslana + BrandyKeun), about 3 minutes

Start: `/taaruf/tar-rahman/obrolan?scenario=active_four_member_chat` (mobile)

1. Point out the roster (two participants, two pendamping) and "Pesan tidak dienkripsi". Send a message. Scenario panel → **Calon mengirim pesan** for a reply.
2. **Akun** → **Privasi & Foto** → **Bagikan foto** → tick Rahman → **Minta konfirmasi pendamping**. Switch to **Pendamping** in the same tab to confirm, then back to **Peserta** to revoke. Only the active partner is eligible to receive access; the owner's pendamping confirms without seeing the photo.
3. **Akun** → **Keamanan** → **Buat laporan** → choose a category, tick one message as evidence → **Tinjau laporan** → **Kirim laporan**. The room freezes and releases exclusivity. Only the selected message goes to moderators. The assigned pendamping can also report from the room, but cannot end the ta'aruf on the participant's behalf.

### 5. Moderation and administration (EAAA), about 4 minutes

Start: `/laporan/baru?subjek=cand-rahman&scenario=verified_browsing` (desktop 1440 px)

1. Pick **Permintaan uang atau penipuan**, enter a fictional description, then choose **Tinjau laporan** and **Kirim laporan**. Note the receipt number.
2. In the same tab, open **Skenario** → **Masuk sebagai** → **Moderator**. Find the same number in **Laporan prioritas**, open it, and check the description. **Buka laporan** shows the same case in the queue.
3. Back in **Ringkasan**, open a case from **Antrean verifikasi KYC**. Review the fictional document and selfie, then choose **Setujui verifikasi** and **Simpan keputusan**. The case history gains an entry.
4. In **Laporan**, open **LAP-2611-201** to see only the evidence the reporter chose. Add an internal note, then choose **Tangguhkan akun**, give a reason, and select **Konfirmasi tindakan**. **Riwayat Aksi** and the dashboard show the action.
5. Log out (**Keluar** in the sidebar), sign in as **Admin — Rizal**, then open **Pengguna** and choose **Tangguhkan** with a reason. **Audit** shows the entry.

Talking points: moderators see submitted evidence, not room history. Demo sanction decisions require a reason and appear in the action history. Full audit coverage remains a production requirement; admin and moderator permissions are separate.

### 6. Failures and limits (all teams), about 2 minutes

- `/beranda?scenario=network_offline`: the connection message and **Coba lagi**, no fake data.
- `/laporan/baru?ruang=tar-rahman&scenario=report_submission_failed`: a report fails to send, and **Akhiri Ta'aruf** (safe exit) stays available.
- `/beranda?scenario=signed_out`: guarded pages send you to the login page.
- In the scenario panel, also try **Layanan tidak tersedia**, **Dibatasi sementara** and **Akses ditolak**.

## What is not real (say this out loud)

- No backend, database, email delivery, KYC provider or payment. The demo has one synthetic recipient account. Photo replacement, deletion and protected serving are backend work, not implied by this demo.
- No end-to-end encryption. The chat boundary (`MessageCodec`) exists, but no reviewed protocol has been chosen.
- Routes and API endpoints are proposals waiting for the backend teams.
- The Figma export has not been imported into Figma yet (see `FIGMA_IMPORT_GUIDE.md`).
- A full screen-reader pass has not been done.
