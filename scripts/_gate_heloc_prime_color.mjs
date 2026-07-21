/* DEV-ONLY red-first FUNCTIONAL gate — §20 FRED LIVE-RATE COLOR (Prime at the rate field + implied-margin
   clause). Injects a live Prime (6.75% as of 2026-07-16) into the extracted engine and asserts:
     (A) §20.2 sub-line renders verbatim ("Today: Prime ~6.75% (as of Jul 16, 2026, source FRED)");
     (A) §20.3 implied-margin beat renders verbatim ("Your 5.99% is about Prime -0.76 today — …");
     (L51) §18.A4 STRUCTURE clause is SUPPRESSED when the richer §20.3 live clause fires;
     (DEGRADE) live=null -> §20.2 blank, §20.3 absent, §18.A4 FIRES as the graceful fallback (L47);
     (§20.5d) never-assume-Prime — a SOFR-indexed line stays dark (SOFR not fed); Fixed line stays dark;
     (LOCK-3) the render paths never mutate acc.intRate.
   --redfirst strips the §20.3 beat + blanks the §20.2 sub-line -> live winners vanish (proves bite). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/            \/\/ §20\.3 FRED live-rate color[\s\S]*?\n            }\n/, '');
  s = s.replace(/            \/\/ §20\.4 FRED caps-context[\s\S]*?\n            }\n/, '');
  s = s.replace(/return '<div style="font-size:11px[^\n]*source FRED\)<\/div>';/, "return '';");
  s = s.replace(/var _mkt5 = _live5 \?[^\n]*the whole point of a fixed line\.' : '';/, "var _mkt5 = '';");
  s = s.replace("acc.rateType !== 'Variable' && apr > 0", "acc.rateType === 'Fixed'");   // revert #389 fix -> reproduce dark §16.5
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity','_helocDrawEndShock',
               '_debtPayoffDisplay','_helocCeilingBand','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats','_diIntelligence'];
// Build an engine context with a chosen live-rates cache injected (the var the render paths read).
function build(cacheLiteral) {
  const body = 'var _livePrimeCache = ' + cacheLiteral + ';\n' + NAMES.map(extract).join('\n') +
    '\nreturn { b:_helocIntelBeats, liveHTML:_helocLiveRateHTML, prime:_livePrime, norm:_normalizeRatesResp };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
}
// rates map keyed by index LABEL (mirrors the /api/prime response shape).
const PRIME = "{ prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME', rates: { Prime: { value: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' } } }";
const PRIME_AND_SOFR = "{ prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME', rates: { Prime: { value: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' }, SOFR: { value: 5.31, asOf: '2026-07-16', source: 'FRED:SOFR' } } }";
let live = null, blank = null, liveSofr = null, err = '';
try {
  live = build(PRIME);                 // only Prime fed (SOFR series absent)
  liveSofr = build(PRIME_AND_SOFR);    // both fed
  blank = build('null');
} catch (e) { err = e.message; }
need('engine builds with an injected live-rates cache' + (err ? ' (' + err + ')' : ''), !!live && !!blank && !!liveSofr);

if (live && blank && liveSofr) {
  const acc = { baseId: 'heloc_primary', value: 15222, intRate: 5.99, minPmt: 200, addPmt: 655,
    rateType: 'Variable', helocPhase: 'Draw', helocCreditLimit: 150000, rateIndex: 'Prime', rateMargin: 4,
    capPeriodic: 5, capLifetime: 5, maturityDate: '2030-01-12', nextPmtDate: '2026-08-01' };
  const J = (arr) => arr.join(' || ');
  const liveBeats = J(live.b(acc));

  // (A) §20.2 sub-line + §20.3 beat, verbatim, against the live 6.75%.
  need('(A) §20.2 sub-line renders "Today: Prime ~6.75% (as of Jul 16, 2026, source FRED)"',
    /Today: Prime ~6\.75% \(as of Jul 16, 2026, source FRED\)/.test(live.liveHTML('x', acc)));
  need('(A) §20.3 implied-margin beat renders verbatim (Your 5.99% is about Prime -0.76 …)',
    /Your 5\.99% is about Prime -0\.76 today — Prime sits near 6\.75% \(as of Jul 16, 2026\)\. If Prime moves, your rate moves with it\./.test(liveBeats));
  // (L51) §18.A4 structure clause is SUPPRESSED when the live clause fires.
  need('(L51) §18.A4 "Your rate is built as Prime + 4%" SUPPRESSED when §20.3 live clause fires',
    !/Your rate is built as Prime \+ 4%/.test(liveBeats) && /is about Prime -0\.76 today/.test(liveBeats));
  // (§20.4) cap-headroom clause, verbatim: ceilingRate 10.99, capHeadroom = 10.99 - 5.99 = 5 points.
  need('(§20.4) cap-headroom renders "…your 10.99% lifetime cap, there\'s about 5 points of headroom…"',
    /With Prime near 6\.75% today and your 10\.99% lifetime cap, there's about 5 points of headroom before you hit the ceiling\./.test(liveBeats));
  need('(§20.4) guard: no lifetime cap -> §20.4 clause BLANK',
    !/points of headroom before you hit the ceiling/.test(J(live.b({ ...acc, capLifetime: '' }))));

  // (§16.5) fixed-line Prime CONTEXT clause (verbatim) — background only, never a "vs market" signal.
  const fx = { ...acc, rateType: 'Fixed', helocPhase: 'Repayment' };
  need('(§16.5) Fixed line + live Prime -> context clause renders verbatim',
    /For context, Prime sits near 6\.75% today \(as of Jul 16, 2026, source FRED\)\. Your rate is locked, so it won't move with Prime either way — that's the whole point of a fixed line\./.test(J(live.b(fx))));
  need('(§16.5) Fixed line -> NO implied-margin / vs-market language (advice guard)',
    !/is about Prime/.test(J(live.b(fx))) && !/moves with it/.test(J(live.b(fx))));
  need('(§16.5) degrade: live=null -> clause absent, fixed-rate body still stands',
    !/For context, Prime sits near/.test(J(blank.b(fx))) && /You've locked a fixed rate on this line/.test(J(blank.b(fx))));
  // (§16.5 #389 BUG REPRO) — the SMOKED line had rateType UNSET (the <select> defaults to "Fixed" but stores
  // nothing until actively changed). The old `=== 'Fixed'` check went dark on undefined. Must fire on unset.
  const fxDefault = { baseId: 'heloc_primary', value: 15000, intRate: 8.99, minPmt: 250, addPmt: 20,
    helocPhase: 'Draw', helocCreditLimit: 160000, maturityDate: '2030-12-22', nextPmtDate: '2026-08-01' };
  need('(§16.5 #389) UNSET rateType (default-Fixed) + apr -> §16.5 body RENDERS',
    /You've locked a fixed rate on this line/.test(J(live.b(fxDefault))));
  need('(§16.5 #389) unset default-Fixed + live Prime -> FRED context tail present',
    /For context, Prime sits near 6\.75% today \(as of Jul 16, 2026, source FRED\)/.test(J(live.b(fxDefault))));
  need('(§16.5 guard) unset rateType + NO apr -> §16.5 SILENT (no premature lock claim)',
    !/You've locked a fixed rate on this line/.test(J(live.b({ ...fxDefault, intRate: '' }))));
  need('(§16.5 guard) Variable line -> §16.5 SILENT (inverse of §20.3)',
    !/You've locked a fixed rate on this line/.test(J(live.b({ ...fxDefault, rateType: 'Variable', rateIndex: 'Prime', rateMargin: 4, capLifetime: 5 }))));

  // (DEGRADE) live=null -> sub-line blank, §20.3 absent, §18.A4 FIRES (graceful fallback, L47).
  const blankBeats = J(blank.b(acc));
  need('(DEGRADE) live=null -> §20.2 sub-line BLANK', blank.liveHTML('x', acc) === '');
  need('(DEGRADE) live=null -> §20.3 absent AND §18.A4 fallback FIRES',
    !/is about Prime/.test(blankBeats) && /Your rate is built as Prime \+ 4%\. When Prime moves/.test(blankBeats));

  // (§20.5d) never assume Prime — a SOFR-indexed line stays DARK when only Prime is fed (SOFR series absent).
  const sofr = { ...acc, rateIndex: 'SOFR' };
  need('(§20.5d) SOFR-indexed line + only Prime fed -> §20.2 blank + §20.3 absent (SOFR not fed)',
    live.liveHTML('x', sofr) === '' && !/is about/.test(J(live.b(sofr))));
  // (SOFR) once SOFR IS fed, a SOFR line colours with the SOFR label (not Prime) — same work as Prime.
  need('(SOFR) SOFR line + SOFR fed -> §20.2 "Today: SOFR ~5.31%"',
    /Today: SOFR ~5\.31% \(as of Jul 16, 2026, source FRED\)/.test(liveSofr.liveHTML('x', sofr)));
  need('(SOFR) SOFR line + SOFR fed -> §20.3 uses SOFR label (5.99% is about SOFR +0.68)',
    /Your 5\.99% is about SOFR \+0\.68 today — SOFR sits near 5\.31% \(as of Jul 16, 2026\)\. If SOFR moves, your rate moves with it\./.test(J(liveSofr.b(sofr))) && !/about Prime/.test(J(liveSofr.b(sofr))));
  need('(SOFR) SOFR line + SOFR fed -> §20.4 uses SOFR label',
    /With SOFR near 5\.31% today and your 10\.99% lifetime cap, there's about 5 points of headroom/.test(J(liveSofr.b(sofr))));
  const noIdx = { ...acc, rateIndex: '' };
  need('(§20.5d) blank index -> §20.2 blank (never assume Prime)', live.liveHTML('x', noIdx) === '');
  const fixed = { ...acc, rateType: 'Fixed' };
  need('(§20.5d) Fixed line -> §20.2 blank (variable-only color)', live.liveHTML('x', fixed) === '');

  // (LOCK-3) the render paths never mutate the stored APR.
  const before = acc.intRate; live.liveHTML('x', acc); live.b(acc);
  need('(LOCK-3) render paths never mutate acc.intRate', acc.intRate === before && before === 5.99);

  // (RESILIENCE) _normalizeRatesResp synthesizes Prime from top-level when `rates` is absent (stale/old
  // endpoint) so the Prime colour can't regress in a deploy/cache transition; passes a real rates map through.
  const oldShape = live.norm({ prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' });
  need('(RESILIENCE) rates-less response -> Prime synthesized from top-level',
    oldShape && oldShape.rates && oldShape.rates.Prime && oldShape.rates.Prime.value === 6.75 && !oldShape.rates.SOFR);
  const newShape = live.norm({ prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME', rates: { Prime: { value: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' }, SOFR: { value: 3.59, asOf: '2026-07-17', source: 'FRED:SOFR' } } });
  need('(RESILIENCE) full rates map passes through (SOFR preserved)',
    newShape && newShape.rates.SOFR && newShape.rates.SOFR.value === 3.59);
  need('(RESILIENCE) empty / garbage -> null', live.norm(null) === null && live.norm({}) === null);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§20 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
