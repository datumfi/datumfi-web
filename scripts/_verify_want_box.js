'use strict';
/* B2 v2 gate — OUTFLOW WANT readout (studio.html #want-readout) via the APP render path (Lesson 47).
   Engine unchanged (datum-math.js); this verifies the plain-English re-voice + 3 wirings.
   Proves:
     (1) hidden until Routing on; shows on toggle; hides on toggle-off;
     (2) verbatim copy installed: TITLE, lead, Datum line (pension-named income), tax-smart order header,
         per-hop "Type -> Room - $amt (tax)", crossing-lines, footer, notes;
     (3) per-HOLDING basis blend still reflected: tx tax $6,750 (0.45), NOT pure-50% $7,500;
     (4) HONESTY: income line names "pension", never "Social Security"; SS appears ONLY in the caveat;
     (5) hide-zero-income: no income account -> "Savings cover all of it", no "$0"/"pension" clause;
     (6) live-refresh: Routing on -> fire datum-slider input -> box's Datum updates with NO lens toggle;
     (7) honest shortfall; (8) LOCK-3 state byte-identical after render; engine truth matches.
   RED-first: against pre-B2v2 studio.html the new copy strings are absent -> fails.
   Usage: node scripts/_verify_want_box.js [LABEL] */
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

const SEED = (withPension) => `(mk)=>{const f=eval(mk);
  window.state.accounts=[
    f('tx','taxable',100000,[
      {ticker:'A',price:500,shares:100,costBasis:30000,beta:'',expectedReturn:'',priceSource:'manual'},
      {ticker:'B',price:500,shares:100,costBasis:'',   beta:'',expectedReturn:'',priceSource:'manual'}]),
    f('pre','pretax401k',80000), f('roth','rothira',50000)${withPension ? `, f('pen','pension',30000)` : ''}];
  var s=document.getElementById('spend-input'); if(s) s.value='$250,000';
  var l=document.getElementById('studio-layout'); if(l&&l.classList.contains('mode-shape')&&window.toggleShapeMode) toggleShapeMode();
  if(window.renderInputs) renderInputs(); if(window.updateSVGs) updateSVGs();}`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  let nativeDialog = false; p.on('dialog', d => { nativeDialog = true; d.dismiss().catch(() => {}); });
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { state: 'attached', timeout: 15000 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(([s, mk]) => eval('(' + s + ')')(mk), [SEED(true), MK]);
  await p.waitForTimeout(400);

  const hasEngine = await p.evaluate(() => typeof window.DatumMath === 'object' && typeof DatumMath.waterfall === 'function');
  const hasBox = await p.evaluate(() => !!document.getElementById('want-readout'));
  const hiddenPre = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && !x.classList.contains('visible'); });

  const truth = await p.evaluate(() => {
    if (!window.DatumMath) return null;
    const accts = [
      { id: 'tx', taxCode: 'liquid', value: 100000, isInvestment: true, gainFrac: 0.45, meta: 'The Living Room' },
      { id: 'pre', taxCode: 'pretax', value: 80000, isInvestment: true, meta: 'The Vault' },
      { id: 'roth', taxCode: 'roth', value: 50000, isInvestment: true, meta: 'The Conservatory' }
    ];
    const r = DatumMath.waterfall({ accounts: accts, spendAnnual: 250000, incomeAnnual: 30000 });
    return { hops: r.hops.map(h => [h.id, Math.round(h.amount), Math.round(h.taxEstimate)]) };
  });

  const stateBefore = await p.evaluate(() => JSON.stringify(window.state.accounts));
  await p.evaluate(() => { if (window.toggleRouting) toggleRouting(); });
  await p.waitForTimeout(350);

  const title = await p.evaluate(() => { const t = document.querySelector('#want-readout .hud-title'); return t ? t.innerText : ''; });
  const shown = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && x.classList.contains('visible'); });
  const body = await p.evaluate(() => (document.getElementById('want-readout-body') || {}).innerText || '');
  const needTxt = await p.evaluate(() => { const e = document.querySelector('#want-readout-body .wr-need'); return e ? e.innerText : ''; });
  const noteTxt = await p.evaluate(() => { const e = document.querySelector('#want-readout-body .wr-note'); return e ? e.innerText : ''; });
  const stateAfter = await p.evaluate(() => JSON.stringify(window.state.accounts));

  // (6) live-refresh: change the Datum slider -> box Datum tracks spend-input WITHOUT a lens toggle
  const live = await p.evaluate(() => {
    const sDat = document.getElementById('slider-datum'); if (!sDat) return { skip: true };
    const before = (document.getElementById('want-readout-body') || {}).innerText || '';
    sDat.value = String(Math.max(parseInt(sDat.min || '0', 10) + 1, Math.round((parseInt(sDat.value, 10) || 2) / 2)));
    sDat.dispatchEvent(new Event('input', { bubbles: true }));
    const spendNow = (document.getElementById('spend-input').value || '').replace(/[^0-9]/g, '');
    const want = '$' + parseInt(spendNow || '0', 10).toLocaleString('en-US') + '/yr';
    const after = (document.getElementById('want-readout-body') || {}).innerText || '';
    return { changed: before !== after, tracksSpend: after.indexOf(want) >= 0, want };
  });
  await p.waitForTimeout(150);

  // toggle OFF -> hides
  await p.evaluate(() => { if (window.toggleRouting) toggleRouting(); });
  await p.waitForTimeout(200);
  const hiddenPost = await p.evaluate(() => { const x = document.getElementById('want-readout'); return !!x && !x.classList.contains('visible'); });

  // (7) shortfall: huge spend
  await p.evaluate(() => { const s = document.getElementById('spend-input'); if (s) s.value = '$900,000'; if (window.toggleRouting) toggleRouting(); if (window.renderWantBox) renderWantBox(); });
  await p.waitForTimeout(200);
  const shortTxt = await p.evaluate(() => (document.getElementById('want-readout-body') || {}).innerText || '');

  // (5) hide-zero-income: reseed WITHOUT a pension account
  await p.evaluate(([s, mk]) => eval('(' + s + ')')(mk), [SEED(false), MK]);
  await p.waitForTimeout(300);
  await p.evaluate(() => { if (!document.getElementById('want-readout').classList.contains('visible') && window.toggleRouting) toggleRouting(); if (window.renderWantBox) renderWantBox(); });
  await p.waitForTimeout(250);
  const noIncTxt = await p.evaluate(() => (document.getElementById('want-readout-body') || {}).innerText || '');

  await b.close(); await new Promise(r => server.close(r));

  const ok = (n, c) => { console.log(`${n.padEnd(70)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const ssCount = (body.match(/Social Security/g) || []).length;
  console.log('===== B2 v3 WANT-BOX GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('engine + box present', hasEngine && hasBox));
  checks.push(ok('(1) hidden before Routing; hides on toggle-off', hiddenPre && hiddenPost));
  checks.push(ok('(1) shows on Routing toggle', shown));
  checks.push(ok('copy: TITLE "FUNDING YOUR RETIREMENT SPENDING"', /FUNDING YOUR RETIREMENT SPENDING/.test(title)));
  checks.push(ok('copy: lead "Your Datum is what you’ll spend each year"', /Your Datum is what you’ll spend each year/.test(body)));
  checks.push(ok('copy: Datum line — pension covers $30,000; your accounts cover the other $220,000', /Datum: \$250,000\/yr — pension covers \$30,000; your accounts cover the other \$220,000\./.test(body)));
  checks.push(ok('copy: tax-smart order header', /Pulled tax-smart — taxable first, pre-tax next, Roth last:/.test(body)));
  checks.push(ok('copy: hops Taxable→Living Room/$100,000, Pre-tax→Vault/$80,000, Roth→Conservatory/$40,000',
    /Taxable → The Living Room — \$100,000/.test(body) && /Pre-tax → The Vault — \$80,000/.test(body) && /Roth → The Conservatory — \$40,000 \(no tax\)/.test(body)));
  checks.push(ok('(3) blend: tx ~$6,750 (0.45) present, pure-50% $7,500 absent', /\$6,750/.test(body) && !/\$7,500/.test(body)));
  checks.push(ok('copy: pretax ~$17,600 tax', /\$17,600/.test(body)));
  checks.push(ok('copy: crossing-lines explainer', /Lines crossing\?/.test(body)));
  checks.push(ok('copy: footer "Total pulled: $220,000/yr · estimated tax ~$24,350/yr"', /Total pulled: \$220,000\/yr/.test(body) && /estimated tax ~\$24,350\/yr/.test(body)));
  checks.push(ok('HARD RULE: word "savings" never appears in box body', !/savings/i.test(body) && !/savings/i.test(noteTxt)));
  checks.push(ok('copy: notes taxes-estimated line', /Amounts exact; taxes estimated \(~22% pre-tax, 15% gains\)/.test(body)));
  checks.push(ok('(4) HONESTY: SS only in caveat (1x in body, in .wr-note, NOT in Datum line)', ssCount === 1 && /Social Security/.test(noteTxt) && !/Social Security/.test(needTxt)));
  checks.push(ok('(4) income line names "pension"', /pension/i.test(needTxt)));
  checks.push(ok('(2) engine truth tx100k/6750, pre80k/17600, roth40k/0', truth && JSON.stringify(truth.hops) === JSON.stringify([['tx', 100000, 6750], ['pre', 80000, 17600], ['roth', 40000, 0]])));
  checks.push(ok('(6) live-refresh: datum-slider input updates box, no lens toggle', live && !live.skip && live.changed && live.tracksSpend));
  checks.push(ok('(7) shortfall shown (spend 900k)', /short/i.test(shortTxt)));
  checks.push(ok('(5) hide-zero-income: "your accounts cover all of it", no "$0"/"pension"/"savings"', /your accounts cover all of it/.test(noIncTxt) && !/\$0\b/.test(noIncTxt) && !/pension/i.test(noIncTxt) && !/savings/i.test(noIncTxt)));
  checks.push(ok('(8) LOCK-3: state byte-identical after render', stateBefore === stateAfter));
  checks.push(ok('ERR: zero page errors, zero native dialogs', errs.length === 0 && nativeDialog === false));

  console.log('body:', JSON.stringify(body.replace(/\s+/g, ' ').slice(0, 420)));
  console.log('live:', JSON.stringify(live), ' noInc:', JSON.stringify(noIncTxt.replace(/\s+/g, ' ').slice(0, 140)));
  if (errs.length) console.log('errs:', errs.slice(0, 5));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
