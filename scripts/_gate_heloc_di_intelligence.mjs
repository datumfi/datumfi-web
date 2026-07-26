/* DEV-ONLY red-first FUNCTIONAL gate — §16 Intelligence Layer + §17 math fixes.
   Extracts the pure engine functions from studio.html and RUNS them against the §17 verified test inputs
   (Balance 65,655 · APR 5.77% · Fixed · Repayment · limit 150k · min 565 · add 65 · maturity 2032-01):
     (a) the intel sub-block renders BELOW the summary and is separately marked (source order + subhead);
     (b) each beat fires when its inputs are present and is ABSENT when one is missing (sourced-or-blank bite);
     (c) beats COMPOSE (all 6 fire together on the test inputs);
     §17.1 _debtPayoffDisplay clamps to 'January 2032 (maturity)' + _payoffVsMaturity.requiredPmt ≈ $1,163/mo;
     §17.2 life-of-loan figure dropped for HELOC.
   --redfirst strips the §16/§17 additions → extraction/asserts fail (proves bite). */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/    function _helocIntelBeats\(acc\)[\s\S]*?\n    }\n/, '');
  s = s.replace(/    function _diIntelligence\(acc\)[\s\S]*?\n    }\n/, '');
  s = s.replace(/    function _payoffVsMaturity\(acc\)[\s\S]*?\n    }\n/, '');
  s = s.replace(/    function _debtPayoffDisplay\(acc\)[\s\S]*?\n    }\n/, '');
  s = s.replace(/<div id="modal-cellar-intel-\$\{id\}"[^>]*>\$\{_diIntelligence\(acc\)\}<\/div>\n/, '');
  s = s.replace(/\? null : lifeOfLoan\(acc\)/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// (a) source-order: the intel div renders AFTER the summary div, inside the DI box, and is marked.
const summaryIdx = s.indexOf('id="modal-cellar-di-${id}"');
const intelIdx   = s.indexOf('id="modal-cellar-intel-${id}"');
need('intel sub-block renders BELOW the summary (source order)', summaryIdx > 0 && intelIdx > summaryIdx);
need("intel sub-block separately marked ('What this means for you' + top rule)",
  s.includes('What this means for you') && /border-top:1px solid rgba\(93,202,165/.test(s));
// §17.2 — life-of-loan dropped for HELOC.
need('§17.2 life-of-loan figure dropped for HELOC', /title === 'HELOC'\) \? null : lifeOfLoan\(acc\)/.test(s));

// Extract the pure engine functions and run them.
// ROOTS, not a hand-list. The hand-listed NAMES array rotted the moment _helocIntelBeats gained
// _helocInterestOnlyDraw (§22 draw-period work): every gate slicing it died with
// "ReferenceError: _helocInterestOnlyDraw is not defined" — a red that says nothing about the room.
// extractClosure walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_helocIntelBeats', '_diIntelligence', '_payoffVsMaturity', '_debtPayoffDisplay'];
let api = null, extractErr = '';
try {
  const body = extractClosure(s, ROOTS) +
    '\nreturn {b:_helocIntelBeats,intel:_diIntelligence,pv:_payoffVsMaturity,pay:_debtPayoffDisplay};';
  api = new Function('state', 'getBaseType', body)(
    { accounts: [] },
    () => ({ id: 'heloc_primary', title: 'HELOC' })
  );
} catch (e) { extractErr = e.message; }
need('engine functions extracted + evaluate' + (extractErr ? ' (' + extractErr + ')' : ''), !!api);

if (api) {
  const acc = { baseId: 'heloc_primary', value: 65655, intRate: 5.77, minPmt: 565, addPmt: 65,
    rateType: 'Fixed', helocPhase: 'Repayment', helocCreditLimit: 150000, origAmount: 150000,
    origDate: '2005-01-12', maturityDate: '2032-01-12', nextPmtDate: '2026-07-01' };

  const beats = api.b(acc);
  const joined = beats.join(' || ');
  // (c) the six §16 beats COMPOSE (each asserted individually below); this acc also carries a payment with no
  // linked home, so §19.4 Variant B (retirement income-floor) legitimately rides along → >= 6, not exactly 6.
  need('(c) COMPOSE: the §16 beats fire together (>=6 beats on the test inputs)', beats.length >= 6);
  need('16.1 payoff-past-maturity fires (mentions maturity + required pmt)',
    /pays off around/.test(joined) && /the contract matures January 2032/.test(joined) && /you\'d need about \$/.test(joined));
  need('16.2 minimum-barely-dents fires (interest vs principal split)',
    /minimum, about \$/.test(joined) && /is just interest/.test(joined));
  need('16.3 extra-payment fires (moves payoff + saves interest)',
    /isn\'t decoration/.test(joined) && /saves roughly \$/.test(joined));
  need('16.4 dark-equity prompt fires (no linked home)',
    /haven\'t linked the property yet/.test(joined));
  need('16.5 fixed-rate acknowledgment fires',
    /locked a fixed rate on this line/.test(joined));
  need('16.6 repayment-lens fires (reframes utilization)',
    /really a paydown figure, not spare headroom/.test(joined));

  // §17.1 numbers.
  const pv = api.pv(acc);
  need('§17.1 _payoffVsMaturity: 66 months to maturity', pv && pv.monthsToMaturity === 66);
  need('§17.1 required payment ≈ $1,163/mo (> current $630)', pv && Math.round(pv.requiredPmt) >= 1150 && Math.round(pv.requiredPmt) <= 1180);
  need("§17.1 display clamps to 'January 2032 (maturity)'", api.pay(acc) === 'January 2032 (maturity)');

  // (b) SOURCED-OR-BLANK bite: pull maturity → 16.1 silent; set Variable → 16.5 silent.
  const noMat = api.b({ ...acc, maturityDate: '' });
  need('(b) bite: no maturity → 16.1 goes SILENT', !noMat.some(x => /the contract matures/.test(x)) && noMat.length === beats.length - 1);
  const variable = api.b({ ...acc, rateType: 'Variable' });
  need('(b) bite: Variable rate → 16.5 goes SILENT', !variable.some(x => /locked a fixed rate/.test(x)));
  const drawPhase = api.b({ ...acc, helocPhase: 'Draw' });
  need('(b) bite: Draw phase → 16.6 (repayment-lens) goes SILENT', !drawPhase.some(x => /really a paydown figure/.test(x)));

  // intel renderer wraps beats in the distinct sub-block.
  const html = api.intel(acc);
  need('_diIntelligence emits the marked sub-block', /What this means for you/.test(html) && /▸/.test(html));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§16/§17 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
