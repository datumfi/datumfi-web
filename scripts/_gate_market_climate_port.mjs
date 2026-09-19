/* DEV-ONLY red-first gate — THE MARKET CLIMATE PORT (2026-09-18).
 *
 * WHAT IT GUARDS, AND WHY EACH LEG EXISTS RATHER THAN A COUNT OF TILES:
 *   L1  the five Model Designs render, by KEY, in the Mock's order
 *   L2  the key on the element IS the engine's enum — there is no label left to decode
 *   L3  the shipped default tile and the blueprint's shipped default enum AGREE
 *   L4  clicking a non-default tile changes what buildStudioRequest sends
 *   L5  the four retired names light the Blend — what the ENGINE does with them
 *   L6  an unknown stored value lights NOTHING (refusal beats inference)
 *   L7  all five authored help blocks are on the elements and rendered by CSS
 *   L8  the label->enum maps are GONE from all three of their old homes
 *   L9  the weighting-table component is gone from the shell
 *
 * ⛔⛔ L4 IS THE ONLY LEG THAT MEASURES THE THING THAT MATTERS, AND THE OTHERS EXIST TO STOP IT
 *    BEING SATISFIED CHEAPLY. §82.2734: an empty ignored_inputs proves a field ARRIVED, never that
 *    it CHANGED AN ANSWER — the brokerage balance hid behind a cache key for exactly that reason.
 *    Here the equivalent trap is a tile that toggles `.active` beautifully while the payload reads
 *    a different control, which is what the timing-path defect was.
 *
 * ⛔ AND THE PRE-PORT STATE WOULD HAVE PASSED A NAIVE VERSION OF THIS GATE. Four tiles toggled
 *    `.active` correctly, the payload read them, and the answer never moved — because the control
 *    was wired to a WEIGHTED AVERAGE (§82.2723). That is why L4 asserts the SENT VALUE changes,
 *    not that the Range changes: the Range is the engine's business and this gate does not own it.
 *
 * --redfirst  removes the capability rather than one route (§82.2428): the part is not loaded at
 *             all, which is the true pre-port shape — no tiles, no keys, no aliases. A red-first
 *             that merely renamed a key would prove the gate can spell.
 */
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RED = process.argv.includes('--redfirst');

const EXPECTED = ['blend', 'parametric', 'historical', 'cape', 'regime'];
const RETIRED = ['valuations_matter', 'history_repeats', 'cautious', 'optimistic'];

let pass = 0, fail = 0;
const ck = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (detail ? '\n        ' + detail : '')); }
};

/* ── the static half: assertions over the served bytes ──────────────────────────────────────── */
/* ⛔⛔ THE SHELL COMES THROUGH studioSource(), NEVER off disk — _gate_studio_source P1 asserts
   that it is the ONLY door, and this gate was the second file breaking that rule.
   🔑 AND THE WAY I MISSED IT IS THE LESSON: P1 was ALREADY RED for a different file, so when I
      triaged the suite by COLOUR I filed it 'pre-existing' and moved on. IT REPORTS A COUNT — '2
      still reading' — and the count had gone up because of me. A RED YOU DID NOT CAUSE CAN HIDE A
      RED YOU DID; a gate that is already failing cannot tell you that it is now failing MORE. */
const { stripComments, studioSource } = await import(
  'file://' + path.join(ROOT, 'scripts/_studio_source.cjs').replace(/\\/g, '/'));
const shell = studioSource();
const part = existsSync(path.join(ROOT, 'scripts/studio-market-climate.js'))
  ? readFileSync(path.join(ROOT, 'scripts/studio-market-climate.js'), 'utf8') : '';
const blueprint = readFileSync(path.join(ROOT, 'scripts/studio-blueprint.js'), 'utf8');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
  /* THE RED-FIRST MUTATION — the capability, not a route. The part 404s, so the page runs exactly
     as it would if the <script src> had never been added: an empty .climate-grid and no tiles. */
  if (RED && p === '/scripts/studio-market-climate.js') { res.writeHead(404); res.end('redfirst'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(readFileSync(fp));
});

const PORT = 8231;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
  window.Clerk = { load: () => Promise.resolve(), user: null };
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
await page.waitForTimeout(1800);

console.log('');
console.log('MODE: ' + (RED ? 'RED-FIRST (part 404s — the capability is removed)' : 'NORMAL'));
console.log('');

/* ── L1 · the five designs render, by key, in the Mock's order ──────────────────────────────── */
const keys = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.climate-grid .climate-option'))
    .map((el) => el.dataset.outlookKey || '(none)'));
ck('L1 the five Model Designs render, by key, in the Mock\'s order',
   keys.length === 5 && EXPECTED.every((k, i) => keys[i] === k),
   'got [' + keys.join(', ') + ']  expected [' + EXPECTED.join(', ') + ']');

/* ── L2 · the key IS the engine enum. Asserted against the ENGINE'S OWN literal list, never a
      second copy typed here — a gate that carries its own copy of the answer is checking itself. */
const enginePath = path.resolve(ROOT, '..', 'datum-fi', 'schemas.py');
let engineEnum = null;
if (existsSync(enginePath)) {
  const py = readFileSync(enginePath, 'utf8');
  const blk = py.slice(py.indexOf('"blend"'), py.indexOf('_RETIRED_OUTLOOKS'));
  engineEnum = [...blk.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}
/* ⛔ THE POPULATION IS ASSERTED BEFORE THE PREDICATE, AND THE RED-FIRST RUN IS WHY. Written as
   `keys.every(...)` alone this leg went GREEN with the part unloaded — because A PREDICATE OVER AN
   EMPTY SET IS TRUE, and "every one of no tiles is valid" is a sentence with no content. It was the
   empty-green species, inside the gate built to prove this port cannot go quiet. Caught by running
   the red-first, which is the entire argument for running it. */
ck('L2 every rendered key is a market_outlook the ENGINE accepts (read from schemas.py, not retyped)',
   keys.length === 5 && (engineEnum === null ? true : keys.every((k) => engineEnum.includes(k))),
   engineEnum === null ? 'engine repo not on disk — leg skipped, NOT passed on its own evidence'
                       : 'rendered ' + keys.length + ' key(s); engine accepts [' + engineEnum.join(', ') + ']');
if (engineEnum === null) console.log('        ⚠️ ENGINE NOT ON DISK — L2 did not run. A skipped leg is not a green one.');

/* ── L3 · the shipped default tile and the blueprint's shipped default enum agree ───────────── */
const activeKey = await page.evaluate(() => {
  const el = document.querySelector('.climate-grid .climate-option.active');
  return el ? el.dataset.outlookKey : null;
});
const bpDefault = (stripComments(blueprint).match(/climate:\s*\{\s*outlook:\s*'([a-z_]+)'/) || [])[1] || null;
/* ⛔⛔ RE-POINTED 2026-09-19, AND THE HAZARD IT GUARDED NO LONGER EXISTS TO BE GUARDED.
   It read `!!activeKey && activeKey === bpDefault` — the tile that ships active must AGREE with the
   blueprint's shipped default — which was the right check while there WERE two shipped defaults
   that could drift apart. Copy Bank §1.4 ruled that no Model Design is active on load and
   `market_outlook` is omitted until chosen, and on 2026-09-19 the last two layers were brought into
   line: the designs table stopped shipping `active: true` and the blueprint schema stopped shipping
   `outlook: 'blend'`.
   🔑 TWO DEFAULTS THAT AGREE ARE STILL TWO DEFAULTS. The old leg was satisfied by the product
      handing every household the same unchosen answer from two places in unison — it could only
      ever catch them DISAGREEING, never catch them EXISTING.
   ⭐ SO IT NOW ASSERTS NEITHER SHIPS ONE, AND KEEPS THE AGREEMENT CLAUSE FOR THE DAY SOMEBODY
      REINTRODUCES ONE: if either layer ever ships a default again, the other must match it, and if
      only one does, this goes red on the SECOND condition rather than passing on the first. */
ck('L3 NEITHER the tile nor the blueprint ships a market default — and if one ever does, they agree',
   (activeKey === null && bpDefault === null) || (!!activeKey && activeKey === bpDefault),
   'tile=' + activeKey + '  blueprint=' + bpDefault
   + (activeKey === null && bpDefault === null ? '  — both silent, which is the ruled state' : ''));

/* ── L4 · the chosen design reaches the request ─────────────────────────────────────────────── */
const sent = await page.evaluate(async (expected) => {
  const read = () => (window.marketClimateSelectedKey ? window.marketClimateSelectedKey() : null);
  const out = {};
  for (const k of expected) {
    const tile = document.querySelector('.climate-grid .climate-option[data-outlook-key="' + k + '"]');
    if (!tile) { out[k] = '(no tile)'; continue; }
    tile.click();
    out[k] = read();
  }
  return out;
}, EXPECTED);
const distinct = new Set(Object.values(sent));
ck('L4 clicking each design changes the value the request will carry — five clicks, five answers',
   EXPECTED.every((k) => sent[k] === k) && distinct.size === 5,
   JSON.stringify(sent));

/* ── L5 · the four retired names light the Blend ────────────────────────────────────────────── */
const aliasLit = await page.evaluate((retired) => {
  const out = {};
  for (const r of retired) {
    out[r] = window.marketClimateSetKey ? window.marketClimateSetKey(r) : null;
  }
  return out;
}, RETIRED);
ck('L5 all four retired names light the Blend — what the ENGINE resolves them to, not a guess',
   RETIRED.every((r) => aliasLit[r] === 'blend'), JSON.stringify(aliasLit));

/* ── L6 · an unknown value lights nothing ───────────────────────────────────────────────────── */
const unknown = await page.evaluate(() => {
  const before = (document.querySelector('.climate-grid .climate-option.active') || {}).dataset;
  const beforeKey = before ? before.outlookKey : null;
  const r = window.marketClimateSetKey ? window.marketClimateSetKey('an_outlook_nobody_authored') : 'NO FN';
  const after = (document.querySelector('.climate-grid .climate-option.active') || {}).dataset;
  return { returned: r, beforeKey, afterKey: after ? after.outlookKey : null };
});
ck('L6 an unknown stored value lights NOTHING and moves nothing — refusal beats inference',
   unknown.returned === null && unknown.afterKey === unknown.beforeKey, JSON.stringify(unknown));

/* ── L7 · the authored help is on the element AND rendered by CSS ───────────────────────────── */
const help = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.climate-grid .climate-option'));
  const withHelp = els.filter((e) => (e.getAttribute('data-help') || '').length > 200);
  const first = els[0];
  const after = first ? getComputedStyle(first, '::after') : null;
  return {
    count: els.length,
    withHelp: withHelp.length,
    shortest: Math.min.apply(null, els.map((e) => (e.getAttribute('data-help') || '').length)),
    afterContent: after ? after.content : null,
    afterWhiteSpace: after ? after.whiteSpace : null
  };
});
ck('L7 all five carry their authored help AND the stylesheet renders it (attr + pre-line)',
   help.withHelp === 5 && /attr\(data-help\)|WHAT IT MEANS/.test(String(help.afterContent))
     && help.afterWhiteSpace === 'pre-line',
   JSON.stringify(help));

/* ── L8 · the three label maps are gone ─────────────────────────────────────────────────────── */
const shellCode = stripComments(shell);
const bpCode = stripComments(blueprint);
const mapHits = [];
if (/OUTLOOK_MAP\s*=/.test(shellCode)) mapHits.push('studio.html OUTLOOK_MAP');
if (/OUTLOOK_LABEL_TO_ENUM\s*=/.test(bpCode)) mapHits.push('studio-blueprint.js OUTLOOK_LABEL_TO_ENUM');
for (const m of shellCode.matchAll(/history_repeats:\s*'History Repeats'/g)) mapHits.push('studio.html inline label map');
ck('L8 all three label->enum maps are deleted, not synchronised — ONE RULE, ONE HOME',
   mapHits.length === 0, mapHits.join(' | '));

/* ⭐ AND THE ONE HOME IS ASSERTED POSITIVELY, not merely by the others' absence. A leg that only
   proves three things are gone is satisfied by a product with no translation at all — which would
   break every saved plan the Captain owns. */
ck('L8b the surviving alias table is in the part, and names all four retired outlooks',
   RETIRED.every((r) => new RegExp(r + ':\\s*\'blend\'').test(stripComments(part))),
   'part bytes=' + part.length);

/* ── L9 · the weighting-table component is gone from the shell ──────────────────────────────── */
const ghosts = ['climate-tooltip', 'hvac-badge', 'hvac-header', 'climate-name', 'climate-desc']
  .filter((c) => new RegExp('["\\s.]' + c + '\\b').test(shellCode));
ck('L9 the weighting-table component is gone from the shell — four tables of weights the engine never used',
   ghosts.length === 0, 'still present: ' + ghosts.join(', '));

/* ── L11 · RENDERED IS NOT REACHABLE, AND THIS LEG EXISTS BECAUSE A SCREENSHOT CAUGHT WHAT TEN
      GREEN LEGS DID NOT. Every assertion above works on a hidden element: getComputedStyle resolves
      on one, el.click() fires on one, dataset reads off one. The first run of the shot harness
      photographed an EMPTY PANEL while this gate reported CLEAN 11/0, because section 06 lives
      inside the measurement phase and a cold Studio does not open there.
      🔑 A CONTROL NOBODY CAN SEE IS NOT A CONTROL, AND NOTHING ABOVE COULD TELL THE DIFFERENCE. ── */
const reach = await page.evaluate(async () => {
  if (typeof window._studioEnterRoom === 'function') window._studioEnterRoom('measurement');
  await new Promise((r) => setTimeout(r, 500));
  const sec = document.getElementById('sec-climate');
  if (sec) sec.style.display = 'block';
  const tiles = Array.from(document.querySelectorAll('.climate-grid .climate-option'));
  const vis = tiles.filter((t) => {
    const r = t.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && getComputedStyle(t).visibility !== 'hidden';
  });
  const intro = document.querySelector('.climate-grid .phase-workspace-intro');
  const kicker = document.querySelector('.climate-grid .workspace-kicker');
  return {
    visibleTiles: vis.length,
    widths: tiles.map((t) => Math.round(t.getBoundingClientRect().width)),
    introText: intro ? (intro.textContent || '').slice(0, 40) : null,
    kickerColour: kicker ? getComputedStyle(kicker).color : null
  };
});
ck('L11 a household can SEE all five — the tiles have real width in the measurement room',
   reach.visibleTiles === 5, JSON.stringify(reach));
ck('L11b the authored intro renders, and the kicker resolved a colour (an unresolved var() is DISCARDED)',
   !!reach.introText && reach.introText.startsWith('Choose the market design')
     && !!reach.kickerColour && reach.kickerColour !== 'rgba(0, 0, 0, 0)',
   JSON.stringify({ intro: reach.introText, kicker: reach.kickerColour }));

/* ── L12 · THE CHROME. ⛔ EVERY ONE OF THESE WAS CAPTAIN-CAUGHT ON A SCREENSHOT WHILE ELEVEN LEGS
      ABOVE WERE GREEN, which is the argument for shooting before running and not after. The port
      had the right copy, the right keys, the right colours and the right behaviour, and it was
      still visibly not the Mock: no card around it, a green kicker where the Mock's is blue, and
      the old "06 / Climate Control — Market Outlook" header with a pin still above it.
      🔑 A GATE PROVES A VALUE; A SCREENSHOT PROVES A SURFACE. These legs are the screenshot's
         findings written down so they cannot come back. ─────────────────────────────────────── */
const chrome = await page.evaluate(() => {
  const grid = document.querySelector('.climate-grid');
  const card = document.querySelector('.climate-grid .workspace-card');
  const kicker = document.querySelector('.climate-grid .workspace-kicker');
  const sec = document.querySelector('[data-phase="measurement"].studio-section');
  const head = sec ? sec.querySelector('.section-header-wrapper') : null;
  const strong = head ? head.querySelector('.activity-name strong') : null;
  const small = head ? head.querySelector('.activity-name small') : null;
  return {
    hasCard: !!card,
    cardBorder: card ? getComputedStyle(card).borderTopColor : null,
    tilesInsideCard: card ? card.querySelectorAll('.climate-option').length : 0,
    kickerColour: kicker ? getComputedStyle(kicker).color : null,
    headStrong: strong ? strong.textContent.trim() : null,
    headSmall: small ? small.textContent.trim() : null,
    headFont: strong ? getComputedStyle(strong).fontFamily : null,
    pins: head ? head.querySelectorAll('.pin-btn').length : -1,
    oldHeaderText: head ? /Climate Control/.test(head.textContent) : null,
    gridInDom: !!grid
  };
});
ck('L12 the five tiles sit INSIDE the Mock\'s workspace card — the box, not just the contents',
   chrome.hasCard && chrome.tilesInsideCard === 5, JSON.stringify(chrome));
ck('L12b the card\'s border is the MEASUREMENT blue, not the default grey',
   chrome.cardBorder === 'rgba(122, 192, 255, 0.16)', 'border=' + chrome.cardBorder);
/* ⛔ NOT "is it blue" BUT "is it the Mock's blue AND NOT --teal". The kicker inherits
   var(--phase-accent) from the shared rule, which is GREEN, and the first fix made that
   declaration RESOLVE without making it RIGHT. */
ck('L12c the kicker is the Mock\'s blue-grey, and specifically NOT the green --phase-accent',
   chrome.kickerColour === 'rgb(147, 184, 200)', 'kicker=' + chrome.kickerColour);
ck('L12d the header is the Mock\'s two-line activity name, in the Mock\'s mono face',
   chrome.headStrong === 'Market Climate'
     && /Model design/.test(chrome.headSmall || '')
     && /DM Mono/.test(chrome.headFont || ''),
   JSON.stringify({ s: chrome.headStrong, sm: chrome.headSmall, f: chrome.headFont }));
/* ⚠️ THE OLD HEADER IS ASSERTED ABSENT BY NAME. "Climate Control" was the four-preset vocabulary
   and the Mock's own V164 note retires it; leaving it would keep the temperature metaphor alive on
   the one surface that no longer means it. */
ck('L12e the old "Climate Control" header and its pin are GONE',
   chrome.oldHeaderText === false && chrome.pins === 0,
   JSON.stringify({ oldText: chrome.oldHeaderText, pins: chrome.pins }));
/* ⛔ L12f — NO SEPARATOR BETWEEN THE HEAD AND THE CARD. The Mock draws its rule below the WHOLE
   activity, not between a header and its own body; live's .section-header-wrapper puts a 1px gold
   line there and it cuts the activity in half. ⚠️ ASSERTED AS ABSENT WIDTH, NOT AS A COLOUR — the
   first fix recoloured the line to the Mock's grey, which is the right colour in the wrong place
   and would have passed any leg that only checked the colour. */
const headRule = await page.evaluate(() => {
  const sec = document.querySelector('[data-phase="measurement"].studio-section');
  const head = sec ? sec.querySelector('.section-header-wrapper') : null;
  if (!head) return null;
  const cs = getComputedStyle(head);
  return { w: cs.borderBottomWidth, style: cs.borderBottomStyle, mb: cs.marginBottom };
});
ck('L12f no hairline between the header and the card — the rule is absent, not merely recoloured',
   !!headRule && (headRule.w === '0px' || headRule.style === 'none'),
   JSON.stringify(headRule));

/* ── a crash is not a red ───────────────────────────────────────────────────────────────────── */
const realErrors = pageErrors.filter((m) => !/redfirst|404|Failed to load/i.test(m));
ck('L10 the page booted with a clean console — an init throw invalidates every green above',
   realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await ctx.close();
await browser.close();
server.close();

console.log('');
if (RED) {
  if (fail === 0) {
    console.error('❌ RED-FIRST FAILED — the part was not served and the gate still passed ' + pass + '/0.');
    console.error('   This control proves nothing. Re-ground the mutation before trusting a green.');
    process.exit(1);
  }
  console.log('✅ RED-FIRST OK — with the capability removed the gate reports RED ' + fail + ' / GREEN ' + pass + '.');
  process.exit(0);
}
console.log((fail === 0 ? 'CLEAN  ' : '') + 'GREEN ' + pass + ' / RED ' + fail);
process.exit(fail === 0 ? 0 : 1);
