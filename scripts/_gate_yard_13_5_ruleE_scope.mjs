/* DEV-ONLY RED-FIRST GATE — Yard §13.5. RULE E MUST NOT OFFER A REVERSE MORTGAGE TO A PROPERTY THE
   OWNER DOES NOT LIVE IN. Architect-ruled 2026-08-03 (#604).

   THE DEFECT. Rule E fires on `equityPct >= 0.5 && yTR <= 15` and NOTHING ELSE — measured, propPurpose
   is consulted ZERO times across the whole A-H block. _yardIntelligence takes a propId, so it runs for
   ANY property. A rental or second home clearing those two bars is told its equity "can be tapped …
   with a reverse mortgage as a last-resort income floor", and that "the house is doing double duty — a
   place to live". A REVERSE MORTGAGE REQUIRES OWNER OCCUPANCY. Neither sentence is true of a property
   the user does not occupy. Same family as the plan-through defect: A NUMBER SHOWN TO SOMEONE WHO
   CANNOT HAVE IT. This ships today; 593d does not create it, 593d makes it unmissable by titling the
   room THE RENTAL while the copy says a place to live.

   THE RULING (#604 §1). Rule E fires ONLY when propPurpose is 'Primary residence' or BLANK. On Second
   home / Rental property / Land / Other it is SILENT — not reworded, not softened, not degraded to a
   downsizing-only variant. There is no honest version of the beat for a non-occupied property. BLANK
   is included because #591 and Property §19.2 both treat blank as primary for math and placement; the
   NAME diverges (THE GROUNDS), the BEHAVIOUR does not. The "place to live" phrasing is a second defect
   in the same string and travels inside the same condition — the string is not split so that half of
   it can keep firing on a rental (#604 §1c: legibility yields).

   FIXTURE STATE (one line): the user owns five properties — a primary residence, a second home, a
   rental, land, and one whose purpose was never set — each with a mortgage, each at 60% equity and ten
   years from retirement, so Rule E's two numeric bars are cleared by ALL FIVE and PURPOSE is the only
   thing that can separate them.

   LEG 2 IS WRITTEN FIRST AND IS THE RED-FIRST: against unfixed studio.html it FAILS, because that is
   the defect. Run with --redfirst to strip the purpose guard back out and prove the leg still bites.
   Usage: node scripts/_gate_yard_13_5_ruleE_scope.mjs [--redfirst]
*/
import { readFileSync } from 'node:fs';
import { lift } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
let src = readFileSync('studio.html', 'utf8');

/* --redfirst — remove the purpose guard so Rule E is unscoped again. ASSERTS ITS ANCHOR MATCHED:
   a mutation that cannot run proves nothing (house law, 5th appearance). */
if (RED) {
  /* Anchor the CALL SITE, never the bare name — '_ruleEOccupies(prop)' also matches the FUNCTION
     DECLARATION, and replacing that yields `function true {` and a SyntaxError. It appeared to work
     only because the extractor skips that name on failure and the stripped call never needs it: a
     mutation passing for the wrong reason. */
  const A = "if (_ruleInScope('E', prop) && ";
  const n = src.split(A).length - 1;
  if (n !== 1) { console.error('--redfirst anchor matched ' + n + ' times, expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.split(A).join("if (true && ");
  console.log('[redfirst] purpose guard stripped (' + n + ' site' + (n === 1 ? '' : 's') + ')');
}

/* §13.21 — ONE SHARED EXTRACTOR (_gate_extract.mjs). Was a private copy here, and because a private
   copy could only see `function NAME(`, this gate also hand-lifted `var RULE_SCOPE` with its own
   regex. lift() handles both forms, so that regex is deleted rather than upgraded. */
const ex = (s, n) => lift(s, n);
const names = ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRealMonthly',
  '_yardNetEquity', '_yardHouseholdIncome', '_yardYearsToRetire', '_retireInfo', 'calculateTotalPmt', 'payoffMonths',
  '_propOccupied', '_ruleInScope', '_yardIntelligence'];
/* RULE_SCOPE is a `var`, and ex() now reaches it: lift() (§13.21) handles function AND binding forms,
   so nothing here pre-lifts it. The resolver below pulls it the moment _ruleInScope references it,
   and `pulled` records what was ACTUALLY taken. It used to be seeded with 'RULE_SCOPE(var)' — a
   claim about a lift that no longer happens at that point, i.e. an instrument reporting a step it
   did not perform. Small, and exactly the class of thing this arc keeps removing. */
let body = '';
const pulled = [];
for (const n of names) { try { body += ex(src, n) + '\n'; pulled.push(n); } catch (e) { if (n === '_propOccupied' || n === '_ruleInScope') continue; throw e; } }

const getBaseType = (baseId) => {
  const s = String(baseId);
  if (s.indexOf('heloc') === 0) return { id: 'heloc_x', taxCode: 'debt', title: 'HELOC' };
  if (s.indexOf('mortgage') === 0) return { id: 'mortgage_x', taxCode: 'debt', title: 'Mortgage' };
  return { id: 'property_x', taxCode: 'physical', title: 'Real Estate', meta: 'The Grounds' };
};
/* _yardYearsToRetire (studio.html) needs THREE sourced things or it returns null and Rule E can never
   fire: window.parseAgeFromDob returning an age, a pri-dob value, and a target-ret year. My first stub
   returned null age and empty fields, so the rule was silent on ALL FIVE purposes — which made LEG2's
   "silent on rental" pass VACUOUSLY. The [PRESENCE] assertion caught it; without that check this gate
   would have reported the defect as already absent. Calendar-safe: the retirement year is derived from
   today, never frozen. */
const RET_YEAR = new Date().getFullYear() + 10;
const doc = { getElementById: (id) =>
  id === 'pri-salary'     ? { value: '200000' } :
  id === 'co-arch-toggle' ? { checked: false } :
  id === 'pri-dob'        ? { value: '08 / ' + (new Date().getFullYear() - 55) } :
  id === 'target-ret'     ? { value: '03 / ' + RET_YEAR } :
                            { value: '' } };
const win = { parseAgeFromDob: () => 55 };
const RET = { retireYear: RET_YEAR, retireDate: new Date(RET_YEAR, 2, 1), currentAge: 55 };

const PURPOSES = [
  { key: 'PRIMARY',  purpose: 'Primary residence', occupies: true  },
  { key: 'BLANK',    purpose: undefined,           occupies: true  },
  { key: 'SECOND',   purpose: 'Second home',       occupies: false },
  { key: 'RENTAL',   purpose: 'Rental property',   occupies: false },
  { key: 'LAND',     purpose: 'Land',              occupies: false },
];

// 60% equity: home 500k, mortgage 200k -> netEq 300k -> equityPct 0.6 (clears the >= 0.5 bar).
/* DEPENDENCY AUTO-RESOLVE. A hand-listed callee list is the thing that rots first (the house already
   learned this: "gate roots, not hand-listed callees"). Run, catch the ReferenceError, pull that
   function out of studio.html, repeat. Bounded, and it PRINTS what it pulled — a resolver that
   silently swallowed a missing name would hide a real extraction failure. */
function resolveDeps(mk) {
  for (let i = 0; i < 40; i++) {
    try { mk(); return; }
    catch (e) {
      const m = /(\w+) is not defined/.exec(String(e && e.message));
      if (!m) throw e;
      let fn; try { fn = ex(src, m[1]); } catch (x) { throw new Error('cannot resolve dependency "' + m[1] + '" from studio.html — ' + x.message); }
      body += fn + '\n'; pulled.push(m[1] + '*');
    }
  }
  throw new Error('dependency resolution did not converge in 40 rounds');
}

function render(p) {
  const prop = { id: 'p', baseId: 'property_a', value: 500000 };
  if (p.purpose !== undefined) prop.propPurpose = p.purpose;
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 200000, intRate: 5,
                 minPmt: 1500, addPmt: 0, nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
                 maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  const fn = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
    body + '\nreturn _yardIntelligence;')(getBaseType, doc, win, { accounts: [prop, mort] }, RET, () => 6000);
  return fn('p');
}

/* RESOLVE AROUND EVERY FIXTURE, NOT JUST THE FIRST. A resolver proves only the code path it
   actually walked, and DIFFERENT FIXTURES WALK DIFFERENT PATHS: once _yardRentNet gained its
   rental-only early return (2026-08-04), the non-rental fixtures stopped reaching
   _yardRentMonthly, so resolving against PURPOSES[0] alone left it undefined and the RENTAL
   fixture later died on a ReferenceError — a gate that had already printed a confident
   dependency list. "It must invoke, not merely compile" was not enough; it must invoke EVERY
   path the gate will exercise. Re-entering resolveDeps per fixture is a no-op once resolved. */
resolveDeps(() => render(PURPOSES[0]));
const OUT = {};
for (const p of PURPOSES) resolveDeps(() => { OUT[p.key] = render(p); });
console.log('extracted from studio.html (* = auto-resolved): ' + pulled.join(', '));

const REVERSE = 'reverse mortgage';
const PLACE   = 'a place to live';
const checks = [];
const need = (l, c, d) => checks.push([l, !!c, d]);

// ── PRESENCE FIRST — an absence claim on an empty render proves nothing (house law). ──
for (const p of PURPOSES) {
  need('[PRESENCE] ' + p.key + ' rendered a non-empty Yard read', OUT[p.key] && OUT[p.key].length > 200, (OUT[p.key] || '').length + ' chars');
}
need('[PRESENCE] the fixture clears Rule E\'s numeric bars at all (Rule E visible SOMEWHERE)',
  PURPOSES.some((p) => OUT[p.key].includes(REVERSE)), 'if this fails the fixture never reached the rule');

// ── LEG 2 — THE DEFECT. Written first. Rule E must be SILENT where the owner does not live. ──
for (const p of PURPOSES.filter((x) => !x.occupies)) {
  need('LEG2 Rule E SILENT on ' + p.key + ' — no reverse mortgage offered to a property the owner does not occupy',
    !OUT[p.key].includes(REVERSE), OUT[p.key].includes(REVERSE) ? 'REVERSE MORTGAGE OFFERED' : 'silent');
}
// ── LEG 1 — it still fires where it is honest. ──
for (const p of PURPOSES.filter((x) => x.occupies)) {
  need('LEG1 Rule E FIRES on ' + p.key + ' (blank behaves as primary — #591 / §19.2)',
    OUT[p.key].includes(REVERSE), OUT[p.key].includes(REVERSE) ? 'fires' : 'MISSING');
}
// ── LEG 3 — the "place to live" phrasing travels with it, not separately. ──
for (const p of PURPOSES) {
  need('LEG3 "' + PLACE + '" on ' + p.key + ' only when occupied',
    OUT[p.key].includes(PLACE) === p.occupies, OUT[p.key].includes(PLACE) ? 'present' : 'absent');
}
// ── LEG 4 — BLAST RADIUS. Every OTHER rule must render identically across all five purposes, or the
//    guard caught a neighbour. Compare the render with Rule E's own sentences removed. ──
const stripE = (s) => s.split(/<div[^>]*>|<\/div>/).filter((t) => t && !t.includes(REVERSE) && !t.includes(PLACE)).join('|');
const baseline = stripE(OUT.PRIMARY);
for (const p of PURPOSES.filter((x) => x.key !== 'PRIMARY')) {
  need('LEG4 [BLAST RADIUS] every rule other than E is identical on ' + p.key,
    stripE(OUT[p.key]) === baseline, stripE(OUT[p.key]) === baseline ? 'identical' : 'DIFFERS from PRIMARY');
}
/* ── LEG 5 — THE PRIMARY-RESIDENCE YARD IS BYTE-IDENTICAL TO TODAY. ────────────────────────────────
   Not "still contains Rule E" — that is a substring check and would pass on a render that had shifted
   in a dozen other ways. Render PRIMARY twice: once through the shipped code, once through a body with
   the purpose guard STRIPPED (which is exactly today's unfixed behaviour, since the guard is true for
   primary either way). Byte equality is the only claim worth making here: THE VISIBLE CHANGE FOR A
   PRIMARY RESIDENCE MUST BE NONE. */
/* Call site only — see the --redfirst note above; the bare name also matches the declaration.
   ⚠️ UNDER --redfirst THE GUARD IS ALREADY STRIPPED, so this anchor is legitimately absent. Bailing
   there made --redfirst exit 1 for the WRONG REASON: a harness bail that LOOKS like the mutation
   biting while no assertion ran at all. Same false-signal family as a mutation that cannot run —
   caught here only because the exit code was right for the wrong reason. Under RED the comparison
   body IS the running body, so the byte-identity legs are trivially true and still meaningful. */
const _CALL = "if (_ruleInScope('E', prop) && ";
const _nCall = body.split(_CALL).length - 1;
if (!RED && _nCall !== 1) { console.error('LEG5 anchor not found exactly once (' + _nCall + ') — cannot build the comparison render.'); process.exit(1); }
const bodyUnguarded = RED ? body : body.split(_CALL).join("if (true && ");
function renderWith(b, p) {
  const prop = { id: 'p', baseId: 'property_a', value: 500000 };
  if (p.purpose !== undefined) prop.propPurpose = p.purpose;
  const mort = { id: 'm', baseId: 'mortgage_a', linkedAssetId: 'p', value: 200000, intRate: 5,
                 minPmt: 1500, addPmt: 0, nextPmtDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
                 maturityDate: new Date(new Date().getFullYear() + 20, 0, 1).toISOString().slice(0, 10) };
  return new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal',
    b + '\nreturn _yardIntelligence;')(getBaseType, doc, win, { accounts: [prop, mort] }, RET, () => 6000)('p');
}
const primaryToday = renderWith(bodyUnguarded, PURPOSES[0]);
need('LEG5 [PRESENCE] the unguarded comparison render is non-empty', primaryToday.length > 200, primaryToday.length + ' chars');
need('LEG5 the primary-residence Yard is BYTE-IDENTICAL to today (guard changes nothing for primary)',
  OUT.PRIMARY === primaryToday, OUT.PRIMARY === primaryToday ? 'identical, ' + OUT.PRIMARY.length + ' bytes'
    : 'DIFFERS: guarded=' + OUT.PRIMARY.length + 'b unguarded=' + primaryToday.length + 'b');
need('LEG5 and the blank-purpose Yard is BYTE-IDENTICAL to today too',
  OUT.BLANK === renderWith(bodyUnguarded, PURPOSES[1]), 'blank behaves as primary');

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[yard_13_5_ruleE_scope] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length);
process.exit(bad === 0 ? 0 : 1);
