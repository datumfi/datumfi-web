'use strict';
/* THE SKETCH DIRTY SIGNAL · RED-FIRST — trusted human input marks dirty; the boot sweeps do not.
 *
 * THE DEFECT THIS SHAPE AVOIDS, MEASURED: every Sketch load dispatches ~58 SYNTHETIC input events on
 * slider-datum from the opening showcase sweep (_runTutorialSweep, sketch.html :3139-3176; 19+19+19+1=58).
 * Any signal listening on input/change marks every sketch dirty at boot — the bug 44b6245 already cost us.
 * A script cannot forge a TRUSTED pointerdown/keydown, so this listens on a channel the sweeps never touch.
 *
 * L68 — A ZERO IS ONLY EVIDENCE IF THE SAME INSTRUMENT IS SHOWN TO PRODUCE A NON-ZERO. Every "not dirty"
 * assertion in this file is followed, in the SAME run on the SAME page, by a positive control that must
 * come back dirty. A silent instrument and a silent product look identical.
 *
 * RACE DECLARATIONS (L52): none of these are races. Each drives one real event and reads a boolean after a
 * fixed settle. No sampling needed.
 *
 * MUTATIONS:
 *   --notrust  removes the isTrusted filter -> a cold load marks dirty from the 58 synthetic fires. Proves
 *              the TRUST FILTER is what makes the green, not the choice of channel alone.
 *   --noclear  removes the save-clears-flag hook -> still dirty after a successful save. This is the
 *              safety-net half that never fires in normal use, so it gets its own poison (L61).
 *   --oneroot  narrows the attachment from document to #sketch-main.
 *              ⚠ THIS MUTATION DOES NOT BITE TODAY, AND THAT IS RECORDED RATHER THAN HIDDEN. Every edit
 *              control this rig can REACH on a cold or hydrated load lives inside #sketch-main; the twelve
 *              that live on later screens are exactly the ones marked NOT EXERCISED below, because reaching
 *              them needs the journey rig that was cancelled. So narrowing the root changes nothing this
 *              gate can observe. The document-level attachment is still correct — sketch.html has FIVE
 *              top-level roots (#sketch-main :1456, #screen-2-design :1867, #screen-2 :2289,
 *              #screen-4-rewind :2403, #screen-5-build :2487) — but that correctness is argued from the
 *              markup, NOT proven here. DO NOT read --oneroot's green as evidence of anything.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const NOTRUST = process.argv.includes('--notrust');
const NOCLEAR = process.argv.includes('--noclear');
const ONEROOT = process.argv.includes('--oneroot');
const ANY = NOTRUST || NOCLEAR || ONEROOT;
const A_TRUST = "        if (!e.isTrusted) return;                       // the whole guard, in one line\n";
const A_CLEAR = "              if (res && res.ok) { window._skDirty = false; _skToast(_toastMsg); return; }";
const M_CLEAR = "              if (res && res.ok) { _skToast(_toastMsg); return; }";
const A_ROOT  = "        document.addEventListener(type, _markDirty, true);";
const M_ROOT  = "        (document.getElementById('sketch-main') || document).addEventListener(type, _markDirty, true);";
let differs = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const note = (m) => lines.push('NOTE  ' + m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/sketch.html' && ANY) {
    let s = body.toString('utf8'); const orig = s;
    const need = (a, label) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`anchor ${label}: expected 1, found ${n}`); };
    if (NOTRUST) { need(A_TRUST, 'trust'); s = s.replace(A_TRUST, ''); }
    if (NOCLEAR) { need(A_CLEAR, 'clear'); s = s.replace(A_CLEAR, M_CLEAR); }
    if (ONEROOT) { need(A_ROOT, 'root');  s = s.replace(A_ROOT, M_ROOT); }
    differs = (s !== orig);
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8251; const base = 'http://127.0.0.1:' + PORT;

const SK_ID = 'sk-dirty-1';
const FUTURE = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const skFix = () => ({ sketch_id: SK_ID, status: 'Drafted', display_name: 'The Long Weekend',
  date_stamped: '07/29/2026', saved_at: new Date(Date.now() - 3600000).toISOString(),
  s1_resolved_state: 'EXPANSIVE', resolved_state: 'EXPANSIVE', age: 47, retire_age: 61,
  portfolio_mass: 1250000, contributions: 30000, s1_datum: 110000, datum_spend: 110000,
  market_outlook: 'avg', inflation_mode: 'real', tax_rate: 20, plan_end_age: 93 });

/* THE 21-CONTROL ORACLE. The hand-placed enumeration was a bad implementation and is an excellent test
   oracle (L65 corollary). Each entry is an EDIT control that must mark dirty when driven for real. Any that
   cannot be reached without the cancelled journey rig is reported NOT EXERCISED, in writing, never dropped
   and never claimed. */
const CONTROLS = [
  ['slider-age', '#slider-age', 'key'], ['slider-activation', '#slider-activation', 'key'],
  ['sl-plan-through', '#sl-plan-through', 'key'], ['slider-portfolio', '#slider-portfolio', 'key'],
  ['slider-contrib', '#slider-contrib', 'key'], ['slider-datum', '#slider-datum', 'key'],
  ['slider-tax', '#slider-tax', 'key'],
  ['tax-10', '#tax-10', 'click'], ['tax-20', '#tax-20', 'click'], ['tax-30', '#tax-30', 'click'],
  ['market radio', 'input[name="market"]', 'click'], ['inflation radio', 'input[name="inflation"]', 'click'],
  ['design-market radio', 'input[name="design-market"]', 'click'],
  ['datum dragger', '#datum-dragger', 'drag'],
  ['d2 age slider', '#d2-slider-age', 'key'], ['d2 act slider', '#d2-slider-activation', 'key'],
  ['d2 plan slider', '#d2-slider-plan', 'key'],
  ['design confirm', '.btn-confirm-shape', 'click'], ['reset design', '#btn-reset-design', 'click'],
  ['advanced trigger', '#advanced-trigger-btn', 'click'], ['submit', '#btn-submit', 'click']
];

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  async function open(opts) {
    opts = opts || {};
    const d1 = { rows: {} };
    d1.rows['sketchbook/' + SK_ID] = { payload: skFix(), revision: 1, updated_at: FUTURE };
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 }, hasTouch: true });
    const page = await ctx.newPage();
    await ctx.route('**/*', async (route) => {
      const req = route.request(); const u = route.request().url();
      if (u.indexOf('/api/documents') >= 0) {
        await sleep(60);
        const q = new URL(u).searchParams; const type = q.get('type'), key = q.get('key') || 'active';
        const id = type + '/' + key;
        const J = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (q.get('list') === '1') return J({ documents: Object.keys(d1.rows).filter((k) => k.indexOf(type + '/') === 0).map((k) => ({ doc_key: k.slice(type.length + 1), revision: 1, updated_at: FUTURE })) });
        if (req.method() === 'PUT') { if (opts.failSave) return J({ error: 'no' }, 401); return J({ revision: 2 }); }
        if (d1.rows[id]) return J({ payload: JSON.stringify(d1.rows[id].payload), revision: 1, updated_at: FUTURE });
        return J({}, 404);
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); localStorage.setItem('datum_workspace_name','Primary Architect'); } catch(e){}
      ${opts.hydrate ? `try { var k='datum_sketch_byid_${SK_ID}'; if(!localStorage.getItem(k)) localStorage.setItem(k, ${JSON.stringify(JSON.stringify(skFix()))});
        sessionStorage.setItem('datumfi_hydrate_from_slot','1'); sessionStorage.setItem('datumfi_hydrate_sketch_id','${SK_ID}'); } catch(e){}` : ''}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'P', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{}, update: function(){ return Promise.resolve(); } } };
    })();`);
    await page.goto(base + '/sketch.html' + (opts.url || ''), { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.sketchSaveCurrent === 'function', null, { timeout: 30000 });
    await sleep(opts.settle || 11000);   // well past the 58-fire sweep
    return { ctx, page };
  }
  const dirty = (page) => page.evaluate(() => !!window._skDirty);

  /* ── MANDATORY NEGATIVE: cold load, zero interaction, per path, never summed ── */
  for (const p of [['cold  (no saved sketch)', {}], ['phaseA (Sketchbook open)', { hydrate: true }],
                   ['phaseB (?id= URL open) ', { hydrate: true, url: '?id=' + SK_ID }]]) {
    const { ctx, page } = await open(p[1]);
    const d = await dirty(page);
    const witness = await page.evaluate(() => ({ age: (document.getElementById('slider-age') || {}).value, active: window._skActiveId || null }));
    // L68 POSITIVE CONTROL, same run, same listener: one real key must flip it.
    await page.locator('#slider-age').focus();
    await page.keyboard.press('ArrowRight');
    await sleep(600);
    const afterCtl = await dirty(page);
    lines.push(`      [${p[0]}] witness slider-age=${witness.age} _skActiveId=${witness.active}`);
    ok(d === false, `NEG ${p[0]}: zero interaction leaves it NOT dirty (dirty=${d})`);
    /* THE TRUST FILTER, MADE FALSIFIABLE. The 58 boot fires are `input` events and this listener watches
       pointer/key, so they cannot reach it whatever the filter does — which means the boot load alone can
       never red-first isTrusted. Nothing on this page synthesises pointer/key events today, so the filter
       is defence against a FUTURE dispatcher rather than load-bearing now. This forges one, which is the
       only honest way to assert the guard: synthetic pointerdown must NOT mark dirty. --notrust bites here. */
    const synth = await page.evaluate(() => {
      window._skDirty = false;
      var el = document.getElementById('slider-datum') || document.body;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return !!window._skDirty;
    });
    ok(synth === false, `NEG ${p[0]} TRUST FILTER: a FORGED pointerdown does NOT mark dirty (dirty=${synth})`);
    ok(afterCtl === true, `NEG ${p[0]} CONTROL: one real key press DOES mark dirty (dirty=${afterCtl}) — without this the zero above proves nothing`);
    await ctx.close();
  }

  /* ── THE DATUM HANDLE — the one control with no input/change of its own. Opened HYDRATED because the
        handle is only armed once the shape is (_shapeArmed), which is why a cold-load press landed on an
        overlay in the earlier measurement. ── */
  {
    const { ctx, page } = await open({ hydrate: true });
    let landedOn = null, performed = true;
    try {
      const box = await page.locator('#datum-dragger').boundingBox();
      if (!box) throw new Error('no box');
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      landedOn = await page.evaluate(([px, py]) => { const el = document.elementFromPoint(px, py); return el ? (el.id || el.tagName) : 'none'; }, [x, y]);
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x, y - 30, { steps: 5 }); await page.mouse.up();
    } catch (e) { performed = false; landedOn = 'COULD NOT PERFORM: ' + e.message.split('\n')[0]; }
    await sleep(700);
    const d = await dirty(page);
    lines.push(`      [datum handle] pointer landed on: ${landedOn}`);
    if (!performed) { note('DATUM HANDLE: NOT EXERCISED — ' + landedOn); }
    else ok(d === true, `DRAG: a real drag at the datum handle marks dirty (dirty=${d}) — the control that emits no input/change`);
    await ctx.close();
  }

  /* ── SAVE CLEARS THE FLAG, and only on success ── */
  {
    const { ctx, page } = await open({ hydrate: true });
    await page.locator('#slider-age').focus(); await page.keyboard.press('ArrowRight');
    await sleep(500);
    const before = await dirty(page);
    await page.evaluate(() => window.sketchSaveCurrent());
    await sleep(1500);
    const row = await page.evaluate(() => !!document.getElementById('sketch-sb-quicksave'));
    if (row) await page.$eval('#sketch-sb-quicksave', (el) => el.click());
    await sleep(3500);
    const after = await dirty(page);
    ok(before === true, `SAVE-PRE: an edit before saving marks dirty (dirty=${before})`);
    ok(row && after === false, `SAVE: a SUCCESSFUL save clears the flag (row=${row}, dirty=${after})`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ hydrate: true, failSave: true });
    await page.locator('#slider-age').focus(); await page.keyboard.press('ArrowRight');
    await sleep(500);
    await page.evaluate(() => window.sketchSaveCurrent());
    await sleep(1500);
    const row = await page.evaluate(() => !!document.getElementById('sketch-sb-quicksave'));
    if (row) await page.$eval('#sketch-sb-quicksave', (el) => el.click());
    await sleep(3500);
    const after = await dirty(page);
    ok(after === true, `SAVE-FAIL: a FAILED save LEAVES the flag set (dirty=${after}) — the work really is still unsaved`);
    await ctx.close();
  }

  /* ── CHROME EXCLUSIONS must NOT mark dirty ── */
  {
    const { ctx, page } = await open({});
    for (const [label, sel] of [['the top nav', '#app-nav a'], ['the return-home exit', '.return-home']]) {
      const before = await dirty(page);
      let did = true;
      try { await page.locator(sel).first().click({ timeout: 3000, noWaitAfter: true }); } catch (e) { did = false; }
      await sleep(500);
      const after = await dirty(page);
      if (!did) note(`CHROME ${label}: NOT EXERCISED (not clickable in this state)`);
      else ok(before === false && after === false, `CHROME: clicking ${label} does NOT mark dirty (before=${before} after=${after})`);
      if (did) break;   // a nav click may navigate; stop after the first that lands
    }
    await ctx.close();
  }

  /* ── THE 21-CONTROL ORACLE ── */
  {
    const { ctx, page } = await open({ hydrate: true });
    let seen = 0, missed = 0, notEx = 0;
    for (const [label, sel, how] of CONTROLS) {
      await page.evaluate(() => { window._skDirty = false; });
      let performed = true;
      try {
        const loc = page.locator(sel).first();
        const box = await loc.boundingBox({ timeout: 1500 });
        if (!box) throw new Error('no box');
        if (how === 'key') { await loc.focus({ timeout: 1500 }); await page.keyboard.press('ArrowRight'); }
        else if (how === 'drag') {
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 20, { steps: 4 }); await page.mouse.up();
        } else { await loc.click({ timeout: 1500, noWaitAfter: true }); }
      } catch (e) { performed = false; }
      await sleep(250);
      const d = await dirty(page);
      if (!performed) { notEx++; note(`ORACLE ${label}: NOT EXERCISED — not reachable in this state (the journey rig was cancelled)`); }
      else if (d) seen++;
      else { missed++; ok(false, `ORACLE ${label}: a real ${how} marks dirty (dirty=false)`); }
    }
    ok(missed === 0, `ORACLE: every REACHABLE edit control marks dirty — ${seen} seen, ${missed} missed, ${notEx} NOT EXERCISED of ${CONTROLS.length}`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  if (ANY) {
    console.log(`\nPOISON LANDED? ${differs ? 'YES' : 'NO'}   (sketch.html bytes changed: ${differs})`);
    if (!differs) { console.log('MUTATION DID NOT APPLY — this run proves nothing.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const tag = NOTRUST ? 'MUTATED[notrust]' : NOCLEAR ? 'MUTATED[noclear]' : ONEROOT ? 'MUTATED[oneroot]' : 'CLEAN';
  console.log(`\n${tag}  GREEN ${pass} / RED ${fail}`);
  if (ANY) { console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED.'); process.exit(fail > 0 ? 0 : 1); }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
