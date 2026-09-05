/* ⛔⛔ THE PROVENANCE GATE — §82.1616, THE THIRD LAW: NO FABRICATED FIELDS.
 *
 * NO HIDDEN FIELDS (§82.1560) · NO SILENTLY UNCONSUMED FIELDS (§82.1545) · AND NOW NO FABRICATED
 * FIELDS. A value the user never gave, presented as though they gave it, is the most dangerous of
 * the three, because ONE ROUND-TRIP LATER NOTHING CAN TELL IT FROM A REAL ANSWER.
 *
 * WHAT THIS GATE EXISTS FOR — AND IT IS A BRIDGE DEFECT, WHICH IS WHY IT NEEDS ITS OWN GATE.
 * Cause 2 prefills the co-architect's four tax fields from the primary's: only-if-empty, stamped
 * `data-prefilled`, un-stamped the moment the user edits. Fabrication-safe DISPLAY.
 * Schema 1.1.0 captures those same four fields into the blueprint, every write guarded on a real
 * value. Fabrication-safe CAPTURE.
 * 🔑 NEITHER IS WRONG ALONE. Together, without the provenance gate in captureDOM, a prefilled
 *    value is STORED AS AN ANSWER — and `data-prefilled` is a DOM attribute that is never
 *    persisted, so the label does not survive the trip that makes the lie permanent.
 *    THE DEFECT LIVES ON THE BRIDGE AND APPEARS IN NEITHER DIFF.
 *
 * ⚠️ L1 IS AN EXISTENCE LEG AND IT IS NOT CEREMONY. "The store does not hold a prefilled value" is
 *    TRIVIALLY TRUE of a page where the prefill never ran, the fields do not exist, or dual mode
 *    never engaged — [[feedback_negative_leg_needs_existence_leg]]. Every negative leg below is
 *    paired with a positive one that proves its subject was present to be caught.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PW_PORT || 8657;
/* --nogate REMOVES the provenance guard from the served blueprint part. It must red L3/L5 and
   leave every other leg green: a control that reds everything is indistinguishable from a broken
   rig. §82.1512 — disjoint red sets. */
const NOGATE = process.argv.includes('--nogate');

const GUARD_T = `      if (!el || el.hasAttribute('data-prefilled')) return '';`;
const GUARD_B = `      if (!el) return '';   /* provenance gate removed by --nogate */`;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

let SERVE_BP = null;
if (NOGATE) {
  const f = path.join(ROOT, 'scripts', 'studio-blueprint.js');
  SERVE_BP = fs.readFileSync(f, 'utf8');
  const n = SERVE_BP.split(GUARD_T).length - 1;
  if (n !== 1) { console.log(`ABORT — --nogate anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_BP = SERVE_BP.replace(GUARD_T, GUARD_B);
}

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (SERVE_BP && p === '/scripts/studio-blueprint.js') {
    s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(SERVE_BP);
  }
  fs.readFile(path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, '')), (e, b) => {
    if (e) { s.writeHead(404).end(); return; }
    s.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }); s.end(b); });
});

let fails = 0; const out = [];
const check = (l, c, d) => { const ok = !!c; if (!ok) fails++; out.push((ok ? 'PASS  ' : 'FAIL  ') + l + (d !== undefined ? '   [' + d + ']' : '')); };

const CO_TAX = ['co-tax-method', 'co-tax-bracket', 'co-location', 'co-filing-status'];
const KEYS = { 'co-tax-method': 'co_method', 'co-tax-bracket': 'co_working_year_effective_rate',
               'co-location': 'co_location', 'co-filing-status': 'co_filing' };

const readState = (P) => P.evaluate((ids) => {
  const el = (id) => document.getElementById(id);
  /* ⛔ captureDOM(bp) MUTATES ITS ARGUMENT AND RETURNS NOTHING. Calling it bare throws on
     bp.profile, and a try/catch around it turns the throw into an "absent key" — which reads
     EXACTLY like the guard working. THAT IS HOW THE FIRST DRAFT OF THIS GATE PASSED L3 OVER AN
     EXCEPTION. capturedProof below is the existence leg that makes the vacuity impossible:
     an unrelated field that MUST be present proves the capture actually ran. */
  const bp = (() => { try {
    if (!window.DatumBlueprint || !DatumBlueprint['new'] || !DatumBlueprint.captureDOM) return null;
    const o = DatumBlueprint['new']();
    DatumBlueprint.captureDOM(o);
    return o;
  } catch (e) { return 'ERR:' + e.message; } })();
  const o = { fields: {}, stamped: {},
              tax: (bp && bp.tax) ? bp.tax : null,
              taxKeys: (bp && bp.tax) ? Object.keys(bp.tax) : null,
              capturedProof: (bp && bp.profile) ? bp.profile.primary_dob : null,
              bpErr: (typeof bp === 'string') ? bp : null };
  ids.forEach((id) => { const e = el(id);
    o.fields[id] = e ? String(e.value || '') : null;
    o.stamped[id] = e ? e.hasAttribute('data-prefilled') : null; });
  return o;
}, CO_TAX);

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
  await P.waitForTimeout(1600);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1500 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(800);

  /* The primary's tax answers are the SOURCE the prefill copies from. Without them the prefill
     is a no-op and every leg below would pass over an empty set. */
  await P.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v;
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
    set('pri-dob', '08/1982');   // capturedProof — an unrelated field that proves captureDOM ran
    set('pri-tax-method', 'Blended estimate'); set('eff-tax-rate', '24%');
    set('pri-location', 'California'); set('filing-status', 'Married Filing Jointly');
  });
  await P.waitForTimeout(400);

  const cold = await readState(P);
  check('L1 EXISTENCE: all four co-architect tax controls exist',
    CO_TAX.every((id) => cold.fields[id] !== null), JSON.stringify(cold.fields));
  check('L1 EXISTENCE: and are EMPTY before the prefill (else the prefill leg is vacuous)',
    CO_TAX.every((id) => cold.fields[id] === ''), JSON.stringify(cold.fields));

  /* Click the VISIBLE surface — the household button — never the hidden checkbox. */
  const btn = P.locator('button.household-mode-button[data-co-architect-toggle]');
  check('L1 EXISTENCE: the household button exists to be clicked', await btn.count() === 1, 'count=' + await btn.count());
  await btn.click();
  await P.waitForTimeout(700);

  const filled = await readState(P);
  check('L2 PREFILL: all four now carry the primary\'s values',
    CO_TAX.every((id) => filled.fields[id] && filled.fields[id].length), JSON.stringify(filled.fields));
  check('L2 PREFILL: and all four are STAMPED data-prefilled',
    CO_TAX.every((id) => filled.stamped[id] === true), JSON.stringify(filled.stamped));

  const t1 = filled.tax || {};
  /* THE EXISTENCE LEGS FOR L3. Without these, "no prefilled value in the store" is satisfied by a
     capture that never ran, a schema without the keys, or a thrown exception. */
  check('L3 EXISTENCE: captureDOM actually RAN (an unrelated field was captured)',
    /1982/.test(String(filled.capturedProof || '')), 'primary_dob=' + JSON.stringify(filled.capturedProof) + ' err=' + JSON.stringify(filled.bpErr));
  check('L3 EXISTENCE: bp.tax DECLARES all four co-architect keys (schema 1.1.0)',
    filled.taxKeys && CO_TAX.every((id) => filled.taxKeys.indexOf(KEYS[id]) !== -1), JSON.stringify(filled.taxKeys));
  check('L3 THE GUARD: NOT ONE prefilled value reached the store',
    CO_TAX.every((id) => !t1[KEYS[id]]),   // '' / 0 are the schema defaults = "no answer stored"
    CO_TAX.map((id) => KEYS[id] + '=' + JSON.stringify(t1[KEYS[id]])).join(' '));

  /* OWNERSHIP — the user takes the value. The stamp retires and the SAME value becomes storable.
     This is the honest half: the guard must not simply refuse everything. */
  await P.evaluate(() => { const e = document.getElementById('co-location');
    e.value = 'Texas'; e.dispatchEvent(new Event('change', { bubbles: true })); });
  await P.waitForTimeout(400);
  const owned = await readState(P);
  const t2 = owned.tax || {};

  check('L4 OWNERSHIP: editing co-location retires its stamp', owned.stamped['co-location'] === false, 'stamped=' + owned.stamped['co-location']);
  check('L4 OWNERSHIP: and the answered value NOW reaches the store', t2.co_location === 'Texas', 'co_location=' + JSON.stringify(t2.co_location));
  check('L5 HONEST HALF: the three still-stamped siblings are STILL absent',
    ['co-tax-method', 'co-tax-bracket', 'co-filing-status'].every((id) => !t2[KEYS[id]]),
    ['co-tax-method', 'co-tax-bracket', 'co-filing-status'].map((id) => KEYS[id] + '=' + JSON.stringify(t2[KEYS[id]])).join(' '));
  check('L5 HONEST HALF: and they still hold their prefilled VALUES on screen (refused, not erased)',
    ['co-tax-method', 'co-tax-bracket', 'co-filing-status'].every((id) => owned.fields[id] && owned.fields[id].length),
    JSON.stringify(owned.fields));

  await b.close(); srv.close();
  console.log(out.join('\n'));
  console.log('\nMODE: ' + (NOGATE ? '--nogate' : 'clean'));
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
