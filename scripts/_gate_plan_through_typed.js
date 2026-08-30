/* @gate-pool: browser */
/* ══ THE PROFILE'S PLAN-THROUGH DATE — TYPED BY A USER, NOT CALLED BY A GATE ════════════════════
 *
 * ⛔⛔⛔ THIS GATE EXISTS BECAUSE TWO GREEN LEGS ASSERTED ITS CLAIM WHILE THE CLAIM WAS FALSE.
 * `_p8_studio_mechanics.js` has asserted "invalid date reverts slider + warns" — IN GREEN, INSIDE
 * THE SUITE WE USE TO AUTHORISE PUSHES — for months, over a field where typing did nothing at all.
 * It passed because it calls `_commitPlanEndDate` DIRECTLY and never travels the event path where
 * the defect lived. Both of those legs have had their SUBJECT restated in this same commit.
 * 🔑🔑 THE DIRECT-CALL LAW: A GATE THAT INVOKES A HANDLER PROVES THE HANDLER. IT PROVES NOTHING
 *      ABOUT THE FEATURE. Any leg whose subject is something a USER DOES must travel the path the
 *      user travels — click, type, Tab — and must never shortcut to the function.
 * ⛔ SO THIS FILE NEVER CALLS window._commitPlanEndDate. If a future edit makes it do so to "make
 *    the gate simpler", it becomes the very instrument it was written to replace.
 * ⚠️ Every earlier blind instrument here FAILED TO FIND something. That one ASSERTED THE OPPOSITE OF
 *    THE TRUTH. A GREEN COUNT IS A COUNT OF LEGS THAT PASSED, NOT A COUNT OF TRUTHS.
 *
 * ── THE DEFECT, MEASURED ────────────────────────────────────────────────────────────────────────
 * `change` fires BEFORE `blur`. The profile-date change listener called _studioApplyProfileDates()
 * -> syncFromProfileDates() -> _mirrorPlanEnd(), which repainted the field FROM THE SLIDER over the
 * value the user had just typed; the blur-time committer then read that stale text and committed the
 * OLD age. The edit vanished with no warning — and an INVALID date was indistinguishable from a
 * valid one, because the mirror handed the validator a good date every time.
 * 🔑 A FIELD CANNOT BE BOTH A DISPLAY AND AN INPUT. Both intentions shipped; whichever ran first won.
 * ⭐ THE FIX REMOVED THE INTERFERER, NOT THE OWNER. Relocating the commit into the change listener
 *    was tried and REJECTED ON MEASUREMENT: it creates a SECOND committer, and the second commit
 *    re-validates the already-reverted (valid) text and CLEARS the warning.
 * ⚠️ THE AUTHORED WARNING WAS NEVER MISSING — ONLY UNREACHABLE. It renders the correct sentence the
 *    moment the path is cleared, which is why no copy was written for this commit.
 *
 * Usage: node scripts/_gate_plan_through_typed.js [--mirror-back|--warn-sticks]
 *   --mirror-back  restores the unconditional sync on plan-end-age  -> REDS L2 + L3
 *   --warn-sticks  restores the label fn that never clears the warn -> REDS L4 ONLY
 * TWO controls, DISJOINT red sets. L5 is a companion regression guard with no control of its own:
 * the fix touches SHARED sync code, and the Captain's working control must not become collateral
 * damage from repairing the broken one.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8531; const BASE = 'http://127.0.0.1:' + PORT;

const MIRROR_BACK = process.argv.includes('--mirror-back');
const WARN_STICKS = process.argv.includes('--warn-sticks');

/* The SHIPPED text each control reverts to its pre-fix form. */
const A_SYNC = "        el.addEventListener('change', function () {\n          if (id === 'plan-end-age') {";
const B_SYNC = "        el.addEventListener('change', function () {\n          if (false) {";
const A_LABEL = "var w = $('plan-end-warn'); if (w) { w.textContent = ''; w.style.display = 'none'; } }";
const B_LABEL = "}";

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* ⛔ ANCHOR COUNT ASSERTED BEFORE ANY MUTATION. A control that silently fails to land is a green
   that proves nothing, and is indistinguishable from one that landed and found no defect. */
function mutate(src, anchor, repl, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + label + ': expected exactly 1, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(anchor, repl);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (/studio\.html$/.test(p) && (MIRROR_BACK || WARN_STICKS)) {
    let s = body.toString('utf8');
    /* `if (false)` rather than deleting the branch: the guard stops matching, the unconditional
       sync runs again, and the stylesheet/JS stays syntactically identical in shape. A CONTROL THAT
       BREAKS MORE THAN ITS TARGET PROVES NOTHING ABOUT ITS TARGET. */
    if (MIRROR_BACK) s = mutate(s, A_SYNC, B_SYNC, 'A_SYNC');
    if (WARN_STICKS) s = mutate(s, A_LABEL, B_LABEL, 'A_LABEL');
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const mode = MIRROR_BACK ? '   [MUTATED --mirror-back]' : WARN_STICKS ? '   [MUTATED --warn-sticks]' : '';
  console.log('[RUN] THE PROFILE PLAN-THROUGH DATE, TYPED' + mode);

  /* ⛔ THE PROFILE LIVES INSIDE D · DATA AND IS display:none ON THE LANDING. Every field below is in
     the DOM from first paint, so a gate that skipped this click would drive HIDDEN elements happily
     and prove nothing about anything a user can reach. Measured: #pri-dob has a 0x0 box until the
     first .sl-phase card is opened. */
  await page.click('.sl-phase');
  await page.waitForTimeout(1500);

  const reach = await page.evaluate(() => {
    const e = document.getElementById('plan-end-age');
    const r = e ? e.getBoundingClientRect() : null;
    return { n: document.querySelectorAll('#plan-end-age').length,
             warnN: document.querySelectorAll('#plan-end-warn').length,
             slN: document.querySelectorAll('#sl-plan-through').length,
             w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0 };
  });
  ok(reach.n === 1 && reach.warnN === 1 && reach.slN === 1 && reach.w > 0 && reach.h > 0,
    'L1 · REACHABLE: exactly one plan-end-age / warn / slider, and the field has a real box after '
    + 'opening D·DATA [observed ' + JSON.stringify(reach) + '] — every element here exists while '
    + 'hidden, so presence alone would prove nothing');

  /* ⛔ THE ONLY WAY THIS GATE TOUCHES THE FIELD. Click, select, keystrokes, Tab. No dispatchEvent,
     no direct handler call — that is the whole point of the file. */
  const typeInto = async (sel, val) => {
    await page.click(sel);
    await page.keyboard.press('Control+A');
    await page.type(sel, val, { delay: 20 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(900);
  };
  const state = () => page.evaluate(() => {
    const w = document.getElementById('plan-end-warn');
    return {
      field: document.getElementById('plan-end-age').value,
      slider: document.getElementById('sl-plan-through').value,
      d2: (document.getElementById('d2-slider-plan-through') || {}).value,
      warn: ((w || {}).textContent || '').trim(),
      warnDisp: w ? getComputedStyle(w).display : 'MISSING',
      payload: (() => { try { const r = window._buildStudioRequest && window._buildStudioRequest();
        return r ? r.plan_end_age : null; } catch (e) { return 'ERR'; } })()
    };
  });

  await typeInto('#pri-dob', '08/1982');
  await typeInto('#target-ret', '08/2046');
  const base = await state();

  /* ── L2 · A TYPED VALID DATE REACHES EVERY SURFACE THAT CLAIMS TO HOLD IT ────────────────────
     ⭐ ASSERTED AS A RELATIONSHIP ACROSS THREE SURFACES, NOT AS A CONSTANT. The typed age is
     DERIVED here from the DOB the gate itself typed, so retuning the fixture cannot silently make
     this leg assert a stale number. What must be true is that ONE typed value arrives everywhere. */
  await typeInto('#plan-end-age', '08/2070');
  const v = await state();
  const wantAge = 2070 - 1982;                    // DOB-anchored, same month => exact
  ok(v.field === '08 / 2070' && +v.slider === wantAge && +v.payload === wantAge,
    'L2 · A TYPED VALID DATE STICKS AND REACHES THE ENGINE [observed field ' + v.field
    + ', slider ' + v.slider + ', payload ' + v.payload + ', want age ' + wantAge
    + '] — before the fix all three kept the OLD value and the edit vanished silently');

  /* ⚠️ d2 IS RECORDED, NOT BLESSED. `d2-slider-plan-through` lives in the "Refine the Sketch"
     what-if panel (it carries swf-was ghost ticks), and it does NOT track this value — measured
     both before and after the fix, so this commit neither caused nor changed it. Whether it SHOULD
     track is a FILED QUESTION, not a decided one. This leg pins today's truth so that a future
     change to it REDS HERE and forces the ruling to be applied deliberately rather than drifting in
     unnoticed. ⛔ Do not "fix" this leg by making it expect movement; get the ruling first. */
  ok(v.d2 === base.d2,
    'L2b · THE REFINE-PANEL SLIDER IS UNCHANGED BY A PROFILE EDIT [observed ' + base.d2 + ' -> ' + v.d2
    + '] — RECORDED, NOT ENDORSED: whether the what-if panel should follow is an open ruling');

  /* ── L3 · AN INVALID DATE IS REFUSED *OUT LOUD* ──────────────────────────────────────────────
     ⛔ THIS IS THE LEG THE OLD DIRECT-CALL GATE CLAIMED TO OWN. It could not fail, because it never
     let the mirror run. Here the rejection must survive the real event sequence AND be visible. */
  await typeInto('#plan-end-age', '08/2060');     // age 78, below the ra+20 floor
  const bad = await state();
  ok(+bad.slider === wantAge && bad.warnDisp !== 'none' && /plan-through/i.test(bad.warn),
    'L3 · AN INVALID TYPED DATE REVERTS *AND SAYS SO* [observed slider ' + bad.slider + ' (held), warn "'
    + bad.warn.slice(0, 60) + '", display ' + bad.warnDisp + '] — a silent revert made invalid input '
    + 'indistinguishable from valid input, which is how this defect stayed invisible');

  /* ── L4 · THE MESSAGE DIES WHEN ITS CONDITION DOES ───────────────────────────────────────────
     A DEFECT THIS COMMIT CREATES IS THIS COMMIT'S TO OWN: the stale warning cannot occur before the
     fix, because the warning never appeared at all. An authored sentence that is false at the moment
     it is READ is the product lying in its own voice — here about someone's retirement horizon,
     after they have already corrected it. */
  await page.evaluate(() => { const s = document.getElementById('sl-plan-through'); s.value = '95';
    s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(900);
  const cleared = await state();
  ok(cleared.warnDisp === 'none' && cleared.warn === '',
    'L4 · THE WARNING CLEARS ONCE THE VALUE MOVES BY ANOTHER PATH [observed warn "' + cleared.warn
    + '", display ' + cleared.warnDisp + '] — no authored warning may outlive the condition it describes');

  /* ── L5 · COMPANION — THE CAPTAIN'S WORKING CONTROL IS NOT COLLATERAL DAMAGE ─────────────────
     The fix edits SHARED sync code. The sketch slider is the control he actually uses (he measured
     83 -> 88 on it), and repairing the broken input must not break the working one. */
  ok(+cleared.slider === 95 && +cleared.payload === 95 && /^\d{2} \/ \d{4}$/.test(cleared.field),
    'L5 · THE SKETCH SLIDER STILL DRIVES THE FIELD AND THE ENGINE [observed slider ' + cleared.slider
    + ', payload ' + cleared.payload + ', field ' + cleared.field + ']');

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
