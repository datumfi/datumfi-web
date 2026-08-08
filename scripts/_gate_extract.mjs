/* DEV-ONLY shared gate harness — #407 finding (B): stop hand-listing callees.

   THE PROBLEM this kills. Node gates work by slicing named functions out of studio.html and executing them in a
   sandbox. Every gate hand-typed its own list of function names. So the moment a function gained a new callee,
   EVERY gate that sliced its caller crashed with "ReferenceError: <fn> is not defined" — a red that says nothing
   about the room's correctness. It has now happened three times:
     · the §19 arc — _moatDI gained _retireInfo/_targetPayment/_moatNegAm/the debt donut, killing
       _gate_moat_17_fred and _gate_moat_18_1 (both sat red for two arcs before anyone traced why)
     · #429 — _moatDI gained _moatRateMoves, killing SIX gates in one commit
     · #431 — _yardDebtPieHTML's real callees (_yardNetEquity -> _groundsLinkedDebt) defeated a hand-list twice
       while writing a single new gate

   THE FIX. Name only the ROOTS you care about; the closure is walked from the source itself. A new callee is
   picked up automatically, so a gate can only go red for a reason that is actually about the room.

   WHY IT IS SAFE. Only identifiers that studio.html actually defines as `function NAME(` are pulled in.
   Everything else — DOM, state, injected deps, built-ins — is left alone for the gate to stub or inject, so
   this changes nothing about the "inject the REAL fn whenever you assert a figure" discipline. */

// studio.html defines functions TWO ways, and both must be walkable or the rot just moves down a level:
//   1. `function NAME(...) {...}`            — most helpers
//   2. `window.NAME = function(...) {...}`   — the modal entry points (openAccountModal, openAmortizationModal,
//                                              _moatLumpEdit, _setMoatEscrowView …)
// Missing form 2 is exactly how #434 still broke two gates AFTER the closure walker landed: they sliced
// openAmortizationModal by marker and hand-listed ITS callees, so a new _amortRow/_amortTableHTML killed them.
//   3. `window.NAME = async function(...)`  — the async modal/network entry points
//      (groundsVerifyAndEstimate, …). Missing form 3 is why a gate slicing the verify-then-estimate path
//      threw "not found" against code that was plainly there: form 2's literal has no room for `async`.
//      Additive — this only runs when the first two forms miss, so no existing gate changes behaviour.
/* ⚠️ LINE-ANCHORED, FOR EXACTLY THE REASON THE BINDING PATH BELOW IS — and it took an outage to
 * finish the job. definesBinding was anchored on 2026-08-04 because a COMMENT that quotes a
 * declaration while explaining it is not a declaration. fnStart was left on a bare indexOf, so the
 * identical hole stayed open on the FUNCTION side, and on 2026-08-08 it cost two gates:
 *
 *   · studio.html:12102 — a comment warning future sessions that "the extractor keys on `function X(`"
 *   · studio.html:9969  — a comment added later quoting FEMA's «Zone C or X (Unshaded)»
 *
 * The walker read `X (` in the second as a callee, asked definesFn('X'), and the FIRST comment
 * answered YES. extractFn then sliced a phantom function out of prose and handed it to new Function,
 * which died on the backtick inside it. Neither comment is code; neither file was wrong. Two gates
 * guarding the RentCast spend cap stopped running — and because a crash is not a red (§13.68) they
 * reported no failing leg at all, only a SyntaxError.
 *
 * 🔑 A RESOLVER THAT READS COMMENTS AS CODE WILL EVENTUALLY SYNTHESISE A FUNCTION NOBODY WROTE OUT
 * OF TWO SENTENCES NOBODY CONNECTED. A definition begins its line; a mention inside prose does not.
 *
 * MEASURED BEFORE SHIPPING, over all 596 names studio.html + studio-blueprint.js define: 595 resolve
 * to the BYTE-IDENTICAL index they did under indexOf; exactly 1 changes — the phantom X, which now
 * resolves to nothing. ZERO definitions lost. Two details were measured, not reasoned:
 *   · `\(?` IS LOAD-BEARING. `(function restoreSession() {` and `(function prefillFromSketch() {`
 *     are real named IIFEs at statement position. Without the optional paren this fix LOSES them.
 *   · The index returned is the KEYWORD's, never the match start. Pointing at a leading `(` would
 *     make extractFn slice an unbalanced paren.
 *     ~~*"pointing at `async` would silently turn three sliced helpers async — a behaviour change
 *     nobody asked for."*~~ That was the call when this landed, and the CAPTAIN REVERSED IT the same
 *     day: dropping `async` is not neutral, it is a latent SyntaxError waiting for the first gate to
 *     lift one of those three. The index now starts at `async` when present. Struck rather than
 *     deleted so nobody re-derives the discarded reasoning.
 *
 * INDEXED ONCE PER SOURCE, NOT SCANNED PER LOOKUP. definesFn runs once per `ident(` per body —
 * thousands of times per gate. A per-name regex over 1.5MB measured 7x SLOWER than indexOf (1714ms
 * vs 240ms across 1500 lookups); one pass into a Map makes every lookup O(1), so this lands faster
 * than the thing it replaces rather than taxing 33 gates for a correctness fix. */
const FN_DEF_RE  = /^[ \t]*\(?[ \t]*(?:async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\(/gm;
const WIN_DEF_RE = /^[ \t]*window\.([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]+)?function/gm;
const _defCache = new Map();

/* FIRST declaration wins, preserving indexOf's precedence exactly: form 1 beats forms 2/3, and an
   earlier hit beats a later one. This is deliberately NOT the binding path's "ambiguity is a
   finding" rule — making duplicate function names fatal is a wider change than the one authorised
   here, and it would red gates that are green today. If that is ever wanted it is its own commit. */
function defIndex(src) {
  let idx = _defCache.get(src);
  if (idx) return idx;
  idx = { fn: new Map(), win: new Map() };
  for (const m of src.matchAll(FN_DEF_RE)) {
    if (idx.fn.has(m[1])) continue;
    /* START AT `async` WHEN IT IS THERE. The pre-2026-08-08 fnStart pointed at `function`, so an
       `async function NAME()` sliced WITHOUT its async and any `await` inside it became a
       SyntaxError. Three helpers are declared that way (startMatrixJob, _doStartJob, pollMatrixJob);
       no gate lifted one, so it stayed invisible — a loaded gun rather than a wound.
       ⚠️ THE GUARD IS NOT PARANOIA: a bare indexOf('async') would match the NAME in
       `function asyncFoo(` and return a position AFTER the keyword, slicing from the middle of the
       declaration. Only an `async` that precedes `function` is the keyword. */
    const fIdx = m[0].indexOf('function');
    const aIdx = m[0].indexOf('async');
    idx.fn.set(m[1], m.index + (aIdx >= 0 && aIdx < fIdx ? aIdx : fIdx));
  }
  for (const m of src.matchAll(WIN_DEF_RE)) if (!idx.win.has(m[1])) idx.win.set(m[1], m.index + m[0].indexOf('window'));
  _defCache.set(src, idx);
  return idx;
}

function fnStart(src, name) {
  const idx = defIndex(src);
  const a = idx.fn.get(name);
  if (a !== undefined) return a;
  const b = idx.win.get(name);
  return b === undefined ? -1 : b;                              // -1 when absent
}
/** True when studio.html defines `name` as a function in EITHER form. */
export function definesFn(src, name) {
  return fnStart(src, name) >= 0;
}
/** Slice one function out of src by brace-matching, in either definition form. Throws if absent. */
export function extractFn(src, name) {
  const start = fnStart(src, name);
  if (start < 0) throw new Error('extractFn: not found in studio.html: ' + name);
  let depth = 0, began = false;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') { depth++; began = true; }
    else if (src[j] === '}') { depth--; if (began && depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('extractFn: unbalanced braces: ' + name);
}

/* ── BINDINGS, NOT ONLY FUNCTIONS (§13.21, 2026-08-04) ───────────────────────────────────────────
 * studio.html declares load-bearing state as a BINDING too: `var RULE_SCOPE = {…}` is what
 * _ruleInScope reads to decide whether a rule may fire at all. fnStart() cannot see a binding, so
 * every gate that sliced _yardIntelligence hand-wrote its OWN `var RULE_SCOPE = \{[^}]*\};` regex —
 * EIGHT copies of one fact: a hand-maintained list wearing a different hat. Adding a SECOND binding
 * to that closure broke all eight in a single commit (measured, not predicted).
 *
 * ⚠️ WHY THE MATCH IS LINE-ANCHORED, and it is not fussiness. The naive regex those eight gates used
 * matches TWICE in today's studio.html: the real declaration at 11020, and a COMMENT at 11062 that
 * quotes the declaration while explaining it. It is harmless only because String.match without /g
 * returns the first — so the day that comment moves above the declaration, or the declaration is
 * renamed, all eight silently lift `var RULE_SCOPE = {…};` and slice a syntax error into the sandbox.
 * A real declaration begins its line; a mention inside a comment does not.
 *
 * ⚠️ AND AMBIGUITY IS LOUD. Two declarations answering one name is not a thing to resolve by taking
 * the first — it is a finding. Same rule as selecting a button by label. */
const IDENT = (n) => String(n).replace(/[$]/g, '\\$');
const bindingRe = (name) => new RegExp('^[ \\t]*(?:var|let|const)[ \\t]+' + IDENT(name) + '[ \\t]*=', 'gm');

/** True when src declares `name` as a top-of-line var/let/const binding. */
export function definesBinding(src, name) {
  return [...src.matchAll(bindingRe(name))].length === 1;
}

/** Slice `var|let|const NAME = <initializer>;` out of src — brace, bracket and quote aware. */
export function extractBinding(src, name) {
  const hits = [...src.matchAll(bindingRe(name))];
  if (!hits.length) throw new Error('extractBinding: no binding declaration for ' + name);
  if (hits.length > 1) {
    throw new Error('extractBinding: AMBIGUOUS — ' + hits.length + ' declarations of ' + name +
      ' at lines ' + hits.map((h) => src.slice(0, h.index).split('\n').length).join(', ') +
      '. Refusing to guess which one the product uses.');
  }
  const start = hits[0].index + hits[0][0].length - hits[0][0].replace(/^[ \t]*/, '').length;
  let depth = 0, quote = null;
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (quote) { if (c === '\\') { j++; continue; } if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ';' && depth === 0) return src.slice(start, j + 1);
  }
  throw new Error('extractBinding: no terminating ; at depth 0 for ' + name);
}

/**
 * THE ONE ENTRY POINT. Lift a named declaration out of src whatever form it takes: a function
 * (all three forms fnStart knows) or a var/let/const binding. Gates call this and stop caring.
 * Throws — loudly and by name — when src declares neither, because a resolver that silently
 * returned '' would inject nothing and fail later somewhere less legible.
 */
export function lift(src, name) {
  if (definesFn(src, name)) return extractFn(src, name);
  if (definesBinding(src, name)) return extractBinding(src, name);
  if ([...src.matchAll(bindingRe(name))].length > 1) return extractBinding(src, name);   // throws the AMBIGUOUS message
  throw new Error('lift: source declares no function or binding named ' + name);
}

/**
 * Transitive closure of `roots` over the functions studio.html defines.
 * @param {string} src      studio.html
 * @param {string[]} roots  the functions the gate actually cares about
 * @param {{exclude?: string[]}} [opts]  names to STOP at — use when a gate deliberately injects its own
 *                                       version of a dependency (e.g. a _retireOverride-aware stub).
 * @returns {string} concatenated source, each function once, safe to hand to new Function()
 */
export function extractClosure(src, roots, opts) {
  const exclude = new Set((opts && opts.exclude) || []);
  const out = new Map();
  const stack = roots.slice();
  while (stack.length) {
    const name = stack.pop();
    if (out.has(name) || exclude.has(name)) continue;
    const body = extractFn(src, name);
    out.set(name, body);
    // every `ident(` in the body that studio.html defines as a function is a real callee
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const cand = m[1];
      if (out.has(cand) || exclude.has(cand) || cand === name) continue;
      if (definesFn(src, cand)) stack.push(cand);
    }
  }
  return Array.from(out.values()).join('\n');
}

/** Names resolved by extractClosure — for a gate that wants to report or assert its own dependency set. */
export function closureNames(src, roots, opts) {
  const exclude = new Set((opts && opts.exclude) || []);
  const seen = new Set();
  const stack = roots.slice();
  while (stack.length) {
    const name = stack.pop();
    if (seen.has(name) || exclude.has(name)) continue;
    seen.add(name);
    for (const m of extractFn(src, name).matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const cand = m[1];
      if (seen.has(cand) || exclude.has(cand)) continue;
      if (definesFn(src, cand)) stack.push(cand);
    }
  }
  return Array.from(seen);
}
