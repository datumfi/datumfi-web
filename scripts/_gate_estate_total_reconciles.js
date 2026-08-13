/* @gate-pool: browser
 * ^ DECLARED, never inferred. Path-resolved playwright require; the sniffer gets this right by luck
 *   and luck is not a source (see _suite_baseline.mjs §13.69). */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   STANDING INVARIANT GATE — THE ESTATE TOTAL IS THE SUM OF WHAT THE USER ACTUALLY ENTERED.
   Architect-ruled 2026-08-13. Permanent. Every future change to the first pass answers to it.

   ⭐ WHY THIS EXISTS, STATED PLAINLY. #gross-estate-val IS THE HEADLINE NUMBER OF THE PRODUCT and
   every other number on the canvas is judged against it. Before today NOTHING proved it was correct
   in general. Three narrow legs existed and all three were arithmetic accidents of gates written
   about something else:
     · _gate_estate_lien_net_equity  A1  — ONE scene: a $40k car + a $15k lien, hardcoded 25000.
     · _gate_estate_all_counted_is_drawn F6/F7 — trusts ONLY, and a HOMOGENEOUS fixture (10 or 9
       accounts, every one baseId 'trust').
     · _gate_403_hsa_rooms:162 — hardcoded '$180,000'.
   Between them they touch 4 of 71 registered base types and 4 of 10 taxCodes. NOTHING anywhere
   asserted a dollar of `pretax`, `roth`, `liquid`, `income`, `edu` or `other` reached the total —
   which is to say every 401(k), every IRA, every 457(b), every 403(b), every brokerage, every
   checking account, the pension and the 529. THE ENTIRE RETIREMENT STACK WAS UNRECONCILED.

   🔑 THE LAW THAT COMES OUT OF THAT, Architect-banked 2026-08-13 — A GATE THAT RECONCILES A NUMBER
   AS A SIDE EFFECT OF TESTING SOMETHING ELSE HAS NOT TESTED THAT NUMBER, IT HAS COINCIDED WITH IT.
   All three legs above are honest and all three still pass; not one of them was ABOUT the total, so
   not one of them grew toward the risk. Coverage that accumulates by accident concentrates wherever
   the work happened and is absent wherever it did not.

   ⛔ AND IT IS KNOWN-POISONABLE. --trustuncounted (the sibling gate) made the total read $0 WHILE
   THE PICTURE LOOKED FINE. That mutation lands on `else grandTotal += effectiveValue || 0;` — the
   one line every non-debt room in the product flows through. The same one-word edit aimed at `roth`
   instead of `trust` was, until this file existed, INVISIBLE TO THE ENTIRE SUITE.

   ── WHAT IS ASSERTED ─────────────────────────────────────────────────────────────────────────────
   #gross-estate-val === Σ over every NON-EXCLUDED account of (debt ? −value : +value), exactly, at
   full precision. `formattedTotal` is comma-grouped and never abbreviated, so this round-trips as an
   exact integer equality — no tolerance, no magnitude bucket.

   ── 🔑 THE ORACLE IS INDEPENDENT, AND THAT IS THE WHOLE DESIGN ───────────────────────────────────
   A gate that asks the page "which of these is a debt?" and then checks the page applied that answer
   is checking its own reflection. So the sign comes from a NAME-SHAPED classifier local to this file
   (DEBT_RE), derived from nothing the renderer can move. The registry's own taxCode is then read
   SEPARATELY, out of source, and the two are required to agree — leg R2. That leg is what makes a
   MISCLASSIFICATION visible: a mortgage registered as taxCode 'liquid' would ADD half a million
   dollars to a user's estate, every arithmetic leg here would still pass, and R2 is the only thing
   in the repo that would say so.

   ── 🔑 THE CENSUS IS READ FROM SOURCE, NOT HAND-MAINTAINED ───────────────────────────────────────
   rDataList is not on `window`, so scene A parses it out of studio.html and builds ONE ROOM OF EVERY
   REGISTERED TYPE. That is deliberate and it is the anti-rot property: add a 72nd base type and this
   gate builds it on the next run WITHOUT ANYONE REMEMBERING TO. A hand-listed fixture would have
   tested the 71 types that existed the day it was written and silently nothing else — which is
   precisely the failure the fixture-reach census caught three times in two days.
   ⛔ THE PARSE IS STRICT BY LAW. If the entry count and the brace count disagree the gate ABORTS
   rather than testing a subset, for the same reason `SACRED MAP UNREADABLE` stops the build: a
   parser that silently under-reads is worse than no parser, because it reports green.

   ── NEGATIVE CONTROLS — every one fails IN THE SHAPE OF THE CLAIM ────────────────────────────────
     --dropcode=<taxCode>  a whole tax class silently stops counting (default 'roth'). The picture is
                           untouched; only the number moves. THIS IS THE PREDECESSOR'S PROVEN POISON,
                           generalised off 'trust' and onto the retirement money.
     --debtadds            liabilities ADD instead of subtracting. ⛔ THE WORST ONE: it INFLATES a
                           user's net worth on a retirement product, which is the same family of harm
                           as counting a leased vehicle as an owned asset.
     --doublecount=<code>  one tax class is counted TWICE. Over-reports; distinct from --dropcode,
                           because a reuse/refactor breaks this way and not the other.
     --countexcluded       `exclude` stops being honoured, so a room the user switched OFF is back in
                           the total. The user's own instruction is ignored silently.

   ⛔ NOTE ON WHAT IS *NOT* A CONTROL HERE. "Exclude an account and check the total drops" is not a
   poison, it is scene B — correct behaviour, asserted directly. A mutation must make the product
   LIE, not make it behave.

   ── ⛔ THE HONEST BOUNDARY OF EVERY GREEN THIS FILE HANDS YOU ────────────────────────────────────
   THIS GATE PROVES WHAT THE RENDERER PUT ON SCREEN. IT PROVES NOTHING ABOUT WHAT GOT SAVED. It sees
   `studio.html` and the estate renderer and nothing else — not auth, not D1 persistence, not
   save/restore, and not what happens when a write fails halfway. A total that reconciles in the DOM
   says nothing about the bytes that reached the database, and for a retirement product that is
   where the real risk lives. Stated here so the next reader INHERITS the limit instead of
   rediscovering it, and so a green here is never quoted as more than it is.

   Usage: node scripts/_gate_estate_total_reconciles.js [LABEL]
            [--dropcode=roth] [--debtadds] [--doublecount=liquid] [--countexcluded]
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';

function argVal(name, dflt) {
  const hit = process.argv.filter((a) => a.indexOf('--' + name) === 0)[0];
  if (!hit) return null;
  const eq = hit.indexOf('=');
  return eq < 0 ? dflt : hit.slice(eq + 1);
}
const DROPCODE     = argVal('dropcode', 'roth');
const DOUBLECOUNT  = argVal('doublecount', 'liquid');
const DEBTADDS     = process.argv.includes('--debtadds');
const COUNTEXCL    = process.argv.includes('--countexcluded');
const MUT = !!(DROPCODE || DOUBLECOUNT || DEBTADDS || COUNTEXCL);

/* --dropcode and --doublecount both rewrite the SAME line. Applying both would leave the second
   mutate() unable to find its anchor and exit(1) with a confusing message, so this says so plainly.
   A rig that fails clearly is a rig; a rig that fails obscurely is a trap. */
if (DROPCODE && DOUBLECOUNT) {
  console.error('--dropcode and --doublecount rewrite the same line; run them one at a time.');
  process.exit(1);
}

const PORT = 8373;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

/* ── MUTATION ANCHORS ─────────────────────────────────────────────────────────────────────────────
   ⛔ A_EXCL IS DELIBERATELY TWO LINES. The bare `if(acc.exclude) return;` matches TWICE in
   studio.html (the second is the same statement at deeper indentation, so it matches as a
   substring), and mutate()'s exactly-one rule correctly refuses it. Anchoring on the forEach header
   above it names THE FIRST PASS specifically, which is the site this gate is about. */
const A_EXCL = 'state.accounts.forEach(acc => {\n        if(acc.exclude) return;';
const M_EXCL = 'state.accounts.forEach(acc => {\n        if(false) return;   /* exclusion ignored: --countexcluded */';
const A_DEBT = "        if (base.taxCode === 'debt') grandTotal -= effectiveValue || 0;";
const M_DEBT = "        if (base.taxCode === 'debt') grandTotal += effectiveValue || 0;   /* liabilities ADD: --debtadds */";
const A_ELSE = '        else grandTotal += effectiveValue || 0;';
const M_DROP = "        else if (base.taxCode !== '" + DROPCODE + "') grandTotal += effectiveValue || 0;   /* --dropcode=" + DROPCODE + " */";
const M_DBL  = "        else { grandTotal += effectiveValue || 0; if (base.taxCode === '" + DOUBLECOUNT + "') grandTotal += effectiveValue || 0; }   /* --doublecount=" + DOUBLECOUNT + " */";

function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(a, m);
}

/* ══ THE REGISTRY, PARSED OUT OF SOURCE ═══════════════════════════════════════════════════════════
   Strict by law (see header). The brace count and the parsed count must agree or this aborts. */
function readRegistry() {
  const src = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  const st = src.indexOf('const rDataList = [');
  const en = src.indexOf('\n    ];', st);
  if (st < 0 || en < 0) { console.error('REGISTRY UNREADABLE — rDataList bounds not found in studio.html.'); process.exit(1); }
  const blk = src.slice(st, en);
  const braces = (blk.match(/^\s*\{ id: /gm) || []).length;
  const re = /^\s*\{ id: '([a-z0-9_]+)', type: '(primary|joint|coarch)', taxCode: '([a-z_]+)'/gm;
  const out = [];
  let m;
  while ((m = re.exec(blk))) out.push({ id: m[1], type: m[2], taxCode: m[3] });
  if (out.length !== braces) {
    console.error('REGISTRY UNREADABLE — ' + braces + ' entries in rDataList but only ' + out.length +
                  ' parsed. Testing a SUBSET would report green on an untested registry. Re-ground the parser.');
    process.exit(1);
  }
  return out;
}
const REG = readRegistry();

/* THE INDEPENDENT SIGN ORACLE — shaped on the baseId NAME, deriving nothing from the registry's own
   taxCode. `auto_debt*` is a liability; `auto*` is a car. Leg R2 proves this agrees with the
   registry, which is the leg that catches a MISCLASSIFIED room. */
const DEBT_RE = /^(mortgage|heloc|auto_debt|rev_debt|personal_loan|student_loan)/;
const signOf = (baseId) => (DEBT_RE.test(baseId) ? -1 : 1);
const expectOf = (spec) => spec.reduce((t, s) => (s.exclude ? t : t + signOf(s.baseId) * s.value), 0);

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    if (COUNTEXCL)   src = mutate(src, A_EXCL, M_EXCL, 'A_EXCL');
    if (DEBTADDS)    src = mutate(src, A_DEBT, M_DEBT, 'A_DEBT');
    if (DROPCODE)    src = mutate(src, A_ELSE, M_DROP, 'A_ELSE/drop');
    if (DOUBLECOUNT) src = mutate(src, A_ELSE, M_DBL,  'A_ELSE/double');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 15000 });
  await p.waitForTimeout(400);

  /* ⛔ THE SHOCK LENS MUST BE OFF AND THAT IS ASSERTED, NOT ASSUMED. `isShocked` multiplies every
     volatile non-debt room by 0.70, so a scene that ran shocked would fail every leg below for a
     reason that is not a defect — and, worse, a scene that ran shocked while the oracle assumed it
     had not would be an instrument calibrated against the wrong product. Read it; do not trust it.
     🔑 READ THE RENDERED THING, NOT A FLAG. `isShocked` is a scoped `let` (studio.html:3965) and is
     on no global, so there is nothing to interrogate — but the renderer PAINTS the state onto the
     number the user is looking at: danger under the lens, white otherwise (datum-estate.js:2093).
     That is a stronger source than the boolean anyway, because it is the thing on screen. A blank
     declaration means the renderer never ran, so this doubles as a boot check. */
  const shockPaint = await p.evaluate(() => {
    const el = document.getElementById('gross-estate-val');
    return el ? { raw: el.style.color || '', computed: getComputedStyle(el).color } : null;
  });
  const shocked = shockPaint && shockPaint.raw ? /danger/.test(shockPaint.raw) : null;

  const probe = async (spec) => p.evaluate(async (spec) => {
    window.state.accounts.length = 0;
    const made = [];
    spec.forEach(function (s) {
      addInstance(s.baseId);
      const a = window.state.accounts[window.state.accounts.length - 1];
      a.value = s.value;
      if (s.exclude) a.exclude = true;
      made.push({ id: a.id, baseId: a.baseId, value: a.value, exclude: !!a.exclude });
    });
    updateSVGs();
    await new Promise((r) => setTimeout(r, 1100));   // updateSVGs is debounced + rAF'd
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    const num = Number(String(txt).replace(/[$,\s]/g, ''));
    const svg = document.getElementById('bp-svg');
    return {
      made: made,
      built: window.state.accounts.length,
      txt: txt,
      num: isFinite(num) && txt.trim() !== '' ? num : null,
      svgChildren: svg ? svg.childElementCount : 0,
      /* The SECOND implementation of this same arithmetic — see leg E. */
      netWorth: window._computeNetWorth ? window._computeNetWorth(window.state.accounts) : null,
    };
  }, spec);

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [COUNTEXCL ? 'countexcluded' : '', DEBTADDS ? 'debtadds' : '', DROPCODE ? 'dropcode=' + DROPCODE : '',
       DOUBLECOUNT ? 'doublecount=' + DOUBLECOUNT : ''].filter(Boolean).join(' ')
    : 'NORMAL'));
  console.log('    registry: ' + REG.length + ' base types');

  /* ── R · RIG INTEGRITY — asserted BEFORE any money leg, because every one of them depends on it ──
     🔑 A GATE MUST PROVE ITS OWN PRECONDITIONS. An oracle that has quietly stopped describing the
     product yields greens that mean nothing, and they are indistinguishable from real ones. */
  ok(shocked === false,
     'R1 [RIG] the shock lens is OFF, so a 0.70 multiplier is not silently deforming every scene — ' +
     'the total is painted ' + JSON.stringify(shockPaint) + ' (danger => shocked, blank => never rendered)');
  const byName = REG.filter((r) => DEBT_RE.test(r.id)).map((r) => r.id).sort();
  const byCode = REG.filter((r) => r.taxCode === 'debt').map((r) => r.id).sort();
  const regressed = byCode.filter((id) => byName.indexOf(id) < 0);
  const overreach = byName.filter((id) => byCode.indexOf(id) < 0);
  ok(byName.length > 0 && JSON.stringify(byName) === JSON.stringify(byCode),
     'R2 [RIG · MISCLASSIFICATION] this gate\'s independent name-oracle names EXACTLY the rooms the ' +
     'registry calls taxCode \'debt\' (' + byName.length + ' of ' + REG.length + ') — a liability ' +
     'registered as an asset would INFLATE the estate and pass every other leg here. ' +
     'registry-only: ' + JSON.stringify(regressed) + ' · oracle-only: ' + JSON.stringify(overreach));

  /* ══ SCENE A · ONE ROOM OF EVERY REGISTERED TYPE ═════════════════════════════════════════════════
     ⭐ THE POINT OF THE UNIQUE VALUES. Every room gets a distinct integer, so a DROPPED room and a
     DOUBLE-COUNTED room each move the total by an amount no other room could have produced. Round
     numbers let two errors cancel and report green; these cannot. */
  const specA = REG.map((r, i) => ({ baseId: r.id, value: 1000 * (i + 1) + 7 }));
  const A = await probe(specA);
  const wantA = expectOf(specA);
  console.log('  A ' + JSON.stringify({ built: A.built, want: wantA, got: A.num, txt: A.txt, netWorth: A.netWorth, svgChildren: A.svgChildren }));

  // PRESENCE FIRST — every leg below is about a rendered number, so a page that rendered nothing
  // must RED here rather than sail through on absence. Not inverted by any mutation.
  ok(A.svgChildren > 0, 'A0 [PRESENCE] the canvas rendered something at all');
  ok(A.num !== null,    'A0 [PRESENCE] #gross-estate-val rendered a readable number — got "' + A.txt + '"');
  /* CONTROL — THE FIXTURE ACTUALLY REACHED EVERY TYPE. Without this, scene A could quietly build 3
     rooms and its money leg would pass on a scene proving nothing about the other 68. */
  ok(A.built === REG.length,
     'A1 [CONTROL · REACH] one room of EVERY registered base type was built (' + A.built + ' of ' + REG.length + ')');
  /* ⭐⭐ THE HEADLINE. Exact integer equality against an independently-derived sum. */
  ok(A.num === wantA,
     'A2 [MONEY · ESTATE TOTAL] across all ' + REG.length + ' base types and all 10 taxCodes, ' +
     '#gross-estate-val === Σ(entered, debts negative) — got ' + A.num + ', want ' + wantA);

  /* ══ SCENE B · THE USER SWITCHED A ROOM OFF ══════════════════════════════════════════════════════
     `exclude` is the user telling us to leave money out. It is honoured by an early return that
     precedes the accumulation, so it is trivially correct today — and trivially breakable by anyone
     who moves that return. This is the leg that notices. */
  const specB = specA.map((s, i) => (i % 5 === 0 ? Object.assign({}, s, { exclude: true }) : s));
  const nExcl = specB.filter((s) => s.exclude).length;
  const B = await probe(specB);
  const wantB = expectOf(specB);
  console.log('  B ' + JSON.stringify({ excluded: nExcl, want: wantB, got: B.num, txt: B.txt }));
  ok(B.num !== null, 'B0 [PRESENCE] the total still rendered with rooms excluded');
  ok(nExcl > 0 && B.num === wantB,
     'B1 [MONEY · EXCLUDE] ' + nExcl + ' switched-off rooms are OUT of the total — got ' + B.num + ', want ' + wantB);
  /* ⛔ AND IT MUST ACTUALLY HAVE MOVED. `B.num === wantB` would pass just as happily on a build where
     `exclude` did nothing IF the oracle had the same blind spot. It does not — but asserting the
     DELTA says so out loud, and costs nothing. */
  ok(B.num !== A.num,
     'B2 [MONEY · EXCLUDE] and excluding rooms CHANGED the number (' + A.num + ' -> ' + B.num + '), so the leg above was at risk');

  /* ══ SCENE C · A REAL HOUSEHOLD ══════════════════════════════════════════════════════════════════
     ⛔ SCENE A IS AN EXTREME NOBODY LIVES IN — 71 rooms overflows every wing and fires every collapse
     door. If the total were only ever proven there, it would be proven in a configuration no user
     has. This is the ordinary case: a couple's retirement stack, a house with a mortgage, a car with
     a lien, and the trust. It is the scene the Captain smokes. */
  const specC = [
    { baseId: 'pretax401k',       value: 452300 },
    { baseId: 'rothira',          value: 118400 },
    { baseId: 'tradira',          value:  76250 },
    { baseId: 'hsa',              value:  38100 },
    { baseId: 'checking_primary', value:  12550 },
    { baseId: 'taxable',          value:  87900 },
    { baseId: 'property',         value: 640000 },
    { baseId: 'mortgage_joint',   value: 411200 },
    { baseId: 'auto',             value:  32400 },
    { baseId: 'auto_debt_joint',  value:  14650 },
    { baseId: 'trust',            value: 250000 },
    { baseId: '529plan',          value:  41800 },
  ];
  const C = await probe(specC);
  const wantC = expectOf(specC);
  console.log('  C ' + JSON.stringify({ built: C.built, want: wantC, got: C.num, txt: C.txt, netWorth: C.netWorth }));
  ok(C.built === specC.length, 'C0 [CONTROL · REACH] the household built all ' + specC.length + ' rooms (got ' + C.built + ')');
  ok(C.num === wantC,
     'C1 [MONEY · ESTATE TOTAL] the ordinary household reconciles — got ' + C.num + ', want ' + wantC +
     ' (assets ' + specC.filter((s) => signOf(s.baseId) > 0).reduce((t, s) => t + s.value, 0) +
     ' minus debts ' + specC.filter((s) => signOf(s.baseId) < 0).reduce((t, s) => t + s.value, 0) + ')');

  /* ══ SCENE D · A LIABILITY SUBTRACTS, AND BY EXACTLY ITS OWN SIZE ════════════════════════════════
     ⛔ THE SIGN IS THE MOST DANGEROUS BIT IN THIS FILE. Flipped, it does not crash and it does not
     look wrong — it QUIETLY INFLATES a retirement user's net worth, which is the same family of harm
     as counting a leased vehicle as an owned asset. Scenes A and C would catch it, but they would
     report a wrong total; this reports WHICH DIRECTION and BY HOW MUCH, in two rooms. */
  const D1 = await probe([{ baseId: 'property', value: 500000 }]);
  const D2 = await probe([{ baseId: 'property', value: 500000 }, { baseId: 'mortgage_joint', value: 180000 }]);
  console.log('  D ' + JSON.stringify({ assetOnly: D1.num, withDebt: D2.num, delta: (D2.num - D1.num) }));
  ok(D1.num === 500000, 'D1 [MONEY] the asset alone reads its own value — got ' + D1.num + ', want 500000');
  ok(D2.num === 320000, 'D2 [MONEY · SIGN] adding a $180,000 mortgage SUBTRACTS — got ' + D2.num + ', want 320000');
  ok(D2.num - D1.num === -180000,
     'D3 [MONEY · SIGN] and it moved the total by exactly minus the debt (delta ' + (D2.num - D1.num) + ', want -180000)');

  /* ══ SCENE E · TWO IMPLEMENTATIONS, ONE PROMISE ══════════════════════════════════════════════════
     ⭐ FOUND WHILE WRITING THIS GATE, AND IT IS THE REASON THE GATE GOT LONGER. `grandTotal`
     (studio.html first pass, -> #gross-estate-val) and `window._computeNetWorth` (studio.html:3915,
     -> bp.datum.net_worth on the Blueprint card) COMPUTE THE SAME QUANTITY BY DIFFERENT CODE. The
     doctrine comment above _computeNetWorth states their shared rule in one sentence: "Every non-debt
     room counts at its value ... a taxCode 'debt' room subtracts. Excluded rooms are omitted."
     Two implementations of one sentence WILL drift, and the drift surfaces as two screens quoting
     different money at the same user. Neither number is checked against the other anywhere else.
     ⛔ SCOPED HONESTLY: this asserts agreement ONLY on the un-shocked, non-negative scenes above.
     🔑 AND THE DIVERGENCE IS MEASURED, NOT DERIVED — 2026-08-13, through `window.updateValue`, the
     same function every balance field's `oninput` calls. Type "-50000" into a mortgage's balance
     beside a $500,000 house and the two screens quote money $100,000 apart:
         acc.value stored      -50000
         #gross-estate-val    $550,000    (grandTotal subtracts a negative, so the DEBT ENLARGES it)
         bp.datum.net_worth    450000     (_computeNetWorth applies Math.abs, so it subtracts)
     `updateValue` (studio.html:13490) clamps a CEILING and no floor, and `_num` (11060) deliberately
     preserves '-' where the sibling sanitiser `enforceAmt` (3255) strips it — which is why the
     ancillary money fields cannot go negative and the PRIMARY BALANCE FIELD can.
     ⛔ NOT PINNED HERE ON PURPOSE. That is a live defect awaiting an Architect ruling on the right
     behaviour (clamp at input? Math.abs in the first pass? accept and explain?), and a gate that
     froze today's behaviour would make the wrong one permanent. Flagged 2026-08-13; when it is
     ruled, the ruling gets a leg. Same for the shock lens, which _computeNetWorth ignores entirely. */
  ok(A.netWorth !== null, 'E0 [PRESENCE] _computeNetWorth is reachable and returned a number');
  ok(A.netWorth === A.num,
     'E1 [MONEY · TWO TOTALS] on the all-types scene the Blueprint net-worth scalar equals the estate ' +
     'square footage — _computeNetWorth=' + A.netWorth + ' vs #gross-estate-val=' + A.num);
  ok(C.netWorth === C.num,
     'E2 [MONEY · TWO TOTALS] and on the ordinary household — _computeNetWorth=' + C.netWorth +
     ' vs #gross-estate-val=' + C.num);

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
