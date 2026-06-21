'use strict';
/* _want_phase2_parity.js — STANDING GATE for the Studio WANT-face Phase-2 throttle set.
 *
 * Proves, in a REAL browser, on the Studio "Shape You Want" back face:
 *   #10 — HUD comparison header reads "Shape You Have" / "Shape You Want"
 *         (NOT the old "CURRENT SHAPE" / "TEST SHAPE"); matches the toggle labels.
 *   #4  — Want sliders enforce Sketch's value-snap cross-constraints (sketch.html
 *         L8946-8961): CA < RA (age snaps to RA-1), RA > CA (activation snaps to
 *         CA+1) and bumps PTA, PTA >= max(75, RA+20).
 *   #6  — Reset honors a SAVED carried sketch: with window._studioCarriedDesign
 *         present, Reset restores the SAVED S2 design (not the Have baseline);
 *         with NO carried design, Reset reverts to Have.
 *
 * RED-FIRST: on pre-fix code #10 (old header), #4 (no snap) and #6-saved (reset
 * snaps to Have, not the saved design) all FAIL — reproducing the live symptom via
 * the app's own event path. The fixes turn them green.
 *
 * Run: node scripts/_want_phase2_parity.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
let fails = 0; const results = [];
function check(label, cond, detail) { const ok = !!cond; if (!ok) fails++; results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? ' (' + detail + ')' : '')); }
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog/i.test(u)) return route.abort(); return route.continue(); });
const setSlider = (page, id, val) => page.evaluate(([i, v]) => { const el = document.getElementById(i); if (!el) return null; el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); return parseInt(el.value, 10); }, [id, val]);
const ageOf = (page, id) => page.evaluate((i) => parseInt(document.getElementById(i).value, 10), id);

// Enter shape mode and flip to the Want back face (drives the real onclick paths).
async function enterWant(page) {
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#shape-mode-toggle');
  await page.waitForTimeout(1200);
  await page.click('#shape-want-tab');
  await page.waitForTimeout(1400);
}

(async () => {
  await new Promise((r) => server.listen(8147, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8147';

  // ── Context A: fresh scratch (no carried design) — #10, #4, #6-fresh ──
  let ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  let page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await enterWant(page);

  // #10 — comparison header strings (capital "You", matches toggle/col-heads).
  const hdr = await page.evaluate(() => {
    const grid = document.querySelector('#shape-want-face') || document;
    // locate the 3-col header row holding the two static labels
    const spans = Array.prototype.map.call(document.querySelectorAll('span'), (s) => (s.textContent || '').trim());
    return { hasHave: spans.indexOf('Shape You Have') > -1, hasWant: spans.indexOf('Shape You Want') > -1,
             oldCur: spans.indexOf('CURRENT SHAPE') > -1, oldTest: spans.indexOf('TEST SHAPE') > -1 };
  });
  check('#10: header shows "Shape You Have"', hdr.hasHave);
  check('#10: header shows "Shape You Want"', hdr.hasWant);
  check('#10: old "CURRENT SHAPE" label gone', !hdr.oldCur);
  check('#10: old "TEST SHAPE" label gone', !hdr.oldTest);

  // #4 — value-snap cross-constraints on the Want sliders.
  await setSlider(page, 'd2-slider-age', 40);
  await setSlider(page, 'd2-slider-activation', 70);
  await setSlider(page, 'd2-slider-age', 80);              // CA >= RA -> snap to RA-1 = 69
  check('#4: CA snaps to <= RA-1 on live input', (await ageOf(page, 'd2-slider-age')) <= 69, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  await setSlider(page, 'd2-slider-age', 50);
  await setSlider(page, 'd2-slider-activation', 45);       // RA <= CA -> snap to CA+1 = 51
  check('#4: RA snaps to >= CA+1 on live input', (await ageOf(page, 'd2-slider-activation')) >= 51, 'RA=' + (await ageOf(page, 'd2-slider-activation')));
  await setSlider(page, 'd2-slider-age', 50);
  await setSlider(page, 'd2-slider-activation', 70);       // activation bumps PTA floor to max(75,90)=90
  await setSlider(page, 'd2-slider-plan-through', 80);     // PTA < RA+20 -> snap to 90
  check('#4: PTA snaps to >= max(75, RA+20)', (await ageOf(page, 'd2-slider-plan-through')) >= 90, 'PTA=' + (await ageOf(page, 'd2-slider-plan-through')));

  // #6 (fresh) — no carried design: Reset reverts to Have baseline (CA 40).
  await setSlider(page, 'd2-slider-age', 55);
  await page.click('#d2s-btn-reset-design');
  await page.waitForTimeout(400);
  check('#6: fresh reset reverts to Have (CA=40)', (await ageOf(page, 'd2-slider-age')) === 40, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  await ctx.close();

  // ── Context B: carried saved design injected — #6-saved ──
  ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#shape-mode-toggle');
  await page.waitForTimeout(1200);
  // Inject a SAVED carried S2 design distinct from Have (CA 52 vs Have 40) BEFORE first want flip.
  await page.evaluate(() => {
    window._studioCarriedDesign = { present: true,
      scenario: { age: 52, retire: 68, planThroughAge: 99, port: 1.0, datum: 120, contrib: 30000 },
      overrides: { ceilDelta: 0, floorDelta: 0, datumDelta: 0, portDelta: 0 } };
  });
  await page.click('#shape-want-tab');
  await page.waitForTimeout(1400);
  check('#6: carried design seeds the saved CA (52)', (await ageOf(page, 'd2-slider-age')) === 52, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  await setSlider(page, 'd2-slider-age', 45);              // move away from the saved design
  await page.click('#d2s-btn-reset-design');
  await page.waitForTimeout(400);
  check('#6: saved reset restores the saved design (CA=52, not Have 40)', (await ageOf(page, 'd2-slider-age')) === 52, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  check('#6: saved reset restores saved RA (68)', (await ageOf(page, 'd2-slider-activation')) === 68, 'RA=' + (await ageOf(page, 'd2-slider-activation')));
  check('#6: saved reset restores saved PTA (99)', (await ageOf(page, 'd2-slider-plan-through')) === 99, 'PTA=' + (await ageOf(page, 'd2-slider-plan-through')));
  await ctx.close();

  // ── Context C: #9 — Estate-exit FROM WANT must mirror the clean Have-exit ──
  const exitSnap = (pg) => pg.evaluate(() => {
    const lay = document.getElementById('studio-layout');
    const dp = document.querySelector('.drafting-panel');
    const fi = document.getElementById('shape-flip-inner');
    return { wantMode: lay.classList.contains('want-mode'), shapeMode: lay.classList.contains('mode-shape'),
             drafting: dp ? getComputedStyle(dp).display : '(none)', flipped: fi ? fi.classList.contains('flipped') : null };
  });
  ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await enterWant(page);                                   // enter shape -> flip to WANT
  await page.click('#shape-mode-toggle');                 // EXIT shape mode FROM the Want face
  await page.waitForTimeout(900);
  let ex = await exitSnap(page);
  check('#9: WANT-exit clears want-mode', !ex.wantMode, JSON.stringify(ex));
  check('#9: WANT-exit clears mode-shape', !ex.shapeMode, JSON.stringify(ex));
  check('#9: WANT-exit unflips the shape inner', ex.flipped === false, JSON.stringify(ex));
  check('#9: WANT-exit restores the drafting panel (not hidden)', ex.drafting === 'block', JSON.stringify(ex));
  await ctx.close();

  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nWANT PHASE-2 PARITY: GREEN' : '\nWANT PHASE-2 PARITY: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
