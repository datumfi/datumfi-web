/* DEV-ONLY red-first gate — §18.3 CONSOLIDATED, Commit 2a: the native link <select>s + standalone "+ Draft"
   buttons are replaced by ONE shared control (_linkControlHTML) — a native <details> disclosure with a
   scope-driven "link existing" list + a "+ Draft New" row, and a prominent clickable 🔗 status AT the control.
   Asserts:
     (TYPE-FIRST) labels are the honest account type (Real Estate / Mortgage / HELOC), no brand, no "Home".
     (DEBT single-link) unlinked → disclosure with "Draft New Property" + scope-valid property link rows; once
                 LINKED → status only, NO disclosure / NO draft (one-link-of-record, no silent orphaning).
     (ASSET multi-link) disclosure with "Draft New Liability" + link rows for ONLY currently-unlinked debts; a
                 debt already linked to this asset shows in the status, never in the link list.
     (NO-TELEPORT) createLinkedAsset / createLinkedLiability re-render in the CURRENT room (auto-link + stay).
     (ABSENCE)   old return-nav + old native-select chrome are gone from served bytes.
     (CHOOSER)   _draftLiabilityChooser sources its types from the asset reverse-scope × rDataList.
   --redfirst removes the single-link guard (canManage=true always) -> a LINKED debt wrongly shows the disclosure
   -> the one-link-of-record check bites. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('canManage = !la;   // single-link: no link/draft while already linked (one-link-of-record)', 'canManage = true;');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_lienRank', '_returnNavLabel', '_linkedJumpLine', '_securedLinkScope', '_assetReverseScope', '_linkControlHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate', meta: 'The Grounds', taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage', meta: 'The Moat', taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC', meta: 'The Cellar', taxCode: 'debt' };
  return { id, title: 'Other', meta: '', taxCode: 'other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { ctrl:_linkControlHTML, label:_returnNavLabel };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', eng = null;
try { eng = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!eng);

if (eng) {
  const ctrlOf = (accts, id) => build(accts).ctrl(id, accts.find(a => a.id === id), getBaseType(accts.find(a => a.id === id).baseId));

  need("(TYPE-FIRST) property→'Real Estate', mortgage→'Mortgage', heloc→'HELOC'",
    eng.label({ id: 'property_primary' }) === 'Real Estate' && eng.label({ id: 'mortgage_primary' }) === 'Mortgage' && eng.label({ id: 'heloc_primary' }) === 'HELOC');

  // ── DEBT single-link ──
  const prop = { id: 'prop1', baseId: 'property_primary', propName: 'Lake cabin' };
  const mtgU = { id: 'm1', baseId: 'mortgage_primary', linkedAssetId: null };
  const dU = ctrlOf([prop, mtgU], 'm1');
  need('(DEBT unlinked) disclosure + "Draft New Property" + scope-valid property link row',
    dU.includes('<details') && dU.includes('Draft New Property') && dU.includes("updateAccField('m1', 'linkedAssetId', 'prop1')") && dU.includes('Real Estate'));
  need('(DEBT unlinked) no 🔗 status yet', !dU.includes('🔗 Linked Asset'));

  const mtgL = { id: 'm1', baseId: 'mortgage_primary', linkedAssetId: 'prop1' };
  const dL = ctrlOf([prop, mtgL], 'm1');
  need('(DEBT LINKED) status shown (🔗 Linked Asset: Real Estate)', dL.includes('🔗 Linked Asset') && dL.includes('Real Estate'));
  need('(DEBT LINKED · one-link-of-record) NO disclosure, NO draft while linked',
    !dL.includes('<details') && !dL.includes('Draft New Property'));

  // ── ASSET multi-link ──
  const aU = ctrlOf([{ ...prop, }, mtgU], 'prop1');
  need('(ASSET) disclosure + "Draft New Liability" + link row for an UNLINKED debt',
    aU.includes('<details') && aU.includes('Draft New Liability') && aU.includes("linkDebtToAsset('prop1', 'm1')") && aU.includes('Mortgage'));
  const aL = ctrlOf([{ ...prop }, mtgL], 'prop1');
  need('(ASSET) a debt linked to THIS asset appears in status, never in the link list',
    aL.includes('🔗 Linked Debts') && aL.includes('Mortgage') && !aL.includes("linkDebtToAsset('prop1', 'm1')"));
}

// ── served bytes ──
need('(ABSENCE) old return-nav gone (no id="modal-return-nav")', !/id="modal-return-nav"/.test(s));
need('(ABSENCE) old return-nav gone (no _returnNavHTML)', !/function _returnNavHTML/.test(s));
need('(ABSENCE) old native-select chrome gone ("Map Existing Liability to this Structure")', !s.includes('Map Existing Liability to this Structure'));
need('(ABSENCE) old option text gone ("Map to: ")', !s.includes('>Map to: '));
need('(ABSENCE) old "+ Draft New Structure" button gone', !s.includes('+ Draft New Structure'));

need('(WIRED) both rooms render the shared control', (s.match(/html \+= _linkControlHTML\(id, acc, base\);/g) || []).length >= 2);
need('(NO-TELEPORT) createLinkedAsset stays in room (openAccountModal(debtId))', /debt\.linkedAssetId = newId;[\s\S]*?openAccountModal\(debtId\);/.test(s));
need('(NO-TELEPORT) createLinkedLiability stays in room (openAccountModal(assetId))', /createLinkedLiability = function\(assetId, baseId\)[\s\S]*?openAccountModal\(assetId\);/.test(s));
need('(CHOOSER) _draftLiabilityChooser sources types from reverse-scope × rDataList',
  /_draftLiabilityChooser = function[\s\S]*?rDataList\.filter[\s\S]*?_assetReverseScope/.test(s) && s.includes('What kind of debt is secured by this property?'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the single-link guard stripped.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when a linked debt is allowed to re-link/orphan.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
