/* DEV-ONLY red-first gate — §1 The Cellar (HELOC) Datum Intelligence strip + §15 education.
   Asserts, in the SERVED studio.html bytes:
     1. HELOC DI block injected (base.title==='HELOC' → modal-cellar-di + _cellarDI(acc)).
     2. _cellarDI composes §1 signals VERBATIM: 1.1 balance+limit, 1.2 secured-by-home (ALWAYS),
        1.3 utilization, 1.4 phase (reuses _helocPhaseClause) + D19 Draw-phase heads-up, 1.5 variable.
     3. §4.3 net equity subtracts EVERY loan secured by the home via _groundsLinkedDebt.
     4. §15 education body VERBATIM (bank R58), via _diWhyPanel, HELOC-gated.
     5. NO escrow block for HELOC — escrow header stays Mortgage-gated only.
     6. live-refresh modal-cellar-di wired in BOTH updateAccField and updateValueWithoutRender.
   --redfirst inverts: strips the §1 additions, proves the gate BITES. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.replace(/    function _cellarDI\(acc\)[\s\S]*?\n        return parts\.join\(' '\);\n    }\n/, '');
  s = s.replace(/\n            \/\/ §1 DATUM INTELLIGENCE strip \(HELOC \/ The Cellar\)[\s\S]*?<\/div>`;\n            }/, '');
  s = s.replace(/\n            \/\/ §15 education panel \(HELOC Copy Bank[\s\S]*?\n            }/, '');
  s = s.replace(/const cdiEl = document[\s\S]*?the equity behind it\.';\n/, '');
  s = s.replace(/const cdiEl2 = document[\s\S]*?the equity behind it\.';\n/, '');
  // #392 balance>limit guard — neutralize its winners so the checks below BITE.
  s = s.split('larger than this line').join('XXX');
  s = s.split('Balance exceeds this limit').join('XXX');
  s = s.split('function _helocOverLimit').join('function _NOPE');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const SECURED = 'This line is secured by your home. That usually buys a lower rate than an unsecured line — but the tradeoff is real: fall behind and the house is the collateral.';
const HEADSUP = 'Interest-only now — but when the repayment period begins, this balance amortizes and the minimum payment can rise sharply.';
const VARLINE = 'This rate is variable — tied to an index, so your payment can rise if rates do.';
const EDU_A = 'draw, repay, draw again';
const EDU_B = 'the full picture behind a single monthly minimum.';

need('HELOC DI block injected (modal-cellar-di + _cellarDI)',
  /if \(base\.title === 'HELOC'\) \{\s*let _cdiTxt = _cellarDI\(acc\);/.test(s) && /id="modal-cellar-di-\$\{id\}"/.test(s));
need('1.1 balance drawn against a line (+ headroom)',
  /drawn against a/.test(s) && /still available to draw\./.test(s));
need('1.2 secured-by-home VERBATIM (always render)', s.includes(SECURED));
need('1.3 utilization line VERBATIM', /of your available equity line\./.test(s) && /_helocUtilPct\(acc\)/.test(s));
need('1.4 phase reuses _helocPhaseClause (L48)', /var pc = _helocPhaseClause\(acc\);/.test(s));
need('1.4 D19 Draw-phase payment-jump heads-up VERBATIM', s.includes(HEADSUP));
need('1.5 variable-rate line VERBATIM', s.includes(VARLINE));
need('§4.3 net equity subtracts ALL secured loans via _groundsLinkedDebt',
  /hv - _groundsLinkedDebt\(la\.id\)/.test(s) && /your equity after every loan secured by it is/.test(s));
need('§15 education body VERBATIM (bank R58)', s.includes(EDU_A) && s.includes(EDU_B));
need('§15 panel is HELOC-gated via _diWhyPanel',
  /base\.title === 'HELOC'\)[\s\S]{0,200}_diWhyPanel\('What a HELOC is/.test(s));
need('live-refresh modal-cellar-di in updateAccField',
  /const cdiEl = document\.getElementById\(`modal-cellar-di-\$\{id\}`\)/.test(s));
need('live-refresh modal-cellar-di in updateValueWithoutRender',
  /const cdiEl2 = document\.getElementById\(`modal-cellar-di-\$\{id\}`\)/.test(s));

// #392 balance-exceeds-limit guard (invalid input: drawn > credit limit).
need('balance-guard: _helocOverLimit helper defined', /function _helocOverLimit\(acc\)/.test(s));
need('balance-guard: §1.3 shows a data-check note when balance > limit (not a >100% util)',
  s.includes('larger than this line') && s.includes('exceed its credit limit'));
need('balance-guard: inline readout shows "Balance exceeds this limit" over-limit', s.includes('Balance exceeds this limit'));

// NO escrow for HELOC — escrow header must remain Mortgage-gated only.
const escrowMortgageGated = /if \(base\.title === 'Mortgage'\) \{\s*html \+= `[\s\S]{0,400}🏦 Escrow/.test(s);
const escrowNotHeloc = !/base\.title === 'HELOC'[\s\S]{0,600}🏦 Escrow/.test(s);
need('NO escrow block for HELOC (escrow stays Mortgage-only)', escrowMortgageGated && escrowNotHeloc);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code; it does not bite.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§1 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
