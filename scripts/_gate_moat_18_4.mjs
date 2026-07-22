/* DEV-ONLY red-first FUNCTIONAL gate — §18.3 consolidated Commit 2b: NON-DESTRUCTIVE unlink (_unlinkApply).
   Unlink SEPARATES the two accounts; it deletes NOTHING. Asserts, driving the pure mutation:
     (LINK PRESENT)  before: the debt points at the asset, and the asset's derived list contains the debt.
     (SEVERED BOTH)  after: debt.linkedAssetId === null AND no account still points at the asset.
     (VALUES SURVIVE) both accounts keep every field (balances + the mortgage's own propTaxAnnual untouched).
     (ESCROW RE-DERIVED) the §18.2-shared escrow is copied DOWN to the property's own blank field before the
                     sever (sourced-or-blank restore), so the Grounds keeps a real standalone value.
     (NO DELETE)     both accounts still exist in state — no removeInstance.
     (BYTES)         the ✕ is wired on the status chip and the confirm reuses the verbatim §18.4a copy + a
                     type-first title.
   --redfirst swaps _unlinkApply for the WRONG destructive delete (drop the debt, no escrow restore) -> the
   survive / no-delete / escrow-re-derived assertions BITE. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('        if (_num(debt.propTaxAnnual) > 0 && !(_num(asset.propTaxYr) > 0)) asset.propTaxYr = debt.propTaxAnnual;', '        ;');
  s = s.replace('        debt.linkedAssetId = null;', '        state.accounts.splice(state.accounts.indexOf(debt), 1);');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_num', '_unlinkApply'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate', taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage', taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC', taxCode: 'debt' };
  return { id, title: 'Other', taxCode: 'other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { apply:_unlinkApply };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', eng = null, accts = null;
const fresh = () => [
  { id: 'm1', baseId: 'mortgage_primary', value: 400000, propTaxAnnual: 12000, insAnnual: 2400, linkedAssetId: 'prop1' },
  { id: 'prop1', baseId: 'property_primary', value: 800000, propTaxYr: '', homeInsYr: '', linkedAssetId: null }
];
try { accts = fresh(); eng = build(accts); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!eng);

if (eng) {
  const m1 = () => accts.find(a => a.id === 'm1');
  const prop1 = () => accts.find(a => a.id === 'prop1');
  const pointingAtProp = () => accts.filter(a => a.linkedAssetId === 'prop1');

  // ── LINK PRESENT (before) ──
  need('(LINK PRESENT) debt points at asset + asset-derived list contains the debt',
    m1() && m1().linkedAssetId === 'prop1' && pointingAtProp().length === 1);

  eng.apply('m1', 'prop1');

  // ── SEVERED BOTH SIDES ──
  need('(SEVERED) debt.linkedAssetId === null', m1() && m1().linkedAssetId === null);
  need('(SEVERED) nothing still points at the asset', pointingAtProp().length === 0);
  // ── VALUES SURVIVE ──
  need('(VALUES SURVIVE) debt keeps balance + its own propTaxAnnual', m1() && m1().value === 400000 && Number(m1().propTaxAnnual) === 12000);
  need('(VALUES SURVIVE) asset keeps its balance', prop1() && prop1().value === 800000);
  // ── ESCROW RE-DERIVED (non-destructive restore) ──
  need('(ESCROW RE-DERIVED) property tax restored onto the Grounds own field ($12,000)', prop1() && Number(prop1().propTaxYr) === 12000);
  need('(ESCROW RE-DERIVED) homeowners insurance restored onto the Grounds own field ($2,400)', prop1() && Number(prop1().homeInsYr) === 2400);
  // ── NO DELETE ──
  need('(NO DELETE) both accounts still exist — SEPARATES, never deletes', accts.length === 2 && !!m1() && !!prop1());

  // ── sourced-or-blank: an EXISTING Grounds value is NOT overwritten by the mortgage's ──
  const a2 = [
    { id: 'm2', baseId: 'mortgage_primary', propTaxAnnual: 12000, linkedAssetId: 'p2' },
    { id: 'p2', baseId: 'property_primary', propTaxYr: 9000, linkedAssetId: null }
  ];
  build(a2).apply('m2', 'p2');
  need("(SOURCED-OR-BLANK) a property's own existing tax is kept, not clobbered ($9,000 stays)",
    Number(a2.find(a => a.id === 'p2').propTaxYr) === 9000);
}

// ── served bytes ──
need('(BYTES) ✕ on the status chip calls _unlinkSecured(debtId, assetId)', s.includes('onclick="_unlinkSecured(') && s.includes('>✕</span>'));
need('(BYTES) confirm body VERBATIM §18.4a', s.includes('This just separates them — nothing is deleted. Each keeps its own values.'));
need('(BYTES) confirm title is type-first (Unlink this … from …?)', /title: 'Unlink this ' \+ debtLabel \+ ' from ' \+ assetLabel \+ '\?'/.test(s));
need('(BYTES) confirm buttons Unlink / Keep linked', s.includes("confirmText: 'Unlink'") && s.includes("cancelText: 'Keep linked'"));
need('(BYTES) status line passes the remove-context so the ✕ renders', /_linkedJumpLine\('🔗 ' \+ statusLabel \+ ':', linkedNow, statusColor, \{ selfId: id, selfIsDebt: isDebt \}\)/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with a destructive unlink.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when unlink DELETES instead of separating.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
