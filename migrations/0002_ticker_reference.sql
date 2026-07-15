-- D1 Phase 6 · GLOBAL ticker reference table (shared, PUBLIC reference data).
-- DELIBERATELY NOT user-scoped: unlike `documents` (keyed to clerk_user_id), ticker_reference has NO
-- clerk_user_id — ticker fundamentals (name/sector/beta/expense/…) are the same for every user. Its
-- reads go through a SEPARATE code path (functions/api/_lib/ticker-core.js), never documents-core.
-- ONE row per symbol; payload_json is forward-compatible (fields can grow later WITHOUT a migration).
-- Refreshed monthly by the standalone `ticker-refresh` Worker (workers/ticker-refresh/ — a SEPARATE
-- `wrangler deploy`, never the Pages git push): fetch the served ticker-bundle.js -> parse -> upsert.
-- Applied to DEV D1 first; prod migration is a later, separately-gated milestone.
CREATE TABLE IF NOT EXISTS ticker_reference (
  symbol       TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
