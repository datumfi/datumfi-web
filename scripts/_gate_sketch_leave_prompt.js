'use strict';
/* SKETCH LEAVE PROMPT · RED-FIRST — the prompt fires only when something was BUILT, says the true thing,
 * and never eats a link.
 *
 * hasBuilt = TOUCHED **AND** CONTENT-DIFFERS, and the gate proves each half is load-bearing separately,
 * because either one alone ships a lie:
 *   TOUCH ALONE   -> "You have sketched real work here" after a slider is nudged and put back.
 *   CONTENT ALONE -> the opening showcase sweep drives slider-datum for ~2.6s, so a visitor who leaves
 *                    inside that window reads as having built something they did not build.
 * TOUCHED reads e.isTrusted, WHICH IS THE BROWSER'S OWN STAMP — the user agent sets it, page script
 * cannot, and every dispatched event is false. SKETCH 2 proves that by forging: a full synthetic
 * pointerdown plus a real value change must NOT arm the prompt.
 *
 * THE LOAD-BEARING ASSERTION IS SKETCH 6, NOT SKETCH 3. The prompt firing is the feature; the link still
 * working when the prompt is broken is what makes it safe to ship on a page people build things on (L60).
 *
 * RACE DECLARATIONS (L52): none. Every click is driven once and read after a fixed settle longer than
 * both the 2.6s boot sweep and any navigation commit.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

// --notouch   drops the trusted-touch half of the AND -> the boot sweep alone arms the prompt.
const NOTOUCH   = process.argv.includes('--notouch');
// --nocontent drops the content half -> a touch that changed nothing arms the prompt.
const NOCONTENT = process.argv.includes('--nocontent');
// --noguard   removes the prompt from the chokepoint entirely -> the feature red-first.
const NOGUARD   = process.argv.includes('--noguard');

const A_BUILT   = "      window._skHasBuilt = function () { return !!window._skDirty && _contentDiffers(); };";
const M_NOTOUCH = "      window._skHasBuilt = function () { return _contentDiffers(); };";
const M_NOCONT  = "      window._skHasBuilt = function () { return !!window._skDirty; };";
const A_GUARD   = "      if (_skLeaveGuard(url, _proceed)) return;";
const M_GUARD   = "      if (false) return;";
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/sketch.html' && (NOTOUCH || NOCONTENT || NOGUARD)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
      src = src.replace(a, m);
    };
    if (NOTOUCH)   apply(A_BUILT, M_NOTOUCH, 'notouch');
    if (NOCONTENT) apply(A_BUILT, M_NOCONT,  'nocontent');
    if (NOGUARD)   apply(A_GUARD, M_GUARD,   'noguard');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8255; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  async function open(signedIn) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(`(() => {
      try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
      try { localStorage.setItem('datum-discover-v1','done'); } catch(e){}
      ${signedIn ? "try { sessionStorage.setItem('datum_auth_hint','1'); } catch(e){}" : ''}
    })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);                                   // well past the ~2.6s opening sweep
    return { ctx, page };
  }
  // A REAL human edit: a trusted press on the slider, then a real value change.
  async function realEdit(page) {
    const sl = await page.$('#slider-datum');
    await sl.hover(); await page.mouse.down(); await page.mouse.up();   // trusted pointerdown
    await page.evaluate(() => {
      const s = document.getElementById('slider-datum');
      s.value = String(Math.round(parseFloat(s.value) * 1.18));
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(600);
  }
  const promptState = (page) => page.evaluate(() => {
    const w = document.querySelector('[data-leave-prompt]');
    return {
      open: !!w,
      branch: w ? w.getAttribute('data-leave-prompt') : null,
      // FIRST LEAF div — querySelector('div') returns the card wrapper, whose textContent is the whole
      // dialog concatenated. Read the leaves or the assertion silently tests the wrong node.
      title: w ? (Array.from(w.querySelectorAll('div')).filter((d) => d.childElementCount === 0)[0] || {}).textContent : null,
      btns: w ? Array.from(w.querySelectorAll('button')).map((b) => b.textContent) : []
    };
  });

  // ── SKETCH 1 — untouched cold load, the boot sweep has run. MUST be silent. ────────────────────────
  {
    const { ctx, page } = await open(false);
    const built = await page.evaluate(() => window._skHasBuilt());
    const start = page.url();
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(2500);
    const st = await promptState(page);
    lines.push(`      [untouched]  hasBuilt=${built} promptOpen=${st.open} navigated=${page.url() !== start}`);
    ok(built === false && st.open === false,
      `SKETCH 1 LOAD-BEARING: after the full boot sweep with NOTHING touched, hasBuilt=${built} and no prompt fires`);
    await ctx.close();
  }

  // ── SKETCH 2 — a FORGED touch plus a real value change. MUST still be silent. ──────────────────────
  {
    const { ctx, page } = await open(false);
    const built = await page.evaluate(() => {
      const s = document.getElementById('slider-datum');
      s.value = String(Math.round(parseFloat(s.value) * 1.2));
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));   // isTrusted is FALSE
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      return window._skHasBuilt();
    });
    const differs = await page.evaluate(() => window._skContentDiffers());
    lines.push(`      [forged touch] contentDiffers=${differs} hasBuilt=${built}`);
    ok(differs === true && built === false,
      `SKETCH 2: a FORGED pointerdown cannot arm the prompt even with the content genuinely changed (contentDiffers=${differs}, hasBuilt=${built}) — isTrusted is the browser's stamp, not ours`);
    await ctx.close();
  }

  /* ── SKETCH 2b — a REAL, TRUSTED touch that CHANGES NOTHING. MUST still be silent. ─────────────────
   * This is the assertion that makes the CONTENT half load-bearing, and it was missing on the first
   * build of this gate: --nocontent landed cleanly and NOTHING went red, which measured the rig rather
   * than the product. A mutation that cannot bite is not a pass. This is the "poked a slider and put it
   * back" case, and without it "You have sketched real work here" is a sentence we cannot stand behind. */
  {
    const { ctx, page } = await open(false);
    await page.keyboard.press('Shift');                 // trusted keydown, changes no value anywhere
    await sleep(500);
    const st2 = await page.evaluate(() => ({ dirty: !!window._skDirty, differs: window._skContentDiffers(), built: window._skHasBuilt() }));
    const start = page.url();
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(2500);
    const st = await promptState(page);
    lines.push(`      [real touch, no change] dirty=${st2.dirty} contentDiffers=${st2.differs} hasBuilt=${st2.built} promptOpen=${st.open}`);
    ok(st2.dirty === true && st2.differs === false && st2.built === false && st.open === false,
      `SKETCH 2b LOAD-BEARING: a REAL trusted touch that changed nothing leaves dirty=${st2.dirty} but hasBuilt=${st2.built} and NO prompt — touched is not built`);
    await ctx.close();
  }

  // ── SKETCH 3/4 — a REAL edit, signed out -> Branch B. ─────────────────────────────────────────────
  {
    const { ctx, page } = await open(false);
    await realEdit(page);
    const built = await page.evaluate(() => window._skHasBuilt());
    const start = page.url();
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(2500);
    const st = await promptState(page);
    lines.push(`      [signed out, real edit] hasBuilt=${built} branch=${st.branch} navigated=${page.url() !== start} btns=${JSON.stringify(st.btns)}`);
    ok(built === true && st.open === true && st.branch === 'B',
      `SKETCH 3 POSITIVE CONTROL: one REAL edit then a nav click fires Branch B (hasBuilt=${built}, branch=${st.branch}) — without this the two zeros above prove nothing`);
    ok(page.url() === start,
      'SKETCH 4: and the navigation is HELD while the human is being asked — nothing has left the page');
    ok(st.btns.indexOf('Keep sketching') >= 0,
      `SKETCH 4b: B offers "Keep sketching" as its visible way to stay (got ${JSON.stringify(st.btns)})`);
    // Dismiss must return them exactly here.
    await page.keyboard.press('Escape');
    await sleep(1200);
    const after = await promptState(page);
    ok(after.open === false && page.url() === start,
      'SKETCH 5: Escape closes the prompt and navigates NOWHERE — the user is exactly where they were');
    await ctx.close();
  }

  // ── SKETCH 6 — FAIL OPEN. The component is missing; the link must still work. ──────────────────────
  {
    const { ctx, page } = await open(false);
    await realEdit(page);
    const start = page.url();
    await page.evaluate(() => { try { delete window.DatumLeavePrompt; } catch (e) { window.DatumLeavePrompt = undefined; } });
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(3000);
    lines.push(`      [component missing] navigated=${page.url() !== start} -> ${page.url()}`);
    ok(/studio\.html$/.test(page.url()),
      `SKETCH 6 FAIL-OPEN, LOAD-BEARING: with the prompt component GONE the link still navigates and nobody is stranded (landed ${page.url()})`);
    await ctx.close();
  }

  // ── SKETCH 7 — signed in, never saved -> Branch C, the true sentence for that person. ─────────────
  {
    const { ctx, page } = await open(true);
    await realEdit(page);
    const start = page.url();
    await page.evaluate(() => window._navDrain('/studio.html'));
    await sleep(2000);
    const st = await promptState(page);
    lines.push(`      [signed in, never saved] branch=${st.branch} title=${JSON.stringify(st.title)}`);
    ok(st.open === true && st.branch === 'C',
      `SKETCH 7: a signed-in architect who has never saved gets Branch C, not B — he is never asked to create an account he owns (branch=${st.branch})`);
    ok(st.title === "You haven't saved this yet",
      `SKETCH 7b: and the headline is the true one for him (got ${JSON.stringify(st.title)})`);
    ok(page.url() === start, 'SKETCH 7c: the navigation is held for him too');
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOTOUCH || NOCONTENT || NOGUARD;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (sketch.html bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = NOTOUCH ? 'MUTATED[notouch]' : NOCONTENT ? 'MUTATED[nocontent]' : NOGUARD ? 'MUTATED[noguard]' : 'CLEAN';
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
