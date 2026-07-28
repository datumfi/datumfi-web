/* D1 SKETCH HOLD-NAV GATE (red-first) — Part 3 of #310: sketch smooth in-app drain-hold.
 *
 * After Part 2 (2721b3d) sketch is already SAFE from silent loss — it rides the same DatumD1 tracker, so its
 * beforeunload guard + Saving…/Saved pill + pagehide flush all fire. The ONLY thing sketch lacks vs studio is
 * the SMOOTH in-app hold: its in-app nav exits still do a raw location.href, so leaving mid-drain shows the
 * browser's Leave/Stay? prompt instead of the silky "Saving…" hold. Part 3 = route sketch.html's nav exits
 * through window._navDrain (await DatumD1.drain() before location.href), the identical helper studio uses.
 *
 * PROVES:
 *   BEHAVIOR (real module — the mechanism _navDrain invokes): a real sketch write
 *     (DatumD1.scheduleWrite('sketchbook',…), sketch.html:9017 shape) held by drain() on an in-app nav LANDS
 *     with "Saving…" observed, and beforeunload is silent after the drained nav (no double-prompt).
 *   WIRING (served bytes — the Part-3 change, RED until sketch.html is wired): sketch.html defines _navDrain
 *     and routes all 4 of its nav exits through it (no raw location.href left on them).
 *
 * Part 3 is a WIRING change; its red-first BITEs are the sketch.html served-bytes markers (same accepted
 * pattern as Part 2's studio.html markers). The drain-hold MECHANISM is spied on the REAL module.
 *
 * Run:  node --experimental-sqlite scripts/_gate_d1_sketch_holdnav.mjs [LABEL] [--redfirst]
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

function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; } };
}
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_documents.sql', import.meta.url), 'utf8'));
const db = makeD1(sqlite);

const _lagFirstRead = new Set();
function server(url, opts) {
  return (async () => {
    const u = new URL(url, 'https://datumfi.com');
    const type = u.searchParams.get('type') || '', key = u.searchParams.get('key') || 'active', list = u.searchParams.get('list') === '1';
    const method = (opts && opts.method) || 'GET';
    const m = ((opts && opts.headers && opts.headers.Authorization) || '').match(/^Bearer\s+tok:(.+)$/);
    if (!m) return { status: 401, json: async () => ({ error: 'unauthorized' }) };
    if (method === 'GET' && !list && _lagFirstRead.has(key)) { _lagFirstRead.delete(key); return { status: 404, json: async () => ({ error: 'replica lag' }) }; }
    let payloadStr = null, ifRevision = null;
    if (method === 'PUT') { const b = JSON.parse(opts.body); payloadStr = b.payload !== undefined ? JSON.stringify(b.payload) : null; ifRevision = typeof b.revision === 'number' ? b.revision : null; }
    const r = await dispatch({ method, type, key, list, payloadStr, ifRevision, db, sub: m[1] });
    if (method === 'PUT' && (r.status === 200 || r.status === 201)) _lagFirstRead.add(key);
    return { status: r.status, json: async () => r.body };
  })();
}

const KEEPALIVE_CAP = 65536;
let _txKAInflight = 0, _unloaded = false;
const _pendingReq = new Set();
function fireUnload() { _unloaded = true; for (const e of _pendingReq) { if (!e.ka && !e.done) e.cancel(); } }
function browserTransport(url, opts) {
  const method = (opts && opts.method) || 'GET', ka = !!(opts && opts.keepalive);
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

const _wl = {}, _dl = {};
globalThis.window = globalThis;
globalThis.addEventListener = (t, cb) => { (_wl[t] = _wl[t] || []).push(cb); };
globalThis.removeEventListener = (t, cb) => { if (_wl[t]) _wl[t] = _wl[t].filter(f => f !== cb); };
globalThis.document = { addEventListener: (t, cb) => { (_dl[t] = _dl[t] || []).push(cb); }, visibilityState: 'visible' };
if (typeof globalThis.DOMException === 'undefined') globalThis.DOMException = class extends Error { constructor(m, n) { super(m); this.name = n; } };
const dispatchWin = (t, ev) => { (_wl[t] || []).forEach(cb => cb(ev)); return ev; };
const newBE = () => ({ returnValue: undefined, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

function asUser(id) { globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } }; }
function makeBlueprint(id, n) {
  const acc = []; let t = 0;
  for (let i = 0; i < 6; i++) { const c = Math.floor(n / 6) + (i < n % 6 ? 1 : 0); const h = [];
    for (let j = 0; j < c; j++) h.push({ ticker: 'TK' + (t + j), name: 'Vanguard Total World Stock Index Fund ETF Class ' + (t + j), price: '234.56', shares: '150.2534', costBasis: '18342.7519', acquisitionDate: '2021-06-14', beta: '1.184', dividendYield: '1.923', expRatio: '0.0451', geography: 'US', sector: 'Technology', assetClass: 'Equity', instrumentType: 'ETF', notes: 'core' });
    acc.push({ id: 'a' + (i + 1), baseId: 'taxable_brokerage', name: 'Account ' + (i + 1), value: '482193.55', holdings: h }); t += c; }
  return { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: id, accounts: acc, datum: {} };
}

(async () => {
  const dmod = await import('../scripts/datum-d1.js');
  const DatumD1 = dmod.default || globalThis.DatumD1;
  DatumD1._fetch = browserTransport; globalThis.DatumD1 = DatumD1;
  await import('../scripts/studio-blueprint.js');
  ok(typeof DatumD1.drain === 'function', 'HARNESS: real datum-d1.js loaded with the shared drain() (from Part 2)');
  async function readWithRetry(type, key, attempts = 6) { for (let i = 0; i < attempts; i++) { const r = await DatumD1.getDoc(type, key); if (r) return r; await tick(); } return null; }

  // ===== BEHAVIOR (real module) — the drain-hold mechanism sketch.html's _navDrain will invoke =====
  lines.push('===== BEHAVIOR: sketch in-app nav held by drain() [real module] =====');
  asUser('userSK'); _unloaded = false; DatumD1.WRITE_DEBOUNCE_MS = 100000;
  const seen = []; if (typeof DatumD1.onState === 'function') DatumD1.onState(s => seen.push(s));
  DatumD1.scheduleWrite('sketchbook', 'sk-nav', () => makeBlueprint('sk-nav', 480), () => {});   // EXACT sketch.html:9017 shape (debounced, >64KB)
  if (typeof DatumD1.drain === 'function') await DatumD1.drain();                                 // models sketch _navDrain hold
  await navigateAway();
  ok(pick(seen.indexOf('saving') !== -1, seen.indexOf('saving') === -1), 'the "Saving…" state is observed during the sketch drain-hold');
  ok(pick(!!(await readWithRetry('sketchbook', 'sk-nav')), !(await readWithRetry('sketchbook', 'sk-nav'))), 'the sketch write LANDS on the held in-app nav (not lost to unload)');
  const beSk = newBE(); dispatchWin('beforeunload', beSk);
  ok(beSk.defaultPrevented === false && beSk.returnValue === undefined, 'beforeunload is SILENT after the drained sketch nav (no double-prompt)');

  // ===== WIRING (served bytes) — sketch.html routes its 4 nav exits through _navDrain (RED until wired) =====
  lines.push('===== WIRING: sketch.html nav exits routed through _navDrain =====');
  const skHtml = readFileSync(new URL('../sketch.html', import.meta.url), 'utf8');
  ok(pick(skHtml.includes('window._navDrain = function'), !skHtml.includes('window._navDrain = function')), 'sketch.html defines window._navDrain (awaits DatumD1.drain before nav) [BITE]');
  const navCalls = (skHtml.match(/_navDrain\(/g) || []).length;
  ok(pick(navCalls >= 4, !(navCalls >= 4)), 'all 4 sketch nav exits routed through _navDrain (' + navCalls + '/4) [BITE]');
  const rawLeft = /location\.href = '\/sketchbook\.html'/.test(skHtml) || /location\.href = '\/vault\.html\?returnTo=' \+ encodeURIComponent\('\/sketchbook/.test(skHtml) || /location\.href = new URL\('sketchbook\.html'/.test(skHtml);
  ok(pick(!rawLeft, rawLeft), 'no raw location.href left on the guarded sketch nav exits [BITE]');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('SCOPE: sketch.html has drainable writes (scheduleWrite sketchbook:9017) -> 4 nav exits wired. sketchbook.html is DELETE-only');
  lines.push('(keepalive, survives unload) -> no drainable write -> _navDrain there would be a pure no-op (flagged, not wired).');
  lines.push('MODE: ' + (RF ? 'RED-FIRST self-test (winners flipped — MUST be RED on wired code)' : 'NORMAL (RED until sketch.html is wired; GREEN after)'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 SKETCH HOLD-NAV GATE — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
