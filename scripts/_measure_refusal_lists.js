/* @gate-pool: browser */
'use strict';
/* _measure_refusal_lists.js — WHAT DOES EACH DOOR ACTUALLY REFUSE ON?
 *
 * A MEASUREMENT, NOT A GATE. It prints; it does not judge. The Architect will not author a list of
 * required fields from memory, and he is right not to: a guessed list is exactly the error that
 * produced "3 fields" becoming 6, 9, 27, 78, 91 — the same mistake in copy form.
 *
 * METHOD: start from an empty Studio and ask each door repeatedly, answering ONE refusal per round
 * using the product's own `target` element id, until it stops refusing. The sequence of refusals IS
 * the required list, DERIVED FROM THE PRODUCT rather than from anyone's memory.
 *   ⛔ IT DOES NOT READ THE SOURCE. A census of `throw` sites would find what a developer wrote, not
 *      what a user MEETS — and the Captain met seven refusals in a row, which is a property of the
 *      ORDER and the SHORT-CIRCUIT, not of the call sites.
 *
 * ⚠️ WHY ONE AT A TIME, WHICH IS ALSO THE DEFECT BEING MEASURED: both builders stop at the first
 *    missing fact, so the only way to discover the second is to satisfy the first. That is the maze
 *    the collected refusal will replace — and until it lands, this walk is the only way to see the
 *    whole list at once.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8233;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

/* Plausible answers, keyed by the control the product points at. Values are shapes, not facts —
   this measures WHICH doors open, never what a good answer looks like. */
const ANSWERS = {
  'pri-dob': '03 / 1974', 'target-ret': '07 / 2042', 'co-dob': '11 / 1976', 'co-ret': '05 / 2044',
  'spend-input': '$100,000', 'plan-through': '93',
  'ss-pri-62': '1,800', 'ss-pri-67': '2,400', 'ss-pri-70': '3,000',
  'ss-sec-62': '1,500', 'ss-sec-67': '2,000', 'ss-sec-70': '2,600',
  'hc-monthly': '1,150', 'pri-location': 'Alabama', 'filing-status': 'Single / Individual'
};

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(700);

  /* ⛔⛔ NOTHING IS PRE-SEEDED, AND THE FIRST VERSION OF THIS FILE GOT THAT WRONG IN THE MOST
     INSTRUCTIVE WAY AVAILABLE. It added an account with a balance BEFORE walking, under a comment
     calling it "the one precondition that is not a form field" — and then reported a required list
     that did not contain it. THE FIXTURE ANSWERED A REQUIREMENT AND THE MEASUREMENT THEN DENIED
     THE REQUIREMENT EXISTED. Captain-caught immediately.
     🔑 A FIXTURE THAT SATISFIES A PRECONDITION CANNOT MEASURE IT. Every seeded value is a question
        the instrument has decided not to ask, and a list of what a door demands is worthless if
        the measurer quietly paid one of the demands first. */

  const walk = async (builderName) => {
    const seen = [];
    for (let round = 0; round < 20; round++) {
      const r = await page.evaluate((bn) => {
        const fn = window[bn];
        if (typeof fn !== 'function') return { missing: true };
        window._buildRequestErrors = [];
        let body = null;
        try { body = fn(); } catch (e) { /* a throw is itself a refusal */ }
        const errs = (window._buildRequestErrors || []).map((e) => ({
          m: String(e.message || e), t: e.target || null
        }));
        return { built: !!body, errs };
      }, builderName);

      if (r.missing) return { builder: builderName, unavailable: true, seen };
      if (r.built && !r.errs.length) return { builder: builderName, seen, rounds: round };
      if (!r.errs.length) return { builder: builderName, seen, rounds: round, silent: true };

      for (const e of r.errs) if (!seen.some((s) => s.t === e.t && s.m === e.m)) seen.push(e);

      const next = r.errs.find((e) => e.t && ANSWERS[e.t]);
      if (!next) return { builder: builderName, seen, rounds: round, stuck: r.errs };
      await page.evaluate((a) => {
        const el = document.getElementById(a[0]); if (!el) return;
        if (el.tagName === 'SELECT') {
          for (const o of el.options) if (o.textContent.trim() === a[1]) { el.value = o.value; break; }
        } else { el.focus(); el.value = a[1]; }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }, [next.t, ANSWERS[next.t]]);
      await page.waitForTimeout(120);
    }
    return { builder: builderName, seen, rounds: 20, exhausted: true };
  };

  const range = await walk('_buildStudioRequest');
  const matrix = await walk('buildMatrixRequest');

  const show = (r, label) => {
    console.log('\n=== ' + label + '  (' + r.builder + ') ===');
    if (r.unavailable) { console.log('  NOT REACHABLE as a global — cannot be measured this way.'); return; }
    console.log('  refusals met, in the order a user meets them: ' + r.seen.length);
    r.seen.forEach((e, i) => console.log('   ' + String(i + 1).padStart(2) + '. [' + (e.t || '—') + ']  ' + e.m.slice(0, 96)));
    if (r.stuck) console.log('  ⛔ STUCK — no answer known for: ' + r.stuck.map((e) => e.t).join(', '));
    if (r.exhausted) console.log('  ⛔ DID NOT CONVERGE in 20 rounds.');
    if (!r.stuck && !r.exhausted) console.log('  ✅ door opened after ' + r.rounds + ' rounds.');
  };

  show(range, 'REVEAL RANGE');
  show(matrix, 'SS MATRIX');

  /* ⛔⛔ THE SECOND LIST IS THE ONE THAT MATTERS, AND IT IS THE ONE A REFUSAL WALK CANNOT SEE.
     A door only refuses on a field that has NO default. Every field carrying one passes silently —
     so the refusal list measures what the client HAPPENS TO DEMAND, never what the answer actually
     depends on. plan_end_age defaults to 93; datum_spend falls back to 100,000; market_outlook to
     valuations_matter. NONE of them refuse, ALL of them move the answer.
     🔑 THE GAP BETWEEN THESE TWO LISTS IS THE WHOLE DE-PERSONALISATION ARC, MEASURED. A field that
        changes the answer and does not gate the door is a decision made FOR the user, which is the
        defect in its final hiding place. */
  const silent = await page.evaluate(() => {
    const body = window._buildStudioRequest();
    if (!body) return { failed: true };
    const answered = (window.__mcAnswered || []);
    const out = {};
    Object.keys(body).forEach((k) => { out[k] = body[k]; });
    return { keys: Object.keys(body), accounts: (body.accounts || []).length, body: out };
  });

  console.log('\n=== WHAT REACHES THE ENGINE ONCE THE DOOR OPENS ===');
  if (silent.failed) { console.log('  the door did not open — nothing to inspect'); }
  else {
    const asked = new Set(range.seen.map((e) => e.t));
    /* Map the request keys back to the controls a user would have answered. */
    const FROM_CONTROL = {
      current_age: 'pri-dob', retirement_age: 'target-ret', location: 'pri-location',
      filing_status: 'filing-status', ss_primary_benefit_overrides: 'ss-pri-67',
      accounts: '(an account with a balance)'
    };
    console.log('  keys sent: ' + silent.keys.length + ' · accounts carried: ' + silent.accounts);
    console.log('');
    console.log('  ASKED FOR (the door refused until it was answered):');
    silent.keys.filter((k) => asked.has(FROM_CONTROL[k])).forEach((k) => console.log('    · ' + k));
    console.log('');
    console.log('  ⛔ SENT WITHOUT ANYONE BEING ASKED (no refusal guards these):');
    silent.keys.filter((k) => !asked.has(FROM_CONTROL[k])).forEach((k) => {
      const v = silent.body[k];
      const shown = (v && typeof v === 'object') ? '[' + (Array.isArray(v) ? v.length + ' items' : 'object') + ']' : String(v);
      console.log('    · ' + k.padEnd(30) + ' = ' + shown.slice(0, 40));
    });
    console.log('');
    console.log('  ⚠️ AND WHAT THE ENGINE REQUIRES BUT NO CLIENT DOOR ASKS FOR:');
    ['healthcare_annual', 'pension_cola'].forEach((k) => {
      console.log('    · ' + k.padEnd(30) + (silent.keys.includes(k)
        ? '= sent (a control exists and was filled)'
        : '= ABSENT — the engine will refuse this payload with a 422'));
    });
  }

  const a = new Set(range.seen.map((e) => e.t));
  const b = new Set(matrix.seen.map((e) => e.t));
  const onlyA = [...a].filter((x) => !b.has(x));
  const onlyB = [...b].filter((x) => !a.has(x));
  console.log('\n=== THE COMPARISON THE ARCHITECT ASKED FOR ===');
  console.log('  Range requires : ' + [...a].join(', '));
  console.log('  Matrix requires: ' + [...b].join(', '));
  console.log('  IDENTICAL? ' + (onlyA.length === 0 && onlyB.length === 0 ? 'YES — one collected block serves both'
    : 'NO'));
  if (onlyA.length) console.log('  only Range  : ' + onlyA.join(', '));
  if (onlyB.length) console.log('  only Matrix : ' + onlyB.join(', '));
  console.log('\n⚠️ A DIFFERENCE THAT CANNOT BE EXPLAINED IN ONE SENTENCE TO A NON-CODER IS A DEFECT,');
  console.log('   NOT A DESIGN. "The code happens to check it" is not an explanation.');

  await ctx.close(); await browser.close(); server.close();
})().catch((e) => { console.error('MEASURE FAIL', e); try { server.close(); } catch (_e) {} process.exit(1); });
