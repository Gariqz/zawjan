#!/usr/bin/env node
/**
 * Design export for Figma (design.md §14, output 2).
 *
 * Renders every screen × state × viewport from the SAME production components (dist-export build,
 * fictional mock adapters) and writes TWO frames per capture:
 *   - viewport/  exactly one screen (e.g. 390×844): what a user sees before scrolling; fixed chrome
 *                (bottom nav, composer, dev banner) sits where it does on a device
 *   - full/      the whole page, frame height grown to the content
 * Each frame has a self-contained HTML file (inlined CSS, fonts and images; no scripts) for
 * HTML-to-Figma import and a PNG reference, plus manifest.json, tokens.json and an index.html gallery.
 *
 * Usage: npm run export:figma            (builds dist-export first)
 *        node scripts/export-figma.mjs [--only=PAR-06,GUA-03] [--out=figma-export] [--concurrency=4]
 */
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium, expect } from '@playwright/test';
import { growViewportToContent, VIEWPORTS } from './lib/frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const OUT = path.resolve(ROOT, args.out ?? 'figma-export');
const DIST = path.resolve(ROOT, 'dist-export');
const PORT = 4317;
const ORIGIN = `http://localhost:${PORT}`;
const CONCURRENCY = Number(args.concurrency ?? 4);
const ONLY = args.only ? new Set(args.only.split(',')) : null;


function captureUrl(p, scenario, persona) {
  const [base, qs = ''] = p.split('?');
  const sp = new URLSearchParams(qs);
  sp.set('scenario', scenario);
  if (persona) sp.set('persona', persona);
  sp.set('chrome', 'export');
  sp.set('latency', '0');
  return `${base}?${sp.toString()}`;
}

const slug = (s) => s.replace(/[^A-Za-z0-9-]+/g, '-');

const assetCache = new Map();
async function dataUri(url) {
  if (url.startsWith('data:')) return url;
  const abs = new URL(url, ORIGIN).href;
  if (!abs.startsWith(ORIGIN)) throw new Error(`External asset not allowed in export: ${abs}`);
  if (!assetCache.has(abs)) {
    const res = await fetch(abs);
    if (!res.ok) throw new Error(`Asset ${abs} -> HTTP ${res.status}`);
    const type = res.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream';
    const buf = Buffer.from(await res.arrayBuffer());
    assetCache.set(abs, `data:${type};base64,${buf.toString('base64')}`);
  }
  return assetCache.get(abs);
}

async function inlineCssUrls(css) {
  // Every supported renderer reads woff2; dropping the woff fallbacks halves the inlined font weight.
  css = css.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']?woff["']?\)/g, '');
  const urls = [...new Set([...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2]).filter((u) => !u.startsWith('data:') && !u.startsWith('#')))];
  for (const u of urls) {
    const d = await dataUri(u);
    css = css.split(u).join(d);
  }
  return css;
}

/** Runs in the page: freeze form state into attributes and serialise the document without scripts. */
function serialiseInPage() {
  document.querySelectorAll('input').forEach((el) => {
    if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked'); }
    else if (el.type !== 'file' && el.type !== 'password') el.setAttribute('value', el.value);
  });
  document.querySelectorAll('textarea').forEach((el) => { el.textContent = el.value; });
  document.querySelectorAll('select').forEach((el) => {
    Array.from(el.options).forEach((o) => { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
  });
  const css = Array.from(document.styleSheets).map((sheet) => {
    try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch { return ''; }
  }).join('\n');
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script, link[rel="modulepreload"], link[rel="stylesheet"], style').forEach((n) => n.remove());
  const imgs = Array.from(clone.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
  const links = Array.from(clone.querySelectorAll('link[rel="icon"]')).map((l) => l.getAttribute('href') ?? '');
  return { html: clone.outerHTML, css, imgs, links, errorCodes: Array.from(document.querySelectorAll('[data-error-code]')).map((n) => n.getAttribute('data-error-code')) };
}

function actorFor(screen, capture) {
  const persona = capture.persona;
  if (persona) return { participant: 'Participant', pendamping: 'Pendamping', moderator: 'Moderator', admin: 'Admin' }[persona];
  const p = screen.pattern;
  if (p.startsWith('/pendamping/') && p !== '/pendamping/undang') return 'Pendamping';
  if (p.startsWith('/moderator')) return 'Moderator';
  if (p.startsWith('/admin')) return 'Admin';
  if (['/', '/masuk', '/daftar', '/403', '/404', '/error'].includes(p)) return 'Public / any';
  return 'Participant';
}

const FRAME_TYPES = ['viewport', 'fullPage'];
const FRAME_DIR = { viewport: 'viewport', fullPage: 'full' };
/** Clips the document to one viewport so an importer that captures the whole document still gets one screen. */
const VIEWPORT_CLIP = (h) => `<style data-zawjan-frame="viewport">html,body{height:${h}px!important;max-height:${h}px!important;overflow:hidden!important}</style>`;

async function inlineFrame(page, { screen, capture, viewport, vp, frameType, height }) {
  const s = await page.evaluate(serialiseInPage);
  let html = s.html;
  for (const src of new Set([...s.imgs, ...s.links])) {
    if (!src) continue;
    const d = await dataUri(src);
    html = html.split(`="${src}"`).join(`="${d}"`);
  }
  const css = await inlineCssUrls(s.css);
  const meta = [
    `<meta name="zawjan:screen" content="${screen.screenId}">`,
    `<meta name="zawjan:capture" content="${capture.id}">`,
    `<meta name="zawjan:owner" content="${screen.owner}">`,
    `<meta name="zawjan:inertia" content="${screen.inertiaName}">`,
    `<meta name="zawjan:viewport" content="${viewport} ${vp.width}x${vp.height}">`,
    `<meta name="zawjan:frame" content="${frameType} ${vp.width}x${height}">`,
    `<meta name="zawjan:scenario" content="${capture.scenario}">`,
    `<meta name="zawjan:notice" content="Generated from the React components with FICTIONAL mock data. Not a live product; no backend security features are represented as operational.">`,
  ].join('');
  const clip = frameType === 'viewport' ? VIEWPORT_CLIP(height) : '';
  html = html.replace(/<head>/i, `<head>${meta}<style data-zawjan-export>${css}</style>${clip}`);
  return { html: `<!doctype html>\n${html}\n`, errorCodes: s.errorCodes };
}

async function captureOne(browser, job) {
  const { screen, capture, viewport } = job;
  const vp = VIEWPORTS[viewport];
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  const url = captureUrl(capture.path ?? screen.examplePath, capture.scenario, capture.persona);
  try {
    await page.goto(ORIGIN + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (capture.scenario !== 'loading') {
      await page.waitForFunction(() => !document.querySelector('.skeleton, [aria-busy="true"]'), null, { timeout: 5000 })
        .catch(() => problems.push('still loading after 5s'));
    }
    for (const label of capture.check ?? []) {
      const box = page.getByLabel(label, { exact: true });
      if ((await box.count()) === 0) { problems.push(`check target not found: "${label}"`); continue; }
      await box.first().check();
    }
    for (const label of [capture.click ?? []].flat()) {
      // Prefer the newest match (an open dialog's button over the page button with the same name).
      let target = page.getByRole('button', { name: label, exact: true });
      if ((await target.count()) === 0) target = page.getByRole('button', { name: label });
      if ((await target.count()) === 0) { problems.push(`click target not found: "${label}"`); break; }
      const dialogTarget = page.getByRole('dialog').getByRole('button', { name: label, exact: true });
      const el = (await dialogTarget.count()) > 0 ? dialogTarget.first() : target.first();
      await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
      await el.click();
      await page.waitForTimeout(250);
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 3000 }).catch(() => undefined);
    }
    // Park the pointer so the last-clicked button is not captured in its hover colour.
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    // T19: no horizontal overflow at any exported width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`horizontal overflow of ${overflow}px`);
    await page.waitForTimeout(120);
    const sourceRoute = new URL(page.url()).pathname;
    if (screen.screenId === 'PAR-03' && capture.id === 'staged-cv') {
      expect(sourceRoute).toBe('/calon/cand-rahman');
      const cv = page.getByRole('main');
      await expect(cv.getByRole('heading', { level: 1, name: 'Rahman F., 29', exact: true })).toBeVisible();
      for (const name of ['Tujuan dan kesiapan menikah', 'Kriteria calon']) {
        const field = cv.getByRole('region', { name, exact: true }).locator('dd');
        await expect(field).toBeVisible();
        await expect(field).toHaveText(/\S/);
      }
      await expect(cv.getByText('Bagian yang terbuka setelah pengajuan diterima', { exact: true })).toHaveCount(0);
      await expect(cv.locator('img')).toHaveCount(0);
    }
    const base = `${slug(screen.screenId)}__${slug(capture.id)}__${viewport}`;
    const entries = [];
    for (const frameType of FRAME_TYPES) {
      // Viewport frame first, while the browser still has the device-sized viewport.
      const height = frameType === 'viewport' ? vp.height : await growViewportToContent(page, vp);
      const dir = `screens/${screen.owner}/${FRAME_DIR[frameType]}`;
      await mkdir(path.join(OUT, dir), { recursive: true });
      const pngRel = `${dir}/${base}.png`;
      const htmlRel = `${dir}/${base}.html`;
      await page.screenshot({ path: path.join(OUT, pngRel), animations: 'disabled', caret: 'hide' });
      const { html, errorCodes } = await inlineFrame(page, { screen, capture, viewport, vp, frameType, height });
      await writeFile(path.join(OUT, htmlRel), html, 'utf8');
      entries.push({
        key: `${screen.screenId}/${capture.id}/${viewport}/${frameType}`,
        // design.md §14 manifest fields
        screenId: screen.screenId, actor: actorFor(screen, capture), sourceRoute, scenarioId: capture.scenario,
        viewportWidth: vp.width, viewportHeight: height, htmlPath: htmlRel, pngPath: pngRel, snapshotTimestamp: new Date().toISOString(),
        notes: [frameType === 'viewport' ? `single ${vp.width}×${vp.height} screen` : 'full page', capture.notes, capture.click ? `after clicking: ${[capture.click].flat().join(' > ')}` : null, 'fictional mock data; development-only scenario'].filter(Boolean).join('; '),
        // extra fields
        frameType, deviceViewportHeight: vp.height,
        title: screen.title, owner: screen.owner, inertiaName: screen.inertiaName, route: screen.pattern,
        captureId: capture.id, label: capture.label, scenario: capture.scenario, persona: capture.persona ?? null, click: capture.click ?? null,
        viewport, width: vp.width, height, url, html: htmlRel, png: pngRel, errorStates: errorCodes, problems,
        figmaFrame: `${screen.owner} / ${screen.screenId} ${screen.title} / ${capture.label} — ${viewport} ${frameType === 'viewport' ? 'screen' : 'full page'}`,
      });
    }
    return entries;
  } catch (e) {
    problems.push(`failed: ${e instanceof Error ? e.message : String(e)}`);
    return FRAME_TYPES.map((frameType) => ({ key: `${screen.screenId}/${capture.id}/${viewport}/${frameType}`, frameType, screenId: screen.screenId, captureId: capture.id, viewport, owner: screen.owner, url, problems }));
  } finally {
    await context.close();
  }
}

async function extractTokens() {
  const css = await readFile(path.join(ROOT, 'resources/js/styles/tokens.css'), 'utf8');
  const rootBlock = css.match(/:root\s*{([\s\S]*?)}/)?.[1] ?? '';
  const tokens = { color: {}, radius: {}, shadow: {}, other: {} };
  for (const m of rootBlock.matchAll(/--([\w-]+):\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/g)) {
    const [, name, raw, note] = m;
    const value = raw.trim();
    const rgb = value.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
    const entry = { value: rgb ? '#' + rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase() : value, ...(note ? { note } : {}), source: note?.includes('[source]') ? 'design.md' : 'implementation proposal' };
    if (rgb) tokens.color[name] = entry;
    else if (name.startsWith('radius')) tokens.radius[name] = entry;
    else if (name.startsWith('shadow') || name.startsWith('focus')) tokens.shadow[name] = entry;
    else tokens.other[name] = entry;
  }
  tokens.typography = {
    sans: { family: 'Plus Jakarta Sans', weights: [400, 500, 600, 700], use: 'UI and body' },
    display: { family: 'Playfair Display', weights: [600], use: 'Wordmark and editorial headings' },
  };
  tokens.viewports = VIEWPORTS;
  return tokens;
}

function galleryHtml(entries) {
  const owners = ['Marinasi', 'BrandyKeun', 'Khaslana', 'EAAA', 'Shared'];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sections = owners.map((o) => {
    const items = entries.filter((e) => e.owner === o && e.png && e.frameType === 'viewport').map((e) => {
      const full = entries.find((x) => x.frameType === 'fullPage' && x.screenId === e.screenId && x.captureId === e.captureId && x.viewport === e.viewport);
      return `
      <figure><a href="${e.html}"><img loading="lazy" src="${e.png}" alt="${esc(e.figmaFrame)}"></a>
      <figcaption><b>${esc(e.screenId)}</b> ${esc(e.title)} — ${esc(e.label)} <span>${e.viewport} · ${esc(e.scenario)}</span><br>
      Layar: <a href="${e.html}">HTML</a> · <a href="${e.png}">PNG</a>${full ? ` &nbsp;|&nbsp; Halaman penuh: <a href="${full.html}">HTML</a> · <a href="${full.png}">PNG</a> <span>(${full.height}px)</span>` : ''}</figcaption></figure>`;
    }).join('');
    return `<h2>${o}</h2><div class="grid">${items}</div>`;
  }).join('');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Zawjan — design export</title>
<style>body{font:14px system-ui,sans-serif;margin:24px;color:#0F172A;background:#F8FAFC}h1{color:#093721}h2{margin-top:32px;color:#137547}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:8px}
img{width:100%;height:260px;object-fit:cover;object-position:top;border-radius:8px;border:1px solid #E2E8F0}figcaption span{color:#64748B}.note{background:#FEF3C7;padding:12px;border-radius:8px;max-width:820px}</style></head>
<body><h1>Zawjan — design export</h1><p class="note">Generated from the production React components with <b>fictional</b> mock data (${entries.length} frames: every capture as a device-sized screen and as a full page). Re-generate with <code>npm run export:figma</code>; do not edit these files by hand. Import guide: FIGMA_IMPORT_GUIDE.md.</p>${sections}</body></html>`;
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('dist-export missing. Run `npm run build:export` first (or `npm run export:figma`).');
  const server = await preview({ root: ROOT, mode: 'export', logLevel: 'warn', build: { outDir: DIST }, preview: { port: PORT, strictPort: true, open: false } });
  const browser = await chromium.launch();
  try {
    const probe = await browser.newPage();
    await probe.goto(`${ORIGIN}/__layar`, { waitUntil: 'networkidle' });
    const screens = await probe.evaluate(() => window.__ZAWJAN_SCREENS__);
    await probe.close();
    if (!Array.isArray(screens) || screens.length === 0) throw new Error('window.__ZAWJAN_SCREENS__ not found. Was dist-export built with --mode export?');

    if (!args.only) await rm(OUT, { recursive: true, force: true });
    await mkdir(OUT, { recursive: true });
    const jobs = [];
    for (const screen of screens) {
      if (ONLY && !ONLY.has(screen.screenId)) continue;
      for (const capture of screen.captures) for (const viewport of capture.viewports) jobs.push({ screen, capture, viewport });
    }
    console.log(`Exporting ${jobs.length} captures × 2 frame types from ${screens.length} screens (concurrency ${CONCURRENCY})…`);
    const results = new Array(jobs.length);
    let next = 0; let done = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await captureOne(browser, jobs[i]);
        done++;
        const p = results[i][0].problems;
        if (p.length) console.warn(`  ! ${jobs[i].screen.screenId}/${jobs[i].capture.id}/${jobs[i].viewport}: ${p.join(' | ')}`);
        if (done % 20 === 0) console.log(`  ${done}/${jobs.length}`);
      }
    }));

    const manifest = {
      generator: 'scripts/export-figma.mjs',
      generatedAt: new Date().toISOString(),
      notice: 'All content is fictional mock data rendered by the production React components. Security features such as end-to-end encryption are NOT represented as operational.',
      viewports: VIEWPORTS,
      // design.md §14.6: no HTML-to-Figma importer was available to the generator; see FIGMA_IMPORT_GUIDE.md.
      figmaImportStatus: 'IMPORT_NOT_VALIDATED',
      frameTypes: { viewport: 'one device-sized screen (clipped)', fullPage: 'entire page, height grown to content' },
      screens: screens.map(({ captures, ...s }) => ({ ...s, captures: captures.map((c) => ({ id: c.id, label: c.label, scenario: c.scenario, viewports: c.viewports })) })),
      expectedFrames: jobs.length * FRAME_TYPES.length,
      frames: results.flat(),
    };
    await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await writeFile(path.join(OUT, 'tokens.json'), JSON.stringify(await extractTokens(), null, 2));
    await writeFile(path.join(OUT, 'index.html'), galleryHtml(manifest.frames));
    await writeFile(path.join(OUT, 'IMPORT_NOT_VALIDATED.md'), [
      '# IMPORT_NOT_VALIDATED',
      '',
      'These files were generated and checked automatically (coverage, no missing assets, no network requests,',
      'HTML re-render compared with the PNG). They have NOT been imported into Figma by the generator, because no',
      'HTML-to-Figma importer was available in that environment. Follow FIGMA_IMPORT_GUIDE.md and record the result',
      'of the first real import (representative frames, manual cleanup needed) in that guide.',
      '',
    ].join('\n'));
    const all = manifest.frames;
    const failed = all.filter((r) => r.problems.length);
    console.log(`Done: ${all.length - failed.length}/${all.length} clean frames (${jobs.length} captures × viewport + full page) -> ${path.relative(ROOT, OUT)}`);
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise((r) => server.httpServer.close(r));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
