/* DEV-ONLY red-first gate — MISS-5 pre-work item 3: the sketchbook's D1 restore leg in nav.js.

   WHY THIS BLOCKS THE sketchbook_z RETIREMENT. nav.js is the centralised, every-page cross-device restore.
   It has had a D1 leg for the blueprint (_restoreBlueprintFromD1) but NONE for the sketchbook —
   _restoreSketchbook read only meta.sketchbook_z. sketchbook.html has its own D1 restore, but that only runs
   if the user lands on THAT page. Retire sketchbook_z with the gap open and a fresh device recovers the
   sketchbook only when it happens to visit sketchbook.html first: silent, path-dependent data loss.

   THE INVARIANT UNDER TEST (Architect #453, verbatim):
     A reachable-but-empty D1 list is AUTHORITATIVE. The enumerator is D1, ALL N, newest-first, keyed by
     uuid — not a page-local slot index. When D1 answers and answers empty, the sketchbook renders empty and
     must NOT reseed from sketchbook_z or the LS-4 mirror. Only a genuine reject (unreachable) falls back to
     the net. The LS 4-slot survives solely as the signed-out fallback; it is NOT a source of truth and never
     overrides a reachable D1 answer.

   THE NAMED FAILURE the gate reproduces: a user DELETES a sketch, and it RESURRECTS from the lagging mirror
   on the next page load. Today that bug is LATENT precisely because the mirror still covers the ambiguity —
   which is exactly why this leg must exist BEFORE the mirror is retired, not after.

   MUTATIONS:
     --redfirst  reachable-empty falls through to the mirror -> THE DELETED SKETCH COMES BACK.
     --unreach   a genuine reject is treated as empty -> the net is lost on an outage and a real sketchbook
                 goes blank. Proves the two "empty" cases must not share a branch.
*/
import { readFileSync } from 'node:fs';

const MODE = process.argv.includes('--redfirst') ? 'a' : process.argv.includes('--unreach') ? 'b' : null;
const navSrc = readFileSync('nav.js', 'utf8');

const A_EMPTY = 'if (!list || !list.length) { done(); return; }';
const A_CATCH = '}).catch(fallback);                                            // reject = unreachable -> the net';
const A_FN = 'function _restoreSketchbookFromD1(meta, Codec, done) {';
for (const [n, a] of [['reachable-empty', A_EMPTY], ['reject-fallback', A_CATCH], ['fn', A_FN]]) {
  if (!navSrc.includes(a)) throw new Error('anchor missing (' + n + ') — structure moved, re-true this gate');
}

/* ── slice the restore legs out of nav.js ──────────────────────────────────────────────────────────── */
function sliceFn(src, header) {
  const start = src.indexOf(header);
  if (start < 0) throw new Error('sliceFn: not found: ' + header);
  let depth = 0, began = false;
  for (let j = src.indexOf('{', start + header.length - 1); j < src.length; j++) {
    if (src[j] === '{') { depth++; began = true; }
    else if (src[j] === '}') { depth--; if (began && depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sliceFn: unbalanced: ' + header);
}
function build(mode) {
  let body = [
    sliceFn(navSrc, 'function _hasBook()'),
    sliceFn(navSrc, 'function _restoreSketchbook(meta, Codec)'),
    sliceFn(navSrc, 'function _sketchbookD1Live()'),
    sliceFn(navSrc, 'function _commitSketchBook(contracts, done)'),
    sliceFn(navSrc, A_FN)
  ].join('\n');
  if (mode === 'a') {
    const before = body;
    body = body.replace(A_EMPTY, 'if (!list || !list.length) { fallback(); return; }');   // the resurrection bug
    if (body === before) throw new Error('mutation a did not apply');
  }
  if (mode === 'b') {
    const before = body;
    body = body.replace('}).catch(fallback);', '}).catch(function () { done(); });');      // outage read as empty
    if (body === before) throw new Error('mutation b did not apply');
  }
  return body;
}

const BOOK_KEY = 'datumfi_sketchbook_v1';

function makeEnv({ list, docs, listRejects, d1, book }) {
  const store = {};
  if (book) store[BOOK_KEY] = JSON.stringify(book);
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; }
  };
  const DatumD1 = d1 === null ? undefined : Object.assign({
    CUTOVER: true,
    signedIn: () => true,
    listDocs: () => (listRejects ? Promise.reject(new Error('unreachable')) : Promise.resolve(list || [])),
    getDoc: (t, key) => {
      const hit = (docs || {})[key];
      if (hit === 'reject') return Promise.reject(new Error('boom'));
      return Promise.resolve(hit ? { payload: JSON.stringify(hit) } : null);
    }
  }, d1 || {});
  const win = { DatumD1, localStorage };
  win.window = win;
  const api = new Function('window', 'localStorage', '_BOOK_KEY',
    build(MODE) + '\nreturn { d1: _restoreSketchbookFromD1, mirror: _restoreSketchbook, live: _sketchbookD1Live, hasBook: _hasBook };')(
    win, localStorage, BOOK_KEY);
  return { api, store, readBook: () => { try { return JSON.parse(store[BOOK_KEY] || 'null'); } catch (e) { return null; } } };
}
const run = (env, meta, Codec) => new Promise((res) => {
  env.api.d1(meta, Codec, res);
  setTimeout(res, 80);                    // never hang the gate on a leg that forgot to call back
});

/* the lagging Clerk mirror still carrying the sketch the user DELETED */
const DELETED = { sketch_id: 'sk-deleted', title: 'The one I deleted' };
const MIRROR_META = { sketchbook_z: 'ZBLOB' };
const CODEC = { decodeSketchbook: () => ({ sketchbook_title: '', slot_1: DELETED, slot_2: null, slot_3: null, slot_4: null }) };

const checks = [];
const ok = (label, cond) => checks.push([label, !!cond]);

/* ═══ 1 · THE NAMED FAILURE — a deleted sketch must STAY deleted ══════════════════════════════════ */
{
  // D1 is reachable and says: you have no sketches. The mirror disagrees, because it lags.
  const env = makeEnv({ list: [] });
  await run(env, MIRROR_META, CODEC);
  const book = env.readBook();
  ok('reachable-empty D1 -> the deleted sketch does NOT come back [BITE a]',
    !book || !(book.slot_1 || book.slot_2 || book.slot_3 || book.slot_4));
  ok('reachable-empty D1 -> the mirror is NOT decoded into the book at all [BITE a]',
    !JSON.stringify(env.store).includes('The one I deleted'));
}

/* ═══ 2 · UNREACHABLE IS A DIFFERENT ANSWER — the net must still catch ════════════════════════════ */
{
  const env = makeEnv({ listRejects: true });
  await run(env, MIRROR_META, CODEC);
  const book = env.readBook();
  ok('listDocs REJECTS (unreachable) -> the sketchbook_z net DOES restore [BITE b]',
    !!book && !!book.slot_1 && book.slot_1.sketch_id === 'sk-deleted');
}
{
  // listed rows but every fetch failed = a fetch failure, not an empty sketchbook
  const env = makeEnv({ list: [{ doc_key: 'a', updated_at: '2026-07-01' }], docs: { a: 'reject' } });
  await run(env, MIRROR_META, CODEC);
  const book = env.readBook();
  ok('listed rows but ALL getDocs fail -> falls back to the net (not a false empty)',
    !!book && !!book.slot_1);
}

/* ═══ 3 · THE HAPPY PATH — D1 rebuilds the book, newest-first ═════════════════════════════════════ */
{
  const env = makeEnv({
    list: [{ doc_key: 'old', updated_at: '2026-01-01' }, { doc_key: 'new', updated_at: '2026-07-25' },
           { doc_key: 'mid', updated_at: '2026-04-01' }],
    docs: { old: { sketch_id: 'old' }, new: { sketch_id: 'new' }, mid: { sketch_id: 'mid' } }
  });
  await run(env, MIRROR_META, CODEC);
  const book = env.readBook();
  ok('D1 rows rebuild the LS book', !!book && !!book.slot_1);
  ok('and they land NEWEST-FIRST (uuid rows sorted by updated_at, not a page-local slot index)',
    book.slot_1.sketch_id === 'new' && book.slot_2.sketch_id === 'mid' && book.slot_3.sketch_id === 'old');
  ok('the mirror is not consulted when D1 answered', !JSON.stringify(env.store).includes('The one I deleted'));
}
{
  // more than four rows: the 4 slots are a NET, not a cap — D1 keeps ALL N, the book carries the newest 4
  const list = [], docs = {};
  for (let i = 0; i < 7; i++) { list.push({ doc_key: 's' + i, updated_at: '2026-0' + (i + 1) + '-01' }); docs['s' + i] = { sketch_id: 's' + i }; }
  const env = makeEnv({ list, docs });
  await run(env, MIRROR_META, CODEC);
  const book = env.readBook();
  ok('7 D1 rows -> newest 4 fill the LS net, newest-first (no 4-slot cap on the truth)',
    book.slot_1.sketch_id === 's6' && book.slot_4.sketch_id === 's3');
}
{ // an existing custom sketchbook title must survive the rebuild
  const env = makeEnv({ list: [{ doc_key: 'a', updated_at: '2026-07-01' }], docs: { a: { sketch_id: 'a' } },
                        book: { sketchbook_title: 'My Book', slot_1: null, slot_2: null, slot_3: null, slot_4: null } });
  await run(env, MIRROR_META, CODEC);
  ok('a custom sketchbook_title survives the D1 rebuild', env.readBook().sketchbook_title === 'My Book');
}

/* ═══ 4 · LOCAL CACHE WINS · SIGNED-OUT USES THE NET ══════════════════════════════════════════════ */
{
  const env = makeEnv({ list: [], book: { sketchbook_title: '', slot_1: { sketch_id: 'local' }, slot_2: null, slot_3: null, slot_4: null } });
  let consulted = false;
  env.api.d1(MIRROR_META, CODEC, () => {});
  await new Promise((r) => setTimeout(r, 30));
  ok('a populated local book wins — D1 is not consulted at all', env.readBook().slot_1.sketch_id === 'local' && !consulted);
}
{
  const env = makeEnv({ list: [], d1: { CUTOVER: false } });
  ok('CUTOVER=false -> the D1 leg is not live (rollback uses the sketchbook_z net)', env.api.live() === false);
}
{
  const env = makeEnv({ list: [], d1: { signedIn: () => false } });
  ok('signed out -> the D1 leg is not live (LS-4 is the signed-out fallback)', env.api.live() === false);
}
{
  const env = makeEnv({ list: [], d1: null });
  ok('D1 absent entirely -> not live', env.api.live() === false);
}

/* ═══ 5 · WIRING + FENCES ════════════════════════════════════════════════════════════════════════ */
const navCode = navSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok('the every-page restore actually CALLS the D1 leg when live',
  navCode.includes('if (_sbD1) _restoreSketchbookFromD1(meta, C);'));
ok('and still uses the sketchbook_z net when NOT live',
  navCode.includes('else _restoreSketchbook(meta, C);'));
ok('the codec is still loaded whenever a local book is absent and a mirror exists (so the net can decode)',
  navCode.includes('var wantCodec = (!_hasBook() && meta.sketchbook_z)'));
ok('FENCE: this commit does NOT retire the sketchbook_z mirror — sketch.html still writes it',
  readFileSync('sketch.html', 'utf8').includes('window.Clerk.user.update({ unsafeMetadata: _res.merged })'));
ok('FENCE: sketchbook.html keeps its OWN D1 restore (nav.js rebuilds the STORE, the page rebuilds its UI)',
  readFileSync('sketchbook.html', 'utf8').includes('function _sketchbookRestoreFromD1()'));
ok('FENCE: the blueprint leg is untouched', navCode.includes('function _restoreBlueprintFromD1(meta, Codec, done)'));

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */
const pass = checks.filter((c) => c[1]).length;
const label = MODE === 'a' ? 'RED-FIRST a (reachable-empty falls through to the mirror)'
            : MODE === 'b' ? 'RED-FIRST b (a reject is treated as empty)' : 'RUN';
console.log('[' + label + '] MISS-5 item 3 — sketchbook D1 restore leg — ' + pass + '/' + checks.length);
for (const [l, c] of checks) if (!c) console.log('   FAIL · ' + l);
if (MODE && pass === checks.length) { console.log('   !! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
if (!MODE && pass !== checks.length) process.exit(1);
