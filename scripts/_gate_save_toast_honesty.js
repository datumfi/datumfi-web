'use strict';
/* SAVE-TOAST HONESTY · RED-FIRST — a confirmation must be downstream of the write outcome (L53).
 *
 * THE DEFECT, MEASURED BEFORE THIS FIX: DatumBlueprint.save() is SYNCHRONOUS and the D1 writes are
 * fire-and-forget, so studio.html toasted "Saved to <name>" the instant save() RETURNED — without ever
 * reading a result. With a dead session the user was told "Saved to <name>" in ALL THREE failure shapes:
 *   (a) Clerk.user null      -> no write attempted at all; the save pill ALSO read "Saved". Fully silent
 *                               failure WITH an affirmative lie on screen.
 *   (b) getToken() -> null   -> green toast and red pill at the same moment, opposite corners.
 *   (c) server 401           -> same contradiction.
 * The work itself was never lost — the local draft held the edit in every shape — so this is a LYING
 * CONFIRMATION, not data loss. That is still disqualifying: the toast is the habit the user trusts.
 *
 * WHAT IS ASSERTED. Only what the USER SEES: the toast text. Not the console, not the network tab.
 *
 * THE CONTROL IS THE POINT OF THE WHOLE FILE. "No success toast appears" is only evidence if this same rig
 * can make a success toast appear. TOAST 1 runs a LIVE session and REQUIRES the success string. If it ever
 * goes red, every other green here is meaningless and must be treated as such.
 *
 * NOT A RACE (L52). Each assertion reads a settled toast after the write has resolved — and TOAST 4 reads a
 * FIXED ten-second timer against a write that never settles at all. Deterministic on every run, no sampling
 * needed. Stated explicitly because the previous gate in this arc DID need it.
 *
 * TOAST 4 EXISTS BECAUSE THE FIX FOR A LIE CAN SHIP A NEW SILENCE (L54). Moving the message downstream of
 * the outcome means it waits, and putDoc puts no timeout on a PUT — so a stalled network used to leave the
 * user with nothing at all after tapping Save. The ten-second message reports only what is known and
 * deliberately does NOT claim failure, because at ten seconds nobody has read an outcome.
 *
 * MUTATION: --lyingtoast restores the unconditional toast at the quick-save call site, exactly as it stood
 * before this commit. TOAST 2, TOAST 3 AND TOAST 4 must all go RED under it and the CONTROL must stay GREEN.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const LYING = process.argv.includes('--lyingtoast');
const A_QS = "        DatumBlueprint.save(bp, { blueprint_id: meta.id, onResult: saveOutcomeToast(meta.name ? 'Saved to ' + meta.name : 'Saved.') });";
const M_QS = "        DatumBlueprint.save(bp, { blueprint_id: meta.id });\n        toast(meta.name ? 'Saved to ' + meta.name : 'Saved.');";
let htmlDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/studio.html' && LYING) {
    const orig = body.toString('utf8');
    const n = orig.split(A_QS).length - 1;
    if (n !== 1) throw new Error(`anchor quicksave: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_QS, M_QS);
    htmlDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8243; const base = 'http://127.0.0.1:' + PORT;

const BP_ID = '4617c527-aaaa-4bbb-8ccc-ddddeeeeffff';
const ROW_UPDATED = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const SAVED_AT = new Date(Date.now() - 60 * 60 * 1000).toISOString();   // PAST — a real saved file (see _gate_edit_clock)
const bpFix = () => ({
  schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID, saved_at: SAVED_AT,
  display_name: 'The Harbour Plan', profile: { primary_name: 'Primary Architect' },
  accounts: [{ id: 'a1', baseId: 'taxable_primary', name: 'Taxable', value: 250000, holdings: [] },
             { id: 'a2', baseId: 'roth_ira', name: 'Roth', value: 90000, holdings: [] }],
  portfolio_total: 340000, contributions_total: 25000, datum: { net_datum_v1: 120000, net_worth: 340000 }
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  async function run(mode, waitAfterSave) {
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
          if (mode === 'c_401') return J({ error: 'unauthorized' }, 401);
          // d_hang — the write NEVER settles. Models a stalled network, which putDoc does not time out.
          if (mode === 'd_hang') { await sleep(120000); return J({ revision: 2 }); }
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
    // The session is LIVE for the page load in every run and is killed AFTER load, right before the save.
    // That is what an expiry actually looks like, and it keeps hydration identical across runs.
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); localStorage.setItem('datum_workspace_name','Primary Architect'); } catch(e){}
      try { var k='datum_blueprint_state_${BP_ID}'; if(!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(bpFix()))}); } catch(e){}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
    })();`);
    /* RECORD TOASTS AS THEY APPEAR, never by reading the DOM afterwards. The toast removes itself after
       ~2.3s; the first version of this gate sampled at 3s and saw an EMPTY list on a perfectly good save.
       The CONTROL caught that immediately — which is the entire reason it is the first assertion in the
       file. Excludes datum-d1's own save pill by id so the two surfaces are never conflated. */
    await page.addInitScript(`(() => {
      window.__toasts = [];
      new MutationObserver(function (recs) {
        recs.forEach(function (r) {
          Array.prototype.forEach.call(r.addedNodes, function (n) {
            if (!n || n.nodeType !== 1 || n.id === 'datum-save-pill') return;
            var t = (n.textContent || '').trim();
            if (/^Saved|^Not saved|^Still trying|^Save failed|^Overwrote/.test(t) && window.__toasts.indexOf(t) < 0) window.__toasts.push(t);
          });
        });
      }).observe(document.documentElement || document, { childList: true, subtree: true });
    })();`);
    await page.goto(base + '/studio.html?id=' + BP_ID + '&hydrate=blueprint', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.studioSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(6000);
    await page.evaluate(() => {
      const el = document.getElementById('bp-portfolio-total');
      el.value = '$777,000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(1200);
    await page.evaluate((m) => { if (m === 'a_nouser') window.Clerk.user = null; }, mode);

    await page.evaluate(() => { const tb = document.querySelector('[data-acct-action="save-current"]'); if (tb) tb.click(); else document.getElementById('studio-save-bp-btn').click(); });
    await sleep(1800);
    const row = await page.evaluate(() => !!document.getElementById('studio-bp-quicksave'));
    if (row) await page.$eval('#studio-bp-quicksave', (el) => el.click());
    await sleep(waitAfterSave || 3000);   // past the write settle AND the toast render

    const toasts = await page.evaluate(() => window.__toasts.slice());
    const stored = d1.rows['blueprint/' + BP_ID].payload.portfolio_total;
    await ctx.close();
    return { toasts: toasts, stored: stored, rowPresent: row };
  }

  const live = await run('live');
  lines.push(`      [LIVE]   toasts=${JSON.stringify(live.toasts)}  server=${live.stored}`);
  ok(live.toasts.some((t) => t.indexOf('Saved to The Harbour Plan') === 0) && live.stored === 777000,
    `TOAST 1 CONTROL: a LIVE save still shows the success toast and the write lands (server=${live.stored}) — if this reds, every green below is meaningless`);

  const dead401 = await run('c_401');
  lines.push(`      [401]    toasts=${JSON.stringify(dead401.toasts)}  server=${dead401.stored}`);
  ok(!dead401.toasts.some((t) => t.indexOf('Saved') === 0),
    `TOAST 2: a REJECTED write shows NO success toast (saw ${JSON.stringify(dead401.toasts)})`);
  ok(dead401.toasts.some((t) => t.indexOf('Not saved') === 0),
    'TOAST 2b: the user is told plainly that it did not save, and that the work is safe on this device');

  const deadA = await run('a_nouser');
  lines.push(`      [nouser] toasts=${JSON.stringify(deadA.toasts)}  server=${deadA.stored}`);
  ok(!deadA.toasts.some((t) => t.indexOf('Saved') === 0),
    `TOAST 3: with NO session, SOMETHING tells the user and it is not the word Saved (saw ${JSON.stringify(deadA.toasts)})`);
  ok(deadA.toasts.some((t) => t.indexOf('Not saved — you may be signed out') === 0),
    'TOAST 3b: the no-session shape names the likely cause rather than a generic failure');

  /* TOAST 4 — L54. The write HANGS and never settles. Before the ten-second guard this produced NO message
     at all: the user tapped Save and got silence, which is the new failure the honest toast introduced.
     NOT A RACE: the guard fires on a fixed 10s timer against a write that never settles, so the outcome is
     the same on every run — no sampling needed. The wait is 14s to sit clearly past the boundary. */
  const hung = await run('d_hang', 14000);
  lines.push(`      [hang]   toasts=${JSON.stringify(hung.toasts)}`);
  ok(!hung.toasts.some((t) => t.indexOf('Saved') === 0),
    `TOAST 4: a HUNG write never shows the word Saved (saw ${JSON.stringify(hung.toasts)})`);
  ok(hung.toasts.some((t) => t.indexOf('Still trying to save') === 0),
    'TOAST 4b: a HUNG write tells the user it is still trying and the work is safe — it does NOT claim an outcome nobody has read');

  await browser.close();
  await new Promise((r) => server.close(r));

  if (LYING) {
    console.log(`\nPOISON LANDED? ${htmlDiffers ? 'YES' : 'NO'}   (studio.html bytes changed: ${htmlDiffers})`);
    if (!htmlDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${LYING ? 'MUTATED[lyingtoast]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (LYING) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the lying toast was restored and everything still passed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
