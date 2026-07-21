/* D1 PHASE-2 BEHAVIOR GATE (red-first) — the persistence API's real logic, driven against a real
 * SQLite engine (D1 IS SQLite) via node:sqlite, plus the auth shell's 401 path. Proves the three
 * required gate families: AUTH/ISOLATION · SIZE (worst-case blueprint) · FIDELITY round-trip
 * (the Captain's exact bug: save -> reload -> rooms empty / name undefined — proven DEAD).
 * RED-FIRST: `--redfirst` flips each [BITE] winner to its failing opposite -> RED on correct code.
 * Run:  node --experimental-sqlite scripts/_gate_d1_documents.mjs [LABEL] [--redfirst]
 * (A separate wrangler d1 execute smoke proves the SAME schema/CAS on the REAL dev D1.) */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { DOC_TYPES, dispatch, getDoc, putDoc } from '../functions/api/_lib/documents-core.js';
import { verifyClerk, UnauthorizedError } from '../functions/api/_lib/auth.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

// ---- D1-compatible shim over node:sqlite (prepare().bind().first()/.all()/.run()) ----
function makeD1(sqlite) {
  return { prepare(sql) {
    const st = { _a: [],
      bind(...a) { st._a = a; return st; },
      async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
      async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes, last_row_id: i.lastInsertRowid } }; } };
    return st;
  } };
}

// ---- realistic data generators ----
function mkHolding(i) {
  return { ticker: 'TCKR' + i, name: 'Example Holdings Corporation Class A Common Stock ' + i,
    price: '234.56', shares: '150.25', costBasis: '18342.75', acquisitionDate: '2021-06-14',
    beta: '1.18', dividendYield: '1.92', expRatio: '0.045', geography: 'United States',
    sector: 'Information Technology', assetClass: 'Equity', instrumentType: 'ETF' };
}
function mkAccount(id, name, nHoldings, startTicker) {
  const a = { id: 'acct-' + id, baseId: 'taxable_brokerage', name: name, value: '482193.55',
    inflow: '2000', freq: 12, intRate: 0, propTaxYr: '', holdings: [] };
  for (let h = 0; h < nHoldings; h++) a.holdings.push(mkHolding(startTicker + h));
  return a;
}
// The Captain's real book: 18 accounts, 172 holdings, every account NAMED.
function makeRealBook() {
  const names = ['Joint Brokerage','Roth IRA — Primary','Roth IRA — Co','401(k) — Employer','Rollover IRA',
    'HSA','529 — Kid 1','529 — Kid 2','Taxable — Growth','Taxable — Income','SEP IRA','Traditional IRA',
    'I-Bonds','Crypto Wallet','Trust — Revocable','Pension Cash-Balance','Stock Plan (RSU)','Operating Cash'];
  const accts = []; let t = 0, TOTAL = 172; // distribute EXACTLY 172 holdings across 18 accounts
  for (let i = 0; i < 18; i++) { const n = Math.floor(TOTAL / 18) + (i < TOTAL % 18 ? 1 : 0); accts.push(mkAccount(i + 1, names[i], n, t)); t += n; }
  return { schema: 'DatumFIBlueprintV1', blueprint_id: 'bp-real-172', saved_at: '2026-07-13T00:00:00Z',
    version: '1.0.1', profile: { primary_name: 'Daniel', co_architect_name: 'Co', primary_dob: '08/1982' },
    accounts: accts, contributions_total: 84000, portfolio_total: 3120000 };
}
// Worst-case blueprint: ~50 rooms, ~170 tickers, full fields.
function makeWorstCase(rooms, tickers) {
  const accts = []; let t = 0; const base = Math.floor(tickers / rooms);
  for (let i = 0; i < rooms; i++) {
    const n = (i < tickers % rooms) ? base + 1 : base;
    accts.push(mkAccount(i + 1, 'Investment Account Number ' + (i + 1) + ' — Full Detail', n, t)); t += n;
  }
  return { schema: 'DatumFIBlueprintV1', blueprint_id: 'bp-worst', saved_at: '2026-07-13T00:00:00Z',
    version: '1.0.1', profile: { primary_name: 'Worst', co_architect_name: 'Case', primary_dob: '01/1970' },
    accounts: accts, contributions_total: 99000, portfolio_total: 9999999 };
}

(async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_documents.sql', import.meta.url), 'utf8'));
  const db = makeD1(sqlite);

  // ===== AUTH shell (401) =====
  lines.push('===== AUTH / ISOLATION =====');
  let noBearer = false;
  try { await verifyClerk(new Request('https://x/api/documents?type=studio', { method: 'GET' })); }
  catch (e) { noBearer = e instanceof UnauthorizedError; }
  ok(pick(noBearer, !noBearer), 'no bearer token -> UnauthorizedError (401) [BITE]');
  let badBearer = false;
  try { await verifyClerk(new Request('https://x/', { method: 'GET', headers: { Authorization: 'Bearer not.a.jwt' } })); }
  catch (e) { badBearer = e instanceof UnauthorizedError; }
  ok(badBearer, 'garbage bearer -> UnauthorizedError (401)');

  // ===== ISOLATION: PUT as A, GET as A ok, GET as B blocked =====
  const docA = JSON.stringify({ hello: 'A', accounts: [] });
  const putA = await dispatch({ method: 'PUT', type: 'studio', key: 'active', payloadStr: docA, ifRevision: null, db, sub: 'user_A' });
  ok(putA.status === 201 && putA.body.revision === 1, 'authed PUT (new) -> 201 rev1, sub-scoped');
  const getA = await dispatch({ method: 'GET', type: 'studio', key: 'active', db, sub: 'user_A' });
  ok(getA.status === 200 && getA.body.payload === docA, 'GET as owner returns the doc');
  const getB = await dispatch({ method: 'GET', type: 'studio', key: 'active', db, sub: 'user_B' });
  ok(pick(getB.status === 404, getB.status === 200), 'user B CANNOT read user A row -> 404 (isolation) [BITE]');

  // ===== ALLOW-LIST =====
  const badType = await dispatch({ method: 'PUT', type: 'evil', key: 'active', payloadStr: '{}', ifRevision: null, db, sub: 'user_A' });
  ok(pick(badType.status === 400, badType.status !== 400), 'bad document_type -> 400 [BITE]');
  ok(DOC_TYPES.has('studio') && DOC_TYPES.has('sketchbook') && DOC_TYPES.has('blueprint') && DOC_TYPES.has('preferences') && DOC_TYPES.size === 4,
     'allow-list = {studio, sketchbook, blueprint, preferences}');

  // ===== REVISION / 409 =====
  lines.push('===== REVISION / 409 =====');
  const cur = await getDoc(db, 'user_A', 'studio', 'active');
  const upd = await putDoc(db, 'user_A', 'studio', 'active', JSON.stringify({ hello: 'A2' }), cur.revision);
  ok(upd.status === 200 && upd.body.revision === 2, 'CAS update with correct revision -> 200 rev2');
  const stale = await putDoc(db, 'user_A', 'studio', 'active', JSON.stringify({ hello: 'stale' }), 1);
  ok(pick(stale.status === 409, stale.status !== 409), 'stale revision (1) -> 409 conflict [BITE]');
  const stillA2 = await getDoc(db, 'user_A', 'studio', 'active');
  ok(JSON.parse(stillA2.payload).hello === 'A2', 'a rejected stale write did NOT clobber the server doc');

  // ===== FIDELITY ROUND-TRIP (the Captain's bug, proven dead) =====
  lines.push('===== FIDELITY ROUND-TRIP (172/18, save->reload) =====');
  const book = makeRealBook();
  const bookStr = JSON.stringify(book);
  await putDoc(db, 'user_C', 'blueprint', 'bp-real-172', bookStr, null);
  // simulate SIGN OUT + SIGN BACK IN = a fresh authenticated read for the same sub
  const reloaded = await getDoc(db, 'user_C', 'blueprint', 'bp-real-172');
  const back = JSON.parse(reloaded.payload);
  const holdCount = back.accounts.reduce((n, a) => n + ((a.holdings || []).length), 0);
  const namesOk = back.accounts.length === 18 && back.accounts.every((a, i) => a.name === book.accounts[i].name && a.name && a.name !== 'undefined');
  const holdingsOk = back.accounts.every((a, i) => JSON.stringify(a.holdings || []) === JSON.stringify(book.accounts[i].holdings || []));
  const byteIdentical = reloaded.payload === bookStr;
  ok(pick(namesOk && holdingsOk && byteIdentical && holdCount === 172,
          !(namesOk && holdingsOk && byteIdentical && holdCount === 172)),
     'FIDELITY: 18 accts / 172 holdings + EVERY name survive save->D1->reload, byte-identical [BITE]');
  ok(back.accounts.filter(a => !a.name || a.name === 'undefined').length === 0, 'ZERO undefined names on reload (the exact bug — DEAD)');
  ok(holdCount === 172, 'ZERO holdings shed on reload (172/172 — no graceful-degrade, no cap)');

  // ===== SIZE (worst-case ~50 rooms / 170 tickers) =====
  lines.push('===== SIZE (worst-case blueprint) =====');
  const worst = makeWorstCase(50, 170);
  const worstStr = JSON.stringify(worst);
  const bytes = Buffer.byteLength(worstStr, 'utf8');
  const worstHold = worst.accounts.reduce((n, a) => n + a.holdings.length, 0);
  // Conservative safety bar: 800 KB — far under SQLite's ~1GB TEXT limit and Workers' response
  // limits; a single per-row document this size is cheap to read/write. If a realistic worst case
  // ever exceeds this, that's the STOP-and-escalate trigger to move holdings to a child table.
  const D1_SAFE_BAR = 800 * 1024;
  ok(pick(bytes < D1_SAFE_BAR, bytes >= D1_SAFE_BAR),
     `SIZE: worst-case payload ${bytes} B < ${D1_SAFE_BAR} B safety bar [BITE]`);
  await putDoc(db, 'user_D', 'blueprint', 'worst', worstStr, null);
  const wback = await getDoc(db, 'user_D', 'blueprint', 'worst');
  ok(wback.payload === worstStr, 'worst-case blueprint round-trips through D1 byte-identical');
  lines.push('  [SIZE] ' + worst.accounts.length + ' rooms / ' + worstHold + ' tickers = ' + bytes + ' B (' +
    (bytes / 1024).toFixed(1) + ' KB) · bar ' + (D1_SAFE_BAR / 1024) + ' KB · margin ' +
    ((D1_SAFE_BAR - bytes) / 1024).toFixed(1) + ' KB (' + (D1_SAFE_BAR / bytes).toFixed(1) + '× headroom)');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-2 behavior gate (node:sqlite)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 PHASE-2 GATE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
