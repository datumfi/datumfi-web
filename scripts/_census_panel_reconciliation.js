/* _census_panel_reconciliation.js — THE SYSTEMS PANEL AGAINST THE ENGINE, BOTH DIRECTIONS.
 *
 * ⛔⛔ TWO LISTS THAT HAD NEVER BEEN LAID AGAINST EACH OTHER. The Mock's Systems Panel is the
 *    specification the product is being built toward; the engine's request model is what can
 *    actually be received. Nobody had ever asked which rows on one side have nothing to talk to
 *    on the other — IN EITHER DIRECTION.
 *
 * 🔑 THE BUCKET NOBODY HAD LOOKED AT IS `PANEL SILENT`: a field the engine ACCEPTS that no panel
 *    row shows. That is where a value nobody can see or change survives, because a user cannot
 *    ask for a control that is not on any screen and a developer sees a field that "works".
 *
 * ⛔ NEITHER SIDE IS TYPED IN THIS FILE OR IN THE MAP.
 *      panel  — read off window.DATUMAE_MODEL_SCHEDULE in a REAL BROWSER running Studio Mock.html
 *      engine — read off the RUNNING pydantic model, not a regex over schemas.py
 *    panel_engine_map.json only says what each PAIRING is, and it is checked BOTH WAYS: a panel
 *    leaf missing from the map is red, and an engine field that is neither a map target nor
 *    declared in engine_only is red. Same law as the SACRED host list — the two must match
 *    exactly, in both directions, or the instrument stops rather than quietly shrinking.
 *
 * ⚠️ Studio Mock.html is HARD-HOLD and untracked. This reads it and never writes to it. If it is
 *    absent the census REFUSES — it must never report a smaller panel than the one that exists.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MOCK = path.join(ROOT, 'Studio Mock.html');
const MANIFEST = path.join(os.tmpdir(), 'datum-panel-manifest.json');
const MAP = path.join(__dirname, '_panel_engine_map.json');
const MAX_AGE_MS = 30 * 60 * 1000;

let fails = 0;
function die(msg) { console.log('\nCENSUS REFUSED — ' + msg + '\nOVERALL: RED'); process.exit(1); }

if (!fs.existsSync(MOCK)) die('Studio Mock.html is not on disk. It is the panel side of this census; without it there is nothing to reconcile against.');

/* ── 1. THE PANEL SIDE, off the running Mock. */
function manifestAge() { try { return Date.now() - fs.statSync(MANIFEST).mtimeMs; } catch (e) { return Infinity; } }
if (manifestAge() > MAX_AGE_MS) {
  console.log('· reading the Systems Panel manifest off the running Mock (drives a browser, ~10s)\n');
  try {
    execFileSync(process.execPath, [path.join(__dirname, '_dump_panel_manifest.js')],
      { stdio: 'ignore', cwd: ROOT, timeout: 4 * 60 * 1000 });
  } catch (e) { /* the file decides, not the exit code */ }
}
if (manifestAge() > MAX_AGE_MS) die('could not read the panel manifest. Run scripts/_dump_panel_manifest.js directly to see why.');
const panelLeaves = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).leaves.map((l) => l.path);

/* ── 2. THE ENGINE SIDE, off the running model. */
let schema;
try {
  schema = JSON.parse(execFileSync('python', [path.join(__dirname, '_dump_engine_schema.py')],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
} catch (e) { die('could not read the engine schema (' + (e.message || e) + ')'); }
if (schema.error) die(schema.error);
const engineFields = Object.keys(schema.CalculateRequest);

/* ── 3. THE MAP, and the both-directions check that keeps it honest. */
const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const panelMap = map.panel || {};
const engineOnly = map.engine_only || {};

const unmappedPanel = panelLeaves.filter((p) => !panelMap[p]);
const staleMapRows  = Object.keys(panelMap).filter((p) => !panelLeaves.includes(p));
const targeted = new Set(Object.values(panelMap).map((v) => v.engine).filter(Boolean));
const unmappedEngine = engineFields.filter((f) => !targeted.has(f) && !engineOnly[f]);
const staleEngineOnly = Object.keys(engineOnly).filter((f) => !engineFields.includes(f));
const badTargets = [...targeted].filter((t) => !engineFields.includes(t));

/* ── 3b. LAW 223 — DOES THE CONTROL EXIST IN THE PRODUCT, OR ONLY IN THE MOCK?
   ⛔⛔ THIS COLUMN EXISTS BECAUSE ITS ABSENCE COST A WHOLE WORK ITEM. Refusal copy was authored
      for Load Clock notches, and the Load Clock is 25 references in Studio Mock.html and ZERO in
      live studio.html. Copy was written for a control that does not exist, because nobody had
      ever counted which panel rows are Mock-only.
   🔑 A MOCK IS A SPECIFICATION, NOT AN INVENTORY. Reading one and describing the product is the
      same error as reading a workbook row and ruling off it. */
const liveFile = path.join(os.tmpdir(), 'datum-live-controls.json');
function liveAge() { try { return Date.now() - fs.statSync(liveFile).mtimeMs; } catch (e) { return Infinity; } }
if (liveAge() > MAX_AGE_MS) {
  console.log('· checking declared controls against the live DOM (drives a browser, ~10s)\n');
  try {
    execFileSync(process.execPath, [path.join(__dirname, '_dump_live_controls.js')],
      { stdio: 'ignore', cwd: ROOT, timeout: 4 * 60 * 1000 });
  } catch (e) { /* the file decides */ }
}
if (liveAge() > MAX_AGE_MS) die('could not check controls against the live DOM. Run scripts/_dump_live_controls.js directly.');
const livePresent = JSON.parse(fs.readFileSync(liveFile, 'utf8')).present;

const declaredSel = [...new Set(Object.values(panelMap).map((v) => v.live).filter((s) => s && s !== 'DYNAMIC'))];
const brokenSel = declaredSel.filter((s) => !(livePresent[s] > 0));

let legs = 0;
function check(label, ok, detail) {
  legs++;
  if (!ok) fails++;
  console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + label);
  if (detail) console.log('          ' + detail);
}

console.log('');
console.log('THE SYSTEMS PANEL AGAINST THE ENGINE REQUEST MODEL — BOTH DIRECTIONS');
console.log('panel: ' + panelLeaves.length + ' leaf paths off the running Mock  ·  engine: '
  + engineFields.length + ' fields off the running model');
console.log('');
check('B1 EVERY PANEL ROW IS ACCOUNTED FOR', unmappedPanel.length === 0,
  unmappedPanel.length ? 'UNMAPPED PANEL ROWS: ' + unmappedPanel.join(', ') : 'all ' + panelLeaves.length + ' mapped');
check('B2 EVERY ENGINE FIELD IS ACCOUNTED FOR', unmappedEngine.length === 0,
  unmappedEngine.length ? 'ENGINE FIELDS IN NEITHER LIST: ' + unmappedEngine.join(', ') : 'all ' + engineFields.length + ' mapped or declared');
check('B3 THE MAP CARRIES NO ROWS THE PANEL NO LONGER HAS', staleMapRows.length === 0,
  staleMapRows.length ? 'STALE: ' + staleMapRows.join(', ') : 'none');
check('B4 THE MAP CARRIES NO ENGINE FIELDS THAT NO LONGER EXIST', staleEngineOnly.length === 0 && badTargets.length === 0,
  (staleEngineOnly.length || badTargets.length)
    ? 'STALE: ' + [...staleEngineOnly, ...badTargets].join(', ') : 'none');
check('B5 EVERY DECLARED LIVE CONTROL IS ACTUALLY IN THE LIVE DOM', brokenSel.length === 0,
  brokenSel.length ? 'DECLARED BUT ABSENT: ' + brokenSel.join(', ')
                   : 'all ' + declaredSel.length + ' declared selectors resolve');

/* ── 4. THE BUCKETS. */
const buckets = {};
panelLeaves.forEach((p) => { const b = panelMap[p] ? panelMap[p].bucket : 'UNMAPPED'; (buckets[b] = buckets[b] || []).push(p); });
const ORDER = ['ENGINE_HAS', 'ENGINE_LACKS', 'ALT_SPELLING', 'DERIVED_DISPLAY', 'MACHINERY', 'CONFIG', 'UI_STATE', 'UNMAPPED'];
const TITLE = {
  ENGINE_HAS: 'PANEL SHOWS  <->  ENGINE HAS',
  ENGINE_LACKS: 'PANEL SHOWS  <->  ENGINE LACKS IT  — these are BUILDS',
  ALT_SPELLING: 'a second spelling of another row (must agree with its twin)',
  DERIVED_DISPLAY: 'computed for the screen from answers already given',
  MACHINERY: 'infrastructure the user has no opinion about',
  CONFIG: 'selects which fields exist, rather than being one',
  UI_STATE: 'panel bookkeeping — never leaves the browser',
  UNMAPPED: 'NOT IN THE MAP'
};
console.log('');
for (const b of ORDER) {
  if (!buckets[b]) continue;
  console.log(b + '  (' + buckets[b].length + ')  — ' + TITLE[b]);
  buckets[b].forEach((p) => {
    const m = panelMap[p] || {};
    const tail = m.engine ? ' -> ' + m.engine : (m.same_as ? ' = ' + m.same_as : '');
    console.log('    · ' + p.padEnd(50) + tail);
  });
  console.log('');
}

console.log('ENGINE HAS  <->  PANEL SILENT  (' + Object.keys(engineOnly).length + ')  — no panel row shows these');
Object.keys(engineOnly).forEach((f) => console.log('    · ' + f.padEnd(50) + ' ' + (engineOnly[f].note || '').slice(0, 70)));

/* ── 4b. THE LAW 223 TABLE. */
const MODEL_INPUT = ['ENGINE_HAS', 'ENGINE_LACKS', 'MACHINERY', 'CONFIG'];
const inLive = [], dynamic = [], mockOnly = [], noControlExpected = [];
for (const p of panelLeaves) {
  const m = panelMap[p] || {};
  const isInput = MODEL_INPUT.includes(m.bucket);
  if (m.live === 'DYNAMIC') dynamic.push(p);
  else if (m.live) inLive.push(p);
  else if (isInput) mockOnly.push(p);
  else noControlExpected.push(p);
}
console.log('LAW 223 — WHERE DOES THE CONTROL EXIST?');
console.log('  IN LIVE (a fixed control in studio.html)        : ' + inLive.length);
console.log('  IN LIVE, DYNAMIC (created per estate room)      : ' + dynamic.length);
console.log('  ⛔ MOCK-ONLY — a model input with NO live control: ' + mockOnly.length);
mockOnly.forEach((p) => console.log('       · ' + p.padEnd(50) + '(' + panelMap[p].bucket + ')'));
console.log('  no control expected (display / bookkeeping)     : ' + noControlExpected.length);
console.log('  [' + (inLive.length + dynamic.length + mockOnly.length + noControlExpected.length)
  + ' of ' + panelLeaves.length + ']');
console.log('');

const panelSum = ORDER.reduce((a, b) => a + (buckets[b] ? buckets[b].length : 0), 0);
console.log('');
console.log('SUMS BOTH WAYS — this is the point of the exercise');
console.log('  PANEL : ' + ORDER.filter((b) => buckets[b]).map((b) => b + '=' + buckets[b].length).join('  ')
  + '   [' + panelSum + ' of ' + panelLeaves.length + ']');
console.log('  ENGINE: reached by a panel row=' + targeted.size
  + '  ·  PANEL_SILENT=' + Object.keys(engineOnly).length
  + '   [' + (targeted.size + Object.keys(engineOnly).length) + ' of ' + engineFields.length + ']');
console.log('');
console.log('⛔ CONFIGURATIONS THIS RECONCILIATION COVERS: the panel manifest ships planMode="dual",'
  + ' so both people\'s rows are present. It says NOTHING about joint-to-solo, which nothing in'
  + ' this repo has ever walked.');
console.log('⛔ IT COVERS /api/calculate ONLY. The SS-matrix request is a second surface whose'
  + ' builder is unreachable to any harness and has never been enumerated.');
console.log('');
console.log('SCORE ' + (legs - fails) + ' / ' + legs + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
process.exit(fails === 0 ? 0 : 1);
