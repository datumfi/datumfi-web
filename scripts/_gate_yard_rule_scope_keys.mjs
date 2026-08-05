/* DEV-ONLY GATE — RULE_SCOPE MUST DECLARE EXACTLY THE RULES THE ENGINE EMITS. Ruled 2026-08-05 (#605).
 *
 * WHY THIS EXISTS AS A GATE AND NOT A COMMENT. The A-H audience classification was first reported as a
 * prose table. A prose table is a MAINTAINED DOCUMENT, and the first thing to drift is the thing nobody
 * executes — this arc has dug up four stale comments already, one of which (`re-seed through the SAME
 * blueprint path`) asserted the exact property that was broken and is why nobody looked.
 * So the classification lives in studio.html as `var RULE_SCOPE = {...}`, the engine reads it through
 * _ruleInScope(), and THIS gate holds the two sets together:
 *     add a rule with no scope entry            -> RED
 *     delete or retitle a rule                  -> RED
 *     invent a scope value nothing implements   -> RED
 * PREFER AN EXECUTABLE INVARIANT TO A MAINTAINED DOCUMENT, ALWAYS.
 *
 * 🔑 PRESENCE BEFORE COMPARISON (house law, second form): an empty rule set equals an empty key set,
 * and two empty sets match perfectly. A parse that finds nothing must RED, never agree — the same
 * false-green shape as diffing two empty strings and calling them identical.
 *
 * Usage: node scripts/_gate_yard_rule_scope_keys.mjs [--dropkey] [--addrule]
 *   --dropkey  removes E from RULE_SCOPE  -> a rule the engine emits has no declared audience.
 *   --addrule  introduces an undeclared RULE I -> a new rule ships with no audience.
 */
import { readFileSync } from 'node:fs';
const DROPKEY = process.argv.includes('--dropkey');
const ADDRULE = process.argv.includes('--addrule');
let src = readFileSync('studio.html', 'utf8');

function mutate(a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ' matched ' + n + ' times, expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  src = src.replace(a, b);
  console.log('[' + label + '] applied');
}
if (DROPKEY) mutate("E: 'OWNER_OCCUPIED', ", '', 'dropkey');
/* THE INJECTED LETTER IS RESOLVED, NOT TYPED. This mutation used to hard-code RULE I, which was a
   free letter when it was written and STOPPED BEING ONE the moment Rule I shipped — injecting a
   duplicate marker for a rule that now genuinely exists and IS declared left the gate GREEN, so the
   red-first quietly stopped proving anything. Not a retired expectation ("an undeclared rule must
   red" is still exactly right) — a MIS-ADDRESSED one, the same shape as selecting a button by index.
   Take a letter the census does not already claim, and abort rather than inject a colliding one. */
const _takenLetters = new Set([...src.matchAll(/^\s*\/\/ RULE ([A-Z]) —/gm)].map((m) => m[1]));
const _freeLetter = 'ZYXWVUTS'.split('').find((c) => !_takenLetters.has(c));
if (ADDRULE && !_freeLetter) { console.error('❌ --addrule: every candidate letter is already a real rule. Re-ground the mutation.'); process.exit(1); }
if (ADDRULE) mutate('        // RULE F —', '        // RULE ' + _freeLetter + ' — undeclared newcomer (--addrule)\n        // RULE F —', 'addrule');

/* DERIVED FROM THE ENGINE, NOT HAND-LISTED. This was `['ANY','OWNER_OCCUPIED','PURPOSE_VARIANT']`
   typed into the gate while the label claimed "is a value _ruleInScope implements" — so it measured
   what I had typed, not what the engine honours, and it went red on a value the engine DOES
   implement the moment a fourth was added. Same hand-maintained-list rot as the eight RULE_SCOPE
   regexes (§13.21), one level up. Every scope the engine honours is now named on its own branch, so
   the vocabulary is read off the function itself. PRESENCE: if the scrape finds nothing, that is a
   dead extractor, not an empty vocabulary — abort rather than pass every scope vacuously. */
const _scopeFn = (src.match(/function _ruleInScope\([\s\S]*?\n    \}/) || [])[0] || '';
const VALID_SCOPES = [...new Set([..._scopeFn.matchAll(/s === '([A-Z_]+)'/g)].map((m) => m[1]))];
if (!VALID_SCOPES.length) { console.error('❌ PRESENCE — no scope values found in _ruleInScope. The extractor is dead; refusing to validate every scope against an empty list.'); process.exit(1); }
const checks = [];
const need = (l, c, d) => checks.push([l, !!c, d]);

// ── the two sets ──────────────────────────────────────────────────────────────────────────────────
const scopeDecl = (src.match(/var RULE_SCOPE = \{([^}]*)\};/) || [])[1];
const scopeKeys = scopeDecl ? [...scopeDecl.matchAll(/([A-Z])\s*:\s*'([A-Z_]+)'/g)].map((m) => ({ k: m[1], v: m[2] })) : [];
const emitted = [...src.matchAll(/^\s*\/\/ RULE ([A-Z]) —/gm)].map((m) => m[1]);

// ── PRESENCE FIRST — two empty sets agree perfectly, which is the false green this law exists to stop.
need('[PRESENCE] RULE_SCOPE declaration was found and parsed', scopeKeys.length > 0, scopeKeys.length + ' keys');
need('[PRESENCE] the engine\'s RULE markers were found', emitted.length > 0, emitted.length + ' rules');
need('[PRESENCE] both sets are non-trivial (>= 5 each) — a 1-key parse is a parse failure wearing a pass',
  scopeKeys.length >= 5 && emitted.length >= 5, 'scope=' + scopeKeys.length + ' emitted=' + emitted.length);

// ── THE INVARIANT ─────────────────────────────────────────────────────────────────────────────────
const kSet = scopeKeys.map((x) => x.k).sort();
const eSet = [...new Set(emitted)].sort();
const missing = eSet.filter((r) => !kSet.includes(r));
const orphan  = kSet.filter((r) => !eSet.includes(r));
need('EVERY rule the engine emits has a declared audience — undeclared: [' + missing.join(',') + ']',
  missing.length === 0, 'emitted ' + eSet.join(''));
need('EVERY declared key names a rule that exists — orphaned: [' + orphan.join(',') + ']',
  orphan.length === 0, 'declared ' + kSet.join(''));
need('the two sets are identical', kSet.join('') === eSet.join(''), kSet.join('') + ' vs ' + eSet.join(''));
for (const { k, v } of scopeKeys) {
  need('RULE ' + k + ' scope "' + v + '" is a value _ruleInScope implements', VALID_SCOPES.indexOf(v) >= 0, v);
}
// The engine must actually CONSULT the constant — a declared table nothing reads is a comment with braces.
need('_ruleInScope() reads RULE_SCOPE (the constant is load-bearing, not decorative)',
  /function _ruleInScope\([\s\S]{0,300}RULE_SCOPE\[/.test(src), 'engine consults the table');
need('_ruleInScope FAILS CLOSED on an undeclared rule (undeclared audience is not "everyone")',
  /if \(s === undefined\) return false;/.test(src), 'fail-closed guard present');
need('at least one rule is actually gated through _ruleInScope', /_ruleInScope\('[A-Z]', prop\)/.test(src), 'call site present');

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[yard_rule_scope_keys] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length);
process.exit(bad === 0 ? 0 : 1);
