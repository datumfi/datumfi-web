/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.1c "show the 0" currency display.
   A settled fractional value must render with EXACTLY 2 decimals ($20,000.50, not $20,000.5), while
   integers stay clean ($20,000 — no forced .00) and live typing stays as-typed (formatCurrency, untouched).
   Extracts the live _num + formatCurrency + formatCurrencyDisplay and runs formatCurrencyDisplay:
     20000.5   -> '$20,000.50'   (the whole ask — a stored Number drops the trailing zero)
     20000     -> '$20,000'      (integer stays clean)
     20000.05  -> '$20,000.05'
     1234.567  -> '$1,234.57'    (rounds to 2, vs formatCurrency's truncate-to-.56)
     -500.5    -> '-$500.50'     (sign preserved)
     '' / undefined -> ''         (blank stays blank)
   Plus structural guards: live listener still uses plain formatCurrency (as-typed), blur + card + front-sync
   use formatCurrencyDisplay, and the front-sync has the focus-guard so a focused field isn't padded mid-type.
   --redfirst reverts formatCurrencyDisplay to the old "just call formatCurrency" body -> 20000.5 renders
   '$20,000.5' and 1234.567 renders '$1,234.56' (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const s = readFileSync('studio.html', 'utf8');

const numSrc = (s.match(/function _num\(v\) \{[^\n]*\}/) || [''])[0];
const fcSrc  = (s.match(/    function formatCurrency\(val\) \{[\s\S]*?\n    \}/) || [''])[0];
let  fcdSrc  = (s.match(/    function formatCurrencyDisplay\(val\) \{[\s\S]*?\n    \}/) || [''])[0];
if (!numSrc || !fcSrc || !fcdSrc) { console.error('⛔ could not locate _num / formatCurrency / formatCurrencyDisplay'); process.exit(1); }

if (RED) {
  // Pre-§19.1c behavior: display == as-typed formatting -> a stored Number shows '$20,000.5'.
  fcdSrc = "function formatCurrencyDisplay(val){ if(val===''||val===null||val===undefined) return ''; return formatCurrency(String(val)); }";
}

let d = null, err = '';
try { d = new Function(numSrc + '\n' + fcSrc + '\n' + fcdSrc + '\n return formatCurrencyDisplay;')(); }
catch (e) { err = e.message; }

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);
need('builds' + (err ? ' (' + err + ')' : ''), d);

if (d) {
  const eq = (label, got, want) => need(`${label}  ('${want}' got '${got}')`, got === want);
  eq('20000.5 pads the 0',   d(20000.5),  '$20,000.50');
  eq('integer stays clean',  d(20000),    '$20,000');
  eq('cent-only fraction',   d(20000.05), '$20,000.05');
  eq('rounds to 2 decimals', d(1234.567), '$1,234.57');
  eq('sign preserved',       d(-500.5),   '-$500.50');
  eq('empty stays empty',    d(''),       '');
  eq('undefined stays empty', d(undefined), '');
}

// Structural guards (evaluated on the served bytes; unaffected by --redfirst, which only swaps the
// extracted body above — they document that the wiring is in the right places).
need('live input listener still uses plain formatCurrency (as-typed, not padded)',
  /e\.target\.value = formatCurrency\(e\.target\.value\)/.test(s));
need('blur normalizer uses formatCurrencyDisplay',
  /focusout[\s\S]*?formatCurrencyDisplay\(e\.target\.value\)/.test(s));
need('card render uses formatCurrencyDisplay',
  /valStr = acc\.value \? formatCurrencyDisplay\(acc\.value\)/.test(s));
need('front-sync has focus-guard (no pad while typing)',
  /document\.activeElement !== frontInp\) frontInp\.value = formatCurrencyDisplay/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the pre-§19.1c display.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.1c display.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
