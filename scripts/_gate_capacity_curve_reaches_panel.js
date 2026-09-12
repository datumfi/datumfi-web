/* @gate-pool: browser */
'use strict';
/* _gate_capacity_curve_reaches_panel.js — STANDING GATE for the Measurement Room wiring (2026-09-12).
 *
 * THE CLAIM: the engine's `capacity_curve` reaches the Measurement panel resampled onto the
 * panel's OWN spend window, so the confidence the chart reports at a given spend is the
 * confidence the engine computed at that spend — and when the data cannot support that, the panel
 * shows its empty state instead of a drawn guess.
 *
 * ⛔⛔ WHY THIS EXISTS, AND IT IS NOT "THE FIELD IS READ". `capacity_curve` shipped on every
 *    response and studio.html referenced it ZERO times, so the obvious wiring is to hand
 *    `success_rates` straight to render(). THAT WOULD BE CATASTROPHIC AND INVISIBLE.
 *    render() places point i evenly across [floor-12k, ceiling+12k]. The engine samples its own
 *    grid across the whole feasible sweep. MEASURED on three households:
 *        grid 18,225-248,225   panel window 31,000-77,000
 *        grid  8,710-248,710   panel window 26,000-60,000
 *        grid 39,710-249,710   panel window 78,000-144,000
 *    FOUR TO SIX TIMES WIDER, EVERY TIME. The raw array draws the engine's entire sweep squeezed
 *    inside the user's own range: confidence appearing to collapse from 100% to 0% between their
 *    Floor and their Ceiling, axis labels still correct, nothing thrown.
 * 🔑 SO THE PROPERTY WORTH GATING IS NOT PRESENCE, IT IS AGREEMENT: ask the panel what confidence
 *    it reports at the Floor, and ask the engine's own samples the same question. A presence
 *    assertion goes green on the catastrophe.
 *
 * ⛔ L3 IS THE REFUSAL LEG AND IT ASSERTS A BLANK SCREEN ON PURPOSE. Where the panel's window runs
 *    past the engine's grid and the grid end is NOT saturated, there is no measured confidence to
 *    draw and the scenario must be refused. The tempting repair — clamp to the nearest sample — is
 *    a measurement claim about a spend nobody computed. A blank panel is a normal display state
 *    here; a drawn guess is the defect this whole file exists to prevent.
 *
 * ⚠️ THE FIXTURE'S GEOMETRY IS REAL AND ITS RATES ARE SYNTHETIC, DELIBERATELY. Grid origin 18,225,
 *    $5,000 step, 47 points, floor 43,000 / keystone 57,000 / capstone 65,000 are the MEASURED
 *    baseline household (2026-09-12). The success rates are `1 - i/46` so that every expected
 *    value below is computable by hand rather than copied from a run — an expectation nobody can
 *    derive is an expectation nobody can check.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8219;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
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
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) < (tol || 1e-9);

/* ── THE FIXTURE, AND EVERY EXPECTED VALUE DERIVED FROM IT BY HAND ──────────────────────────────
   grid[i] = 18225 + 5000i, i = 0..46            rates[i] = 1 - i/46
   so success(s) = 1 - (s - 18225) / 230000 for s inside the grid.
   floor 43,000  ceiling 65,000  =>  panel window [31,000, 77,000]
     at  31,000 -> 1 - 12775/230000 = 0.944456521739...   (curve[0])
     at  77,000 -> 1 - 58775/230000 = 0.744456521739...   (curve[60])
     at  43,000 -> 1 - 24775/230000 = 0.892282608696...   (confidence AT THE FLOOR)
   ⛔ AND THE NUMBER THE RAW-ARRAY DEFECT PRODUCES AT THE FLOOR IS 0.739130..., because 47 points
      spread over the 46,000 window puts index 12 at $43,000. A 15-POINT CONFIDENCE ERROR, on a
      chart that would look completely normal. */
const FLOOR = 43000, KEYSTONE = 57000, CAPSTONE = 65000;
const AT_WIN_LO = 1 - 12775 / 230000;
const AT_WIN_HI = 1 - 58775 / 230000;
const AT_FLOOR  = 1 - 24775 / 230000;
const RAW_ARRAY_AT_FLOOR = 1 - 12 / 46;

const RESPONSE = {
  tiers: { blended: { bedrock: FLOOR, foundation: 52000, keystone: KEYSTONE, capstone: CAPSTONE } },
  capacity_curve: {
    spend_grid:    Array.from({ length: 47 }, (_, i) => 18225 + 5000 * i),
    success_rates: Array.from({ length: 47 }, (_, i) => 1 - i / 46),
    median_ending: Array.from({ length: 47 }, (_, i) => 2000000 - 40000 * i)
  }
};
const REQUEST = { retirement_age: 52.6, plan_end_age: 93 };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !!(window.DatumMeasurement && window.DatumMeasurement.fromEngine), null, { timeout: 9000 });

  /* ── L0 INSTRUMENT + HONEST HALF. With nothing stored, the read must report failure AND the panel
        must be empty. Without this, every refusal leg below is satisfied just as well by a mapper
        that returns null for everything — including the real data. */
  const cold = await page.evaluate(() => {
    window.sessionStorage.removeItem('datumfi_range');
    window.sessionStorage.removeItem('datumfi_studio_request');
    const ok = window.DatumMeasurement.renderFromSession();
    return { ok, floorSlot: (document.getElementById('mcFloorValue') || {}).textContent };
  });
  check('L0 INSTRUMENT: with no stored Range the panel reports no data and renders blank',
    cold.ok === false && (cold.floorSlot === '' || cold.floorSlot == null),
    'renderFromSession=' + cold.ok + ' mcFloorValue=' + JSON.stringify(cold.floorSlot));

  /* ── L1 THE CLAIM. A real response reaches the screen. */
  const warm = await page.evaluate((a) => {
    window.sessionStorage.setItem('datumfi_range', JSON.stringify(a[0]));
    window.sessionStorage.setItem('datumfi_studio_request', JSON.stringify(a[1]));
    const ok = window.DatumMeasurement.renderFromSession();
    const txt = (id) => (document.getElementById(id) || {}).textContent;
    return {
      ok,
      floor: txt('mcFloorValue'), datum: txt('mcDatumValue'), ceiling: txt('mcCeilingValue'),
      horizon: txt('mcHorizon'), terminal: txt('mcTerminal'), climate: txt('mcClimate'),
      curveD: (document.getElementById('mcCurveLine') || {}).getAttribute
        ? document.getElementById('mcCurveLine').getAttribute('d') : null
    };
  }, [RESPONSE, REQUEST]);
  check('L1 THE CLAIM: the stored engine response reaches the panel and draws a curve',
    warm.ok === true && warm.floor === '$43k' && warm.datum === '$57k' && warm.ceiling === '$65k'
      && typeof warm.curveD === 'string' && warm.curveD.length > 20,
    'ok=' + warm.ok + ' floor=' + warm.floor + ' datum=' + warm.datum + ' ceiling=' + warm.ceiling
    + ' curve path len=' + (warm.curveD ? warm.curveD.length : null));

  /* ── L2 THE AXIS LEG — the one this file exists for. */
  const axis = await page.evaluate((a) => {
    const M = window.DatumMeasurement, I = M._internal;
    const s = M.fromEngine(a[0], a[1]);
    if (!s) return { built: false };
    return {
      built: true,
      len: s.curve.length, engineLen: a[0].capacity_curve.spend_grid.length,
      points: I.curvePoints(),
      first: s.curve[0], last: s.curve[s.curve.length - 1],
      atFloor: I.successAtSpend(s, a[2]),
      bounds: I.bounds(s)
    };
  }, [RESPONSE, REQUEST, FLOOR]);

  check('L2a RESOLUTION: the curve is resampled to the panel\'s own point count, not handed over at the engine\'s',
    axis.built && axis.len === axis.points && axis.len !== axis.engineLen,
    'curve length=' + axis.len + ' panel points=' + axis.points + ' engine grid=' + axis.engineLen);

  check('L2b ALIGNMENT: the curve spans the PANEL window — its ends are the engine\'s confidence at that window\'s ends',
    near(axis.first, AT_WIN_LO) && near(axis.last, AT_WIN_HI),
    'curve[0]=' + axis.first + ' want ' + AT_WIN_LO
    + '  ·  curve[last]=' + axis.last + ' want ' + AT_WIN_HI
    + '\n          window=' + JSON.stringify(axis.bounds));

  check('L2c AGREEMENT: the confidence the panel reports at the Floor is the confidence the ENGINE computed there',
    near(axis.atFloor, AT_FLOOR, 1e-6),
    'panel says ' + axis.atFloor + ' at $' + FLOOR + '; engine samples say ' + AT_FLOOR
    + (near(axis.atFloor, RAW_ARRAY_AT_FLOOR, 1e-6)
      ? '\n          ⛔ THIS IS THE RAW-ARRAY VALUE — the engine\'s whole sweep has been drawn inside the user\'s own range'
      : ''));

  /* ── L3 THE REFUSAL LEG. The window runs below a grid that does NOT start saturated, so no
        measured confidence exists down there. Refuse rather than clamp. */
  const refused = await page.evaluate((a) => {
    const bad = JSON.parse(JSON.stringify(a[0]));
    bad.capacity_curve.spend_grid = bad.capacity_curve.spend_grid.map((v) => v + 20000); // grid now starts at 38,225 > window low 31,000
    bad.capacity_curve.success_rates[0] = 0.90;                                          // and NOT saturated
    const s = window.DatumMeasurement.fromEngine(bad, a[1]);
    const stillEmpty = (document.getElementById('mcFloorValue') || {}).textContent;
    window.DatumMeasurement.render(s);
    return { s: s, floorSlot: (document.getElementById('mcFloorValue') || {}).textContent, prev: stillEmpty };
  }, [RESPONSE, REQUEST]);
  check('L3 REFUSAL: a window running past an UNSATURATED grid is refused, not clamped — and the panel goes blank',
    refused.s === null && refused.floorSlot === '',
    'fromEngine returned ' + JSON.stringify(refused.s) + ' · mcFloorValue after render=' + JSON.stringify(refused.floorSlot)
    + '\n          ⛔ clamping to the nearest sample would assert a confidence nobody computed');

  /* ── L3b THE MIRROR. The SAME out-of-range window IS allowed when the grid end is saturated,
        because monotonicity pins the value there. Without this leg L3 would also pass on a mapper
        that refuses everything. */
  const allowed = await page.evaluate((a) => {
    const ok = JSON.parse(JSON.stringify(a[0]));
    ok.capacity_curve.spend_grid = ok.capacity_curve.spend_grid.map((v) => v + 20000);
    // success_rates[0] left at 1.0 — saturated, so below-grid confidence IS 1 by monotonicity
    const s = window.DatumMeasurement.fromEngine(ok, a[1]);
    return { built: !!s, first: s ? s.curve[0] : null };
  }, [RESPONSE, REQUEST]);
  check('L3b MIRROR: the same window IS accepted when the grid starts saturated, and reads 1.0 below it',
    allowed.built === true && near(allowed.first, 1),
    'built=' + allowed.built + ' curve[0]=' + allowed.first + ' want 1');

  /* ── L4 TERMINAL. Read from the engine's parallel median_ending array; blank when absent, never
        derived from a balance. */
  const term = await page.evaluate((a) => {
    const withMe = window.DatumMeasurement.fromEngine(a[0], a[1]);
    const without = JSON.parse(JSON.stringify(a[0]));
    delete without.capacity_curve.median_ending;
    const noMe = window.DatumMeasurement.fromEngine(without, a[1]);
    return { with: withMe && withMe.terminal, without: noMe && noMe.terminal, built: !!noMe };
  }, [RESPONSE, REQUEST]);
  check('L4 TERMINAL: the ending estate comes from median_ending, and is ABSENT rather than invented when the engine omits it',
    typeof term.with === 'string' && term.with.length > 1 && term.built === true && term.without === undefined,
    'with median_ending=' + JSON.stringify(term.with) + ' · without=' + JSON.stringify(term.without)
    + ' (scenario still built=' + term.built + ')');

  /* ── L5 NO INVENTED LABEL. mcClimate is a display string this file does not own and the outlook
        is mid-rename to the Datumae Blend. It must stay blank rather than guess. */
  check('L5 NO INVENTION: the market-outlook slot stays blank — no name is guessed for it',
    warm.climate === '' || warm.climate == null,
    'mcClimate=' + JSON.stringify(warm.climate));
  check('L5b but horizon IS derived, because it is arithmetic on two answers the user typed',
    warm.horizon === '40 yrs',
    'mcHorizon=' + JSON.stringify(warm.horizon) + ' want "40 yrs" (plan_end_age 93 - retirement_age 52.6)');

  /* ── L6 NO FORK. One reader of capacity_curve across every shipped script and the shell. A second
        mapper is how two surfaces come to disagree about the same household. */
  const files = [path.join(ROOT, 'studio.html'), path.join(ROOT, 'range.html')]
    .concat(fs.readdirSync(path.join(ROOT, 'scripts'))
      .filter((f) => /\.js$/.test(f) && !/^_/.test(f))
      .map((f) => path.join(ROOT, 'scripts', f)));
  const readers = files.filter((f) => fs.existsSync(f) && /capacity_curve/.test(fs.readFileSync(f, 'utf8')));
  check('L6 NO FORK: exactly one shipped file reads capacity_curve',
    readers.length === 1 && /studio-measurement\.js$/.test(readers[0]),
    'readers = ' + JSON.stringify(readers.map((f) => path.relative(ROOT, f)))
    + '\n          ⛔ two mappers is how two surfaces come to describe the same household differently');

  await ctx.close(); await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('REACH: DatumMeasurement.fromEngine / renderFromSession, driven directly.'
            + ' NO DOOR OPENS THIS PANEL IN THE PRODUCT YET — this gate proves the numbers are right,'
            + ' NOT that a user can reach them. The door is a navigation ruling, and when it lands it'
            + ' needs its own leg.');
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
