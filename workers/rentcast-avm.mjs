// Cloudflare Worker — RentCast property AVM behind a HARD 50/mo cap.
//
// KEY-SAFETY LAW (Valuation API §1): the RentCast key is an ENCRYPTED WORKER SECRET
// (env.RENTCAST_API_KEY) — it is NEVER in the browser, in studio.html, or in git.
// Set it with:  wrangler secret put RENTCAST_API_KEY   (see workers/wrangler.toml).
//
// ANTI-OVERAGE: RentCast bills per request on every plan, incl. free. We NEVER issue
// call #51 on Datum's key. The monthly counter + cached estimates live in KV
// (env.RENTCAST_KV). BYO-key is the only paid path past the cap (handled client-side).
//
// The cap decision is a PURE function (decideCall) so the red-first cap-gate can prove
// call #51 is blocked WITHOUT any network — the acceptance criterion before the
// "Use value estimate (API)" toggle may turn on.

export const MONTHLY_CAP = 50;
const CACHE_TTL = 60 * 60 * 24 * 60;    // 60d — homes refresh 30-90d (§6b.5)
const COUNTER_TTL = 60 * 60 * 24 * 35;  // ~35d — auto-expire the month bucket

export function monthKey(now) {
  const d = new Date(now == null ? Date.now() : now);
  return 'calls:' + d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1);
}
export function cacheKey(addr) {
  return 'avm:' + String(addr || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// PURE cap decision — no I/O. 'cache' = serve cached (no call); 'capped' = at/over the
// ceiling (NO call, never #51); 'call' = permitted (a slot must be reserved first).
export function decideCall(count, cached) {
  if (cached) return { action: 'cache' };
  if ((count | 0) >= MONTHLY_CAP) return { action: 'capped' };
  return { action: 'call' };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: CORS });

// Trim comparable sales to ONLY the fields the R147 comps view renders — NEVER forward the raw
// RentCast comparables[] wholesale (PII/scope, #259 fence). Rides the SAME /avm/value call: $0,
// no extra call, no cap increment.
export function trimComps(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 8).map(function (c) {
    c = c || {};
    return {
      address:  c.formattedAddress || c.address || null,
      price:    c.price != null ? c.price : null,
      beds:     c.bedrooms != null ? c.bedrooms : null,
      baths:    c.bathrooms != null ? c.bathrooms : null,
      sqft:     c.squareFootage != null ? c.squareFootage : null,
      distance: c.distance != null ? c.distance : null,
      saleDate: c.removedDate || c.lastSeenDate || c.listedDate || null
    };
  });
}

// PURE parse of the Census onelineaddress payload (no I/O) so the gate can prove verified/not-found
// mapping without any network call.
export function parseCensus(d) {
  const m = d && d.result && Array.isArray(d.result.addressMatches) ? d.result.addressMatches : [];
  if (!m.length) return { status: 'not-found' };
  return { status: 'verified', canonical: m[0].matchedAddress || null };
}

// Free US Census 'onelineaddress' confirm-exists proxy. Server-side (the browser is CORS-blocked by
// Census). No key, US-only, $0 — reads/writes NO KV, so it can NEVER touch the RentCast cap.
async function handleVerify(addr) {
  if (!addr) return json({ status: 'error', error: 'address required' }, 400);
  const u = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=' + encodeURIComponent(addr) + '&benchmark=Public_AR_Current&format=json';
  // Census is intermittently flaky (sporadic non-JSON/5xx on the Worker egress IP) — retry ONCE so a
  // transient hiccup doesn't reject a real address. Still fail-CLOSED to the client on a hard error.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) continue;
      return json(parseCensus(await r.json()));
    } catch (e) { /* transient — retry once */ }
  }
  return json({ status: 'error', error: 'verify unavailable' });
}

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  let url; try { url = new URL(request.url); } catch (e) { return json({ status: 'error', error: 'bad url' }, 400); }
  const addr = (url.searchParams.get('address') || '').trim();
  // /verify — free Census confirm-exists proxy; NEVER touches the RentCast cap (no KV, no RentCast call).
  if (url.pathname === '/verify' || url.pathname.endsWith('/verify')) return handleVerify(addr);
  if (!addr) return json({ status: 'error', error: 'address required' }, 400);

  const kv = env && env.RENTCAST_KV;   // binding MUST match wrangler.toml + the Captain's KV (RENTCAST_KV)
  const ck = cacheKey(addr);
  const mk = monthKey();

  let cached = null, count = 0;
  if (kv) {
    try { cached = await kv.get(ck, 'json'); } catch (e) {}
    try { count = parseInt((await kv.get(mk)) || '0', 10) || 0; } catch (e) {}
  }

  const decision = decideCall(count, cached);
  // De-dupe: a cached estimate returns with ZERO new provider calls.
  if (decision.action === 'cache') return json(Object.assign({ status: 'cached' }, cached));
  // HARD CAP: at/over 50 we return gracefully and NEVER touch the network (no call #51).
  if (decision.action === 'capped') {
    return json({ status: 'capped', message: 'Monthly estimate limit reached — enter your own value, or add your own API key.' });
  }

  // Permitted. Reserve the slot BEFORE the network call so a race can never exceed the cap.
  if (kv) { try { await kv.put(mk, String(count + 1), { expirationTtl: COUNTER_TTL }); } catch (e) {} }
  if (!env || !env.RENTCAST_API_KEY) return json({ status: 'no-key', message: 'Valuation not configured yet.' });

  try {
    const rc = await fetch('https://api.rentcast.io/v1/avm/value?address=' + encodeURIComponent(addr), {
      headers: { 'X-Api-Key': env.RENTCAST_API_KEY, 'Accept': 'application/json' }
    });
    if (!rc.ok) return json({ status: 'error', error: 'provider ' + rc.status });
    const d = await rc.json();
    // Return a RANGE, never a single false-precise number (§6b.8). User's own number always wins.
    const out = {
      status: 'ok', source: 'RentCast', updated: new Date().toISOString(),
      value: d && d.price != null ? d.price : null,
      low: d && d.priceRangeLow != null ? d.priceRangeLow : null,
      high: d && d.priceRangeHigh != null ? d.priceRangeHigh : null,
      comps: trimComps(d && d.comparables)
    };
    if (kv && out.value != null) { try { await kv.put(ck, JSON.stringify(out), { expirationTtl: CACHE_TTL }); } catch (e) {} }
    return json(out);
  } catch (e) {
    return json({ status: 'error', error: 'fetch failed' });
  }
}

export default { fetch: handle };
