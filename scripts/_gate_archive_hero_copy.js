'use strict';
/* THE ARCHIVE'S OPENING COPY AND ITS NAME — RED-FIRST, BOTH DIRECTIONS.
 *
 * Round 1 (Request 2): "Sketchbook is for rough possibilities." was deleted from the opening
 * paragraph. An authorised deletion, not a rename — so this gate defends the DELETION and, just
 * as hard, defends what is LEFT BEHIND. A sentence removed badly leaves an orphan fragment, and
 * a page that reads broken is worse than one that reads redundant.
 *
 * Round 2 (the rename): the room stopped being "Blueprint Archive" and became "The Archive".
 * ⚠️ THE WORD "BLUEPRINT" DID NOT GO AWAY — it changed job. It is no longer the ROOM's name; it
 * is still the SAVED DOCUMENT's name ("Studio blueprints you have modeled", "continue a filed
 * Blueprint", the "Studio Blueprint Filed" stamp). So this gate must NOT assert "the word
 * blueprint is gone" — that assertion would be easy, green, and wrong. It asserts the exact
 * retired PHRASE is gone while the document sense survives.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ──────────────────
 * A visitor with /Blueprint.html loaded and the body revealed, reading the paragraph under the
 * page title. That is EVERY visitor: this paragraph is static markup in <body>, identical for
 * signed-in and signed-out, unaffected by the archive's contents. There is no zero-state to get
 * wrong here — which is exactly why it is worth saying out loud rather than assuming.
 * (Clerk is aborted by the harness, so revealBody() never runs and the body would stay
 * visibility:hidden. Revealed deliberately — a real user always has a visible body.)
 *
 * ── ON THE SKETCH SIDE ────────────────────────────────────────────────────────────────────────
 * The Architect's instruction was to leave the sentence intact wherever it legitimately appears on
 * the Sketch side. MEASURED BEFORE WIRING: it appears NOWHERE on the Sketch side. One occurrence
 * existed in the whole repository and it was the one deleted. So assertion 6 does NOT pretend to
 * guard that phrase in sketchbook.html — it guards the Sketchbook's own hero paragraph against
 * collateral damage, and says so. Faking a Sketch-side occurrence would have been the tidier lie.
 *
 * Usage: node scripts/_gate_archive_hero_copy.js [--restore] [--dangle] [--nolegacy]
 *   --restore  RED-FIRST: serves the deleted sentence back, exactly as it read before the change.
 *              This is the state of the code as it stood; the CLEAN run was red against it first.
 *   --dangle   RED-FIRST, THE OTHER DIRECTION: deletes only part of the sentence, leaving the
 *              orphan "possibilities." behind. THE ABSENCE CHECK STAYS GREEN under this mutation
 *              and only the reads-as-a-complete-thought checks go red — which is the proof that
 *              the two directions are independent and neither is covering for the other.
 *   --nolegacy RED-FIRST for the rename's real risk: drops legacy-default recognition, so a
 *              retired auto-title stops being read as a default. Nothing about the page's
 *              APPEARANCE changes under this mutation — only the binder assertions bite, which
 *              is the point: a rename gate that only read labels would have passed it.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8297; const BASE = 'http://' + HOST + ':' + PORT;
const RESTORE = process.argv.includes('--restore');
const DANGLE = process.argv.includes('--dangle');
const NOLEGACY = process.argv.includes('--nolegacy');

/* THE COPY, TRANSCRIBED BY HAND, never read out of the page — so the assertion sits between two
   transcriptions instead of comparing the source to itself. This change is a pure DELETION, so the
   surviving sentence is the Architect's existing authored copy, unaltered. Nothing was reworded. */
const DELETED   = 'Sketchbook is for rough possibilities.';
const SURVIVING = 'The Archive is for Studio blueprints you have modeled, named, saved, and may want to reopen, compare, or promote into your working retirement plan.';
const SKETCH_HERO = 'The Sketchbook is where rough retirement Shapes, early Range ideas, and quick scenario sketches are saved, reopened, compared, or sent back into Sketch.';
const ROOM = 'The Archive';
const RETIRED_ROOM = 'Blueprint Archive';   // the ROOM's old name, retired — not the document word

/* Byte anchors. The post-change text is on the left; each mutation rewrites it back to a broken
   form. ⚠️ These include INDENTATION — re-indent the hero and they stop matching, which the
   occurrence check below turns into a loud failure instead of a quiet green. */
const A_HERO = '        <strong>The Archive</strong> is for Studio blueprints you have modeled,';
const M_RESTORE = '        Sketchbook is for rough possibilities. <strong>The Archive</strong> is for Studio blueprints you have modeled,';
const M_DANGLE = '        possibilities. <strong>The Archive</strong> is for Studio blueprints you have modeled,';
const A_LEGACY = 'function _bpIsGenericTitle(v) { return v === BP_TITLE_GENERIC || v === BP_TITLE_GENERIC_LEGACY; }';
const M_LEGACY = 'function _bpIsGenericTitle(v) { return v === BP_TITLE_GENERIC; }';
const A_LEGACY2 = 'return !!n && (v === (n + BP_TITLE_SUFFIX) || v === (n + BP_TITLE_SUFFIX_LEGACY));';
const M_LEGACY2 = 'return !!n && (v === (n + BP_TITLE_SUFFIX));';
let htmlDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((RESTORE || DANGLE || NOLEGACY) && /Blueprint\.html$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (RESTORE || DANGLE) apply(A_HERO, RESTORE ? M_RESTORE : M_DANGLE, 'A_HERO');
    if (NOLEGACY) { apply(A_LEGACY, M_LEGACY, 'A_LEGACY'); apply(A_LEGACY2, M_LEGACY2, 'A_LEGACY2'); }
    htmlDiffers = htmlDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/* Node cannot resolve datumfi.localhost — only chromium gets --host-resolver-rules. So the
   source-level reads go straight to 127.0.0.1 and carry the Host header, hitting the SAME server
   the browser hit, mutations included. */
const fetchText = (p) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p, headers: { Host: HOST } }, (r) => {
    let d = ''; r.on('data', (c) => { d += c; }); r.on('end', () => resolve(d));
  }).on('error', reject);
});

async function boot(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => /clerk\.|cloudflareinsights|posthog|beacon/i.test(r.request().url()) ? r.abort() : r.continue());
  await page.addInitScript((s) => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try {
      localStorage.removeItem('datum_workspace_name');
      localStorage.removeItem('datum_blueprint_archive_title');
      if (s && s.name) localStorage.setItem('datum_workspace_name', s.name);
      if (s && s.override) localStorage.setItem('datum_blueprint_archive_title', s.override);
    } catch (e) {}
  }, seed || null);
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { document.body.style.visibility = 'visible'; });
  return { ctx, page };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });

  const { ctx, page } = await boot(browser);
  const hero = await page.evaluate(() => {
    const sec = document.querySelector('section.hero');
    if (!sec) return { found: false, why: 'no section.hero' };
    const ps = Array.from(sec.querySelectorAll('p')).filter((el) => !el.classList.contains('hero-eyebrow'));
    if (ps.length !== 1) return { found: false, why: `expected 1 body paragraph in the hero, found ${ps.length}` };
    const h1 = sec.querySelector('h1');
    return {
      found: true,
      text: ps[0].textContent,
      html: ps[0].innerHTML,
      title: h1 ? h1.textContent : null,
      visible: getComputedStyle(ps[0]).visibility,
      strongFirst: (ps[0].querySelector('strong') || {}).textContent || null,
      /* textContent, not innerText — the upgrade dialog and its button are in the DOM but hidden,
         and innerText would skip exactly the strings most likely to be forgotten in a rename.
         ⚠️ textContent on <body> ALSO returns the source of every inline <script>, which on this
         page includes the legacy recogniser's own constants. Reading those back would report the
         retired name as user-visible when no user can see it — so scripts and styles are stripped
         from a clone first. Measured, not assumed: without this the check was red on correct code. */
      pageText: (() => {
        const c = document.body.cloneNode(true);
        c.querySelectorAll('script,style,template').forEach((n) => n.remove());
        return c.textContent || '';
      })(),
      docTitle: document.title || '',
      attrText: Array.from(document.querySelectorAll('[aria-label],[title],[value],[placeholder]'))
        .map((el) => [el.getAttribute('aria-label'), el.getAttribute('title'),
                      el.value, el.getAttribute('placeholder')].filter(Boolean).join(' ')).join(' ')
    };
  });
  const served = await fetchText('/Blueprint.html');
  const sketchServed = await fetchText('/sketchbook.html');
  await ctx.close();

  /* ── POSITIVE CONTROLS. Without these, every "the sentence is absent" claim below would also
        pass on a page that rendered nothing at all — which is the failure this suite keeps
        finding in its own instruments. ──────────────────────────────────────────────────────── */
  ok(hero.found === true && norm(hero.text).length > 40,
    `R2 0 POSITIVE CONTROL: the Archive hero paragraph was LOCATED and is non-empty (${hero.found ? norm(hero.text).length + ' chars' : hero.why}) — a bad anchor otherwise makes every absence check pass against an empty string`);
  ok(hero.title === ROOM && hero.visible === 'visible',
    `R2 0b POSITIVE CONTROL: this really is the rendered Archive, the room is named "${ROOM}", and the copy is VISIBLE (title="${hero.title}", visibility=${hero.visible})`);
  ok(/id="page-title"/.test(served) && served.length > 5000,
    `R2 0c RIG: the served bytes were read and are the Archive (${served.length} bytes) — the source-level checks below are measuring something`);

  /* ── DIRECTION 1 · THE SENTENCE IS GONE. ─────────────────────────────────────────────────── */
  ok(!norm(hero.text).includes(DELETED),
    `R2 1 LOAD-BEARING: the deleted sentence is absent from what the user actually READS — "${DELETED}"`);
  ok(!served.includes('rough possibilities'),
    'R2 2: it is absent from the SERVED BYTES too, not merely hidden — a string parked in a comment or a template comes back on the next copy-paste');

  /* ── DIRECTION 2 · WHAT IS LEFT STILL READS AS A WHOLE SENTENCE. ─────────────────────────── */
  ok(norm(hero.text) === SURVIVING,
    `R2 3 LOAD-BEARING: the surviving copy is EXACTLY the authored sentence, whole and unreworded — got "${norm(hero.text)}"`);
  ok(/^[A-Z]/.test(norm(hero.text)) && norm(hero.text).endsWith('.') && !/\s{2,}/.test(norm(hero.text).replace(/\s+/g, ' ')),
    `R2 4 LOAD-BEARING: no orphan left behind — the paragraph starts on a capital and ends on a full stop (starts "${norm(hero.text).slice(0, 24)}…", ends "…${norm(hero.text).slice(-12)}")`);
  ok(hero.strongFirst === ROOM && /^\s*<strong>/.test(hero.html),
    `R2 5: the room's NAME still leads the paragraph in bold — the deletion must not take the emphasis with it (strong="${hero.strongFirst}")`);

  /* ── THE RENAME · the retired ROOM name is gone, and the DOCUMENT word is not. ───────────── */
  /* The retired name is NOT simply absent from the file, and asserting that it were would be an
     assertion the correct code violates: the legacy recogniser has to keep naming it in order to
     keep recognising it. So the real rule is where it may appear — never anywhere a user can read
     it, and in source only on a line that declares itself legacy. */
  ok(!hero.pageText.includes(RETIRED_ROOM) && !hero.docTitle.includes(RETIRED_ROOM) && !hero.attrText.includes(RETIRED_ROOM),
    `R2 7 LOAD-BEARING: the retired room name "${RETIRED_ROOM}" is unreadable by a user — absent from every rendered string, from hidden dialogs, from the browser tab name, and from every label and title attribute`);
  const retiredLines = served.split('\n').filter((l) => l.includes(RETIRED_ROOM));
  ok(retiredLines.length > 0 && retiredLines.every((l) => /LEGACY/.test(l)),
    `R2 7b: where the retired name DOES survive in source (${retiredLines.length} line(s)), every one is marked LEGACY — it exists only as something the code RECOGNISES, never as something it SHOWS`);
  ok(/Studio blueprints you have modeled/.test(served) && /Studio<br>Blueprint<br>Filed/.test(served),
    'R2 8 LOAD-BEARING, THE OTHER WAY: the word "blueprint" SURVIVES in its document sense (the hero says "Studio blueprints", the stamp still reads "Studio Blueprint Filed") — a rename that purged the word everywhere would look tidy and be wrong');

  /* ── COLLATERAL. Named honestly: the deleted phrase never existed on the Sketch side, so this
        guards the Sketchbook's OWN hero against being edited by mistake, nothing more. ─────── */
  const sketchHeroText = norm(sketchServed.slice(sketchServed.indexOf('sketchbook-page-title')).replace(/<[^>]+>/g, ''));
  ok(sketchHeroText.includes(SKETCH_HERO),
    'R2 6 COLLATERAL: the Sketchbook hero is untouched (note: the deleted phrase never appeared on the Sketch side — one occurrence existed repo-wide and it was the one removed)');

  /* ── THE BINDER TITLE. The rename changed a DEFAULT, and a retired default that stops being
        recognised as one gets frozen onto an account by the next blur. Fixture state: a signed-in
        user whose workspace name is already known — which is what a returning account looks
        like, not a blank one. ─────────────────────────────────────────────────────────────── */
  {
    const { ctx: c2, page: p2 } = await boot(browser, { name: 'Daniel' });
    const t = await p2.evaluate(() => ({
      shown: (document.getElementById('archive-title') || {}).value,
      newGeneric:    window._bpIsDefaultTitle('My Archive'),
      oldGeneric:    window._bpIsDefaultTitle('My Blueprint Archive'),
      newPersonal:   window._bpIsDefaultTitle("Daniel's Archive"),
      oldPersonal:   window._bpIsDefaultTitle("Daniel's Blueprint Archive"),
      deliberate:    window._bpIsDefaultTitle('The Vault Of Doom')
    }));
    ok(t.shown === "Daniel's Archive",
      `R2 9: a returning account's binder defaults to the NEW wording — got "${t.shown}"`);
    ok(t.newGeneric === true && t.newPersonal === true,
      `R2 10 RIG: the recogniser answers TRUE for the current defaults (generic=${t.newGeneric}, personal=${t.newPersonal}) — without this, 11 could pass by always saying true is false`);
    ok(t.oldGeneric === true && t.oldPersonal === true,
      `R2 11 LOAD-BEARING: the RETIRED auto-titles are still recognised as defaults (generic=${t.oldGeneric}, personal=${t.oldPersonal}) — nobody ever chose them, so treating one as a deliberate rename would freeze the old wording on that account forever`);
    ok(t.deliberate === false,
      `R2 12 LOAD-BEARING, THE OTHER WAY: a name the user actually typed is NOT treated as a default (${t.deliberate}) — a recogniser that says yes to everything would silently discard real renames`);
    await c2.close();
  }
  {
    /* End-to-end, not just the seam: an account carrying the retired title must SHED it. */
    const { ctx: c3, page: p3 } = await boot(browser, { name: 'Daniel', override: "Daniel's Blueprint Archive" });
    const before = await p3.evaluate(() => (document.getElementById('archive-title') || {}).value);
    const after = await p3.evaluate(() => {
      const el = document.getElementById('archive-title');
      el.dispatchEvent(new Event('blur'));
      return { stored: localStorage.getItem('datum_blueprint_archive_title') };
    });
    ok(before === "Daniel's Blueprint Archive" && after.stored === null,
      `R2 13 LOAD-BEARING: an account still carrying the retired title sheds it instead of pinning it (was "${before}", stored after blur: ${after.stored}) — the next load shows the new default`);
    await c3.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = RESTORE || DANGLE || NOLEGACY;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${htmlDiffers ? 'YES' : 'NO'}   (Blueprint.html bytes changed: ${htmlDiffers})`);
    if (!htmlDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${RESTORE ? 'MUTATED[restore]' : DANGLE ? 'MUTATED[dangle]' : NOLEGACY ? 'MUTATED[nolegacy]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
