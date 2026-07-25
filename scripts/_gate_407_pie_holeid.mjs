/* DEV-ONLY red-first gate — #407 (A): the debt donut's gradient id must be UNIQUE PER COMPOSER.

   THE BUG: _debtDonutSVG hard-coded <radialGradient id="moatPieHole"> and referenced url(#moatPieHole). An HTML
   id must be unique in a document, but url(#id) resolves against the FIRST match in DOCUMENT ORDER — so with the
   Moat pie and the Yard pie both in the DOM, one donut painted its centre hole from the OTHER donut's gradient.
   Latent while only one pie could be on screen; ordinary once §3b made the Moat pie render by default.

   THE FIX: the caller supplies holeId. Moat keeps 'moatPieHole' (so the §19.7 frozen byte-compare fixture stays
   byte-identical); the Yard uses 'yardPieHole'. Per-composer STATIC ids, not a per-call counter — determinism is
   what that frozen fixture depends on.

   Asserts the real defect, not a proxy: every donut's url(#...) must point at ITS OWN id, and two donuts
   co-resident must contribute NO duplicate id.

   --redfirst restores the hard-coded id in the drawer -> co-residency produces a duplicate id and the Yard's
   reference resolves to the Moat's gradient. Anchored on the drawer's parameter list (stable structure). */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

// (B) — roots only. Writing this gate is what finally proved hand-listing untenable: _yardDebtPieHTML reaches
// _yardNetEquity, which reaches _groundsLinkedDebt, and two successive hand-lists still missed one.
let body = extractClosure(src, ['_moatDebtPieHTML', '_yardDebtPieHTML'], { exclude: ['getBaseType'] });

const ANCHOR = 'function _debtDonutSVG(slices, centerPct, centerSub, title, holeId) {';
if (!body.includes(ANCHOR)) throw new Error('red-first anchor missing — the drawer signature moved');
if (RED) {
  // regress to ONE hard-coded id for every donut — the exact pre-fix state
  body = body.replace("holeId = holeId || 'debtPieHole';", "holeId = 'moatPieHole';");
}

const PROP = 'p1';
const MORT = { id: 'm1', baseId: 'mortgage_joint', linkedAssetId: PROP, origAmount: '400000', value: '300000', interestPaidToDate: '31684.35' };
const HEL  = { id: 'h1', baseId: 'heloc_primary',  linkedAssetId: PROP, value: '40000' };
const PROPACC = { id: PROP, baseId: 'property', value: '500000' };

const deps = {
  getBaseType: (b) => {
    const s = String(b);
    return { id: s, title: s.indexOf('heloc') === 0 ? 'HELOC' : s.indexOf('mortgage') === 0 ? 'Mortgage' : 'Real Estate',
             taxCode: (s.indexOf('heloc') === 0 || s.indexOf('mortgage') === 0) ? 'debt' : 'asset' };
  },
  state: { accounts: [PROPACC, MORT, HEL] }
};
const api = new Function(...Object.keys(deps), body + '\nreturn { _moatDebtPieHTML, _yardDebtPieHTML };')(...Object.values(deps));

const moat = api._moatDebtPieHTML(MORT);
const yard = api._yardDebtPieHTML(PROP);

const ids  = (h) => (String(h).match(/id="([^"]+)"/g) || []).map(x => x.slice(4, -1));
const refs = (h) => (String(h).match(/url\(#([^)]+)\)/g) || []).map(x => x.slice(5, -1));

const checks = [];
const need = (l, c) => checks.push([l, !!c]);

need('both composers actually rendered a donut (never assert on an empty string)',
  moat.includes('<svg') && yard.includes('<svg'));

need('Moat donut keeps id="moatPieHole" (frozen §19.7 fixture stays byte-identical)', ids(moat).includes('moatPieHole'));
need('Yard donut uses a DISTINCT id="yardPieHole"', ids(yard).includes('yardPieHole') && !ids(yard).includes('moatPieHole'));

// THE REAL DEFECT: each donut's reference must resolve to its OWN gradient, not a neighbour's.
need('Moat url(#...) points at the Moat\'s own id', refs(moat).length === 1 && refs(moat)[0] === ids(moat)[0]);
need('Yard url(#...) points at the Yard\'s own id', refs(yard).length === 1 && refs(yard)[0] === ids(yard)[0]);

// CO-RESIDENCY — the condition that makes it a bug at all.
const together = moat + yard;
const all = ids(together);
const dupes = all.filter((v, i) => all.indexOf(v) !== i);
need('co-resident: NO duplicate id in the combined document', dupes.length === 0);
need('co-resident: two DISTINCT gradients resolve independently', new Set(refs(together)).size === 2);

// A future composer that forgets the argument must not emit id="undefined".
const naked = new Function(...Object.keys(deps), body + '\nreturn _debtDonutSVG;')(...Object.values(deps))(
  [{ label: 'X', val: 10, color: 'red' }], 50, 'SUB', 'TITLE');
need('omitted holeId falls back to a real id (never id="undefined")',
  !naked.includes('id="undefined"') && !naked.includes('url(#undefined)') && naked.includes('debtPieHole'));

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with one hard-coded id.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate catches the duplicate-id collision.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
