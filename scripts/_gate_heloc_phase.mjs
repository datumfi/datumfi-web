/* DEV-ONLY red-first gate — §0.3 HELOC/The Cellar Draw vs Repayment phase.
   Asserts, in the SERVED studio.html bytes:
     1. _helocPhaseFieldHTML injected HELOC-only into the shared debt modal.
     2. Phase select binds oninput/onchange → updateAccField(...,'helocPhase',...) with Select-phase blank option.
     3. _helocPhaseClause branches: Draw / Repayment sentences VERBATIM from bank R19; '' when blank.
     4. SOURCED-OR-BLANK: caption hidden ('' → display:none) when no phase set.
     5. live-refresh element modal-heloc-phase-${id} wired in updateAccField.
   --redfirst inverts: strips the §0.3 additions, proves the gate BITES. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.replace(/function _helocPhaseClause\(acc\)[\s\S]*?function _helocPhaseFieldHTML[\s\S]*?\n    }\n/, '');
  s = s.replace(/\$\{base\.title === 'HELOC' \? _helocPhaseFieldHTML\(id, acc\) : ''\}\n/, '');
  s = s.replace(/const helocPh = document[\s\S]*?helocPh\.innerHTML = _pc; }\n/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const DRAW = "You're in the draw period — you can still borrow, and minimums may be interest-only, so the balance won't shrink on its own.";
const REPAY = "You're in the repayment period — no new draws, and payments now pay down principal on a set schedule.";

need('_helocPhaseFieldHTML injected HELOC-only into debt modal',
  /\$\{base\.title === 'HELOC' \? _helocPhaseFieldHTML\(id, acc\) : ''\}/.test(s));
need('Phase select binds helocPhase',
  /updateAccField\('\$\{id\}', 'helocPhase', this\.value\)/.test(s));
need('Phase select has blank option (Select phase…)',
  /<option value="">Select phase…<\/option>/.test(s));
need('Draw clause VERBATIM (bank R19)',
  s.includes(DRAW.replace(/'/g, "\\'")) || s.includes(DRAW));
need('Repayment clause VERBATIM (bank R19)',
  s.includes(REPAY.replace(/'/g, "\\'")) || s.includes(REPAY));
need("SOURCED-OR-BLANK: _helocPhaseClause returns '' when unset",
  /function _helocPhaseClause\(acc\)[\s\S]*?\n\s*return '';\n    }/.test(s));
need('live-refresh in updateAccField (modal-heloc-phase)',
  /const helocPh = document\.getElementById\(`modal-heloc-phase-\$\{id\}`\)/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code; it does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§0.3 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
