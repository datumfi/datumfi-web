'use strict';
/* _p82_coarch_display_gate.js — P8.2 display-additivity gate + eyeson.
 *
 * Proves the Co-Architect display work is DISPLAY-ONLY (header text swap + static note,
 * NO age derivation):
 *   (1) window._buildStudioRequest() body is BYTE-IDENTICAL with the Co-Architect
 *       toggle OFF vs ON — no co-arch leakage into the engine body;
 *   (2) window._scenarioFromInputs() (the Shape's input scenario) is BYTE-IDENTICAL
 *       OFF vs ON — the Shape math never sees the co-arch state;
 *   (3) the Shape timeline header relabels "01 / YOUR TIMELINE" -> "01 / PRIMARY
 *       TIMELINE" on toggle ON (both Have/Want faces), reverts on OFF; and the Profile
 *       note copy is present verbatim.
 *
 * Also captures eyeson screenshots (toggle OFF, toggle ON, header crop) into _eyeson/.
 *
 * Run: node scripts/_p82_coarch_display_gate.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, '_eyeson'); if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8129;
let fails = 0; const results = [];
function check(label, cond, detail) { const ok = !!cond; if (!ok) fails++; results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? ' (' + detail + ')' : '')); }

// Clean-scratch Clerk stub (no dossier seeded — start from blank Studio).
const initScript = `(function(){
  window.Clerk = { load:function(){return Promise.resolve();}, user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} };
})();`;
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort(); return route.continue(); });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
  await ctx.addInitScript(initScript);
  await blockClerk(ctx);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Dismiss the first-impression overlay (start from scratch).
  try { if (await page.locator('#studioStartScratch').isVisible({ timeout: 1500 })) { await page.click('#studioStartScratch'); await page.waitForTimeout(500); } } catch (_e) {}
  /* ⛔ ENTER THE ROOM THE FIELDS NOW LIVE IN (2026-08-14, the spine-rooms commit).
     The Studio opens on the LANDING — the Datumae and nothing else — so every drafting section is
     display:none until a phase is opened. This gate drives controls inside a section, and a real
     user reaches them by clicking that phase. THE SETUP CHANGED, NOT THE CLAIM: not one assertion
     below is touched, and the gate still fails for every reason it failed before.
     🔑 WHEN A PRODUCT'S ENTRY STATE MOVES, A FIXTURE THAT STILL BUILDS THE OLD ENTRY STATE IS
        TESTING A SCREEN NO USER CAN REACH. */
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(400);

  // Fill PRIMARY profile so _buildStudioRequest() returns a non-null body, then
  // SETTLE: dispatch 'change' so syncFromProfileDates() pushes the primary dates onto
  // slider-age/slider-activation BEFORE any snapshot (otherwise the OFF snapshot races
  // the debounced primary reconcile — not a co-arch effect). co-dob/co-ret are NOT
  // wired to that reconcile (wireProfileBindings only binds pri-dob/target-ret/plan-end-age).
  await page.fill('#pri-dob', '06/1980');
  await page.fill('#target-ret', '01/2042');
  await page.evaluate(() => { ['pri-dob','target-ret'].forEach(function(id){ var e=document.getElementById(id); if(e) e.dispatchEvent(new Event('change')); }); });
  await page.waitForTimeout(400);

  const snap = () => page.evaluate(() => ({
    body: JSON.stringify(window._buildStudioRequest()),
    shape: JSON.stringify(window._scenarioFromInputs()),
    hud: ['ri-ceiling-val','ri-datum-val','ri-floor-val'].map(function(id){ var e=document.getElementById(id); return e?e.textContent.trim():null; }).join('|')
  }));

  const hdr = () => page.evaluate(() => ({
    have: (document.getElementById('timeline-header-have') || {}).textContent,
    want: (document.getElementById('timeline-header-want') || {}).textContent
  }));

  // ── OFF state ──────────────────────────────────────────────────────────
  const off = await snap();
  const hdrOff = await hdr();
  await page.screenshot({ path: path.join(OUT, 'p82_coarch_off.png'), fullPage: false });

  // ── ON state: toggle co-arch on (the header relabel fires here) ──────────
  await page.evaluate(() => { var t = document.getElementById('co-arch-toggle'); t.checked = true; t.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(250);
  const on = await snap();
  const hdrOn = await hdr();

  const noteTxt = await page.evaluate(() => (document.getElementById('co-arch-note') || {}).textContent);

  // ── ON->OFF revert: untoggle and confirm the header reverts ─────────────
  await page.evaluate(() => { var t = document.getElementById('co-arch-toggle'); t.checked = false; t.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(200);
  const hdrRevert = await hdr();

  // Re-toggle ON for the eyeson screenshots.
  await page.evaluate(() => { var t = document.getElementById('co-arch-toggle'); t.checked = true; t.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, 'p82_coarch_on.png'), fullPage: false });
  try {
    const box = await page.locator('#shape-input-frame-have').boundingBox();
    if (box) await page.screenshot({ path: path.join(OUT, 'p82_header_crop.png'), clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.min(box.width + 16, 1440), height: Math.min(220, box.height + 16) } });
  } catch (_e) {}

  const NOTE = 'We see your Co-Architect. For now your Shape treats you as one household; per-person precision arrives as you draft your Estate.';

  // ── ASSERTIONS ────────────────────────────────────────────────────────
  check('(1) buildStudioRequest body BYTE-IDENTICAL off vs on', off.body === on.body, off.body === on.body ? 'identical' : 'OFF=' + off.body + ' ON=' + on.body);
  check('(2) _scenarioFromInputs (Shape) BYTE-IDENTICAL off vs on', off.shape === on.shape, off.shape === on.shape ? 'identical' : 'OFF=' + off.shape + ' ON=' + on.shape);
  check('(2b) HUD readout unchanged off vs on', off.hud === on.hud, 'OFF=' + off.hud + ' ON=' + on.hud);
  check('(3a) header OFF = "01 / YOUR TIMELINE" (have+want)', hdrOff.have === '01 / YOUR TIMELINE' && hdrOff.want === '01 / YOUR TIMELINE', JSON.stringify(hdrOff));
  check('(3b) header ON = "01 / PRIMARY TIMELINE" (have+want)', hdrOn.have === '01 / PRIMARY TIMELINE' && hdrOn.want === '01 / PRIMARY TIMELINE', JSON.stringify(hdrOn));
  check('(3c) header reverts to YOUR on toggle OFF', hdrRevert.have === '01 / YOUR TIMELINE' && hdrRevert.want === '01 / YOUR TIMELINE', JSON.stringify(hdrRevert));
  check('(3d) Profile note copy verbatim + present', (noteTxt || '').trim() === NOTE, JSON.stringify(noteTxt));
  check('(4) no page errors', errs.length === 0, errs.join(' ; '));

  await browser.close(); server.close();
  console.log('\n=== P8.2 Co-Architect display-additivity gate ===');
  results.forEach((r) => console.log(r));
  console.log(fails === 0 ? '\nGREEN — display is additive (off==on) and renders CA/RA.\n' : '\n' + fails + ' FAILURE(S)\n');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(2); });
