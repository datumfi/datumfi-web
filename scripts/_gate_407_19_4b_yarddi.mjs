/* DEV-ONLY red-first gate — #407 §19.4b Yard DI twin adopts the §19.4 .di-narrative chrome.
   The Yard rendered its Datum Intelligence through a bespoke .yard-sec block, so it did NOT inherit the
   §19.4 upgrade. Now it reuses the SAME .di-narrative / .di-narr-head / .di-narr-body classes (L48) — so the
   layered depth, 4px glowing teal bar, ✦ header, gradient and line-height carry to the twin. No orphan DI box.
   Asserts the Yard diBlock uses .di-narrative, the old bespoke '🧠 Datum Intelligence' block is gone, and the
   §19.4 chrome exists for it to inherit. --redfirst restores the .yard-sec block -> the parity asserts fail. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

const NEW = `var diBlock = di ? '<div class="di-narrative"><div class="di-narr-head">Datum Intelligence</div><div class="di-narr-body">' + di + '</div></div>' : '';`;
const OLD = `var diBlock = di ? '<div class="yard-sec" style="background:rgba(93,202,165,0.05); border-color:rgba(93,202,165,0.25);"><div class="yard-h" style="color:var(--teal-mid);">🧠 Datum Intelligence</div><div style="font-size:12px; color:rgba(255,255,255,0.8);">' + di + '</div></div>' : '';`;

if (RED) s = s.split(NEW).join(OLD);

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('Yard DI twin renders through .di-narrative (inherits §19.4 chrome)', s.includes(NEW));
need('bespoke .yard-sec DI block (🧠) is gone — no orphan', !s.includes('🧠 Datum Intelligence'));
need('the §19.4 chrome exists for the twin to inherit (4px teal bar)',
  /\.di-narrative \{[^}]*border-left: 4px solid var\(--teal-mid\)/.test(s));
need('twin uses di-narr-head (✦ glyph via ::before)', /\.di-narr-head::before \{ content: '\\2726'/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the orphan .yard-sec DI block.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the Yard DI reverts to .yard-sec.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
