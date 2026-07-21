/* DEV-ONLY red-first FUNCTIONAL gate — §19.2 tax-deductibility-by-use (HELOC Copy Bank R150) + its new
   {helocUsePurpose} field. Asserts:
     (WINNER improve) purpose='Home improvement' -> the "may be tax-deductible … $750k … tax advisor" beat;
     (WINNER other)   purpose='Other' -> the "generally isn't tax-deductible … before 2018" beat;
     (SOURCED-OR-BLANK) blank purpose -> BOTH variants silent (protects form-fatigue);
     (VOICE) never states a deduction as fact — hedged "may be" / "generally isn't" / "tax advisor";
     (FIELD) the Use-of-Funds select is wired into the modal (label + updateAccField('…','helocUsePurpose',…)).
   --redfirst strips the §19.2 beat block -> both winners vanish (proves the gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/        \/\/ §19\.2 tax-deductibility-by-use[\s\S]*?\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity',
               '_debtPayoffDisplay','_helocCeilingBand','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats'];
function build() {
  const body = 'var _livePrimeCache=null;\n' + NAMES.map(extract).join('\n') + '\nreturn { b:_helocIntelBeats };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
}
let eng = null, err = '';
try { eng = build(); } catch (e) { err = e.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!eng);

if (eng) {
  const J = (arr) => arr.join(' || ');
  const base = { baseId: 'heloc_primary', value: 15000, intRate: 6.5, minPmt: 250, addPmt: 20,
    helocPhase: 'Draw', helocCreditLimit: 160000, maturityDate: '2030-12-22', nextPmtDate: '2026-08-01' };

  const improve = J(eng.b({ ...base, helocUsePurpose: 'Home improvement' }));
  const other = J(eng.b({ ...base, helocUsePurpose: 'Other' }));
  const blank = J(eng.b({ ...base }));

  need('(WINNER improve) "may be tax-deductible … $750k … tax advisor" renders verbatim',
    /Because you used this line to improve the home that secures it, the interest may be tax-deductible \(up to the combined \$750k mortgage-plus-HELOC limit\) — worth confirming with your tax advisor\./.test(improve));
  need('(WINNER other) "generally isn\'t tax-deductible … before 2018" renders verbatim',
    /Heads up: because this draw wasn't used to buy, build, or improve the home, the interest generally isn't tax-deductible — a common surprise, since HELOC interest used to be deductible regardless before 2018\./.test(other));

  need('(SOURCED-OR-BLANK) blank purpose -> BOTH variants silent',
    !/tax-deductible/.test(blank));
  need('(GUARD) improve variant does not leak the "Other" text (and vice-versa)',
    !/generally isn't tax-deductible/.test(improve) && !/may be tax-deductible/.test(other));

  need('(VOICE) improve variant is hedged (advisor-deferring, never "deduct this")',
    /may be tax-deductible/.test(improve) && /worth confirming with your tax advisor/.test(improve) && !/you can deduct/i.test(improve));

  // (FIELD) the Use-of-Funds select is wired into the modal from studio.html source.
  need('(FIELD) Use-of-Funds label + hover present in _HELOC_HOVERS',
    /'Use of Funds': \['Why it matters for taxes'/.test(s));
  need('(FIELD) select persists to helocUsePurpose via updateAccField',
    /updateAccField\('\$\{id\}', 'helocUsePurpose', this\.value\)/.test(s));
  need('(FIELD) field injected into the HELOC debt modal',
    /base\.title === 'HELOC' \? _helocUsePurposeFieldHTML\(id, acc\) : ''/.test(s));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.2 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
