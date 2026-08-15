/* @gate-pool: browser
 *
 * ⛔⛔ THE EXIT AUDIT — A CONTROL IS PROVEN BY BEING HIT, NEVER BY EXISTING (§14.5, §15.2).
 *
 * THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE, STATED AS THE FAILURE IT PRODUCED (2026-08-13/14):
 *   1. the Captain clicked a phase name on the Studio landing
 *   2. `_studioPhaseGo` called el.scrollIntoView(), which scrolls EVERY scrollable ancestor —
 *      including the DOCUMENT
 *   3. the document scrolled 56px, and #shape-mode-toggle (position:absolute inside the
 *      normal-flow .canvas-wrapper) rode that scroll straight under the 56px FIXED nav
 *   4. body{overflow:hidden} means the wheel, Home and PageUp are all dead
 *   ⇒ THE ONLY EXIT FROM ESTATE MODE WAS COVERED, AND THE ONLY ESCAPE WAS A RELOAD.
 *
 * ⭐⭐ WHY EVERY EXISTING INSTRUMENT WAS BLIND, AND IT IS ONE SENTENCE:
 * THE PREVIOUS SESSION MEASURED THE BUTTON'S RECT AND SAW `top: 14px`, WHICH LOOKS PERFECTLY FINE.
 * A rect cannot tell you something is sitting ON TOP of it. The question nobody asked was
 * `document.elementFromPoint(centre)` — which returns `a.nav-login-btn` and IS the entire diagnosis
 * in one string. 🔑 PRESENCE IS NOT REACHABILITY. `getBoundingClientRect` DESCRIBES A BOX; ONLY
 * HIT-TESTING DESCRIBES A CONTROL.
 *
 * ⛔ AND THE FOUR INGREDIENTS WERE EACH HARMLESS ALONE — overflow:hidden · an 85px footer below the
 * fold · a control riding the page scroll · scrollIntoView touching every ancestor. NOBODY REVIEWS A
 * COMBINATION, WHICH IS WHY THIS HAS TO BE ASSERTED AT THE PAGE LEVEL RATHER THAN PER-FEATURE.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 * W1 · FIXTURE      the exit control is present with a non-zero box (§13.73 — the reachability legs
 *                   below are worthless without a presence leg guarding them; a control that failed
 *                   to render would be trivially "not covered by anything").
 * W2 · NO BUDGET    ⭐ THE CLASS RULE, RULED BY THE CAPTAIN §15.2: A PAGE WHOSE WHEEL IS DISABLED
 *                   MUST NEVER BE SCROLLABLE AT ALL. scrollHeight === clientHeight. This is the leg
 *                   that outlives the button — pin the control and the NEXT thing put near the top
 *                   of the canvas falls into the same hole.
 * W3 · AT REST      elementFromPoint(centre) returns the control, at every viewport.
 * W4 · AFTER USE    ⛔ THE DEFECT ITSELF. Click a landing phase name — the real user action, via the
 *                   real handler — then re-hit-test. This is the leg that went red on d1084e1.
 * W5 · AT EXTREME   force the document to its scroll extreme and re-hit-test. Defence in depth: even
 *                   if some future code scrolls the page, the exit must survive it.
 * W6 · NO DRIFT     after the user action, scrollY is still 0 — the trigger did not move the page.
 *
 * ⚠️ EVERY LEG RUNS AT EIGHT VIEWPORTS, and 1366x768 is in the list deliberately: THE VIEWPORT MOST
 * LIKELY TO SPRING THE TRAP IS THE ONE MOST USERS HAVE. A single-viewport check is how a geometry
 * defect ships green.
 *
 * ── CONTROLS · RED-FIRST BY MUTATION, NOT BY MEMORY ─────────────────────────────────────────────
 *   --defect  in-memory, restores `body{min-height:100vh}` — the EXACT byte the fix changed, and the
 *             one that re-creates the scroll budget: a flex column with an indefinite main size is
 *             content-sized, so `flex:1` on .studio-layout distributes nothing and the 85px footer is
 *             pushed past the fold. W2/W4/W5/W6 MUST go RED. It COUNTS ITS ANCHOR and aborts unless
 *             the mutation lands exactly once — a red-first that did not land proves nothing.
 *   --old     serves `git show 4d72939:studio.html` — the historical control, BEFORE Step 1 shipped
 *             the trigger. ⚠️ W4/W6 CANNOT RUN THERE (no landing exists to click) and are reported
 *             SKIPPED BY NAME rather than silently passed: A GATE THAT CANNOT RUN IS NOT A GREEN.
 *
 * Usage: node scripts/_gate_exit_reachable.js [LABEL] [--defect|--old]
 * Self-hosts on 127.0.0.1:8382 — NOT :8001, which is the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const DEFECT = process.argv.includes('--defect');
const OLD = process.argv.includes('--old');
const OVERLAP = process.argv.includes('--overlap');   // legacy alias, same mutation
const PORT = 8382;

/* THE EXIT CONTROL UNDER AUDIT. A mirror of the product, never an independent opinion — if the
   Estate/Shape control is ever renamed this moves WITH it rather than going quietly blind. */
const EXIT_ID = 'shape-mode-toggle';

/* The eight viewports. 1366x768 and 1280x800 are the cheapest real laptops and carry the least
   scroll headroom; 2560x1440 is the Captain's own screen. */
const VIEWPORTS = [
  { w: 2560, h: 1440 }, { w: 1920, h: 1080 }, { w: 1536, h: 864 }, { w: 1440, h: 900 },
  { w: 1366, h: 768 }, { w: 1280, h: 800 }, { w: 1280, h: 600 }, { w: 1152, h: 600 },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────
   Both COUNT THEIR ANCHOR. A substitution that silently missed would hand back a green --defect
   run, which is the "poison that never landed" failure this repo has paid for before. */
/* ⚠️ BOTH BYTES, NOT ONE. Reverting only the body rule reproduces the CLASS (one-way scroll, covered
   exit) but at a 3,121px budget rather than the 85px that actually shipped. A red-first is worth more
   when it reproduces the SHIPPED SYMPTOM, magnitude included — so the mutation restores the panel's
   calc() too and the budget comes back at exactly 85px. Each pair is counted independently. */
const DEFECT_PAIRS = [
  ['  body {\n    height: 100vh;', '  body {\n    min-height: 100vh;'],
  ['    min-height: 0; overflow-y: auto; background-color: var(--bg-navy); z-index: 50;',
   '    height: calc(100vh - 56px); overflow-y: auto; background-color: var(--bg-navy); z-index: 50;'],
];

/* ⚠️ W7 NEEDS ITS OWN CONTROL. --defect removes the footer from the viewport entirely, so W7 would
   go red there for the WRONG REASON and prove nothing about coverage. --overlap deletes ONLY the
   56px consent-banner reserve, which is the single failure W7 exists to police.
   🔑 A LEG THAT HAS ONLY EVER SEEN AGREEMENT IS NOT EVIDENCE, AND A LEG WHOSE ONLY CONTROL FAILS IT
      FOR A DIFFERENT REASON IS NOT EVIDENCE EITHER. */
/* ⛔⛔ THIS CONTROL WAS REPOINTED 2026-08-14, BECAUSE IT SILENTLY STOPPED BITING.
   It used to delete the consent-banner reserve, reproducing a collision between the banner and the
   disclosure footer. §18.2 moved the footer into the panel's own scroll and that collision ceased to
   exist — so the mutation ran, landed, and W7 PASSED. A CONTROL THAT CANNOT FAIL IS A REASSURANCE
   WEARING A CONTROL'S NAME, and it had already earned a green I would have believed.
   ⭐ IT NOW REPRODUCES THE ORIGINAL §15.3 FINDING INSTEAD, which is the thing W7 actually claims:
   strip the panel's overflow-y so the disclosure CANNOT BE SCROLLED TO. That is exactly the defect
   we shipped for months — privacy and terms present on the page and reachable by nobody.
   🔑 WHEN A FIX MOVES A HAZARD, RE-DERIVE THE POISON. A red-first calibrated against the old
      geometry is the first thing a successful fix breaks. */
const OVERLAP_TARGET = '    min-height: 0; overflow-y: auto; background-color: var(--bg-navy); z-index: 50;';
const OVERLAP_REMOVED = '    min-height: 0; overflow-y: hidden; background-color: var(--bg-navy); z-index: 50;';

/* ⛔ THIS GATE IS NOT A READER OF studio.html, AND _gate_studio_source P1 IS RIGHT TO INSIST.
   `studioSource()` is the only door for gates that ANALYSE the Studio source, because it composes
   shell + registered parts and a raw disk read would go blind to every function that has moved into
   a part. This gate does no source analysis — it SERVES a page to a browser and, under a mutation
   flag, transforms the bytes on their way out. So it reads through the same generic asset reader the
   static server uses for every other file, and never names studio.html at a read.
   ⭐ FOUND BY THE SUITE 2026-08-14, AND THE TIMING IS THE LESSON: the census runs `git ls-files`, so
   an UNTRACKED gate is invisible to it. This file passed a full 214/214 suite while still untracked
   and went red on the very next run, once committed.
   🔑 A GREEN SUITE PROVES THE TREE YOU RAN — AND AN UNCOMMITTED GATE IS NOT YET IN ANY TREE.
      RUN THE SUITE AFTER COMMITTING. */
const readAsset = (urlPath) => {
  const f = path.resolve(ROOT, '.' + urlPath);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8');
};

let SERVE_STUDIO = null;
if (OLD) {
  SERVE_STUDIO = execFileSync('git', ['show', '4d72939:studio.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 });
  if (!SERVE_STUDIO || SERVE_STUDIO.length < 100000) { console.log('[exit_reachable] ABORT — could not read the 4d72939 blob'); process.exit(2); }
  if (SERVE_STUDIO === readAsset('/studio.html')) { console.log('[exit_reachable] ABORT — --old is identical to the working file; nothing would be proven'); process.exit(2); }
} else if (DEFECT) {
  SERVE_STUDIO = readAsset('/studio.html');
  for (const [target, restored] of DEFECT_PAIRS) {
    const n = SERVE_STUDIO.split(target).length - 1;
    if (n !== 1) { console.log(`[exit_reachable] ABORT — --defect anchor ${JSON.stringify(target.slice(0, 48))} found ${n}x, expected exactly 1. The mutation did not land; a red-first that did not land proves nothing.`); process.exit(2); }
    SERVE_STUDIO = SERVE_STUDIO.replace(target, restored);
  }
} else if (OVERLAP) {
  SERVE_STUDIO = readAsset('/studio.html');
  const n = SERVE_STUDIO.split(OVERLAP_TARGET).length - 1;
  if (n !== 1) { console.log(`[exit_reachable] ABORT — --overlap anchor found ${n}x, expected exactly 1. The mutation did not land; a red-first that did not land proves nothing.`); process.exit(2); }
  SERVE_STUDIO = SERVE_STUDIO.replace(OVERLAP_TARGET, OVERLAP_REMOVED);
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (SERVE_STUDIO && u === '/studio.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(SERVE_STUDIO); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

/* Runs IN THE PAGE. Returns the hit-test verdict AND the thing that was hit, because a reachability
   failure that does not NAME ITS COVERER makes you re-derive the diagnosis by hand. */
const probe = (id) => {
  const el = document.getElementById(id);
  const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')
    + (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') : 'NULL(off-viewport)');
  if (!el) return { present: false };
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return { present: false, zeroBox: true, display: getComputedStyle(el).display };
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {
    present: true, reachable: hit === el || el.contains(hit), hit: d(hit),
    top: Math.round(r.top), scrollY: Math.round(window.scrollY),
    budget: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  };
};

const fails = [];
const skips = [];
const fail = (leg, vp, msg) => fails.push(`${leg} @ ${vp}: ${msg}`);

(async () => {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const tag = `${vp.w}x${vp.h}`;
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1300);
    await page.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
    /* ⛔⛔ WAIT ON THE PRECONDITIONS, NEVER ON THE ASSERTION. A fixed sleep here made W3 AT-REST go
       red on ~1 random viewport per run, and the cause is worth recording because it is invisible to
       a rect: `.studio-layout.seed-gated{visibility:hidden}` — the Clerk dossier seed gate — keeps
       LAYOUT while removing the page from hit-testing. So the button reported a perfect top=70 box
       and `elementFromPoint` returned `body`. THE GATE WAS MEASURING A PAGE THAT WAS STILL INVISIBLE.
       🔑 AN INTERMITTENT LEG IS WORSE THAN A MISSING ONE — it teaches you to discount the instrument,
          which is how a real red gets waved through.
       ⛔ WE NEVER POLL FOR "is the exit hit-testable yet" — that would mask the exact failure W3
          exists to catch. We poll only for SETUP being finished, and we FAIL LOUDLY if it never is. */
    await page.waitForFunction(() => {
      const w = document.getElementById('studioOverlayWrap');
      if (w) { const c = getComputedStyle(w); if (!(c.pointerEvents === 'none' || c.opacity === '0' || c.display === 'none')) return false; }
      const l = document.getElementById('studio-layout');
      if (!l || l.classList.contains('seed-gated')) return false;         // still visibility:hidden
      const host = document.getElementById('sl-movements-host');
      if (host && !host.querySelector('.sl-phase')) return false;          // landing host present but unrendered
      return true;
    }, null, { timeout: 8000 }).catch(() => { fail('W0 PRECONDITION', tag, 'page never finished settling in 8s (intro overlay still interactive, .seed-gated still set, or #sl-movements-host rendered nothing) — every leg below would be measuring setup, not the product'); });

    // W1 · FIXTURE — guards every leg below.
    const rest = await page.evaluate(probe, EXIT_ID);
    if (!rest.present) { fail('W1 FIXTURE', tag, `#${EXIT_ID} absent or zero-box (${JSON.stringify(rest)}) — the reachability legs cannot be trusted`); await ctx.close(); continue; }

    // W2 · NO SCROLL BUDGET — the class rule.
    if (rest.budget > 0) fail('W2 NO-BUDGET', tag, `document has ${rest.budget}px of scroll the wheel cannot undo (scrollHeight-clientHeight)`);

    // W3 · REACHABLE AT REST.
    if (!rest.reachable) fail('W3 AT-REST', tag, `elementFromPoint returned ${rest.hit}, not #${EXIT_ID} (top=${rest.top})`);

    // W4/W6 · THE USER ACTION. Real control, real handler — never a synthetic scroll.
    const clicked = await page.evaluate(() => {
      const link = document.querySelector('#sl-movements-host .sl-phase');
      if (!link) return null;
      link.click();
      return (link.textContent || '').trim().slice(0, 32);
    });
    if (clicked === null) {
      skips.push(`W4/W6 @ ${tag}: no #sl-movements-host .sl-phase on this build — the trigger does not exist here`);
    } else {
      await page.waitForTimeout(1500);                       // smooth scroll settles
      const after = await page.evaluate(probe, EXIT_ID);
      if (!after.reachable) fail('W4 AFTER-USE', tag, `after clicking "${clicked}" elementFromPoint returned ${after.hit}, not #${EXIT_ID} (top=${after.top}, scrollY=${after.scrollY})`);
      if (after.scrollY !== 0) fail('W6 NO-DRIFT', tag, `clicking "${clicked}" scrolled the document to ${after.scrollY} — and the wheel cannot bring it back`);
    }

    // W5 · AT THE SCROLL EXTREME — defence in depth.
    await page.evaluate(() => window.scrollTo(0, 99999));
    await page.waitForTimeout(200);
    const ext = await page.evaluate(probe, EXIT_ID);
    if (!ext.reachable) fail('W5 AT-EXTREME', tag, `at scrollY=${ext.scrollY} elementFromPoint returned ${ext.hit}, not #${EXIT_ID} (top=${ext.top})`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);

    /* W7 · THE DISCLOSURE LINKS ARE REACHABLE.
       ⛔ FOUND 2026-08-14 BY THE SAME MEASUREMENT THAT FOUND THE TRAP, WHICH IS WHY IT LIVES HERE:
       #disclosure-footer began at exactly the viewport's bottom edge and the wheel was dead, so
       PRIVACY AND TERMS WERE UNREACHABLE TO EVERY DESKTOP STUDIO USER. The one category of copy that
       exists specifically to be findable was the one category nobody could reach.
       ⚠️ AND IT GUARDS THE FIX'S OWN SIDE EFFECT: bringing the footer on screen put it under the
       first-visit consent banner. THIS LEG IS WHAT MAKES THE 56px RESERVE IN studio.html SAFE — a
       measured constant with an assertion behind it is a constant; one without is a guess. */
    /* Scroll the panel THE WAY A USER DOES: a real wheel over the panel. If the panel's overflow
       has been broken, this moves nothing and the links below have no box — which is the failure. */
    const panelBox = await page.evaluate(() => {
      const p = document.querySelector('.drafting-panel');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (panelBox) {
      await page.mouse.move(panelBox.x, panelBox.y);
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 900);
      await page.waitForTimeout(350);
    }
    const links = await page.evaluate(() => {
      const foot = document.getElementById('disclosure-footer');
      if (!foot) return { missing: true };
      /* ⛔ SCROLL THE PANEL FIRST — THE SETUP CHANGED, THE CLAIM DID NOT (2026-08-14, §18.2).
         The disclosure used to be a permanent band above the canvas; the Captain ruled it out of the
         canvas frame and into the END OF THE PANEL'S OWN SCROLL, so it is now reached exactly the way
         it is reached on the index: by scrolling to the bottom. REACHABLE, NOT RESIDENT.
         ⚠️ THIS IS panel.scrollTop, NEVER scrollIntoView — scrollIntoView scrolls every ancestor
         INCLUDING the document, which is the trigger W2 exists to keep dead. The gate must not use
         the very call the product was fixed to stop using.
         🔑 THE LEG STILL ASSERTS THE SAME THING: after the scroll a real user can perform, every
            legal link hit-tests to itself. Nothing was softened — only the journey was updated. */
      /* ⛔⛔ NO panel.scrollTop HERE — THE GATE MUST NOT DO WHAT THE USER CANNOT.
         overflow-y:hidden STILL PERMITS A PROGRAMMATIC scrollTop (that is precisely the mechanism
         behind the body trap this gate was born from), so a scripted scroll reported the disclosure
         REACHABLE on a panel whose wheel was dead. The --overlap control ran, landed, and W7 passed.
         🔑 A GATE THAT REACHES A CONTROL BY MEANS THE USER DOES NOT HAVE IS MEASURING ITSELF.
         The wheel is driven from Playwright before this runs — see the mouse.wheel loop above. */
      const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') : 'NULL(off-viewport)');
      const as = Array.from(foot.querySelectorAll('a'));
      const bad = [];
      for (const a of as) {
        /* ⛔ getClientRects()[0], NOT getBoundingClientRect(). THESE LINKS ARE INLINE <a> INSIDE A
           WRAPPING <p>, and an inline box that wraps across two lines has a BOUNDING rect that is the
           UNION of both line boxes — whose geometric centre can land in the GAP BETWEEN THEM and
           hit-test to the parent <p>. That produced a confident 2-viewport RED here on 2026-08-14
           that was entirely the instrument's fault. getClientRects() returns the per-line boxes, and
           the first one always has real text in it.
           🔑 A BOUNDING BOX IS NOT A SHAPE. For anything inline, the union rect describes a region
              the element may not actually occupy. */
        /* ⛔ A LINK WITH NO BOX IS A FAILURE, NOT A SKIP. The first draft did `continue` here, and
           that made the whole leg VACUOUS: with the panel's overflow stripped the links are clipped
           to zero boxes, nothing is measurable, `bad` stays empty and W7 reports GREEN over a
           disclosure NO USER CAN REACH — the exact §15.3 defect it exists to catch.
           🔑 EXCLUSION NEEDS PRESENCE. "Nothing is covered" is trivially true of nothing. */
        const r = a.getClientRects()[0];
        if (!r || !(r.width > 0 && r.height > 0)) {
          bad.push(`"${(a.textContent || '').trim().slice(0, 22)}" has NO BOX — clipped or unrenderable, so it cannot be reached at all`);
          continue;
        }
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!(hit === a || a.contains(hit))) bad.push(`"${(a.textContent || '').trim().slice(0, 22)}" covered by ${d(hit)}`);
      }
      return { count: as.length, bad };
    });
    if (links.missing) fail('W7 DISCLOSURE', tag, '#disclosure-footer absent — the legal links cannot be proven reachable');
    else if (!links.count) fail('W7 DISCLOSURE', tag, '#disclosure-footer contains no <a> — the fixture is empty, so "nothing is covered" would be vacuously true');
    else if (links.bad.length) fail('W7 DISCLOSURE', tag, `${links.bad.length}/${links.count} legal links unreachable — ${links.bad.slice(0, 3).join(' · ')}`);

    await ctx.close();
  }

  await browser.close();
  server.close();

  const mode = OLD ? ' [--old 4d72939]' : DEFECT ? ' [--defect]' : OVERLAP ? ' [--overlap]' : '';
  skips.forEach((s) => console.log('  SKIP  ' + s));
  fails.forEach((f) => console.log('  FAIL  ' + f));
  /* ⚠️ THE SCORE LINE NAMES WHAT THE NUMBER COUNTS. "FAIL 16/48" is ambiguous — it reads as
     "16 failed" and it meant "16 passed". A verdict a human can misread is a verdict half-given. */
  const legs = 7 * VIEWPORTS.length;
  const bad = fails.length;
  console.log(bad === 0
    ? `[exit_reachable] ${LABEL}${mode} — PASS ${legs}/${legs} legs GREEN${skips.length ? ` (${skips.length} SKIPPED — see above)` : ''}`
    : `[exit_reachable] ${LABEL}${mode} — FAIL ${bad}/${legs} legs RED${skips.length ? ` (${skips.length} SKIPPED — see above)` : ''}`);
  process.exit(bad === 0 ? 0 : 1);
})();
