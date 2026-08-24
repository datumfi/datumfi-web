/* @gate-pool: browser
 *
 * ══ THE DISMISS CONTRACT — X PRESERVES, START FROM SCRATCH DISCARDS ════════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS BECAUSE THE X DESTROYED UNSAVED WORK AND NOTHING NOTICED. Captain-reproduced
 * 2026-08-24 on production: add a room · reload · the overlay returns · click X · THE ROOM IS GONE.
 * `studio.html` wired the close button to `_startScratchFlow()` whenever `_reopened` was false —
 * i.e. on EVERY first entry — and that function calls `_scratchReset()`, which DELETES
 * `datumfi_blueprint_draft_v1` from both stores.
 *
 * ⭐ THE RELOAD WAS NOT THE CULPRIT AND THAT IS THE WHOLE REASON THIS IS A GATE AND NOT A NOTE. The
 * Captain's own charitable reading was "reloading an unsaved page should revert it, that's what
 * you'd expect" — a completely reasonable story that happens to be wrong. The reload PRESERVED the
 * room; it was sitting in the draft key the whole time. The X deleted it.
 *   🔑 A PLAUSIBLE EXPLANATION IS THE MOST COMMON WAY A REAL DEFECT GETS DISMISSED. Only reading
 *      the function beat it, so the assertion below reads the STORE, never the screen.
 *
 * ── WHY THREE LEGS, AND WHY NO TWO OF THEM ARE SUFFICIENT ──────────────────────────────────────
 * ⛔ L2 ALONE IS SATISFIED BY DELETING THE HANDLER ENTIRELY. If `_closeBtn.addEventListener(...)`
 *    were removed, the X would do nothing at all — and "the draft survived an X click" would be
 *    GREEN over a button that no longer works. That is the standing question applied to this file:
 *    WOULD THIS GATE SURVIVE ITS OWN SUBJECT BEING DELETED? L1 is the answer — the X must actually
 *    dismiss. Only L1 ∧ L2 says "the X works AND it is not destructive."
 * ⛔ AND L2 IS ALSO SATISFIED IF REMOVAL IS SIMPLY BROKEN EVERYWHERE. A `_scratchReset()` that no
 *    longer deletes anything makes L2 green for a reason that has nothing to do with the X. L3 is
 *    the PRESENCE half of that exclusion: the same key, the same fixture, the OTHER control, and it
 *    must still be gone. EXCLUSION NEEDS PRESENCE, pointed at ourselves.
 * 🔑 So the contract is the CONJUNCTION: the X dismisses, the X preserves, and Scratch still
 *    discards. Each control below reddens EXACTLY ONE leg, which is how independence is shown.
 *
 * ⚠️ THE FIXTURE MUST CARRY WORK OR THIS GATE IS VACUOUS. `_startScratchFlow` only reaches its
 * destructive branch when there is something to destroy (`if (_scratchReset())`), so a clean
 * fixture takes the harmless path and BOTH legs pass over a page that never ran the defect. A
 * FIXTURE WITH NOTHING IN IT PROVES NOTHING ABOUT A DEFECT THAT ONLY TOUCHES SOMETHING.
 *
 * ⚠️ FIRST ENTRY IS THE STATE UNDER TEST, NOT RE-ENTRY. `_p8_studio_mechanics.js:250` already
 * covers the RE-OPENED X (via `.return-home`), and that path was always safe — which is precisely
 * how the unsafe one hid. The context here is deliberately clean of `datum_auth_hint` and
 * `datum_studio_overlay_seen` so the overlay opens as a first entry with `_reopened` false.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8436;          /* claimed 2026-08-24. ⛔ NEVER 8001 — that is the suite's shared server. */
const PART = 'studio.html';
const DRAFT = 'datumfi_blueprint_draft_v1';

/* ⛔ THE DISCARD IS JUDGED ON A SENTINEL, NOT ON THE DRAFT KEY, AND THAT IS DELIBERATE.
 * After START FROM SCRATCH the page RELOADS and the engine's debounced commit legitimately
 * REWRITES `datumfi_blueprint_draft_v1` with founder defaults — so "the key exists" is true
 * again within a second, for an entirely correct reason. Asserting its absence would make L3
 * a race against the engine. `datum_designed_ceil` is cleared by `_clearCarriedDesign()` and
 * NEVER rewritten by a cold boot, so it answers "was the carried work discarded?" and nothing
 * else. `_p8_studio_mechanics.js` learned this same lesson on the other side of the contract.
 *   🔑 PICK AN OBSERVABLE ONLY THE ACTION UNDER TEST CAN MOVE. */
const SENTINEL = 'datum_designed_ceil';
const SENTINEL_VAL = 'KEEPME-CEIL';

const X_FIXED  = "if (_closeBtn)     _closeBtn.addEventListener('click',     dismissOverlay);";
const X_BROKEN = "if (_closeBtn)     _closeBtn.addEventListener('click',     function() { if (_reopened) dismissOverlay(); else _startScratchFlow(); });";
const X_DEAD   = "if (_closeBtn)     _closeBtn.addEventListener('click',     function () {});";
const SCRATCH_IF        = 'if (_scratchReset()) {';
const SCRATCH_IF_NEUTER = 'if (false && _scratchReset()) {';

const argv = process.argv.slice(2);
const XDESTROYS    = argv.includes('--xdestroys');
const SCRATCHKEEPS = argv.includes('--scratchkeeps');
const XDEAD        = argv.includes('--xdead');
const ANY_POISON   = XDESTROYS || SCRATCHKEEPS || XDEAD;

/* ── THE DECLARATION — read by _gate_controls_still_red.mjs (B) and _gate_poison_anchors_resolve.mjs.
 *    `expect: 'red'` because these controls are NOT self-verifying: the poison is applied to the
 *    SERVED BYTES and this gate goes red on the named leg, so an external sweep judges it by the
 *    verdict. ⭐ `--xdestroys` RESTORES THE EXACT SHIPPED DEFECT rather than inventing a mutation —
 *    a control that reproduces the real bug proves the leg would have caught the real bug. */
const CONTROLS = {
  '--xdestroys': {
    what: 'restores the pre-fix ternary so a first-entry X runs _startScratchFlow() again',
    anchors: [{ file: PART, literal: X_FIXED, count: 1 }],
    reds: ['L2'],
    expect: 'red'
  },
  '--scratchkeeps': {
    what: 'short-circuits _scratchReset() so START FROM SCRATCH stops discarding',
    anchors: [{ file: PART, literal: SCRATCH_IF, count: 1 }],
    reds: ['L3'],
    expect: 'red'
  },
  /* ⭐ THIS CONTROL EXISTS TO PROVE L1 IS LOAD-BEARING, NOT TO CATCH A LIKELY BUG. It replaces the
   * handler with an empty function: the draft is then preserved for the WORST possible reason —
   * the button does nothing — and L2 goes GREEN over it. That is the amputation test made
   * executable rather than asserted in a comment.
   *   🔑 A COMMENT CLAIMING "THIS LEG WOULD PASS WITHOUT THAT LEG" IS A PREDICTION. This runs it. */
  '--xdead': {
    what: 'replaces the X handler with an empty function — the button stops working entirely',
    anchors: [{ file: PART, literal: X_FIXED, count: 1 }],
    reds: ['L1'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_overlay_x_preserves.js', controls: CONTROLS }));
  process.exit(0);
}

/* ── POISON, WITH A LANDING GUARD. A poison that silently fails to apply produces a GREEN run that
 *    proves nothing, so each anchor must match exactly once or the run ABORTS. */
const landed = [];
function poison(rel, body) {
  if (!ANY_POISON || rel !== PART) return body;
  if (XDESTROYS) {
    const n = body.split(X_FIXED).length - 1;
    if (n !== 1) { console.log(`ABORT: --xdestroys anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(X_FIXED).join(X_BROKEN);
    landed.push('x->scratchflow');
  }
  if (XDEAD) {
    const n = body.split(X_FIXED).length - 1;
    if (n !== 1) { console.log(`ABORT: --xdead anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(X_FIXED).join(X_DEAD);
    landed.push('x->dead');
  }
  if (SCRATCHKEEPS) {
    const n = body.split(SCRATCH_IF).length - 1;
    if (n !== 1) { console.log(`ABORT: --scratchkeeps anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(SCRATCH_IF).join(SCRATCH_IF_NEUTER);
    landed.push('scratchreset-shortcircuited');
  }
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) out = Buffer.from(poison(rel, out.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* One fresh context per click, because the fixture is CONSUMED by the action under test. */
async function runEntry(chromium, which) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  /* ⛔⛔ SEED EXACTLY ONCE — addInitScript RUNS ON EVERY NAVIGATION, AND SCRATCH NAVIGATES.
   * Measured 2026-08-24, first run of this gate: without this guard the reload driven by
   * `_navDrain('/studio.html')` RE-RAN the seeder and put the key back, so L3 read "still
   * present" and went RED over a product that had discarded it correctly. THE RIG WAS THE
   * DEFECT. 🔑 A FIXTURE THAT REBUILDS ITSELF AFTER THE ACTION UNDER TEST IS MEASURING THE
   * FIXTURE. sessionStorage survives a same-tab reload, which is what makes the latch work. */
  await ctx.addInitScript(`(() => { try {
    if (sessionStorage.getItem('__gate_x_seeded')) return;
    sessionStorage.setItem('__gate_x_seeded', '1');
    localStorage.setItem(${JSON.stringify(DRAFT)}, '{}');
    sessionStorage.setItem(${JSON.stringify(SENTINEL)}, ${JSON.stringify(SENTINEL_VAL)});
    sessionStorage.removeItem('datum_auth_hint');
    localStorage.removeItem('datum_studio_overlay_seen');
  } catch (e) {} })();`);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });

  const sel = which === 'x' ? '#studioCloseIntro' : '#studioStartScratch';
  await page.waitForSelector(sel, { state: 'visible', timeout: 9000 });
  const seeded = await page.evaluate(
    ([k, s]) => localStorage.getItem(k) != null && sessionStorage.getItem(s) != null, [DRAFT, SENTINEL]);
  await page.click(sel);

  /* SCRATCH may navigate (_navDrain) and X may not — settle on the STORE, never on a fixed sleep.
   * A fixed sleep is the flake species this suite has already named three times. */
  await page.waitForTimeout(300);
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForFunction(() => document.getElementById('studioOverlayWrap') !== null,
    null, { timeout: 9000 }).catch(() => {});

  const out = await page.evaluate(([k, s, v]) => {
    const w = document.getElementById('studioOverlayWrap');
    const shown = !!w && getComputedStyle(w).display !== 'none' && !w.classList.contains('dismissed');
    return {
      draftKept: localStorage.getItem(k) != null || sessionStorage.getItem(k) != null,
      sentinelKept: sessionStorage.getItem(s) === v,
      shown
    };
  }, [DRAFT, SENTINEL, SENTINEL_VAL]);
  await browser.close();
  return Object.assign(out, { seeded });
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

  console.log('[RUN] THE DISMISS CONTRACT  (X preserves · Start From Scratch discards)');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const x = await runEntry(chromium, 'x');
  const s = await runEntry(chromium, 'scratch');

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served part'); process.exit(1); }
  /* De-duplicated: `poison()` runs PER SERVE and the fixture loads studio.html several times, so a
   * raw list reads as several anchors rather than one anchor applied several times. */
  if (ANY_POISON) console.log(`   poison landed: ${[...new Set(landed)].join(', ')}  (${landed.length} serves)`);

  /* ── ANTI-VACUITY. If the fixture never carried work, the destructive branch was never reached
   *    and every leg below is describing a page that could not have failed. */
  if (!x.seeded || !s.seeded) {
    console.log(`ABORT: the fixture did not carry work (x.seeded=${x.seeded} scratch.seeded=${s.seeded}).`);
    console.log('       _startScratchFlow only discards when there IS something to discard, so both');
    console.log('       legs would pass over a page that never ran the defect. NOT a pass, NOT a red.');
    server.close();
    process.exit(2);
  }

  ok('L1', 'a first-entry X actually DISMISSES the overlay (not a dead button)',
    x.shown === false, `overlay shown after X = ${x.shown}`);

  ok('L2', 'a first-entry X PRESERVES the unsaved work (the defect)',
    x.draftKept === true && x.sentinelKept === true,
    `after X: draft=${x.draftKept} sentinel=${x.sentinelKept}`);

  ok('L3', 'START FROM SCRATCH still DISCARDS the carried work (the invariant)',
    s.sentinelKept === false, `after Scratch: sentinel=${s.sentinelKept} (draft=${s.draftKept}, rewrite expected)`);

  const total = pass + fail;
  if (ANY_POISON) {
    const expected = XDESTROYS ? ['L2'] : XDEAD ? ['L1'] : ['L3'];
    const actualRed = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actualRed.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);

  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.message) || e));
  console.log('SCORE 0/3 RED');
  process.exit(1);
});
