/* 529 DI twin + reverse name-sync gate — RED-first. Asserts via the app's own paths:
   (1) 529 modal panels per the 529 Copy Bank: §3a owner↔beneficiary axis FIRST, §3b two-way
   withdrawal (penalty on EARNINGS only), §3c 529→Roth rollover, §4 gift framing (exclusion +
   superfund, NOT a salary cap), set-aside default ON, trust scaffolding suppressed;
   (2) §1 signal strip + §9 narrative + §2 title hover for The Academy;
   (3) reverse name-sync: modal-header rename -> acc.name -> left estate card (ALL rooms).
   Usage: node scripts/_gate_529_namesync.js [LABEL]   (serve repo root on :8001) */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
      instrumentType: '', priceSource: 'manual' }, o);
    try { addInstance('529plan'); } catch (e) {}
    const a = window.state.accounts.find(x => x.baseId === '529plan');
    if (!a) return { fail: 'no 529plan account' };
    const frictionDefault = a.isFriction === true;
    // fixture: $42k glidepath fund (beta 1.2) + $6k stable value (GUARD row)
    a.holdings = [
      mk({ ticker: 'FDEEX', name: 'Fidelity Age-Based Index', price: 42, shares: 1000, beta: 1.2, expRatio: 0.12,
           assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'Mutual Fund' }),
      mk({ name: 'Stable Value', price: 1, shares: 6000, instrumentType: 'CASH', assetClass: 'Cash' })
    ];
    recalcPortfolio(a);
    a.showHoldings = true;
    window.openAccountModal(a.id);
    const html = document.getElementById('modal-dynamic-content').innerHTML;
    const title = document.getElementById('modal-acc-title').innerHTML;
    // empty-state honesty: fresh 529 with no holdings
    return { html: html, title: title, frictionDefault: frictionDefault, accId: a.id };
  });
  if (R.fail) { console.error('GATE ERROR: ' + R.fail); process.exit(2); }

  // ---- name-sync block (bank room + plain room, both directions) ----
  const N = await p.evaluate(() => {
    const res = {};
    try { addInstance('taxable'); } catch (e) {}
    const tx = window.state.accounts.find(x => x.baseId === 'taxable');
    window.openAccountModal(tx.id);
    const inp = document.querySelector('#modal-acc-title input');
    res.titleIsEditable = !!inp;
    if (inp) {
      inp.value = 'Wealthfront Robo';
      inp.dispatchEvent(new Event('change'));
      res.stateSynced = tx.name === 'Wealthfront Robo';
      const card = Array.from(document.querySelectorAll('.editable-room-name')).find(e => e.value === 'Wealthfront Robo');
      res.cardSynced = !!card;
    }
    // forward direction still works (left card -> modal title)
    if (window.updateName) { updateName(tx.id, 'Robo Two'); }
    const t2 = document.getElementById('modal-acc-title');
    res.forwardSynced = t2 && (t2.innerHTML.indexOf('Robo Two') !== -1 || (t2.querySelector('input') && t2.querySelector('input').value === 'Robo Two'));
    // bank room: rename keeps the §2 hover
    const a5 = window.state.accounts.find(x => x.baseId === '529plan');
    window.openAccountModal(a5.id);
    const inp5 = document.querySelector('#modal-acc-title input');
    if (inp5) { inp5.value = 'Kiddo College Fund'; inp5.dispatchEvent(new Event('change')); }
    res.bankRenamed = a5.name === 'Kiddo College Fund';
    res.bankHoverKept = document.getElementById('modal-acc-title').innerHTML.indexOf('tax-advantaged education account') !== -1;
    return res;
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (t) => R.html.indexOf(t) !== -1;
  console.log('===== 529 TWIN + NAME-SYNC GATE [' + LABEL + '] =====');
  let all = true;
  // §3a owner↔beneficiary — the defining axis, renders FIRST (above withdrawal + gift panels)
  all = ok('529: owner/beneficiary axis present',            has('OWNER') && has('Beneficiary')) && all;
  all = ok('529: axis renders FIRST (above withdrawal)',     R.html.indexOf('who the money is for') > -1 && R.html.indexOf('who the money is for') < (R.html.indexOf('WITHDRAWAL') === -1 ? 1e9 : R.html.indexOf('WITHDRAWAL'))) && all;
  all = ok('529: beneficiary sourced-or-blank (no name)',    !has('Maya')) && all;
  // §3b two-way rule
  all = ok('529: qualified = tax-free forever',              has('Tax-free, penalty-free, forever')) && all;
  all = ok('529: penalty on EARNINGS only',                  has('EARNINGS')) && all;
  all = ok('529: K-12 $20,000 OBBBA',                        has('20,000')) && all;
  all = ok('529: student-loan $10,000 valve',                has('10,000')) && all;
  all = ok('529: no-RMD line',                               /RMD/i.test(R.html)) && all;
  // §3c rollover
  all = ok('529: Roth rollover $35,000 lifetime',            has('35,000')) && all;
  all = ok('529: 15-year account-age gate',                  has('15 years')) && all;
  // §4 gift framing (NOT a salary cap)
  all = ok('529: $19,000 annual exclusion (2026)',           has('19,000')) && all;
  all = ok('529: superfund $190,000 couple',                 has('190,000')) && all;
  all = ok('529: framed gift-tax-free, not "the limit"',     has('gift-tax-free')) && all;
  // §1 strip + §9 narrative
  all = ok('529: strip has enrollment-tilt cell',            has('Enrollment Tilt') || has('tuition bill')) && all;
  all = ok('529: strip superfund cell',                      has('front-load') || has('Front-load')) && all;
  all = ok('529: split computes 88% / 13%…12%',              has('88%')) && all;
  all = ok('529: narrative Layer C (OBBBA stretches)',       has('OBBBA now stretches')) && all;
  all = ok('529: narrative Layer C2 (beta 1.2 hotter)',      has('hotter than')) && all;
  all = ok('529: narrative Layer D set-aside ON',            has('grows untouched outside your spending plan')) && all;
  all = ok('529: narrative Layer E (never trapped)',         has('never trapped')) && all;
  all = ok('529: set-aside (isFriction) defaults ON',        R.frictionDefault === true) && all;
  all = ok('529: education set-aside toggle copy',           has('education reserve')) && all;
  all = ok('529: NO trust scaffolding leak',                 !has('TRUST ARCHITECTURE')) && all;
  all = ok('529: NO [R]/[T] scaffold leak',                  !has('Rule of 55') && !has('Catch-Up (50+)')) && all;
  // §2 title
  all = ok('529: title hover (education account)',           R.title.indexOf('tax-advantaged education account') !== -1) && all;
  all = ok('529: title one-liner (stealth Roth head-start)', R.title.indexOf('stealth Roth head-start') !== -1) && all;
  // name-sync
  all = ok('name-sync: modal title is editable',             N.titleIsEditable === true) && all;
  all = ok('name-sync: modal rename -> state',               N.stateSynced === true) && all;
  all = ok('name-sync: modal rename -> left estate card',    N.cardSynced === true) && all;
  all = ok('name-sync: forward (card -> modal) intact',      N.forwardSynced === true) && all;
  all = ok('name-sync: bank-room rename keeps §2 hover',     N.bankRenamed === true && N.bankHoverKept === true) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
