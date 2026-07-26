'use strict';
/* DATA-LOSS GATE (red-first) — an unsaved Studio edit must survive leave-and-return.
 *
 * THE REPORTED INJURY (Captain, 2026-07-26): make changes in the Studio, leave WITHOUT hitting save,
 * come back — the work is gone. Hitting save+overwrite always persists correctly.
 *
 * THE MECHANISM. There is no continuous D1 autosave: d1WriteStudio has exactly ONE call site, inside
 * save(). Ordinary editing ends at writeSessionDraft (sessionStorage). But load() early-returned the
 * moment a D1 doc was present, so readSessionDraft() was UNREACHABLE and the last SAVED doc silently
 * replaced the newer unsaved edit. That early return WAS the loss.
 *
 * WHY A STAMP HAD TO BE ADDED. bp.saved_at is written by save() ALONE, so an edited draft and the saved
 * D1 doc carry the SAME saved_at. "Prefer the newer" had no discriminator and tied on every edit. The
 * draft is therefore stamped with _draftAt on write (sessionStorage only; toD1Document strips it, so it
 * never reaches D1 and explicit-save semantics are untouched).
 *
 * MUTATION
 *   --unconditional  restores the unconditional early return -> the unsaved edit is LOST, reproducing
 *                    the Captain's symptom exactly.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const UNCOND = process.argv.includes('--unconditional');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const A_GUARD = `      var _sd = opts.ignoreDraft ? null : readSessionDraft();
      if (!(_sd && _draftIsNewer(_sd, opts.d1Doc))) {`;
const UNCOND_SRC = `      var _sd = null;
      if (true) {`;

let src = fs.readFileSync(path.join(ROOT, 'scripts', 'studio-blueprint.js'), 'utf8');
if (UNCOND) {
  const n = src.split(A_GUARD).length - 1;
  if (n !== 1) throw new Error(`anchor guard: expected exactly 1 occurrence, found ${n}`);
  src = src.replace(A_GUARD, UNCOND_SRC);
}

// Minimal browser shims — this gate exercises the STORE decision, not the DOM.
function mkStore() {
  const m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); },
           removeItem: (k) => { delete m[k]; }, clear: () => { for (const k in m) delete m[k]; }, _m: m };
}
const sandbox = {
  console, JSON, Date, Math, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout, TextEncoder,
  sessionStorage: mkStore(), localStorage: mkStore(),
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
              addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
              body: { appendChild: () => {} }, head: { appendChild: () => {} } },
  location: { search: '', pathname: '/studio.html', href: 'http://localhost/studio.html' },
  history: { replaceState: () => {} },
  navigator: { userAgent: 'gate' },
  addEventListener: () => {}
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'studio-blueprint.js' });
const SB = sandbox.DatumBlueprint;
const INT = SB && SB._internal;
ok(!!(SB && SB.load && INT && INT.writeSessionDraft && INT.readSessionDraft),
  'studio-blueprint.js loads in isolation and exposes load() + the session-draft pair');

const ROOMS = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: tag + i, baseId: 'taxable_primary', name: tag + ' room ' + i, value: 1000 * (i + 1), holdings: [] }));
function savedDoc(rooms, savedAt, updatedAt, rev) {
  return { payload: JSON.stringify({ schema: 'DatumFIBlueprintV1', version: '1.0.1',
    saved_at: savedAt, profile: { primary_name: 'Primary Architect' },
    accounts: rooms, datum: { net_datum_v1: 100000 } }), revision: rev || 3, updated_at: updatedAt };
}
const names = (bp) => (bp && bp.accounts || []).map((a) => a.name).join('|');

// ═══ 1 · THE INJURY — edit after the last save, then leave and return ═══════════════════════════
// D1 holds the SAVED doc (2 rooms, written 10:00). The user then edits in the tab: the draft carries
// 5 rooms and a LATER _draftAt. Returning must hydrate the EDIT, not the saved doc.
sandbox.sessionStorage.clear();
const D1_SAVED = savedDoc(ROOMS('saved', 2), '2026-07-26T10:00:00Z', '2026-07-26T10:00:00Z');
INT.writeSessionDraft({ schema: 'DatumFIBlueprintV1', version: '1.0.1',
  saved_at: '2026-07-26T10:00:00Z',                       // SAME stamp as the saved doc — this is the point
  profile: { primary_name: 'Primary Architect' }, accounts: ROOMS('edited', 5), datum: { net_datum_v1: 100000 } });
// the draft was written "now", which is after 10:00 — _draftAt is stamped by writeSessionDraft itself.

let got = SB.load({ d1Doc: D1_SAVED });
ok((got.accounts || []).length === 5 && names(got).indexOf('edited') >= 0,
  'THE UNSAVED EDIT SURVIVES leave-and-return (got ' + (got.accounts || []).length + ' rooms: ' + names(got).slice(0, 40) + ') [BITE unconditional]');

const stamped = JSON.parse(sandbox.sessionStorage.getItem('datumfi_blueprint_draft_v1'));
ok(typeof stamped._draftAt === 'string' && !isNaN(Date.parse(stamped._draftAt)),
  'writeSessionDraft stamps _draftAt — the comparator has a real discriminator');
ok(stamped._draftAt.charAt(0) === '2' && '_draftAt'.charAt(0) === '_',
  '_draftAt is underscore-prefixed, so toD1Document strips it and it never reaches D1');

// ═══ 2 · NEGATIVE — after an EXPLICIT SAVE, D1 is newer and MUST still win ══════════════════════
// Save semantics are the whole reason we did not autosave ordinary edits. A save writes D1 at a LATER
// updated_at than the draft's stamp, so the saved doc must be what comes back.
sandbox.sessionStorage.clear();
INT.writeSessionDraft({ accounts: ROOMS('stale-draft', 3), saved_at: '2026-07-26T09:00:00Z' });
const D1_NEWER = savedDoc(ROOMS('just-saved', 7), '2026-07-26T23:59:00Z', '2099-01-01T00:00:00Z');
got = SB.load({ d1Doc: D1_NEWER });
ok((got.accounts || []).length === 7 && names(got).indexOf('just-saved') >= 0,
  'NEGATIVE: after an explicit save the D1 doc is newer and STILL wins — save keeps its meaning');

// ═══ 3 · NEGATIVE — no draft at all: D1 hydrates exactly as before ══════════════════════════════
sandbox.sessionStorage.clear();
got = SB.load({ d1Doc: savedDoc(ROOMS('only-d1', 4), '2026-07-26T10:00:00Z', '2026-07-26T10:00:00Z') });
ok((got.accounts || []).length === 4 && names(got).indexOf('only-d1') >= 0,
  'NEGATIVE: with no session draft, the D1 doc hydrates unchanged');

// ═══ 4 · L47 — an UNPARSEABLE/missing stamp is never guessed at ═════════════════════════════════
// Falls to the tiebreak: prefer whichever side actually HAS rooms; if both do, D1 keeps today's win.
sandbox.sessionStorage.clear();
sandbox.sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ accounts: ROOMS('nostamp', 6), _draftAt: 'not-a-date' }));
got = SB.load({ d1Doc: savedDoc(ROOMS('d1-side', 2), '2026-07-26T10:00:00Z', 'also-not-a-date') });
ok((got.accounts || []).length === 2 && names(got).indexOf('d1-side') >= 0,
  'L47: both stamps unparseable and BOTH sides have rooms -> D1 wins (today\'s behaviour), nothing invented');

sandbox.sessionStorage.clear();
sandbox.sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ accounts: ROOMS('rescue', 3) }));
got = SB.load({ d1Doc: savedDoc([], '2026-07-26T10:00:00Z', 'bad') });
ok((got.accounts || []).length === 3,
  'L47 tiebreak: unparseable stamps + an EMPTY D1 doc -> the draft with rooms wins (accounts never silently dropped)');

console.log('MODE: ' + (UNCOND ? 'unconditional' : 'CLEAN') + '   |   Studio unsaved-edit survival (store-level)');
lines.forEach((l) => console.log('  ' + l));
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
