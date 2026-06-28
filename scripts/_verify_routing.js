'use strict';
/* COMMIT-4 gate — ROUTING directed flowing current, via the APP render path (Lesson 47). Reuses
   isRouting (#btn-routing). Renderer draws .outflow-route (liquid->pretax->roth) + .demolition-route
   (liquid->each priority debt); host CSS L978-980 colors them teal/gold. This night-... module LAYERS
   two distinct flows ON TOP via INLINE styles (no host edit): OUTFLOW = PURPLE comet (draw-on then a
   bright traveling dash), DEBT-DESTRUCTION = AMBER->WHITE sparking fuse toward each priority debt.
   Two-color left ledger: purple sequence rows + amber priority-debt rows (the amber side needs the ONE
   named read-only renderer field isPriority). GEOMETRY-READ: comet/fuse read d from the rendered path.
   G2 STILL: static recolored paths, NO draw-on/comet/fuse/ledger, data-routing-animated absent.
   No total touched. Self-contained server. Usage: node scripts/_verify_routing.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8141;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

// 4th arg = isPriority. liquid/pretax/roth -> purple sequence; mortgage(priority) -> amber fuse;
// rev_debt(non-priority) + auto(physical) -> NOT highlighted (selectivity / isPriority proof).
const MK = `(id,baseId,value,prio)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:!!prio,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;
// TWO liquids (crypto 200k > taxable 150k) prove in-bucket value-DESC: crypto=order1, taxable=order2,
// then pretax=3, roth=4 (bucket order preserved). priority mortgage = debt-order 1.
const FIX = [['cry','crypto',200000],['tax','taxable',150000],['pre','pretax401k',120000],['roth','rothira',90000],['mort','mortgage_joint',80000,true],['rev','rev_debt_joint',30000,false],['veh','auto',40000]];

const SEED = `({mk,a}) => { const f = eval(mk); window.state.accounts = a.map(x=>f(x[0],x[1],x[2],x[3]));
  if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs(); }`;

const READ = `() => {
  const svg = document.getElementById('bp-svg');
  const out = svg.querySelector('.outflow-route');
  const demos = Array.from(svg.querySelectorAll('.demolition-route'));
  const comet = svg.querySelector('.routing-comet');
  const fuses = Array.from(svg.querySelectorAll('.routing-fuse'));
  const anim = (el) => el && el.getAnimations ? el.getAnimations().length : 0;
  const hi = (id) => { const w = document.getElementById('inp-wrapper-'+id); return w ? (w.getAttribute('style')||'') : ''; };
  const grp = (id) => Array.from(svg.querySelectorAll('.room-grp')).find(g => (g.getAttribute('onclick')||'').indexOf("'"+id+"'") !== -1) || null;
  const ord = (id) => { const g = grp(id); return g ? g.getAttribute('data-route-order') : null; };
  const dord = (id) => { const g = grp(id); return g ? g.getAttribute('data-route-debt') : null; };
  return {
    outStroke: out ? (out.style.stroke || '') : null, outAnimNone: out ? (out.style.animation || '') : null, outBaseAnim: anim(out),
    outD: out ? (out.getAttribute('d') || '') : '', outMarkerEnd: out ? (out.getAttribute('marker-end') || '') : '',
    demoCount: demos.length, demoStroke: demos[0] ? (demos[0].style.stroke || '') : null, demoMarkerEnd: demos[0] ? (demos[0].getAttribute('marker-end') || '') : '',
    routeBadges: svg.querySelectorAll('.route-badge').length,
    markerP: !!svg.querySelector('#route-arrow-purple'), markerA: !!svg.querySelector('#route-arrow-amber'),
    ordTax: ord('tax'), ordPre: ord('pre'), ordRoth: ord('roth'), ordCry: ord('cry'), dordMort: dord('mort'),
    dsrcCry: (grp('cry') ? grp('cry').getAttribute('data-route-debt-src') : null),
    cryBadges: (grp('cry') ? grp('cry').querySelectorAll('.route-badge').length : 0),
    comet: !!comet, cometAnim: anim(comet), fuseCount: fuses.length, fuseAnim: fuses[0] ? anim(fuses[0]) : 0,
    animated: svg.getAttribute('data-routing-animated'),
    hiTax: hi('tax'), hiPre: hi('pre'), hiRoth: hi('roth'), hiMort: hi('mort'), hiRev: hi('rev'), hiVeh: hi('veh'),
    gross: (document.getElementById('gross-estate-val')||{}).textContent,
    inv: (window.DatumBlueprint && DatumBlueprint.investableTotal) ? DatumBlueprint.investableTotal({accounts: window.state.accounts}) : null,
    routingActive: document.getElementById('btn-routing').classList.contains('active')
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
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(eval(SEED), { mk: MK, a: FIX });
  await p.waitForTimeout(400);
  return { b, p, errs };
}
const clickRouting = (p) => p.evaluate(() => { const x = document.getElementById('btn-routing'); if (x) x.click(); });

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  const N = await boot(8, 'no-preference');
  const pre = await N.p.evaluate(eval(READ));
  await clickRouting(N.p); await N.p.waitForTimeout(300);
  const on = await N.p.evaluate(eval(READ));            // draw-on in flight; badges/marker/order stamps
  await N.p.evaluate(eval(SEED), { mk: MK, a: [...FIX].reverse() });   // DETERMINISM: same accounts, reversed placement
  await N.p.waitForTimeout(400);
  const det = await N.p.evaluate(eval(READ));           // path d must be identical (placement-agnostic)
  await N.p.waitForTimeout(900);
  const settled = await N.p.evaluate(eval(READ));       // sustained comet/fuse
  await clickRouting(N.p); await N.p.waitForTimeout(300);
  const off = await N.p.evaluate(eval(READ));
  // FIX 3 — tied-value determinism: two EQUAL-value liquids (aaa<bbb by id) resolve by stable id tiebreak,
  // identical across entry order (value-DESC alone leaves ties render-dependent).
  const TIEDORD = `() => { const svg=document.getElementById('bp-svg'); const g=id=>Array.from(svg.querySelectorAll('.room-grp')).find(e=>(e.getAttribute('onclick')||'').indexOf("'"+id+"'")!==-1); const o=id=>{const e=g(id);return e?e.getAttribute('data-route-order'):null;}; return {aaa:o('aaa'),bbb:o('bbb')}; }`;
  await clickRouting(N.p);   // routing on
  await N.p.evaluate(eval(SEED), { mk: MK, a: [['aaa','taxable',50000],['bbb','crypto',50000],['p1','pretax401k',30000]] });
  await N.p.waitForTimeout(350); const tied1 = await N.p.evaluate(eval(TIEDORD));
  await N.p.evaluate(eval(SEED), { mk: MK, a: [['bbb','crypto',50000],['aaa','taxable',50000],['p1','pretax401k',30000]] });   // reversed
  await N.p.waitForTimeout(350); const tied2 = await N.p.evaluate(eval(TIEDORD));
  await N.b.close();

  const W = await boot(2, 'no-preference');             // STILL via WEAK
  await clickRouting(W.p); await W.p.waitForTimeout(300);
  const still = await W.p.evaluate(eval(READ));
  await W.b.close();
  await new Promise(r => server.close(r));

  const purple = (s) => /200,\s*79,\s*227|c84fe3/i.test(s || '');
  const amber  = (s) => /245,\s*166,\s*35|f5a623/i.test(s || '');
  const has = (s, sub) => !!s && s.indexOf(sub) !== -1;
  const ok = (n, c) => { console.log(`${n.padEnd(66)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== ROUTING GATE [' + LABEL + '] =====');
  const checks = [];
  // TRACK A — determinism (value-DESC, placement-agnostic) + order stamps + badges + arrowheads
  checks.push(ok('TA: in-bucket order = value-DESC (crypto1>taxable2, pretax3, roth4)', on.ordCry === '1' && on.ordTax === '2' && on.ordPre === '3' && on.ordRoth === '4'));
  checks.push(ok('TA: priority debt stamped debt-order 1', on.dordMort === '1'));
  // DETERMINISM = the ORDER is value-based, not entry-order (the literal path d also tracks room
  // POSITIONS, which layout shifts with entry order — not a determinism concern). Reversed placement
  // -> SAME value-DESC order assignment (crypto1/taxable2/pretax3/roth4): inserting/reordering accounts
  // never re-slots the sequence by drag order.
  checks.push(ok('TA: DETERMINISM — reversed placement => SAME value-order (crypto1/taxable2/pretax3/roth4)', det.ordCry === '1' && det.ordTax === '2' && det.ordPre === '3' && det.ordRoth === '4'));
  checks.push(ok('TA: order badges drawn (>=6: 4 outflow + 1 dest + 1 source)', on.routeBadges >= 6));
  // FIX 1 — BOTH routes terminate in an arrowhead (explicit per-color markers; purple no longer missing)
  checks.push(ok('FIX1: PURPLE arrowhead on outflow (marker-end + marker exists)', on.markerP && /route-arrow-purple/.test(on.outMarkerEnd)));
  checks.push(ok('FIX1: AMBER arrowhead on demolition', on.markerA && /route-arrow-amber/.test(on.demoMarkerEnd)));
  // FIX 2 — debt SOURCE (liq[0]=crypto) carries an amber badge IN ADDITION to its purple outflow badge
  checks.push(ok('FIX2: debt SOURCE stamped at liq[0] (crypto data-route-debt-src=1)', on.dsrcCry === '1'));
  checks.push(ok('FIX2: source room has BOTH badges (purple outflow + amber source)', on.cryBadges === 2));
  // FIX 3 — tied value -> stable id tiebreak, placement-agnostic (aaa always 1, bbb always 2)
  checks.push(ok('FIX3: tied-value -> id tiebreak (aaa=1,bbb=2) both entry orders', tied1.aaa === '1' && tied1.bbb === '2' && tied2.aaa === '1' && tied2.bbb === '2'));
  // (a) inline recolor: outflow PURPLE, demolition AMBER (not CSS teal/gold)
  checks.push(ok('a: OUTFLOW path inline-recolored PURPLE', purple(on.outStroke)));
  checks.push(ok('a: DEMOLITION path inline-recolored AMBER (fuse)', on.demoCount === 1 && amber(on.demoStroke)));
  checks.push(ok('a: only ONE demolition path (priority debt only)', on.demoCount === 1));
  // (b) draw-on then sustained current
  checks.push(ok('b: draw-on fired (base path animating on fresh) + data-routing-animated', on.outBaseAnim >= 1 && on.animated === '1'));
  checks.push(ok('b: sustained PURPLE comet present + animating after settle', settled.comet && settled.cometAnim >= 1));
  checks.push(ok('b: sustained AMBER fuse present + animating after settle', settled.fuseCount >= 1 && settled.fuseAnim >= 1));
  // (c) two-color ledger
  checks.push(ok('c: sequence rows (liq/pretax/roth) PURPLE', purple(on.hiTax) && purple(on.hiPre) && purple(on.hiRoth)));
  checks.push(ok('c: priority-debt row AMBER (fuse)', amber(on.hiMort)));
  checks.push(ok('c: non-priority debt + physical NOT highlighted', !purple(on.hiRev) && !amber(on.hiRev) && !purple(on.hiVeh) && !amber(on.hiVeh)));
  // (d) isPriority field works (priority highlighted amber, non-priority not)
  checks.push(ok('d: isPriority field drives fuse ledger (mort amber, rev not)', amber(on.hiMort) && !amber(on.hiRev)));
  checks.push(ok('d: ledger highlight inline-style only (no markup hook)', has(on.hiTax, 'box-shadow') || has(on.hiTax, 'background')));
  // (e) STILL -> static recolored, no flow
  checks.push(ok('e: STILL -> outflow recolored static (purple) + animation:none', purple(still.outStroke) && has(still.outAnimNone, 'none')));
  checks.push(ok('e: STILL -> NO comet/fuse, NO data-routing-animated', !still.comet && still.fuseCount === 0 && !still.animated));
  checks.push(ok('e: STILL -> NO ledger highlight', !purple(still.hiTax) && !amber(still.hiMort)));
  // (f) no total + keyed + toggle-off clears
  checks.push(ok('f: gross + investable identical routing-on vs off', pre.gross === on.gross && pre.gross === off.gross && pre.inv === on.inv && pre.inv === off.inv && pre.inv !== null));
  checks.push(ok('f: keyed to #btn-routing (off=no flow; on=active)', !pre.routingActive && on.routingActive === true));
  checks.push(ok('f: toggle-off clears comet/fuse + ledger + animated', !off.comet && off.fuseCount === 0 && !purple(off.hiTax) && !amber(off.hiMort) && !off.animated));
  // (g) zero errors
  checks.push(ok('g: zero page errors (normal + STILL)', N.errs.length === 0 && W.errs.length === 0));

  console.log('detail ON  :', JSON.stringify({ outStroke: on.outStroke, demoStroke: on.demoStroke, demoCount: on.demoCount, comet: on.comet, fuses: on.fuseCount, anim: on.animated, hiTaxP: purple(on.hiTax), hiMortA: amber(on.hiMort), hiRevP: purple(on.hiRev) }));
  console.log('detail SET :', JSON.stringify({ comet: settled.comet, cometAnim: settled.cometAnim, fuses: settled.fuseCount, fuseAnim: settled.fuseAnim }));
  console.log('detail STILL:', JSON.stringify({ outStroke: still.outStroke, animNone: still.outAnimNone, comet: still.comet, anim: still.animated }));
  console.log('detail TOT :', JSON.stringify({ preG: pre.gross, onG: on.gross, offG: off.gross, inv: on.inv }));
  if (N.errs.length) console.log('N errs:', N.errs.slice(0,4));
  if (W.errs.length) console.log('W errs:', W.errs.slice(0,4));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
