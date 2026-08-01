'use strict';
/* THE STUDIO LEAVE PROMPT · RED-FIRST — Commit 5. The Sketch guard's twin, asserted trap for trap.
 *
 * WHY THIS EXISTS SEPARATELY FROM _gate_leave_prompt: that gate owns the COMPONENT (routing table,
 * copy, render). This one owns the STUDIO WIRING — that the guard fires on the real page, that the
 * words it shows are the Studio's, and that the three traps which cost real days on the Sketch are
 * actually handled here rather than merely commented about.
 *
 * THE THREE TRAPS, each with its own assertion:
 *   1 RE-ENTRANCY — studioSaveCurrent (signed out) calls _navDrain itself, so without the
 *     _stuLeaveAnswered latch the guard rebuilds the panel a millisecond after its own button closes
 *     it, and to the user the button simply DOES NOTHING. That is the Captain's exact reported
 *     symptom on the Sketch, so TRAP 1 asserts his words: pressed it, panel gone, page left.
 *   2 LIVE ANCHOR — the topbar Save has NO id (it is #acct-topbar .acct-save) and the header button
 *     is #studio-save-bp-btn, not #studio-save-bp. An anchor that resolves to nothing is how the
 *     Sketch picker ended up at the screen edge.
 *   3 TWO DOORS — "Create a free account" must reach mode=sign-up and "Sign in to save" the plain
 *     door, and BOTH must stash the work. One url for both would make the labels a distinction the
 *     product does not make.
 *
 * ASSERT THAT THE PAGE LEFT, NOT WHERE IT ARRIVED (learned on the Sketch): vault.html immediately
 * replaces off-origin and this harness aborts that, so a SUCCESSFUL hop lands on a browser error
 * page. Asserting the happy destination would fail on the product working.
 *
 * Usage: node scripts/_gate_studio_leave_prompt.js [--nolatch]
 *   --nolatch  RED-FIRST: removes the answered-departure latch, restoring the re-entrant guard.
 *              TRAP 1 must go RED with panelStillUp=true. Self-checking — a strip that matches
 *              nothing aborts rather than reporting a red-first that mutated nothing.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8261; const BASE = 'http://' + HOST + ':' + PORT;
const NOLATCH = process.argv.includes('--nolatch');

const A_LATCH = "      if (window._stuLeaveAnswered === true) return false;";
const M_LATCH = "      if (false) return false;";
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (NOLATCH && /studio\.html$/.test(p)) {
    const src = body.toString('utf8');
    const n = src.split(A_LATCH).length - 1;
    if (n !== 1) { console.error(`anchor nolatch: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    const out = src.replace(A_LATCH, M_LATCH);
    jsDiffers = jsDiffers || (out !== src);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* A draft with real content. _draftAt IS AN ISO STRING, NOT A NUMBER — studio-blueprint.js:474 stamps
   it with new Date().toISOString(), and workState reads it through Date.parse, which returns NaN for a
   numeric timestamp. The first version of this fixture used Date.now() and made unsavedEdits
   permanently false, which read exactly like a broken Branch A. A fixture in the wrong SHAPE is
   indistinguishable from the defect it invents. */
const dirtyDraft = (everSaved) => ({
  blueprint_id: everSaved ? 'bp-seed-1' : null,
  version: '1.0.1',
  saved_at: everSaved ? '2026-07-30T09:00:00.000Z' : undefined,
  _draftAt: new Date().toISOString(),
  datum: { net_datum_v1: 137731 },
  accounts: [{ id: 'a1', account_type: '401k', display_name: 'GATE ROOM', value: 250000 }],
  household: {}
});

async function boot(browser, { signedIn, draft }) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => /clerk\.|cloudflareinsights|posthog|beacon/i.test(r.request().url()) ? r.abort() : r.continue());
  await page.addInitScript(({ signedIn, draft }) => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    if (signedIn) { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} }
    if (draft) { try { localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(draft)); } catch (e) {} }
    else { try { localStorage.removeItem('datumfi_blueprint_draft_v1'); } catch (e) {} }
  }, { signedIn, draft });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

const panelState = (page) => page.evaluate(() => {
  const w = document.querySelector('[data-leave-prompt]');
  return {
    up: !!w,
    branch: w ? w.getAttribute('data-leave-prompt') : null,
    surface: w ? w.getAttribute('data-leave-surface') : null,
    title: w ? (w.querySelector('div div') || {}).textContent : null,
    btns: w ? Array.from(w.querySelectorAll('button')).map((b) => b.textContent) : [],
    roles: w ? Array.from(w.querySelectorAll('button')).map((b) => b.getAttribute('data-leave-role')) : []
  };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });

  /* ── POSITIVE CONTROL FIRST. Without a non-null here every silence below is the rig. ─────────── */
  {
    const { ctx, page } = await boot(browser, { signedIn: false, draft: dirtyDraft(false) });
    const ws = await page.evaluate(() => window.DatumBlueprint && window.DatumBlueprint.workState());
    ok(!!ws && ws.present === true && ws.hasContent === true,
      `STUDIO 0 POSITIVE CONTROL: the seeded draft IS visible to workState (${JSON.stringify(ws)}) — every silence below is meaningless without this`);
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const p = await panelState(page);
    ok(p.up === true && p.branch === 'B',
      `STUDIO 1: a signed-OUT architect with unsaved work is asked before leaving (up=${p.up}, branch=${p.branch})`);
    ok(p.surface === 'studio',
      `STUDIO 2 LOAD-BEARING: and it is the STUDIO variant, not the Sketch words (surface=${p.surface})`);
    ok(p.btns.indexOf('Keep drafting') >= 0 && p.btns.indexOf('Keep sketching') < 0,
      `STUDIO 3: the user here DRAFTED — "sketched" names a different surface (btns ${JSON.stringify(p.btns)})`);
    await ctx.close();
  }

  /* ── SILENT WHEN THERE IS NOTHING TO KEEP. A prompt on every exit is the cry-wolf failure. ───── */
  {
    const { ctx, page } = await boot(browser, { signedIn: false, draft: null });
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const p = await panelState(page);
    ok(p.up === false,
      `STUDIO 4: with NOTHING built the departure is silent (up=${p.up}) — a dialog that fires on every exit is dismissed within a day`);
    await ctx.close();
  }

  /* ── BRANCH BY BASELINE when signed in: never-saved -> C, saved-and-edited -> A. ─────────────── */
  {
    const { ctx, page } = await boot(browser, { signedIn: true, draft: dirtyDraft(false) });
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const p = await panelState(page);
    ok(p.up === true && p.branch === 'C',
      `STUDIO 5: a signed-IN architect who has NEVER saved gets Branch C, not an account ask (branch=${p.branch})`);
    await ctx.close();
  }
  {
    /* SEEDING ALONE CANNOT PRODUCE "EDITED SINCE SAVE", and the first version of this check asserted a
       premise the product refutes. finishLoad re-stamps the draft AT ITS OWN saved_at on every load —
       a load is not an edit, deliberately — so a seeded draft always boots CLEAN and decide() correctly
       returns null. The edit has to happen AFTER the boot, so it is made after the boot. The failure
       was in this rig, not in the guard. */
    const { ctx, page } = await boot(browser, { signedIn: true, draft: dirtyDraft(true) });
    const stamped = await page.evaluate(() => {
      let d = null; try { d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null'); } catch (e) {}
      if (!d) return null;
      d._draftAt = new Date(Date.now() + 5000).toISOString();   // an edit, strictly after the save stamp
      try { localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(d)); } catch (e) {}
      const w = window.DatumBlueprint.workState();
      return { everSaved: w.everSaved, unsavedEdits: w.unsavedEdits };
    });
    ok(!!stamped && stamped.everSaved === true && stamped.unsavedEdits === true,
      `STUDIO 6 PRECONDITION: the post-boot edit registers as saved-and-edited (${JSON.stringify(stamped)}) — asserted, because the branch below is meaningless if it did not`);
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const p = await panelState(page);
    ok(p.up === true && p.branch === 'A',
      `STUDIO 6: saved-then-edited gets Branch A, the nudge (branch=${p.branch})`);
    await ctx.close();
  }

  /* ── TRAP 1 — THE RE-ENTRANT GUARD. Proves the CAPTAIN'S SYMPTOM, not merely "a failure". ────── */
  {
    const { ctx, page } = await boot(browser, { signedIn: false, draft: dirtyDraft(false) });
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const before = await panelState(page);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[data-leave-prompt] button'))
        .find((x) => x.getAttribute('data-leave-role') === 'create');
      if (b) b.click();
    });
    await page.waitForTimeout(1800);
    const after = await page.evaluate(() => ({
      panelStillUp: !!document.querySelector('[data-leave-prompt]'),
      left: !/\/studio\.html$/.test(location.pathname),
      href: location.href.slice(0, 60),
      stashed: (function () { try { return !!sessionStorage.getItem('datumfi_blueprint_current_snapshot'); } catch (e) { return false; } })()
    }));
    ok(before.up === true && after.panelStillUp === false,
      `TRAP 1 LOAD-BEARING (the Captain's symptom): after pressing the save door the panel does NOT rebuild itself (stillUp=${after.panelStillUp}) — the guard no longer eats the navigation it asked for`);
    ok(after.left === true,
      `TRAP 1b: and the page actually LEAVES the Studio (${after.href}) — asserted as "left", never as a destination, because vault.html replaces off-origin and a successful hop lands on a browser error page`);
    await ctx.close();
  }

  /* ── TRAP 3 — TWO DOORS, ONE GUARANTEE. Different screens, identical stash. ──────────────────── */
  {
    const doors = {};
    for (const role of ['create', 'signin']) {
      const { ctx, page } = await boot(browser, { signedIn: false, draft: dirtyDraft(false) });
      /* ORDER MATTERS AND THE FIRST VERSION HAD IT BACKWARDS: raise the panel through the REAL drain
         FIRST, and only then intercept, so the interceptor captures the DOOR's navigation rather than
         swallowing the one that opens the panel. Installed too early it ate its own precondition and
         both doors reported null — a rig fault that looked exactly like two dead buttons. */
      await page.evaluate(() => window._navDrain('/sketchbook.html'));
      await page.waitForTimeout(700);
      const p0 = await panelState(page);
      ok(p0.up === true,
        `TRAP 3 PRECONDITION (${role}): the panel is up before the door is pressed (up=${p0.up}) — without this the door assertions below prove nothing`);
      await page.evaluate(() => {
        window.__nav = null;
        window._navDrain = function (u) { window.__nav = u; };   // capture, do not navigate
      });
      await page.evaluate((r) => {
        const b = Array.from(document.querySelectorAll('[data-leave-prompt] button'))
          .find((x) => x.getAttribute('data-leave-role') === r);
        if (b) b.click();
      }, role);
      await page.waitForTimeout(900);
      doors[role] = await page.evaluate(() => ({
        url: window.__nav,
        stashed: (function () { try { return !!sessionStorage.getItem('datumfi_blueprint_current_snapshot'); } catch (e) { return false; } })(),
        pending: (function () { try { return sessionStorage.getItem('datumfi_pending_save'); } catch (e) { return null; } })()
      }));
      await ctx.close();
    }
    ok(/mode=sign-up/.test(doors.create.url || '') && !/mode=sign-up/.test(doors.signin.url || ''),
      `TRAP 3 LOAD-BEARING: "Create a free account" opens the SIGN-UP door and "Sign in to save" does not (${doors.create.url} | ${doors.signin.url})`);
    ok(doors.create.stashed === true && doors.signin.stashed === true &&
       doors.create.pending === 'blueprint' && doors.signin.pending === 'blueprint',
      `TRAP 3b: BOTH doors stash the work identically — the destination differs, the guarantee does not (create=${doors.create.stashed}/${doors.create.pending}, signin=${doors.signin.stashed}/${doors.signin.pending})`);
  }

  /* ── TRAP 2 — THE LIVE SAVE ANCHOR RESOLVES TO A VISIBLE CONTROL, never to a 0x0 ghost. ─────── */
  {
    const { ctx, page } = await boot(browser, { signedIn: false, draft: dirtyDraft(false) });
    const anchor = await page.evaluate(() => {
      const sels = ['#acct-topbar .acct-save', '#studio-save-bp-btn', '#studio-save-bp-mob'];
      const seen = sels.map((s) => {
        const el = document.querySelector(s);
        if (!el) return { s, exists: false };
        const r = el.getBoundingClientRect();
        return { s, exists: true, w: Math.round(r.width), h: Math.round(r.height) };
      });
      return { seen, anyVisible: seen.some((x) => x.exists && x.w > 0 && x.h > 0) };
    });
    ok(anchor.anyVisible === true,
      `TRAP 2: at least one save control resolves VISIBLE for the picker to anchor to (${JSON.stringify(anchor.seen)}) — a hardcoded id that resolves to nothing is how the Sketch picker hit the screen edge`);
    await ctx.close();
  }

  /* ── STAY NAVIGATES NOWHERE, and does NOT latch — staying is not a departure. ────────────────── */
  {
    const { ctx, page } = await boot(browser, { signedIn: false, draft: dirtyDraft(false) });
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[data-leave-prompt] button'))
        .find((x) => x.getAttribute('data-leave-role') === 'stay');
      if (b) b.click();
    });
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({
      here: /\/studio\.html$/.test(location.pathname),
      panel: !!document.querySelector('[data-leave-prompt]'),
      latched: window._stuLeaveAnswered === true
    }));
    ok(st.here === true && st.panel === false,
      `STUDIO 7: STAY closes the panel and navigates NOWHERE (here=${st.here}, panel=${st.panel})`);
    ok(st.latched === false,
      `STUDIO 8: and STAY does NOT latch (${st.latched}) — a latch that never resets protects you once and then never again, which is worse than none because the protection is believed`);
    // and the NEXT departure is asked about again
    await page.evaluate(() => window._navDrain('/sketchbook.html'));
    await page.waitForTimeout(700);
    const again = await panelState(page);
    ok(again.up === true,
      `STUDIO 9: so a LATER departure is asked about again (up=${again.up})`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  if (NOLATCH) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (studio.html bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOLATCH ? 'MUTATED[nolatch]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (NOLATCH) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
