/* DEV-ONLY red-first gate — 🌳 THE YARD (Yard Copy Bank). The merged estate tile now opens a combined
   cost-of-ownership modal instead of the Real Estate modal, and surfaces a DE-DUPED real-monthly cost.
   Asserts:
     (DE-DUPE)  _yardRealMonthly = P&I + (PMI + Other) + carry/12 [tax+ins ONCE, from carry] + drawn-HELOC pmt.
                Tax/insurance are NOT double-counted (the §16.5 lesson). Every term sourced-or-blank (L47):
                no mortgage → no P&I/escrow; HELOC-only Yard → carry + drawn line only.
     (ROUTING)  the merged tile's click calls openYardModal (datum-estate.js), not openAccountModal.
     (LABEL)    the tile restacks to THE YARD / brand sub-line / Net Equity: {figure}.
     (MODAL/DI) openYardModal + the retirement-lens DI rules ship in the served bytes.
   --redfirst (1) re-adds tax/ins to the escrow term (naive double-count) and (2) reverts routing to
   openAccountModal -> the de-dupe check + the routing check bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let sStudio = readFileSync('studio.html', 'utf8');
let sEstate = readFileSync('scripts/datum-estate.js', 'utf8');

if (RED) {
  sStudio = sStudio.replace(
    "        var escrowExtra = m ? (_num(m.pmiMonthly) + _num(m.mortgageOtherCost) / 12) : 0;   // PMI + Other only; tax/ins live in carry (DE-DUPE)",
    "        var escrowExtra = m ? (_num(m.propTaxAnnual)/12 + _num(m.insAnnual)/12 + _num(m.pmiMonthly) + _num(m.mortgageOtherCost) / 12) : 0;");
  sEstate = sEstate.replace('gf.setAttribute(\'onclick\', "openYardModal(\'', 'gf.setAttribute(\'onclick\', "openAccountModal(\'');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = sStudio.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    \\}\\n')); return m ? m[0] : ''; };
const NAMES = ['_num', '_linkedMortgageWith', '_canonPropTax', '_canonHomeIns', 'calcCarryTotal', 'calculateTotalPmt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRealMonthly'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, taxCode: 'debt' };
  return { id, taxCode: 'other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { real:_yardRealMonthly };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', e = null;
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  // Mortgage Yard: home 500k; P&I 2000; escrow tax 12k + ins 2.4k + pmi 100 + other 1.2k; balance 400k.
  const mYard = [
    { id: 'p1', baseId: 'property_primary', value: 500000 },
    { id: 'm1', baseId: 'mortgage_primary', linkedAssetId: 'p1', minPmt: 2000, addPmt: 0, propTaxAnnual: 12000, insAnnual: 2400, pmiMonthly: 100, mortgageOtherCost: 1200, value: 400000 }
  ];
  // De-duped: 2000 P&I + (100 pmi + 100 other) + 1200 carry(tax+ins) = 3400. NAIVE double-count would be 4600.
  need('(DE-DUPE) tax+ins counted ONCE — real monthly = $3,400, not $4,600', Math.round(build(mYard).real('p1')) === 3400);

  // HELOC-only Yard: home 500k; property tax 6k + ins 1.8k; HELOC drawn 30k, pmt 300.
  const hYard = [
    { id: 'p2', baseId: 'property_primary', value: 500000, propTaxYr: 6000, homeInsYr: 1800 },
    { id: 'h2', baseId: 'heloc_primary', linkedAssetId: 'p2', value: 30000, minPmt: 300, addPmt: 0 }
  ];
  need('(SOURCED) HELOC-only Yard = carry $650 + drawn line $300 = $950 (no P&I/escrow)', Math.round(build(hYard).real('p2')) === 950);
  // Undrawn HELOC adds no payment.
  const hUndrawn = [{ id: 'p3', baseId: 'property_primary', value: 500000, propTaxYr: 6000, homeInsYr: 1800 }, { id: 'h3', baseId: 'heloc_primary', linkedAssetId: 'p3', value: 0, minPmt: 300 }];
  need('(SOURCED) an UNDRAWN HELOC adds no payment — real monthly = carry $650 only', Math.round(build(hUndrawn).real('p3')) === 650);
}

// ── served bytes — studio.html (modal + DI) ──
need('(MODAL) openYardModal defined', /window\.openYardModal = function/.test(sStudio));
need('(DI) retirement-lens engine present (Rule A negative-bond)', sStudio.includes('behaves like a bond you’ve sold short'));
need('(DI) calm line Z present', sStudio.includes('sit in quiet balance'));
need('(SECTIONS) all four sections rendered', sStudio.includes("'The Property'") && sStudio.includes("'The Mortgage'") && sStudio.includes('The Real Cost of Ownership') && sStudio.includes('Share of income'));
need('(CLICKABLE) property/mortgage/HELOC headers open their own room via secHead', sStudio.includes('var secHead = function') && sStudio.includes("openAccountModal(\\'") && sStudio.includes("secHead('🏰', m.id") && sStudio.includes("secHead('🍷', h.id"));
need('(TOOLTIP) Yard hovers open downward (top:100%), not off the top', /var hov = function[\s\S]*?top:100%; bottom:auto;/.test(sStudio));

// ── served bytes — datum-estate.js (routing + label restack) ──
need('(ROUTING) merged tile opens The Yard', /if \(_moatDebts\.length\) gf\.setAttribute\('onclick', "openYardModal\('/.test(sEstate));
need('(LABEL) tile restacks to THE YARD + Net Equity line', sEstate.includes('>THE YARD<') && sEstate.includes('Net Equity: '));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on naive double-count + old routing.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate FAILS on the double-counted real-monthly and the un-swapped routing.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
