/* DEV-ONLY red-first AUDIT gate — §0–§4 of the Mortgage (The Moat) Copy Bank. Verification pass ONLY: it does
   NOT change studio.html. It proves, against the SERVED bytes, that every §0/§4 section the bank still marks ❔
   is actually LIVE — so those ledger verdicts can flip ❔→✅. §0.4 (variable-rate cluster) also gets a light
   functional check (it renders the five fields), per the memo that §0.4 + §4.3 need served-byte proof, not a
   code-read. --redfirst strips two live markers (§0.4 wiring + §4.3 function) -> those audit rows bite. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.replace('${_variableRateClusterHTML(id, acc)}', '');       // pretend §0.4 was never wired
  s = s.replace('function acceleratedDelta(acc)', 'function acceleratedDeltaXX(acc)');   // pretend §4.3 is gone
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ── §0.2 secured-link scope + the consolidated link control ──
need('§0.2 link scope live (_securedLinkScope + _linkControlHTML)',
  /function _securedLinkScope/.test(s) && s.includes('_linkControlHTML(id, acc, base)'));
// ── §0.3 / §4.1 escrow (fields + monthly engine + footer) ──
need('§0.3/§4.1 escrow live (🏦 header + calculateEscrowMonthly + _escrowFooter)',
  s.includes('🏦 Escrow — the monthly bundle') && /function calculateEscrowMonthly/.test(s) && /function _escrowFooter/.test(s));
// ── §0.4 variable-rate cluster (defined + WIRED) ──
need('§0.4 variable-rate cluster defined + wired',
  /function _variableRateClusterHTML/.test(s) && s.includes('${_variableRateClusterHTML(id, acc)}'));
// ── §0.5 toggle-name lock ──
need('§0.5 toggle name = "Target for Accelerated Payoff"', s.includes('Target for Accelerated Payoff'));
// ── §4.2 life-of-loan ──
need('§4.2 life-of-loan live (lifeOfLoan + costLife + wired)',
  /function lifeOfLoan/.test(s) && s.includes('costLife') && /lifeOfLoan\(acc\)/.test(s));
// ── §4.3 accelerated-payoff delta (defined + WIRED) ──
need('§4.3 accelerated delta defined + wired',
  /function acceleratedDelta\(acc\)/.test(s) && /acceleratedDelta\(acc\)/.test(s));
// ── §4.4 amortization modal ──
need('§4.4 amortization modal live (openAmortizationModal + button)',
  /openAmortizationModal = function/.test(s) && s.includes('VIEW REMAINING SCHEDULE') && s.includes('VIEW COMPLETE SCHEDULE'));

// ── §0.4 functional: the cluster actually renders the five fields for a Variable mortgage ──
const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const getBaseType = () => ({ id: 'mortgage_primary', title: 'Mortgage' });
let vc = '';
try {
  const fn = new Function('getBaseType', extract('_variableRateClusterHTML') + '\nreturn _variableRateClusterHTML;')(getBaseType);
  vc = fn('m1', { baseId: 'mortgage_primary', rateType: 'Variable' });
} catch (ex) { vc = 'ERR:' + ex.message; }
need('§0.4 (functional) renders Rate Index / Margin / Periodic Cap / Lifetime Cap / Next Reset',
  vc.includes('Rate Index') && vc.includes('Margin %') && vc.includes('Periodic Cap %') && vc.includes('Lifetime Cap %') && vc.includes('Next Reset Date'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} §0–§4 sections verified in served bytes${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — audit stayed green with §0.4/§4.3 markers stripped.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — audit correctly FAILS when a §0/§4 section is missing from the served bytes.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ AUDIT FAILED — a §0/§4 section is NOT verifiable in served bytes; do NOT flip its ledger verdict.'); process.exit(1); }
console.log('\n✅ AUDIT GREEN — §0–§4 ledger verdicts may flip ❔→✅ (Moat ROOM row stays ❔ until the whole queue lands).');
