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
const { STUDIO_PATH } = require('./_studio_source.cjs');   // Phase 0: the helper owns where the shell lives

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PW_PORT || 8657;
/* --nogate REMOVES the provenance guard from the served blueprint part. It must red L3/L5 and
   leave every other leg green: a control that reds everything is indistinguishable from a broken
   rig. §82.1512 — disjoint red sets. */
const NOGATE = process.argv.includes('--nogate');
/* --pretransition: restores the PRE-FIX binding — the prefill runs ONLY from the toggle's
   change listener, never on arrival. Reproduces the literal symptom the Captain reported and must
   red ONLY the L6 state-bound legs; every transition-driven leg above stays green, because those
   legs reach dual mode by clicking and the pre-fix code served them perfectly well. */
const PRETRANS = process.argv.includes('--pretransition');

const GUARD_T = `      if (!el || el.hasAttribute('data-prefilled')) return '';`;
const GUARD_B = `      if (!el) return '';   /* provenance gate removed by --nogate */`;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

let SERVE_BP = null;
let SERVE_HTML = null;
if (PRETRANS) {
  /* Phase 0: the helper owns where the shell lives. studioSource() is NOT usable here — this
     SERVES the page to a browser and studioSource() returns shell + parts composed, which would
     double-define every part. See the fuller note in _gate_salary_unstated_suppressed.js. */
  SERVE_HTML = fs.readFileSync(STUDIO_PATH, 'utf8');
  /* ⚠️ ONE LINE, AND THAT IS LOAD-BEARING RATHER THAN STYLISTIC. This handler was briefly written
     across four lines; _gate_coarch_reveal_matches_toggle.js parses it LINE-BY-LINE and anchors BOTH
     of its controls (--defect, --replay) on the single-line text, so the multi-line form left that
     gate unable to see the sync AND unable to mutate it — two controls over an F71 data-loss defect,
     disarmed by a formatting choice. Keep this on one line, and if it must grow, fix that gate's
     parser in the same commit. */
  const AH = "    window.addEventListener('pageshow', function () { _applyCoArchVisibility(); if (coToggle.checked) _prefillCoArchTax(); });";
  const BH = "    window.addEventListener('pageshow', function () { _applyCoArchVisibility(); });";
  const nh = SERVE_HTML.split(AH).length - 1;
  if (nh !== 1) { console.log('ABORT — --pretransition anchor found ' + nh + 'x, expected 1. A red-first that did not land proves nothing.'); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(AH, BH);
}
if (NOGATE) {
  const f = path.join(ROOT, 'scripts', 'studio-blueprint.js');
  SERVE_BP = fs.readFileSync(f, 'utf8');
  const n = SERVE_BP.split(GUARD_T).length - 1;
  if (n !== 1) { console.log(`ABORT — --nogate anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_BP = SERVE_BP.replace(GUARD_T, GUARD_B);
}

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (SERVE_HTML && p === '/studio.html') {
    s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return s.end(SERVE_HTML);
  }
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
    set('pri-location', 'California'); set('filing-status', 'Head of Household');   /* NOT 'Married Filing Jointly': that EQUALS the schema default and the restore guard skips it, so the source would vanish on reload and L6 would red for a foreign reason. See finding_restore_skips_default_equal_answer. */
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

  /* ── L6 STATE-BOUND, NOT TRANSITION-BOUND (item 10, Captain-found 2026-09-05) ────────────────
   * `_prefillCoArchTax()` was called from ONE place: the toggle's own `change` listener. It fired
   * on solo -> joint and NEVER on arrival, so a user who was ALREADY joint — EVERY returning user
   * after a reload — got no prefill, and toggling off and back on was the only way to produce one.
   * 🔑 THE FEATURE WORKED WHEN DEMONSTRATED AND FAILED WHEN USED. Every leg above reaches dual mode
   *    BY CLICKING THE TOGGLE, so not one of them could ever have seen this. THE REPRODUCTION STEPS
   *    WERE THE CAMOUFLAGE — which is why this leg is forbidden from touching the toggle at all.
   * THE SCENARIO IS THE CAPTAIN'S, VERBATIM: be joint, RELOAD, touch nothing. The checkbox comes
   * back checked by BROWSER FORM RESTORATION with no change event fired (the F71 mechanism), so a
   * transition-bound prefill cannot run and a state-bound one must. */
  await P.reload({ waitUntil: 'load' });
  await P.waitForTimeout(1800);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1200 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(900);

  const reloaded = await readState(P);
  const stillJoint = await P.evaluate(() => !!(document.getElementById('co-arch-toggle') || {}).checked);
  const priKept = await P.evaluate(() => ['pri-tax-method','eff-tax-rate','pri-location','filing-status'].reduce(function(o,id){ o[id]=String((document.getElementById(id)||{}).value||''); return o; }, {}));

  /* EXISTENCE FIRST — all three preconditions, or the leg below is vacuous. A green here with the
     toggle off, or with the primary's source value gone, would prove nothing at all. */
  check('L6 EXISTENCE: the page came back ALREADY JOINT without any toggle interaction',
    stillJoint === true, 'co-arch-toggle.checked=' + stillJoint);
  /* ⚠️ ALL FOUR SOURCES, NOT ONE. The first draft of this leg checked only eff-tax-rate, and the
     STATE-BOUND leg below then red on co-filing-status for a reason that had nothing to do with the
     prefill: the primary's filing status had not survived the reload, so there was nothing to copy.
     A one-field existence check let a four-field claim rest on a one-field precondition. */
  check('L6 EXISTENCE: and EVERY primary source survived the reload (else the prefill has nothing '
    + 'to copy and the leg below is vacuous)',
    Object.keys(priKept).every((k) => priKept[k].length > 0), JSON.stringify(priKept));
  check('L6 STATE-BOUND: arriving already-joint PREFILLS the co-architect fields — no transition '
    + 'required [BITE pretransition]',
    CO_TAX.every((id) => reloaded.fields[id] && reloaded.fields[id].length), JSON.stringify(reloaded.fields));
  /* ⚠️ NOT "all four are stamped" — that was over-asserted and this leg red on its own fixture.
     co-location is the field the user OWNED in L4, so it is persisted as a real answer and comes
     back as THEIR value, correctly UNSTAMPED. Asserting a uniform stamp would have demanded the
     product forget an answer it is required to keep. The claim is a DISTINCTION, not a uniformity. */
  check('L6 STATE-BOUND: the three un-owned fields come back STAMPED — §82.1626\'s "re-offered, not '
    + 'lost" is finally true rather than asserted [BITE pretransition]',
    ['co-tax-method', 'co-tax-bracket', 'co-filing-status'].every((id) => reloaded.stamped[id] === true),
    JSON.stringify(reloaded.stamped));
  check('L6 OWNERSHIP SURVIVES: and the field the user ANSWERED returns as their value, UNSTAMPED — '
    + 'the re-offer does not overwrite an answer, and does not re-label one as a suggestion',
    reloaded.fields['co-location'] === 'Texas' && reloaded.stamped['co-location'] === false,
    'co-location=' + JSON.stringify(reloaded.fields['co-location']) + ' stamped=' + reloaded.stamped['co-location']);

  await b.close(); srv.close();
  console.log(out.join('\n'));
  console.log('\nMODE: ' + (NOGATE ? '--nogate' : (PRETRANS ? '--pretransition' : 'clean')));
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
