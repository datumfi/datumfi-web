'use strict';
/* CROSS-TAB CLOBBER GATE (red-first) — two Studio tabs must not destroy each other's work.
 *
 * THE DOOR THIS CLOSES. The draft moved sessionStorage -> localStorage so it survives tab close
 * (Commit 2). sessionStorage was per-tab, so it prevented cross-tab collision for free; localStorage
 * is shared, so two Studio tabs now write the SAME key and the last writer wins — silently erasing
 * the other tab's unsaved edits. Nobody asked for cross-tab sharing; it is a side effect.
 *
 * WHAT IS AND IS NOT BUILT. This is NOT cross-tab sync. A tab simply refuses to overwrite a draft
 * that a DIFFERENT tab wrote AFTER this tab last agreed with the stored state. The refusal is HELD
 * and announced (datum:draft-sibling-hold) — it must never be a silent stop.
 *
 * MUTATION
 *   --noguard  removes the refusal -> the second tab blind-overwrites the first tab's newer work,
 *              reproducing the clobber exactly.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const NOGUARD = process.argv.includes('--noguard');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const A_GUARD = `    var incumbent = readSessionDraft();
    if (!echo && _siblingIsUnseen(incumbent)) {`;
const NOGUARD_SRC = `    var incumbent = readSessionDraft();
    if (false) {`;

let src = fs.readFileSync(path.join(ROOT, 'scripts', 'studio-blueprint.js'), 'utf8');
if (NOGUARD) {
  const n = src.split(A_GUARD).length - 1;
  if (n !== 1) throw new Error(`anchor guard: expected exactly 1 occurrence, found ${n}`);
  src = src.replace(A_GUARD, NOGUARD_SRC);
}

const DRAFT_KEY = 'datumfi_blueprint_draft_v1';
function mkStore(bag) {
  return { getItem: (k) => (k in bag ? bag[k] : null), setItem: (k, v) => { bag[k] = String(v); },
           removeItem: (k) => { delete bag[k]; }, clear: () => { for (const k in bag) delete bag[k]; } };
}
/* Two tabs = two module instances sharing ONE localStorage bag and holding SEPARATE sessionStorage
 * bags. That is exactly the real browser shape, and it is what makes the collision reproducible. */
const sharedLocal = {};
function mkTab(label) {
  const events = [];
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    JSON, Date, Math, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    setTimeout, clearTimeout, TextEncoder,
    localStorage: mkStore(sharedLocal), sessionStorage: mkStore({}),
    CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; },
    dispatchEvent: (e) => { events.push(e); return true; },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
                addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
                body: { appendChild: () => {} }, head: { appendChild: () => {} } },
    location: { search: '', pathname: '/studio.html', href: 'http://localhost/studio.html' },
    history: { replaceState: () => {} }, navigator: { userAgent: 'gate' }, addEventListener: () => {}
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'studio-blueprint.js (' + label + ')' });
  return { INT: sandbox.DatumBlueprint._internal, SB: sandbox.DatumBlueprint, events: events };
}

const ROOMS = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: tag + i, baseId: 'taxable_primary', name: tag + ' room ' + i, value: 1000 * (i + 1), holdings: [] }));
const stored = () => { try { return JSON.parse(sharedLocal[DRAFT_KEY]); } catch (_e) { return null; } };
const names = (d) => ((d && d.accounts) || []).map((a) => a.name).join('|');

const A = mkTab('tabA');
const B = mkTab('tabB');
ok(A.INT.tabId() !== B.INT.tabId(), 'two tabs get distinct ids (sessionStorage is per-tab, so this is real)');

// ── THE COLLISION ────────────────────────────────────────────────────────────────────────────
// Both tabs open and agree with the same stored draft. Tab A then types. Tab B's autosave fires
// afterwards WITHOUT having seen A's work.
sharedLocal[DRAFT_KEY] = undefined; delete sharedLocal[DRAFT_KEY];
A.INT.writeSessionDraft({ accounts: ROOMS('shared-start', 1) });          // A writes the baseline
B.SB.load({});                                                            // B opens and hydrates it
ok(names(stored()).indexOf('shared-start') >= 0, 'setup: both tabs start from the same stored draft');

A.INT.writeSessionDraft({ accounts: ROOMS('tabA-typed', 4) });            // A types — newer work
ok(names(stored()).indexOf('tabA-typed') >= 0, 'setup: tab A writes newer work');

B.INT.writeSessionDraft({ accounts: ROOMS('tabB-stale', 2) });            // B's debounce fires
ok(names(stored()).indexOf('tabA-typed') >= 0 && names(stored()).indexOf('tabB-stale') < 0,
  "tab B does NOT clobber tab A's newer unsaved work [BITE --noguard]");

ok(!!B.INT.siblingHold(), 'the refusal is HELD for the host — it is not a silent stop [BITE --noguard]');
ok(B.events.some((e) => e.type === 'datum:draft-sibling-hold'),
  'the refusal is ANNOUNCED on datum:draft-sibling-hold [BITE --noguard]');

// ── NEGATIVE — a tab must keep overwriting its OWN work ──────────────────────────────────────
delete sharedLocal[DRAFT_KEY];
A.INT.writeSessionDraft({ accounts: ROOMS('a-first', 1) });
A.INT.writeSessionDraft({ accounts: ROOMS('a-second', 2) });
ok(names(stored()).indexOf('a-second') >= 0,
  'NEGATIVE: a tab still overwrites its OWN draft freely — the guard is not a write freeze');

// ── NEGATIVE — after B sees A's work, B may write again ──────────────────────────────────────
delete sharedLocal[DRAFT_KEY];
A.INT.writeSessionDraft({ accounts: ROOMS('a-work', 3) });
B.SB.load({});                                                            // B re-reads = now in agreement
B.INT.writeSessionDraft({ accounts: ROOMS('b-informed', 5) });
ok(names(stored()).indexOf('b-informed') >= 0,
  'NEGATIVE: once a tab has SEEN the sibling work, its next write proceeds (re-read, then write)');
ok(B.INT.siblingHold() == null, 'NEGATIVE: the hold clears once the tab is back in agreement');

// ── NEGATIVE — a single tab is completely unaffected ─────────────────────────────────────────
delete sharedLocal[DRAFT_KEY];
const S = mkTab('solo');
S.INT.writeSessionDraft({ accounts: ROOMS('solo', 2) });
S.INT.writeSessionDraft({ accounts: ROOMS('solo-again', 3) });
const soloBack = S.SB.load({});
ok(names(soloBack).indexOf('solo-again') >= 0 && S.INT.siblingHold() == null,
  'NEGATIVE: a lone tab writes and reloads exactly as before — no guard ever engages');

// ── L47 — an unstamped incumbent is not evidence of anything ─────────────────────────────────
delete sharedLocal[DRAFT_KEY];
sharedLocal[DRAFT_KEY] = JSON.stringify({ accounts: ROOMS('unstamped', 2), _tabId: 'someone-else' });
const C = mkTab('tabC');
C.INT.writeSessionDraft({ accounts: ROOMS('c-work', 3) });
ok(names(stored()).indexOf('c-work') >= 0,
  'L47: an incumbent with NO parseable stamp is not treated as newer — nothing is invented');

console.log('MODE: ' + (NOGUARD ? '--noguard' : 'CLEAN') + '   |   cross-tab draft clobber');
lines.forEach((l) => console.log('  ' + l));
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
