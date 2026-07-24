/* DEV-ONLY red-first gate — #407 §20 item #9: "Purpose / Notes" renders LAST in EVERY estate modal.
   #380 — this asserts the RENDERED modal, not the source order. It EXECUTES the real
   window.openAccountModal builder out of studio.html inside a `with(Proxy)` sandbox that auto-stubs every
   helper it doesn't need, captures what the builder assigns to #modal-dynamic-content, and checks the
   emitted HTML. The auto-stub is deliberate: the harness lesson from §19.7/§19.9 is that a gate which
   hand-lists a function's callees breaks the day that function gains one more — here, new helpers inside
   the builder resolve to a marker automatically and the gate keeps biting.

   THE ASSERTION (room-agnostic, survives later §20 commits that reorder a room's own fields):
     for each of 5 base types spanning every taxCode branch —
       1. the notes block renders exactly once,
       2. it renders INSIDE #modal-edu-collapse (so it still hides while decorating — W2/W6), and
       3. NOTHING follows it inside that collapse — it is the last content of the overview.
   --redfirst restores the pre-#9 position (notes emitted at the top, before the taxCode branches). The
   gate must then bite on every room that has any content of its own — i.e. the exact live symptom. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

// ── slice the real builder (brace-counting would trip over the template literals; anchor on the neighbours)
const st = src.indexOf('window.openAccountModal = function(id)');
const en = src.indexOf('window.closeAccountModal');
if (st < 0 || en < 0) throw new Error('openAccountModal anchors not found — re-ground by content');
let BUILDER = src.slice(st, en);
BUILDER = BUILDER.slice(0, BUILDER.lastIndexOf('};') + 2);

const NOTES_BLOCK = `html += \`
        <div style="margin-bottom: 20px;">
            <div class="input-label">Purpose / Notes</div>`;
if (BUILDER.indexOf(NOTES_BLOCK) < 0) throw new Error('notes block not found in the builder — re-ground by content');

// --redfirst: put the notes block back where it lived before #9 (top of the overview, ahead of every
// taxCode branch) by moving the whole emit — placeholder logic and all — above the pretax/roth branch.
function mutate(b) {
  if (!RED) return b;
  const i = b.indexOf('        let notePH = "e.g. Important notes...";');
  const j = b.indexOf('        html += \'</div>\';   // W2 — close #modal-edu-collapse');
  if (i < 0 || j < 0 || i > j) throw new Error('--redfirst: cannot locate the moved block');
  const moved = b.slice(i, j);
  const rest = b.slice(0, i) + b.slice(j);
  const anchor = "        if(base.taxCode === 'pretax' || base.taxCode === 'roth') {";
  const k = rest.indexOf(anchor);
  if (k < 0) throw new Error('--redfirst: cannot locate the old position');
  return rest.slice(0, k) + moved + rest.slice(k);
}

// ── the five rooms: one per taxCode branch the builder switches on
const BASES = {
  mortgage_primary: { id: 'mortgage_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'Mortgage', meta: 'The Moat' },
  savings_primary:  { id: 'savings_primary', type: 'primary', taxCode: 'liquid', hasInflow: true, hasInterest: true, title: 'Savings', meta: 'The Safe' },
  property_primary: { id: 'property_primary', type: 'primary', taxCode: 'physical', title: 'Real Estate', meta: 'The Grounds' },
  rothira:          { id: 'rothira', type: 'primary', taxCode: 'roth', hasInflow: true, isInvestment: true, title: 'Roth IRA', meta: 'The Conservatory' },
  k401_primary:     { id: '401k_primary', type: 'primary', taxCode: 'pretax', hasInflow: true, isInvestment: true, title: '401(k)', meta: 'The Treasury' }
};
const ACCTS = [
  { id: 'a1', baseId: 'mortgage_primary', name: 'Moat', value: 150000, intRate: 3.99, minPmt: 1200, addPmt: 0, origAmount: 200000, origDate: '2015-01-01', maturityDate: '2045-01-01', nextPmtDate: '2026-08-01', propTaxAnnual: 4800, insAnnual: 1800, notes: 'lender note' },
  { id: 'a2', baseId: 'savings_primary', name: 'Safe', value: 20000, intRate: 4.2, notes: '' },
  { id: 'a3', baseId: 'property_primary', name: 'Grounds', value: 400000, notes: '' },
  { id: 'a4', baseId: 'rothira', name: 'Conservatory', value: 90000, notes: '' },
  { id: 'a5', baseId: 'k401_primary', name: 'Treasury', value: 250000, notes: '' }
];

function render(builder, accId) {
  let captured = null;
  const mkEl = (id) => ({ id, style: {}, value: '', checked: false, classList: { add() {}, remove() {} },
    appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(v) { if (id === 'modal-dynamic-content') captured = v; }, get innerHTML() { return ''; } });
  const explicit = {
    document: { getElementById: (id) => mkEl(id), createElement: () => mkEl('new'), body: { appendChild() {} },
                querySelector: () => null, querySelectorAll: () => [] },
    window: { parseAgeFromDob: () => 52 },
    state: { accounts: ACCTS },
    getBaseType: (b) => BASES[b] || BASES.savings_primary,
    _fetchLivePrime: () => ({ then: () => {} }),
    activeModalId: null, console
  };
  // unknown helper → a traceable marker (never undefined, never a throw), so the builder always completes
  const mk = (name) => { const f = (...a) => '«' + name + '(' + a.filter(x => typeof x === 'string').join('|') + ')»'; f.toString = () => '«' + name + '»'; return f; };
  const scope = new Proxy({}, {
    has: () => true,
    get(t, k) { if (k === Symbol.unscopables) return undefined; const s = String(k);
      if (s in explicit) return explicit[s];
      if (s in t) return t[s];
      if (s in globalThis) return globalThis[s];   // Math / Date / JSON / parseFloat / …
      return mk(s); },
    set(t, k, v) { t[String(k)] = v; return true; }
  });
  new Function('__s__', 'with(__s__){' + builder + '}')(scope);
  explicit.window.openAccountModal(accId);
  if (captured == null) throw new Error('builder never wrote #modal-dynamic-content');
  return captured;
}

// matching </div> for the element carrying id="modal-edu-collapse" (start at its own opening tag)
function collapseClose(h) {
  const at = h.indexOf('id="modal-edu-collapse"');
  if (at < 0) return -1;
  const open = h.lastIndexOf('<div', at);
  const re = /<div\b|<\/div>/g; re.lastIndex = open; let d = 0, m;
  while ((m = re.exec(h))) {
    if (m[0] === '</div>') { d--; if (d === 0) return m.index; } else d++;
  }
  return -1;
}

const checks = [];
const need = (l, c) => checks.push([l, !!c]);
const builder = mutate(BUILDER);

for (const acc of ACCTS) {
  const room = BASES[acc.baseId].title;
  let h;
  try { h = render(builder, acc.id); }
  catch (e) { need(`${room}: modal renders`, false); console.log('   ↳ ' + e.message); continue; }

  const hits = (h.match(/Purpose \/ Notes/g) || []).length;
  need(`${room}: notes block renders exactly once`, hits === 1);
  if (hits !== 1) continue;

  const iNotes = h.indexOf('Purpose / Notes');
  const iEnd = h.indexOf('</textarea>', iNotes);
  const close = collapseClose(h);
  need(`${room}: #modal-edu-collapse found + balanced`, close > 0);
  need(`${room}: notes render INSIDE the collapse (still hides while decorating)`, close > 0 && iNotes < close);
  // the assertion that matters: nothing of the room's own content survives after the notes block
  const tail = (close > 0 && iEnd > 0) ? h.slice(iEnd + '</textarea>'.length, close) : 'X';
  const tailClean = tail.replace(/<\/div>/g, '').trim();
  need(`${room}: NOTHING follows the notes block inside the collapse (it is last)`, tailClean === '');
  if (tailClean !== '') console.log('   ↳ ' + tailClean.length + ' bytes still follow it, starting: ' + JSON.stringify(tailClean.slice(0, 90)));
}

// the write path must survive the move (same field, same account)
{
  const h = render(builder, 'a1');
  need('Mortgage: notes textarea still writes updateAccField(…,"notes")', /oninput="updateAccField\('a1', 'notes', this\.value\)"/.test(h));
  need('Mortgage: debt placeholder preserved', h.includes('e.g. Lender name, escrow details, account number...'));
  const p = render(builder, 'a3');
  need('Real Estate: physical placeholder preserved', p.includes('e.g. Address, Zillow link, appraisal notes...'));
  need('Mortgage: existing note value still round-trips', h.includes('>lender note</textarea>'));
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('❌ RED-FIRST FAILED — notes moved back to the top and nothing bit.'); process.exit(1); }
  console.log('✅ RED-FIRST OK — the pre-#9 position makes the gate bite.'); process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — Purpose / Notes is the last thing in every estate modal.');
