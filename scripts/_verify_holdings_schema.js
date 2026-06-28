'use strict';
/* HOST PHASE-(i) gate (re-cut) — holdings schema + TYPEABLE inline cost-basis + brand warn-modal, via
   the APP render path (Lesson 47).
   (A) a holding (init OR push) carries costBasis + beta + expectedReturn + priceSource('manual').
   (B) the Cost-Basis column is a REAL inline table-cell (display:table-cell, NOT flex) and is TYPEABLE —
       typing persists via the field-generic updateHolding('costBasis').  [the smoke BLOCKER]
   (C) front value editable (no readonly) -> onFrontValueEdit -> BRAND modal (NOT OS confirm): Replace
       clears acc.holdings[] + accepts typed value; Keep-holdings reverts to the EXACT holdings-sum.
   No native confirm() dialog must fire. RED-first on 32e0697. Self-contained server.
   Usage: node scripts/_verify_holdings_schema.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8142;
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
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false,showHoldings:false})`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  let nativeDialog = false;
  p.on('dialog', d => { nativeDialog = true; d.dismiss().catch(() => {}); });   // brand modal MUST replace OS confirm
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate((mk) => { const f = eval(mk); window.state.accounts = [f('tx', 'taxable', 0)]; if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs(); }, MK);
  await p.waitForTimeout(300);

  // (A) schema — open modal, enter holdings, add one more; both must carry the 4 fields
  const schema = await p.evaluate(() => {
    window.openAccountModal('tx'); window.toggleHoldings('tx'); window.addHolding('tx');
    const h = window.state.accounts[0].holdings;
    const fields = (o) => o ? ['costBasis', 'beta', 'expectedReturn', 'priceSource'].filter(k => k in o) : [];
    return { n: h.length, initFields: fields(h[0]), pushFields: fields(h[1]), priceSource0: h[0] && h[0].priceSource };
  });

  // (B) Cost-Basis column is a REAL inline cell + TYPEABLE (the blocker)
  const thDisplay = await p.evaluate(() => {
    const th = Array.from(document.querySelectorAll('.holdings-table th')).find(t => /Cost Basis/.test(t.textContent));
    return th ? getComputedStyle(th).display : null;
  });
  const cbSel = 'input[oninput*="costBasis"]';
  const cbInput = await p.$(cbSel);
  let typed = { ok: false, persisted: null };
  if (cbInput) {
    await cbInput.fill('62000');                                  // TYPE into the cost-basis input
    await p.waitForTimeout(80);
    typed.persisted = await p.evaluate(() => window.state.accounts[0].holdings[0].costBasis);
    typed.ok = (String(typed.persisted) === '62000');
  }

  // (C) front editable + brand-modal warn-on-overwrite
  await p.evaluate(() => { const a = window.state.accounts[0]; a.holdings = [{ ticker: 'X', price: 10, shares: 100, costBasis: 0, beta: '', expectedReturn: '', priceSource: 'manual' }]; a.value = 1000; if (window.renderInputs) renderInputs(); });
  const front = await p.evaluate(() => { const el = document.getElementById('room-val-inp-tx'); return { exists: !!el, readonly: el ? el.hasAttribute('readonly') : null, oninput: el ? (el.getAttribute('oninput') || '') : '', hasFn: typeof window.onFrontValueEdit === 'function' }; });

  // ACCEPT (Replace): brand modal appears -> click #bc-ok -> holdings cleared + typed accepted
  await p.evaluate(() => { const el = document.getElementById('room-val-inp-tx'); el.value = '$5,000'; window.onFrontValueEdit('tx', el); });
  await p.waitForTimeout(80);
  const modalShown = await p.evaluate(() => { const ov = document.getElementById('brand-confirm-overlay'); return !!ov && ov.style.display === 'flex'; });
  await p.click('#bc-ok');
  const accept = await p.evaluate(() => ({ holdings: window.state.accounts[0].holdings.length, accVal: window.state.accounts[0].value }));

  // CANCEL (Keep holdings): reset -> click #bc-cancel -> holdings intact + revert to exact sum
  await p.evaluate(() => { const a = window.state.accounts[0]; a.holdings = [{ ticker: 'X', price: 10, shares: 100, costBasis: 0, beta: '', expectedReturn: '', priceSource: 'manual' }]; a.value = 1000; if (window.renderInputs) renderInputs(); const el = document.getElementById('room-val-inp-tx'); el.value = '$5,000'; window.onFrontValueEdit('tx', el); });
  await p.waitForTimeout(80);
  await p.click('#bc-cancel');
  const cancel = await p.evaluate(() => ({ holdings: window.state.accounts[0].holdings.length, elVal: document.getElementById('room-val-inp-tx').value }));

  // Fix 3 — when already in holdings, the button says "Back to Account" (not "Begin...")
  const exitLabel = await p.evaluate(() => { const ov = document.getElementById('account-modal-overlay'); const html = ov ? ov.innerHTML : ''; return /Back to Account/i.test(html); });

  await b.close(); await new Promise(r => server.close(r));

  const ok = (n, c) => { console.log(`${n.padEnd(66)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== HOST PHASE-(i) GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('A: init holding carries all 4 new fields', schema.initFields.length === 4));
  checks.push(ok('A: pushed holding carries all 4 fields', schema.pushFields.length === 4));
  checks.push(ok("A: priceSource defaults 'manual'", schema.priceSource0 === 'manual'));
  checks.push(ok('B(fix1): Cost-Basis th is a REAL table-cell (not flex)', thDisplay === 'table-cell'));
  checks.push(ok('B(fix1): Cost-Basis input is TYPEABLE + persists (62000)', !!cbInput && typed.ok));
  checks.push(ok('C: front input editable (no readonly) + routes to onFrontValueEdit', front.exists && front.readonly === false && /onFrontValueEdit/.test(front.oninput) && front.hasFn));
  checks.push(ok('C(fix4): warn uses BRAND modal (overlay shown), NOT OS confirm', modalShown && nativeDialog === false));
  checks.push(ok('C(fix4): Replace -> holdings cleared + typed value accepted (5000)', accept.holdings === 0 && accept.accVal === 5000));
  checks.push(ok('C(fix4): Keep holdings -> intact + reverts to EXACT sum ($1,000)', cancel.holdings === 1 && cancel.elVal === '$1,000'));
  checks.push(ok('fix3: button reads "Back to Account" while in holdings', exitLabel));
  checks.push(ok('ERR: zero page errors + zero native dialogs', errs.length === 0 && nativeDialog === false));

  console.log('detail:', JSON.stringify({ schema, thDisplay, typed, front, modalShown, nativeDialog, accept, cancel, exitLabel }));
  if (errs.length) console.log('errs:', errs.slice(0, 5));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
