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

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  let addr = '';
  try { addr = (new URL(request.url).searchParams.get('address') || '').trim(); } catch (e) {}
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
      high: d && d.priceRangeHigh != null ? d.priceRangeHigh : null
    };
    if (kv && out.value != null) { try { await kv.put(ck, JSON.stringify(out), { expirationTtl: CACHE_TTL }); } catch (e) {} }
    return json(out);
  } catch (e) {
    return json({ status: 'error', error: 'fetch failed' });
  }
}

export default { fetch: handle };
