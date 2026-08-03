/* CALENDAR SWEEP 2026-08-03 — EXPIRY 2099. The 2099 stamp is a deliberate far-future sentinel so
   a 'newer than' comparison can never flip; left as a literal. A GATE MUST PRODUCE THE SAME VERDICT
   ON EVERY DAY OF THE YEAR. Correct shapes: _p8_studio_mechanics.js:280, _gate_heloc_variable_18a.mjs:49. */
'use strict';
/* DATA-LOSS GATE (red-first) — an unsaved Studio edit must survive leave-and-return, AND tab-close.
 *
 * THE REPORTED INJURY (Captain, 2026-07-26): make changes in the Studio, leave WITHOUT hitting save,
 * come back — the work is gone. Hitting save+overwrite always persists correctly.
 *
 * THE MECHANISM. There is no continuous D1 autosave: d1WriteStudio has exactly ONE call site, inside
 * save(). Ordinary editing ends at writeSessionDraft. But load() early-returned the moment a D1 doc
 * was present, so readSessionDraft() was UNREACHABLE and the last SAVED doc silently replaced the
 * newer unsaved edit. That early return WAS the loss. (Commit 1, 86137d8.)
 *
 * COMMIT 2 widens WHERE the draft lives — sessionStorage -> localStorage — so it survives TAB CLOSE,
 * and adds the 14-day freshness window: inside it a newer draft hydrates silently; outside it we
 * PROMPT (park the draft, paint the saved doc) — never auto-hydrate, never drop.
 *
 * WHY A STAMP HAD TO BE ADDED. bp.saved_at is written by save() ALONE, so an edited draft and the saved
 * D1 doc carry the SAME saved_at. "Prefer the newer" had no discriminator and tied on every edit. The
 * draft is therefore stamped with _draftAt on write (underscore-prefixed, so toD1Document strips it and
 * it never reaches D1 — explicit-save semantics untouched).
 *
 * MUTATIONS
 *   --unconditional  restores the unconditional early return -> the unsaved edit is LOST, reproducing
 *                    the Captain's original symptom exactly.
 *   --sessiononly    restores sessionStorage as the draft store -> the draft dies with the tab, which
 *                    is the half of the injury Commit 2 exists to close.
 *   --nohelper       restores a discard that only clears sessionStorage (i.e. studio.html's three
 *                    literal removeItem calls left un-rerouted) -> "discard" goes INERT and the
 *                    abandoned draft RESURRECTS through the boot comparator.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const UNCOND      = process.argv.includes('--unconditional');
const SESSIONONLY = process.argv.includes('--sessiononly');
const NOHELPER    = process.argv.includes('--nohelper');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

// Anchored on ONE stable DECLARATION inside load(), not on a multi-line block: neighbouring lines
// change as the surrounding logic grows, and an anchor that stops matching turns a negative control
// into a silent no-op. Forcing _sdNewer false makes the D1 early return unconditional again, which
// IS the original injury — the draft can never win.
const A_GUARD    = `      var _sdNewer = !!(_sd && _draftIsNewer(_sd, opts.d1Doc));`;
const UNCOND_SRC = `      var _sdNewer = false;`;

const A_READ  = `      var raw = localStorage.getItem(SESSION_DRAFT_KEY);`;
const A_WRITE = `    try { localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(obj)); _draftWriteState(true, null); return true; }`;
const A_CLEAR = `    try { localStorage.removeItem(SESSION_DRAFT_KEY); } catch (_e) {}
    try { sessionStorage.removeItem(SESSION_DRAFT_KEY); } catch (_e) {}`;

let src = fs.readFileSync(path.join(ROOT, 'scripts', 'studio-blueprint.js'), 'utf8');
const mutate = (from, to, label) => {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
  src = src.replace(from, to);
};
if (UNCOND)      mutate(A_GUARD, UNCOND_SRC, 'guard');
if (SESSIONONLY) {
  mutate(A_READ, `      var raw = sessionStorage.getItem(SESSION_DRAFT_KEY);`, 'read');
  mutate(A_WRITE, `    try { sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(obj)); _draftWriteState(true, null); return true; }`, 'write');
}
if (NOHELPER)    mutate(A_CLEAR, `    try { sessionStorage.removeItem(SESSION_DRAFT_KEY); } catch (_e) {}`, 'clear');

// Minimal browser shims — this gate exercises the STORE decision, not the DOM.
function mkStore(opts) {
  const m = {}; const o = opts || {};
  return { getItem: (k) => (k in m ? m[k] : null),
           setItem: (k, v) => { if (o.full) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m[k] = String(v); },
           removeItem: (k) => { delete m[k]; }, clear: () => { for (const k in m) delete m[k]; }, _m: m, _opts: o };
}
const events = [];
const sandbox = {
  console, JSON, Date, Math, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout, TextEncoder,
  sessionStorage: mkStore(), localStorage: mkStore(),
  CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  dispatchEvent: (e) => { events.push(e); return true; },
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
ok(!!(SB && SB.load && INT && INT.writeSessionDraft && INT.readSessionDraft && INT.clearDraft),
  'studio-blueprint.js loads in isolation and exposes load() + the draft read/write/clear trio');

const DRAFT_KEY = 'datumfi_blueprint_draft_v1';
const LS = () => sandbox.localStorage, SS = () => sandbox.sessionStorage;
const clearBoth = () => { LS().clear(); SS().clear(); };
const ROOMS = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: tag + i, baseId: 'taxable_primary', name: tag + ' room ' + i, value: 1000 * (i + 1), holdings: [] }));
function savedDoc(rooms, savedAt, updatedAt, rev) {
  return { payload: JSON.stringify({ schema: 'DatumFIBlueprintV1', version: '1.0.1',
    saved_at: savedAt, profile: { primary_name: 'Primary Architect' },
    accounts: rooms, datum: { net_datum_v1: 100000 } }), revision: rev || 3, updated_at: updatedAt };
}
const names = (bp) => (bp && bp.accounts || []).map((a) => a.name).join('|');
// Where the live draft actually is — the whole point of Commit 2 is that this is localStorage.
const rawDraft = () => LS().getItem(DRAFT_KEY) || SS().getItem(DRAFT_KEY);

// ═══ 1 · THE INJURY — edit after the last save, then leave and return ═══════════════════════════
clearBoth();
const D1_SAVED = savedDoc(ROOMS('saved', 2), '2026-07-26T10:00:00Z', '2026-07-26T10:00:00Z');
INT.writeSessionDraft({ schema: 'DatumFIBlueprintV1', version: '1.0.1',
  saved_at: '2026-07-26T10:00:00Z',                       // SAME stamp as the saved doc — this is the point
  profile: { primary_name: 'Primary Architect' }, accounts: ROOMS('edited', 5), datum: { net_datum_v1: 100000 } });

let got = SB.load({ d1Doc: D1_SAVED });
ok((got.accounts || []).length === 5 && names(got).indexOf('edited') >= 0,
  'THE UNSAVED EDIT SURVIVES leave-and-return (got ' + (got.accounts || []).length + ' rooms) [BITE --unconditional]');

const stamped = JSON.parse(rawDraft());
ok(typeof stamped._draftAt === 'string' && !isNaN(Date.parse(stamped._draftAt)),
  'writeSessionDraft stamps _draftAt — the comparator has a real discriminator');
ok('_draftAt'.charAt(0) === '_',
  '_draftAt is underscore-prefixed, so toD1Document strips it and it never reaches D1');

// ═══ 2 · TAB-CLOSE — the draft must live in localStorage, not sessionStorage ════════════════════
// This is the ENTIRE point of Commit 2. sessionStorage dies with the tab; localStorage does not.
ok(LS().getItem(DRAFT_KEY) != null,
  'the working draft is written to localStorage — it SURVIVES TAB CLOSE [BITE --sessiononly]');
ok(SS().getItem(DRAFT_KEY) == null,
  'the draft is NOT left in sessionStorage (one store, no split-brain) [BITE --sessiononly]');

// ═══ 3 · DISCARD MUST ACTUALLY DISCARD (the hard-fence half) ═══════════════════════════════════
// If the storage flips but a discard still only clears sessionStorage, "discard" is INERT and the
// abandoned draft comes straight back through the comparator above.
clearBoth();
INT.writeSessionDraft({ accounts: ROOMS('abandoned', 4) });
INT.clearDraft();
ok(rawDraft() == null,
  'clearDraft() actually discards — the draft is gone from BOTH stores [BITE --nohelper]');
got = SB.load({ d1Doc: savedDoc(ROOMS('last-saved', 2), '2026-07-26T10:00:00Z', '2026-07-26T10:00:00Z') });
ok(names(got).indexOf('abandoned') < 0 && names(got).indexOf('last-saved') >= 0,
  'a DISCARDED draft does not RESURRECT on the next load [BITE --nohelper]');

// clearDraft sweeps a legacy sessionStorage draft too, so a pre-Commit-2 tab cannot leave one behind.
clearBoth();
SS().setItem(DRAFT_KEY, JSON.stringify({ accounts: ROOMS('legacy', 2) }));
INT.clearDraft();
ok(SS().getItem(DRAFT_KEY) == null, 'clearDraft() also sweeps a LEGACY sessionStorage draft');

// ═══ 4 · FRESHNESS — 14-day window (Captain-ruled) ═════════════════════════════════════════════
const NOW = Date.now();
function seedDraft(tag, ageDays, extra) {
  clearBoth();
  LS().setItem(DRAFT_KEY, JSON.stringify(Object.assign(
    { accounts: ROOMS(tag, 3), _draftAt: iso(NOW - ageDays * DAY) }, extra || {})));
}
const OLD_D1 = () => savedDoc(ROOMS('saved-row', 2), '2026-01-01T00:00:00Z', iso(NOW - 60 * DAY));

// INSIDE the window -> silent hydrate, no prompt (Commit-1 behaviour, unchanged).
seedDraft('fresh-draft', 3);
got = SB.load({ d1Doc: OLD_D1() });
ok(names(got).indexOf('fresh-draft') >= 0, 'INSIDE 14 days: a newer draft hydrates silently');
ok(INT.pendingStaleDraft() == null, 'INSIDE 14 days: nothing is parked, so the user is NOT prompted');

// OUTSIDE the window -> PROMPT: paint the saved doc, park the draft. Never auto-hydrate, never drop.
seedDraft('stale-draft', 20);
got = SB.load({ d1Doc: OLD_D1() });
ok(names(got).indexOf('saved-row') >= 0 && names(got).indexOf('stale-draft') < 0,
  'OUTSIDE 14 days: the SAVED doc paints — the stale draft is NOT auto-hydrated');
const parked = INT.pendingStaleDraft();
ok(!!parked && names(parked).indexOf('stale-draft') >= 0,
  'OUTSIDE 14 days: the draft is PARKED for the prompt — not silently dropped');
// NOT merely "a draft exists" — the PARKED one must still be on disk. finishLoad() writes the draft
// on every load, so without a guard it would overwrite the parked work with the saved doc it just
// hydrated, and "Restore my draft" would hand back the saved doc. That is silent data loss.
ok(/stale-draft/.test(String(rawDraft())),
  'OUTSIDE 14 days: the PARKED draft is still on disk intact — finishLoad did not overwrite it');
SB.load({ d1Doc: OLD_D1() });
ok(/stale-draft/.test(String(rawDraft())) && INT.pendingStaleDraft() != null,
  'OUTSIDE 14 days: reloading WITHOUT answering keeps the draft and asks again (no silent drop)');

// Boundary: 13d29h is inside, 14d1h is outside. The window is a real edge, not a vibe.
seedDraft('just-inside', 13.9);
SB.load({ d1Doc: OLD_D1() });
ok(INT.pendingStaleDraft() == null, 'boundary: 13.9 days is INSIDE the window (no prompt)');
seedDraft('just-outside', 14.1);
SB.load({ d1Doc: OLD_D1() });
ok(INT.pendingStaleDraft() != null, 'boundary: 14.1 days is OUTSIDE the window (prompt)');

// Accepting the offer stops the re-ask WITHOUT forging the edit clock.
seedDraft('accepted', 30);
SB.load({ d1Doc: OLD_D1() });
const before = JSON.parse(rawDraft())._draftAt;
INT.acceptStaleDraft();
const after = JSON.parse(rawDraft());
ok(after._draftAt === before,
  'accepting the offer does NOT forge _draftAt — the edit clock still tells the truth (L47)');
ok(typeof after._draftAcceptedAt === 'string' && '_draftAcceptedAt'.charAt(0) === '_',
  'acceptance is recorded separately as _draftAcceptedAt (underscore -> stripped, never reaches D1)');
got = SB.load({ d1Doc: OLD_D1() });
ok(names(got).indexOf('accepted') >= 0 && INT.pendingStaleDraft() == null,
  'after acceptance the draft hydrates and the user is NOT asked again');

// ═══ 5 · L47 — an UNPARSEABLE/missing stamp is never guessed at ═════════════════════════════════
clearBoth();
LS().setItem(DRAFT_KEY, JSON.stringify({ accounts: ROOMS('nostamp', 6), _draftAt: 'not-a-date' }));
got = SB.load({ d1Doc: savedDoc(ROOMS('d1-side', 2), '2026-07-26T10:00:00Z', 'also-not-a-date') });
ok((got.accounts || []).length === 2 && names(got).indexOf('d1-side') >= 0,
  'L47: both stamps unparseable and BOTH sides have rooms -> D1 wins (today\'s behaviour), nothing invented');
ok(INT.pendingStaleDraft() == null,
  'L47: an unparseable stamp produces NO prompt — we never name an age we do not know');

clearBoth();
LS().setItem(DRAFT_KEY, JSON.stringify({ accounts: ROOMS('rescue', 3) }));
got = SB.load({ d1Doc: savedDoc([], '2026-07-26T10:00:00Z', 'bad') });
ok((got.accounts || []).length === 3,
  'L47 tiebreak: unparseable stamps + an EMPTY D1 doc -> the draft with rooms wins (accounts never silently dropped)');
ok(INT.pendingStaleDraft() == null, 'L47 tiebreak path parks nothing — no prompt without a real age');

// ═══ 6 · NEGATIVES — save keeps its meaning; a bare D1 load is unchanged ════════════════════════
clearBoth();
INT.writeSessionDraft({ accounts: ROOMS('stale-draft', 3), saved_at: '2026-07-26T09:00:00Z' });
got = SB.load({ d1Doc: savedDoc(ROOMS('just-saved', 7), '2026-07-26T23:59:00Z', '2099-01-01T00:00:00Z') });
ok((got.accounts || []).length === 7 && names(got).indexOf('just-saved') >= 0,
  'NEGATIVE: after an explicit save the D1 doc is newer and STILL wins — save keeps its meaning');

clearBoth();
got = SB.load({ d1Doc: savedDoc(ROOMS('only-d1', 4), '2026-07-26T10:00:00Z', '2026-07-26T10:00:00Z') });
ok((got.accounts || []).length === 4 && names(got).indexOf('only-d1') >= 0,
  'NEGATIVE: with no draft at all, the D1 doc hydrates unchanged');

// ═══ 7 · MIGRATION — the flip itself must not destroy an in-flight draft ═══════════════════════
// A user mid-edit when this shipped still holds their draft in the OLD store.
clearBoth();
SS().setItem(DRAFT_KEY, JSON.stringify({ accounts: ROOMS('in-flight', 5), _draftAt: iso(NOW - 60 * 1000) }));
got = SB.load({ d1Doc: OLD_D1() });
ok(names(got).indexOf('in-flight') >= 0,
  'MIGRATION: a draft left in the OLD store by a pre-Commit-2 tab is still read, not destroyed by the flip');

// ═══ 8 · QUOTA — a failed draft write is SURFACED, never swallowed ═════════════════════════════
// The original injury in a new hat: the user keeps typing into a draft that stopped persisting.
clearBoth();
events.length = 0;
const goodLS = sandbox.localStorage;
sandbox.localStorage = mkStore({ full: true });
INT.writeSessionDraft({ accounts: ROOMS('doomed', 2) });
ok(INT.draftWriteOk() === false, 'QUOTA: a failed draft write flips the persistence state to NOT-OK');
ok(events.some((e) => e.type === 'datum:draft-write-state' && e.detail && e.detail.ok === false),
  'QUOTA: the failure is announced on datum:draft-write-state — the host can act on it');
sandbox.localStorage = goodLS;
INT.writeSessionDraft({ accounts: ROOMS('recovered', 2) });
ok(INT.draftWriteOk() === true, 'QUOTA: a later successful write clears the state back to OK');
ok(events.some((e) => e.type === 'datum:draft-write-state' && e.detail && e.detail.ok === true),
  'QUOTA: recovery is announced too, so a host notice can be taken back down');

// ═══ 9 · THE HARD FENCE, STATICALLY — studio.html must not hard-code the store ═════════════════
// The storage move and the three reroutes have to land together. If studio.html still calls
// sessionStorage.removeItem for the draft, discard is inert no matter how correct this module is.
const HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
const literalRemoves = HTML.split(`sessionStorage.removeItem('${DRAFT_KEY}')`).length - 1;
ok(literalRemoves === 0,
  'studio.html holds ZERO literal sessionStorage.removeItem for the draft (found ' + literalRemoves + ')');
ok((HTML.split('window._studioClearDraft()').length - 1) >= 3,
  'studio.html routes every discard through the single _studioClearDraft() helper');
ok(/_clearCarriedDesign|_scratchReset/.test(HTML) && /localStorage\.removeItem\(k\)/.test(HTML) && /sessionStorage\.removeItem\(k\)/.test(HTML),
  '_scratchReset still sweeps BOTH stores (it was already correct — confirm, do not duplicate it)');

// ═══ 10 · AUTHORED COPY, VERBATIM (L47) ════════════════════════════════════════════════════════
// The Architect authors these lines; the Wirer installs them unchanged. Asserting the exact strings
// means a well-meaning re-word shows up as a RED instead of drifting in unnoticed.
const COPY = {
  'restore title':   'Pick up where you left off?',
  'restore body':    'You have an unsaved draft of ',
  // anchored past the escaped apostrophe (the source carries hasn\'t) so the check tests the copy,
  // not the escaping
  'restore body 2':  't been saved to your account yet &mdash; want to bring it back, or start fresh from your last saved version?',
  'restore primary': 'Restore my draft',
  'restore second':  'Start from last saved',
  'unnamed fallback': '\'your plan\'',
  'quota notice':    'We’ve stopped saving your changes on this device — it’s out of room. Your work is still on screen. Sign in and save to your account to keep it safe.',
  'sibling notice':  'Another Studio tab has newer unsaved work, so we’ve paused saving here to avoid overwriting it. Switch to that tab to keep going, or reload this one to pick up where it left off.'
};
Object.keys(COPY).forEach((k) => ok(HTML.indexOf(COPY[k]) >= 0, 'COPY verbatim in studio.html — ' + k));
// The fallback drops the guillemets (a generic noun is not a title); a NAMED draft keeps them.
ok(/&laquo;' \+ _draftEsc\(r\.name\) \+ '&raquo;/.test(HTML),
  'COPY: guillemets are applied to the NAME only, never to the "your plan" fallback');

console.log('MODE: ' + (UNCOND ? '--unconditional' : SESSIONONLY ? '--sessiononly' : NOHELPER ? '--nohelper' : 'CLEAN') +
            '   |   Studio unsaved-edit survival + tab-close + 14-day window');
lines.forEach((l) => console.log('  ' + l));
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
