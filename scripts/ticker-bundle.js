/* DatumFI · TICKER BUNDLE — the self-owned curated reference universe for holdings auto-fill.
   Hybrid doctrine: we build and grow THIS list ourselves; the CF-Worker live-price proxy is a
   separate, maybe-much-later job and is NOT a dependency. Auto-fills the STABLE, slow-moving fields
   on a ticker match (name / sector / assetClass / geography / instrumentType / expRatio / beta /
   dividendYield). PRICE here is a last-known REFERENCE placeholder, user-editable (priceSource stays
   'manual'); betas/yields are reference snapshots, also user-editable — the math reads whatever the
   user confirms. This file is meant to GROW toward the full common universe (large-caps + ETFs +
   index/target funds) by continued curation / bulk import into this same object. Keep keys UPPERCASE.

   expRatio / dividendYield / beta are plain numbers (percent for the two ratios, unitless beta). */
(function (root) {
  'use strict';
  var T = {
    // ── Broad-market / blend ETFs ───────────────────────────────────────────────
    VTI:  {name:'Vanguard Total Stock Market ETF', price:250.10, sector:'Blend', expRatio:0.03, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.01, dividendYield:1.30},
    VOO:  {name:'Vanguard S&P 500 ETF', price:470.10, sector:'Blend', expRatio:0.03, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.00, dividendYield:1.30},
    SPY:  {name:'SPDR S&P 500 ETF', price:510.40, sector:'Blend', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.00, dividendYield:1.27},
    IVV:  {name:'iShares Core S&P 500 ETF', price:512.20, sector:'Blend', expRatio:0.03, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.00, dividendYield:1.30},
    SPLG: {name:'SPDR Portfolio S&P 500 ETF', price:60.10, sector:'Blend', expRatio:0.02, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.00, dividendYield:1.30},
    QQQ:  {name:'Invesco QQQ Trust', price:440.10, sector:'Technology', expRatio:0.20, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.16, dividendYield:0.58},
    QQQM: {name:'Invesco NASDAQ 100 ETF', price:182.10, sector:'Technology', expRatio:0.15, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.16, dividendYield:0.62},
    DIA:  {name:'SPDR Dow Jones Industrial Avg ETF', price:390.40, sector:'Blend', expRatio:0.16, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.96, dividendYield:1.65},
    IWM:  {name:'iShares Russell 2000 ETF', price:205.30, sector:'Blend', expRatio:0.19, assetClass:'US Small Cap', geography:'US', instrumentType:'ETF', beta:1.18, dividendYield:1.25},
    IJR:  {name:'iShares Core S&P Small-Cap ETF', price:110.20, sector:'Blend', expRatio:0.06, assetClass:'US Small Cap', geography:'US', instrumentType:'ETF', beta:1.15, dividendYield:1.45},
    IJH:  {name:'iShares Core S&P Mid-Cap ETF', price:60.40, sector:'Blend', expRatio:0.05, assetClass:'US Mid Cap', geography:'US', instrumentType:'ETF', beta:1.10, dividendYield:1.40},
    VO:   {name:'Vanguard Mid-Cap ETF', price:265.10, sector:'Blend', expRatio:0.04, assetClass:'US Mid Cap', geography:'US', instrumentType:'ETF', beta:1.08, dividendYield:1.35},
    VB:   {name:'Vanguard Small-Cap ETF', price:230.20, sector:'Blend', expRatio:0.05, assetClass:'US Small Cap', geography:'US', instrumentType:'ETF', beta:1.16, dividendYield:1.40},
    // ── Style / factor ──────────────────────────────────────────────────────────
    VUG:  {name:'Vanguard Growth ETF', price:360.20, sector:'Growth', expRatio:0.04, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.10, dividendYield:0.55},
    VTV:  {name:'Vanguard Value ETF', price:160.40, sector:'Value', expRatio:0.04, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.86, dividendYield:2.30},
    SCHG: {name:'Schwab US Large-Cap Growth ETF', price:95.10, sector:'Growth', expRatio:0.04, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.12, dividendYield:0.45},
    SCHD: {name:'Schwab US Dividend Equity ETF', price:27.80, sector:'Dividend', expRatio:0.06, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.82, dividendYield:3.45},
    VYM:  {name:'Vanguard High Dividend Yield ETF', price:120.10, sector:'Dividend', expRatio:0.06, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.83, dividendYield:2.85},
    VIG:  {name:'Vanguard Dividend Appreciation ETF', price:185.20, sector:'Dividend', expRatio:0.06, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.88, dividendYield:1.75},
    DGRO: {name:'iShares Core Dividend Growth ETF', price:58.10, sector:'Dividend', expRatio:0.08, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.85, dividendYield:2.20},
    MTUM: {name:'iShares MSCI USA Momentum Factor ETF', price:200.10, sector:'Momentum', expRatio:0.15, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.05, dividendYield:1.10},
    ARKK: {name:'ARK Innovation ETF', price:50.10, sector:'Technology', expRatio:0.75, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.55, dividendYield:0.00},
    // ── Sector SPDRs ────────────────────────────────────────────────────────────
    XLK:  {name:'Technology Select Sector SPDR', price:215.10, sector:'Technology', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.18, dividendYield:0.65},
    XLF:  {name:'Financial Select Sector SPDR', price:42.10, sector:'Financials', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.10, dividendYield:1.55},
    XLE:  {name:'Energy Select Sector SPDR', price:90.10, sector:'Energy', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.95, dividendYield:3.30},
    XLV:  {name:'Health Care Select Sector SPDR', price:148.10, sector:'Healthcare', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.70, dividendYield:1.55},
    XLY:  {name:'Consumer Discretionary Select SPDR', price:190.10, sector:'Consumer Cyclical', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.20, dividendYield:0.80},
    XLP:  {name:'Consumer Staples Select Sector SPDR', price:78.10, sector:'Consumer Defensive', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.55, dividendYield:2.55},
    XLI:  {name:'Industrial Select Sector SPDR', price:125.10, sector:'Industrials', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.05, dividendYield:1.45},
    XLU:  {name:'Utilities Select Sector SPDR', price:70.10, sector:'Utilities', expRatio:0.09, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:0.50, dividendYield:3.10},
    SMH:  {name:'VanEck Semiconductor ETF', price:240.10, sector:'Technology', expRatio:0.35, assetClass:'US Equity', geography:'US', instrumentType:'ETF', beta:1.45, dividendYield:0.50},
    // ── International / EM ──────────────────────────────────────────────────────
    VEA:  {name:'Vanguard Developed Markets ETF', price:50.25, sector:'Blend', expRatio:0.05, assetClass:'International Equity', geography:'International', instrumentType:'ETF', beta:0.84, dividendYield:3.10},
    VWO:  {name:'Vanguard Emerging Markets ETF', price:44.10, sector:'Blend', expRatio:0.08, assetClass:'Emerging Equity', geography:'Emerging', instrumentType:'ETF', beta:0.90, dividendYield:3.05},
    VXUS: {name:'Vanguard Total International Stock ETF', price:62.30, sector:'Blend', expRatio:0.08, assetClass:'International Equity', geography:'International', instrumentType:'ETF', beta:0.85, dividendYield:3.00},
    IXUS: {name:'iShares Core MSCI Total Intl Stock ETF', price:70.10, sector:'Blend', expRatio:0.07, assetClass:'International Equity', geography:'International', instrumentType:'ETF', beta:0.85, dividendYield:3.00},
    EFA:  {name:'iShares MSCI EAFE ETF', price:80.10, sector:'Blend', expRatio:0.32, assetClass:'International Equity', geography:'International', instrumentType:'ETF', beta:0.83, dividendYield:2.90},
    IEMG: {name:'iShares Core MSCI Emerging Markets ETF', price:53.10, sector:'Blend', expRatio:0.09, assetClass:'Emerging Equity', geography:'Emerging', instrumentType:'ETF', beta:0.90, dividendYield:2.80},
    VGK:  {name:'Vanguard FTSE Europe ETF', price:68.10, sector:'Blend', expRatio:0.09, assetClass:'International Equity', geography:'International', instrumentType:'ETF', beta:0.88, dividendYield:3.20},
    // ── Bonds / cash ────────────────────────────────────────────────────────────
    BND:  {name:'Vanguard Total Bond Market ETF', price:72.40, sector:'Fixed Income', expRatio:0.03, assetClass:'US Bonds', geography:'US', instrumentType:'ETF', beta:0.05, dividendYield:3.40},
    AGG:  {name:'iShares Core US Aggregate Bond ETF', price:98.20, sector:'Fixed Income', expRatio:0.03, assetClass:'US Bonds', geography:'US', instrumentType:'ETF', beta:0.05, dividendYield:3.45},
    BNDX: {name:'Vanguard Total International Bond ETF', price:49.10, sector:'Fixed Income', expRatio:0.07, assetClass:'Intl Bonds', geography:'International', instrumentType:'ETF', beta:0.04, dividendYield:3.10},
    TLT:  {name:'iShares 20+ Year Treasury Bond ETF', price:92.10, sector:'Fixed Income', expRatio:0.15, assetClass:'US Treasuries', geography:'US', instrumentType:'ETF', beta:0.10, dividendYield:3.95},
    IEF:  {name:'iShares 7-10 Year Treasury Bond ETF', price:95.10, sector:'Fixed Income', expRatio:0.15, assetClass:'US Treasuries', geography:'US', instrumentType:'ETF', beta:0.07, dividendYield:3.55},
    SHY:  {name:'iShares 1-3 Year Treasury Bond ETF', price:82.10, sector:'Fixed Income', expRatio:0.15, assetClass:'US Treasuries', geography:'US', instrumentType:'ETF', beta:0.02, dividendYield:4.40},
    SGOV: {name:'iShares 0-3 Month Treasury Bond ETF', price:100.40, sector:'Cash', expRatio:0.09, assetClass:'US Treasuries', geography:'US', instrumentType:'ETF', beta:0.01, dividendYield:5.10},
    BIL:  {name:'SPDR Bloomberg 1-3 Month T-Bill ETF', price:91.50, sector:'Cash', expRatio:0.14, assetClass:'US Treasuries', geography:'US', instrumentType:'ETF', beta:0.01, dividendYield:5.05},
    MUB:  {name:'iShares National Muni Bond ETF', price:107.10, sector:'Fixed Income', expRatio:0.05, assetClass:'Municipal Bonds', geography:'US', instrumentType:'ETF', beta:0.06, dividendYield:3.05},
    LQD:  {name:'iShares iBoxx Inv Grade Corp Bond ETF', price:108.10, sector:'Fixed Income', expRatio:0.14, assetClass:'Corporate Bonds', geography:'US', instrumentType:'ETF', beta:0.15, dividendYield:4.20},
    // ── Index / target-date mutual funds ────────────────────────────────────────
    VFIAX:{name:'Vanguard 500 Index Admiral', price:510.20, sector:'Blend', expRatio:0.04, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.00, dividendYield:1.30},
    VTSAX:{name:'Vanguard Total Stock Market Admiral', price:130.10, sector:'Blend', expRatio:0.04, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.01, dividendYield:1.30},
    VTIAX:{name:'Vanguard Total Intl Stock Index Admiral', price:35.10, sector:'Blend', expRatio:0.09, assetClass:'International Equity', geography:'International', instrumentType:'Mutual Fund', beta:0.85, dividendYield:3.00},
    VBTLX:{name:'Vanguard Total Bond Market Admiral', price:9.60, sector:'Fixed Income', expRatio:0.05, assetClass:'US Bonds', geography:'US', instrumentType:'Mutual Fund', beta:0.05, dividendYield:3.40},
    FXAIX:{name:'Fidelity 500 Index Fund', price:195.10, sector:'Blend', expRatio:0.015, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.00, dividendYield:1.30},
    FSKAX:{name:'Fidelity Total Market Index Fund', price:160.10, sector:'Blend', expRatio:0.015, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.01, dividendYield:1.25},
    FZROX:{name:'Fidelity ZERO Total Market Index', price:18.10, sector:'Blend', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.01, dividendYield:1.20},
    SWPPX:{name:'Schwab S&P 500 Index Fund', price:80.10, sector:'Blend', expRatio:0.02, assetClass:'US Equity', geography:'US', instrumentType:'Mutual Fund', beta:1.00, dividendYield:1.30},
    VTTSX:{name:'Vanguard Target Retirement 2060 Fund', price:42.10, sector:'Target Date', expRatio:0.08, assetClass:'Allocation', geography:'Global', instrumentType:'Mutual Fund', beta:0.95, dividendYield:1.80},
    VFFVX:{name:'Vanguard Target Retirement 2055 Fund', price:46.10, sector:'Target Date', expRatio:0.08, assetClass:'Allocation', geography:'Global', instrumentType:'Mutual Fund', beta:0.95, dividendYield:1.85},
    VTHRX:{name:'Vanguard Target Retirement 2030 Fund', price:38.10, sector:'Target Date', expRatio:0.08, assetClass:'Allocation', geography:'Global', instrumentType:'Mutual Fund', beta:0.65, dividendYield:2.40},
    // ── Mega/large-cap US stocks ────────────────────────────────────────────────
    AAPL: {name:'Apple Inc.', price:175.50, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.24, dividendYield:0.55},
    MSFT: {name:'Microsoft Corp.', price:420.30, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.90, dividendYield:0.72},
    NVDA: {name:'NVIDIA Corp.', price:890.50, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.68, dividendYield:0.03},
    AMZN: {name:'Amazon.com, Inc.', price:178.30, sector:'Consumer Cyclical', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.15, dividendYield:0.00},
    GOOGL:{name:'Alphabet Inc. Class A', price:144.10, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.03, dividendYield:0.45},
    GOOG: {name:'Alphabet Inc. Class C', price:145.20, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.03, dividendYield:0.45},
    META: {name:'Meta Platforms, Inc.', price:485.20, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.21, dividendYield:0.40},
    TSLA: {name:'Tesla, Inc.', price:185.20, sector:'Consumer Cyclical', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:2.01, dividendYield:0.00},
    'BRK.B':{name:'Berkshire Hathaway Class B', price:410.30, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.87, dividendYield:0.00},
    AVGO: {name:'Broadcom Inc.', price:1320.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.18, dividendYield:1.55},
    JPM:  {name:'JPMorgan Chase & Co.', price:198.40, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.10, dividendYield:2.30},
    V:    {name:'Visa Inc.', price:275.30, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.96, dividendYield:0.75},
    MA:   {name:'Mastercard Inc.', price:455.10, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.06, dividendYield:0.55},
    JNJ:  {name:'Johnson & Johnson', price:152.10, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.55, dividendYield:3.20},
    UNH:  {name:'UnitedHealth Group', price:490.20, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.62, dividendYield:1.55},
    LLY:  {name:'Eli Lilly and Co.', price:760.10, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.45, dividendYield:0.65},
    ABBV: {name:'AbbVie Inc.', price:165.10, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.58, dividendYield:3.55},
    MRK:  {name:'Merck & Co.', price:125.10, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.40, dividendYield:2.45},
    PFE:  {name:'Pfizer Inc.', price:28.10, sector:'Healthcare', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.62, dividendYield:5.95},
    XOM:  {name:'Exxon Mobil Corp.', price:113.10, sector:'Energy', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.92, dividendYield:3.35},
    CVX:  {name:'Chevron Corp.', price:155.10, sector:'Energy', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.95, dividendYield:4.15},
    PG:   {name:'Procter & Gamble Co.', price:165.20, sector:'Consumer Defensive', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.42, dividendYield:2.40},
    KO:   {name:'Coca-Cola Co.', price:62.10, sector:'Consumer Defensive', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.58, dividendYield:3.10},
    PEP:  {name:'PepsiCo, Inc.', price:172.10, sector:'Consumer Defensive', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.55, dividendYield:3.05},
    COST: {name:'Costco Wholesale Corp.', price:730.10, sector:'Consumer Defensive', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.78, dividendYield:0.55},
    WMT:  {name:'Walmart Inc.', price:60.10, sector:'Consumer Defensive', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.50, dividendYield:1.35},
    HD:   {name:'Home Depot, Inc.', price:340.10, sector:'Consumer Cyclical', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.02, dividendYield:2.50},
    MCD:  {name:"McDonald's Corp.", price:280.10, sector:'Consumer Cyclical', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.68, dividendYield:2.35},
    DIS:  {name:'Walt Disney Co.', price:105.10, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.35, dividendYield:0.85},
    NFLX: {name:'Netflix, Inc.', price:610.10, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.28, dividendYield:0.00},
    CRM:  {name:'Salesforce, Inc.', price:300.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.30, dividendYield:0.50},
    ADBE: {name:'Adobe Inc.', price:520.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.32, dividendYield:0.00},
    AMD:  {name:'Advanced Micro Devices', price:160.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.70, dividendYield:0.00},
    INTC: {name:'Intel Corp.', price:32.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.05, dividendYield:1.55},
    CSCO: {name:'Cisco Systems, Inc.', price:48.10, sector:'Technology', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.85, dividendYield:3.30},
    BAC:  {name:'Bank of America Corp.', price:38.10, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.30, dividendYield:2.45},
    WFC:  {name:'Wells Fargo & Co.', price:58.10, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.15, dividendYield:2.40},
    T:    {name:'AT&T Inc.', price:17.10, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.70, dividendYield:6.50},
    VZ:   {name:'Verizon Communications', price:40.10, sector:'Communication Services', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:0.42, dividendYield:6.65},
    BHF:  {name:'Brighthouse Financial', price:48.75, sector:'Financials', expRatio:0.00, assetClass:'US Equity', geography:'US', instrumentType:'Stock', beta:1.30, dividendYield:0.00},
    // ── Crypto ──────────────────────────────────────────────────────────────────
    BTC:  {name:'Bitcoin', price:68500.00, sector:'Digital Asset', expRatio:0.00, assetClass:'Cryptocurrency', geography:'Global', instrumentType:'Crypto', beta:2.50, dividendYield:0.00},
    ETH:  {name:'Ethereum', price:3500.00, sector:'Digital Asset', expRatio:0.00, assetClass:'Cryptocurrency', geography:'Global', instrumentType:'Crypto', beta:2.80, dividendYield:0.00},
    IBIT: {name:'iShares Bitcoin Trust', price:39.20, sector:'Digital Asset', expRatio:0.25, assetClass:'Cryptocurrency', geography:'Global', instrumentType:'ETF', beta:2.50, dividendYield:0.00},
    FBTC: {name:'Fidelity Wise Origin Bitcoin Fund', price:60.10, sector:'Digital Asset', expRatio:0.25, assetClass:'Cryptocurrency', geography:'Global', instrumentType:'ETF', beta:2.50, dividendYield:0.00}
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  if (root) root.TICKER_BUNDLE = T;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
