'use strict';
/* THE EDIT CLOCK · RED-FIRST — _draftAt must advance ONLY on an actual edit.
 *
 * WHY THIS EXISTS. The unsaved-work dialog (Item 2) needs one honest answer: has the user changed anything
 * since the last save? The signal for that is _draftAt against saved_at. Measured before this fix, TWO
 * NON-EDIT WRITERS advanced the clock, so the answer was "yes, dirty" almost always:
 *   save()     stamped `now` a millisecond AFTER bp.saved_at -> a doc read DIRTY the instant it saved
 *              (measured: _draftAt 18:21:07.871 vs saved_at 18:21:07.870).
 *   finishLoad with no incumbent draft stamped `now` while saved_at sat in the past -> simply OPENING a
 *              saved file read DIRTY before the user touched anything.
 * A dialog on that signal fires on every open and after every save, the Captain learns to dismiss it inside
 * a day, and then it protects nothing. THAT is the defect these checks exist to stop.
 *
 * ══ THE FIXTURE USES A PAST saved_at, AND THAT IS LOAD-BEARING ══
 * A future saved_at makes `_draftAt > saved_at` FALSE BY CONSTRUCTION and every check below passes without
 * testing anything. That is not hypothetical: the measurement rig that produced this fix did exactly that
 * on its first run and reported a clean bill of health for a product that was dirty on every load. The
 * comfortable answer had been written by the fixture, not the page. So:
 *   - PAYLOAD saved_at is in the PAST, like any real saved file.
 *   - ROW updated_at is in the FUTURE, and ONLY so the D1 payload wins hydration against the page's own
 *     first draft write. The two fields are deliberately decoupled; do not "tidy" them back together.
 * PRE-0 below asserts the past-stamp so nobody can silently flip it and turn this gate into decoration.
 *
 * THE CONTROL IS NOT OPTIONAL. A check that says "not dirty" is only evidence if the same instrument can
 * report "dirty" when there IS an edit. CONTROL performs one real input event and must come back DIRTY.
 * Without it, a blind comparator would print the same greens.
 *
 * MUTATION: --noclock strips opts.at back out of both non-edit call sites, restoring today's behaviour.
 * Both red-firsts must go RED under it, and the CONTROL must stay GREEN. Proven to change the served bytes
 * before the run is trusted.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const NOCLOCK = process.argv.includes('--noclock');
const A_LOAD = "    if (!_pendingStaleDraft) writeSessionDraft(bp, { echo: true, at: bp.saved_at });";
const M_LOAD = "    if (!_pendingStaleDraft) writeSessionDraft(bp, { echo: true });";
const A_SAVE = "    writeSessionDraft(bp, { at: bp.saved_at });";
const M_SAVE = "    writeSessionDraft(bp);";
let hubDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/scripts/studio-blueprint.js' && NOCLOCK) {
    const orig = body.toString('utf8');
    for (const [a, label] of [[A_LOAD, 'load'], [A_SAVE, 'save']]) {
      const n = orig.split(a).length - 1;
      if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
    }
    const out = orig.replace(A_LOAD, M_LOAD).replace(A_SAVE, M_SAVE);
    hubDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8241; const base = 'http://127.0.0.1:' + PORT;

const BP_ID = '4617c527-aaaa-4bbb-8ccc-ddddeeeeffff';
const ROW_UPDATED = new Date(Date.now() + 30 * 60 * 1000).toISOString();   // row metadata only — wins hydration
const SAVED_AT    = new Date(Date.now() - 60 * 60 * 1000).toISOString();   // PAYLOAD — a real file saved an hour ago
/* A REALISTIC ROOM COUNT — but do NOT credit it with fixing the timing problem, because it did not.
   Pre-fix, save() stamped the draft with `now` a hair AFTER bp.saved_at, and that gap is SUB-MILLISECOND.
   Enlarging the fixture from two rooms to sixty was an attempt to push save()'s three JSON.stringify passes
   past a millisecond so the gap would always be visible. MEASURED: it did not work — the two stamps still
   landed in the same millisecond and the single-save break-test still passed while the defect was present.
   What actually made it observable is SAMPLING (see CLOCK 2b). The rooms stay because a real blueprint has
   them and a two-room document is not representative, not because they make any check bite. */
const ROOMS = (function () {
  const out = [];
  for (let i = 0; i < 60; i++) {
    out.push({ id: 'a' + i, baseId: i % 2 ? 'roth_ira' : 'taxable_primary', name: 'Room ' + i, value: 10000 + i,
               holdings: [{ ticker: 'VTI', shares: 10 + i, basis: 1000 + i }, { ticker: 'BND', shares: 5 + i, basis: 500 + i }] });
  }
  return out;
}());
const bpFix = () => ({
  schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID, saved_at: SAVED_AT,
  display_name: 'The Harbour Plan', profile: { primary_name: 'Primary Architect' },
  accounts: JSON.parse(JSON.stringify(ROOMS)),
  portfolio_total: 340000, contributions_total: 25000, datum: { net_datum_v1: 120000, net_worth: 340000 }
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  ok(Date.parse(SAVED_AT) < Date.now(),
    `PRE-0: the fixture saved_at is in the PAST (${SAVED_AT}) — a future stamp would pass every check below by construction`);

  let r_samples = null;
  async function session(label, opts) {
    opts = opts || {};
    r_samples = null;
    const d1 = { rows: {} };
    d1.rows['blueprint/' + BP_ID] = { payload: bpFix(), revision: 1, updated_at: ROW_UPDATED };
    d1.rows['studio/active'] = { payload: bpFix(), revision: 1, updated_at: ROW_UPDATED };
    const rowsOf = (t) => Object.keys(d1.rows).filter((k) => k.indexOf(t + '/') === 0);
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', async (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        await sleep(80);
        const q = new URL(u).searchParams;
        const type = q.get('type'), key = q.get('key') || 'active'; const id = type + '/' + key;
        const J = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (q.get('list') === '1') return J({ documents: rowsOf(type).map((k) => ({ doc_key: k.slice(type.length + 1), revision: d1.rows[k].revision, updated_at: d1.rows[k].updated_at })) });
        if (req.method() === 'PUT') {
          let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) {}
          const cur = d1.rows[id] ? d1.rows[id].revision : 0;
          d1.rows[id] = { payload: b.payload, revision: cur + 1, updated_at: new Date().toISOString() };
          return J({ revision: cur + 1 }, cur ? 200 : 201);
        }
        if (d1.rows[id]) return J({ payload: JSON.stringify(d1.rows[id].payload), revision: d1.rows[id].revision, updated_at: d1.rows[id].updated_at });
        return J({}, 404);
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); localStorage.setItem('datum_workspace_name','Primary Architect'); } catch(e){}
      // Seeded ONCE. addInitScript re-runs on every navigation, and an unguarded seed would rewrite this
      // key underneath a reload — a rig manufacturing the state it claims to observe.
      try { var k='datum_blueprint_state_${BP_ID}'; if(!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(bpFix()))}); } catch(e){}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
    })();`);
    await page.goto(base + '/studio.html?id=' + BP_ID + '&hydrate=blueprint', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.studioSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(7000);   // let every deferred hydration path finish. NO interaction in the observation runs.

    if (opts.edit) {
      await page.evaluate(() => {
        const el = document.getElementById('bp-portfolio-total');
        el.value = '$999,000';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(2000);
    }
    if (opts.save) {
      await page.evaluate(() => { const tb = document.querySelector('[data-acct-action="save-current"]'); if (tb) tb.click(); else document.getElementById('studio-save-bp-btn').click(); });
      await sleep(1800);
      const row = await page.evaluate(() => !!document.getElementById('studio-bp-quicksave'));
      if (row) await page.$eval('#studio-bp-quicksave', (el) => el.click());
      await sleep(4500);   // past the toast and every write debounce
    }
    /* CAUSE 1 IS A RACE, NOT A CERTAINTY — measured, and it changes how it must be checked.
       Pre-fix, save() set bp.saved_at then stamped the draft with `now` a few operations later. That gap is
       SUB-MILLISECOND: on one machine it showed as 18:21:07.871 against .870, on another the two landed in
       the same millisecond and the break-test passed while the defect was still present. Enlarging the
       document to sixty rooms did not make it reliable. So a single save cannot red-first this honestly.
       SAMPLING CAN. Repeated saves straddle a millisecond boundary sooner or later; with the fix the stamp
       is COPIED from saved_at and is identical every single time, so the correct assertion is "not one of N
       saves reads dirty". Driven through DatumBlueprint.save directly and labelled as such: this samples the
       STAMPING, not the UI, and the real control is exercised by CLOCK 2 immediately above it. */
    if (opts.sampleSaves) {
      r_samples = await page.evaluate((n) => {
        const bp = window._studioBp || window._studioBlueprint;
        let dirty = 0;
        for (let i = 0; i < n; i++) {
          window.DatumBlueprint.save(bp, { blueprint_id: bp.blueprint_id });
          const d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null');
          if (d && d._draftAt && d.saved_at && Date.parse(d._draftAt) > Date.parse(d.saved_at)) dirty++;
        }
        return { n: n, dirty: dirty };
      }, opts.sampleSaves);
    }
    const r = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null');
      return { at: d && d._draftAt, saved: d && d.saved_at };
    });
    await ctx.close();
    const dirty = (r.at && r.saved) ? (Date.parse(r.at) > Date.parse(r.saved)) : null;
    lines.push(`      [${label}] _draftAt=${r.at}  saved_at=${r.saved}  dirty=${dirty}`);
    return { dirty: dirty, r: r, samples: r_samples };
  }

  // RED-FIRST (ii) — the one that fails hardest today: opening a saved file with NO edits.
  const opened = await session('open, no edits');
  ok(opened.dirty === false,
    `CLOCK 1: opening a saved file with NO edits leaves it NOT dirty (dirty=${opened.dirty})`);

  // RED-FIRST (i) — after a save, the doc is clean by definition.
  const saved = await session('edit then save', { edit: true, save: true, sampleSaves: 40 });
  /* CLOCK 2 EXERCISES THE REAL UI PATH — quick-save through the actual control — and asserts the doc lands
     clean. Read its green as "the real path works", NOT as proof the race is closed: under --noclock a
     SINGLE save passes roughly four times in five, because the pre-fix gap is sub-millisecond. CLOCK 2b
     below is the one that red-firsts. Stated here so nobody later mistakes this line for the guarantee. */
  ok(saved.dirty === false,
    `CLOCK 2: after a save through the real control the doc is NOT dirty (dirty=${saved.dirty}) [UI path; 2b carries the red-first]`);

  ok(saved.samples && saved.samples.dirty === 0,
    `CLOCK 2b: across ${saved.samples && saved.samples.n} consecutive saves, NOT ONE read dirty (${saved.samples && saved.samples.dirty} did) — the stamping race is closed, not merely unlucky`);

  // THE CONTROL — the instrument must be able to report dirty, or its "not dirty" means nothing.
  const edited = await session('open then ONE real edit', { edit: true });
  ok(edited.dirty === true,
    `CLOCK 3 CONTROL: one real edit DOES read dirty (dirty=${edited.dirty}) — proves the comparator is not blind`);

  await browser.close();
  await new Promise((r) => server.close(r));

  if (NOCLOCK) {
    console.log(`\nPOISON LANDED? ${hubDiffers ? 'YES' : 'NO'}   (studio-blueprint.js bytes changed: ${hubDiffers})`);
    if (!hubDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOCLOCK ? 'MUTATED[noclock]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (NOCLOCK) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the fix was removed and everything still passed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
