/* D1 PHASE-5a BEHAVIOR GATE (red-first) — Blueprints -> D1 (Layer 1: data plane + wiring, ADDITIVE).
 * Drives the REAL studio-blueprint save() through the REAL D1 client (datum-d1.js) into a mock of the
 * REAL Pages Function (auth->sub->documents-core->sqlite) — a faithful browser -> /api/documents -> D1
 * round-trip in node. Proves:
 *   G-FIDELITY(bp)  a heavy blueprint (18 accts / 172 holdings + every name) survives save->D1->reload
 *                   byte-identical, zero shed, zero undefined.
 *   G-UNLIMITED     the 4-slot picker yields 4 DISTINCT D1 rows (per-slot stable id), AND the data
 *                   layer holds >4 blueprints as distinct rows that all reload (the cap is gone).
 *   G-DUAL-WRITE    under cutover a Save writes BOTH the Clerk blueprint_z mirror AND a D1 blueprint
 *                   row (additive — nothing on Clerk is retired in Layer 1).
 *   G-REVISION      per-blueprint-doc 409 (stale write rejected, no clobber).
 *   G-CROSSDEV      a fresh device rebuilds every blueprint FROM D1 (listDocs + getDoc), byte-identical.
 *   ISOLATION       user B cannot see user A's blueprint rows.
 *   WIRING          the new markers are in the served bytes (client/core/studio-blueprint/nav).
 * Run: node --experimental-sqlite scripts/_gate_d1_blueprints.mjs [LABEL] [--redfirst] */
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

// ---- fixture: heavy blueprint (18 accounts / 172 holdings, every account NAMED) ----
function H(k) { return { ticker: 'TK' + k, name: 'Holding Co Class A ' + k, price: '234.56', shares: '150.25',
  costBasis: '18342.75', acquisitionDate: '2021-06-14', beta: '1.18', dividendYield: '1.92', expRatio: '0.045',
  geography: 'US', sector: 'Tech', assetClass: 'Equity', instrumentType: 'ETF' }; }
function mkBp(tag, id) {
  const names = ['Joint','Roth','401k','Rollover','HSA','529A','529B','Taxable','SEP','Trad','IBonds','Crypto','Trust','Pension','RSU','Cash1','Cash2','Cash3'];
  const accts = []; let t = 0; const TOTAL = 172;
  for (let i = 0; i < 18; i++) {
    const n = Math.floor(TOTAL / 18) + (i < TOTAL % 18 ? 1 : 0); const hs = [];
    for (let h = 0; h < n; h++) hs.push(H(t + h));
    accts.push({ id: 'a' + (i + 1), baseId: 'taxable', name: (tag ? tag + ' ' : '') + names[i], value: 100000, inflow: 0, freq: 12, holdings: hs });
    t += n;
  }
  return { schema: 'DatumFIBlueprintV1', blueprint_id: id || null, saved_at: null, version: '1.0.1',
    profile: { co_architect_enabled: false }, accounts: accts, contributions_total: 0, portfolio_total: 0,
    ss: { strategy_primary: 'full_67' }, income: {}, climate: {}, tax: {}, upkeep: { upkeep_total: 0, charity_total: 0 },
    datum: { net_datum_v1: 0, gross_funding_need: 0, gross_funding_breakdown: {}, derived_from: 'quick' } };
}
function blueprintRows(sub) { return sqlite.prepare("SELECT doc_key FROM documents WHERE clerk_user_id=? AND document_type='blueprint'").all(sub); }

(async () => {
  globalThis.fetch = mockServer;
  const { default: DatumD1 } = await import('../scripts/datum-d1.js');
  const { default: M } = await import('../scripts/studio-blueprint.js');
  const { default: Codec } = await import('../scripts/datum-archive-codec.js');
  DatumD1.WRITE_DEBOUNCE_MS = 5;   // keep the debounced writer fast
  const BP = M.DatumBlueprint;

  // wire the globals each module reads: studio-blueprint's `global` === M; datum-d1's `global` === globalThis.
  M.DatumD1 = DatumD1;
  M.DatumArchiveCodec = Codec;
  M.location = { search: '' };
  let clerkUpdates = [];
  M.Clerk = { load: () => Promise.resolve(),
    user: { unsafeMetadata: {}, update(o) { clerkUpdates.push(o); this.unsafeMetadata = (o && o.unsafeMetadata) || {}; return Promise.resolve(); } } };
  function asUser(id) {
    globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } };   // datum-d1 token + signedIn
    globalThis.localStorage = memStore(); globalThis.sessionStorage = memStore();     // fresh LS/SS per user
    clerkUpdates = []; M.Clerk.user.unsafeMetadata = {};
  }

  // ===== G-FIDELITY(bp): heavy blueprint save -> D1 -> reload, byte-identical =====
  lines.push('===== G-FIDELITY(bp) — 172/18 via real save() =====');
  asUser('userF');
  const heavy = mkBp('', 'bp-heavy');
  BP.save(heavy, { slot: 1 });               // real save(): LS + Clerk mirror + d1WriteStudio + d1WriteBlueprint
  await tick();
  const expected = JSON.stringify(BP.toD1Document(heavy));
  const reloaded = await DatumD1.getDoc('blueprint', 'bp-heavy');   // = fresh device / sign back in
  const back = reloaded ? JSON.parse(reloaded.payload) : { accounts: [] };
  const holdCount = back.accounts.reduce((n, a) => n + ((a.holdings && a.holdings.length) || 0), 0);
  const namesOk = back.accounts.every((a, i) => a.name === heavy.accounts[i].name && a.name && a.name !== 'undefined');
  const byteIdentical = !!reloaded && reloaded.payload === expected;
  ok(pick(holdCount === 172 && namesOk && byteIdentical, !(holdCount === 172 && namesOk && byteIdentical)),
     'FIDELITY: heavy blueprint (18/172 + every name) survives save->D1->reload byte-identical [BITE]');
  ok(back.accounts.filter(a => !a.name || a.name === 'undefined').length === 0, 'ZERO undefined names on blueprint reload');
  ok(holdCount === 172, 'ZERO holdings shed on blueprint reload (172/172)');

  // ===== G-UNLIMITED: 4-slot picker -> 4 DISTINCT rows, AND the data layer holds >4 =====
  lines.push('===== G-UNLIMITED — distinct rows, no 4-slot cap =====');
  asUser('userU');
  const live = mkBp('S', null);              // one live studio bp saved into 4 slots (the picker path)
  BP.save(live, { slot: 1 }); await tick();
  BP.save(live, { slot: 2 }); await tick();
  BP.save(live, { slot: 3 }); await tick();
  BP.save(live, { slot: 4 }); await tick();
  const rows4 = blueprintRows('userU');
  const ids4 = new Set(rows4.map(r => r.doc_key));
  ok(pick(rows4.length === 4 && ids4.size === 4, !(rows4.length === 4 && ids4.size === 4)),
     'PER-SLOT DISTINCT: saving one live studio into slots 1-4 makes 4 DISTINCT D1 rows (no id collision) [BITE]');
  // data layer holds MORE than 4 (the cap the 4-slot LS archive imposed is gone at the store)
  asUser('userN');
  for (let i = 1; i <= 6; i++) await DatumD1.putDoc('blueprint', 'bp-' + i, mkBp('N' + i, 'bp-' + i));
  const listN = await DatumD1.listDocs('blueprint');
  const reloadN = await Promise.all(listN.map(x => DatumD1.getDoc('blueprint', x.doc_key)));
  ok(pick(listN.length === 6 && reloadN.every(d => d && d.payload), !(listN.length === 6)),
     'UNLIMITED: 6 distinct blueprints persist as 6 D1 rows and ALL reload (4-slot cap gone) [BITE]');

  // ===== G-DUAL-WRITE: under cutover a Save writes BOTH blueprint_z AND a D1 blueprint row =====
  lines.push('===== G-DUAL-WRITE — additive (Clerk mirror stays) =====');
  asUser('userDW');
  DatumD1.CUTOVER = true;
  const dw = mkBp('DW', 'bp-dw');
  BP.save(dw, { slot: 1 }); await tick();
  const zWritten = clerkUpdates.some(u => u.unsafeMetadata && ('blueprint_z' in u.unsafeMetadata));
  const d1Written = blueprintRows('userDW').some(r => r.doc_key === 'bp-dw');
  ok(pick(zWritten && d1Written, !(zWritten && d1Written)),
     'ADDITIVE: cutover Save writes BOTH the Clerk blueprint_z mirror AND the D1 blueprint row [BITE]');

  // ===== G-REVISION: per-blueprint-doc 409 (no clobber) =====
  lines.push('===== G-REVISION — per-doc 409 =====');
  asUser('userR');
  const r1 = await DatumD1.putDoc('blueprint', 'bpR', { v: 1 });
  ok(r1.ok && r1.revision === 1, 'blueprint doc PUT -> rev1');
  const r2 = await DatumD1.putDoc('blueprint', 'bpR', { v: 2 }, 1);
  ok(r2.ok && r2.revision === 2, 'CAS with known revision -> rev2');
  const rStale = await DatumD1.putDoc('blueprint', 'bpR', { v: 'stale' }, 1);   // another tab used rev1
  ok(pick(rStale.conflict === true && rStale.ok === false, !(rStale.conflict === true)),
     'stale-revision blueprint write -> 409 conflict (no clobber) [BITE]');
  const rAfter = JSON.parse((await DatumD1.getDoc('blueprint', 'bpR')).payload);
  ok(rAfter.v === 2, 'the rejected stale write did NOT clobber the blueprint doc');

  // ===== ISOLATION: user B cannot see user A's blueprints =====
  lines.push('===== ISOLATION =====');
  asUser('userA'); await DatumD1.putDoc('blueprint', 'secret', mkBp('A', 'secret'));
  asUser('userB');
  const bList = await DatumD1.listDocs('blueprint');
  const bGet = await DatumD1.getDoc('blueprint', 'secret');
  ok(pick(bList.length === 0 && bGet === null, !(bList.length === 0 && bGet === null)),
     'user B sees NONE of user A blueprints (list empty + direct get null) [BITE]');

  // ===== G-DELETE: erase removes the D1 row (no cross-device resurrect) + sub-scoped =====
  lines.push('===== G-DELETE — erase removes the row =====');
  asUser('userDel');
  await DatumD1.putDoc('blueprint', 'del-1', mkBp('D', 'del-1'));
  const delBefore = blueprintRows('userDel').length;
  const del = await DatumD1.deleteDoc('blueprint', 'del-1');
  const delAfter = blueprintRows('userDel').length;
  const delGone = (await DatumD1.getDoc('blueprint', 'del-1')) === null;
  ok(pick(del.ok && delBefore === 1 && delAfter === 0 && delGone, !(del.ok && delAfter === 0 && delGone)),
     'DELETE removes the blueprint D1 row — erase sticks, no cross-device resurrect [BITE]');
  asUser('userDelA'); await DatumD1.putDoc('blueprint', 'mine', mkBp('A', 'mine'));
  asUser('userDelB'); await DatumD1.deleteDoc('blueprint', 'mine');
  asUser('userDelA'); const stillMine = (await DatumD1.getDoc('blueprint', 'mine')) !== null;
  ok(pick(stillMine, !stillMine), 'user B DELETE cannot remove user A blueprint (sub-scoped) [BITE]');

  // ===== G-CROSSDEV: a fresh device rebuilds every blueprint FROM D1, byte-identical =====
  lines.push('===== G-CROSSDEV — rebuild archive from D1 =====');
  asUser('userX');
  const saved = {};
  for (let i = 1; i <= 3; i++) { const b = mkBp('X' + i, 'x-' + i); saved['x-' + i] = JSON.stringify(b); await DatumD1.putDoc('blueprint', 'x-' + i, b); }
  // simulate the fresh-device path nav.js runs: list -> getDoc each -> reconstruct
  const xList = await DatumD1.listDocs('blueprint');
  const rebuilt = {};
  for (const it of xList) { const d = await DatumD1.getDoc('blueprint', it.doc_key); if (d) rebuilt[it.doc_key] = d.payload; }
  const crossOk = xList.length === 3 && Object.keys(saved).every(k => rebuilt[k] === saved[k]);
  ok(pick(crossOk, !crossOk), 'CROSS-DEVICE: fresh device lists 3 + rebuilds each blueprint from D1 byte-identical [BITE]');

  // ===== WIRING markers (served bytes) =====
  lines.push('===== WIRING (served bytes) =====');
  const d1c  = readFileSync(new URL('../scripts/datum-d1.js', import.meta.url), 'utf8');
  const core = readFileSync(new URL('../functions/api/_lib/documents-core.js', import.meta.url), 'utf8');
  const doc  = readFileSync(new URL('../functions/api/documents.js', import.meta.url), 'utf8');
  const sb   = readFileSync(new URL('../scripts/studio-blueprint.js', import.meta.url), 'utf8');
  const nav  = readFileSync(new URL('../nav.js', import.meta.url), 'utf8');
  ok(d1c.includes('function listDocs(type)') && d1c.includes('&list=1'), 'client: DatumD1.listDocs(type) hits ?list=1');
  ok(core.includes('if (list)') && core.includes('listDocs(db, sub, type)'), 'core: dispatch handles the list branch (ids/revisions only)');
  ok(core.includes('async function deleteDoc') && core.includes("method === 'DELETE'"), 'core: dispatch routes DELETE -> deleteDoc (user-scoped erase)');
  ok(d1c.includes('function deleteDoc(type, key)'), 'client: DatumD1.deleteDoc(type,key) present');
  ok(doc.includes("get('list') === '1'"), 'Function: /api/documents parses ?list=1');
  ok(sb.includes('d1WriteBlueprint(bp)') && sb.includes("'blueprint', id, function () { return snap; }") && sb.includes('writeNow'), 'studio-blueprint: save() writes a per-blueprint D1 doc IMMEDIATELY (writeNow, #2 save-lag)');
  ok(sb.includes('_idInAnySlot(bp.blueprint_id, opts.slot)'), 'studio-blueprint: per-slot stable-distinct id guard (legacy slot path)');
  ok(sb.includes('mirrorToClerk(bp, opts.done)') && sb.includes('Layer 1'), 'studio-blueprint: blueprint_z mirror STILL ON (additive Layer 1)');
  ok(nav.includes('_restoreBlueprintFromD1') && nav.includes("listDocs('blueprint')") && nav.includes('_blueprintD1Live'), 'nav.js: blueprint leg rebuilds from D1 under cutover');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-5a blueprints behavior gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 PHASE-5a GATE — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
