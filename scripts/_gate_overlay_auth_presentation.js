/* THE AUTHORED AUTH PRESENTATION · RED-FIRST — the entry overlay's dock says WHO YOU ARE, and
 * the Captain ruled how it says it (2026-08-28, with the overlay port).
 *
 *   signed in   ·  SIGNED IN   in GOLD
 *   signed out  ·  Signed out  in RED, and the status dot next to it RED TOO
 *   the words "sign in" in the note are CLICKABLE, and are a quiet inline affordance —
 *   NOT a rectangle button.
 *
 * ⛔ WHY THIS GATE EXISTS AT ALL, AND IT IS NOT "MORE COVERAGE". The overlay port changed
 * applyAuthState from writing a rectangular .nav-login-btn into the status value to writing a
 * bare word plus a state class. _p8_studio_mechanics was reddened by that change and repaired by
 * loosening /Signed in/ to /Signed in/i — which was the right repair and left a hole behind it:
 * after the loosening, NOTHING in the suite asserted the authored PRESENTATION. Colour, casing,
 * the dot, and the not-a-button shape were all unguarded, and every one of them is a ruling.
 *   🔑 A VALUE FIX WITHOUT ITS GATE IS A DEFECT REPAIRED, NOT A CLASS CLOSED.
 *
 * ⛔ IT IS DELIBERATELY SEPARATE FROM THE STATE LEG. _p7/_p8 ask "does it say signed-in rather
 * than signed-out" — a STATE question. This file asks "does it say it the way it was authored" —
 * a PRESENTATION question. Folding them together would produce a leg that fails without telling
 * you which of the two things broke, and the two have different owners: the state is ours, the
 * presentation is the Captain's.
 *
 * ⚠️ ASSERTS COMPUTED COLOUR, NOT THE CLASS NAME. Checking for `class="signed is-out"` would pass
 * on a page where the rule that colours it had been deleted — the exact "a CSS rule that doesn't
 * apply looks identical to one never written" shape. getComputedStyle is the only reading that
 * cannot be satisfied by a class nobody styles.
 *
 * CONTROLS — four, each reddening a DIFFERENT leg, because a control set whose mutations all
 * redden the same leg is one instrument wearing several names:
 *   --goldout    signed-out text renders GOLD (the pre-ruling look)      -> L1 alone
 *   --dotdead    the dot stops following the state                       -> L2 alone
 *   --lowercase  signed-in reads "Signed in" instead of "SIGNED IN"      -> L3 alone
 *   --rectangle  the inline affordance becomes a bordered filled box     -> L4 alone
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8188;
const PART = 'studio.html';

/* The four anchors. Each is asserted to match EXACTLY ONCE on the served bytes before it is
 * replaced — a poison that silently fails to land yields a GREEN that proves nothing. */
const OUT_CLASS       = "_statusValue.className = 'signed is-out';";
const OUT_CLASS_GOLD  = "_statusValue.className = 'signed is-in';";
const DOT_CLASS       = "if (_statusLight) _statusLight.className = 'status-light ' + (_signedIn ? 'is-in' : 'is-out');";
const DOT_CLASS_STUCK = "if (_statusLight) _statusLight.className = 'status-light is-in';";
const CAPS            = "_statusValue.textContent = 'SIGNED IN';";
const CAPS_LOWER      = "_statusValue.textContent = 'Signed in';";
const LINK_RULE       = '#studioOverlayWrap .dock-signin{color:inherit;';
const LINK_RULE_BOX   = '#studioOverlayWrap .dock-signin{border:1px solid #888;background:#333;padding:4px 10px;border-radius:4px;color:inherit;';

const argv = process.argv.slice(2);
const GOLDOUT   = argv.includes('--goldout');
const DOTDEAD   = argv.includes('--dotdead');
const LOWERCASE = argv.includes('--lowercase');
const RECTANGLE = argv.includes('--rectangle');
const ANY_POISON = GOLDOUT || DOTDEAD || LOWERCASE || RECTANGLE;

const CONTROLS = {
  '--goldout': {
    what: 'signed-out status value renders in gold — the look before the Captain ruled red',
    anchors: [{ file: PART, literal: OUT_CLASS, count: 1 }],
    reds: ['L1'],
    expect: 'red'
  },
  '--dotdead': {
    what: 'the status dot stops following the auth state and stays gold',
    anchors: [{ file: PART, literal: DOT_CLASS, count: 1 }],
    reds: ['L2'],
    expect: 'red'
  },
  '--lowercase': {
    what: 'signed-in reads "Signed in" rather than the ruled "SIGNED IN"',
    anchors: [{ file: PART, literal: CAPS, count: 1 }],
    reds: ['L3'],
    expect: 'red'
  },
  '--rectangle': {
    what: 'the inline sign-in affordance becomes a bordered, filled rectangle button',
    anchors: [{ file: PART, literal: LINK_RULE, count: 1 }],
    reds: ['L4'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_overlay_auth_presentation.js', controls: CONTROLS }));
  process.exit(0);
}

const landed = [];
function poison(rel, body) {
  if (!ANY_POISON || rel !== PART) return body;
  const swap = (from, to, tag) => {
    const n = body.split(from).length - 1;
    if (n !== 1) { console.log(`ABORT: anchor for ${tag} matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(from).join(to);
    landed.push(tag);
  };
  if (GOLDOUT)   swap(OUT_CLASS, OUT_CLASS_GOLD, 'signedout->gold');
  if (DOTDEAD)   swap(DOT_CLASS, DOT_CLASS_STUCK, 'dot->stuck');
  if (LOWERCASE) swap(CAPS, CAPS_LOWER, 'caps->lower');
  if (RECTANGLE) swap(LINK_RULE, LINK_RULE_BOX, 'link->rectangle');
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) out = Buffer.from(poison(rel, out.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* The ruled colours, pinned here as RGB because that is what getComputedStyle returns.
 *
 * ⚠️ RED CHANGED 2026-08-28 FROM rgb(226,125,97) (#e27d61) TO rgb(226,75,74) (#e24b4a), AND THE
 * EARLIER RULING IS SUPERSEDED, NOT FORGOTTEN. The Captain first ruled #e27d61 — the design
 * source's own red — when the question was simply "which red does the dock use". The TIER question
 * had not been asked yet. It was asked the next day, and the answer changed the value:
 *   ⭐ --red IS A ROLE, NOT A PAINT, AND THE DONOR PROVES IT — the design source redefines it per
 *     theme (#e27d61 dark, #b65340 / #a84f3d / #b85c46 light). A PAINT HOLDS ONE VALUE; A THING
 *     THAT CHANGES WITH THE THEME IS A ROLE BY DEFINITION. The role is "the negative state".
 *   ⭐ AND THE DONOR AND THIS ESTATE ALREADY AGREE ON THAT MEANING. In the mock --red has exactly
 *     ONE consumer (Studio Mock:457, `.field strong.red`, a negative money value) — the same job as
 *     our --debt. They disagreed only on the SHADE.
 *   ⛔ THE SHADE WAS NOT WORTH A SECOND ROLE. Honouring #e27d61 meant either repointing --debt —
 *     486 reads across 31 files, to match one status dot — or minting a new role whose only job is
 *     to sit beside an existing one that means the same thing. TWO ROLES FOR ONE MEANING IS THE
 *     FORK L48 EXISTS TO PREVENT, and one we chose deliberately would be worse than one inherited.
 * 🔑 THE DOCK FOLLOWS THE ESTATE'S NEGATIVE ROLE BY RULING, NOT BY ACCIDENT. A constant that
 * changed without a reason beside it reads as a drift to the next person; this one has a reason.
 * ⛔ THIS GATE CAUGHT THE CHANGE THAT PRODUCED THIS NOTE. It was written to pin a Captain's ruling
 * against a future restyle, and the first thing it stopped was the palette work one session later.
 * DO NOT "FIX" A RED HERE BY EDITING THE CONSTANT TO MATCH WHAT THE PAGE HAPPENS TO RENDER — that
 * is making the instrument agree with the change, which is the one thing it exists not to do. */
const RED  = 'rgb(226, 75, 74)';
const GOLD = 'rgb(213, 173, 99)';

/* ⛔ THE REAL CLERK SDK MUST BE BLOCKED OR THE FIXTURE IS NOT THE FIXTURE. Measured on this
 * gate's first run: without the route-abort the shipped <script> replaced window.Clerk, the
 * mock was gone by reconcile time, and the SIGNED-IN arm rendered "Signed out" — L3 went red
 * over a page that was behaving correctly. Borrowed from _p7_studio_overlay_parity, whose
 * signed-in leg is green, so the donor is verified and not merely assumed (L48).
 *   🔑 A MOCK THAT THE PAGE CAN OVERWRITE IS A SUGGESTION, NOT A FIXTURE. */
async function look(chromium, signedIn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(`(() => {
    window.Clerk = { load: function(){ return Promise.resolve(); }, user: ${signedIn ? '{ firstName: "T" }' : 'null'} };
    try {
      sessionStorage.removeItem('datum_auth_hint');
      localStorage.removeItem('datum_studio_overlay_seen');
    } catch (e) {}
  })();`);
  const page = await ctx.newPage();
  await page.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);   // Clerk.load() -> applyAuthState(live) in place
  const out = await page.evaluate(() => {
    const wrap = document.getElementById('studioOverlayWrap');
    const sv = document.getElementById('studioStatusValue');
    const note = document.getElementById('studioStatusNote');
    const dot = wrap && wrap.querySelector('.status-light');
    const a = note && note.querySelector('a');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const acs = a ? cs(a) : null;
    return {
      overlayUp: !!(wrap && getComputedStyle(wrap).display !== 'none' && !wrap.classList.contains('dismissed')),
      text: sv ? (sv.textContent || '').trim() : null,
      textColor: sv ? cs(sv).color : null,
      dotColor: dot ? cs(dot).backgroundColor : null,
      linkPresent: !!a,
      linkText: a ? (a.textContent || '').trim() : null,
      linkHref: a ? a.getAttribute('href') : null,
      linkUnderlined: acs ? /underline/.test(acs.textDecorationLine) : false,
      linkBorderWidth: acs ? acs.borderTopWidth : null,
      linkBg: acs ? acs.backgroundColor : null
    };
  });
  await browser.close();
  return out;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

  console.log('[RUN] THE AUTHORED AUTH PRESENTATION  (gold in · red out · the dot follows · not a button)');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const out = await look(chromium, false);
  const inn = await look(chromium, true);

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served part'); process.exit(1); }
  if (ANY_POISON) console.log(`   poison landed: ${[...new Set(landed)].join(', ')}  (${landed.length} serves)`);

  /* ── ANTI-VACUITY. Every leg below reads the dock. If the overlay never rendered, all four
   *    would be describing a page that has no dock, and absence would read as agreement. */
  if (!out.overlayUp || !inn.overlayUp) {
    console.log(`ABORT: the overlay did not render (signedOut=${out.overlayUp} signedIn=${inn.overlayUp}).`);
    console.log('       Every leg here reads the dock; with no dock there is nothing to be wrong.');
    server.close();
    process.exit(2);
  }

  ok('L1', 'signed OUT: the status value reads "Signed out" IN RED',
    out.text === 'Signed out' && out.textColor === RED,
    `text=${JSON.stringify(out.text)} colour=${out.textColor} (ruled ${RED})`);

  ok('L2', 'signed OUT: the status DOT is red too — it follows the word',
    out.dotColor === RED,
    `dot=${out.dotColor} (ruled ${RED})`);

  ok('L3', 'signed IN: the status value reads "SIGNED IN" IN GOLD',
    inn.text === 'SIGNED IN' && inn.textColor === GOLD,
    `text=${JSON.stringify(inn.text)} colour=${inn.textColor} (ruled ${GOLD})`);

  /* NOT-A-BUTTON is asserted as the CONJUNCTION of what it must be and what it must not be:
   * a real anchor to the vault, underlined, with no border and no filled background. Asserting
   * only "an anchor exists" would pass on a rectangle. */
  const noBox = out.linkBorderWidth === '0px' &&
                (out.linkBg === 'rgba(0, 0, 0, 0)' || out.linkBg === 'transparent');
  ok('L4', 'the sign-in affordance is a quiet inline LINK, not a rectangle button',
    out.linkPresent && out.linkText === 'sign in' &&
    out.linkHref === '/vault.html?returnTo=%2Fstudio.html' &&
    out.linkUnderlined && noBox,
    `present=${out.linkPresent} text=${JSON.stringify(out.linkText)} href=${out.linkHref} underlined=${out.linkUnderlined} border=${out.linkBorderWidth} bg=${out.linkBg}`);

  const red = Object.keys(results).filter((k) => !results[k]).sort();
  console.log(`SCORE ${pass}/${pass + fail} ${fail ? 'RED' : 'GREEN'}`);
  if (ANY_POISON) {
    const expected = (CONTROLS[argv.find((a) => CONTROLS[a])] || {}).reds || [];
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${red.join(',') || '(none)'}`);
  }
  server.close();
  process.exit(ANY_POISON ? 0 : (fail ? 1 : 0));
})();
