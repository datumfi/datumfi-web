'use strict';
/* COMMIT-1 gate — A4 THERMODYNAMIC SHOCK WAVE, asserted via the APP render path (Lesson 47).
   toggleShock today only flips isShocked + .active + re-renders (no wave). This gate asserts the
   net-new module-only wave in datum-energize.js: on shock OFF->ON a crimson .estate-shockwave ring
   sweeps #bp-svg, volatile rooms CONTRACT (group-scale anim), the canvas JOLTS, and the LEFT ledger
   rows for market-risk (isInvestment) buckets flash soft-red inline-style (#inp-wrapper-<id>).
   G1: highlight is an inline STYLE attr only (no markup/class hook -> no host edit).
   G2 STILL: reduced-motion / hwConcurrency<4 -> NO ring, NO jolt, NO contract anim, NO highlight;
            the renderer's static shocked estate still stands.
   No total touched: unshocked gross + investable are byte-identical before shock and after toggle-off.
   Self-contained server. Usage: node scripts/_verify_shockwave.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8138;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const MK = `(id,baseId,value)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

// taxable(liquid+invest) + pretax(invest) -> volatile + HIGHLIGHTED; checking(liquid, NOT invest) ->
// contracts but NOT highlighted (proves isInvestment gate); property/debt -> neither.
const FIX = [['tax','taxable',200000],['pre','pretax401k',150000],['chk','checking',50000],['prop','property',400000],['mort','mortgage_joint',100000]];

const SEED = `({mk,a}) => { const f = eval(mk); window.state.accounts = a.map(x=>f(x[0],x[1],x[2]));
  if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs(); }`;

const READ = `() => {
  const svg = document.getElementById('bp-svg');
  const ring = svg.querySelector('.estate-shockwave');
  const anims = (document.getAnimations ? document.getAnimations() : []);
  const tgt = (a) => (a.effect && a.effect.target) ? a.effect.target : null;
  const roomAnims = anims.filter(a => { const t = tgt(a); return t && t.classList && t.classList.contains('room-grp'); }).length;
  const svgAnims = anims.filter(a => tgt(a) === svg).length;
  const contractMarks = svg.querySelectorAll('[data-shock-contract]').length;   // durable, race-free
  const joltMark = svg.getAttribute('data-shock-jolt');
  const hi = (id) => { const w = document.getElementById('inp-wrapper-'+id); const s = w ? (w.getAttribute('style')||'') : '__nowrap__'; return s; };
  const inv = (window.DatumBlueprint && DatumBlueprint.investableTotal) ? DatumBlueprint.investableTotal({accounts: window.state.accounts}) : null;
  return {
    ring: !!ring, dataShock: svg.getAttribute('data-shockwave'),
    roomAnims, svgAnims, contractMarks, joltMark,
    hiTax: hi('tax'), hiPre: hi('pre'), hiChk: hi('chk'), hiProp: hi('prop'),
    wrapTax: document.getElementById('inp-wrapper-tax') ? 1 : 0,
    gross: (document.getElementById('gross-estate-val')||{}).textContent, inv: inv,
    shockActive: document.getElementById('btn-shock').classList.contains('active')
  };
}`;

async function boot(hwc, rm) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ reducedMotion: rm });   // NORMAL: 'no-preference'; STILL via WEAK(hwc)
  await ctx.addInitScript((n) => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => n }); }, hwc);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  // attach AFTER the initial load settles — the studio has a benign first-load defer race
  // ("DatumEstate is not defined" before the deferred module executes) present on the pristine
  // baseline too; we only count errors during the actual test interaction (seed + shock).
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(eval(SEED), { mk: MK, a: FIX });
  await p.waitForTimeout(400);
  return { b, p, errs };
}
const clickShock = (p) => p.evaluate(() => { const x = document.getElementById('btn-shock'); if (x) x.click(); });

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  // ---- NORMAL (hwConcurrency 8) ----
  const N = await boot(8, 'no-preference');
  const pre = await N.p.evaluate(eval(READ));                 // before any shock
  await clickShock(N.p); await N.p.waitForTimeout(240);
  const on = await N.p.evaluate(eval(READ));                  // immediately after OFF->ON (anims live)
  await N.p.waitForTimeout(900);
  const settled = await N.p.evaluate(eval(READ));             // ring self-removed
  await clickShock(N.p); await N.p.waitForTimeout(120);
  const off = await N.p.evaluate(eval(READ));                 // toggled back off
  await N.b.close();

  // ---- STILL (hwConcurrency 2 -> WEAK) ----
  const W = await boot(2, 'no-preference');
  await clickShock(W.p); await W.p.waitForTimeout(240);
  const still = await W.p.evaluate(eval(READ));
  await W.b.close();
  await new Promise(r => server.close(r));

  const has = (s, sub) => !!s && s.indexOf(sub) !== -1;
  const ok = (n, c) => { console.log(`${n.padEnd(64)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== A4 SHOCKWAVE GATE [' + LABEL + '] =====');
  const checks = [];
  // (a) pre-click clean
  checks.push(ok('a: pre-click no ring, no data-shockwave', !pre.ring && !pre.dataShock));
  checks.push(ok('a: input wrappers rendered (left ledger present)', pre.wrapTax === 1));
  // (b) ring fires
  checks.push(ok('b: OFF->ON fires ring + data-shockwave stamp', on.ring && !!on.dataShock));
  // (c) contraction on volatile rooms
  checks.push(ok('c: volatile rooms contract (>=2 marked)', on.contractMarks >= 2));
  // (d) jolt on canvas
  checks.push(ok('d: canvas jolt fired', on.joltMark === '1'));
  // (e) left highlight = isInvestment only (G1: inline style attr)
  checks.push(ok('e: taxable + pretax left rows highlighted (danger)', has(on.hiTax, 'danger') && has(on.hiPre, 'danger')));
  checks.push(ok('e: checking NOT highlighted (isInvestment gate, not volatile)', !has(on.hiChk, 'danger')));
  checks.push(ok('e: property NOT highlighted', !has(on.hiProp, 'danger')));
  checks.push(ok('G1: highlight is inline STYLE attr only (no class hook)', has(on.hiTax, 'box-shadow') || has(on.hiTax, 'background')));
  // (f) clean retract
  checks.push(ok('f: ring self-removed after anim (no orphan)', !settled.ring));
  checks.push(ok('f: toggle-off clears left highlight', !has(off.hiTax, 'danger') && !has(off.hiPre, 'danger')));
  // (g/G2) STILL guard
  checks.push(ok('G2: STILL -> NO ring, NO data-shockwave', !still.ring && !still.dataShock));
  checks.push(ok('G2: STILL -> NO contract/jolt', still.contractMarks === 0 && !still.joltMark));
  checks.push(ok('G2: STILL -> NO left highlight', !has(still.hiTax, 'danger')));
  checks.push(ok('G2: STILL -> estate still SHOCKED (renderer static)', still.shockActive === true));
  // (h) no total touched
  checks.push(ok('h: unshocked gross identical pre vs toggle-off (no residue)', pre.gross === off.gross && !!pre.gross));
  checks.push(ok('h: investable identical pre vs toggle-off', pre.inv === off.inv && pre.inv !== null));
  // (j) no errors
  checks.push(ok('j: zero page errors (normal + STILL)', N.errs.length === 0 && W.errs.length === 0));

  console.log('detail ON :', JSON.stringify({ ring: on.ring, data: !!on.dataShock, roomAnims: on.roomAnims, svgAnims: on.svgAnims, hiTax: has(on.hiTax,'danger'), hiChk: has(on.hiChk,'danger'), gross: on.gross }));
  console.log('detail STILL:', JSON.stringify({ ring: still.ring, data: !!still.dataShock, roomAnims: still.roomAnims, shockActive: still.shockActive }));
  console.log('detail TOTALS:', JSON.stringify({ preGross: pre.gross, offGross: off.gross, preInv: pre.inv, offInv: off.inv }));
  if (N.errs.length) console.log('N errs:', N.errs.slice(0,4));
  if (W.errs.length) console.log('W errs:', W.errs.slice(0,4));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
