'use strict';
/* MIRROR-OFF PERSISTENCE GATE (real page) — blueprint_z retirement readiness.
 *
 * WHY THIS EXISTS. The prefs retire shipped behind a stub gate that was 20/20 green, and the Captain's very
 * first live smoke failed: the gate proved WHICH STORE gets written and nothing about whether the write
 * LANDS or the read RETURNS it. blueprint_z guards a user's saved blueprints — the most valuable data in
 * the product — so its readiness is proved on a REAL PAGE, in the world the retirement creates, BEFORE the
 * retirement ships.
 *
 * WHAT THE RETIREMENT CHANGES. Today blueprint_z is rewritten on every save, so it is always fresh and any
 * fall-through to it is harmless. Retired, it FREEZES. Every scenario below therefore seeds Clerk with a
 * STALE blueprint_z and asks whether the frozen copy can win, or whether losing it costs anything.
 *
 * NOT RE-TESTED (already covered — do not fork, L48):
 *   _gate_d1_save_survives_nav.js   a blueprint save survives a fast nav into D1 (writeNow)
 *   _gate_d1_archive_render.js      Blueprint.html real render + erase -> D1 delete, no resurrect
 *   _gate_d1_blueprints.mjs         save fidelity / unlimited rows / dual-write
 *
 * THE BLUEPRINT-CODEC GAP THIS GATE WAS BUILT TO EXPOSE — NOW CLOSED. nav.js used to compute
 *     wantCodec = (!_hasBook() && meta.sketchbook_z) || (!_bpD1 && !_hasArch() && meta.blueprint_z)
 * The blueprint clause was gated on !_bpD1, so when D1 was LIVE the archive codec was never loaded. If
 * listDocs then REJECTED (a genuine outage), fallback() ran _restoreBlueprint(meta, null) and the
 * blueprint_z net silently decoded NOTHING — the escape route dead in exactly the situation it exists for.
 * While the mirror was still written that was merely latent; retiring blueprint_z first would have made it
 * a live data-loss path on any D1 outage — the same latent->live conversion pre-work item 3 prevented for
 * the sketchbook. The SKETCHBOOK clause never carried an _sbD1 term, which is why its equivalent scenario
 * always passed; that contrast was the argument for the fix. The `!_bpD1` term is now gone and this gate is
 * GREEN; --regap puts it back and the outage scenario goes RED again.
 *
 * MUTATIONS:
 *   --redfirst  reachable-empty falls through to the mirror -> a DELETED blueprint resurrects. Before the
 *               codec fix this mutation could NOT bite on its own: with no codec the mirror could not decode
 *               at all, so it could not resurrect either — the gap MASKED the resurrection risk. Now that
 *               the codec loads, the risk is real and the guard is what holds it back, so this bites alone.
 *   --regap     puts the !_bpD1 term BACK into wantCodec — the exact pre-fix code — and the outage
 *               scenario goes RED again: a D1 outage restores no blueprints from blueprint_z.
 *   --clobber   the D1 restore runs over a populated local archive -> bp-local, a row D1 has NEVER
 *               HEARD OF, is discarded. The control for leg (i).
 *   --union     the D1 rows are folded in AND the local archive is kept -> bp-local SURVIVES. (i)
 *               stays GREEN, only (ii) reds. The DISCRIMINATING control; see the leg-4 note.
 *
 * SCENARIO 4 WAS ONE ASSERTION UNTIL 2026-08-16 AND IS NOW TWO — twin of the split in
 * _gate_miss5_sketchbook_persist.js, made in the same commit and for the same reason. The full
 * argument lives at the leg itself.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const REGAP = process.argv.includes('--regap');
const CLOBBER = process.argv.includes('--clobber');
const UNION = process.argv.includes('--union');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
// Named results for the two halves of leg 4 — so a bite check can assert WHICH leg moved rather than
// reading `fail > 0` and calling it proof. A red somewhere else is not this red.
let legI = null, legII = null;

/* EXACTLY ONE MATCH, ENFORCED — twin of the helper in the sketchbook gate. The comment at A_EMPTY
 * below already records why: an anchor that exists in BOTH restore legs sends String.replace to the
 * wrong one, the mutation "does not bite", and the gate reports a false green about code it never
 * touched. A MISSING anchor and an AMBIGUOUS one are the same defect, so both throw.
 * ⚠️ MEASURED 2026-08-16, and it is not hypothetical here: the obvious one-line anchor for the
 * commit tail below — `try { localStorage.setItem(_BP_ARCH_KEY, ...) } catch(_e) {}` — occurs TWICE
 * in nav.js. A_COMMIT is anchored on two lines for exactly that reason. */
function mutate(src, anchor, repl, label) {
  let n = 0, i = 0;
  while ((i = src.indexOf(anchor, i)) >= 0) { n++; i++; }
  if (n === 0) throw new Error('anchor MISSING for ' + label + ' — nav.js moved under this gate');
  if (n > 1) throw new Error('anchor AMBIGUOUS (' + n + ' matches) for ' + label + ' — replace would take the first, not the intended one');
  return src.replace(anchor, repl);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
// Unique anchor: this exact line exists in BOTH restore legs, and String.replace takes the first match —
// the naive literal would mutate whichever comes first rather than the one under test.
const A_EMPTY = [
  '// The blueprint_z fallback survives ONLY on the .catch below (listDocs REJECTS = genuinely unreachable).',
  '        if (!list || !list.length) { done(); return; }'
].join('\n');
const A_EMPTY_MUT = [
  '// [mutated: reachable-empty falls through to the frozen mirror]',
  '        if (!list || !list.length) { fallback(); return; }'
].join('\n');
const A_CODEC = 'var wantCodec = (!_hasBook() && meta.sketchbook_z) || (!_hasArch() && meta.blueprint_z);';
const A_CODEC_REGAP = 'var wantCodec = (!_hasBook() && meta.sketchbook_z) || (!_bpD1 && !_hasArch() && meta.blueprint_z);';

// ── THE TWO LEG-4 CONTROLS ───────────────────────────────────────────────────────────────────────
const A_LOCALWINS = 'if (_hasArch()) { done(); return; }';
// --clobber is the §51.3 shape: delete `local cache wins` so the D1 restore runs over a populated archive.
const M_CLOBBER = '/* [mutated: local cache wins removed — the D1 restore runs over a populated archive] */';
// --union keeps the local archive AND folds the D1 rows in beside it, so the row the server has never
// heard of survives. Leg (i) holds, leg (ii) fails, and THAT ASYMMETRY IS THE POINT OF THE SPLIT.
const M_UNION_STASH = "if (_hasArch()) { try { window.__unionStash = JSON.parse(localStorage.getItem(_BP_ARCH_KEY) || 'null'); } catch (_e) {} }";
// TWO LINES, NOT ONE — the setItem line alone occurs twice in nav.js (mutate() would throw AMBIGUOUS).
const A_COMMIT = [
  '    try { localStorage.setItem(_BP_ARCH_KEY, JSON.stringify(out)); } catch(_e) {}',
  '    done();'
].join('\n');
const M_COMMIT_UNION = [
  '    var _u = window.__unionStash;',
  '    if (_u) { for (var _j = 1; _j <= 4; _j++) {',
  "      var _o = _u['slot' + _j]; if (!_o) continue;",
  '      var _dup = false;',
  "      for (var _k = 1; _k <= 4; _k++) { var _b = out['slot' + _k]; if (_b && _b.blueprint_id === _o.blueprint_id) _dup = true; }",
  '      if (_dup) continue;',
  "      for (var _m = 1; _m <= 4; _m++) { if (!out['slot' + _m]) { out['slot' + _m] = _o; break; } }",
  '    } }',
  A_COMMIT
].join('\n');

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/nav.js') {
    let s = body.toString('utf8');
    if (RF) s = mutate(s, A_EMPTY, A_EMPTY_MUT, '--redfirst (reachable-empty)');
    if (REGAP) s = mutate(s, A_CODEC, A_CODEC_REGAP, '--regap (wantCodec) — was the codec fix reverted?');
    if (CLOBBER) s = mutate(s, A_LOCALWINS, M_CLOBBER, '--clobber (local cache wins)');
    if (UNION) {
      s = mutate(s, A_LOCALWINS, M_UNION_STASH, '--union (stash the local archive)');
      s = mutate(s, A_COMMIT, M_COMMIT_UNION, '--union (fold the local archive back in)');
    }
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8213; const base = 'http://127.0.0.1:' + PORT;
const ARCH_KEY = 'datumfi_blueprint_archive_v1';

// A REAL blueprint_z blob, built IN THE BROWSER with the repo's own lz-string + codec, so the decode path
// under test is the one that actually runs.
async function realBlueprintZ(browser, arch) {
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
  const z = await page.evaluate((a) => window.DatumArchiveCodec.encodeBlueprintArchive(a), arch);
  await ctx.close();
  return z;
}

const bp = (id, name) => ({ blueprint_id: id, schema: 'DatumFIBlueprintV1', saved_at: '2026-07-01T00:00:00Z',
  version: 1, profile: { name: name }, accounts: [], contributions_total: 0, portfolio_total: 0 });
const STALE_ARCH = { slot1: bp('bp-DELETED', 'the one the user erased'), slot2: null, slot3: null, slot4: null };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BPZ = await realBlueprintZ(browser, STALE_ARCH);
  if (!BPZ || typeof BPZ !== 'string' || !BPZ.length) throw new Error('fixture: could not build a real blueprint_z blob');

  async function device({ rows, listRejects, seedArch }) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u).searchParams;
        if (q.get('list') === '1') {
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
    await page.addInitScript(({ bpz, seed, ARCH_KEY }) => {
      try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
      window.Clerk = { load: function () { return Promise.resolve(); },
        session: { getToken: function () { return Promise.resolve('tok'); } },
        user: { id: 'bpuser', unsafeMetadata: { blueprint_z: bpz },   // FROZEN mirror, post-retire shape
          update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); },
          firstName: 'BP', primaryEmailAddress: { emailAddress: 'bp@bp.co' } } };
      if (seed) { try { localStorage.setItem(ARCH_KEY, JSON.stringify(seed)); } catch (e) {} }
    }, { bpz: BPZ, seed: seedArch || null, ARCH_KEY });
    await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    const arch = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, ARCH_KEY);
    await ctx.close();
    return { arch, errs };
  }

  const ids = (a) => (a ? [a.slot1, a.slot2, a.slot3, a.slot4].filter(Boolean).map((s) => s.blueprint_id) : []);
  const anySlot = (a) => !!(a && (a.slot1 || a.slot2 || a.slot3 || a.slot4));

  // ═══ 1 · D1 HAS THE TRUTH — the frozen mirror must not be consulted ═══
  {
    const { arch, errs } = await device({ rows: {
      'bp-new-A': { updated_at: '2026-07-20', payload: bp('bp-new-A', 'A') },
      'bp-new-B': { updated_at: '2026-07-25', payload: bp('bp-new-B', 'B') }
    } });
    const got = ids(arch);
    ok(got.length === 2 && got.indexOf('bp-new-A') >= 0 && got.indexOf('bp-new-B') >= 0,
      'fresh device rebuilds the archive from D1 (nav.js leg, real page) — got ' + JSON.stringify(got));
    ok(got.indexOf('bp-DELETED') < 0, 'the STALE blueprint_z contributes nothing when D1 answered');
    ok(arch && arch.slot1 && arch.slot1.blueprint_id === 'bp-new-B', 'newest-first ordering holds');
    ok(errs.length === 0, 'no page errors: ' + JSON.stringify(errs.slice(0, 2)));
  }

  // ═══ 2 · REACHABLE-EMPTY — a deleted blueprint must NOT resurrect ═══
  {
    const { arch } = await device({ rows: {} });
    ok(!anySlot(arch),
      'D1 reachable and EMPTY -> the erased blueprint does NOT resurrect from the frozen mirror [BITE redfirst]');
  }

  // ═══ 3 · THE PRECONDITION — a genuine outage must still reach the net ═══
  {
    const { arch } = await device({ listRejects: true });
    ok(anySlot(arch),
      'D1 UNREACHABLE -> the blueprint_z net DOES restore (the archive codec is loaded) [BITE regap]');
  }

  // ═══ 4 · A POPULATED LOCAL ARCHIVE — ONE ASSERTION UNTIL 2026-08-16, NOW TWO ═══
  //
  // It used to read `ok(ids(arch).join() === 'bp-local', 'a populated local archive is left alone
  // (local cache wins)')`, and that `===` was later cited as a deliberate ruling that a local copy
  // beats a NEWER server row.
  // ⛔ THIS FIXTURE CANNOT SUPPORT THAT READING. Measured 2026-08-16: `bp()` hard-codes
  //    saved_at:'2026-07-01T00:00:00Z' on EVERY fixture in this file, so the local seed and the D1
  //    payload it is compared against carry the SAME saved_at — equal, not older. The '2026-07-20'
  //    lives on the D1 LIST ROW's `updated_at`, inherited from leg 1 (which needs it for ordering),
  //    and nav.js:858-862 rules that field is the RETENTION key with a deliberately different intent.
  //    No timestamp comparison is made here at all.
  // ⭐ AND THE FACT THAT DECIDES IT: `bp-local` APPEARS IN NO D1 LIST HERE. It is not a stale version
  //    of a server row — it is a row the server has NEVER HEARD OF. That is SET MEMBERSHIP, not
  //    precedence; every whole-store precedence rule discards the loser's rows instead of superseding
  //    them, so none of them can express it.
  // 🔑 AN ASSERTION THAT BUNDLES A RULED CLAIM WITH AN UNRULED ONE LENDS THE SECOND THE AUTHORITY OF
  //    THE FIRST.
  {
    const seed = { slot1: bp('bp-local', 'mine'), slot2: null, slot3: null, slot4: null, activeBlueprintSlot: 1 };
    const { arch } = await device({ rows: { 'bp-new-A': { updated_at: '2026-07-20', payload: bp('bp-new-A', 'A') } }, seedArch: seed });
    const got = ids(arch);
    // (i) RULED AND ABSOLUTE — no mechanism may discard a row the user created and the server has
    //     never seen. Must hold under any precedence rule anyone ever adopts.
    legI = got.indexOf('bp-local') >= 0;
    ok(legI, '(i) NO DATA LOSS — a local row D1 has never seen SURVIVES the restore [BITE clobber] — got ' + JSON.stringify(got));
    // (ii) NEVER RULED — an artifact of the original `===`: it claims the store is not merely
    //      preserved but UNTOUCHED. Kept as a real assertion, named so it cannot be mistaken for (i).
    legII = got.join() === 'bp-local';
    ok(legII, '(ii) NO CHANGE AT ALL — nothing from D1 is folded in beside it (NEVER RULED) [BITE clobber, union] — got ' + JSON.stringify(got));
  }

  await browser.close(); server.close();

  const mode = RF ? 'RED-FIRST (reachable-empty falls to the mirror — MUST be RED)'
             : REGAP ? 'RED-FIRST (--regap: !_bpD1 restored — MUST be RED)'
             : CLOBBER ? 'RED-FIRST (--clobber: local cache wins removed — leg (i) MUST be RED)'
             : UNION ? 'RED-FIRST (--union: D1 folded in, local row kept — (i) GREEN, (ii) RED)'
             : 'NORMAL';
  const MUT = RF || REGAP || CLOBBER || UNION;
  console.log(lines.join('\n'));
  console.log('-------------------------------------');
  console.log('MODE: ' + mode + '   |   blueprint_z mirror-OFF persistence (real page)');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  if (MUT && fail === 0) { console.log('!! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
  // A COUNT IS NOT A LIST: `fail > 0` is satisfied by a red anywhere, including one the mutation
  // caused by accident. Each control names the leg it must move.
  if (CLOBBER && legI !== false) {
    console.log('!! --clobber did not red leg (i) — the DATA-LOSS claim is unproven'); process.exit(2);
  }
  if (UNION && !(legI === true && legII === false)) {
    console.log('!! --union must leave (i) GREEN and red (ii) ALONE — got (i)=' + legI + ' (ii)=' + legII);
    console.log('!! without that asymmetry the two legs are one assertion wearing two labels');
    process.exit(2);
  }
  if (!MUT && fail > 0) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
