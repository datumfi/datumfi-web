'use strict';
/* IN-SITE LINK GUARD · RED-FIRST — a signed-out visitor's links go through the page chokepoint, AND FAIL OPEN.
 *
 * WHY. 4974f74 routed the seven account-topbar tabs, which is the navigation a SIGNED-IN user uses. A
 * SIGNED-OUT visitor never sees that topbar (nav.js injects it only on the auth hint at :123 and hides
 * #app-nav at :115) and navigates by plain <a href> instead — so every exit belonging to the one person a
 * conversion prompt is FOR went around the chokepoint. This gate covers that half.
 *
 * THE LOAD-BEARING ASSERTION IS LINK 3, NOT LINK 1. LINK 1 proves the feature works; LINK 3 proves it
 * cannot hurt anyone. Putting our JavaScript in front of a plain <a href> converts a browser GUARANTEE into
 * something conditional on our code, and a dead link on Sketch and Studio is a bigger defect than the loss
 * it prevents (L60).
 *
 * TWO CLASSES OF ASSERTION, AND THEY ARE NOT DRIVEN THE SAME WAY — stated rather than blurred:
 *   LINK 0/1/1b/2/3  REAL clicks. The assertion is whether the PAGE NAVIGATED, so only a real click can
 *                    settle it. These are the load-bearing ones.
 *   LINK 4/5/6       DISPATCHED clicks. An untrusted click does not trigger the browser's own navigation,
 *                    which is exactly what lets us observe our listener's DECISION in isolation without a
 *                    ctrl-click spawning a tab or an external link leaving the harness. WHAT THEY PROVE:
 *                    the decision logic. WHAT THEY DO NOT PROVE: that the browser default then behaves.
 *                    Their positive control is LINK 4P — a dispatched PLAIN click, same run, same listener,
 *                    which MUST drain. A zero is only evidence if the same instrument produces a non-zero
 *                    (L68), so the three negatives and the positive ride together or none of them count.
 *   LINK 5/6 use two anchors this rig INJECTS (an off-origin href and a bare #hash), because sketch.html
 *   carries neither. That is a rig artifact and is declared, not hidden: it tests the rule, not the markup.
 *
 * RACE DECLARATIONS (L52): none. Each click is driven once and read after a fixed settle ample for a
 * navigation to commit if one were going to.
 *
 * WHAT IS ASSERTED: whether the page navigated, and what the chokepoint was handed. Not console, not network.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

// --noguard    restores the PRE-CHANGE world: the decision phase bails immediately, so a link is a plain
//              link again and never reaches the chokepoint. THE FEATURE RED-FIRST.
const NOGUARD    = process.argv.includes('--noguard');
// --nofailopen removes the ACT try/catch, so a throwing chokepoint strands the user on a dead link.
const NOFAILOPEN = process.argv.includes('--nofailopen');
// --noignore   disarms the modified-click check, so a ctrl-click meant for a new tab gets hijacked.
const NOIGNORE   = process.argv.includes('--noignore');

const A_GUARD  = '      if (e.defaultPrevented) return;';
const M_GUARD  = '      if (true) return;';
const A_IGNORE = '      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;';
const M_IGNORE = '      if (false) return;';
const A_FAIL   = "    try {\n      window._navDrain(url.href);\n    } catch (err) {";
const M_FAIL   = "    if (true) {\n      window._navDrain(url.href);\n    } else if (false) { var err;";
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mutate(src) {
  let out = src;
  const apply = (anchor, replacement, label) => {
    const n = out.split(anchor).length - 1;
    if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
    out = out.replace(anchor, replacement);
  };
  if (NOGUARD)    apply(A_GUARD,  M_GUARD,  'guard');
  if (NOIGNORE)   apply(A_IGNORE, M_IGNORE, 'ignore');
  if (NOFAILOPEN) apply(A_FAIL,   M_FAIL,   'failopen');
  jsDiffers = jsDiffers || (out !== src);
  return out;
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/nav.js' && (NOGUARD || NOFAILOPEN || NOIGNORE)) {
    body = Buffer.from(mutate(body.toString('utf8')), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8251; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  /* mode decides what window._navDrain is at the moment the link is clicked:
   *   'spy'    a well-behaved chokepoint that records the url and does NOT navigate
   *   'throws' a chokepoint that throws — the failure this guard exists to survive
   *   'absent' no chokepoint at all */
  async function open(mode) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    // SIGNED OUT on purpose — no datum_auth_hint — so #app-nav is the navigation, which is the whole point.
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); } catch(e){}
    })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#nav-link-studio', { timeout: 30000 });
    await sleep(2000);
    await page.evaluate((m) => {
      window.__drained = [];
      if (m === 'absent') { try { delete window._navDrain; } catch (e) { window._navDrain = undefined; } return; }
      if (m === 'throws') { window._navDrain = function () { throw new Error('chokepoint exploded'); }; return; }
      window._navDrain = function (url) { window.__drained.push(url); };   // records, deliberately does NOT navigate
    }, mode);
    return { ctx, page };
  }

  // ── REAL-CLICK RUNS ────────────────────────────────────────────────────────────────────────────────
  async function realClick(mode) {
    const { ctx, page } = await open(mode);
    const startUrl = page.url();
    const clicked = await page.evaluate(() => {
      const a = document.getElementById('nav-link-studio');
      if (!a) return false;
      a.click(); return true;                       // a real element .click() carries the browser default
    });
    await sleep(2500);
    const endUrl = page.url();
    const drained = await page.evaluate(() => (window.__drained || []).slice()).catch(() => []);
    await ctx.close();
    return { clicked, navigated: endUrl !== startUrl, endUrl, drained };
  }

  const spy = await realClick('spy');
  lines.push(`      [chokepoint present] clicked=${spy.clicked} handed=${JSON.stringify(spy.drained)} navigated=${spy.navigated}`);
  ok(spy.clicked, 'LINK 0: the signed-out nav anchor #nav-link-studio exists and was clicked');
  ok(spy.drained.some((u) => /\/studio\.html$/.test(u)),
    `LINK 1: a signed-out nav click goes THROUGH the page chokepoint with the right url (handed ${JSON.stringify(spy.drained)})`);
  ok(!spy.navigated,
    'LINK 1b: and the browser does NOT navigate behind the chokepoint back — the chokepoint owns the hop');

  const absent = await realClick('absent');
  lines.push(`      [chokepoint absent]  navigated=${absent.navigated} -> ${absent.endUrl}`);
  ok(absent.navigated && /studio\.html$/.test(absent.endUrl),
    `LINK 2 FAIL-OPEN: with NO chokepoint on the page, the link still navigates (landed ${absent.endUrl})`);

  const threw = await realClick('throws');
  lines.push(`      [chokepoint throws]  navigated=${threw.navigated} -> ${threw.endUrl}`);
  ok(threw.navigated && /studio\.html$/.test(threw.endUrl),
    `LINK 3 FAIL-OPEN, LOAD-BEARING: when the chokepoint THROWS, the link still navigates and the user is not stranded (landed ${threw.endUrl})`);

  // ── DECISION RUN — the ignore list, plus its positive control, one run, one listener ────────────────
  const { ctx: dctx, page: dpage } = await open('spy');
  const decision = await dpage.evaluate(() => {
    const out = {};
    const nav = document.getElementById('app-nav') || document.body;
    const ext = document.createElement('a'); ext.href = 'https://example.com/x'; ext.id = '_rig_ext'; ext.textContent = 'x'; nav.appendChild(ext);
    const hsh = document.createElement('a'); hsh.href = '#somewhere';           hsh.id = '_rig_hash'; hsh.textContent = 'h'; nav.appendChild(hsh);
    const fire = (el, init) => {
      window.__drained = [];
      el.dispatchEvent(new MouseEvent('click', Object.assign({ bubbles: true, cancelable: true, button: 0 }, init || {})));
      return window.__drained.slice();
    };
    const studio = document.getElementById('nav-link-studio');
    out.ctrl  = fire(studio, { ctrlKey: true });
    out.ext   = fire(ext);
    out.hash  = fire(hsh);
    out.plain = fire(studio);                    // POSITIVE CONTROL — same run, same listener
    return out;
  });
  await dctx.close();
  lines.push(`      [decision] ctrl=${JSON.stringify(decision.ctrl)} ext=${JSON.stringify(decision.ext)} hash=${JSON.stringify(decision.hash)} plain=${JSON.stringify(decision.plain)}`);
  ok(decision.plain.some((u) => /\/studio\.html$/.test(u)),
    `LINK 4P POSITIVE CONTROL: a dispatched PLAIN click DOES reach the chokepoint on this instrument (handed ${JSON.stringify(decision.plain)}) — without this the three zeros below prove nothing`);
  ok(decision.ctrl.length === 0,
    `LINK 4: a ctrl-click (the user asked for a NEW TAB) is NOT hijacked (handed ${JSON.stringify(decision.ctrl)})`);
  ok(decision.ext.length === 0,
    `LINK 5: a link to another origin is NOT routed through our chokepoint (handed ${JSON.stringify(decision.ext)})`);
  ok(decision.hash.length === 0,
    `LINK 6: a pure in-page #anchor is NOT treated as leaving the page (handed ${JSON.stringify(decision.hash)})`);

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOGUARD || NOFAILOPEN || NOIGNORE;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (nav.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = NOGUARD ? 'MUTATED[noguard]' : NOFAILOPEN ? 'MUTATED[nofailopen]' : NOIGNORE ? 'MUTATED[noignore]' : 'CLEAN';
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
