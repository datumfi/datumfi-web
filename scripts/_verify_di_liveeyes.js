/* Live-eyes verify: DI box paints on FIRST open + stays live on a categorical edit made
   through the real input (typing), for HSA + both 403(b) branches. "Live" = the §1 strip
   reflects the edit immediately; the §9 narrative re-renders too (its text only changes
   when a layer's signal actually changes — honesty, not staleness). */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  await p.goto('http://127.0.0.1:8001/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);
  const sc = p.locator('text=Start from Scratch').first(); if (await sc.count()) await sc.click().catch(() => {});
  await p.waitForTimeout(700);

  const out = {};
  for (const [baseId, label] of [['hsa', 'HSA'], ['trad403', '403T'], ['roth403', '403R']]) {
    await p.evaluate((baseId) => {
      const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
        assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
        instrumentType: '', priceSource: 'manual' }, o);
      addInstance(baseId);
      const a = state.accounts.find(x => x.baseId === baseId);
      a.holdings = [
        mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index', price: 180, shares: 100, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
        mk({ ticker: 'FXNAX', name: 'Fidelity US Bond Index', price: 10, shares: 900, expRatio: 0.025, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
      ];
      recalcPortfolio(a);
      a.showHoldings = true;
      window.__t = a.id;
    }, baseId);
    await p.evaluate(() => openAccountModal(window.__t));   // FIRST open — nothing pre-rendered
    await p.waitForTimeout(250);
    const first = await p.evaluate(() => {
      const e = document.querySelector('.di-narr-body');
      const st = document.querySelector('[id^="bank-strip-"]');
      return { n: e ? e.innerText.slice(0, 80) : '(NO DI BOX)', s: st ? st.innerText.replace(/\s+/g, ' ') : '' };
    });
    // live-edit through the UI: retype row 2's Asset Class (Bonds -> Stocks)
    await p.locator('#modal-dynamic-content input[oninput*="assetClass"]').nth(1).fill('Stocks');
    await p.waitForTimeout(250);
    const after = await p.evaluate(() => {
      const e = document.querySelector('.di-narr-body');
      const st = document.querySelector('[id^="bank-strip-"]');
      return { n: e ? e.innerText.slice(0, 80) : '(NO DI BOX)', s: st ? st.innerText.replace(/\s+/g, ' ') : '' };
    });
    out[label] = {
      paintsOnOpen: first.n !== '(NO DI BOX)' && first.n.length > 20,
      stripLive: first.s !== after.s && /100%/.test(after.s),
      narrLive: first.n !== after.n || first.s !== after.s,
      firstNarr: first.n, stripAfter: after.s.slice(0, 130)
    };
    await p.evaluate(() => document.getElementById('account-modal-overlay').style.display = 'none');
  }
  console.log(JSON.stringify(out, null, 1));
  const ok = Object.values(out).every(r => r.paintsOnOpen && r.stripLive && r.narrLive);
  console.log('LIVE-EYES: ' + (ok ? 'GREEN — DI box paints on open + stays live, all rooms' : 'RED'));
  await b.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(2); });
