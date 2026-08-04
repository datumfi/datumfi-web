/* DEV-ONLY FORWARD GATE — Yard §13.8. RULE F MUST CONSUME RENT THE MOMENT THE FIELD EXISTS.
 * Architect-ruled 2026-08-04 (#605). Written BEFORE the field it guards.
 *
 * WHY IT EXISTS TODAY, GUARDING NOTHING. Rule F computes an affordability burden from a property's
 * carrying cost with no rent offset, and calls the result "Housing is taking a meaningful slice of
 * today's income". On a rental that is arithmetically true ONLY because no rent field exists in the
 * model. Property §18 authors rentMonthly. The day 592a lands it, F overstates a landlord's burden by
 * the whole rent — and NOBODY WILL HAVE TOUCHED RULE F.
 *   🔑 A RULE THAT IS CORRECT ONLY BECAUSE A FIELD DOES NOT EXIST YET IS A DEFECT WITH A START DATE.
 * You cannot fix the future, but you CAN leave an instrument armed and waiting in it. This is the only
 * thing that will still be paying attention when 592a lands months from now.
 *
 * 🔑 IT ANNOUNCES WHEN IT RUNS UNARMED. Today the rentMonthly field does not exist, so the conditional
 * assertions never arm and a naive version would print GREEN and teach nothing — which is exactly the
 * fault caught in this arc's own first Rule E fixture, where an unsourced DOB made "silent on rental"
 * pass VACUOUSLY. A VACUOUS PASS THAT ANNOUNCES ITSELF IS A GATE; ONE THAT STAYS QUIET IS A DECORATION.
 *
 * WHAT IS ASSERTED UNCONDITIONALLY (true today, and the seam the future assertions hang on):
 *   S1  _yardRentMonthly exists and reports absence as {sourced:false}, never a bare 0
 *   S2  Rule F's burden subtracts a rent offset — the consumption path is WIRED, not pending
 *   S3  with rent absent the burden is byte-identical to the pre-rent arithmetic (no behaviour change)
 * WHAT ARMS THE DAY THE FIELD LANDS:
 *   F1  a sourced rentMonthly on a Rental property REDUCES the burden
 *   F2  a rent that fully covers the carry drives the burden to zero, not negative
 *
 * Usage: node scripts/_gate_yard_13_8_rentforward.mjs [--simulate] [--noconsume]
 *   --simulate    inject a rentMonthly onto the fixture to PROVE F1/F2 bite before the field is real.
 *   --noconsume   strip the rent offset out of the burden -> S2 and the simulated legs must RED.
 */
import { readFileSync } from 'node:fs';
const SIMULATE = process.argv.includes('--simulate');
const NOCONSUME = process.argv.includes('--noconsume');
let src = readFileSync('studio.html', 'utf8');

if (NOCONSUME) {
  const A = 'var _burdenAnnual = Math.max(0, realAnnual - _rentAnnualOffset);';
  const n = src.split(A).length - 1;
  if (n !== 1) { console.error('--noconsume anchor matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.replace(A, 'var _burdenAnnual = realAnnual;   /* rent offset removed by --noconsume */');
  console.log('[noconsume] rent offset stripped from the burden');
}

function ex(s, n) {
  const st = s.indexOf('function ' + n + '(');
  if (st < 0) throw new Error('missing ' + n);
  let d = 0, b = false;
  for (let j = s.indexOf('{', st); j < s.length; j++) {
    if (s[j] === '{') { d++; b = true; }
    else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); }
  }
  throw new Error('unbalanced ' + n);
}
const scopeLine = (src.match(/var RULE_SCOPE = \{[^}]*\};/) || [])[0] || '';
let body = scopeLine + '\n';
const pulled = [];
for (const n of ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRentMonthly',
                 '_yardRealMonthly', '_yardNetEquity', '_yardHouseholdIncome', '_yardYearsToRetire', '_retireInfo',
                 'calculateTotalPmt', 'payoffMonths', '_propOccupied', '_ruleInScope', '_yardIntelligence']) {
  body += ex(src, n) + '\n'; pulled.push(n);
}
function resolveDeps(mk) {
  for (let i = 0; i < 40; i++) {
    try { mk(); return; } catch (e) {
      const m = /(\w+) is not defined/.exec(String(e && e.message));
      if (!m) throw e;
      body += ex(src, m[1]) + '\n'; pulled.push(m[1] + '*');
    }
  }
  throw new Error('dependency resolution did not converge');
}

const RET_YEAR = new Date().getFullYear() + 10;
const getBaseType = (id) => String(id).indexOf('mortgage') === 0
  ? { id: 'mortgage_x', taxCode: 'debt', title: 'Mortgage' }
  : { id: 'property_x', taxCode: 'physical', title: 'Real Estate', meta: 'The Grounds' };
const doc = { getElementById: (id) =>
  id === 'pri-salary'     ? { value: '120000' } :
  id === 'co-arch-toggle' ? { checked: false } :
  id === 'pri-dob'        ? { value: '08 / ' + (new Date().getFullYear() - 55) } :
  id === 'target-ret'     ? { value: '03 / ' + RET_YEAR } : { value: '' } };
const win = { parseAgeFromDob: () => 55 };
const RET = { retireYear: RET_YEAR, retireDate: new Date(RET_YEAR, 2, 1), currentAge: 55 };

/* FIXTURE STATE (one line): the user owns a RENTAL carrying a mortgage whose payments and costs eat
   well past 28% of household income, so Rule F's burden bar is cleared and rent is the only thing that
   could bring it back down. */
function mk(rentMonthly) { return mkPurpose('Rental property', rentMonthly); }
function mkPurpose(purpose, rentMonthly) {
  const prop = { id: 'p', baseId: 'property_a', value: 500000,
                 propTaxYr: '9000', homeInsYr: '3000', maintYr: '4000', hoaYr: '0', utilYr: '0' };
  if (purpose !== undefined) prop.propPurpose = purpose;
  if (rentMonthly !== undefined) prop.rentMonthly = rentMonthly;
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 300000, intRate: 6,
                 minPmt: 2400, addPmt: 0, nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
                 maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  const api = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
    body + '\nreturn { yard: _yardIntelligence, rent: _yardRentMonthly, real: _yardRealMonthly };')(
      getBaseType, doc, win, { accounts: [prop, mort] }, RET,
      (p) => (Number(p.propTaxYr) || 0) + (Number(p.homeInsYr) || 0) + (Number(p.maintYr) || 0) + (Number(p.hoaYr) || 0) + (Number(p.utilYr) || 0));
  return api;
}
resolveDeps(() => mk(undefined).yard('p'));

const checks = []; const need = (l, c, d) => checks.push([l, !!c, d]);
const api = mk(undefined);

// ── S1-S3 — unconditional, true today ─────────────────────────────────────────────────────────────
const absent = api.rent({});
need('S1 _yardRentMonthly reports an ABSENT field as {sourced:false}, never a bare 0',
  absent && absent.sourced === false && absent.monthly === 0, JSON.stringify(absent));
const present = api.rent({ rentMonthly: '2000' });
need('S1b and reports a SOURCED field as {sourced:true} with the value',
  present && present.sourced === true && present.monthly === 2000, JSON.stringify(present));
need('S2 Rule F\'s burden SUBTRACTS a rent offset — the consumption path is wired, not pending',
  /_burdenAnnual = Math\.max\(0, realAnnual - _rentAnnualOffset\)/.test(src), 'burden reads the offset');
need('S2b the offset comes from the NAMED absent-field helper, not an inline `|| 0`',
  /var _rent = _yardRentMonthly\(prop\);/.test(src), 'named seam present');
const realMo = api.real('p');
need('S3 [PRESENCE] the fixture actually clears Rule F\'s 28% bar (or every leg below is vacuous)',
  (realMo * 12) / 120000 > 0.28, 'burden=' + ((realMo * 12) / 120000).toFixed(3));

// ── F1-F2 — ARM ONLY WHEN rentMonthly IS REAL ─────────────────────────────────────────────────────
/* ARMED means THE USER CAN ENTER A RENT, not merely that the string "rentMonthly" appears — the
   reader helper mentions it by definition, so a bare text search reports ARMED forever and the
   announcement never fires. The field is real only once the property modal writes it, which is what
   updateAccField(..., 'rentMonthly', ...) looks like. (First version got this wrong and claimed ARMED
   on the day the seam was added — a detector that can only say yes is not a detector.) */
const FIELD_EXISTS = /updateAccField\([^)]*['"]rentMonthly['"]/.test(src);
const ARMED = FIELD_EXISTS || SIMULATE;
if (!ARMED) {
  console.log('');
  console.log('  ############################################################################');
  console.log('  #  THIS GATE RAN **UNARMED**. rentMonthly does not exist in studio.html yet, #');
  console.log('  #  so F1 and F2 DID NOT EXECUTE. The GREEN below covers S1-S3 ONLY.          #');
  console.log('  #  It is waiting for Property §18 / 592a to author the field.                #');
  console.log('  #  Run with --simulate to prove F1/F2 bite before that day arrives.          #');
  console.log('  ############################################################################');
  console.log('');
} else {
  /* Rule F is currently SILENT on a Rental (its variant copy is authored-pending, §13.7a), so the
     rental render is empty with or without rent and cannot show consumption. Observe the burden where
     Rule F still SPEAKS — a purpose that keeps today's string — so "does F consume rent" is answerable
     rather than masked by the copy gate. The consumption path is shared; only the copy differs. */
  const bare   = mkPurpose(undefined, undefined).yard('p');
  const offset = mkPurpose(undefined, '1500').yard('p');
  need('F1 [PRESENCE] the no-rent render actually contains Rule F (else the comparison is vacuous)',
    bare.includes('Housing is taking'), bare.includes('Housing is taking') ? 'Rule F present' : 'RULE F ABSENT — fixture never armed it');
  need('F1 a sourced rent CHANGES Rule F\'s outcome (the burden is computed on the shortfall)',
    bare !== offset, bare === offset ? 'IDENTICAL — rent was ignored' : 'rent consumed');
  const covered = mkPurpose(undefined, '9999').yard('p');
  need('F2 a rent that covers the carry drives the burden to zero, never negative — Rule F falls silent',
    !covered.includes('Housing is taking'), 'fully-covered property');
}

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[yard_13_8_rentforward] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length
  + (ARMED ? '  (ARMED)' : '  (UNARMED — S1-S3 only, F1/F2 skipped)'));
process.exit(bad === 0 ? 0 : 1);
