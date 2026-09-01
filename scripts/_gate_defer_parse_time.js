/* @gate-pool: node */
'use strict';
/* _gate_defer_parse_time.js — STANDING GATE for the FINDING 56 SPECIES.
 *
 * THE CLAIM: every PARSE-TIME inline read of a global that only a DEFER script defines has a
 * COMPENSATING RE-RENDER — i.e. the entry point is reachable again from a DOMContentLoaded / load
 * handler, after the dependency exists.
 *
 * ⛔ IT DOES NOT ASSERT "NO PARSE-TIME CODE READS A DEFERRED GLOBAL", AND THAT DISTINCTION IS THE
 *    WHOLE GATE. studio.html's renderUpkeep() legitimately reads DatumBlueprint at parse time and
 *    yields $0 — then `_applyUpkeepFromBp` repaints it from the DOMContentLoaded hub-ready block
 *    (studio.html:5525 <- :18826, inside the handler opened at :18818). An absence invariant would
 *    false-red that correct code. THE SHAPE IS NOT THE DEFECT; THE MISSING REPAINT IS.
 *    🔑 AGREEMENT, NOT ABSENCE — the same law the data-exact-val invariant needed, in a second
 *       domain, because the pattern is SOMETIMES CORRECT.
 *
 * ⛔ MECHANISM: `defer` scripts execute AFTER the whole document is parsed, so a defer tag that
 *    appears EARLIER in the file is still late. This is NOT a line-number comparison; tag order is
 *    irrelevant. (The original brief said line order. That would have swept narrower and looked
 *    complete.)
 *
 * ══ ⛔⛔ WHY THIS FILE'S PATTERNS LOOK THE WAY THEY DO — FOUR FAULTS, EACH PRINTED A CLEAN NUMBER ══
 * This instrument required FOUR corrections before it was honest. They are recorded HERE, not in a
 * scratchpad, because the obvious design has all four and every one of them reports success:
 *   1. EXPORTS ARE NOT ONE IDIOM. Collecting them with /window\.X =/ missed `global.DatumBlueprint`
 *      (a UMD alias), so F56's own dependency was never in the search set. Printed 0 across 5 hosts.
 *      -> EXPORT_RE covers window|global|globalThis|self|root.        Control: --fault-alias
 *   2. TOP-LEVEL IS BRACE DEPTH, NOT PAREN DEPTH. Counting ( ) together with { } drifts
 *      irrecoverably across a 10,312-line inline block, so nothing after the drift is ever seen as
 *      top level. Printed 0 again.                                    (structural; see scan())
 *   3. A DECLARATION IS NOT A CALL. `function renderInputs(` has the same shape as
 *      `renderInputs();` — counting declarations inflated the real count to 89.
 *   4. ⭐ `\s*=` MATCHES THE FIRST `=` OF `===`. Every `typeof global.dispatchEvent === 'function'`
 *      registered as an EXPORT, DOM ambients entered the search set, and the positive control
 *      PASSED by attributing restoreDraft to `dispatchEvent` instead of `DatumBlueprint` — THE
 *      RIGHT ANSWER FOR THE WRONG REASON.                             Control: --fault-eqeq
 *      🔑 A CONTROL THAT FINDS THE RIGHT FUNCTION VIA THE WRONG DEPENDENCY PROVES NOTHING. That is
 *         why the positive control here is a PAIR — the call AND the dependency. ASSERT THE EDGE.
 *   PLUS: parsing ENGLISH AS CODE. Without the isCode mask, the prose "digits + one decimal only
 *      (amounts are NON-NEGATIVE" produced NINE phantom `only()` entry points, each with a
 *      plausible transitive chain to DatumBlueprint.        Probe: --fault-comment (NON-BITING —
 *      see the controls block below; it is deliberately NOT counted as a control).
 *      🔑 A FALSE POSITIVE WITH A CONVINCING CALL CHAIN IS WORSE THAN A MISS — it sends the next
 *         reader to a line containing no code, and the derivation makes it credible.
 *
 * ⚠️ STATED LIMITS — A ZERO HERE IS "NO CANDIDATE FOUND BY A STATIC INSTRUMENT", NEITHER "CLEAN"
 *    NOR "UNKNOWN. It OVER-REPORTS (a name inside a template string that becomes an onclick=
 *    attribute reads as a reference; studio-account-modal.js writes 107 such handlers) and it
 *    UNDER-REPORTS (locally-defined functions only, transitive depth <= 4; `async` scripts and
 *    dynamic import() are not modelled). THE RUNTIME PROOF REMAINS A PROPERTY-SETTER TIMING
 *    MEASUREMENT — that is what found F56, and no static pass replaces it.
 *
 * ⛔ GATES BOTH EDGES. It asserts the uncompensated set EQUALS the declared-open set, so it reds
 *    when a NEW instance appears AND when a declared one is FIXED. A fix must update DECLARED_OPEN
 *    in the same commit — an exemption that cannot expire is a green whose proof has rotted.
 *
 * ══ CONTROLS — MEASURED SIGNATURES, 2026-08-31. Clean run = 4/4 GREEN. ═══════════════════════════
 *   --fault-alias    restores fault 1 (window-only exports)   -> 0/4 · L0 L1 L1b L2 RED
 *   --fault-eqeq     restores fault 4 (`\s*=` eats `===`)     -> 1/4 · L0 L1 L1b RED, L2 GREEN
 *   --nocompensate   severs renderUpkeep's repaint (PRODUCT)  -> 2/4 · L1 L2 RED, L0 L1b GREEN
 *   Each has a leg the others do not: L2 separates the two instrument faults, L0 separates the
 *   product mutation from both.
 * ⚠️ --fault-comment WAS BUILT, MEASURED AT 4/4 GREEN, AND IS NOT SHIPPED AS A CONTROL. Disabling
 *    the isCode mask changes WHICH CHAIN IS NAMED (`_roomCardInner` -> `populateInlineDetails`) but
 *    not the uncompensated SET, because the accepted-list absorbs the difference. So the mask is
 *    load-bearing for THE REPORT'S ACCURACY and not for THE VERDICT, and saying otherwise would be
 *    a control that proves nothing. The mask stays — a named chain that points at a comment would
 *    send the next reader to a line containing no code — but it ships UNGUARDED and is declared so.
 *
 * Run: node scripts/_gate_defer_parse_time.js        (exit 0 = GREEN)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const F_ALIAS = argv.includes('--fault-alias');
const F_EQEQ = argv.includes('--fault-eqeq');
const F_COMMENT = argv.includes('--fault-comment');   // probe only; measured NON-BITING, not advertised as a control
const NOCOMP = argv.includes('--nocompensate');

/* THE POSITIVE CONTROL IS A PAIR: a parse-time call and the deferred global it reads.
   ⛔ IT USED TO BE restoreDraft -> DatumBlueprint. THAT PAIR NO LONGER EXISTS, BECAUSE F56 COMMIT 2
   MOVED THE CALL TO BOOT — the gate reported its own control missing (L0 RED) on the very commit
   that fixed its motivating case, which is the gate working, not failing.
   ⭐ REPLACED WITH renderUpkeep -> DatumBlueprint: still a genuine parse-time read of a deferred
   global, and one that is CORRECT (it has a compensating repaint), so it proves the sweep can still
   SEE the shape without depending on a defect staying unfixed.
   🔑 A POSITIVE CONTROL ANCHORED ON A DEFECT EXPIRES WHEN THE DEFECT IS FIXED. Anchor it on the
      SHAPE the instrument detects, not on an instance you intend to remove. */
const CONTROL_CALL = 'renderUpkeep';
const CONTROL_DEP = 'DatumBlueprint';

/* ⛔ DECLARED OPEN — uncompensated parse-time reads we KNOW about and have accepted for now.
   F56: restoreDraft() runs at t=77ms; DatumBlueprint arrives at t=174ms (defer). Nothing re-runs
   it, so a session draft never restores. Fix is F56 commit 2. WHEN IT LANDS, THIS ENTRY MUST BE
   REMOVED IN THE SAME COMMIT — the equality assertion below will red until it is. */
const DECLARED_OPEN = [
  /* ✅ F56's ENTRY WAS REMOVED HERE, IN THE COMMIT THAT FIXED IT — because L1b RED until it was.
     The exemption could not outlive the defect it excused, which is the whole point of asserting
     SET EQUALITY rather than mere absence of new instances. Recorded so the next reader can see
     the mechanism actually fired rather than trusting that it would. */
  /* ⚠️ NOT A DEFECT — A STATED LIMIT OF A STATIC INSTRUMENT, RECORDED RATHER THAN SUPPRESSED.
     updateArchitectNames -> renderInputs -> populateInlineDetails reaches openAccountModal by a
     REAL synchronous call (studio.html:13637), but that call sits inside
     `state.accounts.forEach(...)` and state.accounts is EMPTY at parse time, so the callback never
     runs. No static pass can know the collection is empty.
     🔑 SUPPRESSING THIS WOULD HIDE THE LIMIT; DECLARING IT KEEPS THE LIMIT VISIBLE AND STILL REDS
        IF A GENUINELY NEW ENTRY APPEARS. If accounts are ever seeded before this line, this becomes
        a real finding and must be re-judged rather than re-accepted. */
  { host: 'studio.html', call: 'updateArchitectNames', dep: 'openAccountModal',
    why: 'STATIC LIMIT — reachable only through state.accounts.forEach, empty at parse time.' }
];

const EXPORT_RE = () => (F_EQEQ
  ? /\b(?:window|global|globalThis|self|root)\.([A-Za-z_$][\w$]*)\s*=/g            // FAULT 4 restored
  : F_ALIAS
    ? /\bwindow\.([A-Za-z_$][\w$]*)\s*=(?![=>])/g                                   // FAULT 1 restored
    : /\b(?:window|global|globalThis|self|root)\.([A-Za-z_$][\w$]*)\s*=(?![=>])/g);

function scan(code) {
  const n = code.length;
  const depth = new Int32Array(n);
  const isCode = new Uint8Array(n);
  const mark = (from, to, d) => { for (let k = from; k < to && k < n; k++) { depth[k] = d; isCode[k] = F_COMMENT ? 1 : 0; } };
  let d = 0, i = 0, prev = '(';
  while (i < n) {
    const c = code[i], c2 = code.substr(i, 2);
    if (c2 === '//') { const e = code.indexOf('\n', i); const end = e === -1 ? n : e; mark(i, end, d); i = end; continue; }
    if (c2 === '/*') { const e = code.indexOf('*/', i + 2); const end = e === -1 ? n : e + 2; mark(i, end, d); i = end; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, start = i; i++;
      while (i < n) { if (code[i] === '\\') { i += 2; continue; } if (code[i] === q) { i++; break; } i++; }
      mark(start, i, d); prev = 'x'; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+*%<>~^-]/.test(prev)) {
      const start = i; i++; let cls = false;
      while (i < n) { const ch = code[i]; if (ch === '\\') { i += 2; continue; } if (ch === '[') cls = true; else if (ch === ']') cls = false; else if (ch === '/' && !cls) { i++; break; } else if (ch === '\n') break; i++; }
      mark(start, i, d); prev = 'x'; continue;
    }
    if (c === '{') { depth[i] = d; isCode[i] = 1; d++; prev = '{'; i++; continue; }
    if (c === '}') { d--; if (d < 0) d = 0; depth[i] = d; isCode[i] = 1; prev = '}'; i++; continue; }
    depth[i] = d; isCode[i] = 1;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return { depth, isCode };
}

const RESERVED = /^(if|for|while|switch|catch|return|function|typeof|new|else|do|try|delete|void|in|of|case|throw)$/;

/* ⛔ THE MASK MUST REACH THE DEPENDENCY TEST, NOT ONLY THE CALL TEST.
   MEASURED: with the mask applied only to call detection, this gate reported
   `updateArchitectNames() -> openAccountModal` as a NEW uncompensated read. It is not a reference
   at all — `openAccountModal` appears inside a TEMPLATE STRING that emits an onclick= attribute
   (studio.html:5962), and studio-account-modal.js writes 107 such handlers. That code runs at
   CLICK time.
   🔑 A NAME EMITTED INTO MARKUP IS NOT A NAME READ AT PARSE TIME. Blank the non-code before asking
      whether a body depends on anything. */
function codeOnly(text) {
  const { isCode } = scan(text);
  let out = '';
  for (let i = 0; i < text.length; i++) out += isCode[i] ? text[i] : ' ';
  return out;
}

function analyse(code) {
  const { depth, isCode } = scan(code);
  const funcs = new Map();
  const spans = [];
  const fnRe = /(?:^|[\s;{}(,])(?:(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*=\s*function|function\s+([A-Za-z_$][\w$]*)|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function)/g;
  let m;
  while ((m = fnRe.exec(code))) {
    const at = m.index + m[0].length - 1;
    if (!isCode[at]) continue;
    const name = m[1] || m[2] || m[3];
    const open = code.indexOf('{', at);
    if (open === -1) continue;
    const d0 = depth[open];
    let j = open + 1;
    while (j < code.length && !(code[j] === '}' && depth[j] === d0)) j++;
    if (!funcs.has(name)) funcs.set(name, code.slice(open, j + 1));
    if (depth[at] === 0) spans.push([open, j]);
  }
  const inBody = (i) => spans.some(([a, b]) => i > a && i <= b);

  const callRe = /(^|[\s;{}])([A-Za-z_$][\w$]*)\s*\(/g;
  const parseTime = [];
  while ((m = callRe.exec(code))) {
    const idx = m.index + m[1].length;
    if (depth[idx] !== 0 || !isCode[idx] || inBody(idx)) continue;
    const name = m[2];
    if (RESERVED.test(name)) continue;
    const before = code.slice(Math.max(0, idx - 40), idx).replace(/\s+$/, '');
    if (/\bfunction$/.test(before) || /[=:.]$/.test(before) || /\bnew$/.test(before)) continue;
    parseTime.push({ name, line: code.slice(0, idx).split('\n').length });
  }

  /* READY-HANDLER SPANS — DOMContentLoaded / load / readyState guards. Every function name called
     inside one seeds the COMPENSATED set. */
  const ready = [];
  const readyRe = /addEventListener\s*\(\s*['"](?:DOMContentLoaded|load)['"]|readyState\s*(?:===?|!==?)\s*['"]/g;
  while ((m = readyRe.exec(code))) {
    if (!isCode[m.index]) continue;
    const open = code.indexOf('{', m.index);
    if (open === -1) continue;
    const d0 = depth[open];
    let j = open + 1;
    while (j < code.length && !(code[j] === '}' && depth[j] === d0)) j++;
    ready.push(code.slice(open, j + 1));
  }
  return { funcs, parseTime, ready };
}

function exportsOf(src) {
  const out = new Set();
  const fp = path.join(ROOT, src.replace(/^\//, '').split('?')[0]);
  if (!fs.existsSync(fp)) return out;
  const t = fs.readFileSync(fp, 'utf8');
  const re = EXPORT_RE();
  let m;
  while ((m = re.exec(t))) out.add(m[1]);
  return out;
}

/* ⛔ NUL-DELIMITED. A plain `git ls-files` mangles the five em-dash "Datum FI — *.html" names, and
   it broke the first run of this sweep. */
const files = execSync('git ls-files -z', { cwd: ROOT, maxBuffer: 1 << 28 })
  .toString('utf8').split('\0').filter((f) => f.endsWith('.html'));

let controlFound = false;
const uncompensated = [];
const compensated = [];
const hostRows = [];

for (const f of files) {
  let html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (NOCOMP && f === 'studio.html') {
    /* PRODUCT MUTATION: sever renderUpkeep's compensating repaint so it becomes a REAL
       uncompensated parse-time read. Must change bytes or the control did not land. */
    const before = html.length;
    html = html.replace('if (window._applyUpkeepFromBp) window._applyUpkeepFromBp(bp);', '/* severed */');
    if (html.length === before) { console.log('  ABORT: --nocompensate anchor not found; the control did not land.'); console.log('\nOVERALL: RED'); process.exit(1); }
  }
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const deferSrcs = []; const inline = []; let m;
  while ((m = tagRe.exec(html))) {
    const attrs = m[1] || '';
    const line = html.slice(0, m.index).split('\n').length;
    const s = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (s) { if (/\bdefer\b/i.test(attrs)) deferSrcs.push(s[1]); }
    else if (m[2] && m[2].trim()) inline.push({ code: m[2], line });
  }
  if (!deferSrcs.length || !inline.length) continue;

  const dg = new Map();
  for (const src of deferSrcs) { if (/^https?:/i.test(src)) continue; for (const g of exportsOf(src)) if (!dg.has(g)) dg.set(g, src); }

  const allFuncs = new Map(); const allReady = []; const entries = [];
  for (const blk of inline) {
    const a = analyse(blk.code);
    for (const [k, v] of a.funcs) if (!allFuncs.has(k)) allFuncs.set(k, v);
    allReady.push(...a.ready);
    for (const c of a.parseTime) entries.push({ name: c.name, absLine: blk.line + c.line - 1 });
  }
  hostRows.push({ f, defer: deferSrcs.length, dg: dg.size, inline: inline.length, entries: entries.length });
  if (!dg.size) continue;

  /* COMPENSATED = names reachable from any ready handler, transitively through local functions. */
  const reach = new Set();
  const seed = (text) => { let mm; const r = /\b([A-Za-z_$][\w$]*)\s*\(/g; while ((mm = r.exec(text))) if (!RESERVED.test(mm[1])) reach.add(mm[1]); };
  allReady.map(codeOnly).forEach(seed);
  for (let pass = 0; pass < 5; pass++) {
    const snapshot = [...reach];
    for (const nm of snapshot) { const b = allFuncs.get(nm); if (b) seed(codeOnly(b)); }
    if (reach.size === snapshot.length) break;
  }

  for (const e of entries) {
    const seen = new Set();
    const walk = (fn, d, chain) => {
      if (d > 4 || seen.has(fn)) return null;
      seen.add(fn);
      const raw = allFuncs.get(fn);
      if (!raw) return null;
      const body = codeOnly(raw);
      for (const [g, src] of dg) {
        const esc = g.replace(/\$/g, '\\$');
        if (new RegExp('(?:window|global|globalThis)\\.' + esc + '\\b|\\b' + esc + '\\b').test(body)) return { g, src, via: chain.concat(fn).join(' -> ') };
      }
      for (const other of allFuncs.keys()) {
        if (other !== fn && new RegExp('\\b' + other.replace(/\$/g, '\\$') + '\\s*\\(').test(body)) {
          const r = walk(other, d + 1, chain.concat(fn));
          if (r) return r;
        }
      }
      return null;
    };
    const hit = walk(e.name, 0, []);
    if (!hit) continue;
    if (e.name === CONTROL_CALL && hit.g === CONTROL_DEP) controlFound = true;
    const rec = { host: f, call: e.name, dep: hit.g, src: hit.src, line: e.absLine, via: hit.via };
    if (reach.has(e.name)) compensated.push(rec); else uncompensated.push(rec);
  }
}

/* ── REPORT ─────────────────────────────────────────────────────────────────────────────────── */
const mode = [F_ALIAS && 'fault-alias', F_EQEQ && 'fault-eqeq', F_COMMENT && 'fault-comment(probe)', NOCOMP && 'nocompensate'].filter(Boolean).join(',') || 'clean';
console.log('  mode: ' + mode);
console.log('  population: ' + files.length + ' tracked .html (git ls-files -z)');
console.log('  hosts with defer+inline: ' + hostRows.map((r) => r.f).join(', '));
hostRows.forEach((r) => console.log('    ' + r.f + '  defer=' + r.defer + ' deferGlobals=' + r.dg + ' inlineBlocks=' + r.inline + ' parseTimeEntries=' + r.entries));
console.log('  COMPENSATED (parse-time read, but repainted from a ready handler): ' + compensated.length);
compensated.forEach((c) => console.log('    ' + c.host + ':' + c.line + '  ' + c.call + '() -> ' + c.dep + '   via ' + c.via));
console.log('  UNCOMPENSATED: ' + uncompensated.length);
uncompensated.forEach((c) => console.log('    ' + c.host + ':' + c.line + '  ' + c.call + '() -> ' + c.dep + '   via ' + c.via));

let fails = 0;
const check = (label, ok, detail) => { if (!ok) fails++; console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : '')); };

/* L0 — THE INSTRUMENT'S OWN CONTROL, FIRST. Nothing below may be believed if this reds. */
check('L0 INSTRUMENT: the known-dead pair (' + CONTROL_CALL + ' -> ' + CONTROL_DEP + ') is rediscovered',
  controlFound,
  controlFound ? 'found' : 'NOT FOUND — the sweep cannot see its own motivating case, so every count above is meaningless');

/* L1 — GATES BOTH EDGES: the uncompensated set must EQUAL the declared-open set. */
const key = (x) => x.host + '::' + x.call + '::' + x.dep;
const got = uncompensated.map(key).sort();
const want = DECLARED_OPEN.map(key).sort();
const added = got.filter((k) => !want.includes(k));
const fixed = want.filter((k) => !got.includes(k));
check('L1 no NEW uncompensated parse-time read of a deferred global', added.length === 0,
  added.length ? 'NEW: ' + added.join(' · ') : 'none beyond the declared-open set');
check('L1b every DECLARED-OPEN instance is still present (a fix must update DECLARED_OPEN here)',
  fixed.length === 0,
  fixed.length ? 'NO LONGER PRESENT: ' + fixed.join(' · ') + ' — if this was fixed, remove it from DECLARED_OPEN in the same commit' : 'all present');

/* L2 — HONEST HALF: the legitimate pattern must NOT be reported as a defect. Green on both
   builds; it is what stops this gate becoming an absence invariant. */
const upk = compensated.find((c) => c.call === 'renderUpkeep');
check('L2 HONEST HALF: a parse-time read WITH a compensating repaint is classified compensated',
  !!upk && !uncompensated.some((u) => u.call === 'renderUpkeep'),
  upk ? 'renderUpkeep -> ' + upk.dep + ' seen as compensated via ' + upk.via : 'renderUpkeep NOT classified compensated');

console.log('\nSCORE ' + (4 - fails) + ' / 4 ' + (fails === 0 ? 'GREEN' : 'RED'));
console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
process.exit(fails === 0 ? 0 : 1);
