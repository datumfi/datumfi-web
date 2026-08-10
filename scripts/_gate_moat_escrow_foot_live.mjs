/* DEV-ONLY red-first gate — escrow-footer live-refresh on BALANCE change. The escrow footer's PMI sub-line is
   now equity-gated (§18.9 consistency), so it must re-render when the Current Balance changes. updateAccField
   already refreshed the footer; updateValueWithoutRender (the balance path) did not — this closes that gap.
   Asserts the balance path re-renders #modal-escrow-foot-<id>. --redfirst removes the refresh (reproduces the
   stale-footer-on-balance symptom) -> the check bites. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.replace('                if(escrowFoot2) {\n                    if(hasEscrow(acc)) { escrowFoot2.style.display = \'block\'; escrowFoot2.innerHTML = _escrowFooter(acc); }\n                    else { escrowFoot2.style.display = \'none\'; }\n                }', '                // (removed)');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// The balance path (updateValueWithoutRender) sets acc.value, then must refresh the footer.
need('(BALANCE PATH) updateValueWithoutRender refreshes the escrow footer',
  /acc\.value = Math\.min\(100000000000[\s\S]*?const escrowFoot2 = document\.getElementById\(`modal-escrow-foot-\$\{id\}`\);[\s\S]*?escrowFoot2\.innerHTML = _escrowFooter\(acc\);/.test(s));
need('(SHOW/HIDE) footer hidden when no escrow (sourced-or-blank)',
  /if\(escrowFoot2\) \{[\s\S]*?else \{ escrowFoot2\.style\.display = 'none'; \}/.test(s));
// The PMI edit path (updateAccField) still refreshes the footer (regression guard).
need('(PMI PATH intact) updateAccField still refreshes the escrow footer',
  /const escrowFoot = document\.getElementById\(`modal-escrow-foot-\$\{id\}`\);[\s\S]*?escrowFoot\.innerHTML = _escrowFooter\(acc\);/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the balance-path footer refresh removed.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the escrow footer goes stale on a balance change.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
