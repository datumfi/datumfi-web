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
const DECL = path.join(__dirname, 'payload_sources.json');
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

console.log('');
console.log('══ THE EDGE OF THIS CENSUS — WHAT IT DOES NOT COVER, NAMED WITH ITS METHOD ══');
console.log('⛔ 1. THE SS-MATRIX REQUEST. A SECOND surface with its own builder and its own defaults.');
console.log('     MEASURED THIS SESSION: `buildMatrixRequest` is NOT REACHABLE from any scope an');
console.log('     instrument can address — typeof window.buildMatrixRequest === "undefined" and a');
console.log('     scoped eval cannot see it either. It is nested inside another function, so unlike');
console.log('     _buildStudioRequest it CANNOT BE CALLED BY A HARNESS AT ALL.');
console.log('     ⇒ METHOD TO CLOSE IT: intercept the POST body on a walked page, or expose the');
console.log('       builder the way _buildStudioRequest is exposed. It is measurable. It has never');
console.log('       been measured, and nothing about its shape has been enumerated here.');
console.log('⛔ 2. JOINT-THAT-BECAME-SOLO — bereavement, divorce. The co-architect toggle can be');
console.log('     turned OFF after being ON, and its off-branch DELETES every co-architect account.');
console.log('     No instrument in this repo has ever walked that transition.');
console.log('     ⇒ METHOD TO CLOSE IT: walk dual to a complete payload, toggle off, re-enumerate,');
console.log('       and diff. A third column on this board, by the same machinery.');
console.log('🔑 BOTH ARE COUNTED AT ZERO ABOVE BECAUSE NEITHER HAS BEEN LOOKED AT. Saying so in the');
console.log('   output, every run, is the only thing that stops a bounded census from being read as');
console.log('   a complete one.');
console.log('');
