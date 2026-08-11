/* @gate-pool: browser
 *
 * §24 — EVERY COLLAPSE SURFACE OPENS. THE FIRST GATE IN THIS REPO THAT CLICKS ANYTHING.
 *
 * THE INCIDENT IT NAMES (§7 brake — a real one, tonight). Two collapse tiles shipped DEAD:
 *   · the satellite "N more properties" stack — unclickable SINCE THE DAY IT SHIPPED, no handler at
 *     all, nobody noticed for months;
 *   · §22.7's column tile — born the same way hours earlier, because the spec said "a door" and
 *     never said "it opens".
 * The Captain found both in ten seconds by clicking them. ⛔ NO GATE IN THIS SUITE CLICKS ANYTHING,
 * so a dead affordance is invisible to all 202 of them: the instrument only ever reads the drawing.
 * 🔑 A DOOR THAT DOES NOT OPEN IS A WALL WITH WRITING ON IT — and copy describing hidden content is
 *    a promise of an affordance, so shipping the words without the verb is an advertisement for a
 *    door that isn't there.
 *
 * ⛔ AND THE DEFECT A DOM-READING GATE WOULD HAVE MISSED EVEN SO. A real click found that the tile's
 * rect has NO FILL — deliberately, since it quotes no balance — and an unfilled SVG rect is
 * hit-testable ONLY ON ITS STROKE. Role, tabindex and a listener were all present and the middle of
 * the tile still did nothing. AN AFFORDANCE IS NOT PROVEN BY ITS ATTRIBUTES, ONLY BY BEING HIT.
 * That is why every leg below drives a REAL mouse and a REAL keyboard, never dispatchEvent —
 * a synthetic event bypasses hit-testing and would have called the broken version green.
 *
 * ⭐ THE POPULATION IS DERIVED, NEVER LISTED. Every element carrying data-collapsed-count IS a
 * collapse surface, whatever it is called and whoever adds it next. Surface #3 cannot be born dead.
 *
 * Usage: node scripts/_gate_estate_fold_doors.js [LABEL] [--old]
 * Self-hosts on 127.0.0.1:8363. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const OLD = process.argv.includes('--old');
const PORT = 8363;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

let OLD_SRC = null;
if (OLD) {
  OLD_SRC = execFileSync('git', ['show', 'HEAD:scripts/datum-estate.js'], { cwd: ROOT, encoding: 'utf8' });
  const cur = fs.readFileSync(path.join(ROOT, 'scripts/datum-estate.js'), 'utf8');
  if (!OLD_SRC || OLD_SRC.length < 1000) { console.log('[fold_doors] ABORT — cannot read HEAD:scripts/datum-estate.js'); process.exit(2); }
  if (OLD_SRC === cur) { console.log('[fold_doors] ABORT — --old is identical to the working file; nothing would be proven'); process.exit(2); }
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (OLD && u === '/scripts/datum-estate.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(OLD_SRC); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

/* The first-impression overlay and the shape panel cover the canvas. They are hidden, NOT clicked
   through — a real click must remain a real click for these legs to mean anything. */
const clearCovers = (p) => p.evaluate(() => {
  ['studioOverlayWrap', 'shape-panel'].forEach((id) => {
    const o = document.getElementById(id);
    if (o) { o.style.display = 'none'; o.style.pointerEvents = 'none'; }
  });
});

const build = (p, spec) => p.evaluate((s) => {
  try { localStorage.clear(); } catch (e) {}
  window.state.accounts = [];
  for (const [t, n] of s) for (let i = 0; i < n; i++) addInstance(t);
  window.state.accounts.forEach((a, i) => { a.value = 100000 + i * 1000; });
  updateSVGs();
}, spec);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const pageErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 10000 });
  await p.waitForTimeout(400);

  const checks = [];
  const ck = (n, ok, obs) => checks.push([n, !!ok, obs === undefined ? '' : String(obs)]);

  /* ⚠️ FIXTURES MUST REACH THE FOLDED STATE OR THIS IS UNTESTED WEARING GREEN (§13.93). 12+ in one
     column and 7+ properties are the counts at which each surface actually folds. */
  const SCENES = [
    ['column tile (1 property + 14 accounts)', [['property', 1], ['taxable', 14]]],
    ['satellite tile (9 properties)',          [['property', 9]]],
  ];

  for (const [label, spec] of SCENES) {
    await build(p, spec); await p.waitForTimeout(650); await clearCovers(p);

    const surfaces = await p.$$('[data-collapsed-count]');
    ck(`P· fixture REACHED a folded state — ${label}`, surfaces.length >= 1, surfaces.length + ' collapse surface(s)');
    if (!surfaces.length) continue;

    const el = surfaces[0];
    const meta = await el.evaluate((e) => ({
      role: e.getAttribute('role'), tab: e.getAttribute('tabindex'),
      aria: e.getAttribute('aria-label'), pe: e.getAttribute('pointer-events'),
      n: +e.getAttribute('data-collapsed-count'),
    }));
    ck(`A· the surface is a real control (role/tabindex/label) — ${label}`,
       meta.role === 'button' && meta.tab === '0' && !!meta.aria && meta.aria.length > 10,
       `role=${meta.role} tabindex=${meta.tab} aria="${String(meta.aria).slice(0, 40)}"`);
    /* Named separately because it is the leg a DOM-reading gate would not think to write. */
    ck(`A· and it is HIT-TESTABLE across its whole face, not just its stroke — ${label}`,
       meta.pe === 'all', 'pointer-events=' + meta.pe);

    // A REAL CLICK. If the tile is unreachable this throws, and the leg reports the dead door.
    let opened = false, dlg = null;
    try {
      await el.click({ timeout: 5000 });
      await p.waitForTimeout(250);
      dlg = await p.evaluate(() => {
        const d = document.querySelector('.datum-fold-picker [role="dialog"]');
        if (!d) return null;
        return {
          modal: d.getAttribute('aria-modal'), labelled: !!d.getAttribute('aria-labelledby'),
          rows: d.querySelectorAll('button.datum-fold-row').length,
          focus: (document.activeElement.className || ''),
          money: Array.from(d.querySelectorAll('button.datum-fold-row')).filter((r) => /\$/.test(r.innerText)).length,
        };
      });
      opened = !!dlg;
    } catch (e) { opened = false; }
    ck(`D· A REAL CLICK OPENS THE DOOR — ${label}`, opened, opened ? 'dialog present' : '*** DEAD DOOR — click did nothing ***');
    if (!opened) continue;

    ck(`D· the picker lists EXACTLY the folded set — ${label}`, dlg.rows === meta.n, `${dlg.rows} rows vs ${meta.n} folded`);
    /* The collapse tile may not quote a balance because you cannot open into it. The moment you can,
       the money must be visible — this is where "all counted in your totals" becomes checkable. */
    ck(`D· every row shows its balance — ${label}`, dlg.money === dlg.rows, `${dlg.money}/${dlg.rows} rows carry a figure`);
    ck(`D· the dialog is a real dialog (aria-modal + labelled + focus moved) — ${label}`,
       dlg.modal === 'true' && dlg.labelled && /datum-fold-row/.test(dlg.focus), `modal=${dlg.modal} labelled=${dlg.labelled} focus=${dlg.focus}`);

    // Picking swaps: the fold COUNT is unchanged (one in, one out) and the total never moves.
    const before = meta.n;
    await p.click('.datum-fold-picker button.datum-fold-row');
    await p.waitForTimeout(650);
    const after = await p.evaluate(() => {
      const e = document.querySelector('[data-collapsed-count]');
      return { n: e ? +e.getAttribute('data-collapsed-count') : 0, closed: !document.querySelector('.datum-fold-picker') };
    });
    ck(`S· picking a room SWAPS rather than grows — ${label}`, after.n === before, `folded ${before} -> ${after.n}`);
    ck(`S· and the dialog closes behind it — ${label}`, after.closed, after.closed ? 'closed' : 'still open');

    // KEYBOARD. A control that gates access to data may not be mouse-only.
    await p.focus('[data-collapsed-count]');
    await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    const kOpen = await p.evaluate(() => !!document.querySelector('.datum-fold-picker'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    const kShut = await p.evaluate(() => !document.querySelector('.datum-fold-picker'));
    ck(`K· Enter opens it from the keyboard — ${label}`, kOpen, kOpen ? 'opened' : 'keyboard cannot reach the rooms');
    ck(`K· Escape closes it — ${label}`, kShut, kShut ? 'closed' : 'trapped');
  }

  ck('R1 no page errors across every scenario', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'none');

  await b.close();
  server.close();

  let pass = 0;
  const lines = checks.map(([n, ok, obs]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n + (obs ? '   [observed: ' + obs + ']' : ''); });
  const summary = '[' + LABEL + (OLD ? ' --old(HEAD renderer)' : '') + '] ' + pass + '/' + checks.length + ' GREEN\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_estate_fold_doors.out.txt', summary, 'utf8');
  console.log(summary);
  console.log('[_gate_estate_fold_doors] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
    (OLD ? '   (--old: RED IS THE EXPECTED RESULT)' : ''));
  process.exit(pass === checks.length ? 0 : 1);
})();
