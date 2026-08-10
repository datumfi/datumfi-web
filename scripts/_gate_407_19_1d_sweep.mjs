/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.1d currency read/store sweep.
   Every currency field that re-parses a DOM value did parseInt(x.replace(/[^0-9]/g,'')) — which drops the
   '.' and concatenates cents onto dollars (the same 100x bug §19.1b fixed for account value). §19.1d keeps
   the decimal point across all of them: upkeep-carry (store, keeps full cents), salary / spend / SS /
   blueprint-import reads, and the 3 isCurrency clean() fns on the estate-overview sliders.
   FUNCTIONAL (extracted from served bytes):
     upkeep store  : '$20,000.50' -> 20000.5 (NOT 2000050); '$1,234.567' -> 1234.57 (rounded)
     `g` reader    : DOM value '$20,000.50' -> 20000 (magnitude correct, NOT 2000050)
   STRUCTURAL: zero buggy read idioms remain; the 3 currency clean() fns keep the dot.
   --redfirst inverse-sweeps the served bytes back to parseInt-strip -> all of the above reproduce the bug. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

const undo = (str, a, b) => str.split(a).join(b);
if (RED) {
  s = undo(s, ".replace(/[^0-9.]/g, ''), 10)", ".replace(/[^0-9]/g, ''), 10)");
  s = undo(s, ".replace(/[^\\d.]/g, ''), 10)", ".replace(/[^\\d]/g, ''), 10)");
  s = undo(s, "item.amount = Math.round((parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0) * 100) / 100;",
              "item.amount = parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;");
  s = undo(s, "return s.replace(/[^0-9.]/g, ''); }", "return s.replace(/[^0-9]/g, ''); }");
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// --- FUNCTIONAL: upkeep store RHS ---
const storeM = s.match(/if\(field === 'amount'\)\s+item\.amount = ([^;]+);/);
need('upkeep store RHS located', storeM);
if (storeM) {
  let store = null, err = '';
  try { store = new Function('val', 'return (' + storeM[1] + ');'); } catch (e) { err = e.message; }
  need('upkeep store builds' + (err ? ' (' + err + ')' : ''), store);
  if (store) {
    need("upkeep '$20,000.50' -> 20000.5 (NOT 2000050)", store('$20,000.50') === 20000.5);
    need("upkeep '$1,234.567' -> 1234.57 (rounded, cents kept)", store('$1,234.567') === 1234.57);
    need("upkeep '$1,000,000' -> 1000000 (no regression)", store('$1,000,000') === 1000000);
  }
}

// --- FUNCTIONAL: the `g` DOM reader (RB math) ---
const gM = s.match(/var g = (function \(id\) \{[^\n]*\});/);
need('`g` reader located', gM);
if (gM) {
  const fakeDoc = (v) => ({ getElementById: () => ({ value: v }) });
  let g50 = null, g1m = null, err = '';
  try {
    const make = new Function('document', 'return (' + gM[1] + ');');
    g50 = make(fakeDoc('$20,000.50'))('x');
    g1m = make(fakeDoc('$1,000,000'))('x');
  } catch (e) { err = e.message; }
  need('`g` builds/runs' + (err ? ' (' + err + ')' : ''), g50 !== null);
  need("`g` DOM '$20,000.50' -> 20000 (NOT 2000050)", g50 === 20000);
  need("`g` DOM '$1,000,000' -> 1000000 (no regression)", g1m === 1000000);
}

// --- STRUCTURAL (on served bytes) ---
const buggyReads = (s.split(".replace(/[^0-9]/g, ''), 10)").length - 1) + (s.split(".replace(/[^\\d]/g, ''), 10)").length - 1);
need('zero buggy currency-read idioms remain', buggyReads === 0);
const currCleans = s.split("return s.replace(/[^0-9.]/g, ''); }").length - 1;
need('all 3 isCurrency clean() fns keep the decimal', currCleans === 3);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the parseInt-strip sweep.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.1d code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
