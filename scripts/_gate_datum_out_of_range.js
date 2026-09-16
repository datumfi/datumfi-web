/* @gate-pool: browser
 *
 * ══ A SPEND OUTSIDE THE DRAWN WINDOW IS ANSWERED HONESTLY, NOT CLAMPED ════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS BECAUSE THE PANEL PRINTED A CONFIDENCE FOR A SPEND IT NEVER READ.
 * Captain-measured on production, 2026-09-15. Floor $41k, Ceiling $68k, so the drawn window was
 * Floor-12k to Ceiling+12k = $29,000-$80,000. His target spend was $105,000.
 *   · position in that window = (105000-29000)/(80000-29000) = 1.4902
 *   · `successAtSpend` clamped it to 1.0 and returned the curve's LAST point
 *   · THE PANEL SHOWED THE CONFIDENCE AT $80,000 AND LABELLED IT "$105k" — a $25,000 gap
 *   · and "Failure rate" inherited it, because it is 1 minus the same number
 * ⛔ THE ERROR ALWAYS FLATTERS. Success falls as spend rises, so a clamp at the top of the window
 *    can only ever report MORE confidence than the truth. On a curve shaped like his the headline
 *    moved 53% -> 17% once it was read honestly.
 *
 * ⭐ AND THE NUMBER WAS NEVER MISSING, WHICH IS THE WHOLE REASON THIS IS A REPAIR AND NOT A
 * REFUSAL: `make_spend_grid` (engine/tiers.py) runs to at least $250,000, so $105,000 WAS
 * measured. The panel was reading its own 61-point resample of a narrow window instead of the
 * engine's grid. A RESAMPLE IS A VIEW, NOT A SOURCE.
 *
 * ── THE CONTRACT, FROM THE AUTHORED COPY (Engine Spec §82.1048, superseding §82.1043) ─────────
 *   A · above the Ceiling, INSIDE the grid  -> show the MEASURED percentage, name it as a trade
 *   B · beyond the grid                      -> NO percentage, anywhere, ever
 *   C · below the Floor                      -> reads as good news, not as an error
 * ⛔ AND IN ALL THREE THE MARKER IS PINNED AT THE EDGE SHOWING THE NUMBER THE USER TYPED. Never
 *   blank (that reads as broken) and never silently rewritten to the edge value (that is the
 *   original defect wearing a marker).
 *
 * ── WHY THESE LEGS, AND WHY NO SUBSET IS SUFFICIENT ───────────────────────────────────────────
 * ⛔ L1 ALONE (the right percentage) IS SATISFIED BY A PANEL THAT SHOWS NOTHING ELSE. L3 holds the
 *    marker: the value on the pill must be the typed number, or a "correct" headline sits beside a
 *    chart that has quietly moved the user's spend to $80k.
 * ⛔ L2 ALONE (a blank beyond the grid) IS SATISFIED BY A PANEL THAT NEVER SHOWS A PERCENTAGE AT
 *    ALL. L1 is its presence half — inside the grid a number is REQUIRED. Only L1 ∧ L2 says
 *    "measured means answered AND unmeasured means silent."
 * ⛔ L4 IS THE ONE THAT CATCHES THE REPAIR'S OWN FAILURE MODE, AND IT ALREADY DID: the first
 *    version of this fix printed "0%" in State B, because `pct(null)` is "0%". A guard had been
 *    applied to the derived failure rate and missed on the headline it derives from.
 * 🔑 So the contract is: the number is right, the absence is honest, the marker never lies about
 *    what the user asked for, and a null never renders as a zero.
 *
 * ⚠️ THE FIXTURE'S CURVE MUST NOT SATURATE FOR THE STATE-B ARM. If the last rate is already 0 the
 *    documented saturation licence legitimately permits reading past the grid, State B never fires
 *    and its leg passes over a path that did not run. That is not hypothetical — the first run of
 *    this gate hit exactly that and reported `above_measured` for a $400,000 spend.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8497;          /* claimed 2026-09-15. ⛔ NEVER 8001 — the suite's shared server. */
const PART = 'scripts/studio-measurement.js';

/* ⛔ §82.2428 — THE CONTROL REMOVES THE CAPABILITY, NOT ONE ROUTE TO IT. Dropping the engine grid
 * from the scenario is what makes an honest read IMPOSSIBLE: every consumer of `confidenceAt`
 * loses its source at once, and the panel is back to having only its own clamped resample. A
 * control that edited one call site would leave the other reading correctly. */
const KEEP_GRID = 'curve: curve, grid: grid, rates: rates };';
const DROP_GRID = 'curve: curve };';

const argv = process.argv.slice(2);
const NOGRID = argv.includes('--nogrid');
const CONTROLS = {
  '--nogrid': {
    what: 'drops the engine grid from the scenario — no route can answer a spend honestly',
    anchors: [{ file: PART, literal: KEEP_GRID, count: 1 }],
    reds: ['L1', 'L2'], expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_datum_out_of_range.js', controls: CONTROLS }));
  process.exit(0);
}

function poison(rel, body) {
  if (!NOGRID || rel !== PART) return body;
  const n = body.split(KEEP_GRID).length - 1;
  if (n !== 1) { console.log(`ABORT: --nogrid anchor matched ${n} times, expected 1`); process.exit(1); }
  return body.split(KEEP_GRID).join(DROP_GRID);
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
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

/* The Captain's own tiers. `saturate:false` keeps the top of the curve well above zero so the
   saturation licence cannot fire — see the fixture note in the header. */
function engineResponse(datum, saturate) {
  const grid = [], rates = [];
  for (let v = 20000; v <= 250000; v += 5000) {
    const t = (v - 20000) / 230000;
    grid.push(v);
    rates.push(saturate ? Math.max(0, 1 - Math.pow(t * 2.35, 1.35)) : Math.max(0.22, 1 - t * 0.78));
  }
  return {
    tiers: { blended: { bedrock: 41000, keystone: 55000, capstone: 68000 } },
    capacity_curve: { spend_grid: grid, success_rates: rates },
    success_rates: { datum_spend: datum }
  };
}

async function readPanel(page, res) {
  return page.evaluate(r => {
    const M = window.DatumMeasurement;
    const s = M.fromEngine(r, { retirement_age: 52, plan_end_age: 87 });
    if (!s) return { fatal: 'fromEngine returned null' };
    M.render(s);
    const txt = id => { const e = document.getElementById(id); return e ? (e.textContent || '').trim() : '(absent)'; };
    const host = document.getElementById('mcRangeState');
    const datumNode = document.querySelector('#mcCurveMarkers .mc-curve-node[data-node-kind="datum"]');
    return {
      confidence: txt('mcSuccess'),
      failure:    txt('mcFailure'),
      datumValue: txt('mcDatumValue'),
      stateKey:   host ? host.getAttribute('data-range-state') : null,
      note:       txt('mcRangeStateNote'),
      pillValue:  datumNode ? (datumNode.querySelector('.mc-curve-value') || {}).textContent : '(no marker)',
      pinned:     datumNode ? datumNode.getAttribute('data-pinned') === '1' : false
    };
  }, res);
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/clerk.browser.js*', r => r.fulfill({
    status: 200, contentType: 'text/javascript', body: 'window.Clerk={load:()=>Promise.resolve(),user:null};'
  }));
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
  await page.waitForTimeout(600);

  /* ── ARM A · the Captain's case: $105,000, above Ceiling, INSIDE the grid ─────────────────── */
  const a = await readPanel(page, engineResponse(105000, true));
  if (a.fatal) { console.log('ABORT: ' + a.fatal); await browser.close(); server.close(); process.exit(1); }

  /* ⛔ THE ASSERTION IS "NOT THE EDGE VALUE", NOT A PINNED PERCENTAGE. Pinning an expected number
     would make this leg a test of the fixture's curve shape. What must be true is that the answer
     came from the grid at $105,000 — so it must DIFFER from the confidence the old clamp returned
     at $80,000, which the same scenario still exposes through the positional reader. */
  const edge = await page.evaluate(r => {
    const M = window.DatumMeasurement;
    const s = M.fromEngine(r, { retirement_age: 52, plan_end_age: 87 });
    return Math.round(M._internal.successAtSpend(s, 105000) * 100) + '%';
  }, engineResponse(105000, true));

  ok('L1', 'a spend above the Ceiling but inside the grid gets a MEASURED percentage, not the window edge',
     /^\d+%$/.test(a.confidence) && a.confidence !== edge && a.stateKey === 'above_measured',
     `headline ${a.confidence} · clamped-edge read would have said ${edge} · state ${a.stateKey}`);

  ok('L3', 'the marker is pinned at the edge and still shows the number the user typed',
     a.pinned === true && a.pillValue === '$105k' && a.datumValue === '$105k',
     `pinned=${a.pinned} pill=${a.pillValue} readout=${a.datumValue}`);

  /* ── ARM B · beyond the grid on a NON-SATURATED curve: genuinely unmeasured ───────────────── */
  const b = await readPanel(page, engineResponse(400000, false));
  ok('L2', 'a spend beyond the grid shows NO percentage and says so in the authored words',
     b.confidence === '' && b.failure === '' && b.stateKey === 'above_unmeasured'
       && /not going to guess/.test(b.note),
     `confidence="${b.confidence}" failure="${b.failure}" state=${b.stateKey}`);

  ok('L4', 'a null confidence renders BLANK, never as 0% (the repair\'s own first defect)',
     b.confidence !== '0%' && b.failure !== '100%',
     `confidence="${b.confidence}" failure="${b.failure}"`);

  /* ── ARM C · below the Floor: must read as good news and still carry the typed number ─────── */
  const c = await readPanel(page, engineResponse(30000, true));
  ok('L5', 'a spend below the Floor gets the good-news state and keeps the typed number',
     c.stateKey === 'below_floor' && c.datumValue === '$30k' && /Every future we ran supports this/.test(c.note),
     `state=${c.stateKey} readout=${c.datumValue}`);

  ok('L0', 'the panel rendered all three states with a clean console',
     pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 2).join(' | ') : 'no page errors');

  await browser.close();
  server.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} · pass ${pass} · fail ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('GATE ERROR: ' + e.stack); try { server.close(); } catch (x) {} process.exit(1); });
