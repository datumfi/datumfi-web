// D1 Phase 2 — /api/health  (liveness, NO auth). Returns 200 without touching D1 or Clerk.
export async function onRequest() {
  return new Response(JSON.stringify({ status: 'ok', service: 'datumfi-d1', ts: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
