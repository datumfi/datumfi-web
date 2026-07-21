// prime-refresh.mjs — standalone Cloudflare Worker (weekly Cron). SEPARATE deploy from the Pages site
// (`wrangler deploy`, NOT the datumfi.com git push). Fetches the FRED DPRIME (Bank Prime Loan Rate) and
// upserts it into the GLOBAL market_reference D1 table. Thin + idempotent. REUSE — upsert/parse live in the
// shared prime-core.js (also used by the Pages read endpoint + the gate); no fork (L48).
//
// The FRED API key is a runtime SECRET (env.FRED_API_KEY via `wrangler secret put FRED_API_KEY`), NEVER
// hardcoded, never committed. If the secret is missing or the fetch/parse fails, the never-overwrite guard
// leaves the last good row in place (L47 — never wipe or fabricate on a bad fetch).
import { upsertSeries, parseFredLatest } from '../../functions/api/_lib/prime-core.js';

// FRED series to sync. DPRIME = Bank Prime Loan Rate, SOFR = Secured Overnight Financing Rate (the alternate
// HELOC/ARM index). Add MORTGAGE30US / FEDFUNDS / … as more ids here later — no fork (§20.1/§20.6).
const SERIES = ['DPRIME', 'SOFR'];
const FRED_URL = (sid, key) =>
  'https://api.stlouisfed.org/fred/series/observations?series_id=' + sid +
  '&api_key=' + encodeURIComponent(key) + '&file_type=json&sort_order=desc&limit=1';

async function refresh(env) {
  const key = env && env.FRED_API_KEY;
  if (!key) return { ok: false, reason: 'FRED_API_KEY secret missing — refused (kept last good rows)' };
  const rows = [], results = {};
  // Per-series: a bad fetch/observation on ONE series NEVER wipes the other — only the clean ones upsert (L47).
  for (const sid of SERIES) {
    try {
      const res = await fetch(FRED_URL(sid, key), { cf: { cacheTtl: 0 } });
      if (!res || !res.ok) { results[sid] = 'fetch not ok (' + (res && res.status) + ') — kept last good'; continue; }
      const latest = parseFredLatest(await res.json());
      if (!latest) { results[sid] = 'no usable observation — kept last good'; continue; }
      rows.push({ series_id: sid, value: latest.value, effective_date: latest.date, source: 'FRED:' + sid });
      results[sid] = latest.value + ' @ ' + latest.date;
    } catch (e) { results[sid] = 'threw (' + ((e && e.name) || 'error') + ') — kept last good'; }
  }
  if (!rows.length) return { ok: false, reason: 'no series fetched cleanly — refused', results };
  const r = await upsertSeries(env.DB, rows);
  return { ok: true, upserted: r.upserted, results };
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
