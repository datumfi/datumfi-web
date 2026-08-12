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
     Trust side (§26): _TRUST_CAP = 9, so 10+ trusts in the wing.
     🔑 A NUMBER WITHOUT ITS DERIVATION ROTS — this one had, silently, inside a fixture comment.
     ⚠️ AND THE THREE CAPS ARE NOT THE SAME KIND OF NUMBER, WHICH IS WHY NONE OF THEM MAY BE COPIED
     FROM ANOTHER: sCap = 7 is floor((band+gap)/pitch) at a FIXED 95-unit tile; _TRUST_CAP = 9 is
     where _bandLayout stops affording its 75-unit floor; _COL_CAP = 11 sits DELIBERATELY one room
     PAST that same point (68.2 < 75), ruled 2026-08-11. Three derivations, three numbers, and any
     two of them agreeing would be a coincidence wearing the look of a convention. */
  const SCENES = [
    /* ⛔ `surface` IS DECLARED, NEVER SNIFFED FROM THE LABEL. First cut tested /propert/i against the
       label and the COLUMN scene reads "1 property + 14 accounts" — so it demanded the satellite copy
       from the second floor and failed a correct product. A human label is prose; a branch key is
       data. 🔑 PROXIMITY IS NOT OWNERSHIP, and neither is a word appearing in a sentence. */
    { label: 'column tile (1 property + 14 accounts)', surface: 'floor', spec: [['property', 1], ['taxable', 14]] },
    /* ⛔ §25.4 SCROLLS, NEVER CAPS — and the 14-account scene CANNOT PROVE IT. It folds 4 rooms, so
       H sits on the 315 floor and the growth branch never executes. 26 accounts folds 16, which puts
       H at 75n = 1200 and forces the box to scroll. 🔑 A FIXTURE THAT ONLY REACHES THE DEFAULT BRANCH
       LEAVES THE OTHER BRANCH UNTESTED WEARING GREEN — the cap that isn't there must be shown absent
       at a count where a cap would have bitten. */
    { label: 'second floor at 16 rooms (must GROW, not cap)', surface: 'floor', spec: [['property', 1], ['taxable', 25]] },
    /* ⛔ §25.7 NEEDS TWO WINGS OVERFLOWING AT ONCE AND NOTHING ABOVE PRODUCES THAT. Every other floor
       scene crowds a single column, so "the upstairs contains ALL wings" would pass on a picker that
       still only ever showed one. 14 joint (taxable) + 14 primary (checking_primary) folds 4 in each. */
    { label: 'TWO wings upstairs (14 joint + 14 primary)', surface: 'floor', multiWing: true,
      spec: [['taxable', 14], ['checking_primary', 14]] },
    { label: 'satellite tile (9 properties)',          surface: 'props', spec: [['property', 9]] },
    /* ── §26 · SURFACE #3, AND THE FIXTURE HOLE THIS GATE HAD ABOUT ITSELF ──────────────────────
     * ⭐ THIS GATE'S HEADER PROMISES "surface #3 cannot be born dead" BECAUSE THE POPULATION IS
     * DERIVED FROM data-collapsed-count. That was true of the ASSERTIONS and false of the FIXTURE:
     * measured 2026-08-12, NOT ONE of the five scenes above built a single trust, so this gate's
     * maximum reachable trust count was ZERO and the trust wing could have shipped a dead door
     * under a green run. 🔑 A DERIVED POPULATION IS ONLY AS WIDE AS THE STATES THE FIXTURE REACHES
     * — the assertion generalises, the scenario does not, and only the scenario touches the product.
     *
     * ⛔ 10 IS DERIVED, NOT PICKED. _TRUST_CAP = 9 and the wing draws _TRUST_CAP - 1 = 8, so the
     * door exists only above 9 => TEN trusts is the first count that folds anything (hidden = 2).
     * Nine would build the wing at its cap and produce NO door — a scene that proves nothing while
     * looking thorough. `addInstance` sets trustType 'Irrevocable' by default, which is what routes
     * these to the wing rather than into an ownership column (studio.html's first-pass selector). */
    { label: 'trust wing (10 trusts)',                 surface: 'trusts', spec: [['trust', 10]] },
    /* §25.3 — the leg that would have caught tonight's trap. A folded property carrying a lien must
       open THE YARD, not the account modal, exactly as its tile does. */
    { label: 'satellite tile, LAST property mortgaged', surface: 'props',
      spec: [['property', 9], ['mortgage_joint', 1]], link: true, yardRow: 1 },
  ];

  for (const { label, spec, link, yardRow, surface, multiWing } of SCENES) {
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
        const PICK = '.datum-fold-row, .datum-fold-room';
        return {
          modal: d.getAttribute('aria-modal'), labelled: !!d.getAttribute('aria-labelledby'),
          /* §25.4 — the SECOND FLOOR is now DRAWN (svg room tiles); the other-properties surface is
             still a row list. The population is whichever this surface emits. */
          rows: d.querySelectorAll(PICK).length,
          /* ⚠️ .className ON AN SVG ELEMENT IS AN SVGAnimatedString, NOT A STRING — it stringifies to
             "[object Object]" and every match against it silently fails. §25.4 made the focused item
             an SVG <g>, so this read had to stop assuming HTML. */
          focus: (document.activeElement && document.activeElement.getAttribute
                    ? (document.activeElement.getAttribute('class') || '') : ''),
          money: Array.from(d.querySelectorAll(PICK)).filter((r) => /\$/.test(r.textContent || '')).length,
          text: (d.innerText || '').replace(/\s+/g, ' ').trim(),
        };
      });
      opened = !!dlg;
    } catch (e) { opened = false; }
    ck(`D· A REAL CLICK OPENS THE DOOR — ${label}`, opened, opened ? 'dialog present' : '*** DEAD DOOR — click did nothing ***');
    if (!opened) continue;

    /* ⛔ §25.7 CHANGED WHAT "THE FOLDED SET" MEANS ON THE FLOOR SURFACE. The second floor is now ONE
       floor for the whole house, so a wing's tile opens onto EVERY wing's overflow — the expected
       count is the SUM across all column-collapse tiles, not the count on the tile that was clicked.
       The other-properties surface is unchanged and still its own tile's count.
       🔑 A LEG THAT STILL COMPARES AGAINST THE OLD MEANING IS WRONG EVEN WHEN IT IS GREEN. */
    const expectUp = surface === 'floor'
      ? await p.evaluate(() => Array.from(document.querySelectorAll('.column-collapse[data-collapsed-count]'))
          .reduce((t, e) => t + (+e.getAttribute('data-collapsed-count') || 0), 0))
      : meta.n;
    ck(`D· the picker lists EXACTLY the upstairs set — ${label}`, dlg.rows === expectUp, `${dlg.rows} shown vs ${expectUp} upstairs`);
    /* The collapse tile may not quote a balance because you cannot open into it. The moment you can,
       the money must be visible — this is where "all counted in your totals" becomes checkable. */
    ck(`D· every row shows its balance — ${label}`, dlg.money === dlg.rows, `${dlg.money}/${dlg.rows} rows carry a figure`);
    ck(`D· the dialog is a real dialog (aria-modal + labelled + focus moved) — ${label}`,
       dlg.modal === 'true' && dlg.labelled && /datum-fold-(row|room)/.test(dlg.focus), `modal=${dlg.modal} labelled=${dlg.labelled} focus=${dlg.focus}`);

    /* ══ §25.1 / §25.2 · THE RENDERER'S VOCABULARY MAY NOT REACH THE USER ═══════════════════════
       ⛔ A user has never once thought about a COLUMN, and nobody's house has FOLDED rooms. Those
       are facts about our layout algorithm that leaked into the product for three prompts — and the
       mechanism came out wrong in the same direction as the words. THE COPY IS AN EARLY WARNING FOR
       THE ARCHITECTURE, so it gets an instrument.
       ⭐ TWO LEGS, BOTH DIRECTIONS: the authored words are PRESENT, and the retired words are ABSENT.
       An absence leg alone is silent by construction — it would pass on an empty dialog. */
    /* §26 — THREE SURFACES NOW, AND THE KEY IS STILL DECLARED RATHER THAN SNIFFED. The trust scene's
       label contains "trust" and so does nothing else here, so a regex would have worked TODAY and
       broken on the first scene that mentions a trust in passing. A HUMAN LABEL IS PROSE; A BRANCH
       KEY IS DATA — the same trap this file already paid for once with /propert/i. */
    const wantHead = surface === 'props' ? 'THE OTHER PROPERTIES'
                   : surface === 'trusts' ? 'THE TRUSTS' : 'THE SECOND FLOOR';
    /* ⚠️ §25.7 — the subhead counts THE WHOLE UPSTAIRS, not the tile that was clicked. This leg built
       its expectation from meta.n and failed a CORRECT product the moment two wings overflowed: the
       tile said "+4", the picker honestly said "8 rooms up here". Second time this session a stale
       expectation accused a working feature — the first was the label-sniffing surface key. */
    /* ⚠️ THE TRUST SUBHEAD IS THE WING'S OWN COUNT, NOT A CROSS-WING SUM — and that is a product
       fact, not a shortcut. §25.7 made the SECOND FLOOR one floor for the whole house, so its
       subhead sums every wing. The trusts are their OWN place: they do not report to `_upstairs`
       and no other surface can spill into them, so expectUp (= meta.n here) is the whole truth. */
    const wantSub  = surface === 'props'
      ? `${expectUp} more properties. Pick one to enter it.`
      : surface === 'trusts'
      ? `${expectUp} trusts here. Pick one to enter it.`
      : `${expectUp} rooms up here. Pick one to enter it.`;
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

    /* ══ §25.5 · THE ACCESSIBLE NAME IS DEVICE-NEUTRAL ══════════════════════════════════════════
       ⛔ "CLICK" IS A WORD ABOUT A MOUSE, NOT ABOUT MEANING. §25.1's hover ends "Click to go
       upstairs." and using it as the accessible name told a screen-reader user to do the one thing
       they are not doing. A control's accessible name says what it DOES, never how to operate it.
       ⭐ THREE LEGS, because "no click" alone is silent by construction — it passes on an empty
       label. The name must also SAY what it opens, and must still carry the counted-in-your-totals
       promise, which is the entire reason this tile may exist without a balance on its face. */
    /* ══ §25.6 · THE CAPTAIN'S VISUAL RULINGS, 2026-08-11 ═══════════════════════════════════════
       ⛔ --shield IS THE TRUST TOKEN. It means "legally held apart"; the picker borrowed it because
       it was a colour the renderer had, not the colour this means. Gold is the house accent.
       ⭐ BOTH DIRECTIONS: gold is PRESENT and the reliquary purple is ABSENT. Asserting only the
       first would pass on a picker that drew both. */
    const chrome = await p.evaluate(() => {
      const box = document.querySelector('.datum-fold-picker [role="dialog"]');
      if (!box) return null;
      const cs = getComputedStyle(box);
      const head = box.firstElementChild, sub = head && head.nextElementSibling;
      const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return 1;
        const p4 = m[1].split(',').map((v) => parseFloat(v)); return p4.length > 3 ? p4[3] : 1; };
      return {
        border: cs.borderTopColor,
        headColor: head ? getComputedStyle(head).color : '',
        subColor: sub ? getComputedStyle(sub).color : '',
        subAlpha: sub ? alpha(getComputedStyle(sub).color) : 0,
        purple: /8a64ff|138,\s*100,\s*255/i.test(box.getAttribute('style') || '') ||
                Array.from(box.querySelectorAll('*')).some((e) => /8a64ff|138,\s*100,\s*255/i.test(e.getAttribute('style') || '')),
      };
    });
    ck(`V· the picker wears GOLD, not the reliquary purple — ${label}`,
       !!chrome && /201,\s*168,\s*76/.test(chrome.border) && /201,\s*168,\s*76/.test(chrome.headColor),
       chrome ? `border=${chrome.border} head=${chrome.headColor}` : 'no dialog');
    ck(`V· and no --shield purple survives anywhere in it — ${label}`, !!chrome && !chrome.purple,
       chrome && chrome.purple ? '*** #8a64ff / rgba(138,100,255) still drawn ***' : 'none');
    /* The subhead is the sentence that says what this place IS. It was --muted = 30% white on a
       near-black modal — the dimmest thing on the surface it was there to explain. */
    ck(`V· the subhead is legible, not --muted — ${label}`, !!chrome && chrome.subAlpha >= 0.7,
       chrome ? `${chrome.subColor} (alpha ${chrome.subAlpha})` : 'no dialog');

    /* §25.6 — THE STAIRCASE. Drawn in PLAN (treads + up-arrow), which is the blueprint's own symbol,
       and suppressed rather than shrunk on a short tile so it can never crowd the count. */
    const stair = await el.evaluate((e) => {
      const r = e.querySelector('rect.room-rect'), g = e.querySelector('.stair-glyph');
      return { h: r ? +r.getAttribute('height') : 0, has: !!g,
               treads: g ? g.querySelectorAll('line').length : 0,
               inert: g ? g.getAttribute('pointer-events') === 'none' : false };
    });
    if (surface === 'floor') {
      ck(`V· the upstairs tile carries a STAIRCASE — ${label}`, stair.h < 56 || stair.has,
         stair.has ? `drawn (tile h=${Math.round(stair.h)})` : (stair.h < 56 ? `suppressed, tile only ${Math.round(stair.h)} tall` : '*** missing ***'));
      /* ⛔ IT MUST NOT EAT THE CLICK. An unfilled shape intercepts on its STROKE, and these strokes
         sit exactly where a thumb lands — the §24 hit-testing trap pointed the other way. */
      if (stair.has) ck(`V· and it is INERT — decoration cannot steal the door's click — ${label}`,
         stair.inert, stair.inert ? 'pointer-events=none' : '*** the glyph can swallow the click ***');
    }

    /* ══ §25.4 · THE SECOND FLOOR IS A FLOOR, NOT A DIRECTORY ═══════════════════════════════════
       ⛔ EVERY LEG ABOVE WOULD PASS ON A ROW LIST. Green without these is untested wearing green —
       they are the only assertions that can tell a DRAWN floor from a table of names.
       Skipped on the other-properties surface, which still lists BY DESIGN (its tile is a different
       emitter that has not been extracted) — asserted rather than assumed, one leg down. */
    if (surface === 'floor') {
      const floor = await p.evaluate(() => {
        const svg = document.querySelector('.datum-fold-picker svg.datum-fold-floor');
        if (!svg) return null;
        const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
        const gs = Array.from(svg.querySelectorAll('g.datum-fold-room'));
        return {
          n: gs.length, vbW: vb[2], vbH: vb[3],
          /* THE CAPTAIN'S ACTUAL ASK WAS "outlined in green". A first-floor column room carries
             style="stroke:none" because the ENVELOPE draws its walls — so a verbatim copy into a
             modal is invisible. ownStroke must have removed it. */
          strokeless: gs.filter((g) => { const r = g.querySelector('rect.room-rect');
            return !r || /stroke:\s*none/.test(r.getAttribute('style') || ''); }).length,
          named: gs.filter((g) => (g.querySelector('text.bp-title') || {}).textContent).length,
          valued: gs.filter((g) => /\$/.test((g.querySelector('text.bp-val') || {}).textContent || '')).length,
          hittable: gs.filter((g) => g.getAttribute('pointer-events') === 'all').length,
          keyable: gs.filter((g) => g.getAttribute('role') === 'button' && g.getAttribute('tabindex') === '0').length,
          /* §22.6's lesson, one level down: nothing may be drawn outside the box that holds it. */
          /* ══ §26 · THE INK MUST STAY INSIDE ITS OWN TILE ═══════════════════════════════════
             ⛔ THE DEFECT THIS NAMES WAS LIVE AND UNREPORTED. §22.7 recorded the text stack as 62.5
             units by ADDING 14 + 32 and calling the sum a measurement; measured with getBBox() on
             real ink it is 77.6, so crowded tiles have been spilling their dollar figure past their
             own bottom edge since they shipped — including the second floor, on its first night.
             🔑 THE EYE CANNOT SEE 4.7 UNITS. THE RULER CAN. Nobody reported it in either place.
             ⛔ getBBox() — NEVER a font-size inference. Inferring ink from font size is the exact
             move that produced 62.5. */
          inkOut: gs.filter((g) => {
            const r = g.querySelector('rect.room-rect'); if (!r) return true;
            const top = +r.getAttribute('y'), bot = top + (+r.getAttribute('height'));
            return Array.from(g.querySelectorAll('text')).some((t) => {
              const bb = t.getBBox();
              return bb.y < top - 0.5 || bb.y + bb.height > bot + 0.5;
            });
          }).length,
          outside: gs.filter((g) => { const r = g.querySelector('rect.room-rect'); if (!r) return true;
            return (+r.getAttribute('y')) < 0 || (+r.getAttribute('y')) + (+r.getAttribute('height')) > vb[3] + 0.5
                || (+r.getAttribute('x')) < 0 || (+r.getAttribute('x')) + (+r.getAttribute('width')) > vb[2] + 0.5; }).length,
        };
      });
      ck(`F· the second floor is DRAWN, not listed — ${label}`, !!floor, floor ? 'svg.datum-fold-floor present' : '*** no drawn floor — still a directory ***');
      if (floor) {
        ck(`F· it draws EVERY upstairs room (no cap, it scrolls) — ${label}`, floor.n === expectUp, `${floor.n} drawn vs ${expectUp} upstairs`);
        ck(`F· every room is OUTLINED — stroke:none was removed — ${label}`, floor.strokeless === 0, `${floor.strokeless}/${floor.n} unoutlined`);
        ck(`F· every room carries its NAME — ${label}`, floor.named === floor.n, `${floor.named}/${floor.n}`);
        ck(`F· and its BALANCE — this is where "all counted" becomes checkable — ${label}`, floor.valued === floor.n, `${floor.valued}/${floor.n}`);
        ck(`F· every room is hit-testable across its face, not just its stroke — ${label}`, floor.hittable === floor.n, `${floor.hittable}/${floor.n} pointer-events=all`);
        ck(`F· and reachable by keyboard — ${label}`, floor.keyable === floor.n, `${floor.keyable}/${floor.n} role+tabindex`);
        ck(`F· NO room is drawn outside the floor's own box — ${label}`, floor.outside === 0, `${floor.outside} outside viewBox ${floor.vbW}x${floor.vbH}`);
        ck(`F· and every room's TEXT stays inside its own tile (§26) — ${label}`, floor.inkOut === 0,
           floor.inkOut ? `*** ${floor.inkOut}/${floor.n} tiles spill their own ink ***` : `0/${floor.n} spill`);
        /* THE DERIVATION, ASSERTED. H = max(315, 75 × TALLEST WING): 315 is the first floor's
           750-unit band scaled by 404/960; 75 is its own minH. ⚠️ §25.7 changed the driver from the
           room COUNT to the TALLEST WING, because every wing's stack fills the same band exactly as
           it does downstairs. A number without its derivation rots — so pin the number. */
        const tallest = await p.evaluate(() => Math.max(0, ...Array.from(
          document.querySelectorAll('.column-collapse[data-collapsed-count]'))
          .map((e) => +e.getAttribute('data-collapsed-count') || 0)));
        const wantH = Math.max(315, 75 * tallest);
        ck(`F· the floor's height is the DERIVED one, max(315, 75 × tallest wing) — ${label}`,
           floor.vbW === 404 && Math.abs(floor.vbH - wantH) < 0.5,
           `viewBox ${floor.vbW}x${floor.vbH}, expected 404x${wantH} (tallest wing ${tallest})`);

        /* ══ §25.7 · ONE UPSTAIRS FOR THE WHOLE HOUSE ═════════════════════════════════════════
           ⛔ EVERY LEG ABOVE PASSES ON A PER-WING PICKER when only one wing overflows, which is
           what every other fixture builds. These two need the multi-wing scene to mean anything. */
        if (multiWing) {
          const wings = await p.evaluate(() => {
            const xs = Array.from(document.querySelectorAll('.datum-fold-floor g.datum-fold-room rect.room-rect'))
              .map((r) => Math.round(+r.getAttribute('x')));
            return [...new Set(xs)].sort((a, b) => a - b);
          });
          ck(`W· the upstairs is drawn in MULTIPLE wings, not one stack — ${label}`, wings.length >= 2,
             `${wings.length} distinct column x: [${wings.join(', ')}]`);
          /* THE ACTUAL ASK: open it from a DIFFERENT wing's staircase and you are on the same floor. */
          await p.keyboard.press('Escape'); await p.waitForTimeout(200);
          const other = (await p.$$('.column-collapse[data-collapsed-count]'))[1];
          if (other) {
            await other.click({ timeout: 5000 }); await p.waitForTimeout(300);
            const n2 = await p.evaluate(() => document.querySelectorAll('.datum-fold-picker .datum-fold-room').length);
            ck(`W· the OTHER wing's stairs reach the SAME whole floor — ${label}`, n2 === expectUp,
               `${n2} rooms from wing 2 vs ${expectUp} total` + (n2 === expectUp ? '' : ' *** two disconnected upstairs ***'));
          } else {
            ck(`W· the OTHER wing's stairs reach the SAME whole floor — ${label}`, false, '*** fixture built only ONE collapse tile ***');
          }
        }
      }
    }

    const aria = meta.aria || '';
    ck(`N· the accessible name names no input device — ${label}`, !/\bclick|\btap|\bmouse/i.test(aria),
       /\bclick|\btap|\bmouse/i.test(aria) ? `*** "${aria.match(/\bclick|\btap|\bmouse/i)[0]}" in an accessible name ***` : 'device-neutral');
    /* ── §26 · EXACT PER SURFACE, NOT AN ALTERNATION ────────────────────────────────────────────
       This was /Opens the (second floor|other properties)\.$/ — an any-of-these test, which a THIRD
       surface can satisfy by naming the WRONG place. A trust door announcing "Opens the second
       floor." would have passed it, and that is precisely the defect worth catching: the ending is
       AUTHORED PER SURFACE, so it is asserted per surface, off the same declared key `wantHead`
       uses. 🔑 A DOOR THAT OPENS ONTO THE WRONG PLACE IS WORSE THAN ONE THAT DOES NOT OPEN — IT
       LOOKS FIXED. Adding surface #3 to the alternation would have widened the hole rather than
       closed it; the leg is now strictly stronger than the one it replaces. */
    const wantEnd = surface === 'props' ? 'Opens the other properties.'
                  : surface === 'trusts' ? 'Opens the trusts.' : 'Opens the second floor.';
    ck(`N· and it says what the control DOES — ${label}`,
       aria.trim().endsWith(wantEnd), `ends "${aria.trim().slice(-28)}" · want "${wantEnd}"`);
    ck(`N· and it keeps the counted-in-your-totals promise — ${label}`,
       aria.includes('counted in your total square footage'), aria.slice(0, 64));
    /* The VISUAL hover is unchanged and still says "Click" when there is no corridor — a mouse word
       is correct on a mouse surface. ⛔ ASSERT THE PAIR DIVERGED, or a future "cleanup" that unifies
       them re-creates the defect in whichever direction it picks. */
    const tipTxt = await el.evaluate((e) => (e.querySelector('title') || {}).textContent || '');
    if (tipTxt) ck(`N· hover and accessible name are DIFFERENT strings — ${label}`, tipTxt.trim() !== aria.trim(),
       tipTxt.trim() === aria.trim() ? '*** unified — one of them is now wrong ***' : 'diverged, as authored');

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
    /* ⛔ SCOPED TO #bp-svg, AND §25.4 IS WHY. The drawn second floor emits g.room-grp elements INSIDE
       THE MODAL, so a document-wide selector would fold the picker's own tiles into the "drawn set"
       and this leg would quietly start measuring picker+canvas instead of canvas.
       🔑 A SELECTOR THAT WAS UNAMBIGUOUS WHEN WRITTEN CAN BE MADE AMBIGUOUS BY A LATER FEATURE.
       It also does double duty on the Architect's named risk: a picker tile that leaked into the
       estate would show up here as the canvas changing. */
    const fingerprint = () => p.evaluate(() => {
      const svg = document.getElementById('bp-svg');
      return svg ? Array.from(svg.querySelectorAll('g.room-grp'))
        .map((g) => g.getAttribute('onclick') || g.getAttribute('class') || '?').join(' | ') : 'NO-SVG';
    });
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
    await p.click('.datum-fold-picker .datum-fold-row, .datum-fold-picker .datum-fold-room');
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
    const rows = await p.$$('.datum-fold-picker .datum-fold-row, .datum-fold-picker .datum-fold-room');
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
