'use strict';
/* ⛔⛔ FILING STATUS REACHES THE ENGINE — AND EVERY OPTION MAPS (§82.1893).
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
 *   L1 POPULATION   the select exists and carries at least five answerable options.
 *   L2 MAP COMPLETE every answerable option resolves to an engine enum (derived, not listed).
 *   L3 REACHES      each option puts its enum into the payload _buildStudioRequest() sends.
 *   L4 UNANSWERED   the placeholder sends NO filing_status key.
 *   L5 CONTROL      more than one distinct enum was observed — a dead wire cannot pass.
 *
 * MUTATION (mutates the SUBJECT, served to the browser)
 *   --unmapped  deletes one entry from FILING_STATUS_MAP in the served bytes. Expect L2 RED and
 *               exactly one L3 RED; L1/L4/L5 stay green. Narrow on purpose: a control that reds
 *               five legs cannot tell you which one it proved.
 *
 * ⛔ READS studio.html OFF DISK TO SERVE MUTATED BYTES — declared in _gate_studio_source's
 *    SERVING_EXEMPT, with the literal kept ON the read line so the census can SEE it.
 *
 * Run: node scripts/_gate_filing_status_reaches_engine.js        (exit 0 = GREEN)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8238;
const UNMAPPED = process.argv.includes('--unmapped');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

let SERVE_HTML = null;
if (UNMAPPED) {
  SERVE_HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  const A = "          'Head of Household':           'hoh',\n";
  const n = SERVE_HTML.split(A).length - 1;
  if (n !== 1) { console.log('ABORT — --unmapped anchor matched ' + n + 'x, expected 1.'); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(A, '');
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
let fails = 0; const out = [];
const ok = (l, c, o) => { const g = !!c; if (!g) fails++;
  out.push((g ? 'PASS  ' : 'FAIL  ') + l + (o !== undefined ? '   [' + o + ']' : '')); };

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1250 } });
  await c.addInitScript("window.Clerk={load:()=>Promise.resolve(),user:{unsafeMetadata:{}},addListener:()=>{}};");
  await c.route('**/*', r => { const u = r.request().url();
    if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
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

  /* ── L5 CONTROL ────────────────────────────────────────────────────────────────────────────── */
  const distinct = [...new Set(seen)];
  ok('L5 CONTROL — more than one distinct enum observed (a dead wire cannot pass)',
     distinct.length > 1, distinct.length + ' distinct: {' + distinct.join(', ') + '}');

  console.log(out.join('\n'));
  console.log('\nMODE: ' + (UNMAPPED ? 'MUTATION --unmapped' : 'clean'));
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
