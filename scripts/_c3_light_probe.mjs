/* ══ C3 LIGHT PROBE — PIXELS INTO RECTS, NOT A SCALAR ═══════════════════════════════════════════
 *
 * The C3 palette arc's measuring instrument. Renders studio.html twice — once from the working
 * tree, once from the SERVED BYTES with a named change reverted — and reports every differing
 * pixel LOCALISED INTO THE ELEMENT RECT IT FALLS IN.
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL, AND WHY IT IS COMMITTED RATHER THAN LIVING IN %TEMP%.
 * The rect breakdown that lifted §81.16's suspension (#shape-mode-toggle 825 · #shape-hud 336 ·
 * .canvas-wrapper 15 · outside 4 · #estate-analysis ZERO · #want-readout ZERO) was produced by a
 * throwaway script that no longer exists anywhere in the tree. THE MEASUREMENT SURVIVED IN A
 * SPREADSHEET; THE INSTRUMENT THAT PRODUCED IT DID NOT.
 * 🔑 _render_diff.js's own law, quoted because it was written for exactly this: "A HARNESS IN
 *    %TEMP% IS AN INSTRUMENT THAT DISAPPEARS ON THE DAY SOMEBODY CLEARS A FOLDER." That file is the
 *    third instrument this arc has had to rebuild from nothing. This is the fourth. It stops here.
 *
 * ⛔ _render_diff.js IS NOT THE DONOR AND THAT WAS CHECKED, NOT ASSUMED (L48). It diffs MARKUP
 * character-for-character. This diffs PIXELS. A donor that measures a different quantity is not a
 * donor at all — only its SERVING half was reused, and that half is acknowledged below.
 *
 * ⛔ NOT NAMED _gate_* OR _p<digit>*, AND THAT IS STRUCTURAL, NOT COSMETIC.
 * _suite_baseline.mjs:148 builds its population from /^(_gate_|_p\d)/ over scripts/. A file named
 * _gate_c3_light_probe would be EXECUTED by every argument-less suite run, and with no --mode it
 * would exit 0 and be counted a GREEN THAT TESTED NOTHING. This dodges the glob by prefix, exactly
 * as _render_diff.js and _studio_source.cjs do, and adds nothing to a hand-maintained exclusion
 * list. ⇒ IT IS A TOOL YOU POINT AT A CHANGE, NEVER A GATE THAT RUNS ITSELF.
 *
 * ⛔ NO NEW DEPENDENCY. PNG decode is ~50 lines over built-in zlib (below). Doctrine #34 makes any
 * package.json / package-lock.json movement a DEPLOY-BLOCKER class — Cloudflare installs with
 * strict `npm ci`. AN INSTRUMENT IS NOT WORTH A DEPLOY RISK.
 *
 * ── THE FOUR RULINGS THIS FILE IMPLEMENTS (2026-08-19, MASTER SPEC §81.17-81.19) ────────────────
 *  1. NULL CONTROL FIRST. --mode=null renders the SAME tree on both ports and must read 0. A
 *     DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS NOT A MEASUREMENT — IT IS A NUMBER. This tool
 *     REFUSES to run --mode=differential unless --i-ran-null-first is passed, so the order cannot
 *     be skipped by accident.
 *  2. RECTS, NOT SCALARS. Every differing pixel is bucketed into the element rect containing it,
 *     plus an explicit OUTSIDE-EVERY-RECT bucket. A NUMBER THAT DOES NOT MOVE MAY BE STABLE, OR IT
 *     MAY HAVE NO SIGNAL IN IT — and you cannot tell those apart from the scalar. The 1,180 that
 *     did not move across a fix was insensitive to the two panels under test IN BOTH DIRECTIONS.
 *  3. THE MEASUREMENT PASS RUNS *AFTER* THE CAPTURE. A getBoundingClientRect pass before the
 *     screenshot forced a layout and moved the count 1180 -> 1195. THE INSTRUMENT PERTURBED WHAT IT
 *     MEASURED BY EXACTLY THE SIZE OF THE SIGNAL BEING HUNTED. capture() screenshots FIRST and only
 *     then reads rects, and it asserts that ordering in its own output.
 *  4. THE REVERT MUST PROVE IT LANDED. Every entry in a revert set declares how many times it must
 *     match. A substitution that silently matched zero times would render the control side
 *     IDENTICAL to the shipped side and report a beautiful, meaningless 0. That is the same shape
 *     as the space-instead-of-non-ASCII poison that would have shipped a green on an unfixed bug.
 *
 * ⚠️ WHAT THIS TOOL CANNOT SEE, STATED SO NOBODY BANKS IT AS COVERAGE. It is a DIFFERENTIAL
 * instrument, and §81.12 ruled that a differential proof is blind to any defect COMMON TO BOTH
 * SIDES — an unterminated CSS comment ate two rules and the screenshot test came out clean because
 * both sides carried it. THIS FILE IS HALF THE PROOF. The other half is ABSOLUTE — --mode=absolute
 * here, plus scripts/_gate_css_comments.js — and the two are REPORTED SEPARATELY, NEVER COLLAPSED.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
 *   node scripts/_c3_light_probe.mjs --mode=null
 *   node scripts/_c3_light_probe.mjs --mode=differential --revert=c3 --i-ran-null-first
 *   node scripts/_c3_light_probe.mjs --mode=absolute
 *   node scripts/_c3_light_probe.mjs --mode=selftest      (poison the tree, prove the diff BITES)
 *   -- the ground/edge family, added 2026-08-19 for the stage-tone arc --
 *   node scripts/_c3_light_probe.mjs --mode=profile --page=proto2.html
 *   node scripts/_c3_light_probe.mjs --mode=profile --page=studio.html --enter --target=proto2
 *   node scripts/_c3_light_probe.mjs --mode=area --revert=c3 --i-ran-null-first --enter
 *   node scripts/_c3_light_probe.mjs --mode=edge --revert=c3 --i-ran-null-first --enter
 *
 * ── THE THREE GROUND MODES, AND THE FAILURE EACH ONE EXISTS FOR ─────────────────────────────────
 *  profile — a VERTICAL COLUMN of the rendered ground. §82.6 is accepted ON THE PROFILE, NOT ON THE
 *      DECLARATION, because proto2's rendered ground is DARKER than its own declared gradient: a
 *      vignette and a 6px dot texture sit over it. Authoring the gradient alone gets the top right
 *      and leaves the edges bright. ⭐ --target=proto2 makes the acceptance test EXECUTABLE, and it
 *      read 0/4 RED before the stage tone existed — a real red-first, not a retrofit.
 *  area — the WHOLE RECT, not its centre. The centre sampler reported FOUR zeros on the entered
 *      Studio; TWO were real (#shape-mode-toggle, .drafting-panel at 0.0% moved) and TWO were
 *      ARTEFACTS — #canvas-wrapper and #blueprint-container centres land on brass estate content,
 *      so both read (0,0,0) while 22% of their area was actually moving. 🔑 ONE PIXEL CANNOT
 *      REPRESENT A SURFACE THAT HAS ANYTHING DRAWN ON IT, and only an area sampler can tell a real
 *      zero from an occluded one.
 *  edge — the FALLOFF as a curve along a ray. The "it reads as a blob" complaint is an EDGE
 *      question, and AN ALPHA CHANGE CANNOT FIX AN EDGE — it would make a faint blob instead of a
 *      bright one. Measured on the clean left ray: +33 at the centre, then 29·25·20·16·11·7·3 and
 *      ZERO by 320px. A light that terminates is visible as a boundary on a FLAT field; on a graded
 *      one the ground keeps darkening and the eye reads it as continuous.
 *
 * ⭐ --page LETS ONE INSTRUMENT MEASURE BOTH THE DONOR AND US, so a difference between proto2 and
 *    studio.html is a difference in the PAGES and never between two rigs. The proto2 target table
 *    below was RE-DERIVED with this probe and reproduced the scratch script exactly.
 * EXIT 0 = the run produced a trustworthy report · 1 = an assertion failed · 2 = the harness broke.
 *
 * ⚠️ READ THE REPORT, NOT THE EXIT CODE. "DIFFERS" is not automatically a bug. On a deliberate skin
 * change a diff is the EXPECTED result and the rect breakdown is the review. THE TOOL REPORTS; IT
 * DOES NOT JUDGE. The one thing it does judge is its own trustworthiness.
 *
 * ⭐ --viewport=WxH (default 1440x900) AND --yfrac. See the block above `const [VW, VH]`. Until
 *    2026-08-20 the viewport was a CONSTANT, so every number in this arc came from one screen.
 *
 * PROFILE — unless --viewport says otherwise, numbers are taken at: 1440x900 · cold Studio (cleared)·
 * signed-out · headless chromium · off-origin requests ABORTED (so no CDN font or beacon can move a
 * pixel between two runs). Any figure quoted from here carries that profile or it is quoted wrong.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPTS, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODE = arg('mode', '');
const REVERT_NAME = arg('revert', '');
const NULL_FIRST = argv.includes('--i-ran-null-first');
/* --enter dismisses the landing overlay so the DRAFTING SURFACE is what gets photographed.
   It is a DIFFERENT PROFILE, not a better one, and it carries its own null control. */
const ENTER = argv.includes('--enter');
/* ⭐ --page LETS THE SAME INSTRUMENT MEASURE THE DONOR AND US. proto2.html and studio.html are read
 * by ONE probe, so a difference between them is a difference in the PAGES and never a difference
 * between two measuring rigs. Comparing a donor measured one way against a target measured another
 * is the oldest way to manufacture a delta. */
const PAGE = arg('page', 'studio.html');
/* ══ VIEWPORT — A FLAG, NOT A CONSTANT (§82.12, 2026-08-20) ═════════════════════════════════════
 * ⛔ THIS WAS `const VW = 1440, VH = 900` AND THE RULING THAT ORDERED THE SWEEP SAID "THE PROBE
 *    ALREADY TAKES A VIEWPORT". IT DID NOT. Every number this arc has ever printed — the light's
 *    d=(15,33,24), the 320px falloff, the whole stage profile, proto2's target table — was taken at
 *    ONE SIZE because there was no way to ask for another.
 * 🔑 AND THE STAGE IS A VERTICAL GRADIENT, SO ITS PROFILE IS HEIGHT-DEPENDENT BY CONSTRUCTION. A
 *    ONE-VIEWPORT MEASUREMENT BASIS UNDER A SIZE-DEPENDENT ARTEFACT IS NOT A NARROW PROOF — IT IS
 *    AN UNSTATED PREMISE, WHICH IS THE CLASS THAT HAS COST THIS ARC FIVE RULINGS. */
const [VW, VH] = arg('viewport', '1440x900').split('x').map(Number);
if (!Number.isFinite(VW) || !Number.isFinite(VH) || VW < 320 || VH < 240) {
  console.log(`SCORE 0/0 RED — bad --viewport (want WxH, e.g. 1366x768); got "${arg('viewport', '')}"`);
  process.exit(2);
}
/* Column(s) for --mode=profile. The default is the far right edge — the least content-covered
 * column on studio.html cold — and it is DERIVED FROM THE VIEWPORT, not pinned at 1425.
 * ⛔ 1425 WAS HARD-CODED, AND AT 1366 WIDE THAT COLUMN DOES NOT EXIST. columnProfile's clamp would
 *    have sampled x=1365 and PRINTED IT AS x=1425 — a real pixel wearing a coordinate that is not
 *    its own. Override when a layout puts something at the edge. */
const COLS = arg('cols', String(VW - 15)).split(',').map(Number);
/* --yfrac takes heights as FRACTIONS OF THE VIEWPORT rather than absolute pixels, and it exists
 * because "does the ground drift at another size" is TWO questions with OPPOSITE right answers:
 *   ABSOLUTE y — the ground MUST differ. A percentage gradient stretches, so y=250 is 27.8% down a
 *       900px page and 32.6% down a 768px one. Drift here is arithmetic, not a defect.
 *   FRACTIONAL y — the ground SHOULD be invariant. This is the sampling that can find a real one.
 * ⭐ THE DEFAULT ROUND-TRIPS TO THE SHIPPED HEIGHTS AT 1440x900 (120/250/550/700 = 13.33% / 27.78%
 *    / 61.11% / 77.78%), so the committed acceptance test's behaviour at its own viewport is
 *    UNCHANGED by this flag existing. */
const YFRAC = arg('yfrac', '');
const CLOCK = arg('clock', '');
const APPLY = arg('apply', '');
const SAVE = arg('save', '');
const SETTLE = parseInt(arg('settle', '1200'), 10);
const CENTER_EL = arg('center-el', '');
const CENTER_FRAC = arg('center-frac', '0.62,0.18');
const TARGET = arg('target', '');
const TOL = parseInt(arg('tol', '2'), 10);

/* ⛔ THE ACCEPTANCE TARGET IS A MEASUREMENT, NOT A FEELING — it is proto2's OWN rendered profile,
 * taken by THIS probe at 1440x900, and the Architect authored §82.6 against these numbers rather
 * than against an intention. Re-derive it (`--mode=profile --page=proto2.html`) rather than trust
 * this table if proto2 ever changes.
 * ⚠️ THE ±2 TOLERANCE IS RULED, NOT ASSUMED (Architect, 2026-08-19). It exists because our stack
 *    and proto2's stack are not the same set of layers, so an exact match is not achievable and
 *    demanding one would be a defect with permission of the opposite kind. The tool ALWAYS prints
 *    the real per-channel delta, so the tolerance can never hide a drift inside it. */
/* ⛔⛔ THE ACCEPTANCE HEIGHTS ARE VALIDATOR-DERIVED, AND TWO EARLIER ONES ARE REJECTED FOR CAUSE.
 * 🔑 THE RULE (§82.8): AN ACCEPTANCE POINT MUST BE FIELD-VALID ON *BOTH* PAGES, OR IT IS NOT A
 *    COMPARISON — IT IS TWO MEASUREMENTS OF DIFFERENT THINGS WEARING ONE ROW.
 * REJECTED, WITH THE ELEMENT THAT BLOCKED THEM, SO NOBODY RE-PROPOSES THEM:
 *   y=20   ours  NAV#app-nav        rgba(9,18,33,0.96)
 *          proto2 HEADER (.topbar)  rgba(4,10,18,0.94)   <- and that nav is RULED OUT OF SCOPE (§61)
 *   y=860  ours  DIV#privacy-banner rgba(9,18,33,0.97)
 *          proto2 open stage                              <- so the row compared a cookie banner
 *                                                            against a blueprint
 * FIELD-VALID ON BOTH, MEASURED: 120 · 250 · 400 · 550 · 700.
 * CHOSEN: 120 · 250 · 550 · 700 — deliberately SPREAD (one above 250, one below 550) so the profile
 * still tests a GRADIENT rather than a band.
 * ⚠️ TARGETS RE-DERIVED AT THE NEW HEIGHTS WITH THIS PROBE. A target from a different instrument is
 *    an assumption wearing a number — AND SO IS A TARGET FROM A DIFFERENT HEIGHT. */
const TARGETS = {
  proto2: { 120: [6, 10, 17], 250: [4, 10, 18], 550: [5, 11, 20], 700: [5, 12, 22] },
};

const PORT_A = 8431;   /* shipped / working tree            */
const PORT_B = 8432;   /* control  / reverted served bytes  */
/* PORT DISCIPLINE: 8431-8432 claimed 2026-08-19. 8001 is the SUITE'S shared server and is never
   self-hosted on (66 browser gates depend on it). These two are above every port the gates use. */

/* ══ REVERT SETS ════════════════════════════════════════════════════════════════════════════════
   A revert is applied to the SERVED BYTES on PORT_B, never to the working tree. §81.10: "A CONTROL
   RUN AGAINST WHAT YOU INTENDED TO SHIP PROVES YOUR INTENTION; ONE RUN AGAINST THE ARTEFACT PROVES
   THE ARTEFACT." Each entry declares `count` — the number of times it MUST match. Mismatch aborts.
   ⛔ `count` IS NOT DOCUMENTATION. It is the guard that stops a silently-inert control reporting a
      clean 0. Set it from a measurement, never from an expectation. */
/* ⛔ THE GROUND'S PAINTING TOKENS — ONE LIST, TWO CONSUMERS: the selftest poison aims at these, and
   L15 in --mode=absolute asserts the page consumes NOTHING ELSE. Keeping them in one place is what
   stops the two drifting apart, which is exactly how the poison went deaf on 2026-08-19. */
const POISON_GROUND = ['--stage-field', '--stage-base', '--stage-vignette', '--stage-key',
  '--stage-fill', '--stage-glow', '--stage-rim', '--stage-sheen', '--stage-grid-minor', '--grid-major',
  /* ⭐ FOUND BY THE GUARD ON ITS FIRST RUN, WHICH IS THE ONLY REASON IT IS HERE: typography.css:8
     paints `body { background-color: var(--bg-navy) !important }`, so it IS a ground token — and no
     poison list had ever mentioned it. Covered transitively (--paint-inkwell -> --bg -> --bg-navy),
     but "covered by accident" and "covered on purpose" are different states and only one is
     auditable. */
  '--bg-navy'];
/* HOW EACH IS POISONED — DIRECTLY, OR THROUGH ITS PAINT. ⭐ THE PALETTE MADE THE POISON SMALLER:
   --stage-key / --stage-glow / --stage-rim / --stage-grid-minor ALL derive from --paint-seafoam, so
   ONE paint poisons four layers. That is the same one-edit property the Captain asked for, showing
   up in the instrument. --grid-major follows --paint-graphite-blue; --bg-navy follows
   --paint-inkwell; the rest carry literals and are poisoned where they are declared. */

const REVERTS = {
  /* C3 — THE LIGHT. Strips the two body radials from studio.html so PORT_B renders the UNLIT page.
     Filled in by the commit that introduces them; declared here so the control ships WITH the
     change and not after it (write-the-check-WITH-the-feature). */
  c3: [
    {
      file: 'studio.html',
      /* ⛔ ONE VARIABLE PER REVERT SET. This strips ONLY the key radial and leaves the stage field
         and vignette in place, so `--mode=area` measures THE LIGHT and not the ground. When the
         body block gained the stage layers this find string stopped matching — and the landing
         guard turned the run RED rather than printing a number over an unpoisoned tree. That is
         the guard doing its job, and the fix is to move the string, never to loosen the check.
         🔑 A CONTROL THAT REVERTS TWO THINGS AT ONCE CANNOT ATTRIBUTE WHAT IT MEASURES. */
      find: '      radial-gradient(circle at 70% 15%, var(--light-key), transparent 24%),\n',
      replace: '',
      count: 1,
    },
  ],
  /* stage — ISOLATES THE GROUND (§82.8), leaving the key light untouched, so the differential
     attributes what THIS commit changed and nothing else. Neutralising the three tokens to `none`
     is deliberate: `background-image: <grid>, none` and `background: none` are both VALID CSS, so
     every consumer degrades to "layer absent" without the find-strings having to track four
     separate consuming rules across two files. ⭐ ONE REVERT PER VARIABLE, AND THE VARIABLE HERE IS
     "the stage layers exist". */
  stage: [
    { file: 'styles/tokens.css', find: '  --stage-field:    linear-gradient(180deg, #040a12 0%, #07101b 24%, #091220 100%);', replace: '  --stage-field: none;', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-vignette: radial-gradient(circle at 50% 50%, transparent 54%, rgba(2,8,15,0.10) 78%, rgba(2,8,15,0.28) 100%);', replace: '  --stage-vignette: none;', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-base:     linear-gradient(180deg, rgba(4,10,18,0.88), rgba(8,16,28,0.94));', replace: '  --stage-base: none;', count: 1 },
  ],
  /* ⭐⭐ spelling — THE PROOF THAT PALETTE-SPELLING IS NOT A RECOLOUR (§82.15). Rewrites every token
     reference in the stage stack back to proto2's OWN LITERALS. The Architect ruled the donor's
     VALUES verbatim; the Captain ruled they be reachable from the palette. Those two are only
     compatible if the spellings render identically — SO IT IS MEASURED, NOT ASSERTED.
     ⚠️ AND THE EXPECTED RESULT IS NOT AUTOMATICALLY ZERO, WHICH IS WHY THIS IS WORTH RUNNING:
        color-mix() resolves through chromium's `color(srgb …)` path and can round ONE unit
        differently from an rgba() literal — tokens.css already documents exactly that for
        --grid-line. 🔑 A NON-ZERO HERE IS A ROUNDING FACT TO REPORT, NOT A FAILURE TO HIDE; a
        LARGE one would mean the spelling changed the colour and the port is wrong. */
  spelling: [
    { file: 'studio.html', find: 'linear-gradient(var(--grid-major) 1px, transparent 1px),\n      linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),\n      linear-gradient(var(--stage-grid-minor) 1px, transparent 1px),\n      linear-gradient(90deg, var(--stage-grid-minor) 1px, transparent 1px),\n      radial-gradient(circle at 62% 18%, var(--stage-key), transparent 29%),\n      radial-gradient(circle at 18% 82%, var(--stage-fill), transparent 24%),',
      replace: 'linear-gradient(rgba(42,78,104,.16) 1px, transparent 1px),\n      linear-gradient(90deg, rgba(42,78,104,.16) 1px, transparent 1px),\n      linear-gradient(rgba(121,222,199,.045) 1px, transparent 1px),\n      linear-gradient(90deg, rgba(121,222,199,.045) 1px, transparent 1px),\n      radial-gradient(circle at 62% 18%, rgba(121,222,199,.085), transparent 29%),\n      radial-gradient(circle at 18% 82%, rgba(73,110,180,.075), transparent 24%),', count: 1 },
    { file: 'studio.html', find: 'inset 0 0 0 1px var(--stage-rim)', replace: 'inset 0 0 0 1px rgba(121,222,199,.035)', count: 1 },
    { file: 'studio.html', find: 'radial-gradient(circle at 50% 48%, var(--stage-glow), transparent 52%),\n      var(--stage-sheen);',
      replace: 'radial-gradient(circle at 50% 48%, rgba(121,222,199,.055), transparent 52%),\n      linear-gradient(180deg, rgba(255,255,255,.01), transparent 16%, transparent 82%, rgba(0,0,0,.14));', count: 1 },
  ],
  /* ⭐ proto2key — STRIPS THE DONOR'S OWN STAGE LIGHT so its falloff can be measured the same way we
     measure ours. §82's L48 applied to a CURVE instead of a value: ONE measurement of the donor
     replaces two attribution runs of ours. If proto2's own falloff dips too, the dip is the donor's
     LOOK and we port it without apology; if it is clean, our dip is ours.
     ⚠️ SAFE ON THE `background-size` LIST BY ARITHMETIC, NOT BY LUCK: `.right` declares 7 layers and
        7 sizes (76,76,19,19,auto,auto,auto). Removing the 5th layer leaves 6 layers and the first 6
        sizes still map correctly; the surplus 7th is ignored per spec. A different layer could NOT
        be removed this safely — check before reusing this shape. */
  /* novignette — ATTRIBUTION, ONE VARIABLE. Neutralises ONLY `.canvas-wrapper::after` so the
     acceptance residual can be attributed to the vignette or exonerated of it. */
  novignette: [
    { file: 'styles/tokens.css', find: '  --stage-vignette: radial-gradient(circle at 50% 50%, transparent 54%, rgba(2,8,15,0.10) 78%, rgba(2,8,15,0.28) 100%);', replace: '  --stage-vignette: none;', count: 1 },
  ],
  /* ⭐ chromedark — A PREVIEW, NOT A PROPOSAL. Darkens the three site-wide chrome surfaces (nav,
     cookie bar, disclosure footer) from inkwell to proto2's topbar value, so the Captain can SEE
     what site-wide would look like before anyone edits a SACRED byte. Two of these three files are
     SACRED hosts; trialling this on disk would cost two pin bumps and a full build PER LOOK. */
  chromedark: [
    { file: 'styles/header.css', find: 'height: 56px; background: rgba(9, 18, 33, 0.96);', replace: 'height: 56px; background: rgba(4, 10, 18, 0.94);', count: 1 },
    { file: 'styles/header.css', find: 'background: rgba(9, 18, 33, 0.99);', replace: 'background: rgba(4, 10, 18, 0.99);', count: 1 },
    { file: 'nav.js', find: 'background:rgba(9,18,33,0.97);border-top', replace: 'background:rgba(4,10,18,0.97);border-top', count: 1 },
    { file: 'scripts/datum-footer.js', find: "'width:100%;background:rgba(9,18,33,0.97);'", replace: "'width:100%;background:rgba(4,10,18,0.97);'", count: 1 },
  ],
  /* ⭐ nolift — IS proto2:97 LOAD-BEARING ON *OUR* PANEL? Strips `.drafting-panel > *`'s lift so the
     question is answered by PIXELS, not by reading the CSS. proto2's mechanism is THREE legs:
     :79 anchors (position:relative), :88 overlays (::before), :97 LIFTS THE CONTENT ABOVE IT.
     ⛔ A THREE-LINE MECHANISM PORTED AS TWO IS THE POSITIONAL-LIST TRAP IN A DIFFERENT ALPHABET.
     READ THE RESULT BOTH WAYS: pixels moving on TEXT = the rule is load-bearing and working;
     ZERO = either our own stacking already covers it (rule redundant but harmless) or the grid
     never reaches the text — and those two are told apart by WHERE the pixels are, not by the
     total. */
  nolift: [
    { file: 'studio.html', find: '  .drafting-panel > * { position: relative; z-index: 1; }', replace: '  .drafting-panel > * { }', count: 1 },
  ],
  proto2key: [
    { file: 'proto2.html', find: '    radial-gradient(circle at 62% 18%,rgba(121,222,199,.085),transparent 29%),\n', replace: '', count: 1 },
  ],
  /* ⭐ keymove — A PROPOSAL, MEASURED BEFORE IT IS AUTHORED (§82.13 ruling, 2026-08-20). Moves the
     key radial OFF `body` and INTO `.canvas-wrapper`'s background-image stack ABOVE `--stage-base`,
     which is the placement the Architect ruled. Used with --apply, never shipped from here.
     ⛔ LAYER ORDER IS THE WHOLE POINT AND IT IS EASY TO GET BACKWARDS: in a `background-image` list
        the FIRST layer paints ON TOP. So the key goes FIRST, before the two grid layers and before
        `--stage-base`. Putting it last would reproduce the exact bug being fixed — the light under
        the stage — while looking like a fix.
     ⚠️ THE TWO ENTRIES ARE ONE CHANGE: strip from body, insert into the wrapper. If either fails to
        match, the landing guard aborts rather than measuring a half-move. */
  keymove: [
    { file: 'studio.html', find: '      radial-gradient(circle at 70% 15%, var(--light-key), transparent 24%),\n', replace: '', count: 1 },
    { file: 'studio.html', find: 'background-image: linear-gradient(rgba(100, 180, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 180, 255, 0.05) 1px, transparent 1px), var(--stage-base);', replace: 'background-image: radial-gradient(circle at 70% 15%, var(--light-key), transparent 24%), linear-gradient(rgba(100, 180, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 180, 255, 0.05) 1px, transparent 1px), var(--stage-base);', count: 1 },
    /* ⛔⛔ THE THIRD ENTRY IS NOT BOOKKEEPING — WITHOUT IT THIS TRIAL MEASURES A BROKEN PAGE.
       `background-size` has THREE values for what becomes FOUR layers, and a short list REPEATS
       CYCLICALLY: the key would take `40px 40px` (tiling the light into a 40px grid of tiny lights)
       and `--stage-base` would take `40px 40px` too, tiling the stage. The measurement would come
       back wrong and look like evidence about the POSITION.
       🔑 THIS IS THE FOUR-PAIR HAZARD §77.6 ALREADY FLAGGED FOR D, ARRIVING EARLY BECAUSE ADDING A
          LAYER IS WHAT TRIGGERS IT — NOT BECAUSE D STARTED. Any commit that adds a background layer
          here owes the same edit. */
    { file: 'studio.html', find: 'background-size: 40px 40px, 40px 40px, auto;', replace: 'background-size: auto, 40px 40px, 40px 40px, auto;', count: 1 },
  ],
  /* SELFTEST — a deliberate, obvious poison used to prove the diff pipeline BITES. It changes the
     page field itself, so a working differ must report a very large number across many rects. If
     this reports 0, the instrument is broken and every other number it has ever printed is void. */
  /* ⛔⛔ THIS SET WENT DEAF ON 2026-08-19 AND NOBODY NOTICED FOR A DAY. MEASURED 2026-08-20:
   *    RECORDED (§81.22): 1,266,102 px, max 150/255.  RE-RUN AT THE SAME COMMIT: 8,132 px cold /
   *    2,366 px entered — A 99.4% LOSS OF BITE — AND THE MODE'S OWN THRESHOLD (>10,000) THEREFORE
   *    PRINTED "THE DIFFER IS BROKEN. EVERY NUMBER IT HAS PRINTED IS VOID." THE DIFFER WAS FINE:
   *    the same run measured the stage revert at 951,717 px (73.44%), reproducing the baton exactly.
   * 🔑 CAUSE — AND IT IS §81.22's LAW ARRIVING INSIDE THE CONTROL INSTEAD OF THE MEASUREMENT:
   *    `--paint-inkwell` still reaches the ground (inkwell → --bg → --bg-navy → body
   *    background-COLOR, via typography.css:8). But `dffdecd` gave body a background-IMAGE
   *    (`--stage-field`) that is FULLY OPAQUE, and an image paints over a colour. THE POISON STILL
   *    LANDED AND WAS SIMPLY NO LONGER VISIBLE. A POISON OCCLUDED BY A LAYER IS A CONTROL
   *    MEASURING THE LAYER — the deafness control had itself gone deaf.
   * ⛔ THE `count:1` GUARDS COULD NOT SEE THIS. They prove a string was SUBSTITUTED, never that the
   *    substitution CHANGED A PIXEL. ⇒ LANDING IS NOT THE SAME PROOF AS BITING.
   * ⇒ THE POISON NOW COVERS EVERY LAYER THAT PAINTS THE GROUND TODAY. The threshold is UNCHANGED at
   *    10,000 — restoring a control's bite is a repair; lowering the bar it failed would have been
   *    "a tolerance closed by a nudge" (§82.8), which is the opposite thing. */
  selftest: [
    { file: 'styles/tokens.css', find: '--paint-inkwell:        #091221;', replace: '--paint-inkwell:        #FF0000;', count: 1 },
    { file: 'styles/tokens.css', find: '--paint-seafoam:        #79DEC7;', replace: '--paint-seafoam:        #FF0000;', count: 1 },
    { file: 'styles/tokens.css', find: '--paint-graphite-blue: #2A4E68;', replace: '--paint-graphite-blue: #FF0000;', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-field:    linear-gradient(180deg, #040a12 0%, #07101b 24%, #091220 100%);', replace: '  --stage-field:    linear-gradient(180deg, #FF0000 0%, #FF0000 24%, #FF0000 100%);', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-base:     linear-gradient(180deg, rgba(4,10,18,0.88), rgba(8,16,28,0.94));', replace: '  --stage-base:     linear-gradient(180deg, rgba(255,0,0,0.88), rgba(255,0,0,0.94));', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-vignette: radial-gradient(circle at 50% 50%, transparent 54%, rgba(2,8,15,0.10) 78%, rgba(2,8,15,0.28) 100%);', replace: '  --stage-vignette: radial-gradient(circle at 50% 50%, transparent 54%, rgba(255,0,0,0.10) 78%, rgba(255,0,0,0.28) 100%);', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-fill:     rgba(73, 110, 180, 0.075);', replace: '  --stage-fill:     rgba(255, 0, 0, 0.075);', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-sheen:    linear-gradient(180deg, rgba(255,255,255,0.01), transparent 16%, transparent 82%, rgba(0,0,0,0.14));', replace: '  --stage-sheen:    linear-gradient(180deg, rgba(255,0,0,0.9), transparent 16%, transparent 82%, rgba(255,0,0,0.9));', count: 1 },
  ],
};

/* ══ PNG DECODE — 8-bit non-interlaced, which is what chromium's screenshot() emits ══════════════
   ⛔ WRITTEN OUT RATHER THAN INSTALLED, ON PURPOSE. See the dependency note in the header.
   Supports colour types 2 (RGB) and 6 (RGBA) at bit depth 8. ANY OTHER SHAPE THROWS RATHER THAN
   GUESSING — a decoder that silently mis-reads a format produces plausible wrong pixels, which is
   the most expensive failure this arc has. */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || (ctype !== 2 && ctype !== 6)) throw new Error(`unsupported PNG depth=${depth} ctype=${ctype}`);
  const chan = ctype === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * chan;
  const out = Buffer.alloc(w * h * chan);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const prev = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= chan ? cur[x - chan] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= chan ? prev[x - chan] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error('bad PNG filter ' + filter);
      cur[x] = v & 255;
    }
  }
  return { w, h, chan, data: out };
}

/* ══ STATIC SERVER ══════════════════════════════════════════════════════════════════════════════
   The SERVING half is the one part reused from _render_diff.js (its diff half measures markup, not
   pixels, so it is not a donor for the rest). `transform` rewrites text assets on the way out —
   never on disk. */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serve(port, transform, landed) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((q, s) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p === '/') p = '/studio.html';
      const rel = p.replace(/^\//, '');
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
      let body = fs.readFileSync(f);
      if (transform && /\.(html|css|js|mjs)$/.test(p)) {
        const before = body.toString('utf8');
        const after = transform(rel, before, landed);
        if (after !== before) body = Buffer.from(after, 'utf8');
      }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      s.end(body);
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

function makeTransform(set) {
  return (rel, src, landed) => {
    let out = src;
    for (const r of set) {
      if (r.file !== rel) continue;
      const n = out.split(r.find).length - 1;
      /* ⛔ A SET, NOT A COUNTER — AND _render_diff.js WARNED ABOUT THIS EXACT MISTAKE IN ITS OWN
       * COMMENTS BEFORE I MADE IT. capture() loads the page TWICE (goto, then reload after clearing
       * storage for a cold boot), so the transform runs twice per asset and a naive push reported
       * "landed" twice for ONE site — inviting the reader to believe there were two. Keyed by
       * file+find, so re-serving the same asset cannot inflate the evidence. */
      const key = r.file + '|' + r.find;
      const prior = landed.find((l) => l.key === key);
      if (prior) { if (n !== prior.actual) prior.unstable = true; }
      else landed.push({ key, file: r.file, expected: r.count, actual: n });
      if (n > 0) out = out.split(r.find).join(r.replace);
    }
    return out;
  };
}

/* ══ CAPTURE ════════════════════════════════════════════════════════════════════════════════════
   ⛔ THE ORDER IN HERE IS A RULING, NOT A PREFERENCE (§81.18). The screenshot is taken BEFORE any
   geometry is read. A getBoundingClientRect pass ahead of the capture forced a layout and moved a
   measured count by 15 pixels — the same order of magnitude as the signal C3 is hunting. */
async function capture(port, chromium, pageRel, PROBE_POINTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  /* ⏱️ --clock PINS THE WALL CLOCK. THE STUDIO IS A RETIREMENT CALCULATOR: ITS CANVAS IS DRAWN FROM
     TODAY'S DATE, SO ITS *GEOMETRY* CAN MOVE OVERNIGHT WITHOUT A BYTE CHANGING — AND `--stage-base`
     IS A GRADIENT OVER THAT GEOMETRY, SO THE GROUND COLOUR AT A FIXED y MOVES WITH IT.
     ⛔ MECHANISM REUSED FROM `_gate_moat_winners.js:47-49`, INCLUDING ITS WARNING, WHICH WAS READ
        BEFORE COPYING (L48 — reuse-don't-fork ASSUMES the donor is correct, so the donor was
        measured): setFixedTime, NEVER clock.install() — install() also fakes TIMERS and the
        Studio's settle path never completes. */
  if (CLOCK) await ctx.clock.setFixedTime(new Date(CLOCK + 'T12:00:00'));
  const page = await ctx.newPage();
  /* OFF-ORIGIN ABORTED. A CDN font or an analytics beacon that answers on one run and not the next
     moves pixels for a reason that has nothing to do with the change under test. */
  let offOrigin = 0;
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:')) return route.continue();
    offOrigin++; return route.abort();
  });
  await page.goto(`http://127.0.0.1:${port}/${pageRel || 'studio.html'}`, { waitUntil: 'load' });
  /* COLD STUDIO: clear storage, then reload so the page boots from the cold path, not from a
     mutated live one. §D10's rAF re-trigger shape — parse-time init must actually re-run. */
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  /* ⏳ --settle RAISES THIS. 1200ms is enough for the Studio, which has no entrance animation on the
     surfaces we measure. It is NOT enough for marketing pages: index.html reads 9.3% of pixels
     differing between two captures at 1200ms (.btn, .hero-lead, tooltips, SVG paths still fading).
     ⛔ AT THAT POINT A BEFORE/AFTER PAIR IS MEASURING ANIMATION PHASE, NOT THE CHANGE — and the
        picture looks completely convincing either way. The stability check is what catches it; this
        flag is what fixes it. 🔑 A CAPTURE OF AN UNSETTLED PAGE IS A MEASUREMENT OF THE CLOCK. */
  await page.waitForTimeout(SETTLE);
  /* ⛔⛔ --enter EXISTS BECAUSE THE COLD PROFILE CANNOT SEE THE SURFACE C3 IS ABOUT, AND THAT WAS
   * MEASURED, NOT ASSUMED (2026-08-19). On a cold Studio, `.so-overlay-wrap` (studio.html:18836) is
   * a FIXED, FULL-SCREEN, z-index 9000 landing overlay carrying
   *     linear-gradient(180deg, rgba(3,8,18,.36), rgba(3,8,18,.72))  +  backdrop-filter: blur(9px)
   * — a darkening scrim over the WHOLE viewport with a 9px blur behind it. Measured through it, the
   * two body radials read d=(0,1,0) at the key's own centre: the scrim absorbs the light and the
   * blur smears what survives.
   * 🔑 THIS IS THE DOCUMENTED "MEASURED THROUGH AN ENTRY OVERLAY" RIG FAULT, AND A COLD-PROFILE
   *    d LIT TABLE WOULD HAVE BEEN A PAGE OF CONFIDENT ZEROES DESCRIBING A SURFACE NOBODY LOOKED AT.
   * ⚠️ THE COLD PROFILE IS STILL CORRECT FOR THE GROUND COMMIT'S no-op screenshot — it is wrong ONLY
   *    for measuring the lit drafting surface. TWO PROFILES, TWO JOBS; NEITHER REPLACES THE OTHER.
   * ⛔ AND AN ENTERED PROFILE NEEDS ITS OWN NULL CONTROL. A null pair proven cold proves nothing
   *    about a page that has since run an entry animation. Run --mode=null --enter before believing
   *    any --enter number. */
  if (ENTER) {
    const btn = await page.$('#studioStartScratch');
    /* A donor page (proto2.html) has no landing overlay; --enter is a studio-only concept and
       saying so beats silently skipping, which would make one capture differ from the other. */
    if (!btn) throw new Error('--enter: #studioStartScratch not found — the landing overlay changed shape');
    await btn.click();
    await page.waitForFunction(() => {
      const w = document.getElementById('studioOverlayWrap');
      if (!w) return true;
      const cs = getComputedStyle(w);
      return cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02;
    }, { timeout: 15000 });
    /* The dismissal is a 280ms opacity transition (.so-overlay-wrap.dismissed). Settle well past it
       so neither capture photographs a half-faded scrim. */
    await page.waitForTimeout(1500);
  }
  const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: VH } });
  /* ── EVERYTHING BELOW THIS LINE HAPPENS AFTER THE CAPTURE. See the ruling above. ── */
  /* ⛔⛔ SAMPLE-POINT VALIDATION — ADDED 2026-08-19 BECAUSE THE ACCEPTANCE TEST WAS MEASURING CHROME.
   * The first stage-tone profile sampled y=20/250/550/860 at x=1425. TWO of those four points were
   * not the field at all: y=20 hit `NAV#app-nav` (rgba(9,18,33,.96)) on ours and `HEADER.topbar`
   * (rgba(4,10,18,.94)) on proto2 — so the "target" was proto2's NAV COLOUR, on a nav the Architect
   * had already ruled OUT OF SCOPE — and y=860 compared our `#privacy-banner` against proto2's open
   * stage. Only y=250 and y=550 were ground on both pages.
   * 🔑 THE SAME LAW AS THE RECT-CENTRE FAILURE, ONE MODE OVER: A SAMPLE CAN BE STABLE, IT CAN LACK
   *    SIGNAL, AND IT CAN BE MEASURING SOMETHING ELSE THAT HAPPENS TO SIT WHERE YOU LOOKED.
   * ⛔ SO THE PROBE NOW VALIDATES ITS OWN SAMPLE POINTS AND REFUSES TO SCORE AN OCCLUDED ONE. A
   *    point is FIELD only if every element from the hit-test target up to <body> has a fully
   *    transparent background. Occluded points are PRINTED, never silently dropped and never
   *    scored — an excluded point nobody sees is a population lie. */
  /* ⛔⛔ AMENDED 2026-08-20 — IT WAS BLIND TO `background-image`, WHICH IS EVERY LAYER THIS ARC ADDED.
   * It read `backgroundColor` ONLY. `--stage-base`, `--stage-vignette` and the 40px grid are ALL
   * background-IMAGES, and the vignette is on a `::after` the walk never visited. So it certified
   * the KEY LIGHT'S OWN CENTRE as "field-valid" while `.canvas-wrapper`'s α-0.88 stage base painted
   * over it — and the light measured d=(2,3,3) against an authored (15,33,24) with nothing flagged.
   * 🔑 THE GUARD AGAINST MEASURING THROUGH AN UNDECLARED LAYER COULD NOT SEE THE LAYERS WE DECLARED
   *    — §61.4's accessibility gate reading the wrong background, one instrument over.
   *
   * ⛔ THE FIX IS NOT "BLOCK ON ANY BACKGROUND-IMAGE". THAT WOULD MARK EVERY STAGE POINT OCCLUDED
   *    AND DESTROY THE ACCEPTANCE TEST, BECAUSE `--stage-base` *IS* THE GROUND — proto2's `.right`
   *    carries its own base too, so both sides legitimately have a stage layer at those points.
   *    The defect was never that these points were SCORED. It was that the stack above them was
   *    INVISIBLE. ⇒ THE VERDICT RULE IS UNCHANGED (an opaque background-COLOUR above <body> still
   *    refuses to score); WHAT IS NEW IS THAT EVERY PAINTING LAYER IS NAMED.
   * 🔑 §81.22 EXECUTED LITERALLY: "NAME EVERY LAYER BETWEEN THE PROBE AND THE SURFACE, OR THE NUMBER
   *    DESCRIBES THE LAYER." Had this printed on the stage commit, the smothered key was one line
   *    of output away from being obvious. */
  const pointCheck = await page.evaluate((pts) => pts.map(([x, y]) => {
    let el = document.elementFromPoint(x, y);
    if (!el) return [x, y, 'NO ELEMENT', false, []];
    const name = (n) => `${n.tagName}${n.id ? '#' + n.id : (n.classList && n.classList[0] ? '.' + n.classList[0] : '')}`;
    const alphaOf = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(','); return p[3] !== undefined ? parseFloat(p[3]) : 1; };
    const first = name(el);
    let node = el, blocker = null;
    const stack = [];   /* EVERY painting layer, outermost-in. Named, never silently skipped. */
    while (node && node !== document.documentElement) {
      for (const pseudo of ['::before', '::after', null]) {
        const cs = getComputedStyle(node, pseudo);
        /* A pseudo with no `content` generates no box and paints nothing — skip it, but only for
           that reason, and say so here so the skip is a stated rule and not an accident. */
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
        const bi = cs.backgroundImage, bc = cs.backgroundColor, a = alphaOf(bc);
        if (bi && bi !== 'none') stack.push(`${name(node)}${pseudo || ''} background-image: ${bi.slice(0, 78)}`);
        if (a > 0.01) stack.push(`${name(node)}${pseudo || ''} background-color: ${bc}`);
        /* VERDICT RULE — UNCHANGED ON PURPOSE. Only an opaque background-COLOUR above <body> makes a
           point un-scoreable. Widening this to images is a POPULATION change, not a bug fix, and it
           would silently retire two of the four acceptance heights. */
        if (!pseudo && a > 0.01 && node !== document.body && !blocker) blocker = `${name(node)} bg=${bc}`;
      }
      node = node.parentElement;
    }
    return [x, y, blocker || first, !blocker, stack];
  }), (PROBE_POINTS || []));
  const rects = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const id = el.id ? '#' + el.id : null;
      const cls = el.className && typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/)[0] : null;
      out.push({ sel: id || cls || el.tagName.toLowerCase(), x: r.x, y: r.y, w: r.width, h: r.height, area: r.width * r.height });
    });
    return out;
  });
  /* ⏱️ THE CLOCK'S LANDING PROOF. Read AFTER the capture, per the ordering ruling (§81.18).
     ⛔ WITHOUT THIS, "--clock CHANGED NOTHING" AND "--clock NEVER APPLIED" ARE THE SAME OBSERVATION,
        AND THE SECOND ONE WOULD HAVE LET ME RULE OUT A DATE HYPOTHESIS I HAD NEVER ACTUALLY TESTED.
     🔑 THE ARCHITECT'S OWN DOCTRINE, ONE FLAG OVER: LANDING IS NOT THE SAME PROOF AS BITING. This
        proves LANDING; only a moved pixel proves BITING, and the two are reported separately. */
  const pageNow = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  await browser.close();
  return { shot, rects, offOrigin, pointCheck, pageNow };
}

/* ══ RECT LOCALISATION ══════════════════════════════════════════════════════════════════════════
   Each differing pixel is attributed to the SMALLEST rect containing it — the innermost element, so
   a diff inside a button is reported as the button and not as <body>. Pixels inside no rect at all
   get their own bucket, because "outside everything" is a finding, not a rounding error. */
function localise(a, b, rects) {
  const A = decodePNG(a), B = decodePNG(b);
  if (A.w !== B.w || A.h !== B.h) throw new Error(`size mismatch ${A.w}x${A.h} vs ${B.w}x${B.h}`);
  const sorted = rects.slice().sort((p, q) => p.area - q.area);
  const buckets = new Map();
  let total = 0, maxDelta = 0, outside = 0;
  const chanA = A.chan, chanB = B.chan;
  for (let y = 0; y < A.h; y++) {
    for (let x = 0; x < A.w; x++) {
      const ia = (y * A.w + x) * chanA, ib = (y * B.w + x) * chanB;
      const dr = Math.abs(A.data[ia] - B.data[ib]);
      const dg = Math.abs(A.data[ia + 1] - B.data[ib + 1]);
      const db = Math.abs(A.data[ia + 2] - B.data[ib + 2]);
      const d = Math.max(dr, dg, db);
      if (d === 0) continue;
      total++; if (d > maxDelta) maxDelta = d;
      let hit = null;
      for (const r of sorted) { if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { hit = r; break; } }
      if (!hit) { outside++; continue; }
      const k = hit.sel;
      const cur = buckets.get(k) || { n: 0, max: 0 };
      cur.n++; if (d > cur.max) cur.max = d;
      buckets.set(k, cur);
    }
  }
  return { total, maxDelta, outside, buckets, pixels: A.w * A.h };
}

/* ══ d LIT — THE MEASURED COLUMN ════════════════════════════════════════════════════════════════
   §81.11/§81.17 struck the ENTIRE computed `d LIT` column: it was calculated by compositing each
   alpha over a FLAT lit field, and the field is not flat. Nothing computed carries forward.
   This samples the ACTUAL composited pixel at a site's rect centre, lit and unlit, and reports the
   per-channel difference. A COMPUTED DELTA INHERITS EVERY ASSUMPTION IN THE MODEL THAT PRODUCED IT;
   A MEASURED ONE INHERITS NONE.
   ⚠️ A site that is not in the DOM, or has no box cold, prints exactly that and NEVER a number. An
      absent site reporting 0 would be indistinguishable from a site the light does not reach. */
function px(img, x, y) {
  const i = (Math.round(y) * img.w + Math.round(x)) * img.chan;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
function sampleSites(a, b, rects, points) {
  const A = decodePNG(a), B = decodePNG(b);
  console.log('\n──── d LIT — MEASURED, per site (rect centre) ────');
  console.log('   every cell below is a MEASUREMENT. the computed column is struck (§81.11).');
  console.log(`   ${'site'.padEnd(30)} ${'unlit rgb'.padEnd(16)} ${'lit rgb'.padEnd(16)} d(r,g,b)`);
  for (const sel of points.sites) {
    const r = rects.find((q) => q.sel === sel);
    if (!r) { console.log(`   ${sel.padEnd(30)} — not in the DOM cold, or no box. NO NUMBER REPORTED.`); continue; }
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (cx < 0 || cy < 0 || cx >= A.w || cy >= A.h) { console.log(`   ${sel.padEnd(30)} — rect centre is off-viewport. NO NUMBER REPORTED.`); continue; }
    const u = px(B, cx, cy), l = px(A, cx, cy);
    const d = [l[0] - u[0], l[1] - u[1], l[2] - u[2]];
    console.log(`   ${sel.padEnd(30)} ${String(u.join(',')).padEnd(16)} ${String(l.join(',')).padEnd(16)} ${d.join(',')}`);
  }
  console.log('\n──── NAMED POINTS (the radial centres — where the light is strongest) ────');
  for (const [name, x, y] of points.pts) {
    const u = px(B, x, y), l = px(A, x, y);
    console.log(`   ${name.padEnd(30)} ${String(u.join(',')).padEnd(16)} ${String(l.join(',')).padEnd(16)} ${[l[0] - u[0], l[1] - u[1], l[2] - u[2]].join(',')}`);
  }
}

/* ══ AREA MODE — WHY THE CENTRE SAMPLE HAD TO GO ════════════════════════════════════════════════
 * The first d LIT sampler read the pixel at each rect's CENTRE. On `#canvas-wrapper` and
 * `#blueprint-container` that centre landed on brass estate content, so both reported 201,168,76
 * lit AND unlit — a confident (0,0,0) that described a drawing, not the light. Reporting it as a
 * zero would have been indistinguishable from "the light does not reach here".
 * 🔑 ONE PIXEL CANNOT REPRESENT A SURFACE THAT HAS ANYTHING DRAWN ON IT.
 * So: sample the WHOLE rect and report a distribution.
 *   · meanDelta  — average per-channel change over every pixel in the rect (the honest d LIT)
 *   · medianDelta— resists content: a chart or a label moves few pixels a lot, and the median
 *                  ignores them while the mean does not
 *   · pctMoved   — what fraction of the rect changed at all. ⭐ THIS IS THE LEG THAT DISTINGUISHES
 *                  "a weak light over the whole panel" from "a strong light on one corner", which
 *                  no single scalar can. */
function areaStats(A, B, r) {
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const x1 = Math.min(A.w, Math.round(r.x + r.w)), y1 = Math.min(A.h, Math.round(r.y + r.h));
  if (x1 <= x0 || y1 <= y0) return null;
  const dr = [], sum = [0, 0, 0]; let moved = 0, n = 0, maxd = 0;
  const litSum = [0, 0, 0], unlitSum = [0, 0, 0];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const ia = (y * A.w + x) * A.chan, ib = (y * B.w + x) * B.chan;
    const d = [A.data[ia] - B.data[ib], A.data[ia + 1] - B.data[ib + 1], A.data[ia + 2] - B.data[ib + 2]];
    for (let k = 0; k < 3; k++) { sum[k] += d[k]; litSum[k] += A.data[ia + k]; unlitSum[k] += B.data[ib + k]; }
    const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]));
    if (m > 0) moved++;
    if (m > maxd) maxd = m;
    dr.push(d[1]);   /* green: the channel carrying ~71% of luminance */
    n++;
  }
  dr.sort((p, q) => p - q);
  return {
    n, pctMoved: 100 * moved / n, maxd,
    mean: sum.map((v) => +(v / n).toFixed(2)),
    medianG: dr[Math.floor(dr.length / 2)],
    lit: litSum.map((v) => Math.round(v / n)),
    unlit: unlitSum.map((v) => Math.round(v / n)),
  };
}

/* ══ EDGE MODE — THE "BLOB" QUESTION, WHICH IS NOT A BRIGHTNESS QUESTION ════════════════════════
 * A radial on a FLAT field shows its own falloff edge; on a graded field running the same direction
 * the gradient camouflages it. That means the "it reads as a patch" complaint may be an EDGE
 * problem an alpha change cannot fix. This walks a ray outward from the light's centre and reports
 * the value profile, so the falloff can be SEEN as a curve instead of argued about. */
function rayProfile(img, cx, cy, dx, dy, steps, stepPx) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(cx + dx * i * stepPx), y = Math.round(cy + dy * i * stepPx);
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) break;
    const k = (y * img.w + x) * img.chan;
    out.push([i * stepPx, [img.data[k], img.data[k + 1], img.data[k + 2]]]);
  }
  return out;
}

/* ══ VERTICAL PROFILE — THE STAGE TONE'S ACCEPTANCE TEST ════════════════════════════════════════
 * §82.6 is accepted ON THE PROFILE, NOT ON THE DECLARATION, and that distinction is the whole
 * point: proto2's rendered ground is DARKER than its own declared gradient because a vignette and a
 * 6px dot texture sit over it. Authoring the gradient alone gets the top right and leaves the edges
 * bright. ⛔ SO THE DECLARATION IS NOT THE DELIVERABLE — THIS CURVE IS. */
/* ⛔⛔ THIS FUNCTION USED TO CLAMP, SILENTLY, AND THAT WAS SAFE ONLY WHILE THE VIEWPORT WAS A
 * CONSTANT. `Math.min(y, img.h - 1)` meant a request for y=860 on a 768px-tall capture returned
 * ROW 767's COLOUR AND PRINTED IT AS y=860 — a real pixel wearing a coordinate that is not its own.
 * The default no-target height set is [20,120,250,400,550,700,860], so the FIRST run of the very
 * viewport sweep this flag was added for would have reported three confident numbers for rows that
 * do not exist. Same for x at 1366 wide against a hard-coded column 1425.
 * 🔑 IT IS THE ARC'S OWN SIGNATURE ONE MODE OVER — NOT A WRONG NUMBER, A NUMBER MEASURING SOMETHING
 *    ELSE THAT HAPPENED TO SIT WHERE YOU LOOKED (§82.9), AND A CLAMP IS THE PUREST FORM OF IT
 *    BECAUSE IT ALWAYS RETURNS A PLAUSIBLE VALUE. ⇒ IT REFUSES NOW. */
function columnProfile(img, x, ys) {
  return ys.map((y) => {
    if (y < 0 || y >= img.h || x < 0 || x >= img.w) return [y, null];
    const k = (y * img.w + x) * img.chan;
    return [y, [img.data[k], img.data[k + 1], img.data[k + 2]]];
  });
}

function report(title, res) {
  console.log(`\n──── ${title} ────`);
  console.log(`  differing pixels : ${res.total} of ${res.pixels}` +
    (res.pixels ? `  (${(100 * res.total / res.pixels).toFixed(4)}%)` : ''));
  console.log(`  max channel delta: ${res.maxDelta}/255`);
  if (res.total === 0) { console.log('  RECTS            : (none — nothing differed)'); return; }
  const rows = [...res.buckets.entries()].sort((p, q) => q[1].n - p[1].n);
  console.log('  RECTS (a total is not a result — this is):');
  for (const [sel, v] of rows.slice(0, 20)) console.log(`     ${String(v.n).padStart(8)} px  max ${String(v.max).padStart(3)}/255   ${sel}`);
  console.log(`     ${String(res.outside).padStart(8)} px               (outside every rect)`);
}

/* ══ MAIN ═══════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  if (!MODE) { console.log('SCORE 0/0 RED — no --mode given. See the usage block at the top of this file.'); process.exit(2); }
  let chromium;
  try { ({ chromium } = await import(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs'))); }
  catch { ({ chromium } = await import('playwright')); }

  if (MODE === 'absolute') {
    /* THE ABSOLUTE PROOF — no comparison in it, which is precisely why it can see a defect that is
       present on BOTH sides of a differential. §81.12. Assertions are added here by the commit that
       introduces the thing being asserted; an empty set REPORTS ITSELF AS EMPTY and exits 2 rather
       than printing a green over nothing. */
    const srv = await serve(PORT_A, null, []);
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/*', (r) => r.request().url().startsWith('http://127.0.0.1:') ? r.continue() : r.abort());
    await page.goto(`http://127.0.0.1:${PORT_A}/studio.html`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const facts = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      /* DECLARED text — this is what getPropertyValue returns for a custom property. It is the
         SPELLING, not the resolved colour, and it is only good for "is this declared at all". */
      const declared = (n) => root.getPropertyValue(n).trim();
      /* ⛔ RESOLVED colour — a custom property is SUBSTITUTED, never computed to a colour, so
       * getPropertyValue('--x') hands back `color-mix(in srgb, #5DCAA5 18%, transparent)` verbatim.
       * Asserting on that is asserting the SPELLING, which §69 already settled means nothing. To
       * get the PIXEL-TRUE value you must push the token through a REAL colour property and read
       * that back — the browser resolves it there and nowhere else. */
      const resolve = (expr) => {
        const d = document.createElement('div');
        d.style.color = expr; d.style.display = 'none';
        document.body.appendChild(d);
        const v = getComputedStyle(d).color;
        d.remove();
        return v;
      };
      return {
        bodyBgImage: cs.backgroundImage,
        bodyBgColor: cs.backgroundColor,
        lightKeyDeclared: declared('--light-key'),
        lightKey: resolve('var(--light-key)'),
        lightFill: declared('--light-fill'),
        gridLine: resolve('var(--grid-line)'),
        surface: resolve('var(--surface)'),
        paintCyan: declared('--paint-cyanotype'),
        canvasBgImage: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el).backgroundImage : ''; })(),
        canvasShadow: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el).boxShadow : ''; })(),
        afterBg: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el, '::after').backgroundImage : ''; })(),
        beforeBg: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el, '::before').backgroundImage : ''; })(),
        canvasBgSize: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el).backgroundSize : ''; })(),
        stageKey: resolve('var(--stage-key)'),
        stageKeyDeclared: declared('--stage-key'),
        paintSeafoam: declared('--paint-seafoam'),
        /* THE HUD z-ORDER QUESTION, ANSWERED BY THE PAGE RATHER THAN BY REASONING: the highest
           z-index among the stage's positioned children. ::before/::after are z-index auto, so any
           child above 0 paints over them. */
        /* ⛔⛔ THE GROUND'S CONSUMED TOKENS, ASKED OF THE CSSOM RATHER THAN GREPPED (§10.6).
           Reads DECLARED rule text (rule.style), which still carries `var(--x)` — computed style
           has already substituted it away and cannot answer this question at all. */
        groundVars: (() => {
          const out = new Set();
          for (const sheet of document.styleSheets) {
            let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
            for (const r of rules) {
              if (!r.selectorText || !r.style) continue;
              if (!/(^|[\s,])body([\s,{:]|$)|canvas-wrapper/.test(r.selectorText)) continue;
              const txt = ['background', 'backgroundImage', 'backgroundColor', 'boxShadow']
                .map((k) => r.style[k] || '').join(' ');
              for (const m of txt.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) out.add(m[1]);
            }
          }
          return [...out].sort().join(',');
        })(),
        hudZ: (() => { const el = document.querySelector('.canvas-wrapper'); if (!el) return '';
          return [...el.querySelectorAll('*')].map((n) => parseInt(getComputedStyle(n).zIndex, 10))
            .filter((v) => !isNaN(v)).sort((x, y) => y - x).slice(0, 3).join(','); })(),
      };
    });
    await browser.close(); srv.close();
    console.log('\n──── ABSOLUTE (CSSOM, no comparison in it) ────');
    for (const [k, v] of Object.entries(facts)) console.log(`  ${k.padEnd(14)} = ${v}`);
    /* ⛔ THE POINT OF AN ABSOLUTE PROOF: it asserts the page IS what it should be, with NO reference
       to another rendering — which is exactly why it can see a defect present on BOTH sides of a
       differential (§81.12, the unterminated comment that ate two rules). */
    let pass = 0; const legs = [];
    const ok = (name, cond, saw) => { legs.push([name, cond, saw]); if (cond) pass++; };
    /* rgb(93,202,165) is verdigris; chromium may spell it rgba(...) or color(srgb ...). ASSERT THE
       RESOLVED COLOUR, NEVER THE SPELLING — §69 settled that a string difference means nothing. */
    /* RESOLVED colours now, so these match a real rgba()/color() string, never a declaration. */
    const isVerdigris18 = (s) => /(93,\s*202,\s*165|0\.364706)/.test(s) && /0?\.18/.test(s);
    /* seafoam #79DEC7 = rgb(121,222,199); chromium may spell it color(srgb 0.47451 ...). */
    const isSeafoam085 = (s) => /(121,\s*222,\s*199|0\.47451)/.test(s) && /0?\.085/.test(s);
    /* ⛔⛔ L1-L3 RE-AUTHORED 2026-08-20 (§82.15). THEY ASSERTED THE OLD ARCHITECTURE — a key light on
       `body` at 70% 15% deriving from verdigris — AND THAT ARCHITECTURE IS THE DEFECT THIS COMMIT
       REMOVES. An assertion kept past the design it describes does not protect anything; it fails
       on the fix and passes on the bug. 🔑 THE LEGS FOLLOW THE SHIPPED TRUTH, NOT THE OLD ONE. */
    ok('L1 body carries NO radial-gradient — there is no global light any more',
      (facts.bodyBgImage.match(/radial-gradient/g) || []).length === 0,
      (facts.bodyBgImage.match(/radial-gradient/g) || []).length + ' found');
    ok('L2 --light-key is RETIRED, not merely unused (§76.3: no latent names)',
      facts.lightKeyDeclared === '', JSON.stringify(facts.lightKeyDeclared));
    ok('L3 --stage-key resolves to SEAFOAM at 0.085 — the donor value, palette-spelled',
      isSeafoam085(facts.stageKey), facts.stageKey + '   (declared: ' + facts.stageKeyDeclared + ')');
    ok('L4 --light-fill is ABSENT — a role with no consumer is never declared',
      facts.lightFill === '', JSON.stringify(facts.lightFill));
    ok('L5 --paint-cyanotype is OPAQUE (the repair: alpha moved to each role)',
      /^#?64B4FF$/i.test(facts.paintCyan.replace('#', '#')) || /rgb\(\s*100,\s*180,\s*255\s*\)/.test(facts.paintCyan),
      facts.paintCyan);
    ok('L6 --grid-line still resolves to cyanotype at 0.05 (VALUE invariant)',
      /(100,\s*180,\s*255|0\.392157)/.test(facts.gridLine) && /0?\.05/.test(facts.gridLine),
      facts.gridLine);
    ok('L7 the body field is still painted (the shorthand did not eat background-color)',
      /rgb\(\s*9,\s*18,\s*33\s*\)/.test(facts.bodyBgColor), facts.bodyBgColor);
    /* ⛔ §11.4 — REGISTRATION AND WIRING ARE TWO PROOFS. The profile proves the ground LOOKS right;
       these prove the layers are actually ATTACHED. A stage that hit the target for some other
       reason would pass the profile and fail here. */
    ok('L8 body carries EXACTLY ONE layer — the graded field, and nothing else',
      /linear-gradient/.test(facts.bodyBgImage) && (facts.bodyBgImage.match(/gradient/g) || []).length === 1,
      (facts.bodyBgImage.match(/gradient/g) || []).length + ' gradient layer(s)');
    ok('L9 .canvas-wrapper consumes --stage-base AND keeps its inset shadow',
      /linear-gradient/.test(facts.canvasBgImage) && /rgba\(0,\s*0,\s*0,\s*0?\.26\)|rgb\(0, 0, 0\)/.test(facts.canvasShadow) && facts.canvasShadow !== 'none',
      'bgLayers=' + (facts.canvasBgImage.match(/gradient/g) || []).length + '  shadow=' + facts.canvasShadow.slice(0, 46));
    /* ⛔⛔ L11 IS THE CYCLIC-REPEAT GUARD AND IT IS THE MOST LOAD-BEARING LEG IN THIS COMMIT.
       `background-size` is a POSITIONAL list: a SHORT list does not fail, it REPEATS, tiling
       radials and the base into grid squares while looking entirely plausible. Nothing else here
       would catch it — the profile samples a column, and a tiled base can still hit the target at
       four points. 🔑 THE COUNTS MUST MATCH, AND THE COUNT IS THE ASSERTION. */
    ok('L11 .canvas-wrapper has 7 background layers AND 7 background-size values (no cyclic repeat)',
      (facts.canvasBgImage.match(/gradient/g) || []).length === 7 &&
      facts.canvasBgSize.split(',').length === 7,
      'layers=' + (facts.canvasBgImage.match(/gradient/g) || []).length +
      '  sizes=' + facts.canvasBgSize.split(',').length);
    ok('L12 the stage carries BOTH overlays — ::before (glow+sheen) as well as ::after',
      /radial-gradient/.test(facts.beforeBg) && (facts.beforeBg.match(/gradient/g) || []).length === 2,
      (facts.beforeBg.match(/gradient/g) || []).length + ' layer(s) on ::before');
    /* ⚠️ THE HUD QUESTION, MEASURED RATHER THAN REASONED. ::before/::after are z-index AUTO, so any
       positioned child with z-index >= 1 paints ABOVE them. §82.13 ruled the readouts must stay
       crisp; this asserts the mechanism that keeps them so, instead of trusting the ruling held. */
    ok('L13 the HUDs outrank both overlays (z-index >= 1 above auto) — readouts stay crisp',
      facts.hudZ !== '' && parseInt(facts.hudZ.split(',')[0], 10) >= 1,
      'top stage z-indexes: ' + facts.hudZ);
    ok('L14 --paint-seafoam exists as a PAINT and is OPAQUE (a paint is a pigment)',
      /^#79DEC7$/i.test(facts.paintSeafoam.trim()), facts.paintSeafoam);
    /* ⛔⛔ L15 — THE ENUMERATION GUARD. THE FAILURE IT EXISTS FOR ALREADY HAPPENED: `dffdecd` added
       `--stage-field` and `--stage-base` to the ground, the selftest poison still aimed only at
       `--paint-inkwell`, and THE DEAFNESS CONTROL WENT DEAF — reporting "THE DIFFER IS BROKEN"
       about a differ that was fine. A `count` guard could not see it: it proves a string was
       SUBSTITUTED, never that the substitution CHANGED A PIXEL. LANDING IS NOT BITING.
       🔑 SO THE POISON'S TARGET LIST IS CHECKED AGAINST THE GROUND'S *ACTUAL* CONSUMED TOKENS, AND
          AN UNLISTED ONE ABORTS BY NAME. This is the GUARDED form; the fully DERIVED poison lands
          when the stack stops moving. A guard that fails loud is worth more than a list that rots
          quietly. ⚠️ ADDING A GROUND LAYER MEANS ADDING IT TO POISON_GROUND — that is the point. */
    const consumed = facts.groundVars ? facts.groundVars.split(',').filter(Boolean) : [];
    const unlisted = consumed.filter((v) => !POISON_GROUND.includes(v));
    /* ⚠️ THE LEG NAME SAYS EXACTLY WHAT IT CHECKS — MEMBERSHIP OF POISON_GROUND — AND NOT "the
       poison bites every one of them", WHICH IT DOES NOT VERIFY. An earlier draft of this line
       claimed the stronger thing; that would have been a leg whose NAME overstated its ASSERTION,
       which is the species this arc keeps finding. The BITE proof is --mode=selftest, separately. */
    ok('L15 every ground-painting token is ENUMERATED in POISON_GROUND (no unlisted layer)',
      consumed.length > 0 && unlisted.length === 0,
      unlisted.length ? 'UNLISTED, ADD TO POISON_GROUND: ' + unlisted.join(' ') + '  |  on body/.canvas-wrapper'
                      : consumed.length + ' consumed, all covered: ' + consumed.join(' '));
    ok('L10 the vignette is on the STAGE as ::after, not on body (§82.8 relocation)',
      /gradient/.test(facts.afterBg) && !/radial-gradient\(circle at 50% 50%/.test(facts.bodyBgImage),
      'after=' + facts.afterBg.slice(0, 42) + '  bodyHasVignette=' + /circle at 50% 50%/.test(facts.bodyBgImage));
    console.log('');
    for (const [n, c, saw] of legs) console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}\n          saw: ${saw}`);
    console.log(`\nSCORE ${pass}/${legs.length} ${pass === legs.length ? 'GREEN' : 'RED'}`);
    process.exit(pass === legs.length ? 0 : 1);
  }

  /* ══ PROFILE — ABSOLUTE, SINGLE CAPTURE, NO COMPARISON IN IT ═════════════════════════════════
     ⛔ A NULL *PAIR* DOES NOT APPLY HERE — there is no second tree. But the principle does, so the
     absolute analogue is used instead: CAPTURE TWICE AND REQUIRE THE TWO TO BE IDENTICAL. Proving
     the instrument is stable before believing a small number is the same discipline either way. */
  if (MODE === 'profile') {
    /* --apply reaches the ABSOLUTE profile too, so a residual can be ATTRIBUTED by neutralising one
       layer at a time instead of argued about with arithmetic. A computed delta inherits every
       assumption in its model; this makes the same question a measurement. */
    const profLanded = [];
    const profSet = APPLY ? (REVERTS[APPLY] || null) : null;
    if (APPLY && !profSet) { console.log(`SCORE 0/0 RED — no set named "${APPLY}" for --apply`); process.exit(2); }
    const srv = await serve(PORT_A, profSet ? makeTransform(profSet) : null, profLanded);
    /* HEIGHT SET, IN PRECEDENCE ORDER. --yfrac wins because it is the only one that means the same
       thing at two viewports; the pinned TARGETS keys are ABSOLUTE and belong to 1440x900 alone. */
    const ysAll = YFRAC
      ? YFRAC.split(',').map((f) => Math.round(parseFloat(f) * VH))
      : (TARGET && TARGETS[TARGET] ? Object.keys(TARGETS[TARGET]).map(Number) : [20, 120, 250, 400, 550, 700, 860]);
    /* ⛔ A PINNED TARGET TABLE IS A CLAIM ABOUT A VIEWPORT. §82.9's law — "a target from a different
       instrument is an assumption wearing a number, AND SO IS A TARGET FROM A DIFFERENT HEIGHT" —
       applies verbatim to a target from a different SIZE. Refuse rather than score against it. */
    if (TARGET && (VW !== 1440 || VH !== 900)) {
      console.log(`\n⛔ REFUSING TO SCORE. TARGETS.${TARGET} was measured at 1440x900; you asked for ${VW}x${VH}.`);
      console.log('   A TARGET FROM A DIFFERENT VIEWPORT IS AN ASSUMPTION WEARING A NUMBER (§82.9).');
      console.log(`   Re-derive it first:  --mode=profile --page=proto2.html --viewport=${VW}x${VH} --yfrac=<same fractions>`);
      console.log('SCORE 0/0 RED'); process.exit(2);
    }
    const pts = [];
    for (const x of COLS) for (const y of ysAll) pts.push([x, y]);
    const c1 = await capture(PORT_A, chromium, PAGE, pts);
    const c2 = await capture(PORT_A, chromium, PAGE, pts);
    /* ⛔ THE LANDING REPORT — ADDED BECAUSE I SHIPPED --apply INTO THIS MODE WITHOUT IT AND ALMOST
       HANDED OVER A BEFORE/AFTER PAIR I COULD NOT PROVE DIFFERED. An --apply that silently fails to
       match renders a picture IDENTICAL to the baseline and captions it "AFTER".
       🔑 LANDING IS NOT BITING — this proves the substitution happened; only pixels prove effect. */
    if (APPLY) {
      console.log(`
──── --apply="${APPLY}" LANDING ────`);
      for (const l of profLanded) console.log(`  ${l.file}: expected ${l.expected}, matched ${l.actual}${l.unstable ? '  ⛔ UNSTABLE' : ''}`);
      const bad = profLanded.filter((l) => l.actual !== l.expected || l.unstable);
      if (bad.length || profLanded.length === 0) {
        console.log('⛔ THE APPLIED SET DID NOT LAND AS DECLARED. Any image or number from this run is void.');
        console.log('SCORE 0/1 RED'); process.exit(1);
      }
    }
    /* LANDING PROOF, PRINTED BESIDE THE NUMBERS RATHER THAN ASSUMED. An unlanded --clock and a
       --clock that changed nothing are the same observation without this line. */
    console.log(`\nCLOCK: page sees ${c1.pageNow}${CLOCK ? `  (--clock=${CLOCK} requested)` : '  (real wall clock — no --clock given)'}`);
    if (CLOCK && c1.pageNow !== CLOCK) {
      console.log(`⛔ --clock DID NOT LAND. Requested ${CLOCK}, page sees ${c1.pageNow}. REFUSING to report a date conclusion.`);
      console.log('SCORE 0/1 RED'); process.exit(2);
    }
    srv.close();
    /* --save writes the capture to disk. A skin arc whose only output is numbers asks the Captain
       to approve a look he has never seen; this is the one instrument that answers "what does it
       actually look like". Same capture the numbers come from, so the picture and the table can
       never disagree. */
    if (SAVE) { fs.writeFileSync(SAVE, c1.shot); console.log(`
SAVED: ${SAVE} (${c1.shot.length} bytes) — the SAME capture the numbers below come from`); }
    const A = decodePNG(c1.shot), A2 = decodePNG(c2.shot);
    let drift = 0;
    for (let i = 0; i < A.data.length; i++) if (A.data[i] !== A2.data[i]) drift++;
    console.log(`\nSTABILITY (the absolute analogue of a null pair): ${drift} of ${A.data.length} subpixels differ between two captures of the SAME page`);
    if (drift !== 0) {
      /* ⛔⛔ THE VERDICT IS UNCHANGED — ANY DRIFT STILL ABORTS. What changed (2026-08-20) is that the
         red is now READABLE. This check was the ONE scalar in a file whose second founding ruling is
         "RECTS, NOT SCALARS", and it fired 19 · 0 · 0 · 0 across four runs of an UNCHANGED tree —
         so §82.11's "stability 0/3,888,000" is one draw from a distribution that includes 19, and
         nothing recorded WHERE.
         🔑 A PRECONDITION THAT FAILS INTERMITTENTLY AND SAYS ONLY "HOW MANY" CANNOT BE DIAGNOSED,
            ONLY RE-RUN UNTIL IT AGREES — WHICH IS HOW A FLAKE BECOMES A HABIT.
         ⛔ AND THE ABORT IS DELIBERATELY NOT SCOPED TO "DRIFT NEAR A SAMPLE POINT". That would be a
            TOLERANCE NOBODY RULED, on the exact instrument whose standing instruction is "do not
            tune a value to close it" (§82.8). Localise, report, abort — the ruling is the
            Architect's to make on evidence, not mine to make by loosening. */
      const st = localise(c1.shot, c2.shot, c1.rects);
      console.log('⛔ THE PAGE DOES NOT RENDER DETERMINISTICALLY. Every number below is unreadable.');
      report('STABILITY DRIFT — SAME TREE, TWO CAPTURES (this is a RIG/PAGE finding, not a ground one)', st);
      console.log('SCORE 0/1 RED'); process.exit(1);
    }
    const okAt = new Map();
    for (const [x, y, what, isField] of (c1.pointCheck || [])) okAt.set(x + ',' + y, [what, isField]);
    /* ⛔ THE PAINT STACK AT EVERY SCORED POINT — PRINTED, NOT SUMMARISED. A point can be legitimately
       scoreable and still be under three layers you forgot about; that is exactly how the key light
       was smothered in silence. §81.22: name every layer, or the number describes the layer. */
    console.log('\n──── PAINT STACK AT EACH SAMPLE POINT (outermost first) — scored points included ────');
    for (const [x, y, , isField, stack] of (c1.pointCheck || [])) {
      console.log(`   x=${x} y=${y}  ${isField ? 'SCORED' : 'NOT SCORED'}  — ${(stack || []).length} painting layer(s)`);
      for (const s of (stack || [])) console.log(`      · ${s}`);
    }
    const occluded = (c1.pointCheck || []).filter((p) => !p[3]);
    if (occluded.length) {
      console.log('\n⛔ OCCLUDED SAMPLE POINTS — NOT THE FIELD, NOT SCORED, NOT HIDDEN:');
      for (const [x, y, what] of occluded) console.log(`   x=${x} y=${y}  blocked by ${what}`);
      console.log('   A point that is not measuring the ground cannot judge the ground.');
    }
    const ys = ysAll;
    let fails = 0, legs = 0;
    for (const x of COLS) {
      console.log(`\n──── VERTICAL GROUND PROFILE — ${PAGE}, column x=${x} ────`);
      for (const [y, rgb] of columnProfile(A, x, ys)) {
        if (rgb === null) {
          console.log(`   y=${String(y).padStart(4)}  ⛔ OFF-CAPTURE (viewport is ${VW}x${VH}) — NO NUMBER REPORTED`);
          if (TARGET && TARGETS[TARGET] && TARGETS[TARGET][y]) { legs++; fails++; }
          continue;
        }
        let line = `   y=${String(y).padStart(4)}  rgb(${rgb.join(',')})`;
        const chk = okAt.get(x + ',' + y);
        if (chk && !chk[1]) { console.log(line + '   ⛔ OCCLUDED (' + chk[0] + ') — NOT SCORED'); continue; }
        if (TARGET && TARGETS[TARGET] && TARGETS[TARGET][y]) {
          const t = TARGETS[TARGET][y];
          const d = rgb.map((v, i) => v - t[i]);
          const ok = d.every((v) => Math.abs(v) <= TOL);
          legs++; if (!ok) fails++;
          line += `   target ${TARGET} rgb(${t.join(',')})   d=(${d.join(',')})   ${ok ? 'within ±' + TOL : '⛔ OUTSIDE ±' + TOL}`;
        }
        console.log(line);
      }
    }
    if (TARGET) {
      console.log(`\n⚖️  ACCEPTANCE IS THE PROFILE, NOT THE DECLARATION (§82.6).`);
      console.log(`SCORE ${legs - fails}/${legs} ${fails === 0 ? 'GREEN' : 'RED'}`);
      process.exit(fails === 0 ? 0 : 1);
    }
    console.log('\n(no --target given — this printed a MEASUREMENT, not a verdict)');
    console.log('SCORE 1/1 GREEN');
    process.exit(0);
  }

  if (!['null', 'differential', 'selftest', 'dlit', 'area', 'edge'].includes(MODE)) {
    console.log(`SCORE 0/0 RED — unknown --mode=${MODE}`); process.exit(2);
  }
  /* dlit IS a differential measurement (lit vs unlit), so it inherits the null-control gate. */
  if ((MODE === 'differential' || MODE === 'dlit') && !NULL_FIRST) {
    console.log('\n⛔ REFUSING TO RUN.');
    console.log('   --mode=differential requires --i-ran-null-first.');
    console.log('   A DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS NOT A MEASUREMENT — IT IS A NUMBER.');
    console.log('   Run --mode=null, confirm it reads 0, then pass the flag. (§81.17)');
    console.log('SCORE 0/0 RED — null control not established.');
    process.exit(1);
  }

  const setName = MODE === 'selftest' ? 'selftest' : REVERT_NAME;
  const set = MODE === 'null' ? [] : (REVERTS[setName] || null);
  if (MODE !== 'null' && !set) { console.log(`SCORE 0/0 RED — no revert set named "${setName}"`); process.exit(2); }
  if (MODE !== 'null' && set.length === 0) {
    console.log(`\n⛔ REVERT SET "${setName}" IS EMPTY.`);
    console.log('   A control that changes nothing renders both sides identical and reports a');
    console.log('   beautiful, meaningless 0. That is an INERT CONTROL, and this tool will not');
    console.log('   print a number over one. Populate REVERTS.' + setName + ' in this file.');
    console.log('SCORE 0/0 RED — inert control refused.');
    process.exit(1);
  }

  const landed = [];
  /* ⭐ --apply APPLIES A *FORWARD* SET TO PORT_A — THE SHIPPED SIDE — SO A PROPOSAL CAN BE MEASURED
     BEFORE IT IS AUTHORED, WITHOUT A BYTE MOVING ON DISK. It exists because `studio.html` is SACRED:
     trialling a position by editing the file would cost a pin bump and a full build PER TRIAL, which
     is exactly the tax that makes people trial nothing and author from intuition.
     ⛔ IT IS NOT A REVERT AND IT IS NOT A SHIP. A number taken under --apply describes a page THAT
        DOES NOT EXIST YET, and must be quoted with the flag beside it or it is quoted wrong. */
  const applySet = APPLY ? (REVERTS[APPLY] || null) : null;
  if (APPLY && !applySet) { console.log(`SCORE 0/0 RED — no set named "${APPLY}" for --apply`); process.exit(2); }
  const srvA = await serve(PORT_A, applySet ? makeTransform(applySet) : null, landed);
  const srvB = await serve(PORT_B, MODE === 'null' ? null : makeTransform(set), landed);

  console.log(`MODE: ${MODE}${MODE === 'null' ? '  (same tree on both ports — this MUST read 0)' : `  revert set "${setName}"`}`);
  console.log(`PROFILE: ${VW}x${VH} · ${ENTER ? 'ENTERED Studio (landing overlay dismissed)' : 'cold Studio (landing overlay UP — it scrims + blurs; see capture())'} · signed-out · headless chromium · off-origin aborted`);

  /* --page now reaches the DIFFERENTIAL modes too. It did not, so every edge/area/dlit run silently
     measured studio.html no matter what --page said — an argument accepted and ignored is worse than
     one rejected, because the report carries the page name you asked for. */
  const A = await capture(PORT_A, chromium, PAGE);
  const B = await capture(PORT_B, chromium, PAGE);
  srvA.close(); srvB.close();

  /* ⛔ THE POISON MUST PROVE IT LANDED — before any pixel number is believed. */
  if (MODE !== 'null') {
    const bad = landed.filter((l) => l.actual !== l.expected);
    const seen = new Set(landed.map((l) => l.file + '|' + l.expected));
    console.log('\n──── CONTROL LANDING ────');
    if (!landed.length) {
      console.log('  ⛔ the transform was never invoked — no served asset matched a revert entry.');
      console.log('SCORE 0/0 RED — control never ran.'); process.exit(1);
    }
    for (const l of landed) console.log(`  ${l.file}: expected ${l.expected}, matched ${l.actual}${l.actual === l.expected ? '' : '   ⛔'}`);
    if (bad.length) { console.log('\nSCORE 0/0 RED — a revert entry did not land as declared. The number below would be meaningless.'); process.exit(1); }
    void seen;
  }

  console.log(`\noff-origin requests aborted: A=${A.offOrigin} B=${B.offOrigin}`);
  console.log(`rects measured AFTER capture: A=${A.rects.length} B=${B.rects.length}`);

  if (MODE === 'area' || MODE === 'edge') {
    const IA = decodePNG(A.shot), IB = decodePNG(B.shot);
    if (MODE === 'area') {
      /* ⛔ THE SITES ARE THE RENDERED POPULATION, NOT A HAND LIST: every rect that actually has a
         box. Filtered to real surfaces so the report is readable, but nothing is EXCLUDED silently
         — the count of skipped rects is printed. */
      const want = ['#estate-analysis', '#want-readout', '#shape-hud', '#shape-mode-toggle',
        '#canvas-wrapper', '#blueprint-container', '.hud-panel', '.drafting-panel', '.ira-why-panel'];
      console.log('\n──── d LIT BY AREA — the whole rect, not one pixel ────');
      console.log('   ' + 'site'.padEnd(24) + 'mean unlit'.padEnd(14) + 'mean lit'.padEnd(14) + 'mean d(r,g,b)'.padEnd(20) + 'medG'.padEnd(6) + '%moved'.padEnd(8) + 'maxd');
      let missing = 0;
      for (const sel of want) {
        const r = A.rects.find((q) => q.sel === sel);
        if (!r) { console.log('   ' + sel.padEnd(24) + '— no box. NO NUMBER REPORTED.'); missing++; continue; }
        const st = areaStats(IA, IB, r);
        if (!st) { console.log('   ' + sel.padEnd(24) + '— rect off-viewport. NO NUMBER REPORTED.'); missing++; continue; }
        console.log('   ' + sel.padEnd(24) + ('rgb(' + st.unlit.join(',') + ')').padEnd(14) +
          ('rgb(' + st.lit.join(',') + ')').padEnd(14) + ('(' + st.mean.join(',') + ')').padEnd(20) +
          String(st.medianG).padEnd(6) + (st.pctMoved.toFixed(1) + '%').padEnd(8) + st.maxd);
      }
      console.log(`   (${missing} site(s) had no box and were reported as such, never as a zero)`);
      console.log('\n🔑 %moved separates "a weak light over the whole panel" from "a strong light on one');
      console.log('   corner". A single scalar cannot, and the centre sample could see neither.');
    } else {
      /* EDGE — walk outward from the light's authored centre and print the falloff as a curve.
         ⛔ THE CENTRE MUST BE ELEMENT-RELATIVE WHEN THE LIGHT IS, AND OURS NOW IS. A radial declared
            `at 62% 18%` resolves against THE BOX IT IS DECLARED ON, so a viewport-relative centre
            would walk the ray from the wrong pixel and report a curve for a place the light is not.
         🔑 THAT IS THE SAME LAW THAT MADE `transparent 24%` SHRINK 22% WHEN REPARENTED: A PERCENTAGE
            IS A CLAIM ABOUT A BOX. The instrument has to honour it or it measures a different light. */
      let cx = Math.round(VW * 0.70), cy = Math.round(VH * 0.15);
      if (CENTER_EL) {
        const r = A.rects.find((q) => q.sel === CENTER_EL);
        if (!r) { console.log(`\n⛔ --center-el="${CENTER_EL}" HAS NO BOX on ${PAGE}. NO CURVE REPORTED.`); console.log('SCORE 0/1 RED'); process.exit(1); }
        const [fx, fy] = CENTER_FRAC.split(',').map(Number);
        cx = Math.round(r.x + fx * r.w); cy = Math.round(r.y + fy * r.h);
        console.log(`\n   centre resolved against ${CENTER_EL} box (x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.w)} h=${Math.round(r.h)}) at ${fx * 100}%/${fy * 100}%`);
      }
      console.log(`\n──── FALLOFF ALONG A RAY FROM THE LIGHT CENTRE (${cx},${cy}) ────`);
      console.log('   Answers the "is it a blob" question, which is an EDGE question and not a');
      console.log('   brightness one — an alpha change cannot fix an edge.');
      for (const [name, dx, dy] of [['down-left  ', -0.7071, 0.7071], ['straight down', 0, 1], ['left       ', -1, 0]]) {
        const la = rayProfile(IA, cx, cy, dx, dy, 12, 40), lb = rayProfile(IB, cx, cy, dx, dy, 12, 40);
        console.log('   ' + name + ' :  ' + la.map((p, i) => {
          const d = p[1][1] - (lb[i] ? lb[i][1][1] : p[1][1]);
          return `${p[0]}px:+${d}`;
        }).join('  '));
      }
      console.log('   (each entry is DISTANCE:GREEN-CHANNEL LIFT over the unlit page)');
    }
    console.log('\nSCORE 1/1 GREEN   (a measurement, not a verdict)');
    await (async () => {})();
  }
  if (MODE === 'dlit') {
    sampleSites(A.shot, B.shot, A.rects, {
      sites: ['#estate-analysis', '#want-readout', '#shape-hud', '#shape-mode-toggle',
              '#canvas-recenter', '.ira-why-panel', '#canvas-wrapper', '#blueprint-container'],
      /* THE TWO RADIAL CENTRES at 1440x900: key 70%/15% · fill 20%/80%. Sampled because the
         BRIGHTEST point of each light is the one place its authored alpha is fully expressed. */
      pts: [['key centre 70%/15%', Math.round(VW * 0.70), Math.round(VH * 0.15)],
            ['fill centre 20%/80%', Math.round(VW * 0.20), Math.round(VH * 0.80)]],
    });
  }
  const res = localise(A.shot, B.shot, A.rects);
  report(MODE === 'null' ? 'NULL CONTROL — same tree, both ports' : `DIFFERENTIAL — shipped vs "${setName}" reverted in the SERVED bytes`, res);

  if (MODE === 'null') {
    if (res.total === 0) { console.log('\n✅ NULL CONTROL CLEAN — rendering is deterministic. A small number may now be believed.'); console.log('SCORE 1/1 GREEN'); process.exit(0); }
    console.log('\n⛔ NULL CONTROL DIRTY — the same tree differs from itself.');
    console.log('   Every differential number from this rig is UNREADABLE until this reads 0.');
    console.log('SCORE 0/1 RED'); process.exit(1);
  }
  if (MODE === 'selftest') {
    if (res.total > 10000) { console.log('\n✅ SELFTEST — the differ BITES (a field-wide poison moved a large, localised area).'); console.log('SCORE 1/1 GREEN'); process.exit(0); }
    /* ⛔⛔ THIS MESSAGE USED TO SAY, FLATLY, "THE DIFFER IS BROKEN. Every number it has printed is
       void." IT SAID THAT TO ME ON 2026-08-20 AND IT WAS FALSE — the differ was measuring 951,717
       px correctly on another revert set in the same session. THE POISON HAD GONE DEAF, NOT THE
       DIFFER (see the selftest revert set for the mechanism).
       🔑 A CONTROL THAT FAILS FOR TWO POSSIBLE REASONS AND NAMES ONLY ONE MANUFACTURES A FINDING —
          the same class as the moat gate's calendar red (§81), which would have sent a wirer
          investigating a CORRECT mortgage room. AND THIS DIRECTION IS THE EXPENSIVE ONE: it
          invites you to throw away every good number you hold.
       ⇒ IT NAMES BOTH CAUSES AND TELLS YOU HOW TO SEPARATE THEM. */
    console.log('\n⛔ SELFTEST FAILED — a poison aimed at the page ground moved almost nothing.');
    console.log('   TWO CAUSES PRODUCE THIS, AND THEY NEED OPPOSITE RESPONSES. DO NOT ASSUME EITHER:');
    console.log('   (a) THE DIFFER IS BROKEN  — every number it has printed is void.');
    console.log('   (b) THE POISON NO LONGER REACHES THE GROUND — the differ is fine and this set is stale.');
    console.log('       A `count` guard CANNOT tell you which: it proves a string was SUBSTITUTED,');
    console.log('       never that the substitution CHANGED A PIXEL. LANDING IS NOT BITING.');
    console.log('   SEPARATE THEM:  --mode=differential --revert=stage --i-ran-null-first');
    console.log('       a large diff there = the differ works ⇒ (b), and this set needs re-aiming at');
    console.log('       whatever layer paints the ground TODAY. Re-aim the poison; never lower the bar.');
    console.log('SCORE 0/1 RED'); process.exit(1);
  }
  console.log('\n⚖️  DIFFERENTIAL ONLY. This is half the proof (§81.12). Pair it with --mode=absolute');
  console.log('    and scripts/_gate_css_comments.js, and report the two SEPARATELY.');
  console.log('SCORE 1/1 GREEN');
  process.exit(0);
})().catch((e) => { console.log('\nSCORE 0/0 RED — harness failure: ' + (e && e.stack || e)); process.exit(2); });
