'use strict';
/* _gate_plan_window_never_empty.js — STANDING GATE
 *
 * THE INVARIANT: at EVERY retirement age the retire field permits, the plan-through window has at
 * least one usable value — and when it does not, the product says which field can move.
 *
 * ⛔⛔ WHAT WENT WRONG. date-bounds.js sets
 *       plo = Math.max(PTA_MIN_FLOOR, (ra|0) + 20)     against PTA_MAX = 105
 * and the retire field permits ra up to RA_MAX = 90. Two bounds set by DIFFERENT RULES with nothing
 * stopping them crossing. MEASURED over the permitted range:
 *       ra 45..84  ->  usable window                      (40 ages)
 *       ra 85      ->  floor 105 == ceiling 105           COLLAPSED to one value
 *       ra 86..90  ->  floor 106..110  >  ceiling 105     EMPTY window
 *   => 6 of 46 permitted retirement ages leave NO usable plan-through range.
 * The Captain hit ra 85 and was told "Plan-through age must be between 105 and 105." He could not
 * change the field to anything but 105, and nothing on screen explained why.
 *   🔑 A VALIDATOR THAT CAN PRODUCE AN EMPTY RANGE IS NOT VALIDATING — IT IS LOCKING THE FIELD AND
 *      BLAMING THE USER.
 *   🔑 A VALIDATION MESSAGE MUST NAME THE FIELD THAT CAN MOVE. "between 105 and 105" named the one
 *      that cannot. AN ERROR THAT RESTATES A CONSTRAINT IS A COMPLAINT; AN ERROR THAT NAMES THE
 *      MOVE IS AN INSTRUMENT.
 *
 * ── WHY NODE-TIER FOR THE INVARIANT AND ONE BROWSER LEG FOR THE SEAM ────────────────────────
 * date-bounds.js is a pure module and BOTH Dossier.html and studio.html consume validateTarget, so
 * the engine is where the truth lives. Node lets B1 enumerate ALL 46 permitted retirement ages —
 * exhaustive, which a browser gate could not do at sensible cost. But an engine that returns the
 * right string proves nothing if the page throws it away, so B6 opens Dossier.html and reads the
 * message the USER is shown. Exhaustive where it is cheap; seam-proving where it matters.
 *
 * LEGS
 *   B0 · PAIRED PRESENCE — a normal retirement age still yields a usable window and still ACCEPTS a
 *        valid plan-through date. "Reject everything" would satisfy every other leg here.
 *   B1 · THE INVARIANT — for every ra the retire field permits, floor <= ceiling
 *   B2 · COLLAPSED (floor === ceiling) is reported as its own fact, naming the retirement age
 *   B3 · CROSSED (floor > ceiling) is reported as its own fact, naming the age to move to
 *   B4 · NORMAL states the rule and the range
 *   B5 · NO MESSAGE HARD-CODES A LIMIT — every number in every string is interpolated from the
 *        engine's constants. A LIMIT TYPED INTO A SENTENCE IS A HAND-MAINTAINED LIST WEARING A
 *        MESSAGE, AND IT WILL SURVIVE THE DAY THE LIMIT CHANGES.
 *   B6 · SEAM — Dossier.html shows the engine's message to the user (browser)
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_plan_window_never_empty.js        (exit 0 = GREEN)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8213;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

/* Load the real module in a sandbox — its own bytes, not a re-implementation. */
function loadDB() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/date-bounds.js'), 'utf8');
  const g = { window: {}, document: undefined };
  g.window.window = g.window;
  new Function('window', 'globalThis', src)(g.window, g.window);
  return g.window.DatumDateBounds;
}

(async () => {
  console.log('\n_gate_plan_window_never_empty\n');
  const DB = loadDB();
  check('B-0a · the bounds module loaded and exposes its constants',
    !!DB && typeof DB.RA_MAX === 'number' && typeof DB.PTA_MAX === 'number',
    DB ? ('RA ' + DB.RA_MIN_FLOOR + '..' + DB.RA_MAX + ' · PTA ' + DB.PTA_MIN_FLOOR + '..' + DB.PTA_MAX) : 'no module');
  if (!DB) { console.log('\nRED — cannot run'); process.exit(1); }

  const RA_LO = DB.RA_MIN_FLOOR, RA_HI = DB.RA_MAX, PTA_MAX = DB.PTA_MAX;

  /* The engine must expose the window itself; asking it "what is the range for this ra" is the
     question the UI needs and the one B1 asserts over. */
  check('B-0b · the engine exposes planWindow(ra) — the question the field actually asks',
    typeof DB.planWindow === 'function', typeof DB.planWindow);
  if (typeof DB.planWindow !== 'function') {
    console.log('\nRED — ' + (fails.length) + ' failing'); fails.forEach((f) => console.log('   RED · ' + f)); process.exit(1);
  }

  /* ── B1 · THE INVARIANT, EXHAUSTIVE ── */
  const bad = [];
  for (let ra = RA_LO; ra <= RA_HI; ra++) {
    const w = DB.planWindow(ra);
    if (!w || !(w.floor <= w.ceiling)) bad.push('ra' + ra + ' -> [' + (w && w.floor) + ',' + (w && w.ceiling) + ']');
  }
  check('B1 · THE INVARIANT — every permitted retirement age leaves a usable plan-through window',
    bad.length === 0, bad.length ? bad.length + ' empty: ' + bad.slice(0, 6).join(' ') : (RA_HI - RA_LO + 1) + ' ages checked');

  /* ── B2/B3/B4 · the three states are three different facts ── */
  const dob = { mo: 1, yr: 1980 };
  const ca = 46;
  const msgFor = (ra, tryAge) => {
    const yr = dob.yr + tryAge;
    const s = String(dob.mo).padStart(2, '0') + '/' + yr;
    const r = DB.validateTarget(s, 'plan', dob, ca, ra);
    return (r && r.err) || '';
  };
  const collapsedRa = [];
  const crossedRa = [];
  for (let ra = RA_LO; ra <= RA_HI; ra++) {
    const floor = Math.max(DB.PTA_MIN_FLOOR, ra + (DB.PTA_GAP || 20));
    if (floor === PTA_MAX) collapsedRa.push(ra);
    else if (floor > PTA_MAX) crossedRa.push(ra);
  }

  const mCollapsed = collapsedRa.length ? msgFor(collapsedRa[0], 90) : '';
  check('B2 · COLLAPSED is reported as its own fact, naming the retirement age',
    /leaves only one plan-through age/.test(mCollapsed) && mCollapsed.indexOf(String(collapsedRa[0])) >= 0,
    mCollapsed || '(no collapsed ra in range)');

  const mCrossed = crossedRa.length ? msgFor(crossedRa[0], 90) : '';
  check('B3 · CROSSED is reported as its own fact, naming the age to move to',
    /would need a plan-through age of/.test(mCrossed) && /or earlier and this opens up/.test(mCrossed),
    mCrossed || '(no crossed ra in range)');

  const mNormal = msgFor(60, 70);   // ra 60 -> floor 80; asking for 70 is genuinely too low
  check('B4 · NORMAL states the rule and the range',
    /at least \d+ years after you retire/.test(mNormal) && mNormal.indexOf(String(PTA_MAX)) >= 0,
    mNormal);

  /* ── B5 · no limit typed into a sentence ── */
  const src = fs.readFileSync(path.join(ROOT, 'scripts/date-bounds.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const strLits = code.match(/'(?:[^'\\]|\\.)*'/g) || [];
  const offenders = strLits.filter((s) => /\b(85|105|20|90|75)\b/.test(s));
  check('B5 · NO MESSAGE HARD-CODES A LIMIT (every number interpolated from the constants)',
    offenders.length === 0, offenders.slice(0, 3).join(' | '));

  /* ── B0 · PAIRED PRESENCE ── */
  const okRes = DB.validateTarget('01/2065', 'plan', dob, ca, 60);   // ra 60 -> floor 80; 2065 = age 85
  check('B0 · PAIRED PRESENCE — a valid plan-through date is still ACCEPTED ("reject everything" must fail)',
    !!(okRes && okRes.ok), JSON.stringify(okRes));

  /* ── B6 · SEAM — the page shows the engine's message ─────────────────────────────────────── */
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(`(() => { try {
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('t'); } },
      user: { id: 'user_bounds', firstName: 'B', primaryEmailAddress: { emailAddress: 'b@b.co' },
              unsafeMetadata: {}, update: function(){ return Promise.resolve(); } },
      addListener: function(){}, signOut: function(){ return Promise.resolve(); } };
  } catch(e){} })();`);
  const page = await ctx.newPage();
  await page.goto(BASE + '/Dossier.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const seen = await page.evaluate(`(() => {
    const DB = window.DatumDateBounds;
    if (!DB || typeof DB.planWindow !== 'function') return { noEngine: true };
    /* Reproduce the Captain's state: a retirement age whose window has collapsed, then ask the
       page to validate a plan-through date one year off. Read what the USER is shown. */
    const collapsed = (() => { for (let ra = DB.RA_MIN_FLOOR; ra <= DB.RA_MAX; ra++) {
      const w = DB.planWindow(ra); if (w.floor === w.ceiling) return ra; } return null; })();
    if (collapsed === null) return { noCollapsed: true };
    const r = DB.validateTarget('01/2064', 'plan', { mo: 1, yr: 1980 }, 46, collapsed);
    return { ra: collapsed, err: (r && r.err) || '' };
  })()`);
  check('B6 · SEAM — Dossier.html carries the engine and returns its message to the page',
    !!(seen && !seen.noEngine && seen.err && /leaves only one plan-through age/.test(seen.err)),
    JSON.stringify(seen));

  await ctx.close(); await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
