'use strict';
/* _gate_boot_draft_invariant.js — STANDING GATE
 *
 * THE INVARIANT, AND IT IS DELIBERATELY NOT A SYMPTOM:
 *
 *      A BOOT WITH AN UNRESOLVED SESSION MUST NOT PERSIST A DRAFT.
 *
 * WHY AN INVARIANT AND NOT "the plan-through month must be 03/2068". The defect that produced this
 * gate showed up as a wrong DATE, but the date was downstream twice over. What actually happens is
 * this: studio.html's init runs before Clerk has answered, so the dossier read returns nothing and
 * load() builds a blueprint with plan_end_date "". finishLoad then PERSISTS that blueprint as the
 * session draft — and from that moment every later load() SHORT-CIRCUITS ON THE DRAFT and never
 * reaches applyDossier again. The user's typed 03/2068 becomes a DOB-month rebuild (08/2067)
 * PERMANENTLY, surviving reloads, because a boot-time ignorance got written down as if it were the
 * user's state.
 *   🔑 MOVING A READ LATER CAN CHANGE WHAT GETS WRITTEN, AND A WRITE OUTLIVES THE PAGE.
 *      A gate worded as "the date is right" dies the day the date stops being the symptom. A gate
 *      worded as the invariant survives every refactor of the thing it guards.
 *
 * ── HOW THE WRITES ARE OBSERVED — the population rule, applied to WRITES ──────────────────────
 * It wraps `localStorage.setItem` from an init script, BEFORE any page script runs, and records
 * every write of the draft key together with what DatumSession knew AT THAT INSTANT.
 *   ⛔ IT DELIBERATELY DOES NOT WRAP `DatumBlueprint._internal.writeSessionDraft`. That export is a
 *      DIFFERENT REFERENCE from the closure-local `writeSessionDraft` that finishLoad actually
 *      calls, so wrapping it would observe only the writes made from outside the module — i.e.
 *      nearly none of them — and report a confident, empty, GREEN result. Watching the storage API
 *      catches every writer including ones nobody has written yet.
 *   ⚠️ `DatumSession` absent is UNRESOLVED, not "signed out". nav.js loads late on studio.html
 *      (:18997), so the earliest writes happen with no predicate in the page at all. That is
 *      precisely the window this gate exists to police, so absent must read as null and never as
 *      false — the same rule that governs DatumSession.known() itself.
 *
 * LEGS
 *   I1 · THE INVARIANT — no draft write may occur while the session is UNRESOLVED
 *   I2 · PAIRED PRESENCE — a draft IS still persisted once the session IS resolved. Without this,
 *        "never write a draft at all" passes I1 perfectly and silently destroys autosave.
 *   I3 · THE CONSEQUENCE — the draft that survives boot must agree with the dossier it was built
 *        from. I1 says the wrong thing was not written down; I3 says the right thing was.
 *
 * CONTROL
 *   --defect : restores the pre-fix behaviour by neutering the guard, and I1 must go RED. Armed
 *              once the guard exists; refuses to run before that rather than passing vacuously.
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_boot_draft_invariant.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
               '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 8195;
const BASE = 'http://127.0.0.1:' + PORT;
const DEFECT = process.argv.includes('--defect');

const A_GUARD = '    if (!_draftWriteAllowed()) return false;';
const M_GUARD = '    if (false) return false;';

function armAnchor(src, anchor, replacement, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.error('CONTROL ' + label + ': expected exactly 1 anchor occurrence, found ' + n + '.');
    console.error('  The guard this control amputates does not exist yet. Refusing to run a no-op control.');
    process.exit(1);
  }
  return src.split(anchor).join(replacement);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (DEFECT && /studio-blueprint\.js$/.test(p)) {
    const src = armAnchor(fs.readFileSync(fp, 'utf8'), A_GUARD, M_GUARD, '--defect');
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(src); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

/* The dossier fixture is _p8_studio_seed_parity's payload verbatim — the same typed Plan-Through
   month (03/2068) whose loss is what put this gate here. Reusing it deliberately: if the two gates
   ever disagree about this scenario, that disagreement is itself the finding. */
const DOSSIER = {
  schema: 'DatumFIAccountDossierV15', savedAt: '2026-08-15T00:00:00.000Z',
  primary: { name: '', dateOfBirth: '08/1982', age: 43, grossIncome: 100000, targetRetirementAge: 52, targetRetirementDate: '03/2035' },
  defaults: { targetRetirementAge: 52, targetRetirementDate: '03/2035', planThroughAge: 85, planThroughDate: '03/2068', effectiveTaxRate: 0.22, defaultDatum: 90000, accessMode: 'Discover' },
  household: { profileType: 'Single', coArchitect: null },
  accounts: { currentPortfolioBalance: 500000, annualContributions: 20000 }
};

const INIT = `(function(){
  /* ⚠️ THE STUB USER CARRIES AN id, AND THE CACHE CARRIES AN OWNER STAMP. Both are what a REAL
     returning device looks like, and this fixture had neither — it went red when the dossier cache
     became owner-checked, which was the instrument correctly reporting that its fixture no longer
     resembled reality. A real Clerk user always has .id, and after a signed-in load the dossier
     cache is always stamped. Faking it any other way would make this gate pass over a state no
     user can actually be in. */
  var UID = 'user_bootdraft';
  window.Clerk = { load:function(){return Promise.resolve();},
                   user:{ id: UID, unsafeMetadata:{}, update:function(){return Promise.resolve();} },
                   addListener:function(){} };
  try { var s = JSON.stringify(${JSON.stringify(DOSSIER)});
        localStorage.setItem('datumfi.accountDossier.v15', s);
        localStorage.setItem('datumfi.accountDossier.v14', s);
        localStorage.setItem('datumfi.accountDossier.owner', UID); } catch(e) {}
  var KEY = 'datumfi_blueprint_draft_v1';
  window.__writes = [];
  var t0 = Date.now();
  var orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === KEY) {
      var known = null;
      try { known = (window.DatumSession && typeof window.DatumSession.known === 'function')
                    ? window.DatumSession.known() : null; } catch (e) { known = null; }
      var ped = null;
      try { var o = JSON.parse(v); ped = o && o.profile ? o.profile.plan_end_date : '<<no profile>>'; } catch (e) { ped = '<<unparseable>>'; }
      window.__writes.push({ ms: Date.now() - t0, known: known === null ? 'UNRESOLVED' : String(known), ped: ped });
    }
    return orig.apply(this, arguments);
  };
})();`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_boot_draft_invariant — ' + (DEFECT ? '--defect' : 'baseline') + '\n');

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => ({
    writes: window.__writes,
    booted: !!document.getElementById('pri-dob') && !!document.getElementById('sl-plan-through'),
    sessionKnown: (window.DatumSession && typeof window.DatumSession.known === 'function') ? String(window.DatumSession.known()) : 'NO DatumSession',
    storedDraftPed: (function () {
      try { var d = JSON.parse(localStorage.getItem('datumfi_blueprint_draft_v1') || 'null');
            return d && d.profile ? d.profile.plan_end_date : '<<no draft>>'; } catch (e) { return '<<unparseable>>'; }
    })()
  }));

  console.log('    ── every write of datumfi_blueprint_draft_v1, with what the page knew at that instant');
  if (!r.writes.length) console.log('       (none)');
  r.writes.forEach((w) => console.log('       t+' + String(w.ms).padStart(5) + 'ms  session=' + w.known.padEnd(10) + ' plan_end_date=' + JSON.stringify(w.ped)));
  console.log('    ── session at end: ' + r.sessionKnown + ' · stored draft plan_end_date: ' + JSON.stringify(r.storedDraftPed));

  check('I0 · the Studio booted (a gate over a blank page proves nothing)', r.booted === true);
  check('I0b · no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  const unresolved = r.writes.filter((w) => w.known === 'UNRESOLVED');
  check('I1 · THE INVARIANT — no draft persisted while the session was UNRESOLVED',
    unresolved.length === 0,
    unresolved.length ? unresolved.map((w) => 't+' + w.ms + 'ms ped=' + JSON.stringify(w.ped)).join(' · ') : '');

  const resolved = r.writes.filter((w) => w.known !== 'UNRESOLVED');
  check('I2 · PAIRED PRESENCE — a draft IS still persisted once the session resolves',
    resolved.length > 0, resolved.length + ' write(s) after resolution');

  const want = '03 / 2068';
  const got = String(r.storedDraftPed || '').replace(/\s/g, '');
  check('I3 · THE CONSEQUENCE — the surviving draft agrees with the dossier it was built from',
    got === want.replace(/\s/g, ''), 'want ' + JSON.stringify(want) + ' got ' + JSON.stringify(r.storedDraftPed));

  await ctx.close(); await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
