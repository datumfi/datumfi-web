/* DEV-ONLY red-first FUNCTIONAL gate — §18.A5 entered-margin vs implied-margin reconciliation (HELOC Copy
   Bank R126). Injects a live Prime (6.75%) into the extracted engine and asserts:
     (WINNER) when the stored APR's implied spread disagrees with the filed margin by >= 0.10pt, the beat
              renders VERBATIM ("your line's stored rate is 8.99%. Today that works out to about 2.24% over
              Prime (6.75%), while the margin on file reads 2%. … re-check margin at the next reset.");
     (GAP GUARD) when implied spread and filed margin AGREE (<0.10pt), the beat is SILENT (no naggy echo);
     (SOURCED-OR-BLANK) live index null -> beat absent; margin unset -> beat absent;
     (COMPOSE) it fires ALONGSIDE §20.3 (the spread statement), not instead of it;
     (LOCK-3) the render path never mutates acc.intRate.
   --redfirst strips the §18.A5 block -> the winner string vanishes (proves the gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/            \/\/ §18\.A5 entered-margin vs implied-margin[\s\S]*?\n            }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity',
               '_debtPayoffDisplay','_helocCeilingBand','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats','_diIntelligence'];
function build(cacheLiteral) {
  const body = 'var _livePrimeCache = ' + cacheLiteral + ';\n' + NAMES.map(extract).join('\n') +
    '\nreturn { b:_helocIntelBeats };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
}
const PRIME = "{ prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME', rates: { Prime: { value: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' } } }";
let live = null, blank = null, err = '';
try { live = build(PRIME); blank = build('null'); } catch (e) { err = e.message; }
need('engine builds with an injected live-rates cache' + (err ? ' (' + err + ')' : ''), !!live && !!blank);

if (live && blank) {
  const J = (arr) => arr.join(' || ');
  // Disagreement case: stored apr 8.99%, filed margin 2%, live Prime 6.75% -> implied 2.24%, gap 0.24 >= 0.10.
  const acc = { baseId: 'heloc_primary', value: 15000, intRate: 8.99, minPmt: 250, addPmt: 20,
    rateType: 'Variable', helocPhase: 'Draw', helocCreditLimit: 160000, rateIndex: 'Prime', rateMargin: 2,
    capPeriodic: 2, capLifetime: 5, maturityDate: '2030-12-22', nextPmtDate: '2026-08-01' };
  const beats = J(live.b(acc));

  need('(WINNER) §18.A5 renders verbatim on a >=0.10pt disagreement',
    /One note on the math: your line's stored rate is 8\.99%\. Today that works out to about 2\.24% over Prime \(6\.75%\), while the margin on file reads 2%\. Small gaps are normal — stored rates lag the index between resets — so we show your actual 8\.99% as the source of truth here, and re-check margin at the next reset\./.test(beats));

  // (COMPOSE) §20.3 spread statement ALSO fires — A5 reconciles, it does not replace.
  need('(COMPOSE) §18.A5 fires ALONGSIDE §20.3 (both present, not either/or)',
    /is about Prime \+2\.24 today/.test(beats) && /re-check margin at the next reset/.test(beats));

  // (GAP GUARD) implied spread ~ filed margin (gap < 0.10) -> SILENT. apr 8.75, margin 2, Prime 6.75 -> implied 2.00.
  const agree = { ...acc, intRate: 8.75, rateMargin: 2 };
  need('(GAP GUARD) implied spread == filed margin (<0.10pt) -> §18.A5 SILENT',
    !/re-check margin at the next reset/.test(J(live.b(agree))));

  // (SOURCED-OR-BLANK) no live index -> beat absent.
  need('(SOURCED-OR-BLANK) live index null -> §18.A5 absent',
    !/re-check margin at the next reset/.test(J(blank.b(acc))));
  // (SOURCED-OR-BLANK) margin unset -> beat absent (can't reconcile against a missing margin).
  need('(SOURCED-OR-BLANK) filed margin unset -> §18.A5 absent',
    !/re-check margin at the next reset/.test(J(live.b({ ...acc, rateMargin: '' }))));
  // (§20.5d inheritance) Fixed line -> whole variable block silent, so §18.A5 silent.
  need('(GUARD) Fixed line -> §18.A5 SILENT (variable-only)',
    !/re-check margin at the next reset/.test(J(live.b({ ...acc, rateType: 'Fixed' }))));

  // (LOCK-3) render path never mutates the stored APR.
  const before = acc.intRate; live.b(acc);
  need('(LOCK-3) render path never mutates acc.intRate', acc.intRate === before && before === 8.99);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.A5 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
