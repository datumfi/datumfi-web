'use strict';
/* CODEC ROUND-TRIP COMPLETENESS GATE — every mirrored key survives encode -> decode.
 *
 * ⛔ WHY THIS EXISTS, AND WHY THE GATE THAT ALREADY COVERED THIS FILE DID NOT CATCH IT.
 * Schema 1.1.0 (8a59e13) added eight fields. `datum-archive-codec.js` compresses a blueprint into
 * POSITIONAL arrays -- T:[filing, location, working_year_effective_rate] and P:[8 profile slots] --
 * and `dBlueprint()` REBUILDS both objects literally, so a key with no slot decodes to `undefined`.
 * All eight were silently dropped. NOTHING FAILED: not the build, not the 266-gate suite, and not
 * `_archive_codec_parity.js`, which is a STANDING GATE OVER THIS EXACT FILE asserting a "LOSSLESS
 * round-trip".
 * 🔑 IT STAYED GREEN BECAUSE ITS FIXTURE IS A HAND-WRITTEN MIRROR OF THE CODEC'S OWN SHAPE
 *    (`slimBlueprint()` at _archive_codec_parity.js:66 -- `version: '1.0.1'`, a three-key `tax`, an
 *    eight-key `profile`). A fixture authored to match the subject can only ever test the keys
 *    somebody REMEMBERED to put in it. It is not dead and it is not laundered: it faithfully proves
 *    a property that cannot fail for the reason we care about. THAT GATE IS NOT REPLACED BY THIS ONE
 *    -- it still owns heterogeneous account data, budget caps and the wouldFit contract. This one
 *    owns COMPLETENESS, which is the thing no hand-written fixture can own.
 *
 * ⭐ THE FIXTURE IS DERIVED, NEVER AUTHORED. Subject = `slimSlotForClerk(DatumBlueprint['new']())`.
 *    That is the product's OWN statement of what gets mirrored, and it passes `profile` and `tax`
 *    THROUGH WHOLE (`profile: bp.profile`, `tax: bp.tax`, studio-blueprint.js:176/266). So the day a
 *    field is added to the schema, slim carries it, the codec drops it, and THIS GATE GOES RED
 *    WITHOUT ANYONE EDITING THIS FILE. That self-maintenance is the whole point; do not "simplify"
 *    the derivation into a literal.
 *
 * ⚠️ MEASURED PROVENANCE (2026-09-05). The defect was found by code read, refused as a filing on a
 *    code read, and PROVEN through the product's own restore path first -- a real page, real nav.js,
 *    D1 forced to 500 so listDocs rejects and nav.js:403 fallback() runs _restoreBlueprint for real.
 *    9/9 suspect keys destroyed on the codec leg, 0/9 on the full-fidelity D1 leg, 0/7 control keys
 *    lost. This gate is the cheap standing form of that measurement, not a substitute for it.
 *
 * ⛔ WHAT A RESTORED-BLANK SALARY DOES ON SCREEN, so nobody re-scopes this as cosmetic: four
 *    surfaces print a CONFIDENT 0% rather than going quiet -- needs% and wants%
 *    (studio.html:5851-5852), the Operating Upkeep load and charity-as-%-of-gross (:6015-6019), and
 *    charity again at :13416. `x > 0 ? ... : 0` conflates "earns nothing" with "we do not know".
 *
 * LEGS
 *   L1 POPULATION  the derived leaf set is non-empty and the sentinels are actually IN the fixture
 *                  before the round trip (a probe measuring the disappearance of a value that was
 *                  never there measures nothing).
 *   L2 EXCLUSIONS  every excluded path EXISTS in the fixture -- a stale or misspelt exclusion is a
 *                  silent hole, so the list is checked for PRESENCE, not just consulted.
 *   L3 COMPLETE    every non-excluded leaf survives encode -> decode with its value intact.
 *   L4 CONTROL     the keys the codec has always carried still survive (selective loss, not a wipe
 *                  with a broken rig behind it).
 *
 * MUTATION (the control, and it mutates the SUBJECT, not the harness)
 *   --regap   rewrites datum-archive-codec.js IN MEMORY back to its pre-fix positional arrays and
 *             runs the gate against THAT. Expect: L3 reds on exactly the nine appended paths, L4
 *             stays green. Anchors are asserted to match EXACTLY ONCE -- a replace that silently
 *             matched zero times would produce a clean green and prove nothing.
 *
 * ⚠️ DECLARED GAP, ON THE RECORD RATHER THAN IN A FOOTNOTE: `accounts` is [] in a fresh blueprint,
 *    so this gate proves NOTHING about per-account keys -- a predicate over an empty set is true.
 *    Account-element fidelity is owned by _archive_codec_parity.js's heterogeneous generator. If
 *    that ever stops being true, this gap becomes a hole.
 *
 * Run: node scripts/_gate_codec_roundtrip_complete.js        (exit 0 = GREEN, non-0 = RED)
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const REGAP = process.argv.includes('--regap');
const DEFAULTED = process.argv.includes('--defaulted');
const CODEC_PATH = path.join(__dirname, 'datum-archive-codec.js');

let pass = 0, fail = 0;
const lines = [];
const ok = (c, m) => { if (c) { pass++; lines.push('  PASS  ' + m); } else { fail++; lines.push('  FAIL  ' + m); } return c; };

/* ── EXCLUSIONS (§82.1667) — omission as a DECISION ON THE RECORD ──────────────────────────────
 * The append-only convention is the trap: appending a slot is safe, so NOT appending one is also
 * safe, and nothing distinguishes "deliberately not carried" from "forgotten". Every entry needs a
 * reason a reader can disagree with. L2 asserts each path really exists, so this list cannot rot
 * quietly into a hole. */
const EXCLUDE = {
  'version': 'dBlueprint() stamps the CODEC\'s own format version on decode; it is not user data. '
           + '⚠️ IT CURRENTLY STAMPS "1.0.1" WHILE THE LIVE SCHEMA IS 1.1.0, so a restored blueprint '
           + 'reports a version it is not. Raised for a ruling; excluded here rather than silently passed.'
};

/* ── the codec under test, optionally regapped ───────────────────────────────────────────────── */
function loadCodec(forceRegap) {
  const regap = forceRegap === undefined ? REGAP : forceRegap;
  /* Endings are normalised for MATCHING ONLY. The file on disk is CRLF and stays CRLF — this never
   * writes back. Without this the anchors below would match zero times on a CRLF checkout and
   * --regap would run the UNMUTATED codec while reporting success, which is the shell-printed-green
   * failure (§82.1628) wearing a different hat. The exactly-once assertion catches it either way. */
  let src = fs.readFileSync(CODEC_PATH, 'utf8').replace(/\r\n/g, '\n');
  if (regap) {
    /* post-fix text -> pre-fix text. Each must match EXACTLY ONCE. */
    const swaps = [
      ["T: [tx.filing || 0, tx.location || 0, tx.working_year_effective_rate || 0,\n          tx.method || 0, tx.co_method || 0, tx.co_filing || 0, tx.co_location || 0,\n          tx.co_working_year_effective_rate || 0],",
       "T: [tx.filing || 0, tx.location || 0, tx.working_year_effective_rate || 0],"],
      ["tax: { filing: c.T[0], location: c.T[1], working_year_effective_rate: c.T[2],\n             method: _uS(c.T[3]), co_method: _uS(c.T[4]), co_filing: _uS(c.T[5]),\n             co_location: _uS(c.T[6]), co_working_year_effective_rate: _uN(c.T[7]) },",
       "tax: { filing: c.T[0], location: c.T[1], working_year_effective_rate: c.T[2] },"],
      ["p.co_architect_retirement_date || '', p.plan_end_age || 0, p.co_architect_enabled ? 1 : 0,\n          p.plan_end_date || '', p.primary_salary || 0, p.co_architect_salary || 0,\n          p.co_architect_plan_end_date || ''],",
       "p.co_architect_retirement_date || '', p.plan_end_age || 0, p.co_architect_enabled ? 1 : 0],"],
      ["co_architect_retirement_date: c.P[5], plan_end_age: c.P[6], co_architect_enabled: !!c.P[7],\n        plan_end_date: _uS(c.P[8]), primary_salary: _uN(c.P[9]),\n        co_architect_salary: _uN(c.P[10]), co_architect_plan_end_date: _uS(c.P[11])",
       "co_architect_retirement_date: c.P[5], plan_end_age: c.P[6], co_architect_enabled: !!c.P[7]"]
    ];
    swaps.forEach(([after, before], i) => {
      const n = src.split(after).length - 1;
      if (n !== 1) {
        console.log('⛔ --regap ANCHOR ' + (i + 1) + ' MATCHED ' + n + ' TIMES, EXPECTED EXACTLY 1. The '
          + 'mutation did not land, so a green here would prove nothing.\n    anchor: '
          + after.slice(0, 80).replace(/\n/g, ' ') + '...');
        process.exit(1);
      }
      src = src.split(after).join(before);
    });
  }
  /* --defaulted: the §82.1668 violation, written out. Rewrites the absent-preserving helpers into
   * the naive defaulting form a reasonable person would reach for, so a pre-1.1.0 blob decodes to a
   * manufactured '' / 0 instead of ABSENT. Must red EXACTLY L5b. Without this, L5b is an unearned
   * pass over a constraint that is only ever satisfied and never tested. */
  if (DEFAULTED) {
    const a = "  function _uN(v) { return v === undefined ? undefined : v; }\n"
            + "  function _uS(v) { return v === undefined ? undefined : (v === 0 ? '' : v); }";
    const b = "  function _uN(v) { return v || 0; }\n"
            + "  function _uS(v) { return v || ''; }";
    const n = src.split(a).length - 1;
    if (n !== 1) {
      console.log('⛔ --defaulted ANCHOR MATCHED ' + n + ' TIMES, EXPECTED EXACTLY 1. The mutation did '
        + 'not land, so a green here would prove nothing.');
      process.exit(1);
    }
    src = src.split(a).join(b);
  }
  const m = new Module(CODEC_PATH, null);
  m.filename = CODEC_PATH;
  m.paths = Module._nodeModulePaths(path.dirname(CODEC_PATH));
  m._compile(src, CODEC_PATH);
  return m.exports;
}

/* ── fixture: derived from the product, sentinelled SHAPE-AWARE ──────────────────────────────────
 * ⚠️ A blind stringify-everything filler INVENTS ITS OWN DEFECT. Measured while building this gate:
 * setting climate.custom_weights to a string made the codec look lossy when it handles the real
 * object correctly (§82.1624). Sentinels must respect the shape the product actually produces. */
let seq = 0;
function sentinel(key, val) {
  seq++;
  if (typeof val === 'number')  return 1000 + seq;
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string')  return 'S' + seq + '_' + key;
  return val;
}
function populate(o) {
  Object.keys(o).forEach((k) => {
    const v = o[k];
    if (Array.isArray(v)) return;                                   // arrays: see DECLARED GAP
    if (v && typeof v === 'object') return populate(v);
    o[k] = sentinel(k, v);
  });
  return o;
}
function leaves(o, p, out) {
  Object.keys(o).forEach((k) => {
    const v = o[k], q = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, out); else out.push(q);
  });
  return out;
}
const get = (o, q) => q.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Keys the codec has carried since before schema 1.1.0 — L4's control set. If these ever fail, the
 * rig is broken and every other verdict in this file is worthless. */
const CONTROL = ['profile.primary_name', 'profile.co_architect_dob', 'profile.plan_end_age',
                 'profile.co_architect_enabled', 'tax.filing', 'tax.location',
                 'tax.working_year_effective_rate', 'ss.strategy_primary', 'climate.outlook',
                 'datum.net_datum_v1'];

(function main() {
  const Codec = loadCodec();
  const BP = require('./studio-blueprint.js').DatumBlueprint;

  const bp = populate(BP['new']());
  bp.schema = 'DatumFIBlueprintV1';                                  // shape token, not a sentinel
  /* Leaves that are `null` in a fresh blueprint but hold a STRING in life. populate() leaves null
   * alone on purpose (guessing a shape is how a fixture invents a defect), so they are seeded here
   * by hand. Without this their L3 verdict is `null === null` — a vacuous pass over an untested key,
   * which is exactly what L1b exists to refuse. L1b caught this in its own first run. */
  bp.blueprint_id = 'S_blueprint_id';
  bp.saved_at     = '2026-09-05T00:00:00.000Z';
  bp.climate.custom_weights = { bootstrap: 0.30, parametric: 0.20, regime: 0.25, cape: 0.25 };
  const slim = BP.slimSlotForClerk(bp);

  const all = leaves(slim, '', []);
  const subject = all.filter((q) => !(q in EXCLUDE));

  // ── L1 POPULATION ──
  ok(all.length > 0, 'L1a fixture derives a non-empty leaf set from slimSlotForClerk (' + all.length + ' leaves)');
  const unsentinelled = subject.filter((q) => {
    const v = get(slim, q);
    return v === '' || v === 0 || v === null || v === undefined;
  });
  ok(unsentinelled.length === 0,
    'L1b every subject leaf carries a distinguishable sentinel BEFORE the round trip'
    + (unsentinelled.length ? ' — unsentinelled: ' + unsentinelled.join(', ') : ''));

  // ── L2 EXCLUSIONS ──
  const stale = Object.keys(EXCLUDE).filter((q) => all.indexOf(q) < 0);
  ok(stale.length === 0,
    'L2 every excluded path exists in the fixture (a stale exclusion is a silent hole)'
    + (stale.length ? ' — stale: ' + stale.join(', ') : ''));

  // ── round trip, through the codec's real public entry points ──
  const blob = Codec.encodeBlueprintArchive({ slot1: slim, slot2: null, slot3: null, slot4: null });
  const back = Codec.decodeBlueprintArchive(blob);
  const got = back && back.slot1;
  if (!ok(!!got, 'L0 the round trip returned a slot at all')) { report(); return; }

  // ── L3 COMPLETENESS ──
  const lost = subject.filter((q) => !eq(get(slim, q), get(got, q)));
  ok(lost.length === 0, 'L3 every mirrored key survives encode -> decode (' + subject.length
    + ' subject leaves, ' + lost.length + ' lost)');
  lost.forEach((q) => {
    lines.push('        LOST  ' + q.padEnd(38) + ' want=' + JSON.stringify(get(slim, q))
      + '  got=' + JSON.stringify(get(got, q)));
  });

  // ── L4 CONTROL ──
  const ctlLost = CONTROL.filter((q) => !eq(get(slim, q), get(got, q)));
  ok(ctlLost.length === 0, 'L4 CONTROL — the long-carried keys still survive (selective loss, not a '
    + 'broken rig)' + (ctlLost.length ? ' — lost: ' + ctlLost.join(', ') : ''));

  /* ── L5 OLD BLOB -> ABSENT, NOT A DEFAULT (§82.1668) ──────────────────────────────────────────
   * A blob written before schema 1.1.0 has SHORT arrays. Decoding a missing slot to 0 or '' would
   * manufacture an answer nobody gave, indistinguishable from one they did — the §82.1625
   * mechanism. So: encode with the PRE-FIX codec, decode with the CURRENT one, and require the nine
   * appended paths to come back genuinely ABSENT.
   * ⚠️ The decoder here is always the UNMUTATED file, even under --regap: this leg asserts the
   *    FIX's forward-compatibility contract, so running it against the pre-fix decoder would prove
   *    nothing about the thing being claimed. */
  const OldCodec = loadCodec(true);
  const RealCodec = loadCodec(false);   // never regapped; --defaulted still applies (fix-side)
  const oldBlob = OldCodec.encodeBlueprintArchive({ slot1: slim, slot2: null, slot3: null, slot4: null });
  const oldBack = RealCodec.decodeBlueprintArchive(oldBlob);
  const oldSlot = oldBack && oldBack.slot1;
  const APPENDED = ['profile.plan_end_date', 'profile.primary_salary', 'profile.co_architect_salary',
                    'profile.co_architect_plan_end_date', 'tax.method', 'tax.co_method',
                    'tax.co_filing', 'tax.co_location', 'tax.co_working_year_effective_rate'];
  if (ok(!!oldSlot, 'L5a a pre-1.1.0 blob still decodes to a slot (backward compatible)')) {
    const fabricated = APPENDED.filter((q) => get(oldSlot, q) !== undefined);
    ok(fabricated.length === 0,
      'L5b every appended path decodes ABSENT from a pre-1.1.0 blob — no manufactured answer'
      + (fabricated.length ? ' — FABRICATED: ' + fabricated.map((q) => q + '=' + JSON.stringify(get(oldSlot, q))).join(', ') : ''));
    /* The old blob's LONG-STANDING keys must still arrive — otherwise L5b passes because the whole
     * decode collapsed, which is a pass for the wrong reason. */
    const oldCtlLost = CONTROL.filter((q) => !eq(get(slim, q), get(oldSlot, q)));
    ok(oldCtlLost.length === 0, 'L5c CONTROL — a pre-1.1.0 blob still restores its own keys intact'
      + (oldCtlLost.length ? ' — lost: ' + oldCtlLost.join(', ') : ''));
  }

  report();

  function report() {
    console.log('');
    console.log('CODEC ROUND-TRIP COMPLETENESS' + (REGAP ? '   [--regap: pre-fix codec restored]' : ''));
    console.log('  subject: slimSlotForClerk(DatumBlueprint["new"]())  schema ' + BP.SCHEMA + ' v' + BP.VERSION);
    console.log('  excluded (' + Object.keys(EXCLUDE).length + '):');
    Object.keys(EXCLUDE).forEach((q) => console.log('    · ' + q + ' — ' + EXCLUDE[q]));
    console.log('  DECLARED GAP: `accounts` is [] in a fresh blueprint — per-account keys are NOT');
    console.log('                covered here; _archive_codec_parity.js owns them.');
    console.log('');
    lines.forEach((l) => console.log(l));
    console.log('');
    console.log('  ' + (fail === 0 ? 'GREEN' : 'RED') + '   pass ' + pass + ' / fail ' + fail);
    /* ⛔ THE RUNNER MUST BE ABLE TO READ THIS, NOT JUST THE EXIT CODE. Measured 2026-09-05: the
     * first suite run with this gate in it reported VERDICT 205/267 — up one on the DENOMINATOR and
     * not on the numerator, i.e. this file joined the 62 gates judged by exit code alone. A gate
     * that prints a verdict its own runner cannot parse is the human-readable half of the same
     * defect this file exists to punish. `OVERALL:` is one of the six dialects _verdict.mjs knows;
     * it is emitted LAST so it is the summary line, and it carries no VERDICT_NOISE token. */
    console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED'));
    console.log('');
    process.exit(fail === 0 ? 0 : 1);
  }
})();
