/* STEP-C ticker-bundle seed gate (Ticker Bundle Seed → _ticker-curated.js → ticker-bundle.js).
   Asserts the REBUILT bundle (the shipped artifact studio.html fetchMockData keys on, bundle[ticker]):
     (1) net-new Daniel funds resolve full mapped fields (FLCNX/PRSCX/VINIX) — RED at HEAD (absent);
     (2) seed→canonical map applied (Large Growth→SILENT, Large Blend→Broad Market/Blend, Technology→Technology);
     (3) D2 expRatio-wall relax: curated expRatio surfaces with expRatioSrc:'curated'; ×100 units;
     (4) D3: no fake yield/beta — seed 0/blank stays BLANK (VINIX yield 0 omitted; L47 blank≠zero);
     (5) CIT plan-only key present with blank beta/yield/expRatio (L47);
     (6) BTC/USD: assetClass=Crypto carries it, instrument BLANK (no _V_IN crypto enum, override #4);
     (7) WF EXCLUDED (standing);
     (8) VTI canonical UNCHANGED — load-bearing D1 guard (never downgraded to seed 'Equity'/'US Total Market');
     (9) units-sanity tripwire: expRatio<5, yield<15 (catches a missed ×100).
   RED-FIRST: net-new tickers are absent at HEAD, so (1)(2)(3)(4)(6) FAIL; VTI/WF guards pass both ways.
   Usage: node scripts/_gate_stepC_bundle.js [LABEL] (from repo root). Writes a UTF-8 dump. */
const path = require('path');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const BP = path.resolve('scripts/ticker-bundle.js');
delete require.cache[BP];
const B = require(BP);

const e = (k) => B[k] || null;
const absent = (o, f) => !o || o[f] === undefined || o[f] === null || o[f] === '';
const num = (x) => typeof x === 'number' && isFinite(x);

const flcnx = e('FLCNX'), prscx = e('PRSCX'), vinix = e('VINIX'), btc = e('BTC/USD'),
      cit = e('CIT:T-ROWE-PRICE-EQUITY-INCOME-TRUST-B'), vti = e('VTI'), wf = e('WF');

const checks = [
  // (1) net-new resolves + (2) map + (3) expRatio wall/units
  ['FLCNX resolves (net-new)', !!flcnx],
  ['FLCNX name', flcnx && flcnx.name === 'Fidelity Contrafund K6'],
  ['FLCNX instrument Mutual Fund (CIT/MF map)', flcnx && flcnx.instrumentType === 'Mutual Fund'],
  ['FLCNX assetClass US Equity (Equity+US-geo)', flcnx && flcnx.assetClass === 'US Equity'],
  ['FLCNX geography US (US Stocks→US)', flcnx && flcnx.geography === 'US'],
  ['FLCNX expRatio 0.45 (0.0045×100, D2)', flcnx && flcnx.expRatio === 0.45],
  ['FLCNX expRatioSrc curated (D2)', flcnx && flcnx.expRatioSrc === 'curated'],
  ['FLCNX sector SILENT (Large Growth→blank)', absent(flcnx, 'sector')],
  ['FLCNX no fake beta/yield (seed blank)', absent(flcnx, 'beta') && absent(flcnx, 'dividendYield')],
  ['PRSCX sector Technology (mapped)', prscx && prscx.sector === 'Technology'],
  ['PRSCX expRatio 0.67', prscx && prscx.expRatio === 0.67],
  ['VINIX assetClass US Equity', vinix && vinix.assetClass === 'US Equity'],
  ['VINIX sector Broad Market/Blend (Large Blend→)', vinix && vinix.sector === 'Broad Market/Blend'],
  ['VINIX expRatio 0.035', vinix && vinix.expRatio === 0.035],
  ['VINIX yield BLANK (seed 0→blank, L47)', absent(vinix, 'dividendYield')],
  // (6) crypto
  ['BTC/USD resolves (net-new)', !!btc],
  ['BTC/USD assetClass Crypto', btc && btc.assetClass === 'Crypto'],
  ['BTC/USD sector Crypto', btc && btc.sector === 'Crypto'],
  ['BTC/USD geography Global', btc && btc.geography === 'Global'],
  ['BTC/USD instrument BLANK (#4 override)', absent(btc, 'instrumentType')],
  ['BTC/USD no fake yield (seed 0→blank)', absent(btc, 'dividendYield')],
  // (5) CIT plan-only
  ['CIT key present', !!cit],
  ['CIT instrument Mutual Fund', cit && cit.instrumentType === 'Mutual Fund'],
  ['CIT assetClass US Equity', cit && cit.assetClass === 'US Equity'],
  ['CIT blank beta/yield/expRatio (L47 plan-only)', absent(cit, 'beta') && absent(cit, 'dividendYield') && absent(cit, 'expRatio')],
  // (7) WF: the SEED's WF (Direct-Indexing) is EXCLUDED — the real bulk stock WF (Woori Financial) is
  //     untouched. Guard catches accidental seeding of the Direct-Indexing row over the real ticker.
  ['WF unchanged = bulk Woori (seed WF excluded)', wf && wf.name === 'WOORI FINANCIAL GROUP INC.'],
  // (8) VTI canonical unchanged — LOAD-BEARING D1 guard
  ['VTI assetClass US Equity (unchanged)', vti && vti.assetClass === 'US Equity'],
  ['VTI sector Blend (NOT downgraded to US Total Market)', vti && vti.sector === 'Blend'],
  ['VTI geography US (unchanged)', vti && vti.geography === 'US'],
];

// (9) units-sanity tripwire across seeded entries
['FLCNX', 'PRSCX', 'VINIX', 'XLI', 'VTI'].forEach((k) => {
  const o = e(k);
  checks.push([k + ' expRatio<5 (×100 tripwire)', !o || o.expRatio === undefined || (num(o.expRatio) && o.expRatio < 5)]);
  checks.push([k + ' yield<15 (×100 tripwire)', !o || o.dividendYield === undefined || (num(o.dividendYield) && o.dividendYield < 15)]);
});

let pass = 0;
const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
const summary = `[${LABEL}] ${pass}/${checks.length} GREEN | bundle keys: ${Object.keys(B).length}\n` + lines.join('\n') +
  '\n\n=== FLCNX ===\n' + JSON.stringify(flcnx) +
  '\n=== VINIX ===\n' + JSON.stringify(vinix) +
  '\n=== BTC/USD ===\n' + JSON.stringify(btc) +
  '\n=== CIT ===\n' + JSON.stringify(cit) +
  '\n=== VTI ===\n' + JSON.stringify(vti) + '\n';
fs.writeFileSync('scripts/_gate_stepC_bundle.out.txt', summary, 'utf8');
process.exit(pass === checks.length ? 0 : 1);
