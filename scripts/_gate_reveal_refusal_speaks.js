'use strict';
/* _gate_reveal_refusal_speaks.js — STANDING GATE (FINDING 72)
 *
 * THE INVARIANT:
 *
 *      A REFUSAL MUST SAY WHY, IN ONE VOICE, AND STAY UNTIL THE CONDITION CHANGES.
 *
 * WHAT WAS WRONG. REVEAL YOUR RANGE had three ways to refuse and only ONE of them spoke.
 *   1. no funded account   -> #reveal-zero-error, a red line that ERASED ITSELF AFTER 4s
 *   2. an unreadable date  -> NOTHING. `buildStudioRequest()` returned null and the handler ran
 *                             `resetOverlayState(); return;`
 *   3. invalid custom weights -> #c-weight-error, a different element, also 4s
 *
 * ⛔⛔ AND THE REASON FOR (2) EXISTED THE WHOLE TIME. buildStudioRequest writes the cause into
 *    `window._buildRequestError` (:14306) — and the SS MATRIX READS THAT EXACT GLOBAL AT :17537 AND
 *    RENDERS IT PROPERLY, title and all. The same failure had a voice on one screen and was mute on
 *    the other.
 *    🔑 A DERIVATION LIVING ONLY IN THE ONE CALLER THAT WENT THROUGH IT. Third instance this arc
 *       (F67 was the first; the Range and the SS Matrix described different families on one screen).
 *
 * MEASURED 2026-09-02, the Captain's own path: with an account funded and the profile empty, the
 * button was clicked and NOTHING happened — no overlay, no message, no navigation — while
 *      window._buildRequestError      === "Enter Date of Birth as MM / YYYY."
 *      window._buildRequestErrorField === "Date of Birth"
 * sat in memory, unread. He had done exactly what the ONE working message asked of him.
 *
 * ⚖️ RULED: parity with the SS area — the same BUILDER, never the same instance. #ss-map-status
 *    lives in sec-income-layer (UNCERTAINTY); the reveal button lives in sec-climate (MEASUREMENT).
 *    Rendering Measurement's refusal into Uncertainty's room puts the answer in a room the user is
 *    not standing in. And parity includes PERSISTENCE: the 4s timers go.
 *    🔑 AN ERROR THAT ERASES ITSELF IS THE SAME DEFECT ON A SHORTER CLOCK — the user looks back and
 *       the reason is gone, so the button refused and said nothing. Again.
 *    ⭐ ZERO NEW COPY. Every string and every title already ships: the field-name-or-'Input Error'
 *       title mapping is lifted verbatim from :17537.
 *
 * ── LEGS ─────────────────────────────────────────────────────────────────────────────────────
 *   S1 · no funded account      -> the box speaks
 *   S2 · THE INVARIANT — funded account, unreadable date -> the box shows _buildRequestError
 *        VERBATIM.  ⭐ RED ON PRE-FIX BYTES: this is the silent refusal.
 *   S3 · invalid custom weights -> routed through the SAME global and the SAME box
 *   S4 · PERSISTENCE — still on screen well after the old 4s timer would have erased it
 *   S5 · CLEARED BY ACTION — supply what was missing and the refusal goes
 *        ⛔ THE PARTNER OF S4. Without it, "never clears" passes S4 perfectly and is a worse bug.
 *   S6 · ONE VOICE — one status host serves all three reasons (structural)
 *   S7 · NO DUPLICATE id — the shared builder must not emit `id="ss-map-poll-sub"` twice
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_reveal_refusal_speaks.js            (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8585;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webp': 'image/webp' };

const CENSUS_SRC = studioSource();
let fails = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (!ok) fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '   [' + detail + ']' : ''));
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, ''));
  if (!full.startsWith(path.normalize(ROOT))) { res.writeHead(403).end(); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

const INIT = "(function(){ window.Clerk = { load:function(){return Promise.resolve();}," +
  " user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} }; })();";
const blockNet = (ctx) => ctx.route('**/*', (r) => {
  const u = r.request().url();
  if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon|sentry/i.test(u)) return r.abort();
  return r.continue();
});

async function open(page) {
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  try { if (await page.locator('#studioCloseIntro').isVisible({ timeout: 2000 })) { await page.click('#studioCloseIntro'); await page.waitForTimeout(400); } } catch (_e) {}
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('measurement'));
  await page.waitForTimeout(500);
}
const fundRoom = (page) => page.evaluate(() => {
  window.addInstance('taxable');
  var a = state.accounts[state.accounts.length - 1]; a.value = 1000000;
  if (typeof renderInputs === 'function') renderInputs();
  return state.accounts.filter((x) => (x.value || 0) > 0).length;
});
/* WHAT THE USER CAN ACTUALLY SEE. Not "an element exists" — a visible box with text in it. */
const spoken = (page) => page.evaluate(() => {
  const hosts = ['reveal-status', 'reveal-zero-error', 'c-weight-error']
    .map((id) => document.getElementById(id)).filter(Boolean);
  const vis = hosts.filter((e) => getComputedStyle(e).display !== 'none' && (e.textContent || '').trim());
  return {
    visibleCount: vis.length,
    ids: vis.map((e) => e.id).join(','),
    text: vis.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).join(' | '),
    buildErr: window._buildRequestError, buildErrField: window._buildRequestErrorField,
    url: location.pathname
  };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  /* S1 — no funded account */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    await pg.click('.action-btn'); await pg.waitForTimeout(800);
    const s = await spoken(pg);
    console.log('S1 ' + JSON.stringify(s));
    check('S1 no funded account: the refusal is visible and has text', s.visibleCount >= 1, s.ids + ' :: ' + s.text.slice(0, 90));

    /* ⛔ S4 LIVES HERE, NOT ON S2'S FIXTURE, AND THAT PLACEMENT IS THE WHOLE POINT.
       Measured first on S2 (the silent refusal), S4 went red because NOTHING EVER APPEARED — it
       could not tell "erased itself after 4s" from "never showed at all", so its red was inherited
       from S2 rather than evidence about a clock.
       🔑 A LEG MUST FAIL FOR ITS OWN REASON. S1 is the one refusal that DOES speak on pre-fix
          bytes, so it is the only fixture where a persistence claim can be tested independently.
       The old timer erased at 4000ms; 6s is comfortably past it. */
    check('S4 precondition — something was visible to persist (else this leg proves nothing)', s.visibleCount >= 1, 'visible=' + s.visibleCount);
    await pg.waitForTimeout(6000);
    const s4 = await spoken(pg);
    console.log('S4 after 6s ' + JSON.stringify({ visibleCount: s4.visibleCount, ids: s4.ids }));
    check('S4 PERSISTENCE — still on screen 6s later (no self-erasing clock)', s4.visibleCount >= 1,
      'visible=' + s4.visibleCount + ' (0 means a timer erased it)');

    /* S5 — THE PARTNER OF S4, AND IT NEEDS ITS OWN PRECONDITION FOR THE SAME REASON S4 DID.
       On pre-fix bytes S5 PASSED — but only because the 4s timer had already erased the message
       during S4's wait. "It cleared" was true and meant nothing: nothing cleared it, it expired.
       🔑 A LEG THAT PASSES FOR THE WRONG REASON IS NOT A PASS, IT IS A COINCIDENCE. Asserting that
          something is still on screen at the moment of the action turns that hollow green into an
          honest red on pre-fix bytes — this leg CANNOT run until the timer is gone. */
    const s5pre = await spoken(pg);
    check('S5 precondition — a refusal is on screen at the moment of the action', s5pre.visibleCount >= 1,
      'visible=' + s5pre.visibleCount + ' (0 = a clock cleared it, so nothing here tests the ACTION)');
    await pg.evaluate(() => window._studioEnterRoom('architecture'));
    await pg.waitForTimeout(300);
    await fundRoom(pg);
    await pg.evaluate(() => window._studioEnterRoom('measurement'));
    await pg.waitForTimeout(900);
    const s5 = await spoken(pg);
    console.log('S5 after funding a room ' + JSON.stringify({ visibleCount: s5.visibleCount, ids: s5.ids }));
    check('S5 CLEARED BY ACTION — the refusal goes once the condition is met', s5.visibleCount === 0,
      'still visible: ' + (s5.ids || 'none'));
    await ctx.close();
  }

  /* S2 — THE INVARIANT, and S4/S5 ride the same fixture */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const funded = await fundRoom(pg);
    check('S2 fixture funded a room (a refusal over an empty estate is a DIFFERENT refusal)', funded > 0, 'funded=' + funded);
    await pg.evaluate(() => window._studioEnterRoom('measurement'));
    await pg.waitForTimeout(400);
    await pg.click('.action-btn'); await pg.waitForTimeout(1200);
    const s = await spoken(pg);
    console.log('S2 ' + JSON.stringify(s));
    check('S2 fixture actually produced a build error to report', !!s.buildErr, String(s.buildErr));
    check('S2 THE INVARIANT — the refusal is on screen', s.visibleCount >= 1, s.ids || 'NOTHING VISIBLE');
    check('S2 and it states the reason VERBATIM', !!(s.buildErr && s.text.indexOf(s.buildErr) !== -1),
      'looking for "' + String(s.buildErr) + '" in "' + s.text.slice(0, 110) + '"');

    await ctx.close();
  }

  /* S3 — custom-matrix weights routed through the SAME global */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    await fundRoom(pg);
    await pg.evaluate(() => window._studioEnterRoom('data'));
    await pg.waitForTimeout(300);
    await pg.fill('#pri-dob', '08/1982'); await pg.fill('#target-ret', '03/2035');
    await pg.evaluate(() => { ['pri-dob', 'target-ret'].forEach((id) => { var e = document.getElementById(id); if (e) e.dispatchEvent(new Event('change', { bubbles: true })); }); });
    await pg.waitForTimeout(700);
    await pg.evaluate(() => window._studioEnterRoom('measurement'));
    await pg.waitForTimeout(400);
    const armed = await pg.evaluate(() => {
      var opt = Array.prototype.slice.call(document.querySelectorAll('.climate-option'))
        .filter(function (o) { return (o.dataset.outlook || '') === 'Custom Matrix'; })[0];
      if (!opt) return { ok: false, why: 'no Custom Matrix option' };
      opt.click();
      var w = document.querySelectorAll('.c-weight');
      if (!w.length) return { ok: false, why: 'no .c-weight inputs' };
      w.forEach(function (el) { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      var total = Array.prototype.map.call(w, function (e) { return parseFloat(e.value) || 0; }).reduce(function (a, b) { return a + b; }, 0);
      return { ok: true, weights: w.length, total: total };
    });
    console.log('S3 fixture ' + JSON.stringify(armed));
    check('S3 fixture armed an invalid Custom Matrix (a sum of 100 would not refuse)',
      armed.ok && armed.total !== 100, JSON.stringify(armed));
    await pg.waitForTimeout(400);
    await pg.click('.action-btn'); await pg.waitForTimeout(1200);
    const s = await spoken(pg);
    console.log('S3 ' + JSON.stringify(s));
    check('S3 the weights refusal is routed through window._buildRequestError', !!s.buildErr, String(s.buildErr));
    check('S3 and it is visible in the same box', s.visibleCount >= 1, s.ids || 'NOTHING VISIBLE');
    await ctx.close();
  }

  /* S8 — THE COLD STUDIO. ⛔ THE ONE STATE EVERY NEW USER IS GUARANTEED TO PASS THROUGH, AND THE
     ONE STATE THIS GATE NEVER TESTED. S1/S2/S3 each arrange exactly ONE thing wrong; a Studio
     opened for the first time has THREE wrong at once, and the refusal reported them ONE PER CLICK.
     The Captain hit REVEAL four times: no account -> add one -> no DOB -> add one -> no retirement
     date -> add one -> finally through.
     🔑 A VALIDATOR THAT RETURNS ON FIRST FAILURE IS NOT REPORTING, IT IS RATIONING.
     🔑 AND A FIXTURE SET OF SINGLE FAULTS CANNOT SEE A DEFECT THAT ONLY EXISTS WHEN FAULTS CO-OCCUR.
        Enumerating the reasons is not enumerating their COMBINATIONS. Test the cold state first. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const cold = await pg.evaluate(() => ({
      rooms: (state.accounts || []).length,
      dob: (document.getElementById('pri-dob') || {}).value,
      ret: (document.getElementById('target-ret') || {}).value
    }));
    check('S8 fixture is genuinely COLD — no rooms, no dates (else it tests a different state)',
      cold.rooms === 0 && !cold.dob && !cold.ret, JSON.stringify(cold));
    await pg.click('.action-btn'); await pg.waitForTimeout(1000);
    const s = await spoken(pg);
    console.log('S8 cold-Studio refusal: ' + JSON.stringify(s.text));
    const saysAccount = /account/i.test(s.text);
    const saysDate = /Date of Birth/i.test(s.text);
    check('S8 the cold refusal names the missing ACCOUNT', saysAccount, s.text.slice(0, 120));
    check('S8 THE COMBINATION — it names the missing DATE in the SAME refusal', saysDate,
      'one click must not yield one reason: ' + s.text.slice(0, 120));
  }

  /* ── F79 · S9 — THE HOUSEHOLD BECAME A PERSON, SILENTLY ─────────────────────────────────────
     Toggle ON, DOB unreadable: _coArchitectFacts() returned null and buildStudioRequest did
     `if (_coFacts) Object.assign(...)` with NO else — the SS Matrix refused loudly with a named
     field while THE RANGE WAS COMPUTED FOR ONE PERSON and said nothing. F72's shape, third instance.
     ⛔ THE INVARIANT IS THE RETURN VALUE, NOT THE MESSAGE. Pushing a reason and RETURNING NULL are
        two different acts, and the old check sat SEVENTY LINES BELOW the abort gate — a reason
        pushed there prints the sentence ABOVE a one-person ladder that contradicts it.
        A VALIDATION THAT RUNS AFTER THE ABORT GATE IS NOT A VALIDATION, IT IS A CAPTION.
     So the payload is measured, not the code path: call the builder and look at what it hands back. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const funded = await fundRoom(pg);
    const fixture = await pg.evaluate(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true })); } };
      set('pri-dob', '08 / 1982'); set('target-ret', '03 / 2035');
      const tog = document.getElementById('co-arch-toggle');
      if (tog) { tog.checked = true; tog.dispatchEvent(new Event('change', { bubbles: true })); }
      /* ⚠ PRESENT BUT UNREADABLE, AND THE VALUE IS CHOSEN, NOT GUESSED. 'ab / cdef' was the first
         attempt and THE FIELD'S MASK STRIPPED IT to '' — the leg silently became a duplicate of S9c,
         testing "missing" while labelled "unreadable", and every assertion still passed. The fixture
         guard below caught it. parseAgeFromDob returns null on `!year`, so a numeric 0000 survives
         the mask and still cannot be read. */
      set('co-dob', '08 / 0000');
      return { toggle: !!(tog && tog.checked), coDob: (document.getElementById('co-dob')||{}).value };
    });
    check('S9 fixture: funded, primary dates valid, co-arch ON with a NON-EMPTY unreadable DOB',
      funded > 0 && fixture.toggle && !!fixture.coDob, JSON.stringify(fixture) + ' funded=' + funded);

    const built = await pg.evaluate(() => {
      const body = window._buildStudioRequest();
      return { returnedNull: body === null, keys: body ? Object.keys(body).length : 0,
               hasCoArch: !!(body && body.co_architect_age),
               errs: (window._buildRequestErrors || []).map((e) => ({ m: e.message, t: e.target })) };
    });
    console.log('S9 builder returned: ' + JSON.stringify(built));
    check('S9 THE INVARIANT — the builder REFUSES; it does not hand back a one-person body',
      built.returnedNull === true,
      built.returnedNull ? 'null' : 'RETURNED A BODY with ' + built.keys + ' keys, co_arch=' + built.hasCoArch);
    check('S9 it is the UNREADABLE branch, not the missing one',
      built.errs.some((e) => /could not be read/.test(e.m)), JSON.stringify(built.errs));
    check('S9 the reason carries the door target co-dob',
      built.errs.some((e) => e.t === 'co-dob'), JSON.stringify(built.errs));
    check('S9 THE TRAILING INSTRUCTION IS GONE — the link does that work, not the sentence',
      !built.errs.some((e) => /Architect Profile/.test(e.m)), JSON.stringify(built.errs.map((e) => e.m)));

    await pg.click('.action-btn'); await pg.waitForTimeout(900);
    const s = await spoken(pg);
    console.log('S9 on-screen: ' + JSON.stringify(s.text));
    check('S9 the refusal is visible', s.visibleCount >= 1, s.ids || 'NOTHING VISIBLE');
    check('S9 it states the authored sentence VERBATIM',
      s.text.indexOf('cannot be built for both of you') !== -1, s.text.slice(0, 150));
    check('S9 the Range did NOT navigate', s.url.indexOf('range') === -1, s.url);

    /* S9d — THE DOOR ACTUALLY OPENS. Rendering a button is not the same as it working. */
    const door = await pg.evaluate(() => {
      const b = document.querySelector('#reveal-status [data-datum-target]');
      if (!b) return { rendered: false };
      b.click();
      return { rendered: true, label: (b.textContent || '').trim(),
               target: b.getAttribute('data-datum-target'),
               focused: document.activeElement ? document.activeElement.id : null };
    });
    console.log('S9d door: ' + JSON.stringify(door));
    check('S9d the door is rendered', door.rendered === true, JSON.stringify(door));
    check('S9d its label is the invariant string', door.label === 'Take me there', String(door.label));
    check('S9d clicking it FOCUSES the offending field', door.focused === 'co-dob', String(door.focused));

    /* S9c — MISSING and UNREADABLE are different facts and the copy is honest about which. */
    await pg.evaluate(() => { const e = document.getElementById('co-dob'); if (e) { e.value = '';
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
    const empty = await pg.evaluate(() => { window._buildStudioRequest();
      return (window._buildRequestErrors || []).map((e) => e.message); });
    console.log('S9c empty-DOB reason: ' + JSON.stringify(empty));
    check('S9c an EMPTY co-arch DOB says "missing", not "could not be read"',
      empty.some((m) => /is missing/.test(m)) && !empty.some((m) => /could not be read/.test(m)),
      JSON.stringify(empty));
  }

  /* ── F79 · S10 — THE FULL-SURFACE AUDIT ────────────────────────────────────────────────────
     Every reason that exists today, arranged in isolation, and the question asked of each:
     does it carry a target, does that target RESOLVE, is a door rendered, and does the door
     actually move focus. The audit is part of F79, not a follow-up — a retrofit that covers
     the reasons somebody happened to remember is a sample, not a sweep.
     ⭐ A REASON THAT CANNOT NAME A TARGET IS ITSELF A FINDING and is reported, never forced. */
  const audit = [];
  async function auditReason(label, arrange) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    await arrange(pg);
    await pg.click('.action-btn'); await pg.waitForTimeout(900);
    const row = await pg.evaluate(() => {
      const errs = (window._buildRequestErrors || []).map((e) => ({ m: e.message, t: e.target || null }));
      const doors = Array.prototype.slice.call(document.querySelectorAll('#reveal-status [data-datum-target]'));
      const first = doors[0] || null;
      let focused = null, focusTag = null;
      if (first) { first.click(); focused = document.activeElement ? document.activeElement.id : null;
                   focusTag = document.activeElement ? document.activeElement.tagName : null; }
      return { reasons: errs, doors: doors.length,
               targets: doors.map((b) => b.getAttribute('data-datum-target')),
               resolves: doors.map((b) => !!document.getElementById(b.getAttribute('data-datum-target'))),
               /* ⚠ RESOLVES IS NOT REACHES. getElementById finds elements inside display:none
                  ancestors, so a resolution-only audit scores an INERT door as a working one.
                  offsetParent is null for anything in a hidden subtree. */
               reachable: doors.map((b) => { const t = document.getElementById(b.getAttribute('data-datum-target'));
                                            return !!(t && t.offsetParent !== null); }),
               focused: focused, focusTag: focusTag };
    });
    await ctx.close();
    audit.push({ label, ...row });
    return row;
  }

  const setDates = (pg) => pg.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v;
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
    set('pri-dob', '08 / 1982'); set('target-ret', '03 / 2035');
  });

  await auditReason('REVEAL_NO_ACCOUNT (cold Studio)', async () => {});
  await auditReason('Date of Birth', async (pg) => { await fundRoom(pg); });
  await auditReason('Co-Architect DOB', async (pg) => {
    await fundRoom(pg); await setDates(pg);
    await pg.evaluate(() => { const t = document.getElementById('co-arch-toggle');
      if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      const e = document.getElementById('co-dob'); if (e) { e.value = '08 / 0000';
        e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
  });
  await auditReason('WEIGHTS_MUST_SUM', async (pg) => {
    await fundRoom(pg);
    await pg.evaluate(() => window._studioEnterRoom('data')); await pg.waitForTimeout(300);
    await setDates(pg); await pg.waitForTimeout(600);
    await pg.evaluate(() => window._studioEnterRoom('measurement')); await pg.waitForTimeout(400);
    await pg.evaluate(() => {
      const opt = Array.prototype.slice.call(document.querySelectorAll('.climate-option'))
        .filter((o) => (o.dataset.outlook || '') === 'Custom Matrix')[0];
      if (opt) opt.click();
      document.querySelectorAll('.c-weight').forEach((el) => { el.value = '10';
        el.dispatchEvent(new Event('input', { bubbles: true })); });
    });
  });

  console.log('');
  console.log('-- F79 AUDIT: reason -> target -> rendered --');
  for (const r of audit) {
    console.log('  ' + r.label.padEnd(34) + ' doors=' + r.doors
      + '  targets=' + JSON.stringify(r.targets)
      + '  resolves=' + JSON.stringify(r.resolves)
      + '  reachable=' + JSON.stringify(r.reachable)
      + '  focus->' + r.focused + ' <' + r.focusTag + '>');
  }
  const untargeted = audit.filter((r) => r.reasons.some((e) => !e.t));
  console.log('  reasons with NO target: ' + (untargeted.length
    ? untargeted.map((r) => r.label).join(', ') : 'none'));

  check('S10 every audited reason renders at least one door',
    audit.every((r) => r.doors >= 1), audit.map((r) => r.label + '=' + r.doors).join(' | '));
  check('S10 every rendered door resolves to a live element',
    audit.every((r) => r.resolves.every(Boolean)),
    JSON.stringify(audit.map((r) => ({ l: r.label, r: r.resolves }))));
  /* ⛔ THE LEG THAT CAUGHT THE INERT DOOR. Resolution passed on every row while focus came back
     empty, because the target sat in a hidden phase. Assert that the door MOVES FOCUS. */
  check('S10 every door MOVES FOCUS — rendering and resolving are not reaching',
    audit.every((r) => !!r.focused),
    JSON.stringify(audit.map((r) => ({ l: r.label, focus: r.focused, tag: r.focusTag }))));
  check('S10 no reason carries a target that is absent from the document',
    audit.every((r) => r.reasons.every((e) => !e.t || r.targets.indexOf(e.t) !== -1)),
    JSON.stringify(audit.map((r) => ({ l: r.label, e: r.reasons.map((x) => x.t), d: r.targets }))));

  /* S6 / S7 — structural, over the composed PROGRAM */
  const hostRefs = ['reveal-status', 'reveal-zero-error', 'c-weight-error']
    .filter((id) => CENSUS_SRC.indexOf("getElementById('" + id + "')") !== -1);
  console.log('S6 status hosts referenced by the reveal path: [' + hostRefs.join(', ') + ']');
  check('S6 ONE VOICE — exactly one status host is referenced', hostRefs.length === 1,
    hostRefs.length + ' referenced: ' + (hostRefs.join(',') || 'none') + '  (population: the 3 known refusal hosts)');
  /* ⛔ MATCH THE EMITTED FORM, NOT THE STRING. The first version of this leg counted
     `id="ss-map-poll-sub"` anywhere in the source — and went RED on the COMMENT that explains why
     the id was removed. A leg asserting "no fixed id is emitted" failed because someone wrote down
     that no fixed id is emitted.
     🔑 IN A CODEBASE WHOSE TOOLING GREPS SOURCE, A COMMENT IS AN INPUT — seventh instance in one
        day. The concatenation prefix `+ '<div ` cannot occur in prose, so it selects code only. */
  const dupId = (CENSUS_SRC.match(/\+ '<div id="ss-map-poll-sub"/g) || []).length;
  console.log('S7 emitted id="ss-map-poll-sub" occurrences: ' + dupId);
  check('S7 the shared builder emits no fixed id (population: whole composed source)', dupId === 0, dupId + ' occurrence(s)');

  await browser.close(); server.close();
  console.log('\n' + results.join('\n'));
  console.log('\nOVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (results.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_x) {} process.exit(2); });
