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
import { handle, decideCall, MONTHLY_CAP, monthKey, trimComps, parseCensus, pickCoords, parseFloodZone, parseSeismic } from './rentcast-avm.mjs';

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
/* ⚠️ THIS FIXTURE IS A MOCK WE WROTE. It is NOT evidence about the provider's real schema and must
   never be cited as such — a previous session nearly did. The field NAMES it uses are grounded in
   developers.rentcast.io (Value Estimate), read 2026-08-07; the VALUES are invented.
   subjectProperty deliberately carries the property/sale detail the real one does, so the §17.5
   scope fence below is tested against a payload shaped like the thing it has to refuse. */
const okProvider = async () => ({ ok: true, json: async () => ({ price: 500000, priceRangeLow: 480000, priceRangeHigh: 520000,
  subjectProperty: { latitude: 30.2672, longitude: -97.7431, bedrooms: 3, bathrooms: 2, squareFootage: 1800,
                     yearBuilt: 1998, lotSize: 7000, lastSalePrice: 410000, lastSaleDate: '2019-06-01', ownerName: 'PII' },
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

  /* ---- §17.5 pickCoords (PURE) — two numbers out, and only ever two ----
     REFUSING IS THE PRIMARY BEHAVIOUR HERE, not the edge case. §17.5's guard (row 218) says a failed
     lookup renders BLANK and never guesses a zone, so every shape that is not a trustworthy pair
     must come back null: a WRONG flood zone is far worse than an absent one, and a string "30.2"
     or an off-globe number would sail into FEMA and come back with a confident answer about
     somewhere else. Each refusal is paired with the accept case, so "it returns null" cannot pass
     on a function that returns null for everything. */
  const _pc = pickCoords({ latitude: 30.2672, longitude: -97.7431, ownerName: 'PII', lastSalePrice: 410000, bedrooms: 3 });
  ok(_pc && _pc.lat === 30.2672 && _pc.lon === -97.7431, 'pickCoords keeps the coordinate pair');
  ok(pick(_pc && Object.keys(_pc).length === 2 && !('ownerName' in _pc) && !('lastSalePrice' in _pc) && !('bedrooms' in _pc),
          !!(_pc && 'ownerName' in _pc)),
     'pickCoords DROPS every other subjectProperty field — sale price, owner, beds (#259 scope fence) [BITE]');
  ok(pickCoords(null) === null && pickCoords(undefined) === null && pickCoords('x') === null, 'pickCoords(junk) -> null (safe)');
  ok(pickCoords({ latitude: 30.2672 }) === null && pickCoords({ longitude: -97.7431 }) === null, 'pickCoords -> null on a HALF pair (never half a location)');
  ok(pickCoords({ latitude: '30.2672', longitude: '-97.7431' }) === null, 'pickCoords -> null on numeric STRINGS (a string is not a measurement)');
  ok(pickCoords({ latitude: NaN, longitude: 0 }) === null && pickCoords({ latitude: 0, longitude: Infinity }) === null, 'pickCoords -> null on NaN / Infinity');
  ok(pickCoords({ latitude: 91, longitude: 0 }) === null && pickCoords({ latitude: 0, longitude: -181 }) === null, 'pickCoords -> null off the globe (|lat|>90, |lon|>180)');
  ok(pickCoords({ latitude: 0, longitude: 0 }) !== null, 'pickCoords ACCEPTS 0,0 — a real coordinate, and null-vs-zero is exactly the §17 blank-is-not-zero distinction');

  /* ---- §17.5 parseFloodZone (PURE) — the three outcomes are THREE facts, not two ----
     Fixtures are the REAL shapes returned by FEMA on 2026-08-07 (probed live; free/keyless).
     'none' vs 'error' is the load-bearing distinction: FEMA answering "no mapped zone here" and
     FEMA being unreachable both render blank under row 218, but they are OPPOSITE facts, and a
     parser that collapsed them would leave a debugger unable to tell unmapped from broken. */
  const _fVE = parseFloodZone({ features: [{ attributes: { FLD_ZONE: 'VE', ZONE_SUBTY: 'COASTAL FLOODPLAIN' } }] });
  ok(_fVE.status === 'ok' && _fVE.zone === 'VE' && _fVE.subtype === 'COASTAL FLOODPLAIN', 'parseFloodZone reads a REAL coastal response (VE) — the letter row 215 already explains');
  const _fX = parseFloodZone({ features: [{ attributes: { FLD_ZONE: 'X', ZONE_SUBTY: 'AREA OF MINIMAL FLOOD HAZARD' } }] });
  ok(_fX.status === 'ok' && _fX.zone === 'X', 'parseFloodZone reads a REAL inland response (X)');
  ok(parseFloodZone({ features: [] }).status === 'none', 'parseFloodZone: empty features -> "none" (FEMA ANSWERED — no mapped zone)');
  ok(pick(parseFloodZone({}).status === 'error' && parseFloodZone(null).status === 'error',
          parseFloodZone(null).status === 'none'),
     'parseFloodZone: no features array -> "error", NEVER "none" — unreachable is not the same fact as unmapped [BITE]');
  ok(parseFloodZone({ features: [{ attributes: { FLD_ZONE: '   ' } }] }).status === 'none', 'parseFloodZone: blank zone string -> "none" (never a whitespace zone)');

  /* ---- §17.5 parseSeismic (PURE) — ss is required, sdc is optional ON PURPOSE ----
     Measured 2026-08-07: sdc came back "D" for siteClass C and NULL for siteClass D and D-default —
     null under exactly the default a residential lookup must assume. So a parser that required sdc
     would report 'error' on a perfectly good reading. ss was identical (1.888) across all three. */
  const _sOK = parseSeismic({ response: { data: { ss: 1.888, s1: 0.669, sds: 1.51, sdc: 'D' } } });
  ok(_sOK.status === 'ok' && _sOK.ss === 1.888 && _sOK.sdc === 'D', 'parseSeismic reads a REAL response (ss + sdc)');
  ok(_sOK.riskCategory === 'II' && _sOK.siteClass === 'D-default', 'parseSeismic LABELS the assumptions it was computed under (never a bare number)');
  const _sNull = parseSeismic({ response: { data: { ss: 1.888, sdc: null } } });
  ok(_sNull.status === 'ok' && _sNull.ss === 1.888 && _sNull.sdc === null, 'parseSeismic: a NULL sdc is still a good reading — ss carries it (measured: sdc is null at siteClass D-default)');
  ok(pick(parseSeismic({ response: { data: {} } }).status === 'error' && parseSeismic(null).status === 'error',
          parseSeismic(null).status === 'ok'),
     'parseSeismic: no ss -> "error" (ss is the one value with no assumption in it) [BITE]');

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
  /* §17.5 END-TO-END through the real handler: the coordinates ride the SAME call that was already
     made and paid for. fetchCalls is asserted at 1 two legs above, and it is unchanged by this —
     that IS the "$0, no extra call, no cap increment" claim, executed rather than asserted in prose. */
  ok(body.coords && body.coords.lat === 30.2672 && body.coords.lon === -97.7431, '§17.5 AVM out carries coords off the SAME /avm/value call (no extra call, no cap increment)');
  ok(pick(!('subjectProperty' in body) && !('ownerName' in (body.coords || {})) && Object.keys(body.coords || {}).length === 2,
          ('subjectProperty' in body)),
     '§17.5 the raw subjectProperty NEVER leaves the worker — two numbers, nothing else [BITE]');

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

  /* ---- §17.5 /flood + /quake routes: proxied, and they MUST NOT touch the RentCast cap ----
     THE CAP LEG IS THE ONE THAT MATTERS. These providers are free and keyless, so the entire risk of
     adding them is that a lookup quietly spends a RENTCAST call — 50/month with a card behind it.
     Both routes are asserted to return BEFORE any KV read, on a counter parked at a recognisable 7,
     and the assertion is a [BITE] so an inverted run cannot pass by doing nothing. */
  globalThis.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ features: [{ attributes: { FLD_ZONE: 'AE', ZONE_SUBTY: 'FLOODWAY' } }] }) }; };
  fetchCalls = 0;
  kv = mockKV({ [mk]: '7' });
  r = await handle({ method: 'GET', url: 'https://w.example/flood?lat=27.9775&lon=-82.8290' }, { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'ok' && body.zone === 'AE' && body.source === 'FEMA NFHL', '/flood -> zone + source tag (looked-up, row 218)');
  ok(pick((kv._m.get(mk)) === '7', (kv._m.get(mk)) !== '7'), '/flood does NOT touch the RentCast cap counter [BITE]');

  globalThis.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ response: { data: { ss: 0.431, s1: 0.13, sdc: null } } }) }; };
  fetchCalls = 0;
  kv = mockKV({ [mk]: '7' });
  r = await handle({ method: 'GET', url: 'https://w.example/quake?lat=30.2672&lon=-97.7431' }, { RENTCAST_KV: kv, RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'ok' && body.ss === 0.431 && body.source === 'USGS ASCE 7-16', '/quake -> ss + source tag');
  ok(pick((kv._m.get(mk)) === '7', (kv._m.get(mk)) !== '7'), '/quake does NOT touch the RentCast cap counter [BITE]');

  /* Both routes refuse a location they cannot trust, through the SAME pickCoords gate as the AVM
     capture — one definition of a usable coordinate, never two (L48). A refusal must also cost
     NOTHING: no provider call goes out, because a half-known point sent to FEMA comes back with a
     confident answer about somewhere else. */
  fetchCalls = 0;
  r = await handle({ method: 'GET', url: 'https://w.example/flood?lat=27.9775' }, { RENTCAST_KV: mockKV({}), RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'error' && fetchCalls === 0, '/flood on a HALF pair -> error and NO provider call (never half a location)');
  fetchCalls = 0;
  r = await handle({ method: 'GET', url: 'https://w.example/quake?lat=91&lon=0' }, { RENTCAST_KV: mockKV({}), RENTCAST_API_KEY: 'dummy' });
  body = await r.json();
  ok(body.status === 'error' && fetchCalls === 0, '/quake off the globe -> error and NO provider call');

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
