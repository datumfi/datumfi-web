/* DEV-ONLY red-first gate — Real Estate Ask 1: the Get-Estimate cache key (Architect #440).

   THE BUG (Captain repro): estimate a real FL address, then change ONLY the state to CO (a non-existent
   address) and re-run — the IDENTICAL estimate comes back. Root cause, grounded: acc._avmLast was written on
   every fetch with NO record of which address it described, and the modal rendered it unconditionally. A
   confirmed not-found returns EARLY, so the old estimate was never even cleared — it simply re-rendered
   beside an address it had never described.

   THE CONTRACT (bank §6b.5 / SPEC R72–R73, R153 D): "Same canonical address hits the de-dupe cache (~$0);
   a CHANGED address makes ~1 real call." So the key must fold cosmetic differences (case, punctuation,
   spacing) — a re-typed "St." must still cost $0 — while a genuinely different address must MISS.

   --redfirst restores the unkeyed read (render whatever is stored, regardless of address) — the exact
   pre-fix behaviour — and the stale-estimate assertions bite. */
import { readFileSync } from 'node:fs';
import { extractClosure, extractFn } from './_gate_extract.mjs';

const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

/* RE-TRUED for Ask 2 (#443). The storage this gate guards moved from the ephemeral `acc._avmLast` /
   `_avmLastKey` pair to the PERSISTED `acc.assetAvmSnapshot` (non-underscore, so it survives D1). The
   CONTRACT under test is unchanged — an estimate may only ever be shown beside the address it describes —
   so the assertions stand; only the shape they read moved.

   ONE FIXTURE ASSUMPTION WAS ALSO WRONG AND IS NOW REMOVED. The old fixture set `propAddress = ''` on every
   edit, commented "canonical is dropped the moment the fields change". updateAccField does no such thing —
   it never clears propAddress — so the gate was green against a state the app never reaches, while live code
   still matched a stale canonical address against freshly-typed fields. Ask 2 makes the LIVE fields the key
   (_groundsLiveAddr), so the edits below now miss for the reason the gate always claimed. */
const A_READ = 'return (now === s.key || now === s.keyTyped) ? s : null;';
const A_CLEAR = 'acc.assetAvmSnapshot = null;';
const A_STAMP = 'key:      _avmAddrKey(canonicalAddr),';
for (const [n, a] of [['read gate', A_READ], ['not-found clear', A_CLEAR], ['stamp', A_STAMP]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_READ, 'return s;'),                               // unkeyed read = the original bug
  b: (b) => b.replace('if (!now) return null;', 'if (!now) return s;')     // blank address resurrects it
};

function build(mut) {
  let body = extractClosure(src, ['_groundsAvmFor', '_avmAddrKey', '_groundsJoinedAddr', '_groundsLiveAddr'], {});
  if (mut) { const after = mut(body); if (after === body) throw new Error('mutation did not apply'); body = after; }
  return new Function(body + '\nreturn { get:_groundsAvmFor, key:_avmAddrKey, join:_groundsJoinedAddr };')();
}

const FL = { propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'FL', propZip: '33544' };
const EST = { estimate: 512000, range: { low: 480000, high: 545000 }, comps: [{ address: '1 Elm', price: 500000 }],
              stamp: 'est. · via RentCast · Jul 2026', pulledAt: Date.now() };

function run(api) {
  const c = []; const need = (l, v) => c.push([l, !!v]);

  // an account that has just been estimated, stamped the way the live path stamps it
  const mk = (addrFields, storedAddr) => {
    const a = { ...addrFields };
    a.propAddress = storedAddr;
    a.assetAvmSnapshot = { ...EST, address: storedAddr, key: api.key(storedAddr), keyTyped: api.key(storedAddr) };
    return a;
  };
  const joinedFL = [FL.propStreet, FL.propCity, FL.propState, FL.propZip].join(', ');

  need('fixture sanity: a fresh estimate on its OWN address is returned', api.get(mk(FL, joinedFL)) !== null);

  // ── THE CAPTAIN'S REPRO: change ONLY the state. propAddress is deliberately LEFT STALE here, because that
  //    is what updateAccField actually leaves behind — the miss must come from the live fields, not a fixture.
  const co = mk(FL, joinedFL);
  co.propState = 'CO';
  need('changed STATE (FL→CO) → the previous estimate is NOT returned', api.get(co) === null);

  // ── other single-field edits must also miss, again with propAddress left stale ──
  for (const [f, v] of [['propStreet', '999 Nowhere Rd'], ['propCity', 'Tampa'], ['propZip', '33601']]) {
    const x = mk(FL, joinedFL); x[f] = v;
    need('changed ' + f + ' → cache MISS (no stale carry-over)', api.get(x) === null);
  }

  // ── the de-dupe half of the contract: cosmetic differences must still HIT (~$0) ──
  const same = mk(FL, joinedFL);
  same.propAddress = '26537 CASTLEVIEW WAY, wesley chapel, fl  33544';
  need('same address, different case/spacing → still a HIT (de-dupe holds, ~$0)', api.get(same) !== null);
  need('key folds punctuation: "St." and "st" collapse', api.key('12 Main St., Tampa FL') === api.key('12 main st Tampa  fl'));
  need('key does NOT collapse genuinely different addresses', api.key('12 Main St') !== api.key('13 Main St'));

  // ── nothing stored / nothing to show ──
  need('no estimate stored → null', api.get({ ...FL, propAddress: joinedFL }) === null);
  need('estimate stored but NO address anywhere → null (never render unanchored)',
    api.get({ assetAvmSnapshot: { ...EST, key: 'x', keyTyped: 'x' } }) === null);
  need('stored WITHOUT a key (legacy acc) → null, not a blind render',
    api.get({ ...FL, propAddress: joinedFL, assetAvmSnapshot: { ...EST } }) === null);

  // ── structural: the not-found path must clear, and the snapshot must be address-stamped ──
  need('a confirmed not-found CLEARS the stored estimate', src.includes(A_CLEAR));
  need('the estimate is stamped with the canonical address actually sent', src.includes(A_STAMP));
  // Extract the FUNCTION BODY rather than grepping a character window: the first occurrence of the name is
  // the oninput= call site 210k chars earlier, so a distance-based regex anchors on the wrong thing entirely.
  need('address-edit clears the rendered panel live, not just on reopen', (function () {
    const body = extractFn(src, '_groundsSyncAvmAddr');
    return body.includes('_groundsAvmFor(acc)') && body.includes("res.innerHTML = ''");
  })());
  // ── DELIBERATELY INVERTED BY ASK 2 (#443). Ask 1 asserted the opposite — that the keys stay _-prefixed and
  //    are stripped by toD1Document — because at the time the estimate was intended to be a runtime ephemeral.
  //    The Captain then ruled that the comps must SURVIVE logout, which makes that ephemerality the bug. The
  //    assertion is inverted rather than deleted so the reversal is on the record instead of quietly vanishing.
  //    Survival itself is proved end-to-end through the real toD1Document in _gate_grounds_avm_persist.mjs.
  need('the snapshot is NON-underscore so it survives toD1Document (Ask 2 reversal of Ask 1)',
    src.includes('acc.assetAvmSnapshot') && !/_avmLast/.test(
      src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')));
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['a', 'b']) {
    const c = run(build(MUT[k]));
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — both mutations bit');
  process.exit(0);
}

report('', run(build(null)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
