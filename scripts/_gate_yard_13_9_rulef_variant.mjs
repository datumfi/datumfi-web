/* DEV-ONLY GATE — Yard §13.9. PURPOSE_VARIANT MUST BE ENFORCEABLE, NOT DECLARATIVE.
 * Architect-ruled 2026-08-05 (#606).
 *
 * WHY. RULE_SCOPE declared F as PURPOSE_VARIANT while _ruleInScope returned true for it exactly as for
 * ANY — so the declaration was a PROMISE, not a constraint, and F spoke the residence string on every
 * purpose. The copy landing closes that gap; this gate is what makes it stay closed:
 *     every purpose that speaks gets its OWN string, distinct from the residence one
 *     Land is absent entirely (§11.6 suppresses E and F on land)
 *     a purpose with no slot falls SILENT, never back to the residence string
 *
 * 🔑 THE DEFAULT IS THE WHOLE POINT. The primary string ASSERTS OCCUPANCY ("Housing is taking… does
 * this same real monthly still fit… plan the downsize"). A fallback that leans to it is a default that
 * leans GENEROUS ABOUT WHO LIVES THERE — the same failure Rule E shipped with. So --primaryfallback
 * restores that fallback and this gate must RED.
 *
 * FIXTURE STATE (one line): the user owns one property carrying a mortgage and heavy costs — well past
 * 28% of household income — rendered once per purpose, so Rule F's numeric bar is cleared by ALL of
 * them and PURPOSE is the only thing that can separate the wording.
 *
 * Usage: node scripts/_gate_yard_13_9_rulef_variant.mjs [--primaryfallback] [--nolandsuppress]
 */
import { readFileSync } from 'node:fs';
const PRIMFALL = process.argv.includes('--primaryfallback');
const NOLAND   = process.argv.includes('--nolandsuppress');
let src = readFileSync('studio.html', 'utf8');
function mutate(a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.replace(a, b); console.log('[' + label + '] applied');
}
if (PRIMFALL) mutate('                   : null;                             // Land, and every future value: SILENT',
                     '                   : _RULE_F_COPY.occupied;            /* residence fallback restored by --primaryfallback */');
if (NOLAND)   mutate("        var _fCopy = _fPurpose === ''                  ? _RULE_F_COPY.occupied",
                     "        if (_fPurpose === 'Land') _fPurpose = '';   /* land suppression removed by --nolandsuppress */\n        var _fCopy = _fPurpose === ''                  ? _RULE_F_COPY.occupied");

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
for (const n of ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRentMonthly',
                 '_yardRealMonthly', '_yardNetEquity', '_yardHouseholdIncome', '_yardYearsToRetire', '_retireInfo',
                 'calculateTotalPmt', 'payoffMonths', '_propOccupied', '_ruleInScope', '_yardIntelligence']) body += ex(src, n) + '\n';

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
const carry = (p) => (Number(p.propTaxYr) || 0) + (Number(p.homeInsYr) || 0) + (Number(p.maintYr) || 0) + (Number(p.hoaYr) || 0) + (Number(p.utilYr) || 0);

function render(purpose, rentMonthly) {
  const prop = { id: 'p', baseId: 'property_a', value: 500000,
                 propTaxYr: '9000', homeInsYr: '3000', maintYr: '4000', hoaYr: '0', utilYr: '0' };
  if (purpose !== undefined) prop.propPurpose = purpose;
  if (rentMonthly !== undefined) prop.rentMonthly = rentMonthly;
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 300000, intRate: 6, minPmt: 2400, addPmt: 0,
                 nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
                 maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  let fn;
  for (let i = 0; i < 40; i++) {
    try { fn = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
      body + '\nreturn _yardIntelligence;')(getBaseType, doc, win, { accounts: [prop, mort] }, RET, carry); fn('p'); break; }
    catch (e) { const m = /(\w+) is not defined/.exec(String(e && e.message)); if (!m) throw e; body += ex(src, m[1]) + '\n'; }
  }
  return fn('p');
}

const OCCUPIED = 'Housing is taking a meaningful slice';
const RENTAL   = 'After the rent comes in';
const SECOND   = 'This second place takes';
const checks = []; const need = (l, c, d) => checks.push([l, !!c, d]);

const primary = render('Primary residence');
const blank   = render(undefined);
const other   = render('Other');
/* Rent 400, not 1200. At 1200 the SHORTFALL-based burden falls to 0.253 and drops below Rule F's 0.28
   bar — which is the §11.6 shortfall rule working exactly as ruled, not a bug. The fixture needs a
   rental that still fails affordability AFTER the rent is counted, or the rental leg is vacuous. */
const rental  = render('Rental property', '400');    // shortfall positive AND still over the 0.28 bar
const rentNone= render('Rental property');           // rent unsourced
const rentFull= render('Rental property', '99999');  // covers the carry
const second  = render('Second home');
const land    = render('Land');
const future  = render('Houseboat');                 // a purpose value nobody has authored for

// ── PRESENCE — every leg below is vacuous unless F actually clears its 28% bar somewhere. ──
need('[PRESENCE] the fixture clears Rule F\'s 28% bar (F fires on the primary residence)',
  primary.includes(OCCUPIED), primary.includes(OCCUPIED) ? 'F fires' : 'FIXTURE NEVER ARMED RULE F');
need('[PRESENCE] all renders are non-empty before any are compared',
  [primary, blank, other, rental, second, land, future].every((r) => r && r.length > 100), 'ok');

// ── THE INVARIANT: every purpose that speaks has its OWN voice ──
need('primary residence speaks the residence string', primary.includes(OCCUPIED));
need('blank speaks the residence string (blank behaves as primary)', blank.includes(OCCUPIED));
need('Other speaks the residence string (Other behaves as blank across this bank)', other.includes(OCCUPIED));
need('RENTAL speaks its OWN string, DISTINCT from the residence one',
  rental.includes(RENTAL) && !rental.includes(OCCUPIED), rental.includes(OCCUPIED) ? 'RESIDENCE VOICE ON A RENTAL' : 'own voice');
need('SECOND HOME speaks its OWN string, DISTINCT from the residence one',
  second.includes(SECOND) && !second.includes(OCCUPIED), second.includes(OCCUPIED) ? 'RESIDENCE VOICE ON A SECOND HOME' : 'own voice');
need('LAND is ABSENT entirely (§11.6 suppresses E and F on land)',
  !land.includes(OCCUPIED) && !land.includes(RENTAL) && !land.includes(SECOND), 'silent');

// ── THE DEFAULT — silent, never the residence string ──
need('an UNAUTHORED purpose falls SILENT, never back to the residence string',
  !future.includes(OCCUPIED) && !future.includes(RENTAL) && !future.includes(SECOND),
  future.includes(OCCUPIED) ? 'FELL BACK TO THE RESIDENCE STRING' : 'silent');

// ── L47 on the rent itself ──
need('a rental with UNSOURCED rent is silent — an unsourced rent is not a rent of zero',
  !rentNone.includes(RENTAL) && !rentNone.includes(OCCUPIED), 'silent');
need('a rental that COVERS its carry is silent — no shortfall, no affordability stress',
  !rentFull.includes(RENTAL), 'silent');

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[yard_13_9_rulef_variant] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length);
process.exit(bad === 0 ? 0 : 1);
