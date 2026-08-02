'use strict';
/* A TRUST SITS INSIDE OR OUTSIDE THE ESTATE BY WHAT IT LEGALLY IS — RED-FIRST.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * SOMEONE WHO HAS BUILT A TRUST AND SET ITS ENTITY STATUS — the same trust room, once as Revocable
 * (Living), once as Irrevocable (Decoupled), and once left blank as every existing saved file has it.
 *
 * The Entity Status field (studio.html:6971) has always offered Irrevocable (Decoupled) / Revocable
 * (Living) with the authored tooltip "permanently decoupled from the primary Estate (Irrevocable) or
 * remains a revocable living structure" — and decided NOTHING. Every trust was drawn outside.
 *   REVOCABLE   still legally yours, still in your taxable estate -> INSIDE the grounds, purple.
 *   IRREVOCABLE decoupled by definition                          -> OUTSIDE, in the Trust Wing.
 * ITS OUTSIDENESS IS THE POINT: it is what decoupled LOOKS like, so the canvas teaches estate law
 * instead of decorating it.
 *
 * 🔑 BLANK FOLLOWS THE ROOM DEFAULT (Irrevocable Trust / The Reliquary) AND STAYS OUTSIDE. No saved
 * file has ever set trustType, so every existing blueprint keeps exactly the placement it has today.
 * Same predates-the-rule protection as blank-means-primary. --noblank is the mutation that guards it.
 *
 * Usage: node scripts/_gate_trust_entity_status.js [--nostatus] [--noblank]
 *   --nostatus  ignores Entity Status -> every trust goes outside, as before. REVOCABLE reds.
 *   --noblank   makes blank mean revocable -> every EXISTING file silently moves its trust inside.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8291; const BASE = 'http://127.0.0.1:' + PORT;
const NOSTATUS = process.argv.includes('--nostatus');
const NOBLANK  = process.argv.includes('--noblank');
const MUT = NOSTATUS || NOBLANK;

const A = "} else if (base.taxCode === 'trust' && acc.trustType !== 'Revocable') {";
const M_NOSTATUS = "} else if (base.taxCode === 'trust') {";
const M_NOBLANK  = "} else if (base.taxCode === 'trust' && acc.trustType === 'Irrevocable') {";

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(p)) {
    let src = body.toString('utf8');
    const n = src.split(A).length - 1;
    if (n !== 1) { console.error(`anchor A: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    src = src.replace(A, NOSTATUS ? M_NOSTATUS : M_NOBLANK);
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

  /* RIG: the trust room id must exist in the registry, or every finding below is void. */
  const SRC = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  ok(SRC.indexOf("{ id: 'trust',") !== -1, "RIG: the registry has a 'trust' room");

  /* ⚠️ updateSVGs IS DEBOUNCED — read the canvas in the same tick and you read the PREVIOUS render. */
  async function build(trustType) {
    const acc = { id: 't1', baseId: 'trust', name: 'Family Trust', value: 400000 };
    if (trustType) acc.trustType = trustType;
    await page.evaluate((a) => {
      window.state.accounts = [a, { id: 'c1', baseId: 'checking', name: 'Checking', value: 25000 }];
      if (typeof window.updateSVGs === 'function') window.updateSVGs();
    }, acc);
    await page.waitForTimeout(1600);
    return page.evaluate(() => {
      const svg = document.getElementById('bp-svg');
      const txt = svg ? (svg.textContent || '').replace(/\s+/g, ' ').trim() : '';
      const room = svg ? svg.querySelector('.trust-room') : null;
      const title = room ? room.querySelector('.bp-title') : null;
      return {
        /* THE OUTSIDE WING IS ONLY DRAWN WHEN SOMETHING IS OUTSIDE — its banner is the honest
           observable for in-or-out, far better than guessing from coordinates. */
        wing: /GENERATIONAL TRUST WING/.test(txt),
        trustRoomPresent: !!room,
        purple: !!(title && /--shield/.test(title.getAttribute('style') || '')),
        drawn: /400/.test(txt)
      };
    });
  }

  {
    const r = await build('Revocable');
    ok(r.wing === false,
       `REVOCABLE: no Trust Wing is drawn outside (wing=${r.wing}) — a revocable trust is still legally yours, so it belongs INSIDE the estate boundary`);
    ok(r.trustRoomPresent === true && r.drawn === true,
       `REVOCABLE: the trust is still drawn, as a room (present=${r.trustRoomPresent}, value drawn=${r.drawn}) — moving it inside must never mean losing it`);
    ok(r.purple === true,
       `REVOCABLE: the inside trust keeps the purple the wing uses (purple=${r.purple}) — one visual language for one legal thing`);
  }
  {
    const r = await build('Irrevocable');
    ok(r.wing === true,
       `IRREVOCABLE: the Trust Wing IS drawn outside (wing=${r.wing}) — decoupled by definition, and its outsideness is what decoupled LOOKS like`);
    ok(r.drawn === true, 'IRREVOCABLE: the trust is drawn');
  }
  {
    /* 🔑 THE MIGRATION CASE. No saved file has ever set trustType. */
    const r = await build(null);
    ok(r.wing === true,
       `BLANK STAYS OUTSIDE: an unset Entity Status follows the room default (Irrevocable Trust / The Reliquary) and keeps today's placement (wing=${r.wing}) — adding a rule must never punish a file for predating it`);
  }

  ok(errs.length === 0, `no page errors (${errs.join(' | ') || 'none'})`);

  console.log('\n' + lines.join('\n'));
  /* A POISONED RUN MUST NAME ITS MUTATION. */
  const TAG = NOSTATUS ? 'MUTATED[nostatus]' : NOBLANK ? 'MUTATED[noblank]' : 'CLEAN';
  console.log(`\n${TAG}  GREEN ${pass} / RED ${fail}`);
  await browser.close(); server.close();
  if (MUT) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
