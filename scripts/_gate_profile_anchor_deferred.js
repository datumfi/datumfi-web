'use strict';
/* _gate_profile_anchor_deferred.js — STANDING GATE for FINDING 54.
 *
 * THE CLAIM: a Profile Target-Retirement field is judged ONLY against an anchor date of birth
 * that the user actually supplied. With no anchor there is no impossible value, so a well-formed
 * date is ACCEPTED IN SILENCE — and when the anchor later arrives the deferred judgement is made,
 * NAMING any conflict without erasing either fact the user gave us.
 *
 * WHY THIS GATE EXISTS (measured 2026-08-30, four arms, before a line was changed):
 *   _profileDobAnchor fell back to { mo: 1, yr: thisYear - PRIMARY slider-age, age: slider-age }.
 *   - co-ret "06 / 2030" with no co-dob was REJECTED AND ERASED at primary slider-age 40, and
 *     ACCEPTED at 60. Nothing about the co-architect differed. The CO-ARCHITECT WAS BEING JUDGED
 *     AS THE PRIMARY.
 *   - co-ret "06 / 2031" was ACCEPTED with co-dob EMPTY and REJECTED AND ERASED once the
 *     co-architect's TRUE December birth month was supplied. THE FABRICATED JANUARY WAS STRICTLY
 *     MORE PERMISSIVE THAN REALITY, so telling the truth cost the user their typed date.
 *
 * ⛔ EVERY LEG DRIVES THE REAL UI — focus / input / change / blur — and PRINTS WHAT IT OBSERVED.
 *    A direct call to a validator would prove the validator and nothing about the feature.
 * ⛔ NO LEG ASSERTS A LITERAL FROM THE SOURCE. L3 and L9 assert a RELATIONSHIP (the outcome does
 *    not move when the OTHER person's age slider moves), which cannot be satisfied by pinning a
 *    number and cannot go stale when a bound changes.
 *
 * PREDICTED ON UNFIXED BYTES: L1 L2 L3 L4 L5 L9 RED · L6 L7 L8 GREEN.
 *    The three greens are the HONEST HALF — they guard behaviour the fix must NOT remove, so a
 *    "just stop validating" amputation cannot pass this gate.
 *
 * Run: node scripts/_gate_profile_anchor_deferred.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const blockClerk = (ctx) => ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
  return route.continue();
});

let fails = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (!ok) fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

const Y = new Date().getFullYear();
// The authored conflict copy (§82.855). Wired VERBATIM; {age} is the age the product itself
// returned for the date, so the sentence and the decision cannot disagree.
const COPY_PRIMARY = (age) => 'With your date of birth in, this retirement date puts you at ' + age + '. Retirement needs to land between 45 and 90 — adjust either one.';
const COPY_CO = (age) => 'With their date of birth in, this retirement date puts them at ' + age + '. Retirement needs to land between 45 and 90 — adjust either one.';

const edit = (page, id, text) => page.evaluate(function (a) {
  const el = document.getElementById(a[0]); if (!el) return null;
  el.focus();
  el.value = a[1];
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return el.value;
}, [id, text]);

const look = (page, id, warnId) => page.evaluate(function (a) {
  const el = document.getElementById(a[0]);
  const w = a[1] ? document.getElementById(a[1]) : null;
  return {
    value: el ? el.value : '(absent)',
    warnShown: w ? w.style.display === 'block' : false,
    warnText: w ? (w.textContent || '') : ''
  };
}, [id, warnId]);

/* FIXTURE, stated in full (seeded-fixture law): fresh page -> the entry overlay's
   "Start from Scratch" -> _studioEnterRoom('data'). For co-architect legs the toggle is
   checked with a REAL change event and NOTHING IS FORCED VISIBLE — measured 2026-08-30, the
   toggle's own handler reveals the fields, so a display:block fixture step would be an
   untested assumption about the product wearing the clothes of setup. */
async function boot(ctx, BASE, opts) {
  const o = opts || {};
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(500);
  if (o.co) {
    const revealed = await page.evaluate(() => {
      const t = document.getElementById('co-arch-toggle');
      if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      const f = document.getElementById('co-arch-fields');
      return f ? getComputedStyle(f).display !== 'none' : false;
    });
    await page.waitForTimeout(250);
    if (!revealed) { check('FIXTURE: co-arch fields revealed by the toggle handler', false, 'they were NOT — the gate would be driving hidden fields'); }
  }
  if (o.sliderAge) {
    await page.evaluate((v) => {
      const s = document.getElementById('slider-age');
      s.value = String(v);
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
    }, o.sliderAge);
    await page.waitForTimeout(450);
  }
  return page;
}

(async () => {
  await new Promise((r) => server.listen(8161, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8161';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await blockClerk(ctx);

  // A date that is well-formed and OUT of the window any manufactured anchor would impose.
  const EARLY = '06 / ' + (Y - 40 + 44);   // 2030 when Y = 2026

  // ── L1 — primary: no anchor DOB, a well-formed retirement date is RETAINED, silently.
  {
    const p = await boot(ctx, BASE);
    await edit(p, 'target-ret', EARLY); await p.waitForTimeout(300);
    const r = await look(p, 'target-ret', 'ret-date-warn');
    check('L1 target-ret with NO pri-dob: well-formed date is RETAINED and no warning is shown',
      r.value.replace(/\s/g, '') === EARLY.replace(/\s/g, '') && !r.warnShown,
      'value=' + JSON.stringify(r.value) + ' warnShown=' + r.warnShown + ' warn=' + JSON.stringify(r.warnText));
    await p.close();
  }

  // ── L2 — co-architect: same claim, the half where a fabricated fact is about ANOTHER PERSON.
  {
    const p = await boot(ctx, BASE, { co: true });
    await edit(p, 'co-ret', EARLY); await p.waitForTimeout(300);
    const r = await look(p, 'co-ret', 'co-ret-warn');
    check('L2 co-ret with NO co-dob: well-formed date is RETAINED and no warning is shown',
      r.value.replace(/\s/g, '') === EARLY.replace(/\s/g, '') && !r.warnShown,
      'value=' + JSON.stringify(r.value) + ' warnShown=' + r.warnShown + ' warn=' + JSON.stringify(r.warnText));
    await p.close();
  }

  // ── L3 — THE RELATIONSHIP: the co-architect's outcome must not move when the PRIMARY's age
  //         slider moves. Asserts independence, not a bound. This is the leg F54 was invisible to.
  {
    const pA = await boot(ctx, BASE, { co: true, sliderAge: 40 });
    await edit(pA, 'co-ret', EARLY); await pA.waitForTimeout(300);
    const a = await look(pA, 'co-ret', 'co-ret-warn'); await pA.close();
    const pB = await boot(ctx, BASE, { co: true, sliderAge: 60 });
    await edit(pB, 'co-ret', EARLY); await pB.waitForTimeout(300);
    const b = await look(pB, 'co-ret', 'co-ret-warn'); await pB.close();
    check('L3 co-ret outcome is INDEPENDENT of the PRIMARY age slider (40 vs 60, co-dob empty both)',
      a.value === b.value && a.warnShown === b.warnShown,
      'at40 -> value=' + JSON.stringify(a.value) + ' warn=' + a.warnShown +
      '   |   at60 -> value=' + JSON.stringify(b.value) + ' warn=' + b.warnShown);
  }

  // ── L9 — the same relationship on the PRIMARY's own field (four-field coverage).
  {
    const pA = await boot(ctx, BASE, { sliderAge: 40 });
    await edit(pA, 'target-ret', EARLY); await pA.waitForTimeout(300);
    const a = await look(pA, 'target-ret', 'ret-date-warn'); await pA.close();
    const pB = await boot(ctx, BASE, { sliderAge: 60 });
    await edit(pB, 'target-ret', EARLY); await pB.waitForTimeout(300);
    const b = await look(pB, 'target-ret', 'ret-date-warn'); await pB.close();
    check('L9 target-ret outcome is INDEPENDENT of the age slider (40 vs 60, pri-dob empty both)',
      a.value === b.value && a.warnShown === b.warnShown,
      'at40 -> value=' + JSON.stringify(a.value) + ' warn=' + a.warnShown +
      '   |   at60 -> value=' + JSON.stringify(b.value) + ' warn=' + b.warnShown);
  }

  // ── L4 — DEFERRED IS NOT ABANDONED (co). Accept with no anchor, then supply the TRUE DOB that
  //         makes it impossible: the conflict is NAMED and NEITHER value is erased.
  {
    const p = await boot(ctx, BASE, { co: true });
    const RET = '06 / ' + (Y - 40 + 45);          // 2031 — accepted under a January anchor
    const DOB = '12 / ' + (Y - 40);               // a REAL December birth month
    await edit(p, 'co-ret', RET); await p.waitForTimeout(300);
    const mid = await look(p, 'co-ret', 'co-ret-warn');
    await edit(p, 'co-dob', DOB); await p.waitForTimeout(400);
    const r = await look(p, 'co-ret', 'co-ret-warn');
    const d = await look(p, 'co-dob', 'co-dob-warn');
    const expected = COPY_CO(Y - 40 + 45 - (Y - 40) - 1);   // ageAtDate: 45 - 1 (June precedes December)
    /* SPLIT DELIBERATELY INTO 4a/4b. As one leg, "the conflict is named" and "neither value is
       erased" fail together, so the control that removes the re-judgement and the control that
       makes it erase would red the SAME leg — two mutations reddening one leg is one instrument
       wearing two names. Split, their red sets are disjoint and each proves its own property. */
    check('L4a co: the conflict revealed by the arriving DOB is NAMED, in the authored copy',
      r.warnShown && r.warnText.trim() === expected,
      'accepted-first=' + JSON.stringify(mid.value) +
      '\n          warnShown=' + r.warnShown + '\n          warn    =' + JSON.stringify(r.warnText.trim()) +
      '\n          expected=' + JSON.stringify(expected));
    check('L4b co: NEITHER value is erased by that conflict',
      r.value.replace(/\s/g, '') === RET.replace(/\s/g, '') &&
      d.value.replace(/\s/g, '') === DOB.replace(/\s/g, ''),
      'co-ret after DOB=' + JSON.stringify(r.value) + '  co-dob after=' + JSON.stringify(d.value));
    await p.close();
  }

  // ── L5 — the same, on the PRIMARY, with the second-person copy.
  {
    const p = await boot(ctx, BASE);
    const RET = '06 / ' + (Y - 40 + 45);
    const DOB = '12 / ' + (Y - 40);
    await edit(p, 'target-ret', RET); await p.waitForTimeout(300);
    await edit(p, 'pri-dob', DOB); await p.waitForTimeout(450);
    const r = await look(p, 'target-ret', 'ret-date-warn');
    const d = await look(p, 'pri-dob', 'pri-dob-warn');
    const expected = COPY_PRIMARY(Y - 40 + 45 - (Y - 40) - 1);
    check('L5a primary: the conflict is NAMED, in the second person, in the authored copy',
      r.warnShown && r.warnText.trim() === expected,
      'warnShown=' + r.warnShown + '\n          warn    =' + JSON.stringify(r.warnText.trim()) +
      '\n          expected=' + JSON.stringify(expected));
    check('L5b primary: NEITHER value is erased by that conflict',
      r.value.replace(/\s/g, '') === RET.replace(/\s/g, '') &&
      d.value.replace(/\s/g, '') === DOB.replace(/\s/g, ''),
      'target-ret after DOB=' + JSON.stringify(r.value) + '  pri-dob after=' + JSON.stringify(d.value));
    await p.close();
  }

  /* ── L6 / L7 / L8 — THE HONEST HALF. These are GREEN BEFORE AND AFTER. A leg that only turns
     green with the fix might be measuring the fix; a leg green both times is guarding something
     the fix must not break. Without them, deleting the range check outright would pass. */

  // ── L6 — a re-judgement that finds NO conflict must stay SILENT (no spurious warning).
  {
    const p = await boot(ctx, BASE, { co: true });
    const RET = '06 / ' + (Y - 40 + 64);          // comfortably inside any real window
    const DOB = '06 / ' + (Y - 40);
    await edit(p, 'co-ret', RET); await p.waitForTimeout(300);
    await edit(p, 'co-dob', DOB); await p.waitForTimeout(400);
    const r = await look(p, 'co-ret', 'co-ret-warn');
    check('L6 HONEST HALF: an arriving DOB that CONFIRMS the date raises no warning',
      !r.warnShown && r.value.replace(/\s/g, '') === RET.replace(/\s/g, ''),
      'value=' + JSON.stringify(r.value) + ' warnShown=' + r.warnShown + ' warn=' + JSON.stringify(r.warnText));
    await p.close();
  }

  // ── L7 — AMPUTATION GUARD: with a real anchor present, an impossible date is STILL refused.
  {
    const p = await boot(ctx, BASE, { co: true });
    const DOB = '12 / ' + (Y - 40);
    const BAD = '06 / ' + (Y - 40 + 45);          // age 44 against a real December DOB -> below 45
    await edit(p, 'co-dob', DOB); await p.waitForTimeout(350);
    await edit(p, 'co-ret', BAD); await p.waitForTimeout(350);
    const r = await look(p, 'co-ret', 'co-ret-warn');
    check('L7 HONEST HALF: with a REAL anchor DOB, an out-of-range date is still REFUSED',
      r.warnShown && r.value.trim() === '',
      'value=' + JSON.stringify(r.value) + ' warnShown=' + r.warnShown + ' warn=' + JSON.stringify(r.warnText));
    await p.close();
  }

  // ── L8 — AMPUTATION GUARD: malformed input is refused even with NO anchor (the one thing that
  //         is impossible regardless of who the person is).
  {
    const p = await boot(ctx, BASE, { co: true });
    await edit(p, 'co-ret', '06 / 20'); await p.waitForTimeout(350);
    const r = await look(p, 'co-ret', 'co-ret-warn');
    check('L8 HONEST HALF: a MALFORMED date is refused with no anchor present',
      r.warnShown && r.value.trim() === '',
      'value=' + JSON.stringify(r.value) + ' warnShown=' + r.warnShown + ' warn=' + JSON.stringify(r.warnText));
    await p.close();
  }

  await ctx.close(); await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nPROFILE ANCHOR DEFERRED (F54): GREEN' : '\nPROFILE ANCHOR DEFERRED (F54): ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  /* TRAP-AND-REPORT-PARTIAL. A mid-run throw would otherwise discard every check that already
     ran: the exit code would be honestly 1, but with no output a real failure is
     indistinguishable from an environment error. The INCOMPLETE line is the load-bearing half —
     a flushed partial with no marker reads as a COMPLETE pass. */
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
