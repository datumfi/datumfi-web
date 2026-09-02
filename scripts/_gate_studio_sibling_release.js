/* @gate-pool: browser
 *
 * ══ THE SIBLING NOTICE CLEARS — BOTH SIDES OF A TWO-SIDED STATE ════════════════════════════════
 *
 * ⛔⛔ FINDING 16. The cross-tab banner appeared and COULD NOT BE DISMISSED BY ANY MEANS. Its own
 * authored copy says "...or reload this one to pick up where it left off"; the Captain reloaded
 * repeatedly on production 2026-08-24 and it stayed.
 *
 * THE DEFECT WAS NOT A RACE AND NOT A TIMING BUG — IT WAS A MISSING EVENT. `datum:draft-sibling-hold`
 * was dispatched; nothing was ever dispatched when the hold ENDED. `_draftNotice`'s `show=false`
 * branch existed but was UNREACHABLE for 'sibling' because nothing anywhere passed false for that
 * kind, while studio-blueprint.js quietly cleared `_siblingHold` in two places and told no one.
 *   🔑 A STATE WITH TWO SIDES NEEDS TWO ANNOUNCEMENTS. Wiring only the entry is not a half-built
 *      feature — it is A ONE-WAY DOOR THAT LOOKS LIKE A TOGGLE, and it always presents as "the
 *      thing is stuck" rather than "the thing was never finished."
 *
 * ── WHY THIS GATE DRIVES TWO REAL TABS ─────────────────────────────────────────────────────────
 * Two pages in ONE browser context share localStorage and hold SEPARATE sessionStorage — which is
 * exactly the shape that makes this collision possible, because the draft lives in localStorage
 * (shared) and TAB_ID lives in sessionStorage (per-tab). A single-page fixture cannot produce the
 * defect at all.
 * ⭐ AND IT ASSERTS THE BANNER ELEMENT, NOT THE EVENT. The Captain's report was "the message stays
 *    up there." An event-only assertion would pass over a correctly-dispatched release that no host
 *    listened for — which is the precise half that was missing. §19.2: assert what the pixel does.
 *
 * ── THE LEGS ────────────────────────────────────────────────────────────────────────────────────
 * L1 the banner APPEARS on a genuine collision. Without it L2/L3 are vacuous: "the banner is gone"
 *    is trivially true on a page that never showed one, and that is the whole failure family here.
 * L2 the RELEASE is dispatched when the tab returns to agreement   (the module half)
 * L3 the banner is REMOVED from the DOM                            (the host half, user-visible)
 *
 * ⚠️ L2 IS UPSTREAM OF L3 AND THIS FILE SAYS SO RATHER THAN FAKING INDEPENDENCE: `--norelease`
 * removes the dispatch and reddens BOTH, because a host cannot listen for an event nobody sends.
 * `--nolisten` removes only the listener and reddens L3 ALONE — and that control reproduces THE
 * SHIPPED DEFECT EXACTLY, so L3 is proved to catch the bug that actually happened.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8440;          /* claimed 2026-08-24. ⛔ NEVER 8001 — that is the suite's shared server. */
const MOD  = 'scripts/studio-blueprint.js';
const HOST = 'studio.html';

const DISPATCH = "        global.dispatchEvent(new global.CustomEvent('datum:draft-sibling-release'));";
const LISTEN   = "    _draftNotice('sibling', false);";

const argv = process.argv.slice(2);
const NORELEASE = argv.includes('--norelease');
const NOLISTEN  = argv.includes('--nolisten');
const ANY_POISON = NORELEASE || NOLISTEN;

const CONTROLS = {
  '--norelease': {
    what: 'deletes the release dispatch in studio-blueprint.js — nobody is told the hold ended',
    anchors: [{ file: MOD, literal: DISPATCH, count: 1 }],
    reds: ['L2', 'L3'],
    expect: 'red'
  },
  '--nolisten': {
    what: "removes studio.html's release listener — REPRODUCES THE SHIPPED DEFECT VERBATIM",
    anchors: [{ file: HOST, literal: LISTEN, count: 1 }],
    reds: ['L3'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_studio_sibling_release.js', controls: CONTROLS }));
  process.exit(0);
}

const landed = [];
function poison(rel, body) {
  if (!ANY_POISON) return body;
  const swap = (lit, rep, tag) => {
    const n = body.split(lit).length - 1;
    if (n !== 1) { console.log(`ABORT: ${tag} anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(lit).join(rep); landed.push(tag);
  };
  if (NORELEASE && rel === MOD)  swap(DISPATCH, '', '--norelease');
  if (NOLISTEN  && rel === HOST) swap(LISTEN, '        /* poisoned: listener body removed */', '--nolisten');
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) out = Buffer.from(poison(rel, out.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

const ROOMS = (tag, n) => Array.from({ length: n }, (_, i) => ({
  id: tag + i, baseId: 'taxable_primary', name: tag + ' room ' + i, value: 1000 * (i + 1), holdings: []
}));
const bannerUp = (p) => p.evaluate(() => !!document.getElementById('draft-notice-sibling'));

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

  console.log('[RUN] SIBLING NOTICE — IT APPEARS, AND IT CLEARS');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const url = `http://127.0.0.1:${PORT}/studio.html`;

  /* Record release events in tab B from parse time — the dispatch can precede any listener we add. */
  await ctx.addInitScript(`window.__rel = []; window.addEventListener('datum:draft-sibling-release', function(){ window.__rel.push(Date.now()); });`);

  const B = await ctx.newPage();
  await B.goto(url, { waitUntil: 'load' });
  await B.waitForFunction(() => !!(window.DatumBlueprint && window.DatumBlueprint._internal), null, { timeout: 15000 });

  const A = await ctx.newPage();
  await A.goto(url, { waitUntil: 'load' });
  await A.waitForFunction(() => !!(window.DatumBlueprint && window.DatumBlueprint._internal), null, { timeout: 15000 });

  /* ⛔ A MUST COME INTO AGREEMENT BEFORE IT CAN AUTHOR ANYTHING — MEASURED 2026-08-24, and the
   * first version of this fixture got it backwards. B boots first and leaves a draft carrying B's
   * _tabId; A then arrives with `_seenAt` null, sees a foreign incumbent and CORRECTLY HOLDS. So
   * the refusal landed on the wrong tab, A's work never reached storage, and B had nothing newer
   * to collide with — the gate aborted on its own anti-vacuity check rather than scoring.
   *   🔑 THE GUARD IS SYMMETRIC, SO THE FIXTURE MUST BE ASYMMETRIC ON PURPOSE. Whichever tab has
   *      not yet agreed is the one that gets held; naming them "A" and "B" does not decide it.
   * load() hydrates the incumbent and stamps `_seenAt`, which is exactly how a real returning tab
   * earns the right to write. */
  await A.evaluate(() => window.DatumBlueprint.load({}));

  /* A types work B has never seen. */
  /* ⛔ THIS USED TO BE `waitForTimeout(150)` THEN `waitForTimeout(120)`, AND THAT WAS THE FLAKE.
     The comment 30 lines above already describes the exact failure: if load() has not settled, A is
     STILL HELD, A's write is refused, B has nothing newer to collide with, and this gate aborts on
     its own anti-vacuity check. A 270ms budget for that sequence is not a test, it is a WAGER — and
     under --concbrowser=3 it lost, 2026-09-02.
     🔑 WAIT ON THE EFFECT, NOT ON A CLOCK. The precondition every leg below needs is "A's work
        reached storage". That is directly observable, so observe it.
     ⚠️ DELIBERATELY NOT PINNED TO SOLO CONCURRENCY. The runner's own header: "PINNING IS A
        WORKAROUND, NOT A FIX, AND IT MUST NOT BECOME PERMANENT AND UNEXAMINED." Pinning would HIDE
        this flake rather than remove it — A GATE THAT ONLY PASSES ALONE HAS BEEN EXCUSED, NOT
        REPAIRED. If it still flakes after this, pinning becomes a DECISION and gets written down as
        one, with the measurement that earned it.
     ⛔⛔ AND THE DECLARATION TOKEN IS DELIBERATELY NOT SPELLED OUT ANYWHERE IN THIS FILE.
        _suite_baseline.mjs:245 classifies a gate by testing SOLO_RE against the WHOLE SOURCE,
        COMMENTS INCLUDED. So a sentence saying "this gate is not pinned" WOULD PIN IT — silently —
        and the reliable green that followed would be the pin doing the work rather than this fix.
        MEASURED 2026-09-02: the first draft of this very comment made SOLO_RE.test() return true.
        🔑 IN A FILE WHOSE COMMENTS ARE READ AS CONFIGURATION, PROSE IS CODE. Do not write the
           token here — not even to say you are not using it. */
  /* ⛔ THE WAIT MUST *CAUSE*, NOT MERELY OBSERVE — MEASURED THE HARD WAY, 2026-09-02.
     The first version of this repair simply moved the wait AFTER the write and watched storage for
     'tabA-typed'. It aborted on the very first run, ALONE, on an idle machine: if load() has not
     settled the write is REFUSED, and a passive watcher then observes that refusal for the full 6s
     and falls through with A's work still missing. Removing the sleep between load() and the write
     made the exact failure MORE likely, not less.
     🔑 A WAIT PLACED WHERE IT CAN ONLY OBSERVE CANNOT FIX A STEP THAT WAS REFUSED. Retry the
        action until it takes — the same shape B's rejoin already uses below. */
  await A.waitForFunction((rooms) => {
    window.DatumBlueprint._internal.writeSessionDraft({ accounts: rooms });
    var d = window.DatumBlueprint._internal.readSessionDraft();
    return !!(d && JSON.stringify(d).indexOf('tabA-typed') !== -1);   // tabA-typed visible in storage
  }, ROOMS('tabA-typed', 2), { timeout: 6000 }).catch(() => {});

  /* B's autosave fires without having seen it -> refusal -> banner. */
  await B.evaluate((rooms) => window.DatumBlueprint._internal.writeSessionDraft({ accounts: rooms }), ROOMS('tabB-stale', 1));
  await B.waitForFunction(() => !!document.getElementById('draft-notice-sibling'), null, { timeout: 6000 }).catch(() => {});
  const shown = await bannerUp(B);

  /* ── ANTI-VACUITY. If the collision never happened, every leg below describes a page that could
   *    not have failed — and "the banner is gone" would be the emptiest green in the estate. */
  if (!shown) {
    console.log('ABORT: the collision did not reproduce — no sibling banner ever appeared in tab B.');
    console.log('       L2/L3 would then be asserting "cleared" over a notice that never showed.');
    console.log('       NOT a pass, NOT a red: this gate could not run.');
    await browser.close(); server.close();
    process.exit(2);
  }

  ok('L1', 'the banner APPEARS on a genuine cross-tab collision (the precondition)',
    shown === true, `#draft-notice-sibling present in tab B = ${shown}`);

  /* B comes back into agreement the way a real user does — it picks up the sibling's work — then
   * writes its own. That is the exact sequence the authored copy promises. */
  await B.evaluate(() => window.DatumBlueprint.load({}));
  /* Same repair, same reason: if B's load() has not settled, B is still out of agreement and its
     write is refused — the banner never clears and L3 fails for a FIXTURE reason. Retry the write
     until it sticks rather than betting 150ms that it will.
     ⚠️ A waitForFunction WITH A SIDE EFFECT is deliberate and is the point: the condition being
        waited on IS "the write landed", and the only way to find out is to attempt it. */
  await B.waitForFunction((rooms) => {
    window.DatumBlueprint._internal.writeSessionDraft({ accounts: rooms });
    var d = window.DatumBlueprint._internal.readSessionDraft();
    return !!(d && JSON.stringify(d).indexOf('tabB-agreed') !== -1);
  }, ROOMS('tabB-agreed', 2), { timeout: 6000 }).catch(() => {});
  await B.waitForFunction(() => !document.getElementById('draft-notice-sibling'), null, { timeout: 6000 }).catch(() => {});

  const released = await B.evaluate(() => (window.__rel || []).length);
  const stillUp = await bannerUp(B);

  ok('L2', 'the RELEASE is dispatched once the tab is back in agreement (the module half)',
    released > 0, `datum:draft-sibling-release count = ${released}`);

  ok('L3', 'the banner is REMOVED from the DOM (the host half — what the Captain actually saw)',
    stillUp === false, `#draft-notice-sibling still present = ${stillUp}`);

  await browser.close();

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served bytes'); process.exit(1); }
  if (ANY_POISON) console.log(`   poison landed: ${[...new Set(landed)].join(', ')}`);

  const total = pass + fail;
  if (ANY_POISON) {
    const expected = NORELEASE ? ['L2', 'L3'] : ['L3'];
    const actualRed = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actualRed.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);

  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.message) || e));
  console.log('SCORE 0/3 RED');
  process.exit(1);
});
