/* DEV-ONLY red-first WINNER-GATE — §2c HELOC remaining field hovers (bank §2b R82–R88, verbatim).
   Completion set (House Rule: every field gets a hover). Asserts each authored hover in served bytes:
     6 via _HELOC_HOVERS map (Original Amount, Rate Type, Origination Date, Maturity Date,
     Minimum Payment, Next Payment Date) + the R84 cluster hover in _variableRateClusterHTML (HELOC-only).
   Also asserts the Mortgage cluster path stays byte-present (Moat leave-as-is).
   --redfirst strips the §2c additions, proves the gate BITES.
   --forkhlf  duplicates the shared _hlF renderer -> the anti-fork structural check bites.
   --dropmtg  deletes the Mortgage branch after the HELOC gate -> the presence + routing checks bite. */
import { readFileSync } from 'node:fs';
import { extractFn } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
/* Negative controls for the STRUCTURAL mortgage-path claims. --redfirst strips the §2c HELOC
 * additions and says nothing about the Mortgage path, so these need their own mutations or they
 * would be assertions no control ever exercises. */
const FORKHLF = process.argv.includes('--forkhlf');   // duplicate _hlF -> the anti-fork check bites
const DROPMTG = process.argv.includes('--dropmtg');   // delete the Mortgage tail -> presence + routing bite
let s = studioSource();
if (RED) {
  // Drop the 6 map completion-set lines + the whole HELOC cluster branch.
  //
  // RE-GROUNDED 2026-07-26. BOTH of these anchors had gone dead — they matched zero times, so
  // --redfirst mutated NOTHING while still reporting "RED-FIRST OK", because the gate was red
  // anyway from a stale contract line. A dead control certified by an unrelated failure.
  // Both breakages trace to the SAME commit, 440053e (#412 / §18.8):
  //   · the map entry ends "]," not "]"        -> tolerate an optional trailing comma
  //   · §18.8 inserted three COMMENT lines between the HELOC branch's "}" and "return `"
  //                                            -> allow comment lines in between
  // Anchored on what does not vary; the parts that legitimately move are matched loosely.
  const _before = s;
  s = s.replace(/        \/\/ §2c completion set[\s\S]*?'Next Payment Date': \[[^\]]*\],?\n/, '');
  s = s.replace(/        if \(\(getBaseType\(acc\.baseId\) \|\| \{\}\)\.title === 'HELOC'\) \{[\s\S]*?\n        }\n(?:        \/\/[^\n]*\n)*        return `/, '        return `');
  // A no-op strip is the very failure this gate just taught us about — refuse to run blind.
  if (s === _before) {
    console.error('❌ --redfirst STRIP MATCHED NOTHING — the mutation anchors are dead again. Re-ground them.');
    process.exit(1);
  }
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
/* STRUCTURE ONLY — BINDING BOUNDARY (Captain-ruled 2026-07-26).
 * _gate_moat_18_8 owns the mortgage cluster COPY contract. THIS gate owns exactly one claim:
 * HELOC work did not DELETE or FORK the Mortgage path. Never assert mortgage hover copy here.
 *
 * WHY. The line this replaces asserted the grouped "How a variable rate moves" hover — which
 * #412 / §18.8 (440053e, 2026-07-22) deliberately RETIRED when it de-grouped the Mortgage cluster
 * into five per-field hovers. _gate_moat_18_8:45 asserts that same string must be ABSENT. So two
 * gates demanded opposite things about one string: a permanent red by construction, and this gate
 * sat red for four days holding a contract that had been authorized out of existence.
 * Anchoring on copy is what rotted. Anchor on structure. */
let _vc = extractFn(s, '_variableRateClusterHTML');
if (FORKHLF) {                       // a second renderer = the fork this check exists to forbid
  _vc = _vc.replace('var _hlF = function', 'var _hlF = function (a,b,c,d) { return ""; };\n        var _hlF = function');
}
if (DROPMTG) {                       // amputate everything after the HELOC branch
  const g0 = _vc.indexOf("=== 'HELOC'");
  let o0 = _vc.indexOf('{', g0), d0 = 0, c0 = -1;
  for (let j = o0; j < _vc.length; j++) { if (_vc[j] === '{') d0++; else if (_vc[j] === '}') { d0--; if (!d0) { c0 = j; break; } } }
  if (c0 > 0) _vc = _vc.slice(0, c0 + 1);
}
const _g = _vc.indexOf("=== 'HELOC'");
let _open = _vc.indexOf('{', _g), _depth = 0, _close = -1;
for (let j = _open; j >= 0 && j < _vc.length; j++) {
  if (_vc[j] === '{') _depth++;
  else if (_vc[j] === '}') { _depth--; if (_depth === 0) { _close = j; break; } }
}
const _mortgageTail = _close > 0 ? _vc.slice(_close + 1) : '';
need('shared _hlF renderer defined exactly ONCE (HELOC did not fork it)',
  (_vc.match(/var _hlF\s*=\s*function/g) || []).length === 1);
need('Mortgage branch still present after the HELOC gate (not deleted)',
  _close > 0 && _mortgageTail.length > 500);
need('Mortgage branch still routes through the shared _hlF',
  /_hlF\(/.test(_mortgageTail));

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
