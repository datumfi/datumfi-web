/* @gate-pool: browser
 *
 * §22 / §22.1 — SATELLITE TILE SIZING, AND THE BAND THAT MUST NOT BE ESCAPED.
 *
 * THE DEFECT §22 FIXES: every satellite property rendered at a hard-coded 95x170 regardless of how
 * many existed (datum-estate.js, `var sH = 95`), so the SECOND property in an estate was born at
 * six-up size while it was the only satellite on the canvas — measured at 8.2% of the Trust tile's
 * area. The authored shape: the first non-primary property spans the band, matching the Trust tile
 * opposite; a second splits it; a third subdivides again. The six-up grid is where you ARRIVE.
 *
 * ⚠️ THE FIXTURE MUST REACH THE 2-PROPERTY STATE OR IT PROVES NOTHING (§13.73). One property owns
 * the ground and draws no satellite at all, so an N=1 fixture — which is what every pre-existing
 * property fixture is, and precisely why nobody caught this — cannot observe a satellite in ANY
 * state, correct or broken. Every scenario below asserts its own satellite COUNT first: a presence
 * leg guarding the absence legs, so a scenario that silently failed to build cannot read as green.
 *
 * ⚠️ SECOND DEFECT, FOUND WHILE MEASURING §22 AND FIXED IN THE SAME COMMIT. The Trust wing's own
 * subdivision math granted every tile a 75-unit floor AND distributed the whole pool as remainder,
 * summing to 75n + pool instead of pool. MEASURED on the pre-fix build: 2 trusts overran the band
 * by 82 units; 3 trusts ended at y=1179, which is 79 units OUTSIDE the 1400x1100 viewBox — and
 * content outside the viewBox survives only on slack fitToScreen happens to leave, so a third
 * trust was drawn or not drawn according to the user's window width. Both wings now share
 * _bandLayout, so the T-legs below are as load-bearing as the S-legs.
 *
 * ⭐ THIRD DEFECT — §22.2, 2026-08-10, THE OTHER AXIS OF THE SECOND ONE. The wing was fixed
 * vertically above and left alone horizontally, and it had been sitting at x[1260,1540] with its
 * tiles at x[1280,1520] against a viewBox that ends at 1400 since the day it was written: 140 and
 * 120 units OUTSIDE. Invisible on a wide screen, CUT on seven of eight measured viewports including
 * 1920x1080, because `.canvas-wrapper` is overflow-x:hidden with no horizontal scroll anywhere.
 * The Captain found it by eye — he asked why the trust tile was bigger than the property tile, and
 * the answer was that half of it was hanging off the canvas. Both tiles are now 170 wide and
 * MIRRORED about the estate (T8/T9). 🔑 THE NOTE THAT SAID PARITY WAS IMPOSSIBLE WAS ITSELF THE
 * OBSTACLE — see the struck comment at S3.
 *
 * RED-FIRST, PROVEN BY SUBSTITUTION rather than by memory: `node _gate_estate_22_tile_sizing.js
 * --old` serves `git show HEAD:scripts/datum-estate.js` in place of the working file, leaving the
 * tree untouched, and every §22 leg fails in the SHAPE OF THE BUG (satellite pinned at 95; trust
 * stack past the band). Recorded on the §22 fix commit: OLD 11/29 -> NEW 29/29.
 * Recorded on the §22.2 commit: OLD 34/37 -> NEW 37/37, the three reds being T6 (observed 240),
 * T8 (170 vs 240) and T9 (edge 15/-120 — the tile's own air to the canvas edge, NEGATIVE).
 *
 * Usage: node scripts/_gate_estate_22_tile_sizing.js [LABEL] [--old]
 * Self-hosts on 127.0.0.1:8021 — NOT :8001, which is the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const OLD = process.argv.includes('--old');
/* ── §26 / CENSUS ITEM 2 · --pre26 — THE HISTORICAL REPLAY ────────────────────────────────────────
 * ⛔ A REPAIRED FIXTURE THAT CANNOT FAIL ON THE DEFECT IT MISSED IS NOT REPAIRED. This gate OWNS tile
 * sizing in both wings and its trust fixture stopped at THREE, while the wing began overflowing at
 * TEN. That gap is why §22.4's overflow note sat unfixed for two weeks: nobody missed it — THE GATE
 * THAT OWNED IT COULD NOT BUILD THE STATE THAT BREAKS IT.
 * So the raised fixture is proved against the renderer that actually shipped the defect. 77c9f0b is
 * the LAST BUILD BEFORE the trust wing got type scaling (980689e promoted the pair to this wing), and
 * studio.html is byte-identical from 77c9f0b to HEAD, so serving that renderer against today's host
 * is a faithful reconstruction rather than a hybrid.
 * ⭐ THE SHA IS HARDCODED ON PURPOSE — it names a MOMENT IN HISTORY, not "the previous commit". A
 * relative ref would silently stop pointing at the defect the day anything else lands. */
const PRE26 = process.argv.includes('--pre26');
const PRE26_REF = '77c9f0b';
const PORT = 8021;

// GEOMETRY CONTRACT — mirrors datum-estate.js (gX/gY/gW/gH) and studio.html's viewBox. If the canvas
// is ever re-proportioned these move WITH it; they are a mirror, never an independent opinion.
const BAND_TOP = 180, BAND_BOT = 1010, VIEWBOX_H = 1100;
// §22.2 — the horizontal half of the same contract. GROUNDS_L/R are gX and gX+gW; the two side bands
// they leave are x[0,200) and x[1200,1400], which is WHY parity is reachable at 170 on both sides.
const VIEWBOX_W = 1400, GROUNDS_L = 200, GROUNDS_R = 1200;
const SIX_UP_H = 95, TRUST_TITLE_PX = 14, SAT_TITLE_PX = 11, SAT_LINE2_PX = 8;
const EPS = 1.5;   // sub-pixel tolerance: heights are floats distributed by value share

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
let OLD_SRC = null;
if (PRE26) {
  // POISON MUST PROVE IT LANDED — same rule as --old below.
  OLD_SRC = execFileSync('git', ['show', PRE26_REF + ':scripts/datum-estate.js'], { cwd: ROOT, encoding: 'utf8' });
  const cur = fs.readFileSync(path.join(ROOT, 'scripts/datum-estate.js'), 'utf8');
  if (!OLD_SRC || OLD_SRC.length < 1000) { console.log('[estate_22] ABORT — could not read ' + PRE26_REF + ':scripts/datum-estate.js'); process.exit(2); }
  if (OLD_SRC === cur) { console.log('[estate_22] ABORT — --pre26 is identical to the working file; nothing would be proven'); process.exit(2); }
  /* ⛔ AND PROVE IT IS THE RIGHT HISTORY, not merely OLD history — a mis-typed ref would serve some
     other build and its red would be attributed to a defect it never had.
     ⚠️ THE FIRST VERSION OF THIS GUARD WAS WRONG AND IT CAUGHT ME, WHICH IS THE POINT. It tested for
     `_tileTypeScale`, reasoning that the pre-fix build could not contain the helper. But 77c9f0b IS
     the commit that introduced that helper — for the COLUMN. The trust wing did not adopt it until
     980689e. So the helper EXISTS at the pre-defect ref and is simply NOT USED here.
     🔑 THE DEFECT WAS NEVER "THE HELPER IS ABSENT", IT WAS "THIS WING DOES NOT CALL IT" — and a guard
     that tests for the wrong thing refuses correct history. Anchored now on the two things that are
     genuinely absent from the trust wing at 77c9f0b: its scaled value size, and the cap. */
  if (/_TRUST_CAP/.test(OLD_SRC) || /_tValPx/.test(OLD_SRC)) {
    console.log('[estate_22] ABORT — ' + PRE26_REF + ' already carries the §26 trust-wing fix; it is not the pre-defect build');
    process.exit(2);
  }
}
if (OLD) {
  // POISON MUST PROVE IT LANDED — an empty or identical substitution would produce a confident
  // "red-first" that never actually served the old renderer.
  OLD_SRC = execFileSync('git', ['show', 'HEAD:scripts/datum-estate.js'], { cwd: ROOT, encoding: 'utf8' });
  const cur = fs.readFileSync(path.join(ROOT, 'scripts/datum-estate.js'), 'utf8');
  if (!OLD_SRC || OLD_SRC.length < 1000) { console.log('[estate_22] ABORT — could not read HEAD:scripts/datum-estate.js'); process.exit(2); }
  if (OLD_SRC === cur) { console.log('[estate_22] ABORT — --old is identical to the working file; nothing would be proven'); process.exit(2); }
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if ((OLD || PRE26) && u === '/scripts/datum-estate.js') {
    r.writeHead(200, { 'Content-Type': 'text/javascript' });
    return r.end(OLD_SRC);
  }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

const build = (p, nTrust, nProp) => p.evaluate(([nT, nP]) => {
  try { localStorage.clear(); } catch (e) {}
  window.state.accounts = [];
  for (let i = 0; i < nT; i++) addInstance('trust');
  for (let i = 0; i < nP; i++) addInstance('property');
  // EQUAL VALUES ON PURPOSE. Weighted shares are exercised by the sum/bottom legs; equal values make
  // the per-tile legs read a number a human can check by hand.
  window.state.accounts.forEach((a) => { a.value = 500000; });
  updateSVGs();
}, [nTrust, nProp]);

const read = (p) => p.evaluate(() => {
  const grab = (sel) => Array.from(document.querySelectorAll(sel)).map((g) => {
    const r = g.querySelector('.room-rect');
    if (!r) return null;
    const texts = Array.from(g.querySelectorAll('text')).map((t) => {
      /* ⭐ §26 — THE PAINTED INK, NOT THE FONT SIZE. `px` and the baseline `y` describe what the
         renderer ASKED for; getBBox() describes what the browser actually PAINTED, descenders and
         all. The 62.5-vs-77.6 error existed precisely because a text stack was ADDED (14 + 32) and
         the sum was called a measurement. 🔑 A DERIVATION IS ONLY AS MEASURED AS ITS WEAKEST
         CONSTANT — so this leg measures rather than derives. */
      let bb = null;
      try { const x = t.getBBox(); bb = { top: x.y, bot: x.y + x.height }; } catch (e) {}
      return {
        cls: t.getAttribute('class') || '',
        px: parseFloat(getComputedStyle(t).fontSize),
        y: parseFloat(t.getAttribute('y')),
        bb: bb
      };
    });
    return { x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'), texts };
  }).filter(Boolean);
  return { trust: grab('.trust-room'), sat: grab('.satellite-room'), collapse: grab('.satellite-collapse'),
           trustCollapse: grab('.trust-collapse') };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage();
  const pageErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 10000 });
  await p.waitForTimeout(400);

  const checks = [];
  const ck = (n, ok, obs) => checks.push([n, !!ok, obs === undefined ? '' : String(obs)]);
  const bottomOf = (arr) => (arr.length ? Math.max(...arr.map((t) => t.y + t.h)) : null);
  const titleOf = (tile) => {                       // the largest bp-title in the tile = the name line
    const t = tile.texts.filter((x) => /bp-title/.test(x.cls));
    return t.length ? Math.max(...t.map((x) => x.px)) : null;
  };
  const line2Of = (tile) => {
    const t = tile.texts.filter((x) => /bp-title/.test(x.cls));
    return t.length > 1 ? Math.min(...t.map((x) => x.px)) : null;
  };
  const scene = async (nT, nP) => { await build(p, nT, nP); await p.waitForTimeout(500); return read(p); };

  /* ── S · THE SATELLITE BAND ───────────────────────────────────────────────────────────────── */
  // 2 properties = ground owner + exactly ONE satellite. This is the state the defect lived in.
  const s2 = await scene(1, 2);
  ck('S0 fixture REACHED the 2-property state (1 satellite drawn)', s2.sat.length === 1, s2.sat.length + ' satellites');
  ck('S1 lone satellite is NOT pinned at the six-up height', s2.sat.length === 1 && s2.sat[0].h > SIX_UP_H + EPS, s2.sat.length ? s2.sat[0].h.toFixed(1) : 'n/a');
  ck('S2 lone satellite spans the whole band', s2.sat.length === 1 && Math.abs(s2.sat[0].h - (BAND_BOT - BAND_TOP)) < EPS, s2.sat.length ? s2.sat[0].h.toFixed(1) : 'n/a');
  // ⭐ THE CAPTAIN ASKED FOR "THE SIZE OF THE TRUST" IN HIS OWN WORDS. THAT IS A MATCH, NOT A
  //    RESEMBLANCE — an equality leg, not a within-10% leg.
  // ⛔ ~~*"Width parity is impossible (the grounds start at gX=200) and was explicitly accepted;
  //    HEIGHT parity is the deliverable."*~~ STRUCK 2026-08-10, WRONG, AND KEPT SO NOBODY RE-DERIVES
  //    IT. Parity was impossible only AT 240 — nothing matches 240 on a 200-unit band. The free space
  //    is symmetric (left x[0,200), right x[1200,1400]), 170 was always available on both sides, and
  //    taking it is the SAME change that pulled the wing back inside the viewBox. §22.2 ships BOTH
  //    height and width parity. 🔑 A CONSTRAINT TRUE ONLY OF THE NUMBER YOU HAPPENED TO PICK IS NOT
  //    A CONSTRAINT — and this one sat here as settled fact for a day, discouraging the fix.
  ck('S3 lone satellite HEIGHT EQUALS the lone Trust tile', s2.sat.length === 1 && s2.trust.length === 1 && Math.abs(s2.sat[0].h - s2.trust[0].h) < EPS,
     s2.sat.length && s2.trust.length ? s2.sat[0].h.toFixed(1) + ' vs ' + s2.trust[0].h.toFixed(1) : 'n/a');
  ck('S4 satellite stack ends exactly on the band bottom', s2.sat.length === 1 && Math.abs(bottomOf(s2.sat) - BAND_BOT) < EPS, bottomOf(s2.sat));
  // §22.2 — 170 is unchanged, but the REASON changed: it is no longer "the small side of a deliberate
  // asymmetry", it is the width BOTH wings share. The number stayed still while its meaning moved.
  ck('S5 satellite width is 170', s2.sat.length === 1 && s2.sat[0].w === 170, s2.sat.length ? s2.sat[0].w : 'n/a');

  const s3 = await scene(1, 3);
  ck('S6 fixture REACHED the 3-property state (2 satellites)', s3.sat.length === 2, s3.sat.length + ' satellites');
  ck('S7 two satellites SPLIT the band, both still large', s3.sat.length === 2 && s3.sat.every((t) => t.h > SIX_UP_H * 2), s3.sat.map((t) => t.h.toFixed(0)).join('/'));
  ck('S8 two-satellite stack still ends on the band bottom', s3.sat.length === 2 && Math.abs(bottomOf(s3.sat) - BAND_BOT) < EPS, bottomOf(s3.sat));
  ck('S9 subdividing SHRINKS the tile (2-up strictly under 1-up)', s3.sat.length === 2 && s2.sat.length === 1 && s3.sat[0].h < s2.sat[0].h, 'n/a');

  const s7 = await scene(1, 7);
  ck('S10 fixture REACHED six satellites', s7.sat.length === 6, s7.sat.length + ' satellites');
  ck('S11 six-up stack ends on the band bottom', s7.sat.length === 6 && Math.abs(bottomOf(s7.sat) - BAND_BOT) < EPS, bottomOf(s7.sat));
  ck('S12 no satellite ever escapes the band', s7.sat.length === 6 && bottomOf(s7.sat) <= BAND_BOT + EPS && s7.sat.every((t) => t.y >= BAND_TOP - EPS), bottomOf(s7.sat));

  /* ── C · THE COLLAPSE SLOT still reconciles the picture to the total ───────────────────────── */
  const s12 = await scene(1, 12);
  ck('C1 the collapsed counted tile is still drawn', s12.collapse.length === 1, s12.collapse.length);
  ck('C2 collapse tile carries its count', s12.collapse.length === 1 && +(s12.collapse[0].h > 0), 'h=' + (s12.collapse.length ? s12.collapse[0].h.toFixed(0) : 'n/a'));
  ck('C3 the stack WITH a collapse tile still ends on the band bottom', Math.abs(bottomOf(s12.sat) - BAND_BOT) < EPS, bottomOf(s12.sat));
  ck('C4 nothing escapes the band at the cap', bottomOf(s12.sat) <= BAND_BOT + EPS, bottomOf(s12.sat));

  /* ── Y · TYPE SCALES, AND IS CEILINGED AND FLOORED (§22.1) ────────────────────────────────── */
  ck('Y1 a full-size tile does NOT carry postage-stamp type', s2.sat.length === 1 && titleOf(s2.sat[0]) > SAT_TITLE_PX, s2.sat.length ? titleOf(s2.sat[0]) : 'n/a');
  // ⛔ CEILING — a satellite shouting louder than the Trust would invert the estate's hierarchy.
  ck('Y2 satellite type NEVER exceeds the Trust tile title size', s2.sat.length === 1 && titleOf(s2.sat[0]) <= TRUST_TITLE_PX + 0.01, s2.sat.length ? titleOf(s2.sat[0]) : 'n/a');
  ck('Y3 the ceiling is the TRUST tile\'s measured title size', s2.trust.length === 1 && titleOf(s2.trust[0]) === TRUST_TITLE_PX, s2.trust.length ? titleOf(s2.trust[0]) : 'n/a');
  ck('Y4 ceiling holds at EVERY count, not just the big tile', [s2, s3, s7, s12].every((s) => s.sat.every((t) => titleOf(t) <= TRUST_TITLE_PX + 0.01)), 'max ' +
     Math.max(...[s2, s3, s7, s12].flatMap((s) => s.sat.map(titleOf))).toFixed(1));
  // ⚠️ FLOOR — the authored rule is STOP SUBDIVIDING rather than shrink type below 8px. sCap is what
  //    enforces it; this leg is what proves sCap and the floor still agree if either is ever retuned.
  ck('Y5 title never falls below the six-up size', [s2, s3, s7, s12].every((s) => s.sat.every((t) => titleOf(t) >= SAT_TITLE_PX - 0.01)), 'min ' +
     Math.min(...[s2, s3, s7, s12].flatMap((s) => s.sat.map(titleOf))).toFixed(1));
  ck('Y6 second line never falls below 8px', [s2, s3, s7, s12].every((s) => s.sat.every((t) => { const l = line2Of(t); return l === null || l >= SAT_LINE2_PX - 0.01; })), 'floor ' + SAT_LINE2_PX);
  ck('Y7 type is MONOTONE in tile height (bigger tile, never smaller type)',
     s3.sat.length === 2 && s7.sat.length === 6 && titleOf(s3.sat[0]) >= titleOf(s7.sat[0]) - 0.01, 'n/a');

  /* ── T · THE TRUST WING OVERFLOW (found while measuring §22, fixed in the same commit) ─────── */
  const t1 = await scene(1, 1), t2 = await scene(2, 1), t3 = await scene(3, 1);
  ck('T0 fixtures REACHED 1/2/3 trusts', t1.trust.length === 1 && t2.trust.length === 2 && t3.trust.length === 3,
     [t1.trust.length, t2.trust.length, t3.trust.length].join('/'));
  ck('T1 one trust ends on the band bottom', Math.abs(bottomOf(t1.trust) - BAND_BOT) < EPS, bottomOf(t1.trust));
  ck('T2 TWO trusts stay inside the band', bottomOf(t2.trust) <= BAND_BOT + EPS, bottomOf(t2.trust));
  ck('T3 two-trust stack ends exactly on the band bottom', Math.abs(bottomOf(t2.trust) - BAND_BOT) < EPS, bottomOf(t2.trust));
  ck('T4 THREE trusts stay inside the band', bottomOf(t3.trust) <= BAND_BOT + EPS, bottomOf(t3.trust));
  // ⭐ THE SEVERE FORM. Past the viewBox, whether a room is drawn at all depends on the user's window
  //    width — the one failure mode that can silently delete money from the picture.
  /* ⛔ RENAMED 2026-08-10, AND THE OLD NAME IS THE LESSON. This leg was called "three trusts never
     leave the viewBox" while only ever measuring bottomOf() — ONE EDGE of four. It was GREEN every
     run while those same three tiles sat 120 units outside the viewBox on the X axis, because the
     name claimed a box and the assertion checked a line. Nobody was lying; the leg simply outran
     itself, and its confident wording is part of why the horizontal escape went a day unnoticed.
     🔑 ASK WHAT WOULD PASS WITHOUT THE CLAIM BEING TRUE. The whole-box claim now lives in
     _gate_estate_viewbox.js, which asserts the POPULATION on all four edges. */
  ck('T5 three trusts stay above the viewBox FLOOR (vertical edge only — see _gate_estate_viewbox)',
     bottomOf(t3.trust) <= VIEWBOX_H, bottomOf(t3.trust));
  ck('T6 trust tile width is 170 — PARITY with the satellite, not the old 240',
     t1.trust.length === 1 && t1.trust[0].w === 170, t1.trust.length ? t1.trust[0].w : 'n/a');
  ck('T7 trusts subdivide (3-up strictly under 1-up)', t3.trust.length === 3 && t1.trust.length === 1 && t3.trust[0].h < t1.trust[0].h, 'n/a');

  /* ── §26 / CENSUS ITEM 2 · THE TRUST FIXTURE RAISED PAST THE THRESHOLD IT GUARDS ────────────────
   * ⛔ THIS GATE OWNED TILE SIZING IN BOTH WINGS AND ITS TRUST FIXTURE STOPPED AT THREE. The wing
   * began overflowing at TEN. That is the whole census thesis demonstrated on our own history: §22.4
   * did not sit unfixed for two weeks because anyone missed it — the gate that owned it could not
   * construct the state that breaks it. T0-T7 above are unchanged and still measure the SUBDIVISION;
   * these legs measure the two states the old fixture could not reach.
   * ⭐ NINE is the cap boundary — the tightest UNFOLDED wing, every tile paid its full 75-unit floor.
   * ⭐ TWELVE is past the cap, so the wing FOLDS: 8 drawn + 1 door. Both are asserted, because a cap
   *   is two claims (it fires when it should, and not when it should not) and this is the sizing side
   *   of both. Proved historically by --pre26, where TWELVE spills 9.7 units of ink. */
  // How far painted ink escapes its own tile, in user units. <= 0 means contained.
  const inkOverflow = (tiles) => tiles.reduce((worst, t) => {
    const bots = t.texts.map((x) => (x.bb ? x.bb.bot : -Infinity)).filter((v) => v !== -Infinity);
    return bots.length ? Math.max(worst, Math.max(...bots) - (t.y + t.h)) : worst;
  }, -Infinity);
  const t9 = await scene(9, 1), t12 = await scene(12, 1);
  ck('TC0 fixture REACHES the cap boundary — 9 trusts, ALL drawn, NO door',
     t9.trust.length === 9 && t9.trustCollapse.length === 0,
     t9.trust.length + ' drawn / ' + t9.trustCollapse.length + ' door(s)');
  ck('TC1 fixture REACHES PAST the cap — 12 trusts fold to 8 drawn + 1 door',
     t12.trust.length === 8 && t12.trustCollapse.length === 1,
     t12.trust.length + ' drawn / ' + t12.trustCollapse.length + ' door(s)');
  ck('TC2 nine trusts still end exactly on the band bottom',
     Math.abs(bottomOf(t9.trust) - BAND_BOT) < EPS, bottomOf(t9.trust));
  ck('TC3 and the folded wing does too — the door takes a REAL slot',
     Math.abs(Math.max(bottomOf(t12.trust), bottomOf(t12.trustCollapse)) - BAND_BOT) < EPS,
     Math.max(bottomOf(t12.trust), bottomOf(t12.trustCollapse)));
  /* ⭐⭐ THE LEG THAT WOULD HAVE CAUGHT §22.4 TWO WEEKS EARLY. Measured ink, not derived. */
  ck('TC4 ⭐ the painted INK stays inside its tile at the cap boundary (9 trusts)',
     inkOverflow(t9.trust) <= EPS, 'worst overflow ' + inkOverflow(t9.trust).toFixed(1) + 'u');
  ck('TC5 ⭐ and past the cap too (12 trusts -> folded)',
     inkOverflow(t12.trust) <= EPS, 'worst overflow ' + inkOverflow(t12.trust).toFixed(1) + 'u');

  /* ── §22.2 · PARITY AS A RELATIONSHIP, NOT AS TWO CONSTANTS ─────────────────────────────────────
     T6 and S5 both pin 170, so they would BOTH have to be edited to break parity — but they are two
     separate literals, and two literals that must agree are a hand-maintained list of length two.
     These legs assert the two tiles against EACH OTHER, so a future re-proportioning that moves one
     side reds here even if someone dutifully updates both constants. s2 is the 1-trust/2-property
     scene: the only fixture that holds a satellite AND a trust at once. */
  ck('T8 satellite and trust tiles are the SAME WIDTH (parity, measured against each other)',
     s2.sat.length === 1 && s2.trust.length === 1 && s2.sat[0].w === s2.trust[0].w,
     s2.sat.length && s2.trust.length ? s2.sat[0].w + ' vs ' + s2.trust[0].w : 'n/a');
  ck('T9 the two wings are MIRRORED — equal air to the canvas edge, equal air to the grounds',
     s2.sat.length === 1 && s2.trust.length === 1 &&
     s2.sat[0].x === VIEWBOX_W - (s2.trust[0].x + s2.trust[0].w) &&
     GROUNDS_L - (s2.sat[0].x + s2.sat[0].w) === s2.trust[0].x - GROUNDS_R,
     s2.sat.length && s2.trust.length
       ? `edge ${s2.sat[0].x}/${VIEWBOX_W - (s2.trust[0].x + s2.trust[0].w)} · grounds ${GROUNDS_L - (s2.sat[0].x + s2.sat[0].w)}/${s2.trust[0].x - GROUNDS_R}`
       : 'n/a');

  /* ── R · REGRESSION — the seam, not the island ─────────────────────────────────────────────── */
  ck('R1 no page errors across every scenario', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'none');
  ck('R2 a lone property still draws NO satellite (it owns the ground)', t1.sat.length === 0, t1.sat.length + ' satellites');
  ck('R3 the Trust tile still renders its own title', t1.trust.length === 1 && titleOf(t1.trust[0]) > 0, t1.trust.length ? titleOf(t1.trust[0]) : 'n/a');

  await b.close();
  server.close();

  let pass = 0;
  const lines = checks.map(([n, ok, obs]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n + (obs ? '   [observed: ' + obs + ']' : ''); });
  const summary = '[' + LABEL + (OLD ? ' --old(HEAD renderer)' : '') + '] ' + pass + '/' + checks.length + ' GREEN\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_estate_22_tile_sizing.out.txt', summary, 'utf8');
  console.log(summary);
  console.log('[_gate_estate_22_tile_sizing] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
    (OLD ? '   (--old: RED IS THE EXPECTED RESULT)' : ''));
  process.exit(pass === checks.length ? 0 : 1);
})();
