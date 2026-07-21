/* DEV-ONLY red-first gate — §0.1 HELOC/The Cellar registry ids.
   Asserts, in the SERVED studio.html bytes:
     1. 3 new registry ids exist with debt/hasInterest shape + HELOC title (joint/primary/co).
     2. taxonomy leaf 'The Cellar' now carries reg:{joint:heloc_joint,...} (was reg:null).
     3. all 3 ids are in FILTERED_TYPES (engine-filtered → no 422 trap).
     4. NEGATIVE CONTROL: none of the 3 ids appear in ACCOUNT_TYPE_MAP block (debt must NOT map to an engine enum).
   --redfirst inverts: proves the gate BITES on the pre-wired (reg:null / no-ids) code. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  // Simulate the pre-§0.1 state: strip the 3 heloc registry lines + revert taxonomy reg + drop filtered ids.
  s = s.replace(/^.*id: 'heloc_(?:joint|primary|co)'.*$\n?/gm, '');
  s = s.replace(/leaf:'The Cellar', reg:\{joint:'heloc_joint',primary:'heloc_primary',co:'heloc_co'\}/, "leaf:'The Cellar', reg:null");
  s = s.replace(/\n\s*'heloc_joint',\s*'heloc_primary',\s*'heloc_co'/, '');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

for (const [id, meta, type] of [
  ['heloc_joint',   'The Cellar',    'joint'],
  ['heloc_primary', 'The Cellar',    'primary'],
  ['heloc_co',      'The Co-Cellar', 'coarch'],
]) {
  const re = new RegExp(`id: '${id}',[^\\n]*type: '${type}',[^\\n]*taxCode: 'debt',[^\\n]*hasInterest: true,[^\\n]*title: 'HELOC',[^\\n]*meta: '${meta}'`);
  need(`registry ${id} (debt/hasInterest/HELOC/${meta})`, re.test(s));
}

need("taxonomy 'The Cellar' reg → heloc_* family",
  /leaf:'The Cellar', reg:\{joint:'heloc_joint',primary:'heloc_primary',co:'heloc_co'\}/.test(s));

// FILTERED_TYPES membership — scope to the Set literal so we don't count the registry lines.
const ftBlock = (s.match(/const FILTERED_TYPES = new Set\(\[([\s\S]*?)\]\);/) || [])[1] || '';
for (const id of ['heloc_joint', 'heloc_primary', 'heloc_co'])
  need(`FILTERED_TYPES has ${id}`, new RegExp(`'${id}'`).test(ftBlock));

// NEGATIVE: heloc ids must NOT be keys in ACCOUNT_TYPE_MAP (debt is filtered, not engine-typed → 422 trap).
const atmBlock = (s.match(/const ACCOUNT_TYPE_MAP = \{([\s\S]*?)\};/) || [])[1] || '';
need('ACCOUNT_TYPE_MAP does NOT contain heloc (422-trap guard)', !/heloc/.test(atmBlock));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on pre-wired code; it does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§0.1 (reg:null / no-ids) code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
