/* DEV-ONLY — L49/L50 WIRE-THEN-AUDIT LEDGER for THE CELLAR (HELOC), #371.
   One consolidated read of the SERVED studio.html bytes: every authored bank line → a single
   WIRED (✅) / DELIBERATELY-BLANK (⬜, with reason) verdict. Zero-unexplained-⛔ = room DONE.
   Per-section red-first bite was proven in _gate_heloc_{ids,creditlimit,phase,di,hovers}.mjs;
   this ledger is the consolidation. --redfirst strips the whole HELOC surface to show it bites. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');
if (RED) {
  // Coarse strip: drop every line mentioning heloc / _cellarDI / _HELOC_HOVERS / _isHelocRoom / The Cellar.
  s = s.split('\n').filter(l => !/heloc|_cellarDI|_HELOC_HOVERS|_isHelocRoom|The Cellar|The Co-Cellar|A revolving line, backed by your home/i.test(l)).join('\n');
}
const sN = s.replace(/\\/g, '');       // normalize JS escape backslashes → rendered text
const atm = (s.match(/const ACCOUNT_TYPE_MAP = \{([\s\S]*?)\};/) || [])[1] || '';
const ft  = (s.match(/const FILTERED_TYPES = new Set\(\[([\s\S]*?)\]\);/) || [])[1] || '';

const ledger = [];
const V = (section, line, ok, note) => ledger.push({ section, line, ok: !!ok, note: note || '' });

// ── §0.1 REGISTRY ──
V('§0.1', 'heloc_joint/_primary/_co registry ids (debt/hasInterest/HELOC)',
  /id: 'heloc_joint',[^\n]*title: 'HELOC'/.test(s) && /id: 'heloc_primary',[^\n]*title: 'HELOC'/.test(s) && /id: 'heloc_co',[^\n]*meta: 'The Co-Cellar'/.test(s));
V('§0.1', "taxonomy leaf 'The Cellar' → heloc_* family",
  /leaf:'The Cellar', reg:\{joint:'heloc_joint',primary:'heloc_primary',co:'heloc_co'\}/.test(s));
V('§0.1', 'all 3 ids in FILTERED_TYPES (engine-filtered)',
  /'heloc_joint'/.test(ft) && /'heloc_primary'/.test(ft) && /'heloc_co'/.test(ft));
V('§0.1', 'NOT in ACCOUNT_TYPE_MAP (422-trap guard)', !/heloc/.test(atm));

// ── §0.2 / §0.5 LINK ──
V('§0.2/0.5', "link-scope routes heloc → property* only", /id\.indexOf\('heloc'\) === 0/.test(s) && /aB\.id === 'property'/.test(s));
V('§0.2', "Grounds reverse-scope accepts mortgage OR heloc (two-link)", /indexOf\('heloc'\) === 0/.test(s) && /_groundsLinkedDebt/.test(s));

// ── §0.6 VARIABLE-RATE CLUSTER (inherited by all debt rooms) ──
V('§0.6', 'variable-rate cluster rendered in debt modal (index/margin/caps/reset)', /\$\{_variableRateClusterHTML\(id, acc\)\}/.test(s) && /Periodic Cap %/.test(s));

// ── §0.4 CREDIT LIMIT + UTILIZATION + HEADROOM ──
V('§0.4', 'Credit Limit field injected HELOC-only', /base\.title === 'HELOC' \? _helocLimitFieldHTML\(id, acc\) : ''/.test(s));
V('§0.4', 'utilization = balance/limit ; headroom = limit−balance', /\(\(parseFloat\(acc\.value\) \|\| 0\) \/ l\) \* 100/.test(s) && /l - \(parseFloat\(acc\.value\) \|\| 0\)/.test(s));
V('§0.4', 'sourced-or-blank (blank limit → readout hidden)', /if \(_helocLimit\(acc\) === null\) return '';/.test(s));

// ── §0.3 PHASE ──
V('§0.3', 'Phase select injected HELOC-only', /base\.title === 'HELOC' \? _helocPhaseFieldHTML\(id, acc\) : ''/.test(s));
V('§0.3', 'phase clause branched verbatim (Draw / Repayment) + blank', sN.includes("You're in the draw period") && sN.includes("You're in the repayment period") && /return '';\n    }/.test(s));

// ── §1 DI STRIP ──
V('§1', 'DI block injected (modal-cellar-di + _cellarDI)', /let _cdiTxt = _cellarDI\(acc\);/.test(s) && /id="modal-cellar-di-\$\{id\}"/.test(s));
V('§1.1', 'balance drawn against line + headroom', /drawn against a/.test(s) && /still available to draw\./.test(s));
V('§1.2', 'secured-by-home gravity clause (ALWAYS renders)', sN.includes('This line is secured by your home. That usually buys a lower rate'));
V('§1.3', 'utilization line', /of your available equity line\./.test(s));
V('§1.4', 'phase clause (reuse) + D19 payment-jump heads-up', /var pc = _helocPhaseClause\(acc\);/.test(s) && sN.includes('when the repayment period begins, this balance amortizes and the minimum payment can rise sharply'));
V('§1.5', 'variable-rate line + reset clause', sN.includes('This rate is variable — tied to an index'));
V('§4.3', 'net equity subtracts ALL secured loans (_groundsLinkedDebt)', /hv - _groundsLinkedDebt\(la\.id\)/.test(s) && /your equity after every loan secured by it is/.test(s));
V('§15', 'education body verbatim (R58) via _diWhyPanel', sN.includes('draw, repay, draw again') && sN.includes('the full picture behind a single monthly minimum.'));
V('§1', 'NO escrow block for HELOC (Mortgage-only)', !/base\.title === 'HELOC'[\s\S]{0,600}🏦 Escrow/.test(s));

// ── §2 HOVERS ──
const H = {
  'R23 Current Balance': 'The amount currently borrowed against your line — not the limit.',
  'R24 Credit Limit': 'The most you can draw. Because it\'s backed by home equity',
  'R25 Interest Rate APR': 'Most HELOCs carry a variable rate tied to an index',
  'R26 Phase': 'in repayment you pay down principal on a schedule with no new draws.',
  'R27 Linked Home': 'This line is secured by the linked property.',
  'R28 Additional Payment': 'Extra hits principal and frees up equity headroom',
};
for (const [k, v] of Object.entries(H)) V('§2', k + ' hover verbatim', sN.includes(v));
V('§2', 'single-source: R24 present exactly once', (s.match(/far larger than a card limit/g) || []).length === (RED ? 0 : 1));
V('§2', 'no Mortgage-copy leakage (HELOC unmapped fields → plain)', /var hov = _HELOC_HOVERS\[text\];\s*\n\s*if \(!hov\) return `<div class="input-label"/.test(s));

// ── §3a HEADER ──
V('§3a', 'R31 header hover verbatim via _isHelocRoom', sN.includes('A HELOC is a hybrid: it works like a credit card') && /else if \(_isHelocRoom\)/.test(s));

// ── §2c COMPLETION SET (bank §2b R82–R88) — House Rule: EVERY field gets a hover ──
V('§2c', 'Original Amount hover verbatim', sN.includes('The credit line’s original size when you set it up'));
V('§2c', 'Rate Type hover verbatim', sN.includes('Most HELOCs are Variable — the rate is tied to an index'));
V('§2c', 'Rate cluster — 5 DISTINCT field hovers (#390, replaced the shared one) + HELOC-gated',
  sN.includes('The published rate your line follows — usually Prime, sometimes SOFR') &&
  sN.includes('The most your rate can ever climb above where it started') && /\}\)\.title === 'HELOC'/.test(s));
V('§2c', 'Origination Date hover verbatim', sN.includes('It anchors the draw-period clock'));
V('§2c', 'Maturity Date hover verbatim', sN.includes('The contractual end of the line — by here the balance must be repaid'));
V('§2c', 'Minimum Payment hover verbatim', sN.includes('which is why the minimum can jump when the phase turns'));
V('§2c', 'Next Payment Date hover verbatim', sN.includes('especially the countdown to when the draw period ends'));

// ── DELIBERATELY-BLANK (the sole legit not-applicable) ──
V('⬜', 'Escrow section', true, 'DELIBERATELY-BLANK — HELOC has no escrow; Mortgage-only (bank §1). The one true not-applicable, not a missing tooltip.');

// ── render ledger ──
let pass = 0, fail = 0;
console.log('════ THE CELLAR (HELOC) · L49/L50 WIRE-THEN-AUDIT LEDGER ════\n');
for (const r of ledger) {
  const mark = r.note && r.ok && r.section === '⬜' ? '⬜' : (r.ok ? '✅' : '⛔');
  console.log(`${mark} [${r.section}] ${r.line}${r.note ? '  — ' + r.note : ''}`);
  if (r.ok) pass++; else fail++;
}
console.log(`\n${pass}/${ledger.length} lines WIRED-or-deliberate · unexplained-⛔ = ${fail}${RED ? '  [--redfirst: expect ⛔ > 0]' : ''}`);

if (RED) {
  if (fail === 0) { console.error('\n❌ RED-FIRST FAILED — ledger stayed clean on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — audit correctly shows ⛔ on the HELOC-stripped code.');
  process.exit(0);
}
if (fail > 0) { console.error('\n❌ ROOM NOT DONE — unexplained ⛔ present.'); process.exit(1); }
console.log('\n✅ ROOM DONE — every authored line WIRED-LIVE or DELIBERATELY-BLANK. Zero-unexplained-⛔.');
