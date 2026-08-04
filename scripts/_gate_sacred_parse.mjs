/* DEV-ONLY red-first gate — Yard §13.20: EVERY SACRED HOST MUST ACTUALLY PARSE.
 *
 * WHY THIS EXISTS, in one sentence: on 2026-08-04 a stray line left after a closing comment made
 * studio.html fail to parse — the page would not load at all — and ALL 191 GATES STAYED GREEN.
 *
 * ⚖️ A SUITE THAT CANNOT DETECT A FILE THAT WILL NOT LOAD IS NOT MEASURING THE PRODUCT, IT IS
 *    MEASURING ITS OWN EXTRACTS.
 * Every node gate we own pulls individual FUNCTIONS out of a host by regex (`function X(` … balanced
 * braces) and evaluates those. A syntax error in the space BETWEEN two extracted functions is
 * invisible to every one of them, forever. Only `git diff` caught it, and a person paying attention
 * is not a control. This gate is the control.
 *
 * WHAT IT DOES. For each Sacred host: HTML -> parse every inline <script> block end to end;
 * JS -> parse the whole file. Parsing only — nothing is executed, so this is safe and fast.
 *
 * THE HOST LIST IS NOT HAND-MAINTAINED. It is read from SACRED{} in scripts/build-dist.mjs, which
 * the build already cross-checks against CLAUDE.md in both directions. A hand-listed copy here would
 * be the third list of the same twelve names, and the one nobody updates.
 *
 * 🔑 PRESENCE BEFORE ABSENCE. "Nothing failed to parse" passes perfectly on a run that parsed
 * NOTHING. So the gate asserts it found hosts, found script blocks, and found them in every HTML
 * host, BEFORE it reports that none of them failed. --blindblocks proves that leg can fail.
 *
 * Usage:
 *   node scripts/_gate_sacred_parse.mjs
 *   --stray        reproduce the REAL 2026-08-04 defect: close a comment early, leaving stray text
 *   --blindblocks  make the block extractor match nothing -> the vacuous-pass leg must RED
 *   --nohosts      make the SACRED map unreadable        -> coverage loss must be LOUD
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const argv = process.argv.slice(2);
const STRAY = argv.includes('--stray');
const BLIND = argv.includes('--blindblocks');
const NOHOSTS = argv.includes('--nohosts');
const ANY_MUT = STRAY || BLIND || NOHOSTS;

const checks = [];
/* third slot is the MUTATION TAG (§13.17) — declared at the assertion, never inferred from prose. */
const need = (l, c, tag) => checks.push([l, !!c, tag || null]);

/* A MUTATION THAT CANNOT RUN PROVES NOTHING. */
function mutate(src, a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('❌ anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  console.log('[' + label + '] applied');
  return src.replace(a, b);
}

/* ── the host list, from the build's own map ── */
let hosts = [];
{
  let bd = readFileSync(path.join(REPO, 'scripts', 'build-dist.mjs'), 'utf8');
  if (NOHOSTS) bd = mutate(bd, 'const SACRED = {', 'const SACRED_DISABLED_BY_MUTATION = {', '--nohosts');
  const m = /const SACRED = \{([\s\S]*?)\n\};/.exec(bd);
  if (m) hosts = [...m[1].matchAll(/^\s*'([^']+)':\s*'[0-9a-f]{32}'/gm)].map((x) => x[1]);
}
need('[PRESENCE] the SACRED map is readable and non-empty', hosts.length > 0, 'coverage');
need('[PRESENCE] all twelve Sacred hosts are present', hosts.length === 12, 'coverage');

/* ── extract the parseable units ── */
const BLOCK_RE = BLIND ? /<script\b([^>]*)>(NEVER-MATCHES-ANYTHING)<\/script>/gi : /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
if (BLIND) console.log('[--blindblocks] applied');

const units = [];      // { host, label, code, line }
const perHost = {};
for (const host of hosts) {
  let src;
  try { src = readFileSync(path.join(REPO, host), 'utf8'); }
  catch (e) { need('[PRESENCE] host readable: ' + host, false, 'coverage'); continue; }
  if (STRAY && host === 'studio.html') {
    src = mutate(src, "     * rule. The gate's --dropvoice red-first proves it.",
                      "     * rule. The gate's --dropvoice red-first proves it. */", '--stray');
  }
  if (/\.js$/.test(host)) { units.push({ host, label: host, code: src, line: 1 }); perHost[host] = 1; continue; }
  let n = 0;
  for (const m of src.matchAll(BLOCK_RE)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;                                   // external, nothing inline to parse
    if (/type\s*=\s*["'](?!text\/javascript)/i.test(m[1])) continue;         // json / importmap / template
    if (!m[2].trim()) continue;                                              // empty tag
    n++;
    units.push({ host, label: host + ' #' + n, code: m[2], line: src.slice(0, m.index).split('\n').length });
  }
  perHost[host] = n;
}

/* ── A ZERO MUST DECLARE WHETHER IT IS BY DESIGN OR BY ACCIDENT (the §13.16 law, applied here) ──
 * A host with no inline script is two different facts that look identical: a pure content page that
 * never had any, or a page whose scripts my extractor just failed to see. Measured 2026-08-04:
 * privacy.html and terms.html carry exactly one <script src="/nav.js"> each and nothing inline.
 * Declared, so the silence is named — and asserted in BOTH directions, so the declaration cannot rot
 * into a place for a real regression to hide. */
const NO_INLINE_BY_DESIGN = {
  'privacy.html': 'canonical legal page — content only, its sole script is <script src="/nav.js">',
  'terms.html':   'canonical legal page — content only, its sole script is <script src="/nav.js">',
};
const htmlHosts = hosts.filter((h) => /\.html$/.test(h));
const declaredZero = (h) => Object.prototype.hasOwnProperty.call(NO_INLINE_BY_DESIGN, h);
const undeclaredEmpty = htmlHosts.filter((h) => (perHost[h] || 0) === 0 && !declaredZero(h));
const declaredButNotEmpty = Object.keys(NO_INLINE_BY_DESIGN).filter((h) => (perHost[h] || 0) > 0);

need('[PRESENCE] parseable units were found at all', units.length > 0, 'coverage');
need('FORWARD — every HTML host yields an inline script, or is declared script-free',
     htmlHosts.length > 0 && undeclaredEmpty.length === 0, 'coverage');
if (undeclaredEmpty.length) console.log('        undeclared-empty: ' + JSON.stringify(undeclaredEmpty));
need('BACKWARD — every host declared script-free really has none',
     declaredButNotEmpty.length === 0, 'coverage');
if (declaredButNotEmpty.length) console.log('        declared script-free but has inline blocks: ' + JSON.stringify(declaredButNotEmpty));

/* ── THE ASSERTION ── */
const failures = [];
const t0 = Date.now();
for (const u of units) {
  try { new vm.Script(u.code, { filename: u.label }); }
  catch (e) { failures.push({ label: u.label, host: u.host, line: u.line, msg: e.message }); }
}
const wall = Date.now() - t0;
need('EVERY Sacred host parses — no unloadable file can ship', failures.length === 0, 'parse');

console.log('');
for (const h of hosts) console.log('   ' + String(perHost[h] === undefined ? '?' : perHost[h]).padStart(2) + ' unit(s)  ' + h);
console.log('\nparsed ' + units.length + ' unit(s) across ' + hosts.length + ' host(s) in ' + wall + 'ms\n');
if (failures.length) {
  console.log('--- PARSE FAILURES ---');
  for (const f of failures) console.log('  ' + f.label + '  (block starts at line ' + f.line + ')\n     ' + f.msg);
  console.log('');
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log('\n' + pass + '/' + checks.length + ' green' + (ANY_MUT ? '  [mutated]' : ''));

/* §13.17 — a red-first must prove WHICH assertion failed. This gate of all gates is not
   inversion-only: --stray must red the PARSE leg, the other two must red a COVERAGE leg. */
if (ANY_MUT) {
  const want = STRAY ? 'parse' : 'coverage';
  const red = checks.filter(([, ok]) => !ok).map(([l]) => l);
  const onTarget = checks.filter(([, ok, tag]) => !ok && tag === want).map(([l]) => l);
  if (allGreen) { console.error('❌ RED-FIRST FAILED — the mutation left every assertion green. Its anchor is dead, or the gate cannot see the fault it exists for.'); process.exit(1); }
  if (!onTarget.length) {
    console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a "' + want + '" assertion.');
    console.error('   red legs: ' + red.join(' | ')); process.exit(1);
  }
  if (STRAY && !failures.some((f) => f.host === 'studio.html')) {
    console.error('❌ RED-FIRST MISDIRECTED — the parse leg fell, but studio.html was not among the failures.'); process.exit(1);
  }
  console.log('✅ RED-FIRST OK — bit on ' + onTarget.length + ' "' + want + '" assertion(s): ' + onTarget.join(' | '));
  process.exit(0);
}
/* Name the ACTUAL failure. An earlier cut printed "a Sacred host does not parse" whenever anything
   went red, including a coverage leg — a gate lying about which of its own assertions fell. */
if (!allGreen) {
  console.error(failures.length
    ? '❌ GATE FAILED — a Sacred host DOES NOT PARSE. That file will not load in a browser.'
    : '❌ GATE FAILED — coverage: the gate could not prove it looked at what it claims to cover.');
  process.exit(1);
}
console.log('✅ GATE GREEN — every Sacred host parses end to end.');
