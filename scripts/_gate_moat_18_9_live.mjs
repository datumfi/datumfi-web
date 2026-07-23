/* DEV-ONLY red-first gate — §18.9 PMI bar LIVE-REFRESH fix. The bar used to render once at modal-open only, so
   it never appeared/updated until you closed and reopened the mortgage. Fix: render it inside an always-present
   container (#modal-pmi-bar-<id>) and re-render that container in BOTH live-edit paths — updateAccField (PMI +
   escrow edits) and updateValueWithoutRender (balance edits). Asserts the container + both refreshes are wired.
   --redfirst neuters both refresh assignments (reproduces the exact symptom: no live update) -> the refresh
   checks + the call-count bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('if(pmiBar) pmiBar.innerHTML = _moatPmiBarHTML(id, acc);', 'if(pmiBar) {}');
  s = s.replace('if(pmiBar2) pmiBar2.innerHTML = _moatPmiBarHTML(id, acc);', 'if(pmiBar2) {}');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('(CONTAINER) PMI bar rendered inside an always-present #modal-pmi-bar-<id>',
  s.includes("'<div id=\"modal-pmi-bar-' + id + '\">' + _moatPmiBarHTML(id, acc) + '</div>'"));
need('(REFRESH · updateAccField) PMI edits re-render the container',
  /const pmiBar = document\.getElementById\(`modal-pmi-bar-\$\{id\}`\);\n\s*if\(pmiBar\) pmiBar\.innerHTML = _moatPmiBarHTML\(id, acc\);/.test(s));
need('(REFRESH · updateValueWithoutRender) balance edits re-render the container',
  /const pmiBar2 = document\.getElementById\(`modal-pmi-bar-\$\{id\}`\);\n\s*if\(pmiBar2\) pmiBar2\.innerHTML = _moatPmiBarHTML\(id, acc\);/.test(s));
need('(COUNT) _moatPmiBarHTML(id, acc) called in render + both refresh paths (>=3)',
  (s.match(/_moatPmiBarHTML\(id, acc\)/g) || []).length >= 3);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the live refresh removed.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the PMI bar does not refresh live.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
