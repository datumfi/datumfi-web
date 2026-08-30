/* @gate-pool: browser */
/* ══ THE TWO THEME CONTROLS — REGISTRATION, WIRING, AND THE TWO-RENDERER LAW ════════════════════
 *
 * ⛔⛔ THE DEFECT L4 EXISTS TO MAKE IMPOSSIBLE, STATED AS THE FAILURE IT PRODUCES:
 * ADD THE THEME BUTTON TO THE SIGNED-OUT NAV ONLY. EVERY GATE PASSES HONESTLY, THE FEATURE IS
 * GENUINELY PRESENT, AND IT IS INVISIBLE TO THE ONLY PERSON WHO IS EVER SIGNED IN.
 * Found by the Captain's own signed-in smoke on 2026-08-29, and it is a RECURRENCE: the same
 * two-renderer fork landed the Drafting -> SHEET rename in one bar and not the other.
 * 🔑 THIS IS A WORSE FAMILY MEMBER THAN A FALSE GREEN. A false green is an instrument lying about
 *    the product. THIS is every instrument telling the truth about a product nobody can reach.
 *
 * ⚠️ L4 IS DELIBERATELY SOURCE-LEVEL, AND THE REASON IS A STANDING GAP, NOT LAZINESS: no instrument
 *    in this estate can hold a Clerk session, so NOTHING here can render the signed-in bar. Rather
 *    than simulate a session and prove a fiction, L4 asserts the STRUCTURAL PROPERTY that makes the
 *    defect impossible. A PROOF INHERITS THE CAPABILITIES OF THE THING THAT RAN IT.
 *
 * ⛔ WHAT THIS GATE DELIBERATELY DOES NOT ASSERT: that the Studio stays dark. That is TRUE of this
 *    commit and the colour port will make it FALSE ON PURPOSE. An instrument you must edit to keep
 *    green is one that will eventually be edited to agree with a defect. The "nothing else moves"
 *    claim is a MEASUREMENT recorded in the commit message, never a standing control.
 *
 * Usage: node scripts/_gate_theme_toggles.js [--drop-signedin|--dead-handler|--strip-css]
 *   --drop-signedin  second renderer stops emitting the button   -> REDS L4  ONLY
 *   --dead-handler   the delegated listener stops matching       -> REDS L3a-f + L5
 *   --strip-css      the donor's first toggle rule is removed    -> REDS L1b ONLY
 *   --restore-quirk  the donor's paper re-default is restored    -> REDS L6  ONLY
 *   --icon-quirk     the retired V30 moon rule is restored       -> REDS L7  ONLY
 *   --nolight        the light-mode CSS block is disarmed        -> REDS L8a ONLY
 *   --paper-deaf     the canvas re-scoped to light-mode again    -> REDS L9  ONLY
 *   --cap-half       Capacity Mode's half-fix restored           -> REDS L10 ONLY
 *   --oneway-quirk   the donor's one-way coupling is restored    -> REDS L3e + L3g
 * SIX controls; FOUR red sets are SINGLETONS and all six are DISTINCT. Stated
 * rather than claimed: L3 and L5 share a control because persistence cannot be observed without
 * a click that works, so no mutation can separate them.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
/* ⛔ studioSource() IS THE ONLY DOOR — never a bare disk read of studio.html (Phase 0
   contract). The first version of this gate read the file directly and _gate_studio_source
   caught it on the qualifying run. It only caught it because this gate was STAGED first:
   that census enumerates with `git ls-files`, so an untracked gate is invisible to it. */
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8461; const BASE = 'http://127.0.0.1:' + PORT;

const DROP_SIGNEDIN = process.argv.includes('--drop-signedin');
const DEAD_HANDLER  = process.argv.includes('--dead-handler');
const STRIP_CSS     = process.argv.includes('--strip-css');
const RESTORE_QUIRK = process.argv.includes('--restore-quirk');
const ICON_QUIRK    = process.argv.includes('--icon-quirk');
const ONEWAY_QUIRK  = process.argv.includes('--oneway-quirk');
const NOLIGHT       = process.argv.includes('--nolight');
const PAPERDEAF     = process.argv.includes('--paper-deaf');
const CAPHALF       = process.argv.includes('--cap-half');

/* The Captain's own storage keys, verbatim from the design donor. NOT ours to rename. */
const KEY_SITE  = 'datumae-studio-site-theme-v31';
const KEY_PAPER = 'datumae-studio-paper-theme-v31';

const A_EMIT    = '+   themeToggle(active)';
const A_CSSRULE = '  .theme-toggle {' + String.fromCharCode(10) + '    width:32px;';
const A_HANDLER = "t.closest('[data-theme-toggle]')";
const A_BOOT    = "  if (p === 'light') document.body.classList.add('canvas-light');";
const A_MOBCSS  = '  .theme-toggle-mobile { display: flex;';
const A_REVERT  = '} else if (!light && paperLight && paperWasAuto()) {';
const A_LIGHTCSS = '  background-color:#f3f1ed !important;';
const A_PAPERSCOPE = 'body.canvas-light .canvas-wrapper {';
const A_CAPSCOPE   = 'body.canvas-light #shape-mode-toggle {';

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* ⛔ ANCHOR COUNT ASSERTED BEFORE ANY MUTATION. A control that silently fails to land is a green
   that proves nothing, and it is indistinguishable from one that landed and found no defect. */
function mutate(src, anchor, replacement, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + label + ': expected exactly 1, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(anchor, replacement);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (STRIP_CSS && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_CSSRULE, '  .theme-toggle-OFF {' + String.fromCharCode(10) + '    width:32px;', 'A_CSSRULE'), 'utf8');
  }
  if (RESTORE_QUIRK && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_BOOT,
      "  if ((p === 'light') || light) document.body.classList.add('canvas-light');", 'A_BOOT'), 'utf8');
  }
  if (ICON_QUIRK && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_MOBCSS,
      '  body.canvas-light .moon-icon { display:block; }' + String.fromCharCode(10) + A_MOBCSS, 'A_MOBCSS'), 'utf8');
  }
  /* ⛔ SURGICAL, AND THE FIRST VERSION WAS NOT. It commented out the whole light block, which left an
     unbalanced comment, ate the rules after it and broke the diagnostics modal's display:none — the
     gate then timed out clicking through an invisible overlay. A CONTROL THAT BREAKS MORE THAN ITS
     TARGET PROVES NOTHING ABOUT ITS TARGET. This swaps ONE value back to the dark field and leaves
     the stylesheet valid. */
  /* Restores the HALF fix: the light-paper rule keys on light-mode again, so dark-site+light-paper
     goes back to a dark button — the exact state the Captain found. */
  if (CAPHALF && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_CAPSCOPE,
      'body.light-mode.canvas-light #shape-mode-toggle {', 'A_CAPSCOPE'), 'utf8');
  }
  if (PAPERDEAF && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_PAPERSCOPE,
      'body.light-mode .canvas-wrapper {', 'A_PAPERSCOPE'), 'utf8');
  }
  if (NOLIGHT && /studio\.html$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_LIGHTCSS, '  background-color:#091221 !important;', 'A_LIGHTCSS'), 'utf8');
  }
  if (ONEWAY_QUIRK && /studio-theme\.js$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_REVERT,
      '} else if (false) {', 'A_REVERT'), 'utf8');
  }
  if (DEAD_HANDLER && /studio-theme\.js$/.test(p)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_HANDLER, "t.closest('[data-theme-toggle-OFF]')", 'A_HANDLER'), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const mode = DROP_SIGNEDIN ? '   [MUTATED --drop-signedin]' : DEAD_HANDLER ? '   [MUTATED --dead-handler]'
             : STRIP_CSS ? '   [MUTATED --strip-css]' : '';
  console.log('[RUN] THE TWO THEME CONTROLS' + mode);

  /* ── L1 · POPULATION AT AN EXACT SIZE, AND THE DONOR CSS ACTUALLY LANDED ─────────────────────
     Counting markup alone would pass over a page that shipped three UNSTYLED buttons. The computed
     width is the donor's own 32px, so L1b fails if the 43 ported rules did not resolve. Markup and
     styling are proven together because either alone is a half-truth about a visual control. */
  const pop = await page.evaluate(() => {
    const el = document.getElementById('siteThemeToggle');
    return {
      site: document.querySelectorAll('[data-theme-toggle="site"]').length,
      paper: document.querySelectorAll('[data-theme-toggle="paper"]').length,
      w: el ? getComputedStyle(el).width : null,
      inNav: !!(el && el.closest('#app-nav')),
      paperInCanvas: !!document.querySelector('#canvas-wrapper [data-theme-toggle="paper"]')
    };
  });
  ok(pop.site === 2 && pop.paper === 1,
    'L1a · POPULATION: exactly 2 site controls (nav + mobile) and 1 paper control [observed: site '
    + pop.site + '/2, paper ' + pop.paper + '/1]');
  ok(pop.w === '32px',
    'L1b · DONOR CSS RESOLVED: #siteThemeToggle computes the donor 32px [observed: ' + pop.w + ']');
  ok(pop.inNav && pop.paperInCanvas,
    'L1c · PLACEMENT: site control inside #app-nav, paper control inside #canvas-wrapper [observed: nav '
    + pop.inNav + ', canvas ' + pop.paperInCanvas + ']');

  /* ── L2 · REGISTRATION — proven SEPARATELY from wiring (§11.4), and from source ──────────────
     Says the page declares the module, and that each storage key has exactly ONE definition. Two
     places holding one key is how a rename lands in half a product. */
  const studioSrc = studioSource();
  const themeSrc  = fs.readFileSync(path.join(ROOT, 'scripts/studio-theme.js'), 'utf8');
  const tagN = studioSrc.split('src="/scripts/studio-theme.js"').length - 1;
  const defSite = studioSrc.split(KEY_SITE).length - 1;
  const defPaper = studioSrc.split(KEY_PAPER).length - 1;
  const reads = themeSrc.indexOf('window.DATUM_THEME_KEYS') !== -1;
  const restates = themeSrc.indexOf(KEY_SITE) !== -1;
  ok(tagN === 1, 'L2a · REGISTRATION: studio.html declares studio-theme.js exactly once [observed: ' + tagN + ']');
  ok(defSite === 1 && defPaper === 1,
    'L2b · ONE DEFINITION: each donor storage key is written exactly once in studio.html [observed: site '
    + defSite + ', paper ' + defPaper + ']');
  ok(reads && !restates,
    'L2c · NO SECOND SOURCE: studio-theme.js READS the keys and never restates them [observed: reads '
    + reads + ', restates ' + restates + ']');

  /* ── L3 · WIRING — the control moves the state, BOTH DIRECTIONS ──────────────────────────────
     Both directions on purpose: a one-way check passes over a button that latches ON and cannot be
     turned off, which is a worse product than one that never worked at all. */
  const state = () => page.evaluate(() => {
    const el = document.getElementById('siteThemeToggle');
    const m = document.querySelector('meta[name="theme-color"]');
    return {
      light: document.body.classList.contains('light-mode'),
      paper: document.body.classList.contains('canvas-light'),
      meta: m ? m.getAttribute('content') : null,
      pressed: el ? el.getAttribute('aria-pressed') : null
    };
  });
  const clickSite = async () => { await page.click('#siteThemeToggle'); await page.waitForTimeout(150); };
  const s0 = await state();
  await clickSite(); const s1 = await state();
  await clickSite(); const s2 = await state();
  ok(s0.light === false && s1.light === true && s2.light === false,
    'L3a · WIRING: the site control turns light mode ON and OFF [observed: '
    + s0.light + ' -> ' + s1.light + ' -> ' + s2.light + ']');
  ok(s1.meta === '#d7dfdb' && s2.meta === '#07101b',
    'L3b · THEME-COLOR follows the switch [observed: on ' + s1.meta + ', off ' + s2.meta + ']');
  ok(s1.pressed === 'true' && s2.pressed === 'false',
    'L3c · aria-pressed reports the live state [observed: on ' + s1.pressed + ', off ' + s2.pressed + ']');
  /* ⭐ THE DONOR COUPLING, PINNED — turning the SITE light must default the CANVAS to light paper
     once. This is donor behaviour, not ours, and pinning it is what stops a later "tidy-up" from
     quietly deleting a rule the Captain authored. */
  ok(s1.paper === true,
    'L3d · DONOR COUPLING: entering site-light defaults the canvas to light paper [observed: '
    + s0.paper + ' -> ' + s1.paper + ']');
  /* ⭐ CAPTAIN-RULED 2026-08-29, AND THIS LEG USED TO ASSERT THE OPPOSITE. It pinned the donor's
     one-way coupling as correct; his smoke found that leaving light mode left the paper stuck white
     and "dimmed". The rule is now: UNDO WHAT WE DID AUTOMATICALLY, NEVER UNDO WHAT THE USER CHOSE.
     ⛔ RECORDED RATHER THAN QUIETLY REWRITTEN: a gate that changes its mind is a RULING, and the
     next reader must be able to tell that apart from a gate loosened to accommodate a defect. */
  ok(s2.paper === false,
    'L3e · THE COUPLING IS REVERSIBLE: leaving site-light undoes the paper IT set [observed: '
    + s1.paper + ' -> ' + s2.paper + ' (want false)]');
  /* INDEPENDENCE asserted as a TRANSITION, not an end state: the paper control must move the paper
     and leave the site where it is, whatever the two happen to be when it is pressed. */
  await page.click('#paperToggle'); await page.waitForTimeout(150);
  const s3 = await state();
  ok(s3.paper === !s2.paper && s3.light === s2.light,
    'L3f · INDEPENDENCE: the paper control flips the canvas and leaves the site untouched [observed: paper '
    + s2.paper + ' -> ' + s3.paper + ', site ' + s2.light + ' -> ' + s3.light + ']');

  /* ── L3g · THE OTHER HALF OF THE RULING: A DELIBERATE CHOICE IS NOT UNDONE ───────────────────
     The click above was explicit, so the site switch must now leave the paper alone in BOTH
     directions. Without this leg, "always revert" would pass L3e and silently throw away a choice
     the user made — a fix that satisfies the complaint and breaks the earlier ruling. */
  await page.click('#siteThemeToggle'); await page.waitForTimeout(150);
  await page.click('#siteThemeToggle'); await page.waitForTimeout(150);
  const s4 = await state();
  ok(s4.paper === s3.paper,
    'L3g · A CHOSEN PAPER SURVIVES A FULL SITE ROUND TRIP [observed: ' + s3.paper + ' -> ' + s4.paper + ']');

  /* ── L4 · THE TWO-RENDERER LAW — the leg this gate exists for ────────────────────────────────*/
  let acctSrc = fs.readFileSync(path.join(ROOT, 'scripts/account-topbar.js'), 'utf8');
  if (DROP_SIGNEDIN) acctSrc = mutate(acctSrc, A_EMIT, '+   /* dropped */ ""', 'A_EMIT');
  /* ⛔ THE CALL SITE, NEVER THE BARE NAME. The first version of this leg tested for
     'themeToggle(active)', which the FUNCTION DEFINITION also contains — so it stayed GREEN
     under --drop-signedin, passing over a signed-in bar that never renders the button. A leg
     that cannot fail for the defect it names is decoration. Caught by its own control. */
  const emits     = acctSrc.indexOf(A_EMIT) !== -1;
  const declares  = acctSrc.indexOf('data-theme-toggle="site"') !== -1;
  const gated     = acctSrc.indexOf("if (active !== 'studio') return '';") !== -1;
  const announces = acctSrc.indexOf('window.datumThemeSync') !== -1;
  ok(emits && declares && gated && announces,
    'L4 · TWO RENDERERS: the signed-IN bar emits the control, Studio-gated, and announces its state '
    + '[observed: emits ' + emits + ', declares ' + declares + ', gated ' + gated + ', announces '
    + announces + '] — a control in one renderer only is invisible to the only signed-in user');

  /* ── L5 · PERSISTENCE, UNDER THE CAPTAIN'S OWN KEY NAMES ─────────────────────────────────────
     Asserts the VALUES the clicks above should have written: site toggled on then off (dark), paper
     toggled on (light). Reading the keys by name is what proves we persisted where the donor does. */
  const stored = await page.evaluate((k) => ({
    site: localStorage.getItem(k[0]), paper: localStorage.getItem(k[1])
  }), [KEY_SITE, KEY_PAPER]);
  /* ⛔ ASSERTED AS A RELATIONSHIP, NEVER AS A CONSTANT. Pinning the literal end-state of one click
     sequence would make this leg a transcript of my clicks — it would go green over a module that
     wrote the right words to the wrong key, and it would have to be EDITED the day the sequence
     changed. What must be true is that what is STORED agrees with what is SHOWN. */
  /* ⛔ READ THE LIVE STATE, NEVER AN EARLIER SNAPSHOT. This compared `stored` (fresh) against s3
     (taken several clicks earlier) and PASSED BY COINCIDENCE on the clean run — the two happened to
     agree. --oneway-quirk moved the page after s3 and exposed it. A leg that is right only while an
     unrelated leg leaves the page in a particular state is not measuring what it claims. */
  const sNow = await state();
  const wantSite = sNow.light ? 'light' : 'dark';
  const wantPaper = sNow.paper ? 'light' : 'dark';
  ok(stored.site === wantSite && stored.paper === wantPaper,
    'L5 · PERSISTENCE: what is stored under the donor keys AGREES with what is on screen [observed: site '
    + stored.site + ' vs ' + wantSite + ', paper ' + stored.paper + ' vs ' + wantPaper + ']');

  /* ── L6 · A SAVED CHOICE SURVIVES A RELOAD — CAPTAIN-RULED 2026-08-29 ────────────────────────
     The donor re-defaulted the paper from the site on every restore, so light-site + dark-paper was
     written to storage and then overruled before anyone saw it. A PREFERENCE THAT IS STORED AND THEN
     IGNORED IS WORSE THAN ONE THAT IS NOT STORED. This leg reads the state AFTER a real reload,
     because the defect lives in the restore path and nothing observable before a reload can see it. */
  await page.evaluate((k) => { localStorage.setItem(k[0], 'light'); localStorage.setItem(k[1], 'dark'); },
    [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const r6 = await state();
  ok(r6.light === true && r6.paper === false,
    'L6 · RELOAD SURVIVAL: light site + dark paper comes back exactly as saved [observed: light '
    + r6.light + ' (want true), paper ' + r6.paper + ' (want false)]');

  /* ── L7 · THE NAV ICON REPORTS ITS OWN SWITCH — CAPTAIN-RULED 2026-08-29 ─────────────────────
     "the sun and moon icon should NOT change depending on what you did in the paper mode."
     Asserted on COMPUTED display rather than on the absence of a rule: what matters is what the
     user sees, and a future rule from anywhere could re-create the defect without restoring the
     exact declaration this commit deleted. */
  await page.evaluate((k) => { localStorage.setItem(k[0], 'dark'); localStorage.setItem(k[1], 'light'); },
    [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const ic = await page.evaluate(() => {
    const b = document.getElementById('siteThemeToggle');
    const sun = b.querySelector('.sun-icon'), moon = b.querySelector('.moon-icon');
    return { light: document.body.classList.contains('light-mode'),
             paper: document.body.classList.contains('canvas-light'),
             sun: getComputedStyle(sun).display, moon: getComputedStyle(moon).display };
  });
  ok(ic.paper === true && ic.light === false && ic.sun !== 'none' && ic.moon === 'none',
    'L7 · ICON INDEPENDENCE: a light CANVAS leaves the nav icon reporting the SITE [observed: site '
    + ic.light + ', paper ' + ic.paper + ', sun ' + ic.sun + ', moon ' + ic.moon + ']');

  /* ── L8 · THE THEME ACTUALLY MOVES THE PAGE ──────────────────────────────────────────────────
     ⛔ WITHOUT THIS LEG THE WHOLE GATE IS AN EMPTY GREEN FOR THIS COMMIT: every other leg proves the
     CONTROL works, and a control that works over a page that never changes colour is exactly the
     product the last commit shipped ON PURPOSE. This one asserts the claim this commit actually makes.
     ⭐ ASSERTED AS A RELATIONSHIP, NOT A CONSTANT: light must be LIGHTER than dark on the same
     surfaces. Pinning #efede8 would have to be edited every time the Captain retunes a value, and an
     instrument you must edit to keep green is one that will be edited to agree with a defect. */
  const lum = (c) => { const m = String(c).match(/[0-9.]+/g); return m && m.length >= 3
    ? (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) : null; };
  const surfaces = () => page.evaluate(() => {
    const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
    /* ⚠️ backgroundColor IS THE WRONG PROPERTY FOR THE NAV AND THE CARDS and the first version of
       this leg used it: both paint with a GRADIENT, so backgroundColor is transparent in BOTH
       themes and the comparison read 0 -> 0. The luminance test is right for body (a flat colour)
       and meaningless for a gradient — so those two are asserted as "the painted surface CHANGED",
       which is the strongest sentence this measurement supports. */
    return { body: g('body', 'backgroundColor'), text: g('body', 'color'),
             navImg: g('#app-nav', 'backgroundImage') + '|' + g('#app-nav', 'backgroundColor'),
             cardImg: g('.sl-phase', 'backgroundImage') + '|' + g('.sl-phase', 'backgroundColor'),
             htmlClass: document.documentElement.className };
  });
  await page.evaluate((k) => { localStorage.setItem(k[0], 'dark'); localStorage.setItem(k[1], 'dark'); }, [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  const dk = await surfaces();
  await page.evaluate((k) => { localStorage.setItem(k[0], 'light'); }, [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  const lt = await surfaces();
  ok(lum(lt.body) > lum(dk.body) + 80,
    'L8a · THE FIELD MOVES: body goes markedly lighter [observed luminance '
    + Math.round(lum(dk.body)) + ' -> ' + Math.round(lum(lt.body)) + ', want +80 or more]');
  ok(lt.navImg !== dk.navImg && lt.cardImg !== dk.cardImg,
    'L8d · THE CHROME MOVES WITH IT: the nav and the phase cards paint differently in each theme '
    + '[observed nav changed ' + (lt.navImg !== dk.navImg) + ', card changed ' + (lt.cardImg !== dk.cardImg) + ']');
  ok(lum(lt.text) < lum(dk.text) - 80,
    'L8b · AND THE INK INVERTS WITH THEM [observed text ' + Math.round(lum(dk.text)) + ' -> ' + Math.round(lum(lt.text)) + ']');
  ok(/light-mode/.test(lt.htmlClass) && !/light-mode/.test(dk.htmlClass),
    'L8c · THE CLASS REACHES <html>, WHERE THE PAINTS ARE DECLARED [observed dark "' + dk.htmlClass
    + '", light "' + lt.htmlClass + '"] — on <body> alone the paint tier does not move');

  /* ── L9 · THE PAPER SWITCH MUST MOVE THE PAPER, NOT JUST THE CLASS ──────────────────────────
     ⛔⛔ THIS LEG EXISTS BECAUSE THE GATE SCORED 21/21 GREEN OVER A PAPER BUTTON THAT DID NOTHING ON
     PRODUCTION. The light canvas was scoped to `body.light-mode` instead of `body.canvas-light`, so
     the control toggled its class, its aria-pressed and its icon while THE SURFACE NEVER RESPONDED —
     in either theme. Every existing leg asserted the CLASS, and the class was always right.
     🔑 A CONTROL IS NOT PROVEN BY THE STATE IT SETS. IT IS PROVEN BY SOMETHING CHANGING BECAUSE OF IT.
     Captain-caught by pressing the button; no instrument here could have.
     ⭐ ASSERTED AS FOUR DISTINCT SURFACES over the two switches' four combinations — that is the
     strongest form, because it fails if ANY pair collapses onto one another, which is exactly how
     this defect presented (two pairs identical). */
  const canvasPaint = () => page.evaluate(() => {
    const e = document.querySelector('.canvas-wrapper');
    const c = getComputedStyle(e);
    return c.backgroundImage + '||' + c.backgroundColor;
  });
  await page.evaluate((k) => { localStorage.setItem(k[0], 'dark'); localStorage.setItem(k[1], 'dark'); }, [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  const seen = {};
  seen.darkDark = await canvasPaint();
  await page.click('#paperToggle'); await page.waitForTimeout(200);
  seen.darkPaper = await canvasPaint();
  await page.click('#siteThemeToggle'); await page.waitForTimeout(200);
  seen.lightPaper = await canvasPaint();
  await page.click('#paperToggle'); await page.waitForTimeout(200);
  seen.lightDark = await canvasPaint();
  const distinct = new Set(Object.values(seen)).size;
  ok(seen.darkPaper !== seen.darkDark,
    'L9a · THE PAPER SWITCH WORKS IN DARK MODE: the canvas repaints when only the paper changes '
    + '[observed changed: ' + (seen.darkPaper !== seen.darkDark) + ']');
  ok(seen.lightDark !== seen.lightPaper,
    'L9b · AND IN LIGHT MODE [observed changed: ' + (seen.lightDark !== seen.lightPaper) + ']');
  ok(distinct === 4,
    'L9c · ALL FOUR SITE/PAPER COMBINATIONS PAINT THE CANVAS DIFFERENTLY [observed ' + distinct
    + '/4 distinct] — two switches that collapse onto one surface are one switch wearing two names');

  /* ── L10 · CANVAS-LOCAL CHROME FOLLOWS THE PAPER, IN ALL FOUR STATES ─────────────────────────
     ⛔⛔ THIS LEG EXISTS BECAUSE I FIXED THIS DEFECT ONCE AND FIXED ONLY HALF OF IT. The Capacity
     Mode button bound to the SITE switch; I corrected light-site+dark-paper, reported it fixed, and
     left dark-site+light-paper untouched — so it still went wrong the moment the Captain approached
     it from the other side. He caught it in one press.
     🔑 A RELATIONSHIP HAS TWO EDGES. FIXING THE ONE THAT WAS REPORTED IS FIXING THE HALF SOMEBODY
     HAPPENED TO LOOK AT FIRST. So this asserts the RULE — canvas-local chrome tracks canvas-light
     and IGNORES light-mode — across all four combinations, which is the only form that cannot be
     satisfied by half a fix.
     ⭐ THE RULE GENERALISES BEYOND THIS BUTTON: anything painted ON the canvas belongs to the paper
     switch. Third surface in three commits to get this wrong (the canvas, then this, then this
     again from the other side). */
  const capBg = () => page.evaluate(() => {
    const e = document.getElementById('shape-mode-toggle');
    return e ? getComputedStyle(e).backgroundColor : 'MISSING';
  });
  const lum2 = (c) => { const m = String(c).match(/[0-9.]+/g); return m && m.length >= 3
    ? (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) : null; };
  await page.evaluate((k) => { localStorage.setItem(k[0], 'dark'); localStorage.setItem(k[1], 'dark'); }, [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  const capDD = await capBg();
  await page.click('#paperToggle'); await page.waitForTimeout(200);
  const capDL = await capBg();
  await page.click('#siteThemeToggle'); await page.waitForTimeout(200);
  const capLL = await capBg();
  await page.click('#paperToggle'); await page.waitForTimeout(200);
  const capLD = await capBg();
  ok(lum2(capDL) > 150 && lum2(capLL) > 150,
    'L10a · LIGHT PAPER gives a LIGHT Capacity button in BOTH site themes [observed dark-site '
    + Math.round(lum2(capDL)) + ', light-site ' + Math.round(lum2(capLL)) + ', want >150 both]');
  ok(lum2(capDD) < 80 && lum2(capLD) < 80,
    'L10b · DARK PAPER gives a DARK one in BOTH site themes [observed dark-site '
    + Math.round(lum2(capDD)) + ', light-site ' + Math.round(lum2(capLD)) + ', want <80 both]');
  ok(Math.abs(lum2(capDL) - lum2(capLL)) < 12 && Math.abs(lum2(capDD) - lum2(capLD)) < 12,
    'L10c · AND THE SITE SWITCH DOES NOT MOVE IT: same paper, same button, either site [observed '
    + 'light-paper delta ' + Math.round(Math.abs(lum2(capDL) - lum2(capLL)))
    + ', dark-paper delta ' + Math.round(Math.abs(lum2(capDD) - lum2(capLD))) + ']');

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
