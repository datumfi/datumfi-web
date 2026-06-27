'use strict';
/* COMMIT-2 gate — SEQUENCE RISK lens, asserted via the APP render path (Lesson 47). Reuses isDatum
   (#btn-datum); the old DATUM spend-line is suppressed and the button STAGES sequence-of-returns risk:
   the most-exposed investment rooms LIFT + carry (1)(2)(3) badges + a top RISK LADDER (highest-first),
   floor plan NOT re-laid-out, AND the impacted left-ledger rows highlight TEAL (shared _ledgerHi).
   RULED (A) ORDER-DOMINANT: sort by withdrawal stage (liquid<pretax<roth), then DESC by balance WITHIN
   a stage. The whole point: BOTH liquids rank ABOVE a giant pretax -> order beats magnitude.
   G1: teal highlight = inline style on #inp-wrapper-<id> (no markup hook). G2 STILL (Shock-parity):
   static lift+badges+ladder REMAIN frozen, but NO bob/entrance (data-seq-animated absent) AND NO teal.
   No total touched: gross + investable byte-identical seq-on vs off. Reuse isDatum (ruling-2).
   Self-contained server. Usage: node scripts/_verify_sequence.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8139;
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

// (A)-PROOF fixture: two liquids of DIFFERENT size + a HUGE pretax + a roth + cash + debt.
//   ruled order: 1.taxable $80k (liquid, bigger) 2.crypto $40k (liquid) 3.pretax $990k (BELOW liquids!) 4.roth $50k
//   excluded (no rank): checking (liquid, NOT isInvestment) + mortgage (debt)
const FIX = [['tax','taxable',80000],['cry','crypto',40000],['pre','pretax401k',990000],['roth','rothira',50000],['chk','checking',100000],['mort','mortgage_joint',50000]];

const SEED = `({mk,a}) => { const f = eval(mk); window.state.accounts = a.map(x=>f(x[0],x[1],x[2]));
  if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs(); }`;

const READ = `() => {
  const svg = document.getElementById('bp-svg');
  const grp = (id) => Array.from(svg.querySelectorAll('.room-grp')).find(g => (g.getAttribute('onclick')||'').indexOf("'"+id+"'") !== -1) || null;
  const rank = (id) => { const g = grp(id); return g ? g.getAttribute('data-seq-rank') : null; };
  const hi = (id) => { const w = document.getElementById('inp-wrapper-'+id); return w ? (w.getAttribute('style')||'') : '__nowrap__'; };
  const ladder = svg.querySelector('.seq-ladder');
  const anims = (document.getAnimations ? document.getAnimations() : []);
  const roomAnims = anims.filter(a => { const t = a.effect && a.effect.target; return t && t.classList && t.classList.contains('room-grp'); }).length;
  // SIMULTANEOUS-rise + UNIFORM-height proof: per ranked room, its inline transform + its rise delay.
  const ranked = Array.from(svg.querySelectorAll('.room-grp[data-seq-rank]'));
  const transforms = ranked.map(g => g.style.transform || '');
  const delays = ranked.map(g => { const a = (g.getAnimations ? g.getAnimations()[0] : null); return a ? a.effect.getTiming().delay : null; });
  // overlap: any two ranked rooms in the same column (x overlap) intersect vertically after lift?
  const R = ranked.map(g => { const r = g.querySelector('.room-rect'); const m = (g.style.transform.match(/translateY\\((-?[\\d.]+)/)); return { x:+r.getAttribute('x'), y:+r.getAttribute('y'), w:+r.getAttribute('width'), h:+r.getAttribute('height'), ty: m?+m[1]:0 }; });
  let maxOverlap = 0;
  for (let i=0;i<R.length;i++) for (let j=0;j<R.length;j++){ if(i===j) continue; const A=R[i],B=R[j];
    if (Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x) < 40) continue;
    if (A.y < B.y){ const ov=(A.y+A.h+A.ty)-(B.y+B.ty); if(ov>0.5) maxOverlap=Math.max(maxOverlap,ov); } }
  return {
    rankTax: rank('tax'), rankCry: rank('cry'), rankPre: rank('pre'), rankRoth: rank('roth'),
    rankChk: rank('chk'), rankMort: rank('mort'),
    hiTax: hi('tax'), hiCry: hi('cry'), hiPre: hi('pre'), hiRoth: hi('roth'), hiChk: hi('chk'), hiMort: hi('mort'),
    transforms, delays, maxOverlap,
    ladder: !!ladder, badges: svg.querySelectorAll('.seq-badge').length, roomAnims,
    seqActive: svg.getAttribute('data-seq-active'), seqAnimated: svg.getAttribute('data-seq-animated'),
    gross: (document.getElementById('gross-estate-val')||{}).textContent,
    inv: (window.DatumBlueprint && DatumBlueprint.investableTotal) ? DatumBlueprint.investableTotal({accounts: window.state.accounts}) : null,
    datumActive: document.getElementById('btn-datum').classList.contains('active')
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
const clickDatum = (p) => p.evaluate(() => { const x = document.getElementById('btn-datum'); if (x) x.click(); });

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  const N = await boot(8, 'no-preference');
  const pre = await N.p.evaluate(eval(READ));
  await clickDatum(N.p); await N.p.waitForTimeout(240);
  const on = await N.p.evaluate(eval(READ));               // rise in flight
  await N.p.waitForTimeout(1100);
  const settled = await N.p.evaluate(eval(READ));          // rise DONE -> assert no continuous bob + ranks held
  await clickDatum(N.p); await N.p.waitForTimeout(240);
  const off = await N.p.evaluate(eval(READ));
  await N.b.close();

  const W = await boot(2, 'no-preference');   // STILL via WEAK
  await clickDatum(W.p); await W.p.waitForTimeout(240);
  const still = await W.p.evaluate(eval(READ));
  await W.b.close();
  await new Promise(r => server.close(r));

  const has = (s, sub) => !!s && s.indexOf(sub) !== -1;
  const ok = (n, c) => { console.log(`${n.padEnd(68)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== SEQUENCE-RISK GATE [' + LABEL + '] (ruled A order-dominant) =====');
  const checks = [];
  // 1. RULED (A): both liquids ABOVE the giant pretax; bigger liquid first
  checks.push(ok('1: liquids rank 1&2 (taxable>crypto), giant pretax=3 BELOW both', on.rankTax === '1' && on.rankCry === '2' && on.rankPre === '3'));
  checks.push(ok('1: roth ranks last (4)', on.rankRoth === '4'));
  // 2. gate excludes cash + debt
  checks.push(ok('2: checking (cash) + mortgage (debt) NOT ranked', !on.rankChk && !on.rankMort));
  // 3. ladder strip REMOVED; per-room badges carry the ranking
  checks.push(ok('3: NO .seq-ladder strip (removed) + (1)(2)(3) badges present (>=4)', !on.ladder && on.badges >= 4));
  // 3b. flat lift HOLDS + NO continuous bob (room-grp animations empty after the rise settles)
  checks.push(ok('3b: rise settles to a HELD flat-lift, NO continuous bob', settled.roomAnims === 0 && settled.rankTax === '1' && settled.badges >= 4));
  // 3c. SIMULTANEOUS rise (NOT a cascade): all ranked rooms share ONE rise delay (not monotonic per-rank)
  checks.push(ok('3c: SIMULTANEOUS rise — all ranked rooms one delay (no cascade)', on.delays.length >= 4 && new Set(on.delays).size === 1));
  // 3d. UNIFORM height (staircase NOT shipped): every ranked room same translateY
  checks.push(ok('3d: UNIFORM flat height — all ranked rooms same translateY', settled.transforms.length >= 4 && new Set(settled.transforms).size === 1 && has(settled.transforms[0], 'translateY(-34')));
  // 3e. NO room overlaps a neighbor (uniform height = trivially clean)
  checks.push(ok('3e: NO room overlap (max=0)', settled.maxOverlap === 0));
  // 4. ruling-2 keyed to existing isDatum/#btn-datum
  checks.push(ok('4: keyed to #btn-datum (off=no ranks; on=ranks+active)', !pre.rankTax && !pre.datumActive && on.rankTax === '1' && on.datumActive === true));
  // 5. TEAL left-ledger highlight (G1: inline style) — ranked rows teal, non-impacted not
  checks.push(ok('5: ranked rows TEAL highlighted (teal-mid)', has(on.hiTax, 'teal-mid') && has(on.hiPre, 'teal-mid') && has(on.hiRoth, 'teal-mid')));
  checks.push(ok('5: cash + debt rows NOT highlighted', !has(on.hiChk, 'teal-mid') && !has(on.hiMort, 'teal-mid')));
  checks.push(ok('G1: teal highlight is inline STYLE attr only (no class hook)', has(on.hiTax, 'box-shadow') || has(on.hiTax, 'background')));
  // 6. G2 STILL (Shock-parity): frozen ranking remains, but NO bob/entrance AND NO teal
  checks.push(ok('G2: STILL -> ranks + badges REMAIN (frozen flat-lift)', still.rankTax === '1' && still.rankPre === '3' && still.badges >= 4));
  checks.push(ok('G2: STILL -> NO entrance/bob (data-seq-animated absent)', !still.seqAnimated));
  checks.push(ok('G2: STILL -> NO teal highlight (Shock-parity flourish-strip)', !has(still.hiTax, 'teal-mid')));
  checks.push(ok('NORMAL -> animated (data-seq-animated set)', on.seqAnimated === '1'));
  // 7. no total touched
  checks.push(ok('7: gross identical seq-on vs off', pre.gross === on.gross && on.gross === off.gross && !!on.gross));
  checks.push(ok('7: investable identical seq-on vs off', pre.inv === on.inv && on.inv === off.inv && on.inv !== null));
  // 8. clear on toggle-off (incl teal)
  checks.push(ok('8: toggle-off clears ladder/badges/ranks + teal', !off.ladder && off.badges === 0 && !off.rankTax && !has(off.hiTax, 'teal-mid')));
  // 9. zero errors
  checks.push(ok('9: zero page errors (normal + STILL)', N.errs.length === 0 && W.errs.length === 0));

  console.log('detail ON  :', JSON.stringify({ tax: on.rankTax, cry: on.rankCry, pre: on.rankPre, roth: on.rankRoth, chk: on.rankChk, badges: on.badges, ladder: on.ladder, anim: on.seqAnimated, teal: has(on.hiTax,'teal-mid'), tealChk: has(on.hiChk,'teal-mid') }));
  console.log('detail SETTLED:', JSON.stringify({ tax: settled.rankTax, badges: settled.badges, roomAnims: settled.roomAnims }));
  console.log('detail STILL:', JSON.stringify({ tax: still.rankTax, pre: still.rankPre, ladder: still.ladder, anim: still.seqAnimated, teal: has(still.hiTax,'teal-mid') }));
  console.log('detail TOT :', JSON.stringify({ preG: pre.gross, onG: on.gross, offG: off.gross, onI: on.inv }));
  if (N.errs.length) console.log('N errs:', N.errs.slice(0,4));
  if (W.errs.length) console.log('W errs:', W.errs.slice(0,4));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
