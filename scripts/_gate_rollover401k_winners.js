/* L52 NO-REGRESSION WINNER GATE — Rollover 401(k) "The Conduit" (rollover401k).
   Winner-map = Rollover 401(k) Copy Bank §22 (A244:D258), tagged ⚠️ ASSUMED — DIFF-REQUIRED. DIFFED live
   2026-07-11: The Conduit renders through the shared /401k/ strip, so Equity/Bond/Cash (§1), the 4 metric
   boxes (§12 ladders) and Account Value/International (§19) reuse the live 401(k) copy; Balance (R188) +
   Annual Contribution (R189) are the ROLLOVER-AWARE §RP copy (consolidation lens — the richest, no rival,
   so §RP legitimately WINS here, unlike ②); the 3 tax-lot cols use the Conduit N/A hovers (§12 per-column).
   Asserts each winner literal in the shipped studio.html. Usage: node scripts/_gate_rollover401k_winners.js */
const fs = require('fs');
const path = require('path');
const { studioSource } = require('./_studio_source.cjs');
const SRC = studioSource();

const WINNERS = [
  ['Equity %',            '§1 signal (shared)',   'the tax-efficiency worry that shapes a taxable account simply'],
  ['Bond %',              '§1 signal (shared)',   'Your ballast'],
  ['Cash %',              '§1 signal (shared)',   'gives up the tax-deferred growth that is the whole point'],
  ['Unrealized Gain box', '§12 UG ladder (shared)','this is exactly why high-growth assets belong here'],
  ['Weighted Beta box',   '§12 BETA ladder',      'moves essentially in step with the broad market'],
  ['Blended Yield box',   '§12 YLD ladder',       'reinvest completely untaxed instead of being taxed year by year'],
  ['Avg Expense box',     '§12 EXP ladder',       'institutional-grade pricing'],
  ['Cost Basis col',      '§12 per-col (Conduit)','a Rollover 401(k) has no capital-gains tax to size'],
  ['Acquisition Date col','§12 per-col (Conduit)','That clock does not run inside a Rollover 401(k)'],
  ['Account Value',       '§19 R384',             'the number that compounds'],
  ['International',        '§19 R388',             'Foreign Tax Credit that rewards foreign holdings in a taxable brokerage is LOST inside a 401(k)'],
  // §RP-lens WINS Balance + Annual Contribution — DIFF-CONFIRMED rollover-aware (consolidation lens), no richer rival.
  ['Balance',             '§RP R188 (rollover)',  'consolidate old 401(k)s so you can actually see and manage'],
  ['Annual Contribution', '§RP R189 (rollover)',  'for a pure rollover account'],
];

// §9 Layer-E tax-tail (forks on rollFlavor) — the Conduit's transit-identity nuance (A3, e08d287).
const LAYER_E = [
  ['Layer-E pretax tail (transit identity)', 'As pretax rollover money it grows tax-deferred'],
];

let pass = 0, fail = 0; const reds = [];
function ok(cond, label) { if (cond) pass++; else { fail++; reds.push(label); } console.log((cond ? 'PASS ' : 'FAIL ') + label); }

console.log('===== ROLLOVER 401(k) "THE CONDUIT" WINNER GATE (L52) — audit of served bytes =====');
WINNERS.forEach(w => ok(SRC.indexOf(w[2]) !== -1, w[0] + ' → ' + w[1] + '  («' + w[2].slice(0, 36) + '»)'));
console.log('--- §9 Layer-E transit identity ---');
LAYER_E.forEach(w => ok(SRC.indexOf(w[1]) !== -1, w[0]));

console.log('-------------------------------------');
console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
if (fail) console.log('REDS: ' + reds.join(' | '));
process.exit(fail === 0 ? 0 : 1);
