/* D1 PHASE-5a LAYER-2 SLICE-2 BEHAVIOR GATE (red-first) — Studio SAVE-PICKER -> premium Option B.
 * Drives the REAL studio-blueprint save() (the two-branch picker contract, #276) through the REAL D1
 * client (datum-d1.js) into a mock of the REAL Pages Function (auth->sub->documents-core->sqlite).
 * Proves the Captain-ratified fork (Option 1, rolling-4):
 *   G-NEW        "＋ Save as a new blueprint" mints a FRESH blueprint_id every time -> DISTINCT D1 rows.
 *   G-OVERWRITE  "Overwrite <sheet>" REUSES that id -> the SAME D1 row, revision bumped (no new row).
 *   G-ROLL4      at 5+ saves the LS/blueprint_z net holds EXACTLY the newest 4 (oldest dropped), while
 *                D1 keeps ALL N (the evicted blueprint stays in D1 — only the LS/Clerk fallback truncates).
 *   G-CAP-DEAD   the data layer holds >4 blueprints as distinct rows that all reload (cap stays dead).
 *   WIRING       the picker markers are in the served bytes (studio.html + studio-blueprint.js).
 * Run: node --experimental-sqlite scripts/_gate_d1_picker.mjs [LABEL] [--redfirst] */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatch } from '../functions/api/_lib/documents-core.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (ms) => new Promise(r => setTimeout(r, ms || 25));

// ---- real D1 (node:sqlite) + the migration ----
function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; } };
}
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_documents.sql', import.meta.url), 'utf8'));
const db = makeD1(sqlite);

// ---- mock of the Pages Function: verify Bearer -> sub, then documents-core.dispatch (real logic) ----
function mockServer(url, opts) {
  return (async () => {
    const u = new URL(url, 'https://datumfi.com');
    const type = u.searchParams.get('type') || '';
    const key = u.searchParams.get('key') || 'active';
    const list = u.searchParams.get('list') === '1';
    const auth = (opts && opts.headers && opts.headers.Authorization) || '';
    const m = auth.match(/^Bearer\s+tok:(.+)$/);           // test token shape: "tok:<sub>"
    if (!m) return { status: 401, json: async () => ({ error: 'unauthorized' }) };
    let payloadStr = null, ifRevision = null;
    if (opts && opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      payloadStr = body.payload !== undefined ? JSON.stringify(body.payload) : null;
      ifRevision = typeof body.revision === 'number' ? body.revision : null;
    }
    const r = await dispatch({ method: (opts && opts.method) || 'GET', type, key, payloadStr, ifRevision, list, db, sub: m[1] });
    return { status: r.status, json: async () => r.body };
  })();
}

// ---- storage mocks (bare localStorage/sessionStorage resolve to globalThis in node) ----
function memStore() { const s = {}; return { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, _s: s }; }
const ARCHIVE_KEY = 'datumfi_blueprint_archive_v1';
function netSlots() {
  let arch = null; try { arch = JSON.parse(globalThis.localStorage.getItem(ARCHIVE_KEY) || 'null'); } catch (e) {}
  const ids = [];
  if (arch) for (let n = 1; n <= 4; n++) { const s = arch['slot' + n]; if (s && s.blueprint_id) ids.push(s.blueprint_id); }
  return ids;   // blueprint_ids currently held in the LS 4-slot net
}
function blueprintRows(sub) { return sqlite.prepare("SELECT doc_key FROM documents WHERE clerk_user_id=? AND document_type='blueprint'").all(sub); }

// ---- a light blueprint (picker semantics, not fidelity — _gate_d1_blueprints covers 172/18) ----
function lite(tag) {
  return { schema: 'DatumFIBlueprintV1', blueprint_id: null, saved_at: null, version: '1.0.1',
    profile: { co_architect_enabled: false, primary_name: tag },
    accounts: [{ id: 'a1', baseId: 'taxable', name: tag, value: 100000, inflow: 0, freq: 12, holdings: [] }],
    contributions_total: 0, portfolio_total: 0, ss: { strategy_primary: 'full_67' }, income: {}, climate: {}, tax: {},
    upkeep: { items: [], charity: [], upkeep_total: 0, charity_total: 0 },
    datum: { net_datum_v1: 0, gross_funding_need: 0, gross_funding_breakdown: {}, derived_from: 'quick' } };
}

(async () => {
  globalThis.fetch = mockServer;
  const { default: DatumD1 } = await import('../scripts/datum-d1.js');
  const { default: M } = await import('../scripts/studio-blueprint.js');
  const { default: Codec } = await import('../scripts/datum-archive-codec.js');
  DatumD1.WRITE_DEBOUNCE_MS = 5;   // keep the debounced writer fast
  const BP = M.DatumBlueprint;

  // wire the globals studio-blueprint reads (its `global` === M; datum-d1's `global` === globalThis)
  M.DatumD1 = DatumD1;
  M.DatumArchiveCodec = Codec;
  M.location = { search: '' };
  let clerkUpdates = [];
  M.Clerk = { load: () => Promise.resolve(),
    user: { unsafeMetadata: {}, update(o) { clerkUpdates.push(o); this.unsafeMetadata = (o && o.unsafeMetadata) || {}; return Promise.resolve(); } } };
  function asUser(id) {
    globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } };
    globalThis.localStorage = memStore(); globalThis.sessionStorage = memStore();
    clerkUpdates = []; M.Clerk.user.unsafeMetadata = {};
  }

  // ===== G-NEW: "＋ Save as a new blueprint" mints a FRESH id every time -> DISTINCT rows =====
  lines.push('===== G-NEW — save-as-new mints a fresh id =====');
  asUser('userNew');
  const n1 = lite('New A'); BP.save(n1, { newBlueprint: true }); const id1 = n1.blueprint_id; await tick();
  const n2 = lite('New B'); BP.save(n2, { newBlueprint: true }); const id2 = n2.blueprint_id; await tick();
  const rowsNew = blueprintRows('userNew');
  ok(pick(!!id1 && !!id2 && id1 !== id2, !(id1 && id2 && id1 !== id2)),
     'SAVE-AS-NEW: two "＋ Save as new" clicks mint two DISTINCT blueprint_ids [BITE]');
  ok(pick(rowsNew.length === 2 && new Set(rowsNew.map(r => r.doc_key)).size === 2, !(rowsNew.length === 2)),
     'SAVE-AS-NEW: two DISTINCT D1 rows written (never collide onto one) [BITE]');

  // ===== G-OVERWRITE: "Overwrite <sheet>" REUSES that id -> SAME row, revision bumped =====
  lines.push('===== G-OVERWRITE — reuse id, bump revision, no new row =====');
  asUser('userOv');
  const base = lite('Base'); BP.save(base, { newBlueprint: true }); const ovId = base.blueprint_id; await tick();
  const before = blueprintRows('userOv').length;
  const rev1 = (await DatumD1.getDoc('blueprint', ovId)).revision;
  const edit = lite('Base edited'); BP.save(edit, { blueprint_id: ovId }); await tick();
  const after = blueprintRows('userOv').length;
  const doc = await DatumD1.getDoc('blueprint', ovId);
  ok(pick(edit.blueprint_id === ovId, edit.blueprint_id !== ovId),
     'OVERWRITE: save reuses the chosen blueprint_id (not a new one) [BITE]');
  ok(pick(before === 1 && after === 1, !(before === 1 && after === 1)),
     'OVERWRITE: NO new D1 row — the same row is updated in place [BITE]');
  ok(pick(rev1 === 1 && doc.revision === 2 && JSON.parse(doc.payload).profile.primary_name === 'Base edited',
          !(doc.revision === 2)),
     'OVERWRITE: revision bumps 1 -> 2 and the payload is the edited sheet [BITE]');

  // ===== G-ROLL4: 5+ saves -> LS net holds EXACTLY the newest 4; D1 keeps ALL N =====
  lines.push('===== G-ROLL4 — rolling newest-4 net, unlimited D1 =====');
  asUser('userRoll');
  const ids = [];
  for (let i = 1; i <= 5; i++) { const b = lite('Roll ' + i); BP.save(b, { newBlueprint: true }); ids.push(b.blueprint_id); await tick(); }
  const net = netSlots();
  const newest4 = ids.slice(1);            // ids[1..4] = the 4 newest saves
  const oldest = ids[0];                   // ids[0] = the first (oldest) save
  const netHasNewest4 = net.length === 4 && newest4.every(id => net.includes(id));
  ok(pick(netHasNewest4, !netHasNewest4),
     'ROLL4: after 5 saves the LS net holds EXACTLY the newest 4 blueprints [BITE]');
  ok(pick(!net.includes(oldest), net.includes(oldest)),
     'ROLL4: the OLDEST blueprint was dropped from the LS net (recency wins) [BITE]');
  const zWritten = clerkUpdates.some(u => u.unsafeMetadata && ('blueprint_z' in u.unsafeMetadata));
  ok(pick(zWritten, !zWritten), 'ROLL4: blueprint_z Clerk mirror STILL written (net rolls, dual-write on) [BITE]');
  const rollList = await DatumD1.listDocs('blueprint');
  const rollReload = await Promise.all(rollList.map(x => DatumD1.getDoc('blueprint', x.doc_key)));
  ok(pick(rollList.length === 5 && rollReload.every(d => d && d.payload), !(rollList.length === 5)),
     'ROLL4: D1 keeps ALL 5 rows (the evicted-from-net blueprint still reloads from D1) [BITE]');
  const oldestFromD1 = await DatumD1.getDoc('blueprint', oldest);
  ok(pick(!!oldestFromD1 && JSON.parse(oldestFromD1.payload).profile.primary_name === 'Roll 1', !oldestFromD1),
     'ROLL4: the net-evicted OLDEST blueprint is intact in D1 (unlimited truth) [BITE]');

  // ===== G-CAP-DEAD: data layer holds >4 distinct rows that all reload =====
  lines.push('===== G-CAP-DEAD — cap stays dead at the store =====');
  asUser('userCap');
  const capIds = [];
  for (let i = 1; i <= 6; i++) { const b = lite('Cap ' + i); BP.save(b, { newBlueprint: true }); capIds.push(b.blueprint_id); await tick(); }
  const capList = await DatumD1.listDocs('blueprint');
  ok(pick(capList.length === 6 && new Set(capIds).size === 6, !(capList.length === 6)),
     'CAP-DEAD: 6 save-as-new -> 6 DISTINCT D1 rows (archive/D1 read-path shows all N) [BITE]');

  // ===== WIRING markers (served bytes) =====
  lines.push('===== WIRING (served bytes) =====');
  const sb = readFileSync(new URL('../scripts/studio-blueprint.js', import.meta.url), 'utf8');
  const st = readFileSync(new URL('../studio.html', import.meta.url), 'utf8');
  ok(sb.includes('opts.newBlueprint'), 'studio-blueprint: save() has the save-as-new branch (opts.newBlueprint)');
  ok(sb.includes('opts.blueprint_id'), 'studio-blueprint: save() has the overwrite-by-id branch (opts.blueprint_id)');
  ok(sb.includes('function _placeInNet'), 'studio-blueprint: rolling newest-4 LS-net placement (_placeInNet)');
  ok(st.includes('Save as a new blueprint'), 'studio.html: premium "＋ Save as a new blueprint" affordance present');
  ok(st.includes('data-overwrite-id'), 'studio.html: scrollable overwrite list rows carry data-overwrite-id (D1 listDocs, all N)');
  ok(st.includes('newBlueprint: true'), 'studio.html: "＋ Save as new" calls save({ newBlueprint: true })');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 L2 slice-2 save-picker behavior gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] G-PICKER-B — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
