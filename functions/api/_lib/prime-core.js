// #384 · §18.C Phase 1 — GLOBAL market-rate reference logic (shared, PUBLIC reference data).
//
// SECURITY / SCOPING (read before changing): DELIBERATELY SEPARATE from documents-core.js. documents-core
// is sub-scoped to the VERIFIED Clerk user id on every query; market_reference is the opposite — GLOBAL,
// un-scoped, public (a market rate is identical for every user). There is NO clerk_user_id here and NO user
// parameter anywhere — a user id must NEVER enter this path, and this path must NEVER touch the user-scoped
// `documents` table. Keep the two code paths disjoint (mirror of ticker-core.js, L48).
//
// SERIES-KEYED + GENERIC: one row per FRED series_id. DPRIME today; SOFR / MORTGAGE30US / … drop in as ROWS
// (upsertSeries takes any series), never a fork. Every value is provider-sourced-or-blank (Lesson 47).

// Idempotent upsert of one-or-more series rows. `rows` = [{ series_id, value, effective_date, source }].
// Silently drops any row without a finite value or an effective_date (never write a fabricated/blank rate).
// Re-running with the same input yields the SAME rows (INSERT … ON CONFLICT UPDATE) — no duplicates.
export async function upsertSeries(db, rows) {
  const list = (rows || []).filter((r) => r && r.series_id && Number.isFinite(Number(r.value)) && r.effective_date);
  if (!list.length) return { upserted: 0 };
  const now = new Date().toISOString();
  const SQL =
    'INSERT INTO market_reference (series_id, value, effective_date, source, fetched_at) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(series_id) DO UPDATE SET value = excluded.value, effective_date = excluded.effective_date, ' +
    'source = excluded.source, fetched_at = excluded.fetched_at';
  const stmts = list.map((r) => db.prepare(SQL).bind(
    String(r.series_id).toUpperCase(), Number(r.value), String(r.effective_date),
    String(r.source || ('FRED:' + String(r.series_id).toUpperCase())), now));
  await db.batch(stmts);
  return { upserted: list.length };
}

// Read reference rows for a list of series ids. GLOBAL — no user scoping, no auth here (the caller endpoint
// decides auth; the data is public). Bounded so it can't be a scrape amp.
export async function getSeries(db, seriesIds) {
  const list = (seriesIds || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean).slice(0, 50);
  if (!list.length) return [];
  const placeholders = list.map(() => '?').join(',');
  const res = await db.prepare(
    'SELECT series_id, value, effective_date, source, fetched_at FROM market_reference WHERE series_id IN (' + placeholders + ')'
  ).bind(...list).all();
  return (res && res.results) || [];
}

// Parse a FRED /series/observations JSON payload into the LATEST { value, date }. FRED marks a missing
// observation with a '.' value — treat that (and any non-numeric / malformed date) as NO DATA and return
// null, so the caller's never-overwrite guard keeps the last good row (L47 — never fabricate a rate).
// We request sort_order=desc&limit=1, so observations[0] is the most recent.
export function parseFredLatest(json) {
  const obs = json && Array.isArray(json.observations) ? json.observations : null;
  if (!obs || !obs.length) return null;
  const o = obs[0];
  if (!o || o.value == null || o.value === '.') return null;
  const v = Number(o.value);
  if (!Number.isFinite(v)) return null;
  if (!o.date || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
  return { value: v, date: o.date };
}
