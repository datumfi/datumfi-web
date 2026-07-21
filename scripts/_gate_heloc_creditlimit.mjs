/* DEV-ONLY red-first gate — §0.4 HELOC/The Cellar credit limit + utilization + headroom.
   Asserts, in the SERVED studio.html bytes:
     1. _helocLimitFieldHTML injected into the shared debt modal, HELOC-only.
     2. Credit Limit input binds oninput → updateAccField(...,'helocCreditLimit',...).
     3. 'helocCreditLimit' added to the numeric-strip list (else parseFloat('$50,000')=NaN bug).
     4. utilization formula = balance/limit*100 ; headroom formula = limit - balance.
     5. SOURCED-OR-BLANK: _helocHeadroomHTML returns '' when _helocLimit(acc)===null.
     6. live-refresh element modal-heloc-headroom-${id} wired in BOTH updateAccField and
        updateValueWithoutRender (limit change AND balance change move the readout).
   Plus a self-contained MATH sanity check of the two formulas the source pins.
   --redfirst inverts: strips the §0.4 additions, proves the gate BITES. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  // Simulate pre-§0.4: remove the helper block, the injection, the strip-list entry, both refreshes.
  s = s.replace(/function _helocLimit\(acc\)[\s\S]*?function _helocLimitFieldHTML[\s\S]*?\n    }\n/, '');
  s = s.replace(/\$\{base\.title === 'HELOC' \? _helocLimitFieldHTML\(id, acc\) : ''\}\n/, '');
  s = s.replace(/ \|\| field === 'helocCreditLimit'/, '');
  s = s.replace(/const helocHR = document[\s\S]*?helocHR\.innerHTML = _hh; }\n/, '');
  s = s.replace(/const helocHR2 = document[\s\S]*?helocHR2\.innerHTML = _hh2; }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('_helocLimitFieldHTML injected HELOC-only into debt modal',
  /\$\{base\.title === 'HELOC' \? _helocLimitFieldHTML\(id, acc\) : ''\}/.test(s));
need('Credit Limit input binds helocCreditLimit',
  /updateAccField\('\$\{id\}', 'helocCreditLimit', this\.value\)/.test(s));
need("'helocCreditLimit' in numeric-strip list (no $-string NaN)",
  /field === 'helocCreditLimit'/.test(s));
need('utilization formula = balance / limit * 100',
  /\(\(parseFloat\(acc\.value\) \|\| 0\) \/ l\) \* 100/.test(s));
need('headroom formula = limit - balance',
  /l - \(parseFloat\(acc\.value\) \|\| 0\)/.test(s));
need("SOURCED-OR-BLANK: headroomHTML returns '' when no limit",
  /if \(_helocLimit\(acc\) === null\) return '';/.test(s));
need('live-refresh in updateAccField (modal-heloc-headroom)',
  /const helocHR = document\.getElementById\(`modal-heloc-headroom-\$\{id\}`\)/.test(s));
need('live-refresh in updateValueWithoutRender (balance change)',
  /const helocHR2 = document\.getElementById\(`modal-heloc-headroom-\$\{id\}`\)/.test(s));

// Self-contained MATH sanity — the exact formulas the source pins (balance 30k, limit 50k).
const _lim = 50000, _bal = 30000;
const util = Math.round((_bal / _lim) * 100);
const head = Math.max(0, _lim - _bal);
need('MATH: 30k drawn / 50k limit → utilization 60%', util === 60);
need('MATH: 50k limit − 30k drawn → $20,000 headroom', head === 20000);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code; it does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§0.4 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
