'use strict';
/* SALARY-UNSTATED SUPPRESSION GATE (real page) — "we do not know" must not print as a number.
 *
 * ⛔ WHAT THIS EXISTS TO STOP. Four surfaces derived a percentage from `(priSal + coSal) > 0 ? ... : 0`,
 * which conflates "this household earns nothing" with "we have not been told what it earns" and then
 * prints the second one as a confident 0% — needs% and wants% in the Living Ledger, the Operating
 * Upkeep load badge and its HUD twin, and charity-as-%-of-gross.
 * ⛔⛔ AND THE LOAD BADGE DID WORSE THAN PRINT A WRONG NUMBER. loadPct fabricated as 0 is < 50, which
 *     added `.healthy` and painted the HUD teal: AN AFFIRMATIVE STATEMENT THAT THE USER IS DOING WELL,
 *     DERIVED FROM DATA WE DO NOT HAVE (§82.1676). Colour is a claim and so is a CSS class (§82.1677),
 *     so the suppression is complete only when the surface is INDISTINGUISHABLE FROM ONE THAT HAS
 *     NEVER BEEN EVALUATED — text, class AND inline colour.
 *
 * ⭐ THE POSITIVE ARMS ARE NOT DECORATION, THEY ARE THE PROOF. A gate that only checks "blank salary
 *    suppresses" passes just as happily over code that suppresses ALWAYS. L3/L4 type a real salary and
 *    require the real percentages BACK, so both verdicts are reachable in one run (§82.1662).
 *
 * ⚠️ ZERO IS AN ANSWER (§82.1664). L6 types a literal 0 and requires the predicate to treat it as
 *    ANSWERED, not as silence. A guard written as `> 0` would pass every other leg in this file and
 *    fail only this one — which is exactly why it is here.
 *
 * ⚠️ JOINT MODE NEEDS BOTH SALARIES (§82.1679). L5 fills the primary, enables the co-architect, leaves
 *    the co-salary blank, and requires suppression ANYWAY: a partial denominator is not randomly
 *    wrong, it is wrong in the flattering direction.
 *
 * MUTATIONS — both rewrite THE PRODUCT, served through page.route, not the harness:
 *   --refab   strips the `_salKnown &&` terms so the surfaces fabricate 0% again. Expect L1/L2 RED
 *             (and L5), L3/L4 GREEN — the fabrication returns, the real path is untouched.
 *   --reteal  keeps the text suppression but restores the OLD colour branch, so an unknown load is
 *             painted healthy/teal again. Expect ONLY L1c RED — the narrowest possible signature,
 *             proving the colour channel is asserted SEPARATELY from the text.
 *   Each anchor must match EXACTLY ONCE; a zero-match replace would run the unmutated page and
 *   report a green that proves nothing (§82.1628).
 *
 * Serve repo root on :8001 (the suite runner binds it), then: node scripts/_gate_salary_unstated_suppressed.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { STUDIO_PATH } = require('./_studio_source.cjs');   // Phase 0: the helper owns where the shell lives

const REFAB = process.argv.includes('--refab');
const RETEAL = process.argv.includes('--reteal');
/* --reword: changes ONE WORD of an authored sentence. Must red ONLY L8 — proof that the copy leg
   grips the text rather than merely confirming a div exists. */
const REWORD = process.argv.includes('--reword');
const ROOT = path.resolve(__dirname, '..');
const URL = 'http://127.0.0.1:8001/studio.html';

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) { pass++; lines.push('  PASS  ' + m); } else { fail++; lines.push('  FAIL  ' + m); } return c; };

const NOTE = 'Add your income above and your upkeep load appears here.';
const RATIO_NOTE = '— add your income to see this —';

function mutate(src) {
  const swaps = [];
  if (REFAB) {
    swaps.push([
      'var needsPct = _salKnown && moInc > 0 ? Math.round(essMo / moInc * 100) : 0;',
      'var needsPct = moInc > 0 ? Math.round(essMo / moInc * 100) : 0;']);
    swaps.push([
      'var _needsCell = _salKnown ? (needsPct + \'%\') : _ratioUnknown;',
      'var _needsCell = needsPct + \'%\';']);
    swaps.push([
      'var _wantsCell = _salKnown ? (wantsPct + \'%\') : _ratioUnknown;',
      'var _wantsCell = wantsPct + \'%\';']);
    swaps.push([
      'if(pctEl) pctEl.innerText = _salKnown ? (loadPct + \'%\') : \'—\';',
      'if(pctEl) pctEl.innerText = loadPct + \'%\';']);
    swaps.push([
      'if(hudPctEl) hudPctEl.innerText = _salKnown ? (loadPct + \'%\') : \'—\';',
      'if(hudPctEl) hudPctEl.innerText = loadPct + \'%\';']);
    swaps.push([
      'if(noteEl) noteEl.style.display = _salKnown ? \'none\' : \'\';',
      'if(noteEl) noteEl.style.display = \'none\';']);
    swaps.push([
      'if(_salKnown && monthlyGrossIncome > 0) {',
      'if(monthlyGrossIncome > 0) {']);
  }
  if (REWORD) {
    /* ⚠️ THE SHORT CLAUSE IS NOT UNIQUE AND THE GUARD CAUGHT IT: 'Until then, this figure would be
       a guess.' appears TWICE — the cash-flow diagnostic and String 4 — because the Architect reused
       it verbatim so both read as the same product speaking. Anchor on the WHOLE authored sentence. */
    const from = 'Add your income above and your upkeep load appears here. Until then, this figure would be a guess.';
    const to   = 'Add your income above and your upkeep load appears here. Until then, this figure would be an estimate.';
    const n = src.split(from).length - 1;
    if (n !== 1) { console.log('⛔ --reword ANCHOR MATCHED ' + n + ' TIMES, EXPECTED EXACTLY 1.'); process.exit(1); }
    src = src.split(from).join(to);
  }
  if (RETEAL) {
    swaps.push([
      '            if(!_salKnown) {\n                pctEl.classList.remove(\'healthy\');\n                pctEl.classList.add(\'unstated\');\n                if(hudPctEl) hudPctEl.style.color = "";\n            } else if(loadPct < 50) {',
      '            if(loadPct < 50) {']);
  }
  for (const [from, to] of swaps) {
    const n = src.split(from).length - 1;
    if (n !== 1) {
      console.log('⛔ MUTATION ANCHOR MATCHED ' + n + ' TIMES, EXPECTED EXACTLY 1 — the mutation did not '
        + 'land, so any verdict below would be meaningless.\n    anchor: ' + from.slice(0, 80).replace(/\n/g, ' '));
      process.exit(1);
    }
    src = src.split(from).join(to);
  }
  return src;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));

  const MUTATING = REFAB || RETEAL || REWORD;
  if (MUTATING) {
    /* ⛔ THE PATH COMES FROM THE HELPER, NOT FROM A LITERAL HERE (Phase 0 contract). This gate SERVES
       a mutated page to a real browser, so it needs THE SHELL — and studioSource() is deliberately
       NOT that: it returns shell + extracted parts COMPOSED (measured 2026-09-05: 1,995,647 bytes
       against the shell's 1,584,614). Serving the composed text would inline every part while the
       <script src> tags load them again, double-defining the file's own functions.
       ⇒ There are TWO legitimate reads of the Studio source and the contract names only one:
         ASSERTING ABOUT THE TEXT (studioSource()) and SERVING THE BYTES (the shell). Taking
         STUDIO_PATH from the helper satisfies what the contract is actually protecting — nobody here
         hard-codes where the file lives, so if the shell moves this follows it.
       ⚠️ AND IT IS INVISIBLE TO THAT GATE'S CENSUS, WHICH IS A REPORTED GAP, NOT A LOOPHOLE I CHOSE:
          the matcher needs 'studio.html' and readFileSync on ONE line, so ANY path-in-a-variable read
          passes unseen. Two shipped gates already read the shell this way. Raised for a ruling. */
    const raw = fs.readFileSync(STUDIO_PATH, 'utf8');
    const body = mutate(raw);
    await page.route('**/studio.html', (r) => r.fulfill({ status: 200, contentType: 'text/html', body }));
  }

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#studio-layout', { timeout: 10000 });
  await page.waitForTimeout(400);

  /* Drive the PRODUCT'S OWN PATH: set .value then dispatch a real `input` event so studio.html's own
     `oninput="... calculateUpkeepLoad(); updateAnalysisText();"` runs. Calling the functions directly
     would prove the handler, not the feature (§ direct-call law). */
  const setSalary = (id, v) => page.evaluate(([i, val]) => {
    const el = document.getElementById(i);
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (window.renderLedger) window.renderLedger();
  }, [id, v]);

  const setCoArch = (on) => page.evaluate((flag) => {
    const t = document.getElementById('co-arch-toggle');
    if (!t) return false;
    if (t.checked !== flag) { t.checked = flag; t.dispatchEvent(new Event('change', { bubbles: true })); }
    if (window.calculateUpkeepLoad) window.calculateUpkeepLoad();
    if (window.renderLedger) window.renderLedger();
    return true;
  }, on);

  const read = () => page.evaluate(() => {
    const pct = document.getElementById('upkeep-load-pct');
    const hud = document.getElementById('hud-load-pct');
    const note = document.getElementById('upkeep-load-note');
    const led = document.getElementById('upkeep-ledger');
    return {
      pctText: pct ? pct.innerText.trim() : null,
      pctClass: pct ? pct.className : null,
      hudText: hud ? hud.innerText.trim() : null,
      hudColor: hud ? (hud.style.color || '') : null,
      /* ⚠️ NOT offsetParent. MEASURED 2026-09-05, and it cost a false pass in BOTH directions: the
         Operating Upkeep room is a `studio-section` that is `display:none` until that room is opened,
         so on a cold Studio offsetParent is null NO MATTER WHAT THIS CODE DOES. The suppressed arm
         read "hidden" and FAILED honestly; the positive arm read "hidden" and PASSED VACUOUSLY —
         the same wrong measurement, once visible and once invisible. What this gate owns is the
         note's OWN display decision; which room is on screen belongs to the phase-room gates.
         🔑 A leg that can only be satisfied by another feature's state is measuring that feature. */
      noteOwnDisplay: note ? (note.style.display === 'none' ? 'none' : (getComputedStyle(note).display || '')) : null,
      ledger: led ? led.innerText : '',
      exists: { pct: !!pct, hud: !!hud, note: !!note, led: !!led,
                pri: !!document.getElementById('pri-salary'), co: !!document.getElementById('co-salary') }
    };
  });

  /* ── L0 EXISTENCE — a "does not print X" leg passes trivially when its subject is absent ── */
  const e0 = (await read()).exists;
  ok(e0.pct && e0.hud && e0.note && e0.led && e0.pri && e0.co,
    'L0 EXISTENCE every subject is present — ' + JSON.stringify(e0));

  /* ── L1/L2 SALARY BLANK -> suppressed on every channel ── */
  await setSalary('pri-salary', '');
  await page.evaluate(() => { if (window.calculateUpkeepLoad) window.calculateUpkeepLoad(); if (window.renderLedger) window.renderLedger(); });
  const blank = await read();
  ok(blank.pctText === '—', 'L1a blank salary -> load badge reads an em-dash, not a percentage (got ' + JSON.stringify(blank.pctText) + ')');
  ok(blank.hudText === '—', 'L1b blank salary -> the HUD twin reads an em-dash too (got ' + JSON.stringify(blank.hudText) + ')');
  ok(/\bunstated\b/.test(blank.pctClass || '') && !/\bhealthy\b/.test(blank.pctClass || '') && blank.hudColor === '',
    'L1c COLOUR IS A CLAIM — unknown is muted: .unstated present, .healthy absent, inline colour cleared '
    + '(class=' + JSON.stringify(blank.pctClass) + ' hudColor=' + JSON.stringify(blank.hudColor) + ') [BITE reteal]');
  ok(blank.noteOwnDisplay !== 'none', 'L1d the adjacent explanation is SHOWN (its own display) while the figure is suppressed — got ' + JSON.stringify(blank.noteOwnDisplay));
  ok(blank.ledger.indexOf(RATIO_NOTE) >= 0, 'L2a blank salary -> the ledger ratio row carries the authored note');
  ok(!/Needs \(target 50%\)\s*0%/.test(blank.ledger) && !/Wants \(target 30%\)\s*0%/.test(blank.ledger),
    'L2b blank salary -> Needs/Wants do NOT print a fabricated 0%');

  /* ── L3/L4 POSITIVE ARM — a real salary must bring the real figures BACK ──
     Without this, code that suppresses unconditionally would pass every leg above. */
  await setSalary('pri-salary', '120000');
  const filled = await read();
  ok(/^\d+%$/.test(filled.pctText || ''), 'L3a a stated salary restores a real percentage on the badge (got ' + JSON.stringify(filled.pctText) + ')');
  ok(filled.noteOwnDisplay === 'none', 'L3b the adjacent explanation is HIDDEN once the figure is real — got ' + JSON.stringify(filled.noteOwnDisplay));
  ok(!/\bunstated\b/.test(filled.pctClass || ''), 'L3c .unstated is removed once the figure is real (class=' + JSON.stringify(filled.pctClass) + ')');
  ok(filled.ledger.indexOf(RATIO_NOTE) < 0 && /Needs \(target 50%\)\s*\d+%/.test(filled.ledger),
    'L4 a stated salary restores real Needs/Wants percentages in the ledger');

  /* ── L5 JOINT MODE — the denominator is complete only when BOTH salaries are stated ── */
  await setCoArch(true);
  await setSalary('co-salary', '');
  await page.evaluate(() => { if (window.calculateUpkeepLoad) window.calculateUpkeepLoad(); if (window.renderLedger) window.renderLedger(); });
  const joint = await read();
  ok(joint.pctText === '—' && joint.ledger.indexOf(RATIO_NOTE) >= 0,
    'L5 JOINT with the co-architect salary blank -> still suppressed, because a partial denominator '
    + 'errs toward reassurance (got ' + JSON.stringify(joint.pctText) + ')');

  /* ── L6 ZERO IS AN ANSWER — a typed 0 is a statement, not silence ── */
  await setCoArch(false);
  await setSalary('pri-salary', '0');
  const zero = await read();
  ok(zero.pctText !== '—' && zero.noteOwnDisplay === 'none',
    'L6 a typed 0 is treated as ANSWERED, not as silence — the suppression lifts (got '
    + JSON.stringify(zero.pctText) + ') [a `> 0` guard fails ONLY here]');

  /* ── L8 AUTHORED COPY, VERBATIM (§82.1701) ────────────────────────────────────────────────────
   * Every string below is Architect-authored and the Wirer may not draft, reflow or re-punctuate
   * one. Until this leg existed the gate merely proved a suppression HAPPENED; the actual sentence
   * could have drifted a word at a time with nothing objecting.
   * ⚠️ THIS FILE ONCE DECLARED `const NOTE = ...` AND NEVER USED IT — so it READ as though it
   *    verified the copy while verifying nothing. FALSE ASSURANCE INSIDE AN INSTRUMENT is the exact
   *    disease this cause was spent on. That constant is now consumed here. */
  const AUTHORED = [
    ['ledger Needs/Wants', '— add your income to see this —'],
    ['upkeep-load adjacent', 'Add your income above and your upkeep load appears here. Until then, this figure would be a guess.'],
    ['charity % suppression', '— add your income for the % —'],
    ['construction marker', 'Recorded, not yet modelled.'],
    /* ⛔ THE TAX-BLOCK SECTION NOTE IS REMOVED FROM THE PRODUCT, SO ITS PIN IS REMOVED HERE.
       ~~['tax-block section note', 'Today your Range is driven by the dates, the capital, and the
       tax bracket you set above.']~~ — struck, not deleted, so the removal is auditable.
       CAPTAIN-RULED in Batch 1a. The sentence had become false on its own terms: it says "the tax
       bracket you set ABOVE", and the tax rate now sits BELOW it inside the household band. It was
       pinned here precisely so a corrected sentence could not drift back — and that pin did its job
       right up to the moment the sentence was retired rather than reworded.
       ⚠️ THIS IS A COPY DELETION AND COPY IS THE ARCHITECT'S. It is recorded as the Captain's ruling,
          not as a wiring decision, and it is flagged to the Architect in the same report. If he
          re-authors a replacement, PIN IT HERE AGAIN — an unpinned authored sentence is one nobody
          will notice drifting. */
  ];
  const html = await page.content();
  const drifted = AUTHORED.filter(([, s]) => html.indexOf(s) < 0);
  ok(drifted.length === 0, 'L8 COPY VERBATIM: every authored string appears exactly as authored'
    + (drifted.length ? ' — DRIFTED/ABSENT: ' + drifted.map(([n]) => n).join(', ') : '') + ' [BITE reword]');

  /* ── L9 THE MARKER INVENTORY IS ITSELF A CLAIM (§82.1717) ─────────────────────────────────────
   * "Recorded, not yet modelled." is a CONSTRUCTION MARKER, not product copy: it comes down as each
   * field is proven wired, so THE ABSENCE OF THE NOTE IS AS MUCH A STATEMENT AS ITS PRESENCE.
   * Three fields had theirs removed on PROOF OF A READER (salary ×2 — upkeep load, needs/wants,
   * charity, the 401k match; eff-tax-rate — _taxStated and out.taxMult into the Shape).
   * ⛔ A NOTE RE-APPEARING ON A WIRED FIELD, OR VANISHING FROM AN UNWIRED ONE, IS A FALSE STATUS
   *    CLAIM — and this is the only thing that would notice.
   *
   * ⭐ BATCH 1a — THE LIST FELL FROM SEVEN TO TWO, AND NOT ONE OF THE FIVE WAS WIRED.
   *    ~~['pri-tax-method', 'co-tax-method', 'co-tax-bracket', 'pri-location', 'co-location',
   *      'filing-status', 'co-filing-status']~~ — struck, not deleted, so the shrink is auditable.
   *    Tax rate method (both) was DELETED outright; co-tax-bracket, co-location and
   *    co-filing-status were REPLACED by single household controls, because a joint return has one
   *    combined taxable income and one rate. Five markers came off by SUBTRACTION.
   * ⛔ WHICH IS A DIFFERENT ACT FROM CLEARING A MARKER, AND THE DISTINCTION IS THE WHOLE POINT OF
   *    §82.1717. A marker comes off a SURVIVING field only on proof of a reader. These fields did
   *    not earn their notes' removal — they stopped existing. The two that survive keep their
   *    notes precisely because they are still unread: the engine has no filing-status parameter
   *    and no state-tax model at all. Their notes come off in Batch 2, on proof, or not at all. */
  /* ⭐⭐ eff-tax-rate MOVES BACK TO NOTED (2026-09-06), AND THIS IS L9's OWN DECLARED HOLE FIRING.
     Read the paragraph above: "IT CANNOT CATCH THE LIST BEING WRONG... the half that would notice —
     detecting readers from the code rather than from a list — is NOT built." It has now been built
     and run, and the list was wrong.
     Its marker came off on "proof of a reader" — `_taxStated` and `out.taxMult` into the Shape.
     THAT PROOF WAS REAL AND IT WAS HALF THE QUESTION. Measured by browser census, both household
     modes, positive control passed: eff-tax-rate reaches the SHAPE and DOES NOT REACH THE ENGINE,
     and its typed-entry box reached NOTHING AT ALL.
     ⛔ §82.1872 — A MARKER COMES OFF ONLY WHEN THE FIELD IS FULLY WIRED. Not partway, not "yes
        here but not there". ARRIVAL IS NOT MODELLING: a field that reaches the engine and is then
        ignored by a module constant is still unmodelled, which is why "reaches the engine" was
        rejected as the predicate. The operational test is the ladder — change the field, assert the
        OUTPUT moves.
     🔑 THE MARKER IS SCAFFOLDING, NOT PRODUCT COPY. Its correct maintenance is REMOVAL, and it is
        removed by a measurement, never by a belief that the work is done. */
  const NOTED = ['pri-location', 'filing-status', 'eff-tax-rate'];
  const UNNOTED = ['pri-salary', 'co-salary'];
  const inv = await page.evaluate(([noted, unnoted]) => {
    const has = (id) => { const e = document.getElementById(id); if (!e) return null;
      const f = e.closest('.architect-field'); return f ? !!f.querySelector('.architect-nm-note') : null; };
    const o = { missing: [], unexpected: [], absent: [], total: document.querySelectorAll('.architect-nm-note').length };
    noted.forEach((id) => { const h = has(id); if (h === null) o.absent.push(id); else if (!h) o.missing.push(id); });
    unnoted.forEach((id) => { const h = has(id); if (h === null) o.absent.push(id); else if (h) o.unexpected.push(id); });
    return o;
  }, [NOTED, UNNOTED]);
  /* ⚠️ THE COUNT IS DERIVED, NEVER SPELLED. It read "all ten profile fields" and would have gone
     on reading ten after Batch 1a left five — a label that states a number the code no longer
     computes is a stale fact with a citation, in the one place a reader trusts most. */
  ok(inv.absent.length === 0, 'L9 EXISTENCE: all ' + (NOTED.length + UNNOTED.length)
    + ' profile fields are present to be judged'
    + (inv.absent.length ? ' — MISSING FROM THE DOM: ' + inv.absent.join(', ') : ''));
  /* ⚠️⚠️ DECLARE THE STRENGTH OF THE CLAIM, NOT JUST THE CLAIM (§82.1699). THIS LEG PINS AN
     INVENTORY THAT WAS ASSERTED, NOT A TRUTH THAT WAS MEASURED. The two lists above are HAND-WRITTEN
     from the 2026-09-05 consumption map — they are NOT derived from the world, so this is a
     §82.1671 MIRRORED FIXTURE by construction and it is labelled as one rather than left to read
     like a proof.
     ⇒ IT CATCHES DRIFT FROM THE LIST. IT CANNOT CATCH THE LIST BEING WRONG. If a field gains its
       first reader tomorrow, its marker becomes false and THIS LEG STAYS GREEN, because the lists
       still agree with each other. The half that would notice — detecting readers from the code
       rather than from a list — is NOT built and NOT authorised.
     🔑 A weak check honestly labelled is usable forever; a weak check named like a strong one
        becomes a mirror the moment its author leaves. The report is read once; the name is read
        forever. */
  ok(inv.missing.length === 0 && inv.unexpected.length === 0 && inv.total === NOTED.length,
    'L9 MARKER INVENTORY [pins an ASSERTED list, not a measured truth — catches drift from the list, '
    + 'never the list being wrong]: exactly the ' + NOTED.length + ' unwired fields carry the marker and the '
    + UNNOTED.length + ' proven-wired ones do not (total=' + inv.total + ')'
    + (inv.missing.length ? ' — LOST FROM AN UNWIRED FIELD: ' + inv.missing.join(', ') : '')
    + (inv.unexpected.length ? ' — CLAIMS UNWIRED BUT HAS A READER: ' + inv.unexpected.join(', ') : ''));

  ok(errs.length === 0, 'L7 no page errors — ' + JSON.stringify(errs.slice(0, 2)));

  await browser.close();
  console.log('');
  console.log('SALARY-UNSTATED SUPPRESSION' + (REFAB ? '   [--refab]' : '') + (RETEAL ? '   [--reteal]' : ''));
  console.log('');
  lines.forEach((l) => console.log(l));
  console.log('');
  console.log('  ' + (fail === 0 ? 'GREEN' : 'RED') + '   pass ' + pass + ' / fail ' + fail);
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED'));
  console.log('');
  process.exit(fail === 0 ? 0 : 1);
/* ⛔ §82.1880 — A GATE THAT CANNOT RUN MUST NOT SAY "RED".
 * A red means "I measured, and the product is wrong." A missing dependency means "I MEASURED
 * NOTHING." Collapsing those into one word is how a standing red becomes background noise, and it
 * cost a whole commit to clear the last one. This gate needs the repo served on 127.0.0.1:8001 —
 * the suite runner starts it; run the gate by hand without one and every leg is unreachable.
 * ⚠️ THE EXIT CODE STILL SAYS FAILURE, ON PURPOSE, AND THE RUNNER STILL SCORES IT RED. That is not
 *    a half-measure, it is the runner's own documented law: "exit 1 STAYS RED, always... NOT
 *    reclassifiable without reading the reason, which is a human's job. Only reclassify what is
 *    PROVABLY not a verdict." A connection refusal is not provably a dead harness — the product
 *    could equally have failed to serve. So the classifier is left alone and THE MESSAGE is fixed:
 *    exit 2 rather than 1 to mark it distinct, and a verdict line a human cannot misread.
 * 🔑 THE FIX IS TO THE SENTENCE, NOT THE SCORE. A conservative score with an honest reason beats a
 *    generous score with a guess behind it. */
})().catch((e) => {
  const msg = String((e && e.message) || e);
  /* Regex INLINED, not hoisted to a const: the first draft declared it inside the async IIFE
     while this callback lives outside it — valid syntax, ReferenceError at runtime, and reachable
     ONLY on the error path this block exists to serve. A guard that throws when it fires is worse
     than no guard. */
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED|net::ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE/.test(msg)) {
    console.log('⛔ MISSING PRECONDITION — nothing is serving http://127.0.0.1:8001');
    console.log('   This gate MEASURED NOTHING. It is not a product failure and it is not a red.');
    console.log('   The suite runner starts that server automatically; running this gate standalone does not.');
    console.log('OVERALL: MISSING PRECONDITION   (0 legs evaluated)');
    process.exit(2);
  }
  console.log('⛔ GATE THREW: ' + msg);
  console.log('OVERALL: RED');
  process.exit(1);
});
