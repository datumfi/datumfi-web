'use strict';
/* B2 gate — OUTFLOW WANT readout (studio.html #want-readout) via the APP render path (Lesson 47).
   The box narrates DatumMath.waterfall() in words and shows ONLY while the Routing lens is active.
   Proves:
     (1) hidden until Routing on; shows on toggle, hides on toggle-off;
     (2) per-hop amounts === DatumMath.waterfall() (exact dollars in the DOM);
     (3) PER-HOLDING basis blend: typed cost-basis -> REAL gain, blank -> labeled 50%, MIXED -> blended
         frac (tax reflects 0.45 blend, NOT the pure-50% 0.50) — the host-(i) cost-basis swap paying off;
     (4) tax stays LABELED (taxNote present; each hop prints its taxBasis) — never a bare number;
     (5) honest shortfall when need > investable;
     (6) LOCK-3: state byte-identical before/after render (display-only, no writeback).
   RED-first: against pre-B2 studio.html (no #want-readout / no datum-math.js) the box never populates.
   Self-contained server. Usage: node scripts/_verify_want_box.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8144;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const MK = `(id,baseId,value,holdings)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:holdings||[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false,showHoldings:false})`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { state: 'attached', timeout: 15000 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);

  // fixture: taxable $100k with MIXED holdings (50k @ basis 30k -> real 20k gain · 50k blank -> 50% est)
  //   -> blended gainFrac = (20000 + 0.5*50000)/100000 = 0.45 (NOT 0.50). pretax 80k, roth 50k, pension 30k.
  //   spend 250k, income 30k -> need 220k -> draw tx100k, pre80k, roth40k(partial). roth tax 0.
  //   tx cap-gains = 100000*0.45*0.15 = 6750 (pure-50% would be 7500). pre ordinary = 80000*0.22 = 17600.
  await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [
      f('tx', 'taxable', 100000, [
        { ticker: 'A', price: 500, shares: 100, costBasis: 30000, beta: '', expectedReturn: '', priceSource: 'manual' },
        { ticker: 'B', price: 500, shares: 100, costBasis: '',    beta: '', expectedReturn: '', priceSource: 'manual' }
      ]),
      f('pre', 'pretax401k', 80000), f('roth', 'rothira', 50000), f('pen', 'pension', 30000)
    ];
    const s = document.getElementById('spend-input'); if (s) s.value = '$250,000';
    const l = document.getElementById('studio-layout'); if (l && l.classList.contains('mode-shape') && window.toggleShapeMode) toggleShapeMode();
    if (window.renderInputs) renderInputs();
    if (window.updateSVGs) updateSVGs();
  }, MK);
  await p.waitForTimeout(400);

  const hasEngine = await p.evaluate(() => typeof window.DatumMath === 'object' && typeof DatumMath.waterfall === 'function');
  const hasBox = await p.evaluate(() => !!document.getElementById('want-readout'));

  // (1) hidden before Routing
  const hiddenPre = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && !x.classList.contains('visible'); });

  // independent engine truth (mapped like the host, gainFrac 0.45 on tx)
  const truth = await p.evaluate(() => {
    if (!window.DatumMath) return null;
    const accts = [
      { id: 'tx', taxCode: 'liquid', value: 100000, isInvestment: true, gainFrac: 0.45, gainBasis: 'real cost-basis + est. 50%', meta: 'The Living Room' },
      { id: 'pre', taxCode: 'pretax', value: 80000, isInvestment: true, meta: 'The Vault' },
      { id: 'roth', taxCode: 'roth', value: 50000, isInvestment: true, meta: 'The Conservatory' }
    ];
    const r = DatumMath.waterfall({ accounts: accts, spendAnnual: 250000, incomeAnnual: 30000 });
    return { need: r.need, hops: r.hops.map(h => [h.id, Math.round(h.amount), Math.round(h.taxEstimate)]), tax: r.totalTaxEstimate, note: r.taxNote };
  });

  // LOCK-3 snapshot
  const stateBefore = await p.evaluate(() => JSON.stringify(window.state.accounts));

  // (1b) turn Routing on
  await p.evaluate(() => { if (window.toggleRouting) toggleRouting(); });
  await p.waitForTimeout(350);

  const shown = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && x.classList.contains('visible'); });
  const bodyTxt = await p.evaluate(() => (document.getElementById('want-readout-body') || {}).innerText || '');
  const stateAfter = await p.evaluate(() => JSON.stringify(window.state.accounts));

  // (1c) toggle OFF -> hides
  await p.evaluate(() => { if (window.toggleRouting) toggleRouting(); });
  await p.waitForTimeout(250);
  const hiddenPost = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && !x.classList.contains('visible'); });

  // (5) shortfall: re-enable + bump spend beyond investable (need 500k > 230k investable)
  await p.evaluate(() => {
    const s = document.getElementById('spend-input'); if (s) s.value = '$500,000';
    if (window.toggleRouting) toggleRouting();
    if (window.renderWantBox) renderWantBox();
  });
  await p.waitForTimeout(300);
  const shortTxt = await p.evaluate(() => (document.getElementById('want-readout-body') || {}).innerText || '');

  await b.close(); await new Promise(r => server.close(r));

  const ok = (n, c) => { console.log(`${n.padEnd(66)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== B2 WANT-BOX GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('engine + box present (datum-math.js loaded, #want-readout exists)', hasEngine && hasBox));
  checks.push(ok('(1) hidden before Routing; (1c) hides again on toggle-off', hiddenPre && hiddenPost));
  checks.push(ok('(1b) shows on Routing toggle', shown));
  // (2) exact per-hop amounts in DOM
  checks.push(ok('(2) per-hop amounts in DOM ($100,000 / $80,000 / $40,000)', /\$100,000/.test(bodyTxt) && /\$80,000/.test(bodyTxt) && /\$40,000/.test(bodyTxt)));
  checks.push(ok('(2) need line correct ($220,000/yr)', /\$220,000\/yr/.test(bodyTxt)));
  // (3) blended frac: tax shows 6,750 (0.45 blend) and NOT 7,500 (pure-50%)
  checks.push(ok('(3) blend: tx cap-gains ~$6,750 (0.45), NOT pure-50% $7,500', /\$6,750/.test(bodyTxt) && !/\$7,500/.test(bodyTxt)));
  checks.push(ok("(3) blend label 'real cost-basis + est. 50%' present", /real cost-basis \+ est\. 50%/.test(bodyTxt)));
  // (4) labeled tax — basis strings + taxNote
  checks.push(ok('(4) labeled: ordinary income + tax-free (Roth) + taxNote', /ordinary income/.test(bodyTxt) && /tax-free \(Roth\)/.test(bodyTxt) && /Amounts are exact/.test(bodyTxt)));
  checks.push(ok('(4) pretax ordinary tax ~$17,600 in DOM', /\$17,600/.test(bodyTxt)));
  // (2) DOM matches independent engine truth
  const truthOk = truth && JSON.stringify(truth.hops) === JSON.stringify([['tx', 100000, 6750], ['pre', 80000, 17600], ['roth', 40000, 0]]);
  checks.push(ok('(2) engine truth = tx100k/6750, pre80k/17600, roth40k/0', !!truthOk));
  // (5) honest shortfall
  checks.push(ok('(5) shortfall shown when need 500k > investable', /shortfall/i.test(shortTxt)));
  // (6) LOCK-3
  checks.push(ok('(6) LOCK-3: state byte-identical after render', stateBefore === stateAfter));
  checks.push(ok('ERR: zero page errors', errs.length === 0));

  console.log('detail truth:', JSON.stringify(truth));
  console.log('body:', JSON.stringify(bodyTxt.replace(/\s+/g, ' ').slice(0, 360)));
  if (errs.length) console.log('errs:', errs.slice(0, 5));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
