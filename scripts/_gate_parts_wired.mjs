/* @gate-pool: node */
/* ══ THE REGISTRY↔SCRIPT-TAG GATE — THE OTHER DIRECTION ═════════════════════════════════════════
 *
 * ⛔⛔ THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE, STATED AS THE FAILURE IT PRODUCES:
 * MOVE A FUNCTION INTO A REGISTERED PART, FORGET THE <script src> ON THE PAGE, AND EVERY SANDBOX
 * GATE STAYS GREEN WHILE THE REAL PAGE HAS AN UNDEFINED FUNCTION.
 *
 * It is available on EVERY extraction commit of the split arc, and it is §25.4 — the change that
 * broke every lien-carrying room while four estate gates stayed green — reproduced by the very
 * instrument built to prevent it.
 *
 * WHY THE INSTRUMENT CANNOT SEE IT, PROVEN BY CONSTRUCTION RATHER THAN BY COUNTING:
 *   studioSource() = compose(readFileSync(STUDIO_PATH), readParts())
 *   readParts() reads the PARTS[] array.
 * ⇒ NOTHING IN THAT PATH EVER PARSES MARKUP. The gates' view of the source is byte-identical whether
 *   or not any page carries the tag. That is not a gap in a gate; it is a property of the harness.
 *
 * ⭐ AND THE BUILD GUARDS ONLY THE OPPOSITE, LOUDER MISTAKE. build-dist.mjs's dangling-asset guard
 * runs ONE DIRECTION: referenced ⇒ must exist. A dangling reference is a 404 — loud, immediate,
 * visible. A registered-but-unreferenced part is a SILENT undefined function that surfaces only when
 * a user clicks the thing that needs it.
 * 🔑 WE GUARDED THE LOUD MISTAKE AND LEFT THE QUIET ONE OPEN. The SACRED map reconcile learned this
 *    exact lesson one layer up — it now checks BOTH directions — and this is the same fix on a new
 *    surface. A LAW APPLIED IN ONE DIRECTION IS HALF A LAW.
 *
 * ⛔ AND THE INCENTIVE RUNS THE WRONG WAY, WHICH IS WHY THIS CANNOT BE LEFT TO CARE:
 * THE EASIEST GATE TO WRITE IS THE ONE BLIND TO THIS DEFECT. Sandbox gates are cheap; browser gates
 * are slow and fiddly. The upkeep part survives today only because a real-page gate happens to cover
 * it — GOOD JUDGEMENT, NOT A RULE. The nominated Step-2a trio proves the point numerically:
 * calculateTotalPmt / calculateEscrowMonthly / hasEscrow carry 49 gate-references between them and
 * ZERO of those gates run in a browser.
 *
 * ── ⭐ HOW IT DECIDES WHICH PAGES NEED WHICH PART — DERIVED, NEVER DECLARED ─────────────────────
 * A hand-maintained {part → pages} manifest was REFUSED. This repo has been bitten repeatedly by
 * hand-maintained lists wearing numbers, and such a manifest would rot on precisely the commit that
 * matters: the one that adds the eighth page. So the requirement is DERIVED from the code:
 *
 *     a page that CALLS a function which ONLY a part defines MUST load that part.
 *
 * That rule needs no registry of pages, adapts itself as the split creates them, and is true of a
 * repo with one page and a repo with fifty.
 *
 * ⚠️ §10.3 — IT MUST GENERALISE TO SEVEN PAGES, NOT ONE, AND TODAY ONLY ONE REAL PAGE LOADS A PART.
 * So the real-repo audit ALONE would be a mechanism exercised by a single example — the "fixture
 * that never builds the failing state" trap, applied to our own instrument. The SYNTHETIC DRIVE
 * below runs the SAME auditor over a seven-page fixture where page 5 references without loading, and
 * requires it to be caught BY NAME. ⛔ THE AUDITOR IS PURE AND EXPORTED SO THAT DRIVE IS THE REAL
 * CODE PATH AND NOT A RESTATEMENT OF IT — the same reason compose() is exported in _studio_source.
 * 🔑 A GATE THAT ONLY KNOWS studio.html GOES BLIND ON THE DAY THE SPLIT SUCCEEDS — AND THAT IS THE
 *    DAY WE WILL TRUST IT MOST.
 *
 * ── CONTROLS ────────────────────────────────────────────────────────────────────────────────────
 *   --redfirst    delete the real <script src> for a registered part from studio.html (in memory).
 *                 THE DEFECT ITSELF. W4 must go RED.
 *   --misordered  move that tag to the END of the page. The tag exists, so --redfirst passes; the
 *                 function is still undefined at first use. W5 must go RED.
 * Both mutations COUNT THEIR ANCHOR and abort unless it lands exactly once.
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');

const RED = process.argv.some((a) => a === '--redfirst' || a.startsWith('--redfirst='));
const MIS = process.argv.some((a) => a === '--misordered' || a.startsWith('--misordered='));
/* ⛔ WHICH PART THE CONTROL MUTATES USED TO BE HARD-CODED TO REGISTERED[0], SO FOUR OF THE FIVE
   PARTS WERE NEVER EXERCISED BY ANY CONTROL. That went unnoticed while every part had the same
   shape; Move 1a added one with a DIFFERENT shape (a `window.X = function` assignment, which
   partSurface could not see at all until this commit), and a control that never touches the new
   shape cannot prove the auditor understands it. A CONTROL THAT ONLY EVER BUILDS ONE FIXTURE
   PROVES THE MECHANISM FOR THAT FIXTURE. Pass --redfirst=<substring> to aim it. */
const PICK = (process.argv.find((a) => a.startsWith('--redfirst=') || a.startsWith('--misordered=')) || '').split('=')[1] || '';

let pass = 0, fail = 0;
const ck = (label, cond, note) => {
  if (cond) { pass++; console.log('PASS ' + label + (note ? '  — ' + note : '')); }
  else { fail++; console.log('FAIL ' + label + (note ? '  — ' + note : '')); }
};

/* ══ THE AUDITOR — PURE, SO THE SYNTHETIC DRIVE RUNS THE REAL CODE ══════════════════════════════ */

/** Top-level declarations in a part — the surface it publishes to the global scope.
 *  ⛔⛔ TWO FORMS, AND THE SECOND WAS ADDED BECAUSE THIS GATE WENT VACUOUS ON A REAL PART.
 *  Until Move 1a every part published plain `function NAME(` declarations, so that one pattern was
 *  the whole surface. scripts/studio-account-modal.js publishes `window.openAccountModal = function`
 *  instead — an assignment, not a declaration — and the form is LOAD-BEARING (five §20 gates anchor
 *  on that literal), so it cannot be converted to suit the matcher.
 *  ⇒ THE PART SCORED A SURFACE OF ZERO, W3 CAUGHT IT, and had W3 not existed the entire
 *  registration↔tag audit for the largest part in the repo would have audited NOTHING: no names in
 *  the surface means no page is ever found to need the tag, so deleting the <script src> would have
 *  stayed green. That is this gate's own defect, reproduced on this gate, by a new part shape.
 *  🔑 AN AUDITOR THAT ONLY KNOWS THE SHAPES IT HAS ALREADY SEEN GOES QUIET ON THE FIRST NEW ONE —
 *     and quiet reads exactly like clean.
 *  ⭐ ~~"BOTH PATTERNS ARE TEXT MATCHES AND NEITHER STRIPS COMMENTS… that exposure closes with the
 *  §82.24 helper, not here."~~ CLOSED 2026-08-22 — the helper landed and this is now the SECOND
 *  filter's call site. Struck rather than deleted so nobody re-derives the gap.
 *  ⚠️ The two filters are kept BOTH because they fail in different places: the stripper is
 *  oracle-exact but is a tokenizer over HTML+JS; line-start is trivially correct but blind to a
 *  comment whose line begins at column zero. Two filters that fail in the same place are one filter
 *  and a false sense of depth. */
export function partSurface(text) {
  /* ⭐ SECOND FILTER (§82.24, 2026-08-22): comments are stripped before matching, so a header that
     QUOTES a definition cannot be counted as one. The line-start rules below are the FIRST filter
     and stay — the two fail in different places, which is the only reason to have both. */
  const src = stripComments(text);
  const out = [];
  for (const m of src.matchAll(/^[ \t]{0,6}function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\(/gm)) out.push(m[1]);
  for (const m of src.matchAll(/^[ \t]{0,6}window\.([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]+)?function\b/gm)) out.push(m[1]);
  return [...new Set(out)];
}

/** Does this page define the name ITSELF? Then it does not need the part for that name. */
function pageDefines(text, name) {
  const n = name.replace(/\$/g, '\\$');
  return new RegExp('(?:function[ \\t]+' + n + '[ \\t]*\\()|(?:\\b' + n + '[ \\t]*=[ \\t]*(?:function|async|\\())').test(text);
}

/** Index of the first CALL or typeof-probe of `name`, or -1. */
function firstUse(text, name) {
  const n = name.replace(/\$/g, '\\$');
  /* ⭐ A CALL OR A typeof PROBE — NOT A BARE MENTION. Prose in a comment that names a function is not
     a dependency, and treating it as one would cry wolf on a page whose only sin is being commented.
     ⚠️ typeof IS DELIBERATELY INCLUDED: a typeof-guarded call is a DEGRADATION path, not an optional
     one. CLAUDE.md records exactly that — _propUpkeepCatalogue's typeof guard would have silently
     degraded every property's upkeep window rather than erroring. A SILENT DEGRADE IS THE DEFECT
     THIS GATE IS ABOUT, so a page that typeof-probes a part function still has to load the part. */
  const m = new RegExp('(?:\\b' + n + '[ \\t]*\\()|(?:typeof[ \\t]+' + n + '\\b)').exec(text);
  return m ? m.index : -1;
}

/** Index of the `<script src=".../rel">` tag that loads this part, or -1. */
function tagIndex(text, rel) {
  const base = rel.split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp('<script[^>]+src\\s*=\\s*["\'][^"\']*' + base + '["\']', 'i').exec(text);
  return m ? m.index : -1;
}

/**
 * THE ONE RULE, APPLIED TO EVERY (page × part) PAIR.
 * @param {Array<{rel:string,text:string}>} parts
 * @param {Array<{name:string,text:string}>} pages
 * @returns {{missing:Array, misordered:Array}}
 */
export function auditPages(parts, pages) {
  const missing = [], misordered = [];
  for (const part of parts) {
    const surface = partSurface(part.text);
    for (const page of pages) {
      const needed = surface.filter((fn) => !pageDefines(page.text, fn) && firstUse(page.text, fn) >= 0);
      if (!needed.length) continue;                        // page does not use the part — nothing owed
      const ti = tagIndex(page.text, part.rel);
      if (ti < 0) { missing.push({ page: page.name, part: part.rel, fns: needed }); continue; }
      const earliest = Math.min(...needed.map((fn) => firstUse(page.text, fn)));
      if (ti > earliest) misordered.push({ page: page.name, part: part.rel, tagAt: ti, usedAt: earliest });
    }
  }
  return { missing, misordered };
}

/* ══ THE REAL REPO ══════════════════════════════════════════════════════════════════════════════ */
/* pathToFileURL, not a bare path: on Windows an absolute path starts "C:" and the ESM loader reads
   that as an unsupported URL scheme. _gate_studio_source.mjs resolves its own import the same way. */
const { PART_RELS, readParts, stripComments } = await import(pathToFileURL(path.join(REPO, 'scripts/_studio_source.cjs')).href);
const REGISTERED = PART_RELS();

/* -z so filenames with non-ASCII survive verbatim — git quotes them otherwise and the read ENOENTs
   on exactly the files whose names are hardest to notice are missing. */
const tracked = execFileSync('git', ['ls-files', '-z', '*.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\0').filter(Boolean);

let pages = tracked.map((rel) => ({ name: rel, text: readFileSync(path.join(REPO, rel), 'utf8') }));

/* ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────── */
function mutatePage(name, fn, label) {
  const i = pages.findIndex((p) => p.name === name);
  if (i < 0) { console.error('mutation ' + label + ': page ' + name + ' not found'); process.exit(1); }
  const before = pages[i].text;
  const after = fn(before);
  if (after === before) { console.error('mutation ' + label + ': did not change ' + name + ' — the control proves nothing.'); process.exit(1); }
  pages[i] = { name, text: after };
}
if (RED || MIS) {
  const rel = PICK ? REGISTERED.find((r) => r.includes(PICK)) : REGISTERED[0];
  if (!rel) { console.error('--redfirst/--misordered: no registered part' + (PICK ? ' matching "' + PICK + '"' : '') + '.'); process.exit(1); }
  const base = rel.split('/').pop();
  const re = new RegExp('[ \\t]*<script[^>]+src\\s*=\\s*["\'][^"\']*' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>\\s*</script>\\s*\\n?', 'i');
  mutatePage('studio.html', (t) => {
    const hits = t.match(new RegExp(re.source, 'gi')) || [];
    if (hits.length !== 1) { console.error('mutation anchor: expected exactly 1 script tag for ' + base + ', found ' + hits.length + ' — re-ground it.'); process.exit(1); }
    const stripped = t.replace(re, '');
    return MIS ? stripped + '\n<script src="/' + rel + '"></script>\n' : stripped;
  }, MIS ? '--misordered' : '--redfirst');
  console.log('   [control] ' + (MIS ? '--misordered' : '--redfirst') + ' applied to studio.html for ' + rel);
}

const partObjs = readParts().map((p) => ({ rel: p.rel, text: p.text }));

/* ── W · THE REAL AUDIT ────────────────────────────────────────────────────────────────────────── */
console.log('\n── W · REAL REPO ──');
ck('W1 the parts registry is NON-EMPTY (an empty registry makes every leg below vacuous)',
   REGISTERED.length > 0, REGISTERED.length + ' part(s): ' + REGISTERED.join(', '));

const trackedSet = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean));
ck('W2 every registered part is GIT-TRACKED (an untracked part is a green build shipping a 404)',
   REGISTERED.every((r) => trackedSet.has(r)),
   REGISTERED.filter((r) => !trackedSet.has(r)).join(', ') || 'all tracked');

const surfaces = partObjs.map((p) => ({ rel: p.rel, fns: partSurface(p.text) }));
ck('W3 every registered part publishes ≥1 top-level function (an empty surface audits nothing)',
   surfaces.every((s) => s.fns.length > 0),
   surfaces.map((s) => s.rel + ':' + s.fns.length).join(' · '));

const { missing, misordered } = auditPages(partObjs, pages);
ck('W4 ⭐ every page that CALLS a part function LOADS that part',
   missing.length === 0,
   missing.length ? missing.map((m) => m.page + ' uses [' + m.fns.join(', ') + '] but never loads ' + m.part).join(' | ')
                  : pages.length + ' tracked page(s) audited, 0 violations');

ck('W5 ⭐ and loads it BEFORE the first use (a tag after the call is still undefined at call time)',
   misordered.length === 0,
   misordered.length ? misordered.map((m) => m.page + ': tag@' + m.tagAt + ' but ' + m.part + ' used@' + m.usedAt).join(' | ')
                     : 'no ordering violations');

/* ── S · THE SYNTHETIC SEVEN-PAGE DRIVE (§10.3) ────────────────────────────────────────────────── */
console.log('\n── S · SYNTHETIC N-PAGE DRIVE (proves it generalises past studio.html) ──');
const SYN_PART = [{ rel: 'scripts/syn-part.js', text: 'function _synAlpha(a) { return a; }\nfunction _synBeta(b) { return b; }\n' }];
const TAG = '<script src="/scripts/syn-part.js"></script>';
const synPages = [
  { name: 'p1-loads-and-uses.html', text: TAG + '\n<script>\nfunction go(){ return _synAlpha(1); }\n</script>' },
  { name: 'p2-no-reference.html', text: '<script>\nfunction go(){ return 42; }\n</script>' },
  { name: 'p3-defines-locally.html', text: '<script>\nfunction _synAlpha(a){ return a; }\nfunction go(){ return _synAlpha(1); }\n</script>' },
  { name: 'p4-loads-and-uses-beta.html', text: TAG + '\n<script>\nfunction go(){ return _synBeta(2); }\n</script>' },
  { name: 'p5-USES-BUT-NEVER-LOADS.html', text: '<script>\nfunction go(){ return _synAlpha(1) + _synBeta(2); }\n</script>' },
  { name: 'p6-mentions-in-a-comment-only.html', text: '<script>\n/* _synAlpha is documented here but never called */\nfunction go(){ return 7; }\n</script>' },
  { name: 'p7-TAG-AFTER-USE.html', text: '<script>\nfunction go(){ return _synAlpha(1); }\n</script>\n' + TAG }
];
const syn = auditPages(SYN_PART, synPages);
const missNames = syn.missing.map((m) => m.page);
const misNames = syn.misordered.map((m) => m.page);

ck('S1 ⭐⭐ page 5 of 7 — uses the part, never loads it — is CAUGHT BY NAME',
   missNames.length === 1 && missNames[0] === 'p5-USES-BUT-NEVER-LOADS.html', 'missing: [' + missNames.join(', ') + ']');
ck('S2 and it names BOTH functions it depends on (a violation you cannot act on is half a report)',
   syn.missing.length === 1 && syn.missing[0].fns.join(',') === '_synAlpha,_synBeta',
   syn.missing.length ? syn.missing[0].fns.join(',') : 'none');
ck('S3 pages that load-and-use (p1, p4) are NOT flagged', !missNames.includes('p1-loads-and-uses.html') && !missNames.includes('p4-loads-and-uses-beta.html'), 'clean');
ck('S4 a page that DEFINES the name itself (p3) is NOT flagged — a local definition owes nothing', !missNames.includes('p3-defines-locally.html'), 'clean');
ck('S5 a page that never references it (p2) is NOT flagged', !missNames.includes('p2-no-reference.html'), 'clean');
ck('S6 a bare MENTION in a comment (p6) is NOT a dependency — the guard must not cry wolf', !missNames.includes('p6-mentions-in-a-comment-only.html'), 'clean');
ck('S7 ⭐ p7 loads the part AFTER first use — caught by the ORDERING leg, not the missing leg',
   misNames.length === 1 && misNames[0] === 'p7-TAG-AFTER-USE.html' && !missNames.includes('p7-TAG-AFTER-USE.html'),
   'misordered: [' + misNames.join(', ') + ']');
ck('S8 SELF-CHECK — the auditor returns CLEAN when every page is wired correctly',
   (() => { const c = auditPages(SYN_PART, [synPages[0], synPages[1], synPages[2], synPages[3]]); return c.missing.length === 0 && c.misordered.length === 0; })(),
   'a checker that always finds something is not a checker');

/* ── VERDICT ───────────────────────────────────────────────────────────────────────────────────── */
console.log('');
if ((RED || MIS) && fail === 0) {
  console.error('❌ CONTROL INERT (inverted-dead) — the ' + (MIS ? 'tag was moved after its first use' : 'script tag was deleted')
    + ' and the gate still passed ' + pass + '/0. This control proves nothing; re-ground the mutation.');
  process.exit(1);
}
console.log((fail === 0 ? 'CLEAN  ' : '') + 'GREEN ' + pass + ' / RED ' + fail);
process.exit(fail === 0 ? 0 : 1);
