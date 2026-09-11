/* _seed_household.cjs — ONE COMPLETE HOUSEHOLD, DERIVED FROM THE PRODUCT'S OWN REFUSALS.
 *
 * ⛔⛔ WHY THIS EXISTS. MEASURED 2026-09-09 in the gate-health sweep: 32 gates seed a household, and
 *    TWENTY-FIVE OF THEM DO NOT ANSWER `pri-location` — the field that became required that day. The
 *    suite was 271/0 throughout. The two fixtures that broke were not isolated; THEY WERE THE TWO
 *    THAT REACHED THE ENGINE DOOR. The rest carry identical incompleteness and are green only
 *    because they stop short of it.
 * 🔑 THE COST IS NOT THAT GATES BREAK. IT IS THAT WE CANNOT KNOW WHICH ONES WILL, until a 15-minute
 *    suite tells us. "Unpredictable" is the expensive word: it taxes every future schema change with
 *    an unbudgetable delay.
 * 🔑 AND TWENTY-FIVE FIXTURES EACH HOLDING THEIR OWN IDEA OF A COMPLETE HOUSEHOLD IS TWENTY-FIVE
 *    COPIES OF A FACT NO BUILD STEP COMPARES — the same defect as the twenty hand-typed climate
 *    tooltip percentages that drifted from the engine on all four presets.
 *
 * ⭐⭐ THE REQUIRED SET IS DERIVED, NEVER TYPED HERE, AND THAT IS THE WHOLE POINT.
 *    `buildStudioRequest()` publishes every refusal on `window._buildRequestErrors`, each carrying a
 *    `target` element id. So this asks the PRODUCT what it requires, answers it, and asks again —
 *    until nothing is refused. A NEW REQUIRED FIELD IS LEARNED WITHOUT ANYONE EDITING THIS FILE.
 *    MEASURED before a line of this was written — from an empty Profile it converges in 4 rounds:
 *      round 1  Date of Birth[pri-dob], Target Retirement Date[target-ret]
 *      round 2  Target Retirement Date[target-ret]
 *      round 3  Retirement Location[pri-location], Filing Status[filing-status]
 *      round 4  Filing Status[filing-status]
 *      round 5  complete
 *    A hand-typed list would have been correct the day it was written and wrong on 2026-09-09.
 *
 * ⛔ COMPLETENESS IS NOT SILENTLY UNIVERSAL, AND MUST NOT BECOME SO. Only 8 of those 32 gates reach
 *    the engine door. For the other 24 a complete household is NOISE — and worse, NOISE THAT LOOKS
 *    LIKE COVERAGE. A yard-rule gate answering filing status asserts nothing and hides that it
 *    asserts nothing.
 * ⛔ SO OPTING OUT IS EXPLICIT AND CARRIES A REASON. `except` is a MAP, not a list, because a list
 *    lets you skip a field without saying why. Both the answered and the skipped sets are PRINTED.
 *    ⚠️ THE FIRST REAL OPT-OUT WAS FOUND BY READING, NOT BY ASSUMING: _gate_reveal_refusal_speaks
 *       exists to prove "a refusal must say why". AN INCOMPLETE HOUSEHOLD IS ITS SUBJECT. Seeding it
 *       complete would destroy the thing it measures. That gate must never call this without an
 *       exception, and this paragraph is why.
 *
 * ⚠️ IT DOES NOT NAVIGATE. The caller has already entered the Studio its own way; this only answers
 *    what the product refuses. Fighting each gate's navigation is how a shared helper becomes a
 *    second, worse copy of every caller.
 *
 * ⚠️ .cjs ON PURPOSE — the browser gates are CommonJS `.js` and `require()` cannot load `.mjs`. The
 *    extension also keeps it out of the suite glob (`_gate_*` / `_p<digit>*`, `.js`/`.mjs`), which a
 *    helper must be: it has no verdict of its own to print.
 */
'use strict';

/* Values chosen so the household is SEMANTICALLY COHERENT, not merely non-empty.
   ⛔ THE ROUNDTRIP GATE LEARNED THIS THE HARD WAY: index-built dates produced a household RETIRING
      AT 80 AND PLANNING THROUGH 81, the product legitimately raised the plan floor, and the gate
      reddened on a defect it was never built to test. A FIXTURE MUST BE COHERENT OR IT TESTS A PATH
      THE PRODUCT IS ENTITLED TO REFUSE.
   ⛔ AND NO VALUE MAY EQUAL A DEFAULT: not age 40, not activation 65, not plan-through 93 — or
      "restored" and "fell back to the default" print the same number and no leg can separate them. */
const DOB_ANSWER  = '03 / 1974';   // age 52 — not the 40 the age slider ships
const RET_ANSWER  = '07 / 2042';   // age 68 — not the 65 the activation slider ships
const PLAN_ANSWER = '09 / 2064';   // age 90 — not the 93 the plan-through slider ships
const CO_DOB      = '11 / 1976';
const CO_RET      = '05 / 2044';
/* ⭐ SOCIAL SECURITY BECAME REQUIRED 2026-09-10, the day engine/income.py stopped answering it
   from one household's hardcoded PIA table. The derived loop LEARNED the new refusal without an
   edit -- exactly as this file's header promised -- but it could not SATISFY it, because the
   generic text answerer writes 'Seeded by _seed_household' and a currency field strips that to
   nothing. So the loop is untouched and only the VALUE MAP grows, which is the designed seam.
   ⛔ MONTHLY, NOT ANNUAL. The Studio annualises (x12) on the way to the engine; a yearly figure
      here would seed a household with a $28,800/MONTH benefit and every ladder above it would be
      nonsense that still looked like a number.
   ⚠️ AND NEITHER VALUE MAY BE ZERO. Zero is now a MEANINGFUL answer ("I expect none"), so a
      zero-seeded fixture would silently test the no-Social-Security path while reading as a
      normal household -- the same default-equals-fallback shape this arc exists to remove. */
const SS_PRI_67   = '2,400';       // monthly at FRA — a plausible single earner
const SS_SEC_67   = '1,900';       // monthly at FRA — the co-architect, deliberately different

const MAX_ROUNDS = 10;   // the loop must terminate even if a refusal cannot be satisfied

/* Answer ONE control, generically, INSIDE THE PAGE.
   ⛔ A <select> takes its FIRST ANSWERABLE OPTION, never a typed literal: assigning a <select> a
      value it does not carry is SILENT (it takes ''), so a re-worded label would turn this into a
      no-op with nothing saying so. The assignment is READ BACK and verified for that exact reason. */
function answerOne(id) {
  const el = document.getElementById(id);
  if (!el) return { ok: false, why: 'no element' };
  if (el.tagName === 'SELECT') {
    const o = Array.prototype.find.call(el.options, (x) => String(x.value).trim() !== '');
    if (!o) return { ok: false, why: 'no answerable option' };
    el.value = o.value;
    if (el.value !== o.value) return { ok: false, why: 'assignment refused' };
  } else if (el.type === 'checkbox') {
    el.checked = true;
  } else {
    el.value = (window.__SEED_VALUES__ || {})[id] || 'Seeded by _seed_household';
  }
  ['input', 'change', 'blur'].forEach((ev) => el.dispatchEvent(new Event(ev, { bubbles: true })));
  return { ok: true, value: el.type === 'checkbox' ? String(el.checked) : el.value };
}

/* Ask the product what it is refusing on, right now. */
function readRefusals() {
  try { if (window._buildStudioRequest) window._buildStudioRequest(); } catch (e) { /* the refusal IS the signal */ }
  return (window._buildRequestErrors || []).map((e) => ({ field: e.field, target: e.target }));
}

/**
 * Answer every control the Studio refuses on, until it refuses on nothing.
 *
 * @param {import('playwright').Page} page  already inside the Studio's data room
 * @param {{except?: Object<string,string>, quiet?: boolean}} [opts]
 *        except — { 'control-id': 'why THIS gate must not answer it' }. A MAP, so a reason is forced.
 * @returns {{complete:boolean, asDeclared:boolean, rounds:number, answered:Object, skipped:Object, refusing:Array}}
 *          complete   — the product refuses on nothing at all
 *          asDeclared — every remaining refusal was declared in `except` (assert THIS when excepting)
 */
async function seedCompleteHousehold(page, opts) {
  opts = opts || {};
  const except = opts.except || {};
  const answered = {};

  await page.evaluate((vals) => { window.__SEED_VALUES__ = vals; }, {
    'pri-dob': DOB_ANSWER, 'target-ret': RET_ANSWER, 'plan-end-age': PLAN_ANSWER,
    'co-dob': CO_DOB, 'co-ret': CO_RET, 'co-plan-end': PLAN_ANSWER,
    'ss-pri-67': SS_PRI_67, 'ss-sec-67': SS_SEC_67,
  });

  let rounds = 0;
  let refusing = [];
  while (rounds++ < MAX_ROUNDS) {
    refusing = await page.evaluate(readRefusals);
    const next = refusing.find((r) => r.target && !(r.target in except) && !(r.target in answered));
    if (!next) break;
    const res = await page.evaluate(answerOne, next.target);
    if (!res || !res.ok) {
      /* ⛔ A REFUSAL WE CANNOT SATISFY STOPS THE LOOP RATHER THAN SPINNING IT, and is reported.
         Silently looping to MAX_ROUNDS would turn a broken control into a slow no-op. */
      answered[next.target] = '⛔ COULD NOT ANSWER (' + ((res && res.why) || 'unknown') + ')';
      break;
    }
    answered[next.target] = res.value;
    await page.waitForTimeout(250);
  }

  /* ⛔⛔ TWO FACTS, NOT ONE, AND MY OWN TEST FOUND THIS. The first version returned a single
     `complete` computed AFTER filtering out the declared exceptions — so a household that was
     deliberately missing filing-status reported complete=true. THAT IS "COMPLETE EXCEPT FOR THE
     BITS I CHOSE TO IGNORE", which is the flattering definition this whole arc exists to remove:
     a predicate that excludes its own counter-examples.
     🔑 A CALLER NEEDS BOTH ANSWERS AND THEY ARE DIFFERENT QUESTIONS:
        · complete   — the product refuses on NOTHING. False whenever an exception is honoured, and
                       that is correct: an excepted household IS incomplete, by design.
        · asDeclared — every remaining refusal was DECLARED by this gate. This is the "did anything
                       go wrong" signal, and it is the one a gate with exceptions should assert. */
  const undeclared = refusing.filter((r) => r.target && !(r.target in except));
  const complete = refusing.length === 0;
  const asDeclared = undeclared.length === 0;

  if (!opts.quiet) {
    const a = Object.keys(answered);
    console.log('  [seed] answered ' + a.length + ' control(s) over ' + rounds + ' round(s): '
      + (a.map((k) => k + '=' + JSON.stringify(answered[k])).join('  ') || '(nothing was refused)'));
    const sk = Object.keys(except);
    if (sk.length) {
      console.log('  [seed] ⚠️ DELIBERATELY NOT ANSWERED — declared by this gate:');
      sk.forEach((k) => console.log('  [seed]    · ' + k + ' — ' + except[k]));
    }
    if (!asDeclared) {
      console.log('  [seed] ⛔ STILL REFUSING, UNDECLARED: '
        + undeclared.map((r) => r.field + '[' + r.target + ']').join(', '));
    } else if (!complete) {
      console.log('  [seed] household is incomplete BY DECLARATION — nothing undeclared is refusing');
    }
  }
  return { complete, asDeclared, rounds, answered, skipped: except, refusing: undeclared };
}

module.exports = { seedCompleteHousehold, DOB_ANSWER, RET_ANSWER, PLAN_ANSWER, CO_DOB, CO_RET };
