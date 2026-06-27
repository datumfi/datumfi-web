'use strict';
/* COMMIT-3 gate — THERMAL night-vision heat-scan, asserted via the APP render path (Lesson 47).
   Reuses isThermal (#btn-thermal). The renderer + sacred host CSS (L964-968) recolor by tax; this
   night-vision LAYER (module-only, datum-energize) sits on top via runtime inline styles: a one-pass
   orange scan sweeps #bp-svg, ONLY the PRE-TAX rooms glow + SUSTAINED heat-breathe (glow/opacity, NOT
   transform), everything else dims to a COOL EMBER (non-zero opacity, never black), and the pre-tax
   ledger rows highlight ORANGE (shared _ledgerHi, inline-only -> G1 clear).
   Gate (a corrected, RULED): scan is one-pass (gone after settle); the ONLY sustained anim is the
   pre-tax heat-breathe (running on pretax, NONE on cool/ember, breathe is filter not transform).
   G2 STILL (reduced-motion / hwConcurrency<4): instant static host-CSS recolor, NO scan/breathe/dim,
   data-thermal-animated absent. No total touched. Self-contained server.
   Usage: node scripts/_verify_thermal.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8140;
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

// pretax -> HOT; roth/taxable/auto -> cool ember; mortgage -> identity ember.
const FIX = [['pre','pretax401k',200000],['roth','rothira',120000],['tax','taxable',150000],['veh','auto',40000],['mort','mortgage_joint',90000]];

const SEED = `({mk,a}) => { const f = eval(mk); window.state.accounts = a.map(x=>f(x[0],x[1],x[2]));
  if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs(); }`;

const READ = `() => {
  const svg = document.getElementById('bp-svg');
  const grp = (id) => Array.from(svg.querySelectorAll('.room-grp')).find(g => (g.getAttribute('onclick')||'').indexOf("'"+id+"'") !== -1) || null;
  const room = (id) => { const g = grp(id); if (!g) return null;
    const a = (g.getAnimations ? g.getAnimations()[0] : null);
    let props = []; if (a) { try { a.effect.getKeyframes().forEach(f => Object.keys(f).forEach(p => { if (['offset','composite','easing'].indexOf(p)<0 && props.indexOf(p)<0) props.push(p); })); } catch(e){} }
    return { opacity: g.style.opacity, filter: g.style.filter, anim: !!a, props }; };
  const hi = (id) => { const w = document.getElementById('inp-wrapper-'+id); return w ? (w.getAttribute('style')||'') : ''; };
  return {
    pre: room('pre'), roth: room('roth'), tax: room('tax'), veh: room('veh'), mort: room('mort'),
    scan: !!svg.querySelector('.thermal-scan'), animated: svg.getAttribute('data-thermal-animated'),
    hiPre: hi('pre'), hiRoth: hi('roth'), hiTax: hi('tax'),
    gross: (document.getElementById('gross-estate-val')||{}).textContent,
    inv: (window.DatumBlueprint && DatumBlueprint.investableTotal) ? DatumBlueprint.investableTotal({accounts: window.state.accounts}) : null,
    thermalActive: document.getElementById('btn-thermal').classList.contains('active')
  };
}`;

async function boot(hwc, rm) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ reducedMotion: rm });
  await ctx.addInitScript((n) => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => n }); }, hwc);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));   // after first-load defer race
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(eval(SEED), { mk: MK, a: FIX });
  await p.waitForTimeout(400);
  return { b, p, errs };
}
const clickThermal = (p) => p.evaluate(() => { const x = document.getElementById('btn-thermal'); if (x) x.click(); });

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  const N = await boot(8, 'no-preference');
  const pre = await N.p.evaluate(eval(READ));
  await clickThermal(N.p); await N.p.waitForTimeout(260);
  const on = await N.p.evaluate(eval(READ));               // scan in flight, ember applied
  await N.p.waitForTimeout(1500);
  const settled = await N.p.evaluate(eval(READ));          // scan done; only pretax breathe runs
  await clickThermal(N.p); await N.p.waitForTimeout(260);
  const off = await N.p.evaluate(eval(READ));
  await N.b.close();

  const W = await boot(2, 'no-preference');                // STILL via WEAK
  await clickThermal(W.p); await W.p.waitForTimeout(300);
  const still = await W.p.evaluate(eval(READ));
  await W.b.close();
  await new Promise(r => server.close(r));

  const has = (s, sub) => !!s && s.indexOf(sub) !== -1;
  const opf = (o) => o && o.opacity !== '' ? parseFloat(o.opacity) : NaN;
  const ok = (n, c) => { console.log(`${n.padEnd(66)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== THERMAL NIGHT-VISION GATE [' + LABEL + '] =====');
  const checks = [];
  // (a corrected) scan one-pass; sustained breathe ONLY on pretax (filter not transform); none on cool/ember
  checks.push(ok('a: scan one-pass — gone after settle (no scan loop)', !settled.scan));
  checks.push(ok('a: sustained breathe on PRE-TAX (running anim)', !!settled.pre && settled.pre.anim === true));
  checks.push(ok('a: breathe is GLOW/FILTER, not transform', !!settled.pre && settled.pre.props.indexOf('filter') >= 0 && settled.pre.props.indexOf('transform') < 0));
  checks.push(ok('a: cool/ember rooms have NO sustained anim', !settled.roth.anim && !settled.tax.anim && !settled.veh.anim && !settled.mort.anim));
  // (b) only pretax glows; others cool ember with non-zero floor
  checks.push(ok('b: PRE-TAX glows orange (drop-shadow) + opacity 1', !!on.pre && has(on.pre.filter, 'drop-shadow') && (on.pre.opacity === '1' || on.pre.opacity === '')));
  checks.push(ok('b: roth/taxable/auto dimmed to COOL EMBER (0.2 <= op < 0.9)', opf(on.roth) >= 0.2 && opf(on.roth) < 0.9 && opf(on.tax) >= 0.2 && opf(on.veh) >= 0.2));
  checks.push(ok('b: debt identity ember non-zero (>=0.2)', opf(on.mort) >= 0.2));
  checks.push(ok('b: NO data hidden (every ember opacity >= 0.2, never 0)', opf(on.roth) >= 0.2 && opf(on.tax) >= 0.2 && opf(on.veh) >= 0.2 && opf(on.mort) >= 0.2));
  // (c) dim is inline style (no markup hook)
  checks.push(ok('c: dim is INLINE opacity (no class/markup hook)', on.roth && on.roth.opacity !== '' && on.tax.opacity !== ''));
  // (d) orange _ledgerHi on pretax rows only
  checks.push(ok('d: ORANGE _ledgerHi on pre-tax row only', has(on.hiPre, '255,184,100') && !has(on.hiRoth, '255,184,100') && !has(on.hiTax, '255,184,100')));
  checks.push(ok('d: ledger highlight inline-style only', has(on.hiPre, 'box-shadow') || has(on.hiPre, 'background')));
  // (e) STILL -> static recolor, no flourish
  checks.push(ok('e: STILL -> no scan, no data-thermal-animated', !still.scan && !still.animated));
  checks.push(ok('e: STILL -> rooms NOT inline-dimmed (host CSS stands)', still.pre && still.pre.opacity === '' && still.roth.opacity === ''));
  checks.push(ok('e: STILL -> no sustained room anim', !still.pre.anim && !still.roth.anim));
  checks.push(ok('NORMAL -> data-thermal-animated set', on.animated === '1'));
  // (f) no total + keyed + toggle-off clears
  checks.push(ok('f: gross + investable identical thermal-on vs off', pre.gross === on.gross && pre.gross === off.gross && pre.inv === on.inv && pre.inv === off.inv && pre.inv !== null));
  checks.push(ok('f: keyed to #btn-thermal (off=no ember; on=ember+active)', pre.pre.opacity === '' && !pre.thermalActive && on.thermalActive === true && opf(on.roth) < 0.9));
  checks.push(ok('f: toggle-off clears ember + scan + ORANGE ledger + animated', off.roth.opacity === '' && !off.scan && !has(off.hiPre, '255,184,100') && !off.animated));
  // (g) zero errors
  checks.push(ok('g: zero page errors (normal + STILL)', N.errs.length === 0 && W.errs.length === 0));

  console.log('detail ON  :', JSON.stringify({ preF: on.pre&&on.pre.filter, preOp: on.pre&&on.pre.opacity, rothOp: on.roth&&on.roth.opacity, mortOp: on.mort&&on.mort.opacity, scan: on.scan, anim: on.animated, hiPreOrange: has(on.hiPre,'255,184,100') }));
  console.log('detail SET :', JSON.stringify({ scan: settled.scan, preAnim: settled.pre&&settled.pre.anim, preProps: settled.pre&&settled.pre.props, rothAnim: settled.roth&&settled.roth.anim }));
  console.log('detail STILL:', JSON.stringify({ scan: still.scan, anim: still.animated, preOp: still.pre&&still.pre.opacity, preAnim: still.pre&&still.pre.anim }));
  console.log('detail TOT :', JSON.stringify({ preG: pre.gross, onG: on.gross, offG: off.gross }));
  if (N.errs.length) console.log('N errs:', N.errs.slice(0,4));
  if (W.errs.length) console.log('W errs:', W.errs.slice(0,4));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
