/* #384 · §18.C Phase-1 BEHAVIOR GATE (red-first) — GLOBAL market_reference table + weekly Cron logic.
 * market_reference is PUBLIC REFERENCE DATA — GLOBAL, series-keyed, NOT sub-scoped to a Clerk user.
 * Proves:
 *   POPULATE/READ  upsertSeries writes a series row; getSeries reads it back (by series-id list).
 *   IDEMPOTENT     running the Cron upsert TWICE yields the SAME row; re-upsert UPDATES in place.
 *   GUARD (L47)    parseFredLatest returns null on a '.'/missing/non-numeric/bad-date observation, so the
 *                  Worker's never-overwrite guard keeps the last good row (never fabricate a rate).
 *   SERIES-KEYED   a second series (SOFR) drops in as a ROW alongside DPRIME (no fork).
 *   GLOBAL (security-critical) market_reference has NO clerk_user_id, prime-core takes NO user/sub, the
 *                  read endpoint does NOT auth/user-scope, documents-core (user-scoped) is untouched.
 *   WIRING         migration + read endpoint + standalone Cron Worker ([triggers] crons + scheduled() +
 *                  reads env.FRED_API_KEY, never hardcoded).
 * Run: node --experimental-sqlite scripts/_gate_d1_prime.mjs [LABEL] [--redfirst] */
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

// real D1 (node:sqlite) wrapper matching env.DB — same shape as _gate_d1_ticker.mjs.
function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; },
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; } };
}

const MIG = 'migrations/0003_market_reference.sql';
const migSql = existsSync(join(ROOT, MIG)) ? read(MIG) : '';

(async () => {
  let core = null;
  try { core = await import('../functions/api/_lib/prime-core.js'); } catch (e) { core = null; }

  // ===== schema + core present? =====
  lines.push('===== market_reference table + prime-core =====');
  ok(pick(!!migSql && /CREATE TABLE[\s\S]*market_reference/i.test(migSql), !migSql), 'migration 0003 creates market_reference [BITE]');
  ok(pick(!!core && typeof core.upsertSeries === 'function' && typeof core.getSeries === 'function' && typeof core.parseFredLatest === 'function',
          !(core && core.upsertSeries)), 'prime-core exports upsertSeries / getSeries / parseFredLatest [BITE]');

  let db = null, sqlite = null;
  if (migSql) { sqlite = new DatabaseSync(':memory:'); sqlite.exec(migSql); db = makeD1(sqlite); }

  // ===== POPULATE + READ (DPRIME) =====
  lines.push('===== POPULATE + READ =====');
  if (core && db) {
    const up = await core.upsertSeries(db, [{ series_id: 'DPRIME', value: 7.5, effective_date: '2026-07-17', source: 'FRED:DPRIME' }]);
    const rows = await core.getSeries(db, ['DPRIME']);
    const row = rows[0];
    ok(pick(up && up.upserted === 1 && rows.length === 1, !(up && up.upserted === 1)), 'upsertSeries populated the DPRIME row [BITE]');
    ok(pick(row && row.value === 7.5 && row.effective_date === '2026-07-17' && row.source === 'FRED:DPRIME', !(row && row.value === 7.5)),
       'getSeries reads back value + effective_date + source [BITE]');
    ok(pick((await core.getSeries(db, ['NOPE'])).length === 0, false), 'getSeries on an unknown series -> empty (no crash)');
  } else { ok(pick(false, true), 'POPULATE+READ skipped [BITE]'); ok(false, 'read skipped'); ok(false, 'unknown skipped'); }

  // ===== IDEMPOTENT + UPSERT-IN-PLACE + SERIES-KEYED (SOFR as a second row) =====
  lines.push('===== IDEMPOTENT + SERIES-KEYED =====');
  if (core && db) {
    await core.upsertSeries(db, [{ series_id: 'DPRIME', value: 7.5, effective_date: '2026-07-17', source: 'FRED:DPRIME' }]); // 2nd run, same input
    const c1 = sqlite.prepare('SELECT count(*) c FROM market_reference').get().c;
    ok(pick(c1 === 1, c1 !== 1), 'running the Cron upsert TWICE = same 1 row, no dupes [BITE]');
    await core.upsertSeries(db, [{ series_id: 'DPRIME', value: 8.0, effective_date: '2026-08-01', source: 'FRED:DPRIME' }]); // rate moved
    const dp = sqlite.prepare("SELECT value v FROM market_reference WHERE series_id='DPRIME'").get().v;
    ok(pick(dp === 8.0, dp !== 8.0), 'upsert UPDATES DPRIME in place (7.5 -> 8.0), one row [BITE]');
    await core.upsertSeries(db, [{ series_id: 'SOFR', value: 5.3, effective_date: '2026-08-01', source: 'FRED:SOFR' }]); // sibling drops in as a ROW
    const c2 = sqlite.prepare('SELECT count(*) c FROM market_reference').get().c;
    ok(pick(c2 === 2, c2 !== 2), 'SERIES-KEYED: SOFR drops in as a second ROW alongside DPRIME (no fork) [BITE]');
  } else { ok(false, 'idempotent skipped'); ok(false, 'upsert-update skipped'); ok(false, 'series-keyed skipped'); }

  // ===== GUARD (L47) — parseFredLatest never yields a fabricated rate =====
  lines.push('===== GUARD — sourced-or-blank =====');
  if (core && core.parseFredLatest) {
    const good = core.parseFredLatest({ observations: [{ date: '2026-07-17', value: '7.50' }] });
    const missing = core.parseFredLatest({ observations: [{ date: '2026-07-17', value: '.' }] });   // FRED missing marker
    const empty = core.parseFredLatest({ observations: [] });
    const nan = core.parseFredLatest({ observations: [{ date: '2026-07-17', value: 'N/A' }] });
    ok(pick(good && good.value === 7.5 && good.date === '2026-07-17', !(good && good.value === 7.5)), 'parseFredLatest extracts a real observation [BITE]');
    ok(pick(missing === null, missing !== null), "parseFredLatest returns null on FRED '.' missing marker (keeps last good row) [BITE]");
    ok(pick(empty === null && nan === null, !(empty === null && nan === null)), 'parseFredLatest returns null on empty / non-numeric [BITE]');
    // and upsertSeries itself refuses a row with no finite value (defense in depth)
    if (db) { const r = await core.upsertSeries(db, [{ series_id: 'BAD', value: '.', effective_date: '2026-08-01' }]); ok(pick(r.upserted === 0, r.upserted !== 0), 'upsertSeries drops a non-numeric row (never writes a blank rate) [BITE]'); }
    else ok(false, 'upsert-drop skipped');
  } else { ok(false, 'parse good skipped'); ok(false, 'parse missing skipped'); ok(false, 'parse empty skipped'); ok(false, 'upsert-drop skipped'); }

  // ===== GLOBAL / NOT USER-SCOPED (security-critical) =====
  const stripSql = (s) => s.replace(/--[^\n]*/g, '');
  const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  lines.push('===== GLOBAL — not user-scoped =====');
  const coreSrc = stripJs(read('functions/api/_lib/prime-core.js'));
  const endpoint = stripJs(read('functions/api/prime.js'));
  const docsCore = read('functions/api/_lib/documents-core.js');
  ok(pick(!!migSql && !/clerk_user_id/i.test(stripSql(migSql)), !migSql), 'market_reference table has NO clerk_user_id column (global) [BITE]');
  ok(pick(!!coreSrc && !/clerk_user_id/.test(coreSrc) && !/\bsub\b/.test(coreSrc), !read('functions/api/_lib/prime-core.js')), 'prime-core has NO clerk_user_id / no user sub in CODE [BITE]');
  ok(pick(!!endpoint && !/verifyClerk/.test(endpoint) && !/documents-core/.test(endpoint), !read('functions/api/prime.js')),
     'read endpoint does NOT auth (verifyClerk) or route through documents-core [BITE]');
  ok(pick(!!docsCore && /clerk_user_id/.test(docsCore) && !/market_reference/.test(docsCore), !docsCore),
     'documents-core UNTOUCHED (still user-scoped; no market_reference leak) [BITE]');

  // ===== WIRING (served bytes) =====
  lines.push('===== WIRING =====');
  ok(existsSync(join(ROOT, 'functions/api/prime.js')) && endpoint.includes('getSeries'), 'functions/api/prime.js exists + reads via getSeries');
  const workerWr = read('workers/prime-refresh/wrangler.toml');
  const workerJs = read('workers/prime-refresh/prime-refresh.mjs');
  ok(workerWr.includes('[triggers]') && workerWr.includes('crons'), 'Cron Worker wrangler.toml has [triggers] crons');
  ok(pick(workerJs.includes('async scheduled(') && workerJs.includes('upsertSeries') && workerJs.includes('env.FRED_API_KEY'),
          !(workerJs.includes('env.FRED_API_KEY'))), 'Cron Worker has scheduled() + upsertSeries + reads env.FRED_API_KEY (never hardcoded) [BITE]');
  ok(pick(!/api_key\s*=\s*["'][A-Za-z0-9]{8,}/.test(workerJs), false), 'no hardcoded FRED key literal in the Worker');
  ok(!read('wrangler.toml').includes('[triggers]'), 'ROOT wrangler.toml stays CLEAN (no [triggers] — Cron is a separate Worker)');

  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   #384 Phase-1 market_reference (Prime) gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] G-PRIME-D1 — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
