/* _census_deleted_pta_rule.js — §82.2367, APPLIED PROPERLY: ENUMERATE BY VALUE, NOT BY NAME.
 *
 * ⛔⛔ WHY THIS EXISTS. The plan-through floor `max(75, RA + 20)` was deleted on 2026-09-14. The
 * deletion was enumerated BY NAME — PTA_GAP, PTA_MIN_FLOOR, minPlanEnd, _planEndAgeMin — and that
 * census reported THREE files. It was wrong twice over:
 *   · sketch.html carries SEVEN copies and returns ZERO for every one of those names.
 *   · Two SHIPPED scripts carry more, and were not looked at at all.
 * A RULE CAN BE IMPLEMENTED WITHOUT BEING NAMED, AND A NAME-BASED CENSUS CANNOT SEE IT.
 *
 * ⚠️ IT COUNTS LIVE CODE, NOT PROSE. Tombstone comments quote the deleted arithmetic verbatim —
 * that is good practice and it is exactly what makes a literal grep lie in the other direction
 * (§82.2332). COMMENTS are stripped before counting.
 * ⛔ STRING LITERALS ARE **NOT** STRIPPED, AND THIS FILE SAID THEY WERE UNTIL 2026-09-14. That was a
 * false claim about my own instrument, caught by its own output: it counted a gate CHECK LABEL that
 * merely names the deleted rule. A CENSUS THAT MISDESCRIBES ITS OWN METHOD IS A CENSUS NOBODY CAN
 * AUDIT. Expect one or two label hits in _ files and read them as such until a stripper that also
 * removes string literals exists — which is a real gap, not a rounding error.
 *
 * ⚠️ IT DECLARES ITS POPULATION: every tracked .js/.mjs/.html in the repo, from `git ls-files`.
 * A census over a directory walk would silently include build output and untracked scratch.
 *
 * Run: node scripts/_census_deleted_pta_rule.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { stripComments } = require('./_studio_source.cjs');

const ROOT = path.resolve(__dirname, '..');

/* The rule's SHAPE, in every spelling it is written in across this repo. Anchored on the two
   magic numbers together, because 75 alone is a slider bound and 20 alone is everywhere. */
const SHAPES = [
  /Math\.max\(\s*75\s*,[^;]{0,80}?\+\s*20/,   // max(75, <age> + 20)
  /\+\s*20\s*\)[^;]{0,40}?\b75\b/,            // the operands in the other order
  /RA\s*\+\s*20/,                             // named in prose-as-code
];

const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter((f) => /\.(js|mjs|html)$/.test(f));

const SHIPPED = (f) => {
  if (!/^scripts\//.test(f)) return !/^scripts\//.test(f);       // root .html are surfaces
  if (/^scripts\/_/.test(f)) return false;                        // _ prefix = gate/fixture/tooling
  return true;
};

const rows = [];
let total = 0, shippedTotal = 0;
for (const f of files) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
  const code = stripComments(src);
  let c = 0;
  for (const line of code.split('\n')) {
    if (SHAPES.some((re) => re.test(line))) c++;
  }
  if (c) { rows.push({ f, c, shipped: SHIPPED(f) }); total += c; if (SHIPPED(f)) shippedTotal += c; }
}

rows.sort((a, b) => b.c - a.c);
console.log('\nTHE DELETED PLAN-THROUGH FLOOR — max(75, RA+20) — SURVIVING IN LIVE CODE');
console.log('population: every tracked .js/.mjs/.html (git ls-files); COMMENTS stripped, string literals NOT\n');
console.log('  count  shipped?  file');
for (const r of rows) {
  console.log('  ' + String(r.c).padStart(5) + '  ' + (r.shipped ? 'SHIPPED ' : 'test    ') + '  ' + r.f);
}
console.log('  -----');
console.log('  ' + String(total).padStart(5) + '            TOTAL surviving');
console.log('  ' + String(shippedTotal).padStart(5) + '            of which are IN THE SHIPPED PRODUCT');
console.log('\n⛔ A rule in N places is a rule in one place and N-1 branches waiting to disagree.');
