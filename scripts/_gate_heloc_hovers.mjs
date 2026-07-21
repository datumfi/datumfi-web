/* DEV-ONLY red-first WINNER-GATE — §2/§3a HELOC hovers (§22 richest-hover-wins / L51).
   Asserts each authored hover string lands in the SERVED studio.html bytes:
     §2 (bank R23–R28): Current Balance, Credit Limit, APR, Phase, Additional Payment (via _HELOC_HOVERS)
        + Linked Home (R27, on the link dropdown label).
     §3a (bank R31): the room header hover, gated via _isHelocRoom in _diSetTitle.
   Also asserts the _dLbl HELOC branch renders ONLY mapped fields (no Mortgage-copy leakage).
   --redfirst inverts: strips the §2/§3a additions, proves the gate BITES. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/    var _HELOC_HOVERS = \{[\s\S]*?\n    \};\n/, '');
  s = s.replace(/        if \(base\.title === 'HELOC'\) \{\s*\n            var hov = _HELOC_HOVERS\[text\];[\s\S]*?\n        }\n/, '');
  s = s.replace(/\$\{base\.title === 'HELOC'\n\s*\? '<div class="input-label modal-tt-wrap"[\s\S]*?goes unpaid\.<\/div><\/div>'\n\s*: '<div class="input-label" style="color:var\(--teal-mid\);">Link to Physical Asset \(Calculate Equity\)<\/div>'\}/, "'<div class=\"input-label\" style=\"color:var(--teal-mid);\">Link to Physical Asset (Calculate Equity)</div>'");
  s = s.replace(/      } else if \(_isHelocRoom\) \{[\s\S]*?minimum due\.';\n/, '');
}

// These hovers live inside JS single-quoted literals, so the served bytes carry the ESCAPED form
// (it\'s) that renders as it's. Normalize the escapes so we assert the RENDERED winner text.
const sN = s.replace(/\\/g, '');

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// §2 winner strings (bank R23–R28) — the richest-hover text must survive in served bytes.
const HOVERS = {
  'R23 Current Balance': 'The amount currently borrowed against your line — not the limit.',
  'R24 Credit Limit': 'The most you can draw. Because it\'s backed by home equity, this is usually far larger than a card limit — which cuts both ways.',
  'R25 Interest Rate APR': 'Most HELOCs carry a variable rate tied to an index, so this number can move. Watch the reset terms.',
  'R26 Phase': 'In the draw period you can borrow and often pay interest-only; in repayment you pay down principal on a schedule with no new draws.',
  'R27 Linked Home': 'This line is secured by the linked property. Your equity is what backs it — and what\'s at risk if it goes unpaid.',
  'R28 Additional Payment': 'Extra hits principal and frees up equity headroom — especially valuable before the repayment phase forces amortization.',
};
for (const [k, v] of Object.entries(HOVERS)) need('§2 ' + k + ' hover VERBATIM in bytes', sN.includes(v));

// R27 title + the two new-field titles present.
need('§2 R27 "Your collateral" header', sN.includes('<strong>Your collateral</strong>'));
need('§2 R23 "What you\'ve drawn" title', sN.includes("What you've drawn"));

// §3a header hover (R31) — gated via _isHelocRoom, verbatim.
need('§3a R31 header hover VERBATIM',
  sN.includes('A HELOC is a hybrid: it works like a credit card you can draw from and repay repeatedly') &&
  sN.includes('so you can see the whole picture, not just the minimum due.'));
need('§3a R31 title "A revolving line, backed by your home"',
  sN.includes('<strong>A revolving line, backed by your home</strong>'));
need('§3a _isHelocRoom gate wired into _diSetTitle',
  /var _isHelocRoom = \(base\.title === 'HELOC'\);/.test(s) && /&& !_isHelocRoom &&/.test(s));

// _dLbl HELOC branch renders ONLY mapped fields (no Mortgage-copy leakage on unlisted fields).
need('_dLbl HELOC branch consults _HELOC_HOVERS map',
  /if \(base\.title === 'HELOC'\) \{\s*\n\s*var hov = _HELOC_HOVERS\[text\];/.test(s));
need('_dLbl HELOC unmapped fields fall to PLAIN label (no leakage)',
  /var hov = _HELOC_HOVERS\[text\];\s*\n\s*if \(!hov\) return `<div class="input-label"/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code; it does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§2/§3a code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
