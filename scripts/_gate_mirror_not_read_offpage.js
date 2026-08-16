'use strict';
/* _gate_mirror_not_read_offpage.js — STANDING GATE  (Finding 2, closed by deletion)
 *
 * THE CLAIM: a page that cannot reach D1 does not touch the estate stores at all — and a page that
 * CAN reach D1 still restores from it.
 * ⚠️ NOT CLAIMED: that D1 BEATS a local copy. That is §51.3, and it is an OPEN CONFLICT — see the
 *    note where G3 would have been.
 *
 * ⛔⛔ THE DEFECT, RULED 2026-08-13 AND MEASURED 2026-08-15. `nav.js` runs on every page. On the 22
 * tracked pages that never load `datum-d1.js`, `window.DatumD1` is undefined, so both restore legs
 * fell through to the Clerk MIRROR and seeded localStorage from it — while making ZERO D1 calls,
 * because those pages cannot reach D1 at all. Then `local cache wins` made the NEXT capable page
 * skip its D1 restore entirely. Measured end to end with a control: one hop through `privacy.html`
 * turned a sketchbook that restored `999999 FRESH` from D1 into `111111 STALE` from the frozen
 * mirror, on BOTH keys — same account, same D1, same destination page.
 *   ⭐⭐ THE MIRROR WAS NEVER MISBEHAVING. IT WAS BEING CALLED SOMEWHERE IT WAS NEVER NEEDED. The
 *      pages in question — privacy, terms, dsar, 404, pricing, methodology — do not render a
 *      blueprint, a sketch or a single account. A PAGE THAT DOES NOT RENDER ESTATE DATA HAS NO
 *      BUSINESS RESTORING IT.
 *   🔑 SO IT WAS CLOSED BY DELETION, NOT REPAIR. No guard was written, because the bucket of pages
 *      that need the data AND cannot reach D1 turned out to be EMPTY: 18 pages where nothing but
 *      nav.js touched the stores, and 4 where studio-blueprint.js did — and those 4 were unreachable
 *      orphans, deleted. DO NOT TEACH A COMPONENT TO BEHAVE BETTER WHEN THE PLAN IS TO REMOVE IT.
 *
 * ── HOW THE POPULATION AND THE VERDICT ARE OBTAINED ─────────────────────────────────────────────
 * ⭐ THE METHOD IS THE FINDING. An earlier attempt compared the RENDERED TEXT of each page with and
 * without a seeded mirror. It flagged index.html as DIFFERS — and then its own control, two loads
 * with the SAME empty mirror, ALSO DIFFERED ($118,450 vs $120,000), because the homepage animates
 * its counters. It would have reported a data leak on the front door that does not exist.
 *   🔑🔑 A CONTROL THAT DIFFERS FROM ITSELF INVALIDATES EVERY VERDICT THE INSTRUMENT PRODUCES,
 *        INCLUDING THE ONES THAT LOOK RIGHT. And that was a false POSITIVE — rarer and more
 *        expensive to chase than the false greens this suite usually hunts.
 * So this gate watches the DATA PATH, not the paint: it wraps `Storage.prototype.getItem` before any
 * page script runs and records every read of a blueprint/sketchbook key. Immune to animation,
 * layout and timing, because a read is a read whatever the page is drawing.
 * ⭐ POPULATION DERIVED FROM THE REAL <script src> GRAPH, never a grep for `src="/nav.js"`. That grep
 *   missed `sketchv2.html`, which loaded `https://datumfi.com/nav.js` — an absolute production URL —
 *   and the whole arc was planned against 21 pages when there were 22.
 *
 * LEGS
 *   G0 · THE POPULATION IS REAL — derived, non-empty, and every member genuinely lacks datum-d1.js.
 *        Without this the gate passes vacuously the day the parser breaks.
 *   G1 · ZERO reads of the estate stores on every page in that population.
 *   G2 · PAIRED PRESENCE — a CAPABLE page still restores from D1. "Never restore anything" satisfies
 *        G1 perfectly and would be a catastrophe.
 *   (no G3 — §51.3 was implemented, measured working, then BACKED OUT: it turned the two MISS-5
 *        DATA-LOSS gates red. The gates were not edited. Awaiting a ruling.)
 *   G4 · an UNREACHABLE D1 does NOT wipe a local copy. Kept because it is true and worth holding
 *        under EITHER resolution of the §51.3 conflict — whichever way precedence is ruled, "a
 *        network failure must not destroy the user's archive" survives it.
 *
 * CONTROL · --ungate  serves nav.js with the `if (!window.DatumD1)` early return removed, restoring
 *        the shipped-until-2026-08-15 behaviour. G1 MUST go red. Without it this gate cannot tell
 *        "the restore is correctly skipped" from "the fixture never signed anybody in".
 *
 * @gate-pool: browser
 * Run: node scripts/_gate_mirror_not_read_offpage.js [--ungate]      (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path'); const vm = require('vm');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const PORT = 8269;
const BASE = 'http://127.0.0.1:' + PORT;
const UNGATE = process.argv.includes('--ungate');

/* The exact line the fix turns on. If it ever moves, the control ABORTS rather than silently
   testing nothing — a red-first that did not land proves nothing. */
const GATE_LINE = 'if (!window.DatumD1) { done(); return; }';

const CAPABLE = 'sketch.html';   // loads datum-d1.js

/* ── population, from the real script graph ─────────────────────────────────────────────────── */
const srcsOf = (html) => { const o = []; const re = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi; let m;
  while ((m = re.exec(html))) o.push(m[1]); return o; };
const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean);
const EXPOSED = tracked.filter((rel) => {
  let s; try { s = srcsOf(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { return false; }
  return s.some((x) => /(^|\/)nav\.js(\?|$)/.test(x)) && !s.some((x) => /datum-d1\.js/.test(x));
});

/* ── the stale mirror, built with the product's own codec ───────────────────────────────────── */
const sandbox = { console: console }; sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['scripts/lz-string.min.js', 'scripts/datum-archive-codec.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const Codec = sandbox.DatumArchiveCodec;
const sketchbook_z = Codec.encodeSketchbook({ sketchbook_title: 'MIRROR', slot_1: { age: 41, portfolio_mass: 111111 }, slot_2: null, slot_3: null, slot_4: null });
const blueprint_z = Codec.encodeBlueprintArchive({ slot1: { portfolio_total: 111111, accounts: [{ id: 's', name: 'M', value: 1 }] }, slot2: null, slot3: null, slot4: null });

const FRESH_BOOK = { age: 77, portfolio_mass: 999999 };
const FRESH_BP = { portfolio_total: 999999, accounts: [{ id: 'f', name: 'F', value: 9 }] };
const STALE_LOCAL_BOOK = { sketchbook_title: 'STALE-LOCAL', slot_1: { age: 41, portfolio_mass: 111111 }, slot_2: null, slot_3: null, slot_4: null };
const STALE_LOCAL_ARCH = { slot1: { portfolio_total: 111111, accounts: [{ id: 's', name: 'S', value: 1 }] }, slot2: null, slot3: null, slot4: null, activeBlueprintSlot: 1 };

let D1_UP = true;
let NAV_SRC = fs.readFileSync(path.join(ROOT, 'nav.js'), 'utf8');
if (UNGATE) {
  const n = NAV_SRC.split(GATE_LINE).length - 1;
  if (n !== 1) { console.log('ABORT — --ungate anchor found ' + n + 'x in nav.js, expected 1. A red-first that did not land proves nothing.'); process.exit(2); }
  NAV_SRC = NAV_SRC.replace(GATE_LINE, '/* ungated by --ungate */');
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/documents') {
    if (!D1_UP) { res.writeHead(503); res.end('down'); return; }
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    const type = q.get('type');
    if (req.method !== 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return; }
    let body;
    if (q.get('list')) body = (type === 'sketchbook' || type === 'blueprint')
      ? { documents: [{ doc_key: 'active', updated_at: '2026-08-15T00:00:00.000Z' }] } : { documents: [] };
    else if (type === 'sketchbook') body = { payload: JSON.stringify(FRESH_BOOK) };
    else if (type === 'blueprint') body = { payload: JSON.stringify(FRESH_BP) };
    else { res.writeHead(404); res.end('{}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); return;
  }
  if (/^\/nav\.js$/.test(url)) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(NAV_SRC); return; }
  let p = decodeURIComponent(url); if (p === '/') p = '/index.html';
  const fp = path.resolve(ROOT, '.' + p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

const watcher = (seedLocal) => `(() => { try {
  window.__reads = [];
  var KEY = /sketchbook|blueprint/i;
  var orig = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { if (KEY.test(k)) window.__reads.push(k); return orig.apply(this, arguments); };
  window.Clerk = { load: function(){ return Promise.resolve(); },
    session: { getToken: function(){ return Promise.resolve('tok'); } },
    user: { id: 'u', firstName: 'A', primaryEmailAddress: { emailAddress: 'a@a.co' },
            unsafeMetadata: { sketchbook_z: ${JSON.stringify(sketchbook_z)}, blueprint_z: ${JSON.stringify(blueprint_z)} },
            update: function(){ return Promise.resolve(); } },
    addListener: function(){}, signOut: function(){ return Promise.resolve(); } };
  localStorage.setItem('datum_privacy_ok','1');
  ${seedLocal ? `localStorage.setItem('datumfi_sketchbook_v1', ${JSON.stringify(JSON.stringify(STALE_LOCAL_BOOK))});
  localStorage.setItem('datumfi_blueprint_archive_v1', ${JSON.stringify(JSON.stringify(STALE_LOCAL_ARCH))});` : ''}
} catch(e){} })();`;

/* ⛔⛔ THE READ COUNT IS SNAPSHOTTED **BEFORE** THIS PROBE TOUCHES localStorage, AND THAT ORDERING IS
   THE WHOLE CORRECTNESS OF G1.
   The first cut computed the two values first and reported `reads` last — so its own
   getItem('datumfi_sketchbook_v1') and getItem('datumfi_blueprint_archive_v1') were caught by the
   wrapper it had installed, and EVERY page reported exactly 2 reads. G1 went red across all 17 on a
   product that was reading nothing: verified separately at 12 SECONDS with zero reads.
   🔑 THE INSTRUMENT WAS COUNTING ITSELF. A probe that observes by doing the very thing it is
      counting will report a floor it created — and the number was CONSISTENT, which is exactly what
      a real defect looks like. Same family as the fixture that re-arms the state under test: the
      measurement became a second actor. */
const READ = `(() => {
  const reads = (window.__reads || []).length;
  const j = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } };
  const b = j('datumfi_sketchbook_v1'), a = j('datumfi_blueprint_archive_v1');
  return { reads: reads,
           bookMass: b && b.slot_1 ? b.slot_1.portfolio_mass : null,
           archTotal: a && a.slot1 ? a.slot1.portfolio_total : null,
           bookPresent: b !== null, archPresent: a !== null };
})()`;

async function visit(browser, page, seedLocal) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route('**/*', (r) => { const u = r.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|posthog|beacon|cloudflareinsights/i.test(u)) return r.abort();
    return r.continue(); });
  await ctx.addInitScript(watcher(seedLocal));
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/' + page, { waitUntil: 'load' });
  await pg.waitForTimeout(3800);
  const out = await pg.evaluate(READ);
  await ctx.close();
  return out;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_mirror_not_read_offpage' + (UNGATE ? '  [--ungate CONTROL]' : '') + '\n');

  /* G0 */
  const capableHtml = fs.readFileSync(path.join(ROOT, CAPABLE), 'utf8');
  const capableOk = srcsOf(capableHtml).some((x) => /datum-d1\.js/.test(x));
  check('G0 · THE POPULATION IS REAL — derived, non-empty, and the capable page really is capable',
    EXPOSED.length > 0 && capableOk,
    EXPOSED.length + ' exposed page(s); ' + CAPABLE + ' loads datum-d1.js: ' + capableOk);

  /* G1 */
  D1_UP = true;
  const noisy = [];
  for (const rel of EXPOSED) {
    const r = await visit(browser, rel, false);
    if (r.reads > 0) noisy.push(rel + '(' + r.reads + ')');
  }
  check('G1 · ZERO estate-store reads on every page that cannot reach D1',
    noisy.length === 0,
    noisy.length ? noisy.join(', ') : 'all ' + EXPOSED.length + ' clean');

  /* G2 */
  const cap = await visit(browser, CAPABLE, false);
  check('G2 · PAIRED PRESENCE — a capable page still restores from D1',
    cap.bookMass === 999999 && cap.archTotal === 999999,
    'book=' + cap.bookMass + ' arch=' + cap.archTotal);

  /* ⚠️⚠️ THERE IS NO G3, AND THE GAP IS DELIBERATE — READ THIS BEFORE ADDING ONE.
     §51.3 cache precedence ("a capable page prefers D1 over an undated local copy") was implemented,
     MEASURED WORKING — D1 beat a stale local copy 999999 over 111111, and an unreachable D1 did not
     wipe it — and then BACKED OUT the same night. It turned _gate_miss5_blueprint_persist and
     _gate_miss5_sketchbook_persist RED: both assert that a POPULATED LOCAL COPY IS LEFT ALONE even
     when D1 holds a NEWER row. Those are the MISS-5 DATA-LOSS gates.
     ⛔ THE GATES WERE NOT EDITED TO FIT. A check that contradicts a change is evidence, not an
     obstacle — and "update the assertion" would have deleted the protection instead of satisfying it.
     🔑 BOTH POSITIONS ARE DEFENSIBLE, WHICH IS WHY IT IS NOT THE WIRER'S CALL: prefer-the-server
        protects against a stale or foreign local copy; leave-the-local-copy protects a user whose
        last save never reached D1. The likely resolution is NEITHER blanket rule but NEWEST-WINS on a
        real timestamp. Awaiting a ruling. */

  /* G4 — retained because it is true and worth holding under EITHER resolution. */
  D1_UP = false;
  const outage = await visit(browser, CAPABLE, true);
  D1_UP = true;
  check('G4 · ...and an UNREACHABLE D1 does not wipe that local copy',
    outage.bookPresent && outage.archPresent && outage.bookMass === 111111 && outage.archTotal === 111111,
    'present book=' + outage.bookPresent + ' arch=' + outage.archPresent + '; book=' + outage.bookMass + ' arch=' + outage.archTotal);

  await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
