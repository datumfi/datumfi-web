/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.1 cents fix (UNIVERSAL, every .curr-format field).
   Extracts the LIVE formatCurrency from studio.html and runs it. Asserts the fraction survives:
     '1234.56'  -> '$1,234.56'   (cents kept — the whole bug)
     '1234.5'   -> '$1,234.5'    (single decimal, mid-entry)
     '1234.'    -> '$1,234.'      (bare trailing dot preserved so typing can continue)
     '1234.567' -> '$1,234.56'    (capped at 2 decimals)
     '1000000'  -> '$1,000,000'   (no regression: integer + thousands separators)
     ''         -> ''             (empty stays empty)
   Also asserts the on-blur normalizer strips a dangling trailing '.'.
   --redfirst reverts formatCurrency to the old parseInt body -> the decimal cases fail (gate bites). */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

const OLD_BODY = `      let isNeg = num.startsWith('-');
      num = num.replace(/-/g, '');
      let parsed = parseInt(num, 10);
      if (isNaN(parsed)) return '';
      return (isNeg ? '-' : '') + '$' + parsed.toLocaleString('en-US');
    }`;

// Pull the live formatCurrency out of the served bytes.
const m = s.match(/    function formatCurrency\(val\) \{[\s\S]*?\n    \}/);
if (!m) { console.error('⛔ could not locate formatCurrency in studio.html'); process.exit(1); }
let src = m[0];

if (RED) {
  // Reproduce the pre-§19.1 symptom by swapping the tail back to the parseInt body.
  src = src.replace(/      let isNeg = num\.startsWith\('-'\);[\s\S]*\n    \}/, () => OLD_BODY);
}

const formatCurrency = new Function('val', src.replace(/^\s*function formatCurrency\(val\) \{/, '').replace(/\}\s*$/, ''));

const checks = [];
const need = (label, got, want) => checks.push([`${label}  ('${want}' got '${got}')`, got === want]);

need("cents kept",            formatCurrency('1234.56'),  '$1,234.56');
need("single decimal kept",   formatCurrency('1234.5'),   '$1,234.5');
need("bare trailing dot kept", formatCurrency('1234.'),   '$1,234.');
need("capped at 2 decimals",  formatCurrency('1234.567'), '$1,234.56');
need("integer no-regression", formatCurrency('1000000'),  '$1,000,000');
need("empty stays empty",     formatCurrency(''),         '');

// on-blur normalizer present in the served bytes. §19.1 stripped a dangling trailing '.'; §19.1c
// superseded that by reformatting through formatCurrencyDisplay (which drops the trailing '.' via _num
// AND pads cents). Accept either wiring so this gate survives the §19.1c evolution.
const blurOk = /focusout[\s\S]*?curr-format[\s\S]*?(replace\(\/\\\.\$\/, ''\)|formatCurrencyDisplay\(e\.target\.value\))/.test(s);
checks.push(['on-blur trailing-dot normalizer wired', blurOk]);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the parseInt body.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.1 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
