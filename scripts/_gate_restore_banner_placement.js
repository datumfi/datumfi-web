/* @gate-pool: browser */
'use strict';
/* _gate_restore_banner_placement.js — STANDING GATE for FINDING 61.
 *
 * THE CLAIM: the session-restore banner is USABLE — it obscures no live control, it coexists with
 * the consent bar that owns the bottom band, it LEAVES AS ONE UNIT when its hold expires, and it
 * says what the Architect authored.
 *
 * ⛔ WHY THIS EXISTS. showRestoredBanner() had NEVER RENDERED in the product's lifetime: its only
 *    caller is restoreDraft(), dead since it was written (F56). Forced to run for the first time on
 *    2026-08-31, it landed on the "Shape You Have" toggle — banner x 531-909 / y 60-97 against the
 *    toggle's x 793-921 / y 70-97, a 116x27px overlap at 12% ALPHA, so both strings printed through
 *    each other and neither was legible.
 * 🔑 A COMPONENT THAT HAS NEVER RENDERED HAS NEVER BEEN LAID OUT EITHER. Its copy was reviewable on
 *    paper; its GEOMETRY was not. Its conflicts were not absent — they were UNKNOWN.
 *
 * ⛔ THE SECOND DEFECT, AND ITS FIRST FIX WAS WRONG IN THE OTHER DIRECTION. Originally the only
 *    route to the choice was a button that DELETED ITSELF after nine seconds.
 * ~~🔑 THE TIMED-ACTION LAW: A NOTICE MAY EXPIRE. AN ACTION MAY NOT.~~ SUPERSEDED 2026-09-01,
 *    struck rather than deleted. That law produced an implementation that PERSISTED FOREVER: at
 *    ~11s the notice was gone and the button remained, 124px wide, re-centred, with no exit but to
 *    be PRESSED — and pressing it DISCARDED the fields that had just been restored.
 * 🔑 THE UNIT LAW, WHICH REPLACES IT: NOTICE AND ACTION ARE ONE UNIT WITH ONE LIFETIME. The hold
 *    is 5s + a 0.5s fade and the whole thing leaves together, taking its MutationObserver with it.
 *    A CONTROL THAT CANNOT BE DISMISSED IS FURNITURE, whichever door it arrived by.
 * ⚠ THE RESIDUAL IS NAMED AND ACCEPTED: with the action gone there is no route back to a fresh
 *    start until "<- Overview" becomes the permanent door. Queued, and now load-bearing.
 *
 * ⛔ L2 IS THE HONEST HALF AND IT GUARDS THE OBVIOUS FIX. Bottom-anchoring is the ruled remedy, and
 *    a naive `bottom:20px` REPRODUCES F61 AT THE OTHER END: #privacy-banner is position:fixed,
 *    FULL WIDTH, the bottom 56px, and shares z-index 9999 with this banner — a tie settled by paint
 *    order. MEASURED, and the overlap is REACHABLE, not theoretical: the restore fires on reload and
 *    the consent bar persists until clicked, so a mid-session reload without a prior "Got it" shows
 *    both. L2 is GREEN on the unfixed build (the banner is at the TOP) and must STAY green.
 *
 * ⭐ IT TRAVELS THE REAL PATH. This gate SHIPPED AS HANDLER ONLY — it forced the banner by exposing
 *    a private function, because its natural caller was dead (F56) and there was no path to walk.
 *    ITS OWN TEXT CARRIED THE EXPIRY CONDITION, AND F56 COMMIT 2 FIRED IT: the fixture now types a
 *    Profile, RELOADS THE PAGE, and lets restoreDraft() raise the banner by itself. Nothing is
 *    exposed, nothing is forced, and studio.html is served UNMODIFIED.
 * 🔑 A DELIBERATE LIMITATION THAT NAMES WHEN IT STOPS BEING ACCEPTABLE CANNOT QUIETLY BECOME A
 *    PERMANENT BLIND SPOT. This is that condition being honoured rather than inherited.
 *
 * PREDICTED ON UNFIXED BYTES: L1 L3 L4 RED · L0 L2 L5 GREEN.
 *   L0 L5 are the instrument and the honest half of the ACTION (the button must still clear the
 *   Studio); L2 is the honest half of the PLACEMENT. If L0 or L5 ever red, no verdict above them
 *   may be believed.
 *
 * Run: node scripts/_gate_restore_banner_placement.js    (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

/* ⛔ AUTHORED COPY, §82.934 — wired VERBATIM, and asserted here so a paraphrase cannot drift in.
   It says "your last session", NOT "your profile": until F56 commit 2 is measured nobody knows
   which fields the restore returns (the draft stores plan_end_age as an integer and the date
   strings nowhere), and a sentence promising "everything" would be the product lying on the very
   commit that wakes it. */
const COPY_NOTICE = 'Picked up where you left off — your last session is back.';
const COPY_BUTTON = 'Start fresh';

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

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

/* FIXTURE, STATED IN FULL: fresh page -> "Start from Scratch" -> _studioEnterRoom('data').
   ⛔ THE CONSENT BAR IS LEFT UP ON PURPOSE. Dismissing it would be a setup step that makes the test
   TYPICAL and hides the very collision L2 exists to catch — the reachable state is a mid-session
   reload by a user who never clicked "Got it". */
async function boot(ctx, BASE) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(900);
  /* THE REAL PATH: type a Profile, let the 400ms-debounced autosave land, then RELOAD. The banner
     is raised by restoreDraft() itself — no handler is called and nothing is exposed.
     ⛔ DO NOT RE-ENTER AFTER THE RELOAD: clicking "Start from Scratch" is a real user action that
     DISCARDS the restored session, and it would throw away the very state under test. */
  await page.evaluate(() => {
    const d = document.getElementById('pri-dob');
    d.focus(); d.value = '04 / 1977';
    d.dispatchEvent(new Event('input', { bubbles: true }));
    d.dispatchEvent(new Event('change', { bubbles: true }));
    d.blur();
  });
  await page.waitForTimeout(1600);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  /* ⛔ THE OVERLAY RETURNS ON A RELOAD, AND ONLY ONE EXIT PRESERVES THE SESSION.
     "Start from Scratch" DISCARDS the restored draft — correctly, it is what it says. The X
     (#studioCloseIntro -> dismissOverlay) is the exit that KEEPS it, which
     scripts/_gate_overlay_x_preserves.js already proves independently.
     🔑 SO THIS IS THE ONLY REAL PATH ON WHICH THE RESTORE BANNER IS EVER SEEN, and it took
        travelling it to discover that the banner had to WAIT for this click. */
  await page.evaluate(() => { const x = document.getElementById('studioCloseIntro'); if (x) x.click(); });
  /* ⛔ WAIT FOR THE BANNER; DO NOT SLEEP PAST IT. This was a flat 1800ms. The hold is now 5s + a
     0.5s fade, so a fixed sleep spends a third of the window the later legs need in order to observe
     anything — and a fixed sleep racing its own subject is the flake species we have already paid
     for. Returning the moment it appears gives every leg the widest margin. If it NEVER appears we
     fall through rather than throw, so L0 still runs and reports ABSENT instead of the gate dying in
     setup and printing no score at all. */
  await page.waitForFunction(() => !!document.getElementById('draft-restored-banner'), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  return page;
}

const overlaps = (page) => page.evaluate(() => {
  const b = document.getElementById('draft-restored-banner');
  if (!b) return { missing: true };
  const br = b.getBoundingClientRect();
  const hits = [];
  document.querySelectorAll('button,[role="button"],a,select,input').forEach((el) => {
    if (el === b || b.contains(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 8) return;
    const ox = Math.min(br.right, r.right) - Math.max(br.left, r.left);
    const oy = Math.min(br.bottom, r.bottom) - Math.max(br.top, r.top);
    if (ox > 2 && oy > 2) {
      hits.push({ txt: (el.textContent || el.id || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 34),
        px: Math.round(ox) + 'x' + Math.round(oy) });
    }
  });
  const pb = document.getElementById('privacy-banner');
  let consent = null;
  if (pb && getComputedStyle(pb).display !== 'none') {
    const pr = pb.getBoundingClientRect();
    const ox = Math.min(br.right, pr.right) - Math.max(br.left, pr.left);
    const oy = Math.min(br.bottom, pr.bottom) - Math.max(br.top, pr.top);
    consent = { present: true, rect: 'y ' + Math.round(pr.top) + '-' + Math.round(pr.bottom),
      overlap: (ox > 2 && oy > 2) ? Math.round(ox) + 'x' + Math.round(oy) : 'none' };
  }
  const seen = new Set();
  return {
    banner: 'x ' + Math.round(br.left) + '-' + Math.round(br.right) + '  y ' + Math.round(br.top) + '-' + Math.round(br.bottom),
    hits: hits.filter((h) => { const k = h.txt + h.px; if (seen.has(k)) return false; seen.add(k); return true; }),
    consent
  };
});

(async () => {
  await new Promise((r) => server.listen(8183, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8183';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);
  const p = await boot(ctx, BASE);

  const arrivedByItself = await p.evaluate(() => !!document.getElementById('draft-restored-banner'));
  const geo = await overlaps(p);

  check('L0 INSTRUMENT: the banner arrived BY ITSELF after a reload, with real geometry, consent bar up',
    arrivedByItself && !geo.missing && geo.consent && geo.consent.present,
    'arrivedByItself=' + arrivedByItself + ' banner=' + (geo.missing ? 'ABSENT' : geo.banner)
    + ' consentBar=' + (geo.consent ? geo.consent.rect : 'ABSENT'));

  /* ── L1 — THE F61 DEFECT ITSELF. */
  check('L1 PLACEMENT: the banner obscures no live control',
    Array.isArray(geo.hits) && geo.hits.length === 0,
    geo.hits && geo.hits.length ? geo.hits.map((h) => '"' + h.txt + '" overlap ' + h.px + 'px').join(' · ') : 'none');

  /* ── L2 — HONEST HALF OF THE PLACEMENT: bottom-anchoring must not trade one collision for another. */
  check('L2 HONEST HALF: the banner does not collide with the consent bar that owns the bottom band',
    geo.consent && geo.consent.overlap === 'none',
    geo.consent ? 'consent ' + geo.consent.rect + '  overlap=' + geo.consent.overlap : 'consent bar absent — L2 could not have failed');

  /* ── L4 — THE AUTHORED COPY, VERBATIM. Read BEFORE any wait: see the ordering note at L3. */
  const copy = await p.evaluate(() => {
    const b = document.getElementById('draft-restored-banner');
    if (!b) return { gone: true };
    const btn = b.querySelector('button');
    const notice = (b.textContent || '').replace(btn ? btn.textContent : '', '').trim();
    return { notice, button: btn ? btn.textContent.trim() : '(none)' };
  });
  check('L4 COPY: the notice and the button carry the authored strings verbatim',
    !copy.gone && copy.notice === COPY_NOTICE && copy.button === COPY_BUTTON,
    'notice=' + JSON.stringify(copy.notice) + '\n          button=' + JSON.stringify(copy.button)
    + '\n          wanted=' + JSON.stringify(COPY_NOTICE) + ' / ' + JSON.stringify(COPY_BUTTON));

  /* ── L5 — HONEST HALF OF THE ACTION: the button must still DO its job. F61 is bounded to
        placement / legibility / timer / copy — clearDraftAndRefresh is unchanged and separately
        gated — so this asserts only that the wiring survived the move.
        ⛔ IT RUNS ON A FRESH BANNER, BEFORE ANY WAIT. Clicking DESTROYS the banner, so it cannot
        share a page with the timing leg. */
  const worked = await p.evaluate(() => {
    const d = document.getElementById('pri-dob');
    if (d) { d.value = '04 / 1977'; d.dispatchEvent(new Event('input', { bubbles: true })); }
    const before = d ? d.value : null;
    const b = document.getElementById('draft-restored-banner');
    const btn = b ? b.querySelector('button') : null;
    if (!btn) return { ran: false, before };
    btn.click();
    return { ran: true, before };
  });
  await p.waitForTimeout(800);
  const afterVal = await p.evaluate(() => { const d = document.getElementById('pri-dob'); return d ? d.value : null; });
  check('L5 HONEST HALF: clicking the action still returns the Studio to a cold first entry',
    worked.ran && worked.before && afterVal === '',
    'typed=' + JSON.stringify(worked.before) + ' afterClick=' + JSON.stringify(afterVal) + ' clicked=' + worked.ran);
  await p.close();

  /* ── L3 — THE UNIT LAW. ⛔ THIS REPLACES THE TIMED-ACTION LAW, WHICH THIS GATE ENCODED
        FAITHFULLY AND WHICH HAS BEEN SUPERSEDED. The old leg asserted 'the action outlives the
        notice' — and it passed for the entire life of a build in which the action outlived
        EVERYTHING. Architect-ruled 2026-09-01: notice and action are ONE UNIT, ONE LIFETIME.
        ⛔ RED-FIRST, MEASURED BEFORE THIS LEG WAS WRITTEN: run against the fixed bytes the OLD L3
        printed actionPresent=false and went RED while all five other legs stayed GREEN. The
        superseded law really was encoded here — this is a REPLACEMENT, not the quiet deletion of
        a leg that had stopped biting.
        ⛔ IT IS A PAIR ON PURPOSE. 'The banner is gone' is satisfied by a banner that NEVER
        RENDERED — which is precisely the F56 species this gate exists to catch, and it would go
        green on the very regression that matters most. L3a proves the unit was up and working
        first, so L3b's absence can only mean DEPARTED, never ABSENT.
        ⛔ NEITHER LEG PINS THE 5000. They BRACKET it — whole well inside the hold, gone well past
        the fade. The product owns the constant; the gate owns the relationship. */
  const p2 = await boot(ctx, BASE);
  const early = await p2.evaluate(() => {
    const b = document.getElementById('draft-restored-banner');
    if (!b) return { up: false };
    const note = document.getElementById('draft-restored-note');
    const btn = b.querySelector('[data-restore-action]');
    if (!btn) return { up: true, note: !!note, action: false };
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { up: true, note: !!note, action: r.width > 8 && r.height > 8,
      clickable: top === btn || btn.contains(top), rect: 'y ' + Math.round(r.top) + '-' + Math.round(r.bottom) };
  });
  check('L3a HONEST HALF: inside the hold the unit is WHOLE — notice and a clickable action, both present',
    early.up && early.note && early.action && early.clickable,
    'banner=' + early.up + ' notice=' + !!early.note + ' action=' + early.action
    + ' clickable=' + (early.clickable === undefined ? 'n/a' : early.clickable) + (early.rect ? ' ' + early.rect : ''));

  await p2.waitForTimeout(7000);
  const late = await p2.evaluate(() => ({
    banner: !!document.getElementById('draft-restored-banner'),
    note:   !!document.getElementById('draft-restored-note'),
    orphanActions: document.querySelectorAll('[data-restore-action]').length
  }));
  check('L3b UNIT: after the hold the banner has LEFT — no notice, and no orphan action anywhere in the document',
    late.banner === false && late.note === false && late.orphanActions === 0,
    'banner=' + late.banner + ' notice=' + late.note + ' orphanActions=' + late.orphanActions
    + '  (the stranded button measured 124px wide and never left)');
  await p2.close();

  await ctx.close(); await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.log('OVERALL: RED');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
