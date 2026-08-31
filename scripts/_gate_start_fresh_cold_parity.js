/* @gate-pool: browser */
'use strict';
/* _gate_start_fresh_cold_parity.js — STANDING GATE for FINDING 52 / FINDING 53.
 *
 * ⛔ HANDLER ONLY. This gate calls window.clearDraftAndRefresh() DIRECTLY and does not claim to
 *    prove a feature. That is legitimate here and nowhere else in this arc: the button that calls
 *    it lives in showRestoredBanner(), whose only caller is restoreDraft(), which HAS NEVER RUN
 *    (F56 — measured: clearDraftAndRefresh assigned t=77ms, DatumBlueprint t=174ms). There is no
 *    real path to travel. The subject of this gate genuinely IS the function.
 *    ⚠️ WHEN F56'S COMMIT 2 WAKES restoreDraft(), THIS GATE MUST GROW A REAL-PATH LEG that opens
 *    the banner and clicks Start Fresh. Until then the direct call is the honest instrument.
 *
 * THE CLAIM: "Start Fresh" returns the Studio to the state a COLD FIRST ENTRY produces. After it
 * runs, NO input holds a value that came from neither the user nor the product's own markup.
 *
 * ⛔ NO LEG PINS A CONSTANT. The expected state is captured by BOOTING A SECOND, INDEPENDENT
 *    BROWSER CONTEXT COLD and reading what the product itself shows. There is no written-down
 *    list to miscount and nothing to go stale when a default changes. This is what catches the
 *    $120,000-vs-$100,000 divergence for free: the markup ships $100,000 in #spend-input, so a
 *    cold boot says $100,000 and no human has to know that.
 *
 * ⚠️ NOT A SECOND NAME FOR _gate_no_invented_birthday.js. That gate (F50 / F49a) drives the SKETCH
 *    controls and proves no Sketch path writes a Profile date. It never reaches this function, and
 *    its red set and this one's do not overlap. Same law (L47 binds DATA), different writer.
 *
 * WHY THIS GATE EXISTS — AND THE FINDING IS BIGGER THAN THE THREE FACTS IT WAS FILED FOR.
 *    F52/F53 were banked as "clearDraftAndRefresh hardcodes three personal facts". MEASURED
 *    2026-08-31 against a real cold boot, driving all 29 controls: TWENTY-SIX FIELDS DIFFER.
 *    "Start Fresh" clears the accounts and the SS matrix, writes three fabricated values, and
 *    LEAVES THE ENTIRE INPUT SURFACE AS THE DEPARTING USER LEFT IT — their name, location,
 *    salary, effective tax rate and filing status; their co-architect's name, date of birth,
 *    salary and retirement date; every slider; and the market / inflation / tax radios.
 *    🔑 THE THREE FABRICATIONS ARE THE VISIBLE CORNER OF A BUTTON THAT DOES NOT DO THE ONE THING
 *       ITS LABEL PROMISES. The fabrications are what a reader NOTICES; the residue is what a
 *       reader cannot notice, because a field holding the previous user's real answer looks
 *       exactly like a field holding the current user's real answer.
 *    ⭐ AND THE MEASUREMENT IS WHY THE FIX IS SMALL: for all 26, the cold value IS the markup
 *       default. So the reset needs no list of fields at all — it restores what the markup ships.
 *
 * MEASURED ON UNFIXED BYTES (2026-08-31, production e7af6c4): SCORE 2/8 —
 *    L2 L3 L4 L8 RED · L0 L1 L5 L6 L7 GREEN.
 *    L5 L6 L7 are the HONEST HALF and are green on BOTH builds by construction: the sketch must
 *    still draw, so a "just delete the reset" amputation cannot pass. L0 L1 are the instrument's
 *    own controls — if they ever red, no verdict below them may be believed.
 *    ⚠️ L5 L6 L7 FIRST SHIPPED AS `after === cold` AND RED-FIRST REJECTED THEM: that is a parity
 *    claim, green only after the fix, which would have made the honest half a third copy of L3.
 *    The prediction being WRONG is what exposed it. Do not "simplify" them back.
 *
 * CONTROLS — MEASURED SIGNATURES, 2026-08-31. Each must produce a DISTINCT red set.
 *   ⛔ THE GREEN COLUMN IS PART OF EACH SIGNATURE. Two controls that red the same legs are one
 *      control wearing two labels; L4 separates the first two, and --staleexact is a singleton.
 *   --defect      re-installs the three hardcoded facts (the SHIPPED defect, restored verbatim)
 *                   -> L2 L3 L4 L8 RED · L0 L1 L5 L6 L7 GREEN   (5/9)
 *   --amputate    removes the reset entirely
 *                   -> L2 L3 L8 RED, **L4 GREEN** · nothing is invented; the residue is everything (6/9)
 *   --staleexact  removes the one line that clears data-exact-val
 *                   -> **L8 ALONE** RED (8/9). Reproduces a defect that genuinely occurred mid-fix.
 *   --survey      prints the FULL cold-vs-after field diff and runs no verdict. Measurement only.
 *
 * ⚠️ TWO CONTROLS WERE BUILT, MEASURED, AND RETIRED — RECORDED BECAUSE A CONTROL THAT DOES NOT BITE
 *    IS A FINDING ABOUT THE CODE, NOT A FAILED EXPERIMENT:
 *    · --nopanel removed an `updateShapePanel()` call this fix originally added -> 9/9 GREEN. The
 *      call was a MEASURED NO-OP, written on a hypothesis formed before the mechanism was known,
 *      and it was REMOVED FROM studio.html rather than shipped. The exactVal clear was the fix.
 *    · --nodraw removed `renderInputs(); updateSVGs();` -> 9/9 GREEN, because the co-architect
 *      toggle's own change handler calls updateSVGs() independently. TWO PATHS REACH ONE OUTCOME,
 *      so no minimal source mutation can isolate either — the control cannot be written honestly.
 * ⛔ DISCLOSED RESIDUAL, AS A DECISION: L5 L6 L7 (the honest half) therefore have NO biting control
 *    here. Every path through this function redraws, so nothing short of simulating a blank canvas
 *    would red them, and a control must restore a real defect rather than invent one. They stand as
 *    a tripwire, NOT as a proven-guarded assertion. Do not report them as controlled.
 *
 * Run: node scripts/_gate_start_fresh_cold_parity.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const MUT = { defect: argv.includes('--defect'), amputate: argv.includes('--amputate'), staleexact: argv.includes('--staleexact') };
const SURVEY = argv.includes('--survey');

/* ── THE MUTATION ANCHORS. Each rewrite must PROVE IT LANDED or the run aborts: a control that
      silently fails to apply produces a GREEN that certifies nothing. */
const RESET_START = "['sec-profile', 'sec-sketch', 'sec-datum'].forEach(function (sid) {";
const RESET_END = "if (_coTog) _coTog.dispatchEvent(new Event('change'));";
/* The SHIPPED defect, restored verbatim from e7af6c4. ⛔ A control must reproduce the defect that
   actually shipped, never a convenient imitation of one. */
const DEFECT_TEXT = "var d = document.getElementById('pri-dob');    if (d) d.value = '08 / 1982';\n"
  + "      var r = document.getElementById('target-ret'); if (r) r.value = '03 / 2035';\n"
  + "      var s = document.getElementById('spend-input'); if (s) s.value = '$120,000';";

/* ⛔ A CONTROL MUST PROVE IT LANDED **AND** PROVE IT LANDED WHERE IT MEANT TO.
   MEASURED 2026-08-31: --nodraw anchored on `renderInputs(); updateSVGs();`, which occurs SIX
   times in studio.html. indexOf found the FIRST one, the end anchor sat 400KB later, and the
   mutation excised 422,807 BYTES — a third of the page — while still reporting itself applied.
   Every leg went red, which looks exactly like a working control.
   🔑 "IT LANDED" IS NOT THE SAME CLAIM AS "IT LANDED ON THE RIGHT LINE", AND A RED SET CANNOT
      TELL THEM APART. The end anchor is unique, so the block is located by searching BACKWARDS
      from it, and MAX_EXCISION caps what any control here is allowed to remove. */
const MAX_EXCISION = 2000;
let poisonNote = 'none';
function mutate(html) {
  const notes = [];
  if (MUT.defect || MUT.amputate) {
    const a = html.indexOf(RESET_START);
    const b = html.indexOf(RESET_END);
    if (a === -1 || b === -1 || b < a) {
      console.log('  ABORT: the reset block was NOT found in studio.html. The control did not land.');
      console.log('  (start=' + a + ' end=' + b + ') — a mutation that does not apply produces a GREEN that certifies nothing.');
      console.log('\nOVERALL: RED');
      process.exit(1);
    }
    const span = (b + RESET_END.length) - a;
    if (span > MAX_EXCISION) {
      console.log('  ABORT: the reset block spans ' + span + ' bytes (cap ' + MAX_EXCISION + '). The anchors are not bracketing what they name.');
      console.log('\nOVERALL: RED');
      process.exit(1);
    }
    const before = html.length;
    html = html.slice(0, a) + (MUT.defect ? DEFECT_TEXT : '') + html.slice(b + RESET_END.length);
    notes.push((MUT.defect ? 'reset block -> the three shipped hardcoded facts' : 'reset block -> removed')
      + ' (' + (before - html.length) + ' bytes removed, span ' + span + ')');
  }
  if (MUT.staleexact) {
    /* ⭐ THE STRONGEST CONTROL IN THIS GATE, AND IT RESTORES A DEFECT THAT ACTUALLY EXISTED rather
       than simulating one: during this fix the reset restored every slider's `value` and left
       data-exact-val behind, so the fields read cold while the HUD showed the departing user's
       $8.69M against a cold boot's $2.50M. Removing this one line reproduces exactly that, and it
       reds L8 ALONE — a singleton red set. */
    const LINE = "if (el.type === 'range') delete el.dataset.exactVal;";
    const i = html.indexOf(LINE);
    if (i === -1) {
      console.log('  ABORT: the exactVal clear was NOT found. The control did not land.');
      console.log('\nOVERALL: RED');
      process.exit(1);
    }
    html = html.slice(0, i) + html.slice(i + LINE.length);
    notes.push('exactVal clear removed (' + LINE.length + ' bytes)');
  }
  poisonNote = notes.length ? notes.join(' + ') : 'none';
  return html;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (p === '/studio.html') {
    const body = mutate(fs.readFileSync(fp, 'utf8'));
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(body); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const blockClerk = (ctx) => ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
  return route.continue();
});

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

/* FIXTURE, STATED IN FULL (seeded-fixture law): a fresh page -> the entry overlay's
   "Start from Scratch" -> _studioEnterRoom('data'). NOTHING is forced visible and no storage is
   pre-seeded. The COLD arm stops there. The AFTER arm additionally types three values through the
   real input/change/blur path and only then calls the handler. */
async function boot(ctx, BASE) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(700);
  return page;
}

/* ⛔ ENUMERATE, DO NOT NOMINATE. The snapshot is every id'd input/select the page has, read from
   the DOM — not a hand-written list of the three fields we happen to know about. A field this
   gate never heard of that Start Fresh forgets to reset is still a field the user did not supply. */
const snapshot = (page) => page.evaluate(() => {
  const fields = {};
  document.querySelectorAll('input[id], select[id]').forEach((el) => {
    if (el.type === 'file') return;
    fields[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? String(el.checked) : String(el.value);
  });
  const svg = document.getElementById('shape-panel-svg');
  let geom = 0, pathCount = 0;
  if (svg) svg.querySelectorAll('path').forEach((p) => { geom += (p.getAttribute('d') || '').length; pathCount++; });
  return {
    fields,
    stateName: (document.getElementById('shape-state-name') || {}).textContent || '',
    datumVal: (document.getElementById('ri-datum-val') || {}).textContent || '',
    pathGeom: geom,
    pathCount: pathCount
  };
});

/* ⛔ SETTLE ON A CONDITION, NEVER ON A DURATION — THE FIXED-SLEEP FLAKE SPECIES.
   ⚠️ AND SETTLE ON THE THING THE LEG ACTUALLY READS. This first polled PATH GEOMETRY and
   reported settled=true at 24560 — a FALSE SETTLE: measured 2026-08-31, the geometry holds the
   departing value for ~3 SECONDS and only then converges (24560 -> 25896; cold is stable at 25976
   from first paint; path COUNT is 14 in every arm throughout). No consecutive-sample predicate can
   tell a three-second plateau from completion without encoding the reveal animation's internals.
   🔑 STABLE IS NOT CORRECT. So this polls the HUD TEXT — the state name and the datum figure, which
   are exactly what L8 compares — and geometry is asserted only where it is honest: L7 checks the
   paths still EXIST and that none were LOST, which is structural and does not animate. */
async function settle(page, budgetMs) {
  const deadline = Date.now() + (budgetMs || 12000);
  let prev = null, stable = 0;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => ((document.getElementById('shape-state-name') || {}).textContent || '')
      + '|' + ((document.getElementById('ri-datum-val') || {}).textContent || ''));
    if (t === prev && /\d/.test(t)) { if (++stable >= 4) return { settled: true, readout: t }; } else { stable = 0; }
    prev = t;
    await page.waitForTimeout(250);
  }
  return { settled: false, readout: prev };
}

const type = (page, id, text) => page.evaluate(function (a) {
  const el = document.getElementById(a[0]); if (!el) return null;
  el.focus(); el.value = a[1];
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return el.value;
}, [id, text]);

(async () => {
  await new Promise((r) => server.listen(8167, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8167';

  /* ── THE COLD ARM. A SEPARATE BROWSER CONTEXT so no storage, cookie or in-page state can leak
        from the arm we are judging. This is the expected state, and the product authors it. */
  const coldCtx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await blockClerk(coldCtx);
  const coldPage = await boot(coldCtx, BASE);
  const coldSettle = await settle(coldPage);
  const cold = await snapshot(coldPage);
  await coldPage.close(); await coldCtx.close();

  /* ── THE AFTER ARM. Type, then Start Fresh. */
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await blockClerk(ctx);
  const p = await boot(ctx, BASE);

  /* ⛔ THE CO-ARCHITECT IS PART OF THE FIXTURE ON PURPOSE. Every other finding in this arc lives
     on the second person, and a fixture that never turns the toggle on cannot prove Start Fresh
     returns a JOINT plan to a cold boot — it would only ever have measured half a household.
     The toggle is driven through its REAL change handler, which is what reveals the fields; a
     display:block fixture step would be an assumption wearing the clothes of setup. */
  const TYPED = { 'pri-dob': '04 / 1977', 'target-ret': '09 / 2044', 'spend-input': '$88,000' };
  const coRevealed = await p.evaluate(() => {
    const t = document.getElementById('co-arch-toggle');
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
    const f = document.getElementById('co-arch-fields');
    return f ? getComputedStyle(f).display !== 'none' : false;
  });
  await p.waitForTimeout(350);
  for (const id of Object.keys(TYPED)) await type(p, id, TYPED[id]);
  await type(p, 'co-dob', '11 / 1980');

  await p.waitForTimeout(500);
  const narrowSnap = await snapshot(p);

  /* ⛔ THE FIXTURE DRIVES EVERY EDITABLE CONTROL, AND THAT IS THE WHOLE INSTRUMENT.
     MEASURED 2026-08-31: typing FOUR fields found EIGHT drifting fields; driving all 29 found
     TWENTY-SIX. The eight was never the blast radius of the defect — it was the blast radius of
     the FIXTURE. A gate that types the three fields we already knew about would have certified
     "Start Fresh works" while the departing user's name, location, salary, filing status, their
     co-architect's birthday and every slider sat untouched on screen.
     🔑 THE SEEDED-FIXTURE LAW POINTED THE OTHER WAY THIS TIME: the danger was not a step added so
     the feature would work, it was the steps NOT added, which quietly shrank the claim to fit. */
  let wideDriven = 0;
  {
    wideDriven = await p.evaluate(() => {
      let n = 0;
      const secs = ['sec-profile', 'sec-sketch', 'sec-datum'];
      secs.forEach((sid) => {
        const sec = document.getElementById(sid); if (!sec) return;
        sec.querySelectorAll('input[id], select[id]').forEach((el) => {
          if (el.disabled || el.readOnly || el.type === 'file') return;
          if (el.type === 'range') {
            const lo = +el.min || 0, hi = +el.max || 100;
            el.value = String(Math.round(lo + (hi - lo) * 0.73));
          } else if (el.type === 'checkbox') {
            if (!el.checked) el.checked = true;
          } else if (el.type === 'radio') {
            const grp = sec.querySelectorAll('input[type=radio][name="' + el.name + '"]');
            const last = grp[grp.length - 1]; if (last) last.checked = true;
          } else if (el.tagName === 'SELECT') {
            if (el.options.length > 1) el.selectedIndex = el.options.length - 1;
          } else {
            const ph = (el.getAttribute('placeholder') || '');
            const cur = String(el.value || '');
            if (/MM\s*\/\s*YYYY/i.test(ph)) el.value = '11 / 1988';
            else if (/^\$/.test(cur) || /salary|spend|total/i.test(el.id)) el.value = '$123,456';
            else el.value = 'ZZWIDE';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          n++;
        });
      });
      return n;
    });
    await p.waitForTimeout(900);
  }
  const typedSnap = await snapshot(p);

  const called = await p.evaluate(() => {
    if (typeof window.clearDraftAndRefresh !== 'function') return 'ABSENT';
    try { window.clearDraftAndRefresh(); return 'ok'; } catch (e) { return 'THREW: ' + e.message; }
  });
  const afterSettle = await settle(p);
  const after = await snapshot(p);

  /* ── THE DIFF, computed once and reused by every leg. */
  const keys = Array.from(new Set(Object.keys(cold.fields).concat(Object.keys(after.fields))));
  const drift = keys.filter((k) => cold.fields[k] !== after.fields[k])
    .map((k) => k + ': cold=' + JSON.stringify(cold.fields[k]) + ' after=' + JSON.stringify(after.fields[k]));

  if (SURVEY) {
    console.log('  SURVEY — cold fields captured: ' + Object.keys(cold.fields).length + ' · fixture drove ' + wideDriven + ' control(s)');
    console.log('  SURVEY — typed arm actually took: ' + JSON.stringify(Object.keys(TYPED).reduce((o, k) => (o[k] = typedSnap.fields[k], o), {})));
    console.log('  SURVEY — handler call: ' + called);
    console.log('  SURVEY — cold  stateName=' + JSON.stringify(cold.stateName) + ' datumVal=' + JSON.stringify(cold.datumVal) + ' pathGeom=' + cold.pathGeom);
    console.log('  SURVEY — after stateName=' + JSON.stringify(after.stateName) + ' datumVal=' + JSON.stringify(after.datumVal) + ' pathGeom=' + after.pathGeom);
    console.log('  SURVEY — DRIFT (' + drift.length + ' field(s) differ from a real cold boot):');
    drift.forEach((d) => console.log('      ' + d));
    await ctx.close(); await browser.close(); server.close();
    process.exit(0);
  }

  /* ── L0 — POSITIVE CONTROL, FIRST. A predicate over an empty set is true, and a snapshot of a
        page that never booted would make every leg below pass. Prove the instrument sees a real,
        populated page and that the typed arm genuinely took the values BEFORE judging anything. */
  const tookAll = Object.keys(TYPED).every((k) => narrowSnap.fields[k] && narrowSnap.fields[k].replace(/\s/g, '') === TYPED[k].replace(/\s/g, ''));
  check('L0 INSTRUMENT: the cold arm captured a populated page and the typed arm took every value',
    Object.keys(cold.fields).length > 10 && tookAll && called === 'ok' && coRevealed
      && coldSettle.settled && afterSettle.settled,
    'coldFields=' + Object.keys(cold.fields).length + ' typedTookAll=' + tookAll + ' handler=' + called
    + ' coArchRevealedByItsOwnHandler=' + coRevealed
    + '\n          settle: cold=' + JSON.stringify(coldSettle) + ' after=' + JSON.stringify(afterSettle)
    + '\n          typed readback=' + JSON.stringify(Object.keys(TYPED).reduce((o, k) => (o[k] = narrowSnap.fields[k], o), {})));

  /* ── L1 — THE FIXTURE MUST PROVE IT DIRTIED THE PAGE BEFORE ANY PARITY LEG IS BELIEVED.
        ⛔ A PREDICATE OVER AN EMPTY SET IS TRUE: if the wide pass silently drove nothing, the page
        would already equal cold and L2/L3/L4 would all pass while proving NOTHING. This leg is
        what stops that, and it asserts a RELATIONSHIP (the page moved away from cold), never a
        count of fields, which would go stale the moment a control is added. */
  const dirtied = Object.keys(cold.fields).filter((k) => typedSnap.fields[k] !== cold.fields[k]);
  check('L1 INSTRUMENT: the fixture drove the controls and genuinely dirtied the page vs cold',
    wideDriven >= 20 && dirtied.length >= 20 && Object.keys(TYPED).every((k) => narrowSnap.fields[k] !== cold.fields[k]),
    'wideDrove=' + wideDriven + ' fieldsDirtiedVsCold=' + dirtied.length + ' of ' + Object.keys(cold.fields).length);

  /* ── L2 — DISCARD, AND IT COVERS THE DERIVED RESIDUE, NOT JUST THE TYPED FIELDS.
        ⛔ MEASURED 2026-08-31, AND IT IS WHY THIS LEG IS NOT WRITTEN OVER `TYPED`: Start Fresh
        left THREE MORE fields carrying the departing user's data in DERIVED form —
        plan-end-age "04 / 2070" (their typed DOB's month, their birth year + 93), slider-age 49
        (their age) and slider-activation 67 (their retirement age). None of those three is a
        string the user typed, so a leg written over the typed values alone would have called
        this GREEN while the previous user's life sat on screen.
        🔑 RESIDUE IS DEFINED BY MEASUREMENT, NOT BY DERIVATION MATH: a field that still holds
        what the page held BEFORE Start Fresh ran, and that a cold boot does not ship, was not
        discarded. That covers every derivation without knowing any of them.
        ⭐ THIS IS --amputate'S LEG. */
  const residue = keys.filter((k) => after.fields[k] !== cold.fields[k] && after.fields[k] === typedSnap.fields[k])
    .map((k) => k + '=' + JSON.stringify(after.fields[k]));
  check('L2 DISCARD: no field still holds what the page held before Start Fresh ran',
    residue.length === 0,
    residue.length === 0 ? 'none' : residue.length + ' survived: ' + residue.join(' · '));

  /* ── L3 — COLD PARITY. Every field equals what the product itself shows on a real cold boot.
        ⛔ Compared against a SECOND CONTEXT, never against a literal written here. */
  check('L3 COLD PARITY: every id\'d input matches a REAL cold boot in a separate context',
    drift.length === 0,
    drift.length === 0 ? 'all ' + keys.length + ' fields match cold' : drift.length + ' of ' + keys.length + ' differ:\n            ' + drift.join('\n            '));

  /* ── L4 — NO THIRD STATE. THE FINDING'S OWN PROPERTY, stated as a property and not as a list:
        after Start Fresh, no field may hold a value that came from NEITHER the user NOR the
        product's markup. A birthday nobody typed is exactly this shape, and so is a $120,000 that
        is not even the markup's own default.
        ⭐ THIS IS --defect'S LEG, and it stays GREEN under --amputate. */
  const invented = keys.filter((k) => {
    const v = after.fields[k];
    if (v === cold.fields[k]) return false;               // the product's own default — legitimate
    if (v === typedSnap.fields[k]) return false;          // the user's own, typed OR derived — that is L2's fault, not this one
    return true;                                          // the page did not have it and the markup does not ship it. INVENTED.
  }).map((k) => k + '=' + JSON.stringify(after.fields[k]));
  check('L4 NO THIRD STATE: no field holds a value from neither the user nor the markup',
    invented.length === 0,
    invented.length === 0 ? 'none' : 'INVENTED: ' + invented.join(' · '));

  /* ── L5 L6 L7 — THE HONEST HALF, AND IT ASSERTS SURVIVAL, NOT PARITY.
        ⛔ THESE THREE WERE ORIGINALLY WRITTEN AS `after === cold` AND RED-FIRST CAUGHT IT (they
        went RED on the unfixed build against a prediction of GREEN). `after === cold` is a
        PARITY claim — it is L3 wearing three more labels, it cannot be green on both builds, and
        it would have made --nodraw and --amputate red the same legs.
        🔑 THE HONEST HALF MUST BE TRUE BEFORE THE FIX AND AFTER IT. What must survive is that the
        Studio still DRAWS: a named state, a figure, and real path geometry. An amputation that
        blanked the canvas reds here while every parity leg above stayed green. */
  check('L5 HONEST HALF: the sketch still names a state after Start Fresh',
    after.stateName.trim().length > 0,
    'after=' + JSON.stringify(after.stateName.trim()) + ' (cold names ' + JSON.stringify(cold.stateName.trim()) + ')');
  check('L6 HONEST HALF: the datum readout still shows a figure after Start Fresh',
    /\d/.test(after.datumVal),
    'after=' + JSON.stringify(after.datumVal.trim()) + ' (cold shows ' + JSON.stringify(cold.datumVal.trim()) + ')');
  check('L7 HONEST HALF: the shape panel still carries real geometry and lost no paths',
    after.pathGeom > 0 && cold.pathGeom > 0 && after.pathCount === cold.pathCount && cold.pathCount > 0,
    'afterGeom=' + after.pathGeom + ' coldGeom=' + cold.pathGeom
    + ' · afterPaths=' + after.pathCount + ' coldPaths=' + cold.pathCount);

  /* ── L8 — REDRAW CONSISTENCY, THE LEG --nodraw OWNS.
        Resetting the inputs is only half of Start Fresh; the drawn surface must be redrawn to
        AGREE with them. Strip the redraw and the fields read cold while the canvas still shows
        the departing user's estate — the disagreeing-pair fault, and the most convincing kind of
        wrong screen there is, because every number on it was true a moment ago.
        ⛔ ASSERTS THE RELATIONSHIP (drawn state agrees with a cold boot's), never the strings
        "EXPANSIVE" or "$2.50M", which are outputs of the model and will move.
        ⚠️ PATH GEOMETRY IS DELIBERATELY NOT PART OF THIS EQUALITY, AND THAT IS A MEASUREMENT, NOT
        A CONCESSION: the `d` byte-length animates for ~3s after the redraw and converges to within
        0.31% of cold (25896 vs 25976) while the path COUNT is identical throughout. Asserting it
        here would buy nothing L7 does not already prove structurally and would pay for it in a
        flake on the one leg most likely to be believed. The HUD text is the drawn state's semantic
        content and it is exact. */
  check('L8 REDRAW: the drawn state agrees with a real cold boot, not with the departing session',
    after.stateName.trim() === cold.stateName.trim() && after.datumVal.trim() === cold.datumVal.trim(),
    'stateName after=' + JSON.stringify(after.stateName.trim()) + ' cold=' + JSON.stringify(cold.stateName.trim())
    + '\n          datumVal  after=' + JSON.stringify(after.datumVal.trim()) + ' cold=' + JSON.stringify(cold.datumVal.trim())
    + '\n          pathGeom  after=' + after.pathGeom + ' cold=' + cold.pathGeom + ' (not asserted — animates; see L7 for structure)');

  await ctx.close(); await browser.close(); server.close();
  console.log('  poison: ' + poisonNote);
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  /* TRAP-AND-REPORT-PARTIAL. A flushed partial with no marker reads as a COMPLETE pass. */
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.log('OVERALL: RED');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
