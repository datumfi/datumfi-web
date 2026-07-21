/* DEV-ONLY red-first FUNCTIONAL gate — §19.4 HELOC-as-retirement-buffer (HELOC Copy Bank R158). Two variants,
   mutually exclusive; Variant B additionally gated to the retirement horizon (Captain ruling 2026-07-21).
   Asserts:
     (WINNER A) little-drawn + strong home equity (>=50% of a linked $800k property) -> the "standby buffer …
                costs nothing until you use it" reframe; NOT age-gated; and NOT the carrying-a-balance variant;
     (WINNER B) carried balance + payment + NEAR RETIREMENT (currentAge>=retireAge-5) -> "Carrying this payment
                into retirement adds about $400/mo … worth weighing alongside its flexibility." (min250+add150);
     (AGE GATE) same carried-balance acc but a YOUNG Architect (35, retire 65) -> Variant B SILENT;
     (P8.1 / SOURCED-OR-BLANK) blank profile (no DOB/retirement) -> Variant B SILENT (never a default age);
     (MUTEX) the strong-equity light-draw case fires A, never B; zero-balance no-equity -> both silent;
     (VOICE) A names a use / weighs a cost — never a command.
   --redfirst strips the §19.4 block -> both winners vanish (proves the gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  // Strip the whole §19.4 block (its internal _nearRet if/else has nested braces, so anchor the END on the
  // Variant B push line rather than the first "\n        }\n").
  s = s.replace(/        \/\/ §19\.4 HELOC-as-retirement-buffer[\s\S]*?worth weighing alongside its flexibility\.'\);\n        }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest',
               'acceleratedDelta','_helocLimit','_helocUtilPct','_helocHeadroom','_payoffVsMaturity','_helocDrawEndShock',
               '_debtPayoffDisplay','_helocCeilingBand','_groundsLinkedDebt','_num','_normalizeRatesResp','_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML',
               '_helocIntelBeats'];
const getBaseType = (baseId) => String(baseId).indexOf('property') === 0
  ? { id: baseId, title: 'Real Estate' } : { id: 'heloc_primary', title: 'HELOC' };
// ageOverride: a JS-literal string injected as _helocAgeOverride (mirrors the _livePrimeCache injection). null
// => horizon unknown (the production DOM path is inert under node, so B stays silent unless we inject an age).
function build(accounts, ageOverride) {
  const body = 'var _livePrimeCache=null;\nvar _helocAgeOverride=' + (ageOverride || 'null') + ';\n' +
    NAMES.map(extract).join('\n') + '\nreturn { b:_helocIntelBeats };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
const J = (arr) => arr.join(' || ');
const NEAR = '{ currentAge: 62, retireAge: 65 }';   // 62 >= 65-5 -> near retirement
const YOUNG = '{ currentAge: 35, retireAge: 65 }';   // 35 <  65-5 -> not near
const A = /With little drawn and strong equity behind it, this line can also serve as a standby buffer in retirement — a source to lean on during a market downturn rather than selling investments while they're down\. It costs nothing until you use it\./;
const B = /Carrying this payment into retirement adds about \$400\/mo to the income your plan must cover for life — worth weighing alongside its flexibility\./;

const heloc0 = { id: 'h1', baseId: 'heloc_primary', value: 0, intRate: 6.5, minPmt: 0, addPmt: 0,
  helocPhase: 'Draw', helocCreditLimit: 150000, linkedAssetId: 'prop1' };
const prop = { id: 'prop1', baseId: 'property_primary', value: 800000, linkedAssetId: null };
let e1 = null, err = '';
try { e1 = build([prop, heloc0]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e1);

if (e1) {
  // Variant A — not age-gated.
  const bufBeats = J(e1.b(heloc0));
  need('(WINNER A) little-drawn + strong equity -> standby-buffer reframe (age-independent)', A.test(bufBeats));
  need('(MUTEX) buffer case does NOT also emit the carrying-a-balance variant', !/Carrying this payment into retirement/.test(bufBeats));

  // Variant B — carried balance, no equity. Fires only when NEAR retirement.
  const helocB = { id: 'h2', baseId: 'heloc_primary', value: 40000, intRate: 7, minPmt: 250, addPmt: 150,
    helocPhase: 'Repayment', helocCreditLimit: 150000, linkedAssetId: null };
  need('(WINNER B) carried balance + payment + NEAR retirement -> income-floor variant verbatim ($400/mo)',
    B.test(J(build([helocB], NEAR).b(helocB))));
  need('(AGE GATE) same carried balance but YOUNG Architect (35, retire 65) -> Variant B SILENT',
    !B.test(J(build([helocB], YOUNG).b(helocB))));
  need('(P8.1) blank profile (no DOB/retirement injected) -> Variant B SILENT (never a default age)',
    !B.test(J(build([helocB]).b(helocB))));

  // Zero balance + no equity -> both silent regardless of age.
  const helocSilent = { id: 'h3', baseId: 'heloc_primary', value: 0, intRate: 6, minPmt: 0, addPmt: 0,
    helocPhase: 'Draw', helocCreditLimit: 150000, linkedAssetId: null };
  need('(SOURCED-OR-BLANK) zero balance + no equity -> BOTH variants silent (even near retirement)',
    !A.test(J(build([helocSilent], NEAR).b(helocSilent))) && !B.test(J(build([helocSilent], NEAR).b(helocSilent))));

  // Small draw (util<25%) + strong equity -> Variant A ("little drawn"), age-independent.
  const helocSmall = { ...heloc0, value: 10000, minPmt: 100, addPmt: 0 };
  need('(VARIANT A) small draw (util<25%) + strong equity -> buffer variant (not carrying-balance)',
    A.test(J(build([prop, helocSmall]).b(helocSmall))));

  // Weak equity + carried balance + near retirement -> Variant B, not A.
  const bigMtg = { id: 'm1', baseId: 'mortgage_primary', value: 700000, linkedAssetId: 'prop1' };
  const helocWeak = { ...heloc0, value: 40000, minPmt: 250, addPmt: 150 };
  const eW = build([prop, bigMtg, helocWeak], NEAR);
  need('(VARIANT B) weak equity (liens ~88%) + carried balance + near retirement -> income-floor, not buffer',
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
