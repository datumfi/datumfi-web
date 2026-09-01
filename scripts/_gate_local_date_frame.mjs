/* @gate-pool: node */
/* _gate_local_date_frame.mjs — STANDING GATE for FINDING 63.
 *
 * THE CLAIM: the Studio computes "today" in the SAME TIME FRAME it parses stored dates in, so a
 * mortgage's elapsed months do not jump when the machine's clock crosses midnight UTC.
 *
 * ⛔ WHY THIS GATE EXISTS AT ALL, AND IT IS THE WHOLE POINT:
 *    `_monthsBetween` parses both arguments with `+ 'T00:00:00'`, which is LOCAL. The elapsed-months
 *    call passed `new Date().toISOString().slice(0, 10)` for "today" — and toISOString renders UTC.
 *    MEASURED 2026-08-31 at 20:25 EDT: local date 2026-08-31, UTC date 2026-09-01. A mortgage
 *    originating 2006-08-01 on a 240-month term read elapsed = 241 — PAST TERM — while it was still,
 *    locally, the last day of its final month.
 *    ⚠️ THE PRODUCT WAS THEREFORE WRONG ABOUT "TODAY" FOR THE LAST FOUR HOURS OF EVERY DAY in any
 *    UTC-negative timezone, and wrong BY A WHOLE MONTH for those hours at each month end — on the
 *    screen that tells someone whether their mortgage has finished.
 *
 * ⛔⛔ AND THIS GATE EXISTS BECAUSE THE DEFECT HAS A DEADLINE. It surfaced in
 *    _gate_407_20_2b_pastterm.mjs, which had been GREEN in three suite runs the same evening and
 *    went RED at 20:22 — because THAT gate can only see it during the ~4 hours per month when the
 *    machine's local date and UTC date disagree at a month boundary. At midnight the symptom
 *    vanishes on unchanged code and does not return for 29 days.
 * 🔑 A DEFECT THAT IS ONLY REPRODUCIBLE INSIDE A WINDOW IS ONLY *GUARDED* INSIDE THAT WINDOW. This
 *    gate REMOVES THE WINDOW by stubbing the clock, so the property is asserted on every run, on
 *    every date, on any machine, in any timezone.
 * ⚠️ IT DEPENDS ON NO HOST TIMEZONE. The stub reports a LOCAL calendar day and a UTC calendar day
 *    that deliberately disagree, so the test is identical in UTC, EDT or UTC+13. A gate that needed
 *    the host set to America/New_York would have swapped one hidden precondition for another.
 *
 * ⛔ RED-FIRST, REPORTED EXACTLY AS IT BEHAVED — NOT AS I WOULD HAVE LIKED IT TO.
 *   On UNFIXED bytes this gate reds at L0, because the fix INTRODUCES the named helper and there is
 *   nothing called _todayLocalISO to extract. That is an honest red, but it demonstrates ABSENCE OF
 *   THE FIX, not presence of the DEFECT — L1 and L2 never execute.
 *   ⭐ THE DEFECT IS REPRODUCED BY THE CONTROL INSTEAD, and that is the stronger proof:
 *   --utc-today substitutes the SHIPPED expression verbatim (new Date().toISOString().slice(0,10))
 *   and reds L1 + L2 with the SAME NUMBERS measured on the wall clock at 20:25 EDT — today read as
 *   2026-09-01, elapsed 241 against a term of 240.
 *   MEASURED: clean 4/4 GREEN · --utc-today 2/4 (L1 L2 RED, L0 L3 GREEN).
 * 🔑 A RED-FIRST THAT ONLY PROVES "THE NEW CODE IS ABSENT" IS NOT A RED-FIRST OVER THE DEFECT. Say
 *    which one you have.
 *
 * Run: node scripts/_gate_local_date_frame.mjs      (exit 0 = GREEN)
 */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
import { extractFn, definesFn } from './_gate_extract.mjs';

const argv = process.argv.slice(2);
const MUT_UTC = argv.includes('--utc-today');

const src = studioSource();
let fails = 0, passes = 0;
const out = [];
const check = (label, cond, detail) => {
  const ok = !!cond; if (ok) passes++; else fails++;
  out.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
};

/* ── L0 — the two functions must exist and be extractable, or nothing below means anything. */
const haveToday = definesFn(src, '_todayLocalISO');
const haveMonths = definesFn(src, '_monthsBetween');
check('L0 INSTRUMENT: _todayLocalISO and _monthsBetween are present and extractable',
  haveToday && haveMonths, '_todayLocalISO=' + haveToday + ' _monthsBetween=' + haveMonths);
if (!haveToday || !haveMonths) {
  out.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' RED');
  console.log('OVERALL: RED');
  process.exit(1);
}

let todayBody = extractFn(src, '_todayLocalISO');
if (MUT_UTC) {
  /* THE CONTROL RESTORES THE SHIPPED DEFECT: "today" rendered in UTC. */
  todayBody = 'function _todayLocalISO() { return new Date().toISOString().slice(0, 10); }';
}
const monthsBody = extractFn(src, '_monthsBetween');

/* ── THE STUB. A Date whose LOCAL calendar day and UTC calendar day deliberately disagree, with no
      dependence on the host's timezone: local = 2026-08-31, UTC = 2026-09-01. Everything else is
      delegated to the real Date so `new Date(str + 'T00:00:00')` still parses normally. */
const REAL = Date;
function makeStub() {
  class StubDate extends REAL {
    constructor(...a) { if (a.length === 0) { super(REAL.parse('2026-09-01T03:30:00Z')); } else { super(...a); } }
    // LOCAL getters report the 31st …
    getFullYear() { return this.__pinned() ? 2026 : super.getFullYear(); }
    getMonth() { return this.__pinned() ? 7 : super.getMonth(); }      // 7 = August
    getDate() { return this.__pinned() ? 31 : super.getDate(); }
    // … while toISOString keeps reporting the UTC instant, which is already September.
    __pinned() { return this.getTime() === REAL.parse('2026-09-01T03:30:00Z'); }
    static now() { return REAL.parse('2026-09-01T03:30:00Z'); }
  }
  return StubDate;
}
const StubDate = makeStub();

const today = new Function('Date', todayBody + '\nreturn _todayLocalISO();')(StubDate);
const monthsBetween = new Function(monthsBody + '\nreturn _monthsBetween;')();

/* ── L1 — THE PROPERTY. "today" must be the LOCAL calendar day, not the UTC one. */
check('L1 FRAME: "today" is the LOCAL calendar day, not the UTC one',
  today === '2026-08-31',
  'stub: local 2026-08-31 / UTC 2026-09-01  ->  _todayLocalISO() returned ' + JSON.stringify(today)
  + (today === '2026-09-01' ? '  <-- the UTC day: a mortgage would read one month past term' : ''));

/* ── L2 — THE CONSEQUENCE, stated in the product's own terms: a 240-month loan that originated
      exactly 240 months ago is AT term, not past it. */
const elapsed = monthsBetween('2006-08-01', today);
check('L2 CONSEQUENCE: a 240-month loan originated 2006-08-01 reads AT term, not past it',
  elapsed === 240,
  'elapsed=' + elapsed + ' term=240' + (elapsed === 241 ? '  <-- past term, on the last day of its final month' : ''));

/* ── L3 — HONEST HALF: the comparison itself must still work. A "fix" that pinned today to a
      constant would satisfy L1 and L2 and destroy the arithmetic, so prove real spans still count.
      Green on both builds by construction. */
const span = monthsBetween('2020-01-15', '2026-08-31');
check('L3 HONEST HALF: _monthsBetween still measures a real span correctly',
  span === 79,
  '2020-01-15 -> 2026-08-31 = ' + span + ' completed months (expected 79)');

out.forEach((r) => console.log('  ' + r));
console.log('\n  mode: ' + (MUT_UTC ? 'CONTROL --utc-today (shipped defect restored)' : 'clean'));
console.log('SCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
process.exit(fails === 0 ? 0 : 1);
