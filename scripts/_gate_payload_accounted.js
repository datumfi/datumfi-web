/* @gate-pool: browser */
'use strict';
/* _gate_payload_accounted.js — EVERY VALUE THIS PRODUCT SENDS ON A USER'S BEHALF IS ACCOUNTED FOR.
 *
 * THE LAW IT ENFORCES, Architect-ratified 2026-09-12:
 *   A FIELD THAT CHANGES THE ANSWER MUST GATE THE DOOR. ANYTHING THAT CHANGES THE ANSWER AND DOES
 *   NOT GATE IT IS A DECISION MADE FOR THE USER.
 *
 * ⛔⛔ WHY IT EXISTS, AND IT IS NOT "ANOTHER GATE". Two hundred and seventy gates did not catch
 *    this, and the reason is structural rather than sloppy: EVERY ONE OF THEM ASKS "IS THIS
 *    SPECIFIC THING STILL TRUE?" — a question that can only ever check what its author already
 *    imagined. The six fields below were never imagined by anyone, so no gate could name them.
 * 🔑 THIS ASKS THE OTHER QUESTION: "IS THERE ANYTHING HERE NOBODY HAS ACCOUNTED FOR?" It enumerates
 *    MECHANICALLY off the payload the product actually builds, so a field added next month is
 *    policed the day it appears, by nobody remembering anything. It is the same inversion
 *    check_constant_sources.py performed one repo over, applied to the wire instead of the source.
 *
 * ⛔ AND IT WAS BUILT BECAUSE A REFUSAL WALK CANNOT DO THIS JOB, WHICH IS NOW A LAW:
 *    A REFUSAL LIST IS NOT A REQUIRED LIST AND STRUCTURALLY CANNOT BE. A door can only refuse on a
 *    field that has NO DEFAULT, so every defaulted field is invisible to a refusal walk BY
 *    CONSTRUCTION. plan_end_age defaults to 93 and therefore never appeared on any list anyone
 *    ever wrote. The Captain found it from the product while two of us were reading the code.
 *
 * ⛔ THE FIXTURE RULE, LEARNED THE EXPENSIVE WAY HOURS BEFORE THIS FILE EXISTED. An earlier script
 *    SEEDED AN ACCOUNT WITH A BALANCE so its walk could proceed, then reported a required list
 *    containing no account requirement. A FIXTURE THAT SUPPLIES A PRECONDITION CANNOT MEASURE
 *    WHETHER THE PRODUCT DEMANDS IT — every setup line is a claim the harness will never test.
 *    ⇒ THIS GATE SEEDS NOTHING. It starts from the emptiest state the Studio permits and answers
 *      only what the product itself refuses on, one refusal at a time, using the product's own
 *      target ids.
 *
 * ⚠️⚠️ WHAT THIS GATE DOES NOT PROVE, STATED HERE BECAUSE EVERY INSTRUMENT MUST CARRY ITS OWN
 *    LIMIT: it proves a value is SENT WITHOUT BEING ASKED FOR. It does NOT prove the value is
 *    wrong, does not measure how far it moves the answer, and cannot tell a harmless default from
 *    a harmful one. Reachability in confidence points is the engine's harness, not this one.
 *    ⛔ DO NOT LET IT ACCRUE A REPUTATION FOR PROVING MORE THAN IT DOES. That is precisely how
 *       L10a came to stand for "the swarm animates" when it only ever meant "the panel is open",
 *       and how a refusal list came to stand for a required list.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8235;
const DECL = path.join(__dirname, 'payload_sources.json');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

/* Shapes, not facts. These answer a door; they never stand in for a judgement about the household. */
const ANSWERS = {
  'pri-dob': '03 / 1974', 'target-ret': '07 / 2042', 'co-dob': '11 / 1976', 'co-ret': '05 / 2044',
  'spend-input': '$100,000', 'plan-through': '93',
  'ss-pri-62': '1,800', 'ss-pri-67': '2,400', 'ss-pri-70': '3,000',
  'ss-sec-62': '1,500', 'ss-sec-67': '2,000', 'ss-sec-70': '2,600',
  'hc-monthly': '1,150', 'pri-location': 'Alabama', 'filing-status': 'Single / Individual'
};

/* Which control a payload key comes from, for the ASKED test. ⚠️ This maps names; it does not
   decide accountability — a key only counts as ASKED if the product actually refused on that
   control during the walk above. A name in this map with no matching refusal proves nothing. */
const FROM_CONTROL = {
  current_age: 'pri-dob',
  retirement_age: 'target-ret',
  location: 'pri-location',
  filing_status: 'filing-status',
  ss_primary_benefit_overrides: 'ss-pri-67',
  accounts: 'sec-drafting',
  datum_spend: 'spend-input',
  plan_end_age: 'plan-through',
  healthcare_annual: 'hc-monthly'
};

(async () => {
  const decl = JSON.parse(fs.readFileSync(DECL, 'utf8'));
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(700);

  /* ── THE WALK. Nothing seeded. Answer exactly what the product refuses on, and record it. */
  const asked = new Set();
  let payload = null, rounds = 0, stuck = null;
  for (; rounds < 24; rounds++) {
    const r = await page.evaluate(() => {
      window._buildRequestErrors = [];
      let body = null;
      try { body = window._buildStudioRequest(); } catch (e) { /* a throw is a refusal too */ }
      return {
        body: body,
        errs: (window._buildRequestErrors || []).map((e) => ({ m: String(e.message || e), t: e.target || null }))
      };
    });
    if (r.body && !r.errs.length) { payload = r.body; break; }
    if (!r.errs.length) { stuck = 'the builder returned nothing and queued no refusal'; break; }
    r.errs.forEach((e) => { if (e.t) asked.add(e.t); });

    /* ⛔⛔ ANSWERING A REFUSAL IS NOT THE SAME ACT AS SEEDING A PRECONDITION, AND THE WHOLE
       CREDIBILITY OF THIS GATE TURNS ON THE DIFFERENCE.
         SEEDING supplies a value BEFORE the product asks, so the demand is never observed — that
         is the defect that hollowed out the previous script's list.
         ANSWERING supplies it BECAUSE the product refused, AFTER the demand has been recorded in
         `asked`. The requirement is measured first and satisfied second.
       ⇒ The estate is not a form field, so its answer is an ACTION: add an account and give it a
         balance, which is exactly what the refusal instructs a user to do. It reaches here only
         once `sec-drafting` is already in `asked`. */
    const estate = r.errs.find((e) => e.t === 'sec-drafting');
    if (estate) {
      await page.evaluate(() => {
        addInstance('taxable');
        const a = window.state.accounts.filter((x) => x.baseId === 'taxable').pop();
        a.value = 750000;
      });
      await page.waitForTimeout(110);
      continue;
    }

    const next = r.errs.find((e) => e.t && ANSWERS[e.t]);
    if (!next) { stuck = 'no answer known for: ' + r.errs.map((e) => e.t).join(', '); break; }
    await page.evaluate((a) => {
      const el = document.getElementById(a[0]); if (!el) return;
      if (el.tagName === 'SELECT') {
        for (const o of el.options) if (o.textContent.trim() === a[1]) { el.value = o.value; break; }
      } else { el.focus(); el.value = a[1]; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    }, [next.t, ANSWERS[next.t]]);
    await page.waitForTimeout(110);
  }

  check('L0 INSTRUMENT: the door opened from an EMPTY Studio with nothing seeded',
    payload !== null && !stuck,
    payload ? ('opened after ' + rounds + ' refusals: ' + [...asked].join(', ')) : ('STUCK — ' + stuck)
    + '\n          ⛔ if this leg ever needs a seeded value to pass, THAT VALUE IS THE FIRST FINDING');

  if (!payload) {
    results.forEach((r) => console.log('  ' + r));
    console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' RED');
    console.log('OVERALL: RED');
    await ctx.close(); await browser.close(); server.close();
    process.exit(1);
  }

  /* ── L1 — THE ENUMERATION IS MECHANICAL. Keys come off the payload the product built. */
  const keys = Object.keys(payload);
  check('L1 ENUMERATED FROM THE PAYLOAD, NOT FROM A LIST',
    keys.length > 0,
    keys.length + ' key(s) sent: ' + keys.join(', ')
    + '\n          a hand-kept list of what to check is the same defect as a hand-kept cache signature');

  /* ── L2 — EVERY KEY IS ACCOUNTED FOR. */
  const askedKeys = [], declaredKeys = [], unaccounted = [];
  for (const k of keys) {
    const control = FROM_CONTROL[k];
    if (control && asked.has(control)) { askedKeys.push(k); continue; }
    const d = decl.keys && decl.keys[k];
    if (d && (d.kind === 'machinery' || d.kind === 'derived') && d.reason) { declaredKeys.push(k); continue; }
    unaccounted.push(k);
  }

  /* ⛔ THE ACCOUNTS KEY IS CHECKED FOR CONTENT, NOT PRESENCE, AND THAT DISTINCTION IS THE WHOLE
     FINDING. `accounts: []` is PRESENT on the payload and utterly empty, so a presence test passes
     while the engine is asked to price a household with no estate at all. A Range computed on an
     empty estate is the most confident wrong answer this product can produce. */
  const emptyAccounts = Array.isArray(payload.accounts) && payload.accounts.length === 0;

  check('L2 NOTHING IS SENT ON A USER\'S BEHALF WITHOUT BEING ASKED FOR OR DECLARED',
    unaccounted.length <= (decl.max_unaccounted || 0),
    unaccounted.length + ' unaccounted (ratchet allows ' + (decl.max_unaccounted || 0) + '):'
    + unaccounted.map((k) => {
      const v = payload[k];
      const shown = (v && typeof v === 'object')
        ? (Array.isArray(v) ? '[' + v.length + ' items]' : '[object]') : String(v);
      return '\n            · ' + k.padEnd(30) + '= ' + shown.slice(0, 44);
    }).join('')
    + '\n          ASKED (' + askedKeys.length + '): ' + askedKeys.join(', ')
    + '\n          DECLARED (' + declaredKeys.length + '): ' + (declaredKeys.join(', ') || 'none')
    + '\n          ⛔ THE RATCHET FALLS BY ASKING FOR A FIELD, NEVER BY DECLARING IT AWAY');

  check('L3 THE ESTATE IS NOT EMPTY: the client never sends a household with no accounts',
    !emptyAccounts,
    'accounts on the payload = ' + (Array.isArray(payload.accounts) ? payload.accounts.length : 'not an array')
    + '\n          ⛔ `accounts: []` PASSES A PRESENCE TEST — an empty array satisfies one exactly'
    + ' as well as a full one, which is why nothing client-side ever objected.'
    + '\n          ⚠️ SEVERITY, MEASURED RATHER THAN ASSUMED: the ENGINE refuses an empty estate'
    + ' (schemas.py, accounts min_length=1), so this was a raw 422 in the user\'s face, NOT a'
    + ' fabricated Range. A first version of this leg claimed the engine would have priced it.'
    + ' It would not. The defect is a missing courtesy, not a wrong number.');

  /* ── L4 — THE RATCHET HAS A DEADLINE, so a backlog cannot quietly become the resting state. */
  const due = decl.unaccounted_review_due ? new Date(decl.unaccounted_review_due + 'T00:00:00Z') : null;
  const daysLeft = due ? Math.round((due - Date.now()) / 86400000) : null;
  check('L4 THE BACKLOG HAS A DATE: the ratchet goes red on its own if the count has not moved',
    due !== null && daysLeft > 0,
    due ? (decl.unaccounted_review_due + ' — ' + daysLeft + ' day(s)') : 'NO REVIEW DATE DECLARED'
    + '\n          ⛔ moving the date without lowering the count is forbidden');

  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('METHOD: walked the product\'s own refusals from an empty Studio, then enumerated the'
    + ' payload it built. Nothing seeded, nothing hand-listed.');
  console.log('WHAT THIS DOES NOT PROVE: that any of these values is WRONG, or how far it moves the'
    + ' answer. It proves only that it is sent without being asked for. Movement in confidence'
    + ' points is the engine harness\'s job, not this one\'s.');
  console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
  await ctx.close(); await browser.close(); server.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks. NOT a pass.');
  console.log('OVERALL: RED');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
