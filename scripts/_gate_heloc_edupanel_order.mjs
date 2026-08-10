/* DEV-ONLY red-first ORDER-GATE — §2d: HELOC education panel moved ABOVE the Current Balance box.
   Asserts, in the SERVED studio.html bytes:
     1. the HELOC _diWhyPanel('What a HELOC is…') now PRECEDES the Current Balance _dLbl block.
     2. it stays INSIDE #modal-edu-collapse (open < panel < close) — collapses with the overview,
        never leaks into holdings.
     3. it's a MOVE, not a re-author: the R58 body still appears exactly once (copy untouched).
   --redfirst puts the panel back at its old (bottom) spot → the order assertion FAILS (proves bite). */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  // Simulate pre-§2d: pull the panel from the top and re-insert at its old bottom spot (before the
  // physical else-if), reproducing the original order.
  const m = s.match(/\n            \/\/ §15 education panel \(HELOC Copy Bank §15 R58, verbatim\) — MOVED UP[\s\S]*?\n            }\n/);
  if (m) {
    const block = m[0];
    s = s.replace(block, '\n');
    s = s.replace(/\n        } else if \(base\.taxCode === 'physical' && !base\.id\.includes\('collectibles'\)\) \{/,
                  block + "        } else if (base.taxCode === 'physical' && !base.id.includes('collectibles')) {");
  }
}

const panelIdx    = s.indexOf("_diWhyPanel('What a HELOC is");
const balanceIdx  = s.indexOf("_dLbl(base, 'Current Balance'");
const cOpenIdx    = s.indexOf('id="modal-edu-collapse"');
const cCloseIdx   = s.indexOf('close #modal-edu-collapse');

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('HELOC education panel present', panelIdx > 0);
need('Current Balance block present', balanceIdx > 0);
need('education panel PRECEDES Current Balance box (moved up)', panelIdx > 0 && balanceIdx > 0 && panelIdx < balanceIdx);
need('panel INSIDE #modal-edu-collapse (collapses with overview)', panelIdx > cOpenIdx && panelIdx < cCloseIdx);
need('MOVE not re-author: R58 body appears exactly once', (s.match(/draw, repay, draw again/g) || []).length === 1);
need('R58 body verbatim intact', s.includes('the full picture behind a single monthly minimum.'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with panel at old spot; order check does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the panel is below Current Balance.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
