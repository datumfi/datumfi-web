'use strict';
/* OPENING SAVED WORK AND TOUCHING NOTHING MUST BE SILENT — RED-FIRST.
 *
 * CAPTAIN'S REPORT, 2026-08-01, on the live site: open a saved blueprint from the Archive, change
 * NOTHING, click back to the Archive -> "You have changes that are not saved yet." Same from the
 * Sketchbook's "Open in Studio" -> "You haven't saved this yet." A brand-new Studio, and the
 * Sketchbook's "Open in Sketch", were both correctly silent.
 *
 * TWO SEPARATE ROOT CAUSES WEARING ONE SYMPTOM. Measured before any fix:
 *   1. BLUEPRINT OPEN -> Branch A, because unsavedEdits was TRUE with zero edits. finishLoad asks
 *      writeSessionDraft to stamp the edit clock at the document's own saved_at, but `echo` keeps
 *      the INCUMBENT draft's stamp when one exists — so the clock from whatever the user did
 *      EARLIER got applied to a DIFFERENT document they had just opened. Isolated by one variable:
 *      identical open, leftover draft present -> fires; leftover draft absent -> silent.
 *   2. SKETCH CARRY -> Branch C, because everSaved is FALSE: a sketch carried into the Studio has
 *      genuinely never been saved AS A BLUEPRINT. The words were true; the moment was wrong. The
 *      sketch is safe in the Sketchbook, so nothing is at risk before the user touches anything.
 *      CAPTAIN'S RULING: "an already saved file that has not had a change yet should NOT get this
 *      message."
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ──────────────────
 * SIGNED IN, AND HAVING USED THE STUDIO BEFORE — so a draft from an earlier visit is already in
 * storage. That leftover is the whole cause of defect 1, and it is the ordinary state of a
 * returning user. The gates that missed this bug all booted a user who had never been here.
 *
 * ⚠️ THE TEMPTING FIX IS WRONG AND THIS GATE EXISTS TO PROVE IT. Letting the load's stamp simply
 * beat `echo` fixes both silence cases and SILENTLY DESTROYS the feature: a genuinely dirty draft
 * would be re-stamped clean on every reload, so real unsaved work would stop being protected. That
 * is what --naive reproduces, and KEEP-DIRTY is the assertion that catches it. A fix that passes
 * the bug report and fails KEEP-DIRTY is worse than the bug.
 *
 * Usage: node scripts/_gate_open_saved_silent.js [--nofix1] [--nofix2] [--naive]
 *   --nofix1  restores the un-scoped echo keep      -> only the BLUEPRINT-OPEN silence reds
 *   --nofix2  restores the dossier-only baseline    -> only the SKETCH-CARRY silence reds
 *   --naive   applies the TEMPTING fix instead      -> both silences go GREEN and KEEP-DIRTY REDS
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8301; const BASE = 'http://127.0.0.1:' + PORT;
const NOFIX1 = process.argv.includes('--nofix1');
const NOFIX2 = process.argv.includes('--nofix2');
const NAIVE  = process.argv.includes('--naive');

const A_ECHO = "var _isEcho = source === 'session-draft';";
const M_ECHO = 'var _isEcho = true;';   // the pre-fix behaviour: EVERY load claimed to be an echo
const A_AT = 'var at    = keep && incumbent._draftAt ? incumbent._draftAt : (stamp || new Date().toISOString());';
const M_NAIVE_AT = 'var at    = stamp || (keep && incumbent._draftAt) || new Date().toISOString();';
const A_BASE = '    try { _applyLoadSeed(pristine, draft); } catch (_e) {}';
const M_BASE = '    try { void _applyLoadSeed; } catch (_e) {}';
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((NOFIX1 || NOFIX2 || NAIVE) && /studio-blueprint\.js$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOFIX1) apply(A_ECHO, M_ECHO, 'A_ECHO');
    if (NOFIX2) apply(A_BASE, M_BASE, 'A_BASE');
    /* The TEMPTING fix: restore the old blanket echo AND let the load's stamp win. It makes both
       silence cases green, which is exactly why it is dangerous — only OS 5 notices. */
    if (NAIVE)  { apply(A_ECHO, M_ECHO, 'A_ECHO'); apply(A_AT, M_NAIVE_AT, 'A_AT'); }
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const BP_ID = 'bp-open-test';
const SK_ID = 'sk-open-test';
const SAVED_AT = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
const EARLIER  = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const SAVED_BP = {
  blueprint_id: BP_ID, version: '1.0.1', saved_at: SAVED_AT,
  accounts: [{ id: 'a1', account_type: '401k', display_name: 'ROOM ONE', value: 250000 }],
  datum: { net_datum_v1: 137731 }, profile: {}, household: {}
};
const SKETCH = { age: 42, retire: 65, port: 1250000, contrib: 32000, datum: 118000 };

let browser;
async function open(url, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (u.indexOf('/api/') >= 0) return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    return r.abort();
  });
  await page.addInitScript((s) => {
    try {
      sessionStorage.setItem('datumfi_skip_entry_overlay', '1');
      sessionStorage.setItem('datum_auth_hint', '1');
      localStorage.setItem('datum-discover-v1', 'done');
      localStorage.removeItem('datumfi_blueprint_draft_v1');
      if (s.stash)     localStorage.setItem('datum_blueprint_state_' + s.stashId, JSON.stringify(s.stash));
      if (s.sketch)    localStorage.setItem('datum_sketch_state_' + s.sketchId, JSON.stringify(s.sketch));
      if (s.incumbent) localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(s.incumbent));
    } catch (e) {}
  }, seed || {});
  await page.addInitScript(`(() => {
    window.Clerk = { load:function(){return Promise.resolve();}, session:{getToken:function(){return Promise.resolve('tok');}},
      user:{ id:'u', firstName:'Daniel', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{}, update:function(){return Promise.resolve();} } };
  })();`);
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  return { ctx, page };
}

/* Ask the page the SAME question the leave guard asks, through the same two seams. */
const verdict = (page) => page.evaluate(() => {
  if (!window.DatumBlueprint || !window.DatumLeavePrompt) return { err: 'modules not reachable' };
  const w = window.DatumBlueprint.workState();
  const signedIn = !!sessionStorage.getItem('datum_auth_hint');
  const branch = window.DatumLeavePrompt.decide({
    hasBuilt: !!(w && w.present && w.hasContent), signedIn: signedIn,
    everSaved: !!(w && w.everSaved), editedSinceSave: !!(w && w.unsavedEdits), surface: 'studio'
  });
  let d = null; try { d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null'); } catch (e) {}
  return { branch: branch, w: w, draftAt: d && d._draftAt, savedAt: d && d.saved_at, src: d && d._loadSource };
});

/* A REAL edit, driven through the product's own draft writer — the same function bind()'s
   debounced commit calls. No opts, so it stamps NOW, exactly as typing does. */
const edit = (page) => page.evaluate(() => {
  const I = window.DatumBlueprint._internal;
  const d = I.readSessionDraft() || {};
  const next = JSON.parse(JSON.stringify(d));
  next.accounts = (next.accounts || []).concat([{ id: 'typed', account_type: 'taxable', display_name: 'TYPED BY HAND', value: 4242 }]);
  I.writeSessionDraft(next);
  const after = I.readSessionDraft();
  return { moved: after && after._draftAt !== d._draftAt, at: after && after._draftAt };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch();

  /* ── POSITIVE CONTROL. Every "silent" below is worthless if this page never speaks. ─────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, { stashId: BP_ID, stash: SAVED_BP });
    const e = await edit(page);
    const v = await verdict(page);
    ok(e.moved === true, `OS 0 RIG: a real edit through the product's own writer moved the edit clock (${e.moved})`);
    ok(v.branch === 'A', `OS 0b POSITIVE CONTROL: after a REAL edit the prompt DOES fire (branch ${v.branch}) — without this, every silence below could be a dead feature`);
    await ctx.close();
  }

  /* ── DEFECT 1 — open a saved blueprint, touch nothing. ───────────────────────────────────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, {
      stashId: BP_ID, stash: SAVED_BP,
      incumbent: Object.assign({}, SAVED_BP, { _draftAt: EARLIER, _tabId: 'earlier-visit' })
    });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 1 LOAD-BEARING: opening a SAVED blueprint with a leftover draft from an earlier visit is SILENT (branch ${v.branch}, unsavedEdits=${v.w && v.w.unsavedEdits}) — this is the Captain's exact report; the leftover's edit clock must not be stamped onto a different document`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, { stashId: BP_ID, stash: SAVED_BP });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 2: the same open with NO leftover draft is also silent (branch ${v.branch}) — it always was, and the fix must not disturb it`);
    await ctx.close();
  }

  /* ── DEFECT 2 — carry a saved sketch into the Studio, touch nothing. ─────────────────────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`, {
      sketchId: SK_ID, sketch: SKETCH,
      incumbent: Object.assign({}, SAVED_BP, { _draftAt: EARLIER, _tabId: 'earlier-visit' })
    });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 3 LOAD-BEARING: carrying a SAVED SKETCH into the Studio and touching nothing is SILENT (branch ${v.branch}, hasContent=${v.w && v.w.hasContent}) — the sketch is safe in the Sketchbook, so nothing is at risk yet`);
    await ctx.close();
  }

  /* ── THE FEATURE STILL WORKS. Silence that cannot become speech is a deleted feature. ────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`, { sketchId: SK_ID, sketch: SKETCH });
    await edit(page);
    const v = await verdict(page);
    ok(v.branch === 'C',
      `OS 4 LOAD-BEARING: change something AFTER a sketch carry and it DOES ask (branch ${v.branch}) — a Studio blueprint built from a sketch has genuinely never been saved, and that work is still at risk`);
    await ctx.close();
  }

  /* ── KEEP-DIRTY. THE ASSERTION THAT CATCHES THE TEMPTING WRONG FIX. ──────────────────────── */
  {
    const dirty = Object.assign({}, SAVED_BP, {
      accounts: SAVED_BP.accounts.concat([{ id: 'unsaved', account_type: 'taxable', display_name: 'UNSAVED WORK', value: 9999 }]),
      _draftAt: EARLIER, _tabId: 'earlier-visit'
    });
    const { ctx, page } = await open('/studio.html', { incumbent: dirty });
    const v = await verdict(page);
    ok(v.branch === 'A',
      `OS 5 LOAD-BEARING: a genuinely DIRTY draft still asks after a plain reload (branch ${v.branch}, _draftAt=${v.draftAt} vs saved_at=${v.savedAt}) — the tempting fix (let the load's stamp always win) makes this go silent and quietly deletes the protection this whole feature exists for`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOFIX1 || NOFIX2 || NAIVE;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (studio-blueprint.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOFIX1 ? 'MUTATED[nofix1]' : NOFIX2 ? 'MUTATED[nofix2]' : NAIVE ? 'MUTATED[naive]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
