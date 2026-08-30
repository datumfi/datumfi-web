/* @gate-pool: browser */
/* ══ THE ENTRY OVERLAY — ITS LIGHT TREATMENT, ITS HEADER, AND ITS TRAVELLER ═════════════════════
 *
 * ⛔⛔ WHY THIS GATE EXISTS, STATED AS THE GAP IT CLOSES. Three corrections shipped in 713d33a and
 * 9f1d470 with NO instrument over them, and the commit message said so plainly rather than let it
 * slide: "ITEMS 1 AND 2 REMAIN UNGATED... If either regresses the suite stays green at 249."
 * This is that gap, closed. All three items are the SAME SURFACE — the entry overlay — which is why
 * they are ONE gate and not three legs bolted onto _gate_theme_toggles. That gate's subject is the
 * two SWITCHES; this one's subject is the overlay they paint. A group with a caller from outside it
 * is a module; these three share a surface AND a revert boundary.
 *
 * ⛔ THE DEFECT L1 EXISTS TO MAKE IMPOSSIBLE — A RULE THAT PARSES, SITS THERE, AND LOSES.
 * The overlay's base rules are ID-scoped (`#studioOverlayWrap .brief`). A light rule written
 * class-only has lower specificity, so it is VALID CSS THAT NEVER APPLIES. Three separate commits in
 * ONE DAY hit this family: the .s1-header descendant selector, the overlay rules, and Capacity Mode.
 * 🔑 A CSS RULE THAT DOES NOT APPLY LOOKS IDENTICAL TO ONE NEVER WRITTEN — the diff looks right, the
 *    commit looks right, and nothing changes on screen.
 *
 * ⛔ THE DEFECT L2 EXISTS TO MAKE IMPOSSIBLE — A BASE BEHIND A TINT TURNS A WASH INTO A BAND.
 * The donor's .brief-header is a TINT over the panel with no base colour; an added `#f7f4ef` made a
 * hard tan delineation. Captain: "in light mode, the top bar of the overlay appears a darker tan; in
 * the mock it's fairly seamless... I prefer the mock without the hard delineation of the top bar."
 * 🔑 ADDING A VALUE THE DONOR DOES NOT HAVE IS A DIFFERENT ERROR FROM PORTING ONE WRONG, AND THE
 *    HARDER ONE TO FIND: nothing is mismatched. There is simply MORE.
 *
 * ⛔ THE DEFECT L3 EXISTS TO MAKE IMPOSSIBLE — HALF A PIXEL, AT EVERY STOP.
 * The traveller landed half a pixel HIGH on all four dots, leaving each bottom rim showing. The
 * Captain caught it by eye. Worth recording: the defects an eye finds are not all coarse.
 *
 * ⭐ L3 READS THE KEYFRAME STOPS OUT OF THE LIVE STYLESHEET RATHER THAN RESTATING THEM. Pinning
 * 12.5/37.5/62.5/87.5 here would make this gate a SECOND SOURCE for the design's own numbers, and it
 * would have to be edited the day the sequence changes — an instrument you must edit to keep green
 * is one that will eventually be edited to agree with a defect. What is asserted is the
 * RELATIONSHIP: wherever the design parks the traveller, a dot is centred there.
 *
 * Usage: node scripts/_gate_studio_overlay_light.js [--unscope-light|--header-base|--nudge-half]
 *   --unscope-light  the overlay's light rules lose their ID scope   -> REDS L1c + L1d + L1e ONLY
 *   --header-base    the #f7f4ef base behind the header tint returns -> REDS L2  ONLY
 *   --nudge-half     the half-pixel offset is removed                -> REDS L3b ONLY
 * THREE controls, THREE DISJOINT red sets. L1c/d/e share one control ON PURPOSE and it is stated
 * rather than claimed: they are ONE claim — "the light rules win the cascade" — measured on three
 * surfaces, and no mutation can separate them without being a different defect entirely.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8467; const BASE = 'http://127.0.0.1:' + PORT;

/* ⛔ NO studioSource() IMPORT, AND THAT IS DELIBERATE RATHER THAN AN OVERSIGHT. The Phase 0 contract
   governs gates that ASSERT ON THE STUDIO SOURCE TEXT; every leg here measures the RENDERED page
   through the browser, so there is no source-level claim to route through the helper. The static
   server below reads whatever file the browser asks for, which is a server, not an assertion.
   An unused import would be a comment that states behaviour the file does not have. */

const UNSCOPE     = process.argv.includes('--unscope-light');
const HEADER_BASE = process.argv.includes('--header-base');
const NUDGE_HALF  = process.argv.includes('--nudge-half');

/* The Captain's own storage keys, verbatim from the design donor. NOT ours to rename. */
const KEY_SITE  = 'datumae-studio-site-theme-v31';
const KEY_PAPER = 'datumae-studio-paper-theme-v31';

/* ⛔ THE SCOPE ANCHOR CARRIES ITS TRAILING DOT ON PURPOSE — IT MUST HIT DESCENDANTS ONLY.
   There are 22 `body.light-mode #studioOverlayWrap ` rules and one of them is the BARE WRAP rule
   (the scrim: `background: rgba(28,39,47,.28); backdrop-filter: blur(4px)`). Unscoping that one
   yields `body.light-mode { ... }` — which paints and BLURS THE ENTIRE PAGE, a far bigger blast than
   the defect being reproduced. A CONTROL THAT BREAKS MORE THAN ITS TARGET PROVES NOTHING ABOUT ITS
   TARGET. The trailing dot excludes it and leaves exactly the 21 descendant rules. */
const A_SCOPE  = 'body.light-mode #studioOverlayWrap .';
const SCOPE_N  = 21;
const A_HEADER = 'background: linear-gradient(90deg,rgba(76,135,183,.05),transparent 36%,rgba(166,120,40,.03));';
const A_OFFSET = 'left:19px; top:12.5%; margin-top:0.5px;';

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* ⛔ ANCHOR COUNT ASSERTED BEFORE ANY MUTATION. A control that silently fails to land is a green
   that proves nothing, and it is indistinguishable from one that landed and found no defect.
   The expected count is passed in rather than fixed at 1, because the cascade control is a SWEEP and
   a sweep whose population drifted is measuring something other than what it was calibrated on. */
function mutate(src, anchor, replacement, label, want) {
  const n = src.split(anchor).length - 1;
  if (n !== want) {
    console.error('ANCHOR ' + label + ': expected exactly ' + want + ', found ' + n + ' — re-ground it.');
    process.exit(1);
  }
  return src.split(anchor).join(replacement);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (/studio\.html$/.test(p)) {
    let s = body.toString('utf8'); let touched = false;
    /* Reproduces the cascade defect EXACTLY: the light rules keep their text and lose their ID
       scope, so they parse, sit in the stylesheet, and are overruled by the base rules. */
    if (UNSCOPE)     { s = mutate(s, A_SCOPE, 'body.light-mode .', 'A_SCOPE', SCOPE_N); touched = true; }
    /* Restores the opaque base the Captain asked to be removed — the band, not the wash. */
    if (HEADER_BASE) { s = mutate(s, A_HEADER, A_HEADER.replace(/;$/, ', #f7f4ef;'), 'A_HEADER', 1); touched = true; }
    /* Restores the half-pixel error: the traveller rides high on every dot again. */
    if (NUDGE_HALF)  { s = mutate(s, A_OFFSET, 'left:19px; top:12.5%;', 'A_OFFSET', 1); touched = true; }
    if (touched) body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

/* Relative luminance of an rgb()/rgba() string. Returns null when unparseable, and every caller
   asserts against null rather than letting it coerce — a null that reads as 0 is BLACK, which would
   quietly satisfy every "went darker" comparison in this file. */
const lum = (c) => { const m = String(c).match(/[0-9.]+/g); return m && m.length >= 3
  ? (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) : null; };
/* Alpha of a computed colour. ⛔ `rgb()` WITH NO FOURTH COMPONENT IS FULLY OPAQUE — returning 1 here
   rather than 0 IS the whole of L2, so it is written explicitly instead of falling out of a default. */
const alpha = (c) => { const m = String(c).match(/[0-9.]+/g); return !m ? null : (m.length >= 4 ? +m[3] : 1); };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  /* ⛔ THE ENTRY-OVERLAY SKIP FLAG IS DELIBERATELY *NOT* SET, AND IT IS THE ONE FLAG EVERY OTHER
     BROWSER GATE HERE DOES SET. They suppress this overlay to get past it to the Studio; this gate's
     entire subject IS the overlay, so suppressing it would leave every leg below computing styles on
     an element that is not on screen — the exact shape of an empty green. The DISCOVER overlay is
     still dismissed: different surface, and it occludes. */
  await page.addInitScript(() => { try { localStorage.setItem('datum-discover-v1', 'done'); } catch (e) {} });

  /* Storage is written then reloaded because the theme is applied on the boot path; setting a class
     directly would test a state the product cannot actually reach. */
  const load = async (site) => {
    await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
    await page.evaluate((a) => { localStorage.setItem(a[0], a[1]); localStorage.setItem(a[2], 'dark'); },
      [KEY_SITE, site, KEY_PAPER]);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
  };

  const mode = UNSCOPE ? '   [MUTATED --unscope-light]' : HEADER_BASE ? '   [MUTATED --header-base]'
             : NUDGE_HALF ? '   [MUTATED --nudge-half]' : '';
  console.log('[RUN] THE ENTRY OVERLAY — LIGHT TREATMENT, HEADER, TRAVELLER' + mode);

  await load('dark');

  /* ── L1a / L1b · POPULATION AT AN EXACT SIZE, AND THE OVERLAY ACTUALLY ON SCREEN ─────────────
     ⛔ A PREDICATE OVER AN EMPTY SET IS TRUE. Every leg below filters to these elements, so their
     COUNT and their VISIBILITY are asserted first. `dismissed` is checked by name because a
     dismissed overlay still carries all of its markup: the nodes would be found, the styles would
     compute, and every colour leg would report a confident GREEN over a panel nobody can see. */
  const pop = await page.evaluate(() => {
    const w = document.getElementById('studioOverlayWrap');
    const r = w ? w.getBoundingClientRect() : null;
    return {
      wrap: document.querySelectorAll('#studioOverlayWrap').length,
      brief: document.querySelectorAll('#studioOverlayWrap .brief').length,
      header: document.querySelectorAll('#studioOverlayWrap .brief-header').length,
      trav: document.querySelectorAll('#studioOverlayWrap .phase-traveler').length,
      dots: document.querySelectorAll('#studioOverlayWrap .phase-dot').length,
      dismissed: w ? w.classList.contains('dismissed') : null,
      disp: w ? getComputedStyle(w).display : null,
      area: r ? Math.round(r.width * r.height) : 0
    };
  });
  ok(pop.wrap === 1 && pop.brief === 1 && pop.header === 1 && pop.trav === 1 && pop.dots === 4,
    'L1a · POPULATION: exactly 1 wrap / 1 brief / 1 header / 1 traveller / 4 dots [observed '
    + pop.wrap + '/' + pop.brief + '/' + pop.header + '/' + pop.trav + '/' + pop.dots + ']');
  ok(pop.dismissed === false && pop.disp !== 'none' && pop.area > 200000,
    'L1b · THE OVERLAY IS ON SCREEN, not merely in the markup [observed dismissed ' + pop.dismissed
    + ', display ' + pop.disp + ', area ' + pop.area + 'px2] — a dismissed overlay would satisfy '
    + 'every colour leg below over a panel nobody can see');

  /* ── L1c / L1d / L1e · THE LIGHT RULES RESOLVE ───────────────────────────────────────────────
     ⭐ ASSERTED AS A RELATIONSHIP, NEVER AS A CONSTANT: the panel must PAINT DIFFERENTLY and the ink
     must INVERT. Pinning #fcfbf8 would have to be edited every time the Captain retunes a value.
     What must be true is that the light rules WIN THE CASCADE, and that is what is measured.
     ⚠️ backgroundColor IS THE WRONG PROPERTY FOR THE PANEL, THE DOCK AND THE CHOICES — all three
     paint with GRADIENTS, so backgroundColor is transparent in BOTH themes and a luminance test
     reads 0 -> 0. Those three are asserted as "the painted surface CHANGED", which is the strongest
     sentence that measurement supports. Luminance is used only where the colour is flat: the ink.
     ⚠️ MEASURED UNDER --unscope-light AND RECORDED HERE SO THE NEXT READER IS NOT MISLED BY A
     FAILING LEG'S OWN NUMBERS: with the overlay light rules disarmed, h1 STILL MOVES (255 -> 31)
     while copy does not (165 -> 165). That is not the leg misfiring. The base rule spells h1 as
     `color:var(--white)`, and the PAINT TOKEN re-resolves under the light theme all by itself,
     whereas .brief-copy's base is a literal #9ba7ae and a literal cannot be reached by a token.
     🔑 SO THE h1 HALF OF THIS LEG IS PARTLY MEASURING THE TOKEN TIER, AND THE copy HALF IS WHAT
     ACTUALLY PROVES THE OVERLAY'S OWN RULES WON. Both are kept, as an AND, because the pair is the
     honest statement; the copy half is the one carrying the claim.
     ⛔⛔ THE TRIGGER, STATED PLAINLY BECAUSE A BLIND SPOT WITHOUT ITS TRIGGER IS A CURIOSITY RATHER
     THAN A WARNING: IF SOMEONE LATER UNSCOPES, DELETES OR OTHERWISE DISARMS *ONLY* THE
     `body.light-mode #studioOverlayWrap .brief h1` RULE, THIS LEG CAN STAY GREEN — h1 would keep
     moving on the token alone, and .brief-copy would still be correct, so the AND still holds while
     one of its two surfaces has genuinely regressed. --unscope-light cannot expose that case because
     it sweeps all 21 descendant rules at once. A second control narrowed to the h1 rule is what
     would close it; it is not built, and that is a KNOWN gap rather than an unexamined one. */
  const surfaces = () => page.evaluate(() => {
    const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
    const paint = (sel) => g(sel, 'backgroundImage') + '|' + g(sel, 'backgroundColor');
    return {
      panel: paint('#studioOverlayWrap .brief'),
      dock: paint('#studioOverlayWrap .action-dock'),
      choice: paint('#studioOverlayWrap .choice'),
      h1: g('#studioOverlayWrap .brief h1', 'color'),
      copy: g('#studioOverlayWrap .brief-copy', 'color'),
      headerBg: g('#studioOverlayWrap .brief-header', 'backgroundColor')
    };
  });
  const dk = await surfaces();
  await load('light');
  const lt = await surfaces();

  ok(lt.panel !== dk.panel,
    'L1c · THE PANEL MOVES: the .brief surface paints differently in light [observed changed: '
    + (lt.panel !== dk.panel) + '] — an ID-scoped base rule beats a class-only light rule, and the '
    + 'loser is indistinguishable from a rule never written');
  ok(lt.dock !== dk.dock && lt.choice !== dk.choice,
    'L1d · AND SO DO THE DOCK AND THE CHOICES [observed dock changed ' + (lt.dock !== dk.dock)
    + ', choice changed ' + (lt.choice !== dk.choice) + ']');
  ok(lum(dk.h1) !== null && lum(lt.h1) !== null && lum(dk.copy) !== null && lum(lt.copy) !== null
     && lum(lt.h1) < lum(dk.h1) - 80 && lum(lt.copy) < lum(dk.copy) - 40,
    'L1e · AND THE INK INVERTS WITH THEM [observed h1 ' + Math.round(lum(dk.h1)) + ' -> '
    + Math.round(lum(lt.h1)) + ', copy ' + Math.round(lum(dk.copy)) + ' -> '
    + Math.round(lum(lt.copy)) + ']');

  /* ── L2 · THE HEADER IS A WASH, NOT A BAND ───────────────────────────────────────────────────
     ⭐ THE STRUCTURAL PROPERTY THAT MAKES THE DEFECT IMPOSSIBLE, NOT A SIMULATION OF THE EYE. The
     complaint was a visible hard edge; the MECHANISM was an opaque base behind a tint. Fully
     transparent background-color is exactly what excludes an opaque base, and unlike a pixel
     comparison it cannot drift with anti-aliasing or with a retuned tint.
     ⛔ A PIXEL-SAMPLING VERSION WAS CONSIDERED AND DECLINED — RECORDED SO NOBODY RE-DERIVES IT. The
     surface directly beneath the header is .brief-intro, which carries its OWN gradient, so
     "the header against the pixel below it" differs even when the header is CORRECT. That proof
     cannot be valid here, and a proof that cannot be valid is worse than none, because it will be
     cited by somebody who did not read this paragraph.
     ⚠️ THE DARK HEADER DOES CARRY A BASE — rgba(4,10,18,.76) — AND THAT IS NOT A DEFECT: it is
     translucent, so the panel still reads through it. The claim is about OPACITY, not presence. The
     dark alpha is reported alongside so the next reader can see that distinction rather than trust
     this comment for it. */
  const aLight = alpha(lt.headerBg), aDark = alpha(dk.headerBg);
  ok(aLight !== null && aLight < 1,
    'L2 · NO OPAQUE BASE BEHIND THE HEADER TINT in light mode [observed light alpha ' + aLight
    + ' (want <1), dark alpha ' + aDark + ' for reference] — a base behind a tint turns a wash into '
    + 'a band, which is the hard delineation the Captain saw');

  /* ── L3 · THE TRAVELLER LANDS ON THE DOT ─────────────────────────────────────────────────────
     ⭐ THE STOPS ARE READ OUT OF THE LIVE KEYFRAMES, NOT RESTATED HERE — see the header note.
     ⛔ THE ANIMATION IS STOPPED AND THE TRAVELLER PARKED AT EACH STOP IN TURN, rather than sampling
     a running 12s animation at a hoped-for moment. A fixed sleep against a moving target is the
     single most common flake species in this estate, and against a HALF-PIXEL claim it would make
     the measurement meaningless even when it did not flake.
     ⭐ THE SCALE PULSE IS IRRELEVANT BY CONSTRUCTION: the traveller is transform:translate(-50%,-50%),
     so its CENTRE is invariant under the keyframes' scale(1.28). Centres are what is compared, which
     is also why this leg does not care that the dots and the traveller are different sizes. */
  const geom = await page.evaluate(() => {
    const stops = [];
    /* ⛔ RECURSIVE ON PURPOSE. The keyframes sit at the top level of the inline <style> TODAY, and a
       flat walk would find them — but the same block already contains @media groups, so the day
       somebody moves this rule inside one, a flat walk returns ZERO stops and L3a reds for a reason
       that has nothing to do with the traveller. Descend through every grouping rule instead. */
    const walk = (rules) => {
      if (!rules) return;
      for (const r of Array.from(rules)) {
        if (r.type === CSSRule.KEYFRAMES_RULE && r.name === 'studioSequenceTraveler') {
          for (const kf of Array.from(r.cssRules)) {
            const t = kf.style.top;
            if (t && stops.indexOf(t) === -1) stops.push(t);
          }
        } else if (r.cssRules) { walk(r.cssRules); }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { walk(sheet.cssRules); } catch (e) { continue; }
    }
    const trav = document.querySelector('#studioOverlayWrap .phase-traveler');
    const dots = Array.from(document.querySelectorAll('#studioOverlayWrap .phase-dot'));
    const mid = (e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
    const dotMids = dots.map(mid);
    const prevAnim = trav.style.animation, prevTop = trav.style.top;
    trav.style.animation = 'none';
    const measured = stops.map((s) => {
      trav.style.top = s;
      void trav.offsetHeight;
      const tm = mid(trav);
      let best = null;
      for (const d of dotMids) { const dd = Math.abs(tm - d); if (best === null || dd < best.d) best = { d: dd, dot: d }; }
      return { stop: s, travMid: +tm.toFixed(3), dotMid: +best.dot.toFixed(3), delta: +best.d.toFixed(3) };
    });
    trav.style.animation = prevAnim; trav.style.top = prevTop;
    return { stops, dotMids: dotMids.map((v) => +v.toFixed(3)), measured };
  });

  /* ⛔ THE STOP LIST IS ASSERTED BEFORE IT IS USED. If the keyframes were renamed, or the CSSOM read
     came back empty for any reason, the per-stop loop above would iterate ZERO times and L3b would
     report a confident GREEN having measured nothing at all. This leg is the anti-vacuity guard for
     the leg beneath it, which is why it has no control of its own. */
  ok(geom.stops.length === 4 && geom.dotMids.length === 4,
    'L3a · THE KEYFRAME STOPS WERE ACTUALLY READ: 4 distinct top values, 4 dots [observed stops '
    + JSON.stringify(geom.stops) + ', dots ' + geom.dotMids.length + '] — a loop over an empty stop '
    + 'list reports GREEN having measured nothing');

  /* Tolerance is chosen from the PHYSICS OF THE DEFECT, not from a run's spread: the error the
     Captain caught was HALF A PIXEL at every stop, so a quarter pixel is comfortably below the
     defect and comfortably above layout float residue. n=4 runs would be a rumour; this is a bound.
     ⭐ THE DISTINCT-DOT COUNT IS PART OF THE CLAIM. Nearest-dot matching alone would pass if all four
     stops collapsed onto ONE dot — every delta would be 0 and the traveller would never move. */
  const MAX_DELTA = 0.25;
  const worst = geom.measured.reduce((a, m) => (m.delta > a ? m.delta : a), 0);
  const matched = new Set(geom.measured.map((m) => m.dotMid)).size;
  ok(geom.measured.length === 4 && worst < MAX_DELTA && matched === 4,
    'L3b · THE TRAVELLER CENTRES ON THE DOT AT EVERY STOP [observed '
    + geom.measured.map((m) => m.stop + ': ' + m.travMid + ' vs ' + m.dotMid + ' (' + m.delta + 'px)').join(', ')
    + ' — worst ' + worst + 'px, want <' + MAX_DELTA + '; distinct dots matched ' + matched + '/4]');

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
