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
/* ⛔ studioSource() IS THE ONLY DOOR TO THE SHELL, AND _gate_studio_source ENFORCES IT — this file
   read studio.html off disk and that meta-gate went RED on it, correctly. A bare readFileSync
   censuses the SHELL ALONE, so the day the Measurement markup moves into a part file these legs
   would assert about a file that no longer contains what they name. They would not crash; they
   would go red in bulk for a reason unrelated to the room they guard.
   🔑 90 GATES AT RISK BECAME ONE HELPER. Reading around it puts this file back in the 90. */
const { studioSource } = require('./_studio_source.cjs');
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
/* ⛔ TARGET AND KEYSTONE ARE DELIBERATELY DIFFERENT NUMBERS, AND THE GATE IS WORTHLESS IF THEY
   EVER AGREE. The Datum is the user's own target spend; `keystone` is the engine's "spend at 90%
   success" tier. They sit in the same region of the ladder, so a fixture where they coincide
   cannot tell a correct mapper from one reading the wrong field. $54,000 vs $57,000 also lands on
   two DIFFERENT rounded percentages (84% vs 83%), so the confidence slot separates them too. */
const FLOOR = 43000, KEYSTONE = 57000, CAPSTONE = 65000, TARGET = 54000;
const AT_WIN_LO = 1 - 12775 / 230000;
const AT_WIN_HI = 1 - 58775 / 230000;
const AT_FLOOR  = 1 - 24775 / 230000;
const AT_TARGET = 1 - 35775 / 230000;   // 0.84446 -> 84%
const AT_KEYSTONE = 1 - 38775 / 230000; // 0.83141 -> 83%
const RAW_ARRAY_AT_FLOOR = 1 - 12 / 46;

const RESPONSE = {
  tiers: { blended: { bedrock: FLOOR, foundation: 52000, keystone: KEYSTONE, capstone: CAPSTONE } },
  /* The engine echoes the spend it actually computed against. This is the authority on what the
     panel's numbers describe, which is why the mapper reads it in preference to the request. */
  success_rates: { parametric: 0.82, bootstrap: 0.90, cape: 0.91, regime: 0.77, datum_spend: TARGET },
  capacity_curve: {
    spend_grid:    Array.from({ length: 47 }, (_, i) => 18225 + 5000 * i),
    success_rates: Array.from({ length: 47 }, (_, i) => 1 - i / 46),
    median_ending: Array.from({ length: 47 }, (_, i) => 2000000 - 40000 * i)
  }
};
const REQUEST = { retirement_age: 52.6, plan_end_age: 93, datum_spend: TARGET };

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
      success: txt('mcSuccess'),
      curveD: (document.getElementById('mcCurveLine') || {}).getAttribute
        ? document.getElementById('mcCurveLine').getAttribute('d') : null
    };
  }, [RESPONSE, REQUEST]);
  check('L1 THE CLAIM: the stored engine response reaches the panel and draws a curve',
    warm.ok === true && warm.floor === '$43k' && warm.ceiling === '$65k'
      && typeof warm.curveD === 'string' && warm.curveD.length > 20,
    'ok=' + warm.ok + ' floor=' + warm.floor + ' datum=' + warm.datum + ' ceiling=' + warm.ceiling
    + ' curve path len=' + (warm.curveD ? warm.curveD.length : null));

  /* ── L1b THE DATUM IS THE USER'S LINE, NOT THE ENGINE'S TIER. CAPTAIN-CAUGHT 2026-09-12, after
        the first version of this mapper read `tiers.keystone` and this gate did not notice.
        ⛔ WHY THE GATE MISSED IT: the fixture is the instrument. Both candidates sit between the
           Floor and the Ceiling and look equally plausible on screen, so a leg that only checks
           "a number appeared" cannot separate them. It took a fixture where the two DISAGREE.
        ⛔⛔ AND THE WRONG ANSWER IS SELF-CONCEALING, WHICH IS THE REAL LESSON. `keystone` is
           defined as "spend at 90% success", so reading it makes the confidence slot report ~90%
           BY CONSTRUCTION — measured 89.3% / 88.2% / 89.4% on three dissimilar households. The
           headline number would have been a CONSTANT that moved for nobody, on the figure a user
           is most likely to repeat out loud. The second leg below is what catches that: it asserts
           the confidence belongs to the USER'S spend, not to the tier.
        🔑 MEASURED, NOT ASSUMED, THAT THESE ARE DIFFERENT QUESTIONS: sweeping datum_spend from
           $40,000 to $100,000 leaves the ladder at 43,000/57,000/67,000 UNCHANGED while the
           success rate runs 99% to 8%. The ladder is what the estate can support; the Datum is
           what the user asked for. */
  check('L1b THE DATUM: the panel shows the USER\'S target spend, not the engine\'s 90%-success tier',
    warm.datum === '$54k',
    'mcDatumValue=' + JSON.stringify(warm.datum) + ' want "$54k" (the user\'s target)'
    + (warm.datum === '$57k'
      ? '\n          ⛔ THIS IS tiers.keystone — the ENGINE\'S recommendation shown where the USER\'S chosen line belongs'
      : ''));
  check('L1c and the confidence belongs to THAT spend — so it can vary, instead of reading ~90% for everyone',
    warm.success === Math.round(AT_TARGET * 100) + '%',
    'mcSuccess=' + JSON.stringify(warm.success) + ' want "' + Math.round(AT_TARGET * 100) + '%"'
    + (warm.success === Math.round(AT_KEYSTONE * 100) + '%'
      ? '\n          ⛔ this is the confidence at the KEYSTONE TIER, which is ~90% by definition for every household alive'
      : ''));

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

  /* ── L7 THE HERO BAND (batch 1 of the Phase V port, 2026-09-12).
        ⛔ L7a IS THE LEG THAT MATTERS AND IT ASSERTS AN ABSENCE. mcMiniDatum was DELETED in the
           same commit mcHeroDatum arrived, and the Architect's ruling is explicit that NO WINDOW
           IS AUTHORISED IN WHICH NEITHER EXISTS. A leg that only checked the hero renders would go
           green on a half-applied revert that removed the tile and lost the hero — leaving the
           user's own target spend on no surface at all.
        ⛔ L7c GUARDS A SILENT DUPLICATE. mcSuccess, mcClimate, mcClimateChip and mcHorizon MOVED
           out of the old chip row into the hero. If a merge ever restores the chip row beside it,
           getElementById returns the FIRST match and the second element never updates — a stale
           number sitting beside a live one, both looking current, nothing thrown. */
  const hero = await page.evaluate((a) => {
    window.sessionStorage.setItem('datumfi_range', JSON.stringify(a[0]));
    window.sessionStorage.setItem('datumfi_studio_request', JSON.stringify(a[1]));
    window.DatumMeasurement.renderFromSession();
    const txt = (id) => (document.getElementById(id) || {}).textContent;
    const count = (id) => document.querySelectorAll('#' + id).length;
    return {
      range: txt('mcHeroRange'), datum: txt('mcHeroDatum'),
      miniGone: document.getElementById('mcMiniDatum') === null,
      dupes: ['mcSuccess', 'mcClimate', 'mcClimateChip', 'mcHorizon', 'mcHeroDatum', 'mcHeroRange']
        .filter((id) => count(id) !== 1),
      foot: txt('mcFootCopy')
    };
  }, [RESPONSE, REQUEST]);

  check('L7a THE SWAP IS ATOMIC: the hero carries the target spend AND the mini tile it replaced is gone',
    hero.datum === '$54k' && hero.miniGone === true,
    'mcHeroDatum=' + JSON.stringify(hero.datum) + ' · mcMiniDatum present=' + !hero.miniGone
    + '\n          ⛔ no window is authorised in which neither exists');
  check('L7b the working range reads Floor to Ceiling',
    hero.range === '$43k — $65k',
    'mcHeroRange=' + JSON.stringify(hero.range) + ' want "$43k — $65k"');
  check('L7c NO DUPLICATE IDS: the four readouts that MOVED into the hero exist exactly once',
    hero.dupes.length === 0,
    'ids not appearing exactly once: ' + JSON.stringify(hero.dupes)
    + '\n          ⛔ a restored chip row would make getElementById update only the first');
  check('L7d the footer sentence names where each number comes from, and says 40,000',
    typeof hero.foot === 'string' && /stress battery/.test(hero.foot) && /40,000/.test(hero.foot),
    'mcFootCopy=' + JSON.stringify((hero.foot || '').slice(0, 90)));

  /* ── L8 THE PATH COUNT. The live page said 10,000 for months; the measured figure is 40,000 --
        four market engines at 10,000 paths each. This asserts over the WHOLE shell, not the panel,
        because the wrong number appeared in several places and a leg scoped to one would pass
        while the others stayed stale. */
  /* ⛔⛔ THE PANEL SLICE COUNTS NESTING, AND THE FIRST VERSION DID NOT — IT CUT AT THE FIRST
     `</section>`, WHICH CLOSES AN INNER ONE. The overlay contains nested sections (mc-premium-hero,
     mc-chart), so the slice ended a few hundred bytes in and this leg was reading a FRAGMENT. It
     went green on the whole panel and stayed green when the distribution face was reverted to
     "10,000 futures" — the exact regression it exists to catch. Caught by its own red-first run.
     🔑 A SCOPE BUG IN AN INSTRUMENT DOES NOT LOOK LIKE A BUG. IT LOOKS LIKE GOOD NEWS. */
  const shell = studioSource();
  const start = shell.indexOf('<section class="mc-overlay"');
  let depth = 0, end = start;
  for (const m of shell.slice(start).matchAll(/<section\b|<\/section>/g)) {
    depth += m[0] === '</section>' ? -1 : 1;
    if (depth === 0) { end = start + m.index + m[0].length; break; }
  }
  /* ⛔ HTML COMMENTS ARE STRIPPED, AND THAT TOO CAME FROM A RED-FIRE. The leg first matched the
     comment that DOCUMENTS the fix — the note recording that the live page used to say "10,000
     futures". An instrument that forbids describing the defect it prevents makes the code less
     legible for nothing, and the pressure it creates is to delete the explanation, not the defect.
     🔑 GATE THE RENDERED TEXT, NOT THE SOURCE THAT EXPLAINS IT. */
  const panel = shell.slice(start, end).replace(/<!--[\s\S]*?-->/g, ' ');
  check('L8 PATH COUNT: no "10,000 futures" survives in the Measurement panel',
    !/10,000\s+futures/i.test(panel),
    'occurrences of "10,000 futures" in the panel: '
    + ((panel.match(/10,000\s+futures/gi) || []).length)
    + '\n          ⛔ 40,000 is the measured figure: 10,000 paths from each of four market engines');

  /* ── L9 THE TAX FACE (batch 2, 2026-09-12).
        ⛔ L9c IS THE LEG THAT EARNS THIS BLOCK. A band must be drawn only from MEASURED edges. The
           web ships before the container rebuilds, so for that interval the response carries a
           median and no p25/p75 — and the tempting repair is an envelope derived from the median
           (±x%, or a fraction of the value). That would draw a spread nobody computed, on the one
           face whose entire subject IS the spread. Absent band ⇒ no path, and the authored
           sentence says so rather than claiming an interquartile range that is not there.
        ⛔ L9d: A COMPUTED ZERO IS A RESULT. An all-zero series must show the Architect's zero-state
           sentence, NOT the empty state — the bridge years genuinely pay 0% federal, and routing
           that into an absence would tell a user we could not answer when we did. */
  /* The axis is now computed per household, so the gate computes the SAME way and checks the
     labels agree with the line. ⛔ IT DOES NOT HARDCODE 25 ANY MORE — a leg pinned to the old
     constant would have gone red on the correct rescale and green on a rescale that forgot to
     move the labels, which is precisely backwards. */
  const TAXY = (r, ceiling) => 206 - ((r * 100) / ceiling) * (206 - 28);
  const tax = await page.evaluate((a) => {
    const M = window.DatumMeasurement;
    const withBand = Object.assign({}, a[0], {
      eff_rate_by_year: [0.02, 0.04, 0.06],
      eff_rate_p25_by_year: [0.01, 0.03, 0.05],
      eff_rate_p75_by_year: [0.03, 0.05, 0.07]
    });
    M.render(M.fromEngine(withBand, a[1]));
    const band = (document.getElementById('mcTaxBand') || {}).getAttribute
      ? document.getElementById('mcTaxBand').getAttribute('d') : null;
    const I = M._internal;
    const labels = [...document.querySelectorAll('#mcTaxYLabels text')];
    const grid = [...document.querySelectorAll('#mcTaxGrid line')];
    const out = {
      // the ceiling chooser, probed directly at three shapes of household
      ceilingLow:  I.taxCeiling([0.002, 0.001], null),
      ceilingMid:  I.taxCeiling([0.02, 0.04, 0.06], [0.03, 0.05, 0.07]),
      ceilingHigh: I.taxCeiling([0.30, 0.22], null),
      overCapY: I.taxY(0.30, I.taxCeiling([0.30, 0.22], null)),
      topLabel: labels.length ? labels[0].textContent : null,
      lowestLabel: labels.length ? labels[labels.length - 1].textContent : null,
      lowestGridY: grid.length ? parseFloat(grid[grid.length - 1].getAttribute('y1')) : null,
      labelCount: labels.length,
      line: document.getElementById('mcTaxLine').getAttribute('d'),
      band: band,
      rate: document.getElementById('mcTaxRate').textContent,
      spread: document.getElementById('mcTaxSpreadCopy').textContent,
      axes: document.getElementById('mcTaxAxes').innerHTML,
      zeroHidden: document.getElementById('mcTaxZero').hidden
    };
    // median only — no p25/p75, the pre-rebuild response
    const noBand = Object.assign({}, a[0], { eff_rate_by_year: [0.02, 0.04, 0.06] });
    M.render(M.fromEngine(noBand, a[1]));
    out.bandWhenAbsent = document.getElementById('mcTaxBand').getAttribute('d');
    out.spreadWhenAbsent = document.getElementById('mcTaxSpreadCopy').textContent;
    out.lineWhenAbsent = document.getElementById('mcTaxLine').getAttribute('d');
    // an all-zero series — the computed zero
    const zeroSeries = Object.assign({}, a[0], { eff_rate_by_year: [0, 0, 0, 0] });
    M.render(M.fromEngine(zeroSeries, a[1]));
    out.zeroShown = !document.getElementById('mcTaxZero').hidden;
    out.zeroRate = document.getElementById('mcTaxRate').textContent;
    return out;
  }, [RESPONSE, REQUEST]);

  /* ⚠️ THE VIEW COMMITS AFTER THE FLIP, SO THIS LEG MUST WAIT — and the first version did not,
     reading "curve" 0ms after asking for "tax" and going red on working code. The 145ms delay is
     the MOCK'S OWN: setView adds .is-flipping, waits, then commits, so the faces swap at the
     midpoint of the card turn rather than snapping before it. Porting faithfully means keeping it.
     🔑 A GATE THAT IGNORES AN ANIMATION IT PORTED ON PURPOSE IS MEASURING A DIFFERENT PRODUCT. */
  await page.evaluate(() => window.DatumMeasurement.setView('tax'));
  await page.waitForTimeout(320);
  tax.viewAfterSetView = await page.evaluate(() =>
    document.getElementById('mcVisualSwitch').getAttribute('data-view'));
  tax.tabSelected = await page.evaluate(() => {
    const t = document.querySelector('[data-mc-view-tab="tax"]');
    return t ? t.getAttribute('aria-selected') : null;
  });

  check('L9a THE CLAIM: the tax face draws a median line, a first-year rate and a year axis',
    typeof tax.line === 'string' && tax.line.length > 10 && tax.rate === '2%'
      && /Year 1/.test(tax.axes) && /Year 3/.test(tax.axes),
    'line len=' + (tax.line || '').length + ' mcTaxRate=' + JSON.stringify(tax.rate)
    + ' axes=' + JSON.stringify((tax.axes || '').replace(/<[^>]+>/g, '|').slice(0, 60)));

  /* ── L9b THE RESCALE. Three properties, and the third is the one that keeps the promise the old
        static axis used to keep for free. */
  check('L9b SCALE: a low-tax household gets a ceiling it can actually use, floored at 5% and never fitted',
    tax.ceilingLow === 5 && tax.ceilingHigh === 40 && tax.ceilingMid === 10 && tax.overCapY >= 28,
    'ceiling for a 30% top=' + tax.ceilingHigh + ' (want >=30: the axis EXTENDS rather than clipping,'
    + ' and its 30% point lands at y=' + (tax.overCapY||0).toFixed(1) + ' which must stay inside the plot top y=28).'
    + ' EXACT, not >=30: a restored Math.min(25) clamp also yields 30, so a loose assertion cannot see it)'
    + ' · for a 7% band top=' + tax.ceilingMid + ' (want 10: 7 x 1.15 headroom = 8.05, so 8 is too tight)'
    + ' · for a 0.2% top=' + tax.ceilingLow + ' (want 5 — the floor, so rounding dust is not drama)');

  check('L9b2 ZERO IS ALWAYS THE BOTTOM: the axis never fits its minimum to the data',
    tax.lowestLabel === '0%' && Math.abs(tax.lowestGridY - 206) < 0.6,
    'lowest y-label=' + JSON.stringify(tax.lowestLabel) + ' at y=' + tax.lowestGridY
    + '\n          ⛔ a fitted floor redraws six years of MEASURED zero as six years of some tax');

  check('L9b3 ONE SCALE: the drawn line lands exactly where the emitted labels say it should',
    typeof tax.line === 'string'
      && tax.line.indexOf(TAXY(0.02, tax.ceilingMid).toFixed(1)) >= 0
      && tax.line.indexOf(TAXY(0.06, tax.ceilingMid).toFixed(1)) >= 0
      && tax.topLabel === '10%',
    'ceiling=' + tax.ceilingMid + ' top label=' + JSON.stringify(tax.topLabel)
    + ' · want y=' + TAXY(0.02, tax.ceilingMid).toFixed(1) + ' for 2% and y='
    + TAXY(0.06, tax.ceilingMid).toFixed(1) + ' for 6%'
    + '\n          line=' + JSON.stringify((tax.line || '').slice(0, 80))
    + '\n          ⛔ labels and curve must come from ONE ceiling — written twice they agree today'
    + ' and drift silently, with both halves still rendering');

  check('L9c NO INVENTED SPREAD: band drawn when p25/p75 arrive, ABSENT when they do not — and the line survives',
    typeof tax.band === 'string' && tax.band.length > 10
      && tax.bandWhenAbsent === null
      && typeof tax.lineWhenAbsent === 'string' && tax.lineWhenAbsent.length > 10
      && /not yet modelled/i.test(tax.spreadWhenAbsent)
      && /interquartile band across 40,000/i.test(tax.spread),
    'band present=' + (typeof tax.band === 'string')
    + ' · band when p25/p75 absent=' + JSON.stringify(tax.bandWhenAbsent)
    + ' · line still drawn=' + (typeof tax.lineWhenAbsent === 'string')
    + '\n          copy with band: ' + JSON.stringify(tax.spread)
    + '\n          copy without:   ' + JSON.stringify(tax.spreadWhenAbsent));

  check('L9d A COMPUTED ZERO IS A RESULT: an all-zero series shows the zero state, not an absence',
    tax.zeroShown === true && tax.zeroHidden === true && tax.zeroRate === '0%',
    'zero state shown on all-zero series=' + tax.zeroShown
    + ' · hidden on a non-zero series=' + tax.zeroHidden
    + ' · mcTaxRate=' + JSON.stringify(tax.zeroRate));

  check('L9e THE FACE HAS BOTH DOORS: the tab segment switches the view AND marks itself selected',
    tax.viewAfterSetView === 'tax' && tax.tabSelected === 'true',
    'data-view after setView("tax")=' + JSON.stringify(tax.viewAfterSetView)
    + ' · tax tab aria-selected=' + JSON.stringify(tax.tabSelected)
    + '\n          ⛔ aria-selected is asserted separately: a face that switches while the tab still'
    + ' reads unselected is a screen reader announcing the wrong view');

  const shellSrc = studioSource();
  check('L9f the tax tile is keyboard-reachable, not mouse-only',
    /data-mc-tax-tile/.test(shellSrc) && /role="button"[^>]*data-mc-tax-tile|data-mc-tax-tile[\s\S]{0,200}?tabindex="0"|tabindex="0"[^>]*data-mc-tax-tile/.test(shellSrc),
    'tile present=' + /data-mc-tax-tile/.test(shellSrc)
    + ' · it is a div acting as a button, so tabindex and role are the whole accessibility story');

  /* ── L10 THE CONVERGENCE SWARM — PACED TO THE WORK, NOT TO A CLOCK.
        ⛔ L10a IS THE LEG THAT EARNS IT. The Mock resolves on fixed timers because it has nothing
           to wait for. This screen exists because the engine takes 10-15 seconds, so it must
           outlive a SLOW answer — a progress animation that finishes before the work does is a
           spinner that lies, and it teaches the user the screen is decoration.
        ⛔ L10c: THE PROBABILITY MUST NOT EXIST BEFORE THE ANSWER DOES. The Mock ships a fixture
           79% present from the first frame. A probability rendered before the computation returns
           is the purest form of the defect this whole arc has been removing. */
  const swarm = await page.evaluate(async (a) => {
    const M = window.DatumMeasurement;
    const ov = document.getElementById('mcConvergenceSwarm');
    const out = {};

    // A SLOW answer: the swarm must still be up well after the Mock's 3.9s script would have ended.
    let release;
    const slow = new Promise((r) => { release = () => r(a[0]); });
    const running = M.runConvergence(slow, { request: a[1], horizon: '31 yrs' });
    await new Promise((r) => setTimeout(r, 900));
    out.upEarly = ov.hidden === false;
    out.badgeEarly = (document.getElementById('mcConvergenceSuccess') || {}).textContent;
    out.pathCount = document.querySelectorAll('#mcConvergenceSwarmPaths path').length;
    await new Promise((r) => setTimeout(r, 4200));            // past 3920ms, the Mock's whole run
    out.stillUpAt5s = ov.hidden === false;
    out.statusWhileWaiting = (document.getElementById('mcConvergenceStatus') || {}).textContent;
    release();
    await running;
    out.downAfter = ov.hidden === true;
    out.badgeAfter = (document.getElementById('mcConvergenceSuccess') || {}).textContent;
    out.statusAfter = (document.getElementById('mcConvergenceStatus') || {}).textContent;

    // A FAST answer must still be visible, not a flash.
    const t0 = Date.now();
    await M.runConvergence(Promise.resolve(a[0]), { request: a[1], horizon: '31 yrs' });
    out.fastMs = Date.now() - t0;

    // A REJECTED answer must not leave a progress screen up.
    try { await M.runConvergence(Promise.reject(new Error('boom')), { request: a[1] }); } catch (e) { out.threw = true; }
    out.downAfterReject = ov.hidden === true;
    return out;
  }, [RESPONSE, REQUEST]);

  check('L10a PACED TO THE WORK: the swarm is still up 5s in when the engine has not answered',
    swarm.upEarly === true && swarm.stillUpAt5s === true && swarm.downAfter === true,
    'up at 0.9s=' + swarm.upEarly + ' · still up at ~5.1s=' + swarm.stillUpAt5s
    + ' · down after the promise settles=' + swarm.downAfter
    + '\n          ⛔ the Mock would have closed at 3920ms regardless — a spinner that lies');

  check('L10b IT DOES NOT FLASH: a warm cache answering instantly still shows the sequence',
    swarm.fastMs >= 1400,
    'fast-path duration=' + swarm.fastMs + 'ms (floor is 1400) — without it a sub-second answer'
    + ' renders as a glitch');

  check('L10c NO PROBABILITY BEFORE THE ANSWER: the badge is empty while computing, filled after',
    (swarm.badgeEarly === '' || swarm.badgeEarly == null) && /^\d+%$/.test(swarm.badgeAfter || ''),
    'badge while computing=' + JSON.stringify(swarm.badgeEarly)
    + ' · after=' + JSON.stringify(swarm.badgeAfter)
    + '\n          ⛔ the Mock ships a fixture 79% present from the first frame');

  check('L10d the status says what is happening, and the swarm draws its paths',
    /computing/i.test(swarm.statusWhileWaiting || '') && /complete/i.test(swarm.statusAfter || '')
      && swarm.pathCount === 100,
    'status while waiting=' + JSON.stringify(swarm.statusWhileWaiting)
    + ' · after=' + JSON.stringify(swarm.statusAfter) + ' · paths=' + swarm.pathCount);

  check('L10e A FAILED COMPUTE CLOSES THE SCREEN: rejection propagates and leaves nothing up',
    swarm.threw === true && swarm.downAfterReject === true,
    'rejection reached the caller=' + swarm.threw + ' · overlay hidden=' + swarm.downAfterReject
    + '\n          ⛔ a progress screen left up over a failure is worse than no progress screen');

  /* ── L11 EVERY INTERACTIVE CONTROL HAS A LISTENER. Architect-ruled permanent, 2026-09-12, after
        the "Show distribution" toggle was found with ZERO handlers — rendered, aria-pressed frozen,
        and the face behind it unreachable since the day it was ported.
        🔑 A CONTROL WITH NO LISTENER IS NOT A PARTIAL FEATURE. IT IS A PICTURE OF A CONTROL, AND
           IT READS AS SHIPPED TO EVERYONE, INCLUDING THE PEOPLE WHO BUILT IT.
        ⛔ IT ASSERTS A BINDING, NOT A RENDER. getEventListeners is a devtools-only API, so the
           binding is observed the only way a page can observe it: dispatch a real click at the
           control and require the application to CHANGE STATE. A handler that exists and does
           nothing fails this leg, which is the correct outcome — the defect being prevented is
           "nothing happens when you press it", not "no function was attached". */
  const controls = await page.evaluate(async () => {
    const res = {};
    const fire = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const sw = document.getElementById('mcVisualSwitch');

    // every view tab must move the face it names
    res.tabs = [];
    for (const tab of document.querySelectorAll('[data-mc-view-tab]')) {
      const want = tab.getAttribute('data-mc-view-tab');
      window.DatumMeasurement.setView(want === 'curve' ? 'tax' : 'curve');
      await new Promise((r) => setTimeout(r, 320));
      fire(tab);
      await new Promise((r) => setTimeout(r, 320));
      res.tabs.push({ want, got: sw.getAttribute('data-view') });
    }
    // the tax tile must open the tax face
    window.DatumMeasurement.setView('curve');
    await new Promise((r) => setTimeout(r, 320));
    const tile = document.querySelector('[data-mc-tax-tile]');
    if (tile) { fire(tile); await new Promise((r) => setTimeout(r, 320)); }
    res.tileOpens = sw.getAttribute('data-view');
    // every close control must close the panel
    document.getElementById('mcOverlay').hidden = false;
    document.getElementById('mcOverlay').classList.add('open');
    const closers = [...document.querySelectorAll('#mcOverlay [data-mc-close]')];
    res.closerCount = closers.length;
    fire(closers[0]);
    await new Promise((r) => setTimeout(r, 400));
    res.closed = document.getElementById('mcOverlay').hidden === true;
    return res;
  });

  const deadTabs = (controls.tabs || []).filter((t) => t.want !== t.got);
  check('L11a EVERY VIEW TAB IS BOUND: clicking each one actually moves the face it names',
    deadTabs.length === 0 && controls.tabs.length === 3,
    'tabs tested=' + controls.tabs.length + ' · not bound: ' + JSON.stringify(deadTabs)
    + '\n          ⛔ this is the leg the old "Show distribution" toggle would have failed for months');
  check('L11b THE TAX TILE IS BOUND: clicking it opens the tax face',
    controls.tileOpens === 'tax',
    'view after clicking the tile=' + JSON.stringify(controls.tileOpens));
  check('L11c EVERY CLOSE CONTROL IS BOUND: the panel actually closes',
    controls.closerCount >= 1 && controls.closed === true,
    'close controls found=' + controls.closerCount + ' · panel hidden after click=' + controls.closed);

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
