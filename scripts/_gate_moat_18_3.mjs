/* DEV-ONLY red-first FUNCTIONAL gate — §18.3 return-nav (Mortgage Copy Bank R137). Asserts:
     (FUNCTIONAL) _returnNavHTML emits a "← Back to {room}" button for every link that ACTUALLY exists —
                  debt side → its single linked collateral asset; asset side → every debt secured against it,
                  first-lien (mortgage) BEFORE second-lien (HELOC); nothing at all when no link exists.
     (SOURCED)    the button names the account TYPE in plain terms ("your Home" / "your Mortgage" / "your HELOC"),
                  never the branded room name or a hardcoded pair — wayfinding clarity over flavor.
     (BYTES)      the winner strings ("← Back to", "Return to the account you came from"), the container id,
                  and the openAccountModal call are all in the served bytes, and openAccountModal WIRES the nav.
   --redfirst neuters _returnNavHTML (returns '' — the pre-§18.3 behaviour: no trail back) -> the functional
   "button present" checks + the container-id byte check bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(
    "        return '<div id=\"modal-return-nav\" style=\"margin-bottom:14px; display:flex; gap:10px; flex-wrap:wrap;\">' + btns + '</div>';",
    "        return '';");
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_lienRank', '_returnNavLabel', '_returnNavHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate', meta: 'The Grounds', taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage', meta: 'The Moat', taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC', meta: 'The Cellar', taxCode: 'debt' };
  return { id, title: 'Other', meta: '', taxCode: 'other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { nav:_returnNavHTML };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', nav = null;
try { nav = build([]).nav; } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!nav);

if (nav) {
  const prop = { id: 'prop1', baseId: 'property_primary', linkedAssetId: null };
  const mtg = { id: 'm1', baseId: 'mortgage_primary', linkedAssetId: 'prop1' };
  const hel = { id: 'h1', baseId: 'heloc_primary', linkedAssetId: 'prop1' };
  const navIn = (accts, acc) => build(accts).nav(acc, getBaseType(acc.baseId));

  // ── debt side → ONE button back to the linked collateral asset (your Home) ──
  const dHtml = navIn([prop, mtg], mtg);
  need('(FUNCTIONAL) linked debt shows a return button to its collateral (your Home)',
    dHtml.includes('← Back to your Home') && dHtml.includes("openAccountModal('prop1')"));
  need('(FUNCTIONAL) linked debt shows EXACTLY one return button',
    (dHtml.match(/← Back to/g) || []).length === 1);

  // ── unlinked debt → nothing ──
  need('(FUNCTIONAL) an unlinked debt emits no return-nav',
    navIn([{ ...mtg, linkedAssetId: null }], { ...mtg, linkedAssetId: null }) === '');

  // ── asset side → one button PER lien, first-lien (mortgage) before second-lien (HELOC) ──
  // NB: HELOC pushed FIRST in source order to prove the sort reorders the mortgage ahead of it.
  const aHtml = navIn([prop, hel, mtg], prop);
  need('(FUNCTIONAL) a property with two liens shows both return buttons (your Mortgage + your HELOC)',
    aHtml.includes('← Back to your Mortgage') && aHtml.includes('← Back to your HELOC'));
  need('(FUNCTIONAL) both liens are individually navigable (m1 + h1)',
    aHtml.includes("openAccountModal('m1')") && aHtml.includes("openAccountModal('h1')"));
  need('(ORDER) first-lien (your Mortgage) is listed BEFORE second-lien (your HELOC)',
    aHtml.indexOf('your Mortgage') < aHtml.indexOf('your HELOC'));

  // ── asset with no liens → nothing ──
  need('(FUNCTIONAL) a property with no linked debt emits no return-nav',
    navIn([prop], prop) === '');
}

// ── served bytes: winner strings + wiring ──
need('(BYTES) winner label "← Back to" in served bytes', s.includes('← Back to'));
need('(BYTES) hover "Return to the account you came from" in served bytes', s.includes('Return to the account you came from'));
need('(BYTES) container id "modal-return-nav" in served bytes', /id="modal-return-nav"/.test(s));
need('(WIRED) openAccountModal renders the return-nav', /html \+= _returnNavHTML\(acc, base\);/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.3 (no-return-nav) code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
