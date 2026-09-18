/* DEV-ONLY — THE FIVE BUTTONS, END TO END. Architect's test order, 2026-09-18 (§82.2605).
 *
 * ⛔⛔ THE PASS CONDITION IS DISAGREEMENT, NOT SUCCESS. Copy fidelity, tile rendering and a green
 *    parity gate all held for the FOUR PRESETS THIS PORT REPLACED — and those four returned the
 *    same ladder to the dollar after the tier's own $1,000 rounding. A control that renders
 *    perfectly and returns the same number five times is still decorative.
 *    🔑 IF TWO SOLOS RETURN THE SAME LADDER, THE PORT HAS NOT LANDED, HOWEVER FAITHFUL THE COPY IS.
 *
 * ⛔ IT TESTS THE WHOLE PATH, NOT THE TILE. Half of it runs in a real browser against the real
 *    studio.html: click the tile, let buildStudioRequest run, and capture THE ACTUAL REQUEST BODY
 *    the page would have posted. The other half feeds those captured bodies to the REAL engine.
 *    ⚠️ THE JOIN IS THE POINT. A stub request would prove the engine disagrees with itself; a
 *       stubbed engine would prove the client sends five words. Only the join proves that clicking
 *       a tile changes a household's Range, which is the claim being made.
 *
 * ⚠️ THE REQUEST IS CAPTURED, NOT SENT. The page's fetch is intercepted so no network call leaves
 *    the harness — what is asserted is the body the client BUILT, which is exactly the thing that
 *    was wrong four separate times on that one payload line.
 *
 * --redfirst  collapses the five keys to one before the engine runs, so five identical ladders
 *             come back. The gate MUST go red. A disagreement test that cannot detect agreement is
 *             the empty-green species with extra steps.
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { seedCompleteHousehold } = require('./_seed_household.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.resolve(ROOT, '..', 'datum-fi');
const RED = process.argv.includes('--redfirst');
const KEYS = ['blend', 'parametric', 'historical', 'cape', 'regime'];

let pass = 0, fail = 0;
const ck = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (detail ? '\n        ' + detail : '')); }
};

if (!existsSync(path.join(ENGINE, 'main.py'))) {
  console.log('\n  ⚠️ ENGINE NOT ON DISK at ' + ENGINE + ' — this gate cannot run.');
  console.log('     Exiting 0 and asserting NOTHING. A skipped leg is not a green one.');
  process.exit(0);
}

/* ── half one: a real browser, a real click, the real request builder ───────────────────────── */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(readFileSync(fp));
});
const PORT = 8233;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
  window.Clerk = { load: () => Promise.resolve(), user: null };
});
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
await page.waitForTimeout(1800);

/* ⛔⛔ THE HOUSEHOLD IS SEEDED BY THE SHARED SEEDER, NOT BY HAND. L48, and it was earned the
   hard way: the first version of this fixture answered the doors one at a time as the product
   refused them, and it took FOUR ROUNDS of chasing — location, filing status, a plan-end field that
   is a DATE despite being called plan-end-age, and a Datum that is only  when the slider
   carries dataset.exactVal. Every one of those was a red about the FIXTURE, not the feature.
   🔑 A RED IS NOT EVIDENCE UNTIL THE FIXTURE CAN PRODUCE A GREEN — and scripts/_seed_household.cjs
      already knows every door, because five other gates paid for that knowledge first. */
const seed = await seedCompleteHousehold(page, { quiet: true });
await page.evaluate(() => {
  /* ⚠️ A HOUSEHOLD WITH ROOM TO MOVE. The four models disagree by 15.6-20% on a .5M estate; on a
     small one the whole spread can sit UNDER the tier ladder's own ,000 rounding and every design
     returns the same number FOR A REASON THAT IS NOT THE CONTROL (§82.2716). A fixture that cannot
     show the signal measures the resolution of the ladder, not the reachability of the field. */
  if (window.state) {
    window.state.accounts = [
      { id: 'mc1', baseId: 'pretax401k', value: 1600000, inflow: 2000, freq: 12, name: 'Pre-Tax 401(k)', holdings: [] },
      { id: 'mc2', baseId: 'rothira',    value:  500000, inflow:  500, freq: 12, name: 'Roth IRA',       holdings: [] },
      { id: 'mc3', baseId: 'taxable',    value:  400000, inflow:  500, freq: 12, name: 'Brokerage',      holdings: [] }
    ];
  }
  /* ⛔ THE STATE IS PINNED TO ONE THAT ANSWERS, AND THAT IS A DELIBERATE NARROWING. The shared
     seeder takes the first option in the list, which is ALABAMA — and Alabama REFUSES by name
     (state_income_source_not_modelled: it taxes retirement money by where it came from). Five
     identical refusals is not a measurement of the market control.
     ⚠️ TEXAS IS CHOSEN BECAUSE IT HAS NO STATE INCOME TAX, so the state layer contributes NOTHING
     and the only thing left moving between the five runs is the market design. A state with a
     ladder would still work, but it would put a second variable in a test with one question. */
  const loc = document.getElementById('pri-location');
  if (loc) { loc.value = 'Texas'; loc.dispatchEvent(new Event('change', { bubbles: true })); }
  if (typeof renderInputs === 'function') renderInputs();
  if (typeof window._studioEnterRoom === 'function') window._studioEnterRoom('measurement');
});
await page.waitForTimeout(600);
const seeded = await page.evaluate(() => (window.state ? window.state.accounts.length : 0));
ck('S1 INSTRUMENT · a complete household with room to move (3 rooms, ~.5M) builds a payload',
   seed.complete === true && seeded === 3,
   'complete=' + seed.complete + ' rooms=' + seeded
     + (seed.complete ? '' : ' STILL REFUSING: ' + (seed.refusing || []).map((r) => r.target).join(',')));

/* capture the body the client BUILDS, per design */
const bodies = await page.evaluate(async (keys) => {
  const out = {};
  for (const k of keys) {
    const tile = document.querySelector('.climate-grid .climate-option[data-outlook-key="' + k + '"]');
    if (!tile) { out[k] = { error: 'no tile' }; continue; }
    tile.click();
    await new Promise((r) => setTimeout(r, 80));
    try {
      const body = window.buildStudioRequest ? window.buildStudioRequest() : null;
      out[k] = body ? JSON.parse(JSON.stringify(body)) : { error: 'builder returned nothing' };
    } catch (e) { out[k] = { error: String(e && e.message || e) }; }
  }
  return out;
}, KEYS);

/* ⛔⛔ S8 — THE SAVED-PLAN FILE, NOT THE PANEL. Architect's second ask, and the reason it is a
   SEPARATE leg: a default that holds in the panel and not in the file is a different bug wearing
   the same clothes. The blueprint is what a household REOPENS, so a stale default there re-answers
   a market question on their behalf every time they come back.
   ⚠️ CAPTURED FROM THE LIVE PAGE VIA DatumBlueprint['new']() — the product's own writer — never by
      reading the default out of the source. Reading the literal would prove the file contains a
      word; this proves the writer PUTS it there. */
const saved = await page.evaluate(() => {
  try {
    if (!window.DatumBlueprint) return { error: 'DatumBlueprint absent' };
    /* ⚠️ TWO DIFFERENT QUESTIONS AND TWO DIFFERENT FUNCTIONS, AND I CONFLATED THEM FIRST.
       DatumBlueprint['new']() returns a FRESH blueprint carrying only DEFAULTS — it reads no DOM,
       so clicking a tile cannot change it, and my first S8b failed against correct behaviour.
       bind() is the one that CAPTURES the live page (captureDOM). The default and the capture are
       separate claims and each needs its own call. */
    const cold = window.DatumBlueprint['new']();
    const tile = document.querySelector('.climate-grid .climate-option[data-outlook-key="regime"]');
    if (tile) tile.click();
    const captured = window.DatumBlueprint.bind ? window.DatumBlueprint.bind({}) : null;
    return { coldOutlook: cold && cold.climate && cold.climate.outlook,
             captured: captured && captured.climate ? captured.climate.outlook : 'NO CAPTURE' };
  } catch (e) { return { error: String(e && e.message || e) }; }
});
ck('S8b and a chosen design is what gets written — the file follows the click',
   saved.captured === 'regime', JSON.stringify(saved));

await ctx.close();
await browser.close();
server.close();

const built = KEYS.filter((k) => bodies[k] && !bodies[k].error);
ck('S2 the request builder produced a body for all five designs',
   built.length === 5, KEYS.map((k) => k + '=' + (bodies[k] && bodies[k].error ? bodies[k].error : 'ok')).join(' | '));
ck('S3 each body carries THAT design as market_outlook — the click reached the wire',
   KEYS.every((k) => bodies[k] && bodies[k].market_outlook === k),
   KEYS.map((k) => k + '->' + (bodies[k] || {}).market_outlook).join(' | '));

if (built.length !== 5) {
  console.log('\n  ⛔ cannot run the engine half without five bodies.');
  console.log('GREEN ' + pass + ' / RED ' + fail);
  process.exit(1);
}

/* ⛔ THE RED-FIRST REMOVES THE CAPABILITY, NOT A ROUTE (§82.2428): every body is rewritten to the
   SAME design, so the engine is asked one question five times. Five identical ladders must fail. */
if (RED) for (const k of KEYS) bodies[k].market_outlook = 'blend';

/* ── half two: the real engine, on the real bodies ──────────────────────────────────────────── */
const tmp = mkdtempSync(path.join(os.tmpdir(), 'mc-e2e-'));
const bodiesPath = path.join(tmp, 'bodies.json');
writeFileSync(bodiesPath, JSON.stringify(bodies), 'utf8');

const runner = `
import json, sys, os
sys.path.insert(0, r"${ENGINE.replace(/\\/g, '\\\\')}")
os.chdir(r"${ENGINE.replace(/\\/g, '\\\\')}")
import asyncio
import main as engine_main
from schemas import CalculateRequest
bodies = json.load(open(r"${bodiesPath.replace(/\\/g, '\\\\')}", encoding="utf-8"))
out = {}
for k, body in bodies.items():
    try:
        # engine_main.calculate is a coroutine — awaiting it is not optional.
        res = asyncio.run(engine_main.calculate(CalculateRequest(**body)))
        # TierResult holds .blended (a TierValues); the ladder figures are NOT on TierResult itself.
        t = res.tiers.blended
        out[k] = {
            "bedrock":  getattr(t, "bedrock", None),
            "keystone": getattr(t, "keystone", None),
            "capstone": getattr(t, "capstone", None),
            "sent":     body.get("market_outlook"),
            "echo":     getattr(res.tiers, "market_outlook", None),
        }
    except Exception as e:
        out[k] = {"error": type(e).__name__ + ": " + str(e)[:200]}
print("@@RESULT@@" + json.dumps(out))
`;
const runnerPath = path.join(tmp, 'run.py');
writeFileSync(runnerPath, runner, 'utf8');

console.log('');
console.log('  running the engine on the five captured bodies (in-process, no network)…');
let raw;
try {
  raw = execFileSync('python', [runnerPath], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.log('  ❌ the engine could not be run: ' + String(e.message).slice(0, 400));
  process.exit(1);
}
const marker = raw.indexOf('@@RESULT@@');
if (marker < 0) { console.log('  ❌ no result from the engine runner:\n' + raw.slice(-800)); process.exit(1); }
const results = JSON.parse(raw.slice(marker + '@@RESULT@@'.length));

console.log('');
console.log('  DESIGN        sent            bedrock      keystone     capstone');
console.log('  ' + '─'.repeat(70));
for (const k of KEYS) {
  const r = results[k] || {};
  if (r.error) { console.log('  ' + k.padEnd(14) + 'ERROR  ' + r.error); continue; }
  const f = (v) => (v == null ? '—' : ('$' + Math.round(v).toLocaleString('en-US')).padStart(11));
  console.log('  ' + k.padEnd(14) + String(r.sent).padEnd(16) + f(r.bedrock) + ' ' + f(r.keystone) + ' ' + f(r.capstone));
}
console.log('');

const errored = KEYS.filter((k) => results[k] && results[k].error);
ck('S4 the engine answered for all five', errored.length === 0,
   errored.map((k) => k + ': ' + results[k].error).join(' | '));

const keystones = KEYS.map((k) => (results[k] || {}).keystone).filter((v) => v != null);
const bedrocks = KEYS.map((k) => (results[k] || {}).bedrock).filter((v) => v != null);
const distinctK = new Set(keystones.map((v) => Math.round(v)));
const distinctB = new Set(bedrocks.map((v) => Math.round(v)));
const spread = keystones.length ? Math.max(...keystones) - Math.min(...keystones) : 0;

/* ⭐ THE HEADLINE LEG. Not "did it arrive" — §82.2734 says an arrival proves nothing. DID IT MATTER. */
ck('S5 ⭐ THE FIVE DESIGNS DISAGREE — five distinct keystones, not one answer five times',
   distinctK.size === 5,
   distinctK.size + ' distinct of ' + keystones.length + ': ' + [...distinctK].map((v) => '$' + v.toLocaleString('en-US')).join(' · '));
/* ⛔⛔ S6 IS INVERTED ON PURPOSE, AND I HAD IT BACKWARDS FIRST. I wrote it as "they disagree at
   the Floor too" and it went red with one bedrock across all five — then I read why instead of
   filing a defect. THE FLOOR IS NOT MONTE CARLO. It is the five-scenario STRESS BATTERY: 1929,
   Japan 1990, the 2000 bust, 2008 and a constructed twelve-year stagnation. Those are FIXED
   HISTORICAL PATHS, so the market design — which shapes how MC GENERATES returns — cannot touch
   them, and an identical Floor is the CORRECT answer rather than a dead control.
   🔑 SO THE INVARIANT IS WORTH MORE THAN THE DISAGREEMENT WOULD HAVE BEEN: if the Floor ever DOES
      move with the market design, the stress battery has been contaminated by the MC path and the
      Floor has stopped being the thing it claims to be. This leg now guards that.
   ⚠️ AND IT IS THE REASON S5 READS THE KEYSTONE AND NOT THE BEDROCK. A test of this control that
      had looked only at the Floor would have reported the five designs as identical — a confident
      wrong answer, on a working feature, for a reason that is nothing to do with the control. */
ck('S6 the Floor is IDENTICAL across all five — it is the stress battery, not Monte Carlo',
   distinctB.size === 1,
   distinctB.size + ' distinct bedrock of ' + bedrocks.length
     + ' — if this is >1 the stress battery has been contaminated by the MC path');
/* ⚠️ THE SPREAD MUST CLEAR THE LADDER'S OWN $1,000 ROUNDING BY A MARGIN. A spread of exactly
   $1,000 is one rounding step and proves nothing about the control (§82.2716). */
ck('S7 the spread clears the tier ladder\'s $1,000 noise floor by a wide margin',
   spread >= 5000, 'keystone spread = $' + Math.round(spread).toLocaleString('en-US'));

console.log('');
if (RED) {
  if (fail === 0) {
    console.error('❌ RED-FIRST FAILED — every body was rewritten to the SAME design and the gate');
    console.error('   still passed ' + pass + '/0. It cannot detect agreement, so its green means nothing.');
    process.exit(1);
  }
  console.log('✅ RED-FIRST OK — one design asked five times reports RED ' + fail + ' / GREEN ' + pass + '.');
  process.exit(0);
}
console.log((fail === 0 ? 'CLEAN  ' : '') + 'GREEN ' + pass + ' / RED ' + fail);
process.exit(fail === 0 ? 0 : 1);
