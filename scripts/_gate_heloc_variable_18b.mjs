/* DEV-ONLY red-first FUNCTIONAL gate — §18.B CAP-BOUNDED WORST-CASE BAND (the ENGINE, not the final copy).
   Proves the ceiling projection reuses the verified amortization (L48, acc-clone, NO fork) and that the
   §18.B beat surfaces it. Ground truth = Copy Bank test #2 (Variable · APR 5.99% · lifetime cap 5% · $855/mo):
     BASE @5.99% -> March 2028 / interest $760  (ties to the live display R114)
     CEIL @10.99% -> April 2028 / interest ~$1,472  (base + 5% lifetime cap, payment held)
   Asserts:
     (A) _helocCeilingBand computes the ceiling payoff/interest and the §18.B beat renders the band;
     (B) LOCK-3 display-only — the clone never mutates acc.intRate (base figures untouched);
     (C) NEGAM — if the held payment can't cover interest at the ceiling, the beat WARNS 'balance would grow';
     (D) maturity guard — if the ceiling pace overshoots maturity while the base clears, the beat says so;
     (E) sourced-or-blank BITE — no lifetime cap -> band null; Fixed -> band null.
   --redfirst strips _helocCeilingBand + the §18.B beat block -> band/beat vanish (proves bite). */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/    function _helocCeilingBand\(acc\)[\s\S]*?\n    }\n/, '');
  s = s.replace(/            \/\/ 18\.B cap-bounded worst-case band[\s\S]*?\n            }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ROOTS, not a hand-list. The hand-listed NAMES array rotted the moment _helocIntelBeats gained
// _helocInterestOnlyDraw (§22 draw-period work): every gate slicing it died with
// "ReferenceError: _helocInterestOnlyDraw is not defined" — a red that says nothing about the room.
// extractClosure walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_helocCeilingBand', '_helocIntelBeats'];
let api = null, extractErr = '';
try {
  const body = extractClosure(s, ROOTS) + '\nreturn {band:(typeof _helocCeilingBand===\'function\'?_helocCeilingBand:null), b:_helocIntelBeats};';
  api = new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
} catch (e) { extractErr = e.message; }
need('engine functions extracted + evaluate' + (extractErr ? ' (' + extractErr + ')' : ''), !!api);

if (api) {
  const acc = { baseId: 'heloc_primary', value: 15222, intRate: 5.99, minPmt: 200, addPmt: 655,
    rateType: 'Variable', helocPhase: 'Draw', helocCreditLimit: 150000, capLifetime: 5,
    maturityDate: '2030-01-12', nextPmtDate: '2026-08-01' };
  const J = (arr) => arr.join(' || ');

  // In --redfirst the function is stripped -> api.band is null (that itself proves the bite).
  const band = api.band ? api.band(acc) : null;
  need('(A) _helocCeilingBand computes ceiling @10.99% -> April 2028',
    band && band.code === 'OK' && band.ceilRate === 10.99 && band.basePayoff === 'March 2028' && band.ceilPayoff === 'April 2028');
  need('(A) ceiling interest ~ $1,472 (base 5% lifetime cap, payment held)',
    band && band.code === 'OK' && Math.round(band.ceilInterest) >= 1450 && Math.round(band.ceilInterest) <= 1500);
  const full = J(api.b(acc));
  need('(A) §18.B beat renders the FINAL band sentence (base $760 -> ceiling Apr 2028 $1,472, delta $712)',
    /on track to be paid off around March 2028 with about \$760 in interest/.test(full) &&
    /climbing to its 10\.99% ceiling and staying there/.test(full) &&
    /stretches to April 2028 and about \$1,472/.test(full) &&
    /\$712 is the most this rate can add/.test(full));

  // (B) LOCK-3 — the clone must not mutate the caller's acc.
  const before = acc.intRate;
  if (api.band) api.band(acc);
  need('(B) LOCK-3 display-only: acc.intRate untouched by the clone', acc.intRate === before && before === 5.99);

  // (C) NEGAM — base (5%) covers interest so the band computes, but the ceiling (5+8=13%) does not:
  // 100k @5% needs ~$417/mo interest ($600 amortizes); @13% needs ~$1,083/mo ($600 cannot cover).
  const neg = { ...acc, value: 100000, intRate: 5, capLifetime: 8, addPmt: 0, minPmt: 600, maturityDate: '' };
  const negBand = api.band ? api.band(neg) : null;
  need('(C) NEGAM: ceiling payment cannot cover interest -> code NEGAM', negBand && negBand.code === 'NEGAM');
  need('(C) NEGAM beat WARNS the balance would grow',
    /wouldn't cover the interest — the balance would grow/.test(J(api.b(neg))));

  // (D) maturity guard — base clears, ceiling overshoots a near maturity (between base & ceiling payoff).
  const nearMat = { ...acc, maturityDate: '2028-03-15' };   // base Mar-2028 <= mat < ceil Apr-2028
  const nmBand = api.band ? api.band(nearMat) : null;
  need('(D) maturity guard: base clears but ceiling overshoots -> exceedsMaturity',
    nmBand && nmBand.code === 'OK' && nmBand.exceedsMaturity === true);
  need('(D) maturity-exceed beat says the ceiling pace misses maturity',
    /no longer clears the balance by maturity/.test(J(api.b(nearMat))));

  // (E) BITE — no lifetime cap, and Fixed, both suppress the band.
  const noCap = { ...acc, capLifetime: '' };
  need('(E) bite: no lifetime cap -> band null + §18.B beat SILENT',
    (api.band ? api.band(noCap) : null) === null && !/is the most this rate can add/.test(J(api.b(noCap))));
  const fixed = { ...acc, rateType: 'Fixed' };
  need('(E) bite: Fixed -> band null + §18.B beat SILENT',
    (api.band ? api.band(fixed) : null) === null && !/is the most this rate can add/.test(J(api.b(fixed))));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.B code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
