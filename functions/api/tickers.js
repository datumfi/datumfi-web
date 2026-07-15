// D1 Phase 6 — /api/tickers  (GET only), GLOBAL ticker reference read. PUBLIC reference data.
//
// DELIBERATELY NOT AUTHED and NOT user-scoped: ticker fundamentals are identical for every user and are
// ALREADY public (shipped today in the served ticker-bundle.js). So there is NO verifyClerk and NO
// clerk_user_id here — this endpoint reads the GLOBAL ticker_reference table via ticker-core.js, a code
// path kept disjoint from the user-scoped documents-core.js. Same-origin under datumfi.com/api/*.
// GET /api/tickers?symbols=AAPL,MSFT  -> { tickers: [{ symbol, payload_json, updated_at }] }  (max 200)
import { getTickers } from './_lib/ticker-core.js';

const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
});

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const symbols = (url.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!symbols.length) return json({ tickers: [] });
  try {
    const rows = await getTickers(env.DB, symbols);
    return json({ tickers: rows });
  } catch (e) {
    console.error('[api/tickers]', (e && e.name) || 'error');
    return json({ error: 'server error' }, 500);
  }
}
