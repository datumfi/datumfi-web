/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   §45.7 / Garage §3.1-§3.3 · THE DRIVEWAY'S IDENTITY BLOCK — TYPE-AWARE FROM BIRTH.
   Commit 1 of step 2b. Three optional record fields land, each with a §38.2-verbatim label that
   SWAPS BY TYPE. Nothing reads them yet.

   ⭐⭐ THE CLAIM THIS FILE EXISTS TO PIN IS NOT "the fields exist". It is that A BOAT OWNER NEVER
   SEES THE WORD VIN — not even for one release. §45.7: "DO NOT SHIP A VIN-ONLY FIELD SET AND
   RETROFIT THE BOAT LABELS IN 2c — that is precisely how the car-native surfaces got built in the
   first place." A gate that only proved the fields render would be green on exactly the defect this
   whole arc exists to correct.

   ── ⛔ THE INVARIANT LEGS ARE THE POINT, NOT THE DECORATION ───────────────────────────────────────
   Every type-aware string here is asserted in BOTH directions: the boat case says the boat words
   AND the car case still says the car words (A1/A2), AND the boat case does NOT say the car words
   (B3/B4). Without that last pair, ADDING 'HIN' ALONGSIDE 'VIN' WOULD PASS — a room showing both
   labels satisfies every positive leg while being obviously broken. This is the E3/E4 shape the
   arc has required on every type-aware string since the noun fix, applied to a label pair.

   ── ⏳ D1/D2 ARE EXPIRING ASSERTIONS. FLIP THEM, DO NOT DELETE THEM ───────────────────────────────
   D asserts that NO VIN-DECODE AFFORDANCE IS RENDERED, for any type. That is correct TODAY for a
   reason that has nothing to do with boats: vPIC IS NOT WIRED AT ALL (grepped 2026-08-13 — the sole
   occurrence of "vPIC" in studio.html is a comment at ~11656 about a RentCast Worker). Garage §3.1's
   authored lead, "Enter your VIN and we'll fill in the rest", is therefore UNWIRABLE COPY: it
   promises a fill that cannot come. §38.2's law — "a field that promises auto-fill and cannot
   deliver is a broken promise, not a blank" — is written about boats and is TYPE-BLIND today.
   ⭐ WHEN §2.1 WIRES vPIC, D1 INVERTS FOR NON-BOATS AND D2 STAYS RED-FOREVER FOR BOATS (vPIC cannot
   decode a HIN). Two halves of one leg with two different expiries; that is why they are numbered
   separately rather than written as one assertion about "the decode".

   ── ⭐ AND THE LEG I MOST WANT TO SURVIVE ME: P (PERSISTENCE) ──────────────────────────────────────
   §33.1 shipped its field pair WITHOUT adding it to slimSlotForClerk and turned a working modal into
   silent data loss — ONE COMMIT AGO. The three fields here ride that allowlist in the same commit,
   and --nodrop proves the leg bites. ⛔ A VIN IS THE WORST FIELD TO DROP: it is long, it is copied
   off a title document, and its loss is invisible until the day it is needed.

   Usage: node scripts/_gate_vehicle_identity.js [LABEL] [--vinonly] [--nodrop] [--decode] [--forkusage] [--leakgrounds]
     --vinonly    the identifier label stops branching (every type gets 'VIN (optional)') -> B1/B3 red.
     --nodrop     the three keys are removed from the slim Clerk allowlist -> P1/P2/P3 red.
                  ⭐ THIS IS THE §33.1 DEFECT, REPRODUCED EXACTLY.
     --decode     a decode affordance appears on every type -> D1/D2 red.
     --forkusage  'Engine hours' becomes its OWN field -> F red (a typed value vanishes on a switch).
     --leakgrounds the identity block escapes the vehicle arm and renders in The Grounds -> G1/G2 red.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { studioSource } = require('./_studio_source.cjs');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const VINONLY   = process.argv.includes('--vinonly');
const NODROP    = process.argv.includes('--nodrop');
const DECODE    = process.argv.includes('--decode');
const FORKUSAGE = process.argv.includes('--forkusage');
const LEAKGROUNDS = process.argv.includes('--leakgrounds');
const MUT = VINONLY || NODROP || DECODE || FORKUSAGE || LEAKGROUNDS;

const PORT = 8377;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

/* ⚠️ EVERY ANCHOR BELOW IS A VERBATIM SLICE OF THE SHIPPED SOURCE, AND mutate() REFUSES TO RUN IF IT
   MATCHES ANYTHING OTHER THAN EXACTLY ONCE. The name-map gate learned this the expensive way: a
   split().join() against a literal that does not exist NO-OPS SILENTLY, so a control that never
   landed is indistinguishable from a product that never broke. */
const A_IDLBL = "                var _vIdLabel = _vIsBoat ? 'HIN &mdash; hull identification number (optional)'\n                              : (_vType === 'Other' ? 'Identification number (optional)' : 'VIN (optional)');";
const M_IDLBL = "                var _vIdLabel = 'VIN (optional)';   /* type-awareness removed: --vinonly */";

/* ⚠️ THE FIRST CUT OF THIS MUTATION WAS MALFORMED AND I ALMOST BANKED ITS RED AS A PASS. It wrote
   `_vIsBoat ? 'x' : 'y'` INSIDE the oninput attribute without `${}`, so the ternary was not
   interpolated at build time — it became a string the BROWSER would evaluate, where `_vIsBoat` does
   not exist. mutate() was satisfied (the text landed verbatim), the gate went red, and the red
   looked correct. ⛔ BUT IT RED FOR THE WRONG REASON: the field selector simply found nothing, so
   the control proved "renaming a field breaks a selector", NOT "a forked field eats a typed value".
   🔑 A CONTROL MUST FAIL IN THE SHAPE OF THE CLAIM. This version forks ONLY the boat, leaves the car
   on `vehicleUsage`, and interpolates properly — so A0 stays GREEN on a car and F2 goes red for
   exactly the §40.2 reason: the 45,000 the user typed is gone the moment the type is corrected. */
const A_USE = "value=\"${String(acc.vehicleUsage||'').replace(/[^0-9]/g,'')}\" oninput=\"this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', 'vehicleUsage', this.value)\"";
const M_USE = "value=\"${String((_vIsBoat ? acc.vehicleEngineHours : acc.vehicleUsage)||'').replace(/[^0-9]/g,'')}\" oninput=\"this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', '${_vIsBoat ? 'vehicleEngineHours' : 'vehicleUsage'}', this.value)\"";

const A_DEC = '            <div class="field-row" style="grid-template-columns: 1fr;">\n                <div><div class="input-label">${_vIdLabel}</div>';
const M_DEC = '            <div class="field-row" style="grid-template-columns: 1fr;">\n                <div><div class="input-label">${_vIdLabel}</div><div style="font-size:11px;">Enter your VIN and we&rsquo;ll fill in the rest.</div>';

/* The slim-slot mutation lands in studio-blueprint.js, NOT studio.html — the server branches on
   path below. This reproduces §33.1's actual defect: the field renders, stores in memory, and is
   dropped by the archive mirror. */
const A_SLIM = '        if (a.vehicleIdNum)    out.vehicleIdNum    = a.vehicleIdNum;\n        if (a.vehicleYmm)      out.vehicleYmm      = a.vehicleYmm;\n        if (a.vehicleUsage)    out.vehicleUsage    = a.vehicleUsage;';
const M_SLIM = '        /* dropped from the allowlist: --nodrop */';

/* ⛔ G1/G2 ARE ABSENCE LEGS AND AN ABSENCE LEG WITHOUT A MUTATION IS A SENTENCE. This one reproduces
   the exact structural failure they exist to catch — the identity block escaping the vehicle arm and
   rendering inside The Grounds — by injecting the identifier field into the property branch. */
const A_LEAK = '                html += _propUpkeepSectionHTML(id, acc, showUpkeep);';
const M_LEAK = '                html += _propUpkeepSectionHTML(id, acc, showUpkeep);\n                html += \'<div class="field-row"><div><div class="input-label">VIN (optional)</div><input type="text" class="small-field" value="" oninput="updateAccField(\\\'\' + id + \'\\\', \\\'vehicleIdNum\\\', this.value)"></div></div>\';   /* block escapes its arm: --leakgrounds */';

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
    if (VINONLY)   src = mutate(src, A_IDLBL, M_IDLBL, 'A_IDLBL');
    if (DECODE)    src = mutate(src, A_DEC,   M_DEC,   'A_DEC');
    if (FORKUSAGE) src = mutate(src, A_USE,   M_USE,   'A_USE');
    if (LEAKGROUNDS) src = mutate(src, A_LEAK, M_LEAK, 'A_LEAK');
    body = Buffer.from(src, 'utf8');
  }
  if (NODROP && /studio-blueprint\.js$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_SLIM, M_SLIM, 'A_SLIM'), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  /* ── S · SOURCE CENSUS, THROUGH studioSource() AND NEVER OFF DISK (_gate_studio_source P1) ─────── */
  const SRC = studioSource();
  ok(/vehicleIdNum/.test(SRC) && /vehicleYmm/.test(SRC) && /vehicleUsage/.test(SRC),
     'S1 [SOURCE] all three identity field keys exist in studio.html');
  /* ⛔ ANCHORED ON THE ALLOWLIST LINES, NOT ON A FILE-WIDE GREP. The field-pair gate learned that a
     whole-file grep cannot tell CODE from the PROSE explaining it, and would force an explanation to
     be deleted to make a gate green. P below proves the same claim at the behavioural level. */
  const SLIM = fs.readFileSync(path.join(ROOT, 'scripts/studio-blueprint.js'), 'utf8');
  ok(/out\.vehicleIdNum\s*=\s*a\.vehicleIdNum/.test(SLIM)
     && /out\.vehicleYmm\s*=\s*a\.vehicleYmm/.test(SLIM)
     && /out\.vehicleUsage\s*=\s*a\.vehicleUsage/.test(SLIM),
     'S2 [SOURCE · ALLOWLIST] all three ride slimSlotForClerk — the §33.1 data-loss trap, closed in the same commit as the fields');

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
    ? [VINONLY ? 'vinonly' : '', NODROP ? 'nodrop' : '', DECODE ? 'decode' : '', FORKUSAGE ? 'forkusage' : '', LEAKGROUNDS ? 'leakgrounds' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* Builds one vehicle, optionally stamps fields, and reads the RENDERED modal. ⛔ Labels are read
     off the live DOM, never asserted from source — §20.7: "at minimum one BOAT and one RV, RENDERED,
     not asserted from source." */
  const probe = async (ov) => p.evaluate(async (o) => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000;
    Object.keys(o || {}).forEach((k) => { a[k] = o[k]; });
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 700));
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const modal = document.getElementById('modal-dynamic-content');
    const field = (n) => modal.querySelector('input[oninput*="\'' + n + '\'"]');
    const flat = modal ? (modal.textContent || '').replace(/\s+/g, ' ') : '';
    return {
      id: a.id,
      flat: flat,
      total: Number(String(txt).replace(/[$,\s]/g, '')),
      hasId: !!field('vehicleIdNum'), hasYmm: !!field('vehicleYmm'), hasUse: !!field('vehicleUsage'),
      idVal:  field('vehicleIdNum')  ? field('vehicleIdNum').value  : null,
      useVal: field('vehicleUsage')  ? field('vehicleUsage').value  : null,
    };
  }, ov);

  const says = (r, s) => r.flat.indexOf(s) >= 0;

  /* ══ SCENE A · THE CAR CASE — AND IT MUST STILL SAY THE CAR WORDS ════════════════════════════════
     ⭐ THE INVARIANT HALF. A noun swapped globally is not a noun fixed: without A1/A2, DELETING THE
     BRANCH AND SHIPPING BOAT LABELS EVERYWHERE WOULD PASS every boat leg in scene B. */
  const A = await probe({ vehicleType: 'Car / Truck / SUV' });
  console.log('  A ' + JSON.stringify({ total: A.total, hasId: A.hasId, hasYmm: A.hasYmm, hasUse: A.hasUse }));
  ok(A.hasId && A.hasYmm && A.hasUse, 'A0 [PRESENCE] all three identity fields RENDER on a car');
  ok(says(A, 'VIN (optional)'),   'A1 [INVARIANT · CAR] a car still asks for a VIN');
  ok(says(A, 'Current mileage'),  'A2 [INVARIANT · CAR] a car still asks for Current mileage');
  ok(!says(A, 'Engine hours'),    'A3 [INVARIANT · CAR] and a car is NOT asked for engine hours');

  /* ══ SCENE B · THE BOAT — THE SCENE THIS FILE EXISTS FOR ═════════════════════════════════════════ */
  const B = await probe({ vehicleType: 'Boat' });
  console.log('  B ' + JSON.stringify({ total: B.total, hasId: B.hasId }));
  ok(says(B, 'HIN'),          'B1 [§38.2 VERBATIM] a BOAT asks for a HIN');
  ok(says(B, 'Engine hours'), 'B2 [§38.2 VERBATIM] a BOAT asks for Engine hours, not mileage');
  /* ⛔⛔ THE TWO LEGS THAT CATCH THE MOST LIKELY REAL DEFECT — a room that shows BOTH labels passes
     B1 and B2 while being plainly broken. An additive "fix" is the default failure mode of a label
     branch, and only a negative leg sees it. */
  /* ⚠️ WORD-BOUNDARY, NOT indexOf('VIN'), AND THE REASON IS A TIME BOMB I ALMOST SHIPPED: the
     substring "VIN" lives inside "SAVINGS". The first cut of this leg was a bare indexOf, which
     would have gone RED the first day any beat in this modal said SAVINGS in caps — a gate failing
     on copy that has nothing to do with its claim. \bVIN\b still catches the defect it was written
     for (a room labelling the field "VIN / HIN") and cannot be tripped by an unrelated word. */
  ok(!/\bVIN\b/.test(B.flat),      'B3 [INVARIANT · BOAT] and the word VIN appears NOWHERE for a boat');
  ok(!says(B, 'Current mileage'),  'B4 [INVARIANT · BOAT] and the boat is NOT also asked for mileage');
  ok(says(B, 'A boat’s odometer'),
     'B5 [§33.6 VERBATIM] the ONE authored hover renders — engine hours move resale more than model year');
  ok(B.total === A.total, 'B6 [MONEY · UNCHANGED] the identity block moved NO money — ' + B.total + ' vs ' + A.total);

  /* ══ SCENE C · EVERY REMAINING TYPE, INCLUDING BLANK ═════════════════════════════════════════════
     ⛔ ONE TYPE PROVES ONE TYPE. The fixture-reach census caught that three times. Blank is listed
     FIRST because it is the COMMON path — most users never open the dropdown — and §19.5 warns that
     an unrendered fallback is an untested promise. */
  const cases = [
    ['',               'VIN (optional)',                    'Current mileage', 'blank — THE COMMON PATH'],
    ['RV or Camper',   'VIN (optional)',                    'Current mileage', 'RV keeps VIN + mileage (§38.2)'],
    ['Motorcycle',     'VIN (optional)',                    'Current mileage', 'motorcycle keeps VIN + mileage'],
    ['Other',          'Identification number (optional)',  'Current mileage', 'Other gets the neutral identifier'],
  ];
  for (const [t, idl, usel, why] of cases) {
    const C = await probe(t ? { vehicleType: t } : {});
    ok(says(C, idl) && says(C, usel) && C.total === A.total,
       'C [' + why + '] renders "' + idl + '" + "' + usel + '", money unmoved');
  }

  /* ══ SCENE D · ⏳ NO DECODE AFFORDANCE — EXPIRING, SEE THE HEADER ════════════════════════════════ */
  ok(!says(A, 'fill in the rest') && !says(A, 'Auto-filled'),
     'D1 [⏳ NO BROKEN PROMISE · non-boat] nothing offers to fill the fields from a VIN — vPIC is NOT wired. INVERT when §2.1 lands.');
  ok(!says(B, 'fill in the rest') && !says(B, 'Auto-filled'),
     'D2 [⛔ NO BROKEN PROMISE · boat] and a boat never will — vPIC cannot decode a HIN. This leg NEVER expires.');

  /* ══ SCENE F · §40.2 — ONE STORED FIELD, SWAPPED LABEL. A TYPE SWITCH MUST NOT EAT A VALUE ═══════
     "The stored key is the concept; the label is the costume." A forked field would make a typed
     figure VANISH the moment someone corrected the type — and the value would still be on the
     account, invisible, which is the retained-value-no-surface trap. */
  const F = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000; a.vehicleType = 'Car / Truck / SUV';
    renderInputs();
    updateAccField(a.id, 'vehicleIdNum', '1HGCM82633A004352');
    updateAccField(a.id, 'vehicleUsage', '45000');
    updateAccField(a.id, 'vehicleType', 'Boat');          // the correction a real user makes
    await new Promise((r) => setTimeout(r, 500));
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const m = document.getElementById('modal-dynamic-content');
    const f = (n) => m.querySelector('input[oninput*="\'' + n + '\'"]');
    return {
      shownId:  f('vehicleIdNum')  ? f('vehicleIdNum').value  : null,
      shownUse: f('vehicleUsage')  ? f('vehicleUsage').value  : null,
      storedId: a.vehicleIdNum, storedUse: a.vehicleUsage,
      flat: (m.textContent || '').replace(/\s+/g, ' '),
    };
  });
  console.log('  F ' + JSON.stringify(F));
  ok(F.shownId === '1HGCM82633A004352',
     'F1 [§40.2] a typed VIN SURVIVES the switch to Boat and is still ON SCREEN under the HIN label');
  ok(F.shownUse === '45000',
     'F2 [§40.2] and the usage figure survives too — visible and editable, never hidden');
  ok(F.flat.indexOf('HIN') >= 0,
     'F3 [§19.12] the modal REPAINTED on the type change — a label swap that never repaints is invisible');

  /* ══ SCENE G · ⛔ THE PROPERTY ROOM MUST NOT HAVE INHERITED ANY OF THIS ══════════════════════════
     ⭐ THE E3/E4 SHAPE, AND IT PINS A STRUCTURAL CLAIM RATHER THAN A COSMETIC ONE. The identity
     block lives in the `else` of `if (_isGrounds(base))`, inside `physical && !collectibles`. That
     arm currently resolves to auto-only — but that is a fact about today's taxonomy, not a promise
     the code makes, and NOTHING ELSE ASSERTS IT. If a future base type lands on that arm, or if the
     Grounds guard is ever loosened, a house grows a VIN field and every leg above stays green.
     ⛔ A BLOCK ADDED IN AN `else` IS ONLY AS SCOPED AS THE `if` ABOVE IT. */
  const G = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property');
    const a = window.state.accounts[0];
    a.value = 400000;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 700));
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 400));
    const m = document.getElementById('modal-dynamic-content');
    const f = (n) => m.querySelector('input[oninput*="\'' + n + '\'"]');
    return {
      hasAny: !!(f('vehicleIdNum') || f('vehicleYmm') || f('vehicleUsage')),
      flat: (m.textContent || '').replace(/\s+/g, ' '),
    };
  });
  ok(!G.hasAny,
     'G1 [INVARIANT · GROUNDS] a PROPERTY room grew NO identity fields — the block is scoped to the vehicle arm');
  ok(!/\bVIN\b/.test(G.flat) && G.flat.indexOf('Engine hours') < 0,
     'G2 [INVARIANT · GROUNDS] and neither vehicle label leaked into the house');
  /* ⭐ AND THE PRESENCE TWIN, so G is not an all-absence scene: an absence leg whose fixture built
     the wrong room would pass for the wrong reason. This proves the Grounds actually RENDERED. */
  ok(G.flat.indexOf('Show upkeep costs') >= 0,
     'G3 [PRESENCE CONTROL] the property room really did render (its upkeep toggle is there) — G1/G2 are absences in a room that exists');

  /* ══ SCENE P · PERSISTENCE — THE §33.1 DEFECT, ONE COMMIT LATER ══════════════════════════════════
     Reads the REAL slimSlotForClerk output, not a re-implementation of it. */
  const P = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('auto');
    const a = window.state.accounts[0];
    a.value = 32000; a.vehicleType = 'Boat';
    a.vehicleIdNum = 'ABC12345D404'; a.vehicleYmm = '2019 Boston Whaler 230'; a.vehicleUsage = '310';
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 700));
    const DB = window.DatumBlueprint;
    if (!DB || !DB.captureDOM || !DB.slimSlotForClerk) return { err: 'hub missing' };
    const bp = DB['new'](); DB.captureDOM(bp);
    const full = (bp.accounts || []).filter((x) => x.baseId === 'auto')[0] || null;
    const room = ((DB.slimSlotForClerk(bp) || {}).accounts || []).filter((x) => x.baseId === 'auto')[0] || null;
    return {
      fullKeeps: !!(full && full.vehicleIdNum === 'ABC12345D404'),
      found: !!room,
      idNum: room && room.vehicleIdNum, ymm: room && room.vehicleYmm, usage: room && room.vehicleUsage,
    };
  });
  console.log('  P ' + JSON.stringify(P));
  ok(!P.err && P.found, 'P0 [PRESENCE] the vehicle survives into the slim Clerk slot at all');
  ok(P.fullKeeps, 'P1 [captureDOM] the full capture keeps the VIN (no allowlist there)');
  ok(P.idNum === 'ABC12345D404',        'P2 [⛔ ALLOWLIST] the identifier survives the slim Clerk mirror');
  ok(P.ymm === '2019 Boston Whaler 230', 'P3 [⛔ ALLOWLIST] Year/Make/Model survives it');
  ok(P.usage === '310',                  'P4 [⛔ ALLOWLIST] the usage meter survives it');

  await b.close(); server.close();
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? '  RED' : '  GREEN'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (x) {} process.exit(1); });
