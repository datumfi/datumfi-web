// ticker-refresh.mjs — standalone Cloudflare Worker (monthly Cron). SEPARATE deploy from the Pages site
// (`wrangler deploy`, NOT the datumfi.com git push). Syncs the served ticker-bundle.js into the GLOBAL
// ticker_reference D1 table (#279 option (a): sync-committed-bundle -> D1). Thin + idempotent: the heavy
// provider refresh stays on-machine (_build_ticker_bundle.mjs --refresh + commit). REUSE — the upsert +
// parse live in the shared ticker-core.js (also used by the Pages read endpoint + the gate); no fork.
import { upsertTickers, parseBundle } from '../../functions/api/_lib/ticker-core.js';

const BUNDLE_URL = 'https://datumfi.com/scripts/ticker-bundle.js';

async function refresh(env) {
  const res = await fetch(BUNDLE_URL, { cf: { cacheTtl: 0 } });
  if (!res || !res.ok) return { ok: false, status: res && res.status };
  const src = await res.text();
  const map = parseBundle(src);
  const symbols = Object.keys(map).length;
  // Safety: never wipe/thin the table on a bad fetch or parse regression. The real universe is
  // thousands of symbols; a tiny result means the bundle format changed -> refuse to overwrite.
  if (symbols < 100) return { ok: false, reason: 'bundle parse thin (' + symbols + ') — refused' };
  const r = await upsertTickers(env.DB, map);
  return { ok: true, symbols, upserted: r.upserted };
}

export default {
  // Monthly Cron (see wrangler.toml [triggers] crons) — the scheduled idempotent refresh.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env).then((r) => console.log('[ticker-refresh]', JSON.stringify(r))));
  },
  // Manual one-shot verify (GET) after deploy — the SAME idempotent refresh, so re-hitting it is safe.
  async fetch(request, env) {
    const r = await refresh(env);
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
};
