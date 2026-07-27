/* GATE — studio.html must survive a SLOW load of the deferred scripts/datum-estate.js, and must
   still RENDER the estate once it lands.

   THE DEFECT THIS PINS (found by the full-suite baseline 2026-07-27, reported by TWO gates:
   _p7_studio_overlay_parity and _gate_d1_boot_capture): studio.html loaded datum-estate.js with
   `defer` but called `DatumEstate.renderEstate(...)` as a BARE IDENTIFIER. Every sibling module call
   in the same block was guarded (DatumBlueprint 11170, DatumEnergize 11185, renderWantBox 11186,
   DatumShape 11203) — only this one was not. A render that ran before the module landed threw
   `ReferenceError: DatumEstate is not defined`, which aborted the rest of that render turn.

   WHY THE GATE ASSERTS A RENDER, NOT JUST "NO CRASH": a bare guard would also stop the throw, but it
   would leave the estate section silently BLANK on a slow load — trading a loud failure for a quiet
   one. So this gate requires BOTH: zero ReferenceErrors AND #bp-svg actually populated after the
   module arrives (the re-render path).

   ⚠️ DOCTRINE — MANDATORY FOR ANY GATE TESTING A defer-MODULE RACE (learned here, 2026-07-27):
   use `waitUntil: 'commit'`, NEVER 'domcontentloaded'. `defer` scripts BLOCK DOMContentLoaded, so a
   gate that waits for 'domcontentloaded' hands back control only AFTER the delayed module has
   already landed — the gap it means to test is over before it looks. The first version of this gate
   did exactly that and shipped a DEAD control: its render assertion passed identically on the fixed
   code, on a bare guard, and on the unguarded original. Measured, not theorised.

   Usage: node scripts/_gate_studio_estate_defer.js [LABEL] [--unguard]
     --unguard  RED-FIRST: serve studio.html with the guard stripped back to the bare call.
                Carries a self-check — if the strip matches NOTHING it aborts at exit 1 rather
                than reporting a pass it never earned. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const LABEL = process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) || 'RUN';
const UNGUARD = process.argv.includes('--unguard');
const PORT = 8074;
const DELAY_MS = 3000;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

/* ---- the mutation, with its self-check ---- */
function mutateStudio(src) {
  const before = src;
  const out = src.replace(
    /if \(window\.DatumEstate && window\.DatumEstate\.renderEstate\) \{\s*\n(\s*)_estateRooms = window\.DatumEstate\.renderEstate\(\{/,
    (m, indent) => `if (true) {\n${indent}_estateRooms = DatumEstate.renderEstate({`
  );
  if (out === before) {
    console.error('❌ --unguard STRIP MATCHED NOTHING — the mutation anchor is dead. Re-ground it.');
    console.error('   Refusing to report a red-first that mutated nothing (2026-07-26 masking rule).');
    process.exit(1);
  }
  return out;
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const full = path.join(REPO, path.normalize(p).replace(/^[\\/]+/, ''));
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
    let body = buf;
    if (UNGUARD && /studio\.html$/.test(p)) body = Buffer.from(mutateStudio(buf.toString('utf8')), 'utf8');
    res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + PORT;
  const browser = await chromium.launch();

  async function load(delayEstate) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    if (delayEstate) {
      await page.route('**/scripts/datum-estate.js', async (route) => {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        route.continue();
      });
    }
    /* MEASURED 2026-07-27 — `defer` BLOCKS DOMContentLoaded, so waiting for 'domcontentloaded'
       means the delayed module has ALREADY landed before we can act. That made the render check
       structurally unable to fail (it sampled long after arrival). Use 'commit' so we get control
       DURING the window where the module is genuinely absent — that window is the whole point. */
    await page.goto(BASE + '/studio.html', { waitUntil: 'commit' });
    // Wait for the app to exist, but NOT for the deferred module.
    await page.waitForFunction(() => typeof window.addInstance === 'function' && window.state, { timeout: 15000 }).catch(() => {});
    const seeded = await page.evaluate(() => {
      try {
        addInstance('taxable');
        const a = window.state.accounts.find((x) => x.baseId === 'taxable');
        a.value = 100000; recalcPortfolio(a);
        updateSVGs();
        return true;
      } catch (e) { return String(e.message || e); }
    }).catch((e) => String(e));
    // DURING the gap: module absent by construction. Record what the estate looks like.
    await page.waitForTimeout(600);
    const during = await page.evaluate(() => {
      const c = document.getElementById('bp-svg');
      return { children: c ? c.childElementCount : -1, hasModule: !!(window.DatumEstate && window.DatumEstate.renderEstate) };
    }).catch(() => ({ children: -2, hasModule: false }));
    // Now let the module land and give the re-render path room to fire.
    await page.waitForTimeout(delayEstate ? DELAY_MS + 4000 : 2500);
    const rendered = await page.evaluate(() => {
      const c = document.getElementById('bp-svg');
      return { children: c ? c.childElementCount : -1, hasModule: !!(window.DatumEstate && window.DatumEstate.renderEstate) };
    }).catch(() => ({ children: -2, hasModule: false }));
    await ctx.close();
    return { errors, refErrors: errors.filter((e) => /DatumEstate is not defined/.test(e)), seeded, during, rendered };
  }

  const A = await load(false);
  const B = await load(true);
  await browser.close();
  server.close();

  const checks = [];
  const ok = (n, cond, observed) => { checks.push([n, !!cond, observed]); };

  ok('control · normal load: seeding succeeded', A.seeded === true, A.seeded);
  ok('control · normal load: ZERO "DatumEstate is not defined"', A.refErrors.length === 0, A.refErrors.length);
  ok('control · normal load: estate rendered into #bp-svg', A.rendered.children > 0, '#bp-svg children=' + A.rendered.children);
  ok('SLOW LOAD · module genuinely ABSENT during the gap (gate is testing the real window)',
    B.during.hasModule === false, 'module present during gap=' + B.during.hasModule);
  ok('SLOW LOAD · module eventually lands', B.rendered.hasModule === true, 'window.DatumEstate present=' + B.rendered.hasModule);
  ok('SLOW LOAD · ZERO "DatumEstate is not defined"', B.refErrors.length === 0, B.refErrors.length + (B.refErrors[0] ? ' (' + B.refErrors[0].slice(0, 60) + ')' : ''));
  /* This is the control that separates path (a) from a bare guard. A bare guard also stops the
     throw, but nothing repaints once the module lands, so the estate stays BLANK. Verified alive:
     with the retry removed this check FAILS (#bp-svg=0). Do not weaken it to "no crash". */
  ok('SLOW LOAD · estate STILL renders after the gap (re-render fired, not a silent blank)',
    B.rendered.children > 0, '#bp-svg children=' + B.rendered.children + ' (during gap=' + B.during.children + ')');

  console.log(`===== STUDIO ESTATE DEFER GATE [${LABEL}]${UNGUARD ? ' --unguard' : ''} =====`);
  let pass = 0;
  for (const [n, good, observed] of checks) {
    console.log(`${good ? 'PASS ' : 'FAIL '}${n.padEnd(62)} (${observed})`);
    if (good) pass++;
  }
  const green = pass === checks.length;
  console.log(`\n${pass}/${checks.length} — OVERALL: ${green ? 'GREEN' : 'RED'}`);

  if (UNGUARD) {
    if (green) {
      console.error('❌ RED-FIRST FAILED — the gate stayed GREEN on unguarded code. It is not pinning the defect.');
      process.exit(1);
    }
    console.log('✅ RED-FIRST OK — the gate correctly FAILS on the unguarded (pre-fix) code.');
    process.exit(0);
  }
  process.exit(green ? 0 : 1);
})();
