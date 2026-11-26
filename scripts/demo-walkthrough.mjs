#!/usr/bin/env node
/**
 * DEMO CHECK: drives the stakeholder journeys (STAKEHOLDER_DEMO.md / app/demoJourneys.ts) in a real
 * Chromium against the export build (mock adapters). Each journey starts from one URL and then only
 * uses in-app clicks, so the in-memory mock state carries through exactly as in a live demo.
 *   npm run build:export && node scripts/demo-walkthrough.mjs [--journey=<id>] [--headed]
 * On failure it writes a screenshot to demo-walkthrough/<journey>.png.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { preview } from 'vite';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const only = arg('journey');
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const btn = (page, name) => page.getByRole('button', { name, exact: false });
const link = (page, name) => page.getByRole('link', { name, exact: false });
const see = async (page, re, timeout = 6000) => {
  await page.getByText(re).first().waitFor({ state: 'visible', timeout });
};
/** Click without Playwright's post-click wait: buttons that navigate away on success detach mid-click. */
const press = async (locator) => {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((el) => el.click());
};
const expectEnabled = async (locator) => {
  await locator.waitFor({ state: 'visible' });
  if (await locator.isDisabled()) throw new Error('expected an enabled control');
};
const confirmIfDialog = async (page) => {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) { await dialog.getByRole('button').last().click(); await dialog.waitFor({ state: 'hidden' }); }
};
const simulate = async (page, label) => {
  await page.locator('div[data-dev-panel] > button').click();
  await page.locator('[data-dev-panel]').getByRole('button', { name: label }).click();
  await page.getByRole('button', { name: 'Tutup panel' }).click();
};
const confirmDialog = async (page, name) => {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await (name ? dialog.getByRole('button', { name }) : dialog.getByRole('button').last()).click();
  await dialog.waitFor({ state: 'hidden' });
};
async function fillCvSection(page) {
  for (const el of await page.locator('input[id^="cv-"]:visible, textarea[id^="cv-"]:visible, select[id^="cv-"]:visible').all()) {
    const tag = await el.evaluate((n) => n.tagName);
    if (tag === 'SELECT') { if (!(await el.inputValue())) await el.selectOption({ index: 1 }); continue; }
    if (await el.inputValue()) continue;
    await el.fill((await el.getAttribute('type')) === 'number' ? '28' : 'Contoh isian demo');
  }
}

const JOURNEYS = {
  async showcase(page) {
    await page.goto(BASE);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.keyboard.press('Tab');
    if (!(await link(page, 'Lewati ke konten').evaluate((el) => el === document.activeElement))) throw new Error('skip link is not first in tab order');
    await link(page, 'Coba Simulasi').click();
    const profile = page.locator('#contoh-cv');
    await profile.getByRole('heading', { name: 'Nisa', exact: true }).waitFor();
    await profile.getByRole('button', { name: 'Berikutnya' }).press('Enter');
    await profile.getByRole('heading', { name: 'Hana', exact: true }).waitFor();
    await profile.getByRole('button', { name: 'Sebelumnya' }).press('Enter');
    await profile.getByRole('heading', { name: 'Nisa', exact: true }).waitFor();
    const approvals = page.locator('#contoh-persetujuan');
    await approvals.scrollIntoViewIfNeeded();
    await page.locator('#contoh-persetujuan[data-revealed]').waitFor();
    const intro = approvals.locator('.zh-chapter-intro');
    if (await intro.evaluate((el) => getComputedStyle(el).animationName) === 'none') throw new Error('chapter reveal did not animate');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (await intro.evaluate((el) => getComputedStyle(el).animationName) !== 'none') throw new Error('reveal animation ignores reduced motion');
    const grant = page.locator('#contoh-izin');
    const grantButton = grant.getByRole('button');
    if (!(await grantButton.isDisabled())) throw new Error('photo grant available before four approvals');
    const advance = approvals.getByRole('button');
    for (let i = 0; i < 4; i += 1) {
      await approvals.getByRole('status').filter({ hasText: 'Percakapan belum terbuka.' }).waitFor();
      await advance.click();
    }
    await approvals.getByRole('status').filter({ hasText: 'Ruang percakapan contoh terbuka' }).waitFor();
    for (const status of ['Menunggu konfirmasi', 'Izin aktif', 'Izin dicabut']) {
      await grantButton.click();
      await grant.getByText(status, { exact: true }).waitFor();
    }
  },

  async onboarding(page) {
    await page.goto(`${BASE}/daftar?scenario=unverified`);
    await page.getByLabel('Nama tampilan').fill('Nadia Demo');
    await page.getByLabel('Email').fill('nadia@contoh.id');
    await page.getByLabel('Kata sandi').fill('rahasia123');
    await page.getByLabel('Tanggal lahir').fill('1997-05-14');
    for (const cb of await page.getByRole('checkbox').all()) await cb.check();
    await btn(page, 'Daftar').last().click();
    await see(page, 'Periksa email Anda');
    await link(page, 'Lanjutkan ke langkah berikutnya').click();
    await see(page, 'Langkah memulai');
    await see(page, 'Bagian 1 dari 3');
    await btn(page, 'Berikutnya').click();
    await see(page, 'Bagian 2 dari 3');
    await btn(page, 'Lewati panduan').click();
    await btn(page, 'Buka panduan').click();
    await see(page, 'Bagian 1 dari 3');
    await btn(page, 'Lewati panduan').click();
    await link(page, 'Mulai verifikasi').click();
    await btn(page, 'Mulai').click();
    await page.locator('#capture-document').setInputFiles({ name: 'ktp-fiktif.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.locator('#capture-selfie').setInputFiles({ name: 'swafoto-fiktif.png', mimeType: 'image/png', buffer: PNG_1PX });
    await see(page, 'Terunggah');
    await btn(page, 'Kirim untuk diperiksa').click();
    await see(page, /Identitas dan usia terverifikasi|Memeriksa identitas/);
    await see(page, 'Identitas dan usia terverifikasi', 12000);
    await link(page, 'Lanjutkan').click();
    await link(page, 'Isi CV').click();
    for (let i = 0; i < 12; i += 1) {
      if (await btn(page, 'Terbitkan CV').isVisible()) break;
      const stepText = () => page.getByText(/^Bagian \d+ dari \d+/).innerText();
      const before = await stepText();
      await fillCvSection(page);
      await page.getByRole('button', { name: /^(Bagian berikutnya|Tinjau)$/ }).click();
      await page.waitForFunction((b) => !document.body.innerText.includes(b), before);
    }
    await press(btn(page, 'Terbitkan CV'));
    await see(page, 'Langkah memulai');
    await link(page, 'Undang pendamping').last().click();
    await page.getByLabel('Email calon pendamping').fill('fatimah@contoh.id');
    await btn(page, 'Kirim undangan').click();
    await see(page, /menunggu tanggapan/);
    await page.locator('div[data-dev-panel] > button').click();
    await page.getByLabel('Masuk sebagai').selectOption('pendamping');
    await link(page, 'Lihat undangan').click();
    await btn(page, 'Terima undangan').click();
    await see(page, 'Undangan diterima. Anda sekarang pendamping aktif.');
    await page.locator('div[data-dev-panel] > button').click();
    await page.getByLabel('Masuk sebagai').selectOption('participant');
    await see(page, 'Proses ta\'aruf Anda');
    await link(page, 'Jelajahi calon').last().click();
    await page.getByRole('heading', { name: 'Jelajahi', exact: true }).waitFor();
  },

  async discovery(page) {
    await page.goto(`${BASE}/jelajahi?scenario=verified_browsing`);
    await page.getByRole('heading', { name: 'Jelajahi', exact: true }).waitFor();
    const profile = page.locator('main [aria-labelledby="profile-name"]');
    const name = () => profile.getByRole('heading', { level: 2 }).innerText();
    const first = await name();
    const next = btn(page, 'Berikutnya');
    await next.press('Enter');
    if (await name() === first) throw new Error('next did not advance the profile');
    await btn(page, 'Sebelumnya').press('Enter');
    if (await name() !== first) throw new Error('previous did not restore the profile');
    while ((await name()) !== 'Fikri S.' && await next.getAttribute('aria-disabled') !== 'true') await next.click();
    await profile.getByRole('heading', { name: 'Fikri S.', exact: true }).waitFor();
    if (await profile.locator('img').count()) throw new Error('discovery contains a photo');
    await profile.getByRole('link', { name: /Lihat (CV|perkenalan)/ }).click();
    await btn(page, "Ajukan Ta'aruf").first().click();
    await confirmDialog(page, "Ajukan Ta'aruf");
    await see(page, /Pengajuan terkirim|menunggu tanggapan/);
    await link(page, "Ta'aruf").first().click();
    await page.getByRole('tab', { name: 'Dikirim' }).click();
    await see(page, 'Fikri S.');
    if (await link(page, 'Lihat persetujuan').count()) throw new Error('approvals link visible before the candidate accepted');
    await simulate(page, 'Calon menerima pengajuan');
    await link(page, 'Lihat persetujuan').first().click();
    await see(page, 'Status empat pihak');
    await see(page, 'Menunggu persetujuan pendamping');
  },

  async approvals(page) {
    await page.goto(`${BASE}/pendamping/persetujuan/tar-rahman?scenario=two_pendamping_waiting&persona=pendamping`);
    await btn(page, "Setujui ta'aruf").click();
    await confirmDialog(page, "Setujui ta'aruf");
    await see(page, /Persetujuan Anda tercatat|telah memberi keputusan/);
    await btn(page, 'Keluar').first().click();
    await see(page, 'Anda telah keluar');
    await btn(page, 'Peserta').first().click();
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await see(page, /Assalamu'alaikum, Aisyah/);
    await link(page, "Ta'aruf").first().click();
    await link(page, 'Lihat persetujuan').first().click();
    await see(page, '1 dari 2 pendamping telah menyetujui');
    await simulate(page, 'Pendamping pihak lain menyetujui');
    await see(page, 'Kedua pendamping telah menyetujui');
    await link(page, 'Buka percakapan').first().click();
    await see(page, 'Ruang ini diikuti oleh kedua peserta dan kedua pendamping.');
    await expectEnabled(page.getByLabel('Tulis pesan'));
  },

  async chat(page) {
    await page.goto(`${BASE}/taaruf/tar-rahman/obrolan?scenario=active_four_member_chat`);
    await see(page, 'Pesan tidak dienkripsi');
    if (await page.getByText('Terenkripsi end-to-end').count()) throw new Error('E2EE claim visible');
    const msg = "Assalamu'alaikum, ini pesan demo.";
    await page.getByLabel('Tulis pesan').fill(msg);
    await page.getByRole('button', { name: 'Kirim', exact: true }).click();
    await see(page, msg);
    await simulate(page, 'Calon mengirim pesan');
    await link(page, 'Akun').first().click();
    await link(page, 'Privasi & Foto').first().click();
    await btn(page, 'Bagikan foto').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox').first().check();
    await dialog.getByRole('button', { name: 'Minta konfirmasi pendamping' }).click();
    await see(page, 'Permintaan dikirim ke pendamping');
    await page.locator('div[data-dev-panel] > button').click();
    await page.getByLabel('Masuk sebagai').selectOption('pendamping');
    await btn(page, 'Konfirmasi').click();
    await see(page, 'Berbagi foto dikonfirmasi.');
    await page.locator('div[data-dev-panel] > button').click();
    await page.getByLabel('Masuk sebagai').selectOption('participant');
    await link(page, 'Akun').first().click();
    await link(page, 'Privasi & Foto').first().click();
    await btn(page, 'Cabut akses foto').click();
    await confirmDialog(page, 'Cabut akses foto');
    await see(page, 'Akses foto dicabut.');
    await link(page, 'Akun').first().click();
    await link(page, 'Keamanan').first().click();
    await link(page, 'Buat laporan').first().click();
    await page.getByLabel('Permintaan uang atau penipuan').check();
    await page.locator('ul input[type="checkbox"]').first().check();
    await btn(page, 'Tinjau laporan').click();
    await see(page, 'Periksa yang akan dikirim');
    await btn(page, 'Kirim laporan').click();
    await see(page, 'Laporan diterima');
  },

  async moderation(page) {
    await page.goto(`${BASE}/laporan/baru?subjek=cand-rahman&scenario=verified_browsing`);
    await page.getByLabel('Lainnya').check();
    const reason = page.getByRole('textbox', { name: /Alasan lain/ });
    await btn(page, 'Tinjau laporan').click();
    if (!(await reason.evaluate((el) => el === document.activeElement))) throw new Error('missing other reason did not receive focus');
    await reason.fill('Keterangan profil menyesatkan');
    await btn(page, 'Tinjau laporan').click();
    await see(page, 'Keterangan profil menyesatkan');
    await btn(page, 'Ubah pilihan').click();
    await page.getByLabel('Permintaan uang atau penipuan').check();
    await page.locator('textarea').fill('Laporan profil sintetis untuk demo moderator.');
    await btn(page, 'Tinjau laporan').click();
    await btn(page, 'Kirim laporan').click();
    await see(page, 'Laporan diterima');
    const receipt = await page.locator('[role="status"]').filter({ hasText: /LAP-\d+-\d+/ }).first().innerText();
    const ref = receipt.match(/LAP-\d+-\d+/)?.[0];
    if (!ref) throw new Error('report receipt has no reference');
    await page.locator('div[data-dev-panel] > button').click();
    await page.getByLabel('Masuk sebagai').selectOption('moderator');
    await see(page, 'Ringkasan moderasi');
    const priority = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Laporan prioritas', exact: true }) });
    const dashboardReport = priority.getByRole('link', { name: new RegExp(ref) });
    const href = await dashboardReport.getAttribute('href');
    await priority.getByRole('link', { name: 'Buka laporan' }).click();
    if (!href || await link(page, ref).getAttribute('href') !== href) throw new Error('dashboard and queue must link to the same report');
    await link(page, 'Ringkasan').click();
    await dashboardReport.click();
    await see(page, 'Laporan profil sintetis untuk demo moderator.');
    await see(page, 'Pelapor tidak menyertakan bukti pesan.');
    await link(page, 'Ringkasan').click();
    await link(page, 'VER-2611-101').click();
    await page.getByLabel('Setujui verifikasi').check();
    await btn(page, 'Simpan keputusan').click();
    await confirmIfDialog(page);
    await see(page, /Keputusan tersimpan|sudah diputuskan/);
    await link(page, 'Ringkasan').click();
    await link(page, 'VER-2611-102').waitFor();
    if (await link(page, 'VER-2611-101').count()) throw new Error('decided case still in pending dashboard queue');
    await link(page, 'Laporan').first().click();
    await link(page, 'LAP-2611-201').first().click();
    await see(page, 'Hanya bukti yang dikirim pelapor');
    await page.getByPlaceholder('Catatan hanya terlihat oleh moderator.').fill('Bukti cukup jelas; tindak lanjut.');
    await btn(page, 'Tambah catatan').click();
    await see(page, 'Bukti cukup jelas; tindak lanjut.');
    await btn(page, 'Tangguhkan akun').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill('Permintaan uang berulang (demo).');
    await dialog.getByRole('button', { name: 'Konfirmasi tindakan' }).click();
    await see(page, 'Tindakan tercatat');
    await link(page, 'Ringkasan').click();
    const activity = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Aktivitas terbaru Anda' }) });
    await activity.getByText(/LAP-2611-201/).first().waitFor();
    await link(page, 'Riwayat Aksi').first().click();
    await see(page, /Permintaan uang berulang/);
    await btn(page, 'Keluar').first().click();
    await see(page, 'Anda telah keluar');
    await btn(page, 'Admin').first().click();
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await link(page, 'Pengguna').first().click();
    await btn(page, 'Tangguhkan').first().click();
    const d2 = page.getByRole('dialog');
    await d2.getByRole('textbox').first().fill('Uji demo penangguhan.');
    await d2.getByRole('button').last().click();
    await see(page, 'Status akun diperbarui');
    await link(page, 'Audit').first().click();
    await see(page, 'Uji demo penangguhan.');
  },

  async resilience(page) {
    await page.goto(`${BASE}/beranda?scenario=network_offline`);
    await see(page, 'Periksa koneksi internet Anda, lalu coba lagi.');
    await btn(page, 'Coba lagi').first().waitFor();
    await page.goto(`${BASE}/laporan/baru?ruang=tar-rahman&scenario=report_submission_failed`);
    await page.getByLabel('Pelecehan atau kata-kata kasar').check();
    await btn(page, 'Tinjau laporan').click();
    await btn(page, 'Kirim laporan').click();
    await see(page, 'Laporan belum terkirim.');
    await btn(page, "Akhiri Ta'aruf").first().waitFor();
    await page.goto(`${BASE}/beranda?scenario=signed_out`);
    await see(page, /Masuk ke Zawjan|Sesi Anda telah berakhir/);
  },
};

const server = await preview({ root: ROOT, mode: 'export', logLevel: 'warn', build: { outDir: path.join(ROOT, 'dist-export') }, preview: { host: '127.0.0.1', port: 0, open: false } });
if (!server.httpServer.listening) await once(server.httpServer, 'listening');
const BASE = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const results = [];
try {
  for (const [id, run] of Object.entries(JOURNEYS)) {
    if (only && only !== id) continue;
    const ctx = await browser.newContext({ viewport: ['moderation'].includes(id) ? DESKTOP : MOBILE });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.setDefaultTimeout(6000);
    const t0 = Date.now();
    try {
      await run(page);
      if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
      results.push({ id, ok: true, ms: Date.now() - t0 });
    } catch (e) {
      await mkdir(path.join(ROOT, 'demo-walkthrough'), { recursive: true });
      await page.screenshot({ path: path.join(ROOT, 'demo-walkthrough', `${id}.png`), fullPage: true }).catch(() => {});
      const body = await page.locator('body').innerText().catch(() => '');
      await writeFile(path.join(ROOT, 'demo-walkthrough', `${id}.txt`), `${page.url()}\n\n${body}`);
      results.push({ id, ok: false, ms: Date.now() - t0, error: String(e.message).split('\n').slice(0, 4).join(' ') });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id} (${r.ms} ms)${r.ok ? '' : `\n     ${r.error}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} of ${results.length} journeys failed` : `All ${results.length} demo journeys passed.`);
process.exit(failed ? 1 : 0);
