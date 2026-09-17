/* @gate-pool: browser */
'use strict';
/* _gate_unknown_refusal_code.js — THE PRE-DEPLOY GATE FOR A REFUSAL THE CLIENT HAS NEVER SEEN.
 *
 * THE CLAIM: the Studio renders any well-formed engine refusal, whatever its code, without
 * reporting it as a compute failure — so shipping a NEW refusal code is a copy decision, never a
 * client change.
 *
 * ⛔⛔ WHY THIS EXISTS. The engine's refusal codes keep growing — 18 of 51 jurisdictions refuse
 *    today, three of those codes are new, and `account_owner_has_no_person` was added on
 *    2026-09-17. The standing worry was that each new code would produce a BLANK REFUSAL AND A
 *    SENTRY ALERT, because the client had never seen it.
 * ⭐ MEASURED, AND THE WORRY IS NOT TRUE — WHICH IS EXACTLY WHY IT IS WORTH PINNING RATHER THAN
 *    ASSUMING. `_datumRenderEngineRefusal` never switches on `code`; it requires only that
 *    `detail` carries a `code` and a `condition`, and it renders the condition. So an unknown code
 *    already renders. THE GATE IS HERE TO KEEP IT THAT WAY: the obvious future "improvement" is a
 *    switch or a lookup table keyed by code, and the day somebody writes one, every code not in it
 *    goes blank. A property that holds by accident is one refactor from not holding.
 * 🔑 A GATE OVER A BEHAVIOUR THAT IS ALREADY CORRECT IS NOT A WASTED GATE. It is the difference
 *    between "it works" and "it cannot stop working without somebody being told".
 *
 * ⛔ L3 IS THE RED-FIRST LEG AND IT REMOVES THE CAPABILITY, NOT ONE ROUTE. §82.2428 — a payload
 *    missing `condition` must NOT render, because that is the shape that genuinely would put an
 *    empty panel on screen, and the renderer's guard is what stops it. Without L3, L1 and L2 would
 *    pass just as well against a function that rendered absolutely anything it was handed.
 *
 * ⚠️ WHAT THIS GATE DOES NOT CLAIM. It says nothing about whether the SENTENCE is fit to read. 18
 *    jurisdictions currently refuse with a literal `[COPY-OWED]` placeholder, and this gate would
 *    render those happily — correctly, because rendering them is the client behaving properly. The
 *    deploy blocker is that the sentence is not authored yet, and that is the Architect's, not the
 *    client's. L4 asserts the two are separable by checking that a placeholder reaches the screen
 *    INTACT rather than being silently swallowed: a marker nobody can see is a marker nobody removes.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8587;   /* highest declared gate port + 2; see _suite_baseline.mjs on collisions */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
               '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const blockClerk = (ctx) => ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
  return route.continue();
});

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

/* ⛔ THE POPULATION IS GENERATED, NOT NOMINATED. Codes the client has never seen, including the
   three new jurisdiction refusals, the one added with the owner repair, and two that do not exist
   at all — because the property under test is that the code is NOT CONSULTED, and a list of real
   codes cannot distinguish "handles every code" from "happens to know these codes". */
const UNKNOWN_CODES = [
  'state_shield_not_expressible',
  'state_local_surtax_not_modelled',
  'state_income_source_not_modelled',
  'state_conditional_unresolved',
  'account_owner_has_no_person',
  'a_code_that_will_exist_next_month',
  'ZZZ_not_a_real_code_at_all_9912',
];

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });

  const out = await page.evaluate((codes) => {
    const fn = window._datumRenderEngineRefusal;
    if (typeof fn !== 'function') return { missing: true };
    const read = () => {
      /* Whatever the refusal painter last wrote, read off the page rather than off a variable —
         a renderer that returns true and paints nothing is the failure this gate is for. */
      const el = document.querySelector('#reveal-status, #range-status, [data-reveal-status]')
              || document.body;
      return (el.textContent || '').replace(/\s+/g, ' ').trim();
    };
    const rows = codes.map((code) => {
      const sentence = 'CONDITION SENTINEL ' + code + ' ' + Math.random().toString(36).slice(2, 8);
      const returned = fn({ detail: { code: code, condition: sentence } });
      const painted = read().indexOf(sentence) !== -1;
      return { code: code, returned: !!returned, painted: painted };
    });
    /* L3 — the capability removed, not one route: no `condition` at all. */
    const noCondition = fn({ detail: { code: 'has_a_code_but_no_sentence' } });
    const noDetail = fn({ nothing: true });
    /* L4 — a [COPY-OWED] placeholder must arrive on screen INTACT. */
    const owed = '[COPY-OWED] this sentence is not authored yet ' + Math.random().toString(36).slice(2, 8);
    fn({ detail: { code: 'state_shield_not_expressible', condition: owed } });
    const owedVisible = read().indexOf('[COPY-OWED]') !== -1 && read().indexOf(owed) !== -1;
    return { rows, noCondition: !!noCondition, noDetail: !!noDetail, owedVisible };
  }, UNKNOWN_CODES);

  if (out.missing) {
    check('L0 · the refusal renderer is reachable as window._datumRenderEngineRefusal', false,
          'window._datumRenderEngineRefusal is not a function');
  } else {
    const rendered = out.rows.filter((r) => r.returned && r.painted);
    check('L1 · every unknown refusal code is RENDERED, sentence and all',
          rendered.length === UNKNOWN_CODES.length,
          rendered.length + ' of ' + UNKNOWN_CODES.length + ' rendered; failures: ' +
          JSON.stringify(out.rows.filter((r) => !(r.returned && r.painted))));
    check('L2 · every unknown code CLAIMS the response, so the caller does not report a fault',
          out.rows.every((r) => r.returned),
          JSON.stringify(out.rows.map((r) => r.code + '=' + r.returned)));
    check('L3 · a refusal with no sentence is REFUSED by the renderer, not painted blank',
          out.noCondition === false && out.noDetail === false,
          'no-condition=' + out.noCondition + ' no-detail=' + out.noDetail);
    check('L4 · a [COPY-OWED] placeholder reaches the screen intact and is not swallowed',
          out.owedVisible === true, String(out.owedVisible));
  }

  await browser.close(); server.close();
  console.log('\n_gate_unknown_refusal_code — a refusal code the client has never seen\n');
  results.forEach((r) => console.log('  ' + r));
  console.log('\n  ' + passes + ' passed, ' + fails + ' failed\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
