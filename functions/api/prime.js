// #384 · §18.C Phase 1 — /api/prime  (GET only), GLOBAL market-rate read. PUBLIC reference data.
//
// DELIBERATELY NOT AUTHED and NOT user-scoped: a market rate (Prime) is identical for every user, like
// /api/tickers and unlike the user-scoped /api/documents. No verifyClerk, no clerk_user_id — reads the
// GLOBAL market_reference table via prime-core.js (disjoint from documents-core.js). Same-origin /api/*.
// GET /api/prime  ->  { prime, asOf, source, rates: { Prime:{value,asOf,source}, SOFR:{...} } }
// `rates` is keyed by index LABEL (Prime = FRED DPRIME, SOFR = FRED SOFR) so the HELOC modal can colour
// whichever index a line names. The top-level prime/asOf/source stay = DPRIME for backward compatibility.
// A series absent from D1 (e.g. SOFR before its feed lands) simply doesn't appear in `rates` — the front
// end shows nothing for it rather than a fabricated rate (sourced-or-blank, L47).
import { getSeries } from './_lib/prime-core.js';

// index LABEL -> FRED series_id. Add more indices here as ROWS (no fork). MORTGAGE30US/15US = Freddie Mac
// PMMS fixed averages for The Moat §17 (keyed by their own series_id — the front end reads by term).
const SERIES_BY_LABEL = { Prime: 'DPRIME', SOFR: 'SOFR', MORTGAGE30US: 'MORTGAGE30US', MORTGAGE15US: 'MORTGAGE15US' };

const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200,
  // 1h (was 24h) — a market rate updates at most weekly, but a short cache keeps shape/value changes
  // (e.g. adding SOFR) from lingering stale at the edge/browser after a deploy.
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
});

export async function onRequestGet(context) {
  const { env } = context;
  const empty = { prime: null, asOf: null, source: null, rates: {} };
  try {
    const rows = await getSeries(env.DB, Object.values(SERIES_BY_LABEL));
    const byId = {};
    (rows || []).forEach((r) => { byId[r.series_id] = r; });
    const rates = {};
    for (const [label, sid] of Object.entries(SERIES_BY_LABEL)) {
      const r = byId[sid];
      if (r) rates[label] = { value: r.value, asOf: r.effective_date, source: r.source };
    }
    const dp = byId['DPRIME'];
    return json({
      prime: dp ? dp.value : null,
      asOf: dp ? dp.effective_date : null,
      source: dp ? dp.source : null,
      rates
    });
  } catch (e) {
    console.error('[api/prime]', (e && e.name) || 'error');
    return json(empty, 500);
  }
}
