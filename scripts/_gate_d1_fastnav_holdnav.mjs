/* D1 FAST-NAV / DRAIN / SAVE-STATE / BEFOREUNLOAD GATE (red-first) — Part 2 of #310.
 *
 * Design (2) — the DatumD1 drain() guard + honest save-state (A2 pill signal) + beforeunload guard +
 * pagehide keepalive flush. All of it rides ONE in-flight tracker in non-sacred datum-d1.js (L48), so
 * studio, blueprint AND sketch (which all save via the same DatumD1) are covered by the same seam.
 *
 * PROVES (each bite-before-it-passes; RED on the current tree until the fix lands, GREEN after):
 *   (a) an in-app nav HELD by drain() lands a big (>64KB, non-keepalive) save + the "Saving…" state is seen,
 *   (b) beforeunload ARMS while a write is in flight and is SILENT once drained to zero (no double-prompt),
 *   (c) pagehide keepalive flush LANDS the sub-64KB tail; the >64KB tail is NOT claimed to survive (honesty),
 *   (d) SKETCH rides the identical tracker/drain/beforeunload/Saving… signal (the fold-in requirement),
 *   (e) the AUTOSAVE path (active-studio scheduleWrite) is flushed+drained on nav,
 *   + control (small save survives fast-nav via keepalive), replica-lag settle/retry reflex (gap #1),
 *   + studio.html served-bytes wiring markers (_navDrain defined + all 6 nav exits routed).
 *
 * gate-spies-real-wire: real datum-d1.js + real studio-blueprint.js (read-only import), a faithful browser
 * transport (keepalive cumulative cap + unload-cancellation), a real window/document event surface, and the
 * REAL DatumD1.scheduleWrite('sketchbook',…) call shape sketch.html:9017 uses.
 *
 * Run:  node --experimental-sqlite scripts/_gate_d1_fastnav_holdnav.mjs [LABEL] [--redfirst]
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatch } from '../functions/api/_lib/documents-core.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const tick = () => new Promise(r => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 8; i++) await tick(); };

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

// ---- REAL server (auth -> documents-core.dispatch -> sqlite) WITH a modeled LAGGING READ REPLICA (gap #1) ----
const _lagFirstRead = new Set();
function server(url, opts) {
  return (async () => {
    const u = new URL(url, 'https://datumfi.com');
    const type = u.searchParams.get('type') || '';
    const key = u.searchParams.get('key') || 'active';
    const list = u.searchParams.get('list') === '1';
    const method = (opts && opts.method) || 'GET';
    const auth = (opts && opts.headers && opts.headers.Authorization) || '';
    const m = auth.match(/^Bearer\s+tok:(.+)$/);
    if (!m) return { status: 401, json: async () => ({ error: 'unauthorized' }) };
    if (method === 'GET' && !list && _lagFirstRead.has(key)) { _lagFirstRead.delete(key); return { status: 404, json: async () => ({ error: 'replica lag' }) }; }
    let payloadStr = null, ifRevision = null;
    if (method === 'PUT') { const body = JSON.parse(opts.body); payloadStr = body.payload !== undefined ? JSON.stringify(body.payload) : null; ifRevision = typeof body.revision === 'number' ? body.revision : null; }
    const r = await dispatch({ method, type, key, list, payloadStr, ifRevision, db, sub: m[1] });
    if (method === 'PUT' && (r.status === 200 || r.status === 201)) _lagFirstRead.add(key);
    return { status: r.status, json: async () => r.body };
  })();
}

// ---- FAITHFUL BROWSER TRANSPORT: keepalive cumulative cap + UNLOAD-CANCELLATION ----
const KEEPALIVE_CAP = 65536;
let _txKAInflight = 0, _unloaded = false;
const _pendingReq = new Set();
function fireUnload() { _unloaded = true; for (const e of _pendingReq) { if (!e.ka && !e.done) e.cancel(); } }
function browserTransport(url, opts) {
  const method = (opts && opts.method) || 'GET';
  const ka = !!(opts && opts.keepalive);
  const bytes = (opts && opts.body) ? Buffer.byteLength(opts.body, 'utf8') : 0;
  if (method === 'PUT' && ka && (_txKAInflight + bytes > KEEPALIVE_CAP)) return Promise.reject(new TypeError('Failed to fetch'));
  if (method === 'PUT' && ka) _txKAInflight += bytes;
  return new Promise((resolve, reject) => {
    const e = { ka, done: false };
    const rel = () => { if (method === 'PUT' && ka) { _txKAInflight -= bytes; if (_txKAInflight < 0) _txKAInflight = 0; } };
    e.fire = async () => { if (e.done) return; e.done = true; _pendingReq.delete(e); rel(); resolve(await server(url, opts)); };
    e.cancel = () => { if (e.done) return; e.done = true; _pendingReq.delete(e); rel(); reject(new DOMException('aborted', 'AbortError')); };
    _pendingReq.add(e);
    setTimeout(() => { (_unloaded && !e.ka) ? e.cancel() : e.fire(); }, 0);
  });
}
async function navigateAway() { fireUnload(); await flush(); _unloaded = false; }

// ---- REAL window/document event surface (so datum-d1's beforeunload/pagehide/visibilitychange register) ----
const _wl = {}, _dl = {};
globalThis.window = globalThis;
globalThis.addEventListener = (t, cb) => { (_wl[t] = _wl[t] || []).push(cb); };
globalThis.removeEventListener = (t, cb) => { if (_wl[t]) _wl[t] = _wl[t].filter(f => f !== cb); };
globalThis.document = { addEventListener: (t, cb) => { (_dl[t] = _dl[t] || []).push(cb); }, visibilityState: 'visible' };  // no createElement -> pill no-ops
if (typeof globalThis.DOMException === 'undefined') globalThis.DOMException = class extends Error { constructor(m, n) { super(m); this.name = n; } };
const dispatchWin = (t, ev) => { (_wl[t] || []).forEach(cb => cb(ev)); return ev; };

function asUser(id) { globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } }; }
function makeBlueprint(id, totalHoldings) {
  const nAcc = 6, acc = []; let t = 0;
  for (let i = 0; i < nAcc; i++) {
    const n = Math.floor(totalHoldings / nAcc) + (i < totalHoldings % nAcc ? 1 : 0);
    const holdings = [];
    for (let h = 0; h < n; h++) holdings.push({ ticker: 'TICKER' + (t + h), name: 'Vanguard Total World Stock Index Fund ETF Class ' + (t + h),
      price: '234.56', shares: '150.2534', costBasis: '18342.7519', acquisitionDate: '2021-06-14', beta: '1.184', dividendYield: '1.923',
      expRatio: '0.0451', geography: 'US', sector: 'Technology', assetClass: 'Equity', instrumentType: 'ETF', notes: 'long-term core position' });
    acc.push({ id: 'acct' + (i + 1), baseId: 'taxable_brokerage', name: 'Account ' + (i + 1), value: '482193.55', holdings });
    t += n;
  }
  return { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: id, accounts: acc, datum: {} };
}
const bodyBytesOf = (bp) => Buffer.byteLength(JSON.stringify({ payload: bp }), 'utf8');
const newBE = () => ({ returnValue: undefined, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

(async () => {
  const dmod = await import('../scripts/datum-d1.js');
  const DatumD1 = dmod.default || globalThis.DatumD1;
  DatumD1._fetch = browserTransport;
  globalThis.DatumD1 = DatumD1;
  await import('../scripts/studio-blueprint.js');            // SACRED — read-only import, NOT modified
  const SB = globalThis.DatumBlueprint;
  ok(!!(SB && typeof SB.d1WriteBlueprint === 'function' && typeof SB.d1WriteStudio === 'function'), 'HARNESS: real studio-blueprint.js loaded (d1WriteBlueprint + d1WriteStudio are the REAL functions)');

  async function readWithRetry(type, key, attempts = 6) { for (let i = 0; i < attempts; i++) { const r = await DatumD1.getDoc(type, key); if (r) return r; await tick(); } return null; }
  const holdsOf = (r) => r ? JSON.parse(r.payload).accounts.reduce((n, a) => n + a.holdings.length, 0) : 0;

  // ===== REPLICA-LAG reflex (gap #1) =====
  lines.push('===== REPLICA-LAG REFLEX (settle/retry on the verify read) =====');
  asUser('userLAG'); _unloaded = false;
  await DatumD1.writeNow('blueprint', 'lag-A', () => makeBlueprint('lag-A', 4), () => {});
  ok((await DatumD1.getDoc('blueprint', 'lag-A')) === null, 'a SINGLE-shot read after a write can MISS off a lagging replica (would false-RED)');
  await DatumD1.writeNow('blueprint', 'lag-B', () => makeBlueprint('lag-B', 4), () => {});
  ok(!!(await readWithRetry('blueprint', 'lag-B')), 'the settle/retry read reads PAST the lag and finds the row');

  // ===== CONTROL — small save survives fast-nav via keepalive =====
  lines.push('===== CONTROL (small save survives fast-nav via keepalive) =====');
  asUser('userNAVsmall'); _unloaded = false;
  const small = makeBlueprint('bp-nav-small', 4);
  ok(bodyBytesOf(small) < 60000, 'SEED SANITY: small save under budget -> keepalive (survives unload)');
  SB.d1WriteBlueprint(small); await navigateAway();
  ok(!!(await readWithRetry('blueprint', 'bp-nav-small')), 'CONTROL: the small save LANDS despite immediate nav (keepalive survived unload)');

  // ===== (a) IN-APP NAV HELD by drain() + Saving… state observed =====
  lines.push('===== (a) IN-APP NAV HELD + SAVING… STATE =====');
  asUser('userNAVbig'); _unloaded = false;
  const seen = []; if (typeof DatumD1.onState === 'function') DatumD1.onState(s => seen.push(s));
  const big = makeBlueprint('bp-nav-big', 480);
  ok(bodyBytesOf(big) > KEEPALIVE_CAP, 'SEED SANITY: big save ' + bodyBytesOf(big) + ' B -> NON-keepalive (cancellable on unload)');
  SB.d1WriteBlueprint(big);                                     // explicit save (writeNow, non-keepalive) — user stays on page
  if (typeof DatumD1.drain === 'function') await DatumD1.drain();   // _navDrain HOLDS the in-app nav
  await navigateAway();
  ok(pick(seen.indexOf('saving') !== -1, seen.indexOf('saving') === -1), 'A2: the "Saving…" state is observed while the write is in flight [BITE]');
  const backBig = await readWithRetry('blueprint', 'bp-nav-big');
  ok(pick(!!backBig, !backBig), 'the big navigated-away save LANDS (in-app nav held by drain) [BITE]');
  ok(pick(holdsOf(backBig) === 480, holdsOf(backBig) !== 480), 'all 480 holdings survive the held nav (' + holdsOf(backBig) + '/480) [BITE]');

  // ===== (b) BEFOREUNLOAD — armed while in flight, silent when drained to zero =====
  lines.push('===== (b) BEFOREUNLOAD GUARD =====');
  asUser('userBE'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  DatumD1.writeNow('blueprint', 'be-1', () => makeBlueprint('be-1', 480), () => {});   // big, in flight
  const be1 = newBE(); dispatchWin('beforeunload', be1);
  ok(pick(be1.defaultPrevented === true || be1.returnValue === '', !(be1.defaultPrevented === true || be1.returnValue === '')), 'beforeunload ARMS the native leave-confirm while a write is in flight [BITE]');
  if (typeof DatumD1.drain === 'function') await DatumD1.drain();
  const be2 = newBE(); dispatchWin('beforeunload', be2);
  ok(be2.defaultPrevented === false && be2.returnValue === undefined, 'beforeunload is SILENT once drained to zero (no double-prompt after a smooth in-app nav)');

  // ===== (c) PAGEHIDE keepalive flush — sub-64KB tail lands; >64KB honestly does NOT =====
  lines.push('===== (c) PAGEHIDE KEEPALIVE FLUSH =====');
  asUser('userPH'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  DatumD1.scheduleWrite('sketchbook', 'ph-small', () => makeBlueprint('ph-small', 4), () => {});   // pending, sub-64KB
  dispatchWin('pagehide', {}); _unloaded = true; await flush(); _unloaded = false;
  ok(pick(!!(await readWithRetry('sketchbook', 'ph-small')), !(await readWithRetry('sketchbook', 'ph-small'))), 'pagehide flush LANDS the sub-64KB tail via keepalive (survives unload) [BITE]');
  asUser('userPHbig'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  DatumD1.scheduleWrite('sketchbook', 'ph-big', () => makeBlueprint('ph-big', 480), () => {});      // pending, >64KB
  dispatchWin('pagehide', {}); _unloaded = true; await flush(); _unloaded = false;
  ok(!(await readWithRetry('sketchbook', 'ph-big', 2)), 'HONESTY: the >64KB tail is NOT claimed to survive pagehide (non-keepalive cancelled on unload) — inherent floor');

  // ===== (d) SKETCH SHARED TRACKER — rides the identical drain/beforeunload/Saving… signal =====
  lines.push('===== (d) SKETCH SHARED TRACKER =====');
  asUser('userSKETCH'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  const seenSk = []; if (typeof DatumD1.onState === 'function') DatumD1.onState(s => seenSk.push(s));
  DatumD1.scheduleWrite('sketchbook', 'sk-1', () => makeBlueprint('sk-1', 480), () => {});   // EXACT sketch.html:9017 call shape
  const beSk = newBE(); dispatchWin('beforeunload', beSk);
  ok(pick(beSk.defaultPrevented === true, beSk.defaultPrevented !== true), 'SKETCH rides the tracker: beforeunload ARMS for a pending sketchbook write [BITE]');
  ok(pick(seenSk.indexOf('saving') !== -1, seenSk.indexOf('saving') === -1), 'SKETCH rides the tracker: the SAME Saving… signal fires for a sketch write [BITE]');
  if (typeof DatumD1.drain === 'function') await DatumD1.drain(); _unloaded = false;
  ok(pick(!!(await readWithRetry('sketchbook', 'sk-1')), !(await readWithRetry('sketchbook', 'sk-1'))), 'SKETCH rides the tracker: the SAME drain() flushes+lands the debounced sketchbook write [BITE]');

  // ===== (e) AUTOSAVE path (active-studio scheduleWrite) flushed + drained on nav =====
  lines.push('===== (e) AUTOSAVE PATH DRAINED =====');
  asUser('userAUTO'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  SB.d1WriteStudio(makeBlueprint('active-doc', 480));   // REAL autosave wire -> scheduleWrite('studio','active') debounced
  if (typeof DatumD1.drain === 'function') await DatumD1.drain(); await navigateAway();
  ok(pick(!!(await readWithRetry('studio', 'active')), !(await readWithRetry('studio', 'active'))), 'AUTOSAVE: a big active-studio write still in the debounce window is FLUSHED + drained on nav (not lost) [BITE]');

  // ===== STUDIO.HTML WIRING (served bytes) — _navDrain defined + all 6 nav exits routed =====
  lines.push('===== STUDIO.HTML WIRING (served bytes) =====');
  const stHtml = readFileSync(new URL('../studio.html', import.meta.url), 'utf8');
  ok(pick(stHtml.includes('window._navDrain = function'), !stHtml.includes('window._navDrain = function')), 'studio.html defines _navDrain (awaits DatumD1.drain before nav) [BITE]');
  const navCalls = (stHtml.match(/_navDrain\(/g) || []).length;
  ok(pick(navCalls >= 6, !(navCalls >= 6)), 'all 6 studio nav exits routed through _navDrain (' + navCalls + '/6) [BITE]');
  ok(pick(!/location\.href = '\/range\.html'|location\.href = _signedIn|location\.href = '\/Blueprint\.html'/.test(stHtml), /location\.href = '\/range\.html'/.test(stHtml)), 'no raw location.href left on the guarded nav exits [BITE]');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('RESIDUAL (honest): in-app navs drain-guarded with a visible Saving… hold; hard reload/tab-close mid over-64KB drain surfaces the native');
  lines.push('leave-confirm (never silent) + the sub-64KB tail flushes on pagehide. Only an explicit "Leave" mid over-64KB write remains — a browser floor.');
  lines.push('MODE: ' + (RF ? 'RED-FIRST self-test (winners flipped — MUST be RED on FIXED code)' : 'NORMAL (RED before the Part-2 fix; GREEN after)'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 FAST-NAV/DRAIN GATE — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
