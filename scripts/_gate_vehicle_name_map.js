/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   §25.1 · THE VEHICLE NAME MAP — THE ASSET HALF.
   Captain-approved 2026-08-12: "if someone had a boat, perhaps it DOESN'T become the garage, it's
   maybe the Boathouse." THE GRAMMAR: the ASSET room names the PLACE the thing sits.

     Boat          -> THE SLIP
     RV or Camper  -> THE PAD
     Car / Truck / SUV · Motorcycle · Other · BLANK  -> THE DRIVEWAY   (§25.2 fallback)

   ⛔ A REAL BOAT AND A REAL RV ARE BUILT AND RENDERED, AND THEIR RENDERED COPY IS READ. That is the
   standing requirement for this arc, and it exists because the fixture-reach census caught the same
   miss three times in two days: a map exercised only on cars has tested cars, not the map. Every one
   of the five options below is built and its tile read — not asserted from the source map.

   🔑 THE FALLBACK IS THE COMMON PATH, NOT THE EDGE. Most users never open the dropdown, so BLANK is
   what nearly every Driveway will be forever. It is asserted first (scene A) and again per-type.

   ── ⛔ THE CAR CASE IS THE CONTROL, AND IT IS THE POINT ──────────────────────────────────────────
   A map that renamed EVERY vehicle would satisfy "a boat says THE SLIP" perfectly. So the car,
   motorcycle, blank and Other cases each assert THE DRIVEWAY explicitly. 🔑 THE E3/E4 LAW, APPLIED
   TO A MAP: A NAME CHANGED EVERYWHERE IS NOT A NAME MAPPED. --renameall is that mutation.

   ── ⚠️ THE MERGED HALF IS NOT ASSERTED, BECAUSE IT DOES NOT EXIST ───────────────────────────────
   §25.1 also maps merged names (THE BOATHOUSE / THE CARPORT), and they are NOT wired. A financed
   vehicle renders `_roomNameOf(...) + _lienMetaSuffix(debts)` — so a boat with a loan correctly
   reads "THE SLIP / THE LIEN" today. There is no combined Garage room to rename (§9's three Garage
   forms are authored, not built), so a merged map would have nothing to attach to. Scene M asserts
   the CURRENT truth — the asset half applies inside a merged tile — rather than pretending the
   merged half shipped. ⛔ WHEN THE GARAGE COMBINED VIEW LANDS, SCENE M IS UPDATED DELIBERATELY.

   Usage: node scripts/_gate_vehicle_name_map.js [LABEL] [--renameall] [--nomap] [--blankdrifts]
     --renameall    every vehicle takes the boat name -> the car/blank controls red, boat stays green
     --nomap        the §25.1 branch is removed        -> boat + RV red, controls stay green
     --blankdrifts  blank resolves to a literal instead of base.meta -> A1 reds (§25.2 fallback)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const RENAMEALL   = process.argv.includes('--renameall');
const NOMAP       = process.argv.includes('--nomap');
const BLANKDRIFTS = process.argv.includes('--blankdrifts');
const NOSTALE     = process.argv.includes('--nostaleguard');
const BROADSCOPE  = process.argv.includes('--broadscope');
const NOPERSIST   = process.argv.includes('--nopersist');
const CRAMPED     = process.argv.includes('--crampedchooser');
const MUT = RENAMEALL || NOMAP || BLANKDRIFTS || NOSTALE || BROADSCOPE || NOPERSIST || CRAMPED;

const PORT = 8376;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

/* ── THE THREE CAPTAIN-SMOKE FIXES, EACH WITH ITS OWN CONTROL ────────────────────────────────────
   All three shipped green under gates that never touched the failing path, so each mutation below
   restores the EXACT pre-fix code and must red its own scene and no other. */
const A_INVAL = "            if(field === 'vehicleType' || field === 'ownershipStatus') { renderInputs(); openAccountModal(id); }";
const M_INVAL = "            /* §19.12 invalidation removed: --nostaleguard */";
const A_SCOPE = "            if (d.indexOf('mortgage') === 0 || d.indexOf('heloc') === 0) return false;   // secured by real property, never by a vehicle";
const M_SCOPE = "            /* mortgage/heloc exclusion removed: --broadscope */";
const A_PERSIST = "        if (a.vehicleType)     out.vehicleType     = a.vehicleType;";
/* --crampedchooser reproduces the Captain's sighting: the type row too narrow for three buttons, so
   they wrap into a ragged stack. Reverting the row split alone would NOT bite (three fit inside 440
   once Cancel leaves the row), so the control squeezes the row itself — the actual failure shape. */
const A_ROW = "            + '<div style=\"display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-start; align-items:center;\">' + btns + '</div>'";
const M_ROW = "            + '<div style=\"display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; align-items:center; max-width:240px;\">' + btns + '</div>'   /* --crampedchooser */";
const M_PERSIST = "        /* vehicleType dropped from the save allowlist: --nopersist */";
const A_BRANCH = "        if (acc && /^auto(_primary|_co)?$/.test(String(base && base.id))) return VEHICLE_ROOM_NAME[acc.vehicleType] || shipped;";
const M_NOMAP  = "        /* §25.1 branch removed: --nomap */";
const M_ALL    = "        if (acc && /^auto(_primary|_co)?$/.test(String(base && base.id))) return 'The Slip';   /* every vehicle renamed: --renameall */";
const M_BLANK  = "        if (acc && /^auto(_primary|_co)?$/.test(String(base && base.id))) return VEHICLE_ROOM_NAME[acc.vehicleType] || 'The Vehicle';   /* fallback drifts off base.meta: --blankdrifts */";

function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
  const out = src.replace(a, () => m);
  if (out.indexOf(m) < 0) { console.error('mutation ' + label + ': did not land verbatim — refusing to test a corrupted fixture.'); process.exit(1); }
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
    if (NOMAP)       src = mutate(src, A_BRANCH, M_NOMAP, 'A_BRANCH/nomap');
    if (RENAMEALL)   src = mutate(src, A_BRANCH, M_ALL,   'A_BRANCH/renameall');
    if (BLANKDRIFTS) src = mutate(src, A_BRANCH, M_BLANK, 'A_BRANCH/blankdrifts');
    if (NOSTALE)     src = mutate(src, A_INVAL,  M_INVAL,  'A_INVAL');
    if (BROADSCOPE)  src = mutate(src, A_SCOPE,  M_SCOPE,  'A_SCOPE');
    if (CRAMPED)     src = mutate(src, A_ROW,    M_ROW,    'A_ROW');
    body = Buffer.from(src, 'utf8');
  }
  if (NOPERSIST && /studio-blueprint\.js$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_PERSIST, M_PERSIST, 'A_PERSIST'), 'utf8');
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
  await p.waitForSelector('#studio-layout', { timeout: 15000 });
  await p.waitForTimeout(400);

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [RENAMEALL ? 'renameall' : '', NOMAP ? 'nomap' : '', BLANKDRIFTS ? 'blankdrifts' : '',
       NOSTALE ? 'nostaleguard' : '', BROADSCOPE ? 'broadscope' : '', NOPERSIST ? 'nopersist' : '', CRAMPED ? 'crampedchooser' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* Builds ONE vehicle of the given type and reads the tile the user actually sees. `lien` attaches
     a real Vehicle Loan so the merged form can be read from the same helper (scene M). */
  const probe = async (type, lien) => p.evaluate(async (o) => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000;
    if (o.type) a.vehicleType = o.type;
    if (o.lien) {
      addInstance('auto_debt_joint');
      const d = window.state.accounts[1];
      d.value = 9000; d.linkedAssetId = a.id;
    }
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 1000));
    const svg = document.getElementById('bp-svg');
    const g = Array.prototype.slice.call(svg.querySelectorAll('g.room-grp'))
      .filter((x) => (x.getAttribute('onclick') || '').indexOf("'" + a.id + "'") >= 0)[0];
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    return {
      drawn: !!g,
      labels: g ? Array.prototype.slice.call(g.querySelectorAll('text')).map((t) => (t.textContent || '').trim()) : [],
      aria: g ? (g.getAttribute('aria-label') || '') : '',
      total: Number(String(txt).replace(/[$,\s]/g, '')),
    };
  }, { type, lien });

  /* ══ SCENE A · BLANK — THE §25.2 FALLBACK, AND THE COMMON PATH ═══════════════════════════════════ */
  const A = await probe(null, false);
  console.log('  A(blank) ' + JSON.stringify(A.labels));
  ok(A.drawn, 'A0 [PRESENCE] a blank vehicle is DRAWN as a real tile');
  ok(A.labels.indexOf('THE DRIVEWAY') >= 0,
     'A1 [§25.2 FALLBACK] blank draws THE DRIVEWAY — the path nearly every Driveway stays on — ' + JSON.stringify(A.labels));

  /* ══ SCENE B · THE TWO TYPES THAT MOVE — BUILT AND RENDERED, NOT ASSERTED FROM THE MAP ═══════════ */
  const BOAT = await probe('Boat', false);
  console.log('  B(boat) ' + JSON.stringify(BOAT.labels) + ' aria=' + JSON.stringify(BOAT.aria));
  ok(BOAT.drawn, 'B0 [PRESENCE] a REAL BOAT is built and drawn');
  ok(BOAT.labels.indexOf('THE SLIP') >= 0,
     'B1 [§25.1] a BOAT draws THE SLIP — ' + JSON.stringify(BOAT.labels));
  ok(BOAT.labels.indexOf('THE DRIVEWAY') < 0,
     'B2 [§25.1] and the car name is GONE from the boat tile — a map that adds without replacing is not a map');
  /* ⚠️ NO A11Y LEG HERE, AND THE REASON IS A PRE-EXISTING GAP I AM FLAGGING RATHER THAN PINNING.
     I first asserted the accessible name also said THE SLIP, because datum-estate.js:414 builds one
     from this very helper. It came back EMPTY: that aria-label belongs to the FOLD renderer
     (`datum-fold-room`), and MAIN COLUMN ROOM TILES CARRY NO aria-label AT ALL. So the leg was
     testing a surface this tile does not have.
     ⛔ AND I WILL NOT INVERT IT INTO "aria is empty" AS A PASSING LEG — that would pin a defect as
     correct behaviour and make it permanent. The gap predates §25.1 and is out of this commit's
     scope; it is reported to the Architect instead. When column tiles gain an accessible name, the
     leg comes back here and asserts the map reaches it. */

  const RV = await probe('RV or Camper', false);
  console.log('  B(rv) ' + JSON.stringify(RV.labels));
  ok(RV.drawn, 'B4 [PRESENCE] a REAL RV is built and drawn');
  ok(RV.labels.indexOf('THE PAD') >= 0,
     'B5 [§25.1] an RV draws THE PAD — ' + JSON.stringify(RV.labels));
  ok(RV.labels.indexOf('THE DRIVEWAY') < 0,
     'B6 [§25.1] and the car name is GONE from the RV tile');

  /* ══ SCENE C · THE CONTROL — THE THREE TYPES THAT MUST *NOT* MOVE ════════════════════════════════
     ⛔ WITHOUT THIS SCENE, RENAMING EVERY VEHICLE 'THE SLIP' WOULD PASS SCENE B PERFECTLY. */
  for (const t of ['Car / Truck / SUV', 'Motorcycle', 'Other']) {
    const C = await probe(t, false);
    ok(C.labels.indexOf('THE DRIVEWAY') >= 0 && C.labels.indexOf('THE SLIP') < 0 && C.labels.indexOf('THE PAD') < 0,
       'C [CONTROL] "' + t + '" still draws THE DRIVEWAY — ' + JSON.stringify(C.labels));
  }

  /* ══ SCENE D · THE NAME MOVED NO MONEY ══════════════════════════════════════════════════════════ */
  ok(BOAT.total === A.total && RV.total === A.total && BOAT.total === 32000,
     'D1 [MONEY] naming a room moved no money — blank ' + A.total + ', boat ' + BOAT.total + ', rv ' + RV.total);

  /* ══ SCENE M · THE MERGED TILE — CURRENT TRUTH, NOT THE UNBUILT HALF ═════════════════════════════
     A boat carrying a lien reads "THE SLIP / THE LIEN": the asset half of §25.1 applies, and the
     merged half (THE BOATHOUSE) is not wired because there is no combined Garage room yet.
     ⛔ THIS LEG IS A CHECKPOINT. When the Garage combined view lands, it is UPDATED DELIBERATELY —
     the same discipline as D2 in _gate_vehicle_field_pair. */
  const M = await probe('Boat', true);
  console.log('  M(boat+lien) ' + JSON.stringify(M.labels));
  ok(M.labels.some((s) => /^THE SLIP \//.test(s)),
     'M1 [§25.1 · MERGED] a financed boat reads "THE SLIP / …" — the asset half applies inside the merged tile — ' + JSON.stringify(M.labels));
  ok(!M.labels.some((s) => /BOATHOUSE/.test(s)),
     'M2 [CHECKPOINT] THE BOATHOUSE is NOT rendered — the merged map rides the Garage combined view, which is unbuilt. Flip this leg when it lands.');

  /* ══ SCENE H · THE HANDLER, NOT THE RENDERER — CAPTAIN-FOUND 2026-08-13 ═════════════════════════
     ⛔⛔ EVERY LEG ABOVE ASSIGNS acc.vehicleType AND THEN CALLS renderInputs()/updateSVGs(). §13.72
     names that exactly: A TEST THAT SETS STATE AND THEN RE-RENDERS PROVES THE RENDERER, NEVER THE
     HANDLER. All fourteen were green while the LEFT CARD never repainted on a real dropdown change,
     because a fresh render is the one thing that hides it. 196 gates were green over the identical
     defect on propPurpose (§19.12); this file made it fifteen.
     ⭐ SO THIS SCENE TOUCHES NOTHING BUT THE <select>. It opens the modal, changes the option, and
     dispatches `change` — then reads BOTH surfaces after the debounce settles. No renderInputs, no
     updateSVGs, no state poke. 🔑 THE ONLY HONEST TEST OF A HANDLER IS THE CONTROL ITSELF. */
  const viaHandler = async (val) => p.evaluate(async (v) => {
    const a = window.state.accounts[0];
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 300));
    const sel = document.querySelector('#modal-dynamic-content select[onchange*="vehicleType"]');
    if (!sel) return { err: 'no vehicleType select in the modal' };
    sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1300));
    const svg = document.getElementById('bp-svg');
    const g = Array.prototype.slice.call(svg.querySelectorAll('g.room-grp'))
      .filter((x) => (x.getAttribute('onclick') || '').indexOf("'" + a.id + "'") >= 0)[0];
    const card = document.querySelector('.room-meta');
    return {
      stored: a.vehicleType || '(blank)',
      leftCard: card ? card.textContent.trim() : null,
      canvas: g ? Array.prototype.slice.call(g.querySelectorAll('text')).map((t) => t.textContent.trim()).filter((s) => /^THE /.test(s)) : [],
    };
  }, val);

  await probe(null, false);   // reset to one blank vehicle
  for (const [pick, want] of [['Boat', 'The Slip'], ['Car / Truck / SUV', 'The Driveway'], ['RV or Camper', 'The Pad']]) {
    const H = await viaHandler(pick);
    console.log('  H(' + pick + ') ' + JSON.stringify(H));
    ok(!H.err && H.stored === pick, 'H [HANDLER] picking "' + pick + '" in the real dropdown stores it — ' + JSON.stringify(H.stored));
    ok(H.canvas.indexOf(want.toUpperCase()) >= 0,
       'H [HANDLER · CANVAS] the canvas shows ' + want.toUpperCase() + ' — ' + JSON.stringify(H.canvas));
    /* ⭐⭐ THE LEG THE CAPTAIN FOUND. The left card is fed by the SAME _propRoomName, so a
       disagreement here is staleness, never a second source of truth. */
    ok(H.leftCard === want,
       'H [HANDLER · LEFT CARD] and the room card agrees — got "' + H.leftCard + '", want "' + want + '"');
  }

  /* ══ SCENE L · THE LIABILITY SCOPE — WHAT MAY BE SECURED BY A VEHICLE ════════════════════════════
     Captain smoke: a boat could take a MORTGAGE. Excluded as definitional (a mortgage is secured by
     real property). Revolving/personal stay — A5 of _gate_estate_lien_net_equity gates the merge as
     family-agnostic, and breaking an authored assertion to satisfy a preference is not a fix. */
  const L = await p.evaluate(() => {
    const veh = { id: 'auto', type: 'joint' };
    const prop = { id: 'property', type: 'joint' };
    const names = (base) => {
      const rev = window._assetReverseScopeProbe ? window._assetReverseScopeProbe(base) : null;
      return rev;
    };
    return { veh: names(veh), prop: names(prop) };
  });
  /* _assetReverseScope is module-scoped, so the scope is read through the RENDERED picker instead —
     the surface the user actually meets. */
  const picker = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('auto'); const a = window.state.accounts[0]; a.value = 32000;
    addInstance('mortgage_joint');  window.state.accounts[1].value = 100;
    addInstance('heloc_joint');     window.state.accounts[2].value = 100;
    addInstance('auto_debt_joint'); window.state.accounts[3].value = 100;
    addInstance('rev_debt_joint');  window.state.accounts[4].value = 100;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 800));
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const m = document.getElementById('modal-dynamic-content');
    const rows = Array.prototype.slice.call(m.querySelectorAll('[onclick*="linkExistingLiability"],[onclick*="_linkExisting"],details div'))
      .map((e) => (e.textContent || '').trim());
    return rows.join(' | ');
  });
  console.log('  L ' + JSON.stringify(picker.slice(0, 220)));
  ok(!/Mortgage/.test(picker),
     'L1 [SCOPE] a MORTGAGE cannot be secured by a vehicle — absent from the vehicle link list');
  ok(!/HELOC/.test(picker),
     'L2 [SCOPE] nor a HELOC — it is drawn against HOME equity');
  ok(/Vehicle Loan/.test(picker),
     'L3 [CONTROL] and the Vehicle Loan IS still offered — a scope that excluded everything would pass L1/L2 while breaking the room');

  /* ══ SCENE T · THE DRAFT CHOOSER — THREE TYPES MUST FLOW ON ONE ROW ═════════════════════════════
     ⛔ MEASURED GEOMETRY, NOT A CLASS NAME. "They flow side by side" is a claim about pixels, and a
     flex container with `flex-wrap:wrap` satisfies every markup assertion while wrapping into a
     ragged stack — which is exactly what the Captain saw. So this reads each button's rendered
     top edge and requires them to share ONE row.
     🔑 THE OLD LAYOUT ONLY EVER LOOKED RIGHT BECAUSE A PROPERTY OFFERS EXACTLY TWO TYPES. A layout
     tuned to the count it happened to have is not a layout, so the vehicle's THREE is the fixture. */
  const T = await p.evaluate(async () => {
    const a = window.state.accounts.filter((x) => x.baseId === 'auto')[0];
    window._draftLiabilityChooser(a.id);
    await new Promise((r) => setTimeout(r, 350));
    const ov = document.getElementById('type-chooser-overlay');
    if (!ov || ov.style.display === 'none') return { err: 'chooser did not open' };
    const btns = Array.prototype.slice.call(ov.querySelectorAll('button[data-base]'));
    const tops = btns.map((b) => Math.round(b.getBoundingClientRect().top));
    const cancel = ov.querySelector('#tc-cancel');
    const prompt = (ov.textContent || '').replace(/\s+/g, ' ');
    return {
      count: btns.length,
      labels: btns.map((b) => (b.textContent || '').trim()),
      rows: Array.from(new Set(tops)).length,
      cancelBelow: cancel ? Math.round(cancel.getBoundingClientRect().top) > Math.max.apply(null, tops) : null,
      prompt: prompt,
    };
  });
  console.log('  T ' + JSON.stringify(T));
  ok(!T.err && T.count === 3,
     'T0 [PRESENCE] the vehicle chooser offers exactly THREE types — ' + JSON.stringify(T.labels));
  ok(T.rows === 1,
     'T1 [LAYOUT] all three sit on ONE row — distinct top edges: ' + T.rows + ' (want 1)');
  ok(T.cancelBelow === true,
     'T2 [LAYOUT] Cancel sits BELOW them, not interleaved in the wrap');
  /* The noun, in the third place it was hardcoded. */
  ok(/secured by this vehicle\?/.test(T.prompt),
     'T3 [COPY] the chooser asks about a VEHICLE, not a property — "' + T.prompt.slice(0, 90) + '"');

  /* ══ SCENE P · THE CLERK ARCHIVE MIRROR — AND MY FIRST DIAGNOSIS OF IT WAS WRONG ════════════════
     ⚠️ I REPORTED THIS AS "vehicleType IS NOT PERSISTED — SILENT DATA LOSS" AND THAT WAS FALSE FOR
     THE PATH THAT MATTERS MOST. There are THREE serializers and they do different jobs:
       · captureDOM        — `bp.accounts = state.accounts.slice()`. Keeps EVERY field. No allowlist.
       · toD1Document      — "FULL FIDELITY: strip only runtime _-prefixed ephemerals … the path that
                             makes 'save persists everything' true." vehicleType ALWAYS survived D1.
       · slimSlotForClerk  — the ARCHIVE MIRROR for slots 1-4, a deliberate <5KB budget that "drops
                             anything regenerable". THIS one is an allowlist, and this one dropped it.
     🔑 I FOUND AN ALLOWLIST, ASSUMED IT WAS *THE* SERIALIZER, AND CALLED IT DATA LOSS. The first
     control I wrote (--nopersist) STAYED GREEN and that is what caught me: it was aimed at
     captureDOM, which never had the gap. A CONTROL THAT DOES NOT BITE IS EVIDENCE — for the fourth
     time in this session, and this time the thing it disproved was my own bug report.
     ⭐ THE FIX IS STILL RIGHT, FOR A NARROWER REASON. vehicleType and ownershipStatus are USER
     CHOICES THAT CHANGE ROOM IDENTITY — the same class as propPurpose and trustType, which are
     already in this slim list for exactly that reason. They are not regenerable, so the budget does
     not get to drop them. A blueprint restored from the CLERK MIRROR would otherwise come back as a
     Driveway. This scene reads the REAL slimSlotForClerk output. */
  const P2 = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000; a.vehicleType = 'Boat'; a.ownershipStatus = 'Financed';
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 700));
    const DB = window.DatumBlueprint;
    if (!DB || !DB.captureDOM || !DB.slimSlotForClerk) return { err: 'hub missing' };
    const bp = DB['new']();
    DB.captureDOM(bp);
    const full = (bp.accounts || []).filter((x) => x.baseId === 'auto')[0] || null;
    const slim = DB.slimSlotForClerk(bp);
    const room = ((slim && slim.accounts) || []).filter((x) => x.baseId === 'auto')[0] || null;
    return {
      fullKeeps: !!(full && full.vehicleType === 'Boat'),
      found: !!room,
      vehicleType: room && room.vehicleType,
      ownershipStatus: room && room.ownershipStatus,
    };
  });
  console.log('  P ' + JSON.stringify(P2));
  ok(!P2.err && P2.found, 'P0 [PRESENCE] the vehicle survives into the slim Clerk slot at all');
  /* The CONTROL: the full-fidelity path was never the gap and must be seen to be fine, or a future
     reader repeats my mistake and "fixes" a serializer that was already correct. */
  ok(P2.fullKeeps, 'P0 [CONTROL] captureDOM keeps vehicleType with no allowlist — this path never lost it');
  ok(P2.vehicleType === 'Boat',
     'P1 [PERSIST · CLERK MIRROR] vehicleType survives the slim slot — got ' + JSON.stringify(P2.vehicleType) + ', want "Boat"');
  ok(P2.ownershipStatus === 'Financed',
     'P2 [PERSIST · CLERK MIRROR] ownershipStatus survives too — got ' + JSON.stringify(P2.ownershipStatus) + ', want "Financed"');

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
