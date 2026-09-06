'use strict';
/* ⛔⛔ THE OPTION-AGREEMENT GATE — AN OPTION MUST PRODUCE THE NUMBER IT NAMES (§82.1871).
 *
 * WHY THIS EXISTS. Batch 1b shipped a tax dropdown whose flagship answer computed as its opposite,
 * and the 269-gate suite was silent. Measured 2026-09-06 through a browser, all seven options:
 *   · "Nothing at all"  (value "0%")    -> slider-tax took 22.   `parseFloat("0%")` is 0, `0 || 22`.
 *   · "I know my rate"  (value "exact") -> slider-tax took 22.   `parseFloat("exact")` is NaN.
 * slider-tax feeds out.taxMult, which multiplies the Shape's floor AND ceiling
 * (datum-shape.js:103-104). So the one answer 39% of measured households would truthfully give cut
 * their spending range by 22% — WORSE than not answering, because the cold default is 20.
 *
 * 🔑 WHY NOTHING CAUGHT IT: PERSISTENCE AND COMPUTATION ARE DIFFERENT CONSUMERS. Batch 1b's own
 *    gate proved the answer SURVIVES A RELOAD, and it does — perfectly. Nothing asked what the
 *    answer COMPUTES. A smoke that reloads proves the first and is silent on the second, and the
 *    two failures look identical on screen for exactly as long as nobody does arithmetic.
 *
 * ⭐ IT GATES THE RELATIONSHIP, NEVER THE CONSTANT. The expected number is parsed OUT OF THE
 *    OPTION'S OWN VALUE by this file's own regex — a different code path from the product's
 *    `parseFloat(...) || 22`. Add an option tomorrow and it joins this gate's claim by existing;
 *    change a band's number and the gate follows it. Nothing here spells 0, 2, 5, 9, 15 or 19.
 *
 * ⚠️ THE POPULATION LEG IS NOT CEREMONY. A predicate over an empty set is true: if the selector
 *    ever stops matching, every agreement leg below would pass by having nothing to judge. L1 makes
 *    the gate prove it found the options before it certifies them.
 *
 * LEGS
 *   L1 POPULATION  the select exists, carries >= 2 numeric options and the typed-entry option.
 *   L2 AGREEMENT   every numeric option drives slider-tax to the number its value names.
 *   L3 TYPED       "I know my rate" + a typed figure drives the slider to that figure.
 *   L4 UNSTATED    returning to the placeholder must NOT invent a number. An unanswered control
 *                  answers nothing; §82.1856 — a default answers FOR the user.
 *   L5 JUNK        the typed box refuses what is not a number, VISIBLY. Measured pre-fix: "abc" was
 *                  silently discarded at capture and "22abc" silently STORED 22 — told they were
 *                  heard, then not heard, and the inverse. Both are the fault this arc removes.
 *   L6 CONTROL     the rig observed the slider take more than one distinct value. Without this a
 *                  dead wire reads as agreement everywhere the expected number happened to match.
 *
 * RED-FIRST: run against the pre-fix bytes. Expect L2 red on the zero option ONLY, L3 red, L4 red,
 * L5 red, with the middle bands and L1/L6 green. That is the control and it needs no mutation flag
 * — the defect is in the tree until the fix lands.
 *
 * Run: node scripts/_gate_tax_option_agreement.js      (exit 0 = GREEN, 1 = RED, 2 = fault)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8236;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };
/* ── MUTATION CONTROL · --bluronly ────────────────────────────────────────────────────────────
   Removes ONLY the live rendering of the '%', leaving the live SANITISER intact, so the red set is
   the narrowest possible: L7a alone. A cruder mutation (deleting the whole oninput handler) would
   also red L5a/L5b/L5d, because sanitising and symbol-rendering share one function — and a control
   that reds four legs cannot tell you which one it proved.
   ⚠️ L7b IS EXPECTED TO STAY GREEN UNDER THIS CONTROL, and that is the point: focus is unchanged, so
      the discriminator correctly reports "still focused" while L7a reports the missing symbol. The
      two legs answer different questions and the control demonstrates it.
   ⛔ THIS READS studio.html OFF DISK ON PURPOSE AND DECLARES IT. It SERVES mutated bytes to a
      browser, which is the category-2 read named in _gate_studio_source's SERVING_EXEMPT — the
      composed studioSource() text would inline every part while the <script src> tags load them
      again. The literal is kept on the read line so the census can SEE it rather than passing
      unnoticed through a path-in-a-variable. */
const BLURONLY = process.argv.includes('--bluronly');
let SERVE_HTML = null;
if (BLURONLY) {
  SERVE_HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  const A = "      var out = s === '' ? '' : s + '%';";
  const n = SERVE_HTML.split(A).length - 1;
  if (n !== 1) { console.log('ABORT — --bluronly anchor matched ' + n + 'x, expected 1.'); process.exit(2); }
  SERVE_HTML = SERVE_HTML.replace(A, "      var out = s;   // --bluronly: symbol deferred to blur");
}

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (SERVE_HTML && p === '/studio.html') { s.writeHead(200, { 'content-type': MIME['.html'] }); return s.end(SERVE_HTML); }
  fs.readFile(path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, '')), (e, b) => {
    if (e) { s.writeHead(404).end(); return; }
    s.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }); s.end(b);
  });
});

let fails = 0; const out = [];
const ok = (label, cond, obs) => { const good = !!cond; if (!good) fails++;
  out.push((good ? 'PASS  ' : 'FAIL  ') + label + (obs !== undefined ? '   [' + obs + ']' : '')); };

/* The number an option NAMES, read from its value by this gate's own matcher. Returns null for the
   placeholder and for the typed-entry sentinel, which are not numeric answers. */
const namedPct = (v) => { const m = /^(\d+(?:\.\d+)?)%$/.exec(String(v)); return m ? parseFloat(m[1]) : null; };

const readSlider = (P) => P.evaluate(() => { const s = document.getElementById('slider-tax'); return s ? s.value : null; });

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1250 } });
  await c.addInitScript("window.Clerk={load:()=>Promise.resolve(),user:{unsafeMetadata:{}},addListener:()=>{}};");
  await c.route('**/*', r => { const u = r.request().url();
    if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/127\.0\.0\.1/.test(u) && /clerk|posthog|sentry/i.test(u)) return r.abort();
    return r.continue(); });
  const P = await c.newPage();
  await P.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await P.waitForTimeout(1700);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1200 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(800);

  /* ── L1 POPULATION ─────────────────────────────────────────────────────────────────────────── */
  const opts = await P.evaluate(() => { const s = document.getElementById('eff-tax-rate');
    return s ? Array.prototype.map.call(s.options, o => ({ value: o.value, label: o.text })) : null; });
  ok('L1a the rate select exists and carries options', !!opts && opts.length > 0,
     opts ? opts.length + ' options' : 'SELECT ABSENT');
  if (!opts) { console.log(out.join('\n')); console.log('\nOVERALL: RED   (0 pass / 1 fail)'); await b.close(); srv.close(); process.exit(1); }
  const numeric = opts.filter(o => namedPct(o.value) !== null);
  const hasExact = opts.some(o => o.value === 'exact');
  ok('L1b at least two options NAME a number (a predicate over an empty set is true)',
     numeric.length >= 2, numeric.length + ' numeric: ' + numeric.map(o => o.value).join(' '));
  ok('L1c the typed-entry option exists', hasExact, hasExact ? 'exact present' : 'no "exact" option');

  /* ── L2 AGREEMENT ──────────────────────────────────────────────────────────────────────────── */
  const seen = [];
  for (const o of numeric) {
    const want = namedPct(o.value);
    await P.selectOption('#eff-tax-rate', o.value);
    await P.waitForTimeout(320);
    const got = await readSlider(P);
    seen.push(got);
    ok('L2 "' + o.label + '" (' + o.value + ') drives the tax slider to ' + want,
       Number(got) === Math.round(want), 'slider=' + got + ' want=' + Math.round(want));
  }

  /* ── L3 TYPED ──────────────────────────────────────────────────────────────────────────────── */
  if (hasExact) {
    await P.selectOption('#eff-tax-rate', 'exact');
    await P.waitForTimeout(260);
    await P.fill('#eff-tax-rate-exact', '14.2');
    await P.waitForTimeout(360);
    const got = await readSlider(P);
    seen.push(got);
    ok('L3 "I know my rate" + typed 14.2 drives the tax slider to 14',
       Number(got) === 14, 'slider=' + got + ' want=14');
  }

  /* ── L4 UNSTATED ───────────────────────────────────────────────────────────────────────────── */
/* ⚠️ THE SETUP BAND IS THE LAST NUMERIC ONE, NOT THE FIRST, AND THIS GATE'S OWN FIRST RUN IS WHY.
   L4 originally seeded with numeric[0] — the 0% band — which is precisely the option the defect
   breaks. Pre-fix it drove the slider to 22, the placeholder then also produced 22, and
   "unchanged" was TRIVIALLY TRUE: the leg PASSED on bytes that contained the bug it exists to
   catch. A FIXTURE THAT SEEDS ITSELF THROUGH THE BROKEN PATH MEASURES THE BUG WITH THE BUG.
   L4a is the repair's other half: the setup must PROVE IT TOOK before the comparison means
   anything, or a seed that silently failed would leave two equal readings and pass again. */
  const seedBand = numeric[numeric.length - 1];
  await P.selectOption('#eff-tax-rate', seedBand.value);
  await P.waitForTimeout(300);
  const before = await readSlider(P);
  ok('L4a SETUP — seeding with "' + seedBand.label + '" (' + seedBand.value + ') actually took',
     Number(before) === Math.round(namedPct(seedBand.value)),
     'slider=' + before + ' want=' + Math.round(namedPct(seedBand.value)));
  await P.selectOption('#eff-tax-rate', '');
  await P.waitForTimeout(340);
  const after = await readSlider(P);
  ok('L4b returning to the placeholder invents NO number (an unanswered control answers nothing)',
     after === before, 'before=' + before + ' after=' + after);

  /* ── L5 JUNK ───────────────────────────────────────────────────────────────────────────────── */
  if (hasExact) {
    await P.selectOption('#eff-tax-rate', 'exact');
    await P.waitForTimeout(240);
    const probe = async (typed) => { await P.fill('#eff-tax-rate-exact', typed); await P.waitForTimeout(300);
      return P.evaluate(() => (document.getElementById('eff-tax-rate-exact') || {}).value); };
    const junk = await probe('abc');
    ok('L5a letters are refused visibly, not swallowed silently', /^$/.test(String(junk)),
       'typed "abc" -> box holds "' + junk + '"');
    const twoDots = await probe('1.2.3');
    ok('L5b a second decimal point is refused', /^\d*(\.\d*)?%?$/.test(String(twoDots)),
       'typed "1.2.3" -> box holds "' + twoDots + '"');
    const tooBig = await probe('999');
    const tb = parseFloat(String(tooBig).replace('%', ''));
    ok('L5c a rate of 100% or more is refused', !(isFinite(tb) && tb >= 100),
       'typed "999" -> box holds "' + tooBig + '"');
    const mixed = await probe('22abc');
    ok('L5d "22abc" does not silently become 22 behind the user\'s back — the box SHOWS what it kept',
       /^\d*(\.\d*)?%?$/.test(String(mixed)), 'typed "22abc" -> box holds "' + mixed + '"');
  }

  /* ── L7 LIVE FORMAT ────────────────────────────────────────────────────────────────────────────
     THE USER NEVER TYPES THE SYMBOL, and they see it the moment they type — parity with salary,
     which renders "$60,000" while you type rather than when you leave.
     ⚠️ THIS LEG MUST DISTINGUISH LIVE FROM BLUR OR IT PROVES NOTHING. A blur-only formatter would
        produce the SAME final value, so reading the value alone cannot tell the two apart. L7b
        asserts the field is STILL FOCUSED at the moment the % is observed: formatting that has
        already happened while focus remains can only have happened on input. */
  if (hasExact) {
    await P.selectOption('#eff-tax-rate', 'exact');
    await P.waitForTimeout(240);
    await P.fill('#eff-tax-rate-exact', '14');
    await P.waitForTimeout(300);
    const live = await P.evaluate(() => {
      const el = document.getElementById('eff-tax-rate-exact');
      return { value: el ? el.value : null,
               focused: !!(document.activeElement && document.activeElement.id === 'eff-tax-rate-exact') };
    });
    ok('L7a typing 14 shows "14%" immediately — the field supplies the symbol',
       live.value === '14%', 'box holds "' + live.value + '"');
    ok('L7b DISCRIMINATOR — the field is still FOCUSED, so that % came from input, not from blur',
       live.focused === true, 'focused=' + live.focused);
  }

  /* ── L6 CONTROL ────────────────────────────────────────────────────────────────────────────── */
  const distinct = [...new Set(seen)];
  ok('L6 CONTROL — the rig observed the slider take more than one value (a dead wire cannot pass)',
     distinct.length > 1, distinct.length + ' distinct: {' + distinct.join(', ') + '}');

  console.log(out.join('\n'));
  console.log('\nMODE: clean');
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
