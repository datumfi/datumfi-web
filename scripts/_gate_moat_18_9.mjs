/* DEV-ONLY red-first FUNCTIONAL gate — §18.9 PMI drop-off bar + beat (Mortgage Copy Bank R159-162).
   _moatPmiBarHTML fires ONLY when pmiMonthly>0 AND the mortgage balance AND the linked home value are all
   sourced AND equity < 20%. Equity math is mortgage-only (home value − this mortgage's balance): a HELOC does
   NOT move PMI drop-off. Reuses the §16.1 equity bar (_groundsEquityBarHTML). Asserts:
     (FIRES)     with pmi + balance + linked home value + <20% equity → bar + beat with equityPct, principal-to-
                 20%, and the monthly PMI, and a 20%-equity marker.
     (GUARDS)    no PMI / no linked home value / balance 0 / already >=20% equity → nothing (sourced-or-blank).
     (MORTGAGE-ONLY) a linked HELOC does NOT change the PMI equityPct/principal (PMI is a first-mortgage charge).
   --redfirst strips the pmi<=0 guard -> a mortgage with NO PMI wrongly fires -> the no-PMI guard check bites. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('        var pmi = _num(acc.pmiMonthly);\n        if (pmi <= 0) return \'\';', '        var pmi = _num(acc.pmiMonthly);\n        ;');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_num', '_groundsEquityBarHTML', '_moatPmiBarHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { pmi:_moatPmiBarHTML };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', ok = null;
try { ok = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!ok);

if (ok) {
  const prop = (v) => ({ id: 'p1', baseId: 'property_primary', value: v });
  const mtg = (extra) => Object.assign({ id: 'm1', baseId: 'mortgage_primary', value: 450000, pmiMonthly: 200, linkedAssetId: 'p1' }, extra || {});
  const heloc = { id: 'h1', baseId: 'heloc_primary', value: 30000, linkedAssetId: 'p1' };
  const pmiOf = (accts) => build(accts).pmi('m1', accts.find(a => a.id === 'm1'));

  // ── FIRES: H=500k, bal=450k → equity 50k = 10%; principal to 20% = 450k − 400k = 50k; PMI $200 ──
  const fire = pmiOf([prop(500000), mtg({})]);
  need('(FIRES) renders the reused equity bar', fire.includes('🎯 PMI drop-off') && fire.includes('height:14px'));
  need('(FIRES) beat: "10% to 20% equity"', fire.includes("You're about 10% to 20% equity"));
  need('(FIRES) beat: ~$50,000 more principal + ~$200/mo PMI back',
    fire.includes('~$50,000 more in principal') && fire.includes('~$200/mo back in your pocket'));
  need('(FIRES) 20%-equity marker present', fire.includes('left:20%') && fire.includes('20% equity — PMI typically ends'));

  // ── GUARDS (sourced-or-blank) ──
  need('(GUARD) no PMI charged → nothing', pmiOf([prop(500000), mtg({ pmiMonthly: 0 })]) === '');
  need('(GUARD) no linked home value → nothing', pmiOf([mtg({ linkedAssetId: null })]) === '');
  need('(GUARD) zero balance → nothing', pmiOf([prop(500000), mtg({ value: 0 })]) === '');
  need('(GUARD) already >=20% equity → nothing', pmiOf([prop(600000), mtg({ value: 450000 })]) === '');

  // ── MORTGAGE-ONLY: a linked HELOC must NOT change the PMI equity/principal ──
  const withHeloc = pmiOf([prop(500000), mtg({}), heloc]);
  need('(MORTGAGE-ONLY) a linked HELOC does not change equityPct or principal-to-20%',
    withHeloc.includes("You're about 10% to 20% equity") && withHeloc.includes('~$50,000 more in principal'));
}

// served bytes: wired in the mortgage escrow block
need('(WIRED) mortgage modal renders _moatPmiBarHTML', /html \+= _moatPmiBarHTML\(id, acc\);/.test(s));

let pass = 0;
for (const [label, ok2] of checks) { console.log((ok2 ? '✅' : '⛔') + ' ' + label); if (ok2) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the PMI fire-guard stripped.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when a no-PMI mortgage wrongly fires.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
