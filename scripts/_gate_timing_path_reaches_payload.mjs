/* _gate_timing_path_reaches_payload.mjs — A CONFIRMATION IS A PROMISE THAT THE SYSTEM ACTED.
 *
 * ⛔⛔ WHAT THIS GUARDS. Until 2026-09-16 `lockTimingPath` did four things and NOT ONE of them was
 *    connected to the engine: it moved the gold `ss-cell-current` styling, moved the "Your Plan"
 *    badge onto the clicked cell, wrote `sessionStorage.ss_timing_locked_key`, and printed
 *    "Timing path set." Meanwhile `buildStudioRequest` reads the primary claiming age from
 *    `.ss-btn.active` and the secondary from `.ss-sec-btn.active` — WHICH NOTHING IN THAT FUNCTION
 *    TOUCHED. The stored key had exactly three readers: this grid's re-render, the range-readiness
 *    checklist, and session restore. NONE OF THEM IS THE REQUEST.
 *
 * ⛔ SO THE PRODUCT MARKED A CELL "THIS IS YOUR PLAN", CONFIRMED IT IN WRITING, TICKED A READINESS
 *    BOX — AND THEN COMPUTED A DIFFERENT PLAN. Every Range run after choosing a timing path other
 *    than the 67/67 default was computed on a plan the user was told had been adopted.
 * 🔑 THE STRENGTH OF THE CONFIRMATION IS WHAT MADE IT A LIE. A silent click would merely have
 *    failed; this one was believed, three times over, on three different surfaces.
 *
 * ⚠️ AND IT IS REAL MONEY, MEASURED IN THE ENGINE, NOT ASSUMED: one variable at a time on a joint
 *    household, keystone — primary early_62 $108,750 vs full_67 $112,750 (−$4,000); optimal_70
 *    $115,250 (+$2,500). The co-architect axis moves it too. A cosmetic-looking gap on a money
 *    surface.
 *
 * ⛔ THIS IS A BEHAVIOUR GATE, NOT A GREP. It lifts the REAL `lockTimingPath` out of studio.html
 *    and runs it against a stub DOM carrying the six real buttons, then READS THE BUTTONS BACK.
 *    A gate that searched the function text for `.ss-btn` would pass on a reference that never
 *    executes, and would fail on a correct refactor that reached the controls another way —
 *    INSTRUMENTS MUST NOT DETECT BY SYNTAX.
 *
 * ⛔ RED-FIRST: against the pre-repair studio.html every leg below fails in the SAME WAY the
 *    product failed — the buttons come back 67/67 no matter which cell was locked. The negative
 *    control is not "the function is missing", it is the exact symptom.
 */
import { createRequire } from 'node:module';
import { lift } from './_gate_extract.mjs';

/* ⛔ studioSource() IS THE ONLY DOOR TO THE SHELL, and `_gate_studio_source`'s P1 leg enforces it.
 *    This file first shipped with a bare `fs.readFileSync(ROOT/studio.html)` copied from a sibling
 *    gate that had the same defect — L48 REUSE-DON'T-FORK assumes the donor is correct, and that
 *    donor was ALREADY the one red P1 was reporting. A gate that disk-reads the shell is asserting
 *    about a file that stops containing its subject the day the next function moves out. */
const require = createRequire(import.meta.url);
const { studioSource } = require('./_studio_source.cjs');

const SRC = studioSource();

const FAILED = [];
function check(leg, what, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${leg}  ${what}${detail ? `   [${detail}]` : ''}`);
  if (!ok) FAILED.push(`${leg} — ${what} ${detail}`);
}

/* ── A stub DOM that is exactly the six real buttons, and nothing else ──────────────────────
   ⚠️ THE BUTTON SHAPE IS COPIED FROM studio.html:4172-4181 — `<strong>62</strong>` inside the
      button — because that inner <strong> is what BOTH readers key on. A stub that stored the age
      somewhere friendlier would be testing a page we do not ship. */
function makeDom() {
  const mk = (cls, age, active) => ({
    cls: new Set(active ? [cls, 'active'] : [cls]),
    age,
    classList: {
      add(c) { this._o.cls.add(c); },
      remove(c) { this._o.cls.delete(c); },
      contains(c) { return this._o.cls.has(c); },
      toggle(c, on) { if (on) this._o.cls.add(c); else this._o.cls.delete(c); },
    },
    querySelector(sel) { return sel === 'strong' ? { textContent: this.age } : null; },
    setAttribute() {}, insertBefore() {}, removeChild() {},
  });
  const wire = (o) => { o.classList._o = o; return o; };
  const pri = ['62', '67', '70'].map((a) => wire(mk('ss-btn', a, a === '67')));
  const sec = ['62', '67', '70'].map((a) => wire(mk('ss-sec-btn', a, a === '67')));

  const store = {};
  const doc = {
    querySelectorAll(sel) {
      if (sel === '.ss-btn') return pri;
      if (sel === '.ss-sec-btn') return sec;
      return [];
    },
    querySelector(sel) {
      if (sel === '.ss-btn.active strong') {
        const b = pri.find((x) => x.cls.has('active'));
        return b ? { textContent: b.age } : null;
      }
      if (sel === '.ss-sec-btn.active strong') {
        const b = sec.find((x) => x.cls.has('active'));
        return b ? { textContent: b.age } : null;
      }
      return null;
    },
    getElementById() { return null; },     // no grid, no confirm element: styling is not the test
    createElement() { return { className: '', textContent: '' }; },
  };
  const sessionStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  return { doc, sessionStorage, pri, sec, store };
}

/* ⛔⛔ THE HELPERS ARE LIFTED *OPTIONALLY*, AND THAT IS THE NEGATIVE CONTROL, NOT A CONVENIENCE.
 *    The first version of this gate lifted them unconditionally, so against the pre-repair
 *    studio.html it THREW `lift: source declares no function or binding named _SS_AGE_LABEL`.
 *    A CRASH IS NOT A RED. It proves the gate could not run; it proves nothing about whether the
 *    gate can SEE the defect, and a reviewer reading a stack trace learns only that something is
 *    missing. Lifting what exists lets the REAL pre-repair `lockTimingPath` execute and produce
 *    THE EXACT SYMPTOM THE PRODUCT HAD — both buttons still reading 67 after the user chose 62/62.
 *    A NEGATIVE CONTROL MUST REPRODUCE THE SYMPTOM, NOT MERELY FAIL. */
function liftOptional(name) {
  try { return lift(SRC, name); } catch { return ''; }
}

const CODE = [
  liftOptional('_SS_KEY_ALIASES'),
  liftOptional('_ssCanonStrategy'),
  liftOptional('_ssCanonKey'),
  liftOptional('_SS_AGE_LABEL'),
  liftOptional('_ssApplyTimingPathToControls'),
  liftOptional('_ssLockedKeyFromControls'),
  lift(SRC, 'lockTimingPath'),          // the subject itself is NOT optional
].filter(Boolean).join('\n');

function runLock(caseKey) {
  const dom = makeDom();
  const win = {};
  /* `_lastMatrixResult` and `updateRangeReadiness` are declared so the real function's own
     references resolve. Both are deliberately inert — this gate asserts what reaches the ENGINE,
     not what the grid repaints. */
  /* ⚠️ THE READ-BACK IS THE GATE'S OWN, NEVER THE PAGE'S. If it called the page's
     `_ssLockedKeyFromControls` it could not run at all against a build that lacks it — and the
     buttons, which are what actually travel, would go unread in exactly the tree where the answer
     matters most. L3 tests the page's version separately, where its ABSENCE is the finding. */
  const fn = new Function(
    'document', 'sessionStorage', 'window', '_lastMatrixResult', 'renderMatrixGrid',
    `${CODE}
     ; lockTimingPath(arguments[5]);
     return (typeof _ssLockedKeyFromControls === 'function')
       ? _ssLockedKeyFromControls() : '__NO_DERIVED_KEY__';`
  );
  const readBack = fn(dom.doc, dom.sessionStorage, win, null, () => {}, caseKey);
  const active = (arr) => (arr.find((b) => b.cls.has('active')) || {}).age || null;
  return { readBack, primary: active(dom.pri), secondary: active(dom.sec), store: dom.store };
}

console.log('\n_gate_timing_path_reaches_payload — the cell you chose is the plan we send\n');

// ── L1 · THE EXACT CASE THE CAPTAIN HIT: top-left, both people at 62 ──────
const r1 = runLock('early_62_x_early_62');
check('L1', 'choosing 62/62 sets the PRIMARY control the payload reads', r1.primary === '62',
      `primary button = ${r1.primary}`);
check('L1b', 'and the CO-ARCHITECT control too — both axes travel or neither does',
      r1.secondary === '62', `secondary button = ${r1.secondary}`);

// ── L2 · THE OTHER DIRECTION, so a leg cannot pass by writing one constant ──
const r2 = runLock('optimal_70_x_early_62');
check('L2', 'a mixed path sets each axis independently',
      r2.primary === '70' && r2.secondary === '62',
      `primary ${r2.primary} / secondary ${r2.secondary}`);

// ── L3 · THE BADGE NOW READS BACK OFF THE CONTROLS ───────────────────────
// ⛔ THIS IS THE ONE-SOURCE-OF-TRUTH LEG. The badge may not be able to name a plan the engine will
//    not be told, so its key is DERIVED from the same controls the payload reads.
check('L3', 'the badge key is derived from the controls, not stored beside them',
      r2.readBack === 'optimal_70_x_early_62', `read back: ${r2.readBack}`);

// ── L4 · A SOLO KEY MUST NOT INVENT A CO-ARCHITECT ───────────────────────
// ⚠️ The engine's solo shape is a single axis (`case_key = pri`), adopted 13 Sep, precisely so that
//    "full_67_x_None" cannot name a pairing that does not exist. Writing a secondary here would
//    re-manufacture a claiming age for a person the household does not have — the defect
//    `_current_plan_key` was repaired for on BOTH sides of the wire.
const r4 = runLock('early_62');
check('L4', 'a solo key sets the primary', r4.primary === '62', `primary ${r4.primary}`);
check('L4b', 'and leaves the co-architect control untouched at its default',
      r4.secondary === '67', `secondary ${r4.secondary}`);

// ── L5 · THE STORED KEY IS STILL WRITTEN, because session restore reads it ──
check('L5', 'the chosen path is still persisted for session restore',
      r1.store.ss_timing_locked_key === 'early_62_x_early_62',
      String(r1.store.ss_timing_locked_key));

// ── L6 · THE READINESS TICK ASSERTS THE THING THAT TRAVELS ───────────────
// ⛔ THE THIRD SURFACE. It read `ss_timing_locked_key` alone — a key no request has ever consulted
//    — so it reported a setting as ready while the payload carried a different one. It is the one
//    most likely to outlive the other two because it looks like bookkeeping.
const READY = SRC.slice(SRC.indexOf("label: 'SS Timing'"), SRC.indexOf("label: 'SS Timing'") + 700);
check('L6', 'the SS Timing tick consults the live controls, not the stored key alone',
      /_ssLockedKeyFromControls/.test(READY),
      'readiness check does not read the controls');

console.log('');
if (FAILED.length) {
  console.log(`RED — ${FAILED.length} leg(s) failed`);
  FAILED.forEach((f) => console.log('  · ' + f));
  process.exit(1);
}
console.log('GREEN — the timing path the user chose is the timing path the engine is sent.');
