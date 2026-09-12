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
      /* ⛔⛔ THE SECOND DELETE IS THE WHOLE LEG, AND ITS FIRST RED-FIRST RUN PROVED IT.
         Dispatching 'input' makes the drag handler WRITE dataset.exactVal — and the payload reads
         exactVal BEFORE it reads the position. So a sweep that stops here measures the typed-fact
         branch, while the defect lives on the POSITION branch, which is the only one a COLD Studio
         has: nobody has dragged anything, so there is no exactVal to read. M37 restored the real
         100001 arithmetic and this leg stayed GREEN until the delete below was added.
         🔑 THE FIXTURE HAD SUPPLIED THE PRECONDITION THAT HIDES THE BUG — the same shape as the
            refusal walk that seeded an account and then reported no account requirement. */
      delete sDat.dataset.exactVal;
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
