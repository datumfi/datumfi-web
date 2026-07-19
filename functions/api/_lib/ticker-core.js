// D1 Phase 6 — GLOBAL ticker reference logic (shared, PUBLIC reference data).
//
// SECURITY / SCOPING (read before changing): this module is DELIBERATELY SEPARATE from documents-core.js.
// documents-core is sub-scoped to the VERIFIED Clerk user id on every query. ticker_reference is the
// opposite: GLOBAL, un-scoped, public reference data (the ticker universe is identical for every user).
// There is NO clerk_user_id here and NO user parameter anywhere — a user id must NEVER enter this path,
// and this path must NEVER touch the user-scoped `documents` table. Keep the two code paths disjoint.
//
// Every value is provider-sourced-or-blank (Lesson 47) — we STORE the bundle exactly, we don't fabricate.

// Idempotent bulk upsert of the ticker universe. `tickerMap` = { SYMBOL: { …fundamentals… } } (the shape
// of TICKER_BUNDLE). Running this TWICE with the same input yields the SAME rows (INSERT … ON CONFLICT
// UPDATE) — no duplicates. payload_json is stored EXACTLY as given (forward-compatible; fields can grow).
export async function upsertTickers(db, tickerMap) {
  const now = new Date().toISOString();
  const symbols = Object.keys(tickerMap || {}).filter(Boolean);
  const SQL =
    'INSERT INTO ticker_reference (symbol, payload_json, updated_at) VALUES (?, ?, ?) ' +
    'ON CONFLICT(symbol) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at';
  // The universe is ~13k symbols. The old loop awaited ONE D1 write per symbol = ~13k sequential network
  // round-trips in a single Worker invocation, which blew past the request/subrequest/time limits and HUNG
  // the populate (both the manual GET and the Cron). Batch instead: db.batch() sends a whole chunk in ONE
  // round-trip (transactional). ~13k / 100 = ~130 round-trips instead of ~13k. Idempotent as before
  // (ON CONFLICT ... DO UPDATE). NOTE: .bind() returns a NEW statement — mint a fresh one per row, never
  // share one across rows. In-memory sqlite has no such limits, which is why the gate never caught this.
  const CHUNK = 100;
  let upserted = 0;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const slice = symbols.slice(i, i + CHUNK);
    const stmts = slice.map((sym) =>
      db.prepare(SQL).bind(String(sym).toUpperCase(), JSON.stringify(tickerMap[sym] || {}), now));
    await db.batch(stmts);
    upserted += slice.length;
  }
  return { upserted };
}

// Read reference rows for a list of symbols. GLOBAL — no user scoping, no auth needed here (the caller
// endpoint decides auth; the data is public). Bounded to 200 symbols/call so it can't be a scrape amp.
export async function getTickers(db, symbols) {
  const list = (symbols || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean).slice(0, 200);
  if (!list.length) return [];
  const placeholders = list.map(() => '?').join(',');
  const res = await db.prepare(
    'SELECT symbol, payload_json, updated_at FROM ticker_reference WHERE symbol IN (' + placeholders + ')'
  ).bind(...list).all();
  return (res && res.results) || [];
}

// Parse the SERVED ticker-bundle.js (a generated IIFE: `var T = { SYM:{…}, … };`) into the symbol map,
// WITHOUT eval (Cloudflare Workers forbid dynamic eval). The generator emits one entry per line with an
// UNQUOTED symbol key and JSON-valued fields, so we line-anchor-quote the symbol keys then JSON.parse.
export function parseBundle(src) {
  if (!src) return {};
  const anchor = src.indexOf('var T =');
  if (anchor < 0) return {};
  const open = src.indexOf('{', anchor);
  const close = src.indexOf('\n  };', open);
  if (open < 0 || close < 0) return {};
  const objText = src.slice(open, close) + '\n}';                       // { …entries… }
  // Quote the (unquoted) line-leading symbol keys only. Symbols can carry $ . - / ^ etc. (e.g. ABR$D,
  // a preferred share), so match any non-delimiter run — NOT just [A-Za-z0-9.]. Inner value keys are
  // already quoted (start with ") and never at line-start, so they're untouched.
  const jsonText = objText.replace(/^(\s*)([^\s:{}"]+):\{/gm, '$1"$2":{');
  try { return JSON.parse(jsonText); } catch (e) { return {}; }
}
