// THE ENGINE PROXY CORE — the ONLY place the compute engine's secret is held or sent.
//
// ⛔ WHY THIS FILE EXISTS AT ALL: A SECRET IN A PUBLIC PAGE IS NOT A SECRET.
// The first design put a shared token in studio.html's fetch headers. datumfi-web is a PUBLIC
// GitHub repository, so that value would have been greppable at scale by the bots that scan
// GitHub continuously — ADVERTISED obscurity, strictly worse than none, because it would have
// looked like a control. The token lives server-side, in env, and NEVER reaches a browser.
//
// ⭐ AND THE SECOND REASON, WHICH IS THE ARCHITECTURAL ONE: this moves the front door from
// api.datumfi.com (and a workers.dev hostname NO WAF RULE CAN EVER COVER — it is Cloudflare's
// zone, not ours) onto datumfi.com, A ZONE WE OWN. Only there can an edge rate-limit rule
// actually see the traffic.
// ⛔⛔ WHICH MEANS THIS FILE RELOCATES THE EXPOSURE, IT DOES NOT CLOSE IT. This endpoint will
// cheerfully add the secret for ANYONE who calls it, bots included. THE PROXY EARNS ITS
// ARCHITECTURE ONLY IN COMBINATION WITH THE RATE-LIMIT RULE ON datumfi.com/api/*. Do not read
// "the old doors 403" as "the new door is governed." They are two different claims.
//
// 🔑 THE UPGRADE PATH IS ALREADY POURED: functions/api/_lib/auth.js ALREADY verifies Clerk
// session JWTs for the persistence API. When the MC moves behind Design mode, real auth here is
// CHANGING WHICH CHECK THIS FILE RUNS — not building anything new.
const ENGINE_ORIGIN = 'https://api.datumfi.com';

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export async function proxyToEngine(request, env, upstreamPath) {
  const token = env.DATUM_ENGINE_TOKEN;

  // ⛔ FAIL LOUD, NEVER FORWARD BARE. A missing secret must announce itself HERE, as a 503 this
  // file authored, rather than travelling upstream and returning a 403 from the Worker — which
  // would be a correct-looking rejection pointing at the wrong layer and would cost an hour.
  // ⚠️ THIS IS ALSO WHY THE SECRETS ARE SET BEFORE THIS FILE DEPLOYS, NOT AFTER: with the order
  // reversed, step 1 would take the site down on its own 503.
  if (!token) return json({ error: 'engine token not configured' }, 503);

  const init = { method: request.method, headers: { 'X-Datum-Engine-Token': token } };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Buffered, not streamed: these payloads are a few KB and a buffered body keeps
    // Content-Length honest across the hop. Streaming would buy nothing measurable here.
    init.body = await request.text();
    init.headers['Content-Type'] = request.headers.get('Content-Type') || 'application/json';
  }

  let upstream;
  try {
    upstream = await fetch(ENGINE_ORIGIN + upstreamPath, init);
  } catch (e) {
    // The engine being unreachable is OUR 502, distinct from any status the engine itself chose.
    console.error('[engine-proxy] upstream unreachable', (e && e.name) || 'error');
    return json({ error: 'engine unreachable' }, 502);
  }

  // ⛔ STATUS IS PASSED THROUGH UNCHANGED. studio.html's _reportComputeFailure keys off r.status,
  // so flattening an upstream 500 into a 200-with-null here would re-create THE EXACT DEFECT
  // f2c321e was written to kill: a failing compute that the page reports as no failure at all.
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
