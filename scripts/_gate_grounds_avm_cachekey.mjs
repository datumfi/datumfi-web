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

const A_READ = "return (acc._avmLastKey && acc._avmLastKey === now) ? acc._avmLast : null;";
const A_CLEAR = "acc._avmLast = null; acc._avmLastKey = '';";
const A_STAMP = 'acc._avmLastKey = _avmAddrKey(acc.propAddress);';
for (const [n, a] of [['read gate', A_READ], ['not-found clear', A_CLEAR], ['stamp', A_STAMP]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_READ, 'return acc._avmLast;'),                    // unkeyed read = the original bug
  b: (b) => b.replace('if (!now) return null;', 'if (!now) return acc._avmLast;')   // blank address resurrects it
};

function build(mut) {
  let body = extractClosure(src, ['_groundsAvmFor', '_avmAddrKey', '_groundsJoinedAddr'], {});
  if (mut) { const after = mut(body); if (after === body) throw new Error('mutation did not apply'); body = after; }
  return new Function(body + '\nreturn { get:_groundsAvmFor, key:_avmAddrKey, join:_groundsJoinedAddr };')();
}

const FL = { propStreet: '26537 Castleview Way', propCity: 'Wesley Chapel', propState: 'FL', propZip: '33544' };
const EST = { value: 512000, low: 480000, high: 545000, comps: [{ address: '1 Elm', price: 500000 }] };

function run(api) {
  const c = []; const need = (l, v) => c.push([l, !!v]);

  // an account that has just been estimated, stamped the way the live path stamps it
  const mk = (addrFields, storedAddr) => {
    const a = { ...addrFields };
    a.propAddress = storedAddr;
    a._avmLast = EST;
    a._avmLastKey = api.key(storedAddr);
    return a;
  };
  const joinedFL = [FL.propStreet, FL.propCity, FL.propState, FL.propZip].join(', ');

  need('fixture sanity: a fresh estimate on its OWN address is returned', api.get(mk(FL, joinedFL)) === EST);

  // ── THE CAPTAIN'S REPRO: change ONLY the state ──
  const co = mk(FL, joinedFL);
  co.propState = 'CO';
  co.propAddress = '';                       // canonical is dropped the moment the fields change
  need('changed STATE (FL→CO) → the previous estimate is NOT returned', api.get(co) === null);

  // ── other single-field edits must also miss ──
  for (const [f, v] of [['propStreet', '999 Nowhere Rd'], ['propCity', 'Tampa'], ['propZip', '33601']]) {
    const x = mk(FL, joinedFL); x[f] = v; x.propAddress = '';
    need('changed ' + f + ' → cache MISS (no stale carry-over)', api.get(x) === null);
  }

  // ── the de-dupe half of the contract: cosmetic differences must still HIT (~$0) ──
  const same = mk(FL, joinedFL);
  same.propAddress = '26537 CASTLEVIEW WAY, wesley chapel, fl  33544';
  same._avmLastKey = api.key(joinedFL);
  need('same address, different case/spacing → still a HIT (de-dupe holds, ~$0)', api.get(same) === EST);
  need('key folds punctuation: "St." and "st" collapse', api.key('12 Main St., Tampa FL') === api.key('12 main st Tampa  fl'));
  need('key does NOT collapse genuinely different addresses', api.key('12 Main St') !== api.key('13 Main St'));

  // ── nothing stored / nothing to show ──
  need('no estimate stored → null', api.get({ ...FL, propAddress: joinedFL }) === null);
  need('estimate stored but NO address anywhere → null (never render unanchored)',
    api.get({ _avmLast: EST, _avmLastKey: 'x' }) === null);
  need('stored WITHOUT a key (legacy acc) → null, not a blind render',
    api.get({ ...FL, propAddress: joinedFL, _avmLast: EST }) === null);

  // ── structural: the not-found path must clear, and the fields must be ephemeral ──
  need('a confirmed not-found CLEARS the stored estimate', src.includes(A_CLEAR));
  need('the estimate is stamped with the canonical address actually sent', src.includes(A_STAMP));
  // Extract the FUNCTION BODY rather than grepping a character window: the first occurrence of the name is
  // the oninput= call site 210k chars earlier, so a distance-based regex anchors on the wrong thing entirely.
  need('address-edit clears the rendered panel live, not just on reopen', (function () {
    const body = extractFn(src, '_groundsSyncAvmAddr');
    return body.includes('_groundsAvmFor(acc)') && body.includes("res.innerHTML = ''");
  })());
  need('both keys stay _-prefixed (runtime ephemerals, stripped by toD1Document)',
    src.includes('acc._avmLastKey') && !src.includes('acc.avmLastKey'));
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
