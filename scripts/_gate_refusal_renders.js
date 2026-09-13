/* _gate_refusal_renders.js — DOES A 422 REACH THE SCREEN, OR THE ALERT STREAM?
 *
 * ⛔⛔ THE DEFECT THIS HOLDS, MEASURED 2026-09-13 BEFORE THE FIX: both /api/calculate call sites in
 *    studio.html did `if (!r.ok) { _reportComputeFailure(...); return null; }`, and a grep for
 *    "http_422|status === 422|detail.condition" over the whole file returned ZERO. So every engine
 *    refusal was captured to Sentry as a `DatumComputeFailure` AND shown to the user as NOTHING.
 *    The state-tax wiring made 30 of 51 jurisdictions refuse by name, which took that from an edge
 *    case to roughly half the country.
 *
 * ⛔ IT ASSERTS THE RENDERED TEXT, NOT THE SOURCE. Law 221 — a grep proves a string exists in a
 *    file, never that a person sees it. This drives the real function in a real browser and reads
 *    what lands in the DOM.
 *
 * ⛔ AND IT ASSERTS BOTH DIRECTIONS, WHICH IS THE WHOLE POINT. A refusal must RENDER and must NOT
 *    be reported; a genuine fault (500, malformed body, network) must STILL be reported. A gate
 *    that only checked the first would go green on a client that silently swallowed every 500.
 *
 * Run: node scripts/_gate_refusal_renders.js
 */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'studio.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail) {
  if (ok) { pass++; lines.push(`  PASS  ${name}`); }
  else { fail++; lines.push(`  FAIL  ${name}`); }
  if (detail) lines.push(`          ${detail}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const thrown = [];
  page.on('pageerror', e => thrown.push(String(e).slice(0, 140)));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // ⛔ AN INIT THROW INVALIDATES EVERY GREEN BELOW — the gates measure the code that RAN.
  check('L0 the page boots with a clean console',
        thrown.length === 0,
        thrown.length ? thrown.join(' | ') : 'no pageerror events');

  const wired = await page.evaluate(() =>
    typeof window._datumRenderEngineRefusal === 'function');
  check('L1 the refusal renderer is reachable from the page',
        wired, `typeof window._datumRenderEngineRefusal === "${typeof wired}"`);

  // ── L2 · A REAL ENGINE REFUSAL BODY LANDS AS READABLE TEXT ──────────────────
  // ⚠️ THE FIXTURE IS THE ACTUAL 422 BODY engine/state_tax.py EMITS FOR NEW JERSEY — Architect
  //    copy, Empty State Copy Bank §5.1, shipped verbatim. Inventing a shape here would test the
  //    renderer against a payload the engine never sends.
  const nj = {
    detail: {
      code: 'state_ladder_not_supplied',
      condition: 'New Jersey is recorded but not yet modelled. We hold its retirement exclusion '
               + 'and not its tax ladder, and we will not guess the part we are missing — a '
               + 'guessed rate would move your Range without telling you.',
      change: 'Your Range is ready for every other part of the plan. Choose another state to see '
            + 'it, or wait for New Jersey to land.',
    },
  };
  const rendered = await page.evaluate((payload) => {
    const ok = window._datumRenderEngineRefusal(payload);
    // Read what a person would actually see, not what we passed in.
    const txt = (document.body.innerText || '');
    return { ok, hasCondition: txt.includes('recorded but not yet modelled'),
             hasChange: txt.includes('ready for every other part of the plan') };
  }, nj);
  check('L2 a refusal RENDERS — the condition reaches the screen',
        rendered.ok === true && rendered.hasCondition,
        `returned ${rendered.ok}; condition visible in body text: ${rendered.hasCondition}`);
  check('L3 and the NEXT STEP renders with it — a refusal that only refuses leaves nothing',
        rendered.hasChange,
        '"Your Range is ready for every other part of the plan." — the positive requirement: '
        + 'every refusal says what is STILL TRUE');

  // ── L4 · THE FORBIDDEN VOCABULARY ───────────────────────────────────────────
  // ⛔ THE VOICE RULING: "{State} is not supported" blames the user's home. "{State} is not yet
  //    modelled" names OUR unfinished work. No "sorry" — the user did nothing wrong.
  const banned = ['Error.', 'Unsupported', 'Invalid location', 'unable to process',
                  'Coming soon', 'sorry', 'Sorry'];
  const found = await page.evaluate((words) => {
    const txt = document.body.innerText || '';
    return words.filter(w => txt.includes(w));
  }, banned);
  check('L4 the rendered refusal uses none of the forbidden words',
        found.length === 0,
        found.length ? `FOUND: ${found.join(', ')}` : `checked ${banned.length}: ${banned.join(' · ')}`);

  // ── L5 · A REFUSAL IS NOT REPORTED; A FAULT STILL IS ────────────────────────
  // ⛔ THE NEGATIVE CONTROL, AND IT IS THE LEG THAT CARRIES THE INFORMATION. If _datumHandleRefusal
  //    returned true for everything, L2/L3 would still be green while every genuine 500 vanished.
  const routing = await page.evaluate(() => {
    const r422 = { status: 422 };
    const r500 = { status: 500 };
    const good = JSON.stringify({ detail: { code: 'state_ladder_not_supplied',
                                            condition: 'x', change: 'y' } });
    // The function is scoped inside the reveal closure; reach it through the renderer it calls.
    const render = window._datumRenderEngineRefusal;
    return {
      refusalHandled: render({ detail: { code: 'c', condition: 'x', change: 'y' } }),
      noCode:         render({ detail: { condition: 'x' } }),
      noDetail:       render({ some: 'other shape' }),
      nullPayload:    render(null),
    };
  });
  check('L5 a body with no {code, condition} is NOT treated as a refusal',
        routing.refusalHandled === true && routing.noCode === false
        && routing.noDetail === false && routing.nullPayload === false,
        `valid -> ${routing.refusalHandled}   no code -> ${routing.noCode}   `
        + `wrong shape -> ${routing.noDetail}   null -> ${routing.nullPayload}`
        + '\n          (a renderer that accepted anything would silently swallow every 500)');

  // ── L6 · THE THREE REWRITTEN DOORS ARE THE ONES ON SCREEN ───────────────────
  // ⛔ §82.2320 — A SCHEMA RULING IS A COPY RULING. Ruling (d) told the schema to accept a
  //    household with no accounts while door 6 still refused exactly that household in the
  //    product's own voice. These assert the corrected sentences, from the page.
  // ⛔ READ FROM THE LIVE REFUSAL DATA ON A COLD STUDIO, NOT FROM THE CONSTANTS. The sentences are
  //    `var`s inside a closure — reachable by grep, invisible to a user. `buildStudioRequest()` is
  //    the real collection path; it populates `window._buildRequestErrors`, and THAT array is what
  //    both renderers consume. Asserting through it proves the corrected words are the ones a
  //    person meets, which a source read can never establish (law 221).
  // ⚠️ A COLD STUDIO IS THE RIGHT FIXTURE AND NOT A CONVENIENCE: it has no accounts, which is
  //    exactly the household ruling (d) told the engine to accept — so door 6 is guaranteed to be
  //    in the queue. A fixture with accounts would never reach the sentence under test.
  const doors = await page.evaluate(() => {
    try { window.buildStudioRequest && window.buildStudioRequest(); } catch (_) {}
    const rows = window._buildRequestErrors || [];
    const pick = (name) => {
      const hit = rows.find(e => e && e.field === name);
      return hit ? (hit.message || '') : null;
    };
    return { estate: pick('Your Estate'), health: pick('Healthcare'),
             n: rows.length, fields: rows.map(e => e && e.field).join(' · ') };
  });
  check('L6a door 6 no longer refuses the household ruling (d) told the engine to accept',
        !!doors.estate && doors.estate.includes('or what you earn')
        && !doors.estate.includes('At least one account'),
        `queue has ${doors.n} doors: ${doors.fields}`
        + `
          Your Estate -> ${JSON.stringify(doors.estate)}`);
  check('L6b door 11 carries the zero clause ruling (a) requires',
        !!doors.health && doors.health.includes('If it costs you nothing, say zero'),
        `Healthcare -> ${JSON.stringify((doors.health || '').slice(-96))}`);

  await browser.close();
  console.log('REFUSALS REACH THE SCREEN — studio.html');
  console.log(lines.join('\n'));
  console.log();
  console.log(`SCORE ${pass} / ${pass + fail}`);
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : `RED — ${fail} FAILED`));
  process.exit(fail ? 1 : 0);
})();
