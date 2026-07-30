'use strict';
/* SKETCH SAVE-TOAST HONESTY · RED-FIRST — parity with the Studio surface (L53/L54).
 *
 * THE DEFECT, IDENTICAL TO THE ONE FIXED ON STUDIO IN 89ab32e: _doSave rendered its toast unconditionally,
 * so a save that never reached the account still said "Saved to <name>" / "Sketch updated". Same lie,
 * different file. The work is never lost — the local stash and the 4-slot book hold it — so this is a
 * LYING CONFIRMATION, not data loss, and that is still disqualifying: the toast is the habit the user trusts.
 *
 * WHAT IS ASSERTED. Only what the USER SEES: the text of #sketchOverlayToast. Not the console, not the
 * network tab.
 *
 * SKETCH HAS NO PILL. datum-d1 renders its own save pill on every page that loads it, so the pill IS
 * present here — but the sketch surface itself has exactly ONE authored voice, #sketchOverlayToast. The
 * pill and the toast now agree in every shape (see the surface table in the preview), so there is no case
 * where two corners disagree.
 *
 * THE CONTROL IS THE FIRST ASSERTION AND IT IS NOT DECORATION. "No success toast appears" is only evidence
 * if this same rig can make a success toast appear. If TOAST 1 ever reds, every green below it is
 * meaningless and must be treated as such — that has already happened twice on the Studio twin.
 *
 * RACE DECLARATIONS (L52):
 *   TOAST 1, 2, 3 — NOT races. Each reads a settled toast after the write has resolved.
 *   TOAST 4       — NOT a race. A fixed ten-second timer against a write that never settles is
 *                   deterministic on every run. No sampling needed.
 *
 * MUTATION: --lyingtoast restores the unconditional render inside _finish, exactly as it stood before this
 * commit. TOAST 2, 3 and 4 must all go RED under it and the CONTROL must stay GREEN.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const LYING = process.argv.includes('--lyingtoast');
const A_REPORT = "          if (window.DatumD1 && typeof window.DatumD1.reportOutcome === 'function') {";
const M_REPORT = "          if (false) {";
let htmlDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/sketch.html' && LYING) {
    const orig = body.toString('utf8');
    const n = orig.split(A_REPORT).length - 1;
    if (n !== 1) throw new Error(`anchor report: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_REPORT, M_REPORT);
    htmlDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8245; const base = 'http://127.0.0.1:' + PORT;

const SK_ID = 'sk-toast-1';
const ROW_UPDATED = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const SAVED_AT = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const skFix = () => ({ sketch_id: SK_ID, status: 'Drafted', display_name: 'The Long Weekend',
  date_stamped: '07/29/2026', saved_at: SAVED_AT, s1_resolved_state: 'EXPANSIVE', resolved_state: 'EXPANSIVE',
  age: 44, retire_age: 62, portfolio_mass: 1250000, contributions: 30000,
  s1_datum: 110000, datum_spend: 110000, market_outlook: 'avg', inflation_mode: 'real', tax_rate: 20, plan_end_age: 93 });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  async function run(mode, waitAfterSave) {
    const d1 = { rows: {} };
    d1.rows['sketchbook/' + SK_ID] = { payload: skFix(), revision: 1, updated_at: ROW_UPDATED };
    const rowsOf = (t) => Object.keys(d1.rows).filter((k) => k.indexOf(t + '/') === 0);
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', async (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u).searchParams;
        const type = q.get('type'), key = q.get('key') || 'active'; const id = type + '/' + key;
        const J = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (q.get('list') === '1') { await sleep(80); return J({ documents: rowsOf(type).map((k) => ({ doc_key: k.slice(type.length + 1), revision: d1.rows[k].revision, updated_at: d1.rows[k].updated_at })) }); }
        if (req.method() === 'PUT') {
          if (mode === 'c_401') { await sleep(100); return J({ error: 'unauthorized' }, 401); }
          if (mode === 'd_hang') { await sleep(120000); return J({ revision: 2 }); }   // never settles in-window
          await sleep(100);
          let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) {}
          const cur = d1.rows[id] ? d1.rows[id].revision : 0;
          d1.rows[id] = { payload: b.payload, revision: cur + 1, updated_at: new Date().toISOString() };
          return J({ revision: cur + 1 }, 200);
        }
        await sleep(80);
        if (d1.rows[id]) return J({ payload: JSON.stringify(d1.rows[id].payload), revision: d1.rows[id].revision, updated_at: d1.rows[id].updated_at });
        return J({}, 404);
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    // Session LIVE for the page load in every run, killed AFTER load right before the save — which is what
    // an expiry actually looks like, and keeps hydration identical across runs.
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); localStorage.setItem('datum_workspace_name','Primary Architect'); } catch(e){}
      try { var k='datum_sketch_byid_${SK_ID}'; if(!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(skFix()))}); } catch(e){}
      try { sessionStorage.setItem('datumfi_hydrate_from_slot','1'); sessionStorage.setItem('datumfi_hydrate_sketch_id','${SK_ID}'); } catch(e){}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
    })();`);
    /* THE STRING SPY IS TAUGHT EVERY STRING IT MUST WATCH FOR, IN THE SAME BREATH AS THE STRINGS EXIST
       (L55). On the Studio twin this exact spy went blind because the regex knew "Saved" and not "Still
       trying", and reported ABSENCE where there was only unfamiliarity. #sketchOverlayToast is REUSED for
       every message rather than created per toast, so its text is watched by characterData too. */
    await page.addInitScript(`(() => {
      window.__toasts = [];
      var note = function () {
        var el = document.getElementById('sketchOverlayToast');
        if (!el) return;
        var t = (el.textContent || '').trim();
        if (!t) return;
        if (/^Saved|^Sketch updated|^Not saved|^Still trying/.test(t) && window.__toasts.indexOf(t) < 0) window.__toasts.push(t);
      };
      new MutationObserver(note).observe(document.documentElement || document,
        { childList: true, subtree: true, characterData: true, attributes: true });
    })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.sketchSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(3500);
    await page.evaluate((m) => { if (m === 'a_nouser') window.Clerk.user = null; }, mode);
    await page.evaluate(() => window.sketchSaveCurrent());
    await sleep(1500);
    const row = await page.evaluate(() => !!document.getElementById('sketch-sb-quicksave'));
    if (row) await page.$eval('#sketch-sb-quicksave', (el) => el.click());
    await sleep(waitAfterSave || 3000);
    const toasts = await page.evaluate(() => window.__toasts.slice());
    const stored = d1.rows['sketchbook/' + SK_ID].payload.age;
    await ctx.close();
    return { toasts: toasts, stored: stored, rowPresent: row };
  }

  const live = await run('live');
  lines.push(`      [LIVE]   toasts=${JSON.stringify(live.toasts)}  row=${live.rowPresent}`);
  ok(live.rowPresent && live.toasts.some((t) => /^Sketch updated|^Saved/.test(t)),
    `TOAST 1 CONTROL: a LIVE save still shows its existing success toast (saw ${JSON.stringify(live.toasts)}) — if this reds, every green below is meaningless`);

  const dead401 = await run('c_401');
  lines.push(`      [401]    toasts=${JSON.stringify(dead401.toasts)}`);
  ok(!dead401.toasts.some((t) => /^Sketch updated|^Saved/.test(t)),
    `TOAST 2: a REJECTED write shows NO success toast (saw ${JSON.stringify(dead401.toasts)})`);
  ok(dead401.toasts.some((t) => t.indexOf('Not saved to your account') === 0),
    'TOAST 2b: the user is told plainly that it did not save, and that the work is safe on this device');

  const deadA = await run('a_nouser');
  lines.push(`      [nouser] toasts=${JSON.stringify(deadA.toasts)}`);
  ok(!deadA.toasts.some((t) => /^Sketch updated|^Saved/.test(t)),
    `TOAST 3: with NO session, SOMETHING tells the user and it is not a success message (saw ${JSON.stringify(deadA.toasts)})`);
  ok(deadA.toasts.some((t) => t.indexOf('Not saved — you may be signed out') === 0),
    'TOAST 3b: the no-session shape names the likely cause rather than a generic failure');

  const hung = await run('d_hang', 14000);
  lines.push(`      [hang]   toasts=${JSON.stringify(hung.toasts)}`);
  ok(!hung.toasts.some((t) => /^Sketch updated|^Saved/.test(t)),
    `TOAST 4: a HUNG write never claims success (saw ${JSON.stringify(hung.toasts)})`);
  ok(hung.toasts.some((t) => t.indexOf('Still trying to save') === 0),
    'TOAST 4b: a HUNG write says it is still trying and the work is safe — it does NOT claim an outcome nobody has read');

  await browser.close();
  await new Promise((r) => server.close(r));

  if (LYING) {
    console.log(`\nPOISON LANDED? ${htmlDiffers ? 'YES' : 'NO'}   (sketch.html bytes changed: ${htmlDiffers})`);
    if (!htmlDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${LYING ? 'MUTATED[lyingtoast]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (LYING) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the unconditional toast was restored and everything still passed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
