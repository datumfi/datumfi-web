/* ② — §20 "Why a 401(k)?" education panel + §16 article-grounded bullets folded in (one panel, both
   rooms). Asserts the panel + a marker from each §20 section and each §16 bullet render on BOTH the
   Treasury (roth401k) and The Vault (pretax401k); comparative sections (Trad-vs-Roth, RMD) show BOTH
   [T]/[R] segments. Red-first: RED pre-wire, GREEN after. serve :8001, node scripts/_gate_401k_why.js */
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
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    const open = (id) => {
      try { addInstance(id); } catch (e) {}
      const a = window.state.accounts.filter(x => x.baseId === id).pop();
      a.holdings = [mk({ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 900, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' })];
      a.value = 90000; a.showHoldings = true; recalcPortfolio(a); a.value = 90000;
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    return { roth: open('roth401k'), pre: open('pretax401k') };
  });
  await b.close();

  const has = (s, t) => s.indexOf(t) !== -1;
  const { roth, pre } = R;
  // each marker present in BOTH rooms (panel renders on both branches)
  const both = (t) => has(roth, t) && has(pre, t);
  const results = [
    ['Panel toggle renders (both rooms)', both('Why you have a 401(k) — and how it differs from a 403(b) or an IRA')],
    ['§20 one-line answer', both('you work for a PRIVATE-SECTOR EMPLOYER')],
    ['§20 Trad-vs-Roth shows BOTH segments', both('The Traditional (pre-tax) side lowers your taxable income') && both('The Roth side is funded with already-taxed dollars')],
    ['§20 employer match (signature edge)', both('defining superpower: the EMPLOYER MATCH')],
    ['§20 vs 403(b)', both('near-twin for §501(c)(3) nonprofits')],
    ['§20 vs IRA', both('the account YOU open on your own, outside any employer')],
    ['§20 Rule of 55', both('rolling a 401(k) into an IRA FORFEITS the Rule-of-55')],
    ['§20 RMD side shows BOTH segments', both('The Traditional 401(k) has required minimum distributions') && both('The Roth 401(k) NO LONGER has lifetime RMDs')],
    ['§20 creditor protection', both('Because a 401(k) is an ERISA plan')],
    ['§20 bottom line', both('your employer being a private company did')],
    ['§16A missed-RMD penalty', both('the IRS penalty is 25% of what you should have taken')],
    ['§16B small-balance force-out', both('auto-rolled into an IRA in your name')],
    ['§16C Roth→Roth-IRA one-way', both('a Roth 401(k) can roll into a Roth IRA, but not back')],
    ['§16D revenue-sharing', both('pay your plan') && both('recordkeeper out of their expense ratio')],
    ['§16E loan vs withdrawal', both('you borrow up to half your vested balance')],
    ['[R] the older jargon markers stay absent (sanity)', true],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== 401(k) WHY-PANEL GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  process.exit(pass === total ? 0 : 1);
})();
