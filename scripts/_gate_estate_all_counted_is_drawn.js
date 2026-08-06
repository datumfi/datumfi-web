/* @gate-pool: browser
 * ^ §13.69 — DECLARED, not inferred. Path-resolved playwright require; this gate had been running
 *   6-wide in the NODE pool for its whole life, carrying the §19 purpose walk and the §19.15 guard. */
/* STANDING INVARIANT GATE — EVERYTHING COUNTED IN THE ESTATE TOTAL MUST BE DRAWN SOMEWHERE.
   Architect-ruled 2026-08-03. This is not a 593c one-off; it is permanent, and every future placement
   change answers to it.

   WHY IT IS THE WORST FAILURE CLASS WE HAVE: the bug that opened this arc was a $600k residence
   rendering NOWHERE while its value still counted toward the estate total. THE NUMBER AND THE PICTURE
   DISAGREE SILENTLY, and a user who trusts the picture is misled by the total. Nothing on screen says
   anything is wrong — that is what makes it worse than a crash.

   WHAT COUNTS AS DRAWN
     · its own room block (any `onclick` carrying the account id)
     · the ground owner, drawn as the grounds tile (THE GROUNDS / THE YARD, never THE PLOT)
     · a lien merged onto its linked asset — suppressed by design, represented by that asset's NET
       EQUITY figure, and only if the ASSET itself is drawn
     · inside the `N more properties` collapse count — COLLAPSED IS STILL DRAWN, ABSENT IS NOT
   And, per the 2026-08-03 measurement, drawn is not enough: the block must also be ON SCREEN. Content
   outside the viewBox still paints (.blueprint-svg is overflow:visible) but survives only on slack
   fitToScreen happens to leave — 406 user units on one window width, 0 on another. A tile that exists
   in the DOM at x=1600 and is invisible to the user satisfies "drawn somewhere" and still misleads.

   🔑 HOUSE LAW — AN EXCLUSION ASSERTION MUST BE PRECEDED BY A PRESENCE ASSERTION. "Nothing is
   missing" passes perfectly on a render that produced NOTHING. So P1/P2 assert a non-empty drawn set
   and a rendered canvas FIRST, and they are deliberately not inverted by any mutation: a precondition
   that can pass by doing nothing is how a red-first goes inverted-dead.

   🔑 HOUSE LAW — A MUTATION THAT REMOVES HALF A CONTRACT ONLY PROVES THE HALF IT LEFT ALONE. This
   contract spans TWO files: studio.html hands the satellites off, datum-estate.js draws them. Killing
   only the renderer would leave the handoff unproven, so --nosat and --nohandoff exist as a pair and
   BOTH must bite.

   Usage: node scripts/_gate_estate_all_counted_is_drawn.js [LABEL] [--nosat] [--nohandoff] [--nocollapse]
     --nosat       renderer half: the satellite band never renders -> satellites counted, drawn nowhere.
     --nohandoff   host half: studio.html hands over an empty satellite list -> same silence, other file.
     --nocollapse  the overflow collapse tile is dropped -> the properties past capacity go uncounted.
     --miscount    the overflow tile still appears but under-reports by one -> the COUNT assertions
                   must bite. An overflow tile that lies is worse than no tile; --nocollapse alone
                   only proves the tile exists.
     --staleJS     simulates the 4-hour JS cache: the renderer advertises NO satellite support, as a
                   stale cached copy would. This one is EXPECTED GREEN on the invariant — it proves
                   the host's fallback really draws every property the old way. A red-first that
                   expects green is unusual, so it is asserted explicitly rather than eyeballed:
                   satellite tiles must be 0 AND nothing may be missing. If it ever goes red, the
                   deploy window is unsafe and this change must not ship. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NOSAT      = process.argv.includes('--nosat');
const NOHANDOFF  = process.argv.includes('--nohandoff');
const NOCOLLAPSE = process.argv.includes('--nocollapse');
const STALEJS    = process.argv.includes('--staleJS');
const MISCOUNT   = process.argv.includes('--miscount');
/* 593d-fix · TWO MUTATIONS AIMED AT THE TRANSITION, NOT THE INITIAL STATE. Both defects shipped
   green because every gate tested purpose->name from a FRESH fixture. A state machine tested only
   from its initial state is tested at ONE EDGE — walk it, or it will walk itself. */
const NOREPAINT  = process.argv.includes('--norepaint');    // §19.12 — drop the list invalidation
const NOSATMERGE = process.argv.includes('--nosatmerge');   // §19.13 — satellites stop merging again
/* §19.15 · TWO MUTATIONS, ONE PER HALF OF THE RULE. The default and the no-backfill guard fail in
   completely different ways and a single mutation would only ever prove one of them. */
const EVERYPROP  = process.argv.includes('--everyprop');    // drop the first-only test  -> F5 [SECOND] reds
const BACKFILL   = process.argv.includes('--backfill');     // stamp existing blanks     -> F5 [NO-BACKFILL] reds
const MUT = NOSAT || NOHANDOFF || NOCOLLAPSE || STALEJS || MISCOUNT || NOSATMERGE;
const PORT = 8341;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

const A_SAT = '      var satellites = (ctx.satelliteProperties || []).filter(function (a) { return !!getBaseType(a.baseId); });';
const M_SAT = '      var satellites = [];   /* satellite band removed by --nosat */';
const A_COL = '          if (sHidden > 0) {';
const M_COL = '          if (false) {   /* collapse tile removed by --nocollapse */';
const A_HAN = '        satelliteProperties: satelliteProperties,';
const M_HAN = '        satelliteProperties: [],   /* handoff removed by --nohandoff */';
/* --miscount — the tile still APPEARS, it just under-reports by one. --nocollapse only proves the
   tile EXISTS; a gate that stops there would pass a tile that lies, which is worse than no tile
   because it is believed. This mutates the count at its source so the attribute AND the visible text
   move together — mutating only the attribute would test the gate's reader, not the user's screen. */
const A_MIS = 'sHidden = satellites.length - sShown.length;';
const M_MIS = 'sHidden = satellites.length - sShown.length - 1;   /* under-reports by one: --miscount */';
const A_STALE = 'renderEstate: renderEstate, supportsSatellites: true,';
const M_STALE = 'renderEstate: renderEstate, /* supportsSatellites withheld by --staleJS */';
const A_REPAINT = "if(field === 'propPurpose') { renderInputs(); openAccountModal(id); }";
const M_REPAINT = "if(field === 'propPurpose') { openAccountModal(id); }   /* list invalidation removed by --norepaint */";
/* --everyprop removes the "is there already a property?" test, so EVERY property is born Primary. */
const A_EVERY = 'if (isPropertyBase({ id: list[i].baseId })) return null;';
const M_EVERY = 'if (false) return null;   /* first-only test removed by --everyprop */';
/* --backfill stamps the default onto EXISTING blanks — the exact harm §19.15's guard forbids. */
/* Anchored on the room-picker site's OWN trailing comment. The two creation sites assign with a
   byte-identical statement, so the bare statement matched TWICE and mutate()'s exactly-one rule
   correctly refused it — the guard doing its job, not an obstacle. The sites are genuinely different
   (room picker vs debt-counterpart) and now say so, which is better source regardless of the anchor. */
const A_BACK = 'propPurpose = _bornPurpose;   // room-picker site';
const M_BACK = 'propPurpose = _bornPurpose;'
             + ' state.accounts.forEach(function (a) { if (isPropertyBase({ id: a.baseId }) && !a.propPurpose)'
             + ' a.propPurpose = "Primary residence"; });   /* retroactive stamp by --backfill */';
const A_SATMERGE = '              var sMerged = sDebts.length > 0;';
const M_SATMERGE = '              var sMerged = false;   /* satellite merge removed by --nosatmerge */';

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(a, m);
}
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /datum-estate\.js$/.test(rp)) {
    let src = body.toString('utf8');
    if (NOSAT)      src = mutate(src, A_SAT, M_SAT, 'A_SAT');
    if (NOCOLLAPSE) src = mutate(src, A_COL, M_COL, 'A_COL');
    if (STALEJS)    src = mutate(src, A_STALE, M_STALE, 'A_STALE');
    if (MISCOUNT)   src = mutate(src, A_MIS,   M_MIS,   'A_MIS');
    if (NOSATMERGE) src = mutate(src, A_SATMERGE, M_SATMERGE, 'A_SATMERGE');
    body = Buffer.from(src, 'utf8');
  }
  if ((NOHANDOFF || NOREPAINT || EVERYPROP || BACKFILL) && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    if (NOHANDOFF) src = mutate(src, A_HAN, M_HAN, 'A_HAN');
    if (NOREPAINT) src = mutate(src, A_REPAINT, M_REPAINT, 'A_REPAINT');
    if (EVERYPROP) src = mutate(src, A_EVERY, M_EVERY, 'A_EVERY');
    if (BACKFILL)  src = mutate(src, A_BACK,  M_BACK,  'A_BACK');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg)  { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  // 1440x900 split is the DEFAULT mode at the tightest common desktop — the configuration with the
  // least slack, so "on screen" is asserted where it is hardest to satisfy.
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const probe = async (spec) => p.evaluate(async (spec) => {
    window.state.accounts.length = 0;
    const made = [];
    spec.forEach(function (s) {
      addInstance(s.baseId);
      const a = window.state.accounts.filter(x => x.baseId === s.baseId).pop();
      Object.keys(s.ov || {}).forEach(k => { a[k] = s.ov[k]; });
      // `s.linkTo || null` turned index 0 into null and silently unlinked the mortgage — the ground
      // owner then read THE GROUNDS instead of THE YARD. Falsy-zero; explicit undefined test.
      made.push({ id: a.id, baseId: s.baseId, kind: s.kind, value: a.value || 0, linkTo: s.linkTo === undefined ? null : s.linkTo });
    });
    // resolve symbolic links (linkTo = index into spec) to real ids
    made.forEach(function (m) { if (m.linkTo !== null) { window.state.accounts.filter(x => x.id === m.id)[0].linkedAssetId = made[m.linkTo].id; m.linkedAssetId = made[m.linkTo].id; } });
    updateSVGs();
    await new Promise(r => setTimeout(r, 900));   // updateSVGs is rAF-debounced

    const svg = document.getElementById('bp-svg');
    const wrap = document.querySelector('.canvas-wrapper');
    const wr = wrap.getBoundingClientRect();

    // --- the DRAWN set, read off the live DOM ---
    const drawn = {};
    Array.prototype.forEach.call(svg.querySelectorAll('[onclick]'), el => {
      const m = /open(?:AccountModal|YardModal)\('([^']+)'\)/.exec(el.getAttribute('onclick') || '');
      if (m) drawn[m[1]] = true;
    });
    // the ground owner is drawn as the grounds tile itself, which carries no id unless a lien made it
    // The Yard. THE PLOT means no property took the ground — that is NOT drawn.
    const gTitle = svg.querySelector('.grounds-title');
    const gState = gTitle ? gTitle.textContent.trim() : '';
    const owner = window._pickGroundOwner
      ? window._pickGroundOwner(window.state.accounts.filter(a => !a.exclude && window._isPropertyBase({ id: a.baseId })))
      : null;
    // _isPropertyBase takes a BASE; the ids are the same strings for the property bases, so this
    // reads correctly for property/property_primary/property_co and false for everything else.
    if (owner && gState !== 'THE PLOT') drawn[owner.id] = true;

    const collapseEl = svg.querySelector('.satellite-collapse');
    const collapsed = collapseEl ? parseInt(collapseEl.getAttribute('data-collapsed-count'), 10) || 0 : 0;

    // --- ON SCREEN? every drawn block must survive .canvas-wrapper's overflow:hidden ---
    const offscreen = [];
    Array.prototype.forEach.call(svg.querySelectorAll('g.room-grp'), g => {
      const r = g.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > wr.right + 0.5 || r.left < wr.left - 0.5 || r.bottom > wr.bottom + 0.5 || r.top < wr.top - 0.5) {
        const om = /open(?:AccountModal|YardModal)\('([^']+)'\)/.exec(g.getAttribute('onclick') || '');
        offscreen.push({ id: om ? om[1] : null, cls: g.getAttribute('class') || '' });
      }
    });

    // --- reconcile: everything counted, minus everything represented ---
    const missing = [];
    made.forEach(function (m) {
      if (drawn[m.id]) return;
      if (m.kind === 'debt' && m.linkedAssetId && drawn[m.linkedAssetId]) return;   // merged onto its asset
      missing.push(m.baseId + '/' + m.id + '/$' + m.value);
    });

    return { made: made.length, drawnCount: Object.keys(drawn).length, gState: gState,
             satelliteTiles: svg.querySelectorAll('g.satellite-room:not(.satellite-collapse)').length,
             collapsed: collapsed, missing: missing, offscreen: offscreen,
             roomGrps: svg.querySelectorAll('g.room-grp').length,
             footage: (document.getElementById('gross-estate-val') || {}).textContent || '',
             svgChildren: svg.children.length };
  }, spec);

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT ? (NOSAT ? 'NOSAT ' : '') + (NOHANDOFF ? 'NOHANDOFF ' : '') + (NOCOLLAPSE ? 'NOCOLLAPSE' : '') : 'NORMAL'));

  /* FIXTURE 1 — the user has a $600k primary residence, a $250k rental and a $180k second home, with
     a $300k mortgage linked to the residence, plus an irrevocable trust and two ordinary accounts. */
  const F1 = await probe([
    { baseId: 'property',         kind: 'prop',  ov: { value: 600000, propPurpose: 'Primary residence' } },
    { baseId: 'property_primary', kind: 'prop',  ov: { value: 250000, propPurpose: 'Rental property' } },
    { baseId: 'property_co',      kind: 'prop',  ov: { value: 180000, propPurpose: 'Second home' } },
    { baseId: 'mortgage_joint',   kind: 'debt',  ov: { value: 300000 }, linkTo: 0 },
    { baseId: 'trust',            kind: 'other', ov: { value: 400000 } },
    { baseId: 'taxable',          kind: 'other', ov: { value: 300000 } },
    { baseId: 'checking',         kind: 'other', ov: { value:  40000 } },
  ]);
  console.log('  F1 ' + JSON.stringify(F1));
  // PRESENCE FIRST — not inverted by any mutation. A render that produced nothing must RED here.
  ok(F1.svgChildren > 0,  'F1 [PRESENCE] the canvas rendered something at all');
  ok(F1.roomGrps > 0,     'F1 [PRESENCE] at least one room block was drawn');
  ok(F1.drawnCount > 0,   'F1 [PRESENCE] the drawn set is non-empty (nothing-is-missing cannot pass vacuously)');
  ok(F1.gState === 'THE YARD', 'F1 [PRESENCE] the ground owner holds the ground (THE YARD — a lien is linked)');
  // THE INVARIANT
  ok(F1.missing.length === 0, 'F1 [INVARIANT] every account counted in the total is drawn somewhere — missing: ' + JSON.stringify(F1.missing));
  /* KNOWN-OPEN, NAMED AND DATED — THE TRUST WING OVERFLOWS THE viewBox AND IS CLIPPED AT THIS SIZE.
     Found by this gate on its first clean run, 2026-08-03. It is PRE-EXISTING and untouched by 593c:
     the wing is drawn at x=1260 w=280, so its right edge is 1540 against a 1400 viewBox, and at
     1440x900 in split mode fitToScreen leaves ZERO slack. Roughly half the trust room, including its
     label and its value, is off the user's screen. It CANNOT be fixed inside 593c — the wing does not
     fit beside a 1000-wide grounds at x=200 by any placement, so closing it needs the canvas
     re-proportioning that is already sequenced after the drafting-panel divider.
     The exemption is asserted, not waived: if the count ever changes — because it got fixed, or
     because something NEW went off screen — this gate REDS and someone has to come back and say which.
     Do not silence it by widening the filter. */
  const _exempt = (o) => /trust-room/.test(o.cls);
  const f1Live = F1.offscreen.filter(o => !_exempt(o));
  const f1Known = F1.offscreen.filter(_exempt);
  console.log('  KNOWN-OPEN (printed every run, never silent): ' + f1Known.length + ' trust block(s) clipped by the viewBox — pre-existing, needs the canvas re-proportion.');
  ok(f1Live.length === 0, 'F1 [INVARIANT] every drawn block outside the known trust overflow is ON SCREEN — offscreen: ' + JSON.stringify(f1Live));
  ok(f1Known.length === 1, 'F1 [EXEMPTION PINNED] the known trust-wing clip is exactly 1 block (got ' + f1Known.length + ') — if this moved, retire or restate the exemption');
  // POSITIVE CONTROL — the two non-primary properties really did become satellites. Without this,
  // "missing === 0" would pass just as happily if they had silently stayed inside the estate.
  if (STALEJS) {
    // The stale-cache path: NO satellite band, and precisely because of that every property must
    // still be drawn the old way. Asserting BOTH halves — a 0 tile count alone would also be what a
    // totally broken render looks like, and "missing 0" alone would pass if satellites drew normally.
    ok(F1.satelliteTiles === 0, 'F1 [STALE-JS] the old renderer draws no satellite band (got ' + F1.satelliteTiles + ')');
    ok(F1.missing.length === 0, 'F1 [STALE-JS] and every property is STILL drawn, via the host fallback');
  } else {
    ok(F1.satelliteTiles === 2, 'F1 [CONTROL] both non-primary properties render as satellite tiles (got ' + F1.satelliteTiles + ')');
  }

  /* FIXTURE 2 — the user has a primary residence plus twelve more properties, more than the left band
     can hold, so the overflow must collapse to one counted tile rather than vanish. */
  const many = [{ baseId: 'property', kind: 'prop', ov: { value: 500000, propPurpose: 'Primary residence' } }];
  for (let i = 0; i < 12; i++) many.push({ baseId: 'property_primary', kind: 'prop', ov: { value: 100000 + i * 1000, propPurpose: 'Rental property' } });
  const F2 = await probe(many);
  console.log('  F2 ' + JSON.stringify({ made: F2.made, tiles: F2.satelliteTiles, collapsed: F2.collapsed, missing: F2.missing.length, offscreen: F2.offscreen.length }));
  ok(F2.roomGrps > 0,   'F2 [PRESENCE] at least one room block was drawn');
  ok(F2.drawnCount > 0, 'F2 [PRESENCE] the drawn set is non-empty');
  if (STALEJS) {
    // No band to overflow: all thirteen properties go back inside the estate and every one is drawn.
    ok(F2.satelliteTiles === 0, 'F2 [STALE-JS] the old renderer draws no satellite band');
    ok(F2.collapsed === 0,      'F2 [STALE-JS] and therefore no collapse tile');
    ok(F2.missing.length === 0, 'F2 [STALE-JS] and all 13 properties are STILL drawn, via the host fallback');
  } else {
    ok(F2.satelliteTiles > 0, 'F2 [PRESENCE] the satellite band rendered tiles to overflow FROM');
    ok(F2.collapsed > 0,  'F2 [CONTROL] the band overflowed and collapsed (collapsed=' + F2.collapsed + ')');
    // COLLAPSED IS STILL DRAWN: the undrawn remainder must be exactly what the collapse tile counts.
    ok(F2.missing.length === F2.collapsed,
       'F2 [INVARIANT] the collapse tile accounts for every property it hides (' + F2.missing.length + ' undrawn vs ' + F2.collapsed + ' counted)');
  }
  ok(F2.offscreen.length === 0, 'F2 [INVARIANT] every drawn block is ON SCREEN');


  /* ── F3 — THE OVERFLOW TILE MUST NOT LIE ────────────────────────────────────────────────────────
   * FIXTURE STATE: the user owns a primary residence plus NINE more properties — three more than the
   * band can draw — each with a distinct value.
   * Architect-ruled 2026-08-03: THE PICTURE MAY SUMMARIZE; IT MAY NEVER SILENTLY OMIT, AND IT MAY
   * NEVER MISCOUNT WHAT IT ADMITS TO HIDING. An overflow tile that lies is worse than no tile,
   * because it is believed. F2 already proves the collapse ACCOUNTS for the undrawn set; this proves
   * the ARITHMETIC is exact and that the money still reconciles to the headline total.
   * DRAW_CAP is asserted, not assumed — if the band geometry ever changes, the count moves with it
   * and this gate must say so rather than quietly re-baselining. */
  const DRAW_CAP = 6, SAT_N = 9;
  const f3spec = [{ baseId: 'property', kind: 'prop', ov: { value: 400000, propPurpose: 'Primary residence' } }];
  for (let i = 0; i < SAT_N; i++) f3spec.push({ baseId: 'property_primary', kind: 'prop', ov: { value: 111000 + i * 1000, propPurpose: 'Rental property' } });
  const F3 = await probe(f3spec);
  const f3Sum = f3spec.reduce((t, x) => t + x.ov.value, 0);
  const f3Footage = parseInt(String(F3.footage).replace(/[^0-9]/g, ''), 10);
  console.log('  F3 ' + JSON.stringify({ tiles: F3.satelliteTiles, collapsed: F3.collapsed, footage: F3.footage, sum: f3Sum, missing: F3.missing.length }));
  ok(F3.roomGrps > 0,           'F3 [PRESENCE] the canvas drew something');
  ok(F3.satelliteTiles > 0,     'F3 [PRESENCE] the satellite band rendered tiles to overflow FROM');
  ok(F3.satelliteTiles === DRAW_CAP,
     'F3 [COUNT] exactly ' + DRAW_CAP + ' satellites are DRAWN (got ' + F3.satelliteTiles + ') — if the band geometry changed, restate DRAW_CAP');
  ok(F3.collapsed === SAT_N - DRAW_CAP,
     'F3 [COUNT] the tile reads exactly N-' + DRAW_CAP + ' = ' + (SAT_N - DRAW_CAP) + ' (got ' + F3.collapsed + ') — the tile must not miscount what it hides');
  ok(F3.satelliteTiles + F3.collapsed === SAT_N,
     'F3 [COUNT] drawn + hidden accounts for every satellite (' + F3.satelliteTiles + ' + ' + F3.collapsed + ' vs ' + SAT_N + ')');
  ok(isFinite(f3Footage) && f3Footage > 0, 'F3 [PRESENCE] the footage readout produced a number (' + F3.footage + ')');
  ok(f3Footage === f3Sum,
     'F3 [RECONCILE] estate footage equals the sum of ALL ' + (SAT_N + 1) + ' properties, drawn and hidden alike — want ' + f3Sum + ', got ' + f3Footage);

  /* ══ F4 · THE PURPOSE WALK — §19.12 / §19.13 / §13.63 ═══════════════════════════════════════════
     THE LESSON THIS FIXTURE ENCODES: every gate that existed tested purpose->name from a FRESH
     account, and both shipped defects lived in the TRANSITION. The name stuck because nothing
     repainted the left list; the merge vanished because a non-primary purpose forfeits the ground.
     Neither is reachable from an initial state, so neither was ever tested.
     ⛔ IT DRIVES THE MODAL <select>, not updateAccField() — the first cut of the probe behind this
     gate drove the bare function, which is a real code path but NOT the user's, and it reported the
     list frozen in every direction (§13.64: prove you walked the user's route before you report).
     THREE COLUMNS AT EVERY STEP: the left card, the canvas, and WHO HOLDS THE GROUND — the third is
     what turns "the symptom again" into the cause. */
  /* ⛔ F4 IS SCOPED TO A RENDERER THAT HAS A SATELLITE BAND. --nosat, --nohandoff and --staleJS all
     remove that band by design: the first two delete it, and --staleJS simulates the 4-hour-cached
     OLD renderer that never had it, where non-primary properties fall back into the ownership columns.
     §19.13 is a NEW renderer capability, so a stale renderer CANNOT satisfy it and asserting it there
     would be asserting the wrong contract — --staleJS is documented EXPECTED GREEN precisely because
     it proves the fallback still DRAWS everything, not that it draws it the new way.
     🔑 THIS IS A SCOPE DECISION, SO IT IS COUNTED OUT LOUD rather than silently skipped: the line
     below prints what was not run and why. A leg that vanishes without saying so is an absent gate. */
  console.log('-------------------------------------');
  const F4_SKIP = NOSAT || NOHANDOFF || STALEJS;
  if (F4_SKIP) {
    console.log('  F4 SKIPPED — this mutation removes the satellite band itself, so the §19.13 merge');
    console.log('               contract does not apply. 24 legs not run (clean + --norepaint + --nosatmerge cover them).');
  }
  const walk = async () => {
    const ids = await p.evaluate(async () => {
      window.state.accounts.length = 0;
      addInstance('property_primary');
      const prop = window.state.accounts[window.state.accounts.length - 1];
      prop.value = 500000; prop.propTaxYr = 6000; prop.homeInsYr = 1800;
      addInstance('mortgage_joint');
      const mort = window.state.accounts[window.state.accounts.length - 1];
      mort.value = 200000; mort.minPmt = 1400; mort.linkedAssetId = prop.id;
      renderInputs(); updateSVGs();
      await new Promise(r => setTimeout(r, 900));
      return { prop: prop.id };
    });
    const step = async (v) => p.evaluate(async ([id, val]) => {
      if (typeof openAccountModal === 'function') openAccountModal(id);
      const sel = document.querySelector('select[onchange*="propPurpose"]');
      if (sel) { sel.value = val; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      else { updateAccField(id, 'propPurpose', val); }
      await new Promise(r => setTimeout(r, 800));
      const svg = document.getElementById('bp-svg');
      const inp = document.getElementById('room-val-inp-' + id);
      let list = '(no card)';
      if (inp) for (let n = inp.parentElement, i = 0; n && i < 4; n = n.parentElement, i++) {
        const m = n.querySelector && n.querySelector('.room-meta'); if (m) { list = m.textContent.trim(); break; }
      }
      const titles = svg ? Array.prototype.map.call(svg.querySelectorAll('.grounds-title, .bp-title'), e => e.textContent.trim()) : [];
      const owner = window._pickGroundOwner
        ? window._pickGroundOwner(window.state.accounts.filter(a => !a.exclude && window._isPropertyBase({ id: a.baseId }))) : null;
      // §19.11a — every rendered tooltip on the canvas, so the NOUN can be asserted on every purpose.
      const tips = svg ? Array.prototype.map.call(svg.querySelectorAll('title'), e => e.textContent) : [];
      return { list, titles, tips, ground: owner ? owner.id : null, door: !!(svg && svg.querySelector("[onclick*='openYardModal']")) };
    }, [ids.prop, v]);
    return { ids, step };
  };
  const W = F4_SKIP ? null : await walk();
  // purpose -> [expected card name, expected COMBINED name once a lien is linked]
  const LEGS = [
    ['Rental property',   'The Rental',        'THE HOLDING'],
    ['Primary residence', 'The Residence',     'THE YARD'],
    ['Second home',       'The Vacation Home', 'THE RETREAT'],
    ['Land',              'The Acreage',       'THE RESERVE'],
    ['',                  'The Grounds',       'THE YARD'],
    ['Rental property',   'The Rental',        'THE HOLDING'],
  ];
  for (const [purpose, wantCard, wantCombined] of (F4_SKIP ? [] : LEGS)) {
    const r = await W.step(purpose);
    const tag = 'F4 [' + (purpose || 'blank') + ']';
    console.log('  ' + tag + ' ' + JSON.stringify({ list: r.list, ground: r.ground ? 'held' : 'PLOT', door: r.door, titles: r.titles }));
    // PRESENCE FIRST — a walk that rendered nothing passes every negative leg beneath it.
    ok(r.titles.length > 0, tag + ' [PRESENCE] the canvas drew labelled tiles');
    ok(r.list === wantCard,
       tag + ' [LIST] the left card repaints to "' + wantCard + '" (got "' + r.list + '") — §19.12, the transition');
    ok(r.titles.indexOf(wantCombined) !== -1,
       tag + ' [CANVAS] the merged tile names itself ' + wantCombined + ' (got ' + JSON.stringify(r.titles) + ') — §12.1');
    ok(r.door, tag + ' [DOOR] a lien is a lien: the combined room is reachable from the canvas on EVERY purpose — §19.13');
    /* §19.11a · THE NOUN — a PRESENCE/ABSENCE PAIR, asserted on all six purposes in one leg because
       the walk crosses BOTH render paths: Primary and blank draw the GROUND tile (datum-estate:418/419),
       every explicit non-primary purpose drops to the SATELLITE tile (:585). Those two paths disagreed —
       :585 said "home" while its own link chip 48 lines later said "property", on the SAME tile.
       "this home's value" is simply false on The Acreage and on The Holding (§19.5, type-first).
       ⛔ ABSENCE IS HALF THE TEST (L50): asserting only that "property" appears would still pass if a
       stray "home" survived somewhere else on the canvas. The retired noun must be GONE, not outvoted. */
    const tipsJoined = (r.tips || []).join(' | ');
    ok(!/this home\b/.test(tipsJoined),
       tag + ' [NOUN] no canvas tooltip says "this home" — retired literal ABSENT (got ' + JSON.stringify(r.tips) + ')');
    ok(/this property\b/.test(tipsJoined),
       tag + ' [NOUN] a canvas tooltip says "this property" — type-first noun PRESENT on this purpose');
  }

  /* ══ F5 · §19.15 — THE FIRST PROPERTY IS BORN A PRIMARY RESIDENCE ═══════════════════════════════
     The Captain's rule: the room should get the common case right with zero clicks, and a second
     property stays blank until chosen. Two halves, and THE SECOND IS THE LOAD-BEARING ONE:
       (a) a NEW FIRST property is born Primary residence -> The Residence.
       (b) ⛔ NOTHING IS EVER BACKFILLED. A default is a PRE-FILLED INPUT, never a retroactive truth.
           Stamping Primary onto a record that predates the map would fabricate a sourced value (L47)
           and destroy the §19.2 restore path. BLANK MUST KEEP MEANING BLANK FOREVER.
     (b) is tested against a property deliberately left blank BEFORE the new one is created — i.e. a
     legacy record — because that is the only shape in which a backfill can actually do harm.
     NOT SCOPED OUT of any mutation: this is a question about the MODEL, not about the satellite band,
     so unlike F4 it runs in every mode. */
  console.log('-------------------------------------');
  const born = await p.evaluate(async () => {
    const nameOf = (id) => {
      const inp = document.getElementById('room-val-inp-' + id);
      if (inp) for (let n = inp.parentElement, i = 0; n && i < 4; n = n.parentElement, i++) {
        const m = n.querySelector && n.querySelector('.room-meta'); if (m) return m.textContent.trim();
      }
      return '(no card)';
    };
    window.state.accounts.length = 0;
    renderInputs();
    addInstance('property_primary');                       // ── the FIRST property
    const first = window.state.accounts[window.state.accounts.length - 1];
    const firstPurpose = String(first.propPurpose ?? '');
    const firstHasKey = 'propPurpose' in first;
    addInstance('mortgage_joint');                         // a NON-property must never be touched
                                                           // (a base this gate already exercises above —
                                                           //  an invented baseId throws inside addInstance)
    const nonProp = window.state.accounts[window.state.accounts.length - 1];
    addInstance('property_primary');                       // ── the SECOND property
    const second = window.state.accounts[window.state.accounts.length - 1];
    await new Promise((r) => setTimeout(r, 700));
    return {
      firstPurpose, firstHasKey, firstName: nameOf(first.id),
      secondPurpose: String(second.propPurpose ?? ''), secondHasKey: 'propPurpose' in second,
      secondName: nameOf(second.id),
      nonPropHasKey: 'propPurpose' in nonProp,
      // (b) the FIRST property was blank-by-legacy in no world here, so re-run the harm case cleanly:
      // blank the first, add a third, and prove the blank SURVIVED the creation of the third.
      legacy: (() => {
        delete window.state.accounts[0].propPurpose;       // a record that predates the map
        addInstance('property_primary');
        return { stillBlank: !window.state.accounts[0].propPurpose,
                 thirdBlank: !window.state.accounts[window.state.accounts.length - 1].propPurpose };
      })(),
    };
  });
  console.log('  F5 ' + JSON.stringify(born));
  ok(born.firstPurpose === 'Primary residence',
     'F5 [FIRST] a new FIRST property is born "Primary residence" (got "' + born.firstPurpose + '") — §19.15');
  ok(born.firstName === 'The Residence',
     'F5 [FIRST-NAME] and its left card therefore reads "The Residence" (got "' + born.firstName + '") — §19.1');
  ok(born.secondPurpose === '' && !born.secondHasKey,
     'F5 [SECOND] a SECOND property is born with NO propPurpose key at all (purpose="' + born.secondPurpose +
     '", keyPresent=' + born.secondHasKey + ') — blank is an absence, not a stored empty');
  ok(born.secondName === 'The Grounds',
     'F5 [SECOND-NAME] so the second card falls back to "The Grounds" (got "' + born.secondName + '") — §19.2');
  ok(!born.nonPropHasKey,
     'F5 [SCOPE] a NON-property room is never given a propPurpose (keyPresent=' + born.nonPropHasKey + ')');
  ok(born.legacy.stillBlank,
     'F5 [NO-BACKFILL] ⛔ a property left BLANK before the new one was created is STILL blank afterwards — ' +
     'a default is a pre-filled input, never a retroactive truth (L47 / §19.2)');
  ok(born.legacy.thirdBlank,
     'F5 [NO-BACKFILL] and the third property is itself born blank — the default fires on the FIRST only');

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
