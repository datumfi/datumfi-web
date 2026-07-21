/* DEV-ONLY red-first FUNCTIONAL gate — §19.4 HELOC-as-retirement-buffer (HELOC Copy Bank R158). Two variants,
   mutually exclusive. Asserts:
     (WINNER A) little-drawn + strong home equity (>=50% of a linked $800k property) -> the "standby buffer …
                costs nothing until you use it" reframe; and NOT the carrying-a-balance variant;
     (WINNER B) a carried balance + payment (no strong-equity buffer case) -> "Carrying this payment into
                retirement adds about $400/mo … worth weighing alongside its flexibility." (min250+add150);
     (MUTEX) the strong-equity light-draw case fires A, never B;
     (SOURCED-OR-BLANK) zero balance + no linked equity -> BOTH silent;
     (VOICE) A names a use / weighs a cost — never instructs (no "you should" / "instead of selling" as a command).
   --redfirst strips the §19.4 block -> both winners vanish (proves the gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/        \/\/ §19\.4 HELOC-as-retirement-buffer[\s\S]*?\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity','_helocDrawEndShock',
               '_debtPayoffDisplay','_helocCeilingBand','_groundsLinkedDebt','_num','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats'];
// getBaseType resolves property vs HELOC by baseId so the linked-equity path works.
const getBaseType = (baseId) => String(baseId).indexOf('property') === 0
  ? { id: baseId, title: 'Real Estate' } : { id: 'heloc_primary', title: 'HELOC' };
function build(accounts) {
  const body = 'var _livePrimeCache=null;\n' + NAMES.map(extract).join('\n') + '\nreturn { b:_helocIntelBeats };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
const J = (arr) => arr.join(' || ');
const A = /With little drawn and strong equity behind it, this line can also serve as a standby buffer in retirement — a source to lean on during a market downturn rather than selling investments while they're down\. It costs nothing until you use it\./;
const B = /Carrying this payment into retirement adds about \$400\/mo to the income your plan must cover for life — worth weighing alongside its flexibility\./;

// Scenario 1: little-drawn (bal 0) + strong equity ($800k home, no other liens) -> Variant A.
const heloc0 = { id: 'h1', baseId: 'heloc_primary', value: 0, intRate: 6.5, minPmt: 0, addPmt: 0,
  helocPhase: 'Draw', helocCreditLimit: 150000, linkedAssetId: 'prop1' };
const prop = { id: 'prop1', baseId: 'property_primary', value: 800000, linkedAssetId: null };
let e1 = null, err = '';
try { e1 = build([prop, heloc0]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e1);

if (e1) {
  const bufBeats = J(e1.b(heloc0));
  need('(WINNER A) little-drawn + strong equity -> standby-buffer reframe renders verbatim', A.test(bufBeats));
  need('(MUTEX) buffer case does NOT also emit the carrying-a-balance variant', !/Carrying this payment into retirement/.test(bufBeats));

  // Scenario 2: carried balance + payment, no linked equity -> Variant B ($400 = min250+add150).
  const helocB = { id: 'h2', baseId: 'heloc_primary', value: 40000, intRate: 7, minPmt: 250, addPmt: 150,
    helocPhase: 'Repayment', helocCreditLimit: 150000, linkedAssetId: null };
  const eB = build([helocB]);
  const bBeats = J(eB.b(helocB));
  need('(WINNER B) carried balance + payment -> "Carrying this payment … about $400/mo …" verbatim', B.test(bBeats));
  need('(MUTEX) carrying-a-balance case does NOT emit the standby-buffer variant', !A.test(bBeats));

  // Scenario 3: zero balance, no linked equity -> BOTH silent (sourced-or-blank).
  const helocSilent = { id: 'h3', baseId: 'heloc_primary', value: 0, intRate: 6, minPmt: 0, addPmt: 0,
    helocPhase: 'Draw', helocCreditLimit: 150000, linkedAssetId: null };
  const eS = build([helocSilent]);
  const sBeats = J(eS.b(helocSilent));
  need('(SOURCED-OR-BLANK) zero balance + no equity -> BOTH §19.4 variants silent',
    !A.test(sBeats) && !/Carrying this payment into retirement/.test(sBeats));

  // Scenario 4: small balance (util < 25%) + strong equity -> still Variant A ("little drawn").
  const helocSmall = { ...heloc0, value: 10000, minPmt: 100, addPmt: 0 };
  need('(VARIANT A) small draw (util<25%) + strong equity -> buffer variant (not carrying-balance)',
    A.test(J(build([prop, helocSmall]).b(helocSmall))));

  // Scenario 5: weak equity ($700k liens on $800k home = 12.5% equity) + carried balance -> Variant B, not A.
  const bigMtg = { id: 'm1', baseId: 'mortgage_primary', value: 700000, linkedAssetId: 'prop1' };
  const helocWeak = { ...heloc0, value: 40000, minPmt: 250, addPmt: 150 };
  const eW = build([prop, bigMtg, helocWeak]);
  need('(VARIANT B) weak equity (liens ~88% of value) + carried balance -> income-floor, not buffer',
    B.test(J(eW.b(helocWeak))) && !A.test(J(eW.b(helocWeak))));

  need('(VOICE) buffer variant never issues a command (no "you should")', !/you should/i.test(bufBeats));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.4 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
