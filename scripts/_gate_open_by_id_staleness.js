'use strict';
/* OPEN-BY-ID STALENESS · RED-FIRST — the Captain's walk, turned into a check.
 *
 * HIS WALK, on datumfi.com, deterministic: open a saved blueprint from the Archive; it shows 1,500,000;
 * remove a zero so it reads 150,000; click Save progress; WAIT for the toast to come and go; reload. It is
 * back to 1,500,000. Hard refresh, same. Open it from the Archive instead and it correctly shows 150,000.
 * The same walk on a SKETCH is clean.
 *
 * WHAT IT IS, in one sentence: the save and the reload use DIFFERENT KEYS for the same blueprint.
 *   WRITE  studio-blueprint.js save() -> `var slotId = opts.slot || _placeInNet(bp); writeSlot(slotId, bp);`
 *          and _placeInNet returns a NUMBER 1..4, so this writes `datum_blueprint_state_1`.
 *   READ   studio-blueprint.js load() explicit-open -> `var id = params.get('id'); ... readSlot(id)`,
 *          and that id is the blueprint_id UUID, so this reads `datum_blueprint_state_<UUID>`.
 *   The UUID key is written by Blueprint.html when the ARCHIVE PAGE LOADS, and by nothing else. A save
 *   therefore never refreshes it, and because a reload keeps ?id=&hydrate=blueprint in the URL (studio.html
 *   strips only fresh/hydrate=sketch), the reload re-enters the explicit-open branch and is handed the
 *   ARCHIVE-TIME SNAPSHOT — a whole earlier copy of the blueprint, which is why the screen shows the
 *   previous value in full rather than a blank or a missing field.
 *
 * WHY THE SKETCH IS CLEAN, and it is the proof this is a keying fault and not a load-order one: _doSave
 * rewrites `datum_sketch_byid_<sketch_id>` on EVERY save, so the sketch refreshes the very stash its own
 * open path reads. The blueprint does not. Same architecture, one store refreshed, one not.
 *
 * WHY IT IS NOT THE SAVE, THE DEBOUNCE, OR THE COMPARATOR: measured below — both D1 documents hold the NEW
 * value before the reload happens. The write is complete and correct. Nothing here reads a timestamp.
 *
 * NOT CAUSED BY "Save progress": checks 2 and 3 run the SAME walk through the pre-existing overwrite route,
 * which shares save(). Quick-save only made the walk one tap instead of four.
 *
 * RED-FIRST STATUS: every check below is expected RED against HEAD. There is no product fix in this commit.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --nostash — THE BREAK-TEST. Removes the open-by-id stash refresh from save() and nothing else. It must
   drive the four staleness checks back to RED; if the suite stays green without the fix, the checks are
   decorative and the CHECKS get fixed first, not the code. Proven to change the served bytes before the run
   is trusted (POISON LANDED), because a mutation that silently fails to apply is a false green. */
const NOSTASH = process.argv.includes('--nostash');
const A_STASH = "    writeIdStash(bp);                  // refresh the OPEN-BY-ID copy too — see writeIdStash. Here at the\n";
let hubDiffers = false;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/scripts/studio-blueprint.js' && NOSTASH) {
    const orig = body.toString('utf8');
    const n = orig.split(A_STASH).length - 1;
    if (n !== 1) throw new Error(`anchor stash: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_STASH, '');
    hubDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8238; const base = 'http://127.0.0.1:' + PORT;

const BP_ID = '4617c527-aaaa-4bbb-8ccc-ddddeeeeffff';
const SK_ID = 'sk-openbyid-1';
const FUTURE = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const OLD = 1500000, NEW = 150000;          // his characters
const SK_OLD = 44, SK_NEW = 51;             // the sketch control: an age he can see move

const bpFix = (port) => ({
  schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID, saved_at: FUTURE,
  display_name: 'The Harbour Plan', profile: { primary_name: 'Primary Architect' },
  accounts: [{ id: 'a1', baseId: 'taxable_primary', name: 'Taxable', value: 250000, holdings: [] },
             { id: 'a2', baseId: 'roth_ira', name: 'Roth', value: 90000, holdings: [] }],
  portfolio_total: port, contributions_total: 25000,
  datum: { net_datum_v1: 120000, net_worth: port }
});
const skFix = (age) => ({
  sketch_id: SK_ID, status: 'Drafted', display_name: 'The Long Weekend', date_stamped: '07/29/2026',
  saved_at: FUTURE, s1_resolved_state: 'EXPANSIVE', resolved_state: 'EXPANSIVE',
  age: age, retire_age: 62, portfolio_mass: 1250000, contributions: 30000,
  s1_datum: 110000, datum_spend: 110000,
  market_outlook: 'avg', inflation_mode: 'real', tax_rate: 20, plan_end_age: 93
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const d1 = { rows: {} };
  function seed() {
    for (const k of Object.keys(d1.rows)) delete d1.rows[k];
    d1.rows['blueprint/' + BP_ID] = { payload: bpFix(OLD), revision: 1, updated_at: FUTURE };
    d1.rows['studio/active'] = { payload: bpFix(OLD), revision: 1, updated_at: FUTURE };
    d1.rows['sketchbook/' + SK_ID] = { payload: skFix(SK_OLD), revision: 1, updated_at: FUTURE };
  }
  const rowsOf = (t) => Object.keys(d1.rows).filter((k) => k.indexOf(t + '/') === 0);

  async function surface(extraInit) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', async (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        await sleep(120);                       // a real network leg, never an instant fulfil
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
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
    })();`);
    if (extraInit) await page.addInitScript(extraInit);
    return { ctx, page };
  }
  const readBp = (page) => page.evaluate(() => {
    const a = window._studioBp, b = window._studioBlueprint;
    const bp = (a && a.blueprint_id) ? a : ((b && b.blueprint_id) ? b : (a || b || null));
    return { src: bp && bp._loadSource, port: bp && bp.portfolio_total };
  });

  /* ══ THE BLUEPRINT WALK, run once per SAVE ROUTE. The route is the only thing that differs — if both go
        stale, the defect belongs to save(), not to "Save progress". ══ */
  for (const route of ['quick-save', 'old-overwrite']) {
    seed();
    /* ENTRY CONDITION: the archive stash, exactly as Blueprint.html writes it when the ARCHIVE page loads.
       SEEDED ONCE, AND THE GUARD IS LOAD-BEARING. addInitScript re-runs on EVERY navigation, reloads
       included, so an unguarded seed rewrites this key back to the OLD value microseconds before the
       reloaded page boots — and the gate then reports staleness that the rig itself manufactured. That
       happened here: with the fix in place the STASH check went green while RELOAD stayed red, and the cause
       was this line, not the product. Only the FIRST load stands in for the archive visit. */
    const { ctx, page } = await surface(`(() => { try {
      var k = 'datum_blueprint_state_${BP_ID}';
      if (!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(bpFix(OLD)))});
    } catch(e){} })();`);
    const OPEN_URL = base + '/studio.html?id=' + BP_ID + '&hydrate=blueprint';
    await page.goto(OPEN_URL, { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.studioSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(4000);

    const opened = await readBp(page);
    ok(opened.port === OLD && /^blueprint-slot:/.test(String(opened.src)),
      `PRE [${route}]: opening by id really uses the explicit-open branch and shows the saved value (${opened.port}, ${opened.src})`);

    await page.evaluate((v) => {
      const el = document.getElementById('bp-portfolio-total');
      el.value = '$' + Number(v).toLocaleString('en-US');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, NEW);
    await sleep(1000);

    await page.evaluate(() => { const tb = document.querySelector('[data-acct-action="save-current"]'); if (tb) tb.click(); else document.getElementById('studio-save-bp-btn').click(); });
    await sleep(1800);
    if (route === 'quick-save') {
      await page.waitForSelector('#studio-bp-quicksave', { timeout: 10000 });
      await page.$eval('#studio-bp-quicksave', (el) => el.click());
    } else {
      await page.waitForSelector('.bp-ovrow', { timeout: 10000 });
      await page.$eval(`.bp-ovrow[data-overwrite-id="${BP_ID}"]`, (el) => el.click());
      await sleep(600);
      await page.evaluate(() => {
        const b = Array.prototype.find.call(document.querySelectorAll('#studio-save-bp-pop button'), (x) => x.textContent.trim() === 'Overwrite');
        if (b) b.click();
      });
    }
    // WAIT for the toast to come and go, exactly as he did. This is past every write debounce, so a timing
    // explanation is ruled out by construction rather than by argument.
    await sleep(4500);

    ok(d1.rows['blueprint/' + BP_ID].payload.portfolio_total === NEW,
      `SAVE [${route}]: the WRITE SUCCEEDED — the archive record holds the new value (${d1.rows['blueprint/' + BP_ID].payload.portfolio_total})`);

    const stash = await page.evaluate((k) => { try { return (JSON.parse(localStorage.getItem(k) || 'null') || {}).portfolio_total; } catch (e) { return 'ERR'; } }, 'datum_blueprint_state_' + BP_ID);
    ok(stash === NEW,
      `STASH [${route}]: the save REFRESHED the open-by-id copy datum_blueprint_state_<uuid> (holds ${stash}, wanted ${NEW})`);

    await page.reload({ waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.studioSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(4500);
    const after = await readBp(page);
    // Diagnostic, printed whether or not the check passes: WHICH stores hold what at the moment the page has
    // finished loading. A green RELOAD with a stale store behind it would be green for the wrong reason.
    const post = await page.evaluate((k) => {
      const out = {};
      try { const r = JSON.parse(localStorage.getItem(k) || 'null'); out.uuidStash = r && r.portfolio_total; } catch (e) { out.uuidStash = 'ERR'; }
      try { const d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null'); out.draft = d && d.portfolio_total; out.draftAt = d && d._draftAt; } catch (e) { out.draft = 'ERR'; }
      try { const a = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); out.archSlot1 = a && a.slot1 && a.slot1.portfolio_total; } catch (e) { out.archSlot1 = 'ERR'; }
      for (let n = 1; n <= 4; n++) { try { const s = JSON.parse(localStorage.getItem('datum_blueprint_state_' + n) || 'null'); if (s) out['num' + n] = s.portfolio_total; } catch (e) {} }
      return out;
    }, 'datum_blueprint_state_' + BP_ID);
    lines.push(`      [stores after reload, ${route}] ${JSON.stringify(post)}`);
    ok(after.port === NEW,
      `RELOAD [${route}]: after saving and reloading, the blueprint shows the value he saved (shows ${after.port}, wanted ${NEW}; served by ${after.src})`);
    await ctx.close();
  }

  /* ══ THE SKETCH CONTROL — a HEALTHY load of the same shape. Without this, a rig that simply cannot see a
        fresh reload would print the same reds and mean nothing. This must stay GREEN. ══ */
  {
    seed();
    // Same once-only guard as the blueprint seed above, for the same reason.
    const { ctx, page } = await surface(`(() => { try {
      var k = 'datum_sketch_byid_${SK_ID}';
      if (!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(skFix(SK_OLD)))});
      sessionStorage.setItem('datumfi_hydrate_from_slot', '1');
      sessionStorage.setItem('datumfi_hydrate_sketch_id', '${SK_ID}');
    } catch(e){} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.sketchSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(3000);
    await page.evaluate((v) => {
      const el = document.getElementById('slider-age');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, SK_NEW);
    await sleep(1200);
    await page.evaluate(() => window.sketchSaveCurrent());
    await sleep(1500);
    await page.waitForSelector('#sketch-sb-quicksave', { timeout: 10000 });
    await page.$eval('#sketch-sb-quicksave', (el) => el.click());
    await sleep(4500);
    const skStored = d1.rows['sketchbook/' + SK_ID].payload.age;
    const skStash = await page.evaluate((k) => { try { return (JSON.parse(localStorage.getItem(k) || 'null') || {}).age; } catch (e) { return 'ERR'; } }, 'datum_sketch_byid_' + SK_ID);
    ok(skStored === SK_NEW, `SKETCH CONTROL: the write landed on the record (age ${skStored})`);
    ok(skStash === SK_NEW, `SKETCH CONTROL: the save REFRESHED its own open-by-id stash datum_sketch_byid_<id> (age ${skStash}) — this is the store the blueprint never refreshes`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  if (NOSTASH) {
    console.log(`\nPOISON LANDED? ${hubDiffers ? 'YES' : 'NO'}   (studio-blueprint.js bytes changed: ${hubDiffers})`);
    if (!hubDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOSTASH ? 'MUTATED[nostash]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (NOSTASH) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the fix was removed and everything still passed. The checks are decorative.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
