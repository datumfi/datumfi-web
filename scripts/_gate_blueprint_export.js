/* _gate_blueprint_export.js — THE EXIT. Added 2026-09-14.
 *
 * ⛔⛔ WHY IT EXISTS. Until tonight this product had NO WAY for a person to get their own blueprints
 * out of it. That was invisible while nothing was going wrong. It stopped being invisible when a
 * load began dropping fields and a save wrote the result back over the original: the Captain's own
 * three-week-old work became irreplaceable, and the only recovery route anyone could invent was
 * hand-written console commands — which put a live session token into a chat log.
 * 🔑 DATA A PERSON CANNOT TAKE OUT IS DATA THEY CANNOT PROTECT.
 *
 * ⛔ THE EXPORT IS A SAFETY DEVICE, SO ITS FAILURE MODES ARE THE POINT, NOT ITS HAPPY PATH.
 *    A backup that silently omits a store looks complete and is worse than none. Every leg below
 *    is about what the file SAYS ABOUT ITSELF when something went wrong.
 *
 * LEGS
 *   E0 · the button exists and is reachable on the Archive route (not the file — the route)
 *   E1 · a clean export carries BOTH stores and counts them
 *   E2 · ⛔ THE SERVER BEING UNREACHABLE STILL PRODUCES A FILE, and the file NAMES the failure
 *   E3 · ⛔ SIGNED OUT (no Clerk) still produces a file with the browser copies and names the gap
 *   E4 · it never writes — no setItem, no PUT, no DELETE, across the whole export
 *   E5 · the token never reaches the exported artefact
 *
 * @gate-pool: browser
 * Run: node scripts/_gate_blueprint_export.js
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8291;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

let pass = 0, fail = 0; const lines = [];
const check = (n, ok, d) => { ok ? (pass++, lines.push('  PASS  ' + n)) : (fail++, lines.push('  FAIL  ' + n)); if (d) lines.push('          ' + d); };

const TOKEN = 'TOKEN_THAT_MUST_NEVER_APPEAR_IN_THE_FILE';

async function boot(browser, opts) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(({ signedIn, tok }) => {
    /* ⚠️ THE WRITE SPY GOES IN BEFORE ANY PAGE SCRIPT, so E4 sees the whole run and not just the
       part after the gate woke up. */
    window.__writes = [];
    const realSet = Storage.prototype.setItem, realDel = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) { window.__writes.push('setItem:' + k); return realSet.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { window.__writes.push('removeItem:' + k); return realDel.call(this, k); };
    try {
      localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify({ slot1: { saved_at: '2026-08-15T00:00:00Z', profile: { primary_dob: '08 / 1982' }, accounts: [] } }));
      localStorage.setItem('datumfi_sketchbook_v1', '{"slots":[]}');
      window.__writes = [];   // the seeding is the fixture's, not the export's
    } catch (e) {}
    if (signedIn) window.Clerk = { session: { getToken: () => Promise.resolve(tok) }, user: { id: 'u' }, load: () => Promise.resolve(), addListener: () => {} };
  }, { signedIn: !!opts.signedIn, tok: TOKEN });

  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (/\/api\/documents/.test(u)) {
      if (opts.serverDown) return r.abort();
      if (/\/api\/documents\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [{ doc_key: 'bp-1', updated_at: '2026-09-04T00:00:00Z' }] }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: '{"profile":{"primary_dob":"08 / 1982"}}' }) });
    }
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry|beacon/i.test(u)) return r.abort();
    return r.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  /* ⚠️ DIAGNOSE RATHER THAN FORCE. A click that needs {force:true} is a click a person could not
     make; if the control is not visible the gate must say WHY, not push past it. */
  const _vis = await page.evaluate(() => {
    const b = document.getElementById("action-export-blueprints");
    if (!b) return { present: false };
    const cs = getComputedStyle(b), r = b.getBoundingClientRect();
    return { present: true, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, w: Math.round(r.width), h: Math.round(r.height), connected: b.isConnected };
  });
  return { ctx, page, vis: _vis };
}

/* ⛔ THE EXPORT IS DRIVEN THROUGH THE BUTTON'S OWN HANDLER, and the download is intercepted rather
   than the return value trusted: a function that returns the right object while saving nothing is
   exactly the failure a person would discover at the worst possible moment. */
async function exportViaButton(page) {
  /* ⛔ REACHABILITY IS ASSERTED WITH elementFromPoint, NOT WITH A TEST RUNNER'S ACTIONABILITY
     HEURISTIC. Playwright refused this click as "not visible" while the element measured
     display:inline-block, visibility:visible, opacity:1, 200x48, connected — and elementFromPoint
     at its own centre returns the button itself with nothing covering it. The heuristic and the
     DOM disagree, the DOM is the thing a mouse obeys, and I could not explain the disagreement.
     🔑 RECORDED AS A NAMED UNKNOWN RATHER THAN FORCED: {force:true} would have made the gate green
        by skipping the only check that asks whether a person can reach the control.
     ⚠️ SO THE CLAIM IS SPLIT AND BOTH HALVES ARE ASSERTED: CAN A MOUSE LAND ON IT (elementFromPoint)
        and DOES CLICKING IT PRODUCE THE FILE (a real DOM click, the same event a user dispatches). */
  const reach = await page.evaluate(() => {
    const el = document.getElementById('action-export-blueprints');
    if (!el) return { present: false };
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { present: true, unobstructed: top === el, w: Math.round(r.width), h: Math.round(r.height) };
  });
  const res = await page.evaluate(async () => {
    /* ⛔ THE WINDOW IS THE CLICK, NOT THE PAGE LOAD. This first compared against an empty array and
       went red on the page's OWN startup writes (datumfi_session_id, ds_anon_id, datum_auth_hint) —
       a leg that blamed the export for things that happened before the button existed.
       🔑 A 'CHANGED NOTHING' CLAIM NEEDS A BASELINE TAKEN AT THE MOMENT THE CLAIM STARTS. */
    window.__writesBefore = window.__writes.length;
    window.__saved = null;
    const rc = URL.createObjectURL; URL.createObjectURL = function (bl) { window.__blob = bl; return rc.call(URL, bl); };
    const ra = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__saved = this.download; return; } return ra.call(this); };
    document.getElementById('action-export-blueprints').click();
    await new Promise((r) => setTimeout(r, 1500));
    return { name: window.__saved, text: window.__blob ? await window.__blob.text() : null, writes: window.__writes.slice(window.__writesBefore) };
  });
  return Object.assign(res, { reach });
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ── E0 · the control is on the route ──
  {
    const { ctx, page } = await boot(browser, { signedIn: true });
    const btn = await page.evaluate(() => {
      const b = document.getElementById('action-export-blueprints');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { present: true, rendered: r.width > 0 && r.height > 0, label: b.textContent.trim() };
    });
    check('E0 the Export control renders on the Archive route', !!(btn && btn.rendered), JSON.stringify(btn));
    await ctx.close();
  }

  // ── E1 · both stores, counted ──
  {
    const { ctx, page, vis } = await boot(browser, { signedIn: true });
    console.log('  [diag] export button: ' + JSON.stringify(vis));
    const r = await exportViaButton(page);
    let j = null; try { j = JSON.parse(r.text); } catch (e) {}
    check('E1a a file is actually saved, named for the day', !!(r.name && /^datumae-export-\d{4}-\d{2}-\d{2}\.json$/.test(r.name)), JSON.stringify(r.name));
    check('E1b it carries the BROWSER store', !!(j && j.counts && j.counts.localStorage_keys >= 2), j && JSON.stringify(j.counts));
    check('E1c it carries the SERVER store — the one the cards render from', !!(j && j.counts.d1_docs === 1), j && JSON.stringify(Object.keys(j.d1.docs || {})));
    check('E1d a clean run reports ZERO errors (else every leg below is satisfied by a broken export)',
      !!(j && j.counts.errors === 0), j && JSON.stringify(j.errors));
    check('E5 the session token NEVER reaches the file', !!(r.text && r.text.indexOf(TOKEN) === -1),
      r.text && r.text.indexOf(TOKEN) !== -1 ? '⛔ TOKEN FOUND IN THE EXPORT' : 'absent');
    check('E0b ⛔ A MOUSE CAN LAND ON IT — nothing covers the control at its own centre',
      !!(r.reach && r.reach.unobstructed), JSON.stringify(r.reach));
    check('E4 the export WRITES NOTHING — no setItem, no removeItem, for the whole run',
      Array.isArray(r.writes) && r.writes.length === 0, JSON.stringify(r.writes));
    await ctx.close();
  }

  // ── E2 · the server is unreachable. A FILE STILL COMES OUT AND IT SAYS SO. ──
  {
    const { ctx, page } = await boot(browser, { signedIn: true, serverDown: true });
    const r = await exportViaButton(page);
    let j = null; try { j = JSON.parse(r.text); } catch (e) {}
    check('E2a server unreachable → a file is STILL produced (a refused backup is no backup)', !!r.name, JSON.stringify(r.name));
    check('E2b the browser copies are in it anyway', !!(j && j.counts.localStorage_keys >= 2), j && JSON.stringify(j.counts));
    check('E2c ⛔ THE FILE NAMES THE GAP — a partial export must not look complete',
      !!(j && j.counts.errors > 0 && /d1/.test(JSON.stringify(j.errors))), j && JSON.stringify(j.errors).slice(0, 140));
    await ctx.close();
  }

  // ── E3 · signed out. The browser copies are the ones that matter most then. ──
  {
    const { ctx, page } = await boot(browser, { signedIn: false });
    const r = await exportViaButton(page);
    let j = null; try { j = JSON.parse(r.text); } catch (e) {}
    check('E3a signed out → a file is still produced', !!r.name, JSON.stringify(r.name));
    check('E3b it still carries the browser store', !!(j && j.counts.localStorage_keys >= 2), j && JSON.stringify(j.counts));
    check('E3c and it names the missing server half rather than omitting it silently',
      !!(j && j.counts.errors > 0 && /signed in|session/i.test(JSON.stringify(j.errors))), j && JSON.stringify(j.errors).slice(0, 140));
    await ctx.close();
  }

  await browser.close(); server.close();
  lines.forEach((l) => console.log(l));
  console.log('\n' + (fail === 0 ? 'GREEN' : 'RED') + ' — ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_) {} process.exit(2); });
