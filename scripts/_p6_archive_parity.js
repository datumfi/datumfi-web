/* =====================================================================================
 * QUARANTINED 2026-08-01 - DO NOT TRUST THIS GATE VERDICT (green OR red).
 * REASON: its 3 SK-erase checks are permanently RED and DIRECTLY CONTRADICT
 * _gate_sketchbook_erase_survivors, which calls the same erase 6/6 GREEN. One of the two
 * instruments is wrong and neither has been believed; a permanently-red gate teaches people
 * to dismiss the suite, which is worse than no gate.
 * Verified pre-existing at 6208ae2 (reverted files reproduce it identically) — NOT caused by
 * the 2026-08-01 copy work. Do not repair, do not delete, do not investigate.
 * OUT OF QUARANTINE only if it ever agrees with a defect the Captain sees on his own screen,
 * and on that day, not before. Architect ruling 2026-08-01.
 *   [<- SUPERSEDED 2026-08-06, PROMPT #626/#627. Kept verbatim above, never silently dropped.
 *       The quarantine was the CHEAP CORRECT ANSWER on 08-01, when this was one untrusted gate
 *       among many. It stopped being correct once the disagreement was measured and turned out
 *       not to be a disagreement at all. See the split note below.]
 *
 * ✂️ SPLIT 2026-08-06 — THIS GATE'S VERDICT COUNTS AGAIN. Three legs are HELD on a named,
 *    measured reason; every other leg is LIVE and decides the exit code.
 *
 * THE QUARANTINE RESTED ON A CONTRADICTION THAT DOES NOT EXIST. Measured 2026-08-06: this gate
 * and _gate_sketchbook_erase_survivors call the BYTE-IDENTICAL door (same .slot-erase-action,
 * same #action-confirm-erase) and NEITHER IS WRONG. They encode DIFFERENT CONTRACTS:
 *   survivors asks  "is the erased ID gone and are two left?"  -> TRUE  under compaction
 *   this gate asks  "is the slot_2 KEY empty?"                 -> FALSE under compaction
 *
 * THE MEASUREMENT THAT SETTLED IT (id-probe, this same fixture): seed sk-1..sk-4, erase slot 2,
 * book reads ["sk-1","sk-3","sk-4",null]. sk-2 is GONE from the book AND from the Clerk mirror.
 * ⛔ THE ERASE IS NOT LOSING OR RETAINING DATA. An earlier reading of these reds as "the sketch
 * is delisted but copies survive underneath" was WRONG, and is corrected here so nobody
 * re-derives it: slot_2 is occupied because the list PACKED UP behind the deletion.
 *
 * WHAT IS REAL, AND WHY THE LEGS STAY: Sketchbook COMPACTS (sketchbook.html:3435 fills
 * positionally, so no gap can survive by construction); Blueprint leaves a GAP; and BOTH
 * _gate_d1_sketch_parity.mjs:5 and sketchbook.html:3104 assert the two rooms behave THE SAME.
 * One room is the drifter. That is the open #510 parity arc — Captain's directional ruling is
 * "LIST/COMPACT is the intended shared shape, Blueprint presumed the drifter", explicitly open
 * to being flipped, evidence (a)(b)(c) still owed. THESE THREE LEGS ARE THE ONLY INSTRUMENT
 * WATCHING THAT BREAK. Held, never deleted: they return to check() the day the shared shape is
 * ruled and wired, and they are the red-first for that work.
 *
 * ⚠️ INSTRUMENTATION GAP CLOSED IN THE SAME COMMIT: this gate listened only for 'pageerror', so
 * sketchbook.html's own erase failure logs — console.error "[sketchbook erase] DatumPurge.sketch
 * unavailable / threw — snapshot/mirror NOT scrubbed" — were INVISIBLE to it. The product was
 * willing to say why it failed and the instrument was not listening. Captured now. Measured:
 * neither fires, so the purge genuinely RUNS — part of how compaction was confirmed, not assumed.
 * ===================================================================================== */

/* _p6_archive_parity.js — STANDING GATE for P6 Blueprint↔Sketchbook save-parity.
 *
 * Proves, in a REAL signed-in browser (persistent mock Clerk, real codec via nav.js):
 *   (a) all 4 slots are unlocked (saveable + openable) in BOTH Archives;
 *   (b) erase fully purges EVERY copy of a slot — record, per-slot key, carried
 *       snapshot, session draft, AND the Clerk *_z mirror — with NO resurrection,
 *       while a snapshot belonging to a DIFFERENT (unsaved) plan is PRESERVED;
 *   (c) bare Open with nothing selected leaves no draft/snapshot to resurrect;
 *   (d) the premium overlay/modals remain in the DOM (deactivated, not deleted).
 *
 * Mirrors _cross_device_restore_parity.js's harness (mock Clerk meta in
 * sessionStorage = the "cloud", real Clerk + analytics route-blocked, served on
 * *.localhost so the mirror actually fires).
 *
 * Run: node scripts/_p6_archive_parity.js   (exit 0 = GREEN)
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
// --legacyopen RED-FIRST: restore the pre-#310/#380 slot-INDEX selector for the Sketchbook Open
// control. The gate MUST go red on it — if it does not, this half is no longer pinning id-based
// addressing and the green is worthless. Carries its own assertion at the exit path.
const LEGACY_OPEN = process.argv.includes('--legacyopen');
const HOST = 'datumfi.localhost'; const PORT = 8164; const BASE = 'http://' + HOST + ':' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
const check = (name, cond, detail) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : '')); if (!cond) fails.push(name); };
/* HELD — runs, prints its real measurement, does NOT touch the verdict. Same shape as the
   _gate_d1_boot_capture split: the untrusted premise is LEG-scoped, so the file stops being one
   nobody may believe. A HOLD THAT HIDES ITS EVIDENCE IS A DELETION WITH EXTRA STEPS.
   ⛔ TOKEN IS 'HELD', NEVER '[QUARANTINED]' — _suite_baseline.mjs classifies by substring, so
   printing that literal anywhere would re-quarantine the WHOLE FILE and this split would look
   done while changing nothing. */
let heldN = 0;
const hold = (name, cond, detail) => { heldN++; console.log('  HELD  ' + (cond ? '(would pass) ' : '(would fail) ') + name + (detail != null ? ' (' + detail + ')' : '')); };

/* ⛔ THE 1500ms BUDGET WAS COVERING A NETWORK FETCH, AND UNDER LOAD IT LOST.
   Its own comment said what it was waiting for: "730ms scrub + LAZY CODEC LOAD + async remirror".
   The scrub is a timer, but the codec is a lazily-loaded script — a FETCH — and the remirror cannot
   run until it lands. Under --concbrowser=3, three browsers share one local server and that fetch
   stretches past the remaining ~770ms. The codec never runs, `blueprint_z` is never written, and
   the two legs that read it fail while every synchronous localStorage assertion beside them passes.
   MEASURED 2026-09-02: FAIL zPresent + FAIL zHasSlot3, with "dropped slot2" PASSING — the signature
   of the mirror being ABSENT rather than WRONG, because `!!(null && ...)` is false and `!false` is
   true. ⚠️ THAT PASS IS A VACUOUS ONE, saved only by zPresent being asserted two lines above it.
   🔑 THE CONDITION IS UNIFORM ACROSS ALL FOUR ERASE CALL SITES: every erase — purge or guard,
      blueprint or sketch — RE-ENCODES THE CLERK MIRROR. So capture the mirror before, and wait for
      it to change. That is the artefact the failing legs read, and it settles last.
   ⚠️ THE TIMEOUT FALLS THROUGH DELIBERATELY. If the mirror never changes, the legs below report
      it honestly — zPresent is the anti-vacuity partner and it is already there. An exception here
      would replace a verdict we authored with a stack trace the runtime authored. */
async function eraseBlueprint(page, slot) {
  // Slice-1 Blueprint.html is id-based (render-N): the Erase button carries data-purge-id="<bpId>",
  // not the old data-purge-target="<slot>". The gate seeds bp-<slot> into each slot, so slot N == bp-N.
  const __mockclerk_meta_before = await page.evaluate(() => sessionStorage.getItem('__mockclerk_meta') || '');
  await page.evaluate((s) => {
    var b = document.querySelector('.erase-action[data-purge-id="bp-' + s + '"]');
    if (b) b.click();
  }, slot);
  await page.waitForFunction(() => !!document.getElementById('action-confirm-erase'), null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { var c = document.getElementById('action-confirm-erase'); if (c) c.click(); });
  await page.waitForFunction((b) => (sessionStorage.getItem('__mockclerk_meta') || '') !== b,
    __mockclerk_meta_before, { timeout: 10000 }).catch(() => {});
}
/* Same repair, same reasoning as eraseBlueprint above — the sketch flow lazily loads the SAME
   codec and re-encodes the SAME mirror (sketchbook_z rather than blueprint_z). */
async function eraseSketch(page, slot) {
  const __mockclerk_meta_before = await page.evaluate(() => sessionStorage.getItem('__mockclerk_meta') || '');
  await page.evaluate((s) => {
    var b = document.querySelector('.slot-erase-action[data-purge-target="' + s + '"]');
    if (b) b.click();
  }, slot);
  await page.waitForFunction(() => !!document.getElementById('action-confirm-erase'), null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { var c = document.getElementById('action-confirm-erase'); if (c) c.click(); });
  await page.waitForFunction((b) => (sessionStorage.getItem('__mockclerk_meta') || '') !== b,
    __mockclerk_meta_before, { timeout: 10000 }).catch(() => {});
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  /* The erase path reports its OWN failures via console.error, not by throwing — so listening only
     for 'pageerror' made "[sketchbook erase] DatumPurge.sketch unavailable/threw" invisible to this
     gate. Collected, and surfaced in the dump so a future red arrives WITH the product's own
     explanation attached instead of leaving the next reader to re-derive it. */
  const eraseLogs = [];
  page.on('console', (m) => { const t = m.text(); if (/\[sketchbook erase\]|DatumPurge/i.test(t)) eraseLogs.push(m.type() + ': ' + t); });
  await page.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      user: {
        get unsafeMetadata() { try { return JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) { return {}; } },
        update: function (o) { try { sessionStorage.setItem('__mockclerk_meta', JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' }
      }
    };
  });

  // ════════ BLUEPRINT STORE ════════
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);   // nav.js lazy-loads the codec
  // Seed 4 slots via the REAL save path (writes per-slot key, draft, archive, Clerk z).
  await page.evaluate(async () => {
    for (var n = 1; n <= 4; n++) {
      var bp = window.DatumBlueprint['new']();
      bp.blueprint_id = 'bp-' + n;
      bp.datum.net_datum_v1 = 90000 + n;
      bp.accounts = [{ id: 'r' + n, baseId: 'taxable', value: 100000 * n, holdings: [] }];
      window.DatumBlueprint.save(bp, { slot: n });
    }
  });
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);

  const bpUnlock = await page.evaluate(() => {
    var locked = [];
    for (var n = 1; n <= 4; n++) { var t = document.getElementById('blueprint-slot-' + n); if (t && t.classList.contains('locked')) locked.push(n); }
    // Slice-1 render-N: Open buttons carry data-open-id="<bpId>" (was data-open-slot). Count the 4 seeded.
    var openable = document.querySelectorAll('.open-blueprint-action[data-open-id]').length;
    var acc = document.getElementById('summary-access');
    return {
      token: !!(acc && acc.textContent.trim() === 'Studio'),   // UI proxy for userHasPremiumToken
      lockedSlots: locked, openable: openable,
      modalPresent: !!document.getElementById('premium-gate-modal'),
      saveBtn: !!document.getElementById('action-save-blueprint')   // P6.1: must be GONE
    };
  });
  check('BP: signed-in seeds premium token', bpUnlock.token);
  check('BP: no slot locked (all 4 unlocked)', bpUnlock.lockedSlots.length === 0, bpUnlock.lockedSlots.join(','));
  check('BP: all 4 slots openable', bpUnlock.openable === 4, bpUnlock.openable);
  check('BP: premium-gate-modal still in DOM (deactivated)', bpUnlock.modalPresent);
  check('BP P6.1: "Save Current Blueprint" button removed', !bpUnlock.saveBtn);

  // (b) PURGE: snapshot + draft belong to slot 2 → erase slot 2 clears every copy.
  await page.evaluate(() => {
    var bp2 = { blueprint_id: 'bp-2', schema: 'DatumFIBlueprintV1' };
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify(bp2));
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(bp2));
  });
  await eraseBlueprint(page, 2);
  const bpPurge = await page.evaluate(() => {
    var arch = null; try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    var dec = (meta.blueprint_z && window.DatumArchiveCodec) ? window.DatumArchiveCodec.decodeBlueprintArchive(meta.blueprint_z) : null;
    return {
      zPresent: !!meta.blueprint_z,
      archSlot2: !!(arch && arch.slot2),
      perSlot2: localStorage.getItem('datum_blueprint_state_2') != null,
      snapshot: sessionStorage.getItem('datumfi_blueprint_current_snapshot') != null,
      draft: sessionStorage.getItem('datumfi_blueprint_draft_v1') != null,
      zHasSlot2: !!(dec && dec.slot2), zHasSlot3: !!(dec && dec.slot3)
    };
  });
  check('BP erase: archive slot2 cleared', !bpPurge.archSlot2);
  check('BP erase: datum_blueprint_state_2 cleared', !bpPurge.perSlot2);
  check('BP erase: matching snapshot cleared', !bpPurge.snapshot);
  check('BP erase: matching session draft cleared', !bpPurge.draft);
  check('BP erase: Clerk blueprint_z written (codec ensured)', bpPurge.zPresent);
  check('BP erase: Clerk blueprint_z dropped slot2', !bpPurge.zHasSlot2);
  check('BP erase: Clerk blueprint_z kept slot3', bpPurge.zHasSlot3);

  // (b-guard) PRESERVE: an unrelated (unsaved) snapshot survives erasing a different slot.
  await page.evaluate(() => {
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify({ blueprint_id: 'bp-UNREL' }));
  });
  await eraseBlueprint(page, 3);
  const bpGuard = await page.evaluate(() => ({
    snapshot: sessionStorage.getItem('datumfi_blueprint_current_snapshot') != null,
    perSlot3: localStorage.getItem('datum_blueprint_state_3') != null
  }));
  check('BP guard: unrelated snapshot PRESERVED', bpGuard.snapshot);
  check('BP erase: datum_blueprint_state_3 cleared', !bpGuard.perSlot3);

  // (P6.1) AUTO-CONSUME on landing: a signed-out Studio save carried a snapshot +
  // pending flag through the vault hop → must auto-save inline on the next signed-in
  // landing (no "Save Current" button), fire ONCE, and clear the flag. #278 (b): saveCarriedSnapshot()
  // now mints a NEW blueprint ({newBlueprint:true}, save-as-new); slots 2,3 are empty after the purge
  // tests, so Rolling-4 lands it in slot 2 (no slot-1 clobber). We verify by the carried CONTENT
  // (net_datum_v1 = 77000, distinct from the seeds' 90001-4) landing in exactly one slot — id/slot-agnostic.
  await page.evaluate(() => {
    var bp = window.DatumBlueprint['new']();
    bp.blueprint_id = 'bp-auto';
    bp.datum.net_datum_v1 = 77000;
    bp.accounts = [{ id: 'ra', baseId: 'taxable', value: 123000, holdings: [] }];
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify(bp));
    sessionStorage.setItem('datumfi_pending_save', 'blueprint');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);
  const bpAuto = await page.evaluate(() => {
    var arch = null; try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    var slot = 0; for (var n = 1; n <= 4; n++) { var s = arch && arch['slot' + n]; if (s && s.datum && s.datum.net_datum_v1 === 77000) { slot = n; break; } }
    return {
      savedSlot: slot,
      pending: sessionStorage.getItem('datumfi_pending_save') != null,
      snapshot: sessionStorage.getItem('datumfi_blueprint_current_snapshot') != null
    };
  });
  check('BP P6.1: auto-consume saved carried snapshot', bpAuto.savedSlot > 0, bpAuto.savedSlot);
  check('BP P6.1: auto-consume cleared pending flag', !bpAuto.pending);
  check('BP P6.1: auto-consume cleared snapshot', !bpAuto.snapshot);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const bpAutoOnce = await page.evaluate(() => {
    var arch = null; try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    var c = 0; for (var n = 1; n <= 4; n++) { var s = arch && arch['slot' + n]; if (s && s.datum && s.datum.net_datum_v1 === 77000) c++; }
    return c;
  });
  check('BP P6.1: auto-consume fires ONCE (no double-save)', bpAutoOnce === 1, bpAutoOnce);

  // ════════ SKETCHBOOK STORE ════════
  await page.goto(BASE + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    function contract(n) {
      return { sketch_id: 'sk-' + n, age: 40 + n, retire_age: 60 + n, portfolio_mass: 1000000 + n,
        contributions: 20000 + n, datum_spend: 90000 + n, resolved_state: 'EXPANSIVE', status: 'Drafted',
        date_stamped: '06/18/2026', time_stamped: '1:0' + n + ' PM' };
    }
    var book = { sketchbook_title: 'Gate', slot_1: contract(1), slot_2: contract(2), slot_3: contract(3), slot_4: contract(4) };
    try { localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify(book)); } catch (e) {}
    for (var n = 1; n <= 4; n++) { try { localStorage.setItem('datum_sketch_state_' + n, JSON.stringify(contract(n))); } catch (e) {} }
    if (window.DatumArchiveCodec) {
      var z = window.DatumArchiveCodec.encodeSketchbook(book);
      var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
      meta.sketchbook_z = z;
      sessionStorage.setItem('__mockclerk_meta', JSON.stringify(meta));
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);

  const skUnlock = await page.evaluate((legacyOpen) => {
    var locked = [];
    for (var n = 1; n <= 4; n++) { var t = document.getElementById('tile-slot-' + n); if (t && t.classList.contains('locked')) locked.push(n); }
    // #310/#380 ID-BASED ADDRESSING. sketchbook.html renders the Open control as
    // data-open-slot="${data.sketchId || idx}" — so for a SAVED sketch the attribute carries the
    // SKETCH ID, never the slot index. This half of the gate was left on the pre-migration
    // selector ("1".."4") long after the Blueprint half moved to id-based (see data-open-id at the
    // BP block above), so it matched NOTHING and reported 0 openable against a page that was
    // rendering all four controls correctly. Assert the seeded ids: the real contract is that each
    // saved sketch is addressed BY ITS ID. (Erase is NOT part of this — .slot-erase-action still
    // legitimately carries data-purge-target="${idx}", so eraseSketch() stays index-keyed.)
    var openIds = Array.prototype.slice.call(document.querySelectorAll('.slot-open-action'))
      .map(function (b) { return b.getAttribute('data-open-slot'); });
    var openable;
    if (legacyOpen) {
      // --legacyopen RED-FIRST: the pre-migration selector, keyed on the slot INDEX.
      openable = 0;
      for (var m = 1; m <= 4; m++) { if (document.querySelector('.slot-open-action[data-open-slot="' + m + '"]')) openable++; }
    } else {
      openable = ['sk-1', 'sk-2', 'sk-3', 'sk-4'].filter(function (id) { return openIds.indexOf(id) !== -1; }).length;
    }
    var acc = document.getElementById('summary-sketch-access');
    return {
      token: !!(acc && acc.textContent.trim() === 'Design'),   // UI proxy for userHasPremiumToken
      lockedSlots: locked, openable: openable, openIds: openIds,
      modalPresent: !!document.getElementById('premium-gate-modal'),
      capacityPresent: !!document.getElementById('discover-capacity-modal'),
      saveBtn: !!document.getElementById('action-save-current-sketch')   // P6.1: must be GONE
    };
  }, LEGACY_OPEN);
  check('SK: signed-in seeds premium token', skUnlock.token);
  check('SK: no slot locked (all 4 unlocked)', skUnlock.lockedSlots.length === 0, skUnlock.lockedSlots.join(','));
  check('SK: all 4 slots openable', skUnlock.openable === 4, skUnlock.openable + ' — ids ' + JSON.stringify(skUnlock.openIds));
  check('SK: premium-gate-modal still in DOM (deactivated)', skUnlock.modalPresent);
  check('SK: discover-capacity-modal still in DOM (deactivated)', skUnlock.capacityPresent);
  check('SK P6.1: "Save Current Sketch" button removed', !skUnlock.saveBtn);

  // (b) PURGE: snapshot belongs to slot 2 → erase slot 2 clears every copy.
  await page.evaluate(() => {
    var c2 = { sketch_id: 'sk-2', age: 42, retire_age: 62, portfolio_mass: 1000002, datum_spend: 90002, date_stamped: '06/18/2026', time_stamped: '1:02 PM' };
    sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify(c2));
  });
  await eraseSketch(page, 2);
  const skPurge = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    var dec = (meta.sketchbook_z && window.DatumArchiveCodec) ? window.DatumArchiveCodec.decodeSketchbook(meta.sketchbook_z) : null;
    return {
      zPresent: !!meta.sketchbook_z,
      bookSlot2: !!(book && book.slot_2),
      perSlot2: localStorage.getItem('datum_sketch_state_2') != null,
      snapshot: sessionStorage.getItem('datumfi_sketch_current_snapshot') != null,
      zHasSlot2: !!(dec && dec.slot_2), zHasSlot3: !!(dec && dec.slot_3),
      /* THE EVIDENCE THE HELD LEGS STAND ON, captured in the gate rather than in a throwaway probe:
         which sketch_id actually sits in each slot after the erase. ["sk-1","sk-3","sk-4",null] is
         COMPACTION (sk-2 deleted, list packed up); ["sk-1",null,"sk-3","sk-4"] would be a GAP;
         an unchanged ["sk-1","sk-2","sk-3","sk-4"] would be the retention defect this was once
         mistaken for. One line, and it discriminates all three. */
      bookIds: [1, 2, 3, 4].map(function (n) { var s = book && book['slot_' + n]; return s ? (s.sketch_id || '?') : null; })
    };
  });
  /* ⏸ HELD 2026-08-06 — THESE THREE ASSERT *GAP* SEMANTICS AGAINST A ROOM THAT *COMPACTS*.
     MEASURED (id-probe, this fixture, 2026-08-06): seed sk-1..sk-4, erase slot 2, and the book reads
     ["sk-1","sk-3","sk-4",null]. sk-2 is GONE from the book AND from the Clerk mirror. THE ERASE
     DELETES CORRECTLY. slot_2 is non-empty only because the list PACKED UP behind the deletion
     (sketchbook.html:3435 `var c = contracts[n - 1] || null;` fills positionally, so no gap can
     survive by construction). !bookSlot2 / !perSlot2 / !zHasSlot2 are true ONLY under gap semantics.
     ⚖️ AND THERE IS NO CONTRADICTION WITH _gate_sketchbook_erase_survivors, which was the stated
     reason for the 2026-08-01 quarantine. That gate asks "is the erased ID gone and are two left?"
     -> TRUE under compaction. This one asks "is the slot_2 KEY empty?" -> FALSE under compaction.
     BOTH INSTRUMENTS ARE CORRECT; THEY ENCODE DIFFERENT CONTRACTS. The dispute was never whether
     the erase works.
     WHAT IS REAL, AND WHY THESE STAY IN THE FILE: Sketchbook compacts, Blueprint leaves a gap, and
     BOTH _gate_d1_sketch_parity.mjs:5 and sketchbook.html:3104 assert the two rooms behave the SAME.
     One room is the drifter. That is the open #510 parity arc with evidence (a)(b)(c) still owed, and
     these three legs are the only instrument watching it. Held, not deleted — they go back to check()
     the day the shared shape is ruled and wired, and they are the red-first for that work. */
  hold('SK erase: book slot_2 cleared', !skPurge.bookSlot2,
    'COMPACTION not retention: book=' + JSON.stringify(skPurge.bookIds) +
    ' -- sk-2 GONE, the list packed up. Blocked on the #510 parity arc, not on a defect here.');
  hold('SK erase: datum_sketch_state_2 cleared', !skPurge.perSlot2,
    'slot 2 is legitimately re-occupied by the next sketch after the list packs up');
  check('SK erase: matching snapshot cleared', !skPurge.snapshot);
  check('SK erase: Clerk sketchbook_z written (codec ensured)', skPurge.zPresent);
  // HARDENED 2026-07-27 — this asserted only `!zHasSlot2`, which is TRIVIALLY true when NO mirror
  // exists at all. It passed while sketchbook_z was never written, actively MASKING the erase defect
  // (sketchbook.html was writing the legacy `sketchbook` object because the codec was not ensured).
  // A control that reports success for an absent mirror is not a control. Require zPresent FIRST.
  hold('SK erase: Clerk sketchbook_z dropped slot2', skPurge.zPresent && !skPurge.zHasSlot2,
    'zPresent=' + skPurge.zPresent + ' zHasSlot2=' + skPurge.zHasSlot2 +
    ' -- the mirror encodes the COMPACTED book, so slot_2 holding the shifted sketch is correct here');
  check('SK erase: Clerk sketchbook_z kept slot3', skPurge.zHasSlot3);

  // (b-guard) PRESERVE: an unrelated, unstamped snapshot survives an unrelated erase.
  await page.evaluate(() => {
    sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify({ sketch_id: 'sk-UNREL' }));
  });
  await eraseSketch(page, 3);
  const skGuard = await page.evaluate(() => ({
    snapshot: sessionStorage.getItem('datumfi_sketch_current_snapshot') != null,
    perSlot3: localStorage.getItem('datum_sketch_state_3') != null
  }));
  check('SK guard: unrelated snapshot PRESERVED', skGuard.snapshot);
  check('SK erase: datum_sketch_state_3 cleared', !skGuard.perSlot3);

  // (c) bare-open freshness: after the matched erase, no draft/snapshot remains to resurrect.
  check('bare-open: BP draft empty (fresh Studio)', !bpPurge.draft);
  // REMOVED 2026-07-27 — 'bare-open: SK snapshot empty after matched erase (fresh Sketch)' asserted
  // `!skPurge.snapshot`, the IDENTICAL expression to 'SK erase: matching snapshot cleared' above.
  // One measured value, two check names: it inflated the count and made one defect read as two.
  // Not re-pointed at a "fresh open" because sessionStorage is per-TAB and survives the reload, so
  // a re-read would return that same value under a new name. The assertion above is the real one.

  // (P6.1) SK AUTO-CONSUME on landing: fill first free page (2,3 empty after purge),
  // clear the pending flag, fire ONCE.
  await page.evaluate(() => {
    var c = { sketch_id: 'sk-auto', age: 47, retire_age: 67, portfolio_mass: 1700007, datum_spend: 95007, resolved_state: 'EXPANSIVE', status: 'Drafted', date_stamped: '06/18/2026', time_stamped: '2:07 PM' };
    sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify(c));
    sessionStorage.setItem('datumfi_pending_save', 'sketch');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);
  const skAuto = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    var slot = 0; for (var n = 1; n <= 4; n++) { var s = book && book['slot_' + n]; if (s && s.sketch_id === 'sk-auto') { slot = n; break; } }
    return {
      savedSlot: slot,
      pending: sessionStorage.getItem('datumfi_pending_save') != null,
      snapshot: sessionStorage.getItem('datumfi_sketch_current_snapshot') != null
    };
  });
  check('SK P6.1: auto-consume saved carried snapshot', skAuto.savedSlot > 0, skAuto.savedSlot);
  check('SK P6.1: auto-consume cleared pending flag', !skAuto.pending);
  check('SK P6.1: auto-consume cleared snapshot', !skAuto.snapshot);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const skAutoOnce = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    var c = 0; for (var n = 1; n <= 4; n++) { var s = book && book['slot_' + n]; if (s && s.sketch_id === 'sk-auto') c++; }
    return c;
  });
  check('SK P6.1: auto-consume fires ONCE (no double-save)', skAutoOnce === 1, skAutoOnce);

  // (P6.1) SK EMPTY-PIN opens a FRESH Sketch (mirrors Blueprint empty→Studio). Find an
  // empty tile and click it → must navigate to /sketch.html, not pin anything.
  const emptyTile = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    for (var n = 1; n <= 4; n++) { if (!(book && book['slot_' + n])) return n; }
    return 0;
  });
  if (emptyTile) {
    await Promise.all([
      page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
      page.evaluate((n) => { var t = document.getElementById('tile-slot-' + n); if (t) t.click(); }, emptyTile)
    ]);
    await page.waitForTimeout(800);
    const pinUrl = page.url();
    check('SK P6.1: empty-pin opens fresh Sketch', /\/sketch\.html(?:[?#]|$)/.test(pinUrl), pinUrl);
  } else {
    check('SK P6.1: empty-pin opens fresh Sketch', false, 'no empty tile to test');
  }

  // (P6.1 Item-3) NAV-PICKER save STAYS on the Sketch (Studio parity). Drive sketch.html
  // into scratch (engine armed), clear the book, open the picker, save an empty slot →
  // must NOT navigate to the Sketchbook, and the save must actually land (proves _doSave
  // ran past serializeSketchState, so "no nav" isn't a silent throw).
  await page.goto(BASE + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.evaluate(() => { try { localStorage.removeItem('datumfi_sketchbook_v1'); } catch (e) {} });
  const beforeUrl = page.url();
  await page.evaluate(() => { if (typeof window.sketchSaveCurrent === 'function') window.sketchSaveCurrent(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { var pop = document.getElementById('sketch-save-sb-pop'); if (pop) { var b = pop.querySelector('button'); if (b) b.click(); } });
  await page.waitForTimeout(1500);
  const navStay = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    var saved = false; for (var n = 1; n <= 4; n++) { if (book && book['slot_' + n]) { saved = true; break; } }
    var t = document.getElementById('sketchOverlayToast');
    return { url: window.location.href, saved: saved, toastShown: !!(t && t.classList.contains('show')) };
  });
  check('SK P6.1 Item-3: nav-picker save did NOT navigate away', /\/sketch\.html(?:[?#]|$)/.test(navStay.url) && navStay.url === beforeUrl, navStay.url);
  check('SK P6.1 Item-3: nav-picker save actually landed', navStay.saved);
  check('SK P6.1 Item-3: nav-picker shows stay-put confirm toast', navStay.toastShown);

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  /* heldN printed EVEN AT ZERO — a hold that stops being visible is a hold nobody revisits. */
  console.log('  ---- ' + (fails.length ? 'FAIL' : 'PASS') + '   (' + heldN + ' HELD, not counted -- see header: #510 compaction-vs-gap)');
  console.log(JSON.stringify({ verdict: fails.length ? 'FAIL' : 'PASS', heldNotCounted: heldN, bpUnlock, bpPurge, bpGuard, bpAuto, bpAutoOnce, skUnlock, skPurge, skGuard, skAuto, skAutoOnce, navStay, eraseLogs, pageErrors: pageErrors.slice(0, 3) }, null, 2));

  if (LEGACY_OPEN) {
    // Self-checking mutation: the legacy selector must actually CHANGE the outcome. A control that
    // reports success while mutating nothing is exactly the trap the 2026-07-26 sweep documented.
    var bit = fails.indexOf('SK: all 4 slots openable') !== -1;
    if (!bit) {
      console.error('❌ --legacyopen RED-FIRST FAILED — the gate stayed GREEN on the slot-INDEX selector.');
      console.error('   This half is no longer pinning id-based addressing. Re-ground it.');
      process.exit(1);
    }
    console.log('✅ RED-FIRST OK — the legacy slot-INDEX selector correctly turns "SK: all 4 slots openable" RED.');
    process.exit(0);
  }
  process.exit(fails.length ? 1 : 0);
})();
