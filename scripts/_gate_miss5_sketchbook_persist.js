'use strict';
/* MIRROR-OFF PERSISTENCE GATE (real page) — sketchbook_z retirement readiness.
 *
 * WHY THIS EXISTS. The prefs retire (48b5ab0) shipped behind a gate that was 20/20 green on an eight-state
 * enumeration of the predicate complement — and the Captain's very first live smoke failed. That gate proved
 * WHICH STORE gets written and nothing about whether the write LANDS or the read RETURNS it. sketchbook_z
 * guards far more valuable data than a workspace name, so its readiness is proved on a REAL PAGE, in the
 * world the retirement creates, BEFORE the retirement ships.
 *
 * WHAT THE RETIREMENT ACTUALLY CHANGES. Today sketchbook_z is written on every save, so it is always fresh
 * and any fall-through to it is harmless. Retired, it FREEZES at whatever it held on retire day. Every
 * assertion below therefore seeds Clerk with a STALE mirror and asks whether the frozen copy can win. That
 * is exactly the shape of the prefs failure, moved forward of the ship instead of after it.
 *
 * WHAT IS DELIBERATELY *NOT* RE-TESTED (already covered — do not fork, L48):
 *   _gate_d1_sketchbook_read.js      sketchbook.html read-cutover, reachable-empty, reject-fallback, delete
 *   _gate_d1_sketch_xdev_delete.js   true cross-device delete with a stale Clerk net on device B
 *   _gate_miss5_sketchbook_d1.mjs    the nav.js leg at unit level (this is its first REAL-PAGE proof)
 *
 * THE SUBJECT HERE is nav.js's EVERY-PAGE restore leg (_restoreSketchbookFromD1, shipped 0e1a9c2), driven
 * on a page that is NOT sketchbook.html — because that is the path a fresh device actually takes, and the
 * path that had no D1 leg at all until item 3.
 *
 * MUTATIONS:
 *   --redfirst  nav.js reachable-empty falls through to the mirror -> a DELETED sketch resurrects from the
 *               frozen net on an ordinary page load.
 *   --nocodec   the sketchbook codec is gated on D1 being live (the shape the BLUEPRINT clause still has)
 *               -> on a genuine D1 outage the frozen net decodes nothing and the book comes back EMPTY.
 *               This is the blueprint-codec gap, demonstrated on the sketchbook to show what it costs.
 *   --clobber   the D1 restore runs over a populated local book -> sk-local, a row D1 has NEVER HEARD OF,
 *               is discarded. The control for leg (i).
 *   --union     the D1 rows are folded in AND the local book is kept -> sk-local SURVIVES. (i) stays
 *               GREEN, only (ii) reds. The DISCRIMINATING control; see the leg-4 note below.
 *
 * SCENARIO 4 WAS ONE ASSERTION UNTIL 2026-08-16 AND IS NOW TWO — see the note at the leg itself. The
 * short version: `slots(book).join() === 'sk-local'` bundled a RULED claim (no data loss) with an
 * UNRULED one (nothing else may appear), and the bundle lent the second the authority of the first.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const NC = process.argv.includes('--nocodec');
// --hazard drives a page that loads nav.js but NOT datum-d1.js (index/philosophy/pricing/range/404/
// methodology). There, window.DatumD1 is undefined, so nav.js cannot use its D1 leg and rebuilds the LS
// book from the Clerk mirror instead. Harmless TODAY because the mirror is written on every save. After
// sketchbook_z retires the mirror is FROZEN, so that same path seeds localStorage from stale data — and
// because "local cache wins", the stale book then suppresses the D1 restore on the next capable page.
// Kept as an opt-in mode rather than a standing red so the suite stays honest while the gap is open.
const HZ = process.argv.includes('--hazard');
const CLOBBER = process.argv.includes('--clobber');
const UNION = process.argv.includes('--union');
const HOST = HZ ? '/philosophy.html' : '/Blueprint.html';   // Blueprint.html loads nav.js AND datum-d1.js
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
// Named results for the two halves of leg 4, so the mutation-bite checks can assert WHICH leg moved
// rather than reading `fail > 0` and calling it proof. A red somewhere else is not this red.
let legI = null, legII = null;

/* EXACTLY ONE MATCH, ENFORCED — the ambiguity check this file paid for. The header at A_EMPTY records
 * an anchor that existed TWICE in nav.js: String.replace took the first, the mutation landed in the
 * BLUEPRINT leg, "did not bite", and the gate reported a false green about code it had never touched.
 * A MISSING anchor and an AMBIGUOUS one are the same defect — the mutation did not go where it was
 * aimed — so both throw here instead of only the first being noticed. */
function mutate(src, anchor, repl, label) {
  let n = 0, i = 0;
  while ((i = src.indexOf(anchor, i)) >= 0) { n++; i++; }
  if (n === 0) throw new Error('anchor MISSING for ' + label + ' — nav.js moved under this gate');
  if (n > 1) throw new Error('anchor AMBIGUOUS (' + n + ' matches) for ' + label + ' — replace would take the first, not the intended one');
  return src.replace(anchor, repl);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
// ANCHOR MUST BE UNIQUE. This exact line exists TWICE in nav.js — once in _restoreBlueprintFromD1 (261)
// and once in _restoreSketchbookFromD1 (312) — and String.replace takes the FIRST match, so the naive
// literal silently mutated the BLUEPRINT leg and left the sketchbook untouched. The mutation then "did not
// bite" and the gate reported a false green: it was proving nothing about the code under test. Anchor on
// the sketchbook leg's own preceding comment so the replacement can only land in the intended function.
const A_EMPTY = [
  '// "empty because unreachable" are different answers and must not share a branch.',
  '        if (!list || !list.length) { done(); return; }'
].join('\n');
const A_EMPTY_MUT = [
  '// [mutated: reachable-empty falls through to the frozen mirror]',
  '        if (!list || !list.length) { fallback(); return; }'
].join('\n');
const A_CODEC = 'var wantCodec = (!_hasBook() && meta.sketchbook_z)';

// ── THE TWO LEG-4 CONTROLS ───────────────────────────────────────────────────────────────────────
// Verified unique in nav.js before use (mutate() re-checks on every run). The naive blueprint-side
// equivalent of A_COMMIT is NOT unique, which is why that one is anchored on two lines, not one.
const A_LOCALWINS = 'if (_hasBook()) { done(); return; }';
// --clobber is the §51.3 shape: delete `local cache wins` so the D1 restore runs over a populated book.
const M_CLOBBER = '/* [mutated: local cache wins removed — the D1 restore runs over a populated book] */';
// --union keeps the local book AND folds the D1 rows in beside it. The row the server has never heard
// of survives, so leg (i) holds while leg (ii) fails. THAT ASYMMETRY IS THE POINT OF THE SPLIT: it
// exhibits a mechanism that satisfies the ruled claim and violates only the unruled one. Without this
// control the two legs could be one assertion wearing two labels.
const M_UNION_STASH = "if (_hasBook()) { try { window.__unionStash = JSON.parse(localStorage.getItem(_BOOK_KEY) || 'null'); } catch (_e) {} }";
const A_COMMIT = "for (var n = 1; n <= 4; n++) book['slot_' + n] = contracts[n - 1] || null;";
const M_COMMIT_UNION = A_COMMIT + '\n' + [
  '    var _u = window.__unionStash;',
  '    if (_u) { for (var _j = 1; _j <= 4; _j++) {',
  "      var _o = _u['slot_' + _j]; if (!_o) continue;",
  '      var _dup = false;',
  "      for (var _k = 1; _k <= 4; _k++) { var _b = book['slot_' + _k]; if (_b && _b.sketch_id === _o.sketch_id) _dup = true; }",
  '      if (_dup) continue;',
  "      for (var _m = 1; _m <= 4; _m++) { if (!book['slot_' + _m]) { book['slot_' + _m] = _o; break; } }",
  '    } }'
].join('\n');

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/nav.js') {
    let s = body.toString('utf8');
    if (RF) s = mutate(s, A_EMPTY, A_EMPTY_MUT, '--redfirst (reachable-empty)');
    if (NC) s = mutate(s, A_CODEC, 'var wantCodec = (!_sbD1 && !_hasBook() && meta.sketchbook_z)', '--nocodec (wantCodec)');
    if (CLOBBER) s = mutate(s, A_LOCALWINS, M_CLOBBER, '--clobber (local cache wins)');
    if (UNION) {
      s = mutate(s, A_LOCALWINS, M_UNION_STASH, '--union (stash the local book)');
      s = mutate(s, A_COMMIT, M_COMMIT_UNION, '--union (fold the local book back in)');
    }
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8211; const base = 'http://127.0.0.1:' + PORT;
const BOOK_KEY = 'datumfi_sketchbook_v1';

// A REAL sketchbook_z blob, built IN THE BROWSER with the repo's own lz-string + codec. Building it in
// node risked a compressor mismatch, and when it failed the fixture silently fell back to the LEGACY
// `sketchbook` key — which decodes WITHOUT a codec, so the --nocodec mutation had nothing to bite. The
// blob must be the compressed one or the codec is not actually on the path under test.
async function realSketchbookZ(browser, base, book) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:')) return route.continue();
    return route.abort();
  });
  await page.goto(base + '/philosophy.html', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ url: '/scripts/lz-string.min.js' });
  await page.addScriptTag({ url: '/scripts/datum-archive-codec.js' });
  const z = await page.evaluate((b) => window.DatumArchiveCodec.encodeSketchbook(b), book);
  await ctx.close();
  return z;
}

const STALE = { sketchbook_title: 'Stale Book',
  slot_1: { sketch_id: 'sk-DELETED', label: 'the one the user erased' },
  slot_2: null, slot_3: null, slot_4: null };
const FRESH_A = { sketch_id: 'sk-new-A', label: 'A' };
const FRESH_B = { sketch_id: 'sk-new-B', label: 'B' };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const SBZ = await realSketchbookZ(browser, base, STALE);
  if (!SBZ || typeof SBZ !== 'string' || !SBZ.length) throw new Error('fixture: could not build a real sketchbook_z blob');

  // one fresh device per scenario; each gets its own D1 fixture
  async function device({ rows, listRejects, seedLocalBook }) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u).searchParams;
        if (q.get('list') === '1' || (!q.get('key') && req.method() === 'GET')) {
          if (listRejects) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ documents: Object.keys(rows || {}).map((k) => ({ doc_key: k, updated_at: rows[k].updated_at })) }) });
        }
        const key = q.get('key');
        if (rows && rows[key]) return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ payload: JSON.stringify(rows[key].payload), revision: 1 }) });
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(({ sbz, stale, seed, BOOK_KEY }) => {
      try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
      const meta = {};
      if (sbz) meta.sketchbook_z = sbz; else meta.sketchbook = stale;   // FROZEN mirror, post-retire shape
      window.Clerk = { load: function () { return Promise.resolve(); },
        session: { getToken: function () { return Promise.resolve('tok'); } },
        user: { id: 'sbuser', unsafeMetadata: meta,
          update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); },
          firstName: 'SB', primaryEmailAddress: { emailAddress: 'sb@sb.co' } } };
      if (seed) { try { localStorage.setItem(BOOK_KEY, JSON.stringify(seed)); } catch (e) {} }
    }, { sbz: SBZ, stale: STALE, seed: seedLocalBook || null, BOOK_KEY });
    await page.goto(base + HOST, { waitUntil: 'load' });   // NOT sketchbook.html — nav.js's own leg
    await page.waitForTimeout(1500);
    const book = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, BOOK_KEY);
    await ctx.close();
    return { book, errs };
  }

  // Two different readers, because the two sources round-trip differently and conflating them hid a bug.
  // D1 payloads come back as raw JSON, so sketch_id survives and can be asserted by id. The MIRROR goes
  // through the codec, which serialises a slot into its fixed numeric sketch schema — a toy fixture's
  // sketch_id does NOT survive that. Keying the "did it resurrect?" check on sketch_id therefore reported
  // an empty book whether or not the mirror had restored: a false green. Slot PRESENCE is the honest test
  // for the mirror path, and the codec-preserved title identifies where the book came from.
  const slots = (b) => (b ? [b.slot_1, b.slot_2, b.slot_3, b.slot_4].filter(Boolean).map((s) => s.sketch_id) : []);
  const anySlot = (b) => !!(b && (b.slot_1 || b.slot_2 || b.slot_3 || b.slot_4));
  const fromMirror = (b) => !!(b && b.sketchbook_title === 'Stale Book' && b.slot_1);

  // ═══ 1 · D1 HAS THE TRUTH — the frozen mirror must not be consulted ═══
  {
    const { book, errs } = await device({ rows: {
      'sk-new-A': { updated_at: '2026-07-20', payload: FRESH_A },
      'sk-new-B': { updated_at: '2026-07-25', payload: FRESH_B }
    } });
    const got = slots(book);
    ok(got.length === 2 && got.indexOf('sk-new-A') >= 0 && got.indexOf('sk-new-B') >= 0,
      'fresh device on an ORDINARY page rebuilds the book from D1 (nav.js leg, real page) — got ' + JSON.stringify(got));
    ok(got.indexOf('sk-DELETED') < 0, 'the STALE mirror contributes nothing when D1 answered');
    ok(book && book.slot_1 && book.slot_1.sketch_id === 'sk-new-B', 'newest-first ordering holds on the real page');
    ok(errs.length === 0, 'no page errors: ' + JSON.stringify(errs.slice(0, 2)));
  }

  // ═══ 2 · REACHABLE-EMPTY — a deleted sketch must NOT resurrect from the frozen net ═══
  {
    const { book } = await device({ rows: {} });
    ok(!anySlot(book) && !fromMirror(book),
      'D1 reachable and EMPTY -> the erased sketch does NOT resurrect from the frozen mirror [BITE redfirst]');
  }

  // ═══ 3 · GENUINE OUTAGE — the net must still work, or retirement is a cliff ═══
  {
    const { book } = await device({ listRejects: true });
    ok(fromMirror(book),
      'D1 UNREACHABLE -> the sketchbook_z net DOES restore, codec and all [BITE nocodec]');
  }

  // ═══ 4 · A POPULATED LOCAL BOOK — ONE ASSERTION UNTIL 2026-08-16, NOW TWO ═══
  //
  // It used to read `ok(slots(book).join() === 'sk-local', 'a populated local book is left alone
  // (local cache wins)')`. That `===` bundled two claims of very different standing, and the bundle
  // was then cited as a deliberate ruling that a local copy beats a NEWER server row.
  // ⛔ IT IS NOT ONE, AND THIS FIXTURE CANNOT SUPPORT THE READING. Measured 2026-08-16: there is no
  //    timestamp comparison here at all. The local book below carries NO timestamp field of any kind,
  //    and the '2026-07-20' the argument rested on sits on the D1 LIST ROW's `updated_at` — which
  //    nav.js:858-862 rules is the RETENTION key, deliberately a different intent from precedence
  //    ("Same-looking comparator, different intent. Do NOT unify them."). The value is inherited from
  //    leg 1, which needs it for newest-first ordering.
  // ⭐ AND THE FACT THAT DECIDES IT: `sk-local` APPEARS IN NO D1 LIST HERE. It is not a stale version
  //    of a server row — it is a row the server has NEVER HEARD OF. That is SET MEMBERSHIP, not
  //    precedence, and no whole-store precedence rule (local-wins, server-wins, newest-wins) can
  //    express it: each one discards the loser's rows rather than superseding them.
  // 🔑 AN ASSERTION THAT BUNDLES A RULED CLAIM WITH AN UNRULED ONE LENDS THE SECOND THE AUTHORITY OF
  //    THE FIRST. Split, named, and each given its own control.
  {
    const local = { sketchbook_title: 'Mine', slot_1: { sketch_id: 'sk-local' }, slot_2: null, slot_3: null, slot_4: null };
    const { book } = await device({ rows: { 'sk-new-A': { updated_at: '2026-07-20', payload: FRESH_A } }, seedLocalBook: local });
    const got = slots(book);
    // (i) RULED AND ABSOLUTE — no mechanism may discard a row the user created and the server has
    //     never seen. This must hold under any precedence rule anyone ever adopts. --clobber is its
    //     control; --union must leave it GREEN, which is what makes it a claim and not a restatement
    //     of (ii).
    legI = got.indexOf('sk-local') >= 0;
    ok(legI, '(i) NO DATA LOSS — a local row D1 has never seen SURVIVES the restore [BITE clobber] — got ' + JSON.stringify(got));
    // (ii) NEVER RULED — an artifact of the original `===`. It claims the store is not merely
    //      preserved but UNTOUCHED. Kept as a real assertion so that changing it is visible and
    //      deliberate, and named so it can never again be mistaken for (i).
    legII = got.join() === 'sk-local';
    ok(legII, '(ii) NO CHANGE AT ALL — nothing from D1 is folded in beside it (NEVER RULED) [BITE clobber, union] — got ' + JSON.stringify(got));
  }

  await browser.close(); server.close();

  const mode = RF ? 'RED-FIRST (reachable-empty falls to the mirror — MUST be RED)'
             : NC ? 'RED-FIRST (codec gated on D1-live — MUST be RED)'
             : CLOBBER ? 'RED-FIRST (--clobber: local cache wins removed — leg (i) MUST be RED)'
             : UNION ? 'RED-FIRST (--union: D1 folded in, local row kept — (i) GREEN, (ii) RED)'
             : 'NORMAL';
  const MUT = RF || NC || CLOBBER || UNION;
  console.log(lines.join('\n'));
  console.log('-------------------------------------');
  console.log('MODE: ' + mode + '   |   sketchbook_z mirror-OFF persistence (real page)');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  if (!MUT && fail > 0) process.exit(1);
  if (MUT && fail === 0) { console.log('!! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
  // A COUNT IS NOT A LIST: `fail > 0` would be satisfied by a red anywhere in the file, including one
  // the mutation caused by accident. Each control names the leg it must move.
  if (CLOBBER && legI !== false) {
    console.log('!! --clobber did not red leg (i) — the DATA-LOSS claim is unproven'); process.exit(2);
  }
  if (UNION && !(legI === true && legII === false)) {
    console.log('!! --union must leave (i) GREEN and red (ii) ALONE — got (i)=' + legI + ' (ii)=' + legII);
    console.log('!! without that asymmetry the two legs are one assertion wearing two labels');
    process.exit(2);
  }
})().catch((e) => { console.error(e); process.exit(1); });
