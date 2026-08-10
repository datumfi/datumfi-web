/* DEV-ONLY red-first gate — Property §18.10 · THE PURPOSE-SCOPED FIELD CONTRACT.
 * @gate-pool: node
 *
 * WHAT §18.10 ACTUALLY RULES (bank A276/A277, read in-session per L51). A field is PURPOSE-SCOPED
 * only when its visibility selector is MUTABLE BY THE USER. The hazard is silent and specific: the
 * §18.1 rental fields are HIDDEN when propPurpose leaves 'Rental property', but THE VALUES PERSIST.
 * So any surface that draws MEANING from one without re-checking purpose tells a user that the home
 * they live in earns rent — and it does so in the GENEROUS direction, removing a warning rather than
 * adding one, which is the direction nobody reports.
 *
 * WHY A GATE AND NOT A COMMENT. studio.html:12539 already explains this in prose, correctly, above
 * the one guard that implements it. A prose note describing an invariant is a MAINTAINED DOCUMENT,
 * and the first thing to drift is the thing nobody executes. §18.10's contract item (4) asks for an
 * EXECUTABLE gate that READS THE TABLE rather than restating it. This does exactly that: the table
 * is lifted and evaluated out of studio.html, never re-typed here.
 *
 * ⭐ AND IT CANNOT BE SILENTLY SHRUNK — THIS IS THE POINT. An INCLUSION list you can delete a row
 * from is a convention with an expiry date. So the census is DERIVED INDEPENDENTLY of the table:
 * a function that SUPPRESSES ITS OWN RENDER on a propPurpose mismatch is, mechanically, a
 * purpose-scoped field owner, and the fields it writes are its scoped fields. The two sets are then
 * held together in BOTH directions. Delete a row from the table and the derived census still finds
 * the field -> RED. Add field five to the renderer and forget the table -> RED. That is §18.2
 * (weeksUsed, occasionalRent) and §18.7 (landlordIns) armed before they are written.
 *
 * 🔑 THE DERIVATION ALSO REPRODUCES THE BANK'S RULING MECHANICALLY, WHICH IS WHY IT IS TRUSTWORTHY.
 * The Architect had asserted helocUsePurpose was the same shape; the Wirer's census disproved it and
 * the census won. This gate re-runs that census on every commit: escrow and HELOC-limit derive from
 * the values themselves, and helocUsePurpose/phase/drawEnd gate on `base.title === 'HELOC'` which is
 * immutable per account — none of them gate on propPurpose, so none of them are picked up. The
 * ruling is not restated here as a list; it FALLS OUT of the definition.
 *
 * PRESENCE BEFORE COMPARISON (house law): two empty sets match perfectly. Every comparison below is
 * preceded by a presence leg, and a parse that finds nothing ABORTS rather than agreeing.
 *
 * Usage: node scripts/_gate_property_18_10.mjs [control]
 *   --dropdecl       delete mgmtPct from the table          -> the BOTH-DIRECTIONS leg must RED
 *   --newfield       add a 5th field to the renderer only   -> the BOTH-DIRECTIONS leg must RED
 *   --directread     read prop.rentMonthly from an undeclared function -> ACCESS DISCIPLINE must RED
 *   --ungate         strip _yardRentNet's purpose gate      -> the SCOPED-READER leg must RED
 *   --rawblind       stop the owner re-rendering the value  -> the RAW-OWNER leg must RED
 *   --clearonswitch  clear a declared field on purpose change -> the KEPT leg must RED
 */
import { readFileSync } from 'node:fs';
import { lift } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const argv = process.argv.slice(2);
const DROPDECL = argv.includes('--dropdecl');
const NEWFIELD = argv.includes('--newfield');
const DIRECTREAD = argv.includes('--directread');
const UNGATE = argv.includes('--ungate');
const RAWBLIND = argv.includes('--rawblind');
const CLEARSWITCH = argv.includes('--clearonswitch');
const UNGATERULE = argv.includes('--ungaterule');
const RAWBLINDSEL = argv.includes('--rawblindsel');
let src = studioSource();

function mutate(a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) {
    console.error('❌ anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.');
    process.exit(1);
  }
  src = src.replace(a, b);
  console.log('[' + label + '] applied');
}
if (DROPDECL) mutate("        mgmtPct:     { purpose: 'Rental property', raw: ['_propRentalFieldsHTML'], scoped: ['_yardRentNet'] }\n", '', '--dropdecl');
if (NEWFIELD) mutate("value=\"${v(acc.mgmtPct)}\" oninput=\"updateAccField('${id}', 'mgmtPct', this.value)\"",
  "value=\"${v(acc.mgmtPct)}\" oninput=\"updateAccField('${id}', 'mgmtPct', this.value)\"><input type=\"text\" oninput=\"updateAccField('${id}', 'petRentMonthly', this.value)\"", '--newfield');
if (UNGATE) mutate("        if (!prop || prop.propPurpose !== 'Rental property') return { monthly: 0, sourced: false, gross: 0, netted: false };\n", '', '--ungate');
if (RAWBLIND) mutate('value="${v(acc.rentMonthly)}" oninput', 'oninput', '--rawblind');
if (DIRECTREAD) mutate('    function _yardRealMonthly(', '    function _p1810Leak(prop) { return prop.rentMonthly; }\n    function _yardRealMonthly(', '--directread');
if (CLEARSWITCH) mutate("        if (!acc || acc.propPurpose !== 'Rental property') return '';",
  "        if (!acc || acc.propPurpose !== 'Rental property') { acc.rentMonthly = ''; return ''; }", '--clearonswitch');
/* ⭐ THESE TWO EXIST BECAUSE THE FIRST SIX CONTROLS LEFT TWO LEGS UNREACHABLE (§13.73). --ungate only
   touches _yardRentNet, so the isRented leg — which scopes through _ruleInScope('I') instead — had no
   fixture that could put it in the failing state, and --rawblind only broke a text input, so the
   <select> re-render was asserted by a leg nothing could redden. A CONTROL MUST RUN AGAINST A FIXTURE
   IN THE STATE THE BUG WOULD OCCUPY; both of those were it-is-not-there tests until now. */
if (UNGATERULE) mutate("        if (_ruleInScope('I', prop)) {", '        if (true) {   /* rule scope removed by --ungaterule */', '--ungaterule');
if (RAWBLINDSEL) mutate("(ir === o ? 'selected' : '')", "''", '--rawblindsel');

const checks = [];
const need = (l, c, d) => checks.push([l, !!c, d]);
const die = (m) => { console.error('❌ ' + m); process.exit(1); };

/* ── THE TABLE, READ NOT RESTATED ────────────────────────────────────────────────────────────────
 * lift() is line-anchored and refuses an ambiguous name, so a COMMENT that quotes the declaration
 * while explaining it cannot be mistaken for the declaration. Evaluating it beats regex-parsing the
 * inner text: it reads the table the ENGINE would see, not a second interpretation of the same
 * characters. */
let TABLE;
try {
  TABLE = new Function(lift(src, 'PURPOSE_SCOPED_FIELDS') + '\nreturn PURPOSE_SCOPED_FIELDS;')();
} catch (e) {
  die('PRESENCE — could not lift and evaluate PURPOSE_SCOPED_FIELDS: ' + e.message +
      '\n   Refusing to compare two sets when one of them could not be read.');
}
const declared = Object.keys(TABLE);

/* ── THE CENSUS, DERIVED FROM THE RENDERERS ──────────────────────────────────────────────────────
 * A function that gates on propPurpose AND returns '' is suppressing its own render — that is the
 * bank's "visibility selector is mutable by the user" made mechanical. */
const FN_DEF_RE = /^[ \t]*\(?[ \t]*(?:async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\(/gm;
const fnNames = [...new Set([...src.matchAll(FN_DEF_RE)].map((m) => m[1]))];
const owners = [];
for (const n of fnNames) {
  let body;
  try { body = lift(src, n); } catch { continue; }
  if (!/propPurpose\s*!==\s*'([^']+)'/.test(body) || !/return\s*''\s*;/.test(body)) continue;
  owners.push({
    fn: n,
    purpose: (body.match(/propPurpose\s*!==\s*'([^']+)'/) || [])[1],
    fields: [...new Set([...body.matchAll(/updateAccField\([^,]+,\s*'([A-Za-z_$][\w$]*)'/g)].map((m) => m[1]))]
  });
}
const derived = [...new Set(owners.flatMap((o) => o.fields))];

// ── A · PRESENCE — two empty sets agree perfectly. ───────────────────────────────────────────────
need('[PRESENCE] PURPOSE_SCOPED_FIELDS was lifted and evaluated', declared.length > 0, declared.length + ' declared');
need('[PRESENCE] at least one purpose-scoped OWNER was derived from the renderers', owners.length > 0, owners.map((o) => o.fn).join(', '));
need('[PRESENCE] both sets are non-trivial (>= 4 each) — a 1-key parse is a parse failure wearing a pass',
  declared.length >= 4 && derived.length >= 4, 'declared=' + declared.length + ' derived=' + derived.length);

// ── B · THE TWO SETS, BOTH DIRECTIONS ────────────────────────────────────────────────────────────
const undeclaredF = derived.filter((f) => !declared.includes(f));
const orphanF = declared.filter((f) => !derived.includes(f));
need('EVERY purpose-scoped field the renderers write is DECLARED — undeclared: [' + undeclaredF.join(',') + ']',
  undeclaredF.length === 0, 'derived ' + derived.join(','));
need('EVERY declared field is one the renderers actually write — orphaned: [' + orphanF.join(',') + ']',
  orphanF.length === 0, 'declared ' + declared.join(','));
for (const o of owners) {
  for (const f of o.fields) {
    if (!TABLE[f]) continue;
    need('"' + f + '" declares the purpose its own renderer gates on (' + o.purpose + ')',
      TABLE[f].purpose === o.purpose, 'declared "' + TABLE[f].purpose + '"');
  }
}

/* ── C · ACCESS DISCIPLINE — the bank's "reds on direct access to any declared field" ─────────────
 * COMMENTS ARE STRIPPED FIRST, and that is not fussiness: this file's own extractor was taught the
 * hard way that a resolver reading comments as code will eventually synthesise something nobody
 * wrote. studio.html discusses these very field names in prose all around their guards. The stripper
 * is then SELF-CHECKED below — if it eats code, the gate reds rather than passing vacuously. */
function stripComments(s) {
  let out = '', st = 'code', q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (st === 'code') {
      if (c === '/' && n === '/') { st = 'line'; out += '  '; i++; continue; }
      if (c === '/' && n === '*') { st = 'block'; out += '  '; i++; continue; }
      if (c === '"' || c === "'" || c === '`') { st = 'str'; q = c; }
      out += c;
    } else if (st === 'line') {
      if (c === '\n') { st = 'code'; out += c; } else out += ' ';
    } else if (st === 'block') {
      if (c === '*' && n === '/') { st = 'code'; out += '  '; i++; } else out += (c === '\n' ? c : ' ');
    } else if (st === 'str') {
      if (c === '\\') { out += c + (n === undefined ? '' : n); i++; continue; }
      if (c === q) st = 'code';
      out += c;
    }
  }
  return out;
}
const code = stripComments(src);
need('[PRESENCE] the comment stripper preserved the source length (positions stay aligned)',
  code.length === src.length, code.length + ' vs ' + src.length);

// span map: innermost NAMED function containing an index
const spans = [];
for (const m of src.matchAll(FN_DEF_RE)) {
  const start = m.index + m[0].indexOf('function');
  let depth = 0, began = false;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') { depth++; began = true; }
    else if (src[j] === '}') { depth--; if (began && depth === 0) { spans.push({ fn: m[1], start, end: j }); break; } }
  }
}
const owning = (i) => {
  let best = null;
  for (const s of spans) if (i >= s.start && i <= s.end && (!best || s.start > best.start)) best = s;
  return best ? best.fn : '(top level)';
};

let totalSites = 0;
const violations = [];
for (const f of declared) {
  const allowed = new Set([...(TABLE[f].raw || []), ...(TABLE[f].scoped || [])]);
  const sites = [...code.matchAll(new RegExp('[A-Za-z_$][\\w$]*\\.' + f + '\\b', 'g'))];
  totalSites += sites.length;
  need('"' + f + '" is read somewhere at all (a field nothing reads is not under contract)', sites.length > 0, sites.length + ' sites');
  for (const s of sites) {
    const fn = owning(s.index);
    if (!allowed.has(fn)) violations.push(f + ' read in ' + fn + ' @line ' + src.slice(0, s.index).split('\n').length);
  }
}
need('[PRESENCE] the access scan found a non-trivial number of read sites (>= 8)', totalSites >= 8, totalSites + ' sites');
need('NO DIRECT ACCESS — every read of a declared field sits inside a DECLARED reader — leaks: [' +
     violations.join(' | ') + ']', violations.length === 0, totalSites + ' sites checked');

// ── D · THE READERS ARE REAL, AND THE SCOPED ONES ACTUALLY SCOPE ─────────────────────────────────
for (const f of declared) {
  for (const r of [...(TABLE[f].raw || []), ...(TABLE[f].scoped || [])]) {
    let ok = true;
    try { lift(src, r); } catch { ok = false; }
    need('declared reader ' + r + '() for "' + f + '" exists in studio.html', ok, ok ? 'found' : 'MISSING');
  }
  for (const r of TABLE[f].scoped || []) {
    let body = '';
    try { body = lift(src, r); } catch { /* reported above */ }
    /* ⭐ CONTAINMENT, NOT MERE PRESENCE — AND THE DIFFERENCE IS THE WHOLE GATE.
     * The first cut of this leg asked only whether the word propPurpose or a _ruleInScope( call
     * appeared ANYWHERE in the reader. _yardIntelligence is a 300-line function that calls
     * _ruleInScope nine times, for rules A through I. Deleting Rule I's gate specifically would have
     * left eight other calls standing and THE LEG WOULD HAVE STAYED GREEN while isRented was read
     * on a primary residence. A function-level test for a site-level claim is a proxy, and the gap
     * between a claim and its proxy is where every false green in this project has lived.
     * So: every READ of the field must sit inside an actual purpose gate. Two honest shapes —
     *   EARLY-RETURN  `if (…propPurpose…) return …;`  guards everything after it (_yardRentNet)
     *   BLOCK         `if (…_ruleInScope…) { … }`     guards its own braces  (_yardIntelligence)
     * ⚠️ COMMENTS STRIPPED FIRST: the prose around these guards discusses propPurpose at length, and
     * a SENTENCE ABOUT a guard must never satisfy a check FOR the guard (§17.3a).
     * A LABEL IS COPY; A BINDING IS THE THING. */
    const rc = stripComments(body);
    const blocks = [], earlies = [];
    for (const g of rc.matchAll(/\bif\s*\(/g)) {
      let d = 0, j = g.index + g[0].length - 1;
      for (; j < rc.length; j++) { if (rc[j] === '(') d++; else if (rc[j] === ')') { d--; if (!d) break; } }
      const cond = rc.slice(g.index, j + 1);
      if (!/propPurpose|_ruleInScope\s*\(/.test(cond)) continue;
      let k = j + 1; while (k < rc.length && /\s/.test(rc[k])) k++;
      if (rc[k] === '{') {
        let bd = 0;
        for (let m = k; m < rc.length; m++) {
          if (rc[m] === '{') bd++;
          else if (rc[m] === '}') { bd--; if (!bd) { blocks.push([k, m]); break; } }
        }
      } else {
        earlies.push(k);                       // a guard that returns: everything after it is gated
      }
    }
    const sites = [...rc.matchAll(new RegExp('[A-Za-z_$][\\w$]*\\.' + f + '\\b', 'g'))].map((m) => m.index);
    const ungated = sites.filter((i) => !blocks.some(([a, b]) => i > a && i < b) && !earlies.some((p) => i > p));
    /* ⚠️ TWO LEGITIMATE SHAPES, AND THIS GATE LEARNED THE SECOND ONE THE HONEST WAY — by going RED on
     * correct code. _yardRentNet is rentMonthly's scoped reader and NEVER TOUCHES THE FIELD: it calls
     * _yardRentMonthly(prop), the RAW reader, and gates the RESULT. That indirection is not a loophole,
     * it IS the two-reader design the bank asked for — so demanding a direct read here would have
     * forced the code to get worse to satisfy the instrument.
     *   direct   — it reads the field itself; EVERY read must sit inside a gate.
     *   indirect — it reads a raw reader's result; then the READER ITSELF must carry a purpose gate.
     * Both are checked. What is NOT allowed is a scoped reader with neither: no gate and no direct
     * read is a surface drawing meaning with nothing standing between it and a primary residence. */
    const gates = blocks.length + earlies.length;
    const shape = sites.length ? 'direct' : 'indirect';
    need('SCOPED reader ' + r + '() draws meaning from "' + f + '" ONLY behind a purpose gate [' + shape +
      '] — ungated reads: ' + ungated.length,
      ungated.length === 0 && gates > 0, r + ' · ' + sites.length + ' direct read(s), ' +
      blocks.length + ' block-guard(s), ' + earlies.length + ' early-return guard(s)');
  }
}
/* THE RAW OWNER MUST RE-RENDER THE PERSISTED VALUE. Without this, switching purpose away and back
   LOOKS LIKE DELETION even though the value survived — contract item (2), the reason a RAW reader
   is named separately from a SCOPED one at all. */
for (const o of owners) {
  let body = '';
  try { body = lift(src, o.fn); } catch { /* presence leg covers it */ }
  const ob = stripComments(body);
  for (const f of o.fields) {
    if (!TABLE[f]) continue;
    /* TWO HONEST SHAPES, AND ONLY TWO. A text input re-renders by putting the persisted value in its
       `value=` attribute; a <select> re-renders by marking the persisted option `selected`. Both are
       "the value survives a round trip through the DOM". Anything else is not a re-render, and a
       field that is read but never rendered back is the deletion-look this contract exists to stop. */
    const readsIt = new RegExp('acc\\.' + f + '\\b').test(ob);
    const rendersValue = new RegExp('value="\\$\\{v\\(acc\\.' + f + '\\)\\}"').test(ob);
    const rendersSelected = /selected/.test(ob) && readsIt;
    need('RAW owner ' + o.fn + '() re-renders the persisted "' + f + '" into its own input',
      readsIt && (rendersValue || rendersSelected), o.fn);
  }
}

/* ── E · THE VALUE IS KEPT ON PURPOSE CHANGE (contract item 1) ────────────────────────────────────
 * Never cleared, never nulled. The whole two-reader design exists BECAUSE the value survives; a
 * clear-on-switch would make the contract moot and the room lossy in one edit. */
const cleared = [];
for (const f of declared) {
  const re = new RegExp('(?:delete\\s+[A-Za-z_$][\\w$]*\\.' + f + '\\b)|(?:[A-Za-z_$][\\w$]*\\.' + f + '\\s*=\\s*(?:\'\'|""|null|undefined))', 'g');
  for (const m of code.matchAll(re)) cleared.push(f + ' @line ' + src.slice(0, m.index).split('\n').length);
}
need('A DECLARED FIELD IS NEVER CLEARED OR NULLED — the value is KEPT on purpose change — found: [' +
     cleared.join(' | ') + ']', cleared.length === 0, declared.length + ' fields swept');

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[property_18_10] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length);
process.exit(bad === 0 ? 0 : 1);
