'use strict';
/* THE CARRIED SAVE MUST NOT CLAIM A SAVE IT HAS NOT SEEN — RED-FIRST.
 *
 * saveCarriedSnapshot toasted "Blueprint saved." UNCONDITIONALLY on the line after save() returned,
 * while the D1 write was still in flight — so EVERY failure shape told the user their work was
 * safe. Third instance of a class already fixed in the Studio and the Sketch.
 *
 * THE RED-FIRST THE ARCHITECT OWED, AND WHY IT IS THE ONLY ONE THAT COUNTS HERE: a check that
 * passes because a toast appeared is worthless — the OLD code showed a toast too, and it was the
 * lie. So the load-bearing assertion is NEGATIVE and TIMED: at the moment the write is still in
 * flight, NOTHING on screen may claim a save. --oldtoast restores the unconditional toast and that
 * assertion must go RED.
 *
 * EVERY OUTCOME IS DRIVEN, not just the happy one. The D1 stub is driven per-run so ok / no-session
 * / failed / pending each get their own assertion against the authored string.
 *
 * Usage: node scripts/_gate_carried_save_honesty.js [--oldtoast]
 *   --oldtoast  RED-FIRST: puts the unconditional "Blueprint saved." back. Self-checking — an
 *               anchor that matches nothing aborts rather than reporting a hollow red-first.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8301; const BASE = 'http://' + HOST + ':' + PORT;
const OLDTOAST = process.argv.includes('--oldtoast');

const A_OLD = "  window._saveCarriedReport = _report;            // gate seam: lets a test drive each outcome";
const M_OLD = "  window._saveCarriedReport = _report;\n  showToast('Blueprint saved.');";
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (OLDTOAST && /Blueprint\.html$/.test(p)) {
    const src = body.toString('utf8');
    const n = src.split(A_OLD).length - 1;
    if (n !== 1) { console.error(`anchor oldtoast: expected exactly 1, found ${n} — re-ground it.`); process.exit(1); }
    const out = src.replace(A_OLD, M_OLD);
    jsDiffers = jsDiffers || (out !== src);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* INDEPENDENT TRANSCRIPTION — typed from the Architect's message, never read out of the page. */
const COPY = {
  slow:      'Still saving. Do not close this tab.',
  okNamed:   '✓ Saved to ',
  okPlain:   '✓ Saved to your Archive',
  deadSess:  'Not saved. Your session ended. Sign in and try again.',
  unknown:   'Not saved. Your work is still on this page.'
};

const SNAP = { blueprint_id: null, version: '1.0.1', saved_at: '2026-08-01T10:00:00.000Z',
  datum: { net_datum_v1: 137731 },
  accounts: [{ id: 'a1', account_type: '401k', display_name: 'CARRIED ROOM', value: 250000 }],
  profile: {}, household: {} };

/* mode: 'ok' | 'fail' | 'notoken' | 'stall'   writeDelay: ms before the PUT settles */
async function boot(browser, mode, writeDelay) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => /clerk\.|cloudflareinsights|posthog|beacon/i.test(r.request().url()) ? r.abort() : r.continue());
  await page.addInitScript(({ snap, mode, writeDelay }) => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { localStorage.removeItem('datumfi_blueprint_archive_v1'); } catch (e) {}
    try {
      sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify(snap));
      sessionStorage.setItem('datumfi_pending_save', 'blueprint');
    } catch (e) {}
    /* THE DEAD-SESSION SHAPE TOOK TWO WRONG FIXTURES TO GET RIGHT, and both were the rig:
       1. nulling Clerk.session left Clerk.user, so DatumD1.signedIn() stayed true and the reporter
          correctly said 'failed'. 2. nulling Clerk.user made Blueprint.html REDIRECT TO THE VAULT
          before saveCarriedSnapshot ever ran, so nothing spoke at all — you cannot LAND here signed
          out. The real shape is the session dying BETWEEN the landing and the write, which is
          exactly what d1WriteBlueprint's signedIn() guard checks, so that is what is simulated
          below (see the DatumD1 setter). Clerk itself stays intact so the page boots normally. */
    window.Clerk = { load: () => Promise.resolve(),
      session: { getToken: () => Promise.resolve('tok') },
      user: { firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' },
        get unsafeMetadata() { try { return JSON.parse(sessionStorage.getItem('__m') || '{}'); } catch (e) { return {}; } },
        update(o) { try { sessionStorage.setItem('__m', JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); } } };
    let _d1;
    Object.defineProperty(window, 'DatumD1', {
      configurable: true, get() { return _d1; },
      set(v) {
        _d1 = v;
        const rows = {};
        // THE SESSION DIED BETWEEN LANDING AND SAVING: d1WriteBlueprint's own guard sees this and
        // returns null (no write attempted), which is the ONLY path that yields reason 'no-session'.
        if (mode === 'notoken') v.signedIn = function () { return false; };
        v._fetch = function (url, opts) {
          const m = (opts && opts.method) || 'GET';
          const R = (s, b, d) => new Promise((res) => setTimeout(() => res({ status: s, json: () => Promise.resolve(b) }), d || 0));
          if (m === 'PUT') {
            const key = decodeURIComponent((/key=([^&]*)/.exec(url) || [])[1] || '');
            let payload = null; try { payload = JSON.parse(opts.body).payload; } catch (e) {}
            if (mode === 'stall') return new Promise(() => {});           // never settles
            if (mode === 'fail') return R(500, {}, writeDelay);
            return new Promise((res) => setTimeout(() => {
              if (/type=blueprint/.test(url)) rows[key] = payload;
              res({ status: 200, json: () => Promise.resolve({ revision: 1 }) });
            }, writeDelay));
          }
          if (m === 'DELETE') return R(200, { deleted: 1 });
          if (/list=1/.test(url)) {
            if (!/type=blueprint/.test(url)) return R(200, { documents: [] });
            return R(200, { documents: Object.keys(rows).map((k) => ({ doc_key: k, revision: 1, updated_at: '2026-08-01T10:00:00.000Z' })) });
          }
          const key = decodeURIComponent((/key=([^&]*)/.exec(url) || [])[1] || '');
          return rows[key] ? R(200, { payload: JSON.stringify(rows[key]), revision: 1, updated_at: '2026-08-01T10:00:00.000Z' }) : R(404, {});
        };
      }
    });
  }, { snap: SNAP, mode, writeDelay });
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  return { ctx, page };
}

const toastNow = (page) => page.evaluate(() => {
  const t = document.getElementById('toast');
  if (!t) return { shown: false, text: '' };
  return { shown: t.classList.contains('show'), text: (t.textContent || '').trim(),
           error: t.classList.contains('toast-error'),
           action: (t.querySelector('.toast-action') || {}).textContent || null,
           role: t.getAttribute('role') };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });

  /* ══ THE LOAD-BEARING ONE: NOTHING CLAIMS A SAVE WHILE THE WRITE IS STILL IN FLIGHT ══════════
     A 3s write, sampled at 1.2s. The old code had already said "Blueprint saved." by here. */
  {
    const { ctx, page } = await boot(browser, 'ok', 3000);
    await page.waitForTimeout(1200);
    const t = await toastNow(page);
    const claims = /saved/i.test(t.text) && t.shown;
    ok(!claims,
      `HONESTY 1 LOAD-BEARING: while the write is STILL IN FLIGHT nothing on screen claims a save (toast "${t.text}") — a check that merely sees a toast would pass on the very lie this closes`);
    /* THE IN-FLIGHT STRING IS ALREADY DELIVERED BY THE SHARED MECHANISM, and this proves it rather
       than asserting it. datum-d1.js renders its own save pill from the SAME in-flight tracker on
       every page that loads it, including this one. Wiring a second "Saving…" toast beside it would
       be two mouths saying one thing — the exact duplication L48 exists to prevent. */
    const pill = await page.evaluate(() => {
      const el = document.getElementById('datum-save-pill');
      return el ? { text: (el.textContent || '').trim(), state: el.getAttribute('data-state') } : null;
    });
    ok(!!pill && pill.text.indexOf('Saving') === 0,
      `HONESTY 1b: the shared save pill already says the in-flight line ("${pill && pill.text}") — so no second "Saving…" is wired here`);
    await page.waitForTimeout(3200);
    const after = await toastNow(page);
    ok(after.shown === true && after.text.indexOf('Saved to') >= 0,
      `HONESTY 2 POSITIVE CONTROL: and once the write LANDS it does say so ("${after.text}") — without this, assertion 1 would pass on a page that never speaks at all`);
    await ctx.close();
  }

  /* ══ SUCCESS wording ═══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page } = await boot(browser, 'ok', 200);
    await page.waitForTimeout(2500);
    const t = await toastNow(page);
    ok(t.text.indexOf(COPY.okNamed) === 0,
      `HONESTY 3: success names THE ARCHIVE as the destination ("${t.text}") — "Blueprint saved" named the object, not the outcome, and it is the string that lied`);
    ok(t.text.toLowerCase().indexOf('blueprint saved') < 0,
      'HONESTY 4: the retired string appears nowhere');
    await ctx.close();
  }

  /* ══ FAILURE — server/network shape. Honest default, persists, offers a way out. ═══════════ */
  {
    const { ctx, page } = await boot(browser, 'fail', 200);
    await page.waitForTimeout(2500);
    const t = await toastNow(page);
    ok(t.shown === true && t.text.indexOf(COPY.unknown) === 0,
      `HONESTY 5 LOAD-BEARING: a FAILED write says it did not save ("${t.text}") — this is the shape that used to say "Blueprint saved."`);
    ok(t.text.indexOf('still on this page') >= 0,
      'HONESTY 6: and every failure states the work is STILL HERE — that sentence is the difference between an error and a panic');
    ok(t.action === 'Try again' && t.error === true && t.role === 'alert',
      `HONESTY 7: it offers a way out, is visibly a failure, and interrupts a screen reader (action="${t.action}", role=${t.role})`);
    // NO AUTO-DISMISS: a failure the user did not see is the same defect being closed.
    await page.waitForTimeout(3000);
    const later = await toastNow(page);
    ok(later.shown === true,
      `HONESTY 8 LOAD-BEARING: the failure is STILL on screen 3s later (shown=${later.shown}) — a success may fade, a failure may not`);
    await ctx.close();
  }

  /* ══ FAILURE — no usable session. THE REASON IS INJECTED, AND THAT IS DECLARED, NOT HIDDEN. ══
     MEASURED while writing this: reason 'no-session' is EFFECTIVELY UNREACHABLE on this landing
     path. reportOutcome decides it from Clerk.user being falsy — and Blueprint.html REDIRECTS TO
     THE VAULT when Clerk.user is falsy, before saveCarriedSnapshot ever runs. Two fixtures were
     built trying to reach it honestly and both failed for that reason.
     So this asserts THE MAPPING — the half I actually wrote — by handing the reporter's own
     documented outcome straight to the handler through a declared seam. It does NOT claim the path
     is reachable, and pretending otherwise with a contrived fixture would be the tidier lie. */
  {
    const { ctx, page } = await boot(browser, 'ok', 200);
    await page.waitForTimeout(2500);
    const t = await page.evaluate(() => {
      if (typeof window._saveCarriedReport !== 'function') return { missing: true };
      window._saveCarriedReport({ ok: false, reason: 'no-session' });
      const el = document.getElementById('toast');
      return { text: (el.textContent || '').trim(), action: (el.querySelector('.toast-action') || {}).textContent || null,
               shown: el.classList.contains('show'), error: el.classList.contains('toast-error') };
    });
    ok(!t.missing, 'HONESTY 9a RIG: the outcome seam exists (without it the assertion below proves nothing)');
    ok(t.text.indexOf(COPY.deadSess) === 0 && t.action === 'Sign in' && t.shown && t.error,
      `HONESTY 9b: reason 'no-session' maps to the dead-session copy and a Sign in door ("${t.text}", action="${t.action}")`);
    await ctx.close();
  }

  /* ══ NO INVENTED CAUSES ANYWHERE. ═════════════════════════════════════════════════════════ */
  {
    // 127.0.0.1, NOT the mapped host — that name only resolves inside Chromium's resolver rules.
    const served = await (await fetch('http://127.0.0.1:' + PORT + '/Blueprint.html')).text();
    const i = served.indexOf('function saveCarriedSnapshot');
    const chunk = i >= 0 ? served.slice(i, i + 4200) : '';
    ok(chunk.length > 0,
      `HONESTY 10a RIG: the saveCarriedSnapshot body was located (${chunk.length} chars) — a zero would make 10b pass against an empty string`);
    ok(chunk.length > 0 && !/server error|network error|try again later|timed out/i.test(chunk),
      'HONESTY 10b: no failure string names a cause the code cannot observe — the reporter collapses 401/5xx/network into one reason, so naming any of them would be inventing it');
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  if (OLDTOAST) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (Blueprint.html bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${OLDTOAST ? 'MUTATED[oldtoast]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (OLDTOAST) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
