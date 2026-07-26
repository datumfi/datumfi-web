/* DEV-ONLY red-first gate — Grounds §A135b: Census SILENTLY CORRECTS the address (Architect #447).

   THE CAPTAIN'S REPRO (07/25): enter a real FL address, get an estimate, ACCEPT it. Then change ONLY the
   state FL -> CO, keeping the same street and ZIP — an address that does not exist. Hit "Refresh estimate".
   An estimate comes back, and it is the FL one. No R149, no block, no wipe.

   THE ROOT CAUSE, MEASURED — NOT the one first suspected. The initial reading was that Refresh skipped
   verify via a second entry point (groundsGetEstimate). It does not: the button has always called
   groundsVerifyAndEstimate, confirmed in SERVED bytes. The real cause is that the US Census geocoder is
   TOLERANT. Probed live against the Worker on 2026-07-25:

     /verify?address=26537 Castleview Way, Wesley Chapel, FL, 33544
       -> {"status":"verified","canonical":"26537 CASTLEVIEW WAY, WESLEY CHAPEL, FL, 33544"}
     /verify?address=26537 Castleview Way, Wesley Chapel, CO, 33544      <- impossible
       -> {"status":"verified","canonical":"26537 CASTLEVIEW WAY, WESLEY CHAPEL, FL, 33544"}

   Census does NOT answer not-found for the CO address. It answers VERIFIED and quietly puts the state back
   to FL. So the not-found branch never fires, we canonicalise to the FL address, spend a real RentCast call
   on it, and render the FL number underneath the CO address the user is staring at.

   THE FIX under test: after a 'verified' response, compare the STATE and ZIP of the canonical against what
   was TYPED. Those two are compared because they are what the user picks explicitly and what Census silently
   rewrites; street/city are NOT compared because they differ cosmetically on nearly every good lookup
   ("Way" -> "WAY") and comparing them would block real homes. A mismatch takes the SAME path as not-found:
   wipe the snapshot, show R149 verbatim, and spend nothing.

   MUTATIONS:
     --redfirst  drop the mismatch block -> the FL estimate is fetched and stored under the CO address.
                 The Captain's exact symptom, reproduced through the app's own path.
     --strict    compare the WHOLE canonical string instead of state+ZIP -> real addresses get blocked by
                 cosmetic normalisation. Proves the narrow comparison is load-bearing, not arbitrary.
*/
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';

const MODE = process.argv.includes('--redfirst') ? 'a' : process.argv.includes('--strict') ? 'b' : null;
const src = readFileSync('studio.html', 'utf8');

const A_BLOCK = "if (v && v.status === 'verified' && v.canonical && _avmCanonMismatch(acc, v.canonical)) { _blockUnconfirmed(); return; }";
const A_CMP = "if (c.state && st && c.state !== st) return true;";
for (const [n, a] of [['mismatch block', A_BLOCK], ['state compare', A_CMP]]) {
  if (!src.includes(a)) throw new Error('anchor missing (' + n + ') — structure moved, re-true this gate');
}

/* ── build the REAL verify-then-estimate path with injected _AssetIntel / DOM ──────────────────────── */
function build(mode) {
  // EXCLUDE groundsUseEstimate: _groundsAvmResultHTML names it only inside an onclick STRING, but the closure
  // walker cannot tell markup from a call, so following it drags in openAccountModal and ~320 functions —
  // most of the app. The gate injects a no-op instead (the accept buttons are never clicked here).
  let body = extractClosure(src,
    ['groundsVerifyAndEstimate', '_avmCanonMismatch', '_avmCanonStateZip', '_groundsCompRow'],
    { exclude: ['groundsUseEstimate'] });
  if (mode === 'a') {
    const before = body;
    body = body.replace(A_BLOCK, '');                      // the pre-fix behaviour
    if (body === before) throw new Error('mutation a did not apply');
  }
  if (mode === 'b') {
    const before = body;
    body = body.replace(A_CMP,                             // whole-string compare instead of state+ZIP
      "if (String(canon||'').toUpperCase().replace(/[^A-Z0-9]/g,'') !== [acc.propStreet,acc.propCity,acc.propState,acc.propZip].join('').toUpperCase().replace(/[^A-Z0-9]/g,'')) return true;");
    if (body === before) throw new Error('mutation b did not apply');
  }
  return body;
}

function makeHarness({ verify, estimate }) {
  const calls = { verify: 0, fetch: 0 };
  const els = {};
  const el = (id) => (els[id] = els[id] || { innerHTML: '' });
  const sandbox = {
    document: { getElementById: (id) => el(id) },
    _AssetIntel: {
      REFRESH_MS: 30 * 24 * 3600 * 1000,
      verifyAddress: async (a) => { calls.verify++; return verify(a); },
      fetchEstimate: async (a) => { calls.fetch++; return estimate(a); }
    },
    state: { accounts: [] },
    window: {}
  };
  const built = new Function('document', '_AssetIntel', 'state', 'window',
    // the entry point is defined as `window.NAME = async function`, so it lands on the injected window stub
    build(MODE) + '\nreturn { run: window.groundsVerifyAndEstimate };')(
    sandbox.document, sandbox._AssetIntel, sandbox.state, sandbox.window);
  return { fn: built.run, calls, els, state: sandbox.state, el };
}

const FL_CANON = '26537 CASTLEVIEW WAY, WESLEY CHAPEL, FL, 33544';
const FL_EST = { status: 'ok', value: 512000, low: 480000, high: 545000, updated: '2026-07-25T00:00:00Z',
                 comps: [{ address: '26510 Castleview Way', price: 498000 }] };
const R149 = 'we couldn’t confirm that address';

const checks = [];
const ok = (label, cond) => checks.push([label, !!cond]);

/* ═══ 1 · THE CAPTAIN'S REPRO ═════════════════════════════════════════════════════════════════════ */
{
  // Census answers VERIFIED with the FL canonical even for the CO input — the measured behaviour.
  const h = makeHarness({ verify: async () => ({ status: 'verified', canonical: FL_CANON }), estimate: async () => FL_EST });
  const acc = { id: 'p1', propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'CO', propZip: '33544' };
  // the account already holds an accepted FL estimate, exactly as after step 1 of the repro
  acc.assetAvmSnapshot = { address: FL_CANON, key: 'x', keyTyped: 'y', estimate: 512000,
                           range: { low: 480000, high: 545000 }, comps: [], stamp: 'est. · via RentCast · Jul 2026', pulledAt: Date.now() };
  h.state.accounts.push(acc);
  await h.fn('p1', true);                                   // force = the Refresh path

  ok('Refresh on the impossible CO address does NOT store an estimate [BITE a]', acc.assetAvmSnapshot === null);
  ok('and spends NO paid RentCast call [BITE a]', h.calls.fetch === 0);
  ok('the free Census verify still ran (we did not stop checking)', h.calls.verify === 1);
  ok('R149 is shown, verbatim [BITE a]', h.el('modal-avm-verify-p1').innerHTML.includes(R149));
  ok('the estimate panel is left empty — no FL number under a CO address [BITE a]',
    !h.el('modal-avm-result-p1').innerHTML.includes('512,000'));
  ok('propAddress is NOT silently rewritten to the FL canonical [BITE a]', acc.propAddress !== FL_CANON);
}

/* ═══ 2 · THE HONEST PATH MUST STILL WORK — no false blocks ═══════════════════════════════════════ */
{
  const h = makeHarness({ verify: async () => ({ status: 'verified', canonical: FL_CANON }), estimate: async () => FL_EST });
  const acc = { id: 'p2', propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'FL', propZip: '33544' };
  h.state.accounts.push(acc);
  await h.fn('p2', true);
  ok('the REAL FL address still estimates (cosmetic case/punct differences do not block) [BITE b]',
    !!acc.assetAvmSnapshot && acc.assetAvmSnapshot.estimate === 512000);
  ok('and it did spend its one honest call', h.calls.fetch === 1);
  ok('no R149 on a good address [BITE b]', !h.el('modal-avm-verify-p2').innerHTML.includes(R149));
}
{ // lowercase + punctuation + a ZIP+4 canonical must still pass
  const h = makeHarness({ verify: async () => ({ status: 'verified', canonical: '26537 Castleview Way., Wesley Chapel, fl, 33544-1234' }), estimate: async () => FL_EST });
  const acc = { id: 'p3', propStreet: '26537 castleview way', propCity: 'wesley chapel', propState: 'fl', propZip: '33544' };
  h.state.accounts.push(acc);
  await h.fn('p3', true);
  ok('case-insensitive state + ZIP+4 canonical still passes (no false block) [BITE b]', !!acc.assetAvmSnapshot);
}

/* ═══ 3 · FAIL-OPEN IS PRESERVED EXACTLY — we did not tighten it ══════════════════════════════════ */
{
  const h = makeHarness({ verify: async () => ({ status: 'error' }), estimate: async () => FL_EST });
  const acc = { id: 'p4', propStreet: '1 Main St', propCity: 'Tampa', propState: 'FL', propZip: '33601' };
  h.state.accounts.push(acc);
  await h.fn('p4', true);
  ok('Census UNREACHABLE -> still estimates (fail-open unchanged)', !!acc.assetAvmSnapshot && h.calls.fetch === 1);
  ok('fail-open shows no R149', !h.el('modal-avm-verify-p4').innerHTML.includes(R149));
}
{ // a verified response with NO canonical at all must not block either
  const h = makeHarness({ verify: async () => ({ status: 'verified' }), estimate: async () => FL_EST });
  const acc = { id: 'p5', propStreet: '1 Main St', propCity: 'Tampa', propState: 'FL', propZip: '33601' };
  h.state.accounts.push(acc);
  await h.fn('p5', true);
  ok('verified with NO canonical -> falls through, does not invent a block (L47)', !!acc.assetAvmSnapshot);
}
{ // an unparseable canonical shape must not block (sourced-or-blank)
  const h = makeHarness({ verify: async () => ({ status: 'verified', canonical: 'SOMEWHERE ODD' }), estimate: async () => FL_EST });
  const acc = { id: 'p6', propStreet: '1 Main St', propCity: 'Tampa', propState: 'FL', propZip: '33601' };
  h.state.accounts.push(acc);
  await h.fn('p6', true);
  ok('unparseable canonical -> no mismatch claimed, estimate proceeds (L47)', !!acc.assetAvmSnapshot);
}

/* ═══ 4 · GENUINE not-found STILL BLOCKS (unchanged behaviour) ════════════════════════════════════ */
{
  const h = makeHarness({ verify: async () => ({ status: 'not-found' }), estimate: async () => FL_EST });
  const acc = { id: 'p7', propStreet: '999 Nowhere Rd', propCity: 'Nowhere', propState: 'XX', propZip: '00000' };
  acc.assetAvmSnapshot = { estimate: 1, key: 'k', keyTyped: 'k', range: { low: 1, high: 1 }, comps: [], stamp: 's', pulledAt: Date.now() };
  h.state.accounts.push(acc);
  await h.fn('p7', true);
  ok('confirmed not-found still wipes + shows R149 + spends nothing',
    acc.assetAvmSnapshot === null && h.calls.fetch === 0 && h.el('modal-avm-verify-p7').innerHTML.includes(R149));
}

/* ═══ 5 · A ZIP-ONLY typo is caught too ═══════════════════════════════════════════════════════════ */
{
  const h = makeHarness({ verify: async () => ({ status: 'verified', canonical: FL_CANON }), estimate: async () => FL_EST });
  const acc = { id: 'p8', propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'FL', propZip: '33999' };
  h.state.accounts.push(acc);
  await h.fn('p8', true);
  ok('a corrected ZIP is caught the same way as a corrected state [BITE a]',
    acc.assetAvmSnapshot == null && h.calls.fetch === 0);
}

/* ═══ 6 · ONE DOOR — the unverified second entry point is gone (L48) ══════════════════════════════ */
{
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok('groundsGetEstimate (the no-verify door) is deleted from live code', !/groundsGetEstimate/.test(code));
  ok('every _AssetIntel.fetchEstimate call is inside the verified path',
    (code.match(/_AssetIntel\.fetchEstimate/g) || []).length === 1);
  ok('R149 exists exactly ONCE — not-found and canonical-mismatch share one block (L48)',
    (src.match(/we couldn’t confirm that address/g) || []).length === 1);
}

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */
const pass = checks.filter((c) => c[1]).length;
const label = MODE === 'a' ? 'RED-FIRST a (mismatch block removed)'
            : MODE === 'b' ? 'RED-FIRST b (whole-string compare)' : 'RUN';
console.log('[' + label + '] GROUNDS §A135b — Census silent-correction — ' + pass + '/' + checks.length);
for (const [l, c] of checks) if (!c) console.log('   FAIL · ' + l);
if (MODE && pass === checks.length) { console.log('   !! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
if (!MODE && pass !== checks.length) process.exit(1);
