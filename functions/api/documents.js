// D1 Phase 2 — /api/documents  (GET | PUT), Clerk-JWT-verified, D1-bound (env.DB).
// Same-origin under datumfi.com/api/* (Pages Function) => covered by CSP 'self', no CORS.
// GET  /api/documents?type=studio&key=active            -> { payload, revision, updated_at } | 404
// GET  /api/documents?type=blueprint&list=1             -> { documents: [{ doc_key, revision, updated_at }] }
// PUT  /api/documents?type=studio&key=active  body { payload, revision? } -> { revision, updated_at } | 409
// DELETE /api/documents?type=blueprint&key=<id>          -> { deleted: 0|1 }  (erase; no cross-device resurrect)
import { verifyClerk } from './_lib/auth.js';
import { dispatch } from './_lib/documents-core.js';

const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  // AUTH — the ONLY source of the user id is the verified token.
  let sub;
  try { sub = await verifyClerk(request); }
  catch (e) { return json({ error: 'unauthorized' }, 401); }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || '';
  const key = url.searchParams.get('key') || 'active';
  const list = url.searchParams.get('list') === '1';   // P5a — GET ?type=blueprint&list=1 -> ids+revisions only

  let payloadStr = null, ifRevision = null;
  if (request.method === 'PUT') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'invalid JSON body' }, 400); }
    // Full fidelity — persist the document EXACTLY as sent. Client shape: { payload: <doc>, revision?: N }.
    payloadStr = (body && body.payload !== undefined) ? JSON.stringify(body.payload) : null;
    ifRevision = (body && typeof body.revision === 'number') ? body.revision : null;
  }

  try {
    const r = await dispatch({ method: request.method, type, key, payloadStr, ifRevision, list, db: env.DB, sub });
    return json(r.body, r.status);
  } catch (e) {
    // SECURITY: never log payload_json / balances / holdings / names — only a generic error name.
    console.error('[api/documents]', (e && e.name) || 'error');
    return json({ error: 'server error' }, 500);
  }
}
