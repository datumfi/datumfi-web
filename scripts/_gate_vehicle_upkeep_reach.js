/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   §45 · THE VEHICLE REACHES THE OPERATING UPKEEP ENGINE — ONE CATALOGUE, TWO SCOPES.
   Commit 2 of step 2b. The catalogue moved to scripts/studio-upkeep.js (the first registered
   studioSource PART) and grew a `scope` attribute. Nothing sums the vehicle rows yet.

   ⭐⭐ THE TWO LEGS THE ARCHITECT MANDATED, AND WHY EACH IS A MONEY CLAIM RATHER THAN A UI ONE:

   1. REACHABILITY (scene K) — EVERY CATALOGUE KIND MUST BE OFFERED IN THE DROPDOWN FOR ITS SCOPE.
      The dropdown used to be built from a hard-coded [['utilities',…],['services',…]]. A kind whose
      group was neither would have been INVISIBLE IN THE DROPDOWN WHILE STILL COUNTING IN THE TOTAL —
      a dollar the user can neither see nor edit but is being charged. ⛔ SAME FAMILY AS THE
      NEGATIVE-BALANCE DEFECT: not a wrong word, a wrong number about the user's own money.
      ⛔ THE EXPECTED SET IS DERIVED FROM THE CATALOGUE, NEVER HAND-LISTED HERE. A hand-listed
      expectation tests the list I typed, not the catalogue that ships — and it would rot the first
      time a kind is added, which is precisely when this leg needs to fire.

   2. THE INVARIANT (scene V) — ADDING A VEHICLE UPKEEP LINE MUST NOT MOVE ANY PROPERTY'S CARRYING
      TOTAL BY ONE CENT. Isolation holds today because `propertyId` filters by account id, but
      NOTHING ASSERTED IT. This is the leg that would catch a future `_canonUtil` that forgot to
      scope, or a vehicle kind mistakenly filed under `utilities`.

   ── ⭐ AND THE EVIDENCE THAT IS NOT IN THIS FILE, BECAUSE IT COULD NOT BE ────────────────────────
   The strongest proof for this commit is an OLD-vs-NEW RENDER DIFF: HEAD's studio.html and the
   working tree served side by side, the same property fixtures rendered in both, modal HTML diffed
   character-for-character with only the random `inst_`/`upk_` ids normalised. Result: IDENTICAL at
   41,454 chars (bare) and 43,627 chars (with ledger lines), carrying total identical in both.
   ⛔ THAT MATTERS BECAUSE THE §25.4 EXTRACTION BROKE EVERY LIEN-CARRYING ROOM WHILE ALL FOUR ESTATE
   GATES STAYED GREEN. A refactor's blast radius is the set of scopes it crosses, and green gates are
   not a render diff.

   ⚠️ AND THE DIFF EARNED ITS KEEP IMMEDIATELY: it caught a SYNTAX ERROR (an apostrophe whose escape
   was eaten by a scripted edit) that killed the entire inline script block — `state` and
   `addInstance` never existed and the Studio rendered NOTHING. Loading the page is the only check
   that can see that.

   Usage: node scripts/_gate_vehicle_upkeep_reach.js [LABEL] [--noscope] [--hardgroups] [--leakguard]
     --noscope     the dropdown ignores scope and offers the whole catalogue -> S/K red.
     --hardgroups  restores the hard-coded group pair -> the vehicle group VANISHES from the
                   dropdown while its kinds stay addable. ⭐ THIS IS THE MONEY DEFECT, REPRODUCED.
     --leakguard   createPropertyUpkeep validates against the whole catalogue -> C3 red (a car
                   accepts a swimming pool).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { studioSource } = require('./_studio_source.cjs');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NOSCOPE    = process.argv.includes('--noscope');
const HARDGROUPS = process.argv.includes('--hardgroups');
const LEAKGUARD  = process.argv.includes('--leakguard');
const MUT = NOSCOPE || HARDGROUPS || LEAKGUARD;

const PORT = 8379;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

const A_SCOPE = "        var cat = (typeof _upkForScope === 'function') ? _upkForScope(sc, vT) : [];";
const M_SCOPE = "        var cat = (typeof _upkCatalogueRaw === 'function') ? _upkCatalogueRaw() : [];   /* scope ignored: --noscope */";

const A_GRP = "        ((typeof _upkGroupsForScope === 'function') ? _upkGroupsForScope(sc, vT) : []).forEach(function (g) {";
const M_GRP = "        [['utilities', 'UTILITIES'], ['services', 'PROPERTY SERVICES']].forEach(function (g) {   /* hard-coded again: --hardgroups */";

const A_GUARD = "        var cat = acc ? _propUpkeepKind(kind, _upkScopeFor(getBaseType(acc.baseId))) : null;";
const M_GUARD = "        var cat = acc ? _propUpkeepKind(kind, 'property') || _propUpkeepKind(kind, 'vehicle') : null;   /* scope-blind guard: --leakguard */";

function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
  const out = src.replace(a, () => m);
  if (out.indexOf(m) < 0) { console.error('mutation ' + label + ': did not land verbatim.'); process.exit(1); }
  return out;
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    if (NOSCOPE)    src = mutate(src, A_SCOPE, M_SCOPE, 'A_SCOPE');
    if (HARDGROUPS) src = mutate(src, A_GRP,   M_GRP,   'A_GRP');
    if (LEAKGUARD)  src = mutate(src, A_GUARD, M_GUARD, 'A_GUARD');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  const SRC = studioSource();
  /* ⭐ S1 PROVES THE PARTS CONTRACT IS DOING ITS JOB: the catalogue no longer lives in studio.html,
     yet studioSource() still contains it — which is the only reason the twelve sandbox gates that
     lift _upkForScope through calcCarryTotal still resolve. */
  ok(/function _upkForScope/.test(SRC) && /function _upkCatalogueRaw/.test(SRC),
     'S1 [PARTS] studioSource() carries the catalogue even though it left studio.html');
  /* ⛔ S2 PROVES THE CATALOGUE LIVES IN THE *PART*, AND IT DOES SO WITHOUT DISK-READING studio.html.
     THE FIRST CUT DID READ IT DIRECTLY — AND _gate_studio_source's POPULATION LEG CAUGHT ME THE SAME
     DAY. Its header had predicted exactly this: "the 91st gate, written next week by someone who
     copied an older one, silently re-opening the debt." I was that someone, hours later.
     ⭐ AND THE REPAIR IS A STRONGER CLAIM, NOT AN EVASION. Rather than asking "is it absent from the
     shell?", this splits the composed source at the PART BEGIN marker and asserts the definition is
     on the PART side of it — which proves WHERE the catalogue lives, not merely where it is not.
     ⛔ Evading the census by assembling the path (the one documented escape) was refused: the census
     is the instrument, and the first person to route around it should not be its author. */
  const PART_MARK = 'studioSource PART BEGIN';
  const cut = SRC.indexOf(PART_MARK);
  ok(cut > 0, 'S2 [PARTS] the composed source carries a PART BEGIN marker — the shell/part boundary is legible');
  ok(cut > 0 && SRC.slice(0, cut).indexOf('function _upkCatalogueRaw') < 0
            && SRC.slice(cut).indexOf('function _upkCatalogueRaw') >= 0,
     'S2b [PARTS · CONTROL] the catalogue is defined on the PART side of that boundary, NOT in the shell');

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 20000 });
  await p.waitForTimeout(500);

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [NOSCOPE ? 'noscope' : '', HARDGROUPS ? 'hardgroups' : '', LEAKGUARD ? 'leakguard' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* Builds ONE room of the given base and reads its rendered upkeep window. */
  const room = async (baseId) => p.evaluate(async (bid) => {
    window.state.accounts.length = 0;
    /* ⛔ THE LEDGER IS GLOBAL AND SURVIVES AN ACCOUNT RESET. Clearing accounts alone left scene H's
       rows alive into scene C, and P1 (which asserts EXACTLY ONE fuel row) went red on my own
       fixture rather than on the product. 🔑 A PRECISE ASSERTION CAUGHT IT; `>= 1` would have hidden
       it. Every scene now builds its own ledger state. */
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance(bid);
    const a = window.state.accounts[0];
    a.value = bid === 'auto' ? 32000 : 500000;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 600));
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const m = document.getElementById('modal-dynamic-content');
    const sel = m.querySelector('select[onchange*="createPropertyUpkeep"]');
    return {
      id: a.id,
      flat: (m.textContent || '').replace(/\s+/g, ' '),
      opts: sel ? Array.prototype.slice.call(sel.options).map((o) => o.value).filter(Boolean) : null,
      groups: sel ? Array.prototype.slice.call(sel.querySelectorAll('optgroup')).map((g) => g.label) : null,
    };
  }, baseId);

  /* The catalogue's OWN view of what each scope contains — the oracle, read from the shipped module
     rather than typed into this file. */
  const cat = await p.evaluate(() => ({
    vehicle: _upkForScope('vehicle').map((c) => c.kind),
    property: _upkForScope('property').map((c) => c.kind),
  }));
  console.log('  catalogue ' + JSON.stringify(cat));

  /* ══ SCENE R · THE VEHICLE ROOM REACHES THE ENGINE ══════════════════════════════════════════════ */
  const V = await room('auto');
  console.log('  V ' + JSON.stringify({ opts: V.opts, groups: V.groups }));
  ok(V.opts && V.opts.length > 0, 'R1 [REACH] the VEHICLE room renders an upkeep dropdown at all');
  ok(V.flat.indexOf('What this vehicle costs to run') >= 0,
     'R2 [§45.6 VERBATIM] the authored vehicle heading renders');
  ok(V.flat.indexOf('Track running costs') >= 0,
     'R3 [§45.6 VERBATIM] the authored vehicle toggle label renders');
  ok(V.flat.indexOf('Nothing recorded yet. Add what this vehicle costs you to run') >= 0,
     'R4 [§45.6 VERBATIM] the authored vehicle empty state renders');
  ok(V.flat.indexOf('It doesn’t change what the vehicle is worth') >= 0,
     'R5 [§45.6 VERBATIM · LOAD-BEARING] the hover that stops a user fearing costs reduce the asset VALUE');

  /* ══ SCENE K · ⭐ REACHABILITY — EVERY KIND OFFERED, FOR ITS SCOPE (ARCHITECT-MANDATED) ═════════ */
  const P = await room('property');
  console.log('  P ' + JSON.stringify({ groups: P.groups, n: P.opts && P.opts.length }));
  ok(cat.vehicle.every((k) => V.opts.indexOf(k) >= 0),
     'K1 ⭐ EVERY vehicle catalogue kind is REACHABLE in the vehicle dropdown — missing: '
     + JSON.stringify(cat.vehicle.filter((k) => V.opts.indexOf(k) < 0)));
  ok(cat.property.every((k) => P.opts.indexOf(k) >= 0),
     'K2 ⭐ EVERY property catalogue kind is REACHABLE in the property dropdown — missing: '
     + JSON.stringify(cat.property.filter((k) => P.opts.indexOf(k) < 0)));

  /* ══ SCENE S · SCOPE ISOLATION, BOTH DIRECTIONS ═════════════════════════════════════════════════
     ⛔ K alone would pass a dropdown that offered EVERYTHING. Presence needs exclusion. */
  ok(!V.opts.some((k) => k === 'pool' || k === 'lawn' || k === 'electricity'),
     'S3 [INVARIANT · VEHICLE] a car is NOT offered pool / lawn / electricity — got ' + JSON.stringify(V.opts));
  ok(!P.opts.some((k) => k === 'fuel' || k === 'tolls' || k === 'parking'),
     'S4 [INVARIANT · PROPERTY] a house is NOT offered fuel / tolls / parking — got ' + JSON.stringify(P.opts));
  ok(P.flat.indexOf('Show upkeep costs') >= 0 && P.flat.indexOf('Track running costs') < 0,
     'S5 [INVARIANT · PROPERTY] the property room keeps its OWN chrome — the vehicle words did not leak in');
  /* ⭐ THE SHARED ROW, PROVEN SHARED: `maintenance` carries scope ['property','vehicle'], so it must
     appear in BOTH. This is what §45.5's "scope is an attribute, not a prefix" buys, and a forked
     vehMaintenance would fail it. */
  ok(V.opts.indexOf('maintenance') >= 0 && P.opts.indexOf('maintenance') >= 0,
     'S6 [§45.5] the SHARED `maintenance` kind is offered in BOTH scopes — one row, not two');
  /* ⛔ AND THE HOVER THAT MUST NOT CROSS. The property maintenance hover cites "1% of the home's
     value", which is FALSE about a car. A shared row with an unscoped hover would print it. */
  /* ⛔ CAUGHT BY READING THE GATE'S OWN OUTPUT, NOT BY A LEG — which is why it is now a leg. The
     vehicle dropdown rendered an optgroup headed "PROPERTY SERVICES" because the shared
     `maintenance` row carried the property group and the heading map keys on group.
     🔑 A GATE PRINTS WHAT IT SAW FOR A REASON; READ IT EVEN WHEN EVERY LEG IS GREEN. */
  ok((V.groups || []).every((g) => !/PROPERT/i.test(g)),
     'S8 ⛔ no optgroup in a VEHICLE room says "property" — got ' + JSON.stringify(V.groups));
  ok((P.groups || []).some((g) => /PROPERTY SERVICES/.test(g)),
     'S9 [PRESENCE CONTROL] and the PROPERTY room still has its PROPERTY SERVICES group — S8 is scoped, not a global delete');
  ok(V.flat.indexOf('1% of the home') < 0,
     'S7 ⛔ the house 1%-of-value rule of thumb does NOT appear in a vehicle room (it is false there)');

  /* ══ SCENE H · §47.1 — SIX AUTHORED HOVERS, TWO OF THEM TYPE-AWARE ══════════════════════════════
     ⭐ H4/H5 are the pair that matter: `insurance` and `parking` are ONE STORED KIND EACH wearing a
     different coat by type (§40.2 x §45.5 meeting on one row). A boat's marine premium and a car's
     auto premium are the same dollar; a boat's SLIP is the same ROW as a car's parking, which is
     exactly why §45.4 ruled parking undroppable. */
  const addAll = async (vType) => p.evaluate(async (vt) => {
    window.state.accounts.length = 0;
    /* ⛔ THE LEDGER IS GLOBAL AND SURVIVES AN ACCOUNT RESET. Clearing accounts alone left scene H's
       rows alive into scene C, and P1 (which asserts EXACTLY ONE fuel row) went red on my own
       fixture rather than on the product. 🔑 A PRECISE ASSERTION CAUGHT IT; `>= 1` would have hidden
       it. Every scene now builds its own ledger state. */
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000; if (vt) a.vehicleType = vt;
    renderInputs(); await new Promise((r) => setTimeout(r, 400));
    _upkForScope('vehicle', vt || '').forEach((c) => createPropertyUpkeep(a.id, c.kind));
    await new Promise((r) => setTimeout(r, 400));
    openAccountModal(a.id); await new Promise((r) => setTimeout(r, 400));
    return (document.getElementById('modal-dynamic-content').textContent || '').replace(/\s+/g, ' ');
  }, vType);

  const CAR = await addAll('Car / Truck / SUV');
  ok(CAR.indexOf('What you pay to insure it, per year.') >= 0, 'H1 [§47.1] insurance hover renders on a car');
  ok(CAR.indexOf('Yearly registration, tags and any inspection.') >= 0, 'H2 [§47.1] registration hover renders');
  ok(CAR.indexOf('Roughly what you spend a year getting it moving') >= 0, 'H3 [§47.1] fuel hover renders');
  ok(CAR.indexOf('most people underestimate this one') >= 0,
     'H3b [§47.1] the maintenance hover names the bias — plain-coach, and it must not be softened');
  ok(CAR.indexOf('What you spend a year on tolls') >= 0, 'H3c [§47.1] tolls hover renders');
  ok(CAR.indexOf('Parking or storage, if you pay for it.') >= 0, 'H3d [§47.1] the CAR parking hover renders');

  const BOAT = await addAll('Boat');
  ok(BOAT.indexOf('Boats need their own policy') >= 0,
     'H4 ⭐ [§33.6 VERBATIM] a BOAT gets the MARINE insurance hover — same kind, different coat');
  ok(BOAT.indexOf('a marina slip, dry storage, or a yard') >= 0,
     'H5 ⭐ [§33.6 VERBATIM] and the SLIP hover on the parking row — the row §45.4 ruled undroppable');
  /* ⛔ THE INVARIANT TWIN: the car words must be GONE on a boat, not merely joined by boat words. */
  ok(BOAT.indexOf('What you pay to insure it, per year.') < 0 && BOAT.indexOf('Parking or storage, if you pay for it.') < 0,
     'H6 ⛔ [INVARIANT] and the CAR hovers are ABSENT on a boat — a coat swapped, not a coat added');
  const RV = await addAll('RV or Camper');
  ok(RV.indexOf('Where the RV sits between trips') >= 0,
     'H7 [§33.6 VERBATIM] an RV gets its own storage hover');
  ok(RV.indexOf('What you pay to insure it, per year.') >= 0,
     'H8 [INVARIANT] but an RV keeps the standard insurance hover — only the BOAT swaps that one');

  /* ══ SCENE L · THE LABEL SWAPS WITH THE HOVER (Captain-approved) ════════════════════════════════
     §47.1 authored the boat/RV HOVERS but not their LABELS, which briefly left a boat reading
     "Auto insurance premium" above a hover explaining that auto insurance does not cover boats.
     Labels are §33.6's own row names — wiring, not authoring. */
  ok(BOAT.indexOf('Marine insurance') >= 0 && BOAT.indexOf('Slip / storage fee') >= 0,
     'L1 [§33.6 LABELS] a BOAT is LABELLED "Marine insurance" and "Slip / storage fee"');
  ok(RV.indexOf('Storage when not in use') >= 0,
     'L2 [§33.6 LABELS] an RV is LABELLED "Storage when not in use"');
  /* ⛔ THE INVARIANT TWIN — a coat SWAPPED, not a coat ADDED. Without this, rendering BOTH labels
     would satisfy L1/L2 while being plainly broken. Same shape as the identity block's B3/B4. */
  ok(BOAT.indexOf('Auto insurance premium') < 0 && BOAT.indexOf('Parking or storage') < 0,
     'L3 ⛔ [INVARIANT] and the CAR labels are GONE on a boat, not merely joined');
  ok(CAR.indexOf('Auto insurance premium') >= 0 && CAR.indexOf('Parking or storage') >= 0
     && CAR.indexOf('Marine insurance') < 0,
     'L4 ⛔ [INVARIANT · CAR] the car still says the car words, and never the boat words');

  /* ══ SCENE M · ⭐⭐ THE MONEY SURVIVES THE TYPE SWITCH — THE POINT OF THE SHARED ROW ═════════════
     §45.4 called `parking` "the only line that survives a type switch into a boat's SLIP". This is
     that claim, measured: record a dollar figure on a CAR's parking row, correct the type to Boat,
     and the SAME dollars must still be there under the slip label. ⛔ A forked `slipFee` would make
     the user's money DISAPPEAR from the screen on the switch — the retained-value-no-surface trap,
     and precisely what §40.2 forbids. */
  const MSWITCH = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000; a.vehicleType = 'Car / Truck / SUV';
    renderInputs(); await new Promise((r) => setTimeout(r, 300));
    createPropertyUpkeep(a.id, 'parking');
    window._getUpkeepModel().items.forEach((i) => { if (i.propertyId === a.id) { i.amount = 400; i.freq = 'annual'; } });
    const before = window._getUpkeepModel().items.filter((i) => i.propertyId === a.id)
      .map((i) => [i.upkeepKind, i.amount]);
    updateAccField(a.id, 'vehicleType', 'Boat');       // the correction a real user makes
    await new Promise((r) => setTimeout(r, 500));
    openAccountModal(a.id); await new Promise((r) => setTimeout(r, 400));
    const after = window._getUpkeepModel().items.filter((i) => i.propertyId === a.id)
      .map((i) => [i.upkeepKind, i.amount]);
    return { before: before, after: after,
             flat: (document.getElementById('modal-dynamic-content').textContent || '').replace(/\s+/g, ' ') };
  });
  console.log('  M ' + JSON.stringify({ before: MSWITCH.before, after: MSWITCH.after }));
  ok(JSON.stringify(MSWITCH.before) === JSON.stringify(MSWITCH.after) && MSWITCH.after.length === 1
     && MSWITCH.after[0][0] === 'parking' && MSWITCH.after[0][1] === 400,
     'M1 ⭐⭐ $400 of parking SURVIVES the switch to Boat, same kind, same amount — ' + JSON.stringify(MSWITCH.after));
  ok(MSWITCH.flat.indexOf('Slip / storage fee') >= 0 && MSWITCH.flat.indexOf('Parking or storage') < 0,
     'M2 ⭐ and it is now ON SCREEN as the slip — the coat changed, the dollars did not');

  /* ══ SCENE C · CREATE, AND REFUSE OUT OF SCOPE ══════════════════════════════════════════════════ */
  const C = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    /* ⛔ THE LEDGER IS GLOBAL AND SURVIVES AN ACCOUNT RESET. Clearing accounts alone left scene H's
       rows alive into scene C, and P1 (which asserts EXACTLY ONE fuel row) went red on my own
       fixture rather than on the product. 🔑 A PRECISE ASSERTION CAUGHT IT; `>= 1` would have hidden
       it. Every scene now builds its own ledger state. */
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto'); addInstance('property');
    const car = window.state.accounts[0], house = window.state.accounts[1];
    car.value = 32000; house.value = 500000; house.utilYr = 2100; house.maintYr = 3000;
    renderInputs(); await new Promise((r) => setTimeout(r, 400));
    const carryBefore = calcCarryTotal(house);
    createPropertyUpkeep(car.id, 'fuel');          // valid for a vehicle
    createPropertyUpkeep(car.id, 'pool');          // ⛔ property-only — must be REFUSED
    await new Promise((r) => setTimeout(r, 400));
    const mine = window._getUpkeepModel().items.filter((i) => i.propertyId === car.id);
    mine.forEach((i) => { i.amount = 200; i.freq = 'monthly'; });
    renderInputs(); await new Promise((r) => setTimeout(r, 400));
    return {
      kinds: mine.map((i) => i.upkeepKind),
      carryBefore: carryBefore,
      carryAfter: calcCarryTotal(house),
      houseLines: window._getUpkeepModel().items.filter((i) => i.propertyId === house.id).length,
    };
  });
  console.log('  C ' + JSON.stringify(C));
  ok(C.kinds.indexOf('fuel') >= 0, 'C1 [CREATE] a vehicle kind creates a real ledger line owned by the vehicle');
  ok(C.kinds.length === 1, 'C2 [CREATE] exactly ONE line was created — got ' + JSON.stringify(C.kinds));
  ok(C.kinds.indexOf('pool') < 0,
     'C3 ⛔ [GUARD] a property-only kind is REFUSED on a vehicle — a guard that trusts the UI is not a guard');

  /* ══ SCENE V · ⭐ THE INVARIANT (ARCHITECT-MANDATED) ════════════════════════════════════════════ */
  ok(C.carryBefore === C.carryAfter,
     'V1 ⭐ a vehicle upkeep line moved the PROPERTY carrying total by ZERO — ' + C.carryBefore + ' -> ' + C.carryAfter);
  ok(C.houseLines === 0,
     'V2 [INVARIANT] and the house owns none of the vehicle\'s lines — ' + C.houseLines);

  /* ══ SCENE P · PERSISTENCE — the §33.1 class, re-checked for a NEW kind of row ═══════════════════ */
  const PS = await p.evaluate(() => {
    const DB = window.DatumBlueprint;
    if (!DB) return { err: 'hub missing' };
    const bp = DB['new'](); DB.captureDOM(bp);
    const rows = (bp.upkeep && bp.upkeep.items || []).filter((i) => i.upkeepKind === 'fuel');
    return { found: rows.length, kind: rows[0] && rows[0].upkeepKind, owner: !!(rows[0] && rows[0].propertyId) };
  });
  console.log('  PS ' + JSON.stringify(PS));
  ok(PS.found === 1 && PS.kind === 'fuel' && PS.owner,
     'P1 [PERSIST] the vehicle upkeep row serialises with BOTH its kind and its owner id');

  await b.close(); server.close();
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? '  RED' : '  GREEN'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE ERROR:', e && e.message); try { server.close(); } catch (x) {} process.exit(1); });
