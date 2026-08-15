'use strict';
/* _gate_dossier_owner.js — STANDING GATE
 *
 * THE CLAIM: the Dossier shows, and pushes, ONLY the signed-in user's own profile — and it never
 * invents a value the user did not type.
 *
 * ⛔⛔ WHY THIS GATE EXISTS: THE PRIVACY GATE WENT 9 RED -> 0 GREEN WHILE THIS WAS LIVE.
 * `_gate_signed_out_privacy` drives studio.html and sketch.html. NOT ONE OF ITS LEGS OPENS
 * Dossier.html — the page that OWNS the dossier. So the ownership fix landed on every surface that
 * DISPLAYS the dossier and missed the one that WRITES it, and a full green said nothing about it.
 *   🔑 A GATE PROVES THE SURFACES IT VISITS.
 * The Captain found it in ninety seconds by switching accounts: his real profile was overwritten by
 * his test account's, server-side, and it followed him into a fresh incognito.
 *
 * ── D0 IS THE LEG THAT STOPS THIS RECURRING ──────────────────────────────────────────────────
 * We derived the localStorage key list, and we derived the page list for the SDK pin — and then we
 * HAND-PICKED the surfaces a privacy gate visits. Derived-not-enumerated on a third axis. So D0
 * DERIVES the set of tracked pages that read the dossier key and REDS if any of them is not visited
 * by a leg in this file. A page added next month that reads the dossier is covered, or this goes red.
 *
 * ── THE MECHANISM IT GUARDS (Dossier.html:3798) ──────────────────────────────────────────────
 *     var serverTime = new Date(serverDossier.savedAt || 0).getTime();
 *     var localTime  = new Date((localData && localData.savedAt) || 0).getTime();
 *     if (localTime > serverTime) { _persistPrefs(localData); ... }
 * NEWEST-WINS. It asks which copy is newer and never whose it is. That is the CORRECT design for
 * one person across devices — which is what it was built for, and it works. It is catastrophic
 * across accounts, because the comparison has no notion of identity.
 *   🔑 A FAITHFUL PIPE THAT CARRIES THE WRONG PAYLOAD IS NOT A BROKEN PIPE. The repair is a guard
 *      on the way in, not a redesign of the sync.
 *
 * ── AND THE SECOND DEFECT, WHICH IS WORSE ────────────────────────────────────────────────────
 * load() fills empty fields with a fictional person (1986-06, 1984-05, $100,000, Wesley Chapel FL,
 * primary@example.com, (555) 555-0135, $80,000) and save() writes that fiction to the account as
 * fact. The Captain did not see a formatting bug; he saw a stranger's placeholder date of birth
 * saved into his real profile.
 *   🔑 A HINT THAT LIVES IN `.value` IS DATA. Only `placeholder` is a hint.
 *
 * LEGS
 *   D0 · SURFACE COVERAGE — every tracked page that reads the dossier key is visited by a leg here
 *   D1 · PAIRED PRESENCE — Bob signed in with his OWN stored profile sees it (the fix must not
 *        simply stop the Dossier working, which would pass every absence leg below)
 *   D2 · Alice's cache on the device, Bob signed in: the form shows NONE of Alice's data
 *   D3 · ...and nothing of Alice's is PUSHED to the server for Bob (the corruption, not the leak)
 *   D4 · NO FABRICATED VALUES — a signed-in user with an empty profile sees EMPTY fields, never an
 *        invented person
 *   D5 · the hints live in `placeholder`, never in `.value`
 *
 * CONTROLS
 *   --rawread  : restore the unguarded readLocal -> D2/D3 red, D1 green (a working page serving the
 *                WRONG PERSON, which is the shape of the defect — not a broken page)
 *   --defaults : restore the fabricated values -> D4 red only
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_dossier_owner.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const PORT = 8207;
const BASE = 'http://127.0.0.1:' + PORT;
const RAWREAD  = process.argv.includes('--rawread');
const DEFAULTS = process.argv.includes('--defaults');

/* The pages this file actually drives. D0 compares it against the DERIVED set. */
const VISITED = ['Dossier.html'];

const A_READ = "    if (!_dossierOwned()) return null;";
const M_READ = "    if (false) return null;";
/* --defaults restores TWO of the fabrications (the pair the Captain actually saw). Two, not
   one: a single-anchor poison would prove the matcher works on one field and say nothing
   about whether D4 scans the others. */
const A_DEF1 = "p.contact?.email||''";
const M_DEF1 = "p.contact?.email||'primary@example.com'";
const A_DEF2 = "p.household?.coArchitect?.dateOfBirth||''";
const M_DEF2 = "p.household?.coArchitect?.dateOfBirth||'1984-05'";

function armAnchor(src, anchor, replacement, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.error('CONTROL ' + label + ': expected exactly 1 anchor occurrence, found ' + n + '.');
    console.error('  The guard this control amputates does not exist yet. Refusing to run a no-op control.');
    process.exit(1);
  }
  return src.split(anchor).join(replacement);
}

let SERVER_DOSSIER = null;   // the D1 preferences/dossier row, per test
let PUSHED = [];             // everything writePreferences sent

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
  if (p === '/__srv') {
    if (req.method === 'POST') {
      let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { PUSHED.push(JSON.parse(b || 'null')); } catch (e) {} res.writeHead(200); res.end('{}'); });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(SERVER_DOSSIER)); return;
  }
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  /* The D1 stub is SERVED AS the module — an init-script stub is replaced by the page's own
     <script src>, which is how an earlier gate reported a product failure that was a fixture fault. */
  if (/(^|\/)datum-d1\.js$/.test(p)) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`(function(g){
      function srv(){ try { var x=new XMLHttpRequest(); x.open('GET','/__srv',false); x.send(); return JSON.parse(x.responseText||'null'); } catch(e){ return null; } }
      g.DatumD1 = {
        CUTOVER: true, TYPES: ['blueprint','sketchbook','preferences','studio'],
        signedIn: function(){ return !!(g.Clerk && g.Clerk.user); },
        getDoc: function(t,k){
          if (t === 'preferences' && k === 'dossier') { var d = srv(); return Promise.resolve(d ? { payload: JSON.stringify(d) } : null); }
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
        /* prefsMirrorNeeded IS NOT OPTIONAL: _persistPrefs calls it, and a stub without it THREW,
           which silently aborted the push and left D3 asserting over zero events. A STUB MISSING A
           METHOD THE CODE CALLS DESCRIBES AN API THAT DOES NOT EXIST. Same semantics as the real
           one: the Clerk mirror is only needed when rolled back or signed out. */
        prefsMirrorNeeded: function(){ return this.CUTOVER === false || !this.signedIn(); },
        setRevision: function(){}, knownRevision: function(){ return null; },
        drain: function(){ return Promise.resolve(); },
        onState: function(){ return {}; }, getState: function(){ return {}; }
      };
    }(window));`);
    return;
  }
  if ((RAWREAD || DEFAULTS) && /(^|\/)Dossier\.html$/.test(p)) {
    let src = fs.readFileSync(fp, 'utf8');
    if (RAWREAD)  src = armAnchor(src, A_READ, M_READ, '--rawread');
    if (DEFAULTS) { src = armAnchor(src, A_DEF1, M_DEF1, '--defaults/email');
                    src = armAnchor(src, A_DEF2, M_DEF2, '--defaults/spouseDob'); }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(src); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

const ALICE = { schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-15T23:00:00.000Z', title: 'ALICE',
  primary: { name: 'Alice Aardvark', dateOfBirth: '1979-03', grossIncome: 314159, targetRetirementAge: 58 },
  household: { profileType: 'Single', filingStatus: 'Single', location: 'FL', coArchitect: null },
  defaults: { effectiveTaxRate: 0.27, planThroughAge: 88, defaultDatum: 271828, accessMode: 'Design' },
  contact: { email: 'alice.aardvark@example.com', phone: '(555) 010-1111' }, accounts: {} };

const BOB = { schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-10T01:00:00.000Z', title: 'BOB',
  primary: { name: 'Bob Bobson', dateOfBirth: '1992-09', grossIncome: 88888, targetRetirementAge: 67 },
  household: { profileType: 'Single', filingStatus: 'Single', location: 'TX', coArchitect: null },
  defaults: { effectiveTaxRate: 0.12, planThroughAge: 95, defaultDatum: 55555, accessMode: 'Discover' },
  contact: { email: 'bob.bobson@example.com', phone: '(555) 010-2222' }, accounts: {} };

/* Alice's savedAt is DELIBERATELY NEWER than Bob's server row. That is the exact condition the
   newest-wins comparison needs to prefer the local copy — a fixture where Bob's row is newer would
   pass without the fix and prove nothing. A FIXTURE THAT CANNOT REACH THE FAILING STATE TURNS A
   CONTROL INTO A REASSURANCE. */
const ALICE_FX = ['1979', 'Aardvark', '314,159', '314159', 'alice.aardvark@example.com', '010-1111', '271828'];
const FABRICATED = ['1986-06', '06 / 1986', '1984-05', '05 / 1984', 'Wesley Chapel',
                    'primary@example.com', '(555) 555-0135', 'Co-Architect', 'Primary Architect'];

function clerkStub(uid) {
  return `(() => { try {
    window.Clerk = {
      load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('tok'); } },
      user: { id: ${JSON.stringify(uid)}, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' },
              unsafeMetadata: {}, update: function(){ return Promise.resolve(); } },
      addListener: function(){}, signOut: function(){ return Promise.resolve(); }
    };
  } catch(e){} })();`;
}

const READ_FORM = `(() => {
  const g = (id) => { const e = document.getElementById(id); return e ? (e.value === undefined ? e.textContent : e.value) : null; };
  const ph = (id) => { const e = document.getElementById(id); return e ? (e.getAttribute('placeholder') || '') : null; };
  return {
    _booted: !!document.getElementById('dob') && !!document.getElementById('salary'),
    primaryName: g('primaryName'), dob: g('dob'), salary: g('salary'), retireAge: g('retireAge'),
    planThrough: g('planThrough'), datumDefault: g('datumDefault'), location: g('location'),
    email: g('email'), phone: g('phone'),
    spouseName: g('spouseName'), spouseDob: g('spouseDob'), spouseIncome: g('spouseIncome'),
    _ph: { dob: ph('dob'), salary: ph('salary'), location: ph('location'), email: ph('email'), phone: ph('phone'), spouseDob: ph('spouseDob') }
  };
})()`;

function hits(form, needles) {
  const out = [];
  Object.keys(form).forEach((k) => {
    if (k.charAt(0) === '_') return;
    const v = form[k] == null ? '' : String(form[k]);
    if (!v) return;
    needles.forEach((n) => { if (v.indexOf(n) >= 0) out.push(k + '=' + JSON.stringify(v) + ' [' + n + ']'); });
  });
  return out;
}

async function open(browser, uid, seedLocal) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  await ctx.addInitScript(clerkStub(uid));
  const page = await ctx.newPage();
  /* SEEDED ONCE, on a cheap same-origin page, NEVER as an init script: Playwright re-runs init
     scripts on every navigation, which would re-arm the very cache these legs test. */
  await page.goto(BASE + '/404.html', { waitUntil: 'commit' });
  if (seedLocal) await page.evaluate(seedLocal);
  await page.goto(BASE + '/Dossier.html', { waitUntil: 'load' });
  await page.waitForTimeout(4200);
  return { ctx, page };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_dossier_owner — ' + ([RAWREAD && '--rawread', DEFAULTS && '--defaults'].filter(Boolean).join(' ') || 'baseline') + '\n');

  /* ── D0 · SURFACE COVERAGE, DERIVED ── */
  let readers = [];
  try {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 26 }).toString('utf8').split('\0').filter(Boolean);
    readers = files.filter((f) => /\.html$/i.test(f) && !/^dist\//.test(f))
      .filter((f) => { try { return /accountDossier\.v1[45]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return false; } });
  } catch (e) { console.error('D0 population unavailable: ' + e.message); }
  /* studio.html and sketch.html are covered by _gate_signed_out_privacy; this leg is about pages
     NOTHING visits. Naming the other gate is the forwarding address a narrowed claim needs. */
  const COVERED_ELSEWHERE = ['studio.html', 'sketch.html'];
  const unvisited = readers.filter((f) => VISITED.indexOf(f) < 0 && COVERED_ELSEWHERE.indexOf(f) < 0);
  console.log('    ── pages that read the dossier key: ' + readers.join(', '));
  check('D0 · SURFACE COVERAGE — every page that reads the dossier key is visited by a gate',
    readers.length > 0 && unvisited.length === 0, unvisited.length ? 'UNVISITED: ' + unvisited.join(', ') : '');

  /* ── D1 · PAIRED PRESENCE — Bob sees his OWN profile ── */
  SERVER_DOSSIER = BOB; PUSHED = [];
  {
    const { ctx, page } = await open(browser, 'user_bob', null);
    const f = await page.evaluate(READ_FORM);
    check('D1a · the Dossier booted', f._booted === true);
    check('D1b · PAIRED PRESENCE — Bob signed in sees his OWN stored profile',
      String(f.dob).indexOf('1992') >= 0 && String(f.salary).indexOf('88,888') >= 0,
      'dob=' + f.dob + ' salary=' + f.salary);
    await ctx.close();
  }

  /* ── D2/D3 · Alice's cache on the device, Bob signed in ── */
  SERVER_DOSSIER = BOB; PUSHED = [];
  {
    const seed = `(() => { try {
      localStorage.setItem('datumfi.accountDossier.v15', ${JSON.stringify(JSON.stringify(ALICE))});
      localStorage.setItem('datumfi.accountDossier.v14', ${JSON.stringify(JSON.stringify(ALICE))});
      localStorage.setItem('datumfi.accountDossier.owner', 'user_alice');
    } catch(e){} })();`;
    const { ctx, page } = await open(browser, 'user_bob', seed);
    const f = await page.evaluate(READ_FORM);
    const shown = hits(f, ALICE_FX);
    check('D2 · the form shows NONE of Alice\'s data while Bob is signed in', shown.length === 0, shown.join(' · '));
    const pushedStr = JSON.stringify(PUSHED);
    const leaked = ALICE_FX.filter((n) => pushedStr.indexOf(n) >= 0);
    /* D3b IS AN ABSENCE ASSERTION AND ZERO PUSHES SATISFIES IT PERFECTLY — it reported
       "0 push(es), clean" on the first run and would have gone green over a page that never
       reaches the push path at all. Its paired presence is D3c BELOW rather than here, because
       once the guard is in place NO PUSH IS THE CORRECT OUTCOME IN THIS SCENARIO: Alice's cache is
       rejected, so there is nothing local to push. Demanding a push here would demand the defect.
         🔑 A PAIRED-PRESENCE LEG MUST LIVE WHERE THE PRESENCE IS CORRECT, NOT NEXT TO THE ABSENCE
            IT BALANCES. */
    check('D3b · and nothing of Alice\'s was PUSHED to the server for Bob (the corruption, not the leak)',
      leaked.length === 0, leaked.length ? 'pushed: ' + leaked.join(',') : (PUSHED.length + ' push(es), clean'));
    await ctx.close();
  }

  /* ── D3c · THE PUSH PATH IS ALIVE, AND THE GUARD DID NOT KILL LEGITIMATE SYNCING ─────────────
   * Bob signed in, his OWN stamped local copy, and NO server row yet — the returning-device case
   * where pushing local up to the server is exactly right. If the owner guard were too strict (say
   * it rejected every cache, or the stamp were never written), this goes red and D2/D3b would be
   * green for the WRONG REASON: a Dossier that syncs nothing leaks nothing. */
  SERVER_DOSSIER = null; PUSHED = [];
  {
    const seed = `(() => { try {
      localStorage.setItem('datumfi.accountDossier.v15', ${JSON.stringify(JSON.stringify(BOB))});
      localStorage.setItem('datumfi.accountDossier.v14', ${JSON.stringify(JSON.stringify(BOB))});
      localStorage.setItem('datumfi.accountDossier.owner', 'user_bob');
    } catch(e){} })();`;
    const { ctx, page } = await open(browser, 'user_bob', seed);
    const pushedStr = JSON.stringify(PUSHED);
    check('D3c · PAIRED PRESENCE — the signed-in user OWN local copy still pushes to the server',
      PUSHED.length > 0 && pushedStr.indexOf('Bobson') >= 0,
      PUSHED.length + ' push(es); carries Bob: ' + (pushedStr.indexOf('Bobson') >= 0));
    await ctx.close();
  }

  /* ── D4/D5 · a signed-in user with a PARTIAL profile ─────────────────────────────────────────
   * ⛔ NOT an EMPTY one. load() returns early when there is no payload at all, so an empty fixture
   * never reaches the `||` fallbacks and D4 passed over a state that cannot fail — measured on the
   * first run of this gate. The Captain's 1984-05 came from a profile that EXISTED and had no
   * co-architect: `p.household?.coArchitect?.dateOfBirth || '1984-05'`.
   *   🔑 A FIXTURE THAT CANNOT REACH THE FAILING STATE TURNS A CONTROL INTO A REASSURANCE.
   * So the fixture is a real profile missing exactly the fields the fabrications fill: no
   * co-architect, no contact details, no location. */
  SERVER_DOSSIER = { schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-12T00:00:00.000Z', title: 'PARTIAL',
    primary: { name: 'Nia Real', dateOfBirth: '1990-02', grossIncome: 123456, targetRetirementAge: 61 },
    household: { profileType: 'Single', filingStatus: 'Single', coArchitect: null },
    defaults: { planThroughAge: 90, defaultDatum: 60000 }, contact: {}, accounts: {} };
  PUSHED = [];
  {
    const { ctx, page } = await open(browser, 'user_new', null);
    const f = await page.evaluate(READ_FORM);
    const invented = hits(f, FABRICATED);
    check('D4 · NO FABRICATED VALUES — an empty profile shows EMPTY fields, never an invented person',
      invented.length === 0, invented.join(' · '));
    const phs = f._ph || {};
    const anyPh = Object.keys(phs).filter((k) => phs[k]);
    check('D5 · the hints live in `placeholder`, never in `.value`',
      anyPh.length >= 4, 'placeholders present on: ' + anyPh.join(',') || 'none');
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
