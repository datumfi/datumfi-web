/* U1 hub-bind GATE — asserts the LOCKED persistence contract (Captain ruling 2026-06-22).
   Studio persistence is deliberate & narrow: session memory is a live-session CONVENIENCE only;
   the ONLY durable path is account -> save to a slot. No silent/durable autosave, ever.

   Contracts (RED-first: each wired one must FAIL pre-wire as a negative control):
     A1  edit -> in-session reload          -> RESTORES (session-scoped convenience)   [needs wire]
     A2  edit -> session teardown           -> DEFAULTS (proves NOT durable autosave)  [guardrail]
     B   edit -> Start from Scratch         -> DEFAULTS (correct wipe, by design)      [guardrail]
     C   edit -> Save to slot -> Start from Blueprint -> RESTORES (the durable path)    [needs wire]

   A2 asserts the scope guardrail: clearing sessionStorage (keeping localStorage, no slot saved)
   must drop to defaults — if U1 ever sneaks in a durable localStorage autosave, A2 goes RED.
   Usage: node scripts/_probe_u1_upkeep.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const BASE = 'http://127.0.0.1:8001/studio.html';
const COST = '#plumbing-list .plumbing-row .plumbing-cost';
const TARGET = 1234, DEF = 350;

async function freshPage(browser) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector(COST, { timeout: 8000 });
  return { ctx, p };
}
const readCost = p => p.$eval(COST, el => parseInt((el.value || '').replace(/[^0-9]/g, ''), 10) || 0);
async function edit(p, v) {
  await p.$eval(COST, (el, val) => { el.value = '$' + val; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await p.waitForTimeout(700); // > 400ms saveDraft debounce
}

(async () => {
  const browser = await chromium.launch();
  const R = {};
  // A1 — within-session reload restores the in-memory draft
  try { const { ctx, p } = await freshPage(browser); await edit(p, TARGET);
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST); await p.waitForTimeout(300);
    R.A1 = await readCost(p); await ctx.close(); } catch (e) { R.A1 = 'ERR:' + e.message; }
  // A2 — session teardown (clear sessionStorage, keep localStorage, no slot) -> defaults
  try { const { ctx, p } = await freshPage(browser); await edit(p, TARGET);
    await p.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST); await p.waitForTimeout(300);
    R.A2 = await readCost(p); await ctx.close(); } catch (e) { R.A2 = 'ERR:' + e.message; }
  // B — Start from Scratch (overlay) wipes to defaults
  try { const { ctx, p } = await freshPage(browser); await edit(p, TARGET);
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST);
    const btn = await p.$('#studioStartScratch');
    if (btn) { await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), btn.click()]); await p.waitForSelector(COST); await p.waitForTimeout(300); }
    R.B = await readCost(p); R.Bbtn = !!btn; await ctx.close(); } catch (e) { R.B = 'ERR:' + e.message; }
  // C — durable slot: save to slot 1, drop sessionStorage, reopen via Start-from-Blueprint
  try { const { ctx, p } = await freshPage(browser); await edit(p, TARGET);
    await p.evaluate(() => { try { window.DatumBlueprint.save(window._studioBp || (window._studioBp = DatumBlueprint['new']()), { slot: 1 }); } catch (e) {} });
    await p.waitForTimeout(300);
    await p.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} }); // prove restore is from the SLOT, not session draft
    await p.goto(BASE + '?id=1&hydrate=blueprint', { waitUntil: 'networkidle' }); await p.waitForSelector(COST); await p.waitForTimeout(400);
    R.C = await readCost(p); await ctx.close(); } catch (e) { R.C = 'ERR:' + e.message; }
  await browser.close();

  const line = (n, got, exp) => { const pass = got === exp; console.log(`${n.padEnd(42)} got=${String(got).padStart(5)} expect=${exp} -> ${pass ? 'GREEN' : 'RED'}`); return pass; };
  console.log('===== U1 GATE [' + LABEL + '] — persistence contract =====');
  const a1 = line('A1 in-session reload RESTORES', R.A1, TARGET);
  const a2 = line('A2 teardown -> DEFAULTS (not durable)', R.A2, DEF);
  const b  = line('B  Start-from-Scratch WIPES', R.B, DEF);
  const c  = line('C  durable slot RESTORES', R.C, TARGET);
  const all = a1 && a2 && b && c;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED') + (R.Bbtn === false ? '  (warn: #studioStartScratch not found)' : ''));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
