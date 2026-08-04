/* DEV-ONLY red-first gate — Yard §13.16: EVERY SILENCE MUST DECLARE WHY IT IS SILENT.
 *
 * WHY THIS EXISTS. Rule F is the one PURPOSE_VARIANT rule. A purpose with no voice falls SILENT and
 * never falls back to the residence string — correct, and ruled (§13.9c). But an absent slot is TWO
 * DIFFERENT FACTS that render identically:
 *     silent BY DESIGN     Land — §11.6 suppresses E and F outright.
 *     silent BY OMISSION   a purpose added to the picker before anyone authored its voice.
 * Nothing at runtime can tell them apart, because both produce nothing. That is exactly how a gap
 * hides on a screen instead of failing on a build. So the deliberate silences are NAMED in
 * _ruleFTables().silent, and this gate asserts, IN BOTH DIRECTIONS, that the picker's purpose list
 * equals voice ∪ silent.
 *
 * BOTH DIRECTIONS, because each catches a different mistake:
 *   forward   a purpose the user can PICK that the engine has never been asked about  -> the gap.
 *   backward  a declaration for a purpose that no longer exists in the picker         -> the rot.
 * A one-directional check would let the table drift out of the product silently, which is the
 * maintained-document failure this whole constant exists to prevent.
 *
 * LOAD-BEARING, PROVEN NOT CLAIMED (--dropvoice). A declaration with no enforcement is a comment
 * with braces. _ruleFSlot() is the ONLY path to Rule F's copy, so removing a voice mapping must
 * SILENCE that purpose in the rendered product — the same proof RULE_SCOPE's --dropkey gives.
 *
 * Usage:
 *   node scripts/_gate_yard_13_16_f_silence.mjs
 *   --newpurpose   add a 6th purpose to the picker with no declaration   -> forward leg must RED
 *   --undeclare    drop Land from silent{}                               -> forward leg must RED
 *   --ghost        declare a purpose the picker does not offer           -> backward leg must RED
 *   --dropvoice    remove the Rental voice mapping                       -> load-bearing leg must RED
 */
import { readFileSync } from 'node:fs';
import { lift } from './_gate_extract.mjs';

const MUT = { newpurpose: '--newpurpose', undeclare: '--undeclare', ghost: '--ghost', dropvoice: '--dropvoice' };
const on = (k) => process.argv.includes(MUT[k]);
const ANY_MUT = Object.keys(MUT).some(on);
let src = readFileSync('studio.html', 'utf8');

/* A MUTATION THAT CANNOT RUN PROVES NOTHING — every anchor must match exactly once or we abort
   rather than report a red-first we never performed. */
function mutate(a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('❌ anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.replace(a, b);
  console.log('[' + label + '] applied');
}
if (on('newpurpose')) mutate("['Primary residence','Second home','Rental property','Land','Other']",
                             "['Primary residence','Second home','Rental property','Land','Other','Houseboat']", '--newpurpose');
if (on('undeclare'))  mutate("            silent: { 'Land':", "            silent: { 'NotLand':", '--undeclare');
if (on('ghost'))      mutate("            silent: { 'Land':", "            silent: { 'Timeshare': 'ghost', 'Land':", '--ghost');
if (on('dropvoice'))  mutate("'Rental property': 'rental', 'Second home': 'second' }",
                             "'Second home': 'second' }", '--dropvoice');

const checks = [];
/* third slot is the MUTATION TAG (§13.17) — declared at the assertion, never inferred from prose. */
const need = (l, c, tag) => checks.push([l, !!c, tag || null]);

/* ── PRESENCE FIRST. Both sides of every comparison below must be proven to EXIST before they are
   compared; an empty equalling an empty is a NULL RESULT and must red, never pass. ── */
const listM = /Select purpose…<\/option>\$\{(\[[^\]]*\])\.map/.exec(src);
if (!listM) { console.error('❌ PRESENCE — could not locate the propPurpose option list in studio.html. Re-ground the extractor; this gate cannot assert on a list it did not find.'); process.exit(1); }
let PICKER;
try { PICKER = JSON.parse(listM[1].replace(/'/g, '"')); }
catch (e) { console.error('❌ PRESENCE — the propPurpose option list did not parse: ' + listM[1]); process.exit(1); }
PICKER = [''].concat(PICKER);   // the picker's own blank option is a real, selectable value

/* §13.21 — ONE SHARED EXTRACTOR (_gate_extract.mjs), replacing a private copy that could only see
   `function NAME(` and the hand-written `var RULE_SCOPE` regex that existed because of it. */
const ex = (s, n) => lift(s, n);
let TABLES, slotOf, declared;
try {
  const body = ex(src, '_ruleFTables') + '\n' + ex(src, '_ruleFSlot') + '\n' + ex(src, '_ruleFDeclared');
  const api = new Function(body + '\nreturn { t: _ruleFTables, slot: _ruleFSlot, decl: _ruleFDeclared };')();
  TABLES = api.t(); slotOf = api.slot; declared = api.decl;
} catch (e) { console.error('❌ PRESENCE — could not lift _ruleFTables/_ruleFSlot/_ruleFDeclared: ' + e.message); process.exit(1); }

need('[PRESENCE] the picker offers purposes to check', PICKER.length > 1);
need('[PRESENCE] voice table is non-empty', Object.keys(TABLES.voice || {}).length > 0);
need('[PRESENCE] silent table is non-empty', Object.keys(TABLES.silent || {}).length > 0);

/* ── FORWARD: every purpose a user can pick is ACCOUNTED FOR ── */
const undeclaredList = PICKER.filter((p) => !declared(p));
need('FORWARD — every picker purpose is declared (voiced or deliberately silent)',
     undeclaredList.length === 0, 'coverage');
if (undeclaredList.length) console.log('        undeclared: ' + JSON.stringify(undeclaredList));

/* ── BACKWARD: every declaration corresponds to a purpose the picker actually offers ── */
const declaredKeys = Object.keys(TABLES.voice).concat(Object.keys(TABLES.silent));
const ghosts = declaredKeys.filter((k) => PICKER.indexOf(k) < 0);
need('BACKWARD — every declaration names a purpose the picker still offers', ghosts.length === 0, 'coverage');
if (ghosts.length) console.log('        ghost declarations: ' + JSON.stringify(ghosts));

/* ── the two tables must be DISJOINT: a purpose cannot be both voiced and deliberately silent ── */
const both = Object.keys(TABLES.voice).filter((k) => Object.prototype.hasOwnProperty.call(TABLES.silent, k));
need('voice and silent are disjoint — no purpose is both', both.length === 0, 'coverage');

/* ── the declared silences are the ONES WE MEAN. Land only, per §11.6. ── */
need('Land is declared silent by design (§11.6)', Object.prototype.hasOwnProperty.call(TABLES.silent, 'Land'), 'coverage');
need('the Land silence carries a reason naming §11.6', /§11\.6/.test(String(TABLES.silent.Land || '')), 'coverage');

/* ── FALL SILENT, NEVER FALL BACK — an unknown purpose resolves to no slot at all, and specifically
      NOT to the residence voice, because that string asserts occupancy. ── */
need('an unlisted purpose resolves to NO slot (falls silent)', slotOf('Houseboat') === null, 'coverage');
need('an unlisted purpose does NOT inherit the residence voice', slotOf('Houseboat') !== 'occupied', 'coverage');
need('blank resolves to the occupied voice (#591: blank behaves as primary)', slotOf('') === 'occupied');
need('Land resolves to NO slot', slotOf('Land') === null);

/* ── LOAD-BEARING: the table is the only path to the copy. Render Rule F for a rental in shortfall
      and require the rental voice to be PRESENT — --dropvoice removes the mapping and must silence
      it. Fixture shape reused from _gate_yard_13_9_rulef_variant.mjs (L48). ── */
let body = '';
for (const n of ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRentMonthly',
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
function render(purpose, rentMonthly) {
  const prop = { id: 'p', baseId: 'property_a', value: 500000, propTaxYr: '9000', homeInsYr: '3000', maintYr: '4000' };
  if (purpose !== undefined) prop.propPurpose = purpose;
  if (rentMonthly !== undefined) prop.rentMonthly = rentMonthly;
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 300000, intRate: 6, minPmt: 2400, addPmt: 0,
                 nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
                 maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  let fn = null;
  for (let i = 0; i < 40; i++) {
    try { fn = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
      body + '\nreturn _yardIntelligence;')(getBaseType, doc, { parseAgeFromDob: () => 55 },
      { accounts: [prop, mort] }, RET, carry); fn('p'); break; }
    catch (e) { const m = /(\w+) is not defined/.exec(String(e && e.message)); if (!m) throw e; body += ex(src, m[1]) + '\n'; }
  }
  if (!fn) { console.error('❌ AUTO-RESOLVER EXHAUSTED — THE GATE ASSERTED NOTHING. THIS IS AN ABSENT GATE, NOT A RED ONE.'); process.exit(1); }
  return fn('p');
}
const RENTAL_MARK = 'After the rent comes in';
const rentalBeat = render('Rental property', 800);
need('[PRESENCE] the rental render is non-empty', rentalBeat.length > 0);
need('LOAD-BEARING — the rental voice RENDERS while its mapping exists', rentalBeat.indexOf(RENTAL_MARK) >= 0, 'loadbearing');

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log('\n' + pass + '/' + checks.length + ' green' + (ANY_MUT ? '  [mutated]' : ''));

/* §13.17 — A RED-FIRST PROVES NOTHING UNLESS IT PROVES WHICH ASSERTION FAILED. Each mutation names
   the TAG it must fell; a red anywhere else is a masked red and is refused. */
if (ANY_MUT) {
  const want = on('dropvoice') ? 'loadbearing' : 'coverage';
  const red = checks.filter(([, ok]) => !ok).map(([l]) => l);
  const onTarget = checks.filter(([, ok, tag]) => !ok && tag === want).map(([l]) => l);
  if (allGreen) { console.error('❌ RED-FIRST FAILED — the mutation left every assertion green. Its anchor is dead or the constant is not load-bearing.'); process.exit(1); }
  if (!onTarget.length) {
    console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a "' + want + '" assertion.');
    console.error('   red legs: ' + red.join(' | ')); process.exit(1);
  }
  console.log('✅ RED-FIRST OK — bit on ' + onTarget.length + ' "' + want + '" assertion(s): ' + onTarget.join(' | '));
  process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — every purpose the picker offers is either voiced or declared silent, both ways.');
