/* DEV-ONLY red-first FUNCTIONAL gate — §18.A VARIABLE-RATE ACKNOWLEDGMENT beats + reset-date de-dup.
   Runs the pure engine against the Copy Bank's VERIFIED test #2 (a VARIABLE line):
     Balance 15,222 · Limit 150,000 · APR 5.99% · Variable · Index Prime · Margin 4% ·
     Periodic Cap 5% · Lifetime Cap 5% · Draw phase · maturity 2030-01 · min 200 · add 655.
   Asserts:
     (A) the four §18.A beats fire on the variable inputs and carry their winner strings;
     (B) sourced-or-blank BITE — Fixed → all four silent; no caps → A3 silent; no index/margin →
         A4 silent AND A2 drops the 're-prices to' clause; reset in the PAST → A2 silent;
     (C) reset-date DE-DUP — the §1.5 summary clause (_cellarDI) no longer emits 'Your next reset is …
         worth watching' (L51 richest-hover-wins: the §18.A2 layer owns the date).
   --redfirst strips the §18.A block AND restores the old summary reset clause → asserts fail (proves bite). */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  // strip the whole §18.A beats block back out of _helocIntelBeats
  s = s.replace(/        \/\/ ── §18\.A VARIABLE-RATE ACKNOWLEDGMENT BEATS[\s\S]*?\n        return beats;/, '        return beats;');
  // put the OLD reset clause back into the §1.5 summary so the de-dup assertion fails
  s = s.replace(
    "            parts.push('This rate is variable — tied to an index, so your payment can rise if rates do.');",
    "            parts.push('This rate is variable — tied to an index, so your payment can rise if rates do. Your next reset is Month Year — worth watching.');");
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// (C) de-dup — the summary must NOT carry the reset-date sentence anymore.
const cellarSrc = (s.match(/    function _cellarDI\(acc\)[\s\S]*?\n    }\n/) || [''])[0];
need('(C) de-dup: §1.5 summary drops the reset-date sentence', cellarSrc && !/Your next reset is/.test(cellarSrc) && !/worth watching/.test(cellarSrc));
need('(C) de-dup: §1.5 summary keeps the plain variable-rate fact', /This rate is variable — tied to an index, so your payment can rise if rates do\./.test(cellarSrc));

// Extract + evaluate the engine (same harness as _gate_heloc_di_intelligence.mjs).
// ROOTS, not a hand-list. The hand-listed NAMES array rotted the moment _helocIntelBeats gained
// _helocInterestOnlyDraw (§22 draw-period work): every gate slicing it died with
// "ReferenceError: _helocInterestOnlyDraw is not defined" — a red that says nothing about the room.
// extractClosure walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_helocIntelBeats'];
let api = null, extractErr = '';
try {
  const body = extractClosure(s, ROOTS) + '\nreturn {b:_helocIntelBeats};';
  api = new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
} catch (e) { extractErr = e.message; }
need('engine functions extracted + evaluate' + (extractErr ? ' (' + extractErr + ')' : ''), !!api);

if (api) {
  // reset date kept dynamically-future so A2 fires regardless of when the gate runs.
  const futureReset = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);
  const pastReset   = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const acc = { baseId: 'heloc_primary', value: 15222, intRate: 5.99, minPmt: 200, addPmt: 655,
    rateType: 'Variable', helocPhase: 'Draw', helocCreditLimit: 150000, origAmount: 150000,
    rateIndex: 'Prime', rateMargin: 4, capPeriodic: 5, capLifetime: 5, rateResetDate: futureReset,
    maturityDate: '2030-01-12', nextPmtDate: '2026-08-01' };

  const J = (arr) => arr.join(' || ');
  const full = J(api.b(acc));
  need('(A) 18.A1 flat-rate honesty fires (assumes today\'s 5.99% holds)',
    /assume today's 5\.99% holds the whole way/.test(full) && /a snapshot, not a lock/.test(full));
  need('(A) 18.A2 reset-is-coming fires (owns the date + re-prices to Prime + 4%)',
    /Your rate can next adjust on /.test(full) && /re-prices to Prime \+ 4%/.test(full) && /re-check the math when that date arrives/.test(full));
  need('(A) 18.A3 caps-in-plain-words fires (5% per reset, 5% lifetime)',
    /the rate can move at most 5% at any single reset, and no more than 5% above where it started/.test(full) && /can't run away without limit/.test(full));
  need('(A) 18.A4 index+margin transparency fires (Prime + 4%)',
    /Your rate is built as Prime \+ 4%\. When Prime moves/.test(full));

  // (B) BITE — Fixed suppresses ALL four §18.A beats.
  const fixed = J(api.b({ ...acc, rateType: 'Fixed' }));
  need('(B) bite: Fixed → all four §18.A beats SILENT',
    !/holds the whole way/.test(fixed) && !/next adjust on/.test(fixed) && !/Your line has guardrails/.test(fixed) && !/Your rate is built as/.test(fixed));
  // (B) no caps → A3 silent (A4 still fires).
  const noCaps = J(api.b({ ...acc, capPeriodic: '', capLifetime: '' }));
  need('(B) bite: no caps → 18.A3 SILENT, 18.A4 still fires',
    !/Your line has guardrails/.test(noCaps) && /Your rate is built as Prime \+ 4%/.test(noCaps));
  // (B) no index/margin → A4 silent AND A2 drops the re-prices clause (keeps the date sentence).
  const noIdx = J(api.b({ ...acc, rateIndex: '', rateMargin: '' }));
  need('(B) bite: no index/margin → 18.A4 SILENT + 18.A2 drops re-prices clause but keeps the date',
    !/Your rate is built as/.test(noIdx) && !/re-prices to/.test(noIdx) && /Your rate can next adjust on /.test(noIdx));
  // (B) reset in the PAST → A2 silent.
  const pastR = J(api.b({ ...acc, rateResetDate: pastReset }));
  need('(B) bite: reset date in the past → 18.A2 SILENT',
    !/Your rate can next adjust on /.test(pastR));
  // (#390) reset AFTER maturity → A2 silent (the reset can never happen; the line closes at maturity).
  const resetPastMat = J(api.b({ ...acc, rateResetDate: '2035-01-01', maturityDate: '2030-01-12' }));
  need('(#390) reset AFTER maturity → 18.A2 SILENT (line closes at maturity)',
    !/Your rate can next adjust on /.test(resetPastMat));
  // only-one-cap variant.
  const oneCap = J(api.b({ ...acc, capPeriodic: 5, capLifetime: '' }));
  need('(B) one cap only → 18.A3 renders just the periodic cap',
    /the rate can move at most 5% at any single reset\. That caps/.test(oneCap));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.A code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
