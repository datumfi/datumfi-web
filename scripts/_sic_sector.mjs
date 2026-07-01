/* DEV-ONLY. Deterministic SIC(4-digit)->sector classification. The SIC code is the SOURCED fact
   (SEC); this is a transparent documented lookup (like GICS mapping), not a guess. Returns '' if
   unmappable (blank, never fabricated). Sector labels match the curated core vocabulary. */
export function sicToSector(sicRaw) {
  const s = parseInt(sicRaw, 10);
  if (!s || isNaN(s)) return '';
  // specific overrides first
  if (s === 2834 || s === 2836 || (s >= 8000 && s <= 8099) || s === 3826 || s === 3841 || s === 3845 || s === 3842) return 'Healthcare';
  if (s >= 3570 && s <= 3579) return 'Technology';          // computers
  if (s >= 3670 && s <= 3679) return 'Technology';          // semiconductors/electronic components
  if (s >= 7370 && s <= 7379) return 'Technology';          // computer services/software
  if (s >= 3600 && s <= 3669) return 'Technology';          // electronic equipment
  if (s === 3711 || s === 3713 || s === 3714 || s === 3715 || s === 3716) return 'Consumer Cyclical'; // autos
  // broad ranges
  if (s >= 100 && s <= 999) return 'Materials';             // agriculture
  if (s >= 1000 && s <= 1099) return 'Materials';           // metal mining
  if (s >= 1200 && s <= 1399) return 'Energy';              // coal + oil & gas
  if (s >= 1400 && s <= 1499) return 'Materials';
  if (s >= 1500 && s <= 1799) return 'Industrials';         // construction
  if (s >= 2000 && s <= 2199) return 'Consumer Defensive';  // food/tobacco
  if (s >= 2200 && s <= 2399) return 'Consumer Cyclical';   // textile/apparel
  if (s >= 2400 && s <= 2599) return 'Industrials';
  if (s >= 2600 && s <= 2699) return 'Materials';           // paper
  if (s >= 2700 && s <= 2799) return 'Communication Services'; // publishing
  if (s >= 2800 && s <= 2899) return 'Materials';           // chemicals (pharma handled above)
  if (s >= 2900 && s <= 2999) return 'Energy';              // petroleum refining
  if (s >= 3000 && s <= 3399) return 'Materials';           // rubber/plastics/metals
  if (s >= 3400 && s <= 3569) return 'Industrials';         // machinery
  if (s >= 3580 && s <= 3599) return 'Industrials';
  if (s >= 3700 && s <= 3799) return 'Industrials';         // transportation equip (autos handled above)
  if (s >= 3800 && s <= 3999) return 'Industrials';
  if (s >= 4000 && s <= 4799) return 'Industrials';         // transportation
  if (s >= 4800 && s <= 4899) return 'Communication Services';
  if (s >= 4900 && s <= 4999) return 'Utilities';
  if (s >= 5000 && s <= 5199) return 'Consumer Cyclical';   // wholesale
  if (s === 5400 || s === 5410 || s === 5411 || s === 5412) return 'Consumer Defensive'; // grocery
  if (s >= 5200 && s <= 5999) return 'Consumer Cyclical';   // retail
  if (s >= 6000 && s <= 6199) return 'Financials';
  if (s >= 6200 && s <= 6299) return 'Financials';
  if (s >= 6300 && s <= 6499) return 'Financials';          // insurance
  if (s === 6798) return 'Real Estate';                     // REIT
  if (s >= 6500 && s <= 6599) return 'Real Estate';
  if (s >= 6700 && s <= 6799) return 'Financials';          // holding/investment
  if (s >= 7000 && s <= 7299) return 'Consumer Cyclical';
  if (s >= 7300 && s <= 7399) return 'Industrials';         // business services (computer handled above)
  if (s >= 7800 && s <= 7999) return 'Communication Services';
  if (s >= 8200 && s <= 8299) return 'Consumer Cyclical';
  if (s >= 8700 && s <= 8799) return 'Industrials';
  return '';                                                // unmappable -> blank
}
