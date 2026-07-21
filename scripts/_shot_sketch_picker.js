'use strict';
/* Sketch save-picker screenshot (archival record, #277). P5b is backend-only — the sketch picker UI
 * is the unchanged 4-slot A-0n picker; this just captures it post-P5b for the record. Drives sketch.html
 * to a saveable state, opens the nav picker, shoots it. Run: node scripts/_shot_sketch_picker.js */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8195; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); }, session: { getToken: function () { return Promise.resolve('tok:harness'); } },
      user: { id: 'harness', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } } };
  });
  await page.goto(base + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1600);
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  for (let i = 0; i < 20; i++) { const rv = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); }); if (rv) break; await page.waitForTimeout(400); }
  await page.waitForTimeout(700);
  await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} if (typeof window.sketchSaveCurrent === 'function') window.sketchSaveCurrent(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { var pop = document.getElementById('sketch-save-sb-pop'); if (pop) { pop.style.left = '48px'; pop.style.right = 'auto'; pop.style.top = '96px'; } });
  await page.waitForTimeout(150);
  const box = await page.evaluate(() => { var pop = document.getElementById('sketch-save-sb-pop'); if (!pop) return null; var r = pop.getBoundingClientRect(); var n = pop.querySelectorAll('button').length; return { x: r.left, y: r.top, w: r.width, h: r.height, buttons: n }; });
  console.log('sketch picker present:', !!box, '| slot buttons:', box && box.buttons);
  if (box) { const pad = 14; await page.screenshot({ path: path.join(OUT, 'sketch_picker.png'), clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 } }); }
  await browser.close(); server.close();
  console.log('screenshot -> _eyeson/sketch_picker.png');
})();
