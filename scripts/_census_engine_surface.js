/* _census_engine_surface.js — THE WHOLE BOARD, NOT A COUNT OF WHAT IS WRONG WITH IT.
 *
 * ⛔⛔ WHY THIS EXISTS, AND IT IS THE MOST IMPORTANT PARAGRAPH IN THE FILE.
 *    Over six sessions this programme reported, in order: 3, then 6, then 9, then 27, then 78,
 *    then 91, then 94. Every one of those was true. Every one was a NUMERATOR WITH NO DENOMINATOR,
 *    and — worse — each was a numerator over a DIFFERENT POPULATION: refusals on one door, then
 *    refusals collected from all doors, then payload keys, then hardcoded values anywhere in the
 *    chain, then gated values, then the SS matrix's extras. The populations are nested and each is
 *    wider than the last, so a widening QUESTION read, every single time, as a deepening DEFECT.
 * 🔑 THE NUMBER WAS NEVER GROWING. THE QUESTION WAS. And nobody ever drew the boundary of the
 *    question, so there was no way to tell the two apart from the outside.
 *
 * ⛔ SO THIS FILE ASKS A QUESTION THAT CANNOT WIDEN. The engine's request model has a FIXED number
 *    of fields. Every one of them is, for a given configuration, in exactly one bucket. The buckets
 *    sum to the total. A census cannot surprise you with a 29th row, because a 29th row requires
 *    someone to edit schemas.py — a deliberate act in a file this census reads on every run.
 * 🔑 AN EXCLUDE-LIST OVER AN OPEN WORLD ("find what is wrong") HAS NO BOTTOM. AN INCLUDE-LIST OVER
 *    A CLOSED WORLD ("classify all of it") HAS EXACTLY ONE. That law was already written down in
 *    this programme, at the instrument level. It had never been applied to the programme itself.
 *
 * ⛔⛔ AND IT MEASURES THE ONE CLASS EVERY PREVIOUS INSTRUMENT WAS STRUCTURALLY BLIND TO.
 *    _gate_payload_accounted asks "is anything SENT unaccounted for?" — a question about keys that
 *    are ON the wire. A field the engine accepts and the client NEVER SENDS cannot appear on a
 *    payload, so it can never be enumerated, so it has never once been counted. Those fields are
 *    not inert: pydantic fills them in. `plan_end_age` defaults to 93 INSIDE THE ENGINE.
 *    ⇒ CLEARING A VALUE ON THE CLIENT DOES NOT REMOVE IT. IT MOVES WHO SUPPLIES IT.
 *      That is why the purge keeps looking finished and keeps not being finished.
 *
 * ⚠️ WHAT IT DOES NOT PROVE, STATED HERE RATHER THAN LEARNED LATER: it does not prove any default
 *    is WRONG, and it does not measure how far any of them moves the answer. It proves only WHO
 *    SUPPLIED EACH VALUE — the user, the client, or the engine. That is the Clause 2 question
 *    exactly, and it is not the Clause 1 question, which L18 of the payload gate holds.
 *
 * INPUT  · scripts/_dump_engine_schema.py   (the engine's own model_fields — the denominator)
 *        · $TMP/datum-payload-observed.json (written by _gate_payload_accounted.js — the observed
 *          client payloads in BOTH configurations)
 * ⛔ IT REFUSES IF EITHER IS MISSING. A census that silently measures nothing is the empty-green
 *    species this programme exists to eliminate.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const OBSERVED = path.join(os.tmpdir(), 'datum-payload-observed.json');
const DECL = path.join(__dirname, '_payload_sources.json');
const ROOT_DIR = path.resolve(__dirname, '..');

function die(msg) {
  console.log('CENSUS REFUSED — ' + msg);
  console.log('OVERALL: RED');
  process.exit(1);
}

/* ── 1. THE DENOMINATOR, off the engine's own model. */
let schema;
try {
  const raw = execFileSync('python', [path.join(__dirname, '_dump_engine_schema.py')], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
  });
  schema = JSON.parse(raw);
} catch (e) {
  die('could not read the engine schema (' + (e.message || e) + ').\n'
    + '  The engine repo must be on disk. Set DATUM_ENGINE_DIR if it is not at ~/datum-fi.');
}
if (schema.error) die(schema.error);
const FIELDS = schema.CalculateRequest;
if (!FIELDS) die('CalculateRequest carries no model_fields');

/* ── 2. THE OBSERVATION, off the gate that walks the real product.
   ⛔⛔ IT RUNS THE GATE ITSELF RATHER THAN ASKING SOMEBODY TO REMEMBER TO. A two-step
      instrument where step one is "and first run this other thing" is a two-step instrument
      that gets run half way, and the half that gets skipped is the half that touches the
      product. Worse, a STALE observation file is indistinguishable from a fresh one in the
      output, so the census would confidently report last week's payload against today's schema.
   ⚠️ STALENESS IS A REFUSAL, NOT A WARNING. An observation older than the age below is not
      used; it is replaced. The census must never print a number whose two halves were measured
      against different versions of the product. */
const MAX_OBSERVATION_AGE_MS = 30 * 60 * 1000;
function observationAge() {
  try { return Date.now() - fs.statSync(OBSERVED).mtimeMs; } catch (e) { return Infinity; }
}
if (observationAge() > MAX_OBSERVATION_AGE_MS) {
  const why = fs.existsSync(OBSERVED) ? 'the observed payloads are stale' : 'no observed payloads yet';
  console.log('· ' + why + ' — walking the product now (this drives a real browser, ~40s)\n');
  try {
    execFileSync(process.execPath, [path.join(__dirname, '_gate_payload_accounted.js')],
      { stdio: 'ignore', cwd: ROOT_DIR, timeout: 5 * 60 * 1000 });
  } catch (e) {
    /* ⚠️ THE GATE EXITS NON-ZERO WHENEVER IT IS RED, WHICH IS ITS NORMAL STATE TODAY. A red gate
       is not a failed measurement — it still wrote its observation. So the exit code is ignored
       here and the FILE is what decides, which is also why the staleness check runs again below
       rather than trusting that the call succeeded. */
  }
}
if (observationAge() > MAX_OBSERVATION_AGE_MS) {
  die('could not obtain a fresh observation of the client payloads.\n'
    + '  Run `node scripts/_gate_payload_accounted.js` directly to see why it could not walk the product.');
}
const obs = JSON.parse(fs.readFileSync(OBSERVED, 'utf8'));
const decl = JSON.parse(fs.readFileSync(DECL, 'utf8'));

/* ── 3. CLASSIFY. Every field lands in exactly one bucket, per configuration. */
const CONFIGS = ['solo', 'dual'];
const BUCKET = {
  ASKED:        'the user answered it, because a door refused until they did',
  DECLARED:     'sent, and declared machinery/derived with a source that holds',
  UNACCOUNTED:  'SENT WITH NOBODY ASKED — the client decided',
  LAUNDERED:    'SENT WITH NOBODY ASKED, wearing the word "derived"',
  ENGINE_FILLS: 'NEVER SENT — THE ENGINE SUBSTITUTES ITS OWN VALUE',
  ABSENT_OK:    'never sent, and the engine treats absence as absence (default None)',
  WOULD_422:    'REQUIRED by the engine and not sent — the request cannot succeed'
};

function classify(field, cfg) {
  const c = obs[cfg] || {};
  const payload = c.payload || {};
  const sent = Object.prototype.hasOwnProperty.call(payload, field);
  const meta = FIELDS[field];
  const launderedHere = (obs.laundered || []).some(
    (s) => s.toUpperCase().startsWith(cfg.toUpperCase() + ':') && s.includes(' ' + field + ' ')
  );

  if (sent) {
    if (launderedHere) return 'LAUNDERED';
    if ((c.askedKeys || []).includes(field)) return 'ASKED';
    if ((c.unaccounted || []).includes(field)) return 'UNACCOUNTED';
    if ((c.declaredKeys || []).includes(field)) return 'DECLARED';
    return 'UNACCOUNTED';
  }
  if (meta.required) return 'WOULD_422';
  return meta.default === null ? 'ABSENT_OK' : 'ENGINE_FILLS';
}

const rows = Object.keys(FIELDS).map((f) => ({
  field: f,
  required: FIELDS[f].required,
  engineDefault: FIELDS[f].default,
  solo: classify(f, 'solo'),
  dual: classify(f, 'dual')
}));

/* ── 4. KEYS THE CLIENT SENDS THAT THE ENGINE DOES NOT DECLARE.
   ⚠️ NOT HARMLESS, AND THE ENGINE SAYS SO ITSELF: model_config is extra="allow", chosen
      deliberately so unknown keys are KEPT AND REPORTED rather than silently dropped. A key here
      is one the client believes it is sending and the engine has no concept of. */
const allSent = new Set();
CONFIGS.forEach((c) => Object.keys((obs[c] || {}).payload || {}).forEach((k) => allSent.add(k)));
const strangers = [...allSent].filter((k) => !FIELDS[k]);

/* ── 5. THE BOARD. */
function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
const MARK = {
  ASKED: 'ok  ', DECLARED: 'ok  ', ABSENT_OK: 'ok  ',
  UNACCOUNTED: 'OPEN', LAUNDERED: 'OPEN', ENGINE_FILLS: 'OPEN', WOULD_422: 'FAIL'
};

console.log('');
console.log('THE ENGINE SURFACE — EVERY FIELD /api/calculate ACCEPTS, AND WHO SUPPLIES IT');
console.log('engine: ' + schema.engine_dir + '  ·  unknown-key policy: extra="' + schema.extra_policy + '"');
console.log('client payloads observed: ' + obs.measured_at);
console.log('');
console.log(pad('FIELD', 34) + pad('SOLO', 14) + pad('DUAL', 14) + 'ENGINE DEFAULT IF NOT SENT');
console.log('-'.repeat(100));
for (const r of rows) {
  const def = r.required ? '(required — no default)' : JSON.stringify(r.engineDefault);
  console.log(pad(r.field, 34) + pad(MARK[r.solo] + ' ' + r.solo, 19)
    + pad(MARK[r.dual] + ' ' + r.dual, 19) + def);
}

/* ── DECLARED FOR A PAYLOAD THIS CENSUS NEVER SEES.
   ⛔⛔ FOUND BY THE BOARD ITSELF ON ITS FIRST RUN, WHICH IS THE ARGUMENT FOR HAVING ONE.
      payload_sources.json declares keys as machinery/derived that are NOT ON THE /api/calculate
      PAYLOAD AT ALL. They belong to the SS-MATRIX builder — a SECOND request surface, with its own
      assembly code and its own defaults, which no instrument in this repo has ever enumerated.
   🔑 A DECLARATION FILE THAT COVERS TWO PAYLOADS WHILE THE GATE WALKS ONE WILL ALWAYS READ AS
      COMPLETE AND ALWAYS BE HALF A CENSUS. That is the same shape as a gate that walks one
      configuration, one level further out. */
const declaredNames = Object.keys(decl.keys || {});
const declaredUnseen = declaredNames.filter((k) => !allSent.has(k));

console.log('');
console.log('TOTALS — the buckets sum to the field count, which is the whole point');
for (const cfg of CONFIGS) {
  const tally = {};
  rows.forEach((r) => { tally[r[cfg]] = (tally[r[cfg]] || 0) + 1; });
  const parts = Object.keys(BUCKET).filter((b) => tally[b]).map((b) => b + '=' + tally[b]);
  const sum = Object.values(tally).reduce((a, b) => a + b, 0);
  console.log('  ' + pad(cfg.toUpperCase(), 6) + parts.join('  ') + '   [sum ' + sum + ' of ' + rows.length + ']');
}

console.log('');
console.log('WHAT IS STILL OPEN, IN CONFIGURATION DUAL, FOR CLASS "a value the user did not choose":');
const open = rows.filter((r) => ['UNACCOUNTED', 'LAUNDERED', 'ENGINE_FILLS'].includes(r.dual));
open.forEach((r) => {
  const who = r.dual === 'ENGINE_FILLS' ? 'the ENGINE supplies' : 'the CLIENT supplies';
  const val = r.dual === 'ENGINE_FILLS'
    ? JSON.stringify(r.engineDefault)
    : JSON.stringify(((obs.dual || {}).payload || {})[r.field]);
  console.log('  · ' + pad(r.field, 32) + pad(who, 20) + val);
});
console.log('');
console.log('  ' + open.length + ' open, in configuration DUAL, for class "a value the user did not'
  + ' choose", of ' + rows.length + ' fields the engine accepts.');
console.log('  ⛔ SPLIT BY WHO SUPPLIES IT: '
  + open.filter((r) => r.dual !== 'ENGINE_FILLS').length + ' from the client, '
  + open.filter((r) => r.dual === 'ENGINE_FILLS').length + ' from the engine.'
  + ' CLEARING A CLIENT KEY MOVES IT INTO THE SECOND GROUP; IT DOES NOT REMOVE IT.');

if (strangers.length) {
  console.log('');
  console.log('SENT BY THE CLIENT, NOT DECLARED BY THE ENGINE (kept and reported, never modelled):');
  strangers.forEach((k) => console.log('  · ' + k));
}

if (declaredUnseen.length) {
  console.log('');
  console.log('DECLARED IN payload_sources.json BUT NEVER ON THIS PAYLOAD (' + declaredUnseen.length
    + ' of ' + declaredNames.length + ' declarations):');
  declaredUnseen.forEach((k) => console.log('  · ' + pad(k, 32)
    + ((decl.keys[k] || {}).kind || '?') + ' — belongs to the SS-matrix request, not to /api/calculate'));
  console.log('  ⛔ THESE DECLARATIONS HAVE NEVER BEEN CHECKED AGAINST ANYTHING. A declaration whose'
    + ' payload no instrument walks is a promise nobody has read.');
}

/* ══ THE SECOND SURFACE, COUNTED FOR THE FIRST TIME ═══════════════════════════════════════════
   ⛔⛔ THIS BLOCK REPLACES AN EDGE NOTE THAT HAD BEEN FALSE FOR SIX DAYS, AND THE STALENESS IS
      THE FINDING. It read: "`buildMatrixRequest` is NOT REACHABLE from any scope an instrument
      can address ... it CANNOT BE CALLED BY A HARNESS AT ALL", and then named the method to close
      it: *expose the builder the way _buildStudioRequest is exposed.*
      ⭐ THAT WAS DONE ON 2026-09-13. studio.html:20796 carries `window.buildMatrixRequest =
         buildMatrixRequest;` with a note saying it exists so this census can read it. The walk
         that reads it was written too. BOTH HALVES SHIPPED AND THE CENSUS WENT ON PRINTING THAT
         IT WAS IMPOSSIBLE, because nothing ever re-read the sentence.
      ⛔ AND IT WAS DARK FOR A SECOND REASON ON TOP OF THE FIRST: the walk lives behind
         `_gate_payload_accounted`'s L0, and that gate's fixture was keyed on a control id that no
         longer exists, so it stopped at the healthcare door and never reached the matrix at all.
         TWO INDEPENDENT BLINDFOLDS OVER ONE SURFACE, and removing either alone changed nothing.
   🔑 A CAPABILITY THAT SHIPPED AND A CENSUS THAT STILL SAYS IT IS IMPOSSIBLE ARE THE SAME DEFECT
      AS A DEFAULT NOBODY CHOSE: a recorded claim outliving the thing it described. §82.2752.
   ⚠️ SO THIS SECTION IS DERIVED, NEVER TYPED. If the observation carries no matrix body it says
      UNMEASURED and says why — it must never again assert a shape from memory. */
const mObs = (obs.matrix || {});
const mSolo = mObs.solo || {}, mDual = mObs.dual || {};
console.log('');
console.log('══ SURFACE 2 OF 2 — THE SS-MATRIX REQUEST, ITS OWN BUILDER AND ITS OWN DEFAULTS ══');
if (!mSolo.reachable && !mDual.reachable) {
  console.log('⛔ UNMEASURED THIS RUN. The observation carries no matrix body, so every count here');
  console.log('   would be ZERO BECAUSE NOBODY LOOKED, not because nothing is there.');
  console.log('   ⇒ the walk lives in _gate_payload_accounted (walkMatrix). If it is stuck, fix that first.');
} else {
  const mBody = mDual.body || mSolo.body || {};
  const mKeys = Object.keys(mBody);
  const calcDual = (obs.dual || {}).payload || {};
  const onlyMatrix = mKeys.filter((k) => !(k in calcDual));
  const onlyCalc = Object.keys(calcDual).filter((k) => !(k in mBody));
  /* ⛔ UNACCOUNTED IS DERIVED FROM THE SAME PREDICATE THE CALCULATE SURFACE USES — a key on the
     body that no control refused for. Re-deriving it differently here would let the two surfaces
     disagree about what "the user did not choose" means, which is the defect one level up. */
  const askedDual = new Set(((obs.dual || {}).askedKeys) || []);
  const mUnaccounted = mKeys.filter((k) => !askedDual.has(k) && k !== 'accounts');
  console.log('  reachable: solo=' + !!mSolo.reachable + ' · dual=' + !!mDual.reachable
    + '  ·  keys: solo=' + Object.keys(mSolo.body || {}).length + ' dual=' + mKeys.length);
  console.log('  ONLY ON THE MATRIX (' + onlyMatrix.length + '): ' + (onlyMatrix.join(', ') || 'none'));
  console.log('  ONLY ON CALCULATE (' + onlyCalc.length + '): ' + (onlyCalc.join(', ') || 'none'));
  console.log('  ⚠️ A DIFFERENCE IS A DECISION; AN UNEXPLAINED DIFFERENCE IS A DEFECT. This reports, it does not judge.');
  console.log('');
  console.log('  ON THE MATRIX BODY AND NOT ASKED FOR ANYWHERE (' + mUnaccounted.length + '):');
  mUnaccounted.forEach((k) => console.log('    · ' + pad(k, 32) + JSON.stringify(mBody[k])));
  console.log('  🔑 THIS SURFACE CANNOT BE CLEANED BY FIXING THE OTHER ONE. It has its own builder,');
  console.log('     so a default removed from /api/calculate survives here until removed here too.');

  /* ══ THE UNION — THE ONLY NUMBER ON THIS PAGE THAT IS ABOUT THE PRODUCT ══════════════════════
     ⛔⛔ EITHER SURFACE'S COUNT ALONE IS A HALF-TRUTH, AND THE HALVES OVERLAP. A key cleaned off
        /api/calculate and left on the matrix body is still a value nobody chose reaching an
        engine — it simply reaches it through the other door. §82.2760, a denominator is part of
        the result: the denominator here is BOTH BUILDERS, not the one that happens to be open.
     ⭐ THIS IS A CLOSED SET AND THAT IS THE WHOLE POINT. It is derived from the engine's own
        request model and the second builder's own body — not from a list anybody wrote — so it
        CAN GO TO ZERO, and the distance to zero is printable on any day somebody asks. */
  const unionOpen = new Set([...open.map((r) => r.field), ...mUnaccounted]);
  const bothSurfaces = [...unionOpen].filter((k) => open.some((r) => r.field === k) && mUnaccounted.includes(k));
  const matrixOnly = mUnaccounted.filter((k) => !open.some((r) => r.field === k));
  console.log('');
  console.log('══ THE UNION ACROSS BOTH SURFACES — "a value no household chose" ══');
  console.log('  ' + unionOpen.size + ' distinct keys reach an engine without anyone having chosen them.');
  console.log('    · ' + open.length + ' on /api/calculate · ' + mUnaccounted.length + ' on the SS-matrix request'
    + ' · ' + bothSurfaces.length + ' on BOTH · ' + matrixOnly.length + ' reachable ONLY through the matrix door.');
  if (matrixOnly.length) {
    console.log('  ⛔ THE MATRIX-ONLY ONES ARE THE EASIEST TO MISS AND THE LAST TO BE FOUND:');
    matrixOnly.forEach((k) => console.log('    · ' + pad(k, 32) + JSON.stringify(mBody[k])));
  }
  console.log('  🔑 THE COUNT HAS RISEN EVERY TIME IT WAS TAKEN, AND NOT BECAUSE THE PRODUCT GOT WORSE.');
  console.log('     It rose because a SURFACE came into view. Surfaces are finite and this census now');
  console.log('     names the ones it does not cover, so the rising stops — not when the defaults run');
  console.log('     out, but when the surfaces do.');
}

console.log('');
console.log('══ THE EDGE OF THIS CENSUS — WHAT IT DOES NOT COVER, NAMED WITH ITS METHOD ══');
console.log('✅ THE TWO EDGES THIS SECTION USED TO NAME ARE BOTH CLOSED, 2026-09-19:');
console.log('   · the SS-matrix request is walked and counted above;');
console.log('   · JOINT-THAT-BECAME-SOLO is walked by _gate_payload_accounted L19-L22 — the toggle');
console.log('     is turned off after being on, the estate loss is named, and the co-architect keys');
console.log('     are re-enumerated. Both were BUILT and DARK, not absent.');
console.log('⛔ 1. THE THIRD CONFIGURATION IS NOT ON THIS BOARD. The columns here are SOLO and DUAL.');
console.log('     Joint-that-became-solo is measured in a gate and has no column, so every count');
console.log('     printed above is silent about it.');
console.log('     ⇒ METHOD TO CLOSE IT: a third column, fed by the same observation file.');
console.log('⛔ 2. ONE HOUSEHOLD PER CONFIGURATION. The walk answers each refusal with a SHAPE, so');
console.log('     these counts describe the fields a door demands, NEVER whether the value is right.');
console.log('     ⇒ METHOD TO CLOSE IT: this is the engine harness\'s job, not this one\'s.');
console.log('🔑 AN EDGE NOTE IS A MEASUREMENT AND GOES STALE LIKE ONE. The two above were true when');
console.log('   written and false within a week, and nothing re-read them. Check this list against');
console.log('   the product before quoting it — that is what the last one cost.');
console.log('');
