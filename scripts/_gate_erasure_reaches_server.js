'use strict';
/* _gate_erasure_reaches_server.js — STANDING GATE
 *
 * THE CLAIM: Delete My Data DELETES. Server first, browser second, and nothing rebuilds it.
 *
 * ⛔⛔ WHAT IT USED TO DO. `deleteDataOnly()` called localStorage.clear() and sessionStorage.clear()
 * and nothing else — then `_datumRestoreFromClerk`, which runs on EVERY page load, rebuilt the
 * archive from D1 and Clerk. The Article 17 control UNDID ITSELF in front of the person who had
 * just asked for deletion, and the modal told them their data was gone.
 *   🔑 §26.1 ON A LEGAL SURFACE: A PERFECT LOCAL SWEEP IS UNDONE BY THE NEXT PAGE LOAD.
 *
 * ── WHY THE CENSUS IS TAKEN TWICE ────────────────────────────────────────────────────────────
 * At the click, and again after a full page load. ONE MEASUREMENT AFTER A DESTRUCTIVE EVENT CANNOT
 * DISTINGUISH "NEVER REMOVED" FROM "REMOVED AND RESTORED" — they have different fixes (the delete
 * path versus the restore path) and an after-the-fact scan blames the wrong one. That distinction
 * cost most of a session on the boot draft this morning; it is not being re-learned here.
 *
 * ── THE SERVER IS OBSERVED, NOT ASSUMED ──────────────────────────────────────────────────────
 * D1 is a stub whose rows live in the page, so the gate can assert rows were actually DELETED
 * rather than that a delete was merely dispatched. A gate that asserts "we called deleteDoc" passes
 * over an endpoint that returns 500 to every request.
 *   ⚠️ And Clerk's unsafeMetadata is asserted EMPTY afterwards, because clearing it is what stops
 *      the *_z mirrors from reseeding — the restore path reads Clerk before it reads anything local.
 *
 * LEGS
 *   E0 · PAIRED PRESENCE — the fixture really had server rows and metadata before the click. Every
 *        leg below is an absence assertion and they all pass over an empty fixture.
 *   E1 · the D1 rows are GONE (observed on the stub, not inferred from a call)
 *   E2 · Clerk unsafeMetadata is EMPTY
 *   E3 · local storage carries no fixture value AT THE CLICK
 *   E4 · and still carries none AFTER A FULL PAGE LOAD — the leg the old tool would fail
 *   E5 · ORDER — the server deletes were attempted BEFORE the local clear. Clearing first destroys
 *        the token the deletes authenticate with, so they would fail silently.
 *   E6 · DatumD1.TYPES covers every document type any call site actually uses. Erasure iterates
 *        that array, so a type missing from it is a type the tool silently will not delete.
 *
 * CONTROL
 *   --oldtool : restores the browser-only delete. E1/E2/E4 must red while E0/E3 hold — the shape of
 *               the original defect, which is "the local clear worked and the data came back".
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_erasure_reaches_server.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const PORT = 8203;
const BASE = 'http://127.0.0.1:' + PORT;
const OLDTOOL = process.argv.includes('--oldtool');

const A_ERASE = '    _datumEraseEverywhere(function () { _datumDeleteDone(); });';
const M_ERASE = '    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} _datumDeleteDone();';

function armAnchor(src, anchor, replacement, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.error('CONTROL ' + label + ': expected exactly 1 anchor occurrence, found ' + n + '.');
    console.error('  Refusing to run a control that cannot be shown to have landed.');
    process.exit(1);
  }
  return src.split(anchor).join(replacement);
}

/* ⛔⛔ CLERK METADATA LIVES ON THE SERVER, NOT IN THE PAGE — and in this gate it must, or E4 cannot
   mean anything. The Clerk stub is an init script, so it is RE-CREATED on every navigation; a stub
   holding its metadata in a JS object re-arms the very data the erase just cleared, and E4 reads
   data the fixture itself put back. It cannot live in localStorage either, because the erase clears
   that by design. So it lives HERE, across the wire, exactly where the real thing lives.
   (Same shape as _p5_title_render_parity's /__clerkmeta — an existing pattern, not a new one.) */
let CLERK_META = null;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  if (p === '/__clerkmeta') {
    if (req.method === 'POST') {
      let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { CLERK_META = JSON.parse(b || 'null'); } catch (e) {} res.writeHead(200); res.end('{}'); });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(CLERK_META || {})); return;
  }
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  /* ⛔ THE D1 STUB IS SERVED AS datum-d1.js ITSELF, NOT INSTALLED BY AN INIT SCRIPT. The first
     version installed it on window and the page's own <script src="datum-d1.js"> then REPLACED it —
     `live` went false, eraseEverywhere skipped straight to Clerk, and E1 failed for a fixture
     reason that looked exactly like a product reason. A stub that the code under test can overwrite
     is not a stub.
     Its rows live in the page so the gate can watch them DISAPPEAR: asserting that deleteDoc was
     CALLED would pass over a server that rejects every delete. */
  if (/(^|\/)datum-d1\.js$/.test(p)) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`(function(g){
      var rows = { blueprint: ['bp1','bp2'], sketchbook: ['sk1'], preferences: ['dossier'], studio: ['active'] };
      g.__rows = rows; g.__order = g.__order || [];
      g.DatumD1 = {
        CUTOVER: true,
        TYPES: ['blueprint','sketchbook','preferences','studio'],
        signedIn: function(){ return !!(g.Clerk && g.Clerk.user); },
        listDocs: function(t){ return Promise.resolve((rows[t]||[]).map(function(k){ return { doc_key:k }; })); },
        deleteDoc: function(t,k){
          g.__order.push('d1:'+t+'/'+k);
          rows[t] = (rows[t]||[]).filter(function(x){ return x!==k; });
          return Promise.resolve({ ok:true, deleted:1 });
        },
        getDoc: function(){ return Promise.resolve(null); },
        putDoc: function(){ return Promise.resolve({ok:true}); },
        writeNow: function(){ return Promise.resolve({ok:true}); },
        scheduleWrite: function(){}, writePreferences: function(){},
        setRevision: function(){}, knownRevision: function(){ return null; },
        drain: function(){ return Promise.resolve(); },
        onState: function(cb){ return {}; }, getState: function(){ return {}; }
      };
    }(window));`);
    return;
  }
  if (OLDTOOL && /(^|\/)nav\.js$/.test(p)) {
    const src = armAnchor(fs.readFileSync(fp, 'utf8'), A_ERASE, M_ERASE, '--oldtool');
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(src); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

/* High-entropy fixture values so a storage scan cannot raise a false positive on unrelated data. */
const FX = ['271828', '1618033', 'Aardvark', 'erasureprobe@example.com'];
const DOS = { schema: 'DatumFIAccountDossierV4', title: 'ERASE ME',
  primary: { name: 'Alice Aardvark', dateOfBirth: '1979-03', grossIncome: 1618033 },
  contact: { email: 'erasureprobe@example.com' }, defaults: { defaultDatum: 271828 }, accounts: {}, household: {} };

const INIT = `(function(){
  var UID = 'user_erase';
  window.__order = [];
  function _getMeta(){ try { var x=new XMLHttpRequest(); x.open('GET','/__clerkmeta',false); x.send(); return JSON.parse(x.responseText||'{}'); } catch(e){ return {}; } }
  function _putMeta(m){ try { var x=new XMLHttpRequest(); x.open('POST','/__clerkmeta',false); x.send(JSON.stringify(m||{})); } catch(e){} }
  window.Clerk = {
    load: function(){ return Promise.resolve(); },
    user: { id: UID, unsafeMetadata: _getMeta(),
            update: function(o){ window.__order.push('clerk:update');
                                 var m = (o && o.unsafeMetadata) || {};
                                 window.Clerk.user.unsafeMetadata = m; _putMeta(m); return Promise.resolve(); } },
    signOut: function(){ return Promise.resolve(); }, addListener: function(){}
  };
  /* Order probe: the FIRST local clear must come AFTER the server work. */
  var _clr = Storage.prototype.clear;
  Storage.prototype.clear = function(){ window.__order.push('local:clear'); return _clr.apply(this, arguments); };
  window.confirm = function(){ return true; };
})();`;

/* ⛔⛔ THE STORAGE SEED IS NOT IN THE INIT SCRIPT, AND THAT IS THE WHOLE REASON E4 CAN MEAN
   ANYTHING. Playwright re-runs an init script on EVERY navigation, so a seeder installed there
   RE-CREATES the fixture on the reload — and E4, whose entire job is to prove the data did not come
   back, would have been reading data the gate itself had just put there. Measured on this gate's
   own first run, and it is the SECOND time this exact trap has bitten today.
     🔑 A FIXTURE THAT RE-ARMS THE STATE UNDER TEST IS NOT A FIXTURE, IT IS A SECOND ACTOR.
   Seeded ONCE, before the first real navigation. The Clerk stub stays an init script because it
   must exist before page scripts run and it seeds no storage of its own. */
const SEED = `(() => { try {
  var UID = 'user_erase';
  var s = JSON.stringify(${JSON.stringify(DOS)});
  localStorage.setItem('datumfi.accountDossier.v15', s);
  localStorage.setItem('datumfi.accountDossier.owner', UID);
  localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify({slot1:{portfolio_total:1618033}}));
  localStorage.setItem('datum_sketch_byid_9f3a-dead-beef', JSON.stringify({datum:271828}));
  localStorage.setItem('datum_workspace_name', 'Alice Aardvark');
  sessionStorage.setItem('datum_targetSpend','271828');
  sessionStorage.setItem('datumfi_skip_entry_overlay','1');
  localStorage.setItem('datum-discover-v1','done');
  localStorage.setItem('datum_studio_overlay_seen','1');
} catch(e) {} })();`;

const CENSUS = `(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out['ls:'+k] = localStorage.getItem(k); }
  for (let j = 0; j < sessionStorage.length; j++) { const k = sessionStorage.key(j); out['ss:'+k] = sessionStorage.getItem(k); }
  return out;
})()`;

function dirty(census) {
  const hits = [];
  Object.keys(census).forEach((k) => {
    const v = String(census[k] == null ? '' : census[k]);
    FX.forEach((n) => { if (v.indexOf(n) >= 0) hits.push(k + ' [' + n + ']'); });
  });
  return hits;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_erasure_reaches_server — ' + (OLDTOOL ? '--oldtool' : 'baseline') + '\n');

  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  CLERK_META = { blueprint_z: 'BPZ', sketchbook_z: 'SKZ', dossier: DOS, bp_title: 'T' };
  await page.goto(BASE + '/404.html', { waitUntil: 'commit' });   // cheap same-origin page
  await page.evaluate(SEED);                                       // ONCE, never per-navigation
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);

  const before = await page.evaluate(`(async () => {
    const rows = window.__rows;
    const n = Object.keys(rows).reduce((a, t) => a + rows[t].length, 0);
    const meta = Object.keys((window.Clerk.user.unsafeMetadata) || {}).length;
    const c = ${CENSUS};
    return { rows: n, meta, dirty: Object.keys(c).length };
  })()`);
  check('E0 · PAIRED PRESENCE — the fixture really had server rows and metadata before the click',
    before.rows > 0 && before.meta > 0, 'd1Rows=' + before.rows + ' metaKeys=' + before.meta);

  await page.evaluate(() => { window.deleteDataOnly(); });
  await page.waitForTimeout(3000);

  const after = await page.evaluate(`(async () => {
    const rows = window.__rows;
    const n = Object.keys(rows).reduce((a, t) => a + rows[t].length, 0);
    return { rows: n, meta: Object.keys((window.Clerk.user.unsafeMetadata) || {}).length,
             order: window.__order, census: ${CENSUS} };
  })()`);

  console.log('    ── D1 rows ' + before.rows + ' -> ' + after.rows + ' · Clerk meta keys ' + before.meta + ' -> ' + after.meta);
  check('E1 · the D1 rows are GONE (observed on the stub, not inferred from a call)', after.rows === 0, 'left=' + after.rows);
  check('E2 · Clerk unsafeMetadata is EMPTY', after.meta === 0, 'left=' + after.meta);

  const atClick = dirty(after.census);
  check('E3 · local storage carries no fixture value AT THE CLICK', atClick.length === 0, atClick.join(' · '));

  const firstClear = after.order.indexOf('local:clear');
  const firstServer = after.order.findIndex((x) => x.indexOf('d1:') === 0 || x === 'clerk:update');
  check('E5 · ORDER — server deletes were attempted BEFORE the local clear',
    firstServer >= 0 && (firstClear === -1 || firstServer < firstClear),
    'firstServer=' + firstServer + ' firstClear=' + firstClear);

  /* THE SECOND CENSUS. A full page load runs _datumRestoreFromClerk, which is what used to put
     everything back. This is the leg the old tool fails. */
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const reloaded = await page.evaluate(CENSUS);
  const afterLoad = dirty(reloaded);
  check('E4 · and still carries none AFTER A FULL PAGE LOAD (the restore path cannot rebuild it)',
    afterLoad.length === 0, afterLoad.join(' · '));

  await ctx.close(); await browser.close(); server.close();

  /* E6 is a SOURCE check, not a browser one: does DatumD1.TYPES cover every type any call site uses?
     Erasure iterates that array, so a type outside it is data the tool silently will not delete. */
  let used = new Set(), declared = [];
  try {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 26 }).toString('utf8').split('\0').filter(Boolean);
    for (const f of files) {
      if (!/\.(html|js|mjs)$/i.test(f) || /^scripts\/_/.test(f) || /^dist\//.test(f)) continue;
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const re = /(?:listDocs|getDoc|putDoc|deleteDoc|writeNow|scheduleWrite)\(\s*'([a-z]+)'/g;
      let m; while ((m = re.exec(src))) used.add(m[1]);
    }
    const d1 = fs.readFileSync(path.join(ROOT, 'scripts/datum-d1.js'), 'utf8');
    const dm = d1.match(/TYPES:\s*\[([^\]]*)\]/);
    if (dm) declared = dm[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  } catch (e) { console.error('E6 population unavailable: ' + e.message); }
  const missing = Array.from(used).filter((t) => declared.indexOf(t) < 0);
  console.log('    ── D1 types used by call sites: ' + Array.from(used).sort().join(', ') + ' · declared: ' + declared.join(', '));
  check('E6 · DatumD1.TYPES covers every document type any call site uses',
    used.size > 0 && missing.length === 0, missing.length ? 'MISSING: ' + missing.join(', ') : '');

  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
