/* @gate-pool: browser */
'use strict';
/* _gate_restore_banner_placement.js — STANDING GATE for FINDING 61.
 *
 * THE CLAIM: the session-restore banner is USABLE — it obscures no live control, it coexists with
 * the consent bar that owns the bottom band, its action outlives the notice, and it says what the
 * Architect authored.
 *
 * ⛔ WHY THIS EXISTS. showRestoredBanner() had NEVER RENDERED in the product's lifetime: its only
 *    caller is restoreDraft(), dead since it was written (F56). Forced to run for the first time on
 *    2026-08-31, it landed on the "Shape You Have" toggle — banner x 531-909 / y 60-97 against the
 *    toggle's x 793-921 / y 70-97, a 116x27px overlap at 12% ALPHA, so both strings printed through
 *    each other and neither was legible.
 * 🔑 A COMPONENT THAT HAS NEVER RENDERED HAS NEVER BEEN LAID OUT EITHER. Its copy was reviewable on
 *    paper; its GEOMETRY was not. Its conflicts were not absent — they were UNKNOWN.
 *
 * ⛔ THE SECOND DEFECT, WHICH PLACEMENT ALONE DOES NOT FIX: the only route to the choice was a
 *    button that DELETED ITSELF after nine seconds.
 * 🔑 THE TIMED-ACTION LAW: A NOTICE MAY EXPIRE. AN ACTION MAY NOT. If the only route to a choice is
 *    a control on a timer, READING the sentence costs the user the option it describes — and the
 *    slower the reader, the more certainly they lose it.
 *
 * ⛔ L2 IS THE HONEST HALF AND IT GUARDS THE OBVIOUS FIX. Bottom-anchoring is the ruled remedy, and
 *    a naive `bottom:20px` REPRODUCES F61 AT THE OTHER END: #privacy-banner is position:fixed,
 *    FULL WIDTH, the bottom 56px, and shares z-index 9999 with this banner — a tie settled by paint
 *    order. MEASURED, and the overlap is REACHABLE, not theoretical: the restore fires on reload and
 *    the consent bar persists until clicked, so a mid-session reload without a prior "Got it" shows
 *    both. L2 is GREEN on the unfixed build (the banner is at the TOP) and must STAY green.
 *
 * ⛔ HANDLER ONLY, WITH ITS EXPIRY CONDITION. The banner is forced by exposing the private function
 *    through ONE served-page line, because its natural caller is dead. THE ELEMENT, ITS MARKUP,
 *    STYLES, BUTTON AND LIFETIME ARE THE PRODUCT'S OWN AND UNTOUCHED.
 *    ⚠️ WHEN F56 COMMIT 2 WAKES restoreDraft(), THIS GATE MUST TRAVEL THE REAL PATH instead.
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

const EXPOSE_ANCHOR = '    window._studioClearDraft = function() {';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (p === '/studio.html') {
    let h = fs.readFileSync(fp, 'utf8');
    if ((h.split(EXPOSE_ANCHOR).length - 1) !== 1) {
      console.log('  ABORT: the expose anchor is not unique in studio.html — the rig cannot force the banner.');
      console.log('\nOVERALL: RED'); process.exit(1);
    }
    h = h.replace(EXPOSE_ANCHOR, '    window.__showRestoredBanner = showRestoredBanner;\n' + EXPOSE_ANCHOR);
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(h); return;
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

  const exposed = await p.evaluate(() => typeof window.__showRestoredBanner === 'function');
  await p.evaluate(() => window.__showRestoredBanner());
  await p.waitForTimeout(500);
  const geo = await overlaps(p);

  check('L0 INSTRUMENT: the banner was forced, rendered, and has real geometry; the consent bar is up',
    exposed && !geo.missing && geo.consent && geo.consent.present,
    'exposed=' + exposed + ' banner=' + (geo.missing ? 'ABSENT' : geo.banner)
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

  /* ── L3 — THE TIMED-ACTION LAW, IN ITS OWN PAGE.
        ⛔ ORDERING IS LOAD-BEARING AND RED-FIRST PROVED IT: this leg's 11s wait DESTROYS the banner
        on the unfixed build, so when it ran first, L4 and L5 red for a DEPENDENT reason
        (notice=undefined, clicked=false) rather than on their own subject. An honest half that reds
        because an earlier leg consumed its fixture is not an honest half.
        ⛔ ASSERTS THE RELATIONSHIP — the action outlives the notice — never a duration. */
  const p2 = await boot(ctx, BASE);
  await p2.evaluate(() => window.__showRestoredBanner());
  await p2.waitForTimeout(11000);
  const late = await p2.evaluate(() => {
    const b = document.getElementById('draft-restored-banner');
    const btn = b ? b.querySelector('button') : document.querySelector('[data-restore-action]');
    if (!btn) return { actionPresent: false, bannerPresent: !!b };
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { actionPresent: r.width > 8 && r.height > 8, bannerPresent: !!b, label: btn.textContent.trim(),
      clickable: top === btn || btn.contains(top), rect: 'y ' + Math.round(r.top) + '-' + Math.round(r.bottom) };
  });
  check('L3 TIMED-ACTION: the Start-fresh action still exists and is clickable after the notice has expired',
    late.actionPresent && late.clickable,
    'actionPresent=' + late.actionPresent + ' clickable=' + (late.clickable === undefined ? 'n/a' : late.clickable)
    + (late.rect ? ' ' + late.rect : '') + '  (a notice may expire; an action may not)');
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
