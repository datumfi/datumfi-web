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
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

const BUG = "parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0";

if (RED) {
  // Reproduce the pre-§19.1b symptom at all three write sites.
  s = s.replace(/Math\.min\(100000000000, Math\.round\(_num\(valStr\) \* 100\) \/ 100\)/g,
                () => 'Math.min(100000000000, ' + BUG + ')');
  s = s.replace(/acc\.inflow = Math\.round\(_num\(valStr\) \* 100\) \/ 100;/,
                () => 'acc.inflow = ' + BUG + ';');
}

const numSrc = (s.match(/function _num\(v\) \{[^\n]*\}/) || [''])[0];
if (!numSrc) { console.error('⛔ could not locate _num in studio.html'); process.exit(1); }

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
  try { store = new Function('valStr', numSrc + '\n return (' + rhs + ');'); } catch (e) { err = e.message; }
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
