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

/* §17.5 PREREQ — CAPTURE THE SUBJECT PROPERTY'S COORDINATES, AND NOTHING ELSE.
   FEMA NFHL and USGS Seismic Design both key off LAT/LONG, not an address string. RentCast returns
   them on the response we ALREADY pay for, so this rides the SAME /avm/value call: $0, no extra
   call, no cap increment — the trimComps precedent exactly. NO GEOCODE PROVIDER IS NEEDED.
   ⛔ SOURCED, NOT INHERITED (L51). The claim "RentCast returns subjectProperty.latitude/longitude"
   arrived as a prior session's assertion with NO evidence held anywhere in this repo or the
   workbook. Confirmed 2026-08-07 against the provider's PUBLISHED SCHEMA (developers.rentcast.io,
   Value Estimate) — documentation only, never the API: probing it live costs real money and
   playground calls count against the same 50/month. Cross-checked: the four field names the block
   below already reads (price / priceRangeLow / priceRangeHigh / comparables) match that schema
   exactly, and they are known to work in production.
   NARROW ON PURPOSE. subjectProperty ALSO carries bedrooms, bathrooms, square footage, lot size,
   year built and LAST SALE detail. Forwarding it wholesale would leak precisely what the #259 fence
   stops us doing with comparables[]. Two numbers leave this worker; nothing else does.
   RETURNS null WHENEVER THE PAIR IS NOT FULLY TRUSTWORTHY — missing, non-numeric, or off the globe.
   A null is a FINISHED state, not a failure: §17.5's guard (bank row 218) renders blank rather than
   guessing a flood zone, and a wrong zone is far worse than an absent one. */
export function pickCoords(sp) {
  if (!sp || typeof sp !== 'object') return null;
  const lat = sp.latitude, lon = sp.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat: lat, lon: lon };
}

// PURE parse of the Census onelineaddress payload (no I/O) so the gate can prove verified/not-found
// mapping without any network call.
/* §17.5 FIX (Captain's smoke, 2026-08-07) — CENSUS IS THE GEOCODER, NOT RENTCAST.
   Coordinates were being taken off the /avm/value response. That response is CACHED IN KV FOR 60
   DAYS, and every cached entry was written BEFORE the capture shipped — so any address valued in the
   last two months returned a payload with no coordinates and §17.5 stayed silent forever. "Refresh
   estimate" does not help: `force` only skips the BROWSER's de-dupe; the Worker still serves KV.
   Busting that cache would have meant spending real RentCast calls to fetch a free number.
   Census already returns the coordinates, on a call we ALREADY make on every single estimate:
   `addressMatches[].coordinates` = {x: LONGITUDE, y: LATITUDE}. Free, keyless, US-only, and
   handleVerify touches NO KV — so it is never cached and never counts against the 50/mo cap.
   ⚠️ x IS LONGITUDE AND y IS LATITUDE. Transposing them is silent and catastrophic: the point still
   lands somewhere, FEMA still answers, and the zone is confidently about the wrong hemisphere.
   Validated through the SAME pickCoords gate as everything else (L48, one definition of a usable
   location). RentCast's coords remain a fallback where they exist — this is additive, not a swap. */
export function parseCensus(d) {
  const m = d && d.result && Array.isArray(d.result.addressMatches) ? d.result.addressMatches : [];
  if (!m.length) return { status: 'not-found' };
  const c = m[0].coordinates;
  const coords = c ? pickCoords({ latitude: c.y, longitude: c.x }) : null;
  return { status: 'verified', canonical: m[0].matchedAddress || null, coords: coords };
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

/* ⛔ CLOUDFLARE WORKERS SEND NO User-Agent, AND FEMA REJECTS THAT WITH A 403.
   Measured 2026-08-07 against the live service, after the first deploy came back "provider 403":
     no User-Agent -> 403 · curl's default -> 200 · "node" -> 200 · "Cloudflare-Workers" -> 200
   ANY non-empty UA is accepted; the ABSENCE is the whole trigger.
   🔑 WHY EVERY LOCAL CHECK PASSED. curl sends a User-Agent. node's fetch sends a User-Agent. The
   Worker runtime does not. So the end-to-end run against the REAL providers before shipping was
   right about the URLs and blind to this, because it differed from production in exactly the way
   that mattered. Same family as §13.72: a real measurement taken in the wrong ENVIRONMENT.
   🔑 A LIVE CALL IS NOT A PRODUCTION CALL UNLESS IT LEAVES FROM WHERE PRODUCTION LEAVES.
   USGS and Census both answer fine WITHOUT a UA (200 either way) — which is exactly why /verify has
   proxied Census for weeks and nobody found this. FEMA is the odd one out.
   Sent on the two §17.5 calls only: RentCast is key-authenticated and Census is measured fine, so
   they are left alone (minimal diff on working paths, D5). The constant is shared so the next
   provider added inherits it instead of rediscovering this. */
const PROVIDER_UA = 'DatumFI/1.0 (+https://datumfi.com)';

/* ── §17.5 · FLOOD (FEMA NFHL) + SEISMIC (USGS) — BOTH PROXIED, NEITHER TOUCHES THE CAP ──────────
   Routed through this Worker rather than called from the browser, on the Valuation API sheet §5
   ruling (rows 119-124) and L48: studio.html calls OUR endpoint, the Worker calls the provider and
   returns only the shape we need. FEMA and USGS are free/keyless, so no secret is involved and
   nothing here reads or writes KV — these can NEVER move the RentCast counter, exactly as
   handleVerify cannot. The reason to proxy anyway is not keys: it keeps two outside agencies out of
   the page's trust boundary, takes no bet on either keeping CORS open to browsers, and leaves ONE
   pattern for an outside read instead of two.
   ENDPOINTS PINNED AGAINST REAL RESPONSES 2026-08-07, not guessed. A wrong URL fails silently and
   renders blank — which is indistinguishable from row 218's honest guard, the worst failure shape
   there is. So both were probed live (free/keyless, unlike RentCast) and both are recorded here:
     FEMA  layer 28 = Flood Hazard Zones; point-intersect returns FLD_ZONE + ZONE_SUBTY.
           Clearwater Beach FL -> VE / COASTAL FLOODPLAIN · Austin TX -> X / AREA OF MINIMAL FLOOD
           HAZARD · unmapped -> features: [].  Those letters are exactly what row 215's hover
           already explains ("AE/VE = high-risk, X = lower"), so the flood half needs no new copy.
     USGS  ⚠️ /ws/designmaps HAS MOVED — it 301s to /ws/building-codes. The bank names the old
           service (row 216, authored 2026-07-25). The old path still answers THROUGH THE REDIRECT;
           we use the canonical new URL rather than depend on a redirect staying alive. */
export function parseFloodZone(d) {
  const f = d && Array.isArray(d.features) ? d.features : null;
  if (!f) return { status: 'error' };
  /* AN EMPTY FEATURE LIST IS AN ANSWER, NOT A FAILURE — FEMA replied and there is no mapped zone at
     that point. Kept DISTINCT from 'error' (we could not reach them) even though row 218 renders
     both blank: they are opposite facts, and collapsing them would leave a future debugger unable
     to tell "unmapped" from "broken". Same distinction §17 draws between a blank limit and zero. */
  if (!f.length) return { status: 'none' };
  const a = (f[0] && f[0].attributes) || {};
  const zone = typeof a.FLD_ZONE === 'string' && a.FLD_ZONE.trim() ? a.FLD_ZONE.trim() : null;
  if (!zone) return { status: 'none' };
  const sub = typeof a.ZONE_SUBTY === 'string' && a.ZONE_SUBTY.trim() ? a.ZONE_SUBTY.trim() : null;
  return { status: 'ok', zone: zone, subtype: sub };
}

/* ⛔ WHY THIS RETURNS `ss` AND TREATS `sdc` AS OPTIONAL — MEASURED, NOT ASSUMED.
   `ss` (mapped short-period spectral acceleration) is the ONLY value here that carries no assumption
   of ours: probed at one location across siteClass C / D / D-default it was IDENTICAL (1.888) every
   time. Site class moves the DERIVED numbers, never the mapped one.
   `sdc` (Seismic Design Category, the legible A-F letter) looked like the seismic twin of FEMA's
   zone letter — and it is NOT dependable: it came back "D" for siteClass C and **null** for both
   siteClass D and D-default, i.e. null under exactly the default a residential lookup must assume
   when the soil is unknown. So it is carried when present and never required.
   riskCategory II is a FACT about what a house is under ASCE 7, not a judgement we are making. */
export function parseSeismic(d) {
  const data = d && d.response && d.response.data;
  if (!data || typeof data !== 'object') return { status: 'error' };
  const ss = typeof data.ss === 'number' && isFinite(data.ss) ? data.ss : null;
  if (ss === null) return { status: 'error' };
  const sdc = typeof data.sdc === 'string' && data.sdc.trim() ? data.sdc.trim() : null;
  return { status: 'ok', ss: ss, sdc: sdc, riskCategory: 'II', siteClass: 'D-default' };
}

// Reads lat/lon off the querystring under the SAME refusal rules as pickCoords — one gate for what
// counts as a usable location, never two (L48).
function coordsFromQuery(url) {
  return pickCoords({ latitude: parseFloat(url.searchParams.get('lat')), longitude: parseFloat(url.searchParams.get('lon')) });
}

async function handleFlood(c) {
  if (!c) return json({ status: 'error', error: 'lat/lon required' }, 400);
  const u = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query'
          + '?geometry=' + encodeURIComponent(c.lon + ',' + c.lat)
          + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects'
          + '&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json';
  try {
    const r = await fetch(u, { headers: { 'Accept': 'application/json', 'User-Agent': PROVIDER_UA } });
    if (!r.ok) return json({ status: 'error', error: 'provider ' + r.status });
    const out = parseFloodZone(await r.json());
    return json(Object.assign({ source: 'FEMA NFHL', updated: new Date().toISOString() }, out));
  } catch (e) {
    return json({ status: 'error', error: 'flood lookup unavailable' });
  }
}

/* §17.5c — THE FLOOD MAP IMAGE, PROXIED. Captain's ruling: option 1, through our own Worker, for the
   same reason FEMA's data goes through it — one door, no outside host inside the page's trust
   boundary, one pattern for an outside read instead of two.
   ⛔ THE ENDPOINT WAS CONFIRMED PUBLISHED BEFORE ANY OF THIS WAS DESIGNED, not assumed. The NFHL
   MapServer DECLARES `capabilities: Map` and lists PNG among supportedImageFormatTypes — that is the
   service publishing its own contract. Three identical calls returned identical bytes.
   A REDIRECT IS SOMEONE ELSE'S PROMISE; so is an endpoint nobody checked was public.
   Returns the PNG bytes with a long cache header: a flood map for a fixed point does not change
   between page loads, and this is the only image we serve from a third party.
   ⛔ NO KV, so it can never touch the RentCast counter — same fence as /flood and /quake.
   ⛔ SIZE IS FIXED HERE, NOT TAKEN FROM THE CALLER. An attacker-controlled size turns our Worker into
   a free image-rendering proxy for arbitrary requests against a government service. */
async function handleFloodMap(c) {
  if (!c) return json({ status: 'error', error: 'lat/lon required' }, 400);
  // ~0.012° box ≈ a few streets around the point — close enough to recognise the neighbourhood.
  const d = 0.006;
  const bbox = (c.lon - d) + ',' + (c.lat - d) + ',' + (c.lon + d) + ',' + (c.lat + d);
  const u = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export'
          + '?bbox=' + encodeURIComponent(bbox)
          + '&bboxSR=4326&size=560,300&format=png32&transparent=false&f=image';
  try {
    const r = await fetch(u, { headers: { 'Accept': 'image/png', 'User-Agent': PROVIDER_UA } });
    if (!r.ok) return json({ status: 'error', error: 'provider ' + r.status });
    const buf = await r.arrayBuffer();
    return new Response(buf, { status: 200, headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000'
    } });
  } catch (e) {
    return json({ status: 'error', error: 'flood map unavailable' });
  }
}

async function handleQuake(c) {
  if (!c) return json({ status: 'error', error: 'lat/lon required' }, 400);
  const u = 'https://earthquake.usgs.gov/ws/building-codes/asce7-16/calculate'
          + '?latitude=' + encodeURIComponent(c.lat) + '&longitude=' + encodeURIComponent(c.lon)
          + '&riskCategory=II&siteClass=D-default&title=datumfi';
  try {
    const r = await fetch(u, { headers: { 'Accept': 'application/json', 'User-Agent': PROVIDER_UA } });
    if (!r.ok) return json({ status: 'error', error: 'provider ' + r.status });
    const out = parseSeismic(await r.json());
    return json(Object.assign({ source: 'USGS ASCE 7-16', updated: new Date().toISOString() }, out));
  } catch (e) {
    return json({ status: 'error', error: 'seismic lookup unavailable' });
  }
}

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  let url; try { url = new URL(request.url); } catch (e) { return json({ status: 'error', error: 'bad url' }, 400); }
  const addr = (url.searchParams.get('address') || '').trim();
  // /verify — free Census confirm-exists proxy; NEVER touches the RentCast cap (no KV, no RentCast call).
  if (url.pathname === '/verify' || url.pathname.endsWith('/verify')) return handleVerify(addr);
  /* §17.5 — routed BEFORE the address guard below, because these key off lat/lon and never take an
     address at all. Both return before any KV read, so neither can move the RentCast counter. */
  if (url.pathname === '/flood' || url.pathname.endsWith('/flood')) return handleFlood(coordsFromQuery(url));
  if (url.pathname === '/quake' || url.pathname.endsWith('/quake')) return handleQuake(coordsFromQuery(url));
  if (url.pathname === '/floodmap' || url.pathname.endsWith('/floodmap')) return handleFloodMap(coordsFromQuery(url));
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
      comps: trimComps(d && d.comparables),
      /* §17.5 — additive and INERT until the studio side ships. An older studio.html simply ignores
         an unknown key, so this worker can deploy first and alone, which is the whole point: the two
         halves publish through DIFFERENT mechanisms (wrangler vs Pages) with different cache
         behaviour, and every cross-file split has bitten us. Worker first, studio second, and the
         in-between state renders §17.5 blank — degrading to shipped behaviour, never drawing wrong. */
      coords: pickCoords(d && d.subjectProperty)
    };
    if (kv && out.value != null) { try { await kv.put(ck, JSON.stringify(out), { expirationTtl: CACHE_TTL }); } catch (e) {} }
    return json(out);
  } catch (e) {
    return json({ status: 'error', error: 'fetch failed' });
  }
}

export default { fetch: handle };
