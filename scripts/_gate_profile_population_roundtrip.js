/* @gate-pool: browser */
'use strict';
/* _gate_profile_population_roundtrip.js — STANDING GATE for FINDING 64.
 *
 * THE CLAIM: every control the user can fill in #sec-profile survives a reload — and the ones that
 * do not are DECLARED, by name, alongside the size of the set they belong to.
 *
 * ⛔⛔ WHY THIS EXISTS, AND IT IS THE MOST EXPENSIVE LESSON OF THE ARC. F47 was declared CLOSED on a
 *    gate asserting THREE fields: pri-dob, target-ret, spend-input. All three passed. All three
 *    still pass. The feature was broken — the Captain filled the Profile for both people in
 *    incognito, reloaded, and got FIVE fields back out of THIRTEEN.
 * 🔑 THE NOMINATED-POPULATION FAULT: a population of three was nominated, three greens came back,
 *    and a thirteen-field feature was called closed. "3 of 3 asserted fields pass" is honest;
 *    "the restore works" is not.
 * ⛔ SO THIS GATE MAY NOT NOMINATE. It ENUMERATES #sec-profile FROM THE LIVE DOM and types every
 *    control it finds. The roster is DATA, discovered at run time — never a list in this file, and
 *    never the number 13, which is inherited and would quietly stop being true the day somebody adds
 *    a field. A NEW PROFILE CONTROL JOINS THIS GATE'S POPULATION BY EXISTING.
 *
 * ⛔ L3 IS THE ANTI-FABRICATION HALF AND IT IS NOT OPTIONAL. newBlueprint() ships tax defaults
 *    FL / Married Filing Jointly / 0.20, and captureDOM only overwrites them when the user actually
 *    answered — so a naive restore writes Florida into a select the user never touched. MEASURED
 *    with the schema-default guard removed: filing-status came back "Married Filing Jointly" for a
 *    user who chose nothing. (location and rate stayed blank only because 'FL' and '20%' are not
 *    valid options in their own selects — an INCIDENTAL rescue that any future edit to either option
 *    list would remove, which is precisely why the guard is gated rather than trusted.)
 * 🔑 A RESTORE THAT CAN FABRICATE IS WORSE THAN ONE THAT LOSES DATA. Blank is honest; "Florida" is a
 *    lie about where somebody lives, on the screen that decides their tax burden.
 *
 * ⚠️ ~~"DECLARED OPEN — pri-salary and co-salary. They have NO schema slot anywhere and were ruled to
 *    travel in their own commit. L2 asserts they are STILL open, so this gate goes RED the day they
 *    are fixed and forces this exemption to be deleted in that same commit."~~ STRUCK 2026-09-09.
 *    Both now round-trip and DECLARED_OPEN is empty, so L2 has no subjects left. The expiry
 *    condition worked exactly as written — and then the leg it governed became VACUOUS, which is a
 *    second failure mode the note never anticipated.
 *
 * ⛔⛔ WHAT THE EMPTIED LIST ACTUALLY COST, AND IT IS THE REASON L5/L6 EXIST. The exemption was
 *    cleared 2026-09-04 on the claim that "schema 1.1.0 now captures and restores both". That
 *    round-trip had only ever been run WITH A NONZERO SALARY. Salary-zero — a value CORRECTED to 0
 *    being discarded at capture and the SUPERSEDED number handed back on reload — shipped underneath
 *    it, four days later, past a green.
 * 🔑 TWO SEPARATE FAULTS, AND SEPARATING THEM IS THE POINT:
 *    (1) A FIXTURE WITH A NONZERO VALUE PROVES NOTHING ABOUT A DEFECT THAT ONLY TOUCHES ZERO. The
 *        evidence that lifted the exemption STRUCTURALLY COULD NOT SEE THE THING IT CERTIFIED.
 *    (2) `DECLARED_OPEN = []` MADE L2 EVALUATE `0 === 0` — a predicate over an empty set: forever
 *        true, forever green, and in a suite summary indistinguishable from a leg that checked
 *        something. L2 now LABELS itself vacuous rather than passing quietly.
 * ⭐ L5/L6 ARE THE REPLACEMENT AND THEY ARE STRICTLY STRONGER THAN THE EXEMPTION EVER WAS: they
 *    CORRECT a real value to zero rather than typing zero into a blank, and they distinguish the two
 *    ways it can fail — RESURRECTED (the superseded value returns) from LOST (it comes back blank).
 *    MEASURED red-first 2026-09-09 on the pre-fix bytes: pri-salary came back "$209,000" RESURRECTED
 *    and co-salary came back "" LOST, in one run, while L5 stayed green — so the red is about
 *    persistence and not about a fixture that failed to type.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8195;

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

/* DECLARED OPEN, BY NAME — no schema slot; ruled to their own commit. See L2's expiry condition. */
/* ⛔ EMPTIED 2026-09-04, AND THE GATE ORDERED IT. L2 is an EXPIRY leg: it reds ON PURPOSE the
   moment a declared-open field starts round-tripping, printing "NOW RESTORING: delete it from
   DECLARED_OPEN". That is the gate refusing to let a known-broken list quietly outlive the breakage
   it documents — A GREEN WHOSE PROOF HAS EXPIRED. This edit is the leg's own instruction, not a
   contract being bent to match reality (§82.1522).
   ⚠️ WHY THEY WERE OPEN AT ALL, AND IT WAS NOT WHAT THE LIST BELIEVED: salary was never persisted
      by the product -- ZERO `.value =` writes anywhere -- so it survived reloads on BROWSER FORM
      RESTORATION, and this gate's green was manufactured by Chromium. Blueprint schema 1.1.0 now
      captures and restores both, so the list is empty ~~"and all 19 rostered controls are
      asserted"~~ — MEASURED 2026-09-09: the roster is THIRTEEN in the arm that runs, not nineteen.
      The number was inherited from a different run and is exactly the kind of figure this gate's own
      header forbids ("never the number 13, which is inherited"). It is struck rather than corrected
      to 13, because ANY literal count here is wrong by construction: L1 prints the population it
      actually enumerated, and that print is the only honest statement of the size. */
const DECLARED_OPEN = [];
/* The three tax controls, left UNANSWERED in the L3 arm. Named here only to decide which ARM they
   belong to — never to decide whether they are part of the population. */
/* ⛔ eff-tax-rate-exact JOINS THIS SET BECAUSE IT IS DEPENDENT, NOT MERELY BECAUSE IT IS TAXY.
   L3 leaves these unanswered and asserts they come back blank. The typed-rate box is captured ONLY
   while #eff-tax-rate reads 'exact' — so leaving the select unanswered while ANSWERING the box
   describes a user who typed a figure into a control they never opened. Its value is then correctly
   discarded, and L4 red over a fixture that could not exist rather than over a defect.
   🔑 A CONTROL WITH A PRECONDITION MUST BE ARMED AND DISARMED WITH THE CONTROL IT DEPENDS ON.
      Enumerating the DOM finds every control; it cannot find which ones only mean something
      together. That relationship has to be declared, and this is the declaration. */
/* ⛔ eff-tax-rate AND eff-tax-rate-exact ARE DELETED (2026-09-07), SO THE DEPENDENT PAIR IS GONE.
   The declaration above explained why the typed box had to be armed and disarmed WITH its select;
   with neither control present there is no precondition left to declare. This gate enumerates the
   DOM, so both simply stop appearing in the population — it does not need to be told they are gone.
   ⚠️ WHAT IS NOW UNGUARDED: nothing this gate covered. Its claim is that an UNANSWERED control comes
      back blank, and a control that does not exist cannot be answered or come back. The two
      survivors are the two that still ask a question. */
const TAX_CONTROLS = ['pri-location', 'filing-status'];

async function enter(page, BASE) {
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(900);
}

/* THE POPULATION, DISCOVERED — every id'd form control inside #sec-profile, in DOM order. */
const roster = (page) => page.evaluate(() => {
  const sec = document.getElementById('sec-profile');
  if (!sec) return [];
  return Array.from(sec.querySelectorAll('input[id], select[id], textarea[id]')).map((el) => ({
    id: el.id,
    kind: el.type === 'checkbox' ? 'checkbox' : (el.tagName === 'SELECT' ? 'select' : 'text'),
    options: el.tagName === 'SELECT' ? Array.from(el.options).map((o) => o.value || o.text).filter(Boolean) : null
  }));
});

/* ⛔⛔ THE DATE FIXTURE IS SEMANTICALLY COHERENT, AND THAT IS A CORRECTNESS REQUIREMENT RATHER THAN
   TIDINESS. The first version of this gate built dates from the loop index and produced a household
   RETIRING AT 80 AND PLANNING THROUGH 81. The product legitimately raises the plan-through floor as
   the retirement age climbs, so the typed year was overridden and this gate reddened on a defect it
   was never built to test.
   ⚠️ THAT DEFECT IS REAL, IS NOT MINE, AND IS FILED SEPARATELY (F66) RATHER THAN BURIED. MEASURED:
   with DOB 02/1971 and retirement 07/2051 (age 80), sl-plan-through auto-raises 93 -> 100; typing
   plan-through 08/2052 then keeps the typed MONTH (08) and silently substitutes a derived YEAR
   (2071). The user is shown a date they did not enter — the same L47 species as F64's plan-end-age,
   but on the ENTRY path, and pre-existing.
   🔑 A FIXTURE MUST BE COHERENT OR IT TESTS A PATH THE PRODUCT IS ENTITLED TO REFUSE. Adjusting it
   here is legitimate ONLY because the incoherence was the fixture's and the defect it exposed is on
   the record. Adjusting a fixture until it passes, without that, is how a gate stops measuring.
   ⛔ AND NO VALUE MAY IMPLY A DEFAULT: not age 40 (slider-age), not 65 (slider-activation), not 93
   (sl-plan-through). The Captain's own report used 09/2070 against DOB 04/1977 — which implies
   exactly 93 — so "restored" and "fell back to the default" printed the same number and the
   diagnosis blamed the slider.
   🔑 A FIXTURE VALUE THAT EQUALS THE DEFAULT CANNOT DISTINGUISH RESTORE FROM FALLBACK.
   ⛔ For a select the value comes from the control's OWN option list (the LAST entry, never the
   first — that is the "Select …" placeholder), so it cannot drift out of agreement with the markup
   the way a hard-coded 'Wyoming' would. */
const DOB_FIXTURE  = '03 / 1974';   // age 52 — not the 40 the age slider ships
const CO_DOB       = '11 / 1976';
const RET_FIXTURE  = '07 / 2042';   // age 68 — not the 65 the activation slider ships
const CO_RET       = '05 / 2044';
const PTA_FIXTURE  = '09 / 2064';   // age 90 — not the 93 the plan-through slider ships, and far
                                    // enough above the retirement age to clear the auto-raise floor
function valueFor(f, i) {
  if (f.kind === 'checkbox') return true;
  if (f.kind === 'select') return f.options && f.options.length > 1 ? f.options[f.options.length - 1] : null;
  /* ⛔ THE TYPED-RATE BOX TAKES A RATE, NOT A SENTENCE. The generic fallback below hands every
     text input 'Fixture <id> <n>', which is deliberately unmistakable — but this control parses
     what it is given, so a sentence lands as NaN, is correctly refused at capture, and the leg
     reds over a fixture that described a user who cannot exist.
     🔑 A FIXTURE VALUE MUST BE A VALUE THE FIELD CAN HOLD. The unmistakable-string trick works for
        free-text fields and silently misdescribes typed ones.
     ⚠️ ITS PRECONDITION IS ALREADY MET BY CONSTRUCTION, AND THAT IS LUCK WORTH NAMING: this box is
        only captured while #eff-tax-rate reads 'exact', and valueFor picks a select's LAST option,
        which is "I know my rate". If that option ever stops being last, THIS LEG GOES RED FOR A
        REASON THAT HAS NOTHING TO DO WITH THE RATE — check the option order before the plumbing. */
  /* eff-tax-rate-exact's fixture value retired with the control (2026-09-07). Its note warned that
     the leg depended on "I know my rate" staying the LAST option — a precondition met by luck. The
     luck no longer matters, but the lesson does: A FIXTURE VALUE MUST BE A VALUE THE FIELD CAN HOLD. */
  if (f.id === 'plan-end-age') return PTA_FIXTURE;
  if (/^co-/.test(f.id) && /dob/.test(f.id)) return CO_DOB;
  if (/^co-/.test(f.id) && /ret/.test(f.id))  return CO_RET;
  if (/dob/.test(f.id)) return DOB_FIXTURE;
  if (/plan/.test(f.id)) return PTA_FIXTURE;
  if (/ret|target/.test(f.id)) return RET_FIXTURE;
  if (/salary|income/.test(f.id)) return '$' + (200 + i) + ',000';
  return 'Fixture ' + f.id + ' ' + i;
}

const fill = (page, f, val) => page.evaluate((a) => {
  const id = a[0], kind = a[1], val = a[2];
  const el = document.getElementById(id); if (!el) return;
  if (kind === 'checkbox') { if (el.checked !== val) { el.checked = val; el.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  el.focus();
  if (kind === 'select') { const hit = Array.from(el.options).find((o) => (o.value || o.text) === val); if (hit) el.value = hit.value || hit.text; }
  else { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
  el.dispatchEvent(new Event('change', { bubbles: true })); el.blur();
}, [f.id, f.kind, val]);

const readAll = (page, ids) => page.evaluate((ids) => ids.reduce((o, i) => {
  const e = document.getElementById(i);
  o[i] = e ? (e.type === 'checkbox' ? String(e.checked) : e.value) : '(ABSENT)';
  return o;
}, {}), ids);

const norm = (s) => String(s == null ? '' : s).replace(/\s/g, '').toLowerCase();

/* ONE ARM: fill the chosen controls, reload, leave via the PRESERVING X, read everything back.
   ⛔ THE X IS THE ONLY EXIT THAT KEEPS THE SESSION. "Start from Scratch" DISCARDS the draft —
      correctly, it is what it says — and using it here would throw away the state under test.
   ⛔ THE CO-ARCHITECT TOGGLE IS FILLED FIRST because it reveals #co-arch-fields; DOM order puts it
      ahead of the co-* controls already, and this loop follows DOM order for exactly that reason. */
async function arm(ctx, BASE, skip) {
  const page = await ctx.newPage();
  await enter(page, BASE);
  const fields = await roster(page);
  const typed = {};
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (skip.indexOf(f.id) !== -1) continue;
    const v = valueFor(f, i);
    if (v === null) continue;
    await fill(page, f, v);
    typed[f.id] = v;
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(2000);                 // the 400ms-debounced autosave must land
  const before = await readAll(page, fields.map((f) => f.id));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const x = document.getElementById('studioCloseIntro'); if (x) x.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (typeof window._studioEnterRoom === 'function') window._studioEnterRoom('data'); });
  await page.waitForTimeout(900);
  const after = await readAll(page, fields.map((f) => f.id));
  await page.close();
  return { fields: fields, typed: typed, before: before, after: after };
}

/* ⛔⛔ THE ZERO ARM — THE HALF THE EXEMPTION WAS CLEARED WITHOUT.
 *
 * salary sat in DECLARED_OPEN with a written expiry condition. It was emptied 2026-09-04 on the
 * claim that "schema 1.1.0 now captures and restores both". THAT ROUND-TRIP WAS ONLY EVER RUN WITH A
 * NONZERO SALARY, and the defect only touches zero. The exemption came off on evidence that
 * STRUCTURALLY COULD NOT SEE THE THING IT WAS CERTIFYING.
 * 🔑 A FIXTURE WITH A NONZERO VALUE PROVES NOTHING ABOUT A DEFECT THAT ONLY TOUCHES ZERO. Same law
 *    that governs the Sacred upkeep catalogue's one-fixture warning: a property with no upkeep lines
 *    read the same number either way.
 *
 * ⭐ IT CORRECTS A REAL VALUE TO ZERO RATHER THAN TYPING ZERO INTO A BLANK, because that is the shape
 *    that actually broke, and it is strictly the harder one. Typing 0 into an empty box risks
 *    nothing: there is no prior answer to resurrect. Replacing 150000 with 0 is the case where a
 *    truthy guard silently keeps the SUPERSEDED value and the reload hands it back — the product
 *    looking like it is remembering when it is overruling.
 *
 * ⛔ THE POPULATION IS DERIVED FROM THE ROSTER, NOT LISTED HERE: a control is in the zero arm iff the
 *    gate's OWN valueFor() already hands it a money fixture (a '$' string). So a new money field in
 *    #sec-profile joins this arm the same way it joins L1 — by existing. If that set is ever EMPTY
 *    the leg FAILS rather than passing over nothing; an arm with no subjects is the empty-green
 *    species wearing a browser.
 *
 * ⚠️ DECLARED LIMITATION: this arm drives controls through the same fill() every other arm uses —
 *    a value assignment plus input/change events, not real key presses. That proves the HANDLER
 *    chain, not the keyboard. The keyboard-level measurement of this exact defect was taken
 *    separately in a real browser (2026-09-09: type 150000, correct to 0, reload -> $0; type 90000,
 *    clear, reload -> blank). This leg is the cheap standing form of that, not a substitute for it. */
async function zeroArm(ctx, BASE) {
  const page = await ctx.newPage();
  await enter(page, BASE);
  const fields = await roster(page);
  const money = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const v = valueFor(f, i);
    if (v === null) continue;
    await fill(page, f, v);
    if (f.kind === 'text' && String(v).charAt(0) === '$') money.push(f);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(2000);
  const ids = money.map((f) => f.id);
  const nonzero = await readAll(page, ids);
  for (const f of money) { await fill(page, f, '0'); await page.waitForTimeout(140); }
  await page.waitForTimeout(2000);                 // the 400ms-debounced autosave must land
  const onScreen = await readAll(page, ids);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const x = document.getElementById('studioCloseIntro'); if (x) x.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (typeof window._studioEnterRoom === 'function') window._studioEnterRoom('data'); });
  await page.waitForTimeout(900);
  const after = await readAll(page, ids);
  await page.close();
  return { ids: ids, nonzero: nonzero, onScreen: onScreen, after: after };
}

/* zero-the-answer, read off a formatted control: '$0' and '0' are zero, '' is NOT. */
const numOf = (s) => { const t = String(s == null ? '' : s).replace(/[^0-9.]/g, ''); return t === '' ? NaN : parseFloat(t); };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:' + PORT;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);

  /* ── ARM 1 — every control answered. */
  const full = await arm(ctx, BASE, []);
  const ids = full.fields.map((f) => f.id);

  /* ── L0 INSTRUMENT: THE POPULATION IS REAL AND IT WAS ACTUALLY FILLED.
        ⛔ WITHOUT THIS EVERY LEG BELOW IS VACUOUS: a predicate over an empty roster is TRUE, so a
        gate that enumerated nothing would report a clean sweep of nothing and exit 0. It also proves
        the typing LANDED, so a later "lost" verdict blames the product and not the fixture. */
  const filledBefore = ids.filter((i) => norm(full.before[i]) !== '' && full.before[i] !== 'false');
  check('L0 INSTRUMENT: #sec-profile enumerated from the DOM, and every discovered control accepted its value',
    ids.length >= 10 && filledBefore.length === ids.length,
    'rostered ' + ids.length + ': ' + ids.join(' · ')
    + '\n          accepted ' + filledBefore.length + '/' + ids.length
    + (filledBefore.length === ids.length ? '' : '  NOT ACCEPTED: ' + ids.filter((i) => filledBefore.indexOf(i) === -1).join(' · ')));

  /* ── L1 — THE CLAIM. Every rostered control except the DECLARED OPEN set round-trips a reload. */
  const expected = ids.filter((i) => DECLARED_OPEN.indexOf(i) === -1);
  const lost = expected.filter((i) => norm(full.after[i]) !== norm(full.typed[i]));
  check('L1 RESTORE: every rostered control outside the declared-open set returns exactly what was typed',
    lost.length === 0,
    'population ' + ids.length + ' · asserted ' + expected.length + ' · declared open ' + DECLARED_OPEN.length
    + ' (' + DECLARED_OPEN.join(' · ') + ')'
    + '\n          ' + expected.map((i) => i + '=' + JSON.stringify(full.after[i]) + (norm(full.after[i]) === norm(full.typed[i]) ? '' : '  WANTED ' + JSON.stringify(full.typed[i]))).join('\n          '));

  /* ── L2 — THE DECLARED-OPEN SET, WITH ITS EXPIRY CONDITION. These must STILL be open. The day
        they are fixed this leg goes RED and the exemption above must be deleted in that commit.
     ⛔⛔ AND WHEN THE LIST IS EMPTY THIS LEG SAYS SO OUT LOUD, BECAUSE IT IS THEN MEASURING NOTHING.
        `0 === 0` is a predicate over an empty set: permanently true, permanently green, and
        indistinguishable in a suite summary from a leg that checked something and liked it. That is
        the empty-green species, and it is not hypothetical here — this list was emptied 2026-09-04
        and salary-zero shipped afterwards under a leg that had stopped being able to fail.
     🔑 THE LEG IS NOT DELETED WHEN THE LIST EMPTIES, BECAUSE THE LIST CAN FILL AGAIN. It is LABELLED,
        the way _gate_codec_roundtrip_complete.js labels its own vacuous exclusion leg — a green whose
        report states that it asserts nothing today is honest; the same green unlabelled is not. */
  const stillOpen = DECLARED_OPEN.filter((i) => ids.indexOf(i) !== -1 && norm(full.after[i]) !== norm(full.typed[i]));
  check('L2 EXPIRY: the declared-open fields are STILL open — fix them and this leg reds on purpose'
    + (DECLARED_OPEN.length === 0 ? '  [VACUOUS: the declared-open set is empty, so this leg asserts nothing today — L5/L6 carry the zero case it used to hold]' : ''),
    stillOpen.length === DECLARED_OPEN.length,
    DECLARED_OPEN.length === 0
      ? 'DECLARED_OPEN = [] — every rostered control is asserted by L1'
      : DECLARED_OPEN.map((i) => i + ' after=' + JSON.stringify(full.after[i]) + ' typed=' + JSON.stringify(full.typed[i])).join(' · ')
        + (stillOpen.length === DECLARED_OPEN.length ? '' : '  <- NOW RESTORING: delete it from DECLARED_OPEN'));

  /* ── L3 — THE ANTI-FABRICATION HALF. Leave the tax controls UNANSWERED. They must come back
        BLANK. The schema ships FL / Married Filing Jointly / 0.20 and the draft carries them, so an
        unguarded restore answers a question the user declined to answer. */
  const blank = await arm(ctx, BASE, TAX_CONTROLS);
  const fabricated = TAX_CONTROLS.filter((i) => ids.indexOf(i) !== -1 && norm(blank.after[i]) !== '');
  check('L3 HONEST HALF: controls the user never answered come back BLANK, never filled from the schema default',
    fabricated.length === 0,
    TAX_CONTROLS.map((i) => i + '=' + JSON.stringify(blank.after[i])).join(' · ')
    + (fabricated.length ? '  ⛔ FABRICATED: ' + fabricated.join(' · ') : '  (schema ships FL / Married Filing Jointly / 0.20)'));

  /* ── L4 — HONEST HALF OF L3: the blank arm must still restore everything it DID answer, so L3's
        blanks are a GUARD DOING ITS JOB and not a restore that has quietly stopped working. Without
        this, deleting restoreDraft entirely would turn L3 green. */
  const alsoExpected = ids.filter((i) => DECLARED_OPEN.indexOf(i) === -1 && TAX_CONTROLS.indexOf(i) === -1);
  const blankLost = alsoExpected.filter((i) => norm(blank.after[i]) !== norm(blank.typed[i]));
  check('L4 HONEST HALF: in that same arm, every control that WAS answered still round-trips',
    blankLost.length === 0,
    'asserted ' + alsoExpected.length + (blankLost.length ? ' · LOST: ' + blankLost.map((i) => i + '=' + JSON.stringify(blank.after[i])).join(' · ') : ' · all restored'));

  /* ── L5 / L6 — THE ZERO ARM. See the block above zeroArm() for why this exists. */
  const zero = await zeroArm(ctx, BASE);

  /* L5 INSTRUMENT: there ARE money controls, they held a real value first, and the product accepted
     the correction on screen. Without this, L6 is a claim about an empty set — and worse, a claim
     that could pass because the zero never landed rather than because it survived. */
  const startedNonzero = zero.ids.filter((i) => numOf(zero.nonzero[i]) > 0);
  const acceptedZero   = zero.ids.filter((i) => numOf(zero.onScreen[i]) === 0);
  check('L5 INSTRUMENT: money controls exist, held a NONZERO value, and accepted the correction to zero on screen',
    zero.ids.length > 0 && startedNonzero.length === zero.ids.length && acceptedZero.length === zero.ids.length,
    'zero-arm population ' + zero.ids.length + ': ' + zero.ids.join(' · ')
    + (zero.ids.length === 0 ? '  ⛔ EMPTY — valueFor() hands no control a money fixture, so L6 would assert nothing' : '')
    + '\n          before: ' + zero.ids.map((i) => i + '=' + JSON.stringify(zero.nonzero[i])).join(' · ')
    + '\n          after correction: ' + zero.ids.map((i) => i + '=' + JSON.stringify(zero.onScreen[i])).join(' · '));

  /* L6 THE CLAIM: a value CORRECTED to zero survives the reload as zero. Not as blank (loss), and
     above all not as the superseded number (resurrection). */
  const resurrected = zero.ids.filter((i) => numOf(zero.after[i]) > 0);
  const zeroLost    = zero.ids.filter((i) => String(zero.after[i] || '').trim() === '');
  check('L6 ZERO SURVIVES: a salary CORRECTED to zero reloads as zero — not blank, and never as the superseded value',
    resurrected.length === 0 && zeroLost.length === 0 && zero.ids.length > 0,
    zero.ids.map((i) => i + ' typed=0  after=' + JSON.stringify(zero.after[i])
      + (numOf(zero.after[i]) > 0 ? '  ⛔ RESURRECTED (was ' + JSON.stringify(zero.nonzero[i]) + ')'
        : (String(zero.after[i] || '').trim() === '' ? '  ⛔ LOST' : ''))).join('\n          '));

  await ctx.close(); await browser.close(); server.close();
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
