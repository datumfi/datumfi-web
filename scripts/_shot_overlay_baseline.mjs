/* ══ THE APPROVED-STATE CAPTURE — THE CAPTAIN'S EYE, KEPT ═══════════════════════════════════════
 *
 * Renders the entry overlay in LIGHT MODE and writes one PNG named for the commit it was taken at.
 *
 * ⛔⛔ WHY THIS EXISTS. On 2026-08-30 the Captain confirmed BY EYE that the live light-mode overlay
 * is correct: "I have since confirmed by eye that the live site is indeed correct. As long as you
 * look at what's live then we will have the correct look." That promoted the live overlay from
 * unverified output to THE APPROVED REFERENCE.
 * 🔑 A HUMAN VERDICT IS A ONE-TIME EVENT; A BASELINE IS THAT VERDICT MADE DURABLE. Without a capture
 *    of what he approved, a later regression would only be findable by asking him to look again —
 *    and the next agent would have to spend the human a second time to learn what we already knew.
 * ⭐ THIS IS THE SAME MOVE AS TURNING HIS HALF-PIXEL CATCH INTO A GATE LEG, APPLIED TO A JUDGEMENT
 *    THAT HAS NO GATE AND CANNOT HAVE ONE.
 *
 * ⛔ NOT NAMED _gate_* OR _p<digit>*, AND THAT IS STRUCTURAL, NOT COSMETIC. _suite_baseline.mjs
 * builds its population from /^(_gate_|_p\d)/ over scripts/. A file named _gate_anything here would
 * be EXECUTED by every argument-less suite run and counted a GREEN THAT TESTED NOTHING. This dodges
 * the glob by prefix, exactly as _render_diff.js, _c3_light_probe.mjs and _studio_source.cjs do.
 * ⇒ IT IS A TOOL YOU POINT AT A MOMENT, NEVER A GATE THAT RUNS ITSELF. It costs no population slot.
 *
 * ⛔ AND IT IS COMMITTED RATHER THAN RUN ONCE FROM A SHELL, WHICH THIS ESTATE HAS NOW LEARNED FOUR
 * TIMES. _c3_light_probe.mjs's own header records the pattern: the rect breakdown that lifted
 * §81.16's suspension "was produced by a throwaway script that no longer exists anywhere in the
 * tree. THE MEASUREMENT SURVIVED IN A SPREADSHEET; THE INSTRUMENT THAT PRODUCED IT DID NOT."
 * A capture whose capturing script is gone cannot be RE-TAKEN at the next approved state, so the
 * baseline could never advance — see the advance rule below, which depends on this file existing.
 *
 * ══ THE POINTER — PROVENANCE, WHICH IS A CLAIM IN THE RECORD AND NOT A PROPERTY OF THE PNG ══════
 *
 *   APPROVED REF ...... 9f1d470  ("fix(studio): three more from the Captain's eye")
 *   WHAT ............. the Studio entry overlay (#studioOverlayWrap) in SITE LIGHT MODE:
 *                      the seamless header wash, the light panel, dock and choices, and the
 *                      traveller seated on its dot.
 *   WHO .............. Captain Daniel Merced, by eye, on the LIVE site.
 *   WHEN ............. 2026-08-30.
 *   HOW VERIFIED ..... human visual confirmation only. NO instrument judged this.
 *
 * ⛔⛔ READ THAT LAST LINE AS A LIMIT, BECAUSE THE ARTEFACT CANNOT CARRY IT: A REF-VS-REF DIFF PROVES
 * "NOTHING CHANGED SINCE 9f1d470". IT DOES NOT PROVE "9f1d470 IS WHAT THE CAPTAIN APPROVED."
 * That link exists ONLY in this record and in the session log. A later reader who finds a hash with
 * no provenance cannot tell a blessed state from an arbitrary one — which is the entire reason the
 * five fields above are written out rather than left as a commit pointer.
 * ⚠️ studio.html IS NOT TOUCHED BY THE COMMIT THAT ADDS THIS FILE, so a capture taken from the
 * working tree at that moment renders 9f1d470's overlay byte-for-byte. Stated because it is the
 * assumption that makes the label honest, and it will NOT hold for a future capture taken mid-arc.
 *
 * ══ ⭐⭐ THE ADVANCE RULE — WITHOUT ONE, A BASELINE IS NOT A BASELINE, IT IS A GRUDGE ═════════════
 *
 * THE APPROVED REF ADVANCES EVERY TIME THE CAPTAIN APPROVES A NEW VISUAL STATE. Re-run this file at
 * the new commit, commit the new PNG, and UPDATE THE FIVE PROVENANCE FIELDS ABOVE IN THE SAME
 * COMMIT — the fields and the image move together or the record lies.
 * ⛔ IF THE POINTER NEVER MOVES, EVERY INTENTIONAL REDESIGN READS AS A REGRESSION FOREVER, AND
 * SOMEBODY EVENTUALLY EDITS THE INSTRUMENT TO KEEP IT QUIET — WHICH IS THE EXACT FAULT (§82.688)
 * THIS WHOLE DESIGN EXISTS TO AVOID, ARRIVING BY NEGLECT INSTEAD OF BY INTENT.
 * ⚠️ THE SEVEN ROOM LANDINGS WILL CHANGE THESE SURFACES ON PURPOSE, so this rule gets exercised in
 * DAYS, NOT MONTHS. The first person to see a red here should suspect the pointer before the page.
 *
 * ══ ⛔⛔ THE PNG IS FOR HUMAN EYES. IT IS NEVER A DIFF SUBJECT. ══════════════════════════════════
 *
 * DO NOT COMPARE scripts/_ref_overlay_light_*.png AGAINST A FRESH RENDER. It is a FOSSIL: it carries
 * the chromium build, the font rasteriser and the antialiasing of the machine and day that took it.
 * Diffed against a future render it will drift on subpixel rendering ALONE and produce a red that
 * looks exactly like a regression and is not one.
 * 🔑 THE ENVIRONMENT CANCELS ITSELF WHEN BOTH SIDES ARE RENDERED BY IT; IT DOES NOT CANCEL WHEN ONE
 *    SIDE IS A FOSSIL. So the PNG answers "what did he approve?" for a person, and NOTHING ELSE.
 *
 * ✅ THE DIFFABLE COMPARISON IS REF-VS-REF, BOTH SIDES RENDERED FROM GIT IN ONE BROWSER AT DIFF
 *    TIME, AND THE TOOL FOR IT ALREADY EXISTS:
 *        node scripts/_c3_light_probe.mjs --mode=null            (the null pair FIRST — it must read 0)
 *        node scripts/_c3_light_probe.mjs --ref 9f1d470 ...      (then the real comparison)
 *    That tool REFUSES a differential run without --i-ran-null-first, which is the right refusal:
 *    A DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS NOT A MEASUREMENT, IT IS A NUMBER.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
 *   node scripts/_shot_overlay_baseline.mjs            # capture at current HEAD, auto-named
 *   node scripts/_shot_overlay_baseline.mjs --out X    # explicit path
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const argOf = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const HEAD = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const OUT = path.resolve(ROOT, argOf('--out', path.join('scripts', '_ref_overlay_light_' + HEAD + '.png')));

/* ⚠️ A DIRTY TREE IS ANNOUNCED, NEVER SILENTLY LABELLED. The filename claims a commit; if the tree
   has moved off that commit the claim is false, and a mislabelled baseline is worse than none
   because its name is the only provenance a hurried reader will check. */
const dirty = execFileSync('git', ['status', '--porcelain', '--', 'studio.html'], { cwd: ROOT, encoding: 'utf8' }).trim();

const PORT = 8471; const BASE = 'http://127.0.0.1:' + PORT;
const KEY_SITE = 'datumae-studio-site-theme-v31';
const KEY_PAPER = 'datumae-studio-paper-theme-v31';

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  /* The entry-overlay skip flag is NOT set — the overlay IS the subject. Discover is dismissed
     because it is a different surface and it occludes this one. */
  await page.addInitScript(() => { try { localStorage.setItem('datum-discover-v1', 'done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  /* ⭐ BOTH LIGHT, AND THE STATE IS A CHOICE WORTH DEFENDING RATHER THAN A DEFAULT I FELL INTO.
     Four site/paper combinations are reachable, so a capture must say which one it claims. Pressing
     the site light control gives site-light AND paper-light, because entering site-light defaults
     the canvas to light paper (the donor coupling, pinned by _gate_theme_toggles L3d) — so this is
     the state the Captain actually lands in, and therefore the one he confirmed by eye.
     ⚠️ THE FIRST VERSION OF THIS CAPTURE PINNED paper='dark' AND LEFT A DARK CANVAS EDGE AROUND THE
     overlay. Reachable, valid, and NOT what he was looking at — a reference artefact showing a state
     nobody defaults into invites a future reader to "fix" a difference that was never a defect. */
  await page.evaluate((k) => { localStorage.setItem(k[0], 'light'); localStorage.setItem(k[1], 'light'); },
    [KEY_SITE, KEY_PAPER]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* ⛔ THE CAPTURE IS REFUSED IF THE SUBJECT IS NOT ON SCREEN. A blank or dismissed overlay would
     write a confident PNG of nothing and label it with a commit — the image equivalent of a green
     that tested nothing, and one no future reader could tell from the real thing. */
  const state = await page.evaluate(() => {
    const w = document.getElementById('studioOverlayWrap');
    const r = w ? w.getBoundingClientRect() : null;
    return { present: !!w, light: document.body.classList.contains('light-mode'),
             dismissed: w ? w.classList.contains('dismissed') : null,
             disp: w ? getComputedStyle(w).display : null,
             area: r ? Math.round(r.width * r.height) : 0 };
  });
  if (!state.present || !state.light || state.dismissed !== false || state.disp === 'none' || state.area < 200000) {
    console.error('REFUSED — the overlay is not on screen in light mode: ' + JSON.stringify(state));
    await browser.close(); server.close(); process.exit(2);
  }

  /* ⛔ ANIMATION STOPPED BEFORE THE SHUTTER. The traveller runs a 12s loop, so an unpaused capture
     freezes it wherever it happened to be — two captures of an UNCHANGED page would differ, and the
     one question this artefact must answer for a human is "does this look like what he approved?" */
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(200);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT });
  const bytes = fs.statSync(OUT).size;

  console.log('CAPTURED  ' + path.relative(ROOT, OUT));
  console.log('  head          ' + HEAD);
  console.log('  studio.html   ' + (dirty ? '⚠️  DIRTY — the filename\'s commit claim is NOT honest' : 'clean at HEAD'));
  console.log('  overlay       light=' + state.light + ' dismissed=' + state.dismissed + ' area=' + state.area + 'px2');
  console.log('  bytes         ' + bytes);
  console.log('  ⛔ HUMAN VIEWING ONLY — never diff this file. See the header for the ref-vs-ref route.');

  await browser.close(); server.close();
  process.exit(dirty ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
