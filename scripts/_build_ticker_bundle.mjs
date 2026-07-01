/* DEV-ONLY one-shot importer/emitter (scripts/_ -> gitignored from dist; NEVER ships, NEVER runs in-app/build).
   Builds the LEAN static ticker universe (named US Stock+ETF + curated MFs/crypto) and MERGES fundamentals
   by PER-FIELD PRECEDENCE (first non-null wins):
       curated core  ->  official/issuer (SEC SIC sector, SEC domicile geography, SSGA/SPDR expense+assetClass)
                      ->  Yahoo (STOCK beta + STOCK dividend-yield ONLY)  ->  BLANK.
   Guards: write-only-if-pulled else BLANK (Lesson 47, no fabrication); fund expense/assetClass/yield are
   issuer/curated ONLY, NEVER Yahoo-backfilled; Tier-2 (Yahoo) values carry {field}Src/{field}AsOf (+ betaMethod);
   Tier-1 values carry {field}Src, dated by the bundle BUILT stamp. Live PRICE stays manual (CF-Worker parked).

   Caches (all scripts/_ticker-src, gitignored, no key, on-machine):
     nasdaqlisted.txt + otherlisted.txt (Nasdaq Trader)  -> symbol universe + ETF flag
     company_tickers.json / _mf.json (SEC)               -> clean names + MF set + ticker->CIK
     sec-sub/<CIK>.json (built by _sec_cache.mjs)         -> SIC sector + domicile geography
     spdr.xlsx (SSGA)  -> expense + asset-class (via _spdr_parse.mjs)
     yahoo.json (built by _yahoo_cache.mjs)               -> stock beta + stock yield

   Regen (monthly, on-machine, no key):  node scripts/_build_ticker_bundle.mjs --refresh
     --refresh re-pulls SEC per-CIK + Yahoo + SPDR (spawns the cache builders) then emits.
   Emit:  add --emit to overwrite scripts/ticker-bundle.js (else writes a candidate to scratchpad for review). */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sicToSector } from './_sic_sector.mjs';
import { parseSpdr } from './_spdr_parse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const UA = 'DatumFI-research/1.0 (admin@datumfi.com)';
const CACHE = join(__dirname, '_ticker-src');
const EMIT = process.argv.includes('--emit');
const REFRESH = process.argv.includes('--refresh');
const BUILT = new Date().toISOString().slice(0, 10);
const SCRATCH = 'C:/Users/tmnte/AppData/Local/Temp/claude/C--Users-tmnte-datumfi-web/480d12c8-7995-47f1-a683-6716b79c8a9c/scratchpad/ticker-bundle.candidate.js';
const OUT = EMIT ? join(__dirname, 'ticker-bundle.js') : SCRATCH;

const SOURCES = {
  nasdaqlisted: 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
  otherlisted: 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',
  secTickers: 'https://www.sec.gov/files/company_tickers.json',
  secMf: 'https://www.sec.gov/files/company_tickers_mf.json',
  spdr: 'https://www.ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/spdr-product-data-us-en.xlsx'
};

async function fetchCached(name, url, force) {
  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
  const fp = join(CACHE, name);
  if (existsSync(fp) && !force) return readFileSync(fp, 'utf8');
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const txt = await res.text();
  writeFileSync(fp, txt);
  return txt;
}

const SUFFIX = / - (Common Stock|Class [A-Z] Common Stock|Ordinary Shares.*|American Depositary Shares.*|Common Shares.*|Warrants?.*|Units?.*|Rights.*|Depositary Shares.*|Preferred Stock.*)$/i;
const cleanName = (n) => (n || '').replace(SUFFIX, '').replace(/\s+/g, ' ').trim();

function parsePsv(txt, symCol, nameCol, etfCol, testCol) {
  const out = [];
  const lines = txt.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln || ln.startsWith('File Creation Time')) continue;
    const c = ln.split('|');
    const sym = (c[symCol] || '').trim();
    if (!sym) continue;
    if (testCol != null && (c[testCol] || '').trim() === 'Y') continue;
    out.push({ sym, name: cleanName(c[nameCol]), etf: (c[etfCol] || '').trim() === 'Y' });
  }
  return out;
}

// US state / territory codes -> domestic; else foreign domicile
const US_STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR VI GU AS MP'.split(' '));
const geoFrom = (st) => !st ? '' : (US_STATES.has(st) || st === 'US' ? 'US' : 'International');

const run = async () => {
  if (REFRESH) {
    console.log('--refresh: re-pulling sources (SEC per-CIK, Yahoo, SPDR)...');
    await fetchCached('nasdaqlisted.txt', SOURCES.nasdaqlisted, true);
    await fetchCached('otherlisted.txt', SOURCES.otherlisted, true);
    await fetchCached('company_tickers.json', SOURCES.secTickers, true);
    await fetchCached('company_tickers_mf.json', SOURCES.secMf, true);
    const node = process.execPath;
    spawnSync(node, [join(__dirname, '_sec_cache.mjs')], { stdio: 'inherit' });
    spawnSync(node, [join(__dirname, '_yahoo_cache.mjs')], { stdio: 'inherit' });
    // SPDR xlsx (binary) — fetch fresh
    const r = await fetch(SOURCES.spdr, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) writeFileSync(join(CACHE, 'spdr.xlsx'), Buffer.from(await r.arrayBuffer()));
  }

  const [nl, ol, sec, mf] = await Promise.all([
    fetchCached('nasdaqlisted.txt', SOURCES.nasdaqlisted),
    fetchCached('otherlisted.txt', SOURCES.otherlisted),
    fetchCached('company_tickers.json', SOURCES.secTickers),
    fetchCached('company_tickers_mf.json', SOURCES.secMf)
  ]);

  const secObj = JSON.parse(sec);
  const secNames = {};
  for (const k in secObj) { const r = secObj[k]; if (r && r.ticker) secNames[String(r.ticker).toUpperCase()] = cleanName(r.title); }

  const mfObj = JSON.parse(mf);
  const mfSet = new Set();
  const symIdx = (mfObj.fields || []).indexOf('symbol');
  (mfObj.data || []).forEach((row) => { const s = row[symIdx >= 0 ? symIdx : 3]; if (s) mfSet.add(String(s).toUpperCase()); });

  // bulk categorical (name + instrumentType)
  const bulk = {};
  const listed = parsePsv(nl, 0, 1, 6, 3).concat(parsePsv(ol, 0, 1, 4, 6));
  for (const r of listed) {
    const sym = r.sym.toUpperCase();
    if (!bulk[sym]) bulk[sym] = { name: secNames[sym] || r.name || '', instrumentType: r.etf ? 'ETF' : 'Stock' };
  }
  mfSet.forEach((sym) => { if (!bulk[sym]) bulk[sym] = { name: secNames[sym] || '', instrumentType: 'Mutual Fund' }; });

  // TIER-1 SEC: CIK -> sector/geo, mapped onto that CIK's tickers[]
  const secFund = {};
  const subDir = join(CACHE, 'sec-sub');
  let secCiks = 0;
  if (existsSync(subDir)) {
    for (const fn of readdirSync(subDir)) {
      let o; try { o = JSON.parse(readFileSync(join(subDir, fn), 'utf8')); } catch { continue; }
      secCiks++;
      const sector = sicToSector(o.sic);
      const geo = geoFrom(o.stateOfIncorporation);
      for (const t of (o.tickers || [])) {
        const sym = String(t).toUpperCase();
        secFund[sym] = { sector, geography: geo };
      }
    }
  }

  // TIER-1 SSGA/SPDR: expense + asset-class
  const spdr = parseSpdr();
  // TIER-2 Yahoo: stock beta + stock yield (already stamped)
  const yahoo = existsSync(join(CACHE, 'yahoo.json')) ? JSON.parse(readFileSync(join(CACHE, 'yahoo.json'), 'utf8')) : {};

  const curated = require('./_ticker-curated.js');

  // union of symbols
  const syms = new Set([...Object.keys(bulk), ...Object.keys(curated)]);
  const final = {};
  const cov = { name: 0, sector: 0, geography: 0, expRatio: 0, assetClass: 0, beta: 0, divYield: 0 };
  const bySrc = { secSector: 0, spdrExp: 0, yahooBeta: 0, yahooYield: 0, curatedSector: 0 };

  for (const sym of syms) {
    const c = curated[sym] || {};
    const b = bulk[sym] || {};
    const sf = secFund[sym] || {};
    const sp = spdr[sym] || {};
    const y = yahoo[sym] || {};
    const isFund = (c.instrumentType || b.instrumentType) !== 'Stock'; // ETF/MF => fund

    const e = {};
    e.name = c.name || b.name || '';
    e.instrumentType = c.instrumentType || b.instrumentType || '';
    if (c.price != null) { e.price = c.price; e.priceSource = c.priceSource || 'manual'; }

    // sector: curated -> SEC SIC (stocks) -> blank
    if (c.sector) { e.sector = c.sector; bySrc.curatedSector++; }
    else if (sf.sector) { e.sector = sf.sector; e.sectorSrc = 'SEC SIC'; bySrc.secSector++; }

    // geography: curated -> SEC domicile -> blank
    if (c.geography) e.geography = c.geography;
    else if (sf.geography) { e.geography = sf.geography; e.geographySrc = 'SEC domicile'; }

    // expense: curated -> SPDR (issuer) -> blank   [NEVER Yahoo]
    if (c.expRatio != null) e.expRatio = c.expRatio;
    else if (sp.expRatio != null) { e.expRatio = sp.expRatio; e.expRatioSrc = 'SSGA/SPDR'; bySrc.spdrExp++; }

    // asset-class: curated -> SPDR (issuer) -> blank   [NEVER Yahoo]
    if (c.assetClass) e.assetClass = c.assetClass;
    else if (sp.assetClass) { e.assetClass = sp.assetClass; e.assetClassSrc = 'SSGA/SPDR'; }

    // beta: curated -> Yahoo (STOCKS ONLY) -> blank
    if (c.beta != null) e.beta = c.beta;
    else if (!isFund && y.beta != null) { e.beta = y.beta; e.betaSrc = y.betaSrc; e.betaAsOf = y.betaAsOf; e.betaMethod = y.betaMethod; bySrc.yahooBeta++; }

    // dividend yield: curated -> (STOCKS: Yahoo) -> blank.  Fund yield = curated ONLY (never Yahoo).
    if (c.divYield != null) e.divYield = c.divYield;
    else if (!isFund && y.divYield != null) { e.divYield = y.divYield; e.divYieldSrc = y.divYieldSrc; e.divYieldAsOf = y.divYieldAsOf; bySrc.yahooYield++; }

    final[sym] = e;
    if (e.name) cov.name++;
    for (const f of ['sector', 'geography', 'expRatio', 'assetClass', 'beta', 'divYield']) if (e[f] != null && e[f] !== '') cov[f]++;
  }

  // LEAN emit: named-only, sorted
  const keys = Object.keys(final).filter((k) => final[k].name).sort();
  const lines = keys.map((k) => `    ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}:${JSON.stringify(final[k])}`);
  const header = `/* DatumFI · TICKER BUNDLE (GENERATED ${BUILT} by scripts/_build_ticker_bundle.mjs — do NOT hand-edit;\n` +
    `   edit the curated core (_ticker-curated.js) + re-run --refresh). name/type: Nasdaq+SEC listings.\n` +
    `   sector: SEC SIC (stocks). geography: SEC domicile. expense/asset-class: SSGA/SPDR (issuer) + curated.\n` +
    `   beta + STOCK dividend-yield: Yahoo Finance REFERENCE (Tier-2, {field}Src/{field}AsOf stamped, asterisked in UI).\n` +
    `   Every value is provider-sourced or curated; unsourced = BLANK (Lesson 47). Fund yield = curated only. */\n`;
  const body = `(function (root) {\n  'use strict';\n  var T = {\n${lines.join(',\n')}\n  };\n` +
    `  if (typeof module !== 'undefined' && module.exports) module.exports = T;\n` +
    `  if (root) root.TICKER_BUNDLE = T;\n})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));\n`;
  writeFileSync(OUT, header + body);

  const sizeKB = Math.round(Buffer.byteLength(header + body) / 1024);
  console.log('OUT:', OUT, '\nBUILT', BUILT, '| SEC CIKs', secCiks, '| SPDR', Object.keys(spdr).length, '| Yahoo', Object.keys(yahoo).length);
  console.log('LEAN named entries:', keys.length, '|', sizeKB, 'KB');
  console.log('COVERAGE:', JSON.stringify(cov));
  console.log('BY SOURCE:', JSON.stringify(bySrc));
  ['AAPL', 'KO', 'IBM', 'VTI', 'XLC', 'GLDM', 'BND', 'LUNR'].forEach((s) => console.log('  spot', s, '->', JSON.stringify(final[s] || null)));
};
run().catch((e) => { console.error('IMPORTER ERROR:', e.message); process.exit(1); });
