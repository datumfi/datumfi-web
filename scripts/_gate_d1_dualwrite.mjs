/* D1 PHASE-3 BEHAVIOR GATE (red-first) — Studio dual-write. Drives the REAL client (datum-d1.js)
 * through a mock of the REAL Pages Function (auth->sub->documents-core->sqlite), i.e. a faithful
 * browser -> /api/documents -> D1 round-trip in node. Proves: dual-write, D1-FIRST load + lossless
 * fallback, 409/multi-tab, isolation, and the Captain's FIDELITY round-trip through the client path.
 * Also asserts the studio.html / studio-blueprint.js wiring markers are in the served bytes.
 * Run: node --experimental-sqlite scripts/_gate_d1_dualwrite.mjs [LABEL] [--redfirst] */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatch } from '../functions/api/_lib/documents-core.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

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
    const auth = (opts && opts.headers && opts.headers.Authorization) || '';
    const m = auth.match(/^Bearer\s+tok:(.+)$/);           // test token shape: "tok:<sub>"
    if (!m) return { status: 401, json: async () => ({ error: 'unauthorized' }) };
    let payloadStr = null, ifRevision = null;
    if (opts && opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      payloadStr = body.payload !== undefined ? JSON.stringify(body.payload) : null;
      ifRevision = typeof body.revision === 'number' ? body.revision : null;
    }
    const r = await dispatch({ method: (opts && opts.method) || 'GET', type, key, payloadStr, ifRevision, db, sub: m[1] });
    return { status: r.status, json: async () => r.body };
  })();
}

function asUser(id) { globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } }; }
function makeBook() {
  const names = ['Joint Brokerage','Roth IRA','401(k)','Rollover IRA','HSA','529 A','529 B','Taxable','SEP IRA',
    'Traditional IRA','I-Bonds','Crypto','Trust','Pension','RSU','Op Cash','Cash 2','Cash 3'];
  const acc = []; let t = 0, TOTAL = 172;
  for (let i = 0; i < 18; i++) {
    const n = Math.floor(TOTAL / 18) + (i < TOTAL % 18 ? 1 : 0);
    const holdings = [];
    for (let h = 0; h < n; h++) holdings.push({ ticker: 'TK' + (t + h), name: 'Holding Co Class A ' + (t + h),
      price: '234.56', shares: '150.25', costBasis: '18342.75', acquisitionDate: '2021-06-14', beta: '1.18',
      dividendYield: '1.92', expRatio: '0.045', geography: 'US', sector: 'Tech', assetClass: 'Equity', instrumentType: 'ETF' });
    acc.push({ id: 'a' + (i + 1), baseId: 'taxable_brokerage', name: names[i], value: '482193.55', holdings });
    t += n;
  }
  return { schema: 'DatumFIBlueprintV1', blueprint_id: 'bp-real', accounts: acc };
}

(async () => {
  globalThis.fetch = mockServer;
  const { default: DatumD1 } = await import('../scripts/datum-d1.js');
  DatumD1.WRITE_DEBOUNCE_MS = 5;   // keep the debounced-writer test fast

  // ===== DUAL-WRITE + D1-FIRST LOAD =====
  lines.push('===== DUAL-WRITE + D1-FIRST LOAD =====');
  asUser('userC');
  const put1 = await DatumD1.putDoc('studio', 'active', { hello: 'world', accounts: [] });
  ok(put1.ok && put1.revision === 1, 'client PUT -> D1 row written (rev1) via /api/documents');
  const rowCount = sqlite.prepare("SELECT count(*) c FROM documents WHERE clerk_user_id='userC' AND document_type='studio'").get().c;
  ok(rowCount === 1, 'the D1 row physically exists, sub-scoped to the verified user');
  const get1 = await DatumD1.getDoc('studio', 'active');
  ok(get1 && JSON.parse(get1.payload).hello === 'world', 'D1-FIRST load: client GET returns the doc');

  // ===== FALLBACK (lossless when D1 is down) =====
  lines.push('===== FALLBACK (D1 off) =====');
  globalThis.fetch = async () => { throw new Error('network down'); };
  const gDown = await DatumD1.getDoc('studio', 'active');
  ok(pick(gDown === null, gDown !== null), 'D1 unreachable -> getDoc returns null (caller falls back to LS/Clerk) [BITE]');
  const pDown = await DatumD1.putDoc('studio', 'active', { x: 1 });
  ok(pDown.ok === false, 'D1 unreachable -> putDoc {ok:false}, never throws (LS/Clerk unaffected)');
  globalThis.fetch = mockServer;

  // ===== ISOLATION =====
  lines.push('===== ISOLATION =====');
  asUser('userD');
  const getOther = await DatumD1.getDoc('studio', 'active');
  ok(pick(getOther === null, getOther !== null), 'user D CANNOT read user C studio doc -> null [BITE]');

  // ===== 409 / MULTI-TAB =====
  lines.push('===== 409 / MULTI-TAB =====');
  asUser('userC');
  const upd = await DatumD1.putDoc('studio', 'active', { hello: 'v2' }, 1);   // rev1 -> rev2
  ok(upd.ok && upd.revision === 2, 'CAS update with known revision -> rev2');
  const stale = await DatumD1.putDoc('studio', 'active', { hello: 'stale' }, 1);   // another tab used rev1
  ok(pick(stale.conflict === true && stale.ok === false, !(stale.conflict === true)), 'stale-revision write -> 409 conflict (no clobber) [BITE]');
  const after = JSON.parse((await DatumD1.getDoc('studio', 'active')).payload);
  ok(after.hello === 'v2', 'the rejected stale write did NOT clobber the server doc');

  // ===== FIDELITY ROUND-TRIP THROUGH THE CLIENT PATH (the Captain's bug, dead) =====
  lines.push('===== FIDELITY (172/18 via client) =====');
  asUser('userF');
  const book = makeBook();
  await DatumD1.putDoc('studio', 'active', book);
  const reloaded = await DatumD1.getDoc('studio', 'active');   // = sign out / sign back in / load
  const back = JSON.parse(reloaded.payload);
  const holdCount = back.accounts.reduce((n, a) => n + a.holdings.length, 0);
  const namesOk = back.accounts.every((a, i) => a.name === book.accounts[i].name && a.name && a.name !== 'undefined');
  const holdingsOk = back.accounts.every((a, i) => JSON.stringify(a.holdings) === JSON.stringify(book.accounts[i].holdings));
  const byteIdentical = reloaded.payload === JSON.stringify(book);
  ok(pick(holdCount === 172 && namesOk && holdingsOk && byteIdentical, !(holdCount === 172 && namesOk && holdingsOk && byteIdentical)),
     'FIDELITY via CLIENT: 18 accts / 172 holdings + every name survive save->D1->reload, byte-identical [BITE]');
  ok(back.accounts.filter(a => !a.name || a.name === 'undefined').length === 0, 'ZERO undefined names on client reload');
  ok(holdCount === 172, 'ZERO holdings shed on client reload (172/172)');

  // ===== WIRING MARKERS in the served bytes (studio.html / studio-blueprint.js / datum-d1.js) =====
  lines.push('===== WIRING (served bytes) =====');
  const sb = readFileSync(new URL('../scripts/studio-blueprint.js', import.meta.url), 'utf8');
  const st = readFileSync(new URL('../studio.html', import.meta.url), 'utf8');
  ok((sb.match(/d1WriteStudio\(bp\)/g) || []).length >= 2, 'studio-blueprint: d1WriteStudio wired in BOTH save() and the debounced commit');
  ok(sb.includes("k.charAt(0) !== '_'"), 'toD1Document strips only _-prefixed ephemerals (full fidelity)');
  ok(sb.includes('opts.d1Doc') && sb.includes("finishLoad(bp, 'd1')"), 'load() hydrates D1-FIRST from opts.d1Doc');
  ok(sb.includes('if (!global.DatumD1 || global.DatumD1.CUTOVER === false || !global.DatumD1.signedIn()) return;'), 'ESCAPE ROUTE: D1 write is a no-op when D1 absent / signed out / rolled back');
  ok(st.includes('/scripts/datum-d1.js'), 'studio.html includes datum-d1.js');
  ok(st.includes('function boot(d1Doc)') && st.includes("window.DatumD1.getDoc('studio', 'active')"), 'studio.html init is D1-FIRST (boot(d1Doc) + getDoc) with boot(null) fallback');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-3 dual-write behavior gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 PHASE-3 GATE — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
