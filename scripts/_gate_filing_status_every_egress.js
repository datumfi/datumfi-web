'use strict';
/* ⛔⛔ FILING STATUS AT EVERY EGRESS TO THE ENGINE — AND EVERY OPTION MAPS (§82.1893).
 *
 * ⛔ RENAMED 2026-09-06 FROM `_gate_filing_status_reaches_engine` (§82.1969). The old name was a
 *   claim about THE ENGINE; the instrument was a measurement of ONE BUTTON. It ran 17/17 GREEN
 *   while an unanswered household was POSTing to /api/ss-matrix/start with the key absent, and
 *   the name is what everyone downstream believed. A GATE NAMES THE SURFACE IT CERTIFIES, NEVER
 *   THE CAPABILITY IT IMPLIES — and this name is only earned because L7 and L9 now exist.
 *
 * WHY THIS EXISTS. The Studio collected filing status, stored it, restored it across reloads, and
 * NEVER SENT IT. engine/tax.py bound married-filing-jointly brackets, standard deduction and
 * capital-gains threshold as module constants, so every household was taxed as a married couple.
 * MEASURED end to end on a $3M traditional estate: MFJ keystone $146,000 vs SINGLE $139,000 —
 * $7,000/yr over 28 years, ~$196,000 of spending the Range promised and the portfolio cannot pay.
 *
 * ⭐ L2 IS THE LEG THAT EARNS ITS KEEP, AND IT IS DERIVED FROM THE DOM. Every non-placeholder
 *    option in the live <select> must resolve to an engine enum. Add a sixth status tomorrow
 *    without a map entry and this REDS — rather than that option silently sending nothing and
 *    falling through to the engine's mfj default, which is the exact defect this gate closes.
 *    A gate that checks a HAND-WRITTEN list of five would pass over the sixth forever.
 *
 * ⚠️ THE OPTION LABELS ARE LOAD-BEARING DATA, NOT COPY. The options carry no `value` attribute, so
 *    their value IS their visible text, and the codec stores that text positionally in a saved
 *    blueprint. Re-word one and every blueprint holding the old string stops mapping. This gate
 *    reds on a rename for that reason — that is correct, not a nuisance. Renames need a codec
 *    migration; additions do not.
 *
 * ⛔ L4 IS THE FORBIDDEN-THIRD-THING LEG. An unanswered select must send NO KEY AT ALL. Not "mfj",
 *    not "". Blank on screen with married-filing-jointly in the maths is the shape this whole arc
 *    exists to remove, and it is the one an over-helpful edit would reintroduce.
 *
 * LEGS
 *   L7 EGRESS CENSUS  the set of /api/ literals reached by fetch( is DECLARED — §82.1968
 *                     mechanised. A new door reds and a human rules on it (§82.1970: a law in a
 *                     comment is not a guard; where it can be mechanised it must be).
 *   L9 SECOND DOOR    a: an ANSWERED household reaches Claiming Paths carrying its enum
 *                     (EXISTENCE — L9b passes trivially if the door cannot POST at all, which is
 *                     exactly what the first rig did, silently, on an empty SS benefit trio).
 *                     b: an UNANSWERED household does NOT reach it. Pre-fix this POSTed.
 *   L1 POPULATION   the select exists and carries at least five answerable options.
 *   L2 MAP COMPLETE every answerable option resolves to an engine enum (derived, not listed).
 *   L3 REACHES      each option puts its enum into the payload _buildStudioRequest() sends.
 *   L4 UNANSWERED   the placeholder sends NO filing_status key.
 *   L5 CONTROL      more than one distinct enum was observed — a dead wire cannot pass.
 *
 * MUTATION (mutates the SUBJECT, served to the browser)
 *   --unguarded empties the queue consult in buildMatrixRequest in the served bytes — the EXACT
 *               pre-fix defect. Expect L9b RED and L9a GREEN. Disjoint from --unmapped's red set,
 *               which is the signature of two controls rather than one wearing two names.
 *   --unmapped  deletes one entry from FILING_STATUS_MAP in the served bytes. Expect L2 RED and
 *               exactly one L3 RED; L1/L4/L5 stay green. Narrow on purpose: a control that reds
 *               five legs cannot tell you which one it proved.
 *
 * ⛔ READS studio.html OFF DISK TO SERVE MUTATED BYTES — declared in _gate_studio_source's
 *    SERVING_EXEMPT, with the literal kept ON the read line so the census can SEE it.
 *
 * Run: node scripts/_gate_filing_status_every_egress.js        (exit 0 = GREEN)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8238;
const UNMAPPED  = process.argv.includes('--unmapped');
const UNGUARDED = process.argv.includes('--unguarded');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

let SERVE_HTML = null;
if (UNMAPPED || UNGUARDED) {
  SERVE_HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
}
if (UNMAPPED) {
  const A = "          'Head of Household':           'hoh',\n";
  const n = SERVE_HTML.split(A).length - 1;
  if (n !== 1) { console.log('ABORT — --unmapped anchor matched ' + n + 'x, expected 1.'); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(A, '');
}
if (UNGUARDED) {
  /* Reproduces the EXACT pre-fix defect measured 2026-09-06 — the matrix door reading a truthy
     payload as proof the household is answerable. Emptying the array leaves the branch present
     but never taken, so ONLY the consult dies: L9b reds, L9a stays green. A control that reds
     both legs cannot tell you which one it proved. */
  const B = '      var _queued = window._buildRequestErrors || [];';
  const m = SERVE_HTML.split(B).length - 1;
  if (m !== 1) { console.log('ABORT — --unguarded anchor matched ' + m + 'x, expected 1.'); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(B, '      var _queued = [];');
}

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (SERVE_HTML && p === '/studio.html') { s.writeHead(200, { 'content-type': MIME['.html'] }); return s.end(SERVE_HTML); }
  fs.readFile(path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, '')), (e, b) => {
    if (e) { s.writeHead(404).end(); return; }
    s.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }); s.end(b);
  });
});

const ENGINE_ENUMS = ['single', 'mfj', 'mfs', 'hoh', 'qss'];
let fails = 0; const out = []; const POSTS = [];
const ok = (l, c, o) => { const g = !!c; if (!g) fails++;
  out.push((g ? 'PASS  ' : 'FAIL  ') + l + (o !== undefined ? '   [' + o + ']' : '')); };

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1250 } });
  await c.addInitScript("window.Clerk={load:()=>Promise.resolve(),user:{unsafeMetadata:{}},addListener:()=>{}};");
  await c.route('**/*', r => { const rq = r.request(), u = rq.url();
    if (/\/api\//.test(u)) {
      if (rq.method() === 'POST') { let d = null; try { d = rq.postData(); } catch (e) {}
        POSTS.push({ url: u, body: d }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"job_id":"gate"}' }); }
    if (!/127\.0\.0\.1/.test(u) && /clerk|posthog|sentry/i.test(u)) return r.abort();
    return r.continue(); });
  const P = await c.newPage();
  await P.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await P.waitForTimeout(1700);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1200 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(800);

  /* The payload only builds once the date gates pass — seed them, or every leg below would be
     measuring a null payload rather than the field under test. */
  await P.evaluate(async () => {
    const set = (id, v) => { const e = document.getElementById(id); if (!e) return;
      e.value = v; ['input','change','blur'].forEach(ev => e.dispatchEvent(new Event(ev, { bubbles: true }))); };
    set('pri-dob', '05/1975'); set('target-ret', '06/2040');
    await new Promise(r => setTimeout(r, 900));
  });
  const built = await P.evaluate(() => { try { return !!window._buildStudioRequest(); } catch (e) { return false; } });
  if (!built) { console.log('⛔ MISSING PRECONDITION — the payload will not build; every leg would measure nothing.');
    console.log('OVERALL: MISSING PRECONDITION   (0 legs evaluated)'); await b.close(); srv.close(); process.exit(2); }

  /* ── L1 POPULATION — derived from the live control ─────────────────────────────────────────── */
  const opts = await P.evaluate(() => { const s = document.getElementById('filing-status');
    return s ? Array.prototype.map.call(s.options, o => ({ value: o.value, label: o.text })) : null; });
  ok('L1a the filing-status select exists', !!opts, opts ? opts.length + ' options' : 'ABSENT');
  if (!opts) { console.log(out.join('\n')); console.log('\nOVERALL: RED   (0 pass / 1 fail)'); await b.close(); srv.close(); process.exit(1); }
  const answerable = opts.filter(o => String(o.value).trim() !== '');
  ok('L1b at least five answerable statuses are offered', answerable.length >= 5,
     answerable.length + ': ' + answerable.map(o => o.label).join(' | '));

  /* ── L2 + L3 — every answerable option maps AND reaches the payload ────────────────────────── */
  const seen = [];
  for (const o of answerable) {
    const got = await P.evaluate(async (val) => {
      const el = document.getElementById('filing-status');
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 260));
      let pay = null; try { pay = window._buildStudioRequest(); } catch (e) { return { err: String(e) }; }
      return { sent: Object.prototype.hasOwnProperty.call(pay || {}, 'filing_status'),
               value: (pay || {}).filing_status, took: el.value === val };
    }, o.value);
    ok('L2 "' + o.label + '" maps to an engine enum',
       !!got.value && ENGINE_ENUMS.indexOf(got.value) !== -1,
       'sent=' + got.sent + ' value=' + JSON.stringify(got.value));
    ok('L3 "' + o.label + '" reaches the payload (and the probe took)',
       got.took === true && got.sent === true, 'assignment took=' + got.took + ' key present=' + got.sent);
    if (got.value) seen.push(got.value);
  }

  /* ── L4 UNANSWERED — no key at all ─────────────────────────────────────────────────────────── */
  const blank = await P.evaluate(async () => {
    const el = document.getElementById('filing-status');
    el.value = ''; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    let pay = null; try { pay = window._buildStudioRequest(); } catch (e) { return { err: String(e) }; }
    return { has: Object.prototype.hasOwnProperty.call(pay || {}, 'filing_status'), value: (pay || {}).filing_status };
  });
  ok('L4 an unanswered select sends NO filing_status key (never "mfj", never "")',
     blank.has === false, 'key present=' + blank.has + ' value=' + JSON.stringify(blank.value));

  /* ── L6 REQUIRED — the blank case is REFUSED, not defaulted ────────────────────────────────────
     §82.1893: a field joins the required list in the SAME COMMIT that wires it. Without this leg
     the browser sends no key and the ENGINE quietly defaults to mfj — blank on screen, married in
     the maths, which is the forbidden third thing this whole arc exists to remove.
     ⚠️ L6b IS NOT DECORATION. The refusal is pushed onto `_errs` AFTER that array has already been
        assigned to window._buildRequestErrors, so it only works because both names point at the
        SAME array object. That is subtle enough to be broken by a well-meaning tidy-up, so the
        gate asserts the reason reaches the queue rather than trusting the reference. */
  const req = await P.evaluate(async () => {
    const el = document.getElementById('filing-status');
    el.value = ''; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 260));
    try { window._buildStudioRequest(); } catch (e) { return { err: String(e) }; }
    const errs = window._buildRequestErrors || [];
    const mine = errs.filter(e => e && e.target === 'filing-status');
    return { total: errs.length, mine: mine.length,
             message: mine[0] ? mine[0].message : null, field: mine[0] ? mine[0].field : null };
  });
  ok('L6a an unanswered filing status RAISES a refusal reason', req.mine === 1,
     'filing-status reasons=' + req.mine + ' of ' + req.total + ' total');
  ok('L6b the refusal carries the authored string and a door target',
     !!req.message && req.message.length > 20 && req.field === 'Filing Status',
     'field=' + JSON.stringify(req.field) + ' message=' + JSON.stringify(req.message));

  const answered = await P.evaluate(async () => {
    const el = document.getElementById('filing-status');
    const first = Array.prototype.find.call(el.options, o => String(o.value).trim() !== '');
    el.value = first.value; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 260));
    try { window._buildStudioRequest(); } catch (e) { return { err: String(e) }; }
    return { mine: (window._buildRequestErrors || []).filter(e => e && e.target === 'filing-status').length };
  });
  ok('L6c ANSWERING it clears the refusal (the leg is reachable in both directions)',
     answered.mine === 0, 'filing-status reasons after answering=' + answered.mine);

  /* ── L7 EGRESS CENSUS — §82.1968 MECHANISED, NOT WRITTEN IN A COMMENT ───────────────
     ⛔ THE ENUMERATION OF EGRESSES IS PART OF THE WORK. The filing-status refusal was wired where
        the requirement was AUTHORED (the REVEAL button) and not everywhere the engine is REACHED.
        Nothing could see that, because nobody had ever written down how many doors there are.
     ⚠️ THIS IS A CENSUS, SO IT IS A CLAIM ABOUT ITS MATCHER, NOT ABOUT THE WORLD. It sees
        `/api/...` STRING LITERALS on a line that calls fetch(. A path assembled in a variable is
        INVISIBLE to it — the same blind spot _gate_studio_source documents for its own census. It
        does not prove there are only two doors; it proves NO NEW LITERAL DOOR APPEARED UNNOTICED.
     🔑 A control that forces a decision beats one that quietly permits: adding an endpoint reds
        this leg, a human rules, and the ruling lands in DECLARED_EGRESS with a reason. */
  const DECLARED_EGRESS = [
    '/api/calculate',        // REVEAL — 2 sites, both downstream of the reveal refusal check
    '/api/prime',            // not a studio request
    '/api/ss-matrix/',       // POLL (GET) — job id appended; carries no household
    '/api/ss-matrix/start',  // CLAIMING PATHS — the second door, guarded 2026-09-06
    '/api/tickers',          // not a studio request
  ];
  const shellText = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');   // studio.html
  const foundEgress = [...new Set((shellText.match(/^.*fetch\(.*$/gm) || [])
    .map(l => (l.match(/\/api\/[A-Za-z0-9_\-\/]*/) || [null])[0])
    .filter(Boolean))].sort();
  ok('L7a the egress census found doors at all (a matcher that finds nothing proves nothing)',
     foundEgress.length > 0, foundEgress.length + ' found');
  const unexpected = foundEgress.filter(e => DECLARED_EGRESS.indexOf(e) === -1);
  ok('L7b every /api/ literal reached by fetch( is DECLARED — a new door must be ruled on, not assumed',
     unexpected.length === 0, unexpected.length ? 'UNDECLARED: ' + unexpected.join(', ') : 'all ' + foundEgress.length + ' declared');

  /* ── L9 THE SECOND DOOR — CLAIMING PATHS / SS MATRIX ───────────────────────────
     ⛔ MEASURED 2026-09-06, PRE-FIX: this door POSTed an unanswered household to
        /api/ss-matrix/start with filing_status ABSENT, and schemas.py:104 fills that with `mfj`.
        L1–L6 above were 17/17 GREEN over that defect for one reason — THEY ONLY EVER CROSSED THE
        REVEAL DOOR. §82.1938: a negative from an instrument that cannot reach the mechanism is
        NO EVIDENCE.
     ⭐ L9a IS THE EXISTENCE LEG AND IT IS NOT OPTIONAL. "It did not POST an unanswered household"
        passes TRIVIALLY when the door cannot POST at all — which is exactly what the first run of
        this rig did, silently, because the Matrix returns early with no SS benefits entered.
        L9b is only readable while L9a is green. */
  const armed = await P.evaluate(async () => {
    const set = (id, v) => { const e = document.getElementById(id); if (!e) return false;
      e.value = v; ['input','change','blur'].forEach(ev => e.dispatchEvent(new Event(ev, { bubbles: true }))); return true; };
    // The Matrix refuses on an empty SS benefit trio and on an empty estate, BEFORE it ever
    // builds a payload. Neither refusal is the one under test, so both are satisfied here.
    set('ss-pri-62', '2000'); set('ss-pri-67', '2900'); set('ss-pri-70', '3600');
    let seeded = false;
    try { if (typeof state === 'object' && Array.isArray(state.accounts)) {
      state.accounts.push({ baseId: 'trad-401k', value: 1000000, inflow: 0, id: 'gate-egress' }); seeded = true; } } catch (e) {}
    await new Promise(r => setTimeout(r, 700));
    return { seeded, ss: window._readSSOverride ? window._readSSOverride('ss-pri').state : 'n/a',
             fn: typeof window.startMatrixJob };
  });
  const fireMatrix = async (val) => {
    POSTS.length = 0;
    await P.evaluate(async (v) => {
      try { sessionStorage.removeItem('ss_matrix_result'); } catch (e) {}
      const el = document.getElementById('filing-status');
      el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      // FIRE WITHOUT AWAITING — startMatrixJob polls the job to completion and the stub never
      // completes. Only the POST on the way in is under test.
      try { window.startMatrixJob(); } catch (e) {}
    }, val);
    await P.waitForTimeout(2600);
    const hit = POSTS.find(x => /ss-matrix\/start/.test(x.url));
    let parsed = null; if (hit && hit.body) { try { parsed = JSON.parse(hit.body); } catch (e) {} }
    return { posted: !!hit, parsed };
  };
  const firstOpt = answerable[0].value;
  const mAnswered = await fireMatrix(firstOpt);
  ok('L9a EXISTENCE — an ANSWERED household reaches the second door, carrying its enum',
     mAnswered.posted === true && !!mAnswered.parsed &&
     ENGINE_ENUMS.indexOf(mAnswered.parsed.filing_status) !== -1,
     'armed=' + JSON.stringify(armed) + ' posted=' + mAnswered.posted +
     ' filing_status=' + JSON.stringify(mAnswered.parsed ? mAnswered.parsed.filing_status : null));
  const mBlank = await fireMatrix('');
  ok('L9b ⛔ an UNANSWERED household must NOT reach the second door (never mfj by omission)',
     mBlank.posted === false,
     mBlank.posted ? 'POSTED with filing_status ' +
       (mBlank.parsed && mBlank.parsed.filing_status === undefined ? 'ABSENT — the engine will read mfj'
        : JSON.stringify(mBlank.parsed && mBlank.parsed.filing_status)) : 'no POST — refused');

  /* ── L5 CONTROL ────────────────────────────────────────────────────────────────────────────── */
  const distinct = [...new Set(seen)];
  ok('L5 CONTROL — more than one distinct enum observed (a dead wire cannot pass)',
     distinct.length > 1, distinct.length + ' distinct: {' + distinct.join(', ') + '}');

  /* ⛔ THE MODE LINE IS PART OF THE VERDICT. It read 'clean' under --unguarded because it knew
     only one mutation — an instrument misreporting its OWN state, which is how a mutated run
     gets filed as a clean one. Derived from the flags now, so a third mutation cannot silently
     inherit 'clean'. */
  const MODES = [UNMAPPED && '--unmapped', UNGUARDED && '--unguarded'].filter(Boolean);
  console.log(out.join('\n'));
  console.log('\nMODE: ' + (MODES.length ? 'MUTATION ' + MODES.join(' + ') : 'clean'));
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
