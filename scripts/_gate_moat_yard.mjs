/* DEV-ONLY red-first gate — 🌳 THE YARD (Yard Copy Bank). The merged estate tile now opens a combined
   cost-of-ownership modal instead of the Real Estate modal, and surfaces a DE-DUPED real-monthly cost.
   Asserts:
     (DE-DUPE)  _yardRealMonthly = P&I + (PMI + Other) + carry/12 [tax+ins ONCE, from carry] + drawn-HELOC pmt.
                Tax/insurance are NOT double-counted (the §16.5 lesson). Every term sourced-or-blank (L47):
                no mortgage → no P&I/escrow; HELOC-only Yard → carry + drawn line only.
     (ROUTING)  the merged tile's click calls openYardModal (datum-estate.js), not openAccountModal.
     (LABEL)    the tile restacks to THE YARD / brand sub-line / Net Equity: {figure}.
     (MODAL/DI) openYardModal + the retirement-lens DI rules ship in the served bytes.
   --redfirst (1) re-adds tax/ins to the escrow term (naive double-count) and (2) reverts routing to
   openAccountModal -> the de-dupe check + the routing check bite. */
import { readFileSync } from 'node:fs';
import { extractClosure, lift } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const NOMAP = process.argv.includes('--nomap');   // 593d specific-finding mutation — see the NAMES block
let sStudio = studioSource();
let sEstate = readFileSync('scripts/datum-estate.js', 'utf8');

if (RED) {
  sStudio = sStudio.replace(
    "        var escrowExtra = m ? (_num(m.pmiMonthly) + _num(m.mortgageOtherCost) / 12) : 0;   // PMI + Other only; tax/ins live in carry (DE-DUPE)",
    "        var escrowExtra = m ? (_num(m.propTaxAnnual)/12 + _num(m.insAnnual)/12 + _num(m.pmiMonthly) + _num(m.mortgageOtherCost) / 12) : 0;");
  sEstate = sEstate.replace('gf.setAttribute(\'onclick\', "openYardModal(\'', 'gf.setAttribute(\'onclick\', "openAccountModal(\'');
}
/* --nomap · THE SPECIFIC-FINDING MUTATION FOR THE 593d NAME LEGS (§13.17: a red-first proves nothing
   unless it proves WHICH assertion failed). Drops ONE entry — 'Rental property' — from the §19.1 map.
   That is the honest shape of the failure we fear: not a map that vanishes, but a map that quietly
   loses a row and falls through to the shipped name, which looks exactly like correct behaviour on
   every other purpose. The NAMES legs below must go red and must NAME the rental leg. */
if (NOMAP) sStudio = sStudio.replace("        'Rental property':   'The Rental',\n", '');

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ROOTS, not a hand-list. A hand-typed callee list rots the moment a function gains a new callee:
// every gate slicing its caller then dies with "ReferenceError: <fn> is not defined" — a red that
// says nothing about the room. That is exactly what killed the eight HELOC gates. extractClosure
// walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_yardRealMonthly'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, taxCode: 'physical' };
  if (id.indexOf('mortgage') === 0) return { id, taxCode: 'debt' };
  if (id.indexOf('heloc') === 0) return { id, taxCode: 'debt' };
  return { id, taxCode: 'other' };
};
function build(accounts) {
  const body = extractClosure(sStudio, ROOTS) + '\nreturn { real:_yardRealMonthly };';
  return new Function('state', 'getBaseType', body)({ accounts }, getBaseType);
}
let err = '', e = null;
try { e = build([]); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  // Mortgage Yard: home 500k; P&I 2000; escrow tax 12k + ins 2.4k + pmi 100 + other 1.2k; balance 400k.
  const mYard = [
    { id: 'p1', baseId: 'property_primary', value: 500000 },
    { id: 'm1', baseId: 'mortgage_primary', linkedAssetId: 'p1', minPmt: 2000, addPmt: 0, propTaxAnnual: 12000, insAnnual: 2400, pmiMonthly: 100, mortgageOtherCost: 1200, value: 400000 }
  ];
  // De-duped: 2000 P&I + (100 pmi + 100 other) + 1200 carry(tax+ins) = 3400. NAIVE double-count would be 4600.
  need('(DE-DUPE) tax+ins counted ONCE — real monthly = $3,400, not $4,600', Math.round(build(mYard).real('p1')) === 3400);

  // HELOC-only Yard: home 500k; property tax 6k + ins 1.8k; HELOC drawn 30k, pmt 300.
  const hYard = [
    { id: 'p2', baseId: 'property_primary', value: 500000, propTaxYr: 6000, homeInsYr: 1800 },
    { id: 'h2', baseId: 'heloc_primary', linkedAssetId: 'p2', value: 30000, minPmt: 300, addPmt: 0 }
  ];
  need('(SOURCED) HELOC-only Yard = carry $650 + drawn line $300 = $950 (no P&I/escrow)', Math.round(build(hYard).real('p2')) === 950);
  // Undrawn HELOC adds no payment.
  const hUndrawn = [{ id: 'p3', baseId: 'property_primary', value: 500000, propTaxYr: 6000, homeInsYr: 1800 }, { id: 'h3', baseId: 'heloc_primary', linkedAssetId: 'p3', value: 0, minPmt: 300 }];
  need('(SOURCED) an UNDRAWN HELOC adds no payment — real monthly = carry $650 only', Math.round(build(hUndrawn).real('p3')) === 650);
}

// ── served bytes — studio.html (modal + DI) ──
need('(MODAL) openYardModal defined', /window\.openYardModal = function/.test(sStudio));
need('(DI) retirement-lens engine present (Rule A negative-bond)', sStudio.includes('behaves like a bond you’ve sold short'));
need('(DI) calm line Z present', sStudio.includes('sit in quiet balance'));
need('(SECTIONS) all four sections rendered', sStudio.includes("'The Property'") && sStudio.includes("'The Mortgage'") && sStudio.includes('The Real Cost of Ownership') && sStudio.includes('Share of income'));
need('(CLICKABLE) property/mortgage/HELOC headers open their own room via secHead', sStudio.includes('var secHead = function') && sStudio.includes("openAccountModal(\\'") && sStudio.includes("secHead('🏰', m.id") && sStudio.includes("secHead('🍷', h.id"));
need('(TOOLTIP) Yard hovers open downward (top:100%), not off the top', /var hov = function[\s\S]*?top:100%; bottom:auto;/.test(sStudio));
/* (ROOM→YARD) — RE-GROUNDED in the 593d fix, for the SECOND time this arc and the same reason
   (§13.56). It quoted the literal '🌳 Open The Yard — the combined view', which §19.14 replaced with
   the §12.1 token because a landlord was clicking a door named THE YARD to enter THE HOLDING. The
   literal is gone by design, so the leg had to move to the meaning: tokenised, type-first fallback,
   still property-gated, and — the one that would have caught my own near-miss — resolving the REAL
   account rather than the synthetic {id, baseId} literal that carries no propPurpose. */
need('(ROOM→YARD) the door is TOKENISED on the §12.1 map, not a hard-coded room name',
  /_yardDoorCopy = _yardDoorName \? \('Open ' \+ _yardDoorName \+ ' — the combined view'\)/.test(sStudio));
need('(ROOM→YARD) the fallback is TYPE-FIRST — never a brand noun for a room you are not standing in',
  sStudio.includes("'Open the combined view'"));
need('(ROOM→YARD) the door resolves the REAL account, not the synthetic {id,baseId} literal',
  /_yardAcc = \(state\.accounts \|\| \[\]\)\.find/.test(sStudio) && /_propCombinedName\(_yardAcc\)/.test(sStudio));
need('(ROOM→YARD) still property-gated and still routes to openYardModal',
  /indexOf\('property'\) === 0[\s\S]*?openYardModal\(/.test(sStudio));
need('(ROOM→YARD) the retired literal is GONE — presence/absence pair with the token above',
  !sStudio.includes('🌳 Open The Yard — the combined view'));

// ── served bytes — datum-estate.js (routing + label restack) ──
need('(ROUTING) merged tile opens The Yard', /if \(_moatDebts\.length\) gf\.setAttribute\('onclick', "openYardModal\('/.test(sEstate));
/* (LABEL) — RE-GROUNDED IN 593d. This asserted `sEstate.includes('>THE YARD<')`, a SOURCE LITERAL.
   §12.12 replaced that literal with the §12.1 resolver, so the leg went red while the rendered tile
   was byte-identical for a primary residence. A LEG THAT QUOTES A LITERAL TESTS THE SPELLING, NOT THE
   BEHAVIOUR, and it rots the first time the code legitimately changes. It now asserts the two things
   the original MEANT: the tile is driven by the map rather than hard-coded, and the map still yields
   THE YARD for the fixture the original leg had in mind. The behavioural half lives in NAMES below. */
need('(LABEL) tile line 1 reads the §12.1 map, not a hard-coded name', /y="\$\{gY \+ gH - 48\}"[^>]*>\$\{_combinedNameOf\(propertyAccount\)\.toUpperCase\(\)\}</.test(sEstate));
need('(LABEL) tile keeps the Net Equity line', sEstate.includes('Net Equity: '));
need('(LABEL) tile line 2 reads the §19.1 map for its room token', /_grLabel = _roomNameOf\(propertyAccount,[\s\S]{0,80}_lienMetaSuffix\(_moatDebts\)/.test(sEstate));
need('(LABEL) lien tokens are UNCHANGED by purpose (§12.12)', /function _lienMetaSuffix\(debts\)[\s\S]{0,220}getBaseType\(debts\[i\]\.baseId\)\.meta\.toUpperCase\(\)/.test(sEstate));

/* ── §19.1 / §12.1 / §19.8 · THE NAME MAPS, EXERCISED RATHER THAN GREPPED ──────────────────────────
   Lifted from studio.html and CALLED. A map is a lookup table, so a gate that greps for its rows is a
   second copy of the truth; these run the resolver and read what comes back. §13.21 lift() handles the
   `var` maps, which a function extractor cannot see. */
const nameBase = (baseId) => {
  const id = String(baseId);
  return id.indexOf('property') === 0 ? { id, taxCode: 'physical', meta: 'The Grounds' } : { id, taxCode: 'other', meta: 'The Vault' };
};
const isPropertyBaseStub = (base) => !!(base && String(base.id).indexOf('property') === 0);
function buildNames(accounts) {
  const body = ['PROP_ROOM_NAME', 'PROP_COMBINED_NAME', '_propRoomName', '_propCombinedName', '_propIsNamed', '_propNameCollision', '_propCollisionNudge']
    .map((n) => lift(sStudio, n)).join('\n') +
    '\nreturn { room:_propRoomName, comb:_propCombinedName, nudge:_propCollisionNudge };';
  return new Function('state', 'getBaseType', 'isPropertyBase', body)({ accounts: accounts || [] }, nameBase, isPropertyBaseStub);
}
{
  const N = buildNames([]);
  const P = (propPurpose) => ({ id: 'x', baseId: 'property_primary', propPurpose });
  const B = nameBase('property_primary');
  const room = (p) => N.room(P(p), B), comb = (p) => N.comb(P(p));

  // §19.1 — all six purposes, the authored map
  need('(NAMES §19.1) blank -> The Grounds', room('') === 'The Grounds' && room(undefined) === 'The Grounds');
  need('(NAMES §19.1) Primary residence -> The Residence', room('Primary residence') === 'The Residence');
  need('(NAMES §19.1) Second home -> The Vacation Home', room('Second home') === 'The Vacation Home');
  need('(NAMES §19.1) Rental property -> The Rental', room('Rental property') === 'The Rental');
  need('(NAMES §19.1) Land -> The Acreage', room('Land') === 'The Acreage');
  need('(NAMES §19.1) Other -> The Grounds (falls back)', room('Other') === 'The Grounds');
  // §19.2 — THE LEG THAT MATTERS: cycle every purpose and come BACK to blank.
  need('(NAMES §19.2) blank RESTORES to The Grounds after cycling all six',
    ['', 'Primary residence', 'Second home', 'Rental property', 'Land', 'Other', ''].map(room).pop() === 'The Grounds');
  // §12.1 — the combined tile
  need('(NAMES §12.1) blank + Primary + Other -> The Yard', comb('') === 'The Yard' && comb('Primary residence') === 'The Yard' && comb('Other') === 'The Yard');
  need('(NAMES §12.1) Second home -> The Retreat', comb('Second home') === 'The Retreat');
  need('(NAMES §12.1) Rental property -> The Holding', comb('Rental property') === 'The Holding');
  need('(NAMES §12.1) Land -> The Reserve', comb('Land') === 'The Reserve');
  // FAIL CLOSED — a purpose nobody has thought of yet inherits NOTHING.
  need('(NAMES) an UNRECOGNISED purpose falls through to the shipped names, never invents one',
    room('Houseboat') === 'The Grounds' && comb('Houseboat') === 'The Yard');
  // §19.4 — a non-property room can never take a §19 name, even carrying the field.
  need('(NAMES §19.4) a NON-property room never takes a §19 name',
    N.room({ id: 'v', baseId: 'vault_primary', propPurpose: 'Rental property' }, nameBase('vault_primary')) === 'The Vault');

  // §19.8 — identity, not type.
  const two = [{ id: 'r1', baseId: 'property_primary', propPurpose: 'Rental property' },
               { id: 'r2', baseId: 'property_primary', propPurpose: 'Rental property' }];
  const N2 = buildNames(two);
  need('(NAMES §19.8) first unnamed tile of a colliding pair stays clean', N2.nudge(two[0], B) === '');
  need('(NAMES §19.8) the SECOND unnamed tile carries the nudge, verbatim',
    N2.nudge(two[1], B) === 'Two rooms are both called the rental. Give this one a name so you can tell them apart.');
  need('(NAMES §19.8) NEVER auto-numbered — no digit reaches any rendered name',
    !/\d/.test(N2.nudge(two[1], B).replace('Two rooms', '')) && !/\d/.test(N2.room(two[1], B)));
  const named = [{ id: 'r1', baseId: 'property_primary', propPurpose: 'Rental property', name: 'Lake House' },
                 { id: 'r2', baseId: 'property_primary', propPurpose: 'Rental property' }];
  const N3 = buildNames(named);
  need('(NAMES §19.8) a NAMED property never collides and never nudges', N3.nudge(named[0], B) === '');
  need('(NAMES §19.8) an unnamed room alone with a NAMED twin does not nudge either', N3.nudge(named[1], B) === '');
  const solo = [{ id: 'r1', baseId: 'property_primary', propPurpose: 'Rental property' }];
  need('(NAMES §19.8) a lone rental is NOT nudged — most users are this user', buildNames(solo).nudge(solo[0], B) === '');
  // PRESENCE — the collision machinery must be reachable at all, or every leg above is empty==empty.
  need('(NAMES §19.8) PRESENCE: the nudge CAN fire — the pair above proves both sides exist', N2.nudge(two[1], B).length > 0);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on naive double-count + old routing.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate FAILS on the double-counted real-monthly and the un-swapped routing.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
