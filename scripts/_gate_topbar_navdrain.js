'use strict';
/* TOPBAR NAV ROUTING · RED-FIRST — the tab bar goes through the page chokepoint, AND FAILS OPEN.
 *
 * WHY. For a signed-in user the account topbar IS the navigation: nav.js hides #app-nav at :115 and injects
 * the topbar, whose seven tabs each did a bare window.location.href. So a tab hop bypassed _navDrain — it
 * abandoned an in-flight save mid-write, and it would have missed any unsaved-work guard placed at that
 * chokepoint. A guard that misses the most common exit is worse than no guard: it teaches people they will
 * be warned.
 *
 * THE LOAD-BEARING ASSERTION IS NAV 3, NOT NAV 1. NAV 1 proves the feature; NAV 3 proves it cannot hurt
 * anyone. Routing a navigation through our own JavaScript converts something the browser GUARANTEES into
 * something conditional on our code completing — and a tab bar that silently does nothing strands the user
 * on every signed-in surface at once, with no error and no workaround. A protection that can strand someone
 * is a bigger defect than the loss it prevents (L60).
 *
 * HONEST NOTE ON WHAT RED-FIRSTS AGAINST WHAT, because these are not the same kind of check:
 *   NAV 1 (routing) FAILS against the pre-change code — the tab did a bare location.href and never called
 *         the chokepoint. That is the feature red-first.
 *   NAV 2 / NAV 3 (fail open) CANNOT fail against the pre-change code, because before the change there was
 *         nothing in front of the navigation to fail. They are guarded by the --nofailopen mutation, which
 *         removes the try/catch and must strand the navigation. Claiming they red-first against today
 *         would be claiming a proof this file cannot produce.
 *
 * RACE DECLARATIONS (L52): none of the four are races. Each drives one real click and then reads whether a
 * navigation occurred, with a fixed settle. No sampling needed.
 *
 * WHAT IS ASSERTED: whether the page NAVIGATED, and what the chokepoint was handed. Not console, not
 * network.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const NOFAILOPEN = process.argv.includes('--nofailopen');
// --barehref restores the PRE-CHANGE tab, a bare location.href that never reaches the chokepoint. This is
// the FEATURE red-first: NAV 1 must go red under it, proving the routing is what makes NAV 1 green.
const BAREHREF = process.argv.includes('--barehref');
/* ⛔ RE-AIMED 2026-08-22 FROM 'sketches' TO 'myblueprints', AND IT IS A PREMISE REPAIR, NOT A
   RELABEL. This fixture boots /studio.html and used to click the Sketchbook tab — "the one a
   signed-in user clicks to leave for their sketchbook". The Captain's context-aware nav ruling
   REMOVED that tab from the Studio, so the journey this gate drove no longer exists: a signed-in
   user on the Studio cannot leave for the sketchbook from the top bar, by design.
   ⭐ THE ARCHIVE HOP IS THE REAL CROSS-SURFACE JOURNEY FROM THE STUDIO NOW, so the chokepoint is
   proven against a hop a user actually makes. The gate's SUBJECT is unchanged — a topbar tab hop
   must go through _navDrain and must fail open — only the tab it drives has moved to one that is
   still there.
   ⚠️ THE ALTERNATIVE WAS TO BOOT /sketch.html AND KEEP CLICKING 'sketches'. Rejected: the topbar
   defect this gate was built for was found on the Studio, and moving the fixture off that surface
   to preserve a tab name would test the chokepoint somewhere the original bug never lived. */
const A_TAB = "      case 'myblueprints': _leave('/Blueprint.html');   break;";
const M_TAB = "      case 'myblueprints': window.location.href = '/Blueprint.html';   break;";
const A_TRY = "    try {\n      if (typeof window._navDrain === 'function') { window._navDrain(url); return; }\n    } catch (e) {}\n    window.location.href = url;";
const M_TRY = "    if (typeof window._navDrain === 'function') { window._navDrain(url); return; }\n    window.location.href = url;";
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/scripts/account-topbar.js' && BAREHREF) {
    const orig = body.toString('utf8');
    const n = orig.split(A_TAB).length - 1;
    if (n !== 1) throw new Error(`anchor tab: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_TAB, M_TAB);
    jsDiffers = jsDiffers || (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  if (p === '/scripts/account-topbar.js' && NOFAILOPEN) {
    const orig = body.toString('utf8');
    const n = orig.split(A_TRY).length - 1;
    if (n !== 1) throw new Error(`anchor failopen: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_TRY, M_TRY);
    jsDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8246; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  /* mode decides what window._navDrain is at the moment the tab is clicked:
   *   'spy'    a well-behaved chokepoint that records the url and does NOT navigate
   *   'throws' a chokepoint that throws — the failure this guard exists to survive
   *   'absent' no chokepoint at all (every signed-in page that is not Studio or Sketch) */
  async function run(mode) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); } catch(e){}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
    })();`);
    await page.goto(base + '/studio.html', { waitUntil: 'commit' });
    // The topbar is injected by nav.js after it detects the auth hint; wait for the real element.
    await page.waitForSelector('[data-acct-tab]', { timeout: 30000 });
    await sleep(2500);

    const startUrl = page.url();
    await page.evaluate((m) => {
      window.__drained = [];
      if (m === 'absent') { try { delete window._navDrain; } catch (e) { window._navDrain = undefined; } return; }
      if (m === 'throws') { window._navDrain = function () { throw new Error('chokepoint exploded'); }; return; }
      window._navDrain = function (url) { window.__drained.push(url); };   // records, deliberately does NOT navigate
    }, mode);

    // Drive a REAL tab button — the one a signed-in user on the Studio clicks to leave for their
    // Archive. (Was 'sketches' until 2026-08-22; the context-aware nav removed that tab from this
    // surface, so clicking it here would be driving a journey the product no longer offers.)
    const clicked = await page.evaluate(() => {
      const b = document.querySelector('[data-acct-tab="myblueprints"]');
      if (!b) return false;
      b.click(); return true;
    });
    await sleep(2500);   // ample for a navigation to commit if one is going to happen

    const endUrl = page.url();
    const drained = await page.evaluate(() => (window.__drained || []).slice()).catch(() => []);
    await ctx.close();
    return { clicked: clicked, navigated: endUrl !== startUrl, endUrl: endUrl, drained: drained };
  }

  const spy = await run('spy');
  lines.push(`      [chokepoint present] clicked=${spy.clicked} handed=${JSON.stringify(spy.drained)} navigated=${spy.navigated}`);
  ok(spy.clicked, 'NAV 0: the real topbar tab button exists and was clicked');
  ok(spy.drained.indexOf('/Blueprint.html') >= 0,
    `NAV 1: a topbar tab hop goes THROUGH the page chokepoint with the right url (handed ${JSON.stringify(spy.drained)})`);
  ok(!spy.navigated,
    'NAV 1b: and it does NOT navigate behind the chokepoint back — the chokepoint owns the hop');

  const absent = await run('absent');
  lines.push(`      [chokepoint absent]  navigated=${absent.navigated} -> ${absent.endUrl}`);
  ok(absent.navigated && /Blueprint\.html$/.test(absent.endUrl),
    `NAV 2 FAIL-OPEN: with NO chokepoint on the page, the tab still navigates (landed ${absent.endUrl})`);

  const threw = await run('throws');
  lines.push(`      [chokepoint throws]  navigated=${threw.navigated} -> ${threw.endUrl}`);
  ok(threw.navigated && /Blueprint\.html$/.test(threw.endUrl),
    `NAV 3 FAIL-OPEN, LOAD-BEARING: when the chokepoint THROWS, the tab still navigates and the user is not stranded (landed ${threw.endUrl})`);

  await browser.close();
  await new Promise((r) => server.close(r));

  if (NOFAILOPEN || BAREHREF) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (account-topbar.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = NOFAILOPEN ? 'MUTATED[nofailopen]' : (BAREHREF ? 'MUTATED[barehref]' : 'CLEAN');
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (NOFAILOPEN || BAREHREF) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the try/catch was removed and nobody was stranded.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
