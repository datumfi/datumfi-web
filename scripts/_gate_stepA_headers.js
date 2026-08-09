/* STEP-A universal ticker-bar header gate (Investment Modal Parity Spec, U1/U2/U3 · #212 rows 67–73).
   The COLS array (studio.html ~6690) is shared by every isInvestment room, so this asserts the three
   display-only header changes render in the SERVED bytes of TWO different investment rooms (Taxable
   "Living Room" + Roth 401(k) "The Treasury"), proving the change is universal:
     U1 Name column width 155 -> 220px
     U2 header 'Shares' -> 'Shares Owned' (width 75 -> 95 -> 110), tooltip title matched
     U3 header 'Value'  -> 'Position Value' (width 90 -> 110), tooltip title matched

   ⚠️ WIDTH 95 WAS SUPERSEDED, AND THIS GATE STAYED RED FOR THREE SESSIONS BECAUSE OF IT (fixed
   2026-08-09). `747e288` J0.2 deliberately widened Shares Owned 95 -> 110, documented in its own
   message and covered by its own red-first gate (_gate_ticker_ui). This gate was never updated, so
   it asserted a width the product had lawfully moved past. THE CODE WAS RIGHT AND THE CLAIM WAS
   STALE — a permanently-red alarm is how a real one gets ignored. A width here is a MIRROR of
   studio.html's COLS array, never an independent opinion; when COLS moves, this moves with it.

   ⚠️ AND THE RED WAS HIDING A FALSE GREEN. Each width leg used `width:Npx;[\s\S]{0,600}?>LBL<`,
   which does not require the matched width to belong to LBL's OWN <th> — only to be SOME width
   within 600 characters before it. Shares Owned and Position Value are BOTH 110 and adjacent, so
   U3 was satisfied by Shares Owned's width. Measured by amputation 2026-08-09: mutating ONLY
   Position Value's own width to 999px left the U3 leg PASSING. Every width leg is now anchored to
   its own <th> via `width:Npx;"><div class="modal-tt-wrap"[^>]*>LBL<` — `[^>]*` cannot cross a `>`,
   so the match physically cannot straddle a cell boundary. ASK WHAT WOULD PASS WITHOUT THE CLAIM
   BEING TRUE.
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

  // header-cell fragments as rendered at studio.html:8375 — the th is emitted as one unbroken string:
  //   <th style="width:Npx;"><div class="modal-tt-wrap" style="..." onmouseenter="_ttDrop(this)">LBL<div class="modal-tt">
  // OWN-CELL width anchor: `[^>]*` cannot cross the `>` that closes the wrap div, so a width can only
  // ever satisfy the label sitting in its OWN <th>. This is the fix for the false green described above.
  const wOf = (w, lbl) => new RegExp('width:' + w + 'px;"><div class="modal-tt-wrap"[^>]*>' + lbl + '<div class="modal-tt"');
  const rooms = { taxable: R.taxable, roth401k: R.roth401k };
  const checks = [];
  for (const [rm, h] of Object.entries(rooms)) {
    const okRoom = typeof h === 'string' && h.length > 0 && !has(h, '__');
    checks.push([rm + ': modal renders (no crash)', okRoom]);
    // U1 — Name column now width 220 (tie the width to the Name header cell so it can't pass on a stray 220)
    checks.push([rm + ': U1 Name header width 220px', rx(h, wOf(220, 'Name'))]);
    checks.push([rm + ': U1 old Name width 155px GONE', !has(h, 'width:155px;')]);
    // U1 real consistency lever — the Name INPUT carries a hard min-width floor so auto-layout can't
    // squeeze it per-room (taxable has 3 extra cols); identical Name box width in EVERY investment room.
    checks.push([rm + ': U1 Name input min-width floor (universal)', has(h, 'class="holding-input" style="min-width:200px;"')]);
    // U2 — 'Shares Owned' visible header + matched tooltip title + width 95; bare 'Shares' header gone
    checks.push([rm + ': U2 header reads "Shares Owned"', has(h, '>Shares Owned<div class="modal-tt"')]);
    checks.push([rm + ': U2 tooltip title matched', has(h, '<strong>Shares Owned</strong>')]);
    checks.push([rm + ': U2 Shares Owned width 110px', rx(h, wOf(110, 'Shares Owned'))]);
    checks.push([rm + ': U2 bare "Shares" header GONE', !has(h, '>Shares<div class="modal-tt"')]);
    // U3 — 'Position Value' visible header + matched tooltip title + width 110; bare 'Value' header gone
    checks.push([rm + ': U3 header reads "Position Value"', has(h, '>Position Value<div class="modal-tt"')]);
    checks.push([rm + ': U3 tooltip title matched', has(h, '<strong>Position Value</strong>')]);
    checks.push([rm + ': U3 Position Value width 110px', rx(h, wOf(110, 'Position Value'))]);
    checks.push([rm + ': U3 bare "Value" header GONE', !has(h, '>Value<div class="modal-tt"')]);
    // LOCK-3 regression — the field the td writes is untouched (Ticker header + Name input still present)
    checks.push([rm + ': Ticker header still present (regression)', has(h, '>Ticker<div class="modal-tt"')]);
  }

  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400) : String(s));
  // ⚠️ THE DUMP WAS EMPTY FOR THREE SESSIONS — which is precisely why nobody diagnosed the red.
  // This reads innerHTML, i.e. the browser's RE-SERIALIZATION of the DOM, not the string we built.
  // The HTML parser auto-inserts <tbody> between <table> and <tr>, so the literal `holdings-table"><tr>`
  // this anchored on NEVER EXISTS in a parsed document — measured 2026-08-09, actual bytes are
  // `holdings-table"><tbody><tr>`. It matched nothing and printed nothing, and an empty dump is
  // indistinguishable from a dump nobody read. <tbody> is now optional.
  // 🔑 A DIAGNOSTIC THAT SILENTLY RENDERS NOTHING COSTS MORE THAN NO DIAGNOSTIC — it makes a red
  //    look unexaminable. If this ever comes back empty, that is itself the finding.
  const hdr = (s) => {
    if (typeof s !== 'string') return String(s);
    const m = s.match(/<table class="holdings-table">(?:<tbody>)?<tr>[\s\S]*?<\/tr>/);
    return m ? m[0].slice(0, 1600) : '(!! HEADER ROW NOT MATCHED — the dump anchor is stale, fix it before reading the legs)';
  };
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\n=== TAXABLE header row ===\n' + hdr(R.taxable) +
    '\n\n=== ROTH401K header row ===\n' + hdr(R.roth401k) + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_stepA_headers.out.txt', summary, 'utf8');
  // A SILENT GATE IS INDISTINGUISHABLE FROM A GATE THAT DID NOT RUN. This gate writes a UTF-8 dump
// and deliberately printed nothing, to dodge Windows console unicode mangling. The intent was sound;
// the side effect was that diffing its stdout compares two EMPTY strings and reports agreement --
// which is exactly how a triage read 'identical' from two runs that had produced nothing (2026-08-03).
// One ASCII-only line: the verdict, the counts, and where the real dump lives.
console.log('[_gate_stepA_headers] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
  '  -- full dump: scripts/.gate-out/_gate_stepA_headers.out.txt');
process.exit(pass === checks.length ? 0 : 1);
})();
