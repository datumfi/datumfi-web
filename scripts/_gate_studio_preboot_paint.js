/* @gate-pool: browser
 *
 * ══ THE PREBOOT PAINT CONTRACT — WHAT A HUMAN SEES BEFORE DOMContentLoaded ══════════════════════
 *
 * ⭐⭐ THIS IS THE FIRST GATE IN THE ESTATE THAT ASSERTS ANYTHING ABOUT THE INTERVAL BETWEEN FIRST
 * PAINT AND READY. Every other browser gate waits for `load` and then asserts, so that interval is
 * unobserved BY CONSTRUCTION — not because anyone forgot, but because the whole instrument family is
 * defined to start measuring after it ends. Two real, user-visible defects were found there in one
 * session while the suite stood at 236/0/0 over both.
 *
 * ── WHAT IT GUARDS, AND WHY BOTH HALVES ARE NEEDED ──────────────────────────────────────────────
 * scripts/studio-landing.js injects, AT PARSE TIME, a two-declaration style:
 *     .studio-layout:not([data-room]) .drafting-panel            { visibility:hidden  }
 *     .studio-layout:not([data-room]) .drafting-panel .s1-header { visibility:visible }
 * and `_studioLandingBoot()` sets `data-room` on DOMContentLoaded, releasing both.
 *
 * The FIRST declaration is old and correct: it stops the pre-landing vertical stack painting before
 * the landing drops over it — "show nothing" beats "show the wrong thing".
 * The SECOND is new (2026-08-23) and is the repair for what the first one COSTS: the panel is blank
 * for exactly (t_DCL - t_firstPaint), measured at 1843ms throttled, and the Captain saw it as
 * "solid blue, nothing there" after START FROM SCRATCH.
 *
 * ⛔⛔ THE TWO LEGS ARE A PAIR AND NEITHER IS SUFFICIENT ALONE. Delete the whole style block and the
 * header becomes visible too — so an "is the header visible?" leg PASSES over a page that has lost
 * its hiding rule entirely and shows the wrong thing again. That is EXCLUSION NEEDS PRESENCE pointed
 * at ourselves. L1 therefore asserts the panel IS hidden and L3 that the header IS NOT, and only the
 * conjunction describes the contract.
 *
 * ⭐ §19.2 — EVERY LEG READS getComputedStyle, NEVER A CLASS NAME OR A SOURCE STRING. A rule that is
 * present in the stylesheet and out-specified by another rule looks identical to one that works.
 * The question is what the pixel does, so the assertion reads what the pixel does.
 *
 * ── THE MEASUREMENT WINDOW IS MANUFACTURED ON PURPOSE ───────────────────────────────────────────
 * ⛔⛔ UNTHROTTLED ON LOCALHOST THIS GATE WOULD BE VACUOUS AND WOULD LOOK FINE. Measured 2026-08-23:
 * with no latency, first paint and DCL collapse into the same moment (blank window 1ms vs -6ms
 * across the two arms) and there is NO pre-DCL frame to sample. A defect that only exists when
 * loading takes time cannot be observed in a world where loading is instant.
 *   🔑 A PERF DEFECT MEASURED WITH NO LATENCY IS MEASURED IN A WORLD WHERE IT CANNOT EXIST.
 * So the gate throttles CPU 4x and adds 40ms RTT to OPEN the window it asserts in, and then REFUSES
 * TO SCORE if the window did not open: fewer than MIN_FRAMES pre-DCL samples is an ABORT at exit 2,
 * never a green. A GATE THAT CANNOT RUN IS NOT A PASS.
 *
 * ── LEGS ────────────────────────────────────────────────────────────────────────────────────────
 *  L1 · the drafting panel is HIDDEN in every pre-DCL frame in which it exists   (the old rule bites)
 *  L2 · `data-room` is set by the time DOMContentLoaded finishes                 (the release fires)
 *  L3 · the s1-header is VISIBLE in every pre-DCL frame in which it exists       (the new guarantee)
 *
 * ⚠️ L2 IS SAMPLED IN A MACROTASK AFTER DCL, NOT IN A DCL LISTENER. addInitScript runs before every
 * page script, so a listener registered here fires FIRST — before studio-landing.js's own DCL
 * listener has had the chance to set the attribute. Asserting there would read "not set yet" and be
 * red over a working page. `setTimeout(...,0)` from inside the DCL handler lands after every DCL
 * listener has run, which is what "by DCL" actually means.
 *
 * RED-FIRST CONTROLS — each names the legs it reds, and each reds a DIFFERENT one:
 *   --nopreboot  the hide declaration is flipped to `visible` in the served part -> L1 only
 *   --noheader   the reveal declaration is deleted from the served part          -> L3 only
 * ⛔ `--nopreboot` deliberately leaves L3 GREEN and `--noheader` leaves L1 GREEN. A control that
 * reds everything proves only that the gate can fail, never that a leg is wired to its own claim.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8435;          /* claimed 2026-08-23. ⛔ NEVER 8001 — that is the suite's shared server. */
const MIN_FRAMES = 3;       /* pre-DCL samples required before this gate is allowed to score at all */

const PART = 'scripts/studio-landing.js';
const HIDE_RULE = '.studio-layout:not([data-room]) .drafting-panel{visibility:hidden}';
const SHOW_RULE = '.studio-layout:not([data-room]) .drafting-panel .s1-header{visibility:visible}';
const HIDE_POISONED = '.studio-layout:not([data-room]) .drafting-panel{visibility:visible}';

const argv = process.argv.slice(2);
const NOPREBOOT = argv.includes('--nopreboot');
const NOHEADER  = argv.includes('--noheader');
const ANY_POISON = NOPREBOOT || NOHEADER;

/* ── THE DECLARATION — read by _gate_controls_still_red.mjs (B) and _gate_poison_anchors_resolve.mjs.
 *    `expect: 'red'` because these controls are NOT self-verifying: the poison is applied to the
 *    SERVED BYTES and this gate simply goes red on the named leg, so an external sweep can judge it
 *    by reading the verdict. The anchors are literals in the PART, which is where the poison lands. */
const CONTROLS = {
  '--nopreboot': {
    what: 'flips the preboot hide declaration to visibility:visible in the served part',
    anchors: [{ file: PART, literal: HIDE_RULE, count: 1 }],
    reds: ['L1'],
    expect: 'red'
  },
  '--noheader': {
    what: 'deletes the s1-header reveal declaration from the served part',
    anchors: [{ file: PART, literal: SHOW_RULE, count: 1 }],
    reds: ['L3'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_studio_preboot_paint.js', controls: CONTROLS }));
  process.exit(0);
}

/* ── POISON, WITH A LANDING GUARD. A poison that silently fails to apply produces a GREEN run that
 *    proves nothing, so each anchor must match exactly once or the run ABORTS. */
const landed = [];
function poison(rel, body) {
  if (!ANY_POISON || rel !== PART) return body;
  if (NOPREBOOT) {
    const n = body.split(HIDE_RULE).length - 1;
    if (n !== 1) { console.log(`ABORT: --nopreboot anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(HIDE_RULE).join(HIDE_POISONED);
    landed.push('hide-rule->visible');
  }
  if (NOHEADER) {
    const n = body.split(SHOW_RULE).length - 1;
    if (n !== 1) { console.log(`ABORT: --noheader anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(SHOW_RULE).join('');
    landed.push('show-rule-deleted');
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

/* Runs BEFORE any page script, on every navigation. Samples the pre-DCL window on rAF. */
const SAMPLER = () => {
  window.__pb = { dcl: null, roomAtDclEnd: null, frames: [] };
  document.addEventListener('DOMContentLoaded', function () {
    window.__pb.dcl = performance.now();
    /* macrotask: lands after EVERY DCL listener, which is what "set by DCL" means */
    setTimeout(function () {
      const lay = document.getElementById('studio-layout');
      window.__pb.roomAtDclEnd = lay ? lay.hasAttribute('data-room') : null;
    }, 0);
  });
  (function raf() {
    try {
      const lay = document.getElementById('studio-layout');
      const dp  = document.querySelector('.drafting-panel');
      const sh  = document.querySelector('.drafting-panel .s1-header');
      window.__pb.frames.push({
        t: performance.now(),
        room: lay ? lay.hasAttribute('data-room') : false,
        preboot: !!document.getElementById('sl-preboot'),
        dp: !!dp,
        dpVis: dp ? getComputedStyle(dp).visibility : null,
        sh: !!sh,
        shVis: sh ? getComputedStyle(sh).visibility : null
      });
    } catch (e) {}
    requestAnimationFrame(raf);
  })();
};

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(SAMPLER);
  const page = await ctx.newPage();
  await page.route('**/*', (r) => r.request().url().startsWith('http://127.0.0.1:') ? r.continue() : r.abort());

  console.log('[RUN] STUDIO PREBOOT PAINT CONTRACT  (what a human sees before DOMContentLoaded)');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  /* ⛔ THE WINDOW IS MANUFACTURED. Without this the gate is vacuous — see the header. */
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 40,
    downloadThroughput: 10 * 1024 * 1024 / 8,
    uploadThroughput: 3 * 1024 * 1024 / 8
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const d = await page.evaluate(() => ({
    dcl: window.__pb.dcl, roomAtDclEnd: window.__pb.roomAtDclEnd, frames: window.__pb.frames
  }));

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served part'); process.exit(1); }
  if (ANY_POISON) console.log('   poison landed: ' + landed.join(', '));

  const pre = d.frames.filter((f) => d.dcl != null && f.t < d.dcl);
  const preDp = pre.filter((f) => f.dp);
  const preSh = pre.filter((f) => f.sh);

  /* ── ANTI-VACUITY. Scoring without a window would print a green that means "I never looked". ── */
  console.log(`   frames=${d.frames.length}  pre-DCL=${pre.length}  (with panel ${preDp.length}, with header ${preSh.length})  dcl=${Math.round(d.dcl)}ms`);
  if (preDp.length < MIN_FRAMES || preSh.length < MIN_FRAMES) {
    console.log(`ABORT: the pre-DCL window did not open — need >=${MIN_FRAMES} sampled frames with the panel AND the header present.`);
    console.log('       Throttling failed or the page got faster than the sampler. NOT a pass, NOT a red: this gate could not run.');
    await browser.close(); server.close();
    process.exit(2);
  }

  const dpVisible = preDp.filter((f) => f.dpVis !== 'hidden');
  ok('L1', 'the drafting panel is HIDDEN in every pre-DCL frame',
    dpVisible.length === 0,
    `${preDp.length} pre-DCL frames with the panel, ${dpVisible.length} not hidden` +
    (dpVisible.length ? ` (first at ${Math.round(dpVisible[0].t)}ms = ${dpVisible[0].dpVis})` : ''));

  ok('L2', 'data-room is set by the time DOMContentLoaded finishes',
    d.roomAtDclEnd === true,
    `roomAtDclEnd=${d.roomAtDclEnd}`);

  const shHidden = preSh.filter((f) => f.shVis !== 'visible');
  ok('L3', 'the s1-header is VISIBLE in every pre-DCL frame (the new guarantee)',
    shHidden.length === 0,
    `${preSh.length} pre-DCL frames with the header, ${shHidden.length} not visible` +
    (shHidden.length ? ` (first at ${Math.round(shHidden[0].t)}ms = ${shHidden[0].shVis})` : ''));

  const total = pass + fail;
  if (ANY_POISON) {
    const expected = NOPREBOOT ? ['L1'] : ['L3'];
    const actualRed = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actualRed.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);

  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.message) || e));
  console.log('SCORE 0/3 RED');
  process.exit(1);
});
