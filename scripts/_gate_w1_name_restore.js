/* W1 name-restore gate — the "undefined (JOINT) The Grounds" bug.
 *
 * ROOT CAUSE (traced, not guessed): slimSlotForClerk (studio-blueprint.js) is the
 * Clerk-mirror serializer. To fit the hard 8192B unsafeMetadata cap it DROPS `name`
 * ("names derivable from baseId"). The two restore sites in studio.html
 * (state.accounts = bp.accounts.slice(); at ~7852 and ~9434) copy the slim objects
 * verbatim and NEVER re-derive the name -> acc.name === undefined -> every restored
 * account renders "undefined (JOINT) <meta> $<value>". Systemic across ALL account
 * types (Captain: "ANY account I save then come back to later comes back undefined").
 *
 * FIX: DatumBlueprint.hydrateAccountNames(accounts, resolveTitle) re-derives a missing
 * name from the room's canonical title (getBaseType(baseId).title in studio.html),
 * called at BOTH restore sites. A custom name (preserved via the localStorage full
 * archive) is kept as-is; only a missing/blank name falls back to the title.
 *
 * RED-FIRST: at HEAD hydrateAccountNames does not exist -> A2..A7 FAIL. The setup
 * assertion A1 (slim really drops name) passes both ways and PROVES the reproduction
 * runs through the app's own serializer (negative-control discipline: the gate fails
 * by reproducing the EXACT undefined symptom, not a proxy).
 *
 * Run: node scripts/_gate_w1_name_restore.js [LABEL]   (exit 0 = GREEN, non-0 = RED)
 */
'use strict';
var BP = require('./studio-blueprint.js').DatumBlueprint;
var LABEL = process.argv[2] || 'RUN';

var fails = [];
function check(name, cond, detail) {
  if (cond) { console.log('  PASS ', name, detail != null ? '(' + detail + ')' : ''); }
  else { console.log('  FAIL ', name, detail != null ? '(' + detail + ')' : ''); fails.push(name); }
}

/* resolver stub — mirrors studio.html getBaseType(baseId).title for the rooms under test */
var TITLES = { property: 'Real Estate', roth401k: 'Roth 401(k)', tradira: 'Traditional IRA' };
var resolve = function (bid) { return TITLES[bid] || ''; };

var hydrate = BP && BP.hydrateAccountNames;
var haveFn = (typeof hydrate === 'function');

/* ---- A1 · setup: the real serializer DROPS name (proves the reproduction path) ---- */
var full = { accounts: [ { id: 'a1', baseId: 'property', name: 'Real Estate',
                           value: 275000, inflow: 0, freq: 12, holdings: [{ ticker: 'X' }] } ] };
var slim = BP.slimSlotForClerk(full);
check('A1 slimSlotForClerk drops name (data-loss is real; undefined symptom source)',
      slim.accounts[0].name === undefined);

/* ---- A2 · the fix exists ---- */
check('A2 DatumBlueprint.hydrateAccountNames is a function', haveFn);

/* Everything below needs the fn; guard so a HEAD run reports RED cleanly (no throw). */
if (haveFn) {
  /* ---- A3 · CORE: a restored slim account (no name) re-derives from the title ---- */
  var r3 = hydrate([ { id: 'a1', baseId: 'property', value: 275000 } ], resolve);
  check('A3 missing name re-derives to room title (property -> "Real Estate")',
        r3[0].name === 'Real Estate', r3[0].name);

  /* ---- A4 · a CUSTOM name (localStorage full copy) is PRESERVED, not clobbered ---- */
  var r4 = hydrate([ { id: 'a1', baseId: 'property', name: 'Lake House', value: 275000 } ], resolve);
  check('A4 present custom name preserved (not overwritten by title)',
        r4[0].name === 'Lake House', r4[0].name);

  /* ---- A5 · unknown baseId (no title) falls back to baseId, NEVER undefined ---- */
  var r5 = hydrate([ { id: 'a9', baseId: 'mystery_room', value: 1 } ], resolve);
  check('A5 unknown baseId falls back to baseId (never undefined)',
        r5[0].name === 'mystery_room', r5[0].name);

  /* ---- A6 · empty-string name treated as missing -> re-derived ---- */
  var r6 = hydrate([ { id: 'a1', baseId: 'tradira', name: '', value: 1 } ], resolve);
  check('A6 empty-string name re-derives (tradira -> "Traditional IRA")',
        r6[0].name === 'Traditional IRA', r6[0].name);

  /* ---- A7 · END-TO-END through the REAL serializer: slim -> hydrate -> real name ---- */
  var e2eSlim = BP.slimSlotForClerk({ accounts: [
    { id: 'k1', baseId: 'roth401k', name: 'Roth 401(k)', value: 90000, inflow: 0, freq: 12 } ] });
  check('A7 end-to-end: name gone after slim',
        e2eSlim.accounts[0].name === undefined);
  var e2e = hydrate(e2eSlim.accounts, resolve);
  check('A7 end-to-end: hydrate restores real name (roth401k -> "Roth 401(k)")',
        e2e[0].name === 'Roth 401(k)', e2e[0].name);
} else {
  console.log('  (skipped A3-A7 — hydrateAccountNames absent; all count RED)');
  ['A3', 'A4', 'A5', 'A6', 'A7a', 'A7b'].forEach(function (n) { fails.push(n + ' (fn absent)'); });
}

console.log('');
if (fails.length) { console.log('[' + LABEL + '] W1 gate: RED — ' + fails.length + ' fail(s): ' + fails.join(', ')); process.exit(1); }
console.log('[' + LABEL + '] W1 gate: GREEN — all name-restore assertions pass'); process.exit(0);
