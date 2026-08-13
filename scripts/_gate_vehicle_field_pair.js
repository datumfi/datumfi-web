/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   §33.1 · THE VEHICLE FIELD PAIR — AND THE PROMISE THAT IT CHANGES NOTHING ELSE.
   Step 1 of the vehicle arc. Two optional fields land; NOTHING reads them yet, by design.

   ⭐ THE CLAIM THIS FILE EXISTS TO PIN IS A NEGATIVE ONE: adding `vehicleType` and
   `ownershipStatus` does not move a single thing outside the modal. The §25.1 name map, the
   type-specific fields, the cost list and the beats are all LATER commits — so on this commit a
   Boat must still draw THE DRIVEWAY, and the estate total must not flinch for any selection.
   ⛔ THAT IS THE WHOLE POINT OF LANDING THE PAIR ALONE. If the axis can be shown to change nothing,
   every branch built on it afterwards has a known-good baseline to fail against.

   🔑 AND THE MIGRATION GUARANTEE IS TRUE BY CONSTRUCTION HERE, WHICH IS RARE ENOUGH TO SAY OUT
   LOUD. Neither field existed in studio.html before this commit (zero-hit greps, 2026-08-13), so no
   saved blueprint carries either key. "Blank behaves exactly as today" is not a migration path that
   had to be handled carefully — blank is the ONLY state any existing Driveway can be in. The banks'
   belief that an ownership dropdown was already live turned out to be a spec row read as a live
   description; the correction made this step SIMPLER, not harder.

   ── ⛔⛔ WHY 'Leased' MUST BE ABSENT, AND WHY THAT IS AN ASSERTION AND NOT A TODO ────────────────
   §38.7's own law: DO NOT SHIP A CHOOSABLE OPTION WITH NO ENGINE BEHIND IT. §39 authors what a
   lease suppresses — value, equity, depreciation, the underwater beat, the lien link, the Garage —
   and none of it lands until a later commit. An ownership dropdown offering 'Leased' TODAY would
   let a user declare a lease and have it counted as an owned asset at full value in their net
   worth. That is the precise false number §39 exists to prevent, and the one §38.7 wrongly believed
   was already live. So D2 asserts the option is ABSENT. ⭐ WHEN §39 LANDS, D2 IS INVERTED
   DELIBERATELY — it is a checkpoint, not a permanent rule, and it says so here so the next Claude
   flips it on purpose rather than deleting a leg that looks inconvenient.

   Usage: node scripts/_gate_vehicle_field_pair.js [LABEL] [--namemap] [--leaked] [--nonoun]
     --namemap   pretends a later commit's type->name map arrived early (Boat -> THE SLIP) -> B2
                 reds. This is the mutation that proves B2 is watching, since B2 asserts a NEGATIVE
                 ("the name did NOT change") and a negative leg with no control is a sentence.
     --leaked    'Leased' is added to the dropdown with no engine -> D2 reds.
     --nonoun    the vehicle keeps the property noun -> E1 reds.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { studioSource } = require('./_studio_source.cjs');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NAMEMAP = process.argv.includes('--namemap');
const LEAKED  = process.argv.includes('--leaked');
const NONOUN  = process.argv.includes('--nonoun');
const MUT = NAMEMAP || LEAKED || NONOUN;

const PORT = 8375;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

const A_OPTS  = "                var _vOwnOpts  = ['Owned outright', 'Financed'];";
const M_OPTS  = "                var _vOwnOpts  = ['Owned outright', 'Financed', 'Leased'];   /* engine-less option: --leaked */";
const A_NOUN  = 'Liabilities secured by this vehicle';
const M_NOUN  = 'Liabilities secured by this property';   /* noun reverted: --nonoun */
/* ⚠️ --namemap AIMS AT `_propRoomName` (studio.html ~9753), AND FINDING THAT TOOK A FAILED CONTROL.
   My first cut patched datum-estate.js and replaced the literal 'THE DRIVEWAY'. THE CONTROL STAYED
   GREEN — because that literal exists in NEITHER file. Every tile name comes from `base.meta` via
   _roomNameOf -> window.DatumRoomNames.roomName -> _propRoomName, and is uppercased at the render
   site. The mutation had nothing to match, and `split().join()` no-ops SILENTLY, so a mutation that
   never landed was indistinguishable from a product that never broke.
   🔑 A CONTROL THAT DOES NOT BITE IS EVIDENCE. Chasing it found the ACTUAL extension point — which
   is precisely where §25.1's real map must go, so the failed control taught the NEXT commit its
   address. ⛔ And it now runs through mutate(), which VERIFIES the replacement landed. */
const A_MAP = "    function _propRoomName(acc, base) {\n        var shipped = String((base && base.meta) || 'The Grounds');";
const M_MAP = "    function _propRoomName(acc, base) {\n        var shipped = String((base && base.meta) || 'The Grounds');\n        if (acc && acc.vehicleType === 'Boat' && /^auto(_primary|_co)?$/.test(String(base && base.id))) return 'The Slip';   /* §25.1 arrives early: --namemap */";

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
    if (LEAKED)  src = mutate(src, A_OPTS, M_OPTS, 'A_OPTS');
    if (NONOUN)  src = mutate(src, A_NOUN, M_NOUN, 'A_NOUN');
    if (NAMEMAP) src = mutate(src, A_MAP,  M_MAP,  'A_MAP');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  /* ── S · SOURCE-LEVEL CENSUS, BEFORE THE BROWSER ────────────────────────────────────────────────
     Read through studioSource(), never off disk (_gate_studio_source P1). */
  const SRC = studioSource();
  ok(/vehicleType/.test(SRC) && /ownershipStatus/.test(SRC),
     'S1 [SOURCE] both new field keys exist in studio.html');
  /* ⚠️ ANCHORED ON THE OPTIONS ARRAY, NOT ON A WHOLE-FILE GREP. My first cut asserted the string
     'Leased' appeared nowhere in studio.html and it RED on its own commit — matching the source
     COMMENT that explains why the option is withheld. A file-wide grep cannot tell code from prose,
     so it would have forced the explanation to be deleted to make the gate green. The claim is about
     the OPTIONS ARRAY; this asserts exactly that, and D2 proves it again at the rendered level. */
  ok(/_vOwnOpts\s*=\s*\['Owned outright', 'Financed'\];/.test(SRC),
     "S2 [SOURCE · NO ENGINE-LESS OPTION] the ownership options array is exactly ['Owned outright','Financed'] — §39 has not landed, so 'Leased' must not be offered");

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 15000 });
  await p.waitForTimeout(400);
  await p.evaluate(() => { ['studioOverlayWrap', 'shape-panel', 'privacy-banner'].forEach((id) => {
    const o = document.getElementById(id); if (o) { o.style.display = 'none'; o.style.pointerEvents = 'none'; }
  }); });

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [NAMEMAP ? 'namemap' : '', LEAKED ? 'leaked' : '', NONOUN ? 'nonoun' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* Builds one vehicle at a known value, optionally stamps the pair, and reads BOTH the canvas and
     the modal. `ov` is applied straight to state so the scene is reached without depending on the
     very controls under test — the controls are asserted separately in scene D. */
  const probe = async (ov) => p.evaluate(async (o) => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000;
    Object.keys(o || {}).forEach((k) => { a[k] = o[k]; });
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 1000));
    const svg = document.getElementById('bp-svg');
    const g = Array.prototype.slice.call(svg.querySelectorAll('g.room-grp'))
      .filter((x) => (x.getAttribute('onclick') || '').indexOf("'" + a.id + "'") >= 0)[0];
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const modal = document.getElementById('modal-dynamic-content');
    const sel = (n) => {
      const el = modal.querySelector('select[onchange*="' + n + '"]');
      return el ? Array.prototype.slice.call(el.options).map((x) => x.value) : null;
    };
    return {
      id: a.id,
      labels: g ? Array.prototype.slice.call(g.querySelectorAll('text')).map((t) => (t.textContent || '').trim()) : null,
      total: Number(String(txt).replace(/[$,\s]/g, '')),
      stored: { vehicleType: a.vehicleType, ownershipStatus: a.ownershipStatus },
      typeOpts: sel('vehicleType'),
      ownOpts: sel('ownershipStatus'),
      modalText: modal ? (modal.textContent || '').replace(/\s+/g, ' ') : null,
    };
  }, ov);

  /* ══ SCENE A · THE ROOM TODAY — BLANK ════════════════════════════════════════════════════════════ */
  const A = await probe({});
  console.log('  A ' + JSON.stringify({ labels: A.labels, total: A.total, typeOpts: A.typeOpts, ownOpts: A.ownOpts }));
  ok(A.labels && A.labels.length > 0, 'A0 [PRESENCE] the vehicle is DRAWN as a real tile');
  ok(A.labels.indexOf('THE DRIVEWAY') >= 0,
     'A1 [BASELINE] a blank vehicle draws THE DRIVEWAY — ' + JSON.stringify(A.labels));
  ok(A.total === 32000, 'A2 [BASELINE] and the estate total reads its value — ' + A.total);
  ok(A.stored.vehicleType === undefined && A.stored.ownershipStatus === undefined,
     'A3 [MIGRATION] a freshly-built vehicle carries NEITHER key — an absence, not a stored blank');

  /* ══ SCENE B · A BOAT MUST STILL LOOK EXACTLY LIKE TODAY ═════════════════════════════════════════
     ⭐⭐ THE LOAD-BEARING SCENE. §25.1 maps Boat -> THE SLIP, and that map is a LATER commit. If a
     Boat already renamed anything on this commit, the pair would not be an inert axis and every
     "unchanged" claim below would be false. */
  const B = await probe({ vehicleType: 'Boat', ownershipStatus: 'Owned outright' });
  console.log('  B ' + JSON.stringify({ labels: B.labels, total: B.total, stored: B.stored }));
  /* ⭐ CHECKPOINT EXPIRED, FLIPPED DELIBERATELY — 2026-08-13, §25.1 landed.
     B1/B2/B4 asserted that a Boat STILL drew THE DRIVEWAY and that no §25.1 name had leaked in
     early. That was true and load-bearing for exactly one commit: it proved the field pair was an
     inert axis. THE NAME MAP HAS NOW ARRIVED ON PURPOSE, so those legs are inverted here rather
     than deleted — the same discipline D2 documents for 'Leased'. ⛔ THE MONEY CLAIM DOES NOT
     EXPIRE and is what remains of the inertness thesis: naming a room must never move a dollar.
     🔑 A TEMPORARY ASSERTION MUST DOCUMENT ITS OWN EXPIRY, AND THEN ACTUALLY BE FLIPPED WHEN IT
     EXPIRES. The name legs now live in _gate_vehicle_name_map.js, which owns that subject. */
  ok(B.labels.indexOf('THE SLIP') >= 0,
     'B1 [§25.1 LANDED] a BOAT now draws THE SLIP — ' + JSON.stringify(B.labels));
  ok(B.total === A.total,
     'B3 [MONEY · UNCHANGED] naming a room moved NO money — ' + B.total + ' vs ' + A.total + ' (blank)');

  /* ══ SCENE C · EVERY OTHER TYPE IS EQUALLY INERT ═════════════════════════════════════════════════
     ⛔ ONE TYPE PROVES ONE TYPE. The fixture-reach census caught exactly this three times: a map
     exercised on a single value has tested that value, not the map. */
  const types = ['Car / Truck / SUV', 'RV or Camper', 'Motorcycle', 'Other'];
  for (const t of types) {
    const C = await probe({ vehicleType: t });
    ok(C.total === A.total,
       'C [MONEY · UNCHANGED] "' + t + '" moves no money (total ' + C.total + ')');
  }

  /* ══ SCENE D · THE CONTROLS THEMSELVES ══════════════════════════════════════════════════════════ */
  console.log('  D ' + JSON.stringify({ typeOpts: A.typeOpts, ownOpts: A.ownOpts }));
  ok(A.typeOpts !== null && A.ownOpts !== null,
     'D0 [PRESENCE] both dropdowns render in the Vehicle modal');
  ok(JSON.stringify(A.typeOpts) === JSON.stringify(['', 'Car / Truck / SUV', 'Boat', 'RV or Camper', 'Motorcycle', 'Other']),
     'D1 [COPY] the type options are the five authored in §33.1, blank first — ' + JSON.stringify(A.typeOpts));
  /* ⛔ THE ABSENCE LEG. Inverted on purpose when §39 lands — see the header. */
  ok(A.ownOpts.indexOf('Leased') < 0 && JSON.stringify(A.ownOpts) === JSON.stringify(['', 'Owned outright', 'Financed']),
     "D2 [NO ENGINE-LESS OPTION] 'Leased' is ABSENT until §39 gives it an engine — " + JSON.stringify(A.ownOpts));
  ok(B.stored.vehicleType === 'Boat' && B.stored.ownershipStatus === 'Owned outright',
     'D3 [STORE] both fields round-trip into state — ' + JSON.stringify(B.stored));
  ok(/What kind of vehicle this is/.test(A.modalText),
     'D4 [COPY] the §33.6 R417 hover is rendered verbatim');

  /* ══ SCENE E · THE NOUN ═════════════════════════════════════════════════════════════════════════ */
  ok(/Liabilities secured by this vehicle/.test(A.modalText),
     'E1 [COPY] the Vehicle room says "secured by this VEHICLE" — the live wrong-noun defect, fixed');
  ok(!/Liabilities secured by this property/.test(A.modalText),
     'E2 [COPY] and the property noun is gone from this room');
  /* ⛔ THE CONTROL FOR E1/E2 — A NOUN SWAPPED GLOBALLY IS NOT A NOUN FIXED. The property room must
     still say "property"; without this leg, deleting the word everywhere would pass E1 and E2. */
  const P = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property');
    const a = window.state.accounts[0];
    a.value = 500000;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 800));
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const m = document.getElementById('modal-dynamic-content');
    return m ? (m.textContent || '').replace(/\s+/g, ' ') : '';
  });
  ok(/Liabilities secured by this property/.test(P),
     'E3 [CONTROL] the PROPERTY room still says "property" — the noun is per-room, not swapped globally');
  ok(!/Liabilities secured by this vehicle/.test(P),
     'E4 [CONTROL] and it did not inherit the vehicle noun');

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
