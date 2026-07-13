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
import { handle, decideCall, MONTHLY_CAP, monthKey } from './rentcast-avm.mjs';

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
const okProvider = async () => ({ ok: true, json: async () => ({ price: 500000, priceRangeLow: 480000, priceRangeHigh: 520000 }) });

(async () => {
  const mk = monthKey();

  // ---- pure decideCall ----
  ok(decideCall(MONTHLY_CAP, null).action === 'capped', 'decideCall(50, null) -> capped');
  ok(decideCall(MONTHLY_CAP - 1, null).action === 'call', 'decideCall(49, null) -> call');
  ok(decideCall(0, { value: 1 }).action === 'cache', 'decideCall(0, cached) -> cache (de-dupe)');
  ok(MONTHLY_CAP === 50, 'MONTHLY_CAP === 50');

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

  // ---- de-dupe: cached asset returns with zero calls ----
  installFetch(okProvider);
  kv = mockKV({ [mk]: '10', ['avm:789 elm st']: JSON.stringify({ value: 300000, low: 290000, high: 310000 }) });
  r = await handle(req('789 Elm St'), { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'cached' && fetchCalls === 0, 'cached asset -> "cached", zero fetch (de-dupe)');

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
