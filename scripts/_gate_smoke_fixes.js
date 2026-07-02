/* Smoke-fix gate (Captain's 2026-07-01 P-stack) — RED-first. Reproduces each finding via the
   app's own paths, then goes GREEN only when the fix lands:
   P0  async modal-swap (fetchMockData reopening a stale modal mid-flight)
   P1  Blended Yield fail-to-blank (never 0.00%)
   P2  honest mix denominators (unclassified rows surfaced, Stock-instrument equity fallback)
   P4  value-weighted {spineShape}/{instrumentMix} (83% VTI = fund core, NOT "heavily concentrated")
   P5* Captain-dictated renames only: "Annual Maximum", "International"
   P6  header autosize · title tooltip un-clipped · modal above the cookie banner · TOTAL dupe gone
   Usage: node scripts/_gate_smoke_fixes.js [LABEL]   (serve repo root on :8001) */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  await p.route('**/ticker-bundle.js', async (route) => { await new Promise(r => setTimeout(r, 1200)); route.continue(); });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);
  const sc = p.locator('text=Start from Scratch').first(); if (await sc.count()) await sc.click().catch(() => {});
  await p.waitForTimeout(500);

  const R = await p.evaluate(async () => {
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
      instrumentType: '', priceSource: 'manual' }, o);
    const res = {};

    // ── P0: the swap repro — type a ticker, close, open another room, let the bundle land ──
    addInstance('hsa'); addInstance('roth403');
    const hsa = state.accounts.find(a => a.baseId === 'hsa');
    const r4  = state.accounts.find(a => a.baseId === 'roth403');
    toggleHoldings(hsa.id);
    fetchMockData(hsa.id, 0, 'TSLA');
    document.getElementById('account-modal-overlay').style.display = 'none';
    toggleHoldings(r4.id);
    await new Promise(r => setTimeout(r, 2200));
    const t = document.getElementById('modal-acc-title');
    const ti = t.querySelector('input');
    res.p0_staysOnRoth = !!ti && /Roth 403/.test(ti.value);
    res.p0_noBleed = (r4.holdings || []).every(h => !((parseFloat(h.price) || 0) * (parseFloat(h.shares) || 0)));

    // ── P1 + P4 + P2: Captain's exact Roth fixture — TSLA + IBM(y2.42) removed -> TSLA(y0) + VTI ──
    r4.holdings = [
      mk({ ticker: 'TSLA', name: 'Tesla', price: 50, shares: 50, beta: 1.798, dividendYield: 0, assetClass: 'US Equity', geography: 'US', sector: 'Consumer Cyclical', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 52, shares: 100, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    recalcPortfolio(r4);
    openAccountModal(r4.id);
    let html = document.getElementById('modal-dynamic-content').innerHTML;
    res.p1_yieldBlank = !/0\.00%/.test(html);                       // TSLA sourced-0 -> "—", never 0.00%
    res.p4_fundCore = html.indexOf('anchored by a diversified fund core') !== -1;   // VTI 67%… see next fixture
    res.p6_noTotalDupe = html.indexOf('TOTAL PORTFOLIO VALUE') === -1;
    res.p5_annualMax_none403 = true;   // checked on trad403 below

    // Captain's exact 83%-VTI mix (TSLA+IBM+VTI)
    r4.holdings = [
      mk({ ticker: 'TSLA', name: 'Tesla', price: 52, shares: 52, beta: 1.798, dividendYield: 0, assetClass: 'US Equity', geography: 'US', sector: 'Consumer Cyclical', instrumentType: 'Stock' }),
      mk({ ticker: 'IBM', name: 'IBM', price: 56, shares: 56, beta: 0.665, dividendYield: 2.42, assetClass: '', geography: 'US', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 56, shares: 522, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    recalcPortfolio(r4);
    openAccountModal(r4.id);
    html = document.getElementById('modal-dynamic-content').innerHTML;
    res.p4_notConcentrated = html.indexOf('heavily concentrated') === -1;
    res.p4_fundCore = html.indexOf('anchored by a diversified fund core') !== -1;
    res.p4_noTickerCountMix = html.indexOf('a mix of funds and single names') === -1;
    res.p1_realYieldShows = /1\.\d\d%/.test(html) || html.indexOf('0.19%') !== -1;   // IBM 2.42 weighted in
    // IBM has no assetClass -> Stock-instrument fallback classifies it equity; mix shows NO unclassified
    res.p2_stockFallback = html.indexOf('unclassified') === -1;

    // unclassified surfaced honestly: SAP/SHV (no assetClass; SHV not a Stock) + VTI
    r4.holdings = [
      mk({ ticker: 'SAP', name: 'SAP SE', price: 250, shares: 10, geography: 'International', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'SHV', name: 'iShares 0-1Y Treasury', price: 110, shares: 10, instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 100, shares: 10, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    recalcPortfolio(r4);
    openAccountModal(r4.id);
    html = document.getElementById('modal-dynamic-content').innerHTML;
    res.p2_unclassifiedShown = html.indexOf('unclassified') !== -1;   // SHV $1.1k of $4.6k can't be silently ignored
    res.p2_no100pctClaim = html.indexOf('100% stocks') === -1;        // the misleading-denominator symptom

    // ── HSA strip: International label + foreign fires with value ──
    hsa.holdings = [
      mk({ ticker: 'SAP', name: 'SAP SE', price: 250, shares: 10, geography: 'International', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 250, shares: 10, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    recalcPortfolio(hsa);
    if (!hsa.showHoldings) hsa.showHoldings = true;
    openAccountModal(hsa.id);
    const hh = document.getElementById('modal-dynamic-content').innerHTML;
    res.p5_intlLabel = hh.indexOf('International</div>') !== -1 && hh.indexOf('Foreign Tilt') === -1;
    res.p2_foreignFires = /International<\/div><div class="hr-val"[^>]*>50%/.test(hh.replace(/\n/g, ''));
    res.p1_hsaYieldBlank = !/0\.00%/.test(hh);

    // ── P5 dictated rename on the limits panel (403) ──
    addInstance('trad403');
    const t4 = state.accounts.find(a => a.baseId === 'trad403');
    openAccountModal(t4.id);
    const th = document.getElementById('modal-dynamic-content').innerHTML;
    res.p5_annualMax = th.indexOf('Annual Maximum') !== -1 && th.indexOf('Active Maximum Injection') === -1;

    // ── P6: header autosize + title tooltip un-clipped + overlay above the cookie banner ──
    const ti2 = document.getElementById('modal-acc-title').querySelector('input');
    res.p6_headerAutosize = !!ti2 && /ch$/.test((ti2.style.width || ''));
    const tt = document.getElementById('modal-acc-title').querySelector('.modal-tt');
    res.p6_ttNoClip = !!tt && !(tt.getAttribute('style') || '').match(/max-height/);
    const ov = document.getElementById('account-modal-overlay');
    res.p6_overlayAboveBanner = parseInt(getComputedStyle(ov).zIndex, 10) > 9999;
    return res;
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== SMOKE-FIX GATE [' + LABEL + '] =====');
  let all = true;
  all = ok('P0: modal does NOT swap back mid-bundle-load',    R.p0_staysOnRoth) && all;
  all = ok('P0: empty room stays empty (no bleed)',           R.p0_noBleed) && all;
  all = ok('P1: sourced-0 yield renders — (never 0.00%)',     R.p1_yieldBlank) && all;
  all = ok('P1: REAL yield still computes + shows',           R.p1_realYieldShows) && all;
  all = ok('P1: HSA yield blank when unsourced',              R.p1_hsaYieldBlank) && all;
  all = ok('P2: Stock-instrument fallback classifies equity', R.p2_stockFallback) && all;
  all = ok('P2: unclassified value SURFACED in mix',          R.p2_unclassifiedShown) && all;
  all = ok('P2: no misleading 100%-stocks claim',             R.p2_no100pctClaim) && all;
  all = ok('P2: International % fires on valued SAP row',     R.p2_foreignFires) && all;
  all = ok('P4: 83% VTI reads as diversified fund core',      R.p4_fundCore) && all;
  all = ok('P4: NOT "heavily concentrated"',                  R.p4_notConcentrated) && all;
  all = ok('P4: ticker-count mix phrase gone',                R.p4_noTickerCountMix) && all;
  all = ok('P5: "Annual Maximum" replaces injection label',   R.p5_annualMax) && all;
  all = ok('P5: "International" replaces "Foreign Tilt"',     R.p5_intlLabel) && all;
  all = ok('P6: TOTAL PORTFOLIO VALUE dupe removed',          R.p6_noTotalDupe) && all;
  all = ok('P6: header input autosizes (ch width)',           R.p6_headerAutosize) && all;
  all = ok('P6: title tooltip sizes to content (no clip)',    R.p6_ttNoClip) && all;
  all = ok('P6: modal overlay above the cookie banner',       R.p6_overlayAboveBanner) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
