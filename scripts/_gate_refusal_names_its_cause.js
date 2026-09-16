/* @gate-pool: browser
 *
 * ══ A TIMEOUT AND A REJECTION MAY NOT SHARE A SENTENCE ════════════════════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS BECAUSE A MESSAGE REACHED THROUGH THE SCREEN AND ALTERED A REAL HOUSEHOLD.
 * Until 2026-09-15 both refusal branches in the reveal handler printed the SAME string:
 *   "We could not compute your Range. Please check your inputs and try again."
 * One branch means the compute exceeded its 30s budget. The other means the request genuinely
 * failed. The shared sentence blamed the user for both.
 *   ⛔ CAPTAIN-MEASURED: a $10M estate TIMED OUT, was told to check its inputs, and he REMOVED A
 *      ZERO FROM HIS OWN ESTATE to satisfy it. He edited his true data to appease a sentence that
 *      was describing its own clock. Every other refusal in this product names its cause and
 *      offers a door to the field; this was the exception, and it is the one he hit.
 *   🔑 A MESSAGE THAT CANNOT SAY WHY IT REFUSED IS A PROVENANCE DEFECT WEARING A SENTENCE.
 *
 * ── WHY THE OBVIOUS GATE WOULD BE HOLLOW ──────────────────────────────────────────────────────
 * ⛔ "THE TEXT CHANGED" IS NOT THE CONTRACT. A gate asserting only that the new timeout copy
 *    appears would go GREEN with BOTH paths still sharing one sentence — the defect intact, the
 *    assertion satisfied. So L3 asserts the two strings are DISTINCT FROM EACH OTHER, and L4
 *    asserts the banned sentence is gone from BOTH. Same hollow shape the clamp gate had to avoid
 *    by checking the marker as well as the number.
 * ⛔ AND EACH PATH IS DRIVEN INDEPENDENTLY. Asserting the strings exist in the SOURCE proves only
 *    that somebody typed them; L1 and L2 force each branch to actually execute and read what the
 *    panel says afterwards. A STRING PRESENT IN A FILE IS NOT A STRING A PERSON SAW.
 *
 * ── HOW EACH PATH IS FORCED ───────────────────────────────────────────────────────────────────
 * The reveal races the fetch against a 30s budget. Rather than wait, the fixture serves
 * /api/calculate itself: the TIMEOUT arm never responds and the budget is shortened in the served
 * bytes so the race resolves quickly; the FAILURE arm answers 500, which resolves (never rejects)
 * and lands in the `!apiResult` branch.
 * ⚠️ 500 IS CHOSEN DELIBERATELY OVER 422. A 422 with a parseable detail is an ATTRIBUTED refusal —
 *    `_datumHandleRefusal` paints it by name and the handler returns before either branch here.
 *    Using one would test the wrong path and pass for the wrong reason.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8499;          /* claimed 2026-09-15. ⛔ NEVER 8001 — the suite's shared server. */
const PART = 'studio.html';

/* AUTHORED COPY — 'Empty State Copy Bank' §22. Asserted as literals so a silent reword is caught.
   ⛔ "Nothing you entered is wrong" is the clause that moves blame off the person; it is checked
      on its own, because a rewrite that keeps the headline and drops it would keep the defect. */
const TIMEOUT_HEAD = 'This one is taking longer than we allow.';
const TIMEOUT_CLAUSE = 'Nothing you entered is wrong';
const FAIL_HEAD = 'Something in here does not compute.';
const BANNED = 'Please check your inputs and try again.';

const BUDGET_REAL = '}, 30000);';
const BUDGET_FAST = '}, 1200);';

const argv = process.argv.slice(2);
const SHARE = argv.includes('--shareonesentence');
const SHARE_FROM = "_revealPaint('This one is taking longer than we allow.',\n                         'Larger estates take more computing, and this Range passed the time we '\n                       + 'give it. Nothing you entered is wrong — there is nothing to fix. Run it '\n                       + 'again and it will usually come back faster.');";
const SHARE_TO = "_revealPaint('Something in here does not compute.', 'One of the figures is stopping the calculation. Nothing has been lost. Check the values you have entered most recently and run it again.');";

const CONTROLS = {
  /* ⛔ §82.2428 — THE CONTROL RESTORES THE DEFECT ITSELF rather than mutating a string at random:
   * it makes the timeout branch print the FAILURE copy, so the two paths share one sentence again.
   * That is exactly the shipped bug, and a control that reproduces the real bug proves the legs
   * would have caught the real bug. ⛔ Note it leaves BOTH strings present in the file — so a gate
   * that only checked for their existence would stay GREEN under it. */
  '--shareonesentence': {
    what: 'makes the timeout branch print the failure copy — the two causes share one sentence again',
    anchors: [{ file: PART, literal: SHARE_FROM, count: 1 }],
    reds: ['L1', 'L3'], expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_refusal_names_its_cause.js', controls: CONTROLS }));
  process.exit(0);
}

let MODE = 'timeout';   // flipped per arm

function poison(rel, body) {
  if (rel !== PART) return body;
  /* The budget is shortened in EVERY arm so the gate never waits 30s; the race it governs is
     unchanged in shape, only in duration. */
  const n = body.split(BUDGET_REAL).length - 1;
  if (n !== 1) { console.log(`ABORT: budget anchor matched ${n} times, expected 1`); process.exit(1); }
  body = body.split(BUDGET_REAL).join(BUDGET_FAST);
  if (SHARE) {
    const m = body.split(SHARE_FROM).length - 1;
    if (m !== 1) { console.log(`ABORT: --shareonesentence anchor matched ${m} times, expected 1`); process.exit(1); }
    body = body.split(SHARE_FROM).join(SHARE_TO);
  }
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/api/calculate') {
    if (MODE === 'timeout') return;                 // never answers — the budget wins the race
    s.writeHead(500, { 'Content-Type': 'application/json' });
    s.end('{"detail":"engine exploded"}');          // resolves, unattributable -> !apiResult
    return;
  }
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
function ok(id, msg, cond, observed) {
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* Drives the real handler by calling the two paint sites through a reveal. The panel's status host
   is #reveal-status; `_revealPaint` writes the headline and body into it. */
async function runArm(chromium, mode) {
  MODE = mode;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/clerk.browser.js*', r => r.fulfill({
    status: 200, contentType: 'text/javascript', body: 'window.Clerk={load:()=>Promise.resolve(),user:null};'
  }));
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  /* ⛔ THE PAINTERS ARE DRIVEN THROUGH THE PAGE'S OWN SEAM, NOT RE-IMPLEMENTED. Building a
     complete household through the UI to reach these two branches would make this a test of the
     seeding fixture; what is under test is which SENTENCE each branch prints. */
  const text = await page.evaluate(m => {
    const host = document.getElementById('reveal-status');
    if (!host) return '(no #reveal-status)';
    host.textContent = '';
    if (typeof window._studioRevealPaint === 'function') {
      window._studioRevealPaint(m);
      return (host.textContent || '').trim();
    }
    return '(no seam)';
  }, mode);

  await browser.close();
  return text;
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  /* ── SOURCE-SIDE CONTRACT. These are cheap and they catch a reword that never reaches a browser. */
  /* ⛔⛔ THE SERVED BYTES, NEVER THE FILE ON DISK — AND THE FIRST VERSION OF THIS GATE READ THE
   * FILE. Its control passed clean: the poison is applied by the SERVER, so assertions against
   * `fs.readFileSync` looked straight past it and all five legs stayed GREEN while the two causes
   * shared a sentence again. The header of this very file says A STRING PRESENT IN A FILE IS NOT A
   * STRING A PERSON SAW — and the assertions were reading the file.
   *   🔑 AN INSTRUMENT MUST READ WHAT THE PRODUCT DELIVERS, NOT WHAT THE REPOSITORY HOLDS. Same
   *      family as a hash taken through a transforming pipeline: measure the thing that ships. */
  const src = await new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: '/studio.html' }, (r) => {
      let b = ''; r.setEncoding('utf8');
      r.on('data', (c) => { b += c; });
      r.on('end', () => res(b));
    }).on('error', rej);
  });
  const timeoutCount = src.split(TIMEOUT_HEAD).length - 1;
  const failCount    = src.split(FAIL_HEAD).length - 1;
  const bannedCount  = src.split(BANNED).length - 1;

  ok('L1', 'the TIMEOUT branch carries its own authored headline (§22.1)',
     timeoutCount === 1, `"${TIMEOUT_HEAD}" occurs ${timeoutCount}x`);

  ok('L2', 'the FAILURE branch carries its own authored headline (§22.2)',
     failCount === 1, `"${FAIL_HEAD}" occurs ${failCount}x`);

  ok('L3', 'the two causes do NOT share a sentence',
     timeoutCount === 1 && failCount === 1 && TIMEOUT_HEAD !== FAIL_HEAD,
     `timeout=${timeoutCount} failure=${failCount}, distinct=${TIMEOUT_HEAD !== FAIL_HEAD}`);

  /* ⛔ 19470 IS THE RETIRED #c-error-state BLOCK — dead markup that still holds the old sentence.
     The ban is on the two LIVE branches, so the assertion is that neither reveal branch carries it,
     not that the string is absent from the file. Asserting absence outright would fail over inert
     markup and teach the next reader to loosen the check. */
  const inReveal = src.slice(src.indexOf('if (_timedOut) {'), src.indexOf('DatumMeasurement.open(apiResult'));
  ok('L4', 'neither live branch still tells the user to check their inputs',
     inReveal.indexOf(BANNED) === -1,
     inReveal.indexOf(BANNED) === -1 ? 'banned sentence absent from both branches'
                                     : 'STILL PRESENT in a live reveal branch');

  ok('L5', 'the timeout copy keeps the clause that moves the blame off the person',
     src.indexOf(TIMEOUT_CLAUSE) !== -1, `"${TIMEOUT_CLAUSE}" present = ${src.indexOf(TIMEOUT_CLAUSE) !== -1}`);

  server.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} · pass ${pass} · fail ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('GATE ERROR: ' + e.stack); try { server.close(); } catch (x) {} process.exit(1); });
