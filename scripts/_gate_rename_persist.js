'use strict';
/* RENAME · STORE GATE (red-first) — per-card display_name must LAND, must SURVIVE, and must never
 * silently clobber. Drives the REAL Blueprint.html (which loads nav.js + datum-d1.js) against a D1
 * that only knows what was actually PUT to it.
 *
 * WHY A REAL PAGE + A PUT-ONLY BACKEND. The prefs retire shipped on a 20/20-green gate that proved
 * WHICH STORE gets written and nothing about whether the write LANDS or the read RETURNS it — and the
 * very first live smoke failed. A stub that always answers hides exactly that class of fault forever,
 * so this backend 404s anything never written and enforces real revision/CAS semantics.
 *
 * SCOPE — COMMIT 1 (store only). The resolver + the rename write live in nav.js; no surface is wired
 * yet. So the red-first here bites at the RESOLVER seam ("renamed, but the name still resolves to the
 * derived 'Primary Architect's Blueprint'"). The CARD-level assertions — the rendered element actually
 * carrying data-rename-id (#380) and the repaint of all four paint sites — belong to Commits 2 and 3,
 * where the DOM they assert on exists. Claiming them here would be green-for-the-wrong-reason.
 *
 * MUTATIONS (each must be PROVEN to change the served bytes — a mutation that silently fails to apply
 * is a false GREEN, which has cost this repo three fixture bugs in one session):
 *   --redfirst  resolve() stops honouring display_name  -> a renamed card still reads the derived
 *               "Primary Architect's Blueprint". The Captain-visible symptom.
 *   --nocas     drops the setRevision adopt             -> a concurrent write from another device is
 *               SILENTLY overwritten (getDoc records no revision; the API treats ifRevision==null as
 *               expected=current = last-write-wins). Latent data loss with no error raised.
 *   --debounce  rename goes back to the ~1.5s scheduleWrite -> a rename followed by a navigation
 *               inside the debounce window is abandoned. The prefs-rename bug, verbatim.
 * Run them COMBINED too (two defects can mask each other — the codec gap hid the blueprint_z resurrect).
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const NOCAS = process.argv.includes('--nocas');
const DB = process.argv.includes('--debounce');
const CARDFORK = process.argv.includes('--cardfork');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

// Anchors — each asserted UNIQUE before use. A non-unique anchor mutates the first match, which is how
// a gate silently tests the wrong function (String.replace takes the first occurrence).
const A_RESOLVE = "      if (typeof dn === 'string' && dn.trim()) return { name: dn.trim(), source: 'user' };\n";
const A_CAS = "        if (typeof doc.revision === 'number' && typeof D1.setRevision === 'function') D1.setRevision(type, id, doc.revision);\n";
const A_DB_A = 'return D1.writeNow(';
const A_DB_B = '        }).then(function () { return rec; });';

function mutateNav(src) {
  let s = src;
  const need = (hay, needle, label) => {
    const n = hay.split(needle).length - 1;
    if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
  };
  if (RF) { need(s, A_RESOLVE, 'resolve'); s = s.replace(A_RESOLVE, ''); }
  if (NOCAS) { need(s, A_CAS, 'cas'); s = s.replace(A_CAS, ''); }
  if (DB) {
    need(s, A_DB_A, 'debounceA'); need(s, A_DB_B, 'debounceB');
    s = s.replace(A_DB_A, 'return D1.scheduleWrite(');
    s = s.replace(A_DB_B, '        }), Promise.resolve(rec);');
  }
  return s;
}

// COMMIT 2 — the CARD binding. Restores the pre-resolver forked expression in Blueprint.html's mapper,
// so a renamed card renders its DERIVED label again. Syntax stays valid; only the source of the name moves.
const A_CARD = "            ? window.DatumSavedName.resolve(bp, { noun: 'Blueprint', ownerName: prof.primary_name }).name";
const CARD_FORK = "            ? (prof.primary_name ? (prof.primary_name + \"'s Blueprint\") : 'Studio Blueprint')";

let navServedDiffers = false, bpServedDiffers = false;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/nav.js') {
    const orig = body.toString('utf8');
    const out = mutateNav(orig);
    navServedDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  if (p === '/Blueprint.html' && CARDFORK) {
    const orig = body.toString('utf8');
    const n = orig.split(A_CARD).length - 1;
    if (n !== 1) throw new Error(`anchor card: expected exactly 1 occurrence, found ${n}`);
    const out = orig.replace(A_CARD, CARD_FORK);
    bpServedDiffers = (out !== orig);
    body = Buffer.from(out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8207; const base = 'http://127.0.0.1:' + PORT;

const BP_ID = 'bp-rename-1';
const DOCID = 'blueprint/' + BP_ID;
function freshBlueprint() {
  return {
    schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID,
    saved_at: '2026-07-25T12:00:00Z',
    profile: { primary_name: 'Primary Architect' },
    accounts: [{ id: 'a1', baseId: 'taxable_primary', name: 'Taxable', value: 250000, holdings: [] },
               { id: 'a2', baseId: 'roth_ira', name: 'Roth', value: 90000, holdings: [] }],
    datum: { net_datum_v1: 120000, net_worth: 340000 }
  };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));

  // A D1 that knows ONLY what was PUT, with the REAL revision rules from functions/api/_lib/documents-core.js:
  // missing row + ifRevision!=null -> 409; existing row -> expected = ifRevision ?? current; mismatch -> 409.
  const d1 = { rows: {} };            // id -> { payload:<object>, revision:<n> }
  const puts = [];
  let injectConcurrent = null;        // set to a payload to simulate another device writing mid-flight

  d1.rows[DOCID] = { payload: freshBlueprint(), revision: 1 };

  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u).searchParams;
      const type = q.get('type'), key = q.get('key') || 'active';
      const id = type + '/' + key;
      const J = (o, status) => route.fulfill({ status: status || 200, contentType: 'application/json', body: JSON.stringify(o) });

      if (q.get('list') === '1') {
        const docs = Object.keys(d1.rows).filter((k) => k.indexOf(type + '/') === 0)
          .map((k) => ({ doc_key: k.slice(type.length + 1), revision: d1.rows[k].revision, updated_at: '2026-07-25T12:00:00Z' }));
        return J({ documents: docs });
      }
      if (req.method() === 'PUT') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        // Another device lands its write BETWEEN our getDoc and our PUT. This is the ONLY interleaving
        // where CAS matters, and it is exactly the one that loses data when ifRevision is absent.
        if (injectConcurrent) { d1.rows[id] = { payload: injectConcurrent, revision: (d1.rows[id] ? d1.rows[id].revision : 0) + 1 }; injectConcurrent = null; }
        const ifRev = (typeof body.revision === 'number') ? body.revision : null;
        const cur = d1.rows[id] ? d1.rows[id].revision : null;
        puts.push({ id, payload: body.payload, ifRev });
        if (cur === null) {
          if (ifRev !== null && ifRev !== 0) return J({ error: 'conflict', server_revision: null }, 409);
          d1.rows[id] = { payload: body.payload, revision: 1 };
          return J({ revision: 1 }, 201);
        }
        const expected = (ifRev !== null && ifRev !== 0) ? ifRev : cur;
        if (expected !== cur) return J({ error: 'conflict', server_revision: cur }, 409);
        d1.rows[id] = { payload: body.payload, revision: cur + 1 };
        return J({ revision: cur + 1 });
      }
      if (d1.rows[id]) return J({ payload: JSON.stringify(d1.rows[id].payload), revision: d1.rows[id].revision, updated_at: '2026-07-25T12:00:00Z' });
      return J({}, 404);
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });

  // Clerk carries a STALE mirror name — the trap a frozen mirror sets once it stops being written.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:renameuser'); } },
      user: { id: 'renameuser', firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' },
        unsafeMetadata: { bp_title: "Sweety's Blueprint Archive" },
        update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); } }
    };
  });

  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // ═══ 0 · the mutation actually reached the browser ═══════════════════════════════════════════════
  const anyMut = RF || NOCAS || DB;
  ok(anyMut ? navServedDiffers : !navServedDiffers,
    anyMut ? 'the mutation CHANGED the served nav.js bytes (not a silent no-op fixture)'
           : 'clean run: the served nav.js is the repo file, unmutated');
  const hasStore = await page.evaluate(() => !!(window.DatumSavedName && window.DatumSavedName.resolve && window.DatumSavedName.rename));
  ok(hasStore, 'nav.js exposes the shared store DatumSavedName{resolve,rename} on the real page');

  // ═══ 1 · the DERIVED default, before any rename ══════════════════════════════════════════════════
  const derived = await page.evaluate(() => ({
    bp: window.DatumSavedName.resolve({ profile: { primary_name: 'Primary Architect' } }, { noun: 'Blueprint', ownerName: 'Primary Architect' }),
    bpNoOwner: window.DatumSavedName.resolve({}, { noun: 'Blueprint' }),
    skNoOwner: window.DatumSavedName.resolve({}, { noun: 'Sketch' }),
    sk: window.DatumSavedName.resolve({}, { noun: 'Sketch', ownerName: 'Sweety' })
  }));
  ok(derived.bp.name === "Primary Architect's Blueprint" && derived.bp.source === 'derived',
    'unnamed blueprint derives the possessive and reports source:derived');
  ok(derived.bpNoOwner.name === 'Studio Blueprint', 'blueprint generic fallback is "Studio Blueprint" (born in the Studio)');
  ok(derived.skNoOwner.name === 'Untitled Sketch', 'sketch generic fallback is "Untitled Sketch" (authored — never a room-of-origin lie)');
  ok(derived.sk.name === "Sweety's Sketch", 'sketch derives the possessive from the workspace name');

  // ═══ 2 · RENAME LANDS, then the resolver reports source:user ═════════════════════════════════════
  const renamed = await page.evaluate((id) => window.DatumSavedName.rename('blueprint', id, 'Coast at 55')
    .then((rec) => ({ ok: true, rec })).catch((e) => ({ ok: false, err: String(e && e.message) })), BP_ID);
  await page.waitForTimeout(250);   // deliberately SHORTER than the ~1.5s debounce

  const put = puts.find((p) => p.id === DOCID);
  ok(!!put, 'the rename produced a PUT to the blueprint row IMMEDIATELY, inside the old debounce window [BITE debounce]');
  ok(!!put && put.payload && put.payload.display_name === 'Coast at 55',
    'the PUT carries display_name = the new name [BITE debounce]');
  ok(!!d1.rows[DOCID] && d1.rows[DOCID].payload.display_name === 'Coast at 55',
    'the write LANDED — the PUT-only backend now returns the new name');

  const resolvedAfter = await page.evaluate(() => {
    const rec = { display_name: 'Coast at 55', profile: { primary_name: 'Primary Architect' } };
    return window.DatumSavedName.resolve(rec, { noun: 'Blueprint', ownerName: 'Primary Architect' });
  });
  ok(resolvedAfter.name === 'Coast at 55' && resolvedAfter.source === 'user',
    'a renamed record resolves to the USER name, not the derived one [BITE redfirst]');

  // ═══ 3 · THE TWO NEGATIVES — rename changes the NAME and nothing else ════════════════════════════
  const stored = d1.rows[DOCID].payload;
  ok(stored.profile && stored.profile.primary_name === 'Primary Architect',
    'NEGATIVE: the rename did NOT write profile.primary_name (renaming the PERSON, and every card at once)');
  ok(Array.isArray(stored.accounts) && stored.accounts.length === 2 &&
     stored.datum && stored.datum.net_worth === 340000 && stored.saved_at === '2026-07-25T12:00:00Z',
    'NEGATIVE: rooms, net worth and saved_at are untouched — the frozen snapshot was not overwritten with live state');

  // ═══ 4 · SURVIVES NAVIGATE-AWAY-AND-BACK ════════════════════════════════════════════════════════
  await page.goto(base + '/methodology.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const afterNav = await page.evaluate((id) => window.DatumD1.getDoc('blueprint', id)
    .then((d) => (d && d.payload) ? JSON.parse(d.payload).display_name : null), BP_ID);
  ok(afterNav === 'Coast at 55', 'after navigating away and back, D1 still returns the renamed value [BITE debounce]');

  // ═══ 5 · A STALE CLERK MIRROR CANNOT CLOBBER A D1 NAME ══════════════════════════════════════════
  const navSrc = fs.readFileSync(path.join(ROOT, 'nav.js'), 'utf8');
  ok(!/display_name\s*=\s*meta\./.test(navSrc) && !/meta\.[A-Za-z_]*\s*display_name/.test(navSrc),
    'FENCE: no path in nav.js ever sources display_name from Clerk unsafeMetadata (mirror is not a name store)');
  const mirrorLoses = await page.evaluate(() => {
    // D1 gave us a user name; a frozen mirror offering a different one must not win.
    const fromD1 = { display_name: 'Coast at 55', profile: { primary_name: 'Primary Architect' } };
    return window.DatumSavedName.resolve(fromD1, { noun: 'Blueprint', ownerName: 'STALE MIRROR NAME' }).name;
  });
  ok(mirrorLoses === 'Coast at 55', 'a D1 user name beats any owner/mirror-derived name [BITE redfirst]');

  // ═══ 6 · REACHABLE-EMPTY ⇒ HONEST BLANK (derived), never a resurrected name ══════════════════════
  const honest = await page.evaluate(() => window.DatumSavedName.resolve({ profile: { primary_name: 'Primary Architect' } },
    { noun: 'Blueprint', ownerName: 'Primary Architect' }));
  ok(honest.source === 'derived' && honest.name === "Primary Architect's Blueprint",
    'a record with no display_name reports DERIVED — it never presents a guessed name as the user\'s');

  // ═══ 7 · CLEAR-TO-RESET deletes the key rather than storing a confident blank ════════════════════
  await page.evaluate((id) => window.DatumSavedName.rename('blueprint', id, '   ').catch(() => {}), BP_ID);
  await page.waitForTimeout(250);
  ok(d1.rows[DOCID] && !('display_name' in d1.rows[DOCID].payload),
    'clearing the name DELETES display_name (falls back to derived) instead of storing an empty string');

  // ═══ 8 · CONCURRENT WRITE — CAS must refuse to clobber another device ═══════════════════════════
  // MUST run on a FRESH page. DatumD1 caches a revision per key inside _doPut, so after any earlier
  // write in this session _rev is already populated and a PUT carries a (stale) number even with the
  // setRevision adopt removed — which conflicts by accident and hides the fault. The live-dangerous
  // shape is the one below: load the archive (getDoc records NOTHING), then rename as the session's
  // FIRST write, so without the adopt the PUT carries no revision at all and last-write-wins silently.
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  puts.length = 0;
  d1.rows[DOCID] = { payload: freshBlueprint(), revision: 5 };
  const otherDevice = freshBlueprint();
  otherDevice.display_name = 'FROM OTHER DEVICE';
  otherDevice.accounts.push({ id: 'a3', baseId: 'hsa', name: 'HSA', value: 15000, holdings: [] });
  injectConcurrent = otherDevice;   // lands between our getDoc and our PUT
  await page.evaluate((id) => window.DatumSavedName.rename('blueprint', id, 'My Rename').catch(() => {}), BP_ID);
  await page.waitForTimeout(400);
  const survivor = d1.rows[DOCID].payload;
  ok(survivor.display_name === 'FROM OTHER DEVICE' && survivor.accounts.length === 3,
    'CONCURRENT WRITE: the other device\'s save SURVIVES — our stale-revision rename is refused, not silently applied [BITE nocas]');
  const casPut = puts[puts.length - 1];
  ok(casPut && typeof casPut.ifRev === 'number',
    'the rename PUT carries an explicit revision (ifRevision), so the API can detect the conflict [BITE nocas]');

  // ═══ 9 · THE CARD ITSELF (Commit 2) — the rendered element, not the bytes ════════════════════════
  // #380: assert the SERVED, RENDERED card actually CARRIES the hook. A gate that greps the file for
  // "data-rename-id" passes even when no element ever wears it — that shipped an invisible feature once.
  // SETTLE BEFORE RESETTING THE FIXTURE. Under --debounce the earlier writes are still parked on the
  // ~1.5s timer; without this wait they fire AFTER the reset and repopulate the row, so the card would
  // show a renamed name and two assertions below would go red for a HARNESS reason rather than a
  // product one. Let them land, THEN reset, THEN navigate (navigation discards any remaining timers).
  await page.waitForTimeout(1800);
  d1.rows[DOCID] = { payload: freshBlueprint(), revision: 1 };
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);

  const card = await page.evaluate(() => {
    const h3 = document.querySelector('#blueprint-content-1 .blueprint-name');
    const btn = document.querySelector('#blueprint-content-1 .rename-action');
    const foot = document.querySelector('#blueprint-content-1 .saved-time');
    const pill = document.querySelector('#blueprint-content-1 .status-pill');
    const sheet = document.querySelector('#blueprint-content-1 .sheet-id');
    return {
      name: h3 ? h3.textContent.trim() : null,
      nameHook: h3 ? h3.getAttribute('data-rename-id') : null,
      btnHook: btn ? btn.getAttribute('data-rename-id') : null,
      btnLabel: btn ? btn.textContent.trim() : null,
      btnTitle: btn ? btn.getAttribute('title') : null,
      foot: foot ? foot.textContent.trim() : null,
      pill: pill ? pill.textContent.trim() : null,
      sheet: sheet ? sheet.textContent.trim() : null
    };
  });
  ok(card.nameHook === BP_ID && card.btnHook === BP_ID,
    'RENDERED card carries data-rename-id on BOTH the name element and the Rename control (#380)');
  ok(card.btnLabel === 'Rename' && card.btnTitle === 'Rename this blueprint',
    'the Rename control renders the authored label and hover verbatim');
  ok(card.name === "Primary Architect's Blueprint",
    'before any rename the card shows the DERIVED name (the string users are asking to replace)');
  ok(card.foot === '07/25/26',
    'footer leads with the 2-digit date ALONE — the status token is gone (it duplicated the pill)');
  ok(card.pill === 'Drafted', 'the status still renders — at card-top, in the pill, exactly once');
  ok(card.sheet === 'Sheet A-01', 'the ID chip reads "Sheet A-01"');

  // Inline edit through the REAL control: click Rename, type, Enter.
  await page.click('#blueprint-content-1 .rename-action');
  await page.waitForTimeout(150);
  const editorUp = await page.evaluate(() => {
    const i = document.querySelector('#blueprint-content-1 .rename-input');
    return i ? { placeholder: i.placeholder, value: i.value } : null;
  });
  ok(!!editorUp && editorUp.value === '',
    'the editor opens EMPTY — a derived label is never pre-filled, so Enter cannot promote a guess into stored data');
  ok(!!editorUp && editorUp.placeholder === "Primary Architect's Blueprint",
    'the derived name shows as the placeholder — visible context without becoming the value');

  await page.fill('#blueprint-content-1 .rename-input', 'Coast at 55');
  await page.press('#blueprint-content-1 .rename-input', 'Enter');
  await page.waitForTimeout(900);

  const afterUi = await page.evaluate(() => {
    const h3 = document.querySelector('#blueprint-content-1 .blueprint-name');
    return h3 ? h3.textContent.trim() : null;
  });
  ok(afterUi === 'Coast at 55',
    'after renaming through the real control the CARD repaints to the new name [BITE cardfork]');
  ok(d1.rows[DOCID].payload.display_name === 'Coast at 55',
    'and the D1 row holds it — the UI path lands in the store, not just on screen');

  // Esc must abandon cleanly, leaving the committed name intact.
  await page.click('#blueprint-content-1 .rename-action');
  await page.waitForTimeout(150);
  await page.fill('#blueprint-content-1 .rename-input', 'THROWN AWAY');
  await page.press('#blueprint-content-1 .rename-input', 'Escape');
  await page.waitForTimeout(400);
  const afterEsc = await page.evaluate(() => {
    const h3 = document.querySelector('#blueprint-content-1 .blueprint-name');
    return h3 ? h3.textContent.trim() : null;
  });
  ok(afterEsc === 'Coast at 55', 'Esc cancels the edit and restores the committed name');
  ok(d1.rows[DOCID].payload.display_name === 'Coast at 55', 'Esc wrote NOTHING to D1');

  ok(CARDFORK ? bpServedDiffers : !bpServedDiffers,
    CARDFORK ? 'the --cardfork mutation CHANGED the served Blueprint.html bytes' : 'clean run: Blueprint.html served unmutated');

  ok(pageErrors.length === 0, 'no uncaught page errors on the real Blueprint.html (' + pageErrors.join(' | ') + ')');

  await browser.close(); server.close();
  const mode = [RF && 'redfirst', NOCAS && 'nocas', DB && 'debounce', CARDFORK && 'cardfork'].filter(Boolean).join('+') || 'CLEAN';
  console.log('MODE: ' + mode + '   |   RENAME store persistence (real Blueprint.html, PUT-only D1)');
  lines.forEach((l) => console.log('  ' + l));
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE ERROR', e); process.exit(1); });
