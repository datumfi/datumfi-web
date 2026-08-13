/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.1b store-side cents fix.
   §19.1 kept cents in the INPUT display, but the three account-value WRITE sites still stored via
   parseInt(valStr.replace(/[^0-9]/g,'')) — which drops the '.' and concatenates cents onto dollars, so
   typing 20,000.50 STORED 2000050 and every reader (left card, canvas tile, Grounds net-equity) showed
   $2,000,050. This gate extracts the LIVE _num plus the actual RHS assigned at each write site and drives
   the exact symptom through them:
     updateValueWithoutRender / updateValue :  '$20,000.50' -> 20000.5   (not 2000050)
     updateInflow                           :  '$1,234.56'  -> 1234.56
   plus no-regression ('$1,000,000' -> 1000000, '$20,000' -> 20000).
   --redfirst reverts each RHS to the parseInt-strip body -> the cents cases return 2000050 (gate bites). */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

const BUG = "parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0";

if (RED) {
  /* Reproduce the pre-§19.1b symptom at all three write sites.
     ⚠️ `_num\(` -> `_num\((?:window\.enforceAmt\()?` because the two acc.value sites now wrap the
     raw string in the sign guard first (2026-08-13, a typed amount is a MAGNITUDE). Without this
     the red-first silently matched NOTHING at those sites and would have reported a passing
     red-first while proving only updateInflow. A red-first whose anchor has drifted is not a
     red-first. */
  const LIVE_RHS = 'Math.min(100000000000, Math.round(_num(window.enforceAmt(valStr)) * 100) / 100)';
  const nLive = s.split(LIVE_RHS).length - 1;
  if (nLive !== 2) {
    console.error('⛔ red-first anchor drifted: expected 2 acc.value store sites, found ' + nLive + ' — re-ground it.');
    process.exit(1);
  }
  s = s.split(LIVE_RHS).join('Math.min(100000000000, ' + BUG + ')');
  s = s.replace(/acc\.inflow = Math\.round\(_num\(valStr\) \* 100\) \/ 100;/,
                () => 'acc.inflow = ' + BUG + ';');
}

const numSrc = (s.match(/function _num\(v\) \{[^\n]*\}/) || [''])[0];
if (!numSrc) { console.error('⛔ could not locate _num in studio.html'); process.exit(1); }

/* ⭐ enforceAmt IS EXTRACTED FROM SOURCE, NEVER STUBBED. The two acc.value sites now compose
   `_num(window.enforceAmt(valStr))` (2026-08-13 sign clamp), so this sandbox must supply it — and a
   hand-written stub would test a sanitiser this repo does not ship. Pulling the live function means
   this gate now drives the COMPOSED pipeline: sign guard, then cents-safe parse. The cents claims
   below are unchanged and still the point; enforceAmt keeps the '.' precisely so they hold. */
const enforceSrc = (s.match(/window\.enforceAmt = function\(str\) \{[\s\S]*?\n    \};/) || [''])[0];
if (!enforceSrc) { console.error('⛔ could not locate enforceAmt in studio.html'); process.exit(1); }
const PREAMBLE = 'var window = {};\n' + enforceSrc + '\n' + numSrc + '\n';

// Pull the RHS actually assigned at each write site, in that function's own scope.
const grab = (fnHeader, lhs) => {
  const fn = s.match(new RegExp(fnHeader + '[\\s\\S]*?' + lhs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' = ([^;]+);'));
  return fn ? fn[1] : null;
};
const sites = {
  updateValueWithoutRender: grab('window\\.updateValueWithoutRender = function\\(id, valStr\\) \\{', 'acc.value'),
  updateValue:              grab('window\\.updateValue = function\\(id, valStr\\) \\{', 'acc.value'),
  updateInflow:             grab('window\\.updateInflow = function\\(id, valStr\\) \\{', 'acc.inflow'),
};

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

for (const [name, rhs] of Object.entries(sites)) {
  need(`site ${name}: RHS located`, rhs);
  if (!rhs) continue;
  let store = null, err = '';
  try { store = new Function('valStr', PREAMBLE + ' return (' + rhs + ');'); } catch (e) { err = e.message; }
  need(`site ${name}: builds${err ? ' (' + err + ')' : ''}`, store);
  if (!store) continue;
  if (name === 'updateInflow') {
    need(`site ${name}: '$1,234.56' -> 1234.56 (cents kept)`, store('$1,234.56') === 1234.56);
  } else {
    need(`site ${name}: '$20,000.50' -> 20000.5 (NOT 2000050)`, store('$20,000.50') === 20000.5);
    need(`site ${name}: '$1,000,000' -> 1000000 (no regression)`, store('$1,000,000') === 1000000);
    need(`site ${name}: '$20,000' -> 20000`, store('$20,000') === 20000);
  }
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the parseInt-strip body.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.1b code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
