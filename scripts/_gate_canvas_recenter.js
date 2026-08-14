/* @gate-pool: browser
 *
 * ⛔⛔ A CONTROL THAT CREATES A STATE MUST OFFER A WAY OUT OF IT (§14.6, §18.6).
 *
 * THE DEFECT, AS THE CAPTAIN LIVED IT: "I just lost my estate map completely. I was trying to grab it
 * and drag to find the button and it went off screen and can't get it back."
 * MEASURED 2026-08-13, REPRODUCED 2026-08-14:
 *     start                        translate(calc(-50% + 0px),    calc(-50% + 0px))    scale(0.767)
 *     pan to -4000/-3000           translate(calc(-50% - 4000px), calc(-50% - 3000px)) scale(0.767)
 *     fitToScreen()                translate(calc(-50% - 4000px), calc(-50% - 3000px)) scale(0.767)  <- UNCHANGED
 * `window.resize` is wired straight to fitToScreen, so not even resizing the window recovered it, and
 * NO RECENTER AFFORDANCE EXISTED ANYWHERE. The only escape was typing into the browser console.
 *
 * ⭐⭐ WHY THIS GATE PRINTS THE OFFSETS AND NOT JUST A VERDICT — ORDERED VERBATIM BY THE CAPTAIN:
 * "fitToScreen() returning success while translate(-4000px,-3000px) sits untouched is precisely an
 * unchanged red wearing a green coat." A function that no-ops looks EXACTLY like a function that
 * succeeded, from the outside. So every leg below prints the offsets it saw, before and after.
 * 🔑 §16.1 — A RED THAT STAYS RED HIDES A REGRESSION EXACTLY AS WELL AS A GREEN DOES, AND A NUMBER
 *    THAT NEVER MOVES IS THE ONLY THING THAT SHOWS EITHER. READ THE VALUES, NOT THE SCORE.
 *
 * ⚠️ AND THE CLASS WAS CHECKED RATHER THAN ASSUMED. §14.6 warned "Shape mode has its own pan state —
 * CHECK BOTH before declaring it fixed. Do not fix one and report three." Measured: THREE canvases
 * exist (estate / shape-have / shape-want) and only the ESTATE was broken — fitShapeToScreen and
 * fitWantToScreen already zero their own offsets. So this gate asserts ALL THREE, which is what stops
 * the NEXT fit function from quietly omitting the reset.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 * C1 · FIXTURE        the pan actually moved the canvas (§13.73). Without this, "it is centred after
 *                     fit" is vacuously true for a canvas that never left the origin — the single
 *                     most likely way this gate could go green over a live defect.
 * C2 · ESTATE FIT     fitToScreen() returns the estate to 0/0. THE DEFECT ITSELF.
 * C3 · SHAPE FIT      _fitShapeToScreen() returns the Have shape to 0/0.
 * C4 · WANT FIT       _fitWantToScreen() returns the Want shape to 0/0.
 * C5 · THE CONTROL    #canvas-recenter is REACHABLE (elementFromPoint at its centre — presence is not
 *                     reachability, §14.5) and CLICKING IT recovers a panned-away canvas. Driven by a
 *                     real click, never by calling the handler: the button is the affordance, and a
 *                     handler that works behind a dead button is the defect we already shipped once.
 * C6 · APPEARS ONLY WHEN NEEDED  Captain-ruled 2026-08-14: hidden while centred, shown once off
 *                     centre, hidden again after recovery. Asserted in all three states, because a
 *                     control that never hides and a control that never shows both "pass" a one-state
 *                     check.
 * C7 · NO CONSOLE     the page throws nothing across the whole sequence. _syncRecenterBtn runs inside
 *                     three transform writers; a throw there would abort the inline script block.
 *
 * ── CONTROLS · RED-FIRST BY MUTATION ────────────────────────────────────────────────────────────
 *   --defect   in-memory, deletes `currentX = 0; currentY = 0;` from fitToScreen — the EXACT bytes
 *              the fix added. C2 and C5 MUST go RED. Counts its anchor and aborts if it does not
 *              land exactly once: a red-first that did not land proves nothing.
 *   --nohide   in-memory, forces the control permanently visible. C6 MUST go RED — this is the
 *              control for the "it never hides" half, which --defect cannot reach.
 *
 * Usage: node scripts/_gate_canvas_recenter.js [LABEL] [--defect|--nohide]
 * Self-hosts on 127.0.0.1:8383 — NOT :8001, the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const DEFECT = process.argv.includes('--defect');
const NOHIDE = process.argv.includes('--nohide');
const PORT = 8383;
const PAN_X = -4000, PAN_Y = -3000;      // the Captain's own magnitude — far enough to be unrecoverable
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const DEFECT_TARGET = '       scale = Math.min(scaleX, scaleY, 0.95);\n       currentX = 0; currentY = 0;\n';
const DEFECT_BROKEN = '       scale = Math.min(scaleX, scaleY, 0.95);\n';
const NOHIDE_TARGET = '  #canvas-recenter { display: none; }';
const NOHIDE_BROKEN = '  #canvas-recenter { display: block; }';

/* ⛔ SAME CONTRACT AS _gate_exit_reachable — see its note. `studioSource()` is the only door for
   gates that ANALYSE the Studio source; this one SERVES a page and mutates the bytes on their way
   out, so it goes through the generic asset reader and never names studio.html at a read.
   _gate_studio_source P1 enforces this, and it only sees TRACKED files — so a new gate is invisible
   to it until the commit that adds it. */
const readAsset = (urlPath) => {
  const f = path.resolve(ROOT, '.' + urlPath);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8');
};

let SERVE = null;
if (DEFECT || NOHIDE) {
  SERVE = readAsset('/studio.html');
  const [t, b, name] = DEFECT ? [DEFECT_TARGET, DEFECT_BROKEN, '--defect'] : [NOHIDE_TARGET, NOHIDE_BROKEN, '--nohide'];
  const n = SERVE.split(t).length - 1;
  if (n !== 1) { console.log(`[canvas_recenter] ABORT — ${name} anchor found ${n}x, expected exactly 1. The mutation did not land; a red-first that did not land proves nothing.`); process.exit(2); }
  SERVE = SERVE.replace(t, b);
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (SERVE && u === '/studio.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(SERVE); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

const fails = [];
const notes = [];
const fail = (leg, msg) => fails.push(`${leg}: ${msg}`);

/* Reads the LIVE transform off the element, not the JS variable. The variable is what the code
   believes; the transform is what the user sees, and the defect was precisely a disagreement
   between the two. */
const readT = (sel) => {
  const el = document.querySelector(sel);
  return el ? (el.style.transform || getComputedStyle(el).transform || '(none)') : '(absent)';
};

(async () => {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });

  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
  await page.waitForFunction(() => {
    const w = document.getElementById('studioOverlayWrap');
    if (w) { const c = getComputedStyle(w); if (!(c.pointerEvents === 'none' || c.opacity === '0' || c.display === 'none')) return false; }
    const l = document.getElementById('studio-layout');
    return !!l && !l.classList.contains('seed-gated');
  }, null, { timeout: 8000 }).catch(() => fail('C0 PRECONDITION', 'page never settled in 8s — every leg below would be measuring setup'));

  /* Give the estate something to draw, so the canvas is a real subject and not an empty grid.
     ⛔⛔ AND THEN FORCE ESTATE MODE — THE FIXTURE IS WRONG WITHOUT IT, AND IT FOOLED ME ONCE.
     §22 forces Shape mode on a Studio with zero accounts, so the layout can still be `mode-shape`
     here. Panning the ESTATE while the SHAPE canvas is the active one made the control correctly
     report "centred" and produced a confident 4-leg red against a working fix.
     🔑 A FIXTURE THAT BUILDS THE WRONG STATE FAILS *LOUDLY AND WRONGLY*, WHICH COSTS MORE THAN A
        FIXTURE THAT FAILS TO BUILD — the reds all named real-looking things. Assert the state. */
  await page.evaluate(() => {
    try { window.state.accounts = []; addInstance('property'); addInstance('checking');
      window.state.accounts.forEach((a) => { a.value = 250000; }); updateSVGs(); } catch (e) {}
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const l = document.getElementById('studio-layout');
    if (l && l.classList.contains('mode-shape') && window.toggleShapeMode) window.toggleShapeMode();
  });
  await page.waitForTimeout(700);
  const modeOK = await page.evaluate(() => {
    const l = document.getElementById('studio-layout');
    return { shape: !!(l && l.classList.contains('mode-shape')), cls: l ? l.className : 'NONE' };
  });
  if (modeOK.shape) fail('C0 FIXTURE', `could not leave Shape mode — layout is "${modeOK.cls}". Every estate leg below would be measuring the wrong canvas.`);

  const BP = '#blueprint-container';
  const centredAt0 = await page.evaluate(readT, BP);
  /* ⛔⛔ ASSERT THE RENDERED STATE, NEVER THE CLASS NAME. First version of C6 read
     classList.contains('is-off-centre') and --nohide PASSED 7/7 — the mutation broke the CSS while
     the class stayed perfectly correct, so a control stuck permanently on screen read as GREEN.
     🔑 THE CLASS IS THE MECHANISM; getComputedStyle IS THE OUTCOME. A leg that asserts the mechanism
        cannot see a broken rule, and "is it visible" is the entire claim this leg makes. */
  const isShown = () => {
    const b = document.getElementById('canvas-recenter');
    if (!b) return null;
    return getComputedStyle(b).display !== 'none';
  };
  const hiddenAtRest = await page.evaluate(isShown);
  // C6a — hidden while centred
  if (hiddenAtRest === null) fail('C6 VISIBILITY', '#canvas-recenter is absent from the DOM entirely');
  else if (hiddenAtRest === true) fail('C6 VISIBILITY (centred)', `the control is showing on a CENTRED canvas — transform ${centredAt0}`);

  // ── PAN IT AWAY ────────────────────────────────────────────────────────────────────────────────
  await page.evaluate(([x, y]) => { currentX = x; currentY = y; updateTransform(); }, [PAN_X, PAN_Y]);
  await page.waitForTimeout(250);
  const afterPan = await page.evaluate(readT, BP);

  // C1 · FIXTURE — the pan must actually have moved it, or nothing below means anything.
  if (!/-\s*4000px/.test(afterPan) || !/-\s*3000px/.test(afterPan)) {
    fail('C1 FIXTURE', `the pan did not land — transform after panning to ${PAN_X}/${PAN_Y} reads ${afterPan}. Every leg below would be asserting over a canvas that never moved.`);
  }
  // C6b — shown once off centre
  const shownWhenOff = await page.evaluate(isShown);
  if (shownWhenOff !== true) fail('C6 VISIBILITY (off-centre)', `the control stayed HIDDEN on a canvas panned to ${PAN_X}/${PAN_Y} — there is no way out`);

  // C5 · THE CONTROL IS REACHABLE, AND THE CLICK IS WHAT RECOVERS IT.
  const reach = await page.evaluate(() => {
    const b = document.getElementById('canvas-recenter');
    if (!b) return { present: false };
    const r = b.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return { present: true, box: false, display: getComputedStyle(b).display };
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') : 'NULL(off-viewport)');
    return { present: true, box: true, reachable: hit === b || b.contains(hit), hit: d(hit), rect: [Math.round(r.left), Math.round(r.top)] };
  });
  if (!reach.present) fail('C5 CONTROL', '#canvas-recenter absent — the estate has no way home');
  else if (!reach.box) fail('C5 CONTROL', `#canvas-recenter has a zero box (display:${reach.display}) while the canvas is panned away`);
  else if (!reach.reachable) fail('C5 CONTROL', `#canvas-recenter is not hit-testable at its own centre — elementFromPoint returned ${reach.hit} at [${reach.rect}]`);
  else await page.click('#canvas-recenter');
  await page.waitForTimeout(400);

  /* ⛔ C2 MUST NOT RIDE ON C5's CLICK. First run this defect produced FOUR reds from ONE cause: the
     control was hidden, so the click was skipped, so the offsets never reset, so C2 reported the
     estate-fit defect too. A CASCADE INFLATES A RED COUNT AND POINTS AT THE WRONG FUNCTION.
     🔑 EVERY LEG MUST BE ABLE TO FAIL ON ITS OWN EVIDENCE. So if the control could not be clicked,
        C2 calls fitToScreen() DIRECTLY — the two claims (the maths works / the affordance works)
        stay independent, which is the whole reason they are two legs. */
  const clicked = !!(reach.present && reach.box && reach.reachable);
  if (!clicked) {
    notes.push('  (C5 could not click — C2 fell back to calling fitToScreen() directly so it fails on its OWN evidence)');
    await page.evaluate(() => { if (window._recenterEstate) window._recenterEstate(); });
    await page.waitForTimeout(300);
  }
  const afterClick = await page.evaluate(readT, BP);
  const offsetsAfter = await page.evaluate(() => ({ x: currentX, y: currentY }));
  // C2 · THE DEFECT ITSELF.
  if (offsetsAfter.x !== 0 || offsetsAfter.y !== 0) {
    fail('C2 ESTATE FIT', `after ⌖ RECENTER the pan offsets are currentX=${offsetsAfter.x} currentY=${offsetsAfter.y} (expected 0/0) — transform ${afterClick}`);
  }
  if (/-\s*4000px/.test(afterClick)) fail('C2 ESTATE FIT', `the transform still carries the pan after recentering — ${afterClick}`);
  // C6c — hidden again after recovery
  const hiddenAfter = await page.evaluate(isShown);
  if (hiddenAfter !== false) fail('C6 VISIBILITY (recovered)', 'the control is STILL showing after the canvas returned to centre');

  // ── C3 · THE HAVE SHAPE ────────────────────────────────────────────────────────────────────────
  await page.evaluate(() => { if (window.toggleShapeMode) window.toggleShapeMode(); });
  await page.waitForTimeout(1000);
  const shapeBefore = await page.evaluate(() => { try { shapeX = -1500; shapeY = -1200; updateShapeTransform(); } catch (e) { return 'ERR ' + e.message; } return document.getElementById('shape-zoom-wrap').style.transform; });
  await page.evaluate(() => { if (window._fitShapeToScreen) window._fitShapeToScreen(); });
  await page.waitForTimeout(300);
  const shapeAfter = await page.evaluate(() => { try { return { t: document.getElementById('shape-zoom-wrap').style.transform, x: shapeX, y: shapeY }; } catch (e) { return { t: 'ERR', x: null, y: null }; } });
  if (shapeAfter.x !== 0 || shapeAfter.y !== 0) fail('C3 SHAPE FIT', `_fitShapeToScreen left shapeX=${shapeAfter.x} shapeY=${shapeAfter.y} (expected 0/0) — transform ${shapeAfter.t}`);
  notes.push(`  shape-have : panned ${shapeBefore}  ->  fit ${shapeAfter.t}  (shapeX=${shapeAfter.x}, shapeY=${shapeAfter.y})`);

  // ── C4 · THE WANT SHAPE ────────────────────────────────────────────────────────────────────────
  const wantRes = await page.evaluate(() => {
    try {
      if (window.flipToWant) window.flipToWant();
      wantX = -1500; wantY = -1200; updateWantTransform();
      const panned = document.getElementById('shape-want-zoom-wrap') ? document.getElementById('shape-want-zoom-wrap').style.transform : '(no wrap)';
      if (window._fitWantToScreen) window._fitWantToScreen();
      return { panned, x: wantX, y: wantY };
    } catch (e) { return { err: String(e).slice(0, 120) }; }
  });
  await page.waitForTimeout(300);
  if (wantRes.err) fail('C4 WANT FIT', `could not exercise the Want canvas: ${wantRes.err}`);
  else if (wantRes.x !== 0 || wantRes.y !== 0) fail('C4 WANT FIT', `_fitWantToScreen left wantX=${wantRes.x} wantY=${wantRes.y} (expected 0/0) — panned was ${wantRes.panned}`);
  else notes.push(`  shape-want : panned ${wantRes.panned}  ->  fit wantX=${wantRes.x}, wantY=${wantRes.y}`);

  // C7 · NO CONSOLE ERRORS across the whole sequence.
  if (errs.length) fail('C7 NO-THROW', `${errs.length} page error(s): ${errs.slice(0, 3).join(' | ')}`);

  await browser.close();
  server.close();

  /* ⭐ THE VALUES, ALWAYS PRINTED — GREEN OR RED. This is the whole point of the gate: the numbers
     are the evidence, and a verdict without them cannot distinguish "fixed" from "never moved". */
  const mode = DEFECT ? ' [--defect]' : NOHIDE ? ' [--nohide]' : '';
  console.log('  estate     : centred ' + centredAt0);
  console.log('               panned  ' + afterPan);
  console.log('               recentred ' + afterClick + '  (currentX=' + offsetsAfter.x + ', currentY=' + offsetsAfter.y + ')');
  notes.forEach((n) => console.log(n));
  console.log('  control    : at rest hidden=' + (hiddenAtRest === false) + ' · off-centre shown=' + (shownWhenOff === true) + ' · after recover hidden=' + (hiddenAfter === false) + '   (computed display, not the class)');
  fails.forEach((f) => console.log('  FAIL  ' + f));
  const LEGS = 7;
  console.log(fails.length === 0
    ? `[canvas_recenter] ${LABEL}${mode} — PASS ${LEGS}/${LEGS} legs GREEN`
    : `[canvas_recenter] ${LABEL}${mode} — FAIL ${fails.length} leg(s) RED of ${LEGS}`);
  process.exit(fails.length === 0 ? 0 : 1);
})();
