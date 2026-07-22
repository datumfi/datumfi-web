/* DEV-ONLY red-first gate — §18.3 CONSOLIDATED Commit 1: the top-of-modal "← Back to …" buttons are REMOVED
   and replaced by a single clickable, type-first jump-line (both the asset room's "Linked Liabilities:" and the
   debt room's "Linked Assets:"). Asserts:
     (ABSENCE)   the old return-nav is gone from served bytes — no "← Back to", no id="modal-return-nav", no
                 _returnNavHTML function.
     (FUNCTIONAL) _linkedJumpLine emits a clickable (openAccountModal) chip per linked account, and nothing at
                 all when there are no links (sourced-or-blank).
     (TYPE-FIRST) labels are the HONEST account type — "Real Estate" / "Mortgage" / "HELOC" — never a brand name
                 (The Grounds / The Moat / The Cellar) and never the invented specific "Home".
     (WIRED)     both rooms render through _linkedJumpLine in the served bytes.
   --redfirst reintroduces a back-button's byte markers -> the two ABSENCE checks bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  // Simulate a reintroduced §18.3 return-nav button (the pre-consolidation regression).
  s += '\n<div id="modal-return-nav" title="Return to the account you came from"></div>';
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_lienRank', '_returnNavLabel', '_linkedJumpLine'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate', meta: 'The Grounds', taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage', meta: 'The Moat', taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC', meta: 'The Cellar', taxCode: 'debt' };
  return { id, title: 'Other', meta: '', taxCode: 'other' };
};
function build() {
  const body = NAMES.map(extract).join('\n') + '\nreturn { label:_returnNavLabel, jump:_linkedJumpLine };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, getBaseType);
}
let err = '', eng = null;
try { eng = build(); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!eng);

if (eng) {
  // ── TYPE-FIRST honest labels ──
  need("(TYPE-FIRST) property → 'Real Estate' (never 'Home', never 'The Grounds')",
    eng.label({ id: 'property_primary' }) === 'Real Estate');
  need("(TYPE-FIRST) mortgage → 'Mortgage' (never 'The Moat')", eng.label({ id: 'mortgage_primary' }) === 'Mortgage');
  need("(TYPE-FIRST) heloc → 'HELOC' (never 'The Cellar')", eng.label({ id: 'heloc_primary' }) === 'HELOC');

  // ── FUNCTIONAL jump-line ──
  const mtg = { id: 'm1', baseId: 'mortgage_primary' };
  const hel = { id: 'h1', baseId: 'heloc_primary' };
  const prop = { id: 'prop1', baseId: 'property_primary' };
  const liab = eng.jump('Linked Liabilities:', [mtg, hel], 'var(--danger)');
  need('(FUNCTIONAL) asset jump-line names + links every liability (Mortgage · HELOC, clickable)',
    liab.includes("openAccountModal('m1')") && liab.includes("openAccountModal('h1')") &&
    liab.includes('Mortgage') && liab.includes('HELOC') && liab.includes('cursor:pointer'));
  const asset = eng.jump('Linked Assets:', [prop], 'var(--teal-mid)');
  need('(FUNCTIONAL) debt jump-line names + links the asset (Real Estate, clickable)',
    asset.includes("openAccountModal('prop1')") && asset.includes('Real Estate'));
  need('(SOURCED-OR-BLANK) no links → empty string', eng.jump('Linked Liabilities:', [], 'x') === '');
  need('(NO-BRAND) jump-line output carries no branded room name',
    !/The Grounds|The Moat|The Cellar/.test(liab + asset) && !/\bHome\b/.test(liab + asset));
}

// ── served bytes: ABSENCE of the old §18.3 return-nav (specific markers, not the app's other back buttons) ──
need('(ABSENCE) no §18.3 hover "Return to the account you came from" in served bytes', !s.includes('Return to the account you came from'));
need('(ABSENCE) no id="modal-return-nav" in served bytes', !/id="modal-return-nav"/.test(s));
need('(ABSENCE) _returnNavHTML function removed', !/function _returnNavHTML/.test(s));

// ── served bytes: both rooms wired through the clickable jump-line ──
need('(WIRED) asset room renders _linkedJumpLine(\'Linked Liabilities:\')', /_linkedJumpLine\('Linked Liabilities:'/.test(s));
need('(WIRED) debt room renders _linkedJumpLine(\'Linked Assets:\')', /_linkedJumpLine\('Linked Assets:'/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with a reintroduced back button.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when a top-of-modal back button is reintroduced.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
