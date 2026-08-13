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
const MUT = RENAMEALL || NOMAP || BLANKDRIFTS;

const PORT = 8376;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

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
    body = Buffer.from(src, 'utf8');
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
    ? [RENAMEALL ? 'renameall' : '', NOMAP ? 'nomap' : '', BLANKDRIFTS ? 'blankdrifts' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* Builds ONE vehicle of the given type and reads the tile the user actually sees. `lien` attaches
     a real Auto Loan so the merged form can be read from the same helper (scene M). */
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

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
