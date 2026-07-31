'use strict';
/* STUDIO WORK STATE · RED-FIRST — two people, two questions, and neither answer may be forged by boot.
 *
 * WHY TWO FACTS AND NOT ONE "DIRTY" FLAG. A signed-in architect with a saved blueprint is at risk of
 * losing EDITS SINCE THAT SAVE — their question is unsavedEdits, and hasContent would fire forever for
 * them because a saved blueprint always has content. A visitor with NO ACCOUNT has never saved, so their
 * saved_at is null and the newer-than test is not wrong for them, IT IS UNDEFINED — and they are the whole
 * conversion audience. Their question is hasContent. One flag would have to answer one of them wrongly.
 *
 * THE LOAD-BEARING ASSERTION IS WORK 1. Studio writes a draft on a COLD LOAD with zero interaction, so
 * "a draft exists" is true for EVERY visitor at boot. If hasContent could be forged by that boot write,
 * every person who so much as opened Studio would be told they had unsaved work — the bug 44b6245 already
 * cost this project once. WORK 1 asserts the cold boot reads EMPTY; WORK 2 is its positive control on the
 * same page in the same run, because a zero is only evidence if the instrument produces a non-zero (L68).
 *
 * HOW EACH CLASS IS DRIVEN — declared, not blurred:
 *   WORK 1 / 2   THE REAL APP. Real cold load, then a real edit through a bound input. These carry the
 *                weight, because the trap being guarded against is something the real boot path does.
 *   WORK 3/4/5   CRAFTED drafts written straight to storage, then workState() is asked. A signed-out
 *                harness cannot perform a real save, so the saved_at pairings cannot be driven through
 *                the app. WHAT THEY PROVE: the comparison. WHAT THEY DO NOT PROVE: that a real save
 *                produces these stamps. Stated rather than implied.
 *
 * RACE DECLARATIONS (L52): none. Each read follows a fixed settle well past the 350ms draft debounce.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

// --nopristine replaces the pristine comparison with the NAIVE test this gate exists to forbid:
//              "a draft exists". WORK 1 must go red — the cold boot write forges content.
const NOPRISTINE = process.argv.includes('--nopristine');
// --noclock    drops the dt > st comparison, so any saved blueprint reads as edited-since-save.
const NOCLOCK    = process.argv.includes('--noclock');

const A_PRISTINE = '  function _hasContent(draft) {\n    var pristine = newBlueprint();';
const M_PRISTINE = '  function _hasContent(draft) {\n    if (true) return !!draft;\n    var pristine = newBlueprint();';
const A_CLOCK    = 'unsavedEdits: !!(everSaved && !isNaN(dt) && !isNaN(st) && dt > st)';
const M_CLOCK    = 'unsavedEdits: !!(everSaved)';
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/scripts/studio-blueprint.js' && (NOPRISTINE || NOCLOCK)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
      src = src.replace(a, m);
    };
    if (NOPRISTINE) apply(A_PRISTINE, M_PRISTINE, 'pristine');
    if (NOCLOCK)    apply(A_CLOCK,    M_CLOCK,    'clock');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8253; const base = 'http://127.0.0.1:' + PORT;
const KEY = 'datumfi_blueprint_draft_v1';

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  // SIGNED OUT — the conversion audience, and the one whose cold boot must not read as content.
  await page.addInitScript(`(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
    try { localStorage.setItem('datum-discover-v1','done'); } catch(e){}
  })();`);
  await page.goto(base + '/studio.html', { waitUntil: 'commit' });
  await page.waitForSelector('#primary-name', { timeout: 30000 });
  await sleep(6000);

  const loaded = await page.evaluate(() => !!(window.DatumBlueprint && typeof window.DatumBlueprint.workState === 'function'));
  ok(loaded, 'WORK 0: the page loaded and DatumBlueprint.workState is present (without this nothing below means anything)');

  const ws = () => page.evaluate(() => window.DatumBlueprint.workState());

  // ── THE REAL APP ───────────────────────────────────────────────────────────────────────────────────
  const cold = await ws();
  lines.push(`      [cold, zero interaction] ${JSON.stringify(cold)}`);
  ok(cold.present && cold.hasContent === false,
    `WORK 1 LOAD-BEARING: a COLD signed-out load writes a draft (present=${cold.present}) but it reads as EMPTY (hasContent=${cold.hasContent}) — boot cannot forge content`);
  ok(cold.everSaved === false && cold.unsavedEdits === false,
    `WORK 1b: a never-saved visitor reports everSaved=${cold.everSaved} and unsavedEdits=${cold.unsavedEdits} — the newer-than test is silent, not guessed`);

  await page.evaluate(() => {
    const el = document.getElementById('primary-name');
    el.focus(); el.value = 'A Real Person';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(2500);
  const edited = await ws();
  lines.push(`      [after one real edit]    ${JSON.stringify(edited)}`);
  ok(edited.hasContent === true,
    `WORK 2 POSITIVE CONTROL: after ONE real edit through a bound input the same instrument reports hasContent=${edited.hasContent} — the zero above is a measurement, not a dead reading`);
  ok(edited.everSaved === false && edited.unsavedEdits === false,
    `WORK 2b: content WITHOUT a save still reports unsavedEdits=${edited.unsavedEdits} — the two questions are independent, which is the whole point`);

  // ── CRAFTED DRAFTS — the saved_at pairings a signed-out harness cannot perform for real ────────────
  async function crafted(saved_at, draftAt, extra) {
    return page.evaluate((a) => {
      const bp = window.DatumBlueprint['new']();
      bp.saved_at = a.saved_at;
      if (a.extra) bp.profile.primary_name = 'Saved Person';
      const obj = Object.assign({}, bp, { _draftAt: a.draftAt, _tabId: 'rig' });
      localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(obj));
      return window.DatumBlueprint.workState();
    }, { saved_at, draftAt, extra });
  }
  const T0 = '2026-07-31T10:00:00.000Z', T1 = '2026-07-31T11:00:00.000Z';

  const editedSince = await crafted(T0, T1, true);
  lines.push(`      [saved 10:00, edited 11:00] ${JSON.stringify(editedSince)}`);
  ok(editedSince.unsavedEdits === true,
    `WORK 3: a saved blueprint edited AFTER its save reports unsavedEdits=${editedSince.unsavedEdits} — audience 1, the signed-in architect`);

  const justSaved = await crafted(T1, T0, true);
  lines.push(`      [edited 10:00, saved 11:00] ${JSON.stringify(justSaved)}`);
  ok(justSaved.unsavedEdits === false,
    `WORK 4 NEGATIVE: a blueprint saved AFTER its last edit reports unsavedEdits=${justSaved.unsavedEdits} — nobody is nagged about work that is already safe`);
  ok(justSaved.hasContent === true && justSaved.everSaved === true,
    `WORK 4b: and it still reports hasContent=${justSaved.hasContent} everSaved=${justSaved.everSaved} — WORK 4 is the clock answering, not an empty draft`);

  const noStamp = await crafted(T0, undefined, true);
  lines.push(`      [saved 10:00, no edit stamp] ${JSON.stringify(noStamp)}`);
  ok(noStamp.unsavedEdits === false,
    `WORK 5: a MISSING edit stamp reports unsavedEdits=${noStamp.unsavedEdits} — an absent stamp is not evidence of an edit (L47), never fabricated`);

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOPRISTINE || NOCLOCK;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (studio-blueprint.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = NOPRISTINE ? 'MUTATED[nopristine]' : NOCLOCK ? 'MUTATED[noclock]' : 'CLEAN';
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
