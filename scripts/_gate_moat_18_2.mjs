/* DEV-ONLY red-first FUNCTIONAL gate — §18.2 escrow label-unify + linked SHARE (Option B: Moat canonical,
   Grounds read-only mirror) + overwrite-warn (Mortgage Copy Bank §18.2 / R126 / R134-136). Asserts:
     (RESOLVER) _canonPropTax/_canonHomeIns derive tax/ins from the linked mortgage's propTaxAnnual/insAnnual
                when present, else the Grounds' own field — so §16.5 all-in is IDENTICAL whether the number was
                entered on the Moat or the Grounds, and a STALE Grounds value is IGNORED while linked (counted ONCE).
     (LABELS)   both Moat escrow labels adopt the unified Grounds phrasing (D1).
     (MIRROR)   the Grounds tax/ins field renders read-only "🔗 mirrored from The Moat" via _carryMirrorField.
     (WARN)     both overwrite-warn strings (tax + insurance, verbatim R134/R136) are in the served bytes, and
                BOTH link entry points call _onSecuredLinkFormed.
   --redfirst neuters the resolver (falls back to the raw Grounds field) -> the Moat-supplied tax vanishes from
   all-in and the stale value is no longer ignored -> the functional checks bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  // Strip Option-B: the resolver falls back to the raw Grounds field only (pre-§18.2 behaviour).
  s = s.replace("        var m = _linkedMortgageWith(acc.id, 'propTaxAnnual');\n        return m ? m.propTaxAnnual : acc.propTaxYr;",
                '        return acc.propTaxYr;');
  s = s.replace("        var m = _linkedMortgageWith(acc.id, 'insAnnual');\n        return m ? m.insAnnual : acc.homeInsYr;",
                '        return acc.homeInsYr;');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_num', '_linkedMortgageWith', '_canonPropTax', '_canonHomeIns', 'calcCarryTotal',
               '_groundsLinkedPmts', '_groundsAllIn', '_groundsAllInBeat', '_groundsAllInBreakdown'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') +
    '\nreturn { canonTax:_canonPropTax, canonIns:_canonHomeIns, carry:calcCarryTotal, allIn:_groundsAllIn, beat:_groundsAllInBeat };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let e = null, err = '';
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  const prop = (extra) => Object.assign({ id: 'prop1', baseId: 'property_primary', value: 800000, linkedAssetId: null }, extra || {});
  const mtg = (extra) => Object.assign({ id: 'm1', baseId: 'mortgage_primary', value: 400000, minPmt: 2500, linkedAssetId: 'prop1' }, extra || {});
  const allInOf = (accts) => build(accts).allIn('prop1', accts.find(a => a.id === 'prop1'));

  // ── (RESOLVER) all-in is identical whether tax/ins entered on the Moat or the Grounds ──
  // Case A — Moat-only: mortgage carries tax $12,000 + ins $2,400; Grounds blank.
  const A = allInOf([prop({}), mtg({ propTaxAnnual: 12000, insAnnual: 2400 })]);
  // Case B — Grounds-only: mortgage blank; Grounds carries the same $12,000 + $2,400.
  const B = allInOf([prop({ propTaxYr: 12000, homeInsYr: 2400 }), mtg({})]);
  need('(RESOLVER) Moat-entered tax/ins reach all-in: $2,500 P&I + $1,000 tax + $200 ins = $3,700',
    A && Math.round(A.allIn) === 3700);
  need('(RESOLVER) Grounds-entered tax/ins give the IDENTICAL all-in ($3,700) — one number, either room',
    A && B && Math.round(B.allIn) === 3700 && Math.round(A.allIn) === Math.round(B.allIn));

  // Case C — both sides hold a DIFFERING value: canonical (Moat) wins, stale Grounds IGNORED -> counted ONCE.
  const C = allInOf([prop({ propTaxYr: 9000, homeInsYr: 1800 }), mtg({ propTaxAnnual: 12000, insAnnual: 2400 })]);
  need('(RESOLVER count-once) stale Grounds tax/ins ignored while linked: all-in stays $3,700 (canonical), not $4,600 (double)',
    C && Math.round(C.allIn) === 3700 && Math.round(C.allIn) !== 4600);

  // ── (RESOLVER direct) canonical linked-mortgage escrow wins; unlinked falls back to the Grounds field ──
  const engC = build([prop({ propTaxYr: 9000 }), mtg({ propTaxAnnual: 12000 })]);
  need('(RESOLVER) _canonPropTax reads the linked mortgage escrow ($12,000), not the stale Grounds $9,000',
    Number(engC.canonTax({ id: 'prop1', propTaxYr: 9000 })) === 12000);
  const engSolo = build([prop({ propTaxYr: 7000, linkedAssetId: null })]);
  need('(RESOLVER fallback) unlinked property: _canonPropTax reads the Grounds field ($7,000)',
    Number(engSolo.canonTax({ id: 'prop1', propTaxYr: 7000 })) === 7000);
}

// ── (LABELS · served bytes) both Moat escrow labels adopt the unified Grounds phrasing (D1) ──
// §20.4 (#407 §20 Commit 2) RENAMED the Moat insurance label to 'Annual Homeowner Insurance' per the
// authored Copy Bank R214. The Grounds mirror still carries the D1 phrasing, so the two surfaces now
// DIVERGE for the same underlying figure — raised with the Architect; this gate tracks the Moat side.
need("(LABEL) Moat property-tax label = 'Property Tax (yr)'", /_dLbl\(base, 'Property Tax \(yr\)'/.test(s));
need("(LABEL) Moat insurance label = 'Annual Homeowner Insurance' (§20.4 rename)", /_dLbl\(base, 'Annual Homeowner Insurance'/.test(s));

// ── (MIRROR · served bytes) Grounds tax/ins render through the mirror helper + the note text exists ──
need('(MIRROR) Grounds tax field renders via _carryMirrorField(propTaxAnnual)', /_carryMirrorField\(id, acc, 'propTaxAnnual', 'propTaxYr'/.test(s));
need('(MIRROR) Grounds ins field renders via _carryMirrorField(insAnnual)', /_carryMirrorField\(id, acc, 'insAnnual', 'homeInsYr'/.test(s));
need("(MIRROR) read-only note '🔗 mirrored from The Moat' in served bytes", s.includes('🔗 mirrored from The Moat'));

// ── (WARN · served bytes) verbatim R134/R136 strings + both entry points wired ──
need("(WARN) title 'Use the same figure in both rooms?'", s.includes('Use the same figure in both rooms?'));
need("(WARN) property-tax body (verbatim R134)", s.includes('You already entered a property-tax amount on The Grounds. Linking can keep both rooms in step so you only maintain one number. Want to use it here too?'));
need("(WARN) homeowners-insurance body (verbatim R136)", s.includes('You already entered a homeowners-insurance amount on The Grounds. Linking can keep both rooms in step so you only maintain one number. Want to use it here too?'));
need("(WARN) button 'Use the shared figure'", s.includes("confirmText: 'Use the shared figure'"));
need("(WARN) button \"Keep this room's own\"", s.includes('cancelText: "Keep this room\'s own"'));
need('(WARN) entry A — linkDebtToAsset calls _onSecuredLinkFormed', /_onSecuredLinkFormed\(debtId, assetId, assetId\)/.test(s));
need('(WARN) entry B — updateAccField linkedAssetId calls _onSecuredLinkFormed', /if\(value\) _onSecuredLinkFormed\(id, value, id\)/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.2 resolver-stripped code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
