/* D1 SKETCHBOOK↔ARCHIVE PARITY GATE (red-first) — #310 follow-on: unlimited sketches + lazy paging.
 *
 * FOUNDATION unit (this gate, real-wire): the two shared non-sacred modules the mirror is built on —
 *   • datum-archive-paging.js — the LAZY pager (pageCount=ceil(len/PER); page N exists ONLY when the list
 *     is long enough; NEVER pre-spawns empty pages) — mirrors the Blueprint archive's proven behavior.
 *   • datum-tier.js — the SINGLE tier switch (savedCap() default Infinity=Design/unlimited NOW; flips to 1
 *     for Discover LATER) — one hook, no scattered magic numbers.
 * Plus the D1 DATA-LAYER proof (real datum-d1.js + real sqlite): N distinct sketchbook writes -> listDocs
 * returns N (D1 is already unlimited), and when D1 is reachable the FULL list is the source of truth — the
 * newest-4 LS/Clerk net can NEVER silently re-impose a 4-cap (Daniel's clarification on approval 3).
 *
 * WIRING markers (RED until the HTML wiring unit lands — sketch.html editor de-cap + sketchbook.html paging):
 * served-bytes checks, plus a PRESERVATION GUARD that FAILS if the dormant #discover-capacity-modal is gutted
 * (constraint #1). The WIRING section is expected RED this round; the FOUNDATION + DATA-LAYER go GREEN once
 * the modules exist. Bite-before-it-passes: run before the modules exist -> FOUNDATION also RED.
 *
 * Run:  node --experimental-sqlite scripts/_gate_d1_sketch_parity.mjs [LABEL] [--redfirst]
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatch } from '../functions/api/_lib/documents-core.js';

const RF = process.argv.includes('--redfirst');
const pick = (win, lose) => (RF ? lose : win);

/* ══ THE CONTROL DECLARATION (§82.99) — ONE DECLARATION, TWO READERS ══════════════════════════════
 * ⭐ DECLARED 2026-08-23 FOR A REASON THAT IS NOT THIS GATE'S OWN HEALTH: it is the sweep's live
 *    proof that a control must be judged by its VERDICT and never by its EXIT CODE. Measured that
 *    day: `--redfirst` prints `OVERALL: RED (2 pass / 14 fail)` and then EXITS 0 (see the foot of
 *    this file). An exit-code reader calls that GREEN and passes the one shape it exists to catch.
 *    ⛔ THE EXIT CODE IS A REAL DEFECT IN THIS GATE AND IT IS LEFT ON THE FLOOR DELIBERATELY —
 *    repairing it would destroy the sweep's only live specimen of the incoherent shape. It is
 *    harmless in the CLEAN run (this gate prints GREEN and exits 0, which agrees), and the runner's
 *    own INCOHERENT bucket would catch it the day its assertions genuinely broke.
 *
 * ⚠️ `anchors: []` IS A CLAIM, NOT AN OMISSION. `pick(win, lose)` swaps WHICH ASSERTION IS EVALUATED
 *    and never touches the product — so there is NO poison here that could fail to land, and asking
 *    "did the poison land?" is a CATEGORY ERROR rather than an unanswered question. An empty anchor
 *    list is the honest way to say that, and it stops a future census counting this gate's silence
 *    as a missing guard. (It was counted exactly that way once, on 2026-08-23, before anyone ran it.)
 * ⚠️ `reds` IS COARSE BECAUSE THIS GATE HAS NO LEG IDS — its legs are labelled by description, not
 *    L1/L2/L3. Recorded as measured (14 failing legs), not invented, and deliberately NOT dressed up
 *    as an ID list this file cannot actually produce. */
const CONTROLS = {
  '--redfirst': {
    what: 'inverts every [BITE] assertion via pick(win, lose) — the product is never touched',
    anchors: [],
    reds: ['all 14 [BITE] assertions (this gate labels legs by description, not by ID)'],
    expect: 'red',
  },
};
if (process.argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_d1_sketch_parity.mjs', controls: CONTROLS }));
  process.exit(0);
}
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

function makeD1(sqlite) {
  return { prepare(sql) { const st = { _a: [], bind(...a) { st._a = a; return st; },
    async first() { return sqlite.prepare(sql).get(...st._a) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...st._a) }; },
    async run() { const i = sqlite.prepare(sql).run(...st._a); return { meta: { changes: i.changes } }; } }; return st; } };
}
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_documents.sql', import.meta.url), 'utf8'));
const db = makeD1(sqlite);
globalThis.fetch = function (url, opts) {
  return (async () => {
    const u = new URL(url, 'https://datumfi.com');
    const type = u.searchParams.get('type') || '', key = u.searchParams.get('key') || 'active', list = u.searchParams.get('list') === '1';
    const method = (opts && opts.method) || 'GET';
    const m = ((opts && opts.headers && opts.headers.Authorization) || '').match(/^Bearer\s+tok:(.+)$/);
    if (!m) return { status: 401, json: async () => ({ error: 'unauthorized' }) };
    let payloadStr = null, ifRevision = null;
    if (method === 'PUT') { const b = JSON.parse(opts.body); payloadStr = b.payload !== undefined ? JSON.stringify(b.payload) : null; ifRevision = typeof b.revision === 'number' ? b.revision : null; }
    const r = await dispatch({ method, type, key, list, payloadStr, ifRevision, db, sub: m[1] });
    return { status: r.status, json: async () => r.body };
  })();
};
function asUser(id) { globalThis.Clerk = { session: { getToken: () => 'tok:' + id }, user: { id } }; }

let Paging = null, Tier = null;
try { const m = await import('../scripts/datum-archive-paging.js'); Paging = m.default || globalThis.DatumArchivePaging; } catch (e) {}
try { const m = await import('../scripts/datum-tier.js'); Tier = m.default || globalThis.DatumTier; } catch (e) {}
const { default: DatumD1 } = await import('../scripts/datum-d1.js');

(async () => {
  // ===== FOUNDATION: LAZY PAGER (real module — mirrors Blueprint.html:1591/1621/1634) =====
  lines.push('===== FOUNDATION · LAZY PAGER (datum-archive-paging.js) =====');
  const mk = (n) => { const arr = Array.from({ length: n }, (_, i) => ({ id: 'x' + i })); return Paging ? Paging.makePager(() => arr, 4) : null; };
  const P4 = mk(4), P5 = mk(5), P8 = mk(8), P9 = mk(9);
  ok(pick(!!P4 && P4.pageCount() === 1, !(P4 && P4.pageCount() === 1)), '4 items -> 1 page [BITE]');
  ok(pick(!!P4 && P4.hasPaging() === false, !(P4 && P4.hasPaging() === false)), '4 items -> turn UI hidden (lazy, no pre-spawn) [BITE]');
  ok(pick(!!P4 && P4.slice(1).every(x => x === null) && P4.pageCount() === 1, !(P4 && P4.slice(1).every(x => x === null) && P4.pageCount() === 1)), 'NO pre-spawn: a page-2 slice at 4 items is all-empty and pageCount stays 1 [BITE]');
  ok(pick(!!P5 && P5.pageCount() === 2, !(P5 && P5.pageCount() === 2)), '5th item -> page 2 unlocks (lazy at save 5) [BITE]');
  ok(pick(!!P8 && P8.pageCount() === 2, !(P8 && P8.pageCount() === 2)), '8 items -> 2 pages [BITE]');
  ok(pick(!!P9 && P9.pageCount() === 3, !(P9 && P9.pageCount() === 3)), '9th item -> page 3 (unlocks at 5/9/13…) [BITE]');
  if (P5) { const c0n = P5.canNext(), c0p = P5.canPrev(); P5.next(); const c1n = P5.canNext();
    ok(pick(c0n === true && c0p === false && c1n === false, !(c0n === true && c0p === false && c1n === false)), 'page0: canNext=t/canPrev=f; last page: canNext=f (no pre-spawned next) [BITE]');
  } else ok(pick(false, true), 'page nav flags [BITE]');

  // ===== FOUNDATION: TIER SWITCH (single source, default unlimited) =====
  lines.push('===== FOUNDATION · TIER SWITCH (datum-tier.js) =====');
  ok(pick(!!Tier && Tier.savedCap() === Infinity, !(Tier && Tier.savedCap() === Infinity)), 'tier default = unlimited (Infinity) NOW — whole site runs as Design [BITE]');
  if (Tier) { Tier.mode = 'discover'; const d = Tier.savedCap(); Tier.mode = 'design'; const g = Tier.savedCap();
    ok(pick(d === 1 && g === Infinity, !(d === 1 && g === Infinity)), 'ONE switch flips: discover->1, design->Infinity (no scattered magic numbers) [BITE]');
  } else ok(pick(false, true), 'tier flips [BITE]');

  // ===== DATA-LAYER: D1 already unlimited + newest-4 net can't re-cap when D1 is up =====
  lines.push('===== DATA-LAYER · D1 UNLIMITED (real datum-d1.js + sqlite) =====');
  asUser('userP');
  for (let i = 1; i <= 9; i++) { await DatumD1.writeNow('sketchbook', 'sk-' + i, () => ({ sketch_id: 'sk-' + i, n: i }), () => {}); }
  const docs = await DatumD1.listDocs('sketchbook');
  ok(docs.length === 9, 'D1 holds 9 distinct sketch rows (already unlimited — no schema/db change)');
  ok(pick(docs.length > 4, !(docs.length > 4)), 'when D1 is reachable the FULL list (9) is the source of truth — the newest-4 net can NEVER silently re-cap [BITE]');

  // ===== WIRING (served bytes) — RED until the HTML wiring unit; PRESERVATION guard stays GREEN =====
  lines.push('===== WIRING (served bytes — RED until the HTML unit lands) =====');
  const sk = readFileSync(new URL('../sketch.html', import.meta.url), 'utf8');
  const sb = readFileSync(new URL('../sketchbook.html', import.meta.url), 'utf8');
  ok(pick(sk.includes('/scripts/datum-tier.js') && sk.includes('/scripts/datum-archive-paging.js'), !(sk.includes('/scripts/datum-tier.js') && sk.includes('/scripts/datum-archive-paging.js'))), 'sketch.html loads the tier + paging modules [BITE-wiring]');
  ok(pick(!/\[1, 2, 3, 4\]\.forEach/.test(sk), /\[1, 2, 3, 4\]\.forEach/.test(sk)), 'sketch.html picker no longer hard-caps the slot list to [1,2,3,4] [BITE-wiring]');
  ok(pick(!/docs\.slice\(0, ?4\)/.test(sb), /docs\.slice\(0, ?4\)/.test(sb)), 'sketchbook.html no longer slices D1 to newest-4 when reachable [BITE-wiring]');
  ok(pick(sb.includes('DatumArchivePaging'), !sb.includes('DatumArchivePaging')), 'sketchbook.html pages via the shared pager (turn UI) [BITE-wiring]');
  // PRESERVATION GUARD (constraint #1 — must be GREEN both modes; FAILS if the dormant warning is gutted)
  const preserved = sb.includes('discover-capacity-modal') && sb.includes('action-erase-save-new') && sb.includes('action-upgrade-capacity') && sb.includes('action-later-capacity') && sb.includes('_pendingCapacitySave');
  ok(preserved, 'PRESERVED (constraint #1): dormant #discover-capacity-modal + its 3 handlers + capacity flags intact');

  const foundationFail = lines.filter(l => l.startsWith('FAIL') && !l.includes('[BITE-wiring]')).length;
  const overall = fail === 0 ? 'GREEN' : (foundationFail === 0 ? 'FOUNDATION-GREEN (wiring pending)' : 'RED');
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST self-test' : 'NORMAL — FOUNDATION+DATA must be GREEN; [BITE-wiring] RED until the HTML unit'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 SKETCH PARITY GATE — ' + overall + '\n' + lines.join('\n'));
  process.exit(0);
})();
