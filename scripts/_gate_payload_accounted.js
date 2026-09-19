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
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8235;
const DECL = path.join(__dirname, '_payload_sources.json');

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
  'spend-input': '$100,000', 'plan-through': '93', 'plan-end-age': '03 / 2064',
  'ss-pri-62': '1,800', 'ss-pri-67': '2,400', 'ss-pri-70': '3,000',
  'ss-sec-62': '1,500', 'ss-sec-67': '2,000', 'ss-sec-70': '2,600',
  /* ⛔⛔ `hc-monthly` -> `hc-pre65-monthly`, REPAIRED 2026-09-19. THAT ID DOES NOT EXIST IN THE
     SHELL AND HAS NOT FOR SOME TIME — the control is `hc-pre65-monthly` and it is the target
     studio.html actually pushes on the Healthcare refusal. So the walk hit a door it had no key
     for, stopped, and L0 reported STUCK — which made every leg beneath it assert over a Studio
     that had never opened. THE INSTRUMENT LEG WAS THE FAILING ONE, exactly as filed.
     ⚠️ IT WENT STUCK ONLY BECAUSE THE PRODUCT GOT MORE HONEST. This field used to ship a
        hard-coded "$1,150" — $13,800/yr nobody chose — so it NEVER refused and the walk never
        reached this door. Removing that default armed a refusal the gate could not answer.
        🔑 A FIXTURE THAT NEVER MET A DOOR CANNOT BE SAID TO HAVE PASSED THROUGH IT. */
  'hc-pre65-monthly': '1,150', 'pri-location': 'Alabama', 'filing-status': 'Single / Individual'
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
  /* ⭐ BOTH MOVED 2026-09-12 WHEN THE DEFAULTS WERE REMOVED. datum_spend used to be named
     against #spend-input and plan_end_age against a 'plan-through' target, and NEITHER CONTROL
     EVER REFUSED — so both keys were correctly counted as UNASKED however the map read. A name in
     this map has never been evidence; only a refusal observed during the walk is. */
  datum_spend: 'sec-sketch',
  plan_end_age: 'plan-end-age',
  /* ⛔ THE SAME DEAD ID, AND HERE IT WAS THE MORE EXPENSIVE OF THE TWO. This named a control that
     does not exist, so the ASKED test could never match a refusal against it and
     `healthcare_annual` was counted UNASKED — silently, in the gate's own headline figure. The
     map's comment is right that a name here is not evidence; it is also true that a WRONG name
     here removes a key from the population without anything going red. §82.2778. */
  healthcare_annual: 'hc-pre65-monthly',

  /* ── THE SECOND PERSON'S CONTROLS, ADDED 2026-09-13 WHEN THIS GATE LEARNED TO ENTER DUAL.
     ⛔⛔ THE ABSENCE OF THESE FIVE LINES WAS NOT AN OVERSIGHT IN A MAP; IT WAS THE INSTRUMENT
        INHERITING THE DEFECT IT EXISTS TO FIND. This gate walked SOLO ONLY, so every key that
        exists only when a second person does was OUTSIDE ITS POPULATION ENTIRELY — not measured
        and found clean, NEVER LOOKED AT. It reported 3 while the true figure was 4, and the
        fourth was named from memory by the Captain with no code in front of him.
     🔑 A GATE THAT MEASURES ONLY THE PRIMARY CONFIGURATION IS THE SAME DEFECT AS AN ENGINE THAT
        MODELS ONLY THE PRIMARY ARCHITECT, ONE LEVEL UP. Clause 1 and Clause 2 met inside the tool.
     ⚠️ ss_strategy_secondary IS DELIBERATELY ABSENT FROM THIS MAP, AND SO IS ss_strategy_primary.
        Both are tempting to point at 'ss-sec-67' / 'ss-pri-67' because those controls sit in the
        same panel — but that refusal is about the BENEFIT FIGURES, not the claiming choice. Naming
        them here would mark a key ASKED on the strength of a refusal raised about something else,
        which is the laundering this gate exists to count. THE CLAIMING CHOICE HAS NO DOOR YET. */
  co_architect_age: 'co-dob',
  co_architect_retirement_age: 'co-ret',
  co_architect_plan_end_age: 'co-plan-end',
  ss_secondary_benefit_overrides: 'ss-sec-67'
};

/* ⛔ THE PAIRING RULE FOR CLAUSE 1, APPLIED MECHANICALLY IN L15. Given any key name, return the
   name of its FIRST-PERSON counterpart, or null if it is not a second-person field at all.
   ⭐ IT IS A RULE, NOT A LIST, WHICH IS THE ONLY REASON IT STAYS TRUE. A sixth co-architect field
      wired next year is paired the day it appears, by nobody remembering to add it here.
   ⚠️ ONE NORMALISATION IS STATED RATHER THAN HIDDEN: stripping `co_architect_` from
      `co_architect_age` yields `age`, and the engine's first-person spelling is `current_age`.
      That single irregularity is handled explicitly; everything else pairs by the rule. */
function primaryCounterpart(key) {
  if (/^co_architect_/.test(key)) {
    const stem = key.replace(/^co_architect_/, '');
    return stem === 'age' ? 'current_age' : stem;
  }
  /* Covers BOTH spellings the engine uses — a trailing `_secondary` (ss_strategy_secondary) and an
     infixed one (ss_secondary_benefit_overrides) — so neither needs its own line. */
  if (/_secondary(_|$)/.test(key)) return key.replace(/_secondary(_|$)/, '_primary$1');
  return null;
}

/* ── THE WALK, AS A FUNCTION SO BOTH CONFIGURATIONS SHARE ONE COPY OF IT.
   ⛔ IT WAS INLINE UNTIL 2026-09-13 BECAUSE THERE WAS ONLY EVER ONE CONFIGURATION TO WALK. The
      second caller is what forced it out, and copying the loop instead would have been the exact
      defect L10 polices in the product one layer down: two spellings of one procedure, each
      correct on its own line, drifting apart the first time either is touched.
   ⚠️ NOTHING ABOUT THE PROCEDURE CHANGED IN THE MOVE. It still answers ONLY what the product has
      already refused on, and still records the demand BEFORE satisfying it. */
async function walkRefusals(page) {
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

      /* ⛔ THE DATUM'S ANSWER IS AN ACTION, NOT A FIELD — the refusal points at the Sketch
         SECTION (or, on a cold estate, at the step that unlocks it), and what a user does there is
         MOVE THE SLIDER. Dispatching a real input event is what a drag does, and it is the drag
         handler that records the answer. Setting dataset.exactVal directly would forge the very
         provenance the refusal exists to check — the harness would be writing the user's answer for
         them, which is the seeding defect wearing an answer's clothes. */
      const datum = r.errs.find((e) => e.t === 'sec-sketch' || (e.t === 'sec-drafting' && /spend each year/.test(e.m)));
      if (datum) {
        await page.evaluate(() => {
          const sd = document.getElementById('slider-datum');
          if (!sd) return;
          sd.value = '41141';
          sd.dispatchEvent(new Event('input', { bubbles: true }));
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
  return { asked, payload, rounds, stuck };
}

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

  /* ── L5/L6 — THE COLLECTED BLOCK, MEASURED FROM THE EMPTIEST STATE, BEFORE ANYTHING IS ANSWERED.
        ⭐ THIS IS THE WIRE BETWEEN THE GATE AND THE COPY, AND IT IS THE PART THAT SURVIVES US.
           The gate discovers what the product demands; the block is what the product SAYS it
           demands. If the second can drift behind the first, the copy rots the moment a field is
           added — and nobody notices, because a shorter list still looks like a list.
        ⛔ SO: EVERY REFUSAL THE BUILDER QUEUES MUST BE NAMED IN THE BLOCK. Not counted — NAMED.
        ⚠️ MEASURED 2026-09-12 AND IT CHANGED THE FIX: `_buildRequestErrors` already returned SIX
           entries from ONE call on an empty Studio. Collection was never the defect. Every surface
           rendered `_buildRequestError` — the FIRST one — so the product held the whole answer and
           showed a seventh of it. The maze was a rendering defect wearing a validation defect's
           clothes. */
  const blockProbe = await page.evaluate(() => {
    window._buildRequestErrors = [];
    try { window._buildStudioRequest(); } catch (e) { /* a throw is a refusal too */ }
    const queued = (window._buildRequestErrors || []).map((e) => ({ field: e.field, target: e.target }));
    const block = (typeof window._datumCollectedRefusal === 'function')
      ? window._datumCollectedRefusal() : null;
    return { queued, block };
  });

  const queuedNamed = (blockProbe.queued || []).filter((e) => e.field);
  const blockNames = new Set(((blockProbe.block || {}).items || []).map((i) => i.name));
  const unnamed = queuedNamed.filter((e) => !blockNames.has(e.field));

  check('L5 THE BLOCK NAMES EVERY REFUSAL THE BUILDER QUEUES — the copy cannot drift behind the requirements',
    blockProbe.block !== null && queuedNamed.length > 1 && unnamed.length === 0,
    'queued from an empty Studio: ' + queuedNamed.length + ' (' + queuedNamed.map((e) => e.field).join(', ') + ')'
    + '\n          named in the block: ' + blockNames.size + ' (' + [...blockNames].join(', ') + ')'
    + (unnamed.length ? '\n          ⛔ QUEUED BUT NOT NAMED: ' + unnamed.map((e) => e.field).join(', ') : '')
    + '\n          ⛔ a field the product demands and the block does not name is a maze step'
    + ' waiting to happen');

  check('L6 ONE BLOCK, ONE DOOR, AND THE HEADING AGREES WITH THE COUNT',
    blockProbe.block !== null
      && /You are missing (a few things|one thing)\./.test(blockProbe.block.title)
      && (blockProbe.block.items.length === 1) === /one thing/.test(blockProbe.block.title)
      && !!blockProbe.block.firstTarget,
    'title=' + JSON.stringify((blockProbe.block || {}).title)
    + ' · items=' + ((blockProbe.block || {}).items || []).length
    + ' · door target=' + JSON.stringify((blockProbe.block || {}).firstTarget)
    + '\n          ⛔ a one-item list under "a few things" is how a collected refusal starts reading'
    + ' like a form validator');

  /* ── THE WALK, CONFIGURATION SOLO. Nothing seeded; answer exactly what the product refuses on. */
  const soloWalk = await walkRefusals(page);
  const asked = soloWalk.asked, payload = soloWalk.payload, rounds = soloWalk.rounds,
        stuck = soloWalk.stuck;

  check('L0 INSTRUMENT: the door opened from an EMPTY Studio with nothing seeded — CONFIGURATION SOLO',
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
  check('L1 ENUMERATED FROM THE PAYLOAD, NOT FROM A LIST — CONFIGURATION SOLO',
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

  check('L2 NOTHING IS SENT ON A USER\'S BEHALF WITHOUT BEING ASKED FOR OR DECLARED — CONFIGURATION SOLO',
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

  /* ── L7 — BOTH DOORS ACTUALLY USE THE BLOCK.
        ⛔⛔ ITS OWN RED-FIRST RUN DEMANDED THIS LEG. L5 and L6 read the block BUILDER, so bypassing
           the RENDERER — `var block = null` — left them green while the surface fell straight back
           to showing one refusal at a time. THAT IS THE MAZE RESTORED UNDER A GREEN GATE, and it is
           the same shape as L10a proving a panel was open while its contents froze.
        🔑 A LEG THAT CHECKS A VALUE IS BUILT HAS NOT CHECKED THAT ANYTHING SHOWS IT. */
  const shell = studioSource();
  const revealUsesBlock = /function _revealStatus[\s\S]{0,900}?_datumCollectedRefusal\(\)/.test(shell);
  const matrixUsesBlock = /_reqErrField = window\._buildRequestErrorField;[\s\S]{0,900}?_datumCollectedRefusal\(\)/.test(shell);
  check('L7 BOTH DOORS RENDER THE BLOCK: neither falls back to showing one refusal at a time',
    revealUsesBlock && matrixUsesBlock,
    'Reveal door wired=' + revealUsesBlock + ' · SS-matrix door wired=' + matrixUsesBlock
    + '\n          ⛔ the block existing and no surface using it is exactly the defect being fixed —'
    + ' the builder has always known all six');

  /* ── L8 — THE SINGULAR DEGRADES. Measured by emptying ONE answered field after the walk, which is
        the only way to reach a one-refusal state; from the empty Studio there are always six. */
  const singular = await page.evaluate(() => {
    /* ⚠️ filing-status AND NOT pri-dob. Blanking the DOB produced NO refusal — the Profile
       re-hydrates that field, so the emptied value never reached the builder and the leg measured
       a state the product does not have. A select is read straight from the DOM. */
    const el = document.getElementById('filing-status');
    if (!el) return { ok: false };
    const keep = el.value;
    el.focus(); el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    window._buildRequestErrors = [];
    try { window._buildStudioRequest(); } catch (e) { /* refusal */ }
    const b = window._datumCollectedRefusal ? window._datumCollectedRefusal() : null;
    const out = { ok: true, title: b && b.title, n: b ? b.items.length : 0 };
    el.focus(); el.value = keep;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    return out;
  });
  check('L8 THE SINGULAR DEGRADES: one missing thing is not announced as "a few things"',
    singular.ok && singular.n === 1 && singular.title === 'You are missing one thing.',
    'with one field emptied: ' + singular.n + ' item(s), heading ' + JSON.stringify(singular.title)
    + '\n          ⛔ a one-item list under "a few things" is how a collected refusal starts reading'
    + ' like a form validator');

  /* ── L9 — THE ENGINE IS SENT THE NUMBER ON THE SCREEN. Swept, not sampled.
        ⛔ THE DEFECT THIS REPLACES: the payload rounded the slider position to the DOLLAR while the
           spend box rounded it to the THOUSAND, so a user looking at $100,000 had 100001 priced.
           Nothing on the page could show it — both numbers were "right" on their own line.
        🔑 A SINGLE POSITION IS NOT A MEASUREMENT HERE. The two spellings agree by luck wherever the
           log curve happens to land near a round thousand, so one sample is a coin toss; the sweep
           is what makes the leg able to fail. The old code disagreed at 11 of these 12 positions. */
  const agree = await page.evaluate(() => {
    const sDat = document.getElementById('slider-datum');
    const box  = document.getElementById('spend-input');
    if (!sDat || !box || !window._buildStudioRequest) return { ok: false };
    const keepPos = sDat.value, keepEx = sDat.dataset.exactVal, keepBox = box.value;
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const pos = 20000 + Math.round(i * (95000 - 20000) / 11);
      delete sDat.dataset.exactVal;        // a POSITION, never a typed fact
      sDat.value = String(pos);
      sDat.dispatchEvent(new Event('input', { bubbles: true }));
      const shown = parseInt(String(box.value).replace(/[^0-9]/g, ''), 10);
      /* ⭐ THE SECOND  THAT USED TO LIVE HERE IS GONE, AND ITS REMOVAL IS THE RECORD OF
         A DEFECT BEING CLOSED STRUCTURALLY RATHER THAN WATCHED. It was added hours earlier because
         the payload read exactVal FIRST and the 100001 defect lived on the POSITION branch, so the
         leg had to force that branch to see anything. The cold-default purge DELETED THE POSITION
         BRANCH: an untouched datum is now a refusal, not a fallback. Keeping the delete would test
         a state the product no longer has, and it did — 12 of 12 'disagreements' that were really
         one omitted key.
         ⚠️ AND THIS LEG IS WEAKER THAN IT WAS. SAY SO RATHER THAN LET IT KEEP ITS OLD REPUTATION.
            The screen and the payload now both read dataset.exactVal, so they agree largely by
            construction; what it still catches is the spend box formatting or parsing differently
            from what is sent. THE ORIGINAL DEFECT IS HELD BY L10 NOW — one conversion, no second
            place to compute money — which is a structural guarantee rather than a swept sample.
            A LEG WHOSE DEFECT HAS BEEN DESIGNED OUT SHOULD BE DEMOTED IN THE RECORD, NOT QUIETLY
            LEFT TO LOOK AS STRONG AS IT ONCE WAS. */
      let sent = null;
      try { const r = window._buildStudioRequest(); sent = r && r.datum_spend; } catch (e) {}
      rows.push({ pos, shown, sent });
    }
    sDat.value = keepPos;
    if (keepEx === undefined) delete sDat.dataset.exactVal; else sDat.dataset.exactVal = keepEx;
    sDat.dispatchEvent(new Event('input', { bubbles: true }));
    box.value = keepBox;
    return { ok: true, rows };
  });
  const bad = agree.ok ? agree.rows.filter((r) => !(r.shown > 0 && r.shown === r.sent)) : [];
  check('L9 THE ENGINE IS SENT THE NUMBER ON THE SCREEN — swept across the datum slider, not sampled',
    agree.ok && bad.length === 0,
    (agree.ok
      ? 'positions swept: ' + agree.rows.length + ' · disagreements: ' + bad.length
        + (bad.length ? '\n          ' + bad.map((r) => 'pos ' + r.pos + ': screen ' + r.shown + ' vs sent ' + r.sent).join('\n          ')
                      : ' · e.g. pos ' + agree.rows[0].pos + ' -> screen and payload both ' + agree.rows[0].sent)
      : 'COULD NOT READ THE SLIDER OR THE BOX — not a pass')
    + '\n          ⛔ THE SCREEN AND THE PAYLOAD DISAGREEING IS THE WORST PAIRING THERE IS: the page'
    + ' agrees with the user while the model does not, so no surface can reveal it.');

  /* ── L10 — ENUMERATING, NOT NOMINATING: there is ONE place that converts a datum slider position.
        ⛔ THE HISTORY IS THE ARGUMENT. This exact arithmetic was found and fixed LOCALLY at least
           TWICE before today — a comment at the spend box naming "$100,001", and another at the
           Drafting-header mirror naming "$750,006". Both were correct. Both fixed the line the
           reader was looking at. Six other sites kept the old spelling, and one of them was the
           payload. 🔑 A DEFECT THAT KEEPS BEING RE-FOUND IS NOT BEING FIXED; IT IS BEING VISITED.
        This leg does not ask "is site N still correct?" — it asks whether a SECOND conversion has
        appeared anywhere, which is the only question that stays true as the file changes.
        ⚠️ ITS LIMIT, STATED: it reads the call by name, so a destructured or aliased binding would
           slip past. It catches the copy-paste that has actually happened here, twice. */
  const srcAll = studioSource();
  const REGION = /\/\* ⛔⛔ ONE CONVERSION FROM SLIDER POSITION[\s\S]*?\n    \};\n/;
  const hasRegion = REGION.test(srcAll);
  const away = srcAll.replace(REGION, '');
  /* ⭐ THE THREE NAMES ARE READ OFF THE SCALE MODULE, NOT TYPED HERE. datum-shape.js is the only
     definition site, so the population is whatever IT exports — a fourth log slider added next year
     is policed the day it appears, by nobody remembering to add it to this line. */
  const SHAPE_SRC = fs.readFileSync(path.join(__dirname, 'datum-shape.js'), 'utf8');
  const POS_FNS = [...new Set((SHAPE_SRC.match(/\b\w+PosToVal\b/g) || []))].sort();
  const strays = POS_FNS.map((fn) => ({ fn, n: away.split(fn).length - 1 })).filter((r) => r.n > 0);
  check('L10 ONE CONVERSION EXISTS: no second place turns a slider position into money',
    hasRegion && POS_FNS.length >= 3 && strays.length === 0,
    'shared conversion present=' + hasRegion + ' · scale functions found in datum-shape.js: '
    + POS_FNS.join(', ')
    + ' · conversions outside the shared one: '
    + (strays.length ? strays.map((r) => r.fn + '×' + r.n).join(', ') : 'none')
    + '\n          ⛔ every spelling of this formula that has ever existed in this file was correct'
    + ' on its own line and wrong against its neighbours');

  /* ── L11 — THE NUMBER IS ROUND, AT EVERY POSITION, ON EVERY SLIDER.
        ⛔ THE CAPTAIN'S OWN WORDING IS THE SPEC: "if they toggle a slider to 10,000 the math shows
           10,000 not 10,001." This asserts it as arithmetic rather than as a screenshot — sweep the
           control, read what the DRAG HANDLER stored, and require it to land on the resolution that
           quantity is decided at.
        ⭐ IT READS dataset.exactVal, WHICH IS WHAT EVERY SURFACE CONSUMES — the payload, the HUD,
           the edit box, the canvas and the Drafting header all read that one value. Requiring it to
           be PRESENT is also what proves the handler ran: computing the expected number here and
           comparing it to itself would pass with the slider unwired. */
  const roundness = await page.evaluate(() => {
    const SPEC = [
      { id: 'slider-datum',     kind: 'datum',     step: 1000 },
      { id: 'slider-portfolio', kind: 'portfolio', step: 1000 },
      { id: 'slider-contrib',   kind: 'contrib',   step: 100  }
    ];
    const out = [];
    for (const sp of SPEC) {
      const el = document.getElementById(sp.id);
      if (!el) { out.push({ kind: sp.kind, missing: true }); continue; }
      const keepPos = el.value, keepEx = el.dataset.exactVal;
      for (let i = 0; i < 12; i++) {
        const pos = 20000 + Math.round(i * (95000 - 20000) / 11);
        delete el.dataset.exactVal;
        el.value = String(pos);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const stored = el.dataset.exactVal;
        const v = Number(stored);
        const wrote = stored !== undefined && stored !== '' && Number.isFinite(v);
        const round = wrote && (v < sp.step * 10 ? Number.isInteger(v) : v % sp.step === 0);
        if (!wrote || !round) out.push({ kind: sp.kind, pos, stored, step: sp.step, wrote });
      }
      el.value = keepPos;
      if (keepEx === undefined) delete el.dataset.exactVal; else el.dataset.exactVal = keepEx;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return out;
  });
  check('L11 THE NUMBER IS ROUND: every slider position stores a value at its declared resolution',
    Array.isArray(roundness) && roundness.length === 0,
    (roundness.length === 0
      ? '36 positions across datum ($1,000) · portfolio ($1,000) · contrib ($100) — all clean'
      : roundness.length + ' bad: ' + roundness.slice(0, 6).map((r) => r.missing
          ? r.kind + ' SLIDER NOT FOUND'
          : r.kind + ' pos ' + r.pos + ' stored ' + JSON.stringify(r.stored)
            + (r.wrote ? ' (not a multiple of ' + r.step + ')' : ' (HANDLER WROTE NOTHING)')).join(' · '))
    + '\n          ⛔ $10,001 where the user chose $10,000 is not a rounding preference — it is the'
    + ' product disagreeing with the control the user just moved');

  /* ── L12 — AND THE ROUND NUMBER IS REACHABLE. L11's blind spot, closed rather than confessed.
        ⛔ L11 ASKS "IS THE OUTPUT TIDY?" AND A COARSER STEP MAKES IT TIDIER. Raise contrib's step
           from $100 to $1,000 and every value is still a multiple of 100, so L11 stays GREEN while
           $12,500 — an ordinary contribution — becomes UNSELECTABLE, silently corrected to $13,000.
           A LEG THAT A DEFECT CAN SATISFY BY GETTING WORSE IS NOT A CONTROL.
        This asks the opposite question: put the control exactly where a user aiming at a round
        figure would put it, and require that figure back. Tidiness and reachability pull in
        opposite directions, so the pair pins the step from both sides. */
  const reach = await page.evaluate(() => {
    const S = window.DatumShape && DatumShape.scales;
    if (!S) return [{ kind: 'scales', missing: true }];
    const SPEC = [
      { id: 'slider-datum',     kind: 'datum',     toPos: (v) => S.datumValToPos(v / 1000),  targets: [40000, 65000, 120000] },
      { id: 'slider-portfolio', kind: 'portfolio', toPos: (v) => S.portValToPos(v / 1e6),    targets: [250000, 750000, 2000000] },
      /* ⭐ $12,500 IS IN THIS LIST ON PURPOSE — it is the value that dies first if the step is
         widened, and the only one of the nine that a $1,000 step would not already satisfy. */
      { id: 'slider-contrib',   kind: 'contrib',   toPos: (v) => S.contribValToPos(v),       targets: [12500, 25000, 40000] }
    ];
    const bad = [];
    for (const sp of SPEC) {
      const el = document.getElementById(sp.id);
      if (!el) { bad.push({ kind: sp.kind, missing: true }); continue; }
      const keepPos = el.value, keepEx = el.dataset.exactVal;
      for (const want of sp.targets) {
        delete el.dataset.exactVal;
        el.value = String(Math.max(0, Math.min(100000, Math.round(sp.toPos(want)))));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const got = Number(el.dataset.exactVal);
        if (got !== want) bad.push({ kind: sp.kind, want, got: el.dataset.exactVal });
      }
      el.value = keepPos;
      if (keepEx === undefined) delete el.dataset.exactVal; else el.dataset.exactVal = keepEx;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return bad;
  });
  check('L12 AND IT IS REACHABLE: aiming the control at a round figure returns that figure',
    Array.isArray(reach) && reach.length === 0,
    (reach.length === 0
      ? '9 targets — datum 40k/65k/120k · portfolio 250k/750k/2M · contrib 12.5k/25k/40k — all exact'
      : reach.length + ' unreachable: ' + reach.map((r) => r.missing
          ? r.kind + ' NOT FOUND'
          : r.kind + ' wanted ' + r.want + ' got ' + JSON.stringify(r.got)).join(' · '))
    + '\n          ⛔ a step wide enough to tidy the number is also wide enough to delete the answer');




  /* ══════════════════════════════════════════════════════════════════════════════════════════
     CONFIGURATION DUAL — EVERYTHING ABOVE THIS LINE MEASURED ONE HALF OF THE PRODUCT.
     ⛔⛔ THIS GATE SHIPPED ON 2026-09-12 AND WALKED SOLO ONLY. It reported THREE unaccounted keys.
        The true figure was FOUR. The fourth was not newly broken and it was not missed by a
        careless reader — IT WAS NEVER INSIDE THE POPULATION. ss_strategy_secondary exists only
        when a second person does, and this instrument had never once turned the household to two.
     ⛔ THE CAPTAIN NAMED IT FROM MEMORY, WITHOUT CODE IN FRONT OF HIM, while the gate said three.
        A count from an instrument that cannot enter half the product is not a conservative count;
        it is a confident one about a smaller thing than the sentence claims.
     🔑 SO THE RULE THIS BLOCK EXISTS TO ENFORCE IS NOT "ALSO CHECK DUAL". IT IS THAT EVERY NUMBER
        THIS FILE PRINTS CARRIES THE CONFIGURATION IT WAS MEASURED IN. A bare N is the defect.
     ⚠️ TURNING THE HOUSEHOLD TO TWO IS A CONFIGURATION, NOT AN ANSWER, AND THE DISTINCTION IS THE
        SAME ONE THE WALK ALREADY TURNS ON. Seeding supplies a value before the product asks.
        Declaring that two people live here is the user telling the product WHICH PRODUCT THEY ARE
        USING — the precondition for the second person's fields to exist at all. It is done by
        CLICKING THE BUTTON A USER CLICKS, never by writing the hidden checkbox, for exactly the
        reason the datum slider is dragged rather than assigned. */
  const dualPage = await ctx.newPage();
  await dualPage.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await dualPage.waitForTimeout(1400);
  await dualPage.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await dualPage.waitForTimeout(600);
  await dualPage.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await dualPage.evaluate(() => window._studioEnterRoom('data'));
  await dualPage.waitForTimeout(700);
  await dualPage.evaluate(() => {
    const b = document.querySelector('[data-co-architect-toggle]');
    if (b) b.click();
  });
  await dualPage.waitForTimeout(500);

  /* ⛔⛔ L13 IS THE MOST IMPORTANT LEG IN THIS BLOCK AND IT MEASURES THE HARNESS, NOT THE PRODUCT.
     A dual walk that quietly stayed solo would report SOLO'S NUMBER UNDER A DUAL HEADING — which is
     strictly worse than not measuring dual at all, because the gap would then look CLOSED. That is
     the empty-green species in its purest form: an instrument reporting on a configuration it never
     entered. It asserts the STORE flipped and the second person's fields are actually on screen,
     because either alone is satisfiable without the other. */
  const dualOn = await dualPage.evaluate(() => {
    const tog = document.getElementById('co-arch-toggle');
    const fields = document.getElementById('co-arch-fields');
    const dobBox = document.getElementById('co-dob');
    return {
      checked: !!(tog && tog.checked),
      fieldsShown: !!(fields && getComputedStyle(fields).display !== 'none'),
      dobReachable: !!(dobBox && dobBox.offsetParent !== null)
    };
  });
  check('L13 INSTRUMENT: the walk ACTUALLY ENTERED DUAL — the household is two and the second person is on screen',
    dualOn.checked && dualOn.fieldsShown && dualOn.dobReachable,
    'store checked=' + dualOn.checked + ' · co-arch fields displayed=' + dualOn.fieldsShown
    + ' · #co-dob reachable=' + dualOn.dobReachable
    + '\n          ⛔ IF THIS LEG IS EVER RED, EVERY DUAL NUMBER BELOW IT IS A SOLO NUMBER WEARING'
    + ' A DUAL LABEL. Read nothing under it.');

  const dualWalk = await walkRefusals(dualPage);

  check('L14 INSTRUMENT: the door opened in DUAL from an EMPTY Studio with nothing seeded',
    dualWalk.payload !== null && !dualWalk.stuck,
    dualWalk.payload
      ? ('opened after ' + dualWalk.rounds + ' refusals: ' + [...dualWalk.asked].join(', '))
      : ('STUCK — ' + dualWalk.stuck)
    + '\n          ⛔ a configuration the harness cannot walk is a configuration nobody is measuring');

  const dualKeys = dualWalk.payload ? Object.keys(dualWalk.payload) : [];
  const dualOnly = dualKeys.filter((k) => !keys.includes(k));

  check('L15 ENUMERATED FROM THE DUAL PAYLOAD — CONFIGURATION DUAL',
    dualKeys.length > 0,
    dualKeys.length + ' key(s) sent in dual: ' + dualKeys.join(', ')
    + '\n          keys that exist ONLY when a second person does (' + dualOnly.length + '): '
    + (dualOnly.join(', ') || 'none')
    + '\n          ⛔ EVERY KEY ON THAT SECOND LINE WAS OUTSIDE THIS GATE\'S POPULATION UNTIL TODAY');

  const dAsked = [], dDeclared = [], dUnaccounted = [];
  for (const k of dualKeys) {
    const control = FROM_CONTROL[k];
    if (control && dualWalk.asked.has(control)) { dAsked.push(k); continue; }
    const d = decl.keys && decl.keys[k];
    if (d && (d.kind === 'machinery' || d.kind === 'derived') && d.reason) { dDeclared.push(k); continue; }
    dUnaccounted.push(k);
  }

  check('L16 NOTHING IS SENT ON A USER\'S BEHALF WITHOUT BEING ASKED FOR OR DECLARED — CONFIGURATION DUAL',
    dUnaccounted.length <= (decl.max_unaccounted || 0),
    dUnaccounted.length + ' unaccounted IN DUAL (ratchet allows ' + (decl.max_unaccounted || 0) + '):'
    + dUnaccounted.map((k) => {
      const v = dualWalk.payload[k];
      const shown = (v && typeof v === 'object')
        ? (Array.isArray(v) ? '[' + v.length + ' items]' : '[object]') : String(v);
      return '\n            · ' + k.padEnd(30) + '= ' + shown.slice(0, 44);
    }).join('')
    + '\n          ASKED (' + dAsked.length + '): ' + dAsked.join(', ')
    + '\n          DECLARED (' + dDeclared.length + '): ' + (dDeclared.join(', ') || 'none')
    + '\n          ⛔ THE RATCHET FALLS BY ASKING FOR A FIELD, NEVER BY DECLARING IT AWAY');

  /* ── L17 — THE WORD "DERIVED" IS NOT A PLACE TO PUT THINGS.
     ⛔⛔ THIS IS THE LEG THAT MAKES TEACHING THE GATE DUAL *SUFFICIENT* RATHER THAN MERELY
        NECESSARY, AND THE DISTINCTION COST A SESSION TO SEE. Walking dual puts
        ss_strategy_secondary inside the population for the first time — and L16 STILL CLEARS IT,
        because payload_sources.json declares it kind="derived", "the strategy the user picked."
        ⛔ THE USER DID NOT PICK IT. THE MARKUP DID: studio.html ships
           `<button class="ss-sec-btn active"><strong>67</strong>` and the reader falls back to
           `|| 'full_67'` behind that. Nobody touched a control; a value went out anyway.
     🔑 DERIVED MEANS COMPUTED FROM SOMETHING A HUMAN ANSWERED. IF NOTHING WAS ANSWERED, NOTHING
        WAS DERIVED — IT WAS ASSUMED, and the word was doing the work a ratchet used to do with no
        number attached to it. A LABEL THAT EXEMPTS A KEY FROM COUNTING IS A RATCHET SPELLED IN
        PROSE.
     ⚠️ THE TEST IS MECHANICAL AND IT IS DELIBERATELY NOT "DOES `from` READ CONVINCINGLY". Prose
        cannot be checked. A derived key that is PRESENT on a payload must be traceable to a control
        the product actually REFUSED ON during that same walk. Absent keys are not in the
        population — custom_weights is absent unless a user picks Custom Matrix, which is exactly
        what an honest derivation looks like from here.
     ⇒ THE TWO HONEST REMEDIES, AND NEITHER IS AN EDIT TO THIS FILE: give the field a door, or
       reclassify it and let the ratchet count it. */
  const laundered = [];
  for (const [cfg, walk, kl] of [['SOLO', { asked }, keys], ['DUAL', dualWalk, dualKeys]]) {
    for (const k of kl) {
      const d = (decl.keys || {})[k];
      if (!d || d.kind !== 'derived') continue;
      const control = FROM_CONTROL[k];
      if (control && walk.asked.has(control)) continue;   // genuinely answered — the chain holds
      laundered.push(cfg + ': ' + k + ' = ' + JSON.stringify(walk === dualWalk ? dualWalk.payload[k] : payload[k]).slice(0, 40)
        + (control ? ' (control ' + control + ' never refused)' : ' (no control named at all)'));
    }
  }
  check('L17 "DERIVED" NAMES A REAL HUMAN ANSWER: no key is exempted from counting by a word',
    laundered.length === 0,
    (laundered.length === 0
      ? 'every derived key on both payloads traces to a control the product refused on'
      : laundered.length + ' declared derived but nobody answered anything:'
        + laundered.map((s) => '\n            · ' + s).join(''))
    + '\n          ⛔ A KEY DECLARED DERIVED WITH NO ANSWERED SOURCE IS UNACCOUNTED WEARING A LABEL.'
    + ' Fix it with a door or with the ratchet — never with the declaration.');

  /* ── L18 — CLAUSE 1, AS AN INSTRUMENT RATHER THAN AN INTENTION.
     "EVERY FIELD PERTINENT TO THE PRIMARY IS PERTINENT TO THE CO-ARCHITECT — there is no such
     thing as a second-person field that matters less."
     ⛔⛔ THE ANSWER THIS PROGRAMME KEEPS REACHING FOR IS DELETION. When a second-person field
        measures inert, the proposal comes back "remove it from the profile". THE REMOVAL TEST
        SETTLES IT: say the same sentence about the PRIMARY. "retirement_age measures inert, delete
        it" is absurd on its face — so it was always absurd about co_architect_retirement_age.
        INERT MEANS ITS CONSUMER WAS NEVER BUILT. THAT IS A BUILD, NOT A DELETE.
     ⭐ THE POPULATION IS A RULE, NOT A LIST: every key either payload sends, or that
        payload_sources.json declares, whose name pairs to a first-person counterpart. A sixth
        co-architect field wired next year is measured the day it appears.
     ⚠️ WHAT IT PROVES AND WHAT IT DOES NOT: it proves the product DEMANDS the same things of both
        people. It says nothing about whether the ENGINE then consumes what it is told — that is a
        different measurement, in a different repo, and co_architect_retirement_age is already known
        to fail it. A door with nothing behind it is a separate defect from no door. */
  const universe = [...new Set([...Object.keys(decl.keys || {}), ...keys, ...dualKeys])];
  const gaps = [], symmetric = [], held = [];
  for (const second of universe.sort()) {
    const first = primaryCounterpart(second);
    if (!first) continue;
    const pCtl = FROM_CONTROL[first], sCtl = FROM_CONTROL[second];
    const pAsked = !!(pCtl && asked.has(pCtl));
    const sAsked = !!(sCtl && dualWalk.asked.has(sCtl));
    const row = first + ' -> ' + second;
    if (pAsked && !sAsked) gaps.push(row + '  (the primary is demanded at #' + pCtl + '; the co-architect is '
      + (sCtl ? 'never refused at #' + sCtl : 'not wired to any control') + ')');
    else if (pAsked && sAsked) held.push(row);
    else symmetric.push(row + '  (neither person is asked — a Clause 2 defect on BOTH sides, not a Clause 1 gap)');
  }
  check('L18 CLAUSE 1 — WHAT THE PRODUCT DEMANDS OF THE PRIMARY, IT DEMANDS OF THE CO-ARCHITECT',
    gaps.length === 0,
    held.length + ' pair(s) symmetric and demanded of both: ' + (held.join(', ') || 'none')
    + '\n          ' + gaps.length + ' ASYMMETRIC — asked of the primary, never of the second person:'
    + (gaps.length ? gaps.map((s) => '\n            · ' + s).join('') : ' none')
    + (symmetric.length ? '\n          ' + symmetric.length + ' pair(s) asked of NEITHER:'
        + symmetric.map((s) => '\n            · ' + s).join('') : '')
    + '\n          ⛔ A FIELD THE PRODUCT WILL NOT OPEN THE DOOR WITHOUT FOR ONE PERSON, AND SHRUGS'
    + ' AT FOR THE OTHER, IS THE ENGINE\'S CO-ARCHITECT BLIND SPOT REPRODUCED IN THE UI.'
    + '\n          ⛔ THE FIX IS A DOOR, NEVER A DELETION. Apply the removal test before proposing one.');



  /* ══════════════════════════════════════════════════════════════════════════════════════════
     THE SS-MATRIX PAYLOAD — A SECOND REQUEST SURFACE, ENUMERATED FOR THE FIRST TIME.
     ⛔⛔ IT WAS NOT UNMEASURED BECAUSE NOBODY CARED. IT WAS UNMEASURABLE: buildMatrixRequest was
        nested inside another function, so typeof window.buildMatrixRequest was "undefined" and a
        scoped eval could not reach it either. NO HARNESS COULD CALL IT. dc7117f exposed it and
        this is the first thing to walk through that door.
     🔑 SEVEN OF THE ELEVEN DECLARATIONS IN _payload_sources.json DESCRIBE THIS PAYLOAD and have
        never been checked against anything. A declaration whose payload no instrument walks is a
        claim, not a record.
     ⚠️ IT IS CAPTURED BEFORE THE JOINT->SOLO BLOCK because that block mutates dualPage. Order is
        load-bearing here, not incidental. */
  async function captureMatrix(pg, label) {
    return pg.evaluate(() => {
      if (typeof window.buildMatrixRequest !== "function") return { reachable: false };
      /* ⛔ CLEARED FIRST, SO A REFUSAL READ AFTERWARDS BELONGS TO THIS CALL. These globals are
         left behind by whatever refused last; reading them without clearing would attribute an
         earlier walk's refusal to the matrix builder. */
      window._buildRequestError = null;
      window._buildRequestErrorField = null;
      window._buildRequestErrorTarget = null;
      let body = null, threw = null;
      try { body = window.buildMatrixRequest(); } catch (e) { threw = String(e && e.message).slice(0, 120); }
      return {
        reachable: true, threw: threw, body: body,
        refusal: window._buildRequestError || null,
        refusalField: window._buildRequestErrorField || null,
        refusalTarget: window._buildRequestErrorTarget || null
      };
    });
  }
  /* ⛔⛔ THE MATRIX HAS ITS OWN REQUIRED SET, AND NOBODY HAD EVER ASKED WHAT IT WAS. Walking it the
     same way the calculate door was walked — answer only what it refuses on, record the demand
     BEFORE satisfying it — turns "the matrix does not build in dual" into a NAMED LIST of what this
     surface demands that the other one does not.
     🔑 THE TWO REQUIRED SETS ARE THE MEASUREMENT. A field on one list and not the other is the
        product holding two opinions about the same household. */
  async function walkMatrix(pg) {
    const demanded = [];
    for (let i = 0; i < 8; i++) {
      const r = await captureMatrix(pg);
      if (!r.reachable || r.threw || (r.body && Object.keys(r.body).length)) return { ...r, demanded };
      if (!r.refusalTarget) return { ...r, demanded, stuck: 'refused with no target named' };
      demanded.push(r.refusalTarget);
      if (!ANSWERS[r.refusalTarget]) return { ...r, demanded, stuck: 'no answer known for ' + r.refusalTarget };
      await pg.evaluate((a) => {
        const el = document.getElementById(a[0]); if (!el) return;
        el.focus(); el.value = a[1];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }, [r.refusalTarget, ANSWERS[r.refusalTarget]]);
      await pg.waitForTimeout(120);
    }
    return { reachable: true, body: null, demanded, stuck: 'still refusing after 8 rounds' };
  }
  const matrixSolo = await walkMatrix(page);
  const matrixDual = await walkMatrix(dualPage);

  const mSoloKeys = (matrixSolo.body && Object.keys(matrixSolo.body)) || [];
  const mDualKeys = (matrixDual.body && Object.keys(matrixDual.body)) || [];

  check('L23 INSTRUMENT: the SS-matrix builder is reachable and answers in BOTH configurations',
    matrixSolo.reachable && matrixDual.reachable && !matrixSolo.threw && !matrixDual.threw
      && mSoloKeys.length > 0 && mDualKeys.length > 0,
    'solo: reachable=' + matrixSolo.reachable + (matrixSolo.threw ? ' THREW ' + matrixSolo.threw : '')
      + ' · keys=' + mSoloKeys.length
    + '\n          dual: reachable=' + matrixDual.reachable + (matrixDual.threw ? ' THREW ' + matrixDual.threw : '')
      + ' · keys=' + mDualKeys.length
    + '\n          THE MATRIX\'S OWN REQUIRED SET — what it refused on that the calculate door did not:'
    + '\n            solo demanded (' + matrixSolo.demanded.length + '): ' + (matrixSolo.demanded.join(', ') || 'nothing')
      + (matrixSolo.stuck ? '  ⛔ STUCK: ' + matrixSolo.stuck : '')
    + '\n            dual demanded (' + matrixDual.demanded.length + '): ' + (matrixDual.demanded.join(', ') || 'nothing')
      + (matrixDual.stuck ? '  ⛔ STUCK: ' + matrixDual.stuck : '')
    + '\n          ⛔ EVERY TARGET ON THOSE LINES IS A FIELD ONE SURFACE DEMANDS AND THE OTHER SHRUGS AT.'
    + '\n          ⛔ IF THIS IS RED THE SURFACE IS STILL UNMEASURABLE AND EVERY COUNT BELOW IS ZERO'
    + ' BECAUSE NOBODY LOOKED, NOT BECAUSE NOTHING IS THERE.');

  /* ⛔ THE MATRIX PAYLOAD AGAINST THE CALCULATE PAYLOAD. The matrix is not a different household —
     it is the SAME household asked a different question, so every key it adds or drops is a
     deliberate difference somebody must own. */
  const addsDual = mDualKeys.filter((k) => !dualKeys.includes(k));
  const dropsDual = dualKeys.filter((k) => !mDualKeys.includes(k));
  check('L24 THE TWO REQUEST SURFACES DIFFER ONLY WHERE SOMEBODY MEANT THEM TO — CONFIGURATION DUAL',
    mDualKeys.length > 0,
    'calculate sends ' + dualKeys.length + ' keys · matrix sends ' + mDualKeys.length
    + '\n          ONLY ON THE MATRIX (' + addsDual.length + '): ' + (addsDual.join(', ') || 'none')
    + '\n          ONLY ON CALCULATE (' + dropsDual.length + '): ' + (dropsDual.join(', ') || 'none')
    + '\n          ⚠️ THIS LEG REPORTS, IT DOES NOT JUDGE. A difference is a decision; an'
    + ' UNEXPLAINED difference is a defect, and telling them apart is a ruling, not a measurement.');

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     CONFIGURATION JOINT -> SOLO. BEREAVEMENT. DIVORCE. THE THIRD CONFIGURATION, AND UNTIL
     2026-09-13 NOTHING IN THIS REPOSITORY HAD EVER ENTERED IT.
     ⛔⛔ IT IS NOT "DUAL AGAIN WITH A FLAG OFF". It is a TRANSITION, and transitions have a
        property states do not: THEY CAN LEAVE THINGS BEHIND. A household that was two and is now
        one is the only configuration in which a value can belong to a person who is no longer in
        the model, and the product has no other route to that state.
     🔑 THE DANGEROUS BUCKET IS NOT WHAT THE TOGGLE DESTROYS — IT IS WHAT SURVIVES. A co-architect
        value still riding the payload after the co-architect is gone is Clause 2 wearing a
        different face: somebody else's number colouring this person's Range, where that somebody
        was a real second person in this very session.
     ⚠️ ADDING A CO-ARCHITECT ACCOUNT FIRST IS SETTING UP THE CONDITION, NOT SEEDING AN ANSWER, and
        the distinction is the one this whole file turns on. Nothing here answers a refusal. It
        makes the household ACTUALLY JOINT in the one respect the off-branch acts on — the listener
        splices every account whose base type is 'coarch'. A FIXTURE WITH NO CO-ARCHITECT ACCOUNT
        CANNOT MEASURE A BRANCH THAT ONLY DELETES CO-ARCHITECT ACCOUNTS: it would report a clean
        transition and prove nothing. */
  await dualPage.evaluate(() => {
    addInstance('taxable_co');
    const a = window.state.accounts.filter((x) => x.baseId === 'taxable_co').pop();
    if (a) a.value = 250000;
  });
  await dualPage.waitForTimeout(150);

  const beforeOff = await dualPage.evaluate(() => {
    window._buildRequestErrors = [];
    let body = null;
    try { body = window._buildStudioRequest(); } catch (e) { /* refusal */ }
    return {
      payload: body,
      accounts: (window.state.accounts || []).map((a) => a.baseId),
      accountCount: (window.state.accounts || []).length
    };
  });

  /* THE TRANSITION — the button a user clicks, never the hidden checkbox. */
  await dualPage.evaluate(() => {
    const b = document.querySelector('[data-co-architect-toggle]');
    if (b) b.click();
  });
  await dualPage.waitForTimeout(600);

  const afterOff = await dualPage.evaluate(() => {
    const tog = document.getElementById('co-arch-toggle');
    const fields = document.getElementById('co-arch-fields');
    window._buildRequestErrors = [];
    let body = null;
    try { body = window._buildStudioRequest(); } catch (e) { /* refusal */ }
    return {
      payload: body,
      stillChecked: !!(tog && tog.checked),
      fieldsShown: !!(fields && getComputedStyle(fields).display !== 'none'),
      accounts: (window.state.accounts || []).map((a) => a.baseId),
      accountCount: (window.state.accounts || []).length,
      refusals: (window._buildRequestErrors || []).map((e) => e.field).filter(Boolean)
    };
  });

  check('L19 INSTRUMENT: the walk ACTUALLY LEFT DUAL — the household is one again',
    !afterOff.stillChecked && !afterOff.fieldsShown,
    'store checked=' + afterOff.stillChecked + ' · co-arch fields displayed=' + afterOff.fieldsShown
    + '\n          ⛔ IF THIS LEG IS RED, EVERY NUMBER BELOW IT DESCRIBES A HOUSEHOLD THAT IS STILL TWO.');

  const destroyed = beforeOff.accounts.filter((b) => {
    const a = afterOff.accounts.slice();
    const i = a.indexOf(b);
    return i === -1;
  });
  check('L20 THE TRANSITION DESTROYS THE CO-ARCHITECT ESTATE, AND THIS NAMES WHAT IT TOOK',
    beforeOff.accountCount > afterOff.accountCount,
    'accounts before ' + beforeOff.accountCount + ' -> after ' + afterOff.accountCount
    + '  · destroyed: ' + (destroyed.join(', ') || 'NOTHING')
    + '\n          ⚠️ THIS LEG IS A RECORD, NOT A COMPLAINT. Deleting a co-architect account when the'
    + ' co-architect is removed is defensible. What is NOT defensible is doing it with no warning'
    + ' and no undo, and that is a product ruling nobody has made.'
    + '\n          ⛔ IF NOTHING WAS DESTROYED THE FIXTURE NEVER MADE THE HOUSEHOLD JOINT and every'
    + ' leg below is measuring a transition that did not happen.');

  /* ⛔ THE CENSUS. Every key across BOTH payloads lands in exactly one bucket and the buckets sum
     to the union, in both directions — the same law the engine-surface census holds. */
  const dualKeysT  = beforeOff.payload ? Object.keys(beforeOff.payload) : [];
  const soloKeysT  = afterOff.payload  ? Object.keys(afterOff.payload)  : [];
  const union      = [...new Set([...dualKeysT, ...soloKeysT])];
  const secondPerson = (k) => primaryCounterpart(k) !== null;

  const cleared = [], survived = [], appeared = [], carried = [];
  for (const k of union) {
    const inDual = dualKeysT.includes(k), inSolo = soloKeysT.includes(k);
    if (secondPerson(k)) { (inSolo ? survived : cleared).push(k); }
    else if (inSolo && !inDual) appeared.push(k);
    else carried.push(k);
  }

  check('L21 NO CO-ARCHITECT VALUE SURVIVES THE CO-ARCHITECT — the dangerous bucket',
    survived.length === 0,
    'second-person keys cleared by the transition (' + cleared.length + '): ' + (cleared.join(', ') || 'none')
    + '\n          ⛔ STILL ON THE SOLO PAYLOAD (' + survived.length + '): ' + (survived.join(', ') || 'none')
    + '\n          🔑 A VALUE THAT OUTLIVES THE PERSON IT DESCRIBES IS SOMEBODY ELSE\'S NUMBER'
    + ' COLOURING THIS HOUSEHOLD\'S RANGE — Clause 2, reached through a door only this transition opens.');

  check('L22 THE TRANSITION CENSUS SUMS BOTH WAYS',
    (cleared.length + survived.length + appeared.length + carried.length) === union.length
      && appeared.length === 0 && soloKeysT.length > 0,
    'dual payload ' + dualKeysT.length + ' keys · solo-after payload ' + soloKeysT.length + ' keys'
    + ' · union ' + union.length
    + '\n          cleared=' + cleared.length + '  survived=' + survived.length
    + '  appeared=' + appeared.length + '  carried=' + carried.length
    + '   [' + (cleared.length + survived.length + appeared.length + carried.length) + ' of ' + union.length + ']'
    + (appeared.length ? '\n          ⛔ APPEARED AFTER THE TRANSITION: ' + appeared.join(', ')
        + ' — a key the solo payload carries and the dual one did not' : '')
    + (soloKeysT.length === 0 ? '\n          ⛔ THE SOLO PAYLOAD DID NOT BUILD: '
        + (afterOff.refusals.join(', ') || 'no refusal named')
        + ' — the transition left the household unable to ask for a Range at all' : ''));


  /* ── THE OBSERVED PAYLOADS ARE WRITTEN OUT, SO A SECOND INSTRUMENT CAN JOIN THEM AGAINST THE
     ENGINE'S OWN FIELD LIST WITHOUT WALKING THE PRODUCT A THIRD TIME.
     ⛔ THIS GATE ANSWERS "IS ANYTHING HERE UNACCOUNTED?" — a question about the keys that ARE sent.
        It is structurally incapable of noticing a field the engine accepts and the client NEVER
        SENDS, because such a field never appears on a payload to be enumerated. That is not a gap
        in this file; it is the boundary of its question, and the census is the other half.
     ⚠️ TEMP DIR, NEVER THE REPO. This is observation, not source. */
  try {
    fs.writeFileSync(path.join(require('os').tmpdir(), 'datum-payload-observed.json'),
      JSON.stringify({
        measured_at: new Date().toISOString(),
        solo: { payload: payload, asked: [...asked],
                askedKeys: askedKeys, declaredKeys: declaredKeys, unaccounted: unaccounted },
        matrix: { solo: matrixSolo, dual: matrixDual },
        dual: { payload: dualWalk.payload, asked: [...dualWalk.asked],
                askedKeys: dAsked, declaredKeys: dDeclared, unaccounted: dUnaccounted },
        laundered: laundered
      }, null, 2), 'utf8');
  } catch (e) { /* observation is a courtesy to the census; it never fails this gate */ }

  await dualPage.close();


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
