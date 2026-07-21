/* DEV-ONLY red-first FUNCTIONAL gate — §19.3 draw-period-end payment shock (HELOC Copy Bank R154) + its new
   {drawPeriodEndDate} field. Test case: $80,000 @ 7.5%, draw ends Jan 2028, maturity Jan 2038 (120mo repay)
   -> interest-only ~$500/mo, repayment minimum ~$950/mo. Asserts:
     (WINNER) the beat renders VERBATIM with both figures and the "sharper that jump" tail;
     (MATH) the repayment minimum EXCEEDS the interest-only run-rate (the jump is real, not cosmetic);
     (PHASE GUARD) Repayment phase -> silent (already past the jump);
     (SOURCED-OR-BLANK) blank draw-end -> silent; draw-end AT/AFTER maturity -> silent (no runway);
     (FIELD) the Draw-Period-Ends date input is wired (label + updateAccField('…','drawPeriodEndDate',…)).
   --redfirst strips the §19.3 beat block -> the winner vanishes (proves the gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/        \/\/ §19\.3 draw-period-end payment shock[\s\S]*?\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity','_helocDrawEndShock',
               '_debtPayoffDisplay','_helocCeilingBand','_groundsLinkedDebt','_num','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats'];
function build() {
  const body = 'var _livePrimeCache=null;\n' + NAMES.map(extract).join('\n') + '\nreturn { b:_helocIntelBeats, shock:_helocDrawEndShock };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
}
let eng = null, err = '';
try { eng = build(); } catch (e) { err = e.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!eng);

if (eng) {
  const J = (arr) => arr.join(' || ');
  const acc = { baseId: 'heloc_primary', value: 80000, intRate: 7.5, minPmt: 500, addPmt: 0,
    helocPhase: 'Draw', helocCreditLimit: 150000, drawPeriodEndDate: '2028-01-15', maturityDate: '2038-01-15',
    nextPmtDate: '2026-08-01' };
  const beats = J(eng.b(acc));

  need('(WINNER) §19.3 renders verbatim ("~$500/mo … January 2028 … ~$950/mo … sharper that jump")',
    /You're paying interest-only right now — about \$500\/mo\. When your draw period ends around January 2028, this balance starts amortizing over the shorter remaining term, and your minimum could rise to about \$950\/mo\. The longer you pay interest-only, the sharper that jump\./.test(beats));

  const sh = eng.shock(acc);
  need('(MATH) repayment minimum EXCEEDS interest-only run-rate (real jump)',
    sh && sh.repayMin > sh.monthlyInterest && Math.round(sh.monthlyInterest) === 500 && Math.round(sh.repayMin) === 950);

  need('(PHASE GUARD) Repayment phase -> §19.3 SILENT',
    !/sharper that jump/.test(J(eng.b({ ...acc, helocPhase: 'Repayment' }))));
  need('(SOURCED-OR-BLANK) blank draw-end date -> SILENT',
    !/sharper that jump/.test(J(eng.b({ ...acc, drawPeriodEndDate: '' }))));
  need('(SOURCED-OR-BLANK) draw-end AT/AFTER maturity -> SILENT (no repayment runway)',
    !/sharper that jump/.test(J(eng.b({ ...acc, drawPeriodEndDate: '2038-06-15' }))) && eng.shock({ ...acc, drawPeriodEndDate: '2038-06-15' }) === null);
  need('(SOURCED-OR-BLANK) no maturity -> SILENT',
    !/sharper that jump/.test(J(eng.b({ ...acc, maturityDate: '' }))));

  // (FIELD) wired into the modal from studio.html source.
  need('(FIELD) Draw-Period-Ends label + hover present in _HELOC_HOVERS',
    /'Draw Period Ends': \['When interest-only stops'/.test(s));
  need('(FIELD) date input persists to drawPeriodEndDate via updateAccField',
    /updateAccField\('\$\{id\}', 'drawPeriodEndDate', this\.value\)/.test(s));
  need('(FIELD) field injected into the HELOC debt modal',
    /base\.title === 'HELOC' \? _helocDrawEndFieldHTML\(id, acc\) : ''/.test(s));

  // (LOCK-3) shock reader never mutates the balance/apr.
  const bv = acc.value, av = acc.intRate; eng.b(acc); eng.shock(acc);
  need('(LOCK-3) reader never mutates acc', acc.value === bv && acc.intRate === av);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.3 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
