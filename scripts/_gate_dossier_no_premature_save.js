'use strict';
/* _gate_dossier_no_premature_save.js — STANDING GATE
 *
 * THE CLAIM: the Dossier cannot be saved before it knows what it holds.
 *
 * ⛔⛔ THE GAP. Dossier.html reveals <body> as soon as CLERK confirms a session, and wires the Save
 * button at parse time — but the dossier itself arrives later, from the D1 preferences row via
 * _resolveDossier. Between those two moments the form is VISIBLE, INTERACTIVE and EMPTY. A Save in
 * that window posts a form of blanks over a populated server row, and the write path is faithful:
 * it stores exactly what it was shown.
 *   🔑 THE READY SIGNAL AND THE RESOLVED SIGNAL ARE NOT THE SAME SIGNAL. This is the fourth member
 *      of that family today — the half-second profile beat, the boot seed, the paper race, and this.
 *      Ready means "the page can be looked at"; resolved means "the page knows what it holds".
 *   🔑 A FORM THAT POSTS EVERY FIELD IT RENDERS IS ASSERTING THINGS IT WAS NEVER TOLD. The fabricated
 *      defaults invented a VALUE; a premature save invents an ABSENCE. Both write a claim the user
 *      did not make, and this one is the more destructive because a blank overwrites.
 *
 * ── WHY BLOCK RATHER THAN PATCH THE PAYLOAD ─────────────────────────────────────────────────
 * Ruled, and it is the smaller change: a control that fires and then repairs itself is a SECOND
 * WRITE NOBODY ASKED FOR. A DISABLED CONTROL IS AN HONEST STATE.
 *
 * LEGS
 *   P0 · THE GAP IS REAL IN THIS FIXTURE — the resolver is deliberately slow, and the page is
 *        interactive before it settles. Without this the legs below prove nothing: if the resolver
 *        settled instantly there would be no window to test and every assertion would pass.
 *   P1 · a Save clicked DURING the gap writes NOTHING to the server
 *   P2 · ...and the control is visibly disabled, not silently inert. A control that looks live and
 *        does nothing is worse than one that is plainly unavailable — the user cannot tell a
 *        no-op from a failure.
 *   P3 · PAIRED PRESENCE — once the resolver settles, Save works and DOES write. "Never save"
 *        satisfies P1 and P2 perfectly.
 *   P4 · ...and what it writes is the RESOLVED profile, not the blanks that were on screen during
 *        the gap (the defect end-to-end, not just its trigger).
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_dossier_no_premature_save.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const PORT = 8215;
const BASE = 'http://127.0.0.1:' + PORT;

/* The resolver is held for this long so the gap is a real, observable window rather than a race the
   gate hopes to win. THE FIXTURE MUST REACH THE FAILING STATE OR THE CONTROL IS A REASSURANCE. */
const RESOLVE_DELAY_MS = 2500;
/* Architect-authored, verbatim. Asserted byte-exact rather than by keyword: a paraphrase is a
   different sentence, and copy drift is invisible to a substring match. */
const NOTE = "Loading your dossier — saving is off for a moment so nothing overwrites what's already there.";

let SERVER = null;      // the D1 preferences/dossier row
let PUSHED = [];        // everything writePreferences sent

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
  if (p === '/__srv') {
    if (req.method === 'POST') {
      let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { PUSHED.push(JSON.parse(b || 'null')); } catch (e) {} res.writeHead(200); res.end('{}'); });
      return;
    }
    /* Held deliberately — this IS the gap. */
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(SERVER));
    }, RESOLVE_DELAY_MS);
    return;
  }
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (/(^|\/)datum-d1\.js$/.test(p)) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`(function(g){
      g.DatumD1 = {
        CUTOVER: true, TYPES: ['blueprint','sketchbook','preferences','studio'],
        signedIn: function(){ return !!(g.Clerk && g.Clerk.user); },
        prefsMirrorNeeded: function(){ return this.CUTOVER === false || !this.signedIn(); },
        getDoc: function(t,k){
          if (t === 'preferences' && k === 'dossier') {
            return fetch('/__srv').then(function(r){ return r.json(); })
              .then(function(d){ return d ? { payload: JSON.stringify(d) } : null; });
          }
          return Promise.resolve(null);
        },
        listDocs: function(){ return Promise.resolve([]); },
        deleteDoc: function(){ return Promise.resolve({ok:true}); },
        putDoc: function(){ return Promise.resolve({ok:true}); },
        writeNow: function(){ return Promise.resolve({ok:true}); },
        scheduleWrite: function(){},
        writePreferences: function(prefs){
          try { var x=new XMLHttpRequest(); x.open('POST','/__srv',false); x.send(JSON.stringify(prefs||{})); } catch(e){}
        },
        setRevision: function(){}, knownRevision: function(){ return null; },
        drain: function(){ return Promise.resolve(); },
        onState: function(){ return {}; }, getState: function(){ return {}; }
      };
    }(window));`);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

const REAL = { schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-10T00:00:00.000Z', title: 'REAL',
  primary: { name: 'Nia Real', dateOfBirth: '1990-02', grossIncome: 123456, targetRetirementAge: 61 },
  household: { profileType: 'Single', filingStatus: 'Single', coArchitect: null },
  defaults: { planThroughAge: 90, defaultDatum: 60000, effectiveTaxRate: 0.22 },
  contact: { email: 'nia.real@example.com', phone: '(555) 010-7777' }, accounts: {} };

const READ = `(() => {
  const b = document.getElementById('saveProfile');
  const g = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
  return {
    btn: !!b,
    disabled: !!(b && (b.disabled || b.getAttribute('aria-disabled') === 'true')),
    bodyVisible: !!document.body && getComputedStyle(document.body).visibility !== 'hidden',
    note: (() => { const n = document.getElementById('dossier-resolving-note'); return n ? n.textContent.trim() : null; })(),
    dob: g('dob'), salary: g('salary'), email: g('email')
  };
})()`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_dossier_no_premature_save\n');

  SERVER = REAL; PUSHED = [];
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(`(() => { try {
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('t'); } },
      user: { id: 'user_gap', firstName: 'N', primaryEmailAddress: { emailAddress: 'n@n.co' },
              unsafeMetadata: {}, update: function(){ return Promise.resolve(); } },
      addListener: function(){}, signOut: function(){ return Promise.resolve(); } };
  } catch(e){} })();`);
  const page = await ctx.newPage();
  await page.goto(BASE + '/Dossier.html', { waitUntil: 'commit' });

  /* Sample INSIDE the gap: the body is revealed (Clerk confirmed) but the dossier has not landed. */
  await page.waitForTimeout(1200);
  const during = await page.evaluate(READ);
  check('P0 · THE GAP IS REAL — the page is interactive before the dossier resolves',
    during.btn === true && during.bodyVisible === true && !during.dob,
    'body visible=' + during.bodyVisible + ' dob=' + JSON.stringify(during.dob));

  const beforeClicks = PUSHED.length;
  await page.evaluate(() => { const b = document.getElementById('saveProfile'); if (b) b.click(); });
  await page.waitForTimeout(400);
  check('P1 · a Save clicked DURING the gap writes NOTHING to the server',
    PUSHED.length === beforeClicks, PUSHED.length - beforeClicks + ' push(es) during the gap');
  check('P2 · ...and the control is visibly disabled, not silently inert',
    during.disabled === true, 'disabled=' + during.disabled);
  /* A disabled control with no explanation is the honest blank that reads as broken. The note is
     part of the guard, not decoration, so it is asserted BYTE-EXACT — the copy is authored and a
     paraphrase is a different sentence. */
  check('P2b · ...and the resolving note explains it, byte-exact',
    during.note === NOTE, JSON.stringify(during.note));

  /* Now let it settle. */
  await page.waitForTimeout(RESOLVE_DELAY_MS + 2500);
  const after = await page.evaluate(READ);
  check('P3 · PAIRED PRESENCE — once resolved, the form holds the real profile and Save is enabled',
    !!after.dob && after.disabled === false,
    'dob=' + JSON.stringify(after.dob) + ' disabled=' + after.disabled);
  /* A MESSAGE THAT OUTLIVES ITS CONDITION IS NOISE. Asserting it GOES is the half that stops the
     note becoming permanent furniture the day the resolve signal moves. */
  check('P3b · ...and the resolving note is GONE, with no residue',
    after.note === null, JSON.stringify(after.note));

  const beforeReal = PUSHED.length;
  await page.evaluate(() => { const b = document.getElementById('saveProfile'); if (b) b.click(); });
  await page.waitForTimeout(600);
  const wrote = JSON.stringify(PUSHED.slice(beforeReal));
  check('P4 · ...and what it writes is the RESOLVED profile, not the blanks from the gap',
    PUSHED.length > beforeReal && wrote.indexOf('Nia Real') >= 0,
    (PUSHED.length - beforeReal) + ' push(es); carries the real profile: ' + (wrote.indexOf('Nia Real') >= 0));

  await ctx.close(); await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
