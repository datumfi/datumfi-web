'use strict';
/* IDEA-1 gate — LINKED DEBT -> ASSET merge, asserted via the APP render path (Lesson 47).
   A linked debt MERGES visually onto its physical asset instead of drawing its own red box:
     mortgage(linked->property)  -> the GROUNDS carry equity COLOR + "THE GROUNDS / THE MOAT" + clickable
     auto-loan(linked->vehicle)  -> the Vehicle ROOM carries equity COLOR + "THE DRIVEWAY / THE GARAGE"
   EQUITY drives color everywhere (R2): the Grounds fill + dashed boundary AND the merged room FILL are
   TEAL when equity is positive (standard estate fill) and the DEBT-RED gradient when the linked debt is
   UNDERWATER. The NET-EQUITY number is GOLD when positive, RED when underwater (R3). The Grounds carry
   color with NO mortgage too (teal). The dashed boundary + the FILL frame the estate from OUTSIDE,
   notching OVER the north entry jut; once rooms exist the fill is a FRAME (estate footprint punched out)
   so nothing bleeds THROUGH the translucent rooms. NET EQUITY (asset - debt) is a DISPLAY label only.
   Unlinked debt stays a plain red box (fallback regression guard).
   ⭐ NO-DOUBLE-COUNT: same VALUES linked vs unlinked -> #gross-estate-val + investableTotal IDENTICAL.
   Self-contained static server. Usage: node scripts/_verify_linkeddebt.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8137;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const MK = `(id,baseId,value,linkedAssetId)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:linkedAssetId||null,useRule55:false})`;

const ANALYZE = `() => {
  const svg = document.getElementById('bp-svg');
  const txt = (el) => el ? (el.textContent || '').trim() : null;
  const sty = (el) => el ? (el.getAttribute('style') || '') : '';
  const rooms = Array.from(svg.querySelectorAll('.room-grp')).map(g => {
    const oc = g.getAttribute('onclick') || '';
    const m = oc.match(/openAccountModal\\('([^']+)'\\)/);
    const rect = g.querySelector('.room-rect');
    const fill = g.querySelector('.room-fill');
    return { id: m ? m[1] : null, isDebt: g.classList.contains('debt-room'),
             title: txt(g.querySelector('.bp-title')),
             style: sty(rect), fillUrl: fill ? (fill.getAttribute('fill') || '') : '',
             valStyle: sty(g.querySelector('.bp-val')), text: txt(g) };
  });
  const roomById = (id) => rooms.find(r => r.id === id) || null;
  const grRect = svg.querySelector('.grounds-rect');
  const grGrp = grRect ? grRect.closest('g') : null;
  const grTitle = grGrp ? txt(grGrp.querySelector('.grounds-title')) : null;
  const grTexts = grGrp ? Array.from(grGrp.querySelectorAll('.grounds-title')) : [];
  const grValEl = grTexts.find(t => /font-size:\\s*16px/.test(sty(t)));
  const gFill = svg.querySelector('.grounds-fill');
  const gb = svg.querySelector('.grounds-boundary');
  const inv = (window.DatumBlueprint && DatumBlueprint.investableTotal)
    ? DatumBlueprint.investableTotal({ accounts: window.state.accounts }) : null;
  return {
    roomIds: rooms.map(r => r.id).filter(Boolean),
    grounds: { title: grTitle, onclick: gFill ? (gFill.getAttribute('onclick') || '') : '',
               fill: sty(gFill), fillD: gFill ? (gFill.getAttribute('d') || '') : '', valStyle: sty(grValEl),
               face: grGrp ? txt(grGrp) : null },
    boundary: { style: sty(gb), d: gb ? (gb.getAttribute('d') || '') : '' },
    grossText: txt(document.getElementById('gross-estate-val')),
    investable: inv,
    sealedCount: svg.querySelectorAll('.estate-wall-private').length,
    envelopeCount: svg.querySelectorAll('.estate-envelope').length,
    veh: roomById('veh'), mort: roomById('mort'), aloan: roomById('aloan'), stud: roomById('stud')
  };
}`;

async function render(p, accts) {
  await p.evaluate(({ mk, a }) => {
    const f = eval(mk);
    window.state.accounts = a.map(x => f(x[0], x[1], x[2], x[3]));
    if (window.updateSVGs) window.updateSVGs();
  }, { mk: MK, a: accts });
  await p.waitForTimeout(500);
  return p.evaluate(eval(ANALYZE));
}

// POS  : positive equity (home 500k > mort 180k; car 40k > loan 15k)
// NEG  : underwater       (home 300k < mort 500k; car 20k < loan 35k)
// UNLNK : POS values, both debts UNLINKED (no-double-count + fallback control)
// SOLO  : ONLY a property + linked mortgage, no other rooms -> full plot fill (no frame hole)
const POS   = [['prop','property',500000],['veh','auto',40000],['chk','checking',80000],['tax','taxable',120000],['mort','mortgage_joint',180000,'prop'],['aloan','auto_debt_joint',15000,'veh'],['stud','student_loan_primary',30000]];
const NEG   = [['prop','property',300000],['veh','auto',20000],['chk','checking',80000],['tax','taxable',120000],['mort','mortgage_joint',500000,'prop'],['aloan','auto_debt_joint',35000,'veh'],['stud','student_loan_primary',30000]];
const UNLNK = [['prop','property',500000],['veh','auto',40000],['chk','checking',80000],['tax','taxable',120000],['mort','mortgage_joint',180000],['aloan','auto_debt_joint',15000],['stud','student_loan_primary',30000]];
const SOLO  = [['prop','property',300000],['mort','mortgage_joint',500000,'prop']];

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  const p = await ctx.newPage();
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const L  = await render(p, POS);
  const L2 = await render(p, POS);
  const N  = await render(p, NEG);
  const U  = await render(p, UNLNK);
  const S  = await render(p, SOLO);
  await b.close();
  await new Promise(r => server.close(r));

  const has = (s, sub) => !!s && s.indexOf(sub) !== -1;
  const minV = (d) => { const m = [...String(d || '').matchAll(/V\s+(-?\d+(?:\.\d+)?)/g)].map(x => +x[1]); return m.length ? Math.min(...m) : Infinity; };
  const vBelow = (d, t) => [...String(d || '').matchAll(/V\s+(-?\d+(?:\.\d+)?)/g)].map(x => +x[1]).filter(v => v < t).length;
  const subpaths = (d) => (String(d || '').match(/M/g) || []).length;
  const ok = (n, c) => { console.log(`${n.padEnd(66)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== IDEA-1 LINKED-DEBT GATE [' + LABEL + '] =====');
  const checks = [];

  // A. SUPPRESSION
  checks.push(ok('A: linked mortgage box SUPPRESSED (POS+NEG)', !L.mort && !N.mort));
  checks.push(ok('A: linked auto-loan box SUPPRESSED (POS+NEG)', !L.aloan && !N.aloan));
  checks.push(ok('A: unlinked student loan STILL a debt box', !!L.stud && L.stud.isDebt));
  checks.push(ok('A: remaining sealed debt still sealed (A.2 intact)', L.sealedCount >= 1));

  // B. GROUNDS — equity color (fill + boundary), gold/red number, dual label, clickable.
  checks.push(ok('B: POS grounds fill TEAL (fillGradAsset)', has(L.grounds.fill, 'fillGradAsset')));
  checks.push(ok('B: POS grounds boundary TEAL', has(L.boundary.style, 'teal-mid')));
  checks.push(ok('B: NEG grounds fill RED (fillGradDebt)', has(N.grounds.fill, 'fillGradDebt')));
  checks.push(ok('B: NEG grounds boundary RED', has(N.boundary.style, 'danger')));
  checks.push(ok('B: POS grounds number GOLD', has(L.grounds.valStyle, 'gold')));
  checks.push(ok('B: NEG grounds number RED (danger)', has(N.grounds.valStyle, 'danger')));
  checks.push(ok('B: grounds dual label "THE GROUNDS / THE MOAT"', L.grounds.title === 'THE GROUNDS / THE MOAT'));
  checks.push(ok('B: grounds clickable -> property modal', has(L.grounds.onclick, "openAccountModal('prop')")));
  checks.push(ok('B: grounds NET EQUITY $320k (POS) / -$200k (NEG)', has(L.grounds.face, '$320k') && has(N.grounds.face, '-$200k')));

  // FRAME — no bleed-through: with rooms the fill is a frame (estate punched out); solo property = full.
  checks.push(ok('FRAME: with rooms, grounds fill is a FRAME (>=2 subpaths)', subpaths(L.grounds.fillD) >= 2));
  checks.push(ok('FRAME: property-alone fill is a FULL plot (1 subpath)', subpaths(S.grounds.fillD) === 1));
  checks.push(ok('FRAME: fill outer + boundary both notch over jut (y<160)', minV(L.grounds.fillD) < 160 && minV(L.boundary.d) < 160));
  checks.push(ok('FRAME: hole ALSO follows jut (no fill under cutout: >=2 notches)', vBelow(L.grounds.fillD, 160) >= 2));

  // C. VEHICLE — equity FILL (no border), gold/red number, dual label, OPEN.
  checks.push(ok('C: POS vehicle fill TEAL (fillGradAsset)', !!L.veh && has(L.veh.fillUrl, 'fillGradAsset')));
  checks.push(ok('C: NEG vehicle fill RED (fillGradDebt)', !!N.veh && has(N.veh.fillUrl, 'fillGradDebt')));
  checks.push(ok('C: vehicle has NO red stroke marker', !!L.veh && !has(L.veh.style, 'danger')));
  checks.push(ok('C: POS vehicle number GOLD', !!L.veh && has(L.veh.valStyle, 'gold')));
  checks.push(ok('C: NEG vehicle number RED (danger)', !!N.veh && has(N.veh.valStyle, 'danger')));
  checks.push(ok('C: vehicle dual label "THE DRIVEWAY / THE GARAGE"', !!L.veh && L.veh.title === 'THE DRIVEWAY / THE GARAGE'));
  checks.push(ok('C: vehicle NET EQUITY $25k (POS) / -$15k (NEG)', !!L.veh && has(L.veh.text, '$25k') && !!N.veh && has(N.veh.text, '-$15k')));
  checks.push(ok('C: vehicle NOT sealed (open, not a debt-room)', !!L.veh && !L.veh.isDebt));

  // GROUNDS color regardless of link
  checks.push(ok('U: unlinked grounds fill TEAL (color regardless of link)', has(U.grounds.fill, 'fillGradAsset')));
  checks.push(ok('U: unlinked grounds plain "THE GROUNDS", not clickable', U.grounds.title === 'THE GROUNDS' && !has(U.grounds.onclick, 'openAccountModal')));
  checks.push(ok('U: unlinked mortgage/auto-loan = plain boxes', !!U.mort && U.mort.title === 'THE MOAT' && !!U.aloan && U.aloan.title === 'THE GARAGE'));

  // ⭐ NO-DOUBLE-COUNT
  checks.push(ok('NDC: #gross-estate-val identical linked vs unlinked', L.grossText === U.grossText && !!L.grossText));
  checks.push(ok('NDC: investableTotal identical linked vs unlinked', L.investable === U.investable && L.investable !== null));

  // Coexistence + determinism + no errors
  checks.push(ok('COEXIST: estate envelope still drawn', L.envelopeCount >= 1));
  checks.push(ok('DET: two POS renders identical (room ids + fill d)',
    JSON.stringify(L.roomIds.sort()) === JSON.stringify(L2.roomIds.sort()) && L.grounds.fillD === L2.grounds.fillD));
  checks.push(ok('ERR: zero page errors', pageErrors.length === 0));

  console.log('detail POS  :', JSON.stringify({ gross: L.grossText, inv: L.investable, grFill: L.grounds.fill, grSub: subpaths(L.grounds.fillD), grVal: L.grounds.valStyle, veh: L.veh && L.veh.fillUrl, vehVal: L.veh && L.veh.valStyle }));
  console.log('detail NEG  :', JSON.stringify({ grFill: N.grounds.fill, grVal: N.grounds.valStyle, grFace: N.grounds.face, veh: N.veh && N.veh.fillUrl, vehVal: N.veh && N.veh.valStyle }));
  console.log('detail SOLO :', JSON.stringify({ grSub: subpaths(S.grounds.fillD), grFill: S.grounds.fill }));
  if (pageErrors.length) console.log('pageErrors:', pageErrors.slice(0, 5));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
