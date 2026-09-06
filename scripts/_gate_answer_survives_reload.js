/* ⛔⛔ THE AGREEMENT GATE — AN ANSWER THAT AGREES WITH US IS STILL AN ANSWER.
 *
 * THE DEFECT (finding_restore_skips_default_equal_answer, Captain's household):
 * The draft restore treats a stored value as a real answer ONLY IF IT DIFFERS FROM THE SCHEMA
 * DEFAULT. `newBlueprint().tax.filing` IS 'Married Filing Jointly'. So a user who picks Married
 * Filing Jointly has their answer captured correctly, stored correctly, and then SILENTLY DROPPED
 * ON RESTORE — because it matched our guess. 'Head of Household' survives. THAT CONTRAST IS THE BUG.
 *
 * ⭐ THE INVERTED SEVERITY GRADIENT (§82.1722) IS WHY THIS IS NOT A ROUNDING ERROR. It does not
 *    fail on a random population. It fails on EXACTLY THE USERS WE GUESSED RIGHT ABOUT, because a
 *    default is by construction our best guess at the likeliest answer. THE BETTER OUR DEFAULTS
 *    GET, THE MORE USERS IT SILENTLY HARMS.
 *
 * ⛔ THE GUARD IS NOT THE DEFECT AND MUST NOT BE DELETED. Without it we write 'FL' into a Location
 *    select the user never opened — a fabricated personal fact on the surface that decides someone's
 *    money, which L47 says is WORSE than the loss. The guard is the honest approximation the
 *    restore block's own header says it is. THE DEFECT IS THAT A SELECTABLE ANSWER COLLIDES WITH A
 *    DEFAULT AT ALL.
 *
 * ── WHAT THIS GATE ASSERTS ──────────────────────────────────────────────────────────────────────
 * L2 is the general law and L3 is the reported symptom. They are deliberately different KINDS of
 * evidence and neither replaces the other:
 *
 *   L2 THE INVARIANT — DERIVED FROM THE WORLD, NOT FROM A LIST I TYPED. For every profile tax
 *      select, NO SELECTABLE OPTION MAY EQUAL ITS SCHEMA DEFAULT. Options are read from the live
 *      DOM and defaults from the live schema, so this covers fields and options THAT DO NOT EXIST
 *      YET. This is the property that makes the guard safe, and it would have caught this bug on
 *      the day the guard was written.
 *   L3 THE JOURNEY — the Captain's steps, verbatim: answer, reload, look. A direct call would prove
 *      the handler, not the feature ([[feedback_direct_call_proves_the_handler]]).
 *
 * ⚠️ L3 CARRIES ITS OWN HONEST HALF AND IT IS LOAD-BEARING. 'Head of Household' must survive the
 *    SAME round-trip in the SAME run. Without it, a red on Married Filing Jointly is indistinguishable
 *    from a round-trip that persists nothing at all — a broken rig and a real defect print the same
 *    failure. THE CONTRAST IS THE EVIDENCE, so the gate refuses a verdict if the control does not
 *    survive.
 *
 * ⚠️ THE PLACEHOLDER OPTION IS EXCLUDED FROM L2 BY CONSTRUCTION, NOT BY CONVENIENCE. Every one of
 *    these selects opens on a value="" placeholder, and captureDOM writes the key ONLY when the
 *    value is truthy (`if (_fil) bp.tax.filing = _fil`). So '' can never BE a stored answer, and an
 *    '' default therefore cannot collide with one. That is precisely why '' is the correct default
 *    and 'Married Filing Jointly' is not.
 *
 * ── CONTROLS ────────────────────────────────────────────────────────────────────────────────────
 *   --collide   Re-inserts the pre-fix defaults into the SERVED schema (filing -> 'Married Filing
 *               Jointly', location -> 'FL'). MUST red L2-filing and L3, and MUST leave the L1
 *               existence legs and the L3 control green. This is the red-first: before the fix it
 *               reproduces today's shipped behaviour, and after the fix it proves the gate still bites.
 *
 * ⛔ IF THE CONTROL DOES NOT BITE, THIS GATE PRINTS **NO VERDICT** AND EXITS 2. A mutation control
 *    that fails to land turns a green into a decoration ([[feedback_poison_rig_must_prove_poison_landed]]).
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PW_PORT || 8663;
const COLLIDE = process.argv.includes('--collide');
/* --zerodrop restores the pre-Batch-1b capture guard (`_txr > 0`) on the served blueprint part.
   MUST red L6 TRUTHY-ZERO and NOTHING ELSE — the non-zero honest half must stay green, which is
   what proves the control reproduces a truthy-zero fault rather than breaking capture outright. */
const ZERODROP = process.argv.includes('--zerodrop');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

/* The served schema line. Anchored on the KEYS, never on the whole literal, so the control keeps
   biting when a sibling default changes for an unrelated reason. */
let SERVE_BP = null;
if (COLLIDE) {
  const f = path.join(ROOT, 'scripts', 'studio-blueprint.js');
  SERVE_BP = fs.readFileSync(f, 'utf8');
  const A = /tax:\s*\{\s*filing:\s*'[^']*',\s*location:\s*'[^']*',/;
  const hits = SERVE_BP.match(new RegExp(A.source, 'g'));
  if (!hits || hits.length !== 1) {
    console.log('ABORT — --collide anchor found ' + (hits ? hits.length : 0) + 'x, expected 1. A red-first that did not land proves nothing.');
    process.exit(2);
  }
  SERVE_BP = SERVE_BP.replace(A, "tax:     { filing: 'Married Filing Jointly', location: 'FL',");
}
if (ZERODROP) {
  const f = path.join(ROOT, 'scripts', 'studio-blueprint.js');
  SERVE_BP = fs.readFileSync(f, 'utf8');
  const A = 'if (isFinite(_txr) && _txr >= 0 && _txr < 100)';
  const B = 'if (isFinite(_txr) && _txr > 0 && _txr < 100)';
  const n = SERVE_BP.split(A).length - 1;
  if (n !== 1) { console.log(`ABORT — --zerodrop anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_BP = SERVE_BP.replace(A, B);
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

/* select id -> schema key, and how the restore renders that key back into an option value.
   ⚠️ THE NUMERIC FIELDS ARE NOT A SPECIAL CASE BOLTED ON — the restore block itself renders them
      as Math.round(rate*100)+'%' before comparing against the options, so the invariant must be
      tested in the SAME space the guard compares in, or L2 would be asking a question the product
      never asks. */
/* ⭐ BATCH 1a — EIGHT CONTROLS BECAME THREE, AND THE SWEEP FOLLOWED THE PRODUCT.
   ~~co-filing-status · co-location · pri-tax-method · co-tax-method · co-tax-bracket~~ are gone:
   tax rate method deleted outright, the three co-architect tax fields replaced by single household
   controls because a joint return has one combined taxable income and one rate.
   ⛔ THE SCHEMA KEYS THEY USED (`co_filing`, `co_location`, `method`, `co_method`,
      `co_working_year_effective_rate`) STILL EXIST and are still codec-carried — they are
      positional in the `T` array and retiring them is a version bump. They are dropped from THIS
      sweep because the sweep's claim is about SELECTABLE ANSWERS colliding with defaults, and a key
      with no control offers no answers to collide. A key nothing can write cannot lose a value.
   ⚠️ SO THIS GATE'S SILENCE ON THEM IS DELIBERATE AND NARROW, not an oversight: if a control is
      ever re-attached to one of those keys — the Married-Filing-Separately split is specified to do
      exactly that — IT MUST BE ADDED BACK HERE IN THE SAME COMMIT, or its default collision goes
      unmeasured. L1 below fails loudly if a listed control is missing; it CANNOT notice a control
      that exists and is not listed. */
const FIELDS = [
  { sel: 'filing-status',   key: 'filing',                          kind: 'str' },
  { sel: 'pri-location',    key: 'location',                        kind: 'str' },
  { sel: 'eff-tax-rate',    key: 'working_year_effective_rate',     kind: 'pct' },
];

const enterDataRoom = async (P) => {
  await P.waitForTimeout(1600);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1500 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(800);
};

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
  await enterDataRoom(P);

  /* Reveal the co-architect fields so their options are readable. The household button is the
     visible surface of #co-arch-toggle and dispatches the same change event. */
  try {
    const btn = P.locator('button.household-mode-button[data-co-architect-toggle]');
    if (await btn.count() === 1) { await btn.click(); await P.waitForTimeout(600); }
  } catch (e) {}

  /* ── L1 EXISTENCE ────────────────────────────────────────────────────────────────────────────
     Every negative leg below is paired with one proving its subject was present to be caught.
     [[feedback_negative_leg_needs_existence_leg]] — "no option collides with a default" is
     TRIVIALLY TRUE of a page with no selects, no options, or no schema. */
  const world = await P.evaluate((FIELDS) => {
    const tax = (() => { try {
      if (!window.DatumBlueprint || typeof DatumBlueprint['new'] !== 'function') return null;
      return DatumBlueprint['new']().tax || null;
    } catch (e) { return 'ERR:' + e.message; } })();
    const o = { tax, taxKeys: (tax && typeof tax === 'object') ? Object.keys(tax) : null, sel: {} };
    FIELDS.forEach((f) => {
      const el = document.getElementById(f.sel);
      o.sel[f.sel] = el ? Array.prototype.map.call(el.options, (x) => String(x.value || x.text)) : null;
    });
    return o;
  }, FIELDS);

  check('L1 EXISTENCE: the live schema exposes a tax object',
    world.tax && typeof world.tax === 'object', JSON.stringify(world.tax));
  check('L1 EXISTENCE: all ' + FIELDS.length + ' profile tax selects exist in the DOM',
    FIELDS.every((f) => Array.isArray(world.sel[f.sel])),
    FIELDS.filter((f) => !Array.isArray(world.sel[f.sel])).map((f) => f.sel).join(',') || 'all present');
  check('L1 EXISTENCE: the schema declares every key this gate compares against',
    world.taxKeys && FIELDS.every((f) => world.taxKeys.indexOf(f.key) !== -1),
    JSON.stringify(world.taxKeys));
  check('L1 EXISTENCE: every select offers real options beyond its placeholder (else L2 sweeps an '
    + 'EMPTY SET and a predicate over an empty set is TRUE)',
    FIELDS.every((f) => (world.sel[f.sel] || []).filter((v) => v !== '').length > 0),
    FIELDS.map((f) => f.sel + '=' + ((world.sel[f.sel] || []).length)).join(' '));

  /* ── L2 THE INVARIANT ────────────────────────────────────────────────────────────────────────
     A stored answer is restored ONLY IF it differs from the schema default. Therefore the guard is
     safe IF AND ONLY IF no answer a user can select is equal to a default. Swept over the live
     option lists, so it covers options nobody has added yet. */
  const render = (kind, v) => {
    if (kind === 'pct') {
      if (typeof v !== 'number' || !isFinite(v)) return null;
      return Math.round(v * 100) + '%';
    }
    return (v === undefined || v === null) ? null : String(v);
  };
  const collisions = [];
  FIELDS.forEach((f) => {
    const def = render(f.kind, world.tax ? world.tax[f.key] : undefined);
    if (def === null || def === '') return;          // '' can never be a stored answer — see header
    const opts = (world.sel[f.sel] || []).filter((v) => v !== '');
    if (opts.indexOf(def) !== -1) collisions.push(f.sel + ' default=' + JSON.stringify(def));
  });
  check('L2 INVARIANT: NO selectable answer equals its own schema default — an answer that agrees '
    + 'with us is still an answer [BITE collide]',
    collisions.length === 0,
    collisions.length ? collisions.join(' | ') : 'swept ' + FIELDS.length + ' fields, 0 collisions');

  /* ── L3 THE JOURNEY ──────────────────────────────────────────────────────────────────────────
     The Captain's steps, verbatim. TWO values in ONE run: the reported symptom and its control. */
  const SUBJECT = 'Married Filing Jointly';   // equals the pre-fix default — the reported symptom
  const CONTROL = 'Head of Household';        // differs from every default — must survive either way

  const setAndReload = async (value) => {
    await P.evaluate((v) => {
      const e = document.getElementById('filing-status');
      e.value = v;
      e.dispatchEvent(new Event('input',  { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      /* An unrelated field, answered alongside, proving the round-trip machinery ran at all. */
      const d = document.getElementById('pri-dob');
      if (d) { d.value = '08/1982'; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); }
    }, value);
    await P.waitForTimeout(900);
    await P.reload({ waitUntil: 'load' });
    await enterDataRoom(P);
    return P.evaluate(() => ({
      filing: String((document.getElementById('filing-status') || {}).value || ''),
      dob:    String((document.getElementById('pri-dob') || {}).value || ''),
    }));
  };

  const afterControl = await setAndReload(CONTROL);
  check('L3 EXISTENCE: the round-trip machinery persists SOMETHING (an unrelated answered field '
    + 'survived the reload) — without this a red below is a broken rig, not a defect',
    /1982/.test(afterControl.dob), 'pri-dob=' + JSON.stringify(afterControl.dob));
  check('L3 HONEST HALF: an answer that DIFFERS from the default survives the reload',
    afterControl.filing === CONTROL, 'filing-status=' + JSON.stringify(afterControl.filing));

  const afterSubject = await setAndReload(SUBJECT);
  check('L3 THE SYMPTOM: an answer that EQUALS the default survives the reload too [BITE collide]',
    afterSubject.filing === SUBJECT, 'filing-status=' + JSON.stringify(afterSubject.filing));

  /* ── L6 TRUTHY-ZERO — ITS OWN LEG, NEVER FOLDED INTO A GENERAL ROUND-TRIP ──────────────────
   * "Nothing at all" is 0%, and it is THE MOST COMMON MEASURED ANSWER: 82 of 210 households pay
   * no federal tax on their withdrawal at all. The capture guard read `_txr > 0`, which would have
   * accepted that answer on screen and discarded it at capture — THE ANSWER THE ENTIRE BAND
   * REDESIGN EXISTS TO ENABLE, silently deleted.
   * ⛔ IT IS SEPARATE FROM L3 ON PURPOSE. L3 asks whether a value equal to a DEFAULT survives;
   *    this asks whether a value the language treats as ABSENT survives. Same symptom on screen,
   *    different mechanism, and a general leg passing tells you nothing about this one.
   * ⚠️ AND IT NEEDS ITS OWN HONEST HALF: a non-zero band must survive the same trip, or a red here
   *    is indistinguishable from a round-trip that persists no rate at all. */
  const setRateAndReload = async (optionValue) => {
    await P.evaluate((v) => {
      const e = document.getElementById('eff-tax-rate');
      e.value = v;
      e.dispatchEvent(new Event('change', { bubbles: true }));
      const d = document.getElementById('pri-dob');
      if (d) { d.value = '08/1982'; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); }
    }, optionValue);
    await P.waitForTimeout(900);
    await P.reload({ waitUntil: 'load' });
    await enterDataRoom(P);
    return P.evaluate(() => ({
      rate: String((document.getElementById('eff-tax-rate') || {}).value || ''),
      dob:  String((document.getElementById('pri-dob') || {}).value || ''),
    }));
  };

  const nonZero = await setRateAndReload('9%');
  check('L6 HONEST HALF: a NON-ZERO band survives the reload (else a red below is a dead '
    + 'round-trip, not a truthy-zero fault)',
    nonZero.rate === '9%' && /1982/.test(nonZero.dob),
    'eff-tax-rate=' + JSON.stringify(nonZero.rate) + ' pri-dob=' + JSON.stringify(nonZero.dob));

  const zero = await setRateAndReload('0%');
  check('L6 TRUTHY-ZERO: "Nothing at all" (0%) survives the reload — the most common measured '
    + 'answer is storable [BITE zerodrop]',
    zero.rate === '0%', 'eff-tax-rate=' + JSON.stringify(zero.rate));

  await b.close(); srv.close();

  /* ── THE CONTROL MUST BITE, OR THERE IS NO VERDICT ───────────────────────────────────────────
     Under --collide the pre-fix defaults are served back. If that does NOT produce the two reds it
     is aimed at, the mutation did not land and a green from the clean run means nothing. */
  /* ⭐ THE TWO CONTROLS AIM AT DISJOINT LEGS, AND THAT IS THE POINT. One control proves the gate
     reacts to SOMETHING. Two controls reddening non-overlapping legs prove it can tell the two
     defects APART — a default collision and a truthy-zero discard produce the same symptom on
     screen (an answer that vanishes) and must not produce the same verdict here. */
  const BITE = COLLIDE ? ['L2 INVARIANT', 'L3 THE SYMPTOM'] : (ZERODROP ? ['L6 TRUTHY-ZERO'] : null);
  if (BITE) {
    const mode = COLLIDE ? '--collide' : '--zerodrop';
    const bit = BITE.filter((tag) => out.some((l) => l.startsWith('FAIL') && l.indexOf(tag) !== -1));
    const existenceHeld = out.filter((l) => l.indexOf('EXISTENCE') !== -1 || l.indexOf('HONEST HALF') !== -1)
                             .every((l) => l.startsWith('PASS'));
    /* Legs this control is NOT aimed at must stay green, or the red set is not disjoint. */
    const unaimed = out.filter((l) => !BITE.some((t) => l.indexOf(t) !== -1)
      && (l.indexOf('L2 INVARIANT') !== -1 || l.indexOf('L3 THE SYMPTOM') !== -1 || l.indexOf('L6 TRUTHY-ZERO') !== -1));
    const disjoint = unaimed.every((l) => l.startsWith('PASS'));
    console.log(out.join('\n'));
    console.log('\nMODE: ' + mode);
    if (bit.length !== BITE.length || !existenceHeld || !disjoint) {
      console.log('CONTROL DID NOT LAND — bit [' + bit.join(', ') + '] of [' + BITE.join(', ') + ']'
        + '; existence/honest legs held: ' + existenceHeld + '; red set disjoint: ' + disjoint);
      console.log('NO VERDICT — a control that does not bite cannot certify anything.');
      process.exit(2);
    }
    console.log('CONTROL LANDED: aimed legs red, every existence/honest-half leg green, red set disjoint.');
    console.log('OVERALL: RED (expected under ' + mode + ')   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
    process.exit(0);
  }

  console.log(out.join('\n'));
  console.log('\nMODE: clean');
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
