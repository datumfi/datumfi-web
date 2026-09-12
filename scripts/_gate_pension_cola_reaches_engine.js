/* @gate-pool: browser */
'use strict';
/* _gate_pension_cola_reaches_engine.js — STANDING GATE for the pension COLA wiring (2026-09-12).
 *
 * THE CLAIM: when a household owns a pension, the body POSTed to /api/calculate carries that
 * pension's cost-of-living adjustment, AS A FRACTION, blended by the dollars each pension pays —
 * and when there is no pension, the client sends no such key at all.
 *
 * ⛔⛔ WHY THIS EXISTS. The control has existed for months (scripts/studio-account-modal.js:1417
 *    renders it on every pension room) and the value never left the browser. The engine then made
 *    `pension_cola` REQUIRED with no default (engine/income.py:206), so the gap stopped being
 *    cosmetic and became a 422 for every pension household the moment the container rebuilt.
 * 🔑 A FIELD THE USER FILLS IN AND NOTHING READS IS THE SAME DEFECT AS A FIELD THAT DOES NOT
 *    EXIST, WEARING BETTER CLOTHES. Nothing on screen distinguishes the two.
 *
 * ⛔ L2 IS THE LEG THAT EARNS THIS FILE. The control is PERCENT, the engine field is a FRACTION
 *    bounded ge=0 le=0.2. A missing divide turns 2% into 200%, which the bound REFUSES loudly and
 *    which therefore needs no gate — but it also turns a 0.2% adjustment into 20%, which lands
 *    exactly ON the bound and PASSES. So the dangerous half of this bug is the half that
 *    validates, and only an assertion on the VALUE can see it. Asserting "the key is present"
 *    would go green on both.
 *
 * ⛔ L3 SEPARATES THE RIGHT BLEND FROM THE PLAUSIBLE WRONG ONE. The engine sums every pension into
 *    ONE base and applies ONE rate, so N pensions have exactly one correct scalar: weighted by the
 *    dollars each pays. $30k at 2% and $10k at 0% is 1.5%, not 1%. An unweighted mean is the
 *    obvious way to write this, is wrong, and AGREES WITH THE CORRECT ANSWER ON EVERY
 *    SINGLE-PENSION HOUSEHOLD — which is nearly all of them.
 * 🔑 A FIXTURE WITH ONE PENSION IN IT CANNOT SEE THIS DEFECT AT ALL. That is why L3 exists as its
 *    own leg with its own household rather than as a second assertion on L1's.
 *
 * ⛔ L4 IS THE ADMISSION LEG. `has_pension` is derived SERVER-SIDE from the rooms that ARRIVE, so a
 *    room this payload drops must not vote on the rate. An empty pension room pulling the blend
 *    toward its own 0 would lower a real household's income growth with every other gate green.
 *
 * ⛔ L5 IS A SOURCE ASSERTION AND IT IS THE ANTI-FORK LEG. The co-architect defect was never a
 *    wrong value — it was a derivation living in ONE of two payload builders. A behavioural leg
 *    cannot see a SECOND assignment site being added next month; only a census can.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { seedCompleteHousehold } = require('./_seed_household.cjs');
/* ⛔ studioSource() COMPOSES THE SHELL PLUS THE FIVE PART FILES — a bare readFileSync of
   studio.html would census the shell alone, and a forked derivation living in a part would be
   invisible to L5, which is the one leg whose whole job is to find a second copy. */
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8217;

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

/* ⚠️ FLOAT COMPARISON WITH A NAMED TOLERANCE. 0.015 is not exactly representable and
   `(30000*2 + 10000*0) / 40000 / 100` is three operations away from it. 1e-12 is far tighter than
   any defect this gate is looking for — the smallest one (unweighted vs weighted) is 0.005, five
   billion times the tolerance — so this cannot launder a wrong answer into a pass. */
const near = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-12;

/* Build a pension room and set its annual amount and its COLA, in the control's own units
   (PERCENT — `cola: 2` is 2%/yr, exactly what a user types into the field). */
const addPension = (page, annual, colaPct) => page.evaluate((a) => {
  addInstance('pension');
  const p = window.state.accounts.filter((x) => x.baseId === 'pension').pop();
  p.inflow = a[0];
  p.cola = a[1];
  return p.id;
}, [annual, colaPct]);

const clearPensions = (page) => page.evaluate(() => {
  let i = window.state.accounts.length;
  while (i--) if (window.state.accounts[i].baseId === 'pension') window.state.accounts.splice(i, 1);
});

const payload = (page) => page.evaluate(() => {
  const r = (typeof window._buildStudioRequest === 'function') ? window._buildStudioRequest() : null;
  if (!r) return { built: false };
  return {
    built: true,
    pension_cola: r.pension_cola,
    hasKey: Object.prototype.hasOwnProperty.call(r, 'pension_cola'),
    pensions: (r.accounts || []).filter((a) => a.type === 'pension')
      .map((a) => a.annual_contribution),
    current_age: r.current_age, retirement_age: r.retirement_age
  };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:' + PORT;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(800);

  /* ⛔ THE HOUSEHOLD IS SCENERY; THE PENSION IS THE SUBJECT. Scenery still has to be complete or
     every assertion below is measured over a null. The seeder derives the required set from the
     product's own refusals, so a new required field is answered here without editing this file. */
  const _seeded = await seedCompleteHousehold(page);
  check('L0b INSTRUMENT: every control the product requires is answered — the fixture cannot lag a new required field',
    _seeded.complete, 'rounds=' + _seeded.rounds + ' answered=' + JSON.stringify(_seeded.answered)
    + (_seeded.complete ? '' : '  STILL REFUSING: ' + _seeded.refusing.map((r) => r.target).join(',')));

  /* ── L0 INSTRUMENT + HONEST HALF. A household with NO pension must build a REAL payload that
        carries no `pension_cola` at all. Without this, every absence assertion below is satisfied
        just as well by a builder that returns null — and the engine gates the whole question on
        `has_pension`, so a key sent here would be a caller answering a question nobody asked. */
  const noPension = await payload(page);
  check('L0 INSTRUMENT: a pension-less household builds a real payload and sends NO pension_cola key',
    noPension.built && noPension.hasKey === false
      && noPension.current_age > 0 && noPension.retirement_age > 0,
    'built=' + noPension.built + ' hasKey=' + noPension.hasKey
    + ' pension_cola=' + JSON.stringify(noPension.pension_cola)
    + ' current_age=' + noPension.current_age + ' retirement_age=' + noPension.retirement_age);

  /* ── L1 THE CLAIM — one pension, $40,000/yr, 2% adjustment. */
  await addPension(page, 40000, 2);
  await page.waitForTimeout(200);
  const one = await payload(page);
  check('L1 THE CLAIM: a household that owns a pension tells the engine its adjustment',
    one.built && one.hasKey === true && Number.isFinite(one.pension_cola),
    'hasKey=' + one.hasKey + ' pension_cola=' + JSON.stringify(one.pension_cola)
    + ' pension rooms in payload=' + JSON.stringify(one.pensions));

  /* ── L2 THE UNIT LEG. 2 on the control must arrive as 0.02, NOT as 2.
        ⛔ THE SECOND HALF OF THIS LEG IS NOT DECORATION. Asserting only `=== 0.02` would also pass
           if someone later clamped every value into range. Asserting that the RAW control value is
           NOT what shipped names the specific defect — the percent reaching the engine unconverted
           — so the leg fails with the cause on screen rather than with a number mismatch. */
  check('L2 THE UNIT: the control is PERCENT and the engine field is a FRACTION — 2% ships as 0.02',
    near(one.pension_cola, 0.02) && one.pension_cola !== 2,
    'pension_cola=' + JSON.stringify(one.pension_cola) + '  want 0.02'
    + (one.pension_cola === 2 ? '  ⛔ THE RAW PERCENT SHIPPED — the engine reads this as 200%/yr' : ''));
  check('L2b and it sits inside the engine bound ge=0 le=0.2, which a 0.2% adjustment sent unconverted would NOT',
    one.pension_cola >= 0 && one.pension_cola <= 0.2,
    'pension_cola=' + JSON.stringify(one.pension_cola));

  /* ── L3 THE WEIGHT LEG. $30k at 2% + $10k at 0% is 1.5% on the $40k — NOT the 1% an unweighted
        mean gives. This is the household L1 cannot be: with one pension the two answers agree. */
  await clearPensions(page);
  await addPension(page, 30000, 2);
  await addPension(page, 10000, 0);
  await page.waitForTimeout(200);
  const two = await payload(page);
  check('L3 THE BLEND: two pensions blend by the DOLLARS each pays, not by how many there are',
    near(two.pension_cola, 0.015),
    'pension_cola=' + JSON.stringify(two.pension_cola) + '  want 0.015'
    + (near(two.pension_cola, 0.01)
      ? '  ⛔ THIS IS THE UNWEIGHTED MEAN — correct on every one-pension household, wrong on this one'
      : '')
    + '  rooms=' + JSON.stringify(two.pensions));

  /* ── L4 THE ADMISSION LEG, AND ITS FIXTURE IS THE WHOLE POINT OF IT.
        ⛔⛔ WRITTEN ONCE AS AN EMPTY GREEN AND CAUGHT BY ITS OWN RED-FIRST RUN (2026-09-12). The
           first version added a $0/yr room at 9% to the $30k+$10k household above and asserted the
           blend did not move. It passed — AND IT PASSED WITH THE ADMISSION FILTER DELETED, because
           a room the filter drops always has `inflow === 0`, so in the WEIGHTED path it carries
           ZERO WEIGHT BY CONSTRUCTION. The leg was true for a reason it did not name.
        ⭐ THAT IS WORTH RECORDING RATHER THAN HIDING: on the weighted path the invariant holds
           whether or not anyone remembers to filter. It is a property of the arithmetic.
        ⛔ THE FALLBACK PATH IS WHERE IT IS NOT. When every pension room pays $0/yr the total weight
           is zero and the blend degenerates to an UNWEIGHTED MEAN — and there a dropped room votes
           with full force. So the fixture is a household whose only real pension is a BALANCE with
           no annual amount (`value > 0` admits it, `inflow === 0` gives it no weight), plus a ghost
           room the filter drops. With the filter: mean of [2] = 2%. Without it: mean of [2, 9]
           = 5.5% — nearly triple, on the one shape where nothing else would notice.
        🔑 A LEG THAT CANNOT FAIL IS NOT A WEAK CONTROL, IT IS AN ABSENT ONE WEARING A PASS. */
  await clearPensions(page);
  await page.evaluate(() => {
    addInstance('pension');
    const p = window.state.accounts.filter((x) => x.baseId === 'pension').pop();
    p.value = 250000; p.inflow = 0; p.cola = 2;     // admitted by `value > 0`, no weight
  });
  await addPension(page, 0, 9);                     // dropped: no balance, no amount
  await page.waitForTimeout(200);
  const ghost = await payload(page);
  check('L4 ADMISSION: on the zero-weight fallback, a pension room the payload DROPS does not vote on the blend',
    near(ghost.pension_cola, 0.02) && ghost.pensions.length === 1,
    'pension_cola=' + JSON.stringify(ghost.pension_cola) + '  want 0.02'
    + (near(ghost.pension_cola, 0.055)
      ? '  ⛔ THE DROPPED ROOM VOTED — mean of [2, 9] instead of [2]'
      : '')
    + '  pension rooms that reached the payload=' + JSON.stringify(ghost.pensions)
    + '\n          ⛔ a dropped room voting is a silent change to a real household\'s income growth');

  /* ── L5 THE ANTI-FORK LEG. Exactly one place assigns body.pension_cola across the shell AND the
        five part files. A second payload builder deriving its own is the co-architect defect. */
  const src = studioSource();
  const assigns = (src.match(/\.pension_cola\s*=/g) || []).length;
  check('L5 NO FORK: exactly one assignment site for pension_cola across the shell and all part files',
    assigns === 1,
    'assignment sites = ' + assigns + ' (want 1)'
    + '\n          ⛔ two derivations is how the Range and the SS Matrix came to describe different families');

  await ctx.close(); await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  /* ⭐ THIS GATE DECLARES ITS OWN REACH. It exercises `window._buildStudioRequest()` only. The
     Studio has TWO egresses to the engine; the SS-Matrix builder is NOT crossed here.
     ⚠️ AND THAT LIMIT IS NOT YET CLEARED BY MEASUREMENT, unlike the co-architect gate's. Whether
        buildMatrixRequest extends this base or rebuilds it has NOT been checked for this field.
        Recorded as an open reach gap rather than left in somebody's memory. */
  console.log('REACH: _buildStudioRequest() only — 1 of the 2 engine egresses in the Studio.'
            + ' The SS-Matrix door is NOT crossed, and NOT yet measured for this field.');
  console.log('GAP: the Studio cannot distinguish a typed 0 from an untouched field'
            + ' (cola initialises to 0; datum-archive-codec.js:86 stores `a.cola || 0` positionally).'
            + ' Blank ships as 0. FILED, NOT FIXED — closing it is a codec migration.');
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
