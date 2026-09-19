/* _gate_survivor_disclosure.js — §6.9b / §6.11. THE GATE THE WHOLE ENGINE QUEUE IS STACKED BEHIND.
 *
 * ⛔⛔ WHAT THIS PROTECTS, MEASURED 12 Sep: the survivor build moved a two-horizon household from
 *    71,000 / 85,000 / 93,000 to 66,000 / 81,000 / 91,000 — DOWN ON ALL THREE TIERS, Floor with
 *    them. The failure mode is not a bug. It is a household watching their number drop with no
 *    sentence on screen saying why. §6.9 must ship BEFORE any user sees a stepped-down tier.
 *
 * ⛔ AND IT PROTECTS THE OTHER HALF, WHICH IS WORSE: `architect-lastsurvivor-note` said "we don't
 *    model the year a household becomes one person" and rendered via `architect-field-co` — so the
 *    one sentence that had become false was shown ONLY to the population it was false about, in the
 *    REASSURING direction. Law 180: the generous direction is the one nobody reports.
 *
 * ⛔⛔ RE-AIMED 2026-09-14 (§82.2361, §82.2363) — AND THE OLD AIM WAS THE POINT OF THE LAW.
 *    Every leg below used to load `range.html` over `file://`. That was CORRECT WHEN WRITTEN and
 *    was invalidated by a cutover that moved the surface out from under it: Reveal Range now opens
 *    the Measurement panel and NEVER VISITS range.html, so this gate was green over a page no user
 *    reaches. A GATE THAT LOADS A FILE DIRECTLY PROVES THE FILE, NOT THE PATH — and "the sentence
 *    is present" and "the sentence is reachable" are two different states the old instrument could
 *    not tell apart.
 *    🔑 WHEN A SURFACE IS RETIRED, EVERY GATE POINTED AT IT IS RE-AIMED IN THE SAME COMMIT.
 *    ⚠️ range.html KEEPS ITS COPY and is deliberately NOT tested here any more. It is sunset and
 *       ruled zero-effort; testing it would re-create exactly the empty green this re-aim removes.
 *
 * ⛔ IT ASSERTS RENDERED TEXT IN A BROWSER (law 221) AND IT ASSERTS BOTH DIRECTIONS. A gate that
 *    only checked "the sentence appears when there is a window" would stay green on a build that
 *    showed it to EVERY household, including solo ones with no second person at all.
 *
 * ⛔ AND IT DRIVES THE REAL PATH: fromEngine() -> render(). Calling renderSurvivor() directly would
 *    prove this gate can write a string and nothing about whether the product does — a direct call
 *    proves the handler, not the feature. The fixture is an ENGINE RESPONSE, so a mapper that stops
 *    reading `params.survivor_calendar_year` goes red here even though the renderer still works.
 *
 * @gate-pool: browser
 * Run: node scripts/_gate_survivor_disclosure.js
 */
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8231;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
               '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/* ⛔ SERVED OVER HTTP, NOT file://, AND THAT IS NOT A PREFERENCE. studio.html loads the panel's
   behaviour with `<script src="/scripts/studio-measurement.js">` — an ABSOLUTE path, which over
   file:// resolves to the filesystem root and 404s. The old gate never noticed because it only
   read the DOM; a leg that needs DatumMeasurement would have failed for the wrong reason. */
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/studio.html';
  const full = path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, ''));
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end('nf');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

let pass = 0, fail = 0;
const lines = [];
const check = (name, ok, detail) => {
  ok ? (pass++, lines.push(`  PASS  ${name}`)) : (fail++, lines.push(`  FAIL  ${name}`));
  if (detail) lines.push(`          ${detail}`);
};

// The authored sentence, verbatim from Empty State Copy Bank §6.9 / §6.9b. ⛔ If this literal and
// the one in studio-measurement.js ever disagree, THIS FILE IS THE ONE THAT IS WRONG — the copy
// bank is the source. The apostrophe is U+2019 and must stay that way.
const SENTENCE = (yr) => `After ${yr}, this plans for one person: the larger Social Security `
  + `benefit, single-filer tax, one person’s healthcare, and 75% of your spending.`;

/* A USABLE scenario, because render() refuses anything else at the door and a refused render would
   leave the disclosure hidden for a reason that has nothing to do with the survivor window. Shaped
   from a MEASURED production response (2026-09-14, :prod-9) rather than invented: the window this
   panel draws must sit inside the engine's grid or fromEngine refuses on the saturation rule. */
/* ⛔⛔ FIXTURE REPAIRED 2026-09-19 — IT SUPPLIED THE FIELD THE PANEL STOPPED READING.
   This carried `capacity_curve.success_rates` and NO `share_delivered`, so `fromEngine` refused
   at its own door (`if (!Array.isArray(rates)) return null`) and P2/P2b failed with the
   disclosure blank. THE PRODUCT WAS NOT WRONG: the panel was deliberately swapped from
   success_rates to share_delivered, with NO FALLBACK, because once spending flexes against the
   guardrails the success rate saturates and answers a different question.
   ⭐ PROVEN AGAINST PRODUCTION BEFORE THIS FIXTURE MOVED, which is the only thing that makes the
      repair honest (§82.2767): the LIVE endpoint returns `share_delivered=True` on :prod-19.
      Re-pointing a test to a changed product is legitimate ONLY once the change has been shown
      correct independently — otherwise it is teaching the test to accept a defect.
   ⛔ THIS GATE WAS NOT ON THE RED LEDGER AT ALL. It went red when the panel swapped fields and
      nobody knew, because the disposition census is a hand-typed array that runs no gates. IT IS
      THE SURVIVOR SENTENCE — the Standing Goal's own named case, dark and unreported.

   ⚠️ THE TWO ARRAYS DISAGREE ON PURPOSE AND MUST STAY DISAGREEING (§82.2425, fingerprint the
      stores). `success_rates` is a STEP and `share_delivered` is a CURVE — the exact contrast
      measured on a real household (1.0000 -> 0.0000 a step, 1.000000 -> 0.221790 a curve). If
      anyone ever re-adds the forbidden fallback to success_rates, the panel draws a staircase
      instead of a curve and P6 below goes red. A FIXTURE THAT FEEDS BOTH STORES THE SAME NUMBERS
      CANNOT TELL WHICH ONE WAS READ. Both are saturated at the ends (first >= 0.999, last
      <= 0.001) so the out-of-grid rule is satisfied whichever way the window falls. */
const GRID_N = 47;
const mkResponse = (survivorYear) => ({
  tiers: { blended: { bedrock: 87000, foundation: 102000, keystone: 112000, capstone: 130000 } },
  success_rates: { parametric: 0.82, bootstrap: 0.90, cape: 0.91, regime: 0.77, datum_spend: 95000 },
  capacity_curve: {
    spend_grid:      Array.from({ length: GRID_N }, (_, i) => 40000 + 5000 * i),
    // A STEP — what the old measure looks like, kept so the swap stays provable.
    success_rates:   Array.from({ length: GRID_N }, (_, i) => (i < GRID_N / 2 ? 1 : 0)),
    // A CURVE — what the panel must actually read. Distinguishable from the step at every point
    // in the middle of the window, which is where the disclosure's household sits.
    share_delivered: Array.from({ length: GRID_N }, (_, i) => 1 - i / (GRID_N - 1)),
    median_ending:   Array.from({ length: GRID_N }, (_, i) => 2000000 - 40000 * i)
  },
  params: survivorYear === 'ABSENT' ? {} : { survivor_calendar_year: survivorYear }
});
const REQUEST = { retirement_age: 60, plan_end_age: 90, datum_spend: 95000 };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon|sentry/i.test(u)) return r.abort();
    return r.continue();
  });
  await ctx.addInitScript(`(() => { try {
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('t'); } },
      user: { id: 'user_surv', unsafeMetadata: {}, update: function(){ return Promise.resolve(); } },
      addListener: function(){}, signOut: function(){ return Promise.resolve(); } };
  } catch(e){} })();`);

  const page = await ctx.newPage();
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e).slice(0, 140)));
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // ⛔ AN INIT THROW INVALIDATES EVERY GREEN BELOW — the gates measure the code that RAN.
  check('P0 studio.html boots with a clean console',
        thrown.length === 0, thrown.length ? thrown.join(' | ') : 'no pageerror events');

  const haveModule = await page.evaluate(
    () => !!(window.DatumMeasurement && window.DatumMeasurement.fromEngine && window.DatumMeasurement.render)
  );
  check('P0b the panel module is reachable on the page (fromEngine + render)', haveModule,
        haveModule ? 'DatumMeasurement present' : 'the panel cannot be driven — every leg below would be vacuous');

  if (!haveModule) {
    lines.forEach((l) => console.log(l));
    console.log(`\n${fail} FAIL / ${pass} PASS — RED (cannot run)`);
    await browser.close(); server.close(); process.exit(1);
  }

  // ── P1 · THE SLOT EXISTS AND IS HIDDEN AT REST ────────────────────────────
  const atRest = await page.evaluate(() => {
    window.DatumMeasurement.renderEmpty();
    const el = document.getElementById('mcSurvivorDisclosure');
    return { exists: !!el, hidden: el ? el.hidden : null, text: el ? el.textContent : null };
  });
  check('P1 the slot exists and is HIDDEN at rest — never an empty box',
        atRest.exists && atRest.hidden === true && !atRest.text,
        `exists=${atRest.exists} hidden=${atRest.hidden} text=${JSON.stringify(atRest.text)}`);

  // ── P2 · A HOUSEHOLD WITH A WINDOW SEES THE SENTENCE ──────────────────────
  // ⚠️ DRIVEN THROUGH fromEngine -> render. Setting textContent by hand, or calling renderSurvivor
  //    directly, would prove this gate can write a string and nothing about whether the product does.
  const withWindow = await page.evaluate(([res, req]) => {
    const M = window.DatumMeasurement;
    M.render(M.fromEngine(res, req));
    const el = document.getElementById('mcSurvivorDisclosure');
    return { hidden: el.hidden, text: el.textContent,
             visibleInBody: (document.body.innerText || '').includes('2064') };
  }, [mkResponse(2064), REQUEST]);

  check('P2 a household WITH a survivor window sees the sentence, via fromEngine -> render',
        withWindow.hidden === false && withWindow.text === SENTENCE(2064),
        `rendered: ${JSON.stringify(withWindow.text)}`);
  check('P2b the YEAR is the engine\'s, echoed — not a fixed number',
        withWindow.text.includes('2064'),
        'a literal year here would be a new hardcode, wrong for every household but one');

  // ── P3 · THE NEGATIVE CONTROL, AND IT IS THE LEG THAT CARRIES INFORMATION ──
  // ⛔ null AND undefined BOTH MEAN "no window was reported" and both must render NOTHING.
  //    `undefined` is what a response from an engine predating the field looks like.
  // ⚠️ EACH ONE RE-RENDERS A WINDOWED HOUSEHOLD FIRST, so the leg proves the disclosure is
  //    RETRACTED rather than merely never written. A panel that only ever adds the sentence would
  //    pass a cold check and still carry the previous household's year into the next one's Range.
  for (const [label, year] of [
    ['solo / no window (null)', null],
    ['an engine too old to carry the field (undefined)', undefined],
    ['no params at all', 'ABSENT'],
  ]) {
    const r = await page.evaluate(([resWin, resNone, req]) => {
      const M = window.DatumMeasurement;
      M.render(M.fromEngine(resWin, req));            // arm it
      M.render(M.fromEngine(resNone, req));           // then the household under test
      const el = document.getElementById('mcSurvivorDisclosure');
      return { hidden: el.hidden, text: el.textContent };
    }, [mkResponse(2064), mkResponse(year), REQUEST]);
    check(`P3 ${label} → nothing rendered, and the previous household's year is RETRACTED`,
          r.hidden === true && !r.text,
          `hidden=${r.hidden} text=${JSON.stringify(r.text)}`);
  }

  // ── P4 · THE DISCLOSURE AND THE NUMBER ARE ONE CALL ───────────────────────
  // ⛔ THE STRUCTURAL HALF. "Must ship before any user sees a stepped-down tier" holds only if
  //    there is NO PATH that paints the tier without painting this. Asserted on the source of the
  //    painting function, because that is where the coupling lives.
  const msrc = fs.readFileSync(path.join(ROOT, 'scripts/studio-measurement.js'), 'utf8');
  /* ⚠️ ANCHORED ON THE DEFINITION AND BOUNDED BY THE NEXT ONE, so this reads render()'s OWN body
     and not the whole file. Without the bound, `renderSurvivor` appearing anywhere later would
     satisfy this leg — a predicate that is true for the wrong reason. */
  const start = msrc.indexOf('\n  function render(s) {');
  const after = start < 0 ? -1 : msrc.indexOf('\n  function ', start + 3);
  const body = start < 0 ? '' : msrc.slice(start, after < 0 ? msrc.length : after);
  check('P4 anchor — render(s) is still where this leg expects it', start >= 0 && after > start,
        start < 0 ? 'render(s) NOT FOUND — the anchor moved; fix this leg, do not delete it' : `${after - start} bytes read`);
  check('P4 render() paints the disclosure in the same call that paints the tiers',
        body.includes('renderSurvivor(s.survivorYear)'),
        'the number and the sentence that explains it are written by one call — no path paints one alone');
  /* ⚠️ BOUNDED BY THE FUNCTION, NOT BY A CHARACTER COUNT. This first read `{0,600}` and went red at
     657 characters — the bound was a guess about how much COMMENT sits between the two lines, which
     is a property of the prose and not of the code. A leg whose verdict moves when somebody writes
     a longer note is measuring the wrong thing. */
  const cdStart = msrc.indexOf('\n  function clearData() {');
  const cdAfter = cdStart < 0 ? -1 : msrc.indexOf('\n  }', cdStart);
  const cdBody = cdStart < 0 ? '' : msrc.slice(cdStart, cdAfter < 0 ? msrc.length : cdAfter);
  check('P4b anchor — clearData() is still where this leg expects it', cdStart >= 0 && cdAfter > cdStart,
        cdStart < 0 ? 'clearData() NOT FOUND — the anchor moved; fix this leg, do not delete it' : `${cdAfter - cdStart} bytes read`);
  check('P4b clearData() retracts it, so a stale year cannot outlive its household',
        cdBody.includes('renderSurvivor(null)'),
        'every re-render goes through clearData');

  // ── P5 · §6.11 · THE FALSE NOTE IS GONE FROM THE LIVE DOM ─────────────────
  // ⛔ ASSERTED IN THE BROWSER, NOT BY GREP, because the retired text is quoted verbatim inside the
  //    comment that replaced it — a source grep would find it forever and could never go green.
  //    THE QUESTION IS WHETHER A PERSON CAN SEE IT, AND ONLY THE DOM ANSWERS THAT.
  const note = await page.evaluate(() => ({
    byId: !!document.getElementById('architect-lastsurvivor-note'),
    byClass: document.querySelectorAll('.architect-lastsurvivor-tip').length,
    inText: (document.body.innerText || '').includes('does not price them'),
  }));
  check('P5 §6.11 — the retired note is absent from the live DOM',
        note.byId === false && note.byClass === 0 && note.inText === false,
        `byId=${note.byId} byClass=${note.byClass} inText=${note.inText}`);

  /* ── P6 · WHICH SERIES DID THE PANEL ACTUALLY READ? ────────────────────────
     ⛔⛔ ADDED 2026-09-19 BECAUSE THIS GATE'S OWN FIXTURE WENT DARK FOR WANT OF IT. The panel
     was swapped from success_rates to share_delivered with NO FALLBACK, deliberately — a
     fallback would print the old quantity under the new labels, an honest-looking number that
     answers a different question. NOTHING ASSERTED THE SWAP. This gate simply stopped being able
     to drive the panel at all, and the red sat outside the ledger.
     🔑 A CONTRACT ENFORCED ONLY BY A COMMENT IS ENFORCED BY NOBODY (§82.2425). The fixture feeds
        the two series DIFFERENT SHAPES — a step and a curve — so the question "which one was
        read" has an observable answer instead of being a matter of trust.
     ⚠️ READ OFF THE SCENARIO, NOT OFF THE SCREEN. fromEngine keeps the engine's own grid and
        rates on the scenario it returns, so this compares what the panel CARRIES against both
        candidate sources. Asserting a rendered pixel would prove the chart drew something. */
  const series = await page.evaluate(([res, req]) => {
    const M = window.DatumMeasurement;
    const s = M.fromEngine(res, req);
    if (!s) return { refused: true };
    const cc = res.capacity_curve;
    const eq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
                         && a.every((v, i) => Number(v) === Number(b[i]));
    return {
      refused: false,
      readShareDelivered: eq(s.rates, cc.share_delivered),
      readSuccessRates:   eq(s.rates, cc.success_rates),
      seriesDiffer:       !eq(cc.share_delivered, cc.success_rates)
    };
  }, [mkResponse(2064), REQUEST]);

  check('P6 CONTROL: the fixture feeds the two series DIFFERENT shapes',
        series.seriesDiffer === true,
        series.seriesDiffer ? 'step vs curve — the question is answerable'
                            : 'IDENTICAL — this gate cannot tell which series was read, and P6b below is vacuous');
  check('P6b the panel read share_delivered, NOT success_rates — the no-fallback rule, asserted',
        series.refused === false && series.readShareDelivered === true && series.readSuccessRates === false,
        series.refused ? 'fromEngine REFUSED the scenario'
                       : `share_delivered=${series.readShareDelivered} success_rates=${series.readSuccessRates}`);

  await browser.close();
  server.close();
  lines.forEach((l) => console.log(l));
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_x) {} process.exit(2); });
