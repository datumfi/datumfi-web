'use strict';
/* SAVE PROGRESS · QUICK-SAVE GATE (red-first) — the one-tap save on an ALREADY-SAVED file, both surfaces.
 *
 * WHAT THIS PROVES, in the Captain's terms: when you are working inside a file you already saved, one tap
 * writes to THAT file — same id, no new archive row, no overwrite warning, and you stay where you are. And
 * when you are NOT inside a saved file, the control is not there at all and nothing about today changes.
 *
 * WHY A REAL PAGE. The whole point of this feature is which row gets written. A stub that always answers
 * would hide the only fault that matters (writing to the WRONG id), so this backend knows only what was
 * actually PUT to it, and the gate drives the REAL studio.html / sketch.html pickers through their own
 * controls — never by calling internals directly.
 *
 * MUTATIONS — every one is PROVEN to change the served bytes before the run is trusted (a mutation that
 * silently fails to apply is a false GREEN; that has cost this repo real days). Each must make a NAMED
 * check go RED, and the healthy run must be green on all of them:
 *   --redfirst  removes the row-zero insert on BOTH surfaces (the feature reverted) -> 1, 2, 4, 6 bite.
 *   --noguard   activeMeta stops requiring a LIVE archive row and trusts the held id -> 3b bites. This is
 *               the save-then-erase resurrection: the draft carries the id forward, so a held-but-dead id
 *               would silently RECREATE a file the user deleted.
 *   --newrow    quick-save passes { newBlueprint: true } -> 1 bites (a new id + a new archive row).
 *   --confirm   the row routes through confirmOverwrite instead of saving -> 2 bites (the warning is back).
 *   --noclear   drops the _skActiveId clear in resetSketch -> 5 bites. THE DATA-LOSS GUARD: a stale id
 *               surviving into fresh work means quick-save overwrites a file the user has left.
 * Run them COMBINED too — two defects can mask each other.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

const RF      = process.argv.includes('--redfirst');
const NOGUARD = process.argv.includes('--noguard');
const NEWROW  = process.argv.includes('--newrow');
const CONFIRM = process.argv.includes('--confirm');
const NOCLEAR = process.argv.includes('--noclear');
const ANY_MUT = RF || NOGUARD || NEWROW || CONFIRM || NOCLEAR;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

/* ── Anchors. Each asserted UNIQUE before use: a non-unique anchor mutates the first match, which is how
      a gate silently tests the wrong function (String.replace takes the first occurrence). ────────────── */
const A_ST_INSERT = "        if (am) { pop.insertBefore(quickSaveRow(am), head.nextSibling); lbl.textContent = 'Save as new / overwrite another'; }\n";
const A_SK_INSERT = "          if (_am) { _pop.insertBefore(_skQuickSaveRow(_am), head.nextSibling); _lbl.textContent = 'Save as new / overwrite another'; }\n";
const A_ST_GUARD  = "      for (var i = 0; i < items.length; i++) { if (items[i].id === id) return items[i]; }\n      return null;\n    }";
const M_ST_GUARD  = "      return { id: id, name: 'Held Blueprint', rooms: 0, when: '' };\n    }";
const A_ST_SAVE   = "        DatumBlueprint.save(bp, { blueprint_id: meta.id });\n";
const M_ST_SAVE   = "        DatumBlueprint.save(bp, { newBlueprint: true });\n";
const A_ST_CLICK  = "      b.addEventListener('click', function (e) { e.stopPropagation(); saveProgress(meta); });";
const M_ST_CLICK  = "      b.addEventListener('click', function (e) { e.stopPropagation(); confirmOverwrite(meta); });";
const A_SK_CLEAR  = "        window._skActiveId = null;\n";

/* The save hook is registered at DOMContentLoaded and only AFTER the deferred hub has landed, so a fixed
   sleep races it. Measured: the hook is reliably present, but not within the ~1.5s the first draft of this
   gate allowed — it crashed with "studioSaveCurrent is not a function" and that was the RIG, not the page.
   Wait for the thing itself. */
async function waitHook(page, name) {
  try {
    // NOTE the argument positions: waitForFunction(fn, ARG, OPTIONS). Passing options in slot 2 silently
    // makes them the function ARGUMENT and leaves the default timeout in place — a rig bug I shipped once
    // in this very file and it made a real 30s wait look like a deliberate 25s one.
    await page.waitForFunction(`typeof window.${name} === 'function'`, null, { timeout: 25000 });
  } catch (e) {
    const diag = await page.evaluate(() => ({
      hub: typeof window.DatumBlueprint, d1: typeof window.DatumD1,
      studioBtn: !!document.getElementById('studio-save-bp-btn'),
      sketchBtn: !!document.getElementById('sketch-save-btn'),
      ready: document.readyState, url: location.href
    })).catch(() => null);
    throw new Error(`HOOK ${name} never appeared. DIAG=${JSON.stringify(diag)}`);
  }
}
/* A goto that REFUSES to fail quietly. A dead navigation lands on chrome-error://chromewebdata/ and then
   every downstream assertion measures a blank tab — which reads exactly like a broken product. Surface it. */
async function go(page, url, failed) {
  let resp = null, err = null;
  try { resp = await page.goto(url, { waitUntil: 'commit' }); } catch (e) { err = e.message; }
  const cur = page.url();
  if (err || cur.startsWith('chrome-error')) {
    throw new Error(`NAVIGATION FAILED for ${url}: err=${err} landed=${cur} status=${resp && resp.status()} requestFailures=${JSON.stringify((failed || []).slice(0, 5))}`);
  }
  return resp;
}
/* Open the Studio picker through a REAL control. When signed in nav.js hides the page-header button, so its
   rect is zero and open() positions the popup off-viewport (sketch.html guards that; studio.html does not,
   and only a no-anchor/hidden-anchor caller can reach it — never a user clicking the control they can see).
   Prefer the account-topbar button, which is the control a signed-in user actually clicks. */
async function openStudioPicker(page) {
  const usedTopbar = await page.evaluate(() => {
    const tb = document.querySelector('[data-acct-action="save-current"]');
    if (tb) { tb.click(); return true; }
    const hdr = document.getElementById('studio-save-bp-btn');
    if (hdr) { hdr.click(); return false; }
    return null;
  });
  if (usedTopbar === null) throw new Error('no Studio save control found to click');
  return usedTopbar;
}
/* Click a picker row via its own bound listener. The popup can sit outside the viewport when its anchor was
   hidden (above), and a gesture-click then times out on geometry. What these checks are about is which row
   gets written, not popup placement, so the real handler is invoked directly and that limit is stated. */
async function clickRow(page, sel) {
  await page.waitForSelector(sel, { timeout: 8000 });
  await page.$eval(sel, (el) => el.click());
}
function need(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
}
function mutateStudio(src) {
  let s = src;
  if (RF)      { need(s, A_ST_INSERT, 'st-insert'); s = s.replace(A_ST_INSERT, ''); }
  if (NOGUARD) { need(s, A_ST_GUARD, 'st-guard');  s = s.replace(A_ST_GUARD, M_ST_GUARD); }
  if (NEWROW)  { need(s, A_ST_SAVE, 'st-save');    s = s.replace(A_ST_SAVE, M_ST_SAVE); }
  if (CONFIRM) { need(s, A_ST_CLICK, 'st-click');  s = s.replace(A_ST_CLICK, M_ST_CLICK); }
  return s;
}
function mutateSketch(src) {
  let s = src;
  if (RF)      { need(s, A_SK_INSERT, 'sk-insert'); s = s.replace(A_SK_INSERT, ''); }
  if (NOCLEAR) { need(s, A_SK_CLEAR, 'sk-clear');   s = s.replace(A_SK_CLEAR, ''); }
  return s;
}

let studioDiffers = false, sketchDiffers = false;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/studio.html') { const o = body.toString('utf8'); const out = mutateStudio(o); studioDiffers = studioDiffers || (out !== o); body = Buffer.from(out, 'utf8'); }
  if (p === '/sketch.html') { const o = body.toString('utf8'); const out = mutateSketch(o); sketchDiffers = sketchDiffers || (out !== o); body = Buffer.from(out, 'utf8'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8231; const base = 'http://127.0.0.1:' + PORT;

const BP_ID = 'bp-quicksave-1';
const SK_ID = 'sk-quicksave-1';
/* FIXTURE STAMP — read this before touching it.
   The Studio doc must be stamped LATER than any draft the page writes for itself, and NOW is not late
   enough. Measured here: the page's own first DatumBlueprint.load() runs before boot and finishLoad writes
   a session draft stamped at that moment. Boot's load({d1Doc}) then compares via _draftIsNewer, the
   just-written EMPTY draft wins, the D1 payload is skipped, and _loadSource comes back 'session-draft' with
   zero rooms. A rig in that state measures a blank Studio and blames the product — which is exactly the
   bogus "3 rooms became 0" reading from the last arc, reproduced here from the other end.
   A FUTURE stamp models the real state this feature is about: the saved doc is the freshest thing there is,
   because the user just saved it. It is not a thumb on the scale; a past stamp was. */
const NOW_TS  = new Date().toISOString();
const SAVED_TS = new Date(Date.now() + 10 * 60 * 1000).toISOString();

function fixtureBlueprint() {
  return {
    schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID,
    saved_at: NOW_TS,
    display_name: 'The Harbour Plan',
    profile: { primary_name: 'Primary Architect' },
    accounts: [{ id: 'a1', baseId: 'taxable_primary', name: 'Taxable', value: 250000, holdings: [] },
               { id: 'a2', baseId: 'roth_ira', name: 'Roth', value: 90000, holdings: [] }],
    datum: { net_datum_v1: 120000, net_worth: 340000 }
  };
}
function fixtureSketch() {
  return {
    sketch_id: SK_ID, status: 'Drafted', display_name: 'The Long Weekend',
    date_stamped: '07/29/2026', saved_at: NOW_TS,
    s1_resolved_state: 'EXPANSIVE', resolved_state: 'EXPANSIVE',
    age: 44, retire_age: 62, portfolio_mass: 1250000, contributions: 30000,
    s1_datum: 110000, datum_spend: 110000,
    market_outlook: 'avg', inflation_mode: 'real', tax_rate: 20, plan_end_age: 93
  };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ── The fake D1: knows ONLY what was PUT. Shared across both surfaces so a write on one is visible
  //    to the other, the way one account's documents really are.
  const d1 = { rows: {} };
  /* Re-seed before EVERY block. Blocks write real PUTs, so row payloads and stamps drift as the run goes on
     and a later block would boot off whatever an earlier block happened to leave behind. That is how
     PRE-dead came back null on a page that was hydrating fine two blocks earlier. */
  function seedRows() {
    for (const k of Object.keys(d1.rows)) delete d1.rows[k];
    d1.rows['blueprint/' + BP_ID]  = { payload: fixtureBlueprint(), revision: 1, updated_at: SAVED_TS };
    d1.rows['studio/active']       = { payload: fixtureBlueprint(), revision: 1, updated_at: SAVED_TS };
    d1.rows['sketchbook/' + SK_ID] = { payload: fixtureSketch(), revision: 1, updated_at: SAVED_TS };
  }
  const puts = [];
  seedRows();
  const archiveRows = (type) => Object.keys(d1.rows).filter((k) => k.indexOf(type + '/') === 0);

  async function newSurface() {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));
    const failed = []; page.on('requestfailed', (r) => failed.push(r.url().slice(-60) + ' :: ' + (r.failure() && r.failure().errorText)));
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u).searchParams;
        const type = q.get('type'), key = q.get('key') || 'active';
        const id = type + '/' + key;
        const J = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (q.get('list') === '1') {
          return J({ documents: archiveRows(type).map((k) => ({ doc_key: k.slice(type.length + 1), revision: d1.rows[k].revision, updated_at: d1.rows[k].updated_at })) });
        }
        if (req.method() === 'PUT') {
          let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) {}
          puts.push({ id, payload: b.payload });
          const cur = d1.rows[id] ? d1.rows[id].revision : 0;
          // Stamped with the SAME future SAVED_TS, deliberately. The real API stamps now, but every page load
          // writes its own draft at ~now, so a now-stamped row ties or loses _draftIsNewer and the NEXT block
          // boots empty off a row this gate itself just wrote. Keeping the server doc newest is the honest
          // model of `the user saved, so the saved doc wins`.
          d1.rows[id] = { payload: b.payload, revision: cur + 1, updated_at: SAVED_TS };
          return J({ revision: cur + 1 }, cur ? 200 : 201);
        }
        if (d1.rows[id]) return J({ payload: JSON.stringify(d1.rows[id].payload), revision: d1.rows[id].revision, updated_at: d1.rows[id].updated_at });
        return J({}, 404);
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    return { ctx, page, pageErrors, failed };
  }

  // Seed + a confirm-watcher. The watcher is the honest way to assert "no overwrite warning": it records
  // any node that EVER carried the confirm heading, so a confirm that appears and is then replaced still
  // gets caught. Reading the DOM after the fact would miss exactly that.
  const initScript = (skId, skPayload) => {
    return `(() => {
      try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
      try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
      try { localStorage.setItem('datum-discover-v1', 'done'); } catch (e) {}
      try { localStorage.setItem('datum_workspace_name', 'Primary Architect'); } catch (e) {}
      try { localStorage.setItem('datum_sketch_byid_${skId}', ${JSON.stringify(JSON.stringify(skPayload))}); } catch (e) {}
      // A REAL signed-in Clerk. user:null read as signed-OUT and nav.js sent the tab to an external host
      // mid-run; the route guard aborted it and the page became chrome-error, so every later assertion was
      // measuring a dead tab. Same stub shape as the proven _gate_rename_persist fixture.
      window.Clerk = {
        load: function () { return Promise.resolve(); },
        session: { getToken: function () { return Promise.resolve('tok:qsuser'); } },
        user: { id: 'qsuser', firstName: 'Primary', primaryEmailAddress: { emailAddress: 'q@q.co' },
          unsafeMetadata: {},
          update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); } }
      };
      window.__confirmSeen = [];
      var HEADS = ['Overwrite this blueprint?', 'Overwrite this sketch?'];
      // Target document, not document.documentElement: an init script runs before the root element exists,
      // and observing null throws before the watcher is ever armed (it did, silently, for three runs).
      new MutationObserver(function (recs) {
        recs.forEach(function (r) {
          Array.prototype.forEach.call(r.addedNodes, function (n) {
            var t = (n.textContent || '');
            // EXACT match on a trimmed element, never indexOf. The confirm heading text also appears inside
            // inline <script> SOURCE, and script nodes get added to the DOM during parse — an indexOf sweep
            // therefore reported the warning as "seen" on a run where no warning ever rendered.
            if (n.nodeType !== 1) return;
            HEADS.forEach(function (h) { if (t.trim() === h) window.__confirmSeen.push(h); });
          });
        });
      }).observe(document, { childList: true, subtree: true });
    })();`;
  };

  /* ═══ SURFACE 1 — STUDIO ═══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page, pageErrors, failed } = await newSurface();
    await page.addInitScript(initScript(SK_ID, fixtureSketch()));
    await go(page, base + '/studio.html', failed);
    await page.waitForFunction(() => window._d1BootPending === false, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);

    // PRECONDITION, not a product claim. If the real boot did not put the saved doc on the page, every
    // assertion below would be measuring an empty page — which is exactly the instrument fault that
    // produced a bogus "3 rooms became 0" finding last arc. Fail loudly here instead.
    const pre = await page.evaluate(() => {
      // Mirror the page's own activeDoc precedence: prefer whichever holder carries the identity. A plain
      // `_studioBp || _studioBlueprint` reads the EMPTY fresh+dossier holder and reports a null id and zero
      // rooms on a page that hydrated perfectly — the precondition would then accuse the product of breaking
      // the standing ruling when the saved doc is sitting right there in the other holder.
      const a = window._studioBp, b = window._studioBlueprint;
      const bp = (a && a.blueprint_id) ? a : ((b && b.blueprint_id) ? b : (a || b || null));
      return { id: bp && bp.blueprint_id, rooms: ((bp && bp.accounts) || []).length, hasHook: typeof window.studioSaveCurrent === 'function',
               srcBp: a && a._loadSource, srcBlueprint: b && b._loadSource };
    });
    ok(pre.id === BP_ID, `PRE-studio: real boot holds the saved blueprint_id (got ${pre.id}; _loadSource _studioBp=${pre.srcBp} _studioBlueprint=${pre.srcBlueprint})`);
    ok(pre.rooms === 2, `PRE-studio: the saved blueprint opened WITH ITS ROOMS (got ${pre.rooms}) [standing ruling]`);
    ok(pre.hasHook, 'PRE-studio: studioSaveCurrent hook present');

    const bpRowsBefore = archiveRows('blueprint').length;
    const putsBefore = puts.length;

    // Drive the REAL control, never an internal.
    await waitHook(page, 'studioSaveCurrent');
    // Click the REAL header button, whose own handler passes ITSELF as the anchor. Calling the hook with no
    // anchor falls back to a possibly-hidden button, open() reads a zero rect, and the popup is positioned
    // off-viewport so nothing inside it is clickable. (sketch.html guards that degenerate rect; studio.html
    // does not — but only a no-anchor caller can reach it, i.e. the rig, never a user clicking a button.)
    await openStudioPicker(page);
    await page.waitForSelector('#studio-save-bp-pop', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);

    const shown = await page.evaluate(() => {
      const q = document.getElementById('studio-bp-quicksave');
      const pop = document.getElementById('studio-save-bp-pop');
      const lbls = pop ? Array.prototype.map.call(pop.querySelectorAll('div'), (d) => d.textContent) : [];
      return { present: !!q, text: q ? q.textContent : '', labels: lbls };
    });
    // Assert the COPY BY NAME so a silent wording edit goes red.
    ok(shown.present, 'STUDIO 1a: row zero "Save progress" renders when a saved sheet is active');
    ok(/Save progress/.test(shown.text), 'STUDIO 1b: primary label reads exactly "Save progress"');
    ok(/Save your changes to this blueprint/.test(shown.text), 'STUDIO 1c: sub-line reads "Save your changes to this blueprint"');
    ok(shown.labels.some((t) => t === 'Save as new / overwrite another'), 'STUDIO 1d: existing list demoted under "Save as new / overwrite another"');

    if (shown.present) await clickRow(page, '#studio-bp-quicksave');
    await page.waitForTimeout(1400);

    const bpPuts = puts.slice(putsBefore).filter((p) => p.id.indexOf('blueprint/') === 0);
    ok(bpPuts.length > 0, 'STUDIO 1e: quick-save actually wrote a blueprint row');
    ok(bpPuts.length > 0 && bpPuts.every((p) => p.id === 'blueprint/' + BP_ID), `STUDIO 1f: wrote the SAME id (${bpPuts.map((p) => p.id).join(',') || 'none'})`);
    ok(archiveRows('blueprint').length === bpRowsBefore, `STUDIO 1g: minted NO new archive row (${bpRowsBefore} -> ${archiveRows('blueprint').length})`);

    const seen = await page.evaluate(() => window.__confirmSeen.slice());
    ok(seen.length === 0, `STUDIO 2: NO overwrite-confirm appeared (saw: ${JSON.stringify(seen)})`);

    const after = await page.evaluate(() => {
      const bp = window._studioBp || window._studioBlueprint || null;
      return { url: location.pathname, popGone: !document.getElementById('studio-save-bp-pop'), rooms: ((bp && bp.accounts) || []).length };
    });
    ok(after.url === '/studio.html', `STUDIO 2b: no navigation — still on the Studio (${after.url})`);
    ok(after.popGone, 'STUDIO 2c: picker closed, user left where they were');

    // 4 — the negative that matters most to a user: nothing else moved.
    const wrote = bpPuts.length ? bpPuts[bpPuts.length - 1].payload : null;
    ok(!!wrote && wrote.blueprint_id === BP_ID, 'STUDIO 4a: written payload carries the same blueprint_id');
    ok(!!wrote && wrote.display_name === 'The Harbour Plan', `STUDIO 4b: rename state untouched (display_name=${wrote && wrote.display_name})`);
    ok(!!wrote && (wrote.accounts || []).length === 2, `STUDIO 4c: rooms untouched (${wrote && (wrote.accounts || []).length})`);
    ok(!!wrote && wrote.datum && wrote.datum.net_worth === 340000, `STUDIO 4d: net worth untouched (${wrote && wrote.datum && wrote.datum.net_worth})`);

    // 1h — IDEMPOTENT: a second tap re-saves the same id and still mints nothing.
    const rowsBefore2 = archiveRows('blueprint').length; const puts2 = puts.length;
    await waitHook(page, 'studioSaveCurrent');
    // Click the REAL header button, whose own handler passes ITSELF as the anchor. Calling the hook with no
    // anchor falls back to a possibly-hidden button, open() reads a zero rect, and the popup is positioned
    // off-viewport so nothing inside it is clickable. (sketch.html guards that degenerate rect; studio.html
    // does not — but only a no-anchor caller can reach it, i.e. the rig, never a user clicking a button.)
    await openStudioPicker(page);
    await page.waitForTimeout(900);
    const again = await page.evaluate(() => !!document.getElementById('studio-bp-quicksave'));
    if (again) await clickRow(page, '#studio-bp-quicksave');
    await page.waitForTimeout(1200);
    const bpPuts2 = puts.slice(puts2).filter((p) => p.id.indexOf('blueprint/') === 0);
    ok(bpPuts2.length > 0 && bpPuts2.every((p) => p.id === 'blueprint/' + BP_ID) && archiveRows('blueprint').length === rowsBefore2,
      'STUDIO 1h: idempotent — a second tap re-saves the SAME id, still no new row');

    ok(pageErrors.length === 0, `STUDIO: no page errors (${JSON.stringify(pageErrors.slice(0, 2))})`);
    await ctx.close();
  }

  /* ═══ SURFACE 1b — STUDIO NEGATIVES: fresh work, and held-but-dead ═════════════════════════════ */
  {
    /* (3) FRESH WORK — the REAL user state this negative is about: signed in, working on something that has
       never been saved. So studio/active still exists (the session is live) but carries NO blueprint_id, and
       the archive is empty. Deleting studio/active outright was the wrong fixture: it modelled a broken
       session rather than unsaved work. */
    seedRows();
    const saveStudio = d1.rows['studio/active'];
    const unsaved = fixtureBlueprint(); unsaved.blueprint_id = null; unsaved.display_name = ''; unsaved.accounts = [];
    d1.rows['studio/active'] = { payload: unsaved, revision: 1, updated_at: SAVED_TS };
    const savedBp = d1.rows['blueprint/' + BP_ID]; delete d1.rows['blueprint/' + BP_ID];
    const { ctx, page, failed } = await newSurface();
    await page.addInitScript(initScript(SK_ID, fixtureSketch()));
    await go(page, base + '/studio.html?fresh=1', failed);
    await page.waitForFunction(() => window._d1BootPending === false, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await waitHook(page, 'studioSaveCurrent');
    // Click the REAL header button, whose own handler passes ITSELF as the anchor. Calling the hook with no
    // anchor falls back to a possibly-hidden button, open() reads a zero rect, and the popup is positioned
    // off-viewport so nothing inside it is clickable. (sketch.html guards that degenerate rect; studio.html
    // does not — but only a no-anchor caller can reach it, i.e. the rig, never a user clicking a button.)
    await openStudioPicker(page);
    await page.waitForSelector('#studio-save-bp-pop', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    const fresh = await page.evaluate(() => {
      const pop = document.getElementById('studio-save-bp-pop');
      const lbls = pop ? Array.prototype.map.call(pop.querySelectorAll('div'), (d) => d.textContent) : [];
      return {
        q: !!document.getElementById('studio-bp-quicksave'),
        // NOT body.textContent: <script> elements live in body and their SOURCE contains the literal
        // 'Save progress', so a text sweep is green-for-the-wrong-reason inverted — it failed on the clean
        // run for a reason that had nothing to do with the product. Ask the RENDERED CONTROLS instead.
        copyOnControls: Array.prototype.some.call(document.querySelectorAll('button, a, [role="button"]'), function (el) { return (el.textContent || '').indexOf('Save progress') >= 0; }),
        demoted: lbls.some((t) => t === 'Save as new / overwrite another'),
        legacy: lbls.some((t) => t === 'or overwrite an existing sheet')
      };
    });
    ok(!fresh.q, 'STUDIO 3a: NEGATIVE — no "Save progress" row on fresh work');
    ok(!fresh.copyOnControls, 'STUDIO 3b: NEGATIVE — no rendered control anywhere carries the copy "Save progress"');
    ok(!fresh.demoted, 'STUDIO 3c: NEGATIVE — the demoted heading does not appear either');
    ok(fresh.legacy, 'STUDIO 3d: today flow untouched — the existing "or overwrite an existing sheet" label still reads as it did');
    await ctx.close();
    d1.rows['studio/active'] = saveStudio; d1.rows['blueprint/' + BP_ID] = savedBp;
  }
  {
    // (3b) HELD BUT DEAD — the resurrection guard. studio/active still carries the id, but the archive row
    //      is GONE (the user erased it). A held id must NOT be enough. --noguard makes this bite.
    seedRows();
    const savedBp = d1.rows['blueprint/' + BP_ID]; delete d1.rows['blueprint/' + BP_ID];
    const { ctx, page, failed } = await newSurface();
    await page.addInitScript(initScript(SK_ID, fixtureSketch()));
    await go(page, base + '/studio.html', failed);
    await page.waitForFunction(() => window._d1BootPending === false, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const held = await page.evaluate(() => {
      const a = window._studioBp, b = window._studioBlueprint;   // same activeDoc precedence as the page
      return (a && a.blueprint_id) || (b && b.blueprint_id) || null;
    });
    const rowsBefore = archiveRows('blueprint').length;
    await waitHook(page, 'studioSaveCurrent');
    // Click the REAL header button, whose own handler passes ITSELF as the anchor. Calling the hook with no
    // anchor falls back to a possibly-hidden button, open() reads a zero rect, and the popup is positioned
    // off-viewport so nothing inside it is clickable. (sketch.html guards that degenerate rect; studio.html
    // does not — but only a no-anchor caller can reach it, i.e. the rig, never a user clicking a button.)
    await openStudioPicker(page);
    await page.waitForTimeout(1200);
    const dead = await page.evaluate(() => !!document.getElementById('studio-bp-quicksave'));
    ok(held === BP_ID, `PRE-dead: the page really is holding the erased id (${held})`);
    ok(!dead, 'STUDIO 3e: NEGATIVE — held-but-ERASED id shows NO "Save progress" (no silent resurrection)');
    ok(archiveRows('blueprint').length === rowsBefore, 'STUDIO 3f: the erased blueprint row was not recreated');
    await ctx.close();
    d1.rows['blueprint/' + BP_ID] = savedBp;
  }

  /* ═══ SURFACE 2 — SKETCH ═══════════════════════════════════════════════════════════════════════ */
  {
    seedRows();
    const { ctx, page, pageErrors, failed } = await newSurface();
    await page.addInitScript(initScript(SK_ID, fixtureSketch()));
    // Open a SAVED sketch the way the Sketchbook opens one.
    await page.addInitScript(`(() => {
      try {
        sessionStorage.setItem('datumfi_hydrate_from_slot', '1');
        sessionStorage.setItem('datumfi_hydrate_sketch_id', '${SK_ID}');
      } catch (e) {}
    })();`);
    await go(page, base + '/sketch.html', failed);
    await page.waitForTimeout(2500);

    const preSk = await page.evaluate(() => ({ held: window._skActiveId || null, hasHook: typeof window.sketchSaveCurrent === 'function' }));
    ok(preSk.held === SK_ID, `PRE-sketch: opening a saved sketch HOLDS its id (got ${preSk.held})`);
    ok(preSk.hasHook, 'PRE-sketch: sketchSaveCurrent hook present');

    const skRowsBefore = archiveRows('sketchbook').length; const putsBefore = puts.length;
    await waitHook(page, 'sketchSaveCurrent'); await page.evaluate(() => window.sketchSaveCurrent());
    await page.waitForSelector('#sketch-save-sb-pop', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const skShown = await page.evaluate(() => {
      const q = document.getElementById('sketch-sb-quicksave');
      const pop = document.getElementById('sketch-save-sb-pop');
      const lbls = pop ? Array.prototype.map.call(pop.querySelectorAll('div'), (d) => d.textContent) : [];
      return { present: !!q, text: q ? q.textContent : '', labels: lbls };
    });
    ok(skShown.present, 'SKETCH 6a: row zero "Save progress" renders when a saved sketch is active');
    ok(/Save progress/.test(skShown.text), 'SKETCH 6b: primary label reads exactly "Save progress"');
    ok(/Save your changes to this sketch/.test(skShown.text), 'SKETCH 6c: sub-line reads "Save your changes to this sketch"');
    ok(skShown.labels.some((t) => t === 'Save as new / overwrite another'), 'SKETCH 6d: list demoted under "Save as new / overwrite another"');

    if (skShown.present) await clickRow(page, '#sketch-sb-quicksave');
    await page.waitForTimeout(1600);

    const skPuts = puts.slice(putsBefore).filter((p) => p.id.indexOf('sketchbook/') === 0);
    ok(skPuts.length > 0 && skPuts.every((p) => p.id === 'sketchbook/' + SK_ID), `SKETCH 6e: wrote the SAME id (${skPuts.map((p) => p.id).join(',') || 'none'})`);
    ok(archiveRows('sketchbook').length === skRowsBefore, `SKETCH 6f: minted NO new archive row (${skRowsBefore} -> ${archiveRows('sketchbook').length})`);
    const skSeen = await page.evaluate(() => window.__confirmSeen.slice());
    ok(skSeen.length === 0, `SKETCH 6g: NO overwrite-confirm appeared (saw: ${JSON.stringify(skSeen)})`);
    const skAfter = await page.evaluate(() => ({ url: location.pathname, popGone: !document.getElementById('sketch-save-sb-pop') }));
    ok(skAfter.url === '/sketch.html', `SKETCH 6h: no navigation — still on the Sketch (${skAfter.url})`);
    ok(skAfter.popGone, 'SKETCH 6i: picker closed, user left where they were');

    /* ── 5 — THE DATA-LOSS GUARD. Start fresh work IN-PAGE via the real reset control, then prove
          quick-save can no longer reach the sketch we had open. --noclear must make this bite. ── */
    // Snapshot page errors BEFORE the reset. resetSketch touches elements that only exist on later screens,
    // so invoking it out of phase throws a null-deref that is MINE, not the product's. Asserting cleanliness
    // after it would be reporting my own out-of-phase call as a defect.
    const errsBeforeReset = pageErrors.length;
    const putsAtReset = puts.length;
    // #btn-reset-sketch is real and bound, but it lives on a LATER screen and is not visible in the state a
    // freshly-opened sketch lands in, so a gesture-click times out on visibility. Invoke its own bound
    // handler instead. This still exercises the real resetSketch path — what is skipped is the button being
    // on screen, which is a phase concern and not what this check is about. Stated so nobody reads this as
    // proof the control is reachable here.
    await page.$eval('#btn-reset-sketch', (el) => el.click());
    await page.waitForTimeout(700);
    const cleared = await page.evaluate(() => window._skActiveId);
    ok(!cleared, `SKETCH 5a: fresh start CLEARED the active sketch id (got ${JSON.stringify(cleared)})`);
    await waitHook(page, 'sketchSaveCurrent'); await page.evaluate(() => window.sketchSaveCurrent());
    await page.waitForTimeout(1400);
    const afterReset = await page.evaluate(() => ({
      q: !!document.getElementById('sketch-sb-quicksave'),
      copyOnControls: Array.prototype.some.call(document.querySelectorAll('button, a, [role="button"]'), function (el) { return (el.textContent || '').indexOf('Save progress') >= 0; })
    }));
    ok(!afterReset.q, 'SKETCH 5b: NEGATIVE — no "Save progress" row after starting fresh work');
    ok(!afterReset.copyOnControls, 'SKETCH 5c: NEGATIVE — no rendered control carries the copy after a fresh start');
    // If the row is present here, the guard is BROKEN — so click it and let the damage be the measurement.
    // Without this, 5d passes in both worlds (nothing is ever clicked after a reset) and --noclear leaves it
    // silently green: a check that cannot fail is not a check. In the healthy world there is no row to click.
    if (afterReset.q) await clickRow(page, '#sketch-sb-quicksave');
    await page.waitForTimeout(2600);   // > DatumD1 WRITE_DEBOUNCE_MS (1500): a shorter wait made 5d look green
    const postResetPuts = puts.slice(putsAtReset).filter((p) => p.id === 'sketchbook/' + SK_ID);
    ok(postResetPuts.length === 0, `SKETCH 5d: NEGATIVE — fresh work wrote NOTHING to the previously opened id (${postResetPuts.length} writes)`);

    ok(errsBeforeReset === 0, `SKETCH: no page errors through the quick-save (${JSON.stringify(pageErrors.slice(0, 2))})`);
    if (pageErrors.length > errsBeforeReset) {
      lines.push('NOTE  post-reset page errors are the rig calling resetSketch out of phase, not a product fault: '
        + JSON.stringify(pageErrors.slice(errsBeforeReset, errsBeforeReset + 2)));
    }
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  // POISON PROOF — a mutation run that did not change the served bytes has proven NOTHING, and reporting
  // it as a bite would be the instrument lying. Refuse to be trusted in that state.
  if (ANY_MUT) {
    const landed = studioDiffers || sketchDiffers;
    console.log(`\nPOISON LANDED? ${landed ? 'YES' : 'NO'}   (studio bytes changed: ${studioDiffers}, sketch bytes changed: ${sketchDiffers})`);
    if (!landed) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }

  console.log('\n' + lines.join('\n'));
  const mode = ANY_MUT ? `MUTATED[${[RF && 'redfirst', NOGUARD && 'noguard', NEWROW && 'newrow', CONFIRM && 'confirm', NOCLEAR && 'noclear'].filter(Boolean).join(',')}]` : 'CLEAN';
  console.log(`\n${mode}  GREEN ${pass} / RED ${fail}`);
  if (ANY_MUT) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — mutation applied but every check still passed. The gate is blind here.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
