// #384 · §18.C Phase 1 — /api/prime  (GET only), GLOBAL market-rate read. PUBLIC reference data.
//
// DELIBERATELY NOT AUTHED and NOT user-scoped: a market rate (Prime) is identical for every user, like
// /api/tickers and unlike the user-scoped /api/documents. No verifyClerk, no clerk_user_id — reads the
// GLOBAL market_reference table via prime-core.js (disjoint from documents-core.js). Same-origin /api/*.
// GET /api/prime  ->  { prime: <number|null>, asOf: <YYYY-MM-DD|null>, source: <string|null> }
// prime = the latest FRED DPRIME (Bank Prime Loan Rate). null when the feed hasn't populated yet
// (sourced-or-blank — the front end shows nothing rather than a fabricated rate).
import { getSeries } from './_lib/prime-core.js';

const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' }
});

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await getSeries(env.DB, ['DPRIME']);
    const row = rows && rows[0];
    if (!row) return json({ prime: null, asOf: null, source: null });
    return json({ prime: row.value, asOf: row.effective_date, source: row.source });
  } catch (e) {
    console.error('[api/prime]', (e && e.name) || 'error');
    return json({ prime: null, asOf: null, source: null }, 500);
  }
}
