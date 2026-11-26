#!/usr/bin/env node
/**
 * Production-build guard: serves dist/ (built with .env.production) and asserts that dev-only
 * scenario selection, the scenario panel, the screen index and fictional mock data are unreachable.
 *   npm run build && node scripts/smoke-production.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { preview } from 'vite';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await preview({ root: ROOT, mode: 'production', logLevel: 'warn', build: { outDir: path.join(ROOT, 'dist') }, preview: { host: '127.0.0.1', port: 0, open: false } });
if (!server.httpServer.listening) await once(server.httpServer, 'listening');
const PORT = server.httpServer.address().port;
const browser = await chromium.launch();
const failures = [];
const assets = path.join(ROOT, 'dist', 'assets');
const assetNames = await readdir(assets);
if (assetNames.some((name) => /^(portrait-illustration|doc-identity-placeholder|selfie-placeholder)/.test(name))) failures.push('Mock media included in production assets');
for (const name of assetNames.filter((n) => n.endsWith('.js'))) {
  const src = await readFile(path.join(assets, name), 'utf8');
  for (const marker of ['MockPlaintextCodec', 'Ibu Fatimah', '__ZAWJAN_SCREENS__']) {
    if (src.includes(marker)) failures.push(`dist/assets/${name} contains dev-only code (${marker})`);
  }
}
try {
  const page = await browser.newPage();
  for (const url of ['/', '/beranda?scenario=active_four_member_chat&persona=participant', '/moderator?persona=moderator', '/__layar']) {
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    const exposed = await page.evaluate(() => '__ZAWJAN_SCREENS__' in window);
    if (exposed) failures.push(`${url}: screen registry exposed on window`);
    if (/Skenario|Mode pengembangan/i.test(text)) failures.push(`${url}: dev/scenario UI visible`);
    if (/Aisyah|Rahman F\.|Ibu Fatimah/.test(text)) failures.push(`${url}: private mock fixture visible`);
    if (url === '/' && !/Profil fiktif|fiktif.*dikirim/i.test(text)) failures.push(`${url}: public educational simulation is not labelled`);
    console.log(`${url} -> ${text.replace(/\s+/g, ' ').slice(0, 110)}`);
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
if (failures.length) { failures.forEach((f) => console.error(`x ${f}`)); process.exit(1); }
console.log('Production smoke passed: no mock data, scenarios or dev UI reachable.');
