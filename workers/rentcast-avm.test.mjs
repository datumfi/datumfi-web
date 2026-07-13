/* RED-FIRST CAP-GATE — RentCast AVM Worker (workers/rentcast-avm.mjs).
   Acceptance criterion (Captain #243 GO-3): prove call #51 is BLOCKED — no network — BEFORE the
   "Use value estimate (API)" toggle may turn on. Mocks KV + global fetch; asserts:
     · decideCall pure logic (cache / capped / call)
     · at count=50 the handler returns 'capped' and NEVER calls fetch (counter unchanged)
     · at count=49 exactly ONE fetch fires and the counter reserves to 50 (never exceeds cap)
     · a cached asset returns with zero calls (de-dupe)
     · the Worker source carries NO API-key literal (key = Worker secret)
   RED-FIRST: `--redfirst` flips the #51 assertion (assert fetch WAS called at cap) -> RED on correct code.
   Usage: node scripts/_gate_rentcast_cap.mjs [LABEL] [--redfirst] */
import { readFileSync } from 'node:fs';
import { handle, decideCall, MONTHLY_CAP, monthKey, trimComps, parseCensus } from './rentcast-avm.mjs';

const RF = process.argv.includes('--redfirst');
const LABEL = process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN';
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const pick = (win, lose) => (RF ? lose : win);

// in-memory KV mock
function mockKV(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    _m: m,
    async get(k, type) { const v = m.has(k) ? m.get(k) : null; return (type === 'json' && v != null) ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); }
  };
}
const req = (addr) => ({ method: 'GET', url: 'https://w.example/?address=' + encodeURIComponent(addr) });

let fetchCalls = 0;
function installFetch(impl) { fetchCalls = 0; globalThis.fetch = async (...a) => { fetchCalls++; return impl ? impl(...a) : { ok: false, status: 500, json: async () => ({}) }; }; }
const okProvider = async () => ({ ok: true, json: async () => ({ price: 500000, priceRangeLow: 480000, priceRangeHigh: 520000,
  comparables: [
    { formattedAddress: '10 A St, Austin, TX', price: 505000, bedrooms: 3, bathrooms: 2,   squareFootage: 1800, distance: 0.4, removedDate: '2026-05-01', id: 'X1', correlation: 0.98, listingType: 'Standard' },
    { formattedAddress: '12 B St, Austin, TX', price: 495000, bedrooms: 3, bathrooms: 2.5, squareFootage: 1750, distance: 0.6, lastSeenDate: '2026-04-15' }
  ] }) });

(async () => {
  const mk = monthKey();

  // ---- pure decideCall ----
  ok(decideCall(MONTHLY_CAP, null).action === 'capped', 'decideCall(50, null) -> capped');
  ok(decideCall(MONTHLY_CAP - 1, null).action === 'call', 'decideCall(49, null) -> call');
  ok(decideCall(0, { value: 1 }).action === 'cache', 'decideCall(0, cached) -> cache (de-dupe)');
  ok(MONTHLY_CAP === 50, 'MONTHLY_CAP === 50');

  // ---- T2 trimComps (PURE) — trims to the R147 fields ONLY, caps at 8, safe on junk ----
  ok(Array.isArray(trimComps(null)) && trimComps(null).length === 0, 'trimComps(null) -> [] (safe)');
  ok(trimComps(new Array(20).fill({ price: 1 })).length === 8, 'trimComps caps at 8 comps');
  const _tc = trimComps([{ formattedAddress: 'X', price: 9, bedrooms: 3, bathrooms: 2, squareFootage: 1000, distance: 0.5, removedDate: '2026-01-01', id: 'SECRET', correlation: 0.9, ownerName: 'PII' }])[0];
  ok(_tc.address === 'X' && _tc.price === 9 && _tc.beds === 3 && _tc.baths === 2 && _tc.sqft === 1000 && _tc.distance === 0.5 && _tc.saleDate === '2026-01-01', 'trimComps keeps the 7 R147 fields');
  ok(pick(!('id' in _tc) && !('correlation' in _tc) && !('ownerName' in _tc), ('ownerName' in _tc)), 'trimComps DROPS raw/PII fields (id/correlation/ownerName) [BITE]');

  // ---- T3 parseCensus (PURE) — verified / not-found mapping ----
  ok(parseCensus({ result: { addressMatches: [{ matchedAddress: 'CANON' }] } }).status === 'verified', 'parseCensus(match) -> verified');
  ok(parseCensus({ result: { addressMatches: [{ matchedAddress: 'CANON' }] } }).canonical === 'CANON', 'parseCensus -> canonical address');
  ok(pick(parseCensus({ result: { addressMatches: [] } }).status === 'not-found', parseCensus({ result: { addressMatches: [] } }).status === 'verified'), 'parseCensus(no match) -> not-found [BITE]');

  // ---- #51 BLOCKED: at count=50, no fetch, counter unchanged ----
  installFetch(okProvider);
  let kv = mockKV({ [mk]: '50' });
  let r = await handle(req('123 Main St'), { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  let body = await r.json();
  ok(body.status === 'capped', 'call #51 -> status "capped"');
  ok(pick(fetchCalls === 0, fetchCalls > 0), 'call #51 issues NO network fetch [BITE]');
  ok((kv._m.get(mk)) === '50', 'counter unchanged at cap (no bump on the capped call)');

  // ---- count=49: exactly one fetch, counter reserves to 50 (never exceeds cap) ----
  installFetch(okProvider);
  kv = mockKV({ [mk]: '49' });
  r = await handle(req('456 Oak Ave'), { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'ok' && body.low === 480000 && body.high === 520000, 'call #50 -> ok + RANGE (low/high, no false precision)');
  ok(fetchCalls === 1, 'call #50 fires exactly ONE provider fetch');
  ok((kv._m.get(mk)) === '50', 'counter reserved to 50 (slot taken before the call)');
  ok(Array.isArray(body.comps) && body.comps.length === 2 && body.comps[0].address === '10 A St, Austin, TX' && body.comps[0].price === 505000, 'AVM out carries trimmed comps (rides the SAME /avm/value call)');
  ok(pick(!('id' in (body.comps[0] || {})) && !('correlation' in (body.comps[0] || {})), ('id' in (body.comps[0] || {}))), 'served comps carry NO raw RentCast fields (PII/scope) [BITE]');

  // ---- de-dupe: cached asset returns with zero calls ----
  installFetch(okProvider);
  kv = mockKV({ [mk]: '10', ['avm:789 elm st']: JSON.stringify({ value: 300000, low: 290000, high: 310000 }) });
  r = await handle(req('789 Elm St'), { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'cached' && fetchCalls === 0, 'cached asset -> "cached", zero fetch (de-dupe)');

  // ---- T3 /verify route: Census proxy, and it MUST NOT touch the RentCast cap (counter unchanged) ----
  globalThis.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ result: { addressMatches: [{ matchedAddress: 'CANON ADDR' }] } }) }; };
  fetchCalls = 0;
  kv = mockKV({ [mk]: '7' });
  r = await handle({ method: 'GET', url: 'https://w.example/verify?address=' + encodeURIComponent('1600 Pennsylvania Ave') }, { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'verified' && body.canonical === 'CANON ADDR', '/verify -> verified + canonical (Census proxy, server-side)');
  ok(pick((kv._m.get(mk)) === '7', (kv._m.get(mk)) !== '7'), '/verify does NOT touch the RentCast cap counter [BITE]');

  // ---- T3 /verify retry: a transient Census failure on attempt 1 -> success on attempt 2 ----
  let vAttempts = 0;
  globalThis.fetch = async () => { vAttempts++; if (vAttempts === 1) throw new Error('census hiccup'); return { ok: true, json: async () => ({ result: { addressMatches: [{ matchedAddress: 'RETRIED OK' }] } }) }; };
  r = await handle({ method: 'GET', url: 'https://w.example/verify?address=' + encodeURIComponent('1 Real St') }, { RENTCAST_KV: mockKV({}), RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'verified' && body.canonical === 'RETRIED OK' && vAttempts === 2, '/verify retries ONCE past a transient Census failure');

  // ---- no-key: permitted but key absent -> graceful, no crash ----
  installFetch(okProvider);
  kv = mockKV({ [mk]: '0' });
  r = await handle(req('1 New Rd'), { RENTCAST_KV: kv });   // no RENTCAST_API_KEY
  body = await r.json();
  ok(body.status === 'no-key', 'no key present -> graceful "no-key" (toggle stays OFF)');

  // ---- KEY SAFETY: no api-key literal in the Worker source ----
  const src = readFileSync(new URL('./rentcast-avm.mjs', import.meta.url), 'utf8');
  const hasKeyLiteral = /RENTCAST_API_KEY\s*[:=]\s*['"][A-Za-z0-9]{8,}/.test(src) || /rc_[A-Za-z0-9]{12,}/.test(src);
  ok(pick(!hasKeyLiteral, hasKeyLiteral), 'NO API-key literal in Worker source (key = secret) [BITE]');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (must be RED)' : 'NORMAL') + '   |   RentCast AVM cap-gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + LABEL + '] RENTCAST CAP-GATE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
