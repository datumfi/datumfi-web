/* ══ THE COMMENT-STRIPPER ORACLE — OPT-IN DEV TOOL, DELIBERATELY NOT A GATE ════════════════════
 *
 * WHAT IT IS. `stripComments()` in scripts/_studio_source.cjs is a hand-written JS tokenizer, and a
 * hand-written tokenizer is precisely the thing this repo has been bitten by. This script checks it
 * against an INDEPENDENT ORACLE — espree's real comment ranges, which know regex literals, template
 * interpolation and escapes — over every inline <script> block in studio.html and every gate file
 * in scripts/. Two questions, and they are NOT the same question:
 *
 *   1. Did it leave a real comment standing?   FALSE POSITIVE — a matcher may still match prose.
 *      LOUD: the downstream gate reds and somebody looks.
 *   2. Did it alter a byte of real code?       FALSE NEGATIVE — the matcher judges a SMALLER
 *      population and goes green over what it can no longer see. SILENT.
 * 🔑 A RESIDUAL IS NOT A NUMBER, IT IS A NUMBER AND A DIRECTION. Twelve in the loud direction is a
 *    different object from twelve in the quiet one. Report both separately; never sum them.
 *
 * ⛔ WHY IT IS NOT IN THE SUITE, AND WHY IT IS NOT A ONE-OFF EITHER. It needs espree, and the suite
 * must stay dependency-free — 233 gates cannot start depending on a parser to check a helper. But a
 * validation run kept OUTSIDE the repo is an instrument with an expiry date nobody set: it proves
 * the tokenizer as written on the day it ran, the tokenizer then gets edited, and the oracle never
 * runs again because nobody remembers it exists. So it lives HERE, in the repo, runnable on demand,
 * with its last measured result recorded below. The permanent regression is the FIXTURE BATTERY in
 * _gate_studio_source (one fixture per cause this oracle found), which needs no dependency at all.
 * ⭐ "In the suite" vs "nowhere" was a false choice.
 *
 * ── LAST MEASURED ───────────────────────────────────────────────────────────────────────────────
 *   2026-08-22, immediately after Move 1a (938314d), Node v25.9.0, espree 10.x
 *   population: 386 blocks/files carrying comments — every inline <script> in every root .html plus
 *               every .js/.mjs/.cjs in scripts/ — 12,553 real comments, 0 skipped as unparseable.
 *   result:     see the run itself. This header records the DATE and the POPULATION, never the
 *               verdict, because a verdict written in prose is a claim and the run is the evidence.
 * ⚠️ THE POPULATION IS THE PART THAT ROTS. An earlier cut of this file parsed 'script' only and
 *    skipped 121 files — every .mjs gate, i.e. most of the suite — while reporting a confident
 *    green over what was left. If this number ever falls, that is the finding.
 *
 * ── RUNNING IT ──────────────────────────────────────────────────────────────────────────────────
 *   npm i --no-save espree          (or set NODE_PATH to any node_modules that has it)
 *   node scripts/_oracle_strip_comments.mjs
 * Exit 0 = exact agreement · 1 = divergence · 2 = espree not installed (NOT a failure).
 *
 * ⛔ NAMED _oracle_, NOT _gate_. _suite_baseline globs ^(_gate_|_p\d) — a file named _gate_* here
 * would be executed as a gate, exit 2 on a machine without espree, and be counted a RED for a
 * reason that has nothing to do with the product.
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const require = createRequire(import.meta.url);
const { stripComments } = require('./_studio_source.cjs');

/* ESM import() ignores NODE_PATH; require() honours it. Trying both means this runs against a
   scratch node_modules WITHOUT installing anything into the repo — no package.json touched, no
   lockfile touched, so Doctrine #34 never comes into it for a tool the suite does not use. */
let espree;
try { espree = await import('espree'); }
catch {
  try { espree = require('espree'); }
  catch {
    console.log('espree not installed — this tool is OPT-IN and its absence is not a failure.');
    console.log('  npm i --no-save espree');
    console.log('  …or: NODE_PATH=/path/to/node_modules node scripts/_oracle_strip_comments.mjs');
    process.exit(2);
  }
}

const PARSE = { ecmaVersion: 'latest', sourceType: 'script', range: true, comment: true };

/** Every inline <script>…</script> body in an HTML file, line-padded so offsets stay honest. */
function inlineBlocks(html) {
  const lines = html.split('\n');
  const out = [];
  let open = -1;
  lines.forEach((l, i) => {
    if (/^\s*<script>\s*$/.test(l)) open = i + 1;
    else if (/^\s*<\/script>\s*$/.test(l) && open > 0) {
      out.push({ from: open + 1, to: i, text: lines.map((x, j) => (j >= open && j < i ? x : '')).join('\n') });
      open = -1;
    }
  });
  return out;
}

let totMissed = 0, totAte = 0, totComments = 0, checked = 0, unparseable = 0;
const skipped = [];
const divergences = [];

function check(label, text) {
  /* ⛔ TRY MODULE **AND** SCRIPT. The first cut parsed as 'script' only and skipped 121 files — every
     .mjs gate in the repo, i.e. most of the suite. A population silently narrowed to the files that
     happened to parse is the "smaller population" trap committed inside the instrument built to
     catch it. Skipped files are now COUNTED AND NAMED, so the exclusion can never be invisible. */
  let ast = null;
  for (const st of ['script', 'module']) {
    try { ast = espree.parse(text, { ...PARSE, sourceType: st }); break; } catch { /* try the next */ }
  }
  if (!ast) { unparseable++; skipped.push(label); return; }
  const comments = ast.comments || [];
  if (!comments.length) return;                 // nothing to prove here
  checked++; totComments += comments.length;
  const stripped = stripComments(text);
  if (stripped.length !== text.length) {
    divergences.push(`${label}: LENGTH CHANGED ${text.length} -> ${stripped.length}`);
    totAte++; return;
  }
  const inC = new Uint8Array(text.length);
  for (const cm of comments) for (let i = cm.range[0]; i < cm.range[1]; i++) inC[i] = 1;
  let missed = 0, ate = 0, firstAte = null, firstMissed = null;
  for (const cm of comments) {
    const seg = stripped.slice(cm.range[0], cm.range[1]);
    if (/[^\s]/.test(seg)) { missed++; if (!firstMissed) firstMissed = seg.trim().slice(0, 60); }
  }
  for (let i = 0; i < text.length; i++) {
    if (!inC[i] && text[i] !== stripped[i]) {
      ate++;
      if (!firstAte) firstAte = JSON.stringify(text.slice(Math.max(0, i - 50), i + 50));
    }
  }
  totMissed += missed; totAte += ate;
  if (missed || ate) {
    divergences.push(`${label}: missed=${missed} ate=${ate}` +
      (firstMissed ? `\n      first missed: ${firstMissed}` : '') +
      (firstAte ? `\n      first ATE (SILENT): ${firstAte}` : ''));
  }
}

// ── population 1: inline blocks in every tracked HTML page ──────────────────────────────────────
const htmls = fs.readdirSync(REPO).filter((f) => f.toLowerCase().endsWith('.html'));
for (const h of htmls) {
  const blocks = inlineBlocks(fs.readFileSync(path.join(REPO, h), 'utf8'));
  blocks.forEach((b, k) => check(`${h} <script> #${k + 1} (lines ${b.from}-${b.to})`, b.text));
}
// ── population 2: every script in scripts/ ──────────────────────────────────────────────────────
for (const f of fs.readdirSync(path.join(REPO, 'scripts')).filter((f) => /\.(js|mjs|cjs)$/.test(f))) {
  check('scripts/' + f, fs.readFileSync(path.join(REPO, 'scripts', f), 'utf8'));
}

console.log('══ COMMENT-STRIPPER ORACLE ══');
console.log('  files/blocks with comments checked :', checked);
console.log('  skipped as unparseable             :', unparseable, unparseable ? '-> ' + skipped.slice(0, 6).join(', ') + (skipped.length > 6 ? ' …' : '') : '');
console.log('  real comments in that population   :', totComments);
console.log('  comments LEFT STANDING (loud)      :', totMissed);
console.log('  CODE bytes ALTERED (silent)        :', totAte);
if (divergences.length) {
  console.log('\n── DIVERGENCES ──');
  divergences.slice(0, 25).forEach((d) => console.log('  ' + d));
  if (divergences.length > 25) console.log(`  … and ${divergences.length - 25} more`);
}
const ok = totMissed === 0 && totAte === 0;
console.log('\nVERDICT: ' + (ok ? 'EXACT AGREEMENT with the parser.' : 'DIVERGES — see above.'));
process.exit(ok ? 0 : 1);
