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
function fnStart(src, name) {
  const a = src.indexOf('function ' + name + '(');
  if (a >= 0) return a;
  const b = src.indexOf('window.' + name + ' = function');
  if (b >= 0) return b;
  return src.indexOf('window.' + name + ' = async function');   // -1 when absent
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
