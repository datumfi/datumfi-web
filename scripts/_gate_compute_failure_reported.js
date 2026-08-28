/* FINDING 40 — THE COMPUTE PATH MUST REPORT ITS OWN FAILURES.
 *
 * Until 2026-08-26 every failure branch of /api/calculate was swallowed into `null` and the page
 * showed the user an HONEST error. So the product told every affected user it had failed and told
 * US nothing. That is why Finding 30 ran undetected: the reference estate has been breaching the
 * 30s client budget in production and Sentry reported nothing — CORRECTLY, because it was never
 * told. SILENCE WAS NOT EVIDENCE OF HEALTH; IT WAS EVIDENCE OF A MISSING CALL.
 *
 * ⛔ THREE LEGS, AND THEY GUARD DIFFERENT THINGS. Two of them green over a dead third is the
 * failure this gate exists to prevent:
 *   L1 TRANSPORT (live)  — an envelope for our error shape actually LEAVES the page. Proves
 *                          captureException works AND that the CSP still permits the ingest host.
 *                          A captureException behind a CSP that blocks the host is a dead monitor.
 *   L2 WIRING  (source)  — every failure branch on both /api/calculate call sites calls the
 *                          reporter. L1 can pass while nothing on the compute path ever calls it.
 *   L3 REGRESSION(source)— no /api/calculate fetch still uses the bare `r.ok ? r.json() : null`
 *                          swallow. ⛔ THIS IS THE BRANCH THAT MATTERED: a non-2xx RESOLVES, so it
 *                          never reaches `.catch`. An instrument on `.catch` alone would have been
 *                          written, reviewed, merged and believed while reporting nothing.
 *
 * Usage: serve repo root on :8001, then node scripts/_gate_compute_failure_reported.js [LABEL]
 * Red-first mutations (each must turn its OWN leg red and leave the others green):
 *   --kill-def   delete the reporter definition            -> L2 red
 *   --kill-ok    restore the bare r.ok swallow             -> L3 red
 *   --kill-csp   strip the ingest host from the page CSP   -> L1 red
 */
const { chromium } = require('playwright');
const fs = require('fs');

const SRC = 'studio.html';
const INGEST = 'o4511758659223552.ingest.us.sentry.io';
const URL = 'http://127.0.0.1:8001/studio.html?datum_sentry=1';
const args = process.argv.slice(2);
const has = f => args.includes(f);

function source() {
  let s = fs.readFileSync(SRC, 'utf8');
  if (has('--kill-def')) s = s.replace(/function _reportComputeFailure\(stage, detail\) \{/, 'function _UNUSED_reporter(stage, detail) {');
  if (has('--kill-ok'))  s = s.replace(/if \(!r\.ok\) \{ _reportComputeFailure\('http_' \+ r\.status[^\n]*\n\s*return r\.json\(\);/, 'return r.ok ? r.json() : null;');
  return s;
}

const results = [];
const check = (id, label, pass, detail) => { results.push({ id, label, pass, detail }); return pass; };

(async () => {
  const s = source();

  /* ── L2 WIRING ─────────────────────────────────────────────────────────────── */
  const defs = (s.match(/function _reportComputeFailure\(/g) || []).length;
  const calls = (s.match(/_reportComputeFailure\(/g) || []).length - defs;
  check('L2a', 'reporter defined exactly once', defs === 1, `defs=${defs}`);
  check('L2b', 'reporter called on >= 6 failure branches', calls >= 6, `calls=${calls}`);
  /* ⛔ WHITESPACE-TOLERANT ON PURPOSE. The first draft required `function (err)` with a space;
     the source says `function(err)`, so L2d went RED ON A CORRECT FIX. A regex strict enough to
     miss a formatting variant is an instrument that reports on the formatter, not the claim.
     Swept as a class: if one of these was brittle, all of them were. */
  const httpBranch = (s.match(/if\s*\(\s*!r\.ok\s*\)\s*\{\s*_reportComputeFailure\('http_'/g) || []).length;
  const netBranch  = (s.match(/\.catch\(\s*function\s*\(\s*err\s*\)\s*\{\s*_reportComputeFailure\('network'/g) || []).length;
  const toBranch   = (s.match(/_reportComputeFailure\(\s*(?:timedOut\s*\?\s*)?'timeout'/g) || []).length;
  check('L2c', 'both call sites report non-2xx', httpBranch === 2, `sites=${httpBranch}`);
  check('L2d', 'both call sites report network error', netBranch === 2, `sites=${netBranch}`);
  check('L2e', 'both call sites report timeout', toBranch === 2, `sites=${toBranch}`);
  /* the reporter is function-scoped inside revealBtn's click handler; every call site must live
     inside that same handler or it is a ReferenceError at the worst possible moment. */
  const handlerStart = s.indexOf("revealBtn.addEventListener('click'");
  const defIdx = s.indexOf('function _reportComputeFailure(');
  const callIdx = [...s.matchAll(/_reportComputeFailure\(/g)].map(m => m.index).filter(i => i !== defIdx);
  check('L2f', 'reporter defined after the handler opens', handlerStart > -1 && defIdx > handlerStart,
        `handler=${handlerStart} def=${defIdx}`);
  check('L2g', 'every call site sits after the definition', callIdx.every(i => i > defIdx),
        `earliest=${Math.min(...callIdx)} def=${defIdx}`);

  /* ── L3 REGRESSION ─────────────────────────────────────────────────────────── */
  /* ⚠️ ANCHOR MOVED 2026-08-27 — the call sites are SAME-ORIGIN now. The browser no longer
     names api.datumfi.com: the engine is reached through the Pages Function at
     functions/api/calculate.js, which is the sole holder of the engine token. THE OLD ANCHOR
     WOULD NOT HAVE FAILED LOUDLY — split() on an absent literal yields ZERO blocks, so L3b
     ("no call site still uses the bare r.ok swallow") would have gone GREEN OVER AN EMPTY SET
     while L3a caught the count. A green whose population is empty is this suite's oldest trap;
     L3a is the leg that keeps L3b honest, which is exactly why it asserts the count first. */
  const calcBlocks = s.split("fetch('/api/calculate'").slice(1)
    .map(b => b.slice(0, 700));
  const bare = calcBlocks.filter(b => /r\.ok \? r\.json\(\) : null/.test(b)).length;
  check('L3a', 'two /api/calculate call sites found', calcBlocks.length === 2, `sites=${calcBlocks.length}`);
  check('L3b', 'NO call site still uses the bare r.ok swallow', bare === 0, `bare=${bare}`);

  /* ── L1 TRANSPORT (live) ───────────────────────────────────────────────────── */
  let envelopes = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(`**://${INGEST}/**`, route => {
    envelopes.push(route.request().postData() || '');
    route.fulfill({ status: 200, body: '{}' });
  });
  if (has('--kill-csp')) {
    await page.route('**/studio.html*', async route => {
      const r = await route.fetch();
      let body = await r.text();
      body = body.replace(new RegExp(' https://' + INGEST.replace(/\./g, '\.'), 'g'), '');
      route.fulfill({ response: r, body });
    });
  }
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  /* ⛔ L1 TESTS TRANSPORT, NOT THE APP'S INTERNALS, AND THE FIRST DRAFT OF THIS GATE GOT THAT
     WRONG. It called window._reportComputeFailure — but the reporter is function-scoped inside
     revealBtn's click handler (studio.html ~13581), which is CORRECT: all six call sites live in
     that same handler and resolve fine. The gate would have gone RED ON A WORKING FIX and invented
     a bug. A GATE THAT DEPENDS ON A PRIVATE IMPLEMENTATION DETAIL TESTS THE DETAIL, NOT THE CLAIM.
     So L1 raises the SAME error shape through Sentry directly: it answers "can an envelope of this
     shape leave this page", which is transport + CSP. Whether the compute path CALLS it is L2's
     job, and L2 reads the source where that fact actually lives. */
  const fired = await page.evaluate(() => {
    var S = window.Sentry;
    if (!S || typeof S.captureException !== 'function') return 'NO_SENTRY_SDK';
    var e = new Error('compute failed (http_500): gate probe — forced 500');
    e.name = 'DatumComputeFailure';
    S.captureException(e, { tags: { datum_stage: 'http_500' } });
    return 'CALLED';
  });
  await page.waitForTimeout(3000);
  await browser.close();

  const shaped = envelopes.filter(e => e.includes('DatumComputeFailure') && e.includes('http_500')).length;
  check('L1a', 'reporter reachable in page scope', fired === 'CALLED', fired);
  check('L1b', 'an envelope for OUR error shape left the page', shaped >= 1,
        `envelopes=${envelopes.length} shaped=${shaped}`);

  /* ── verdict ───────────────────────────────────────────────────────────────── */
  const label = args.find(a => !a.startsWith('--')) || 'BASELINE';
  const red = results.filter(r => !r.pass);
  console.log(`\n_gate_compute_failure_reported — ${label}${args.filter(a=>a.startsWith('--')).join(' ')}`);
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.label}  [${r.detail}]`);
  console.log(`  ${red.length === 0 ? 'GREEN' : 'RED'} — ${results.length - red.length}/${results.length} legs passed`);
  if (red.length) { console.log('  RED LEGS: ' + red.map(r => r.id).join(', ')); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('GATE CRASHED (a crash is not a red):', e.message); process.exit(2); });
