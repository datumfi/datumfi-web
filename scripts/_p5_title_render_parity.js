'use strict';
// P5 Step-2 LIVE GATE — both archive titles resolve to the REAL signed-in name on a fresh
// incognito sign-in, with ZERO lag, and the 'Architect' fallback is never frozen.
// This bug is purely Clerk-load TIMING, so the stub makes Clerk.user null at parse and only
// populates it after load() resolves — reproducing the exact race the founder saw.
// Asserts BOTH stores INDEPENDENTLY (fail if EITHER is wrong):
//   (1) clean fresh incognito  -> title === "Sweety's <store>" (not "Architect's"); override key NOT written.
//   (2) poisoned override pre-seeded "Architect's <store>" -> healed (removed) AND title correct.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8182;
const base = 'http://127.0.0.1:' + PORT;
const out = { findings: [], pageErrors: [] };
const F = (cond, msg) => { if (!cond) out.findings.push(msg); };

// Clerk stub with REALISTIC delayed load: user is null synchronously (as at real parse time),
// and only becomes available after load() resolves — so the pre-Clerk render hits 'Architect'
// and only the post-Clerk re-render can produce the real name.
const DELAYED_CLERK = `(function(){
  window.Clerk = {
    user: null,
    load: function(){ var self=this; return new Promise(function(res){ setTimeout(function(){
      self.user = { firstName:'Sweety', primaryEmailAddress:{emailAddress:'sweety@example.com'}, unsafeMetadata:{}, update:function(){return Promise.resolve();} };
      res();
    }, 60); }); }
  };
  try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
})();`;

const abortExternal = (route) => { const u = route.request().url(); if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue(); return route.abort(); };

async function readTitle(ctx, urlPath, sel, seedOverrideKey, seedOverrideVal) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.route('**/*', abortExternal);
  await page.addInitScript(DELAYED_CLERK);
  if (seedOverrideKey) {
    await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [seedOverrideKey, seedOverrideVal]);
  }
  await page.goto(base + urlPath, { waitUntil: 'load' });
  await page.waitForTimeout(500); // Clerk resolves at 60ms; allow the post-Clerk re-render + rAF
  const r = await page.evaluate(([s, ok]) => ({
    title: (document.querySelector(s) || {}).value || '',
    overrideBP: localStorage.getItem('datum_blueprint_archive_title'),
    overrideSB: localStorage.getItem('datum_sketchbook_title'),
    workspace: localStorage.getItem('datum_workspace_name'),
    seededGone: ok ? !localStorage.getItem(ok) : null
  }), [sel, seedOverrideKey]);
  await page.close();
  return r;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ── (1) CLEAN fresh incognito — both titles must resolve to the real name, no override written ──
  const ctxA = await browser.newContext();
  const bpClean = await readTitle(ctxA, '/Blueprint.html', '#archive-title');
  const sbClean = await readTitle(await browser.newContext(), '/sketchbook.html', '#editable-notebook-title');

  F(bpClean.title === "Sweety's Blueprint Archive", '(1) BLUEPRINT clean title wrong: "' + bpClean.title + '" (expected Sweety\'s Blueprint Archive)');
  F(bpClean.overrideBP === null, '(1) BLUEPRINT wrote an override on passive render (' + bpClean.overrideBP + ')');
  F(sbClean.title === "Sweety's Sketchbook", '(1) SKETCHBOOK clean title wrong: "' + sbClean.title + '" (expected Sweety\'s Sketchbook)');
  F(sbClean.overrideSB === null, '(1) SKETCHBOOK wrote an override on passive render (' + sbClean.overrideSB + ')');

  // ── (2) POISONED override pre-seeded "Architect's ..." — must heal (remove) AND show real name ──
  const bpPoison = await readTitle(await browser.newContext(), '/Blueprint.html', '#archive-title', 'datum_blueprint_archive_title', "Architect's Blueprint Archive");
  const sbPoison = await readTitle(await browser.newContext(), '/sketchbook.html', '#editable-notebook-title', 'datum_sketchbook_title', "Architect's Sketchbook");

  F(bpPoison.seededGone === true, '(2) BLUEPRINT did NOT heal the poisoned override (still present)');
  F(bpPoison.title === "Sweety's Blueprint Archive", '(2) BLUEPRINT poisoned title not corrected: "' + bpPoison.title + '"');
  F(sbPoison.seededGone === true, '(2) SKETCHBOOK did NOT heal the poisoned override (still present)');
  F(sbPoison.title === "Sweety's Sketchbook", '(2) SKETCHBOOK poisoned title not corrected: "' + sbPoison.title + '"');

  out.bpClean = bpClean; out.sbClean = sbClean; out.bpPoison = bpPoison; out.sbPoison = sbPoison;
  out.verdict = (out.findings.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('P5 TITLE GATE ERROR', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
