'use strict';
/* _p82_coarch_display_gate.js — P8.2 display-additivity gate + eyeson.
 *
 * Proves the Co-Architect display work is DISPLAY-ONLY FOR THE SHAPE AND THE HEADER.
 * ⚖ NARROWED 2026-09-04. The original claim was display-only FULL STOP, including the engine
 *   body. F67 struck that: co_architect_age reaches /api/calculate by design, and without it a
 *   couple is modelled as one person. The claim now stops at the payload boundary, and the
 *   boundary itself is asserted:
 *   (1a) a READABLE co-architect REACHES the engine body (F67);
 *   (1b) toggle ON with NO co-architect DOB REFUSES (F79) — never a silent one-person body;
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

  /* ⚖ THIRD SNAPSHOT ADDED 2026-09-04. The ON snapshot above has the toggle set and NO
     co-architect DOB, so _coArchitectFacts() returns null at R14401 and the co-arch keys never
     enter the body. THAT IS WHY THE OLD BYTE-IDENTICAL LEG STAYED GREEN FOR EIGHT COMMITS AFTER
     F67 STRUCK ITS CONTRACT — the fixture walked through neither of the two null doors, so the
     bodies matched BY ACCIDENT OF THE FIXTURE rather than by the property being true.
     🔑 A FIXTURE THAT NEVER EXERCISES THE BRANCH MAKES THE ASSERTION DECORATIVE (82.1504). */
  await page.fill('#co-dob', '11 / 1976');
  await page.evaluate(() => { var e = document.getElementById('co-dob');
    if (e) { e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(250);
  const onReadable = await snap();


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
  /* ⛔⛔ LEG (1) REWRITTEN 2026-09-04 — IT ASSERTED A CONTRACT THAT HAD BEEN STRUCK.
     It read: the /api/calculate body is BYTE-IDENTICAL with the co-architect toggle OFF vs ON,
     "no co-arch leakage into the engine body". That was true when P8.2 shipped and F67
     DELIBERATELY OVERTURNED IT: _coArchitectFacts() (R14396-14418) is merged into the body at
     R14588-14589, so co_architect_age REACHES THE ENGINE BY DESIGN. Without it the engine models
     a couple as a single person for income and healthcare while taxing them as married.
     ⛔ IT STAYED GREEN BECAUSE THE FIXTURE NEVER SUPPLIED A CO-ARCHITECT DOB. Nobody noticed for
        eight commits, and the gate would have gone red the first time anyone typed one.
     ⚖ DISPLAY-ONLY SURVIVES, NARROWED TO WHAT IS TRUE: the co-architect is display-only for the
       SHAPE and the HEADER — legs (2), (2b), (3a), (3b), untouched. The PAYLOAD is where it stops
       being display-only, so that boundary is now asserted rather than denied. */
  check('(1a) THE BOUNDARY — a READABLE co-architect REACHES the engine body (F67); display-only ends at the payload',
    onReadable.body !== off.body && /"co_architect_age"/.test(onReadable.body),
    'OFF=' + String(off.body).slice(0, 90) + ' ... ON+DOB=' + String(onReadable.body).slice(0, 140));
  check('(1b) toggle ON with NO co-architect DOB REFUSES (F79) — never a silent one-person body',
    on.body === 'null',
    'ON(no dob)=' + String(on.body).slice(0, 140));
  check('(2) _scenarioFromInputs (Shape) BYTE-IDENTICAL off vs on', off.shape === on.shape, off.shape === on.shape ? 'identical' : 'OFF=' + off.shape + ' ON=' + on.shape);
  check('(2b) HUD readout unchanged off vs on', off.hud === on.hud, 'OFF=' + off.hud + ' ON=' + on.hud);
  check('(3a) header OFF = "01 / YOUR TIMELINE" (have+want)', hdrOff.have === '01 / YOUR TIMELINE' && hdrOff.want === '01 / YOUR TIMELINE', JSON.stringify(hdrOff));
  check('(3b) header ON = "01 / PRIMARY TIMELINE" (have+want)', hdrOn.have === '01 / PRIMARY TIMELINE' && hdrOn.want === '01 / PRIMARY TIMELINE', JSON.stringify(hdrOn));
  check('(3c) header reverts to YOUR on toggle OFF', hdrRevert.have === '01 / YOUR TIMELINE' && hdrRevert.want === '01 / YOUR TIMELINE', JSON.stringify(hdrRevert));
  /* ⛔⛔ LEG (3d) INVERTED 2026-09-05 — THE STRING IT GUARDED IS GONE, BY RULING.
     OLD EXPECTATION: #co-arch-note exists and reads VERBATIM
       "We see your Co-Architect. For now your Shape treats you as one household; per-person
        precision arrives as you draft your Estate."
     NEW EXPECTATION: #co-arch-note DOES NOT EXIST, and that sentence appears NOWHERE on the page.
     WHY: it was true when P8.2 shipped and f4b0a64 (F67) falsified it — _coArchitectFacts() now
     sends co_architect_age to /api/calculate and the engine models a SECOND PERSON, so the Shape
     demonstrably no longer treats the household as one. The same reason leg (1) was rewritten a day
     earlier: THIS GATE HAS NOW ASSERTED TWO CONTRACTS THAT F67 STRUCK, and both stayed green
     because nothing re-read the prose against the code.
     ⚖️ WHAT THIS GATE STILL PROTECTS IS UNCHANGED: (1a)/(1b) the payload boundary, (2)/(2b) the
     Shape, (3a)/(3b)/(3c) the header relabel. Only the deleted sentence moves.
     ⚠️ A NEGATIVE LEG NEEDS AN EXISTENCE LEG OR IT PASSES ON A BLANK PAGE. "The note is absent" is
        trivially true of a page that failed to render, never reached dual mode, or 404'd — so the
        CONTAINER that used to hold it is asserted present and revealed in the same breath. That
        container is also the thing F71 dereferences unguarded, so this doubles as its guard. */
  const NOTE_GONE = await page.evaluate((s) => ({
    noteEl: !!document.getElementById('co-arch-note'),
    holder: !!document.getElementById('co-arch-fields'),
    holderShown: (function () { var e = document.getElementById('co-arch-fields');
      return e ? getComputedStyle(e).display : null; })(),
    stringAnywhere: document.body.innerText.indexOf(s) >= 0
  }), NOTE);
  check('(3d-existence) the container that HELD the note is present and revealed in dual mode — '
    + 'without this, "the note is gone" would pass on a page that never rendered',
    NOTE_GONE.holder === true && NOTE_GONE.holderShown === 'block',
    'holder=' + NOTE_GONE.holder + ' display=' + JSON.stringify(NOTE_GONE.holderShown));
  check('(3d) the one-household note is DELETED — element absent AND the sentence appears nowhere '
    + 'on the page (F67 made it false; a construction marker is removed, not re-authored)',
    NOTE_GONE.noteEl === false && NOTE_GONE.stringAnywhere === false,
    'element=' + NOTE_GONE.noteEl + ' stringAnywhere=' + NOTE_GONE.stringAnywhere);
  check('(4) no page errors', errs.length === 0, errs.join(' ; '));

  await browser.close(); server.close();
  console.log('\n=== P8.2 Co-Architect display-additivity gate ===');
  results.forEach((r) => console.log(r));
  console.log(fails === 0 ? '\nGREEN — display is additive (off==on) and renders CA/RA.\n' : '\n' + fails + ' FAILURE(S)\n');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(2); });
