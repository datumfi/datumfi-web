'use strict';
// P5 Step-2 LIVE GATE — both archive titles resolve to the REAL signed-in name with zero lag,
// the 'Architect' fallback is never frozen, AND a custom title (noun included) survives
// cross-device. The bug is Clerk-load timing + a localStorage-only override, so:
//  - clean/poison use a DELAYED Clerk stub (user null at parse, set after load resolves).
//  - cross-device uses a SERVER-BACKED stateful stub (unsafeMetadata persists across separate
//    browser contexts = simulates the real Clerk server / a fresh device, same account).
// Asserts BOTH stores INDEPENDENTLY (fail if EITHER wrong):
//  (1) clean fresh -> "Sweety's <store>"; override NOT written.
//  (2) poisoned "Architect's <store>" override -> healed (removed) AND title correct.
//  (3) CROSS-DEVICE: a full custom title with a DIFFERENT noun survives blur+reload+nav-away
//      AND a FRESH context (empty storage, same account) — EXACT string, noun included.
//  (4) reset to default CLEARS the Clerk mirror (custom does not resurrect on a fresh device).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
var CLERK_META = {};   // the simulated Clerk-server store (shared across contexts)
const server = http.createServer((req, res) => {
  var p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/__resetmeta') { CLERK_META = {}; res.writeHead(200); res.end('{}'); return; }
  if (p === '/__clerkmeta') {
    if (req.method === 'POST') { var b = ''; req.on('data', function (d) { b += d; }); req.on('end', function () { try { CLERK_META = JSON.parse(b || '{}'); } catch (e) {} res.writeHead(200); res.end('{}'); }); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(CLERK_META)); return;
  }
  if (p === '/') p = '/index.html';
  var fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8182;
const base = 'http://127.0.0.1:' + PORT;
const out = { findings: [], pageErrors: [], mirrorBytes: {} };
const F = (cond, msg) => { if (!cond) out.findings.push(msg); };

const DELAYED = `(function(){ window.Clerk={ user:null, load:function(){var s=this;return new Promise(function(r){setTimeout(function(){ s.user={firstName:'Sweety',primaryEmailAddress:{emailAddress:'sweety@example.com'},unsafeMetadata:{},update:function(){return Promise.resolve();}}; r(); },60);});} }; try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');}catch(e){} })();`;
// Server-backed stub: load() pulls meta from the simulated Clerk server; update() pushes it back.
const STATEFUL = `(function(){
  function getMeta(){ try{ var x=new XMLHttpRequest(); x.open('GET','/__clerkmeta',false); x.send(); return JSON.parse(x.responseText||'{}'); }catch(e){ return {}; } }
  function putMeta(m){ try{ var x=new XMLHttpRequest(); x.open('POST','/__clerkmeta',false); x.setRequestHeader('Content-Type','application/json'); x.send(JSON.stringify(m||{})); }catch(e){} }
  window.Clerk={ user:null, load:function(){var s=this;return new Promise(function(r){setTimeout(function(){
    s.user={ firstName:'Sweety', primaryEmailAddress:{emailAddress:'sweety@example.com'}, unsafeMetadata:getMeta(),
      update:function(o){ var nm=(o&&o.unsafeMetadata)||{}; putMeta(nm); this.unsafeMetadata=nm; return Promise.resolve(); } };
    r(); },60);});} };
  try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');}catch(e){}
})();`;
const abortExt = (route) => { const u = route.request().url(); if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue(); return route.abort(); };

async function newPage(ctx, stub) { const pg = await ctx.newPage(); pg.on('pageerror', (e) => out.pageErrors.push(e.message)); pg.on('console', (m) => { var t = m.text(); if (/title mirror/.test(t)) out.mirrorBytes[t] = true; }); await pg.route('**/*', abortExt); await pg.addInitScript(stub); return pg; }
async function titleOf(pg, sel) { return pg.evaluate((s) => (document.querySelector(s) || {}).value || '', sel); }

async function readClean(ctx, urlPath, sel, seedKey, seedVal) {
  const pg = await newPage(ctx, DELAYED);
  if (seedKey) await pg.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [seedKey, seedVal]);
  await pg.goto(base + urlPath, { waitUntil: 'load' }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(([s, ok]) => ({ title: (document.querySelector(s) || {}).value || '', ov: ok ? localStorage.getItem(ok) : null, gone: ok ? !localStorage.getItem(ok) : null }), [sel, seedKey]);
  await pg.close(); return r;
}

async function typeBlur(pg, sel, val) { await pg.evaluate(([s, t]) => { var el = document.querySelector(s); el.focus(); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); el.dispatchEvent(new Event('blur', { bubbles: true })); }, [sel, val]); await pg.waitForTimeout(300); }
async function clearField(pg, sel) { await pg.evaluate((s) => { var el = document.querySelector(s); el.focus(); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); el.dispatchEvent(new Event('blur', { bubbles: true })); }, sel); await pg.waitForTimeout(250); }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // (1) CLEAN + (2) POISON — delayed stub, no server meta
  const bpClean = await readClean(await browser.newContext(), '/Blueprint.html', '#archive-title');
  const sbClean = await readClean(await browser.newContext(), '/sketchbook.html', '#editable-notebook-title');
  F(bpClean.title === "Sweety's Blueprint Archive", '(1) BLUEPRINT clean: "' + bpClean.title + '"');
  F(bpClean.ov === null, '(1) BLUEPRINT wrote override on passive render (' + bpClean.ov + ')');
  F(sbClean.title === "Sweety's Sketchbook", '(1) SKETCHBOOK clean: "' + sbClean.title + '"');
  F(sbClean.ov === null, '(1) SKETCHBOOK wrote override on passive render (' + sbClean.ov + ')');
  const bpPo = await readClean(await browser.newContext(), '/Blueprint.html', '#archive-title', 'datum_blueprint_archive_title', "Architect's Blueprint Archive");
  const sbPo = await readClean(await browser.newContext(), '/sketchbook.html', '#editable-notebook-title', 'datum_sketchbook_title', "Architect's Sketchbook");
  F(bpPo.gone === true && bpPo.title === "Sweety's Blueprint Archive", '(2) BLUEPRINT poison heal failed: gone=' + bpPo.gone + ' title="' + bpPo.title + '"');
  F(sbPo.gone === true && sbPo.title === "Sweety's Sketchbook", '(2) SKETCHBOOK poison heal failed: gone=' + sbPo.gone + ' title="' + sbPo.title + '"');

  // (3) CROSS-DEVICE — stateful server-backed stub
  await fetch(base + '/__resetmeta').catch(() => {});
  const SB_CUSTOM = "Sweety's Sketches", BP_CUSTOM = "Sweety's Blueprints";
  const dev1 = await browser.newContext();
  // device 1: set custom titles on both stores, verify same-session + reload + nav-away
  let pg = await newPage(dev1, STATEFUL); await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await typeBlur(pg, '#editable-notebook-title', SB_CUSTOM);
  out.sbSameSession = await titleOf(pg, '#editable-notebook-title');
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(500); out.sbReload = await titleOf(pg, '#editable-notebook-title');
  await pg.goto(base + '/studio.html', { waitUntil: 'load' }).catch(() => {}); await pg.waitForTimeout(300);
  await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(500); out.sbNavBack = await titleOf(pg, '#editable-notebook-title');
  await pg.close();
  pg = await newPage(dev1, STATEFUL); await pg.goto(base + '/Blueprint.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await typeBlur(pg, '#archive-title', BP_CUSTOM); out.bpSameSession = await titleOf(pg, '#archive-title'); await pg.close();
  await dev1.close();

  // device 2: FRESH context (empty storage), SAME account (server meta persists) — noun must survive
  const dev2 = await browser.newContext();
  pg = await newPage(dev2, STATEFUL); await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(600); out.sbFresh = await titleOf(pg, '#editable-notebook-title'); await pg.close();
  pg = await newPage(dev2, STATEFUL); await pg.goto(base + '/Blueprint.html', { waitUntil: 'load' }); await pg.waitForTimeout(600); out.bpFresh = await titleOf(pg, '#archive-title'); await pg.close();
  await dev2.close();

  F(out.sbSameSession === SB_CUSTOM, '(3) SKETCHBOOK same-session: "' + out.sbSameSession + '"');
  F(out.sbReload === SB_CUSTOM, '(3) SKETCHBOOK reload: "' + out.sbReload + '"');
  F(out.sbNavBack === SB_CUSTOM, '(3) SKETCHBOOK nav-back: "' + out.sbNavBack + '"');
  F(out.sbFresh === SB_CUSTOM, '(3) SKETCHBOOK FRESH DEVICE lost the noun: "' + out.sbFresh + '" (expected "' + SB_CUSTOM + '")');
  F(out.bpSameSession === BP_CUSTOM, '(3) BLUEPRINT same-session: "' + out.bpSameSession + '"');
  F(out.bpFresh === BP_CUSTOM, '(3) BLUEPRINT FRESH DEVICE lost the noun: "' + out.bpFresh + '" (expected "' + BP_CUSTOM + '")');

  // (4) RESET CLEARS THE MIRROR — reset both on a device, confirm server meta drops the keys,
  // and a fresh device falls back to the personalized default (custom does NOT resurrect).
  const dev3 = await browser.newContext();
  pg = await newPage(dev3, STATEFUL); await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await typeBlur(pg, '#editable-notebook-title', "Sweety's Sketchbook");   // reset to personalized default
  await pg.close();
  pg = await newPage(dev3, STATEFUL); await pg.goto(base + '/Blueprint.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await typeBlur(pg, '#archive-title', "Sweety's Blueprint Archive"); await pg.close();
  await dev3.close();
  out.metaAfterReset = await (await fetch(base + '/__clerkmeta').then((r) => r.json()).catch(() => ({})));
  F(!out.metaAfterReset.sb_title, '(4) reset did NOT clear sb_title mirror (' + out.metaAfterReset.sb_title + ')');
  F(!out.metaAfterReset.bp_title, '(4) reset did NOT clear bp_title mirror (' + out.metaAfterReset.bp_title + ')');
  const dev4 = await browser.newContext();
  pg = await newPage(dev4, STATEFUL); await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(600); out.sbFreshAfterReset = await titleOf(pg, '#editable-notebook-title'); await pg.close();
  await dev4.close();
  F(out.sbFreshAfterReset === "Sweety's Sketchbook", '(4) custom title resurrected after reset on fresh device: "' + out.sbFreshAfterReset + '"');

  // (5) EMPTY-FIELD DEFAULT === post-Clerk default: clearing to empty (signed in) must yield
  // the personalized "Sweety's <store>", NOT the generic "My …" that later morphs.
  await fetch(base + '/__resetmeta').catch(() => {});
  const dev5 = await browser.newContext();
  pg = await newPage(dev5, DELAYED); await pg.goto(base + '/sketchbook.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await clearField(pg, '#editable-notebook-title'); out.sbCleared = await titleOf(pg, '#editable-notebook-title'); await pg.close();
  pg = await newPage(dev5, DELAYED); await pg.goto(base + '/Blueprint.html', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  await clearField(pg, '#archive-title'); out.bpCleared = await titleOf(pg, '#archive-title'); await pg.close();
  await dev5.close();
  F(out.sbCleared === "Sweety's Sketchbook", '(5) SKETCHBOOK clear-to-empty gave "' + out.sbCleared + '" (expected the personalized default, NOT a generic My-prefixed one)');
  F(out.bpCleared === "Sweety's Blueprint Archive", '(5) BLUEPRINT clear-to-empty gave "' + out.bpCleared + '" (expected the personalized default, NOT a generic My-prefixed one)');

  out.mirrorLogLines = Object.keys(out.mirrorBytes);
  out.verdict = (out.findings.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('P5 TITLE GATE ERROR', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
