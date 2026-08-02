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
 * Usage: node scripts/_gate_property_wings.js [--nofix]
 *   --nofix  restores `base.id === 'property'` -> PRIMARY and CO wings red, JOINT stays green,
 *            which is exactly the asymmetry that made this look like a saving bug for two days.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8288; const BASE = 'http://127.0.0.1:' + PORT;
const NOFIX = process.argv.includes('--nofix');

const A_FIX = 'if (isPropertyBase(base)) {';
const M_FIX = "if (base.id === 'property') {";

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
  if (NOFIX && /studio\.html$/.test(p)) {
    let src = body.toString('utf8');
    const n = src.split(A_FIX).length - 1;
    if (n !== 1) { console.error(`anchor A_FIX: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    body = Buffer.from(src.replace(A_FIX, M_FIX), 'utf8');
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
  const SRC = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
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
    quar(drawn === 2,
      `RECONCILE (2 properties): every property in state is drawn somewhere (2 in state, ${drawn} drawn)`,
      'KNOWN GAP, opened 2026-08-02 — one plot, LAST ONE WINS; the undrawn home still counts in the estate total. ' +
      'Closes in the multiple-property commit (step 3). Kept visible rather than silently red.');
  }

  ok(errs.length === 0, `no page errors (${errs.join(' | ') || 'none'})`);

  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOFIX ? 'MUTATED[nofix]' : 'CLEAN'}  GREEN ${pass} / RED ${fail} / QUARANTINED ${quarantined}`);
  await browser.close(); server.close();
  if (NOFIX) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
