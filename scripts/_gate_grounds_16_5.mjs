/* DEV-ONLY red-first FUNCTIONAL gate — §16.5 true all-in cost-of-this-home (Property Copy Bank §16.5,
   R170/R171/R172). Renders through the ACTUAL served path (_groundsSignalsHTML) with a populated state.
   Asserts:
     (WINNER base) mortgage P&I $2,500 + HELOC $300 + taxes $1,000 + insurance $200 + upkeep $500 -> "All in …
                   about $4,500/mo … mortgage $2,500 and HELOC $300, plus taxes, insurance, and upkeep. In
                   retirement, that's income you'll need to generate every month for as long as you keep it.";
     (BREAKDOWN)   itemized parts sum to the all-in figure; 'upkeep (estimated)' keeps its tag (R172);
     (SOURCED NAMING) mortgage-only + taxes-only -> "mortgage $2,500, plus taxes" (no HELOC / no "this line");
     (ALL CATS)    HOA + utilities sourced -> "taxes, insurance, upkeep, HOA, and utilities" + breakdown lines;
     (DOUBLE-COUNT R172) mortgage minPmt is P&I only — a mortgage escrow propTaxAnnual is IGNORED; taxes come
                   ONCE from the Grounds carry (all-in = $3,500, NOT $4,500);
     (FIRES-WHEN R169) no lien payment -> silent; no carrying cost -> silent;
     (LOCK-3) render never mutates acc.
   --redfirst strips the §16.5 render block from _groundsSignalsHTML -> the winner vanishes (gate bites). */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.replace(/        \/\/ §16\.5 true all-in cost-of-this-home beat[\s\S]*?_groundsAllInBreakdown\(allIn\) \+ '<\/div>';\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ROOTS, not a hand-list. A hand-typed callee list rots the moment a function gains a new callee:
// every gate slicing its caller then dies with "ReferenceError: <fn> is not defined" — a red that
// says nothing about the room. That is exactly what killed the eight HELOC gates. extractClosure
// walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_groundsSignalsHTML', '_groundsAllIn'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = 'var GROUNDS_COST_TO_VALUE_HI=4;\nvar GROUNDS_LTV_HI=80;\n' + extractClosure(s, ROOTS) +
    '\nreturn { sig:_groundsSignalsHTML, allIn:_groundsAllIn };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let e = null, err = '';
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  const prop = (extra) => Object.assign({ id: 'prop1', baseId: 'property_primary', value: 800000, linkedAssetId: null }, extra || {});
  const mtg = (min, extra) => Object.assign({ id: 'm1', baseId: 'mortgage_primary', value: 400000, minPmt: min, linkedAssetId: 'prop1' }, extra || {});
  const heloc = (min) => ({ id: 'h1', baseId: 'heloc_primary', value: 40000, minPmt: min, linkedAssetId: 'prop1' });
  const run = (accts) => build(accts).sig('prop1', accts.find(a => a.id === 'prop1'));

  // Base: mortgage $2,500 + HELOC $300 + taxes $12,000/yr + ins $2,400/yr + upkeep $6,000/yr.
  const baseAcc = [prop({ propTaxYr: 12000, homeInsYr: 2400, maintYr: 6000 }), mtg(2500), heloc(300)];
  const baseOut = run(baseAcc);
  need('(WINNER base) "$4,500/mo … mortgage $2,500 and HELOC $300, plus taxes, insurance, and upkeep …"',
    /All in, this home costs about \$4,500\/mo to hold — mortgage \$2,500 and HELOC \$300, plus taxes, insurance, and upkeep\. In retirement, that's income you'll need to generate every month for as long as you keep it\./.test(baseOut));
  need('(BREAKDOWN) itemized parts, upkeep tagged (estimated), summing to $4,500',
    /Of that \$4,500: \$2,500 mortgage · \$300 HELOC · \$1,000 taxes · \$200 insurance · \$500 upkeep \(estimated\)\./.test(baseOut));

  // Mortgage-only + taxes-only: sourced naming (no HELOC, single category).
  const soloOut = run([prop({ propTaxYr: 12000 }), mtg(2500)]);
  need('(SOURCED NAMING) mortgage-only + taxes-only -> "mortgage $2,500, plus taxes" (no HELOC, no "this line")',
    /costs about \$3,500\/mo to hold — mortgage \$2,500, plus taxes\./.test(soloOut) && !/this line/.test(soloOut) && !/HELOC/.test(soloOut));

  // All categories incl HOA + utilities.
  const allOut = run([prop({ propTaxYr: 12000, homeInsYr: 2400, maintYr: 6000, hoaYr: 3600, utilYr: 2400 }), mtg(2500), heloc(300)]);
  need('(ALL CATS) HOA + utilities sourced -> "taxes, insurance, upkeep, HOA, and utilities"',
    /plus taxes, insurance, upkeep, HOA, and utilities\./.test(allOut) && /\$5,000\/mo to hold/.test(allOut));
  need('(ALL CATS breakdown) HOA $300 + utilities $200 itemized',
    /\$300 HOA · \$200 utilities\./.test(allOut));

  // DOUBLE-COUNT GUARD (R172): mortgage escrow propTaxAnnual is IGNORED; taxes counted once from Grounds carry.
  const dc = run([prop({ propTaxYr: 12000 }), mtg(2500, { propTaxAnnual: 12000 })]);
  need('(DOUBLE-COUNT R172) mortgage escrow ignored -> all-in $3,500 (taxes counted ONCE, not $4,500)',
    /costs about \$3,500\/mo to hold/.test(dc) && !/\$4,500\/mo to hold/.test(dc));

  // FIRES-WHEN (R169).
  need('(FIRES-WHEN) no lien payment (minPmt 0) -> §16.5 silent',
    !/All in, this home costs about/.test(run([prop({ propTaxYr: 12000 }), mtg(0)])) && e.allIn('prop1', prop({ propTaxYr: 12000 })) === null);
  need('(FIRES-WHEN) no carrying cost -> §16.5 silent',
    !/All in, this home costs about/.test(run([prop({}), mtg(2500)])));

  // LOCK-3.
  const acc = baseAcc.find(a => a.id === 'prop1'); const before = JSON.stringify(acc); run(baseAcc);
  need('(LOCK-3) render never mutates acc', JSON.stringify(acc) === before);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§16.5 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
