/* DEV-ONLY red-first gate — Real Estate Ask 2: the comps must SURVIVE LOGOUT (Architect #443).

   THE BUG (Captain report): clicking "Get estimate" returns a value range plus ~10 recent comparable sales.
   Log out, come back, and only the ACCEPTED dollar value is still there — the range and the comps are gone.
   Re-reading them costs another of the 50 free RentCast lookups a month.

   ROOT CAUSE, grounded: the estimate lived at `acc._avmLast`, and scripts/studio-blueprint.js:399
   (toD1Document) drops EVERY key whose name starts with "_" on the way to D1 — the comment on line 392 even
   names _avmLast out loud. With datum-d1.js:285 CUTOVER:true, D1 is the sole truth for the active Studio doc,
   so that single character in the key name is the entire bug.

   THE FIX under test: one NON-underscore snapshot, `acc.assetAvmSnapshot`, carrying
   { address, key, keyTyped, estimate, range{low,high}, comps[], stamp, pulledAt } — written ONLY on a real
   successful fetch (L47), cleared on a confirmed not-found, keyed to the address ON SCREEN so it can never be
   shown beside a home it does not describe, and stamped at pull time so a persisted lookup reports the date it
   was ACTUALLY pulled.

   WHY THIS GATE DRIVES THE REAL toD1Document: the whole question is "what survives the trip out of the
   browser." Asserting on a variable we set ourselves would prove nothing — a gate must reproduce the SYMPTOM
   through the app's own path. So we slice the REAL persistence function out of studio-blueprint.js and the
   REAL reader/renderer out of studio.html, and assert on what comes out the far side.

   THE TWO MUTATIONS (proven to bite before the fix was written):
     a  --redfirst  restores the underscore key (assetAvmSnapshot -> _avmSnapshot) — the EXACT pre-fix storage
                    shape. toD1Document strips it, the comps vanish in transit, and every survival assertion
                    goes RED with the same symptom the Captain reported.
     b  --stale     restores the pre-Ask-2 key precedence (propAddress first, which updateAccField never
                    clears) so a stale snapshot survives an address edit — the de-dupe assertions bite, and so
                    does the one that proves a changed address still costs its one honest call.
*/
import { readFileSync } from 'node:fs';
import { extractClosure, extractFn } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const MODE = process.argv.includes('--redfirst') ? 'a' : process.argv.includes('--stale') ? 'b' : null;
const src = studioSource();
const sb = readFileSync('scripts/studio-blueprint.js', 'utf8');

/* ── anchors: if the structure moved, FAIL LOUD rather than silently testing nothing ───────────────── */
const A_KEY   = 'acc.assetAvmSnapshot = snap;';
const A_LIVE  = "function _groundsLiveAddr(acc) { return _groundsJoinedAddr(acc) || String(acc.propAddress || ''); }";
const A_CLEAR = 'acc.assetAvmSnapshot = null;';
const A_DEDUPE = 'if (have && (Date.now() - (have.pulledAt || 0)) < _AssetIntel.REFRESH_MS) {';
for (const [n, a] of [['write', A_KEY], ['live-addr', A_LIVE], ['not-found clear', A_CLEAR], ['de-dupe', A_DEDUPE]]) {
  if (!src.includes(a)) throw new Error('anchor missing (' + n + ') — structure moved, re-true this gate');
}
if (!sb.includes("k.charAt(0) !== '_'")) throw new Error('anchor missing (toD1Document strip) — re-true this gate');

/* ── the REAL persistence path, sliced out of studio-blueprint.js ──────────────────────────────────── */
const persist = new Function(extractFn(sb, 'toD1Document') + '\nreturn toD1Document;')();

/* ── the REAL reader / builder / renderer, sliced out of studio.html ───────────────────────────────── */
function buildApi(mode) {
  // _groundsCompRow is passed BY REFERENCE (comps.map(_groundsCompRow)) so the walker's `ident(` scan cannot
  // see it — name it as a root explicitly, or the comps render throws instead of asserting.
  let body = extractClosure(src,
    ['_groundsAvmFor', '_groundsAvmSnapshot', '_groundsAvmResultHTML', '_groundsLiveAddr', '_groundsCompRow'], {});
  if (mode === 'b') {
    const before = body;
    // the pre-Ask-2 precedence: trust propAddress (which a field edit never clears) over the live fields
    body = body.replace(A_LIVE,
      "function _groundsLiveAddr(acc) { return String(acc.propAddress || '') || _groundsJoinedAddr(acc); }");
    if (body === before) throw new Error('mutation b did not apply');
  }
  // the renderer's accept buttons name groundsUseEstimate in their onclick, so the walker drags that
  // window.* entry point in too — it is never CALLED here, it just has to parse.
  return new Function('var window = {}, state = { accounts: [] };\n' + body +
    '\nreturn { read:_groundsAvmFor, snap:_groundsAvmSnapshot, html:_groundsAvmResultHTML, live:_groundsLiveAddr };')();
}
const api = buildApi(MODE);

/* ── fixtures: one real Worker response, one home ──────────────────────────────────────────────────── */
const FL = { propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'FL', propZip: '33544' };
const CANON = '26537 CASTLEVIEW WAY, WESLEY CHAPEL, FL, 33544';
const TYPED = [FL.propStreet, FL.propCity, FL.propState, FL.propZip].join(', ');
const WORKER_OK = {
  status: 'ok', value: 512000, low: 480000, high: 545000, updated: '2026-07-25T00:00:00Z',
  comps: [
    { address: '26510 Castleview Way', price: 498000, beds: 4, baths: 3, sqft: 2410, distance: 0.12, saleDate: '2026-05-02T00:00:00Z' },
    { address: '5 Wintergreen Ct',     price: 527500, beds: 4, baths: 3, sqft: 2610, distance: 0.31, saleDate: '2026-04-18T00:00:00Z' },
    { address: '1841 Bassett Ln',      price: 505000, beds: 3, baths: 2, sqft: 2180, distance: 0.44, saleDate: '2026-03-09T00:00:00Z' }
  ]
};

/* an account exactly as the live path leaves it after ONE successful Get-estimate */
function estimatedAccount() {
  const acc = { id: 'p1', baseId: 'realestate', value: 500000, ...FL };
  acc.propAddress = CANON;
  const snap = api.snap(WORKER_OK, CANON, TYPED);
  if (!snap) throw new Error('fixture: the builder refused a valid Worker response');
  // mutation (a) reproduces the pre-fix storage shape: the SAME snapshot under an underscore key
  if (MODE === 'a') acc._avmSnapshot = snap; else acc.assetAvmSnapshot = snap;
  return acc;
}
/* the reader under mutation (a) must look where the data actually is, or the gate would go red for the
   wrong reason (missing key) instead of the RIGHT one (stripped in transit) */
const readSnap = (acc) => (MODE === 'a' ? acc._avmSnapshot : acc.assetAvmSnapshot);

const checks = [];
const ok = (label, cond) => checks.push([label, !!cond]);

/* ═══ 1 · SURVIVAL — the actual Ask ════════════════════════════════════════════════════════════════ */
const bp = { blueprint_id: 'bp1', accounts: [estimatedAccount()] };
const out = persist(bp);                       // <-- the REAL trip out of the browser
const survivor = out.accounts[0].assetAvmSnapshot;

ok('snapshot survives toD1Document (the logout trip) at all [BITE a]', !!survivor);
ok('the COMPS survive — all 3, not an empty array [BITE a]', !!survivor && Array.isArray(survivor.comps) && survivor.comps.length === 3);
ok('a comp keeps its R147 fields (address · price · beds/baths/sqft · distance · sale date) [BITE a]',
  !!survivor && !!survivor.comps && survivor.comps[0].address === '26510 Castleview Way' &&
  survivor.comps[0].price === 498000 && survivor.comps[0].beds === 4 && survivor.comps[0].baths === 3 &&
  survivor.comps[0].sqft === 2410 && survivor.comps[0].distance === 0.12 && !!survivor.comps[0].saleDate);
ok('the RANGE survives (low + mid + high), not just the accepted value [BITE a]',
  !!survivor && survivor.estimate === 512000 && survivor.range && survivor.range.low === 480000 && survivor.range.high === 545000);
ok('the R61 provenance stamp survives WITH the snapshot [BITE a]',
  !!survivor && typeof survivor.stamp === 'string' && survivor.stamp.indexOf('via RentCast') >= 0);

/* the persisted bytes are what D1 actually stores — assert on the serialized form, not the object */
const wire = JSON.stringify(out);
ok('persisted BYTES carry a comp address [BITE a]', wire.indexOf('26510 Castleview Way') >= 0);
ok('persisted BYTES carry the stamp [BITE a]', wire.indexOf('via RentCast') >= 0);

/* ═══ 2 · RENDER FROM THE SURVIVOR — persisted must LOOK like just-fetched ═════════════════════════ */
const restored = { ...FL, propAddress: CANON, assetAvmSnapshot: survivor };
const readBack = api.read(restored);
const html = readBack ? api.html('p1', readBack) : '';
ok('a restored account renders its estimate panel [BITE a]', !!readBack && html.length > 0);
ok('rendered BYTES show the mid, the low and the high [BITE a]',
  html.indexOf('$512,000') >= 0 && html.indexOf('$480,000') >= 0 && html.indexOf('$545,000') >= 0);
ok('rendered BYTES show a persisted comp [BITE a]', html.indexOf('26510 Castleview Way') >= 0);

/* ═══ 3 · THE FROZEN STAMP — L47 freshness honesty ════════════════════════════════════════════════ */
const julyStamp = api.snap(WORKER_OK, CANON, TYPED).stamp;
ok('stamp is frozen from the response `updated`, NOT recomputed to today', julyStamp.indexOf('Jul 2026') >= 0);
ok('the renderer PRINTS the stored stamp verbatim (no recomputed date)', html.indexOf(julyStamp) >= 0);
{ // a snapshot pulled long ago must still report its ORIGINAL date after a round-trip
  const old = { ...survivor, stamp: 'est. · via RentCast · Jan 2026' };
  const h = api.html('p1', old);
  ok('a snapshot stored in January still says Jan 2026 when reopened later', h.indexOf('Jan 2026') >= 0 && h.indexOf('Jul 2026') < 0);
}

/* ═══ 4 · L47 — WRITE ONLY ON A REAL SUCCESS ══════════════════════════════════════════════════════ */
ok('a CAPPED response persists nothing', api.snap({ status: 'capped', message: 'x' }, CANON, TYPED) === null);
ok('an ERROR response persists nothing', api.snap({ status: 'error' }, CANON, TYPED) === null);
ok('a half-formed response (no low/high) persists nothing', api.snap({ status: 'ok', value: 512000 }, CANON, TYPED) === null);
ok('a success with NO comps still persists the range, with an empty comps list (never fabricated)', (() => {
  const s = api.snap({ ...WORKER_OK, comps: [] }, CANON, TYPED);
  return s && Array.isArray(s.comps) && s.comps.length === 0 && s.estimate === 512000;
})());
ok('provider chatter is dropped — only the R147 comp fields are stored', (() => {
  const s = api.snap({ ...WORKER_OK, comps: [{ address: 'A', price: 1, listingAgentPhone: '555', _raw: {} }] }, CANON, TYPED);
  return s && Object.keys(s.comps[0]).sort().join(',') === 'address,baths,beds,distance,price,saleDate,sqft';
})());

/* ═══ 5 · THE DE-DUPE KEY — protects the 50/mo ceiling ════════════════════════════════════════════ */
{
  const acc = estimatedAccount();
  const snap = readSnap(acc);
  const live = { ...FL, propAddress: CANON, assetAvmSnapshot: snap };
  ok('SAME address on reopen -> snapshot is served (zero calls)', !!api.read(live));

  // cosmetic re-typing must NOT cost a call — "St." vs "st", case, punctuation all fold
  const retyped = { ...live, propStreet: '26537 castleview way.' };
  ok('cosmetically re-typed address still hits the snapshot (~$0)', !!api.read(retyped));

  // the Captain's Ask-1 repro, now on the persisted path: change ONLY the state
  const moved = { ...live, propState: 'CO' };
  ok('CHANGED address (FL->CO) MISSES the snapshot — one honest call, no stale home [BITE b]', api.read(moved) === null);

  // and the same edit through the field the user actually touches
  const restreet = { ...live, propStreet: '900 Nowhere Rd' };
  ok('CHANGED street MISSES the snapshot [BITE b]', api.read(restreet) === null);

  // a legacy account that only ever had the joined form still reads
  const legacy = { propAddress: CANON, assetAvmSnapshot: snap };
  ok('legacy account (propAddress only, no structured fields) still reads its snapshot', !!api.read(legacy));
}

/* ═══ 6 · CLEARS — not-found leaves NOTHING behind ════════════════════════════════════════════════ */
{
  const acc = { ...FL, propAddress: CANON, assetAvmSnapshot: api.snap(WORKER_OK, CANON, TYPED) };
  acc.assetAvmSnapshot = null;                        // exactly what the not-found branch does
  ok('after a confirmed not-found the snapshot is gone', api.read(acc) === null);
  ok('and nothing survives the trip out', !JSON.stringify(persist({ accounts: [acc] })).includes('via RentCast'));
}

/* ═══ 7 · THE FENCES — Clerk mirror untouched · LOCK-3 display-only ═══════════════════════════════ */
ok('FENCE: assetAvmSnapshot is NOT added to the Clerk slim mirror (allow-list, studio-blueprint.js:130)',
  !sb.includes('assetAvmSnapshot'));
ok('FENCE: blueprint_z / sketchbook_z / prefs mirror writes are untouched (MISS-5 stays frozen)',
  sb.includes('blueprint_z: bpZ') && sb.includes("k.charAt(0) !== '_'"));
ok('LOCK-3: the snapshot never writes into value/taxCode/any total — it is read only by the panel',
  (src.match(/assetAvmSnapshot/g) || []).length > 0 &&
  !/assetAvmSnapshot[^;\n]*\b(acc\.value|taxCode|netEquity)\s*=/.test(src) &&
  !/\b(acc\.value|taxCode)\s*=\s*[^;\n]*assetAvmSnapshot/.test(src));
// Hygiene (static — no mutation drives it): the old underscore storage must be gone from LIVE CODE. A blunt
// src.includes() cannot tell code from prose and went red on the Ask-1 comment that explains the old bug in
// PAST TENSE — a fragment matching only a comment proves nothing, and the inverse is just as false. Strip
// whole-line // comments first, then assert on what actually executes.
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok('the underscore-keyed _avmLast storage is fully retired from live code (one key, one reader — L48)',
  !/_avmLast/.test(code));

/* ═══ 8 · R153 REFRESH — the deliberate paid path stays discoverable ══════════════════════════════ */
ok('R153 "Refresh estimate" is the label when a snapshot is mounted (bank string, verbatim)',
  src.includes("'Refresh estimate' : 'Get estimate'"));
ok('the mounted-snapshot control forces a real re-pull (force=true), the empty one does not',
  src.includes("groundsVerifyAndEstimate('${id}'${_avmSnap ? ', true' : ''})"));
ok('the de-dupe reuses _AssetIntel.REFRESH_MS — no second 30-day window (L48)',
  src.includes('_AssetIntel.REFRESH_MS') && src.includes('REFRESH_MS: REFRESH_MS') &&
  (src.match(/30 \* 24 \* 3600 \* 1000/g) || []).length === 1);
ok('a forced refresh is the ONLY thing that skips the de-dupe', src.includes('if (!force) {'));

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */
const pass = checks.filter((c) => c[1]).length;
const label = MODE === 'a' ? 'RED-FIRST a (underscore key restored)'
            : MODE === 'b' ? 'RED-FIRST b (stale key precedence)' : 'RUN';
console.log('[' + label + '] GROUNDS Ask 2 — comps survive logout — ' + pass + '/' + checks.length);
for (const [l, c] of checks) if (!c) console.log('   FAIL · ' + l);
if (MODE && pass === checks.length) { console.log('   !! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
if (!MODE && pass !== checks.length) process.exit(1);
