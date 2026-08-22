/* ══ THE SEAM PIN — --studio-panel-w MUST RESOLVE TO ONE VALUE FOR EVERY CONSUMER ════════════════
 *
 * WHY THIS EXISTS. `ac15e30` shipped a live, user-visible regression that no instrument could see.
 * styles/header.css:143 pins the Sheet · Split · Structure toggle with `left: var --studio-panel-w`
 * and calls it, in its own comment, "seam-pinned to the drafting<->blueprint divide". But #app-nav
 * is a SIBLING of #studio-layout, not a descendant — so when ac15e30 declared the panel default on
 * `.studio-layout`, the toggle went on resolving header.css's :root 480 while the panel rendered at
 * 400. MEASURED on headed Chrome before the repair: 80px off the seam at rest, and when the seam
 * was driven 400 -> 600 the toggle moved ZERO pixels.
 *
 * 🔑 THE INVARIANT IS NOT "THE TOGGLE IS AT 400". IT IS "EVERY CONSUMER RESOLVES THE SAME VALUE".
 *    A gate pinned to a number would go green on the day somebody changes the number in one place.
 *    This one compares the two scopes against EACH OTHER, so it cannot be satisfied by a coincidence
 *    and it keeps biting after the default moves.
 *
 * ⛔ AND IT IS A CLASS GATE, NOT AN INSTANCE FIX. "A value fix without its gate is a defect
 *    repaired, not a class closed" — the class is A CUSTOM PROPERTY WRITTEN BELOW THE ROOT THAT TWO
 *    INDEPENDENT SUBTREES MUST AGREE ON. Nothing else in the suite looks for it.
 *
 * LEGS
 *   L1  at rest, the token resolves IDENTICALLY at the seam consumer and at #studio-layout
 *   L2  at rest, the toggle's left edge sits on the panel's right edge (header.css's own claim)
 *   L3  after the width is driven, BOTH scopes still agree AND carry the new value
 *   L4  after the width is driven, the toggle FOLLOWED the seam (the geometric consequence)
 *   L5  population — both elements exist and the toggle has a real box (never a vacuous green)
 *   L6  SIGNED-IN: #acct-topbar's toggle is pinned to the seam at rest
 *   L7  SIGNED-IN: it FOLLOWS the seam when the panel is driven
 * ⚠️ L1-L5 are the SIGNED-OUT bar (#app-nav); L6-L7 are the SIGNED-IN bar (#acct-topbar). Both
 *    resolve the token from documentElement, and BOTH are asserted, because signed-in is the state
 *    no local smoke can reach — the one most likely to rot, and so the one least safe to leave bare.
 *
 * RED-FIRST CONTROLS — each names the legs it reds, per the rule that a red-first which reds for a
 * different reason than the leg under test proves nothing:
 *   --reshadow  restores ONLY the deleted `.studio-layout` declaration in the SERVED bytes.
 *               At rest every scope still reads 400, so L1/L2/L6 STAY GREEN and L3/L4/L7 GO RED —
 *               the "does it follow the drag" half, isolated, in both auth states.
 *   --prefix    restores the declaration AND re-points the writer at #studio-layout, i.e. the
 *               EXACT shipped state of ac15e30. L1,L2,L3,L4,L6,L7 go red, and L2's failure
 *               reproduces the measured 80px.
 * ⛔ Both poisons PROVE THEY LANDED (replacement counted) and ABORT rather than print a green if
 *    they did not — an unlandable poison that reports green is indistinguishable from a passing
 *    control. And the inert-control guard asserts the EXACT red set, so a control that reds the
 *    wrong leg is a failure of this file, not a pass.
 *
 * @gate-pool: browser
 * ⛔ DECLARED, NOT LEFT TO INFERENCE. The runner would have classified this correctly anyway by
 * matching require('playwright') in the source — but _suite_baseline.mjs's own accounting calls
 * that "classified by inference (a guess, not a source)", and a gate that JOINS THE POPULATION ON
 * A GUESS is "ask the runner for a population, never grep one" turned inside out. The declaration
 * is the source; the inference is the fallback. This gate self-hosts on 127.0.0.1:8151, so it does
 * not depend on the runner's shared :8001 server and can be run standalone.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8151;
const VW = 1440, VH = 900;
const RESHADOW = process.argv.includes('--reshadow');
const PREFIX = process.argv.includes('--prefix');
const ROOT = process.cwd();

/* The three exact strings the poisons rewrite. Kept beside each other so a source edit that breaks
   a poison breaks it LOUDLY (count !== 1 aborts) instead of quietly making the control inert. */
const LAYOUT_RULE = '.studio-layout { display: flex; flex: 1; min-height: 0; width: 100%; margin: 0 auto; }';
const LAYOUT_RULE_SHADOWED = '.studio-layout { display: flex; flex: 1; min-height: 0; width: 100%; margin: 0 auto; --studio-panel-w: 400px; }';
const ROOT_WRITE = "document.documentElement.style.setProperty('--studio-panel-w', v + 'px');";
const ELEMENT_WRITE = "var _l0 = document.getElementById('studio-layout'); if (_l0) _l0.style.setProperty('--studio-panel-w', v + 'px');";

let landed = [];
function poison(rel, body) {
  if (!RESHADOW && !PREFIX) return body;
  if (rel === 'studio.html') {
    const n = body.split(LAYOUT_RULE).length - 1;
    if (n !== 1) { console.log(`ABORT: poison anchor for studio.html matched ${n} times, expected 1`); process.exit(1); }
    landed.push('studio.html:layout-rule');
    body = body.split(LAYOUT_RULE).join(LAYOUT_RULE_SHADOWED);
  }
  if (PREFIX && rel === 'scripts/studio-panel-resize.js') {
    const n = body.split(ROOT_WRITE).length - 1;
    if (n !== 1) { console.log(`ABORT: poison anchor for studio-panel-resize.js matched ${n} times, expected 1`); process.exit(1); }
    landed.push('studio-panel-resize.js:writer');
    body = body.split(ROOT_WRITE).join(ELEMENT_WRITE);
  }
  return body;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const fp = path.join(ROOT, rel);
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    const ext = path.extname(fp).toLowerCase();
    let out = buf;
    if (ext === '.html' || ext === '.js') out = Buffer.from(poison(rel, buf.toString('utf8')), 'utf8');
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(out);
  });
});

const legs = {};
let pass = 0, total = 0;
function ok(id, label, cond, detail) {
  total++; if (cond) pass++;
  legs[id] = !!cond;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${id} ${label}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { localStorage.removeItem('datum_studio_panel_w'); } catch (e) {}
  });
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  console.log(`SEAM PIN — --studio-panel-w one-value invariant${RESHADOW ? '   MODE: --reshadow' : ''}${PREFIX ? '   MODE: --prefix' : ''}`);
  if (RESHADOW || PREFIX) console.log(`  poison landed in: ${landed.join(', ') || 'NOTHING'}`);
  if ((RESHADOW || PREFIX) && landed.length === 0) { console.log('ABORT: control requested but no poison landed'); process.exit(1); }

  const read = () => page.evaluate(() => {
    const nav = document.querySelector('#app-nav .view-toggle.studio-seam');
    const lay = document.getElementById('studio-layout');
    const panel = document.querySelector('.drafting-panel');
    if (!nav || !lay || !panel) return { present: false };
    const nr = nav.getBoundingClientRect(), pr = panel.getBoundingClientRect();
    return {
      present: true,
      navTok: getComputedStyle(nav).getPropertyValue('--studio-panel-w').trim(),
      layTok: getComputedStyle(lay).getPropertyValue('--studio-panel-w').trim(),
      navLeft: nr.left, navW: nr.width, navH: nr.height,
      panelRight: pr.right
    };
  });

  const rest = await read();

  /* L5 FIRST — a population leg that runs LAST would let four vacuous greens print above it. */
  ok('L5', 'population: seam toggle + layout + panel all present, toggle has a real box',
    rest.present && rest.navW > 0 && rest.navH > 0,
    rest.present ? `toggle ${Math.round(rest.navW)}x${Math.round(rest.navH)}` : 'AN ELEMENT IS MISSING');
  if (!rest.present) {
    console.log('ABORT: the population is incomplete — every leg below would be vacuous.');
    console.log('SCORE 0/7 RED');
    await browser.close(); server.close(); process.exit(1);
  }

  ok('L1', 'at rest the token resolves IDENTICALLY in both scopes',
    rest.navTok === rest.layTok, `#app-nav=${rest.navTok}  #studio-layout=${rest.layTok}`);
  ok('L2', "at rest the toggle's left edge sits on the panel's right edge",
    Math.round(rest.navLeft) === Math.round(rest.panelRight),
    `toggle.left=${rest.navLeft.toFixed(1)}  panel.right=${rest.panelRight.toFixed(1)}  delta=${(rest.navLeft - rest.panelRight).toFixed(1)}px`);

  /* Drive the seam. 600 is inside the ruled 340-760 range and lands in the `wide` tier, so this
     also exercises a real tier change rather than a no-op nudge. */
  await page.evaluate(() => window._studioPanelApply(600, false));
  await page.waitForTimeout(150);
  const moved = await read();

  ok('L3', 'after the width is driven, both scopes still agree AND carry the new value',
    moved.navTok === moved.layTok && moved.navTok === '600px',
    `#app-nav=${moved.navTok}  #studio-layout=${moved.layTok}`);
  ok('L4', 'after the width is driven, the toggle FOLLOWED the seam',
    Math.round(moved.navLeft) === Math.round(moved.panelRight),
    `toggle.left=${moved.navLeft.toFixed(1)}  panel.right=${moved.panelRight.toFixed(1)}  toggle moved ${(moved.navLeft - rest.navLeft).toFixed(1)}px, seam moved ${(moved.panelRight - rest.panelRight).toFixed(1)}px`);

  /* ── L6/L7 · THE SIGNED-IN BAR PINS TOO ──────────────────────────────────────────────────────
     Added 2026-08-22 with the context-aware nav. #acct-topbar is document.body.prepend-ed and
     position:fixed, so it is a SIBLING of #studio-layout exactly like #app-nav — it can only read
     --studio-panel-w because this same commit's predecessor moved the write to documentElement.
     ⛔ WITHOUT THESE LEGS THE SIGNED-IN PIN WOULD BE A NEW BINDING WITH NOTHING BEHIND IT, on the
     one auth state no local smoke can reach (Clerk rejects 127.0.0.1) — i.e. the state MOST likely
     to rot unnoticed, guarded LEAST. Clerk stub copied from _gate_room_labels rather than invented.
     ⚠️ THE TWO BARS ARE DIFFERENT HEIGHTS (64px signed-in vs 56px signed-out) BY DESIGN, so this
     asserts the LEFT EDGE only. Normalising the heights is a nav redesign, not this contract. */
  const ctx2 = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(`(() => {
    try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
    try { localStorage.setItem('datum-discover-v1','done'); localStorage.removeItem('datum_studio_panel_w'); } catch(e){}
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('tok'); } },
      user: { id:'u', firstName:'P', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
              update: function(){ return Promise.resolve(); } } };
  })();`);
  await p2.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'commit' });
  let signedInOk = true;
  try { await p2.waitForSelector('#acct-topbar .acct-studio-toggle', { timeout: 30000 }); }
  catch (e) { signedInOk = false; }
  await p2.waitForTimeout(1500);

  if (!signedInOk) {
    ok('L6', 'the signed-in Studio bar rendered its pinned toggle', false, 'the signed-in top bar never appeared — fixture failure, NOT a pass');
    ok('L7', 'the signed-in toggle follows the seam', false, 'not reached');
  } else {
    const si = await p2.evaluate(() => {
      const t = document.querySelector('#acct-topbar .acct-studio-toggle');
      const panel = document.querySelector('.drafting-panel');
      return { pos: getComputedStyle(t).position, left: t.getBoundingClientRect().left, panelRight: panel.getBoundingClientRect().right };
    });
    ok('L6', 'the signed-in toggle is pinned to the seam at rest',
      si.pos === 'absolute' && Math.round(si.left) === Math.round(si.panelRight),
      `position:${si.pos}  toggle.left=${si.left.toFixed(1)}  panel.right=${si.panelRight.toFixed(1)}  delta=${(si.left - si.panelRight).toFixed(1)}px`);
    await p2.evaluate(() => window._studioPanelApply(600, false));
    await p2.waitForTimeout(150);
    const si2 = await p2.evaluate(() => {
      const t = document.querySelector('#acct-topbar .acct-studio-toggle');
      const panel = document.querySelector('.drafting-panel');
      return { left: t.getBoundingClientRect().left, panelRight: panel.getBoundingClientRect().right };
    });
    ok('L7', 'the signed-in toggle FOLLOWS the seam when it moves',
      Math.round(si2.left) === Math.round(si2.panelRight),
      `toggle.left=${si2.left.toFixed(1)}  panel.right=${si2.panelRight.toFixed(1)}  toggle moved ${(si2.left - si.left).toFixed(1)}px, seam moved ${(si2.panelRight - si.panelRight).toFixed(1)}px`);
  }
  await ctx2.close();

  await browser.close();
  server.close();

  /* ── INERT-CONTROL GUARD. A control is only evidence if it reds THE NAMED LEG and leaves the
     others alone. Anything else — including "everything went red" — is a broken control wearing
     the costume of diligence. */
  const redSet = Object.keys(legs).filter((k) => !legs[k]).sort().join(',');
  /* ⛔ THE EXPECTED SETS ARE REASONED FROM THE MECHANISM, NOT FITTED TO A RUN. Deriving them by
     running the control and writing down whatever came out is how a control gets retro-fitted to
     its own bug. Both include the signed-in legs because #acct-topbar resolves the token from the
     SAME documentElement scope as #app-nav — if it did not, that is a finding, not a tolerance. */
  if (RESHADOW) {
    const want = 'L3,L4,L7';
    if (redSet !== want) { console.log(`ABORT: --reshadow must red exactly ${want}; it red [${redSet || 'nothing'}]`); process.exit(1); }
    console.log(`  control OK — --reshadow red exactly ${want} (L1/L2/L6 stayed green: at rest both scopes still read 400)`);
    console.log(`SCORE ${total}/${total} GREEN   (red-first control behaved as specified)`);
    process.exit(0);
  }
  if (PREFIX) {
    const want = 'L1,L2,L3,L4,L6,L7';
    if (redSet !== want) { console.log(`ABORT: --prefix must red exactly ${want}; it red [${redSet || 'nothing'}]`); process.exit(1); }
    console.log(`  control OK — --prefix red exactly ${want} (the shipped ac15e30 state reproduced, both auth states)`);
    console.log(`SCORE ${total}/${total} GREEN   (red-first control behaved as specified)`);
    process.exit(0);
  }

  console.log(`SCORE ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('FAIL harness: ' + (e && e.message)); console.log('SCORE 0/7 RED'); process.exit(1); });
