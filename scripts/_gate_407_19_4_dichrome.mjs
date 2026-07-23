/* DEV-ONLY red-first gate — #407 §19.4 UNIVERSAL .di-narrative chrome upgrade (Mortgage Copy Bank §19.4).
   Every DI narrative (every room modal) inherits this. Asserts the served CSS carries the premium chrome:
     stronger glowing teal accent bar (4px + teal glow in the shadow) · layered depth · subtle navy gradient
     background · a more prominent header (700 weight, wider tracking, ✦ glyph) · raised body line-height.
   --redfirst reverts those tokens to the flat pre-§19.4 look -> the new-chrome asserts fail (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.split('border-left: 4px solid var(--teal-mid)').join('border-left: 2px solid var(--teal-mid)');
  s = s.split('background: linear-gradient(155deg, rgba(14,28,48,0.92), rgba(9,18,33,0.80))').join('background: rgba(9, 18, 33, 0.85)');
  s = s.split(', -7px 0 20px -10px rgba(93,202,165,0.45)').join('');
  s = s.split("  .di-narr-head::before { content: '\\2726'; margin-right: 7px; font-size: 11px; opacity: 0.95; }   /* ✦ glyph */\n").join('');
  s = s.split('font-weight: 700; ').join('');
  s = s.split('line-height: 1.75').join('line-height: 1.65');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('stronger accent bar (4px teal border-left)', /\.di-narrative \{[^}]*border-left: 4px solid var\(--teal-mid\)/.test(s));
need('subtle navy gradient background', /\.di-narrative \{[^}]*background: linear-gradient\(155deg/.test(s));
need('layered shadow + soft teal glow', /\.di-narrative \{[^}]*0 8px 24px rgba\(9,18,33,0\.45\)[^}]*rgba\(93,202,165,0\.45\)/.test(s));
need('more prominent header (700 weight + wider tracking)', /\.di-narr-head \{[^}]*font-weight: 700[^}]*letter-spacing: 0\.16em/.test(s));
need('header glyph (✦ via ::before)', /\.di-narr-head::before \{ content: '\\2726'/.test(s));
need('raised body line-height (1.75)', /\.di-narr-body \{[^}]*line-height: 1\.75/.test(s));
need('still navy-friendly (teal token retained, no light bg)', s.includes('.di-narrative') && !/\.di-narrative \{[^}]*background: (#fff|white|rgba\(255,255,255)/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the flat pre-§19.4 chrome.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.4 flat chrome.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
