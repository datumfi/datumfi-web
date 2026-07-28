/* D1 PHASE-6 BEHAVIOR GATE (red-first) — shared GLOBAL ticker_reference table + monthly Cron logic.
 * ticker_reference is PUBLIC REFERENCE DATA — GLOBAL, NOT sub-scoped to a Clerk user. This gate proves:
 *   POPULATE/READ  upsertTickers writes rows; getTickers reads them back (by symbol list).
 *   IDEMPOTENT     running the Cron upsert TWICE yields the SAME rows (no dupes, same payloads).
 *   UPSERT         re-upserting a changed symbol UPDATES its row in place (one row per symbol).
 *   GLOBAL (security-critical) ticker_reference has NO clerk_user_id, ticker-core takes NO user/sub,
 *                  the read endpoint does NOT auth/user-scope, and documents-core (user-scoped) is
 *                  untouched — the two paths never cross.
 *   PARSE          parseBundle() turns the REAL committed ticker-bundle.js into the symbol map (the
 *                  sync-committed-bundle -> D1 source, #279 option (a)).
 *   WIRING         migration + read endpoint + standalone Cron Worker ([triggers] crons + scheduled()).
 * Run: node --experimental-sqlite scripts/_gate_d1_ticker.mjs [LABEL] [--redfirst] */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch (e) { return ''; } };

// real D1 (node:sqlite) wrapper matching env.DB
function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; },
    // D1 batch (transactional multi-statement, ONE round-trip) — models the real binding so the gate
    // exercises upsertTickers' chunked-batch path (the fix for the ~13k-sequential-write Worker hang).
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; } };
}

const MIG = 'migrations/0002_ticker_reference.sql';
const migSql = existsSync(join(ROOT, MIG)) ? read(MIG) : '';

const sampleMap = {
  AAPL: { name: 'Apple Inc', instrumentType: 'Stock', sector: 'Technology', sectorSrc: 'SEC SIC', geography: 'US', geographySrc: 'SEC domicile' },
  MSFT: { name: 'Microsoft Corp', instrumentType: 'Stock', sector: 'Technology', beta: '0.89', betaSrc: 'Yahoo', betaAsOf: '2026-07-08' },
  ZVOL: { name: 'Volatility Premium Plus ETF', instrumentType: 'ETF' }
};

(async () => {
  // dynamic import so a missing module is a CLEAN red (not a crash) — the red-first negative control
  let core = null;
  try { core = await import('../functions/api/_lib/ticker-core.js'); } catch (e) { core = null; }

  // ===== schema + core present? =====
  lines.push('===== ticker_reference table + ticker-core =====');
  ok(pick(!!migSql && /CREATE TABLE[\s\S]*ticker_reference/i.test(migSql), !migSql), 'migration 0002 creates ticker_reference [BITE]');
  ok(pick(!!core && typeof core.upsertTickers === 'function' && typeof core.getTickers === 'function' && typeof core.parseBundle === 'function',
          !(core && core.upsertTickers)), 'ticker-core exports upsertTickers / getTickers / parseBundle [BITE]');

  let db = null, sqlite = null;
  if (migSql) { sqlite = new DatabaseSync(':memory:'); sqlite.exec(migSql); db = makeD1(sqlite); }

  // ===== POPULATE + READ =====
  lines.push('===== POPULATE + READ =====');
  if (core && db) {
    const up = await core.upsertTickers(db, sampleMap);
    const rows = await core.getTickers(db, ['AAPL', 'MSFT']);
    const total = sqlite.prepare('SELECT count(*) c FROM ticker_reference').get().c;
    const aapl = rows.find((r) => r.symbol === 'AAPL');
    ok(pick(up && up.upserted === 3 && total === 3, !(up && up.upserted === 3)), 'upsertTickers populated 3 rows [BITE]');
    ok(pick(rows.length === 2 && aapl && JSON.parse(aapl.payload_json).sector === 'Technology', !(rows.length === 2)),
       'getTickers reads back the requested symbols with full payload [BITE]');
    ok(pick((await core.getTickers(db, ['NOPE'])).length === 0, false), 'getTickers on an unknown symbol -> empty (no crash)');
  } else { ok(pick(false, true), 'POPULATE+READ skipped (core/migration absent) [BITE]'); ok(false, 'getTickers read skipped'); ok(false, 'unknown-symbol skipped'); }

  // ===== IDEMPOTENT (Cron run twice = same rows) =====
  lines.push('===== IDEMPOTENT =====');
  if (core && db) {
    await core.upsertTickers(db, sampleMap);   // second run, same input
    const total2 = sqlite.prepare('SELECT count(*) c FROM ticker_reference').get().c;
    const msft = JSON.parse(sqlite.prepare("SELECT payload_json p FROM ticker_reference WHERE symbol='MSFT'").get().p);
    ok(pick(total2 === 3 && msft.beta === '0.89', !(total2 === 3)), 'running the Cron upsert TWICE = same 3 rows, no dupes, same payload [BITE]');
    // upsert-updates: change MSFT + add TSLA -> MSFT row updated in place, TSLA added
    await core.upsertTickers(db, { MSFT: { name: 'Microsoft Corp', instrumentType: 'Stock', beta: '0.91' }, TSLA: { name: 'Tesla Inc', instrumentType: 'Stock' } });
    const total3 = sqlite.prepare('SELECT count(*) c FROM ticker_reference').get().c;
    const msft2 = JSON.parse(sqlite.prepare("SELECT payload_json p FROM ticker_reference WHERE symbol='MSFT'").get().p);
    ok(pick(total3 === 4 && msft2.beta === '0.91', !(total3 === 4 && msft2.beta === '0.91')), 'upsert UPDATES a symbol in place (MSFT beta 0.89->0.91) + adds TSLA (4 rows) [BITE]');
  } else { ok(false, 'IDEMPOTENT skipped'); ok(false, 'upsert-update skipped'); }

  // ===== GLOBAL / NOT USER-SCOPED (security-critical) =====
  // Strip comments first — the security note in each file deliberately MENTIONS clerk_user_id /
  // verifyClerk / documents-core to document their ABSENCE; we assert on CODE, not prose.
  const stripSql = (s) => s.replace(/--[^\n]*/g, '');
  const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  lines.push('===== GLOBAL — not user-scoped =====');
  const coreSrc = stripJs(read('functions/api/_lib/ticker-core.js'));
  const endpoint = stripJs(read('functions/api/tickers.js'));
  const docsCore = read('functions/api/_lib/documents-core.js');   // untouched; check raw
  const migCode = stripSql(migSql);
  ok(pick(!!migSql && !/clerk_user_id/i.test(migCode), !migSql), 'ticker_reference table has NO clerk_user_id column (global) [BITE]');
  ok(pick(!!coreSrc && !/clerk_user_id/.test(coreSrc) && !/\bsub\b/.test(coreSrc), !read('functions/api/_lib/ticker-core.js')), 'ticker-core has NO clerk_user_id / no user sub in CODE [BITE]');
  ok(pick(!!endpoint && !/verifyClerk/.test(endpoint) && !/documents-core/.test(endpoint), !read('functions/api/tickers.js')),
     'read endpoint does NOT auth (verifyClerk) or route through the user-scoped documents-core [BITE]');
  ok(pick(!!docsCore && /clerk_user_id/.test(docsCore) && !/ticker_reference/.test(docsCore), !docsCore),
     'documents-core UNTOUCHED (still user-scoped; no ticker_reference leak into it) [BITE]');

  // ===== PARSE the REAL committed bundle (sync source) =====
  lines.push('===== PARSE real ticker-bundle.js =====');
  if (core && core.parseBundle) {
    const bundle = read('scripts/ticker-bundle.js');
    const map = core.parseBundle(bundle);
    const n = map ? Object.keys(map).length : 0;
    const zws = map && map.ZWS;
    ok(pick(n > 3000, n <= 3000), 'parseBundle parses the REAL bundle into >3000 symbols (' + n + ') [BITE]');
    ok(pick(!!zws && zws.name && zws.instrumentType === 'Stock' && zws.sector === 'Industrials', !(zws && zws.name)),
       'parseBundle yields correct fields for a known symbol (ZWS) [BITE]');
  } else { ok(false, 'parseBundle real-bundle skipped'); ok(false, 'parseBundle fields skipped'); }

  // ===== WIRING (served bytes) =====
  lines.push('===== WIRING =====');
  const wglob = (p) => existsSync(join(ROOT, p));
  ok(wglob('functions/api/tickers.js') && endpoint.includes('getTickers'), 'functions/api/tickers.js exists + reads via getTickers');
  const workerWr = read('workers/ticker-refresh/wrangler.toml');
  const workerJs = read('workers/ticker-refresh/ticker-refresh.mjs');
  ok(workerWr.includes('[triggers]') && workerWr.includes('crons'), 'Cron Worker wrangler.toml has [triggers] crons');
  ok(workerJs.includes('async scheduled(') && workerJs.includes('upsertTickers'), 'Cron Worker has scheduled() + calls upsertTickers');
  ok(!read('wrangler.toml').includes('[triggers]'), 'ROOT wrangler.toml stays CLEAN (no [triggers] — Cron is a separate Worker)');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-6 ticker_reference gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] G-TICKER-D1 — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
