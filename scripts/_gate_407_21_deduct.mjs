/* DEV-ONLY red-first gate — #407 §21 mortgage-interest deductibility (Captain GO, Architect #439).
   Bank rows 223–228. THE LIABILITY BEAT: over-precision here is a real risk, so the gate tests the HEDGES and
   the SILENCE as hard as it tests the presence.

   §21.4's four-state gate, verbatim from the bank:
     nothing sourced              -> §21 FULLY SILENT (no beat, and no nudge-to-figure)
     posture sourced, no dollar   -> §21.1 + §21.2
     itemize + dollar sourced     -> §21.1 + §21.2 + §21.3
     standard + dollar sourced    -> §21.1 + §21.2 (the "doesn't change your tax" truth, never §21.3)

   --redfirst runs SIX mutations, all anchored on guards or signatures, never on copy text. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const RED = process.argv.includes('--redfirst');
const src = studioSource();

const A_GATE  = 'if (!itemizes && paidYr <= 0) return beats;';
const A_S212  = 'if (itemizes) {';
const A_S213  = "if (itemizes === 'Itemize' && paidYr > 0) {";
const A_SIG   = 'function _moatDeductBeats(acc) {';
const A_PLUG  = "(base && base.title === 'Mortgage') ? _moatIntelBeats(acc) : []";
const A_PAID  = "var paidYr = parseFloat(acc.mortgageInterestPaidYr) || 0;";
for (const [n, a] of [['gate', A_GATE], ['21.2', A_S212], ['21.3', A_S213], ['sig', A_SIG], ['plug', A_PLUG], ['paid', A_PAID]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_GATE, 'if (false) return beats;'),                                   // speaks with nothing sourced
  b: (b) => b.replace(A_S212, 'if (true) {'),                                                // crossover guesses the posture
  c: (b) => b.replace(A_S213, 'if (paidYr > 0) {'),                                          // affirms for a standard-deduction filer
  d: (b) => b.replace(A_SIG, A_SIG + ' return [];'),                                         // §21 never speaks
  e: (b) => b.replace(A_PLUG, '[]'),                                                         // beats never reach the renderer
  f: (b) => b.replace(A_PAID, 'var paidYr = parseFloat(acc.interestPaidToDate) || 0;')        // WRONG field: since-inception, not last year
};

const deps = { getBaseType: (id) => ({ id: String(id), title: String(id).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' }) };
function build(mut) {
  let body = extractClosure(src, ['_diIntelligence', '_moatDeductBeats'], { exclude: Object.keys(deps) });
  if (mut) { const after = mut(body); if (after === body) throw new Error('mutation did not apply'); body = after; }
  return new Function(...Object.keys(deps), body + '\nreturn { intel:_diIntelligence, beats:_moatDeductBeats };')(...Object.values(deps));
}

const B211 = 'Mortgage interest may be deductible — but only the part of it that, together with your other itemized deductions, rises above the standard deduction.';
// VERBATIM against bank C225. Unlike the §20.2 family, rows 224–226 carry ONLY em-dashes (U+2014) — their
// apostrophes are straight ASCII, so the wired strings use straight ones and this constant must match.
const B212 = "Most homeowners take the standard deduction, in which case mortgage interest doesn't lower their taxes at all.";
const B213 = 'Because you itemize, the interest on this mortgage — about';
const HEDGES = ['may be', 'depends on', 'worth confirming with your tax advisor', 'can confirm the exact figure'];

const M = { id: 'm', baseId: 'mortgage_joint', value: '300000', origAmount: '400000', intRate: 6, minPmt: '2500',
            interestPaidToDate: '31684.35' };   // present throughout — §21 must NEVER read this one
const F = {
  blank:     { ...M },
  postureIt: { ...M, mortgageItemizes: 'Itemize' },
  postureSt: { ...M, mortgageItemizes: 'Standard' },
  full:      { ...M, mortgageItemizes: 'Itemize', mortgageInterestPaidYr: '9800' },
  stdFull:   { ...M, mortgageItemizes: 'Standard', mortgageInterestPaidYr: '9800' },
  dollarOnly:{ ...M, mortgageInterestPaidYr: '9800' },
  heloc:     { ...M, baseId: 'heloc_primary', mortgageItemizes: 'Itemize', mortgageInterestPaidYr: '9800' }
};

function run(api) {
  const c = []; const need = (l, v) => c.push([l, !!v]);
  const T = (k) => api.intel(F[k]);

  // ── §21.4 four-state gate ──
  need('nothing sourced → §21 FULLY SILENT', T('blank') === '');
  need('nothing sourced → no nudge-to-figure either (form fatigue, L47)',
    !/1098|tax advisor|deductib/i.test(T('blank')));
  need('posture sourced, no dollar → §21.1 + §21.2, NOT §21.3',
    T('postureIt').includes(B211) && T('postureIt').includes(B212) && !T('postureIt').includes(B213));
  need('itemize + dollar → all three beats', T('full').includes(B211) && T('full').includes(B212) && T('full').includes(B213));
  need('STANDARD + dollar → §21.1 + §21.2 only, NEVER the affirming line',
    T('stdFull').includes(B211) && T('stdFull').includes(B212) && !T('stdFull').includes(B213));
  need('dollar only, posture blank → §21.1 speaks, §21.2 stays silent (posture not guessed)',
    T('dollarOnly').includes(B211) && !T('dollarOnly').includes(B212));

  // ── the figure ──
  need('§21.3 renders the SOURCED last-year figure ($9,800)', T('full').includes('about $9,800 last year'));
  need('§21.3 never reads interestPaidToDate (since-inception, a different figure)',
    !T('full').includes('31,684'));
  need('§21.3 states benefit as a RATE, never a dollar of tax saved',
    T('full').includes('that interest times your tax rate, not the full amount') && !/saves you \$/.test(T('full')));

  // ── the liability voice ──
  need('every hedge present (may be / depends on / advisor)', HEDGES.every(h => T('full').includes(h)));
  need('never instructs: no "deduct this" / "you should itemize"',
    !/deduct this|you should itemize|we recommend|you must/i.test(T('full')));
  need('SALT named as a phrase, never a hard-coded cap number',
    T('full').includes('state and local taxes (capped)') && !/\$10,000|\$40,000/.test(T('full')));

  // ── scope + renderer ──
  need('HELOC does NOT get the mortgage beat (different tax question)', !T('heloc').includes(B211));
  need('beats reach the RENDERED §16.7 block (#380)',
    T('full').includes('What this means for you') && T('full').includes('▸'));
  need('renderer stays empty-safe when §21 is silent (no bare chrome)', T('blank').indexOf('What this means') === -1);
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) {
    let c;
    try { c = run(build(MUT[k])); }
    catch (e) { console.log('— mutation (' + k + ') —\n⛔ threw: ' + e.message); total++; continue; }
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all six mutations bit');
  process.exit(0);
}

report('', run(build(null)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
