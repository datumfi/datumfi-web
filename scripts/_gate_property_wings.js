'use strict';
/* A HOME IS A HOME IN EVERY OWNERSHIP WING — RED-FIRST.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * AN OWNER WHO HAS BUILT A HOME AND SECURED A MORTGAGE AND A HELOC AGAINST IT — the same three rooms,
 * linked the same way, built once under each of the three ownership wings.
 *
 * CAPTAIN'S REPORT, 2026-08-02, live site: a file built this week showed NO Yard and TWO rooms called
 * The Grounds; an older file with the same three rooms showed one correct Yard. MEASURED — the only
 * difference was the wing. studio.html asked `base.id === 'property'`, the JOINT id alone, so a home
 * added under Primary or Co-Architect was never recognised as the property the estate stands on:
 * the boundary kept its empty label and the real home was drawn beside it as an ordinary room.
 *
 * ⚠️ THE SECOND ASSERTION IS THE ONE THAT WOULD HAVE CAUGHT THIS THREE WEEKS AGO. Every property in
 * state must be drawn SOMEWHERE, and the drawn set must reconcile with what the estate total counts.
 * A room whose money is in the total but whose tile is on no canvas is the silent class of defect —
 * the numbers and the picture disagreeing with nobody to notice.
 *
 * Usage: node scripts/_gate_property_wings.js [--nofix] [--nomigrate] [--noradio]
 *   --nofix      restores the joint-only id -> PRIMARY and CO wings red, JOINT stays green, which is
 *                exactly the asymmetry that made this look like a saving bug for two days.
 *   --nomigrate  deletes BLANK-MEANS-PRIMARY -> everything a NEW user does still looks perfect and
 *                only the files saved BEFORE the rule lose their ground and their Yard.
 *   --noradio    removes the demotion -> two properties both claim primary and the ground is picked
 *                by array order, silently. The exact shape of the bug that started this arc.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8288; const BASE = 'http://127.0.0.1:' + PORT;
const NOFIX = process.argv.includes('--nofix');
const NOMIG = process.argv.includes('--nomigrate');
const NORAD = process.argv.includes('--noradio');
const MUT   = NOFIX || NOMIG || NORAD;

const A_FIX = 'if (isPropertyBase(base)) {';
const M_FIX = "if (base.id === 'property') {";
/* --nomigrate — DELETE THE PREDATES-THE-RULE PROTECTION. Blank stops meaning primary, so a property
   with no purpose set no longer owns the ground. Everything a NEW user does still looks perfect;
   only the file saved BEFORE the rule existed loses its ground and its Yard. This is the mutation
   that guards the one non-negotiable ruling, and nothing else in the suite notices it. */
const A_MIG = '      for (var j = 0; j < rooms.length; j++) if (!rooms[j].propPurpose) return rooms[j];';
const M_MIG = '      /* migration protection removed by --nomigrate */';
/* --noradio — REMOVE THE DEMOTION. Two properties can then both claim Primary residence, and which
   one owns the ground is decided by array order, silently. That is the exact shape of the bug that
   started this arc: a winner picked with nobody told. */
const A_RAD = "                        o.propPurpose = 'Second home';";
const M_RAD = '                        /* demotion removed by --noradio */';

let pass = 0, fail = 0, quarantined = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
/* QUARANTINED — a third class, deliberately NOT counted as a pass and deliberately NOT exit-1.
   It is printed even when it is the only one, so a known gap stays visible instead of becoming a
   silent red that trains everyone to ignore red. Every quarantine carries a REASON and a DATE. */
const quar = (c, m, reason) => { quarantined++; lines.push((c ? 'QUAR-OK   ' : 'QUARANTINED ') + m + '   [' + reason + ']'); };

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(p)) {
    let src = body.toString('utf8');
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOFIX) apply(A_FIX, M_FIX, 'A_FIX');
    if (NOMIG) apply(A_MIG, M_MIG, 'A_MIG');
    if (NORAD) apply(A_RAD, M_RAD, 'A_RAD');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3500);

  /* RIG ASSERTION — every baseId must exist in the registry. My first probe invented 'mortgage' and
     'heloc'; getBaseType returned null, the merge loop bailed, and the missing Yard looked exactly
     like a product defect. A fixture in the wrong shape is indistinguishable from the bug it invents.
     rDataList/getBaseType are block-scoped, so this is grounded against the source text. */
  const SRC = studioSource();
  const known = (id) => SRC.indexOf("{ id: '" + id + "',") !== -1;

  /* ⚠️ updateSVGs IS DEBOUNCED. Reading the canvas in the same tick reads the PREVIOUS render and
     reports an empty estate — a fault that cost one round on the probe this gate grew out of. */
  async function build(accounts) {
    await page.evaluate((accs) => {
      window.state.accounts = accs;
      if (typeof window.updateSVGs === 'function') window.updateSVGs();
    }, accounts);
    await page.waitForTimeout(1600);
    return page.evaluate(() => {
      const svg = document.getElementById('bp-svg');
      const txt = svg ? (svg.textContent || '').replace(/\s+/g, ' ').trim() : '';
      return { txt: txt,
               yard: /THE YARD/.test(txt),
               groundsLabels: (txt.match(/THE GROUNDS|CO-GROUNDS/gi) || []).length,
               yardClick: !!(svg && svg.querySelector('[onclick*="openYardModal"]')) };
    });
  }

  const WINGS = [
    { wing: 'JOINT',   prop: 'property',         sfx: '_joint'   },
    { wing: 'PRIMARY', prop: 'property_primary', sfx: '_primary' },
    { wing: 'CO',      prop: 'property_co',      sfx: '_co'      }
  ];

  for (const w of WINGS) {
    const ids = [w.prop, 'mortgage' + w.sfx, 'heloc' + w.sfx];
    const missing = ids.filter((i) => !known(i));
    ok(missing.length === 0, `RIG (${w.wing}): every fixture baseId exists in the registry (${JSON.stringify(ids)})`);
    if (missing.length) continue;

    const r = await build([
      { id: 'home1', baseId: w.prop,               name: 'Home',     value: 600000 },
      { id: 'mort1', baseId: 'mortgage' + w.sfx,   name: 'Mortgage', value: 300000, linkedAssetId: 'home1' },
      { id: 'hel1',  baseId: 'heloc' + w.sfx,      name: 'HELOC',    value: 50000,  linkedAssetId: 'home1' }
    ]);
    ok(r.yard === true,
       `${w.wing}: a home with a linked mortgage + HELOC composes THE YARD (yard=${r.yard}) — ownership must not decide whether your home is your home`);
    ok(r.yardClick === true,
       `${w.wing}: the Yard tile is clickable (opens the combined view)`);
    ok(r.groundsLabels === 1,
       `${w.wing}: exactly ONE tile carries the property label (found ${r.groundsLabels}) — two means the empty boundary is standing next to the real home`);
  }

  /* ── RECONCILIATION. Architect's instruction, and the assertion that would have caught this. ──── */
  {
    const r = await build([
      { id: 'h1', baseId: 'property', name: 'Residence', value: 600000, propPurpose: 'Primary residence' }
    ]);
    ok(/600/.test(r.txt), 'RECONCILE (1 property): the single property is drawn on the canvas');
  }
  {
    const r = await build([
      { id: 'h1', baseId: 'property', name: 'Residence', value: 600000, propPurpose: 'Primary residence' },
      { id: 'h2', baseId: 'property', name: 'Rental',    value: 250000, propPurpose: 'Rental property'   }
    ]);
    const drawn = (/600/.test(r.txt) ? 1 : 0) + (/250/.test(r.txt) ? 1 : 0);
    /* QUARANTINE LIFTED 2026-08-02 by the purpose commit. This was "2 in state, 1 drawn": one plot,
       last one wins, and the undrawn home still counted in the estate total. Now every property that
       does not own the ground is drawn as its own room block, so the picture and the total agree.
       PLACEMENT of those blocks (satellites, wings, stacking) is the next commit; VISIBILITY is not
       deferred, because a room whose money is in the total and whose tile is nowhere is the silent
       class of defect this whole arc exists to close. */
    ok(drawn === 2,
      `RECONCILE (2 properties): every property in state is drawn somewhere (2 in state, ${drawn} drawn) — the numbers and the picture must not disagree`);
  }

  /* ── PURPOSE DECIDES THE GROUND, NOT OWNERSHIP ────────────────────────────────────────────────── */
  {
    const r = await build([]);
    ok(/THE PLOT/.test(r.txt) && !/THE GROUNDS/.test(r.txt),
       `EMPTY: no property at all reads THE PLOT, not THE GROUNDS (txt="${r.txt.slice(0, 60)}") — empty ground must not announce grounds nobody owns`);
  }
  {
    /* 🔑 THE MIGRATION CASE, AND IT IS THE ONE THAT PROTECTS EVERY FILE ALREADY SAVED. propPurpose has
       always defaulted to blank, so NO existing blueprint has it set. If blank did not mean primary,
       every saved file would lose its ground — and its Yard — the first time it was opened. */
    const r = await build([
      { id: 'h1', baseId: 'property', name: 'Home', value: 600000 },
      { id: 'm1', baseId: 'mortgage_joint', name: 'Mortgage', value: 300000, linkedAssetId: 'h1' }
    ]);
    ok(r.yard === true,
       `BLANK MEANS PRIMARY: a property with NO purpose set still owns the ground and still composes The Yard (yard=${r.yard}) — adding a rule must never punish a file for predating it`);
  }
  {
    const r = await build([
      { id: 'h1', baseId: 'property',         name: 'Rental',    value: 250000, propPurpose: 'Rental property'   },
      { id: 'h2', baseId: 'property_primary', name: 'Residence', value: 600000, propPurpose: 'Primary residence' }
    ]);
    ok(/THE GROUNDS/.test(r.txt),
       'PURPOSE WINS: with a JOINT rental and a PRIMARY-owned residence, the RESIDENCE takes the ground — ownership decides nothing');
    ok(/600/.test(r.txt) && /250/.test(r.txt), 'PURPOSE WINS: and the rental is still drawn');
  }
  {
    /* A portfolio of rentals and land genuinely has no residence. That is a real state, not a failure,
       and the ground is honestly empty. */
    const r = await build([
      { id: 'h1', baseId: 'property', name: 'Rental A', value: 250000, propPurpose: 'Rental property' },
      { id: 'h2', baseId: 'property', name: 'Land',     value: 90000,  propPurpose: 'Land'            }
    ]);
    ok(/THE PLOT/.test(r.txt), 'NO RESIDENCE: every property explicitly non-primary leaves the ground as THE PLOT');
    ok(/250/.test(r.txt) && /90/.test(r.txt), 'NO RESIDENCE: and both properties are still drawn');
  }
  {
    /* THE RADIO. Marking a second property primary must demote the first, which is what makes a
       two-primaries tiebreak unreachable by construction rather than by a rule somebody remembers. */
    const r = await page.evaluate(() => {
      window.state.accounts = [
        { id: 'h1', baseId: 'property', name: 'First Home',  value: 600000, propPurpose: 'Primary residence' },
        { id: 'h2', baseId: 'property', name: 'Second Home', value: 250000, propPurpose: 'Second home'       }
      ];
      window.__toasts = [];
      var _t = window.toast; window.toast = function (m) { window.__toasts.push(m); if (_t) try { _t(m); } catch (e) {} };
      window.updateAccField('h2', 'propPurpose', 'Primary residence');
      var by = {}; window.state.accounts.forEach(function (a) { by[a.id] = a.propPurpose; });
      return { purposes: by, toasts: window.__toasts };
    });
    ok(r.purposes.h2 === 'Primary residence' && r.purposes.h1 === 'Second home',
       `RADIO: marking the second home primary DEMOTES the first (h1=${r.purposes.h1}, h2=${r.purposes.h2}) — one primary residence, by construction`);
    ok(r.toasts.some((t) => t === 'Second Home is now your primary residence. First Home moves to its own block.'),
       `RADIO: the demotion is announced VERBATIM with both names (${JSON.stringify(r.toasts)}) — the user must never have to go looking for what moved`);
  }

  ok(errs.length === 0, `no page errors (${errs.join(' | ') || 'none'})`);

  console.log('\n' + lines.join('\n'));
  /* A POISONED RUN MUST NAME ITS MUTATION — a run that prints CLEAN over a mutated file is the
     misleading diagnostic this project keeps hunting. */
  const TAG = NOFIX ? 'MUTATED[nofix]' : NOMIG ? 'MUTATED[nomigrate]' : NORAD ? 'MUTATED[noradio]' : 'CLEAN';
  console.log(`\n${TAG}  GREEN ${pass} / RED ${fail} / QUARANTINED ${quarantined}`);
  await browser.close(); server.close();
  if (MUT) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
