/* Modal-tooltip ANCHOR gate (STEP A / W-tooltip · RED-first). Proves the rollup-strip AND holdings-
   table header tooltips drop BELOW their cell AND anchor horizontally beneath their OWN cell — never
   pinned to a card/viewport edge (the "stack sideways" symptom). Covers BOTH call sites so 6771 can't
   silently regress. Also proves the 280px tip inside a ~130px cell is NOT clipped: position:fixed
   escapes the card's overflow-x:clip, and the viewport clamp keeps it fully on-screen.
   Drives the app's own path (seed a bank room, open decorate modal, dispatch the real mouseenter).
   Usage: serve repo root on :8001, then node scripts/_gate_tt_anchor.js [LABEL]
   RED on today's bytes (line-1062 !important pins right-half tips; the inline clamp scatters them);
   GREEN after the shared _ttDrop helper + 1062 removal. */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1920, height: 1080 });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);

  const data = await p.evaluate(async () => {
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    try { addInstance('pretax457b'); } catch (e) {}
    const acc = window.state.accounts.find(a => a.baseId === 'pretax457b');
    acc.holdings = [
      mk({ ticker: 'VOO',  name: 'Vanguard 500', price: 100, shares: 300, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap',     instrumentType: 'ETF', costBasis: '12000', beta: '1.0', dividendYield: '1.3' }),
      mk({ ticker: 'BND',  name: 'Total Bond',   price: 100, shares: 100, expRatio: 0.03, assetClass: 'Bonds',  geography: 'US Bonds',                sector: 'Bonds',        instrumentType: 'ETF', costBasis: '9500' }),
      mk({ ticker: 'VXUS', name: 'Intl',         price: 100, shares: 80,  expRatio: 0.07, assetClass: 'Stocks', geography: 'International',           sector: 'International', instrumentType: 'ETF' })
    ];
    acc.inflow = 12000; acc.freq = 1;
    recalcPortfolio(acc);
    acc.showHoldings = true;
    window.openAccountModal(acc.id);
    await new Promise(r => setTimeout(r, 120));

    const measure = (wrap) => {
      const tt = wrap.querySelector('.modal-tt'); if (!tt) return null;
      wrap.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      const cell = wrap.getBoundingClientRect();
      const t = tt.getBoundingClientRect();
      const rec = {
        below:        t.top >= cell.bottom - 2,                 // drops beneath its row
        notRightOfOwnLeft: t.left <= cell.left + 4,             // never pinned to the right of its own left edge
        overlapsOwnCell:   t.right >= cell.left + 4,            // horizontal span still covers its own cell
        inViewport:   t.left >= 8 && t.right <= innerWidth - 8, // 280px tip fully on-screen (no clip)
        fixed:        getComputedStyle(tt).position === 'fixed' // escapes the card's overflow-x:clip
      };
      rec.ok = rec.below && rec.notRightOfOwnLeft && rec.overlapsOwnCell && rec.inViewport && rec.fixed;
      wrap.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      return rec;
    };

    const collect = (sel, labelSel) => {
      const arr = [];
      document.querySelectorAll(sel).forEach((w, i) => {
        if (!w.querySelector('.modal-tt')) return;
        const r = measure(w); if (!r) return;
        const lblEl = labelSel ? w.querySelector(labelSel) : null;
        r.lbl = ((lblEl ? lblEl.textContent : w.textContent) || ('#' + i)).trim().slice(0, 20);
        arr.push(r);
      });
      return arr;
    };

    return {
      strip:   collect('.holdings-rollup .hr-cell', '.hr-lbl'),
      headers: collect('.holdings-table th .modal-tt-wrap', null)
    };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${String(n).padEnd(60)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== MODAL TOOLTIP ANCHOR GATE [' + LABEL + '] =====');
  let all = true;

  const report = (group, rows) => {
    all = ok(group + ': cells found (> 0)', rows.length > 0) && all;
    const bad = rows.filter(r => !r.ok);
    all = ok(group + ': every tip drops BELOW its cell', rows.every(r => r.below)) && all;
    all = ok(group + ': no tip pinned right of its own cell', rows.every(r => r.notRightOfOwnLeft)) && all;
    all = ok(group + ': every tip overlaps its OWN cell', rows.every(r => r.overlapsOwnCell)) && all;
    all = ok(group + ': 280px tip fully on-screen (no clip)', rows.every(r => r.inViewport)) && all;
    all = ok(group + ': position:fixed (escapes overflow-x:clip)', rows.every(r => r.fixed)) && all;
    if (bad.length) console.log('   ' + group + ' failing cells: ' + bad.map(r => r.lbl).join(' | '));
  };

  report('STRIP', data.strip);
  report('HEADER', data.headers);

  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
