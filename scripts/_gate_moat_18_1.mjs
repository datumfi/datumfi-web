/* DEV-ONLY red-first FUNCTIONAL gate — §18.1 {mortgageOtherCost} 'Other (yr)' escrow line (Mortgage Copy Bank
   §18.1 / R125 / R133). Asserts the field FEEDS BOTH all-in surfaces:
     (§4.1 Moat) calculateEscrowMonthly + _escrowFooter include Other/12; hasEscrow fires on Other-only;
     (§16.5 Grounds) the linked mortgage's Other rides into the home's all-in beat + breakdown ("$X other"),
                     and can fire §16.5 on its own when no Grounds carry is set (no double-count — no Grounds twin);
     (FIELD) the 'Other (yr)' input persists to mortgageOtherCost via updateAccField, clamped via enforceAmt.
   --redfirst strips the two Other feeds -> the Other contribution vanishes from both all-ins (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('return pt / 12 + ins / 12 + pmi + other / 12;', 'return pt / 12 + ins / 12 + pmi;');
  s = s.replace('m += _num(a.minPmt); other += _num(a.mortgageOtherCost);', 'm += _num(a.minPmt);');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','calculateEscrowMonthly','hasEscrow','_escrowFooter','_num','_linkedMortgageWith','_canonPropTax','_canonHomeIns','calcCarryTotal',
               '_groundsLinkedDebt','_groundsLiens','_groundsCLTV','_groundsCLTVBeat','_groundsEquityBarHTML',
               '_groundsLinkedPmts','_groundsAllIn','_groundsAllInBeat','_groundsAllInBreakdown','_groundsDI','_groundsDI9b','_groundsSignalsHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = 'var GROUNDS_COST_TO_VALUE_HI=4;\nvar GROUNDS_LTV_HI=80;\n' + NAMES.map(extract).join('\n') +
    '\nreturn { esc:calculateEscrowMonthly, foot:_escrowFooter, has:hasEscrow, allIn:_groundsAllIn, sig:_groundsSignalsHTML };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let e = null, err = '';
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  // ── §4.1 Moat escrow footer ──
  const mAcc = { baseId: 'mortgage_primary', value: 300000, minPmt: 2000, propTaxAnnual: 12000, insAnnual: 2400, pmiMonthly: 100, mortgageOtherCost: 3600 };
  need('(§4.1) escrowMonthly includes Other/12: 1000+200+100+300 = $1,600',
    Math.round(e.esc(mAcc)) === 1600);
  need('(§4.1) footer "real all-in payment is $3,600/mo" (2000 P&I + 1600 escrow)',
    /real all-in payment is \$3,600\/mo/.test(e.foot(mAcc)));
  need('(§4.1) hasEscrow fires on Other-only (all other escrow blank)',
    e.has({ baseId: 'mortgage_primary', mortgageOtherCost: 3600 }) === true);

  // ── §16.5 Grounds all-in ──
  const prop = (extra) => Object.assign({ id: 'prop1', baseId: 'property_primary', value: 800000, linkedAssetId: null }, extra || {});
  const mtg = (min, other) => ({ id: 'm1', baseId: 'mortgage_primary', value: 400000, minPmt: min, mortgageOtherCost: other, linkedAssetId: 'prop1' });
  const run = (accts) => build(accts).sig('prop1', accts.find(a => a.id === 'prop1'));

  // mortgage $2,500 P&I + Other $3,600/yr ($300/mo) + Grounds taxes $12,000/yr ($1,000/mo) -> all-in $3,800.
  const g1 = run([prop({ propTaxYr: 12000 }), mtg(2500, 3600)]);
  need('(§16.5) mortgage Other rides into the home all-in: "$3,800/mo … plus taxes and other costs"',
    /costs about \$3,800\/mo to hold — mortgage \$2,500, plus taxes and other costs\./.test(g1));
  need('(§16.5 breakdown) "$300 other" itemized, summing to $3,800',
    /Of that \$3,800: \$2,500 mortgage · \$1,000 taxes · \$300 other\./.test(g1));

  // Other alone (no Grounds carry) still fires §16.5 (no double-count — no Grounds twin).
  const g2 = run([prop({}), mtg(2500, 3600)]);
  need('(§16.5) Other-only carry still fires: "$2,800/mo … plus other costs"',
    /costs about \$2,800\/mo to hold — mortgage \$2,500, plus other costs\./.test(g2) && /\$300 other\./.test(g2));

  // FIELD wired.
  need('(FIELD) Other input persists to mortgageOtherCost via updateAccField',
    /updateAccField\('\$\{id\}', 'mortgageOtherCost', this\.value\)/.test(s));
  need('(FIELD) mortgageOtherCost clamped via enforceAmt (in the field list)',
    /field === 'mortgageOtherCost'/.test(s));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.1 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
