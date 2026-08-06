'use strict';
/* @gate-pool: browser
 * ^ §13.69 — DECLARED, not inferred. This launches a real Chromium via
 *   require(ROOT + '/node_modules/playwright'), which the runner's old bare-specifier sniff could
 *   not see, so it ran 6-wide in the NODE pool instead of serially in the browser pool. */
/* ROUTE GATE — §18.1 RENTAL FIELDS + §19 ROOM NAMES MUST SURVIVE A SAVE AND A RELOAD.
 *
 * WHY THIS GATE EXISTS. §18.1 (the rental field cluster) and §19 (the purpose-aware room name) are
 * both LIVE, both smoked on screen, and NOTHING had ever verified that either survives a round trip.
 * Every gate that touches them reads source strings or drives a single page load. The highest-cost
 * failure class we have — a value the user typed, saved, and came back to find gone — had no
 * instrument at all. This is the cheapest test of it.
 *
 * IT IS A ROUTE GATE, WHICH IS THE POINT (§13.65). 195 gates were green, hash-verified and published
 * when the Captain found three defects in ten minutes of clicking, because almost every gate READS
 * SOURCE or EXTRACTS FUNCTIONS and almost none DRIVES THE PAGE. Adding another string-reader does not
 * shrink that gap. This is the second of the route class, after the §19 purpose walk.
 *
 * ⛔ IT DRIVES THE REAL CONTROLS — the modal <select> and the modal <input>s — NEVER updateAccField()
 * bare. That distinction is not pedantry: the first cut of the §19 probe drove the bare function, a
 * real code path but NOT the user's, and it invented a defect that did not exist (§13.64). It also
 * means THE AUTOSAVE IS NOT SIMULATED. Typing into the real inputs fires the app's own document-
 * delegated saveDraft on its own 400ms debounce, exactly as it does for a user. We wait it out and
 * reload. Nothing here calls a save function by hand, so nothing here can pass because we called it.
 *
 * WHAT IT ASSERTS, IN TWO HALVES:
 *   RT-A  BEFORE the reload — the fixture really reached the state we are about to test. A round-trip
 *         gate whose fixture silently failed to set anything would find "nothing before, nothing
 *         after", compare equal, and report GREEN. EXCLUSION NEEDS PRESENCE: empty == empty is a NULL
 *         RESULT and must RED.
 *   RT-B  AFTER the reload — the four §18.1 values are back ON THE MODEL, back IN THEIR OWN INPUTS
 *         (the §13.59 RAW reader — a retained value no surface can display is indistinguishable from
 *         a destroyed one), and the §19 names still resolve on both surfaces with the door intact.
 *
 * MUTATIONS (each must bite, or the corresponding green is worthless):
 *   --rawblind   _propRentalFieldsHTML stops re-rendering the persisted rent into its own input.
 *                This is the EXACT §13.59 harm: the value is retained but invisible, so switching
 *                away and back reads as deletion. The RT-B input legs must RED while the model legs
 *                stay green — that split is the whole reason there are two named readers.
 *   --dropfields captureDOM stops carrying accounts, so nothing at all survives the reload. The
 *                blunt control: proves the gate can tell a round trip from a blank page.
 *
 * Run: node scripts/_gate_property_roundtrip.js [--rawblind|--dropfields]
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(ROOT + '/node_modules/playwright');

const RAWBLIND   = process.argv.includes('--rawblind');
const DROPFIELDS = process.argv.includes('--dropfields');
const MUT = RAWBLIND || DROPFIELDS;

/* PORT DISCIPLINE — 8361, the next free port above the 8360 high-water mark, checked before claiming.
   NEVER 8001: that is the suite runner's shared server and self-hosting on it killed _gate_room_picker
   inside every suite run for seven commits while it scored 42/0 alone. */
const PORT = 8361;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';

/* ── ANCHORS — if the structure moved, FAIL LOUD rather than silently testing nothing ───────────── */
const A_RAW = 'value="${v(acc.rentMonthly)}" oninput="updateAccField(\'${id}\', \'rentMonthly\', this.value)"';
const M_RAW = 'oninput="updateAccField(\'${id}\', \'rentMonthly\', this.value)"';   /* value= dropped: --rawblind */
const A_CAP = 'bp.accounts = _incoming.slice();';
const M_CAP = '/* accounts not carried: --dropfields */';

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml',
  '.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };

function mutate(src, a, m, label) {
  if (src.indexOf(a) === -1) throw new Error('anchor missing (' + label + ') — structure moved, re-true this gate');
  return src.split(a).join(m);
}

const server = http.createServer((req, res) => {
  const rp = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, rp === '/' ? 'index.html' : rp.replace(/^[\\/]+/, ''));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404).end('404'); return; }
  let body = fs.readFileSync(fp);
  if (RAWBLIND && /studio\.html$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_RAW, M_RAW, 'A_RAW'), 'utf8');
  }
  if (DROPFIELDS && /studio-blueprint\.js$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_CAP, M_CAP, 'A_CAP'), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

/* The four §18.1 values the round trip carries. Deliberately NOT round numbers and deliberately not
   all the same shape: two money-ish, one integer percent, one decimal percent, one enum. A fixture
   where every field holds the same value cannot tell you WHICH field was dropped. */
const WANT = { rentMonthly: '3600', vacancyPct: '8', mgmtPct: '7.5', isRented: 'Yes' };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message));
  await p.goto(URL, { waitUntil: 'networkidle' });

  /* ── build the fixture: one property with a value, one mortgage linked to it ─────────────────── */
  const propId = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property_primary');
    const prop = window.state.accounts[window.state.accounts.length - 1];
    prop.value = 500000; prop.propTaxYr = 6000; prop.homeInsYr = 1800;
    addInstance('mortgage_joint');
    const mort = window.state.accounts[window.state.accounts.length - 1];
    mort.value = 200000; mort.minPmt = 1400; mort.linkedAssetId = prop.id;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 900));
    return prop.id;
  });

  /* ── drive the USER'S controls: open the modal, pick Rental, type into the four fields ───────── */
  const typed = await p.evaluate(async ([id, want]) => {
    const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
    openAccountModal(id);
    const sel = document.querySelector('select[onchange*="propPurpose"]');
    if (!sel) return { err: 'no propPurpose select — the modal did not open on a property' };
    sel.value = 'Rental property'; fire(sel, 'change');
    await new Promise((r) => setTimeout(r, 700));
    /* the rental cluster is revealed only now; find each control by the field it writes */
    const got = {};
    for (const f of ['rentMonthly', 'vacancyPct', 'mgmtPct']) {
      const el = document.querySelector('input[oninput*="' + f + '"]');
      if (!el) { got[f] = null; continue; }
      el.value = want[f]; fire(el, 'input'); got[f] = el.value;
    }
    const rs = document.querySelector('select[onchange*="isRented"]');
    if (rs) { rs.value = want.isRented; fire(rs, 'change'); got.isRented = rs.value; }
    /* the app's own debounced autosave is 400ms — outwait it, do NOT call save by hand */
    await new Promise((r) => setTimeout(r, 1600));
    return { got };
  }, [propId, WANT]);

  console.log('-------------------------------------');
  if (typed.err) { console.log('FIXTURE FAILED: ' + typed.err); fail++; }

  /* ── RT-A · PRESENCE BEFORE THE TRIP. empty == empty is a NULL RESULT and must RED. ──────────── */
  const before = await p.evaluate((id) => {
    const a = window.state.accounts.find((x) => x.id === id);
    const svg = document.getElementById('bp-svg');
    return {
      model: a ? { rentMonthly: String(a.rentMonthly ?? ''), vacancyPct: String(a.vacancyPct ?? ''),
                   mgmtPct: String(a.mgmtPct ?? ''), isRented: String(a.isRented ?? ''),
                   propPurpose: String(a.propPurpose ?? '') } : null,
      titles: svg ? Array.prototype.map.call(svg.querySelectorAll('.grounds-title, .bp-title'), (e) => e.textContent.trim()) : [],
    };
  }, propId);
  console.log('  RT-A before: ' + JSON.stringify(before));
  ok(!!before.model, 'RT-A [PRESENCE] the fixture property exists on the model before the reload');
  for (const f of Object.keys(WANT)) {
    ok(before.model && before.model[f] === WANT[f],
       'RT-A [PRESENCE] ' + f + ' really reached the model before the trip — want "' + WANT[f] +
       '", got "' + (before.model ? before.model[f] : '(no account)') + '"');
  }
  ok(before.titles.indexOf('THE HOLDING') !== -1,
     'RT-A [PRESENCE] the canvas names the merged room THE HOLDING before the reload (got ' + JSON.stringify(before.titles) + ')');

  /* ── THE TRIP. A real reload of a real URL — same origin, so localStorage carries as it does for
        a user pressing Ctrl+Shift+R. Nothing is re-seeded on the far side. ─────────────────────── */
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => new Promise((r) => setTimeout(r, 2500)));

  /* ── RT-B · WHAT CAME BACK ────────────────────────────────────────────────────────────────────
     THREE COLUMNS, because a value can survive in one and not the others and each failure is a
     different bug: the MODEL (did it persist at all), the INPUT (can the surface that owns the field
     still show it — §13.59), and the NAMES (does §19 still resolve after a cold boot). */
  const after = await p.evaluate(async () => {
    /* ⚠️ ONE SHAPE ON EVERY PATH. The first cut returned a bare { model: null } when the property was
       gone, and the legs below then threw on `after.titles.indexOf` — so --dropfields CRASHED instead
       of reporting RED. It still exited non-zero, so the suite would have called it red for the wrong
       reason and every remaining leg would have been lost. A CRASH IS NOT A RED: a red names the
       assertion that failed, and a gate that dies halfway through reports a number nobody can read
       (§ "a red count is not a red list"). Found by this gate's own negative control, which is the
       only reason it was found at all. */
    const EMPTY = { model: null, inputs: {}, list: '(no card)', titles: [], door: false, nProps: 0 };
    const props = window.state.accounts.filter((a) => window._isPropertyBase && window._isPropertyBase({ id: a.baseId }));
    const a = props.find((x) => x.propPurpose === 'Rental property') || props[0];
    if (!a) return EMPTY;
    openAccountModal(a.id);
    await new Promise((r) => setTimeout(r, 700));
    const inputs = {};
    for (const f of ['rentMonthly', 'vacancyPct', 'mgmtPct']) {
      const el = document.querySelector('input[oninput*="' + f + '"]');
      inputs[f] = el ? el.value : null;
    }
    const rs = document.querySelector('select[onchange*="isRented"]');
    inputs.isRented = rs ? rs.value : null;
    const svg = document.getElementById('bp-svg');
    let list = '(no card)';
    const vi = document.getElementById('room-val-inp-' + a.id);
    if (vi) for (let n = vi.parentElement, i = 0; n && i < 4; n = n.parentElement, i++) {
      const m = n.querySelector && n.querySelector('.room-meta'); if (m) { list = m.textContent.trim(); break; }
    }
    return {
      model: { rentMonthly: String(a.rentMonthly ?? ''), vacancyPct: String(a.vacancyPct ?? ''),
               mgmtPct: String(a.mgmtPct ?? ''), isRented: String(a.isRented ?? ''),
               propPurpose: String(a.propPurpose ?? '') },
      inputs, list,
      titles: svg ? Array.prototype.map.call(svg.querySelectorAll('.grounds-title, .bp-title'), (e) => e.textContent.trim()) : [],
      door: !!(svg && svg.querySelector("[onclick*='openYardModal']")),
      nProps: props.length,
    };
  });
  console.log('-------------------------------------');
  console.log('  RT-B after:  ' + JSON.stringify(after));

  ok(!!after.model, 'RT-B [SURVIVAL] the property still exists after the reload');
  ok(after.model && after.model.propPurpose === 'Rental property',
     'RT-B [SURVIVAL] propPurpose survived the trip — want "Rental property", got "' + (after.model ? after.model.propPurpose : '—') + '"');
  for (const f of Object.keys(WANT)) {
    ok(after.model && after.model[f] === WANT[f],
       'RT-B [MODEL] ' + f + ' survived the round trip — want "' + WANT[f] + '", got "' +
       (after.model ? after.model[f] : '—') + '"');
  }
  /* §13.59 — the surface that OWNS the field must see it RAW. A value that persisted but cannot be
     redisplayed is indistinguishable from one that was destroyed, which is the whole harm. */
  for (const f of Object.keys(WANT)) {
    ok(after.inputs && after.inputs[f] === WANT[f],
       'RT-B [INPUT] §13.59 the field\'s own control redisplays ' + f + ' after the trip — want "' +
       WANT[f] + '", got "' + (after.inputs ? after.inputs[f] : '—') + '"');
  }
  ok(after.list === 'The Rental',
     'RT-B [LIST] the left card still reads "The Rental" after a cold boot (got "' + after.list + '") — §19.1');
  ok(after.titles.indexOf('THE HOLDING') !== -1,
     'RT-B [CANVAS] the merged tile still names itself THE HOLDING after a cold boot (got ' +
     JSON.stringify(after.titles) + ') — §12.1');
  ok(after.door, 'RT-B [DOOR] the combined room is still reachable from the canvas after the trip — §19.13');

  console.log('-------------------------------------');
  if (MUT) {
    console.log('MUTATION: ' + (RAWBLIND ? '--rawblind (expect the RT-B INPUT legs RED, MODEL legs GREEN)'
                                         : '--dropfields (expect RT-B broadly RED)'));
  }
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
