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

/* `link` mortgages the LAST property added. That property is provably one of the FOLDED satellites
   (9 properties -> 1 grounds owner + 8 satellites; sCap=7 so 6 draw and the last TWO fold), which is
   what makes the Yard leg below reach the state it claims to test rather than wearing green. */
const build = (p, spec, link) => p.evaluate(({ s, lk }) => {
  try { localStorage.clear(); } catch (e) {}
  window.state.accounts = [];
  for (const [t, n] of s) for (let i = 0; i < n; i++) addInstance(t);
  window.state.accounts.forEach((a, i) => { a.value = 100000 + i * 1000; });
  if (lk) {
    const props = window.state.accounts.filter((a) => a.baseId === 'property');
    const debt = window.state.accounts.find((a) => (getBaseType(a.baseId) || {}).taxCode === 'debt');
    if (props.length && debt) debt.linkedAssetId = props[props.length - 1].id;
  }
  updateSVGs();
}, { s: spec, lk: !!link });

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

  /* ⚠️ FIXTURES MUST REACH THE FOLDED STATE OR THIS IS UNTESTED WEARING GREEN (§13.93).
     ⭐ THE COUNTS ARE DERIVED, AND THE OLD COMMENT HERE SAID "7+ properties", WHICH WAS WRONG.
     Measured 2026-08-11 from the live geometry: sCap = floor((sBot-sTop+sGap)/sPitch)
     = floor((1010-180+15)/110) = 7, and the stack appears only when satellites EXCEED it. The first
     property becomes The Grounds (§19.15 — born a Primary residence), so it takes NINE property
     rooms to fold the satellite stack, not seven. Column side: _COL_CAP = 11, so 12+ in one column.
     🔑 A NUMBER WITHOUT ITS DERIVATION ROTS — this one had, silently, inside a fixture comment. */
  const SCENES = [
    /* ⛔ `surface` IS DECLARED, NEVER SNIFFED FROM THE LABEL. First cut tested /propert/i against the
       label and the COLUMN scene reads "1 property + 14 accounts" — so it demanded the satellite copy
       from the second floor and failed a correct product. A human label is prose; a branch key is
       data. 🔑 PROXIMITY IS NOT OWNERSHIP, and neither is a word appearing in a sentence. */
    { label: 'column tile (1 property + 14 accounts)', surface: 'floor', spec: [['property', 1], ['taxable', 14]] },
    { label: 'satellite tile (9 properties)',          surface: 'props', spec: [['property', 9]] },
    /* §25.3 — the leg that would have caught tonight's trap. A folded property carrying a lien must
       open THE YARD, not the account modal, exactly as its tile does. */
    { label: 'satellite tile, LAST property mortgaged', surface: 'props',
      spec: [['property', 9], ['mortgage_joint', 1]], link: true, yardRow: 1 },
  ];

  for (const { label, spec, link, yardRow, surface } of SCENES) {
    await build(p, spec, link); await p.waitForTimeout(650); await clearCovers(p);

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
          text: (d.innerText || '').replace(/\s+/g, ' ').trim(),
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

    /* ══ §25.1 / §25.2 · THE RENDERER'S VOCABULARY MAY NOT REACH THE USER ═══════════════════════
       ⛔ A user has never once thought about a COLUMN, and nobody's house has FOLDED rooms. Those
       are facts about our layout algorithm that leaked into the product for three prompts — and the
       mechanism came out wrong in the same direction as the words. THE COPY IS AN EARLY WARNING FOR
       THE ARCHITECTURE, so it gets an instrument.
       ⭐ TWO LEGS, BOTH DIRECTIONS: the authored words are PRESENT, and the retired words are ABSENT.
       An absence leg alone is silent by construction — it would pass on an empty dialog. */
    const wantHead = surface === 'props' ? 'THE OTHER PROPERTIES' : 'THE SECOND FLOOR';
    const wantSub  = surface === 'props'
      ? `${meta.n} more properties. Pick one to enter it.`
      : `${meta.n} rooms up here. Pick one to enter it.`;
    ck(`C· the picker speaks the AUTHORED words — ${label}`,
       dlg.text.includes(wantHead) && dlg.text.includes(wantSub),
       `head="${wantHead}" sub="${wantSub}" in "${dlg.text.slice(0, 70)}"`);
    const banned = dlg.text.match(/column|in this wing|folded|bring it into view/i);
    ck(`C· and NOT the renderer's — ${label}`, !banned,
       banned ? `*** leaked: "${banned[0]}" ***` : 'no column/wing/folded/bring-into-view');
    /* The tile's own face and its accessible name carry the same retirement. */
    const tileTxt = await el.evaluate((e) => ((e.textContent || '') + ' ' + (e.getAttribute('aria-label') || '')).replace(/\s+/g, ' '));
    const tileBad = tileTxt.match(/column|in this wing|folded|bring into view/i);
    ck(`C· the collapse TILE and its accessible name are clean too — ${label}`, !tileBad,
       tileBad ? `*** leaked: "${tileBad[0]}" ***` : tileTxt.trim().slice(0, 60));

    /* ══ §25.3 · THE DRAWN SET IS BYTE-IDENTICAL ACROSS A PICK ══════════════════════════════════
       ⛔ THIS LEG IS AN INVERSION, NOT A NEW LEG. It used to read "picking a room SWAPS rather than
       grows" and it PASSED — because it measured the exact behaviour that turned out to be the bug.
       §24 made a pick swap the picked room into the drawn set and fold whatever it displaced, so the
       folded pair was DIFFERENT on every open and the user could never learn his own house. A pick
       is now a NO-OP on the drawing, which makes the correct assertion trivial: SAME LIST, SAME
       ORDER. 🔑 A GATE THAT MEASURES THE BUG GOES GREEN ON THE BUG — invert it, never delete it.

       ⭐ AND IT PICKS TWICE, WHICH IS THE WHOLE POINT. The old build reshuffled on every pick, but a
       single-pick assertion could still have looked stable — the Captain only SAW the shuffle on the
       second open, because that is when the folded set came back different. One pick proves nothing
       an accident could not also produce. */
    const fingerprint = () => p.evaluate(() =>
      Array.from(document.querySelectorAll('g.room-grp'))
        .map((g) => g.getAttribute('onclick') || g.getAttribute('class') || '?').join(' | '));
    const pickState = () => p.evaluate(() => {
      const vis = (id) => { const e = document.getElementById(id);
        return !!e && getComputedStyle(e).display !== 'none'; };
      return { mounted: !!document.querySelector('.datum-fold-picker'),
               acct: vis('account-modal-overlay'), yard: vis('yard-modal-overlay') };
    });
    const closeRooms = () => p.evaluate(() => {
      ['account-modal-overlay', 'yard-modal-overlay'].forEach((id) => {
        const e = document.getElementById(id); if (e) e.style.display = 'none';
      });
    });

    const fp0 = await fingerprint();
    await p.click('.datum-fold-picker button.datum-fold-row');
    await p.waitForTimeout(650);
    const fp1 = await fingerprint();
    const st1 = await pickState();

    ck(`S· A PICK OPENS A ROOM — ${label}`, st1.acct || st1.yard,
       `account=${st1.acct} yard=${st1.yard}` + (st1.acct || st1.yard ? '' : ' *** picked nothing ***'));
    ck(`S· the drawn set is UNCHANGED after one pick — ${label}`, fp1 === fp0,
       fp1 === fp0 ? 'identical' : '*** THE CANVAS MOVED ***');
    /* §25.3 AMENDED: the picker is visually REPLACED by the room, never destroyed. You go up, step
       into a room, step back out onto the landing — the landing was not demolished while inside. */
    ck(`S· and the second floor is STILL STANDING beneath it — ${label}`, st1.mounted,
       st1.mounted ? 'picker mounted' : '*** picker destroyed — user lands on the canvas ***');

    /* ⛔ THE ESCAPE GUARD. The picker's keydown is CAPTURE-phase on document and the account modal
       has no Escape handler of its own, so an unguarded picker would close the floor out from under
       an open room. This leg names that exact defect. */
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const stEsc = await pickState();
    ck(`S· Escape inside an open room does NOT close the floor beneath it — ${label}`, stEsc.mounted,
       stEsc.mounted ? 'picker survived' : '*** Escape closed the second floor under the room ***');

    /* THE SECOND PICK. On the mortgaged scene this same click doubles as the Yard leg — row 1 IS the
       lien-carrying property (9 properties: 1 owns the ground, 8 satellite, 6 draw, the LAST TWO
       fold, and `link` mortgages the last), so one click proves both that the canvas held still and
       that the branch resolved correctly. */
    await closeRooms();
    const rows = await p.$$('.datum-fold-picker button.datum-fold-row');
    if (yardRow !== undefined) {
      ck(`Y· the fixture REACHED a mortgaged folded property — ${label}`, rows.length > yardRow,
         `${rows.length} folded row(s), needed index ${yardRow}`);
    }
    const second = (yardRow !== undefined && rows.length > yardRow) ? yardRow : (rows.length > 1 ? 1 : 0);
    if (rows.length) { await rows[second].click(); await p.waitForTimeout(650); }
    const fp2 = await fingerprint();
    const st2 = await pickState();
    ck(`S· and the drawn set is STILL unchanged after a SECOND pick — ${label}`, fp2 === fp0,
       fp2 === fp0 ? 'identical' : '*** the folded set differs on the second open ***');
    if (yardRow !== undefined && rows.length > yardRow) {
      ck(`Y· A MERGED SATELLITE OPENS THE YARD, NOT THE ACCOUNT MODAL — ${label}`,
         st2.yard && !st2.acct, `yard=${st2.yard} account=${st2.acct}`);
    }

    /* Tear the floor down the way a user would, and assert the Escape guard RELEASES: with no room
       above it, Escape must close the picker again. A guard that never lets go is its own bug. */
    await closeRooms();
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    const released = await p.evaluate(() => !document.querySelector('.datum-fold-picker'));
    ck(`S· with no room above it, Escape closes the floor again (the guard RELEASES) — ${label}`,
       released, released ? 'closed' : '*** picker stuck open ***');
    if (!released) await p.evaluate(() => {
      const d = document.querySelector('.datum-fold-picker'); if (d && d.parentNode) d.parentNode.removeChild(d);
    });

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
