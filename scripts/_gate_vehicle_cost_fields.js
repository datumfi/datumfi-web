/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   §45.3 · THE VEHICLE'S TWO-LAYER COST SHAPE — ROWS WIN, THE TYPED FIELD IS THE FALLBACK.
   Step 2b, the typed layer. Six annual fields on the Vehicle room, each the fallback for one
   catalogue kind. Nothing sums them yet — the Real Monthly reads them next.

   ⭐⭐ THE SEQUENCING REASON, BECAUSE IT EXPLAINS WHY THIS GATE EXISTS BEFORE THE REAL MONTHLY:
   THE TYPED FIELDS *ARE* THE FALLBACK LAYER, AND THE FALLBACK IS THE LAYER MOST USERS WILL BE ON.
   A Real Monthly built first would read only TRACKED rows and silently UNDERSTATE every user who
   typed rather than tracked. The fallback is not an afterthought.

   ── ⭐ THE LOAD-BEARING LEG IS M3, AND IT IS NOT THE OBVIOUS ONE ─────────────────────────────────
   M1 (no row -> editable) and M2 (row -> read-only mirror) are the shape everyone would think to
   test. M3 is the one that matters: DELETE THE TRACKED ROW AND THE TYPED VALUE MUST COME BACK.
   A mirror that DESTROYED the typed figure the first time a user tracked a cost would be §40.2's
   vanishing-$1,400 defect wearing a new coat — the user's number gone, with a plausible-looking
   screen and nothing on it admitting the loss. --destroy reproduces exactly that.

   ⛔ AND THE RETENTION IS DELIBERATE, NOT INCIDENTAL. While a row exists the typed value is retained
   but NOT SHOWN — normally the retained-value-no-surface trap. It is acceptable here for the same
   reason the property's endorsement premiums are: the surface shows the TRUTH (the row's figure),
   the typed value is one deletion from being visible again, and no path sums both.

   ── ⛔⛔ THREE DEFECTS SHIPPED PAST THIS GATE AT 21/21 GREEN, AND THE CAPTAIN FOUND ALL THREE IN
      ONE SMOKE. Scene L exists because of that, and each L leg names the thing it missed:
        · THE PANEL NEVER APPEARED WHILE TYPING. The A-scene called renderInputs() and
          openAccountModal() itself before asserting — THE TEST PERFORMED THE REPAINT THE PRODUCT
          WAS MISSING. §13.72 exactly: state + re-render proves the RENDERER, never the HANDLER.
        · THE BREAKDOWN DID NOT RECONCILE. The A-fixture used 1800/2400/1200 — ALL DIVISIBLE BY 12 —
          so it never exercised rounding. His real figures showed $1,386 of parts under a $1,385
          headline. A FIXTURE THAT CANNOT PRODUCE THE FAILING STATE IS NOT A CONTROL.
        · A BOAT'S LEDGER ROW WAS NAMED "Auto insurance premium". The room resolved the label live
          and looked right; §03 — the surface that owns the dollar — did not.
      🔑 ALL THREE WERE VISIBLE IN THIRTY SECONDS OF USE AND INVISIBLE TO TWENTY-ONE GREEN LEGS.

   Usage: node scripts/_gate_vehicle_cost_fields.js [LABEL] [--nomirror] [--destroy] [--nodrop6]
                                                    [--fieldwins] [--norepaint] [--roundtotal] [--flatlabel]
     --nomirror   the field stays EDITABLE while a row exists -> M2 red. Two boxes, one bill: the
                  defect the Captain's own §28 smoke found on the property side.
     --destroy    tracking a cost CLEARS the typed field -> M3 red. ⭐ THE §40.2 VANISHING DEFECT.
     --nodrop6    the six keys leave the slim Clerk allowlist -> P red. The §33.1 data-loss class.
     --fieldwins  the resolver prefers the typed field over the ledger -> R2 red (an edited ledger
                  line would be ignored, and the room would show a stale number as fact).
     --norepaint  the live all-in update is removed -> L1 red. THE CAPTAIN'S #1: the panel never
                  appears while typing, only after some other action repaints the modal.
     --roundtotal the headline rounds the true total instead of summing the shown parts -> L2 red.
                  His $1,385 headline over $1,386 of parts, reproduced.
     --flatlabel  the created row's label ignores vehicleType -> L3/L4 red. A boat's ledger row
                  named 'Auto insurance premium'.
     --carnative  {keepPhrase} reverts to the hard-coded 'on the road' -> A6/W2/W3 red. The state a
                  boat owner briefly shipped in.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NOMIRROR  = process.argv.includes('--nomirror');
const DESTROY   = process.argv.includes('--destroy');
const NODROP6   = process.argv.includes('--nodrop6');
const FIELDWINS = process.argv.includes('--fieldwins');
const NOREPAINT = process.argv.includes('--norepaint');
const ROUNDTOTAL = process.argv.includes('--roundtotal');
const FLATLABEL = process.argv.includes('--flatlabel');
const CARNATIVE = process.argv.includes('--carnative');
const MUT = NOMIRROR || DESTROY || NODROP6 || FIELDWINS || NOREPAINT || ROUNDTOTAL || FLATLABEL || CARNATIVE;

const PORT = 8381;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

const A_MIRROR = "    function _vehCostFieldHTML(id, acc, c) {\n        var f = _vehCostField(c.kind);\n        var n = _vehKindAnnual(id, c.kind);";
const M_MIRROR = "    function _vehCostFieldHTML(id, acc, c) {\n        var f = _vehCostField(c.kind);\n        var n = 0;   /* mirror disabled: --nomirror */";

const A_DESTROY = "        upkeepItems.push({ id: 'upk_' + Math.random().toString(36).substr(2, 9), name: cat.label,";
const M_DESTROY = "        (function(){ var _f = (typeof _vehCostField === 'function') && _vehCostField(kind); if (_f && acc[_f]) acc[_f] = ''; })();   /* typed value destroyed: --destroy */\n        upkeepItems.push({ id: 'upk_' + Math.random().toString(36).substr(2, 9), name: cat.label,";

const A_WINS = "      var n = _vehKindAnnual(acc.id, kind);\n      if (n > 0) return n;\n      var f = _vehCostField(kind);\n      return f ? _num(acc[f]) : 0;";
const M_WINS = "      var f = _vehCostField(kind);\n      var typed = f ? _num(acc[f]) : 0;\n      if (typed > 0) return typed;   /* field beats rows: --fieldwins */\n      return _vehKindAnnual(acc.id, kind);";

const A_SLIM6 = "        if (a.vehInsYr)        out.vehInsYr        = a.vehInsYr;";
const M_SLIM6 = "        /* six typed costs dropped from the allowlist: --nodrop6 */\n        if (false)             out.vehInsYr        = a.vehInsYr;";

/* ── THE THREE CONTROLS FOR THE THREE DEFECTS THE CAPTAIN FOUND ─────────────────────────────────
   Each reproduces the SHIPPED behaviour he saw, so the leg that now catches it can be proven to
   bite rather than merely to be present. */
const A_REPAINT = "            if (/^veh(Ins|Reg|Fuel|Maint|Tolls|Parking)Yr$/.test(field)) {";
const M_REPAINT = "            if (false && /^veh(Ins|Reg|Fuel|Maint|Tolls|Parking)Yr$/.test(field)) {   /* live update removed: --norepaint */";

const A_ROUND = "        var shown = parts.map(function (x) { return { kind: x.kind, label: x.label, r: Math.round(x.mo) }; });\n        var total = shown.reduce(function (s, x) { return s + x.r; }, 0);";
const M_ROUND = "        var shown = parts.map(function (x) { return { kind: x.kind, label: x.label, r: Math.round(x.mo) }; });\n        var total = Math.round(_vehAllInMonthly(acc));   /* rounded true total, not the sum of parts: --roundtotal */";

/* --carnative: the pre-§48 sentence, hard-coded car-native. Reproduces exactly what shipped for one
   commit — the state in which a boat owner was told their costs keep the boat ON THE ROAD. */
const A_KEEP = "    function _vehKeepPhrase(acc) {\n        return ({ 'Car / Truck / SUV': 'on the road', 'RV or Camper': 'on the road',\n                  'Motorcycle': 'on the road', 'Boat': 'in the water' })[(acc && acc.vehicleType) || ''] || 'running';\n    }";
const M_KEEP = "    function _vehKeepPhrase(acc) { return 'on the road'; }   /* car-native again: --carnative */";

const A_LABEL = "        var cat = acc ? _propUpkeepKind(kind, _sc, _sc === 'vehicle' ? (acc.vehicleType || '') : '') : null;";
const M_LABEL = "        var cat = acc ? _propUpkeepKind(kind, _sc) : null;   /* type dropped from the label lookup: --flatlabel */";

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
    if (NOMIRROR)  src = mutate(src, A_MIRROR,  M_MIRROR,  'A_MIRROR');
    if (DESTROY)   src = mutate(src, A_DESTROY, M_DESTROY, 'A_DESTROY');
    if (FIELDWINS) src = mutate(src, A_WINS,    M_WINS,    'A_WINS');
    if (NOREPAINT) src = mutate(src, A_REPAINT, M_REPAINT, 'A_REPAINT');
    if (ROUNDTOTAL) src = mutate(src, A_ROUND,  M_ROUND,   'A_ROUND');
    if (FLATLABEL) src = mutate(src, A_LABEL,  M_LABEL,   'A_LABEL');
    if (CARNATIVE) src = mutate(src, A_KEEP,   M_KEEP,    'A_KEEP');
    body = Buffer.from(src, 'utf8');
  }
  if (NODROP6 && /studio-blueprint\.js$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_SLIM6, M_SLIM6, 'A_SLIM6'), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 20000 });
  await p.waitForTimeout(500);
  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [NOMIRROR ? 'nomirror' : '', DESTROY ? 'destroy' : '', NODROP6 ? 'nodrop6' : '', FIELDWINS ? 'fieldwins' : '', NOREPAINT ? 'norepaint' : '', ROUNDTOTAL ? 'roundtotal' : '', FLATLABEL ? 'flatlabel' : '', CARNATIVE ? 'carnative' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* ══ THE WHOLE ARC IN ONE FIXTURE — type, track, delete — because the CLAIM IS ABOUT TRANSITIONS.
     Three separate fixtures each in one state would test three states and never the moves between
     them, and M3 is precisely a move. */
  const T = await p.evaluate(async () => {
    const snap = (a) => {
      const m = document.getElementById('modal-dynamic-content');
      const f = (n) => m.querySelector('input[oninput*="\'' + n + '\'"]');
      const ro = Array.prototype.slice.call(m.querySelectorAll('input.curr-format[readonly]')).map((x) => x.value);
      return { insEditable: !!f('vehInsYr'), insShown: f('vehInsYr') ? f('vehInsYr').value : null,
               readonly: ro, stored: a.vehInsYr, canonIns: _canonVehCost(a, 'insurance') };
    };
    const repaint = async (id) => { renderInputs(); await new Promise((r) => setTimeout(r, 250));
      openAccountModal(id); await new Promise((r) => setTimeout(r, 350)); };

    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const a = window.state.accounts[0]; a.value = 32000;
    renderInputs(); await new Promise((r) => setTimeout(r, 300));

    // 1 — TYPED ONLY
    updateAccField(a.id, 'vehInsYr', '1800');
    updateAccField(a.id, 'vehFuelYr', '2400');
    await repaint(a.id);
    const typed = snap(a);
    const fieldCount = (function () {
      const m = document.getElementById('modal-dynamic-content');
      return ['vehInsYr', 'vehRegYr', 'vehFuelYr', 'vehMaintYr', 'vehTollsYr', 'vehParkingYr']
        .filter((k) => !!m.querySelector('input[oninput*="\'' + k + '\'"]')).length;
    })();

    // 2 — TRACKED (a ledger row for the same kind)
    createPropertyUpkeep(a.id, 'insurance');
    window._getUpkeepModel().items.forEach((i) => {
      if (i.propertyId === a.id && i.upkeepKind === 'insurance') { i.amount = 2400; i.freq = 'annual'; }
    });
    await repaint(a.id);
    const tracked = snap(a);

    // 3 — THE ROW IS DELETED. The typed figure must COME BACK.
    const row = window._getUpkeepModel().items.filter((i) => i.propertyId === a.id && i.upkeepKind === 'insurance')[0];
    removeUpkeepItem(row.id, false);
    await repaint(a.id);
    const restored = snap(a);
    return { fieldCount: fieldCount, typed: typed, tracked: tracked, restored: restored, id: a.id };
  });
  console.log('  T ' + JSON.stringify({ n: T.fieldCount, typed: T.typed, tracked: T.tracked, restored: T.restored }));

  ok(T.fieldCount === 6, 'T1 [PRESENCE] all SIX typed cost fields render on a vehicle — got ' + T.fieldCount);

  /* ── M · THE MIRROR, BOTH DIRECTIONS AND THE WAY BACK ────────────────────────────────────────── */
  ok(T.typed.insEditable && T.typed.insShown === '$1,800',
     'M1 [NO ROW] the typed field is EDITABLE and shows what was typed — ' + JSON.stringify(T.typed.insShown));
  ok(!T.tracked.insEditable && T.tracked.readonly.indexOf('$2,400') >= 0,
     'M2 [ROW EXISTS] the field becomes a READ-ONLY MIRROR of the row — ' + JSON.stringify(T.tracked.readonly));
  /* ⭐ THE LOAD-BEARING LEG. */
  ok(T.restored.insEditable && T.restored.insShown === '$1,800',
     'M3 ⭐⭐ [ROW DELETED] the TYPED VALUE COMES BACK — a mirror must never destroy what it covers — ' + JSON.stringify(T.restored.insShown));
  ok(T.tracked.stored === '1800',
     'M4 [RETENTION] and it was retained on the account THROUGHOUT, not re-typed — ' + JSON.stringify(T.tracked.stored));

  /* ── R · THE RESOLVER — ROWS WIN, FIELD IS FALLBACK ─────────────────────────────────────────── */
  ok(T.typed.canonIns === 1800, 'R1 [FALLBACK] with no row, _canonVehCost returns the TYPED figure — ' + T.typed.canonIns);
  ok(T.tracked.canonIns === 2400, 'R2 [ROWS WIN] with a row, it returns the ROW figure — ' + T.tracked.canonIns);
  ok(T.restored.canonIns === 1800, 'R3 [BOTH WAYS] and falls back again once the row is gone — ' + T.restored.canonIns);
  /* ⛔ THE SUM THAT MUST NOT EXIST. 1800 + 2400 = 4200 is the double-count this whole shape prevents;
     naming the forbidden number makes the leg legible to someone reading a failure. */
  ok(T.tracked.canonIns !== 4200,
     'R4 ⛔ [NO DOUBLE-COUNT] it never returns typed+row (4200) — one dollar, one owner');

  /* ── V · THE INVARIANT: a vehicle cost moves NO property total ───────────────────────────────── */
  const V = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto'); addInstance('property');
    const car = window.state.accounts[0], house = window.state.accounts[1];
    car.value = 32000; house.value = 500000; house.utilYr = 2100; house.maintYr = 3000;
    renderInputs(); await new Promise((r) => setTimeout(r, 350));
    const before = calcCarryTotal(house);
    ['vehInsYr', 'vehRegYr', 'vehFuelYr', 'vehMaintYr', 'vehTollsYr', 'vehParkingYr']
      .forEach((k) => updateAccField(car.id, k, '999'));
    renderInputs(); await new Promise((r) => setTimeout(r, 350));
    return { before: before, after: calcCarryTotal(house), houseHasVehKey: house.vehInsYr === undefined };
  });
  console.log('  V ' + JSON.stringify(V));
  ok(V.before === V.after,
     'V1 ⭐ six typed vehicle costs moved the PROPERTY carrying total by ZERO — ' + V.before + ' -> ' + V.after);
  ok(V.houseHasVehKey, 'V2 [INVARIANT] and the house grew none of the vehicle keys');

  /* ── G · THE PROPERTY ROOM DID NOT INHERIT THE BLOCK ─────────────────────────────────────────── */
  const G = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property');
    const a = window.state.accounts[0]; a.value = 500000;
    renderInputs(); await new Promise((r) => setTimeout(r, 350));
    openAccountModal(a.id); await new Promise((r) => setTimeout(r, 350));
    const m = document.getElementById('modal-dynamic-content');
    return { any: ['vehInsYr', 'vehFuelYr', 'vehTollsYr'].some((k) => !!m.querySelector('input[oninput*="\'' + k + '\'"]')),
             flat: (m.textContent || '').replace(/\s+/g, ' ') };
  });
  ok(!G.any, 'G1 [INVARIANT · GROUNDS] a PROPERTY room grew none of the six typed vehicle fields');
  ok(G.flat.indexOf('Show upkeep costs') >= 0,
     'G2 [PRESENCE CONTROL] and the property room really rendered — G1 is an absence in a room that exists');

  /* ── P · PERSISTENCE — the §33.1 class, third time this arc ──────────────────────────────────── */
  const P = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const a = window.state.accounts[0]; a.value = 32000;
    a.vehInsYr = '1800'; a.vehRegYr = '210'; a.vehFuelYr = '2400';
    a.vehMaintYr = '900'; a.vehTollsYr = '150'; a.vehParkingYr = '400';
    renderInputs(); await new Promise((r) => setTimeout(r, 400));
    const DB = window.DatumBlueprint; if (!DB) return { err: 'hub missing' };
    const bp = DB['new'](); DB.captureDOM(bp);
    const room = ((DB.slimSlotForClerk(bp) || {}).accounts || []).filter((x) => x.baseId === 'auto')[0] || null;
    const keys = ['vehInsYr', 'vehRegYr', 'vehFuelYr', 'vehMaintYr', 'vehTollsYr', 'vehParkingYr'];
    return { found: !!room, kept: room ? keys.filter((k) => room[k] !== undefined) : [], missing: room ? keys.filter((k) => room[k] === undefined) : keys };
  });
  console.log('  P ' + JSON.stringify(P));
  ok(P.found && P.kept.length === 6,
     'P1 ⛔ [ALLOWLIST] all SIX typed costs survive the slim Clerk mirror — missing: ' + JSON.stringify(P.missing));

  /* ══ A · §11.2/§11.3 THE ALL-IN BEAT ═══════════════════════════════════════════════════════════
     ⭐⭐ A3 IS THE LEG §11.3 DEMANDS BY NAME: "THE PARTS MUST SUM TO THE HEADLINE — a breakdown that
     doesn't reconcile is worse than none." It is computed from the RENDERED TEXT, not from the
     model, because a reconcile check that reads the same numbers the renderer read would agree with
     itself by construction and prove nothing. */
  const A = await p.evaluate(async () => {
    const build = async (vt, costs) => {
      window.state.accounts.length = 0;
      try { window._getUpkeepModel().items.length = 0; } catch (e) {}
      addInstance('auto');
      const a = window.state.accounts[0]; a.value = 32000; if (vt) a.vehicleType = vt;
      renderInputs(); await new Promise((r) => setTimeout(r, 250));
      Object.keys(costs).forEach((k) => updateAccField(a.id, k, String(costs[k])));
      renderInputs(); await new Promise((r) => setTimeout(r, 250));
      openAccountModal(a.id); await new Promise((r) => setTimeout(r, 350));
      const m = document.getElementById('modal-dynamic-content');
      return { flat: (m.textContent || '').replace(/\s+/g, ' '), allIn: _vehAllInMonthly(a),
               parts: _vehAllInParts(a).map((x) => [x.kind, Math.round(x.mo)]) };
    };
    return {
      none:  await build('Car / Truck / SUV', {}),
      car:   await build('Car / Truck / SUV', { vehInsYr: 1800, vehFuelYr: 2400, vehMaintYr: 1200 }),
      boat:  await build('Boat',              { vehInsYr: 1800, vehFuelYr: 2400 }),
    };
  });
  console.log('  A ' + JSON.stringify({ car: A.car.parts, allIn: A.car.allIn, boatSpoke: A.boat.flat.indexOf('All in, this') >= 0 }));

  ok(A.none.flat.indexOf('All in, this') < 0,
     'A1 [SOURCED-OR-BLANK] with NO cost sourced the beat is SILENT — never a $0 all-in');
  ok(A.car.flat.indexOf('All in, this car costs about $450/mo to keep on the road') >= 0,
     'A2 [§11.2 VERBATIM] the beat fires with the right noun and figure ((1800+2400+1200)/12 = 450)');
  /* ⭐ THE RECONCILE, READ OFF THE SCREEN. */
  const shown = (A.car.flat.match(/Of that \$([\d,]+): (.+?)\./) || []);
  const head = Number(String(shown[1] || '').replace(/,/g, ''));
  const sum = (String(shown[2] || '').match(/\$[\d,]+/g) || [])
    .reduce((s, x) => s + Number(x.replace(/[$,]/g, '')), 0);
  console.log('  A-reconcile headline=' + head + ' parts=' + sum + ' :: ' + JSON.stringify(shown[2]));
  ok(head > 0 && head === sum,
     'A3 ⭐⭐ [§11.3] THE BREAKDOWN PARTS SUM TO THE HEADLINE, read off the RENDERED text — ' + sum + ' vs ' + head);
  ok(/upkeep \(estimated\)|repairs \(estimated\)/i.test(A.car.flat),
     'A4 [§11.3/§11.4] the "(estimated)" tag STAYS on maintenance');
  ok(A.car.flat.indexOf('$0') < 0 || A.car.parts.every((x) => x[1] > 0),
     'A5 [L47] no zero-filled component reaches the breakdown — only sourced costs appear');
  /* ⏳ A6 INVERTED DELIBERATELY 2026-08-13 — §48 LANDED. It asserted a BOAT was never told its costs
     keep it "on the road", which was correct for exactly one commit: §11.2 had no boat variant, so
     the whole beat stayed silent rather than print a false place-phrase. §48.1 authored {keepPhrase}
     and the boat now says "in the water". ⛔ FLIPPED, NOT DELETED — the claim changed, so the leg
     follows the deliberate product change (the same discipline as the field pair's D2 and the name
     map's M2). ⭐ THE HALF THAT DOES NOT EXPIRE IS A7: the boat's ARITHMETIC was always right, and
     nothing §48 did was allowed to move it. */
  ok(A.boat.flat.indexOf('to keep in the water') >= 0 && A.boat.flat.indexOf('on the road') < 0,
     'A6 ⭐ [§48.1 LANDED] a BOAT is kept IN THE WATER, and is never told it is on the road');
  ok(A.boat.allIn === 350 && A.car.allIn === 450,
     'A7 [MONEY · UNCHANGED] and the arithmetic is exactly what it was before §48 — copy moved, numbers did not');

  /* ══ L · ⭐⭐ THE THREE DEFECTS THE CAPTAIN'S SMOKE FOUND THAT THIS GATE MISSED ═════════════════
     Every leg below exists because a green gate shipped a defect a human saw in thirty seconds.

     L1  THE PANEL MUST APPEAR WHILE TYPING. ⛔ THE ORIGINAL A-SCENE CALLED renderInputs() AND
         openAccountModal() ITSELF BEFORE ASSERTING — SO THE TEST PERFORMED THE REPAINT THE PRODUCT
         WAS MISSING. "State + re-render proves the RENDERER, never the HANDLER" (§13.72). This leg
         opens the modal ONCE, then types, then reads the DOM WITHOUT re-opening anything.
     L2  RECONCILIATION UNDER ROUNDING. The old fixture used 1800/2400/1200 — all divisible by 12 —
         so it never exercised rounding at all. These figures deliberately do not divide evenly.
     L3  THE CREATED LEDGER ROW MUST CARRY THE TYPE-AWARE NAME. Picking "Marine insurance" on a boat
         created a row NAMED "Auto insurance premium" in §03. */
  const L = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const a = window.state.accounts[0]; a.value = 32000; a.vehicleType = 'Car / Truck / SUV';
    renderInputs(); await new Promise((r) => setTimeout(r, 300));
    openAccountModal(a.id); await new Promise((r) => setTimeout(r, 350));
    const panel = () => document.getElementById('modal-veh-allin-' + a.id);
    const before = (panel() && panel().innerHTML.trim().length) || 0;

    /* ⛔ TYPE THE WAY THE PRODUCT DOES — the field's own oninput — AND THEN TOUCH NOTHING ELSE.
       No renderInputs(), no openAccountModal(). If the handler does not paint, this stays empty. */
    const box = document.querySelector(`#modal-dynamic-content input[oninput*="'vehInsYr'"]`);
    box.value = '2000';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    const afterTyping = (panel() && panel().textContent) || '';

    /* awkward annuals: 2000/12=166.67 · 5595/12=466.25 · 530/12=44.17 · 5555/12=462.92 · 550/12=45.83 */
    [['vehRegYr', 5595], ['vehFuelYr', 530], ['vehTollsYr', 5555], ['vehParkingYr', 550], ['vehMaintYr', 2000]]
      .forEach(([k, v]) => updateAccField(a.id, k, String(v)));
    await new Promise((r) => setTimeout(r, 250));
    const six = (panel() && panel().textContent || '').replace(/\s+/g, ' ');

    // L3 — a BOAT, created from the dropdown
    window.state.accounts.length = 0;
    try { window._getUpkeepModel().items.length = 0; } catch (e) {}
    addInstance('auto');
    const bt = window.state.accounts[0]; bt.value = 40000; bt.vehicleType = 'Boat';
    renderInputs(); await new Promise((r) => setTimeout(r, 250));
    createPropertyUpkeep(bt.id, 'insurance');
    createPropertyUpkeep(bt.id, 'parking');
    await new Promise((r) => setTimeout(r, 250));
    const names = window._getUpkeepModel().items.filter((i) => i.propertyId === bt.id).map((i) => i.name);
    return { before: before, afterTyping: afterTyping, six: six, boatNames: names };
  });
  console.log('  L ' + JSON.stringify({ before: L.before, typed: L.afterTyping.slice(0, 60), boatNames: L.boatNames }));

  ok(L.before === 0, 'L0 [BASELINE] with nothing sourced the all-in container is EMPTY');
  ok(L.afterTyping.indexOf('All in, this car') >= 0,
     'L1 ⭐⭐ [HANDLER] the panel APPEARS from TYPING ALONE — no repaint, no re-open. The defect the Captain found.');
  /* L2 — reconcile under rounding, parsed off the RENDERED text. */
  const m2 = L.six.match(/Of that \$([\d,]+): (.+?)\./) || [];
  const head2 = Number(String(m2[1] || '').replace(/,/g, ''));
  const sum2 = (String(m2[2] || '').match(/\$[\d,]+/g) || []).reduce((s, x) => s + Number(x.replace(/[$,]/g, '')), 0);
  const headline = Number((L.six.match(/about \$([\d,]+)\/mo/) || [])[1]?.replace(/,/g, '') || 0);
  console.log('  L2 headline=' + headline + ' ofThat=' + head2 + ' partsSum=' + sum2);
  ok(head2 > 0 && head2 === sum2 && headline === sum2,
     'L2 ⭐⭐ [§11.3 UNDER ROUNDING] six figures that do NOT divide by 12 still reconcile exactly — '
     + headline + ' / ' + head2 + ' / ' + sum2);
  ok(L.boatNames.indexOf('Marine insurance') >= 0 && L.boatNames.indexOf('Slip / storage fee') >= 0,
     'L3 ⭐ [CREATE LABEL] a BOAT creates ledger rows NAMED for a boat — ' + JSON.stringify(L.boatNames));
  ok(L.boatNames.indexOf('Auto insurance premium') < 0,
     'L4 ⛔ [INVARIANT] and the car name reaches §03 nowhere — the defect, asserted absent');

  /* ══ W · §48 — EVERY TYPE SPEAKS ITS OWN LANGUAGE, AND THE BOAT'S FLUENCY SITS BESIDE ITS SILENCE
     ⭐⭐ §48.8 IS THE REASON W5/W6 ARE IN THE SAME SCENE AND NOT TWO: "THE RISK §48 CREATES IS THAT A
     FLUENT ROOM FEELS LIKE A COMPLETE ONE." A boat that now talks confidently about its slip could
     easily be read as a boat whose VALUE we also model — and we do not, deliberately, because no
     marine depreciation curve is sourced. Proving the sentence in one scene and the silence in
     another would let a future commit break the second without ever disturbing the first. */
  const W = await p.evaluate(async () => {
    const one = async (vt) => {
      window.state.accounts.length = 0;
      try { window._getUpkeepModel().items.length = 0; } catch (e) {}
      addInstance('auto');
      const a = window.state.accounts[0]; a.value = 40000; if (vt) a.vehicleType = vt;
      renderInputs(); await new Promise((r) => setTimeout(r, 200));
      [['vehInsYr', 2000], ['vehRegYr', 5595], ['vehFuelYr', 530],
       ['vehTollsYr', 5555], ['vehParkingYr', 550], ['vehMaintYr', 2000]]
        .forEach(([k, v]) => updateAccField(a.id, k, String(v)));
      await new Promise(r => setTimeout(r, 200));
      openAccountModal(a.id); await new Promise((r) => setTimeout(r, 300));
      const m = document.getElementById('modal-dynamic-content');
      return (m.textContent || '').replace(/\s+/g, ' ');
    };
    return { car: await one('Car / Truck / SUV'), boat: await one('Boat'),
             rv: await one('RV or Camper'), moto: await one('Motorcycle'), blank: await one('') };
  });
  const has = (s, t) => W[s].indexOf(t) >= 0;

  /* §48.1 — and the split is NOT car-vs-rest: an RV and a motorcycle really are on the road. */
  ok(has('car', 'to keep on the road') && has('rv', 'to keep on the road') && has('moto', 'to keep on the road'),
     'W1 [§48.1] car, RV and motorcycle are all kept ON THE ROAD — the split is not car-vs-everything-else');
  ok(has('boat', 'to keep in the water'), 'W2 [§48.1] only the BOAT is kept IN THE WATER');
  ok(has('blank', 'to keep running') && !has('blank', 'on the road'),
     'W3 [§48.1] a blank type falls back to RUNNING — a real clause, not silence, and true of all five');
  /* §20.2 — the authored cost-noun list, per type. */
  ok(has('boat', 'the slip, insurance, winterising and upkeep') && has('rv', 'storage, insurance, registration and upkeep'),
     'W4 [§20.2] the sentence names the costs THAT owner actually pays');
  /* §48.3 — the tail neither of us caught first time. */
  ok(has('boat', 'for as long as you keep a boat') && !has('boat', 'keep a car'),
     'W5a [§48.3] the TAIL says "a boat" too — the indefinite article was the point, the noun was wrong');
  /* §48.5 — parking is the only type-aware short noun. */
  ok(has('boat', 'the slip.') || has('boat', 'the slip &middot;') || /\$\d+ the slip/.test(W.boat),
     'W5b [§48.5] the BREAKDOWN calls it the slip on a boat');
  ok(/\$\d+ storage/.test(W.rv) && /\$\d+ parking/.test(W.car),
     'W5c [§48.5] storage on an RV, parking on a car — one stored kind, three coats');
  /* §48.4 — the short nouns replaced the long catalogue labels. */
  ok(/\$\d+ upkeep \(estimated\)/.test(W.car) && W.car.indexOf('routine maintenance and repairs') < 0,
     'W5d [§48.4] the breakdown scans short — "upkeep (estimated)", not the full field label');
  /* §48.6 — the AUTHORED order, membership still derived. */
  ok(W.car.indexOf('insurance') < W.car.indexOf('upkeep (estimated)'),
     'W5e [§48.6] insurance precedes upkeep — the authored order, not catalogue order');

  /* ⛔⛔ §48.8 — THE SILENCE, ASSERTED IN THE SAME SCENE AS THE FLUENCY. */
  ok(has('boat', 'All in, this boat costs about'),
     'W6 ⭐ [FLUENCY] the boat speaks boat — its all-in sentence renders');
  ok(!/deprecia/i.test(W.boat) && !/est\. range/i.test(W.boat),
     'W7 ⛔⛔ [§48.8 · SILENCE, SAME SCENE] and that SAME fluent boat shows NO depreciation figure — no marine curve is sourced. A fluent room is not a complete one.');

  await b.close(); server.close();
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? '  RED' : '  GREEN'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE ERROR:', e && e.message); try { server.close(); } catch (x) {} process.exit(1); });
