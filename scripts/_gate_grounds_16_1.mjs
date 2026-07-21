/* DEV-ONLY red-first FUNCTIONAL gate — §16.1 CLTV + borrowing-capacity + stacked equity bar (Property Copy
   Bank §16.1, R164/R165/R166/R167). Renders through the ACTUAL served path (_groundsSignalsHTML) with a
   populated state.accounts. Asserts:
     (WINNER base)   home $800k + $400k mortgage -> "borrowed about 50% … against your mortgage. Lenders
                     typically cap total borrowing near 80%, so you have roughly $240,000 of untapped …";
     (WINNER both)   home $800k + $300k mortgage + $100k HELOC -> "across your mortgage and HELOC" (sourced
                     lien-naming, not the bank's HELOC-voice 'this line');
     (WINNER ceiling) home $800k + $600k mortgage (75% >= 90% of 80% cap) -> near-ceiling fragility variant;
     (CAP LABELED)   the ~80% cap renders as a LABELED assumption ('typically') from byte one (R167);
     (BAR) stacked bar segments = Equity/Mortgage/HELOC, each with its $ amount; blank lien omitted (no zero-fill);
     (SAME TALLY) _groundsLiens.total === _groundsLinkedDebt (bar and beat can never disagree, R166);
     (SOURCED-OR-BLANK) value blank -> silent; no lien -> silent; single lien -> still valid (R167);
     (LOCK-3) render never mutates acc.value.
   --redfirst strips the §16.1 render block from _groundsSignalsHTML -> the winner vanishes (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/        \/\/ §16\.1 CLTV \+ borrowing-capacity beat[\s\S]*?_groundsEquityBarHTML\(cltv\);\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_num','calcCarryTotal','_groundsLinkedDebt','_groundsLiens','_groundsCLTV','_groundsCLTVBeat',
               '_groundsEquityBarHTML','_groundsLinkedPmts','_groundsAllIn','_groundsAllInBeat','_groundsAllInBreakdown',
               '_groundsDI','_groundsDI9b','_groundsSignalsHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = 'var GROUNDS_COST_TO_VALUE_HI=4;\nvar GROUNDS_LTV_HI=80;\n' + NAMES.map(extract).join('\n') +
    '\nreturn { sig:_groundsSignalsHTML, liens:_groundsLiens, debt:_groundsLinkedDebt, cltv:_groundsCLTV };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let e = null, err = '';
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  const prop = (v) => ({ id: 'prop1', baseId: 'property_primary', value: v, linkedAssetId: null });
  const run = (accounts) => build(accounts).sig('prop1', accounts.find(a => a.id === 'prop1'));

  // Base, mortgage-only: 800k value, 400k mortgage -> 50% CLTV, untapped 0.8*800-400 = 240k.
  const baseAcc = [prop(800000), { id: 'm1', baseId: 'mortgage_primary', value: 400000, linkedAssetId: 'prop1' }];
  const baseOut = run(baseAcc);
  need('(WINNER base) 50% CLTV + $240,000 untapped, sourced "against your mortgage"',
    /You've borrowed about 50% of your home's value against your mortgage\. Lenders typically cap total borrowing near 80%, so you have roughly \$240,000 of untapped borrowing power\./.test(baseOut));
  need('(CAP LABELED) ~80% cap renders as a labeled assumption ("typically") from byte one',
    /Lenders typically cap total borrowing near 80%/.test(baseOut));
  need('(BAR base) segments Equity $400,000 + Mortgage $400,000, NO HELOC segment',
    /Equity \$400,000/.test(baseOut) && /Mortgage \$400,000/.test(baseOut) && !/HELOC \$/.test(baseOut));

  // Base, both liens: 800k, 300k mortgage + 100k HELOC -> 50% CLTV, untapped 240k, "mortgage and HELOC".
  const bothAcc = [prop(800000), { id: 'm1', baseId: 'mortgage_primary', value: 300000, linkedAssetId: 'prop1' },
    { id: 'h1', baseId: 'heloc_primary', value: 100000, linkedAssetId: 'prop1' }];
  const bothOut = run(bothAcc);
  need('(WINNER both) sourced lien-naming "across your mortgage and HELOC" (not "this line")',
    /borrowed about 50% of your home's value across your mortgage and HELOC\. Lenders typically cap/.test(bothOut) && !/this line/.test(bothOut));
  need('(BAR both) Equity $400,000 · Mortgage $300,000 · HELOC $100,000',
    /Equity \$400,000/.test(bothOut) && /Mortgage \$300,000/.test(bothOut) && /HELOC \$100,000/.test(bothOut));

  // Near-ceiling: 800k, 600k mortgage -> 75% CLTV >= 0.9*80 = 72 -> fragility variant.
  const ceilAcc = [prop(800000), { id: 'm1', baseId: 'mortgage_primary', value: 600000, linkedAssetId: 'prop1' }];
  const ceilOut = run(ceilAcc);
  need('(WINNER ceiling) 75% CLTV -> near-ceiling fragility variant renders',
    /borrowed about 75% of your home's value against your mortgage — close to the ceiling lenders typically allow \(~80%\)\. A dip in home value would erase your remaining cushion fast\./.test(ceilOut));
  need('(GUARD) near-ceiling does NOT also emit the untapped-borrowing base line', !/untapped borrowing power/.test(ceilOut));

  // SAME TALLY: _groundsLiens.total === _groundsLinkedDebt for the both-lien case.
  const eng = build(bothAcc);
  need('(SAME TALLY) _groundsLiens.total === _groundsLinkedDebt (bar/beat can never disagree)',
    eng.liens('prop1').total === eng.debt('prop1') && eng.debt('prop1') === 400000);

  // SOURCED-OR-BLANK.
  need('(SOURCED-OR-BLANK) home value blank -> §16.1 silent',
    !/of untapped borrowing power/.test(run([prop(0), { id: 'm1', baseId: 'mortgage_primary', value: 400000, linkedAssetId: 'prop1' }])));
  need('(SOURCED-OR-BLANK) no linked lien -> §16.1 silent',
    !/borrowed about/.test(run([prop(800000)])) && e.cltv('prop1', prop(800000)) === null);
  need('(R167 single-lien valid) one lien still produces a CLTV beat',
    /borrowed about 50% of your home's value against your mortgage/.test(baseOut));

  // ── #1b — editable cap override ──────────────────────────────────────────────────────────────────
  const propCap = (v, cap) => ({ id: 'prop1', baseId: 'property_primary', value: v, cltvCapPct: cap, linkedAssetId: null });
  const runCap = (accts) => build(accts).sig('prop1', accts[0]);
  const mtg = (v) => ({ id: 'm1', baseId: 'mortgage_primary', value: v, linkedAssetId: 'prop1' });

  const ovOut = runCap([propCap(800000, 85), mtg(400000)]);   // 0.85*800 - 400 = 280k
  need('(#1b override) cap 85% recomputes untapped to $280,000 + "cap you set" copy',
    /At the 85% cap you set, you have roughly \$280,000 of untapped borrowing power\./.test(ovOut));
  need('(#1b override) drops the "typically" framing when the user set a cap',
    !/typically cap total borrowing/.test(ovOut));
  need('(#1b override) tight cap (55%) flips a 50% CLTV to near-ceiling, "cap you set"',
    /close to the 55% cap you set\. A dip in home value/.test(runCap([propCap(800000, 55), mtg(400000)])));
  need('(#1b fallback) invalid cap (0) -> labeled ~80% typical default',
    /Lenders typically cap total borrowing near 80%/.test(runCap([propCap(800000, 0), mtg(400000)])));

  need('(#1b recolor) mortgage bar segment uses var(--danger), not var(--gold)',
    /background:var\(--danger\)/.test(baseOut) && !/background:var\(--gold\)/.test(baseOut));

  need('(FIELD) cap-override input persists to cltvCapPct via updateAccField',
    /updateAccField\('\$\{id\}', 'cltvCapPct', this\.value\)/.test(s));
  need('(FIELD) cap-override gated on a linked lien + clamped 0–100',
    /if \(_groundsLinkedDebt\(id\) > 0\)/.test(s) && /enforceNumRange\(this, 0, 100\); updateAccField\('\$\{id\}', 'cltvCapPct'/.test(s));
  need('(FIELD) cap-override re-renders the Grounds DI on change (updateAccField trigger list)',
    /field === 'cltvCapPct'/.test(s));

  // LOCK-3.
  const acc = baseAcc.find(a => a.id === 'prop1'); const before = acc.value; run(baseAcc);
  need('(LOCK-3) render never mutates acc.value', acc.value === before && before === 800000);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§16.1 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
