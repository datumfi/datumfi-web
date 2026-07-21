/* DEV-ONLY red-first WINNER-GATE — §2c HELOC remaining field hovers (bank §2b R82–R88, verbatim).
   Completion set (House Rule: every field gets a hover). Asserts each authored hover in served bytes:
     6 via _HELOC_HOVERS map (Original Amount, Rate Type, Origination Date, Maturity Date,
     Minimum Payment, Next Payment Date) + the R84 cluster hover in _variableRateClusterHTML (HELOC-only).
   Also asserts the Mortgage cluster path stays byte-present (Moat leave-as-is).
   --redfirst strips the §2c additions, proves the gate BITES. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');
if (RED) {
  // Drop the 6 map completion-set lines + the whole HELOC cluster branch.
  s = s.replace(/        \/\/ §2c completion set[\s\S]*?'Next Payment Date': \[[^\]]*\]\n/, '');
  s = s.replace(/        if \(\(getBaseType\(acc\.baseId\) \|\| \{\}\)\.title === 'HELOC'\) \{[\s\S]*?\n        }\n        return `/, '        return `');
}
const sN = s.replace(/\\/g, '');

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// §2b winner strings (verbatim, curly apostrophes as authored).
const H = {
  'R82 Original Amount': 'The credit line’s original size when you set it up. On a revolving line this is your starting headroom',
  'R83 Rate Type': 'Most HELOCs are Variable — the rate is tied to an index and can reset up or down on a schedule',
  // #390 — the single shared "How your variable rate moves" explainer is replaced by 5 DISTINCT per-field
  // hovers (Captain-approved 2026-07-20). Bodies asserted here; the dropdown/position/validation are in
  // _gate_heloc_cluster_ui.mjs.
  '#390 Rate Index': 'The published rate your line follows — usually Prime, sometimes SOFR.',
  '#390 Margin': 'The fixed amount your lender adds on top of the index — set at signing, never changes.',
  '#390 Periodic Cap': 'The largest your rate can move at any single reset, up or down.',
  '#390 Lifetime Cap': 'The most your rate can ever climb above where it started, across the entire line.',
  '#390 Next Reset': 'The next date your rate re-prices to the current index plus your margin.',
  'R85 Origination Date': 'When the HELOC was funded. It anchors the draw-period clock',
  'R86 Maturity Date': 'The contractual end of the line — by here the balance must be repaid.',
  'R87 Minimum Payment': 'which is why the minimum can jump when the phase turns.',
  'R88 Next Payment Date': 'especially the countdown to when the draw period ends.',
};
for (const [k, v] of Object.entries(H)) need('§2c ' + k + ' verbatim in bytes', sN.includes(v));

// Titles present (#390: the 5 distinct cluster hover titles replace the one shared "How your variable…").
for (const t of ['Where the line opened', 'Locked or moving', 'The day the line opened',
                 'When the line closes out', 'The clock’s start',
                 'The benchmark you track', 'fixed add-on', 'The most it can jump at once',
                 'The ceiling over the whole loan', 'When the rate can change next'])
  need('title "' + t + '"', sN.includes(t));

// The 6 map keys wired.
for (const key of ['Original Amount', 'Rate Type', 'Origination Date', 'Maturity Date', 'Minimum Payment', 'Next Payment Date'])
  need("_HELOC_HOVERS has '" + key + "'", new RegExp("'" + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "': \\[").test(s));

// R84 cluster is HELOC-gated; Mortgage cluster markup still present (byte-identical anchor).
need('R84 cluster HELOC-gated in _variableRateClusterHTML',
  /if \(\(getBaseType\(acc\.baseId\) \|\| \{\}\)\.title === 'HELOC'\) \{/.test(s));
need('Mortgage cluster path preserved (Moat leave-as-is)',
  s.includes('<strong>How a variable rate moves</strong>Your rate = the index (like SOFR or Prime) + a fixed margin'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§2c code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
