/* STEP-A universal ticker-bar header gate (Investment Modal Parity Spec, U1/U2/U3 · #212 rows 67–73).
   The COLS array (studio.html ~6690) is shared by every isInvestment room, so this asserts the three
   display-only header changes render in the SERVED bytes of TWO different investment rooms (Taxable
   "Living Room" + Roth 401(k) "The Treasury"), proving the change is universal:
     U1 Name column width 155 -> 220px
     U2 header 'Shares' -> 'Shares Owned' (width 75 -> 95), tooltip title matched
     U3 header 'Value'  -> 'Position Value' (width 90 -> 110), tooltip title matched
   RED-FIRST: on pre-edit HEAD the header row still reads bare 'Shares'/'Value' at width 155/75/90, so
   every new-state assertion FAILS and every old-state negative assertion FAILS — a genuine red->green flip.
   Field keys / math / td render fns are untouched (LOCK-3 display-only). Usage: serve repo root on :8001,
   then node scripts/_gate_stepA_headers.js [LABEL]. Writes a UTF-8 dump; never prints unicode to console. */
const { chromium } = require('playwright');
const fs = require('fs');
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
    const holdings = () => [
      mk({ ticker: 'VTI', name: 'Total Market', price: 100, shares: 200, assetClass: 'US Equity', sector: 'Blend', instrumentType: 'ETF' }),
    ];
    const openInv = (baseId) => {
      try { addInstance(baseId); } catch (e) { return '__ADDINSTANCE_THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      a.holdings = holdings(); a.showHoldings = true;
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    return { taxable: openInv('taxable'), roth401k: openInv('roth401k') };
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const rx = (s, re) => typeof s === 'string' && re.test(s);

  // header-cell fragments as rendered at studio.html:6737 — `<th style="width:Npx;">...>LBL<div class="modal-tt">`
  const rooms = { taxable: R.taxable, roth401k: R.roth401k };
  const checks = [];
  for (const [rm, h] of Object.entries(rooms)) {
    const okRoom = typeof h === 'string' && h.length > 0 && !has(h, '__');
    checks.push([rm + ': modal renders (no crash)', okRoom]);
    // U1 — Name column now width 220 (tie the width to the Name header cell so it can't pass on a stray 220)
    checks.push([rm + ': U1 Name header width 220px', rx(h, /width:220px;[\s\S]{0,600}?>Name<div class="modal-tt"/)]);
    checks.push([rm + ': U1 old Name width 155px GONE', !has(h, 'width:155px;')]);
    // U1 real consistency lever — the Name INPUT carries a hard min-width floor so auto-layout can't
    // squeeze it per-room (taxable has 3 extra cols); identical Name box width in EVERY investment room.
    checks.push([rm + ': U1 Name input min-width floor (universal)', has(h, 'class="holding-input" style="min-width:200px;"')]);
    // U2 — 'Shares Owned' visible header + matched tooltip title + width 95; bare 'Shares' header gone
    checks.push([rm + ': U2 header reads "Shares Owned"', has(h, '>Shares Owned<div class="modal-tt"')]);
    checks.push([rm + ': U2 tooltip title matched', has(h, '<strong>Shares Owned</strong>')]);
    checks.push([rm + ': U2 Shares Owned width 95px', rx(h, /width:95px;[\s\S]{0,600}?>Shares Owned<div class="modal-tt"/)]);
    checks.push([rm + ': U2 bare "Shares" header GONE', !has(h, '>Shares<div class="modal-tt"')]);
    // U3 — 'Position Value' visible header + matched tooltip title + width 110; bare 'Value' header gone
    checks.push([rm + ': U3 header reads "Position Value"', has(h, '>Position Value<div class="modal-tt"')]);
    checks.push([rm + ': U3 tooltip title matched', has(h, '<strong>Position Value</strong>')]);
    checks.push([rm + ': U3 Position Value width 110px', rx(h, /width:110px;[\s\S]{0,600}?>Position Value<div class="modal-tt"/)]);
    checks.push([rm + ': U3 bare "Value" header GONE', !has(h, '>Value<div class="modal-tt"')]);
    // LOCK-3 regression — the field the td writes is untouched (Ticker header + Name input still present)
    checks.push([rm + ': Ticker header still present (regression)', has(h, '>Ticker<div class="modal-tt"')]);
  }

  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400) : String(s));
  const hdr = (s) => (typeof s === 'string' ? (s.match(/<table class="holdings-table"><tr>[\s\S]*?<\/tr>/) || [''])[0].slice(0, 1600) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\n=== TAXABLE header row ===\n' + hdr(R.taxable) +
    '\n\n=== ROTH401K header row ===\n' + hdr(R.roth401k) + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_stepA_headers.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
