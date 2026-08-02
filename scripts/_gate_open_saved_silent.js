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
 *   --recapture re-photographs the draft on EVERY load -> the reports go GREEN and KEEP-DIRTY REDS
 *   --refake  puts the synthetic change dispatch BACK  -> everything stays GREEN except OS 6
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8301; const BASE = 'http://127.0.0.1:' + PORT;
const NOFIX1 = process.argv.includes('--nofix1');
const NOFIX2 = process.argv.includes('--nofix2');
const NAIVE  = process.argv.includes('--naive');
const ORDER  = process.argv.includes('--recapture');
const REFAKE = process.argv.includes('--refake');

const A_ECHO = "var _isEcho = source === 'session-draft';";
const M_ECHO = 'var _isEcho = true;';   // the pre-fix behaviour: EVERY load claimed to be an echo
const A_AT = 'var at    = keep && incumbent._draftAt ? incumbent._draftAt : (stamp || new Date().toISOString());';
const M_NAIVE_AT = 'var at    = stamp || (keep && incumbent._draftAt) || new Date().toISOString();';
/* --nofix2 — DISABLE THE BOOT CAPTURE. Every draft then falls back to the blank+dossier baseline,
   which is the dossier-only baseline this flag has always reproduced: the sketch carry looks like
   content and the untouched open cries wolf. Re-grounded 2026-08-02 when the captured boot replaced
   the reconstructed one; the old anchor (`if (src.indexOf('sketch-contract:') === 0) {`) named code
   that no longer exists, and the gate correctly REFUSED TO RUN rather than score a mutation it could
   not prove it had applied. */
const A_BASE = '    if (_bootWindowOpen) { out._boot = _contentOf(out); }';
const M_BASE = '    if (false) { out._boot = _contentOf(out); }';
/* --recapture — THE NEW TEMPTING-AND-WRONG FIX, banked here so it can never ship quietly. It is the
   first cut of the captured-boot fix: close the boot window on trusted input ALONE and let every
   load re-photograph the draft. The Captain's report goes green, OS 3 goes green, everything LOOKS
   fixed — and a genuinely dirty draft is silently adopted as "what the page put there" on the next
   reload, so the work this whole feature protects stops being protected. OS 5 is the assertion that
   notices, and it is the ONLY one. (It replaces --wrongorder, whose defect — a baseline replaying
   the load's seeders in the wrong order — cannot exist now that nothing replays anything.) */
const A_ORDER = '    if (_isEcho) closeBootWindow();';
const M_ORDER = '    if (false) closeBootWindow();';
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  /* --refake — PUT THE LIE BACK. Restores the synthetic `change` dispatch the sketch hydration used
     to fire, so the page impersonates the user again. With the captured-boot fix in place the plain
     reports STAY GREEN — which is exactly why this mutation is needed: only OS 6 (a real click
     mid-hydration) can tell that the fake write is still there waiting to be misread. Mutates
     studio.html, the only mutation in this gate that does. */
  if (REFAKE && /studio\.html$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const A = '        if (_dobEl || _retEl) {\n          if (typeof window._studioApplyProfileDates === \'function\') window._studioApplyProfileDates();\n        }';
    const M = "        if (_dobEl) _dobEl.dispatchEvent(new Event('change', { bubbles: true }));\n        if (_retEl) _retEl.dispatchEvent(new Event('change', { bubbles: true }));";
    const n = src.split(A).length - 1;
    if (n !== 1) { console.error(`anchor A_REFAKE: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    src = src.replace(A, M);
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  if ((NOFIX1 || NOFIX2 || NAIVE || ORDER) && /studio-blueprint\.js$/.test(p)) {
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
    if (ORDER)  apply(A_ORDER, M_ORDER, 'A_ORDER');
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
/* A sketch in the SHAPE applySketchContract actually reads (age / retire_age / datum_spend /
   portfolio_mass / contributions / plan_end_age / tax_rate), not an invented one. A fixture in the
   wrong shape is indistinguishable from the defect it invents. */
const SKETCH = {
  age: 42, retire_age: 65, datum_spend: 118000, portfolio_mass: 1250000,
  contributions: 32000, plan_end_age: 92, tax_rate: 24,
  market_outlook: 'steady', inflation_mode: 'normal'
};

/* ⚠️ THE DOSSIER IS THE WHOLE POINT OF THIS FIXTURE, AND ITS ABSENCE IS WHY THE FIRST FIX SHIPPED
   BROKEN. applySketchContract and applyDossier BOTH write plan_end_age, the tax rate,
   portfolio_total and contributions_total, and applySketchContract is order-dependent by
   construction. With no dossier the order cannot matter and any ordering passes. Every real
   account has one. The values below deliberately DISAGREE with the sketch on all four contested
   fields, so a baseline that replays them in the wrong order cannot pass. */
const DOSSIER = {
  primary: { fullName: 'Daniel Merced', dateOfBirth: '1984-03-11', targetRetirementDate: '2049-03-01' },
  household: { filing: 'married', location: 'FL' },
  defaults: { planThroughAge: 105, taxRate: '20%', defaultDatum: 100000, planThroughDate: '2069-03-01' },
  accounts: { currentPortfolioBalance: 980000, annualContributions: 24000 }
};

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
      if (s.dossier) localStorage.setItem('datumfi.accountDossier.v15', JSON.stringify(s.dossier));
      if (s.stash)     localStorage.setItem('datum_blueprint_state_' + s.stashId, JSON.stringify(s.stash));
      /* BOTH SKETCH KEYS, AND THE SECOND ONE IS THE WHOLE DEFECT. load()'s readSketchSlot reads
         datum_sketch_state_<id>, but studio.html's +600ms HYDRATION HANDSHAKE (:15665) reads
         datum_sketch_byid_<id> — and the hydration is the half that writes into the live controls.
         Seeding only the first meant the hydration NEVER RAN here, so OS 3 was passing on a page
         where the code under test was inert: a SILENT PASS, green for the wrong reason. Recorded as
         the "wrong key" fixture fault on 2026-08-02 and still live in this gate until now. */
      if (s.sketch) {
        localStorage.setItem('datum_sketch_state_' + s.sketchId, JSON.stringify(s.sketch));
        localStorage.setItem('datum_sketch_byid_' + s.sketchId, JSON.stringify(s.sketch));
      }
      if (s.incumbent) localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(s.incumbent));
    } catch (e) {}
  }, seed || {});
  await page.addInitScript(`(() => {
    window.Clerk = { load:function(){return Promise.resolve();}, session:{getToken:function(){return Promise.resolve('tok');}},
      user:{ id:'u', firstName:'Daniel', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{}, update:function(){return Promise.resolve();} } };
  })();`);
  if (seed && seed.clickAtMs) {
    /* TIMED, so the click lands INSIDE the +600ms hydration window. 'commit' rather than 'load'
       because the hydration timer starts at parse and 'load' can already be past it on a cold
       harness — waiting for 'load' first would silently turn this into an after-the-fact click,
       which is the "sampled a moment, not a timeline" fault this whole arc was built on. */
    await page.goto(BASE + url, { waitUntil: 'commit' });
    await page.waitForTimeout(seed.clickAtMs);
    await page.mouse.click(8, 8);                 // real + browser-stamped, and lands on nothing
    await page.waitForTimeout(3500);
  } else {
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  }
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
  return { branch: branch, w: w, draftAt: d && d._draftAt, savedAt: d && d.saved_at, src: d && d._loadSource,
           port: d && d.portfolio_total };
});

/* A REAL edit, driven through the product's own draft writer — the same function bind()'s
   debounced commit calls. No opts, so it stamps NOW, exactly as typing does.
   ⚠️ THE TRUSTED KEYPRESS IN FRONT IS PART OF THE FIXTURE, NOT SETUP NOISE, AND IT IS WHAT MAKES
   THIS THE STATE A REAL USER IS IN. The draft writer now classifies a write that lands while the
   page is still booting as the PAGE describing itself (see the boot-window latch in
   studio-blueprint.js) — because studio.html's sketch hydration fires SYNTHETIC change events that
   were being filed as the user's work. A human cannot commit an edit without first touching
   something, so a fixture that calls the writer with no event at all is testing a path no user can
   reach, and it went red here for exactly that reason. Shift is chosen because it is trusted,
   reaches the document, and changes nothing on the page. */
const edit = async (page) => { await page.keyboard.press('Shift'); return page.evaluate(() => {
  const I = window.DatumBlueprint._internal;
  const d = I.readSessionDraft() || {};
  const next = JSON.parse(JSON.stringify(d));
  next.accounts = (next.accounts || []).concat([{ id: 'typed', account_type: 'taxable', display_name: 'TYPED BY HAND', value: 4242 }]);
  I.writeSessionDraft(next);
  const after = I.readSessionDraft();
  return { moved: after && after._draftAt !== d._draftAt, at: after && after._draftAt,
           bootOpen: I.bootWindowOpen && I.bootWindowOpen() };
}); };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch();

  /* ── POSITIVE CONTROL. Every "silent" below is worthless if this page never speaks. ─────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, { stashId: BP_ID, stash: SAVED_BP, dossier: DOSSIER });
    const e = await edit(page);
    const v = await verdict(page);
    ok(e.moved === true, `OS 0 RIG: a real edit through the product's own writer moved the edit clock (${e.moved})`);
    ok(v.branch === 'A', `OS 0b POSITIVE CONTROL: after a REAL edit the prompt DOES fire (branch ${v.branch}) — without this, every silence below could be a dead feature`);
    await ctx.close();
  }

  /* ── FIXTURE PRECONDITION, ASSERTED RATHER THAN ASSUMED. The dossier must be present AND must
        DISAGREE with the sketch on the fields both seeders write, or the ordering this gate exists
        to police cannot be observed and every ordering passes. That is precisely how the first fix
        shipped broken. Preconditions are first-class assertions, not setup. ─────────────────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`, { sketchId: SK_ID, sketch: SKETCH, dossier: DOSSIER });
    const f = await page.evaluate(() => {
      let d = null; try { d = JSON.parse(localStorage.getItem('datumfi.accountDossier.v15') || 'null'); } catch (e) {}
      let s = null; try { s = JSON.parse(localStorage.getItem('datum_sketch_state_sk-open-test') || 'null'); } catch (e) {}
      if (!d || !s) return { landed: false };
      return {
        landed: true,
        planEnd:   d.defaults.planThroughAge !== s.plan_end_age,
        taxRate:   parseFloat(d.defaults.taxRate) !== s.tax_rate,
        portfolio: d.accounts.currentPortfolioBalance !== s.portfolio_mass,
        contrib:   d.accounts.annualContributions !== s.contributions
      };
    });
    ok(f.landed === true, `OS 0c RIG: the dossier AND the sketch both landed in storage (${f.landed})`);
    ok(f.landed && f.planEnd && f.taxRate && f.portfolio && f.contrib,
      `OS 0d RIG, LOAD-BEARING: the dossier DISAGREES with the sketch on every field both seeders write (planEnd=${f.planEnd} tax=${f.taxRate} portfolio=${f.portfolio} contrib=${f.contrib}) — if they agreed, seeding order could not be observed and this gate would pass on a wrong-order baseline, which is exactly how the first fix shipped`);
    await ctx.close();
  }

  /* ── DEFECT 1 — open a saved blueprint, touch nothing. ───────────────────────────────────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, {
      stashId: BP_ID, stash: SAVED_BP, dossier: DOSSIER,
      incumbent: Object.assign({}, SAVED_BP, { _draftAt: EARLIER, _tabId: 'earlier-visit' })
    });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 1 LOAD-BEARING: opening a SAVED blueprint with a leftover draft from an earlier visit is SILENT (branch ${v.branch}, unsavedEdits=${v.w && v.w.unsavedEdits}) — this is the Captain's exact report; the leftover's edit clock must not be stamped onto a different document`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(`/studio.html?id=${BP_ID}&hydrate=blueprint`, { stashId: BP_ID, stash: SAVED_BP, dossier: DOSSIER });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 2: the same open with NO leftover draft is also silent (branch ${v.branch}) — it always was, and the fix must not disturb it`);
    await ctx.close();
  }

  /* ── DEFECT 2 — carry a saved sketch into the Studio, touch nothing. ─────────────────────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`, {
      sketchId: SK_ID, sketch: SKETCH, dossier: DOSSIER,
      incumbent: Object.assign({}, SAVED_BP, { _draftAt: EARLIER, _tabId: 'earlier-visit' })
    });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 3 LOAD-BEARING: carrying a SAVED SKETCH into the Studio and touching nothing is SILENT (branch ${v.branch}, hasContent=${v.w && v.w.hasContent}) — the sketch is safe in the Sketchbook, so nothing is at risk yet`);
    await ctx.close();
  }

  /* ── OS 6 — A REAL CLICK DURING HYDRATION. THE ONE ASSERTION --refake CAN FAIL. ──────────────
   * The captured-boot fix (53df27f) closed the boot window on the first TRUSTED event, which left a
   * named residue: click anything — even something inert — before the +600ms hydration lands, and
   * the synthetic write arriving after it counted as an edit, so the false prompt came back. The
   * only honest closure was for the page to STOP FIRING FAKE EVENTS, which is what this asserts.
   * MEASURED both ways: with the dispatch restored this reds at portfolio 750000 / branch C; with it
   * retired the draft never receives the fake write at all and there is nothing left to misread.
   * ⚠️ THE CLICK IS DELIBERATELY AT 700ms AND AT (8,8) — INSIDE the hydration window, and on nothing.
   * A click after the page settles proves nothing, and a click that hits a control would be a real
   * edit. This is a TIMED, NEGATIVE assertion: the page must NOT claim work at a moment when the only
   * thing that has happened is the page talking to itself. */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`,
      { sketchId: SK_ID, sketch: SKETCH, dossier: DOSSIER, clickAtMs: 700 });
    const v = await verdict(page);
    ok(v.branch === null,
      `OS 6 LOAD-BEARING: a REAL click at 700ms (mid-hydration, on nothing) then leave is SILENT (branch ${v.branch}, draft portfolio=${v.port}) — the page must not fire fake user events for its own repaint`);
    await ctx.close();
  }

  /* ── THE FEATURE STILL WORKS. Silence that cannot become speech is a deleted feature. ────── */
  {
    const { ctx, page } = await open(`/studio.html?id=${SK_ID}&hydrate=sketch`, { sketchId: SK_ID, sketch: SKETCH, dossier: DOSSIER });
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
    const { ctx, page } = await open('/studio.html', { incumbent: dirty, dossier: DOSSIER });
    const v = await verdict(page);
    ok(v.branch === 'A',
      `OS 5 LOAD-BEARING: a genuinely DIRTY draft still asks after a plain reload (branch ${v.branch}, _draftAt=${v.draftAt} vs saved_at=${v.savedAt}) — the tempting fix (let the load's stamp always win) makes this go silent and quietly deletes the protection this whole feature exists for`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOFIX1 || NOFIX2 || NAIVE || ORDER || REFAKE;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (studio-blueprint.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOFIX1 ? 'MUTATED[nofix1]' : NOFIX2 ? 'MUTATED[nofix2]' : NAIVE ? 'MUTATED[naive]' : ORDER ? 'MUTATED[recapture]' : REFAKE ? 'MUTATED[refake]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
