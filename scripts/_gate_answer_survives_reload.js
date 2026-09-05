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
const FIELDS = [
  { sel: 'filing-status',   key: 'filing',                          kind: 'str' },
  { sel: 'co-filing-status', key: 'co_filing',                      kind: 'str' },
  { sel: 'pri-location',    key: 'location',                        kind: 'str' },
  { sel: 'co-location',     key: 'co_location',                     kind: 'str' },
  { sel: 'pri-tax-method',  key: 'method',                          kind: 'str' },
  { sel: 'co-tax-method',   key: 'co_method',                       kind: 'str' },
  { sel: 'eff-tax-rate',    key: 'working_year_effective_rate',     kind: 'pct' },
  { sel: 'co-tax-bracket',  key: 'co_working_year_effective_rate',  kind: 'pct' },
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
  check('L1 EXISTENCE: all eight profile tax selects exist in the DOM',
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

  await b.close(); srv.close();

  /* ── THE CONTROL MUST BITE, OR THERE IS NO VERDICT ───────────────────────────────────────────
     Under --collide the pre-fix defaults are served back. If that does NOT produce the two reds it
     is aimed at, the mutation did not land and a green from the clean run means nothing. */
  const BITE = ['L2 INVARIANT', 'L3 THE SYMPTOM'];
  if (COLLIDE) {
    const bit = BITE.filter((tag) => out.some((l) => l.startsWith('FAIL') && l.indexOf(tag) !== -1));
    const existenceHeld = out.filter((l) => l.indexOf('L1 EXISTENCE') !== -1 || l.indexOf('L3 EXISTENCE') !== -1 || l.indexOf('L3 HONEST HALF') !== -1)
                             .every((l) => l.startsWith('PASS'));
    console.log(out.join('\n'));
    console.log('\nMODE: --collide');
    if (bit.length !== BITE.length || !existenceHeld) {
      console.log('CONTROL DID NOT LAND — bit [' + bit.join(', ') + '] of [' + BITE.join(', ') + ']'
        + '; existence/honest legs held: ' + existenceHeld);
      console.log('NO VERDICT — a control that does not bite cannot certify anything.');
      process.exit(2);
    }
    console.log('CONTROL LANDED: both aimed legs red, every existence and honest-half leg still green.');
    console.log('OVERALL: RED (expected under --collide)   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
    process.exit(0);
  }

  console.log(out.join('\n'));
  console.log('\nMODE: clean');
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
