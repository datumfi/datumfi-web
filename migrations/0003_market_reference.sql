-- #384 · §18.C Phase 1 · GLOBAL market-rate reference table (shared, PUBLIC reference data).
-- SERIES-KEYED + generic: ONE row per FRED series_id. DPRIME seeded now; SOFR / MORTGAGE30US / MORTGAGE15US
-- / FEDFUNDS / CPIAUCSL / T10YIE / DGS10 drop in LATER as ROWS, never a fork (HELOC Copy Bank §20 SOFR,
-- Mortgage Copy Bank §17, the FRED catalog sheet). DELIBERATELY NOT user-scoped: a market rate is identical
-- for every user (like ticker_reference, unlike documents). NO clerk_user_id; reads go through the SEPARATE
-- prime-core.js path, never documents-core. Refreshed weekly by the standalone `prime-refresh` Worker
-- (workers/prime-refresh/ — a SEPARATE `wrangler deploy`, never the Pages git push): fetch FRED -> upsert.
-- Every value is provider-sourced-or-blank (Lesson 47) — we STORE the FRED observation, we don't fabricate.
-- Applied to DEV D1 first; prod migration is a later, separately-gated milestone (Captain).
CREATE TABLE IF NOT EXISTS market_reference (
  series_id      TEXT PRIMARY KEY,   -- FRED series id (e.g. DPRIME, SOFR)
  value          REAL NOT NULL,      -- the latest observed value (percent)
  effective_date TEXT NOT NULL,      -- FRED observation date (YYYY-MM-DD)
  source         TEXT NOT NULL,      -- provenance, e.g. 'FRED:DPRIME'
  fetched_at     TEXT NOT NULL       -- ISO-8601 timestamp of our fetch
);
