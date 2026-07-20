// prime-refresh.mjs — standalone Cloudflare Worker (weekly Cron). SEPARATE deploy from the Pages site
// (`wrangler deploy`, NOT the datumfi.com git push). Fetches the FRED DPRIME (Bank Prime Loan Rate) and
// upserts it into the GLOBAL market_reference D1 table. Thin + idempotent. REUSE — upsert/parse live in the
// shared prime-core.js (also used by the Pages read endpoint + the gate); no fork (L48).
//
// The FRED API key is a runtime SECRET (env.FRED_API_KEY via `wrangler secret put FRED_API_KEY`), NEVER
// hardcoded, never committed. If the secret is missing or the fetch/parse fails, the never-overwrite guard
// leaves the last good row in place (L47 — never wipe or fabricate on a bad fetch).
import { upsertSeries, parseFredLatest } from '../../functions/api/_lib/prime-core.js';

const SERIES = 'DPRIME';   // FRED: Bank Prime Loan Rate. Add SOFR / MORTGAGE30US as more ROWS later (no fork).
const FRED_URL = (key) =>
  'https://api.stlouisfed.org/fred/series/observations?series_id=' + SERIES +
  '&api_key=' + encodeURIComponent(key) + '&file_type=json&sort_order=desc&limit=1';

async function refresh(env) {
  const key = env && env.FRED_API_KEY;
  if (!key) return { ok: false, reason: 'FRED_API_KEY secret missing — refused (kept last good row)' };
  let json = null;
  try {
    const res = await fetch(FRED_URL(key), { cf: { cacheTtl: 0 } });
    if (!res || !res.ok) return { ok: false, status: res && res.status, reason: 'fetch not ok — refused' };
    json = await res.json();
  } catch (e) { return { ok: false, reason: 'fetch/parse threw — refused (' + ((e && e.name) || 'error') + ')' }; }
  const latest = parseFredLatest(json);
  // Never overwrite on a bad / thin / missing observation — keep the last good row (L47).
  if (!latest) return { ok: false, reason: 'no usable observation — refused (kept last good row)' };
  const r = await upsertSeries(env.DB, [{ series_id: SERIES, value: latest.value, effective_date: latest.date, source: 'FRED:' + SERIES }]);
  return { ok: true, series: SERIES, value: latest.value, asOf: latest.date, upserted: r.upserted };
}

export default {
  // Weekly Cron (see wrangler.toml [triggers] crons) — Prime moves only a few times a year, so weekly is
  // generous; idempotent, so a missed or re-run tick is safe.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env).then((r) => console.log('[prime-refresh]', JSON.stringify(r))));
  },
  // Manual one-shot verify (GET) after deploy — the SAME idempotent refresh, so re-hitting it is safe.
  async fetch(request, env) {
    const r = await refresh(env);
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
};
