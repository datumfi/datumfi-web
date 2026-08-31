/* @gate-pool: browser */
'use strict';
/* _gate_shadow_value_agrees.js — STANDING GATE for FINDING 60.
 *
 * THE CLAIM: for each of the three log sliders, `data-exact-val` is either ABSENT or it AGREES with
 * the value the slider position encodes.
 *
 * ⛔ AGREEMENT, NOT ABSENCE — AND THAT IS THE WHOLE GATE. `data-exact-val` is a legitimate feature:
 *    it carries the precision a log slider cannot express, so a user who types $1,234,567 keeps
 *    every digit. An ABSENCE invariant would outlaw the feature; an AGREEMENT invariant outlaws
 *    only the defect. The blueprint load at studio.html:15527 writes the position AND the shadow
 *    value together ON PURPOSE, and must stay green.
 *
 * WHY IT EXISTS (measured 2026-08-31, F60): `_scenarioFromInputs` reads `dataset.exactVal` FIRST
 * and only falls back to the slider position when it is absent. A reset that restored `value` and
 * left `exactVal` behind made every field READ COLD while an INVISIBLE attribute outvoted them —
 * the HUD showed the departing user's $8.69M against a cold boot's $2.50M.
 * 🔑 A SHADOW VALUE THAT OUTRANKS THE CONTROL IT DECORATES IS A SECOND SOURCE OF TRUTH WITH NO
 *    VISIBLE SURFACE. Clearing the control does not clear the value, and nothing on screen says so.
 *
 * ══ ⛔ THE TOLERANCE IS DERIVED, NOT CHOSEN — AND NO CONSTANT EXISTS ═════════════════════════════
 * A bound is REQUIRED: exactVal holds exact dollars, the slider holds an integer position, so a
 * legitimate synchronised write round-trips through valToPos() and quantises. Zero-tolerance
 * equality would false-red correct code.
 * MEASURED over the real DatumShape.scales, and this is why no number is written here:
 *     portfolio  max 0.0108% per position step   (range 0.001 -> 50 $M)
 *     datum      max 0.0039% per position step   (range 20 -> 1000 $k)
 *     contrib    max 3.333%  per position step   — INTEGER-QUANTISED, not continuous
 * contrib's granularity is 850x coarser than portfolio's, so a RELATIVE epsilon fails; the units
 * are $ vs $M vs $k, so an ABSOLUTE epsilon fails too. 0.0108% of portfolio's top is $4,400 while
 * contrib's entire step is $1.
 * 🔑 "I MEASURED AND NO SINGLE VALUE WORKS" IS A STRONGER RESULT THAN "I MEASURED AND CHOSE
 *    CAREFULLY". A plausible-looking 0.1% would have passed portfolio and datum and quietly
 *    false-red contrib — the gate answering its own question.
 * SO THE BOUND IS READ FROM THE LIVE SCALE AT ASSERT TIME:
 *     tol(pos) = max(|f(pos+1) - f(pos)|, |f(pos) - f(pos-1)|)
 * ⚠️ THE NEIGHBOURHOOD MAX, NOT A FORWARD STEP: contrib has PLATEAUX (positions 1..1000 all return
 *    1), so a forward step of 0 inside one would demand exact equality at its edge and false-red.
 *    A DERIVED BOUND CAN STILL BE WRONG IF IT IS DERIVED IN ONLY ONE DIRECTION.
 *
 * PREDICTED — clean: L0 L1 L2 L3 L4 all GREEN (the defect is FIXED; this is a REGRESSION GUARD, and
 * what it guards against is precisely what F56 commit 2 does when it wakes a programmatic writer).
 * CONTROLS, each with a leg the others do not red:
 *   --stale-on-type       commitEdit moves the position but stops updating exactVal
 *                           -> L2 L3 RED · L0 L1 L4 GREEN   (MEASURED 3/5)
 *   --desync              commitEdit writes a WRONG exactVal
 *                           -> L2 L3 RED · L0 L1 L4 GREEN   (MEASURED 3/5)
 *   --staleexact-reset    Start Fresh stops clearing exactVal
 *                           -> L4 RED ALONE · L0 L1 L2 L3 GREEN   (MEASURED 4/5)
 * ⚠️ --stale-on-type AND --desync SHARE A RED SET {L2, L3}. They are NOT one control wearing two
 *    labels — they differ in the OBSERVED value (a stale boot figure vs a doubled one) — but by the
 *    two-names law their LEG signature does not separate them, and that is declared rather than
 *    dressed up. L4 separates the reset control from both.
 * ⛔ L1 PRESENCE HAS NO BITING CONTROL: the label renderers re-seed exactVal from the position
 *    whenever it is absent, so nothing short of removing four writers can empty it. L1 SHIPS AS A
 *    TRIPWIRE AND IS NOT COUNTED AS COVERAGE.
 *
 * ⚠️ DECLARED COVERAGE GAP — NAMED, NOT PAPERED OVER. Three writers touch these sliders:
 *   1. click-to-type  (creates exactVal)  — COVERED, real path: open the drawer, click, type, blur.
 *   2. Start Fresh    (must clear it)     — COVERED, handler-only (its banner is unreachable, F56).
 *   3. blueprint load (writes both)       — **NOT COVERED**. studio.html:15527/15533/15546 write the
 *      pair, but reaching them needs DatumBlueprint.load() to return a seeded blueprint, i.e. the
 *      module's own storage contract. Faking that would test the fixture rather than the product.
 *      🔑 A NAMED GAP IS A RESULT; AN UNNAMED ONE IS A FALSE GREEN WAITING. Cover it when the
 *      blueprint fixture exists (F56 commit 2 will need one).
 *   4. label renderers (studio.html:15148-15166) — updatePortfolioLabel / updateContribLabel /
 *      updateDatumLabel each SEED exactVal FROM THE POSITION when it is absent.
 *      ⭐ FOUND BY A CONTROL WHOSE PREDICTION I GOT WRONG: --stale-on-type was predicted to red L1
 *      (no shadow value written) and instead L1 stayed GREEN while L2 went RED — the values were
 *      750006 / 25000 / 100001, the COLD-BOOT DEFAULTS. I had under-enumerated the writers again.
 *      🔑 A SEED-FROM-POSITION WRITER CANNOT VIOLATE THIS INVARIANT BY CONSTRUCTION — it DERIVES the
 *         shadow value from the position. So the defect is not "a shadow value exists"; it is
 *         "a writer moved the POSITION and left the shadow value behind". That is the sharpened
 *         statement, and it came from a failed prediction rather than from reasoning.
 *
 * Run: node scripts/_gate_shadow_value_agrees.js     (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const M_NOEXACT = argv.includes('--stale-on-type');
const M_DESYNC = argv.includes('--desync');
const M_RESET = argv.includes('--staleexact-reset');

const EXACT_WRITE = 'if (c.isCurrency) slider.dataset.exactVal = String(raw);';
const RESET_CLEAR = "if (el.type === 'range') delete el.dataset.exactVal;";
let poison = 'none';

function mutate(file, text) {
  if (file === 'scripts/datum-shape.js' && (M_NOEXACT || M_DESYNC)) {
    const n = text.split(EXACT_WRITE).length - 1;
    if (n !== 1) { abort('the exactVal write anchor occurs ' + n + ' times in datum-shape.js (expected exactly 1)'); }
    text = text.replace(EXACT_WRITE, M_NOEXACT ? '/* severed */'
      : 'if (c.isCurrency) slider.dataset.exactVal = String(raw * 2);');
    poison = M_NOEXACT ? 'commitEdit moves the position but no longer updates exactVal (leaving the label-seeded boot value stale)' : 'commitEdit writes exactVal * 2 (desynced from the position)';
  }
  if (file === 'studio.html' && M_RESET) {
    const n = text.split(RESET_CLEAR).length - 1;
    if (n !== 1) { abort('the reset-clear anchor occurs ' + n + ' times in studio.html (expected exactly 1)'); }
    text = text.replace(RESET_CLEAR, '/* severed */');
    poison = 'Start Fresh no longer clears exactVal';
  }
  return text;
}
function abort(msg) {
  console.log('  ABORT: ' + msg + ' — the control did not land, and a mutation that does not apply produces a GREEN that certifies nothing.');
  console.log('\nOVERALL: RED');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  const rel = p.replace(/^\//, '');
  if (rel === 'studio.html' || rel === 'scripts/datum-shape.js') {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] });
    res.end(mutate(rel, fs.readFileSync(fp, 'utf8')));
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const blockClerk = (ctx) => ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
  return route.continue();
});

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

/* The three currency sliders, with the unit conversion each one's raw exactVal needs to be
   comparable with its scale. Taken from _scenarioFromInputs, which is the reader under test. */
const SLIDERS = [
  { slider: 'slider-portfolio', val: 'val-portfolio', scale: 'port', div: 1e6, typed: 1234567 },
  { slider: 'slider-contrib', val: 'val-contrib', scale: 'contrib', div: 1, typed: 23457 },
  { slider: 'slider-datum', val: 'val-datum', scale: 'datum', div: 1000, typed: 123457 }
];

/* FIXTURE, STATED IN FULL (seeded-fixture law): fresh page -> entry overlay "Start from Scratch"
   -> _studioEnterRoom('data') -> open #sec-sketch by a REAL click on its header. Nothing is forced
   visible; the drawer open is SETUP, and L0 proves the controls have real geometry before any leg
   rests on them. */
async function boot(ctx, BASE) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = document.getElementById('sec-sketch');
    const h = s.previousElementSibling;
    (h.querySelector('button,[role="button"],.section-header') || h).click();
  });
  await page.waitForFunction(() => {
    const e = document.getElementById('val-portfolio');
    if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  }, { timeout: 20000 });
  return page;
}

/* THE REAL CLICK-TO-TYPE PATH: click the value span (its handler reveals and focuses the input the
   module inserted next to it), type digits, blur to commit. No handler is called directly. */
const clickType = (page, valId, digits) => page.evaluate(function (a) {
  const el = document.getElementById(a[0]); if (!el) return 'no-val-el';
  el.click();
  let inp = el.nextElementSibling;
  while (inp && inp.tagName !== 'INPUT') inp = inp.nextElementSibling;
  if (!inp) return 'no-input';
  inp.value = String(a[1]);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.blur();
  return 'ok';
}, [valId, digits]);

/* ⛔ THE TOLERANCE IS COMPUTED IN THE PAGE FROM THE LIVE SCALE. The gate contains no epsilon. */
const readPairs = (page) => page.evaluate(function (defs) {
  const SC = window.DatumShape && window.DatumShape.scales;
  if (!SC) return { error: 'DatumShape.scales absent' };
  const fn = { port: SC.portPosToVal, contrib: SC.contribPosToVal, datum: SC.datumPosToVal };
  return defs.map(function (d) {
    const el = document.getElementById(d.slider);
    const f = fn[d.scale];
    const pos = parseInt(el.value, 10);
    const fromPos = f(pos);
    const tol = Math.max(Math.abs(f(pos + 1) - f(pos)), Math.abs(f(pos) - f(pos - 1)));
    const rawExact = el.dataset.exactVal;
    const present = rawExact !== undefined && rawExact !== '';
    const exactScaled = present ? (parseFloat(rawExact) / d.div) : null;
    return {
      id: d.slider, pos, fromPos, tol, present, rawExact: present ? rawExact : null, exactScaled,
      delta: present ? Math.abs(exactScaled - fromPos) : 0,
      agrees: present ? Math.abs(exactScaled - fromPos) <= tol : true
    };
  });
}, SLIDERS);

(async () => {
  await new Promise((r) => server.listen(8171, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8171';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await blockClerk(ctx);
  const p = await boot(ctx, BASE);

  /* ── L0 — THE PRECONDITION, ASSERTED BEFORE ANYTHING RESTS ON IT. */
  const geo = await p.evaluate((ids) => ids.map((i) => {
    const e = document.getElementById(i); const r = e ? e.getBoundingClientRect() : null;
    return { id: i, w: r ? Math.round(r.width) : -1, h: r ? Math.round(r.height) : -1 };
  }), SLIDERS.map((s) => s.val));
  const scalesOk = await p.evaluate(() => !!(window.DatumShape && window.DatumShape.scales) && typeof window._scenarioFromInputs === 'function');
  check('L0 INSTRUMENT: the sketch drawer is open, all three value controls have real geometry, and the scales + reader are reachable',
    geo.every((g) => g.w > 0 && g.h > 0) && scalesOk,
    JSON.stringify(geo) + ' scalesAndReader=' + scalesOk);

  const typedResults = [];
  for (const s of SLIDERS) typedResults.push(s.slider + '=' + await clickType(p, s.val, s.typed));
  await p.waitForTimeout(700);
  const after = await readPairs(p);
  if (after.error) { check('L0b scales', false, after.error); }

  /* ── L1 — PRESENCE. EXCLUSION NEEDS PRESENCE: L4 asserts the shadow value is GONE after a reset,
        and that claim is worthless unless it was HERE first. This is also --noexact's leg. */
  check('L1 PRESENCE: the real click-to-type path actually created a shadow value on all three sliders',
    Array.isArray(after) && after.length === 3 && after.every((r) => r.present),
    'drivers=' + typedResults.join(' ') + '\n          ' + (Array.isArray(after) ? after.map((r) => r.id + ' exactVal=' + r.rawExact).join(' · ') : String(after)));

  /* ── L2 — AGREEMENT, against a tolerance read from the live scale. --desync's leg. */
  const bad = Array.isArray(after) ? after.filter((r) => !r.agrees) : [];
  check('L2 AGREEMENT: every shadow value agrees with its slider position within the scale-derived tolerance',
    bad.length === 0,
    Array.isArray(after) ? after.map((r) => r.id + ': exact=' + (r.exactScaled === null ? 'absent' : r.exactScaled.toPrecision(8))
      + ' fromPos=' + r.fromPos.toPrecision(8) + ' delta=' + r.delta.toPrecision(4) + ' tol=' + r.tol.toPrecision(4)
      + (r.agrees ? ' OK' : '  <-- DISAGREES')).join('\n          ') : String(after));

  /* ── L3 — HONEST HALF: THE SHADOW VALUE MUST STILL BUY WHAT IT COSTS.
        Agreement is trivially satisfiable by never writing exactVal at all — an amputation that
        would silently destroy the precision the feature exists for. So assert the typed figure
        survives into the reader EXACTLY, and prove the leg could have failed by showing the
        position alone cannot express it. */
  const precision = await p.evaluate(function (t) {
    const sc = window._scenarioFromInputs();
    const SC = window.DatumShape.scales;
    const el = document.getElementById('slider-portfolio');
    return { fromReader: Math.round(sc.portfolioVol * 1e6), fromPositionOnly: Math.round(SC.portPosToVal(parseInt(el.value, 10)) * 1e6), typed: t };
  }, SLIDERS[0].typed);
  check('L3 HONEST HALF: the typed figure survives into the reader EXACTLY (the feature still buys its precision)',
    precision.fromReader === precision.typed && precision.fromPositionOnly !== precision.typed,
    'typed=' + precision.typed + ' reader=' + precision.fromReader + ' positionAlone=' + precision.fromPositionOnly
    + '  (positionAlone MUST differ, or this leg could not have failed)');

  /* ── L4 — THE RESET CLEARS THE SHADOW VALUE. --staleexact-reset's leg.
        HANDLER ONLY: clearDraftAndRefresh's banner is unreachable until F56 commit 2 wakes
        restoreDraft(). The subject here genuinely is the function. */
  await p.evaluate(() => window.clearDraftAndRefresh());
  await p.waitForTimeout(900);
  const afterReset = await readPairs(p);
  check('L4 RESET (HANDLER ONLY): after Start Fresh no slider retains a shadow value, and agreement holds',
    Array.isArray(afterReset) && afterReset.every((r) => !r.present && r.agrees),
    Array.isArray(afterReset) ? afterReset.map((r) => r.id + ' exactVal=' + (r.present ? r.rawExact + '  <-- SURVIVED' : 'absent')
      + ' pos=' + r.pos + ' fromPos=' + r.fromPos.toPrecision(6)).join('\n          ') : String(afterReset));

  await ctx.close(); await browser.close(); server.close();
  console.log('  poison: ' + poison);
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.log('OVERALL: RED');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
