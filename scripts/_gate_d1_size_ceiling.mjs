/* D1 SIZE-CEILING GATE (red-first) — the 64KB keepalive save-size cap (#310).
 *
 * THE BUG (today, HEAD cc160ad): datum-d1.js putDoc() hardcodes `keepalive:true` on EVERY PUT.
 * The browser REJECTS a keepalive request whose body exceeds ~64KB (65536 B) with a TypeError,
 * BEFORE it hits the network. So a >64KB blueprint silently fails to persist to D1 on ANY save
 * (not just fast-nav): fetch throws -> caught -> {ok:false} -> nothing lands. Real, latent
 * data-loss for large (power-user) blueprints. D1 STORAGE is unlimited; the bug is a browser
 * TRANSPORT choice made unconditionally.
 *
 * HOW THIS GATE SPIES THE REAL WIRE (no stub / no happy-path):
 *   - loads the REAL client (scripts/datum-d1.js),
 *   - routes its fetch through a faithful model of the BROWSER TRANSPORT (keepalive+>64KB => the
 *     real TypeError refusal) that otherwise DELEGATES to the REAL server logic
 *     (documents-core.dispatch) against a REAL sqlite D1 + the real migration,
 *   - drives DatumD1.writeNow('blueprint', id, () => snap, cb) — byte-for-byte the call
 *     studio-blueprint.js:442-443 (d1WriteBlueprint) makes on an explicit Save,
 *   - asserts the >64KB blueprint PHYSICALLY LANDS in D1 and reloads byte-identical.
 *
 * RED today (bug present): the >64KB writeNow is refused -> nothing lands -> the [BITE] winners FAIL.
 * GREEN after the size-branch fix (keepalive only under the cap): the write lands -> winners PASS.
 * `--redfirst` flips the winners to prove they are non-tautological (RED on FIXED code).
 *
 * Run:  node --experimental-sqlite scripts/_gate_d1_size_ceiling.mjs [LABEL] [--redfirst]
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatch } from '../functions/api/_lib/documents-core.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

// ---- real D1 (node:sqlite) + the real migration ----
function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; } };
}
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_documents.sql', import.meta.url), 'utf8'));
const db = makeD1(sqlite);

// ---- REAL server: verify Bearer -> sub, then documents-core.dispatch (real logic) against real sqlite ----
function server(url, opts) {
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
    const r = await dispatch({ method: (opts && opts.method) || 'GET', type, key, list, payloadStr, ifRevision, db, sub: m[1] });
    return { status: r.status, json: async () => r.body };
  })();
}

// ---- FAITHFUL BROWSER TRANSPORT MODEL ----------------------------------------------------------
// The ONLY browser-specific behavior modeled: the keepalive body cap. Chrome/WebKit reject a keepalive
// fetch with a TypeError, BEFORE it is sent, once the CUMULATIVE in-flight keepalive request-body bytes
// exceed 65536 B (the cap is a shared budget across ALL in-flight keepalive requests, not per-request).
// A non-keepalive fetch has NO such cap. Everything reachable is delegated to the REAL server.
const KEEPALIVE_CAP = 65536;                 // the real browser cumulative keepalive body cap
const KEEPALIVE_BUDGET_BYTES_GATE = 60000;   // mirrors datum-d1.js KEEPALIVE_BUDGET_BYTES (for sizing seeds)
let _txKAInflight = 0;      // bytes of keepalive requests currently in flight (models the browser's cumulative budget)
let _forceRejectKey = null; // if set, the transport rejects the PUT with this doc_key mid-flight (network-error injection)
const _putLog = [];         // per PUT: { key, keepalive } — lets the gate observe which transport the CLIENT chose
function browserTransport(url, opts) {
  const u = new URL(url, 'https://datumfi.com');
  const key = u.searchParams.get('key');
  const ka = !!(opts && opts.keepalive);
  const bytes = (opts && opts.body) ? Buffer.byteLength(opts.body, 'utf8') : 0;
  if (opts && opts.method === 'PUT') _putLog.push({ key, keepalive: ka });
  // injected mid-flight failure: an in-flight fetch that REJECTS (network death) AFTER the client reserved its
  // keepalive bytes — the exact path that must still release the accumulator (else it leaks upward forever).
  if (_forceRejectKey && key === _forceRejectKey) return Promise.reject(new Error('network error'));
  if (ka) {
    if (_txKAInflight + bytes > KEEPALIVE_CAP) return Promise.reject(new TypeError('Failed to fetch'));   // cumulative cap exceeded
    _txKAInflight += bytes;
    return server(url, opts).finally(() => { _txKAInflight -= bytes; if (_txKAInflight < 0) _txKAInflight = 0; });
  }
  return server(url, opts);
}

function asUser(id) { globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } }; }

// A structurally-real DatumFIBlueprintV1 sized by holding count (rich holdings ~300 B each).
function makeBlueprint(id, totalHoldings) {
  const nAcc = 6, acc = []; let t = 0;
  for (let i = 0; i < nAcc; i++) {
    const n = Math.floor(totalHoldings / nAcc) + (i < totalHoldings % nAcc ? 1 : 0);
    const holdings = [];
    for (let h = 0; h < n; h++) holdings.push({
      ticker: 'TICKER' + (t + h), name: 'Vanguard Total World Stock Index Fund ETF Class ' + (t + h),
      price: '234.56', shares: '150.2534', costBasis: '18342.7519', acquisitionDate: '2021-06-14',
      beta: '1.184', dividendYield: '1.923', expRatio: '0.0451', geography: 'US', sector: 'Technology',
      assetClass: 'Equity', instrumentType: 'ETF', notes: 'long-term core position, tax-loss-harvest lot'
    });
    acc.push({ id: 'acct' + (i + 1), baseId: 'taxable_brokerage', name: 'Account ' + (i + 1), value: '482193.55', holdings });
    t += n;
  }
  return { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: id, accounts: acc, datum: {} };
}
const bodyBytesOf = (bp) => Buffer.byteLength(JSON.stringify({ payload: bp }), 'utf8');

(async () => {
  const mod = await import('../scripts/datum-d1.js');
  const DatumD1 = mod.default || globalThis.DatumD1;
  DatumD1._fetch = browserTransport;          // inject the faithful browser transport (the injectable hook)

  // ===== TRANSPORT-MODEL VALIDITY (not winners — proves the model reproduces the real browser) =====
  lines.push('===== TRANSPORT MODEL (browser keepalive cap) =====');
  const AUTH = { Authorization: 'Bearer tok:modelcheck', 'Content-Type': 'application/json' };
  const bigBody = JSON.stringify({ payload: { blob: 'x'.repeat(70000) } });   // > 64KB
  const smallBody = JSON.stringify({ payload: { a: 1 } });                     // tiny
  let mBigKA = false, mSmallKA = false, mBigNoKA = false;
  try { await browserTransport('/api/documents?type=blueprint&key=m1', { method: 'PUT', keepalive: true, headers: AUTH, body: bigBody }); }
  catch (e) { mBigKA = (e instanceof TypeError); }
  ok(mBigKA, 'MODEL: keepalive:true + >64KB body -> TypeError (the REAL Chrome/WebKit refusal, not a stub)');
  try { const r = await browserTransport('/api/documents?type=blueprint&key=m2', { method: 'PUT', keepalive: true, headers: AUTH, body: smallBody }); mSmallKA = (r.status === 200 || r.status === 201); } catch (e) {}
  ok(mSmallKA, 'MODEL: keepalive:true + small body -> passes (the cap is size-CONDITIONAL, not blanket)');
  try { const r = await browserTransport('/api/documents?type=blueprint&key=m3', { method: 'PUT', keepalive: false, headers: AUTH, body: bigBody }); mBigNoKA = (r.status === 200 || r.status === 201); } catch (e) {}
  ok(mBigNoKA, 'MODEL: keepalive:false + >64KB body -> passes (a non-keepalive fetch has NO body cap)');
  _txKAInflight = 0;
  const b40 = JSON.stringify({ payload: { blob: 'y'.repeat(40000) } });   // ~40KB each
  let mCumRej = false;
  const cp1 = browserTransport('/api/documents?type=blueprint&key=c1', { method: 'PUT', keepalive: true, headers: AUTH, body: b40 });
  const cp2 = browserTransport('/api/documents?type=blueprint&key=c2', { method: 'PUT', keepalive: true, headers: AUTH, body: b40 }).catch(e => { mCumRej = (e instanceof TypeError); return null; });
  await Promise.all([cp1, cp2]);
  ok(mCumRej, 'MODEL: two concurrent ~40KB keepalive writes -> the 2nd is refused (CUMULATIVE cap, not per-request)');

  // ===== THE SIZE CEILING — a >64KB blueprint must LAND via the REAL explicit-save wire =====
  lines.push('===== BIG BLUEPRINT SAVE (the 64KB ceiling) =====');
  asUser('userBIG');
  const big = makeBlueprint('bp-big-001', 480);
  const bigBytes = bodyBytesOf(big);
  ok(bigBytes > KEEPALIVE_CAP, 'SEED SANITY: the blueprint PUT body genuinely exceeds the 64KB cap (' + bigBytes + ' B)');

  // byte-for-byte the call d1WriteBlueprint makes on an explicit Save (studio-blueprint.js:442-443).
  const res = await DatumD1.writeNow('blueprint', big.blueprint_id, () => big, () => {});
  ok(pick(res.ok === true, res.ok !== true), 'BIG save via writeNow->putDoc LANDS (ok:true), not silently dropped [BITE]');

  const row = sqlite.prepare("SELECT payload_json FROM documents WHERE clerk_user_id='userBIG' AND document_type='blueprint' AND doc_key=?").get(big.blueprint_id);
  ok(pick(!!row, !row), 'the >64KB blueprint row PHYSICALLY EXISTS in D1 (not lost to a rejected keepalive fetch) [BITE]');

  const back = await DatumD1.getDoc('blueprint', big.blueprint_id);
  const byteIdentical = !!(back && back.payload === JSON.stringify(big));
  ok(pick(byteIdentical, !byteIdentical), 'reload of the >64KB blueprint is BYTE-IDENTICAL (zero holdings shed) [BITE]');
  const holdBack = back ? JSON.parse(back.payload).accounts.reduce((n, a) => n + a.holdings.length, 0) : 0;
  ok(pick(holdBack === 480, holdBack !== 480), 'all 480 holdings survive the >64KB save -> D1 -> reload (' + holdBack + '/480) [BITE]');

  // ===== TWO CONCURRENT LARGE WRITES — the cumulative cap must drop NEITHER =====
  lines.push('===== CONCURRENT WRITES (cumulative 64KB cap) =====');
  _txKAInflight = 0;                                   // fresh page: no keepalive in flight
  asUser('userCONC');
  const bpA = makeBlueprint('studio-active-doc', 130); // stands in for the active-studio autosave doc
  const bpB = makeBlueprint('bp-conc-001', 130);       // the explicit blueprint save, firing together
  const aBytes = bodyBytesOf(bpA), bBytes = bodyBytesOf(bpB);
  ok(aBytes < KEEPALIVE_CAP && bBytes < KEEPALIVE_CAP, 'SEED SANITY: each concurrent write is UNDER the cap alone (' + aBytes + ' , ' + bBytes + ' B)');
  ok(aBytes + bBytes > KEEPALIVE_CAP, 'SEED SANITY: the two TOGETHER exceed the cumulative cap (' + (aBytes + bBytes) + ' B)');
  // Fire both WITHOUT awaiting between them, so both are in flight when the cap is evaluated — the real race:
  // the active-studio autosave + an explicit blueprint save serializing the same large holdings.
  const [ra, rb] = await Promise.all([
    DatumD1.writeNow('studio', 'active', () => bpA, () => {}),
    DatumD1.writeNow('blueprint', bpB.blueprint_id, () => bpB, () => {})
  ]);
  ok(pick(ra.ok === true && rb.ok === true, !(ra.ok === true && rb.ok === true)), 'BOTH concurrent large writes LAND (neither dropped by the cumulative cap) [BITE]');
  const rowA = sqlite.prepare("SELECT 1 FROM documents WHERE clerk_user_id='userCONC' AND document_type='studio' AND doc_key='active'").get();
  const rowB = sqlite.prepare("SELECT 1 FROM documents WHERE clerk_user_id='userCONC' AND document_type='blueprint' AND doc_key=?").get(bpB.blueprint_id);
  ok(pick(!!rowA && !!rowB, !(!!rowA && !!rowB)), 'BOTH rows physically exist in D1 after the concurrent save [BITE]');

  // ===== CONTROL — a small blueprint must STILL save (fix must be size-conditional, never "kill keepalive") =====
  lines.push('===== CONTROL (small save must never regress) =====');
  asUser('userSMALL');
  const small = makeBlueprint('bp-small-001', 4);
  const smallBytes = bodyBytesOf(small);
  ok(smallBytes < KEEPALIVE_CAP, 'CONTROL SANITY: the small blueprint body is under the cap (' + smallBytes + ' B)');
  const sres = await DatumD1.writeNow('blueprint', small.blueprint_id, () => small, () => {});
  ok(sres.ok === true, 'CONTROL: a small blueprint still saves fine (keepalive still used under the cap)');
  const srow = sqlite.prepare("SELECT 1 FROM documents WHERE clerk_user_id='userSMALL' AND document_type='blueprint' AND doc_key=?").get(small.blueprint_id);
  ok(!!srow, 'CONTROL: the small blueprint row physically exists in D1');

  // ===== ACCUMULATOR RELEASE ON REJECT — a failed in-flight write must NOT leak the budget =====
  // A keepalive write reserves its bytes in _kaInflightBytes. If the fetch REJECTS (network death) and the
  // catch path forgets to release, the accumulator only ever climbs — and every FUTURE write is silently
  // starved into the non-keepalive slow path (losing fast-nav survival). Prove behaviorally that a reject
  // returns the accumulator to 0: force a mid-flight rejection, then show the NEXT under-budget write still
  // picks keepalive (a leak would push 40000+40000 > 60000 and force it non-keepalive).
  lines.push('===== ACCUMULATOR RELEASE ON REJECT =====');
  _txKAInflight = 0; _putLog.length = 0;
  asUser('userLEAK');
  const mid1 = makeBlueprint('leak-1', 130);   // ~40KB, UNDER the 60000 budget -> the client picks keepalive
  const mid1Bytes = bodyBytesOf(mid1);
  ok(mid1Bytes < KEEPALIVE_BUDGET_BYTES_GATE, 'SEED SANITY: the write is under the 60000 budget so the client picks keepalive (' + mid1Bytes + ' B)');
  _forceRejectKey = 'leak-1';                   // this keepalive write REJECTS mid-flight (network error)
  const r1 = await DatumD1.writeNow('blueprint', 'leak-1', () => mid1, () => {});
  _forceRejectKey = null;
  const sent1 = _putLog.find(p => p.key === 'leak-1');
  ok(!!sent1 && sent1.keepalive === true, 'the rejected write WAS sent keepalive:true (its bytes were reserved in the accumulator)');
  ok(r1.ok === false, 'the rejected write returns {ok:false} (caught, never throws — LS/Clerk net unaffected)');
  const mid2 = makeBlueprint('leak-2', 130);    // second under-budget write, fired AFTER the reject settled
  const r2 = await DatumD1.writeNow('blueprint', 'leak-2', () => mid2, () => {});
  const sent2 = _putLog.find(p => p.key === 'leak-2');
  ok(pick(!!sent2 && sent2.keepalive === true, !(!!sent2 && sent2.keepalive === true)),
     'after the reject the accumulator RETURNED TO 0: the next under-budget write STILL picks keepalive (no leak) [BITE]');
  ok(r2.ok === true, 'and that next write lands (accumulator did not starve it into a failure)');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST self-test (winners flipped — MUST be RED on FIXED code)' : 'NORMAL (RED today: bug present; GREEN after the size-branch fix)'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 SIZE-CEILING GATE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
