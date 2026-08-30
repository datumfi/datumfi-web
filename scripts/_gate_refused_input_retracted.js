/* @gate-pool: browser */
/* ══ FINDING 51 — A REFUSED INPUT MUST NOT LEAVE ITS DERIVATIONS BEHIND ═════════════════════════
 *
 * ⛔⛔ WHAT SHIPPED, CAPTAIN-FOUND ON PRODUCTION BY TYPING SOMETHING NOBODY ASKED HIM TO TYPE.
 * Enter a FUTURE date of birth — 03/2057. `pri-dob` fires `_updatePlanEndAge()` on `oninput`, so
 * every keystroke derives through the plan-through mirror UNVALIDATED and writes 2057 + 93 =
 * "03 / 2150" into the Profile. `onblur` then validates, REFUSES the age, clears the DOB and shows
 * the correct message — and the derived date STAYED ON SCREEN. An impossible year, in a profile
 * field, computed from data the product had just refused.
 * 🔑 A VALUE DERIVED FROM UNVALIDATED INPUT IS ITSELF UNVALIDATED. IF THE INPUT IS LATER REFUSED,
 *    EVERYTHING DERIVED FROM IT MUST BE RETRACTED IN THE SAME BREATH.
 * ⚠️ "VALIDATE ON BLUR, DERIVE ON INPUT" GUARANTEES THIS BY CONSTRUCTION — the derivation always
 *    wins the race, so the retraction must be explicit or it never happens. Third defect of the day
 *    whose shape is "two handlers, and the one that runs first wins".
 *
 * ⭐ THE CAUSE WAS ONE WORD. _mirrorPlanEnd's L47 guard `return`ed without writing when there was no
 * sourced DOB. That is correct for a COLD field — leaving it alone leaves it blank — and it is
 * exactly wrong for a field already holding a value derived from a DOB that has since been refused:
 * "leave it alone" then PRESERVES THE LIE. With no sourced DOB the honest render is BLANK.
 * ⛔ NOT A NEW BEHAVIOUR: _p8_studio_mechanics already asserts "plan-end-age is BLANK with no
 *    sourced DOB". The fix makes that true BY CONSTRUCTION instead of by whatever the fixture
 *    happened to leave behind. The correct behaviour was already shipped one state away.
 *
 * ⛔ THE PROPERTY, NOT THE LITERAL: L2 asserts NO DERIVED DATE REMAINS — never "2150 is absent".
 *    And it refuses through TWO DIFFERENT INVALID SHAPES (a future birth date, and an age out of
 *    range the other way), because ONE REJECTION PATH IS A LITERAL IN DISGUISE.
 *
 * Usage: node scripts/_gate_refused_input_retracted.js [--leave-alone|--skip-retraction|--never-mirror]
 *   --leave-alone     restores the bare `return` in the mirror  -> REDS ALL FOUR L2 legs
 *   --skip-retraction removes the DIRECT mirror call on refusal -> REDS THE NO-RETIREMENT-DATE
 *                     legs only (L2a, L22a) — the exact defect that survived the first fix
 *   --never-mirror    the mirror never writes at all            -> REDS L1 + L3 ONLY
 * THREE controls. --leave-alone and --skip-retraction are the TWO HALVES OF THE FIX and are
 * separable by construction: the first kills the clear itself (all four L2 legs), the second kills
 * only the unconditional call (the two NO-retirement-date legs). A single control could not tell
 * them apart, which is precisely how the first version of this gate shipped a live defect.
 * --never-mirror exists so L3 is provably able to fail: a fix of the form "never write anything"
 * would satisfy every L2 leg and silently destroy the feature.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8573; const BASE = 'http://127.0.0.1:' + PORT;

const LEAVE = process.argv.includes('--leave-alone');
const NEVER = process.argv.includes('--never-mirror');
const SKIP  = process.argv.includes('--skip-retraction');

/* ⛔⛔ THE SECOND CONTROL EXISTS BECAUSE THE FIRST VERSION OF THIS GATE PASSED OVER A LIVE DEFECT.
   It typed a Target Retirement Date first "so the derivation would work" — and _updatePlanEndAge
   RETURNS EARLY without one, so that setup was the ONLY reason the retraction ran at all. With no
   retirement date the clear was never reached and the impossible date survived on production, which
   is where the Captain found it AFTER the fix shipped.
   🔑 A FIXTURE THAT ESTABLISHES PRECONDITIONS CAN SELECT A DIFFERENT CODE PATH THAN THE USER'S.
   So every refusal below is now run TWICE — with and without a retirement date — and the two halves
   of the fix have SEPARATE controls, because a single control could not tell them apart. */
const A_DIRECT = "        if (window._mirrorPlanEnd) window._mirrorPlanEnd();\n        _updatePlanEndAge();";
const B_DIRECT = "        _updatePlanEndAge();";

const A_GUARD = "if (!_dobEl || !/\\d{1,2}\\s*\\/\\s*\\d{4}/.test(String(_dobEl.value || ''))) {\n        if (pEl.value) pEl.value = '';\n        return;\n      }";
const B_GUARD = "if (!_dobEl || !/\\d{1,2}\\s*\\/\\s*\\d{4}/.test(String(_dobEl.value || ''))) return;";
const A_MIRROR = "function _mirrorPlanEnd() {\n      var pEl = $('plan-end-age');\n      if (!pEl) return;";
const B_MIRROR = "function _mirrorPlanEnd() {\n      var pEl = $('plan-end-age');\n      if (!pEl) return;\n      if (pEl) return;";

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

function mutate(src, a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + label + ': expected exactly 1, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(a, b);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (/studio\.html$/.test(p) && (LEAVE || NEVER || SKIP)) {
    let s = body.toString('utf8');
    if (LEAVE) s = mutate(s, A_GUARD, B_GUARD, 'A_GUARD');
    if (NEVER) s = mutate(s, A_MIRROR, B_MIRROR, 'A_MIRROR');
    if (SKIP)  s = mutate(s, A_DIRECT, B_DIRECT, 'A_DIRECT');
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('[RUN] A REFUSED INPUT LEAVES NOTHING BEHIND'
    + (LEAVE ? '   [MUTATED --leave-alone]' : NEVER ? '   [MUTATED --never-mirror]'
       : SKIP ? '   [MUTATED --skip-retraction]' : ''));

  async function fresh() {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
    await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
    await page.waitForSelector('.sl-phase', { state: 'visible', timeout: 30000 });
    await page.click('.sl-phase');
    await page.waitForSelector('#pri-dob', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);
    return { ctx, page };
  }
  /* ⛔ REAL UI ONLY — click, keystrokes, Tab. The defect lives in the ORDER of `oninput` against
     `onblur`; a gate that set .value and called the handler would never see it. */
  const type = async (page, sel, v) => {
    await page.click(sel); await page.keyboard.press('Control+A');
    await page.type(sel, v, { delay: 20 }); await page.keyboard.press('Tab');
    await page.waitForTimeout(800);
  };
  const read = (page) => page.evaluate(() => {
    const w = document.getElementById('pri-dob-warn');
    return { dob: document.getElementById('pri-dob').value,
             plan: document.getElementById('plan-end-age').value,
             warn: ((w || {}).textContent || '').trim(),
             warnDisp: w ? getComputedStyle(w).display : 'MISSING' };
  });

  /* ── L1 · THERE IS SOMETHING TO RETRACT ──────────────────────────────────────────────────────
     ⛔ WITHOUT THIS THE WHOLE GATE IS VACUOUS. If a valid DOB produced no mirrored date, then
     "no derived date remains after a refusal" would be trivially true and would stay true over a
     product that had stopped deriving entirely. */
  { const { ctx, page } = await fresh();
    const cold = await read(page);
    await type(page, '#pri-dob', '03/1985');
    const good = await read(page);
    ok(cold.plan === '' && /^\d{2}\s*\/\s*\d{4}$/.test(good.plan),
      'L1 · A VALID DOB PRODUCES A MIRRORED PLAN-THROUGH DATE, so there is something a refusal '
      + 'could wrongly leave behind [observed cold "' + cold.plan + '" -> "' + good.plan + '"]');
    await ctx.close(); }

  /* ── L2a / L2b · TWO DIFFERENT REFUSALS, SAME PROPERTY ───────────────────────────────────────
     ⛔ NO PRIOR GOOD DOB IS SEEDED, AND THAT IS THE WHOLE FIXTURE. The first version of this leg
     seeded 03/1985 first "so the refusal had something to retract" — and it FAILED against a
     CORRECT product. _enforceProfileDate REVERTS-OR-CLEARS: with a prior good value it reverts to
     it, and the derived date then rightly matches the restored DOB. Seeding changed the behaviour
     under test from CLEAR to REVERT and would have reported a defect that does not exist.
     🔑 THE RETRACTION TARGET IS CREATED BY THE BAD INPUT ITSELF: `oninput` derives from the
        half-typed future year before `onblur` ever refuses it, so the stale date exists precisely
        in the case where there is no good value to fall back to. That is the Captain's case. */
  for (const [shape, bad] of [['FUTURE birth date', '03/2057'],
                              ['an age far over the limit', '03/1900']]) {
    for (const [where, withRet, tag] of [['NO retirement date', false, 'a'],
                                         ['with a retirement date', true, 'b']]) {
      const leg = 'L2' + (shape[0] === 'F' ? '' : '2') + tag;
      const { ctx, page } = await fresh();
      if (withRet) await type(page, '#target-ret', '03/2050');
      await type(page, '#pri-dob', bad);
      const after = await read(page);
      ok(after.dob === '' && after.plan === '' && after.warn !== '' && after.warnDisp !== 'none',
        leg + ' · REFUSED (' + shape + ', ' + where + ') LEAVES NO DERIVED DATE, AND STILL EXPLAINS '
        + 'ITSELF [observed dob "' + after.dob + '", plan "' + after.plan + '", warn "'
        + after.warn.slice(0, 40) + '" (' + after.warnDisp + ')]');
      await ctx.close();
    }
  }

  /* ── L3 · THE HONEST HALF SURVIVES ───────────────────────────────────────────────────────────
     A fix of the form "never write anything" passes every leg above and destroys the feature. */
  { const { ctx, page } = await fresh();
    await type(page, '#pri-dob', '03/1985');
    const a = await read(page);
    await type(page, '#pri-dob', '07/1990');
    const b = await read(page);
    ok(/^\d{2}\s*\/\s*\d{4}$/.test(a.plan) && /^\d{2}\s*\/\s*\d{4}$/.test(b.plan) && a.plan !== b.plan,
      'L3 · A VALID DOB STILL MIRRORS, AND RE-MIRRORS WHEN IT CHANGES [observed "' + a.plan
      + '" -> "' + b.plan + '"] — retracting on refusal must not become never writing at all');
    await ctx.close(); }

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
