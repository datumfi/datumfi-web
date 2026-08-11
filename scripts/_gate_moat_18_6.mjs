/* DEV-ONLY red-first gate — §18.6: ALL linked liens merge onto their asset on the estate canvas (was
   first-link-wins), + a type-first 🔗 mirror chip. Off the real datum-estate.js helpers:
     (ALL-LIENS)  net equity = assetValue − SUM(every linked debt balance), not just the first (Property Copy
                  Bank §0.4 R9 / §1.2 R13).
     (SOURCED)    L47 — a lien with no sourced balance contributes 0 to the sum (never guessed).
     (NAMED)      the estate LABEL names every lien in brand flavor (decision 1); the 🔗 hover names them TYPE-
                  first ("Your mortgage"/"Your HELOC", never brand, never "Home") and fires the HELOC clause.
     (CHIP)       the 🔗 link chip is rendered on the merged Grounds tile and the per-room merge, with the notice.
   --redfirst reverts _lienSum to first-lien-only -> the all-liens net-equity check bites. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('scripts/datum-estate.js', 'utf8');

if (RED) {
  s = s.replace(
    'function _lienSum(debts) { var s = 0; for (var i = 0; i < debts.length; i++) { var v = parseFloat(debts[i].value) || 0; if (v > 0) s += v; } return s; }',
    'function _lienSum(debts) { var v = debts[0] ? (parseFloat(debts[0].value) || 0) : 0; return v > 0 ? v : 0; }');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ROOTS, not a hand-list. A hand-typed callee list rots the moment a function gains a new callee:
// every gate slicing its caller then dies with "ReferenceError: <fn> is not defined" — a red that
// says nothing about the room. That is exactly what killed the eight HELOC gates. extractClosure
// walks the real callees out of studio.html, so a new one is picked up automatically.
const ROOTS = ['_lienSum', '_netEquityOf', '_lienMetaSuffix', '_lienMirrorNotice'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('mortgage') === 0) return { id, meta: 'The Moat' };
  if (id.indexOf('heloc') === 0) return { id, meta: 'The Cellar' };
  return { id, meta: 'Other' };
};
function build() {
  const body = extractClosure(s, ROOTS) + '\nreturn { sum:_lienSum, eq:_netEquityOf, suffix:_lienMetaSuffix, notice:_lienMirrorNotice };';
  return new Function('getBaseType', body)(getBaseType);
}
let err = '', e = null;
try { e = build(); } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!e);

if (e) {
  const M = { baseId: 'mortgage_primary', value: 300000 };
  const H = { baseId: 'heloc_primary', value: 50000 };
  const Hblank = { baseId: 'heloc_primary', value: '' };

  need('(ALL-LIENS) net equity subtracts EVERY lien ($500k − 300k − 50k = 150k)', e.eq(500000, [M, H]) === 150000);
  need('(SOURCED) an unsourced lien contributes 0 ($500k − 300k − 0 = 200k)', e.eq(500000, [M, Hblank]) === 200000);
  need('(NAMED · brand label) every lien named in the estate label suffix', e.suffix([M, H]) === ' / THE MOAT / THE CELLAR');
  need('(NAMED · type-first hover) mortgage-only notice', e.notice([M], 'home') === '🔗 Your mortgage is linked here — its balance is subtracted from this home’s value to show your true equity.');
  need('(NAMED · type-first hover) HELOC clause fires when a HELOC also links', /Your HELOC is linked here too\.$/.test(e.notice([M, H], 'home')));
  need('(NAMED · type-first hover) HELOC-only leads with HELOC', e.notice([H], 'home').startsWith('🔗 Your HELOC is linked here —'));
  need('(NO BRAND in hover) the type-first hover never says The Moat/Cellar or "Home"',
    !/The Moat|The Cellar|\bHome\b/.test(e.notice([M, H], 'home')));
}

// served bytes: all-liens map + chip on both merge sites + no first-link-wins remnant
need('(WIRED) all-liens map _mergeDebtsByAsset (first-link-wins gone)', s.includes('_mergeDebtsByAsset') && !/_mergeDebtByAsset\b/.test(s));
need('(WIRED) Grounds net equity via _netEquityOf(propertyAccount.value', s.includes('_netEquityOf(propertyAccount.value, _moatDebts)'));
need('(CHIP) 🔗 link chip rendered on the Grounds tile', /_linkChipSVG\(gX \+ gW\/2 - 13/.test(s) && s.includes('class="link-chip"'));
/* ⚠️ RE-ANCHORED 2026-08-11 (§25.4). The per-room merge chip moved from an inline block in the column
   loop into the shared _roomTileSVG emitter, so `_mergeChip` and the `${_mergeChip}` interpolation no
   longer exist by those names. THE GATE WAS RIGHT TO GO RED — the text it pinned genuinely vanished —
   and the behaviour was separately proven UNCHANGED by an old-vs-new render diff (the merged-lien
   scene is byte-identical, chip included). ⛔ THE CLAIM IS UNCHANGED; ONLY THE ANCHOR MOVED.
   🔑 IT NOW PINS THE CALL AND ITS ARGUMENTS RATHER THAN A VARIABLE NAME — the arguments are the
   behaviour, the name is spelling, and pinning spelling is what made this leg brittle. */
need('(CHIP) 🔗 link chip rendered on the per-room merge',
  /_linkChipSVG\(d\.x \+ 6, d\.y \+ 6, _lienMirrorNotice\(mergeDebts, 'asset'\)\)/.test(s) && /\bchip\b/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on first-lien-only net equity.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when only the first lien is subtracted.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
