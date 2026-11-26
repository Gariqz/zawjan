#!/usr/bin/env node
/**
 * Validates figma-export/ against the screen registry and checks that each self-contained HTML file
 * renders like the live component it was captured from.
 *
 *   node scripts/validate-export.mjs                 structural checks + visual fidelity
 *   node scripts/validate-export.mjs --quick         structural checks only
 *   node scripts/validate-export.mjs --threshold=0.02  max share of differing pixels per frame (default 1%)
 */
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { JSDOM } from 'jsdom';
import { growViewportToContent, VIEWPORTS } from './lib/frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const OUT = path.resolve(ROOT, args.out ?? 'figma-export');
const THRESHOLD = Number(args.threshold ?? 0.01);
const errors = [];
const warn = [];
const fail = (m) => errors.push(m);

const manifest = JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8'));
const frames = manifest.frames;

// 1. Coverage: compare against the registry source itself, not only the manifest's own claims.
const registrySrc = await readFile(path.join(ROOT, 'resources/js/app/screenRegistry.ts'), 'utf8');
const sourceIds = [...registrySrc.matchAll(/screenId: '([^']+)'/g)].map((m) => m[1]);
const exportedIds = new Set(frames.map((f) => f.screenId));
for (const id of sourceIds) if (!exportedIds.has(id)) fail(`screen ${id} in screenRegistry.ts has no exported frame`);
if (frames.length !== manifest.expectedFrames) fail(`manifest has ${frames.length} frames, expected ${manifest.expectedFrames}`);
const FRAME_TYPES = ['viewport', 'fullPage'];
for (const s of manifest.screens) for (const c of s.captures) for (const v of c.viewports) for (const t of FRAME_TYPES) {
  if (!frames.some((f) => f.screenId === s.screenId && f.captureId === c.id && f.viewport === v && f.frameType === t)) fail(`missing ${t} frame ${s.screenId}/${c.id}/${v}`);
}
const need = [
  // [screenId, viewport] pairs design.md §14.2 names as the minimum export
  ...['PUB-01', 'AUTH-01', 'AUTH-02', 'ONB-02', 'ONB-03', 'PAR-02', 'PAR-03', 'PAR-04', 'PAR-05', 'PAR-06', 'PAR-08', 'PAR-10'].flatMap((id) => [[id, 'mobile'], [id, 'desktop']]),
  ...['MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'ADM-01', 'ADM-02', 'ADM-03', 'ADM-04'].map((id) => [id, 'desktop']),
  ...['MOD-01', 'MOD-05', 'ADM-02'].map((id) => [id, 'mobile']),
];
for (const [id, vp] of need) if (!frames.some((f) => f.screenId === id && f.viewport === vp)) fail(`§14.2 coverage: no ${vp} frame for ${id}`);
const states = [
  // design.md §14.3 key alternate states: [screenId, captureId]
  ['ONB-02', 'manual'], ['ONB-02', 'resubmit'], ['PAR-02', 'empty'],
  ['PAR-05', 'waiting'], ['PAR-05', 'one'], ['PAR-05', 'active'], ['PAR-05', 'declined'],
  ['PAR-04', 'conflict'], ['PAR-06', 'paused'],
  ['PAR-03', 'default'], ['PAR-08', 'revoked'],
  ['PAR-10', 'success'], ['MOD-02', 'empty'], ['SYS-01', 'default'], ['PAR-01', 'error'], ['PAR-01', 'loading'],
];
for (const [id, c] of states) if (!frames.some((f) => f.screenId === id && f.captureId === c)) fail(`§14.3 state missing: ${id}/${c}`);
// Required even if a stale export's own capture list doesn't mention it.
for (const v of ['mobile', 'desktop']) for (const t of FRAME_TYPES) {
  const f = frames.find((f) => f.screenId === 'PAR-03' && f.captureId === 'staged-cv' && f.viewport === v && f.frameType === t);
  if (!f) fail(`§14.3 state missing: PAR-03/staged-cv/${v}/${t}`);
  else if (f.sourceRoute !== '/calon/cand-rahman' || f.scenarioId !== 'photo_authorized') fail(`${f.key}: wrong staged CV route or scenario`);
}
const owners = new Set(['Marinasi', 'BrandyKeun', 'Khaslana', 'EAAA', 'Shared']);

// 2. Structure of every frame.
for (const f of frames) {
  if (f.problems?.length) fail(`${f.key}: capture reported problems: ${f.problems.join(' | ')}`);
  if (!owners.has(f.owner)) fail(`${f.key}: unknown owner ${f.owner}`);
  for (const k of ['screenId', 'actor', 'sourceRoute', 'scenarioId', 'viewportWidth', 'viewportHeight', 'htmlPath', 'pngPath', 'snapshotTimestamp', 'notes']) {
    if (f[k] === undefined || f[k] === null || f[k] === '') fail(`${f.key}: manifest field ${k} missing (design.md §14.4)`);
  }
  if (!f.html || !f.png) { fail(`${f.key}: missing HTML or PNG path`); continue; }
  const html = await readFile(path.join(OUT, f.html), 'utf8').catch(() => null);
  if (html === null) { fail(`${f.key}: missing ${f.html}`); continue; }
  if (/<script\b/i.test(html)) fail(`${f.key}: HTML contains <script>`);
  // Anchor hrefs stay as route paths (useful as prototype hints); only resource loads must be inlined.
  if (/\bsrc="(?!data:)/.test(html) || /<link\b[^>]*\bhref="(?!data:)/.test(html)) fail(`${f.key}: HTML loads a non-inlined resource`);
  if (/url\((['"]?)(?:\/|https?:)/.test(html)) fail(`${f.key}: CSS references an external URL`);
  if (!html.includes('data-zawjan-export')) fail(`${f.key}: inlined stylesheet missing`);
  if (!html.includes(`content="${f.screenId}"`)) fail(`${f.key}: zawjan:screen meta missing`);
  if (f.screenId === 'PAR-03' && f.captureId === 'staged-cv') {
    const { window } = new JSDOM(html);
    const cv = window.document.querySelector('main');
    if (cv?.querySelector('h1')?.textContent !== 'Rahman F., 29' ||
        !['tujuan', 'kriteria'].every((id) => cv.querySelector(`section[aria-labelledby="sec-${id}"] dd`)?.textContent.trim()) ||
        cv.textContent.includes('Bagian yang terbuka setelah pengajuan diterima') || cv.querySelector('img')) {
      fail(`${f.key}: HTML is not the photo-free, unlocked CV for Rahman`);
    }
    window.close();
  }
  if (!/font-family:\s*"?Plus Jakarta Sans/.test(html) || !html.includes('data:font/woff2')) fail(`${f.key}: fonts not embedded`);
  const pngBuf = await readFile(path.join(OUT, f.png)).catch(() => null);
  if (!pngBuf) { fail(`${f.key}: missing ${f.png}`); continue; }
  const png = PNG.sync.read(pngBuf);
  if (png.width !== VIEWPORTS[f.viewport].width) fail(`${f.key}: PNG width ${png.width} != ${VIEWPORTS[f.viewport].width}`);
  if (png.width !== f.viewportWidth) fail(`${f.key}: viewportWidth mismatch`);
  if (png.height !== f.height) fail(`${f.key}: PNG height ${png.height} != manifest ${f.height}`);
  if (f.frameType === 'viewport') {
    if (png.height !== VIEWPORTS[f.viewport].height) fail(`${f.key}: viewport frame height ${png.height} != device height ${VIEWPORTS[f.viewport].height}`);
    if (!html.includes('data-zawjan-frame="viewport"')) fail(`${f.key}: viewport HTML is not clipped to one screen`);
  } else if (f.frameType === 'fullPage') {
    if (png.height < VIEWPORTS[f.viewport].height) fail(`${f.key}: full-page frame shorter than the device viewport`);
  } else fail(`${f.key}: unknown frameType ${f.frameType}`);
  const size = (await stat(path.join(OUT, f.html))).size;
  if (size > 1.5 * 1024 * 1024) warn.push(`${f.key}: HTML is ${(size / 1024).toFixed(0)} KiB`);
}
const byType = FRAME_TYPES.map((t) => `${frames.filter((f) => f.frameType === t).length} ${t}`).join(' + ');
console.log(`Structure: ${frames.length} frames (${byType}), ${sourceIds.length} registry screens, ${errors.length} errors`);

// 3. Fidelity: the exported HTML (no JS, inlined assets) must look like the live capture.
const fidelity = [];
if (args.quick !== 'true') {
  const browser = await chromium.launch();
  const diffDir = path.join(OUT, '_validation');
  await mkdir(diffDir, { recursive: true });
  const queue = frames.filter((f) => f.html && f.png);
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < queue.length) {
      const f = queue[next++];
      const vp = VIEWPORTS[f.viewport];
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce', javaScriptEnabled: false });
      const page = await ctx.newPage();
      const external = [];
      page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
      await page.goto(pathToFileURL(path.join(OUT, f.html)).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      if (f.frameType !== 'viewport') await growViewportToContent(page, vp);
      const shot = PNG.sync.read(await page.screenshot({ animations: 'disabled', caret: 'hide' }));
      await ctx.close();
      if (external.length) fail(`${f.key}: exported HTML made network requests: ${external.slice(0, 3).join(', ')}`);
      const ref = PNG.sync.read(await readFile(path.join(OUT, f.png)));
      const w = Math.min(ref.width, shot.width);
      const h = Math.min(ref.height, shot.height);
      const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
      const diff = new PNG({ width: w, height: h });
      const n = pixelmatch(crop(ref).data, crop(shot).data, diff.data, w, h, { threshold: 0.1 });
      const heightDelta = Math.abs(ref.height - shot.height);
      const ratio = (n + heightDelta * w) / (w * Math.max(ref.height, shot.height));
      fidelity.push({ key: f.key, ratio, heightDelta });
      if (ratio > THRESHOLD) {
        fail(`${f.key}: exported HTML differs from live render by ${(ratio * 100).toFixed(2)}% (height diff ${heightDelta}px)`);
        await writeFile(path.join(diffDir, `${f.key.replace(/\//g, '__')}.diff.png`), PNG.sync.write(diff));
      }
    }
  }));
  await browser.close();
  fidelity.sort((a, b) => b.ratio - a.ratio);
  const worst = fidelity.slice(0, 5).map((x) => `${x.key} ${(x.ratio * 100).toFixed(3)}%`).join(', ');
  console.log(`Fidelity: ${fidelity.length} frames re-rendered without JS; worst: ${worst}`);
}

for (const w of warn) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`x ${e}`);
  console.error(`Export validation FAILED (${errors.length} errors).`);
  process.exit(1);
}
console.log('Export validation passed.');
