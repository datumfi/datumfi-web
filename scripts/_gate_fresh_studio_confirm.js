'use strict';
/* 5b · ASK BEFORE CLEARING THE BOARD — RED-FIRST.
 *
 * /studio.html?fresh=1 REPLACES an in-progress Studio draft AT LOAD (measured 2026-08-01). That
 * discard is INTENDED by Captain's ruling and is not changed; this gate asserts only that the user
 * is ASKED first, and only when there is something to lose.
 *
 * THE POINT OF THIS GATE IS THE SECOND DOOR. Two routes reach ?fresh=1 — the empty card, and
 * "Open Studio" with nothing selected. Guarding one and not the other produces a protection the
 * user BELIEVES in and only half has, which is worse than no protection. Every assertion below
 * therefore runs against BOTH doors, driven by the real controls.
 *
 * SILENCE IS ASSERTED AS HARD AS THE DIALOG IS. A confirm that fires when nothing is at risk is
 * the cry-wolf failure this project has already shipped once this week; it gets one chance to be
 * believed. So: unsaved work -> ask; nothing built -> silent; saved and untouched -> silent.
 *
 * Usage: node scripts/_gate_fresh_studio_confirm.js [--noguard] [--onedoor]
 *   --noguard  RED-FIRST: both doors navigate straight to ?fresh=1 with no confirm.
 *   --onedoor  RED-FIRST: guards ONLY the empty card, leaving "Open Studio" unguarded — the exact
 *              half-guard this gate exists to prevent. The card assertions stay GREEN, which is
 *              the point: a suite that only checked one door would not have noticed.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8296; const BASE = 'http://' + HOST + ':' + PORT;
const NOGUARD = process.argv.includes('--noguard');
const ONEDOOR = process.argv.includes('--onedoor');

const A_GUARD = "    _confirmFreshStudio();\n  }\n});";
const A_DOOR2 = "    // 5b — THE SECOND DOOR. Same discard, same guard. Guarding only the empty card would have left\n    // this one wide open while the protection was believed to cover both.\n    _confirmFreshStudio();";
const M_DOOR2 = "    _goFreshStudio();";
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((NOGUARD || ONEDOOR) && /Blueprint\.html$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOGUARD) { src = src.split('_confirmFreshStudio();').join('_goFreshStudio();'); }
    if (ONEDOOR) apply(A_DOOR2, M_DOOR2, 'onedoor');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

/* THE COPY, TRANSCRIBED INDEPENDENTLY from the Architect's message — never read out of the page,
   so the assertion sits between two transcriptions instead of comparing the source to itself. */
const COPY = {
  title:   'Start a new blueprint?',
  body:    'The blueprint open now has changes that have not been saved. Starting a new one clears the board, and those changes are gone.',
  confirm: 'Start new anyway',
  cancel:  'Keep this blueprint'
};

const draft = (kind) => {
  if (kind === 'none') return null;
  const base = { blueprint_id: 'bp-1', version: '1.0.1',
    datum: { net_datum_v1: 137731 },
    accounts: [{ id: 'a1', account_type: '401k', display_name: 'GATE ROOM', value: 250000 }],
    profile: {}, household: {} };
  if (kind === 'dirty-neversaved') return Object.assign(base, { _draftAt: new Date().toISOString() });
  if (kind === 'dirty-saved') return Object.assign(base, {
    saved_at: new Date(Date.now() - 60000).toISOString(), _draftAt: new Date().toISOString() });
  if (kind === 'clean-saved') { const t = new Date(Date.now() - 60000).toISOString();
    return Object.assign(base, { saved_at: t, _draftAt: t }); }
  return null;
};

async function boot(browser, kind) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => /clerk\.|cloudflareinsights|posthog|beacon/i.test(r.request().url()) ? r.abort() : r.continue());
  await page.addInitScript((d) => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { localStorage.removeItem('datumfi_blueprint_archive_v1'); } catch (e) {}
    if (d) { try { localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(d)); } catch (e) {} }
    else { try { localStorage.removeItem('datumfi_blueprint_draft_v1'); } catch (e) {} }
  }, draft(kind));
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  /* REVEAL THE BODY, because the harness aborts Clerk and revealBody() therefore never runs.
     Blueprint.html ships body{visibility:hidden} until the session is confirmed — and focus() is
     SILENTLY DROPPED inside a visibility:hidden subtree, which made the focus assertion fail
     against correct product code. A real signed-in user always has a visible body, so NOT doing
     this would be testing a state no user is ever in. Declared rather than done quietly. */
  await page.evaluate(() => { document.body.style.visibility = 'visible'; });
  return { ctx, page };
}

/* Drive the REAL controls. Door A = an empty archive card. Door B = the "Open Studio" button with
   nothing selected. Returns what the page did, WITHOUT relying on the navigation completing. */
async function press(page, door) {
  return page.evaluate((d) => {
    window.__went = null;
    // capture the navigation instead of performing it, so the harness can read the outcome
    try { Object.defineProperty(window, '__navGuard', { value: 1, configurable: true }); } catch (e) {}
    window._goFreshStudio = function () { window.__went = '/studio.html?fresh=1'; };
    if (d === 'card') {
      const tile = Array.from(document.querySelectorAll('.blueprint-slot'))
        .find((t) => !t.classList.contains('has-blueprint') && !t.classList.contains('cannot-load'));
      if (!tile) return { pressed: false, why: 'no empty card rendered' };
      tile.click();
    } else {
      const b = document.getElementById('action-open-studio');
      if (!b) return { pressed: false, why: 'no Open Studio button' };
      b.click();
    }
    return { pressed: true };
  }, door);
}

const modalState = (page) => page.evaluate((c) => {
  const m = document.getElementById('fresh-confirm-modal');
  const open = !!(m && m.classList.contains('open'));
  return {
    open,
    went: window.__went,
    title: m ? (m.querySelector('h2') || {}).textContent : null,
    body: m ? (m.querySelector('p') || {}).textContent : null,
    confirm: m ? (document.getElementById('action-confirm-fresh') || {}).textContent : null,
    cancel: m ? (document.getElementById('action-cancel-fresh') || {}).textContent : null,
    focused: document.activeElement ? document.activeElement.id : null
  };
}, COPY);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });

  /* ── POSITIVE CONTROL: the rig can actually press both doors. ────────────────────────────── */
  {
    const { ctx, page } = await boot(browser, 'dirty-neversaved');
    for (const door of ['card', 'openStudio']) {
      const r = await press(page, door);
      ok(r.pressed === true, `5b 0 POSITIVE CONTROL [${door}]: the real control was found and pressed (${r.why || 'ok'}) — every silence below is the rig without this`);
      await page.evaluate(() => { const m = document.getElementById('fresh-confirm-modal'); if (m) m.classList.remove('open'); });
    }
    await ctx.close();
  }

  /* ── UNSAVED WORK -> BOTH DOORS ASK, and nothing navigates while the question is open. ───── */
  for (const kind of ['dirty-neversaved', 'dirty-saved']) {
    for (const door of ['card', 'openStudio']) {
      const { ctx, page } = await boot(browser, kind);
      await press(page, door);
      await page.waitForTimeout(300);
      const s = await modalState(page);
      ok(s.open === true && s.went === null,
        `5b 1 LOAD-BEARING [${kind} · ${door}]: the confirm OPENS and nothing navigates yet (open=${s.open}, went=${s.went})`);
      await ctx.close();
    }
  }

  /* ── NOTHING AT RISK -> SILENT, and it GOES. Both doors. ─────────────────────────────────── */
  for (const [kind, why] of [['none', 'nothing built'], ['clean-saved', 'saved and untouched since']]) {
    for (const door of ['card', 'openStudio']) {
      const { ctx, page } = await boot(browser, kind);
      await press(page, door);
      await page.waitForTimeout(300);
      const s = await modalState(page);
      ok(s.open === false && s.went === '/studio.html?fresh=1',
        `5b 2 SILENCE [${why} · ${door}]: no dialog, and the blank Studio opens straight away (open=${s.open}, went=${s.went}) — a confirm that fires when nothing is at risk gets ignored when it matters`);
      await ctx.close();
    }
  }

  /* ── THE COPY, VERBATIM, AND THE SAFE CHOICE HOLDS FOCUS. ────────────────────────────────── */
  {
    const { ctx, page } = await boot(browser, 'dirty-neversaved');
    await press(page, 'card');
    await page.waitForTimeout(300);
    const s = await modalState(page);
    ok(s.title === COPY.title && s.body === COPY.body,
      `5b 3: title and body render VERBATIM (title "${s.title}")`);
    ok(s.confirm === COPY.confirm && s.cancel === COPY.cancel,
      `5b 4: both buttons verbatim — "${s.confirm}" / "${s.cancel}"`);
    ok(s.focused === 'action-cancel-fresh',
      `5b 5 LOAD-BEARING: the SAFE choice holds focus (focused=${s.focused}) — a stray Enter must never land on the destructive button`);
    ok(!/save/i.test(s.confirm + ' ' + s.cancel),
      '5b 6: NO save door here — that would fork on auth state, which is the leave prompt\'s job, not this one');
    await ctx.close();
  }

  /* ── THE TWO ANSWERS ACTUALLY DO THE TWO THINGS. ─────────────────────────────────────────── */
  {
    const { ctx, page } = await boot(browser, 'dirty-neversaved');
    await press(page, 'card');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('action-cancel-fresh').click());
    await page.waitForTimeout(250);
    const kept = await modalState(page);
    ok(kept.open === false && kept.went === null,
      `5b 7: "Keep this blueprint" closes the dialog and navigates NOWHERE (went=${kept.went})`);
    await press(page, 'card');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('action-confirm-fresh').click());
    await page.waitForTimeout(250);
    const gone = await modalState(page);
    ok(gone.open === false && gone.went === '/studio.html?fresh=1',
      `5b 8: "Start new anyway" closes it and DOES open the blank Studio (went=${gone.went})`);
    await ctx.close();
  }

  /* ── DISMISS IS A STAY. Backdrop click must not be a quiet yes. ──────────────────────────── */
  {
    const { ctx, page } = await boot(browser, 'dirty-neversaved');
    await press(page, 'card');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const m = document.getElementById('fresh-confirm-modal');
      m.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(250);
    const s = await modalState(page);
    ok(s.went === null,
      `5b 9: dismissing by the backdrop is a STAY, never a quiet yes (went=${s.went})`);
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOGUARD || ONEDOOR;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (Blueprint.html bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${NOGUARD ? 'MUTATED[noguard]' : ONEDOOR ? 'MUTATED[onedoor]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
