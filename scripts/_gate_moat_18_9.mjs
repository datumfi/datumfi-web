/* DEV-ONLY red-first FUNCTIONAL gate — §18.9 PMI drop-off bar + beat (R159-162) AND the PMI-messaging
   consistency fix. ONE test, _moatPmiUnder20, decides whether the PMI nudge applies (pmiMonthly>0 AND balance
   AND linked home value sourced AND equity < 20%, mortgage-only LTV) — the bar, the §1.6 DI clause, and the
   escrow footer all read it, so they can never disagree. Asserts:
     (FIRES)     under 20% equity → reused §16.1 bar + 20% marker + the reworded beat (equity to one decimal;
                 clear cause→effect: pay principal → reach 20% → PMI ends → money back).
     (GUARDS)    no PMI / no linked home value / balance 0 / already >=20% equity → nothing.
     (MORTGAGE-ONLY) a linked HELOC does not move the PMI equity/principal.
     (CONSISTENCY) both DI clauses are gated on _moatPmiUnder20, not a bare pmi>0.
   --redfirst makes _moatPmiUnder20 ignore the equity threshold (return true) -> the >=20% guard + the direct
   threshold check bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace('        return (H - bal) / H * 100 < 20;                       // still under the 20%-equity PMI threshold', '        return true;');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_num', '_groundsEquityBarHTML', '_moatPmiUnder20', '_moatPmiBarHTML'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build(accounts) {
  const body = NAMES.map(extract).join('\n') + '\nreturn { pmi:_moatPmiBarHTML, under20:_moatPmiUnder20 };';
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
  const under20 = (accts) => build(accts).under20(accts.find(a => a.id === 'm1'));

  // ── FIRES: H=500k, bal=450k → equity 50k = 10.0%; principal to 20% = $50,000; PMI $200 ──
  const fire = pmiOf([prop(500000), mtg({})]);
  need('(FIRES) renders the reused equity bar + 20% marker',
    fire.includes('🎯 PMI drop-off') && fire.includes('height:14px') && fire.includes('left:20%'));
  need('(FIRES) reworded beat, equity to one decimal ("about 10.0% equity")', fire.includes("You're at about 10.0% equity"));
  need('(FIRES) beat spells the cause→effect (pay principal → reach 20% → PMI back)',
    fire.includes('paying down about $50,000 more in principal reaches 20%') &&
    fire.includes('PMI (about $200/mo) typically drops off and comes back to you'));

  // ── GUARDS (sourced-or-blank) ──
  need('(GUARD) no PMI charged → nothing', pmiOf([prop(500000), mtg({ pmiMonthly: 0 })]) === '');
  need('(GUARD) no linked home value → nothing', pmiOf([mtg({ linkedAssetId: null })]) === '');
  need('(GUARD) zero balance → nothing', pmiOf([prop(500000), mtg({ value: 0 })]) === '');
  need('(GUARD) already >=20% equity → nothing', pmiOf([prop(600000), mtg({ value: 450000 })]) === '');

  // ── MORTGAGE-ONLY: a linked HELOC must NOT change the PMI equity/principal ──
  need('(MORTGAGE-ONLY) a linked HELOC does not change the beat',
    pmiOf([prop(500000), mtg({}), heloc]).includes("You're at about 10.0% equity"));

  // ── _moatPmiUnder20 direct (the single source of truth) ──
  need('(TEST) under20 = true at 10% equity with PMI', under20([prop(500000), mtg({})]) === true);
  need('(TEST) under20 = false at >=20% equity', under20([prop(600000), mtg({ value: 450000 })]) === false);
  need('(TEST) under20 = false with no PMI', under20([prop(500000), mtg({ pmiMonthly: 0 })]) === false);
}

// served bytes
need('(WIRED) mortgage modal renders _moatPmiBarHTML (in its live container)', /_moatPmiBarHTML\(id, acc\)/.test(s));
need('(CONSISTENCY) §1.6 DI PMI clause gated on _moatPmiUnder20', /var pmiC = _moatPmiUnder20\(acc\) \?/.test(s));
need('(CONSISTENCY) escrow-footer PMI clause gated on _moatPmiUnder20', /var pmiClause = _moatPmiUnder20\(acc\) \?/.test(s));
need('(CONSISTENCY) no bare pmi>0 PMI-dropoff clause remains', !/pmi > 0 \? ' ?(Your )?PMI drops off/.test(s));

let pass = 0;
for (const [label, ok2] of checks) { console.log((ok2 ? '✅' : '⛔') + ' ' + label); if (ok2) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the equity threshold removed.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the PMI nudge ignores the 20%-equity threshold.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
