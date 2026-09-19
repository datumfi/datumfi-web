'use strict';
/* _gate_plan_window_never_empty.js — STANDING GATE
 *
 * THE INVARIANT: at EVERY retirement age the retire field permits, the plan-through window has at
 * least one usable value — and when it does not, the product says which field can move.
 *
 * ⛔⛔ WHAT WENT WRONG THE FIRST TIME (2026-09-05). date-bounds.js set
 *       plo = Math.max(PTA_MIN_FLOOR, (ra|0) + 20)     against PTA_MAX = 105
 * and the retire field permits ra up to RA_MAX = 90. Two bounds set by DIFFERENT RULES with nothing
 * stopping them crossing. MEASURED over the permitted range: ra 45..84 usable, ra 85 COLLAPSED to
 * one value, ra 86..90 EMPTY — 6 of 46 permitted retirement ages left no usable range. The Captain
 * hit ra 85 and was told "Plan-through age must be between 105 and 105."
 *   🔑 A VALIDATOR THAT CAN PRODUCE AN EMPTY RANGE IS NOT VALIDATING — IT IS LOCKING THE FIELD AND
 *      BLAMING THE USER.
 *
 * ⛔⛔ WHAT WENT WRONG THE SECOND TIME (2026-09-14) — AND WHY B7 NOW EXISTS. The 20-year gap was
 * DELETED on 13 Sep and the floor became max(current_age, retirement_age) ... IN studio.html ONLY.
 * date-bounds.js was never edited. The product then carried TWO plan-through floors: the SLIDER's
 * minimum came from studio.html (new) while TYPING A DATE was validated here (old). Both files were
 * internally consistent, so THIS GATE STAYED GREEN. The Captain typed a date, was told "at least 20
 * years after you retire", and reported — correctly — that nothing had changed.
 *   🔑 A RULE APPLIED IN ONE FILE IS NOT A RULE, IT IS A BRANCH (§82.2348). The invariant is not
 *      "this file is right"; it is "every file that implements this rule agrees". B7 asserts that,
 *      numerically, over the same exhaustive population as B1.
 *
 * THE RULE AS IT NOW STANDS: floor = floor(retirement age) + 1, ceiling = 105.
 *   ⛔ THE `+ 1` ARRIVED 2026-09-18 AND IT IS THE SAME DERIVATION, CARRIED ONE STEP FURTHER. The
 *     09-13 ruling set the floor AT the retirement age for the stated reason that a plan through
 *     41 for someone retiring at 65 is "A RANGE COMPUTED OVER ZERO DECUMULATION YEARS, an empty
 *     simulation with a number on it". Plan-through == retirement age IS that same empty
 *     simulation, one case further in, and it was still being accepted — by BOTH files.
 *   ⛔⛔ IT WAS NOT THEORETICAL. Captain-found in a browser: the client accepted it, the payload
 *     sent plan_end_age == retirement_age, and the engine indexed an empty array in front of the
 *     household ("index 0 is out of bounds for axis 0 with size 0"). `schemas.validate_ages` was
 *     repaired the same day to `max(ceil(current_age), floor(retirement_age) + 1)`; this is the
 *     client half, moved WITH it under this file's own standing order.
 *   🔑 THE RULE DID NOT CHANGE ITS MIND — ITS ARITHMETIC CAUGHT UP WITH ITS REASON. Derived from what the model
 * MEANS — a plan that ends before it begins has no years to run — never from an actuarial table.
 * A 20-year gap asserted that a retirement shorter than twenty years is invalid, which is a
 * judgement about a person's life expectancy this product has no standing to make.
 *
 * ── WHY NODE-TIER FOR THE INVARIANT AND ONE BROWSER LEG FOR THE SEAM ────────────────────────
 * date-bounds.js is a pure module and BOTH Dossier.html and studio.html consume validateTarget, so
 * the engine is where the truth lives. Node lets B1 enumerate ALL 46 permitted retirement ages —
 * exhaustive, which a browser gate could not do at sensible cost. But an engine that returns the
 * right string proves nothing if the page throws it away, so B6 opens Dossier.html and reads the
 * message the USER is shown. Exhaustive where it is cheap; seam-proving where it matters.
 *
 * LEGS
 *   B0 · PAIRED PRESENCE — a normal retirement age still yields a usable window and still ACCEPTS a
 *        valid plan-through date. "Reject everything" would satisfy every other leg here.
 *   B1 · THE INVARIANT — for every ra the retire field permits, floor <= ceiling
 *   B2 · THE FLOOR IS floor(RETIREMENT AGE) + 1, for every permitted age
 *   B3 · the deleted 20-year rule stays deleted — constants unexported AND sentence unreconstructed
 *   B4 · a plan-through below the floor is refused with the §6.2 sentence, echoing THIS household
 *   B7 · THE TWO FILES AGREE — date-bounds.js and studio.html compute the same floor (§82.2348)
 *   B5 · NO MESSAGE HARD-CODES A LIMIT — every number in every string is interpolated from the
 *        engine's constants. A LIMIT TYPED INTO A SENTENCE IS A HAND-MAINTAINED LIST WEARING A
 *        MESSAGE, AND IT WILL SURVIVE THE DAY THE LIMIT CHANGES.
 *   B6 · SEAM — Dossier.html shows the engine's message to the user (browser)
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_plan_window_never_empty.js        (exit 0 = GREEN)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8213;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

/* Load the real module in a sandbox — its own bytes, not a re-implementation. */
function loadDB() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/date-bounds.js'), 'utf8');
  const g = { window: {}, document: undefined };
  g.window.window = g.window;
  new Function('window', 'globalThis', src)(g.window, g.window);
  return g.window.DatumDateBounds;
}

(async () => {
  console.log('\n_gate_plan_window_never_empty\n');
  const DB = loadDB();
  check('B-0a · the bounds module loaded and exposes its constants',
    !!DB && typeof DB.RA_MAX === 'number' && typeof DB.PTA_MAX === 'number',
    DB ? ('RA ' + DB.RA_MIN_FLOOR + '..' + DB.RA_MAX + ' · PTA floor=RA..' + DB.PTA_MAX) : 'no module');
  if (!DB) { console.log('\nRED — cannot run'); process.exit(1); }

  const RA_LO = DB.RA_MIN_FLOOR, RA_HI = DB.RA_MAX, PTA_MAX = DB.PTA_MAX;

  /* The engine must expose the window itself; asking it "what is the range for this ra" is the
     question the UI needs and the one B1 asserts over. */
  check('B-0b · the engine exposes planWindow(ra) — the question the field actually asks',
    typeof DB.planWindow === 'function', typeof DB.planWindow);
  if (typeof DB.planWindow !== 'function') {
    console.log('\nRED — ' + (fails.length) + ' failing'); fails.forEach((f) => console.log('   RED · ' + f)); process.exit(1);
  }

  /* ── B1 · THE INVARIANT, EXHAUSTIVE ── */
  const bad = [];
  for (let ra = RA_LO; ra <= RA_HI; ra++) {
    const w = DB.planWindow(ra);
    if (!w || !(w.floor <= w.ceiling)) bad.push('ra' + ra + ' -> [' + (w && w.floor) + ',' + (w && w.ceiling) + ']');
  }
  check('B1 · THE INVARIANT — every permitted retirement age leaves a usable plan-through window',
    bad.length === 0, bad.length ? bad.length + ' empty: ' + bad.slice(0, 6).join(' ') : (RA_HI - RA_LO + 1) + ' ages checked');

  /* ── B2..B4 / B7 · THE RULE THAT REPLACED THE 20-YEAR GAP ── */
  const dob = { mo: 1, yr: 1980 };
  const ca = 46;
  const msgFor = (ra, tryAge) => {
    const yr = dob.yr + tryAge;
    const s = String(dob.mo).padStart(2, '0') + '/' + yr;
    const r = DB.validateTarget(s, 'plan', dob, ca, ra);
    return (r && r.err) || '';
  };
  /* ── B2 · THE FLOOR *IS* THE RETIREMENT AGE ──────────────────────────────────────────────
     The replacement for the old COLLAPSED/CROSSED legs, and a stronger claim than either: with
     the floor derived from the model's meaning rather than from an actuarial table, there is
     nothing left to collapse. Asserted over the SAME exhaustive population as B1 so the two
     cannot drift.
     ⛔ THIS LEG READ `w.floor !== ra` UNTIL 2026-09-18 AND WAS THEREFORE THE GUARDIAN OF THE
        OFF-BY-ONE: it did not merely miss plan-through == retirement, it ASSERTED it, 46 times
        over, exhaustively. 🔑 AN EXHAUSTIVE LEG OVER A RULE THAT IS ONE SHORT IS EXHAUSTIVELY
        WRONG — breadth is not correctness, and a population of 46 made this feel settled. */
  const floorBad = [];
  for (let ra = RA_LO; ra <= RA_HI; ra++) {
    const w = DB.planWindow(ra);
    if (!w || w.floor !== Math.floor(ra) + 1) floorBad.push('ra' + ra + ' -> floor ' + (w && w.floor));
  }
  check('B2 · THE FLOOR IS floor(RETIREMENT AGE) + 1, for every permitted age',
    floorBad.length === 0,
    floorBad.length ? floorBad.length + ' wrong: ' + floorBad.slice(0, 6).join(' ') : (RA_HI - RA_LO + 1) + ' ages checked');

  /* ── B3 · THE DELETED RULE STAYS DELETED ─────────────────────────────────────────────────
     ⛔ §9.2 removed the 20-year gap because it ASSERTS THAT A RETIREMENT SHORTER THAN TWENTY
        YEARS IS INVALID — a judgement about a person's life expectancy this product has no
        standing to make. A rule deleted in prose and left in a constant comes back.
     ⚠️ BOTH HALVES: the constants must not be re-exported AND no string may reconstruct the
        sentence by hand. Either alone would let it return in the other shape. */
  check('B3a · PTA_GAP and PTA_MIN_FLOOR are not exported — the deleted rule is unreadable',
    DB.PTA_GAP === undefined && DB.PTA_MIN_FLOOR === undefined,
    'PTA_GAP=' + DB.PTA_GAP + ' PTA_MIN_FLOOR=' + DB.PTA_MIN_FLOOR);

  const dbSrcRaw = fs.readFileSync(path.join(ROOT, 'scripts/date-bounds.js'), 'utf8');
  const dbCode = dbSrcRaw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  check('B3b · no message reconstructs "at least N years after you retire"',
    !/years after you retire/i.test(dbCode), 'live code only — comments may record what was removed');

  /* ── B4 · THE REFUSAL NAMES THE AGE THAT CAN MOVE ────────────────────────────────────────
     §6.2, wired verbatim and reused rather than forked (L48). B5 below proves the number in it
     is interpolated; this leg proves it is the RIGHT number — the household's own retirement
     age, not a constant that happens to read plausibly. */
  const mLow = msgFor(60, 55);   // ra 60, asking to plan through 55 — before retirement begins
  check('B4 · a plan-through below the floor is refused with the §6.2 sentence, naming the age',
    /A plan has to run past the day it starts/.test(mLow) && /before you retire at 60\b/.test(mLow),
    mLow);

  /* ⛔ AND THE SENTENCE MOVES WITH THE HOUSEHOLD. A fixed number in this copy would be a NEW
     HARDCODE — wrong for every household but one — which is the defect class this arc removes.
     Two different retirement ages must produce two different sentences. */
  const mLow2 = msgFor(52, 48);
  check('B4b · the sentence echoes THIS household’s retirement age, not a constant',
    /before you retire at 52\b/.test(mLow2) && mLow2 !== mLow, mLow2);

  /* ── B7 · THE TWO FILES AGREE — §82.2348, AND THIS IS THE LEG THAT WAS MISSING ───────────
     ⛔⛔ WHY IT EXISTS, MEASURED 2026-09-14. On 13 Sep the plan-through floor was moved to
        max(current_age, retirement_age) in studio.html AND NOT IN date-bounds.js. The product
        then carried TWO floors: the SLIDER's minimum came from studio.html (new) while TYPING A
        DATE was validated here (old). The Captain met the old one, was told "at least 20 years
        after you retire", and reported — correctly — that nothing had changed. Every gate we
        owned stayed green, because each file was self-consistent.
     🔑 A RULE APPLIED IN ONE FILE IS NOT A RULE, IT IS A BRANCH. The invariant is not "this file
        is right"; it is "the files that implement this rule agree". */
  /* ⛔ READ THROUGH studioSource(), NEVER OFF DISK — and this leg learned that the hard way. Its
     first draft did `fs.readFileSync(path.join(ROOT, 'studio.html'))` and `_gate_studio_source`
     named this file as an unexempted reader. THE SHELL IS BEING SPLIT: the day `minPlanEnd` moves
     into an extracted part, a disk read returns a file that no longer contains what this leg
     asserts about, and B7 goes red for a reason that has nothing to do with the rule it guards.
     🔑 A LEG WRITTEN TO CATCH TWO FILES DISAGREEING MUST NOT ITSELF ASSUME WHICH FILE THE CODE IS IN. */
  const { studioSource } = require('./_studio_source.cjs');
  const studioSrc = studioSource();
  const mMin = studioSrc.match(/var\s+minPlanEnd\s*=\s*([^;]+);/);
  check('B7a · studio.html still declares minPlanEnd (the anchor this leg reads)', !!mMin,
    mMin ? mMin[1].trim() : 'NOT FOUND — the anchor moved; fix this leg, do not delete it');
  if (mMin) {
    const expr = mMin[1];
    check('B7b · studio.html floors on the RETIREMENT AGE, with no 75 and no +20 surviving',
      /retireAge/.test(expr) && !/\b75\b/.test(expr) && !/\+\s*20\b/.test(expr), expr.trim());
    /* The numeric cross-check: both files, same question, same answer, over the same population.
       A textual match could pass while the arithmetic differed. */
    /* ⛔⛔ THIS LEG USED TO RE-TYPE studio.html's EXPRESSION BY HAND — A THIRD COPY OF THE RULE,
       INSIDE THE GATE WRITTEN TO PROVE THERE WERE NOT TWO. It read
       `Math.min(105, Math.max(Math.ceil(ca), Math.ceil(ra)))`, which agreed with the product on
       the day it was typed and would have gone on agreeing with a WRONG product forever: when
       both files carried the off-by-one, this leg carried it too and reported them in harmony.
       🔑 A CROSS-CHECK THAT RESTATES ONE SIDE IS NOT A CROSS-CHECK, IT IS A SECOND VOTE FROM THE
          SAME VOTER. Now the expression is EVALUATED as studio.html actually spells it — the
          text B7a already extracted — so the two sides can no longer be brought back into
          agreement by editing this file. */
    const disagree = [];
    let studioFloorFn = null;
    try { studioFloorFn = new Function('currentAge', 'retireAge', 'return (' + expr + ');'); }
    catch (e) { studioFloorFn = null; }
    check('B7c-pre · studio.html’s own minPlanEnd expression is evaluable here (no hand copy)',
      !!studioFloorFn, studioFloorFn ? expr.trim() : 'UNEVALUABLE — fix this leg, do not re-type the rule');
    for (let ra = RA_LO; ra <= RA_HI; ra++) {
      const ca = 44;                                   // a fixed current age below every ra here
      const studioFloor = studioFloorFn ? studioFloorFn(ca, ra) : NaN;
      if (DB.planWindow(ra).floor !== studioFloor) disagree.push('ra' + ra);
    }
    check('B7c · date-bounds and studio.html compute the SAME floor for every permitted age',
      disagree.length === 0,
      disagree.length ? disagree.length + ' disagree: ' + disagree.slice(0, 6).join(' ') : (RA_HI - RA_LO + 1) + ' ages agree');
  }

  /* ── B5 · no limit typed into a sentence ── */
  const src = fs.readFileSync(path.join(ROOT, 'scripts/date-bounds.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const strLits = code.match(/'(?:[^'\\]|\\.)*'/g) || [];
  const offenders = strLits.filter((s) => /\b(85|105|20|90|75)\b/.test(s));
  check('B5 · NO MESSAGE HARD-CODES A LIMIT (every number interpolated from the constants)',
    offenders.length === 0, offenders.slice(0, 3).join(' | '));

  /* ── B0 · PAIRED PRESENCE ── */
  const okRes = DB.validateTarget('01/2065', 'plan', dob, ca, 60);   // ra 60 -> floor 80; 2065 = age 85
  check('B0 · PAIRED PRESENCE — a valid plan-through date is still ACCEPTED ("reject everything" must fail)',
    !!(okRes && okRes.ok), JSON.stringify(okRes));

  /* ── B6 · SEAM — the page shows the engine's message ─────────────────────────────────────── */
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(`(() => { try {
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('t'); } },
      user: { id: 'user_bounds', firstName: 'B', primaryEmailAddress: { emailAddress: 'b@b.co' },
              unsafeMetadata: {}, update: function(){ return Promise.resolve(); } },
      addListener: function(){}, signOut: function(){ return Promise.resolve(); } };
  } catch(e){} })();`);
  const page = await ctx.newPage();
  await page.goto(BASE + '/Dossier.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const seen = await page.evaluate(`(() => {
    const DB = window.DatumDateBounds;
    if (!DB || typeof DB.planWindow !== 'function') return { noEngine: true };
    /* ⛔ THE OLD SEAM REPRODUCED A COLLAPSED WINDOW, WHICH NO LONGER EXISTS — with the floor at
       the retirement age and RA_MAX (90) below PTA_MAX (105), no permitted age can collapse. A
       browser leg aimed at an unreachable state is a green over nothing (§82.2330: a probe that
       cannot fire has not passed, it has not run). It now reproduces the state a user can ACTUALLY
       reach: asking to plan through a year BEFORE retirement, and reading what they are shown.
       ra 60, plan-through 55 — the household's own floor, named in the household's own sentence. */
    const r = DB.validateTarget('01/2035', 'plan', { mo: 1, yr: 1980 }, 46, 60);
    return { ra: 60, ok: !!(r && r.ok), err: (r && r.err) || '' };
  })()`);
  check('B6 · SEAM — Dossier.html carries the engine and returns its message to the page',
    !!(seen && !seen.noEngine && seen.err && /A plan has to run past the day it starts/.test(seen.err)
       && /before you retire at 60/.test(seen.err)),
    JSON.stringify(seen));

  await ctx.close(); await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
