# STEP C — Seed→Canonical Vocabulary Map (DRAFT for Architect sign-off)

**Rule (Captain D1 ruling):** the app's dropdown enums are the source of truth; the seed is a raw provenance
record. Map raw→canonical. **ADD net-new tickers / FILL blanks only — NEVER overwrite a canonical curated
value.** Any seed string that resolves to **no** canonical bucket goes **SILENT (blank, not guessed)** — the
DI engine already handles blank fields honestly (unmapped = no false tilt, L47). Nothing is written until this
map is signed off.

Canonical targets (studio.html `_V_*` dropdown arrays, 6685–6688):
- **Geography** `_V_GE` = US · International · Global
- **Asset Class** `_V_AC` = US Equity · International Equity · Bonds · Cash · Real Assets/Commodities · Crypto · Mixed/Allocation
- **Sector** `_V_SE` = Broad Market/Blend · Technology · Energy · Industrials & Defense · Biotech · Gold · Crypto · Dividend Growth · Utilities · Real Estate/REIT
- **Instrument** `_V_IN` = Stock · ETF · Mutual Fund · Annuity · CASH (sweep) · Bond · CD

---

## 1 · ASSET CLASS (5 distinct → canonical)

| Seed value | # | → Canonical | Note |
|---|---|---|---|
| Equity | 116 | **US Equity** *or* **International Equity** | ⚑ geography-conditional: US-geo → US Equity; Intl/Global-geo → International Equity; blank/unknown geo → US Equity (label only — engine drives foreign% off **geography**, not assetClass, so no DI distortion) |
| Bond | 23 | **Bonds** | clean |
| Blend | 16 | **Mixed/Allocation** | allocation / target-date / balanced funds; engine treats as classed-unattributed (same as canonical Mixed/Allocation) |
| Cash | 5 | **Cash** | clean |
| Crypto | 2 | **Crypto** | clean |

## 2 · GEOGRAPHY (14 distinct → canonical)

| Seed value | # | → Canonical |
|---|---|---|
| United States | 69 | **US** |
| US Stocks | 29 | **US** |
| Foreign | 10 | **International** |
| Global | 9 | **Global** |
| Global (All Country World) | 1 | **Global** |
| Emerging Markets | 2 | **International** |
| International | 2 | **International** |
| International (ex-US) | 2 | **International** |
| International (Developed ex-US) | 1 | **International** |
| International (Developed) | 1 | **International** |
| Allocation | 25 | **SILENT** — not a geography (target-date); leave blank (honest; excluded from foreign% denom either way) |
| Bonds | 5 | **SILENT** — column noise (a bond fund's domicile is unknown from "Bonds") |
| Cash | 4 | **SILENT** — column noise |
| Fixed Assets/Cash | 1 | **SILENT** — column noise |

## 3 · INSTRUMENT (8 distinct → canonical)

| Seed value | # | → Canonical | Note |
|---|---|---|---|
| ETF | 71 | **ETF** | clean |
| Mutual Fund | 53 | **Mutual Fund** | clean |
| Stock | 10 | **Stock** | clean |
| CASH | 4 | **CASH (sweep)** | clean (engine isCash=true) |
| Collective Investment Trust | 20 | **Mutual Fund** | ⚑ no CIT enum in `_V_IN`; a CIT is a pooled institutional fund → Mutual Fund is the functional fit (makes engine treat it as a fund, not a single stock). Confirm. |
| Money Market | 1 | **CASH (sweep)** | ⚑ cash-equivalent; assetClass=Cash already flags it. Confirm CASH vs Mutual Fund. |
| Stable Value | 1 | **CASH (sweep)** | ⚑ principal-preserving plan vehicle, cash-like. Confirm CASH vs Mutual Fund. |
| Currency Pair | 2 | **SILENT (keep raw?)** | ⚑ BTC/USD, ETH/USD — no crypto instrument in `_V_IN`; assetClass=Crypto carries classification. Keep raw "Currency Pair" or blank? Confirm. |

## 4 · SECTOR (96 distinct → 10 canonical themes; the rest SILENT)

Only values that clearly match a canonical **equity theme** map. All style-boxes (Large/Mid/Small
Value/Growth/Blend), bond maturities/types, target-dates, cash, allocation, intl-style, and insurance →
**SILENT** (blank sector) — `_V_SE` has no bucket for them and forcing one fabricates a tilt (L47).

**→ Broad Market/Blend:** Broad Market · US Total Market · Total Market Index Fund · Diversified Equity ·
Large Blend · Large Cap · US Large-Cap · Large-Cap Blend · Large Cap Index Fund  ⚑*(large/total blends only; mid/small blends → SILENT)*
**→ Technology:** Technology · Information Technology · AI Software · Semiconductors · Semiconductors / Technology ·
Robotics & AI · Service Robotics · Technology / Software—Application (Fintech)
**→ Energy:** Energy · Clean Energy
**→ Industrials & Defense:** Industrials · Space & Defense (Industrials) · Space Exploration (Industrials) ·
Aerospace & Space / Telecommunications
**→ Biotech:** Health Care / Biotech · Health  ⚑*(Health → Biotech is the only health bucket in `_V_SE`; confirm)*
**→ Gold:** Commodity / Gold · Gold / Precious Metals · Precious Metals
**→ Crypto:** Cryptocurrency · Cryptocurrency / Bitcoin · Digital Assets / Crypto
**→ Dividend Growth:** US Dividend Growth · US Dividend Equity · US Equity Income
**→ Utilities:** Utilities
**→ Real Estate/REIT:** Real Estate

**→ SILENT (blank sector — ~60 values, the majority):** all Bonds/TIPS/Treasury/Municipal/Corporate/Ultrashort
maturities · Cash / Money Market · Large Growth · Large Value · Mid Blend · Mid Value · Mid Growth · Mid-Cap Blend ·
Mid Cap Index Fund · Small Cap · Small Blend · Small Value · Small Growth · Small-Cap Blend · Small-Cap Growth ·
Large-Cap Momentum · all Target-Date * · Allocation 50-70% Equity · Emerging Markets · International Developed ·
Developed Markets · Diversified Emerging Markets · Foreign Large Blend · Foreign Large Growth · International ·
International Equity Index Fund · Total International · Life & Annuity Insurance.

---

## Judgment calls needing Architect eyes (the only non-mechanical items)

1. **Asset Class "Equity" US-vs-International split** — geography-conditional; default US on blank geo (label only; foreign% unaffected).
2. **CIT → Mutual Fund** (no CIT enum; functional fund fit — 20 rows, all Daniel's plan).
3. **Money Market / Stable Value → CASH (sweep)** vs Mutual Fund (2 rows).
4. **Currency Pair (BTC/USD, ETH/USD) → keep raw or blank** (no crypto instrument enum; 2 rows).
5. **Sector "Health" → Biotech** (only health bucket available).
6. **Sector large/total blends → Broad Market/Blend**, mid/small blends → SILENT (boundary of "broad").

Everything else is mechanical. **On sign-off**, this map becomes a small deterministic normalize function
applied at seed-merge time; then the curated-core seed + D2/D3 builder relaxes + the red-first gate.
No canonical curated value is ever overwritten (VTI-unchanged is a load-bearing gate assertion).
