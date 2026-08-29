/* @gate-pool: browser
 *
 * ⛔⛔ THE SPINE ROOMS — CLICKING A PHASE ENTERS A ROOM, IT DOES NOT SCROLL YOU DOWN A PAGE.
 *
 * WHY THIS EXISTS: `Captain Datumae` R23 said "Clicking the first one D — DATA will take you to a
 * NEW PAGE" on day one. The Step-1 spec translated that as "additive, lands inert", the build was a
 * nav strip that scrolled, and the Captain smoked it twice and said it was not what he asked for.
 * 🔑 THE FAILURE WAS NEVER THE EXPLANATION; IT WAS THE TRANSLATION INTO THE SPEC — so this gate
 *    asserts the BEHAVIOUR HE DESCRIBED, in his words, rather than the mechanism we happened to build.
 *
 * ⭐⭐ §19.2, CAPTAIN-ORDERED: ASSERT WHAT THE USER SEES — getComputedStyle, NEVER a class name.
 * A hidden section must be PROVEN INVISIBLE, not merely PROVEN UNMARKED. This is not caution; it is
 * a lesson billed 24 hours ago: _gate_canvas_recenter's C6 asserted classList.contains(...) and its
 * own --nohide control PASSED 7/7 while the control sat stuck permanently on screen. THE CLASS IS
 * THE MECHANISM; COMPUTED STYLE IS THE OUTCOME. Every leg below reads display, never className.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 * R1 · LANDING IS ONLY THE DATUMAE   zero .studio-section visible on load, and the formula IS shown.
 *                                    Both halves: "nothing visible" is also true of a broken page.
 * R2 · EVERY ROOM SHOWS ITS OWN      for all seven phases, the visible section set is EXACTLY the
 *                                    expected one. Named sections, not a count — a count cannot tell
 *                                    "the right two" from "two of the wrong ones", and Architecture
 *                                    shipped exactly that defect during the build (view-s2 dragged
 *                                    Operating Upkeep in, which belongs to Tension).
 * R3 · THE WALK IS REAL              the continue control reads "Next: {NEXT PHASE}" for six phases
 *                                    and "Back to The Studio" on the seventh. ⛔ NEVER DISABLED.
 * R4 · BOTH EXITS WORK               ← The Studio is REACHABLE (elementFromPoint) and CLICKING it
 *                                    returns to the landing. Driven by a real click: a handler that
 *                                    works behind an unreachable button is the defect we shipped once.
 * R5 · NO DOCUMENT SCROLL            entering a room leaves window.scrollY at 0. The OLD build used
 *                                    scrollIntoView here, which scrolls every ancestor including the
 *                                    document — that was the trigger for the one-way scroll trap.
 *                                    This leg is what stops it being reintroduced.
 * R6 · ALIGNMENT IS HONEST           VI owns no section; its room shows its authored waiting line
 *                                    rather than a blank panel, which would read as broken.
 * R7 · NO CONSOLE ERRORS             across the entire seven-room walk.
 *
 * ── CONTROLS · RED-FIRST BY MUTATION ────────────────────────────────────────────────────────────
 *   --noboot   removes the data-room="landing" boot, i.e. the landing never engages. R1 MUST go RED.
 *   --leak     restores view-s2's unscoped spotlight, reproducing the EXACT defect found during the
 *              build: Operating Upkeep leaking into the Architecture room. R2 MUST go RED, and it
 *              must name the section. A control that fails for a different reason than the original
 *              bug is not a control.
 *   --twohead  restores view-s2's .s2-header rule, reproducing the DOUBLE PHASE HEADER the Captain
 *              found in the Architecture room. R2's uniqueness leg MUST go RED.
 *   --twofwd   restores the "See the Tension ->" CTA alongside the room's Next control, reproducing
 *              the TWO FORWARD BUTTONS he found. R3's uniqueness leg MUST go RED.
 *   ⛔ BOTH exist because the two uniqueness legs were added AFTER the defects were already fixed,
 *   and a leg written after the fact has never seen the thing it claims to catch. THEY ARE THE ONLY
 *   PROOF THOSE LEGS BITE.
 *
 * Usage: node scripts/_gate_phase_rooms.js [LABEL] [--noboot|--leak]
 * Self-hosts on 127.0.0.1:8384 — NOT :8001, the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const NOBOOT = process.argv.includes('--noboot');
const LEAK = process.argv.includes('--leak');
const TWOHEAD = process.argv.includes('--twohead');
const TWOFWD = process.argv.includes('--twofwd');
const PORT = 8384;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* THE CONTRACT — a mirror of the product's own markup, never an independent opinion. If a section
   moves phase, the data-phase attribute moves and THIS TABLE must move with it, loudly. */
const EXPECT = [
  { id: 'data',         label: 'PHASE I — DATA',           secs: ['00 / Architect Profile', '01 / Sketch Inputs'], next: 'Next: ARCHITECTURE' },
  { id: 'architecture', label: 'PHASE II — ARCHITECTURE',  secs: ['02 / Estate Drafting — Accounts & Assets'],     next: 'Next: TENSION' },
  { id: 'tension',      label: 'PHASE III — TENSION',      secs: ['03 / Operating Upkeep — Living Expenses'], next: 'Next: UNCERTAINTY' },
  { id: 'uncertainty',  label: 'PHASE IV — UNCERTAINTY',   secs: ['05 / Income Timing — Social Security & Pensions'], next: 'Next: MEASUREMENT' },
  { id: 'measurement',  label: 'PHASE V — MEASUREMENT',    secs: ['06 / Climate Control — Market Outlook'],        next: 'Next: ALIGNMENT' },
  { id: 'alignment',    label: 'PHASE VI — ALIGNMENT',     secs: [],                                              next: 'Next: ENDURANCE' },
  { id: 'endurance',    label: 'PHASE VII — ENDURANCE',    secs: ['04 / DEFINE YOUR DATUM'],                       next: 'Back to The Studio' },
];

const readAsset = (urlPath) => {
  const f = path.resolve(ROOT, '.' + urlPath);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8');
};

const NOBOOT_T = "  if (l && !l.getAttribute('data-room')) l.setAttribute('data-room', 'landing');";
const NOBOOT_B = "  /* boot removed by --noboot */";
const LEAK_T = '.studio-layout.view-s2:not([data-room]) .drafting-panel > .studio-section.s2-spotlight { display: block; }';
const LEAK_B = '.studio-layout.view-s2 .drafting-panel > .studio-section.s2-spotlight { display: block; }';

const TWOHEAD_T = '  .studio-layout[data-room].view-s2 .s2-header { display: none; }';
const TWOHEAD_B = '  /* header suppression removed by --twohead */';
const TWOFWD_T = '  .studio-layout[data-room] .see-tension-cta { display: none; }';
const TWOFWD_B = '  /* CTA suppression removed by --twofwd */';

let SERVE_HTML = null, SERVE_LANDING = null;
for (const [on, t, b, name] of [[TWOHEAD, TWOHEAD_T, TWOHEAD_B, '--twohead'], [TWOFWD, TWOFWD_T, TWOFWD_B, '--twofwd']]) {
  if (!on) continue;
  SERVE_HTML = SERVE_HTML || readAsset('/studio.html');
  const n = SERVE_HTML.split(t).length - 1;
  if (n !== 1) { console.log(`[phase_rooms] ABORT — ${name} anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(t, b);
}
if (LEAK) {
  SERVE_HTML = readAsset('/studio.html');
  const n = SERVE_HTML.split(LEAK_T).length - 1;
  if (n !== 1) { console.log(`[phase_rooms] ABORT — --leak anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(LEAK_T, LEAK_B);
}
if (NOBOOT) {
  SERVE_LANDING = readAsset('/scripts/studio-landing.js');
  const n = SERVE_LANDING.split(NOBOOT_T).length - 1;
  if (n !== 1) { console.log(`[phase_rooms] ABORT — --noboot anchor found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_LANDING = SERVE_LANDING.replace(NOBOOT_T, NOBOOT_B);
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (SERVE_HTML && u === '/studio.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(SERVE_HTML); }
  if (SERVE_LANDING && u === '/scripts/studio-landing.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(SERVE_LANDING); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

/* ⛔⛔ VISIBILITY IS AN ANCESTOR QUESTION, AND getComputedStyle CANNOT ANSWER IT.
   MEASURED 2026-08-14: this gate's own forward-control leg reported TWO controls in four rooms that
   plainly showed one. `.s2-entry-row` was display:none and its BUTTON was not — a child of a hidden
   parent keeps its own computed display, so the check said "visible" about something no user can see.
   🔑 I WROTE A LEG WHOSE WHOLE CLAIM WAS "ASSERT WHAT THE USER SEES" AND IT ASSERTED A STYLE
      PROPERTY INSTEAD. getClientRects() IS EMPTY WHENEVER THE ELEMENT OR ANY ANCESTOR IS DISPLAY:NONE
      — that is the rendered truth, and it is the only thing that survives being nested.
   ⚠️ visibility:hidden DOES produce rects, so it is checked separately: it is how the Clerk seed
      gate hides the whole layout, and it fools hit-testing exactly like display:none. */
const VIS_FN = `(e) => {
  if (!e || e.getClientRects().length === 0) return false;
  return getComputedStyle(e).visibility !== 'hidden';
}`;

const fails = [];
const fail = (leg, msg) => fails.push(`${leg}: ${msg}`);
const eqSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

(async () => {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });

  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
  /* ⛔ WAIT FOR THE LANDING TO HAVE *PAINTED*, NOT MERELY FOR THE SCRIPT TO EXIST.
     MEASURED: one run in seven went red with TWO R1 findings — sections visible AND rows != 7 —
     which is the exact signature of reading the panel before _studioLandingBoot fires at
     DOMContentLoaded + 300ms. The seven phase rows are the observable proof the boot has run.
     🔑 THIS IS A SETUP PRECONDITION, NOT THE ASSERTION. We wait for the landing to have RENDERED;
        R1 still independently asserts WHAT IT SHOWS (no sections, formula visible). --noboot leaves
        the rows painting normally and only removes the data-room boot, so the control still bites.
     ⚠️ AN INTERMITTENT LEG IS WORSE THAN A MISSING ONE — it teaches you to discount the gate. */
  await page.waitForFunction(() => {
    const w = document.getElementById('studioOverlayWrap');
    if (w) { const c = getComputedStyle(w); if (!(c.pointerEvents === 'none' || c.opacity === '0' || c.display === 'none')) return false; }
    const l = document.getElementById('studio-layout');
    if (!l || l.classList.contains('seed-gated')) return false;
    if (typeof window._studioEnterRoom !== 'function') return false;
    return document.querySelectorAll('#sl-movements-host .sl-phase').length === 7;
  }, null, { timeout: 9000 }).catch(() => fail('R0 PRECONDITION', 'the landing never finished painting in 9s (overlay still interactive, .seed-gated still set, _studioEnterRoom missing, or fewer than 7 phase rows) — every leg below would be measuring an unbuilt page'));

  // ── R1 · THE LANDING IS ONLY THE DATUMAE ──────────────────────────────────────────────────────
  const landing = await page.evaluate((VF) => { /* ⚠️ RENAMED FROM formulaShown ON 2026-08-28. This predicate reads .s1-header's VISIBILITY, and it
   always did — but the formula it was named after left the page in the same commit. The check would
   have stayed GREEN and stayed MEANINGFUL, just not meaning what its name said.
   🔑 THAT IS NOT AN EMPTY-SET GREEN, IT IS A GREEN UNDER A RENAMED CLAIM: a vacuous pass leaves no
   trace, but this one leaves a MISLEADING trace the next reader would cite. */
const _vis = eval(VF); return ({
    sections: (() => Array.from(document.querySelectorAll('.drafting-panel > .studio-section'))
      .filter(_vis)
      .map((e) => { const t = e.querySelector('.section-tag span'); return t ? t.textContent.trim() : '(unnamed)'; }))(),
    landingHeaderShown: (() => { const f = document.querySelector('.s1-header'); return _vis(f); })(),
    phaseRows: document.querySelectorAll('#sl-movements-host .sl-phase').length,
  }); }, VIS_FN);
  if (landing.sections.length) fail('R1 LANDING', `${landing.sections.length} section(s) still visible on the landing — ${JSON.stringify(landing.sections)}. It must be ONLY the Datumae.`);
  /* ⛔ THE PRESENCE HALF. "Zero sections visible" is also true of a page that failed to render, so
     the formula and its seven rows must be PROVEN PRESENT or R1 is vacuous. */
  if (!landing.landingHeaderShown) fail('R1 LANDING', 'the Datumae formula block is not visible — "no sections" would be vacuously true of a blank panel');
  if (landing.phaseRows !== 7) fail('R1 LANDING', `expected 7 clickable phase rows, found ${landing.phaseRows}`);

  // ── R2/R3/R5/R6 · EVERY ROOM ──────────────────────────────────────────────────────────────────
  const seen = [];
  for (const want of EXPECT) {
    await page.evaluate((id) => window._studioEnterRoom(id), want.id);
    await page.waitForTimeout(500);
    const got = await page.evaluate(([expLabel, VF]) => {
      const _vis = eval(VF);
      const vis = Array.from(document.querySelectorAll('.drafting-panel > .studio-section'))
        .filter(_vis)
        .map((e) => { const t = e.querySelector('.section-tag span'); return t ? t.textContent.trim() : '(unnamed)'; });
      /* ⛔ COUNT THE HEADERS THE USER CAN ACTUALLY SEE. The Captain found the Architecture room
         rendering its phase header TWICE — the room's, then view-s2's legacy .s2-header underneath
         it — and THIS GATE WAS GREEN THROUGHOUT, because it asserted that the room label SAYS the
         right thing and never that it is the ONLY thing saying it.
         🔑 ASSERTING A THING IS PRESENT AND CORRECT SAYS NOTHING ABOUT WHAT ELSE IS ON SCREEN.
            Uniqueness is its own claim and needs its own count. */
      const headerish = Array.from(document.querySelectorAll('.sl-room-label, .s2-header, .s1-header'))
        .filter(_vis).length;
      /* ⛔ AND COUNT THE FORWARD CONTROLS. The Captain found Architecture showing TWO — "See the
         Tension →" and "Next: TENSION →", different designs, same destination — and this gate was
         green, because it checked that the Next button SAYS the right thing and never that it is
         the only way forward. 🔑 TWO EXITS ON ONE SCREEN DO NOT OFFER A CHOICE, THEY CREATE A DOUBT. */
      const forwards = Array.from(document.querySelectorAll('.sl-room-next, .see-tension-cta, .s2-enter-btn'))
        .filter(_vis).length;
      const lab = document.querySelector('.sl-room-label');
      const nxt = document.querySelector('.sl-room-next');
      const formula = document.querySelector('.s1-header');
      const empty = document.getElementById('sl-room-empty');
      return {
        vis,
        label: _vis(lab) ? lab.textContent.trim() : null,
        next: _vis(nxt) ? nxt.textContent.trim() : null,
        nextDisabled: nxt ? !!nxt.disabled : null,
        landingHeaderShown: _vis(formula),
        emptyShown: _vis(empty),
        emptyText: empty ? empty.textContent.trim().slice(0, 60) : null,
        headerish,
        forwards,
        scrollY: Math.round(window.scrollY),
        expLabel,
      };
    }, [want.label, VIS_FN]);
    seen.push({ id: want.id, vis: got.vis, next: got.next });

    if (!eqSet(got.vis, want.secs)) fail('R2 ROOM ' + want.id.toUpperCase(), `visible sections are ${JSON.stringify(got.vis)}, expected ${JSON.stringify(want.secs)}`);
    if (got.label !== want.label) fail('R2 ROOM ' + want.id.toUpperCase(), `header reads ${JSON.stringify(got.label)}, expected ${JSON.stringify(want.label)}`);
    if (got.landingHeaderShown) fail('R2 ROOM ' + want.id.toUpperCase(), 'the landing Datumae is still visible inside a room — the room is additive, not a room');
    if (got.headerish !== 1) fail('R2 ROOM ' + want.id.toUpperCase(), `${got.headerish} phase headers are visible at once, expected exactly 1 — a room that states its own name twice`);
    if (got.forwards !== 1) fail('R3 WALK ' + want.id.toUpperCase(), `${got.forwards} forward controls are visible at once, expected exactly 1 — two exits on one screen create a doubt, not a choice`);
    if (!got.next || got.next.indexOf(want.next) !== 0) fail('R3 WALK ' + want.id.toUpperCase(), `continue control reads ${JSON.stringify(got.next)}, expected it to start ${JSON.stringify(want.next)}`);
    if (got.nextDisabled) fail('R3 WALK ' + want.id.toUpperCase(), 'the continue control is DISABLED — a greyed control at the end of a method reads as a missing feature, never a finished walk');
    if (got.scrollY !== 0) fail('R5 NO-SCROLL', `entering ${want.id} scrolled the document to ${got.scrollY} — the old build used scrollIntoView here and it was the trigger for the one-way scroll trap`);
    if (want.secs.length === 0 && !got.emptyShown) fail('R6 ALIGNMENT', 'the section-less room shows no waiting line — a blank panel reads as broken');
  }

  /* ── R3b · THE FORWARD CONTROL IS STILL UNIQUE ONCE AN ESTATE EXISTS ─────────────────────────
     ⛔ THE WALK ABOVE RUNS ON AN EMPTY STUDIO, AND THAT MADE R3's UNIQUENESS LEG VACUOUS FOR THE
     REAL CASE. "See the Tension →" is shown by refreshDraftingState ONLY while an estate is being
     drafted, so with zero accounts it is inline-hidden and could never have appeared beside the
     room's Next button — the --twofwd control PASSED, proving the leg, not the product.
     🔑 A FIXTURE THAT CANNOT REACH THE FAILING STATE TURNS A CONTROL INTO A REASSURANCE. The Captain
        hit this because he HAS an estate; the gate has to have one too. */
  /* ⚠️ AN INVESTABLE ACCOUNT, NOT A PROPERTY — MEASURED. _estateDrafting() requires
     _investableNow() > 0, and DatumBlueprint.investableTotal does not count a house: a property is an
     ASSET, not investable capital — and neither is 'checking', which BASE_TO_BUCKET omits on purpose.
     The investable buckets are roth / taxable / traditional ONLY. Seeding either produced an estate
     the product correctly
     refused to call "drafting", and the fixture leg below said so instead of passing quietly.
     🔑 SEEDING *SOMETHING* IS NOT SEEDING *THE PRECONDITION*. Assert the predicate, not the count. */
  await page.evaluate(() => {
    try { window.state.accounts = []; addInstance('taxable');
      window.state.accounts.forEach((a) => { a.value = 400000; });
      updateSVGs(); if (window.refreshDraftingState) window.refreshDraftingState(); } catch (e) {}
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => window._studioEnterRoom('architecture'));
  await page.waitForTimeout(600);
  const drafted = await page.evaluate((VF) => {
    const _vis = eval(VF);
    const cta = document.querySelector('.see-tension-cta');
    return {
      forwards: Array.from(document.querySelectorAll('.sl-room-next, .see-tension-cta, .s2-enter-btn')).filter(_vis).length,
      ctaInlineDisplay: cta ? (cta.style.display === '' ? '(cleared — the drafting state IS live)' : cta.style.display) : '(absent)',
      accounts: (window.state && window.state.accounts || []).length,
      investable: (window.DatumBlueprint && window.state) ? DatumBlueprint.investableTotal({ accounts: window.state.accounts }) : 0,
    };
  }, VIS_FN);
  if (!drafted.accounts) fail('R3b FIXTURE', 'no account was drafted — the drafting state never went live, so the uniqueness check below is vacuous');
  else if (!drafted.investable) fail('R3b FIXTURE', `the seeded account is not INVESTABLE (investableTotal=${drafted.investable}) — _estateDrafting() stays false and the CTA can never appear`);
  else if (drafted.ctaInlineDisplay === 'none') fail('R3b FIXTURE', 'the See-the-Tension CTA is still inline-hidden with an estate present — refreshDraftingState did not engage, so --twofwd could not bite');
  else if (drafted.forwards !== 1) fail('R3b WALK ARCHITECTURE (drafted)', `${drafted.forwards} forward controls visible with an estate drafted, expected exactly 1`);

  // ── R4 · THE EXIT IS REACHABLE, AND CLICKING IT RETURNS TO THE LANDING ────────────────────────
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => {
    const b = document.querySelector('.sl-room-back');
    if (!b) return { present: false };
    const r = b.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return { present: true, box: false, display: getComputedStyle(b).display };
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') : 'NULL(off-viewport)');
    return { present: true, box: true, reachable: hit === b || b.contains(hit), hit: d(hit), text: b.textContent.trim() };
  });
  if (!back.present) fail('R4 EXIT', 'no ← The Studio control in the room');
  else if (!back.box) fail('R4 EXIT', `← The Studio has a zero box (display:${back.display})`);
  else if (!back.reachable) fail('R4 EXIT', `← The Studio is not hit-testable at its own centre — elementFromPoint returned ${back.hit}`);
  else {
    await page.click('.sl-room-back');
    await page.waitForTimeout(600);
    const afterExit = await page.evaluate((VF) => { const _vis = eval(VF); return ({
      sections: Array.from(document.querySelectorAll('.drafting-panel > .studio-section')).filter(_vis).length,
      landingHeaderShown: (() => { const f = document.querySelector('.s1-header'); return _vis(f); })(),
    }); }, VIS_FN);
    if (!afterExit.landingHeaderShown) fail('R4 EXIT', 'clicking ← The Studio did not restore the Datumae landing');
    if (afterExit.sections) fail('R4 EXIT', `${afterExit.sections} section(s) visible after returning to the landing`);
  }

  if (errs.length) fail('R7 NO-THROW', `${errs.length} page error(s): ${errs.slice(0, 3).join(' | ')}`);

  await browser.close();
  server.close();

  const mode = NOBOOT ? ' [--noboot]' : LEAK ? ' [--leak]' : TWOHEAD ? ' [--twohead]' : TWOFWD ? ' [--twofwd]' : '';
  console.log('  landing    : sections=' + JSON.stringify(landing.sections) + ' formula=' + landing.landingHeaderShown + ' rows=' + landing.phaseRows);
  seen.forEach((s) => console.log('  ' + s.id.padEnd(13) + JSON.stringify(s.vis) + '  ->  ' + JSON.stringify(s.next)));
  console.log('  ← The Studio: ' + (back.present ? (back.reachable ? 'reachable "' + back.text + '"' : 'UNREACHABLE, hit=' + back.hit) : 'ABSENT'));
  fails.forEach((f) => console.log('  FAIL  ' + f));
  const LEGS = 7;
  console.log(fails.length === 0
    ? `[phase_rooms] ${LABEL}${mode} — PASS ${LEGS}/${LEGS} legs GREEN`
    : `[phase_rooms] ${LABEL}${mode} — FAIL ${fails.length} finding(s) RED across ${LEGS} legs`);
  process.exit(fails.length === 0 ? 0 : 1);
})();
