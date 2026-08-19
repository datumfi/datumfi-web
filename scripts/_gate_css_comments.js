/* CSS COMMENT INTEGRITY GATE — an unterminated /* comment silently DELETES the rules after it.
 *
 * THIS IS A DEMONSTRATED CLASS, NOT A HYPOTHETICAL ONE. 2026-08-19, commit 50976bc's working
 * draft: an explanatory comment added above `.hud-panel` in studio.html was never closed. It
 * swallowed `.hud-panel` and `.hud-title` whole. On the page that meant .hud-panel had no
 * background, no backdrop-filter and NO PADDING — #estate-analysis rendered 261x13 instead of
 * 261x51 — and nothing said a word.
 *
 * ⛔⛔ WHY THE EXISTING PROOF DID NOT CATCH IT, WHICH IS THE REASON THIS GATE EXISTS:
 * the acceptance was a DIFFERENTIAL screenshot — shipped bytes vs the same change reverted in the
 * served bytes. BOTH SIDES CARRIED THE BROKEN COMMENT, so the comparison came out clean.
 * 🔑 A CONTROL BROKEN IDENTICALLY ON BOTH SIDES OF A COMPARISON PROVES NOTHING. A differential
 *    proof is blind to any defect COMMON TO BOTH SIDES, and the whole studio split is old-vs-new
 *    comparisons — so this blindness is arc-wide, not local.
 * ⭐ THIS GATE IS THE ABSOLUTE PROOF: it asserts the file is what it should be, with no comparison
 *    in it at all.
 *
 * TWO LEGS, AND THE SECOND IS THE SHARPER ONE:
 *   L1 no CSS context ends while still inside a comment (an unterminated comment at EOF)
 *   L2 no `/*` is ever seen WHILE ALREADY INSIDE a comment. CSS has no nested comments, so an
 *      opener inside a comment means an earlier comment ran past its intended end and ate
 *      whatever was between. THIS IS THE LEG THAT CATCHES THE REAL DEFECT: my comment DID
 *      eventually terminate — on the NEXT comment's closing marker — so a naive balance count
 *      would have gone green the moment the file happened to contain another comment after it.
 *
 * POPULATION: derived from `git ls-files -z` (⛔ -z — see 083d56c; git escapes non-ASCII paths and
 * splitting the plain output on newlines silently drops them). Every tracked .css file, and every
 * <style> block in every tracked .html file. NEVER a hand-listed set.
 *
 * RED-FIRST — TWO CONTROLS, BECAUSE ONE LEG EACH:
 *   `--unterminate` deletes the LAST closing marker in a studio.html <style> block, so the comment
 *                   runs to EOF with no later opener to eat. L1 fires, L2 CANNOT.
 *   `--swallow`     deletes an EARLY closing marker, so the comment runs on and eats the NEXT
 *                   comment's opener and every rule between. L2 fires. ⛔ THIS IS THE ONE THAT
 *                   REPRODUCES THE REAL DEFECT — the 2026-08-19 comment terminated eventually, on
 *                   somebody else's marker, which is exactly why a balance count would have gone
 *                   green. A CONTROL MUST FAIL IN THE SHAPE OF THE CLAIM, and --unterminate does
 *                   not fail in this one's shape.
 *   `--nopop`       empties the population; the gate must ABORT rather than report a clean zero.
 *                   AN EXCLUSION NEEDS PRESENCE.
 *
 * Usage: node scripts/_gate_css_comments.js [LABEL] [--unterminate] [--swallow] [--nopop]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LABEL = (process.argv[2] && process.argv[2].charAt(0) !== '-') ? process.argv[2] : 'RUN';
const UNTERM = process.argv.includes('--unterminate');
const SWALLOW = process.argv.includes('--swallow');
const NOPOP = process.argv.includes('--nopop');

let tracked;
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);
} catch (e) {
  console.error('POPULATION UNAVAILABLE — git ls-files failed. A gate that cannot build its population is not a pass.');
  process.exit(2);
}

/* A "CSS context" is a whole .css file, or one <style>…</style> block inside an .html file.
   Each is parsed on its own: a comment cannot span two <style> elements. */
function contexts(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const src = fs.readFileSync(abs, 'utf8');
  if (rel.endsWith('.css')) return [{ rel, which: 'file', text: src, offset: 0 }];
  const out = [];
  const re = /<style\b[^>]*>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length;
    const end = src.indexOf('</style', start);
    if (end < 0) continue;
    out.push({ rel, which: '<style> @' + (src.slice(0, m.index).split('\n').length), text: src.slice(start, end), offset: start });
  }
  return out;
}

const POP = NOPOP ? [] : tracked.filter((f) => f.endsWith('.css') || f.endsWith('.html'));
const ctxs = [];
for (const f of POP) ctxs.push(...contexts(f));

if (ctxs.length === 0) {
  console.error('!! NO CSS CONTEXTS FOUND — the population is empty, so every assertion below would');
  console.error('!! pass vacuously. AN EXCLUSION NEEDS PRESENCE. Aborting instead of reporting green.');
  process.exit(2);
}

/* the injury, in memory only */
if (UNTERM) {
  const target = ctxs.find((c) => c.rel === 'studio.html' && c.text.indexOf('*/') >= 0);
  if (!target) { console.error('!! --unterminate found no studio.html context carrying a comment. ABORT.'); process.exit(2); }
  const at = target.text.lastIndexOf('*/');
  target.text = target.text.slice(0, at) + '  ' + target.text.slice(at + 2);
  console.log('   [--unterminate] removed the LAST closing marker in ' + target.rel + ' ' + target.which + ' — POISON LANDED');
}
if (SWALLOW) {
  /* an EARLY marker, and it must have at least one later opener to eat — otherwise this control
     degenerates into --unterminate and proves L1 twice instead of L2 once. */
  const target = ctxs.find((c) => {
    if (c.rel !== 'studio.html') return false;
    const first = c.text.indexOf('*/');
    return first >= 0 && c.text.indexOf('/*', first) >= 0;
  });
  if (!target) { console.error('!! --swallow found no studio.html context with a marker followed by a later opener. ABORT.'); process.exit(2); }
  const at = target.text.indexOf('*/');
  const laterOpeners = (target.text.slice(at).match(/\/\*/g) || []).length;
  target.text = target.text.slice(0, at) + '  ' + target.text.slice(at + 2);
  console.log('   [--swallow] removed the FIRST closing marker in ' + target.rel + ' ' + target.which +
              ' — ' + laterOpeners + ' later comment opener(s) are now inside it. POISON LANDED');
}

let pass = 0, fail = 0;
const l1 = [], l2 = [];
function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

for (const c of ctxs) {
  const t = c.text;
  let i = 0, inComment = false, openedAt = -1;
  while (i < t.length - 1) {
    if (!inComment && t[i] === '/' && t[i + 1] === '*') { inComment = true; openedAt = i; i += 2; continue; }
    if (inComment && t[i] === '/' && t[i + 1] === '*') {
      l2.push({ c, open: lineOf(t, openedAt), swallowed: lineOf(t, i) });
      i += 2; continue;
    }
    if (inComment && t[i] === '*' && t[i + 1] === '/') { inComment = false; openedAt = -1; i += 2; continue; }
    i++;
  }
  if (inComment) l1.push({ c, open: lineOf(t, openedAt) });
}

const ok = (cond, label) => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + label); };

console.log('[' + LABEL + '] CSS COMMENT INTEGRITY');
console.log('   population: ' + POP.length + ' tracked .css/.html files -> ' + ctxs.length + ' CSS contexts');

ok(l1.length === 0, 'L1 no CSS context ends inside an unterminated comment' +
   (l1.length ? ' — ' + l1.length + ' found' : ''));
l1.forEach((x) => console.log('       ' + x.c.rel + ' ' + x.c.which + ' — comment opened at context line ' + x.open + ' never closes'));

ok(l2.length === 0, 'L2 no "/*" appears while already inside a comment (an earlier comment ate the rules between)' +
   (l2.length ? ' — ' + l2.length + ' found' : ''));
l2.forEach((x) => console.log('       ' + x.c.rel + ' ' + x.c.which + ' — comment opened at context line ' + x.open +
                              ' swallows the opener at context line ' + x.swallowed));

const overall = fail === 0 ? 'GREEN' : 'RED';
console.log('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
if ((UNTERM || SWALLOW) && fail === 0) {
  console.error('❌ RED-FIRST INERT — a closing marker was deleted and the gate still passed. This control proves nothing.');
  process.exit(1);
}
process.exit(fail === 0 ? 0 : 1);
