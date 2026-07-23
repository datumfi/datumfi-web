/* DEV-ONLY red-first gate — #407 §19.4 UNIVERSAL DI chrome, CORRECTED after the audit.
   The first cut only checked that the .di-narrative CSS RULE existed — a blind spot: the Mortgage, HELOC and
   Grounds DI boxes rendered with bespoke INLINE styles (no class), so the chrome was invisible on screen while
   the gate stayed green. This gate now asserts the RENDER SITES actually emit class="di-narrative" +
   .di-narr-head (so an element carries it), that NO bespoke inline "DATUM INTELLIGENCE" modal header survives,
   AND that the CSS chrome exists to be inherited.
   --redfirst strips the class off the Mortgage DI body (the exact audit symptom) -> the render-site check fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.split('class="di-narr-body" id="modal-moat-di-${id}"').join('id="modal-moat-di-${id}"');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ── RENDER SITES: every DI box must carry the class (this is what the audit proved was missing) ──
need('Mortgage DI renders via .di-narrative + .di-narr-body#modal-moat-di',
  /<div class="di-narrative">\s*<div class="di-narr-head">Datum Intelligence<\/div>\s*<div class="di-narr-body" id="modal-moat-di-\$\{id\}">/.test(s));
need('HELOC DI renders via .di-narrative + .di-narr-body#modal-cellar-di',
  /<div class="di-narrative">\s*<div class="di-narr-head">Datum Intelligence<\/div>\s*<div class="di-narr-body" id="modal-cellar-di-\$\{id\}">/.test(s));
need('Grounds DI renders via .di-narrative + .di-narr-head#modal-grounds-di',
  /<div class="di-narrative">\s*<div class="di-narr-head">Datum Intelligence<\/div>\s*<div id="modal-grounds-di-\$\{id\}">/.test(s));
need('Investment rooms (_diNarrBlock) render via .di-narrative + head + body',
  s.includes('class="di-narrative" id="di-narr-') && s.includes('class="di-narr-head">Datum Intelligence</div><div class="di-narr-body">'));
need('Yard DI twin renders via .di-narrative (§19.4b)',
  s.includes('var diBlock = di ? \'<div class="di-narrative"><div class="di-narr-head">Datum Intelligence'));

// ── NEGATIVE: no bespoke inline modal DI header may survive (the hud-status telemetry line is not this) ──
const bespoke = (s.match(/font-weight:bold; font-size:11px; letter-spacing:1px; margin-bottom:8px;">DATUM INTELLIGENCE/g) || []).length;
need('no bespoke inline "DATUM INTELLIGENCE" modal header survives (0)', bespoke === 0);

// ── COUNT: at least the 5 render sites carry class="di-narrative" ──
const cnt = (s.match(/class="di-narrative"/g) || []).length;
need(`>=5 render sites carry class="di-narrative" (got ${cnt})`, cnt >= 5);

// ── CSS chrome exists to be inherited ──
need('CSS: stronger 4px teal accent bar', /\.di-narrative \{[^}]*border-left: 4px solid var\(--teal-mid\)/.test(s));
need('CSS: layered shadow + teal glow + navy gradient',
  /\.di-narrative \{[^}]*linear-gradient\(155deg/.test(s) && /\.di-narrative \{[^}]*rgba\(93,202,165,0\.45\)/.test(s));
need('CSS: ✦ glyph via .di-narr-head::before', /\.di-narr-head::before \{ content: '\\2726'/.test(s));
need('CSS: prominent header (700) + raised body line-height (1.75)',
  /\.di-narr-head \{[^}]*font-weight: 700/.test(s) && /\.di-narr-body \{[^}]*line-height: 1\.75/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the Mortgage DI unclassed.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when a room DI box lacks the class.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
