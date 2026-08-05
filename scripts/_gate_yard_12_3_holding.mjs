/* DEV-ONLY red-first gate — Yard §12.3 / §12.3b: does this rental carry itself.
 *
 * WHY THE BOUNDARY IS THE POINT. Two banks describe this rule and they DISAGREE:
 *   §11.2  (RETIRED)  COVERED >= 1.15 · THIN 1.0-1.15 · UNDERWATER < 1.0
 *   §12.3  (LIVE)     CARRIES ITSELF >= 1.15 · CLOSE 0.95-1.15 · SUBSIDISED < 0.95
 * At coverage 0.97 the retired set tells a landlord the property "does not currently carry itself"
 * and the live set tells them it is "finely balanced". Same numbers, two different verdicts, and
 * the wrong one is a harsher claim made under the Architect's signature. --oldboundary restores the
 * retired 1.0 and this gate must go RED on exactly that leg. That is the check that would have
 * caught the supersession, and it is why the boundary gets its own mutation.
 *
 * §12.3b OVERRIDES §12.3 — no tenant beats any rent figure, and they never speak together.
 * An unsourced rent leaves BOTH silent: the room does not guess a rent from the value.
 *
 * Usage:
 *   node scripts/_gate_yard_12_3_holding.mjs
 *   --oldboundary  restore the retired 0.95 -> 1.0 lower bound  -> the 0.97 leg must RED
 *   --noscope      let Rule I fire on any purpose               -> the isolation leg must RED
 *   --novacant     drop the §12.3b override                     -> the vacancy leg must RED
 */
import { readFileSync } from 'node:fs';
import { lift } from './_gate_extract.mjs';

const argv = process.argv.slice(2);
const OLDB = argv.includes('--oldboundary');
const NOSCOPE = argv.includes('--noscope');
const NOVACANT = argv.includes('--novacant');
const ANY_MUT = OLDB || NOSCOPE || NOVACANT;
let src = readFileSync('studio.html', 'utf8');

function mutate(a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('❌ anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.replace(a, b); console.log('[' + label + '] applied');
}
if (OLDB)    mutate('} else if (_iCov >= 0.95) {', '} else if (_iCov >= 1.0) {   /* retired §11.2 boundary restored by --oldboundary */', '--oldboundary');
if (NOSCOPE) mutate("if (s === 'RENTAL_ONLY') return !!(prop && prop.propPurpose === 'Rental property');", "if (s === 'RENTAL_ONLY') return true;   /* scope removed by --noscope */", '--noscope');
if (NOVACANT) mutate("if (prop.isRented === 'No' || prop.isRented === 'Between tenants') {", 'if (false) {   /* §12.3b override removed by --novacant */', '--novacant');

const ex = (s, n) => lift(s, n);
let body = '';
for (const n of ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRentMonthly', '_yardRentNet',
                 '_yardRealMonthly', '_yardNetEquity', '_yardHouseholdIncome', '_yardYearsToRetire', '_retireInfo',
                 'calculateTotalPmt', 'payoffMonths', '_propOccupied', '_ruleInScope', '_yardIntelligence']) body += ex(src, n) + '\n';

const RET_YEAR = new Date().getFullYear() + 10;
const getBaseType = (id) => String(id).indexOf('mortgage') === 0
  ? { id: 'mortgage_x', taxCode: 'debt', title: 'Mortgage' }
  : { id: 'property_x', taxCode: 'physical', title: 'Real Estate', meta: 'The Grounds' };
const doc = { getElementById: (id) =>
  id === 'pri-salary' ? { value: '120000' } : id === 'co-arch-toggle' ? { checked: false } :
  id === 'pri-dob' ? { value: '08 / ' + (new Date().getFullYear() - 55) } :
  id === 'target-ret' ? { value: '03 / ' + RET_YEAR } : { value: '' } };
const RET = { retireYear: RET_YEAR, retireDate: new Date(RET_YEAR, 2, 1), currentAge: 55 };
const carry = (p) => (Number(p.propTaxYr) || 0) + (Number(p.homeInsYr) || 0) + (Number(p.maintYr) || 0);

function build(extra) {
  const prop = Object.assign({ id: 'p', baseId: 'property_a', value: 500000,
    propTaxYr: '9000', homeInsYr: '3000', maintYr: '4000', propPurpose: 'Rental property' }, extra || {});
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 300000, intRate: 6, minPmt: 2400, addPmt: 0,
    nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  let api = null;
  for (let i = 0; i < 40; i++) {
    try {
      const a = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
        body + '\nreturn { yard:_yardIntelligence, real:_yardRealMonthly };')(getBaseType, doc, { parseAgeFromDob: () => 55 },
        { accounts: [prop, mort] }, RET, carry);
      a.yard('p'); api = a; break;
    } catch (e) { const m = /(\w+) is not defined/.exec(String(e && e.message)); if (!m) throw e; body += ex(src, m[1]) + '\n'; }
  }
  if (!api) { console.error('❌ AUTO-RESOLVER EXHAUSTED — THE GATE ASSERTED NOTHING. THIS IS AN ABSENT GATE, NOT A RED ONE.'); process.exit(1); }
  return api;
}
const bare = (h) => h.replace(/<[^>]+>/g, ' ');
/* realMonthly is derived from the engine, never assumed — the rents below are then SOLVED for an
   exact coverage, so a change to the carry math cannot silently slide a fixture across a boundary. */
const REAL = build().real('p');
/* UNROUNDED ON PURPOSE. Rounding the rent to whole dollars moves coverage by up to half a dollar
   over REAL, which is enough to slide a boundary fixture to the wrong side of its own cut — the
   1.15 leg failed for exactly that reason and it was the FIXTURE that was wrong, not the engine.
   A fixture whose arithmetic can flip the answer is indistinguishable from the defect it invents. */
const rentFor = (cov) => String(cov * REAL);
const render = (cov, extra) => bare(build(Object.assign({ rentMonthly: rentFor(cov) }, extra || {})).yard('p'));

const CARRIES = 'pays its own way';
const CLOSE = 'lands almost exactly on';
const SUBSID = 'does not cover the';
const VACANT = 'With nobody in it';

const checks = [];
const need = (l, c, tag) => checks.push([l, !!c, tag || null]);
const states = (t) => [CARRIES, CLOSE, SUBSID].filter((m) => t.includes(m));

need('[PRESENCE] the engine produced a real monthly to solve against', REAL > 0, 'presence');
need('[PRESENCE] a rental at 1.30 renders a non-empty Yard', render(1.30).trim().length > 0, 'presence');

/* ── the three states, and EXACTLY ONE at a time ── */
need('coverage 1.30 -> CARRIES ITSELF', render(1.30).includes(CARRIES), 'states');
need('coverage 1.05 -> CLOSE', render(1.05).includes(CLOSE), 'states');
need('coverage 0.80 -> SUBSIDISED', render(0.80).includes(SUBSID), 'states');
/* EACH CUT PINNED FROM BOTH SIDES. A single point on a boundary only proves the band it landed in;
   a pair proves WHERE the cut is. Exact equality is not asserted — the rent reaches the engine as a
   string and float division cannot represent 1.15 reliably, so claiming to test `>=` at the point
   would be testing arithmetic noise. The pair locates the cut, which is the thing that can regress. */
need('just ABOVE 1.15 -> CARRIES ITSELF', render(1.152).includes(CARRIES), 'boundary');
need('just BELOW 1.15 -> CLOSE', render(1.148).includes(CLOSE), 'boundary');
need('just ABOVE 0.95 -> CLOSE', render(0.952).includes(CLOSE), 'boundary');
need('just BELOW 0.95 -> SUBSIDISED', render(0.948).includes(SUBSID), 'boundary');
/* THE LEG THE SUPERSESSION TURNS ON. Retired §11.2 called 0.97 UNDERWATER; live §12.3 calls it CLOSE. */
need('coverage 0.97 -> CLOSE (retired §11.2 called this UNDERWATER)', render(0.97).includes(CLOSE), 'boundary');
for (const c of [1.30, 1.152, 1.148, 1.05, 0.97, 0.952, 0.948, 0.80]) {
  need('exactly one state fires at coverage ' + c, states(render(c)).length === 1, 'states');
}

/* ── §12.3b OVERRIDES §12.3, and they never speak together ── */
const vacantNo = render(1.30, { isRented: 'No' });
const vacantBetween = render(1.30, { isRented: 'Between tenants' });
need('isRented = No -> the vacant beat fires', vacantNo.includes(VACANT), 'vacancy');
need('isRented = No -> and OVERRIDES the rent figure entirely', states(vacantNo).length === 0, 'vacancy');
need('isRented = Between tenants -> the vacant beat fires', vacantBetween.includes(VACANT), 'vacancy');
need('isRented = Between tenants -> and overrides the rent figure', states(vacantBetween).length === 0, 'vacancy');
need('isRented = Yes -> the coverage beat speaks, not the vacant one',
     render(1.30, { isRented: 'Yes' }).includes(CARRIES) && !render(1.30, { isRented: 'Yes' }).includes(VACANT), 'vacancy');

/* ── AN UNSOURCED RENT IS NOT A RENT OF ZERO (§13.26) ── */
const noRent = bare(build({}).yard('p'));
need('[PRESENCE] the no-rent rental still renders a Yard', noRent.trim().length > 0, 'presence');
need('rent unsourced -> BOTH §12.3 and §12.3b silent, no guess from the value',
     states(noRent).length === 0 && !noRent.includes(VACANT), 'unsourced');
need('rent unsourced but VACANT -> the vacant beat still speaks (it needs no rent)',
     bare(build({ isRented: 'No' }).yard('p')).includes(VACANT), 'unsourced');

/* ── RENTAL_ONLY IS AN INCLUSION: every other purpose gets nothing ── */
for (const p of ['Primary residence', 'Second home', 'Land', 'Other', 'Houseboat']) {
  const t = bare(build({ propPurpose: p, rentMonthly: rentFor(1.30) }).yard('p'));
  need('purpose "' + p + '" -> Rule I is ABSENT (inclusion list, never inferred)',
       states(t).length === 0 && !t.includes(VACANT), 'isolation');
}
{
  const t = bare(build({ propPurpose: '', rentMonthly: rentFor(1.30) }).yard('p'));
  need('blank purpose -> Rule I is ABSENT', states(t).length === 0 && !t.includes(VACANT), 'isolation');
}

/* ── NET, NOT GROSS (§13.38): vacancy and management reduce the rent that decides the verdict ── */
const grossCarries = render(1.20);
const nettedDown = render(1.20, { vacancyPct: '10', mgmtPct: '10' });
need('[PRESENCE] the gross-rent fixture reads CARRIES ITSELF before netting', grossCarries.includes(CARRIES), 'net');
need('vacancy + management pull the SAME rent below the top band — net is what the verdict reads',
     !nettedDown.includes(CARRIES), 'net');
need('blank vacancy and management deduct NOTHING — net-of-absent is gross, unchanged',
     render(1.20, { vacancyPct: '', mgmtPct: '' }).includes(CARRIES), 'net');

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log('\n' + pass + '/' + checks.length + ' green' + (ANY_MUT ? '  [mutated]' : '') + '   (realMonthly solved from the engine: ' + Math.round(REAL) + ')');

/* §13.17 — prove WHICH assertion failed. */
if (ANY_MUT) {
  const want = OLDB ? 'boundary' : NOSCOPE ? 'isolation' : 'vacancy';
  const red = checks.filter(([, ok]) => !ok).map(([l]) => l);
  const onTarget = checks.filter(([, ok, tag]) => !ok && tag === want).map(([l]) => l);
  if (allGreen) { console.error('❌ RED-FIRST FAILED — the mutation left every assertion green. Its anchor is dead.'); process.exit(1); }
  if (!onTarget.length) {
    console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a "' + want + '" assertion.');
    console.error('   red legs: ' + red.join(' | ')); process.exit(1);
  }
  if (OLDB && !onTarget.some((l) => l.indexOf('0.97') >= 0)) {
    console.error('❌ RED-FIRST MISDIRECTED — the boundary moved but the 0.97 leg did not fall. That leg IS the supersession.'); process.exit(1);
  }
  console.log('✅ RED-FIRST OK — bit on ' + onTarget.length + ' "' + want + '" assertion(s): ' + onTarget.join(' | '));
  process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — §12.3 three states, §12.3b override, inclusion scope, and net-not-gross all hold.');
