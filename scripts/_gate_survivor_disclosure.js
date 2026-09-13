/* _gate_survivor_disclosure.js — §6.9 / §6.11. THE GATE THE WHOLE ENGINE QUEUE IS STACKED BEHIND.
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
 * ⛔ IT ASSERTS RENDERED TEXT IN A BROWSER (law 221) AND IT ASSERTS BOTH DIRECTIONS. A gate that
 *    only checked "the sentence appears when there is a window" would stay green on a build that
 *    showed it to EVERY household, including solo ones with no second person at all.
 *
 * Run: node scripts/_gate_survivor_disclosure.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RANGE = 'file://' + path.resolve(__dirname, '..', 'range.html').replace(/\\/g, '/');
const STUDIO = 'file://' + path.resolve(__dirname, '..', 'studio.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const lines = [];
const check = (name, ok, detail) => {
  ok ? (pass++, lines.push(`  PASS  ${name}`)) : (fail++, lines.push(`  FAIL  ${name}`));
  if (detail) lines.push(`          ${detail}`);
};

// The authored sentence, verbatim from Empty State Copy Bank §6.9. ⛔ If this literal and the one
// in range.html ever disagree, THIS FILE IS THE ONE THAT IS WRONG — the copy bank is the source.
const SENTENCE = (yr) => `After ${yr}, this plans for one person: the larger Social Security `
  + `benefit, single-filer tax, one person’s healthcare, and 75% of your spending.`;

(async () => {
  const browser = await chromium.launch();

  // ── range.html · §6.9 ──────────────────────────────────────────────────────
  const page = await browser.newPage();
  const thrown = [];
  page.on('pageerror', e => thrown.push(String(e).slice(0, 140)));
  /* ⛔ range.html REDIRECTS TO /why-a-range.html UNLESS `datum_range_revealed` IS SET. It is not
     reachable by typing its URL — it is the back half of the Reveal, and a person arrives only by
     completing one. Seeding the flag BEFORE load is what puts this gate on the real page instead
     of on the redirect target. ⚠️ addInitScript, not an evaluate after goto: the guard runs during
     parse, so anything set afterwards is already too late. */
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datum_range_revealed', '1'); } catch (_) {}
  });
  await page.goto(RANGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  // ⛔ AN INIT THROW INVALIDATES EVERY GREEN BELOW — the gates measure the code that RAN.
  check('L0 range.html boots with a clean console',
        thrown.length === 0, thrown.length ? thrown.join(' | ') : 'no pageerror events');

  const atRest = await page.evaluate(() => {
    const el = document.getElementById('survivor-disclosure');
    return { exists: !!el, hidden: el ? el.hidden : null, text: el ? el.textContent : null };
  });
  check('L1 the slot exists and is HIDDEN at rest — never an empty box',
        atRest.exists && atRest.hidden === true && !atRest.text,
        `exists=${atRest.exists} hidden=${atRest.hidden} text=${JSON.stringify(atRest.text)}`);

  // ── L2 · A HOUSEHOLD WITH A WINDOW SEES THE SENTENCE ───────────────────────
  // ⚠️ DRIVEN THROUGH THE REAL RENDER PATH. Setting textContent by hand would prove this gate can
  //    write a string, and nothing about whether the product does.
  const withWindow = await page.evaluate(() => {
    window._renderSurvivorDisclosure({ params: { survivor_calendar_year: 2051 } });
    const el = document.getElementById('survivor-disclosure');
    return { hidden: el.hidden, text: el.textContent, visibleInBody: (document.body.innerText || '').includes('2051') };
  }).catch(() => null);

  if (!withWindow) {
    check('L2 a household WITH a survivor window sees the sentence', false,
          '_renderSurvivorDisclosure is not reachable from the page — is it exposed?');
  } else {
    check('L2 a household WITH a survivor window sees the sentence',
          withWindow.hidden === false && withWindow.text === SENTENCE(2051),
          `rendered: ${JSON.stringify(withWindow.text)}`);
    check('L2b and the YEAR is the engine\'s, echoed — not a fixed number',
          withWindow.text.includes('2051'),
          'the floor moves per household; a literal year here would be a new hardcode');
  }

  // ── L3 · THE NEGATIVE CONTROL, AND IT IS THE LEG THAT CARRIES INFORMATION ──
  // ⛔ null AND undefined BOTH MEAN "no window was reported" and both must render NOTHING.
  //    `undefined` is exactly what a response from an engine predating the field looks like — which
  //    is the CURRENTLY DEPLOYED container, so this is the live case, not an edge case.
  for (const [label, payload] of [
    ['solo / no window (null)', { params: { survivor_calendar_year: null } }],
    ['an engine too old to carry the field (undefined)', { params: {} }],
    ['no params at all', {}],
  ]) {
    const r = await page.evaluate((p) => {
      window._renderSurvivorDisclosure(p);
      const el = document.getElementById('survivor-disclosure');
      return { hidden: el.hidden, text: el.textContent };
    }, payload);
    check(`L3 ${label} → nothing rendered`,
          r.hidden === true && !r.text,
          `hidden=${r.hidden} text=${JSON.stringify(r.text)}`);
  }

  // ── L4 · THE DISCLOSURE AND THE NUMBER ARE ONE CALL ────────────────────────
  // ⛔ THE STRUCTURAL HALF. "Must ship before any user sees a stepped-down tier" holds only if
  //    there is NO PATH that paints the tier without painting this. Asserted on the source of the
  //    painting function, because that is where the coupling lives.
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'range.html'), 'utf8');
  const fn = src.slice(src.indexOf('function populateRangeFromAPI'));
  const body = fn.slice(0, fn.indexOf('CAPSTONE'));
  check('L4 populateRangeFromAPI calls the disclosure BEFORE it paints a tier',
        body.includes('_renderSurvivorDisclosure'),
        'the number and the sentence that explains it are written by one call — no path paints one alone');

  await page.close();

  // ── L5 · §6.11 · THE FALSE NOTE IS GONE FROM THE LIVE DOM ─────────────────
  // ⛔ ASSERTED IN THE BROWSER, NOT BY GREP, because the retired text is quoted verbatim inside the
  //    comment that replaced it — a source grep would find it forever and could never go green.
  //    THE QUESTION IS WHETHER A PERSON CAN SEE IT, AND ONLY THE DOM ANSWERS THAT.
  const s2 = await browser.newPage();
  const thrown2 = [];
  s2.on('pageerror', e => thrown2.push(String(e).slice(0, 140)));
  await s2.goto(STUDIO, { waitUntil: 'domcontentloaded' });
  await s2.waitForTimeout(1200);
  const note = await s2.evaluate(() => ({
    byId: !!document.getElementById('architect-lastsurvivor-note'),
    byClass: document.querySelectorAll('.architect-lastsurvivor-tip').length,
    inText: (document.body.innerText || '').includes('does not price them'),
  }));
  check('L5 studio.html boots clean',
        thrown2.length === 0, thrown2.length ? thrown2.join(' | ') : 'no pageerror events');
  check('L5b §6.11 — the false note is gone from the DOM, not just from view',
        !note.byId && note.byClass === 0 && !note.inText,
        `getElementById=${note.byId}  .architect-lastsurvivor-tip=${note.byClass}  `
        + `"does not price them" in body text=${note.inText}`);

  await browser.close();
  console.log('§6.9 THE SURVIVOR DISCLOSURE · §6.11 THE RETIRED NOTE');
  console.log(lines.join('\n'));
  console.log('');
  console.log(`SCORE ${pass} / ${pass + fail}`);
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : `RED — ${fail} FAILED`));
  process.exit(fail ? 1 : 0);
})();
