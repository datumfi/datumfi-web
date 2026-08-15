// Canonical clean publish-root builder for datumfi.com (Cloudflare Pages).
// Ships ONLY tracked web assets (+ deploy-intrinsic config) into dist/.
// NEVER ships the repo root. Runs on Windows and the Cloudflare Linux builder.
//
// Usage:  node scripts/build-dist.mjs   ->   ./dist  (deploy that, never ".")
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const OUT = 'dist';

// Web-asset extensions that may ship.
const KEEP = new Set(['.html', '.js', '.css', '.svg', '.png', '.ico', '.json', '.webmanifest', '.txt', '.woff', '.woff2']);

// Deploy-intrinsic root/config files — copied straight from disk (not gated on
// git-tracking), so robots.txt / _headers / _redirects ship deterministically.
const CONFIG = ['_redirects', '_headers', 'robots.txt'];

// Explicit drops (web-asset extension but internal / not for the public root).
const DROP_EXACT = new Set(['package.json', 'package-lock.json', 'api-response.json', 'masterlogo.html']);
const DROP_RE = [/^\.claude\//, /^\.wrangler\//, /^workers\//, /^functions\//, /^migrations\//, /\.md$/i, /^scripts\/_/, /^_probe_/, /^claude-.*\.txt$/i, /\.(xlsx|py|ps1)$/i];

// SACRED HOSTS — must ship byte-identical (LF + content). Build ABORTS on drift.
const SACRED = {
  /* THE CANONICAL DISCLOSURE FOOTER — legal copy for FIFTEEN pages from ONE file. Declared in
     CLAUDE.md in this same commit. Sacred on a stricter rule than the rest: its absence removes a
     regulatory disclosure from every page at once. */
  'scripts/datum-footer.js': '38645d6a25942d1c27f91b1cae5ecd76',   // the module carries its own presentation — 10px muted, not the page default (2026-08-14)
  'studio.html': 'c68ce8337f1bc08be5d3fea810a81abe',   // §18.2 — the disclosure leaves the canvas frame for the panel's own scroll; banner reserve retired (2026-08-14)
  'sketch.html': 'fc51c4473e66013d3a563a3e24287822',   // canonical disclosure footer via /scripts/datum-footer.js (2026-08-14)
  /* §47.3 — SACRED as of 2026-08-13, declared in CLAUDE.md IN THIS SAME COMMIT. The two lists are
     reconciled by this build in BOTH directions, so a host added to one and not the other STOPS
     THE BUILD — which is why the nav.js / sketchbook.html gaps could exist historically and cannot
     now. ⛔ A FILE WHOSE ABSENCE FAILS SILENTLY AND CHANGES MONEY ON SCREEN IS THE DEFINITION OF
     SACRED: the leak-guard already caught this one referenced-but-untracked, and the typeof guard
     in _propUpkeepCatalogue would have degraded every property's upkeep window without an error. */
  'scripts/studio-upkeep.js': '2b62363a46ee99f85965a698a5d2502f',   // §49.3/§49.4 — winterising promoted into the upkeep hover; RV site fees named in the storage hover (2026-08-13)
  /* STEP 2a — the second studioSource part. SACRED on the same MEASURED rule as the catalogue above:
     a file whose absence fails silently and changes money on screen. Three room families (Moat,
     Cellar, Yard) read the payment figures it carries. */
  'scripts/studio-debt-cost.js': 'df016d73c4a45117681577a5b064f9ed',   // the monthly carrying cost of a debt — extracted from studio.html:9487-9504 (2026-08-13)
  /* STEP 1 — the landing. SACRED because it owns the completeness predicate: a wrong answer here
     tells the user a phase of the method is finished when it is not, on the front door. */
  'scripts/studio-landing.js': '10d9f41cf274705dfa2fca2e1ff41f19',   // landing declutter; ← Dashboard on top; Architecture's Next carries resolveEstate (2026-08-14)
  'scripts/studio-blueprint.js': '5d26366432a57de46e927738fa072fbe',   // the six typed running costs ride the slim Clerk allowlist in the same commit as the fields (2026-08-13)
  // MISS-5 pre-work guard (2026-07-25). nav.js is a Sacred Host in CLAUDE.md but was absent from THIS map,
  // so a bad edit failed no build. It owns the centralized cross-device restore every page depends on
  // (_datumRestoreFromClerk / _restoreBlueprintFromD1 / the title mirror), and MISS-5 pre-work items 1, 2
  // and 4 all land in it — pin it BEFORE the arc that leans on it, not after.
  // NOTE: CLAUDE.md lists this host as 'scripts/nav.js'. That path does not exist; the real, page-referenced
  // file is /nav.js at the repo root (every page loads <script src="/nav.js">). Pinned at its true path.
  'nav.js': '3c964e05430c27d686cbb8390ec923bf',   // in-site link guard: signed-out exits reach the chokepoint (2026-07-31)
  // Same gap as nav.js above, found 2026-07-27 while wiring the erase fix: sketchbook.html is a
  // Sacred Host in CLAUDE.md but was ABSENT from this map, so the erase edit passed the build with
  // no guard at all. Pinned at its true content.
  'sketchbook.html': '572a851bb53a978697bc81da6e44a178',   // card buttons read "Open in Sketch" / "Open in Studio" (2026-08-01)

  // ── MAP CLOSED 2026-07-27 ────────────────────────────────────────────────────────────────────
  // The seven below were declared Sacred in CLAUDE.md and pinned NOWHERE, so any edit to them
  // shipped with zero byte-contract. That is how the sketchbook.html erase edit got through, and
  // how nav.js got through before it — the map was being patched one file at a time, only at the
  // moment someone happened to edit that file. Reconciled all at once instead. Hashes recomputed
  // fresh from source, never pasted. THE RULE FROM HERE: every host declared Sacred in CLAUDE.md is
  // pinned here, and every host pinned here is declared there — the two lists match exactly.
  'vault.html': 'c7a7a9c101a6743c6a6a2d4c9f8453e1',
  'my-account.html': 'b6c0cade10a7d77fc948e891e58cecde',   // intro names the rooms, not their positions (2026-08-01)
  'Blueprint.html': '2129066cbd16c0a30e95278a4f7355f4',   // cards +29% area; card buttons get real chrome (2026-08-01)
  'Dossier.html': '5cceff124fd6d158557fa5d58defb1bd',
  'privacy.html': '7f7f867eb7acbfef3f6475dbc5b973b2',
  'terms.html': '6857a4a3767eb02d2baa233b7f43278c',
  'scripts/account-topbar.js': '12fb359c789211f27fdfa0f30e431ccf',   // Dossier tab retired; Sign Out is Home-only (2026-08-01)
};
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

/* ── SACRED MAP AGREEMENT (CLAUDE.md <-> SACRED{}) ────────────────────────────────────────────────
   Fence [B] added the RULE — every host declared Sacred in CLAUDE.md is pinned above, and every host
   pinned above is declared there. This is the ENFORCER, so the rule cannot quietly reopen the way it
   did twice already (nav.js 07-25, sketchbook.html 07-27): both times the map was patched one file
   at a time, only when someone happened to edit that file.

   It lives in the BUILD, not in a gate script, because only the build actually blocks — a standalone
   check rots via the dead-anchor tell (the suite is run by hand). Doctrine #34 is the precedent: the
   check that mattered was the one Cloudflare ran, not the one we meant to run.

   ⚠️ UNPARSEABLE IS NOT AGREEMENT. A parser that silently mis-scopes or returns nothing would report
   "0 mismatches" and PASS — a vacuous control of the exact class this arc keeps finding. Measured:
   a naive whole-file scan of CLAUDE.md matches 24 ` · host` lines; only 12 are the real list. Hence
   the explicit markers, the non-empty floor, and the anchor check — and a DISTINCT failure message,
   so a doc reformat reads as "I could not check", never as "all clear". */
const SACRED_ANCHOR = 'studio.html';   // must appear in any correctly-parsed declared list

function parseDeclaredHosts(mdText) {
  const start = mdText.indexOf('<!-- SACRED-LIST-START -->');
  const end = mdText.indexOf('<!-- SACRED-LIST-END -->');
  if (start === -1 || end === -1 || end < start) return null;   // null = UNPARSEABLE, never []
  const block = mdText.slice(start, end);
  return [...block.matchAll(/^ · ([^ ·\s]+)/gm)].map((m) => m[1]);
}

function compareSacred(declared, pinned) {
  if (declared === null) return { unparseable: 'markers missing or out of order' };
  if (declared.length === 0) return { unparseable: 'parsed 0 entries between the markers' };
  if (!declared.includes(SACRED_ANCHOR)) return { unparseable: `anchor "${SACRED_ANCHOR}" absent — the parse is not trustworthy` };
  return {
    declaredNotPinned: declared.filter((h) => !pinned.includes(h)),
    pinnedNotDeclared: pinned.filter((h) => !declared.includes(h)),
  };
}

/* Self-check: the comparator proves itself on every run, in memory. A comparator that cannot detect
   drift must never be able to report agreement. No repo mutation, nothing to restore, cannot be
   skipped. If any fixture misbehaves we abort and print NO verdict. */
(function selfCheckSacredComparator() {
  const A = 'studio.html';
  const cases = [
    ['detects declared-not-pinned', compareSacred([A, 'b.html'], [A]), (r) => r.declaredNotPinned && r.declaredNotPinned.includes('b.html')],
    ['detects pinned-not-declared', compareSacred([A], [A, 'b.html']), (r) => r.pinnedNotDeclared && r.pinnedNotDeclared.includes('b.html')],
    ['empty parse is UNPARSEABLE, not agreement', compareSacred([], [A]), (r) => !!r.unparseable],
    ['null parse is UNPARSEABLE, not agreement', compareSacred(null, [A]), (r) => !!r.unparseable],
    ['missing anchor is UNPARSEABLE', compareSacred(['b.html'], ['b.html']), (r) => !!r.unparseable],
    ['agreement is reported when lists match', compareSacred([A], [A]), (r) => !r.unparseable && r.declaredNotPinned.length === 0 && r.pinnedNotDeclared.length === 0],
  ];
  const bad = cases.filter(([, got, ok]) => !ok(got));
  if (bad.length) {
    console.error('SACRED MAP SELF-CHECK FAILED — the comparator cannot prove it detects drift:');
    for (const [name] of bad) console.error('  - ' + name);
    console.error('  Refusing to report a SACRED map verdict from an unproven comparator.');
    process.exit(1);
  }
})();

{
  const declared = existsSync('CLAUDE.md') ? parseDeclaredHosts(readFileSync('CLAUDE.md', 'utf8')) : null;
  const pinned = Object.keys(SACRED);
  const r = compareSacred(declared, pinned);
  if (r.unparseable) {
    console.error('SACRED MAP UNREADABLE — could not parse the declared list from CLAUDE.md');
    console.error(`  (${r.unparseable})`);
    console.error('  -> This is NOT an agreement result. Refusing to report a pass.');
    process.exit(1);
  }
  if (r.declaredNotPinned.length) {
    console.error('SACRED MAP DRIFT — declared in CLAUDE.md but NOT pinned in build-dist.mjs:');
    console.error('  ' + r.declaredNotPinned.join(', '));
    console.error('  -> These files ship with NO byte-contract. Pin them or undeclare them.');
    process.exit(1);
  }
  if (r.pinnedNotDeclared.length) {
    console.error('SACRED MAP DRIFT — pinned in build-dist.mjs but NOT declared in CLAUDE.md:');
    console.error('  ' + r.pinnedNotDeclared.join(', '));
    console.error('  -> Guarded but undocumented. Add them to the Sacred Hosts list.');
    process.exit(1);
  }
  // `npm run check:sacred` — the same comparator without a full build. CONVENIENCE ONLY; the build
  // step above is the enforcement point, because it is the one that runs whether anyone remembers.
  if (process.argv.includes('--sacred-only')) {
    console.log(`SACRED MAP OK — ${declared.length} hosts, declared and pinned agree in both directions.`);
    process.exit(0);
  }
}

// -z = NUL-delimited: correctly preserves em-dash names ("Datum FI — The Range.html").
const tracked = execFileSync('git', ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });

let web = 0;
for (const f of tracked) {
  if (CONFIG.includes(f)) continue;                 // handled below, from disk
  const keep = !DROP_EXACT.has(f) && !DROP_RE.some((r) => r.test(f)) && KEEP.has(extname(f).toLowerCase());
  if (!keep || !existsSync(f)) continue;            // !existsSync = deleted-but-tracked (xlsx, masterlogo)
  const dest = join(OUT, f);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(f, dest);
  web++;
}

let cfg = 0;
for (const c of CONFIG) {
  if (existsSync(c)) { copyFileSync(c, join(OUT, c)); cfg++; }
}
if (existsSync('.assetsignore')) copyFileSync('.assetsignore', join(OUT, '.assetsignore'));

// Sacred-host byte-identity guard.
for (const [f, want] of Object.entries(SACRED)) {
  const got = md5(join(OUT, f));
  if (got !== want) { console.error(`SACRED DRIFT — ${f}: ${got} != ${want}`); process.exit(1); }
}

// Leak guard — abort if any forbidden artifact slipped into the publish root.
for (const bad of ['.claude', 'package.json', 'package-lock.json']) {
  if (existsSync(join(OUT, bad))) { console.error(`LEAK GUARD HIT — ${bad} present in ${OUT}/`); process.exit(1); }
}

/* ── D1 CUTOVER INVARIANT ─────────────────────────────────────────────────────────────────────────────
 * D1 IS THE DRIVER. THE 4-SLOT CLERK/LS BOOK IS A SOAK-PERIOD MIRROR. A WRITE MAY ACCOMPANY IT.
 * A WRITE MAY NEVER SUBSTITUTE FOR IT.
 *
 * WHY THIS IS A BUILD STEP AND NOT A COMMENT. The code already said this, clearly, in capitals, in two
 * places — sketch.html's "DEGRADED-OFFLINE CACHE ONLY ... the net must never re-cap D1 truth" and
 * sketchbook.html's "READ-CUTOVER ... a reachable-empty D1 list is AUTHORITATIVE". Those comments are
 * exemplary and they still did not stop _autoConsumeSketch from writing ZERO D1 rows, which destroyed a
 * new user's first sketch on the conversion path. A COMMENT CANNOT FAIL A BUILD. It is a request to a
 * future reader who may be tired, mid-arc, or a fresh session with no memory of any of this. Apply the
 * amputation test to a comment and it fails instantly: delete it and nothing goes red, which means it was
 * never what was holding the line.
 *
 * THE RULE IS A POSITIVE INVARIANT ABOUT THE DRIVER, NOT A BLOCKLIST OF FORBIDDEN CALLS: any function
 * that persists a user's saved sketch/blueprint into localStorage must ALSO reach D1 in that same
 * function. It catches code by WHAT IT TOUCHES, not by what it is called, so a new writer with a spelling
 * nobody predicted is caught anyway — the same reason a defaultValue comparison beat a hand-listed set of
 * bookkeeping fields.
 *
 * IT ENCODES THE SOAK RATHER THAN ENDING IT. LS + D1 passes. LS alone fails. We are not deleting the
 * mirror today and this rule does not ask anyone to.
 * DRAFT KEYS ARE DELIBERATELY ABSENT from the governed list: a draft is not a save, and
 * writeSessionDraft writing local-only is correct behaviour, not a violation.
 *
 * ── ORIGIN IS PART OF THE RULE, AND LEAVING IT OUT MADE THE RULE UNTRUE ──────────────────────────────
 * First formulation was "any function writing a governed LS key must reach D1". MEASURED: it fired on 13
 * sites of which ONE was the defect. It flagged _applySketchBook, which populates LS *from the D1 list* —
 * the exact opposite of the bug — plus the declared Clerk fallback restore, a slot DELETE, and three
 * Studio helpers whose caller save() reaches D1 a few lines away. Twelve exemptions would have been
 * needed, and an exemption list twelve entries deep IS the ignorable comment this rule exists to replace.
 * A rule that must be silenced to be adopted was never an invariant.
 * THE DISTINGUISHING PROPERTY IS PROVENANCE, NOT THE KEY. The defect is user work that exists ONLY in the
 * mirror. Content flowing D1 -> LS is a cache being filled and is correct; content flowing USER -> LS
 * without reaching D1 is work the sketchbook will never render, because it renders from D1 and treats a
 * reachable-empty list as authoritative. So a write is governed only when the same function also touches
 * a USER-ORIGIN source: the live serializer, or the carried vault-hop snapshot.
 * WHAT THIS DELIBERATELY DOES NOT CATCH, stated rather than discovered later: user content that reaches
 * LS through some future origin named in neither list. The origins are few, central and stable, but they
 * are the one hand-maintained part of this rule and the place to look first if it ever misses something.
 *
 * ── THE BLIND SPOT. READ THIS BEFORE TRUSTING A GREEN RUN. ───────────────────────────────────────────
 * THIS RULE GUARDS AGAINST WRITING TO THE MIRROR ALONE. IT DOES NOT GUARD AGAINST WRITING NOWHERE.
 * A function that persists NOTHING AT ALL writes no localStorage, so it never matches, and it is silent,
 * green and wrong. FOUND BY EXAMPLE, not by theory: sketchbook.html's "PIN CURRENT SCENARIO" path called
 * executeSavePayloadToSlot with no payload, which set an in-memory object and showed a toast — no LS, no
 * D1, nothing durable — and this rule could not see it. A save-labelled control that persists nothing is
 * the same species of defect as one that persists only to the mirror; the user performs the gesture and
 * owns nothing either way.
 * ⚠️ THAT EXAMPLE WAS DELETED ON 2026-08-01 (it was dead scaffolding, no callers since P6.1) AND THE
 * BLIND SPOT IS UNCHANGED. Recorded deliberately: the specimen is gone, the gap it demonstrated is not,
 * and a future reader who cannot find the example must not conclude the hole was closed.
 * SO A GREEN RUN HERE MEANS "no write reached the mirror alone". IT DOES NOT MEAN "every save saves".
 * Closing it would require asserting that a control labelled save eventually persists something, which is
 * a claim about intent and reachability rather than about bytes — and the thirteen-site first draft of
 * this very rule is the standing evidence for what happens when an invariant reaches past what it can
 * actually see. Recorded rather than closed, deliberately. */
const D1_SURFACES = {
  sketch: {
    files: ['sketch.html', 'sketchbook.html'],
    lsKeys: ['datumfi_sketchbook_v1', 'datum_sketch_state_', 'datum_sketch_byid_', 'LS_KEY'],
    d1Reach: ['_d1WriteSketch', 'putDoc', 'scheduleWrite', 'writeNow'],
    // USER-ORIGIN sources: the live serializer, and the snapshot carried across the vault hop.
    origins: ['serializeSketchState', 'datumfi_sketch_current_snapshot'],
    driver: 'D1 (type=sketchbook, one row per sketch_id, unlimited)',
    mirror: 'the 4-slot Clerk/LS book (datumfi_sketchbook_v1)'
  },
  studio: {
    files: ['studio.html', 'scripts/studio-blueprint.js'],
    lsKeys: ['datum_blueprint_state_', 'datumfi_blueprint_archive_v1', 'PER_SLOT_PREFIX', 'ARCHIVE_KEY'],
    d1Reach: ['d1WriteBlueprint', 'd1WriteStudio', 'putDoc', 'scheduleWrite', 'writeNow'],
    origins: ['captureDOM', 'serializeSketchState'],
    driver: 'D1 (type=blueprint / studio)',
    mirror: 'the per-slot LS blueprint archive'
  }
};
/* THE EXEMPTION LIST IS A PLACE TO WRITE A COMMENT THE GATE AGREES TO IGNORE — which is the exact species
 * this rule exists to kill. So it is expensive on purpose, and it is EMPTY. Three conditions, all enforced
 * below, none of them optional:
 *   1 · a named reason AND a date. An exemption with no stated reason fails the build like a violation.
 *   2 · PROVEN, NOT ASSERTED. `delegatesTo` names the helper, and the gate verifies THE HELPER reaches D1.
 *       An exemption may RELOCATE the obligation. It may never DISCHARGE it.
 *   3 · a STALE exemption is a build failure — if the function no longer writes LS, or no longer exists,
 *       the entry must be removed. Exemption lists rot silently and a rotted list is decoration.
 * If that makes an exemption expensive: good. It should be cheaper to reach D1 than to explain why you did not. */
const D1_EXEMPT = {
  // 'file::functionName': { reason: '...', date: 'YYYY-MM-DD', delegatesTo: 'helperFnName' }
  'sketchbook.html::_autoConsumeSketch': {
    reason: 'The driver write is the FIRST thing it does, delegated to _d1WriteCarriedSketch — the page-local ' +
            'mirror of sketch.html _d1WriteSketch, which is private to an IIFE on another page and not reachable ' +
            'from here. The obligation is RELOCATED to that helper, and verified there, not discharged.',
    date: '2026-07-31',
    delegatesTo: '_d1WriteCarriedSketch'
  }
};

/* Enclosing-function walk. NOT a fork of scripts/_gate_extract.mjs — that extracts a function BY NAME;
 * this asks the opposite question, "which function contains this index", which no existing helper answers. */
function enclosingFn(src, idx) {
  let from = src.lastIndexOf('function', idx);
  while (from >= 0) {
    const open = src.indexOf('{', from);
    if (open >= 0) {
      let depth = 0;
      for (let j = open; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') {
          depth--;
          if (depth === 0) {
            if (j > idx) {
              const sig = src.slice(from, open);
              const m = /function\s+([A-Za-z0-9_$]+)/.exec(sig);
              return { name: m ? m[1] : '<anonymous>', body: src.slice(from, j + 1), start: from };
            }
            break;
          }
        }
      }
    }
    from = src.lastIndexOf('function', from - 1);
  }
  return null;
}
function d1Violations() {
  const bad = [];
  const seenExempt = new Set();
  for (const [surface, cfg] of Object.entries(D1_SURFACES)) {
    for (const f of cfg.files) {
      if (!existsSync(f)) continue;
      const src = readFileSync(f, 'utf8');
      const re = /localStorage\s*\.\s*setItem\s*\(\s*([A-Za-z0-9_$'".+ ]+?)\s*,/g;
      let m;
      while ((m = re.exec(src))) {
        const keyExpr = m[1];
        if (!cfg.lsKeys.some((k) => keyExpr.indexOf(k) >= 0)) continue;   // not a governed key
        const fn = enclosingFn(src, m.index);
        if (!fn) continue;
        // PROVENANCE: only USER-ORIGIN content is governed. A cache filled FROM D1 is correct behaviour.
        if (!cfg.origins.some((o) => fn.body.indexOf(o) >= 0)) continue;
        const tag = `${f}::${fn.name}`;
        const reaches = cfg.d1Reach.some((d) => fn.body.indexOf(d) >= 0);
        const ex = D1_EXEMPT[tag];
        if (ex) {
          seenExempt.add(tag);
          if (!ex.reason || !ex.date) { bad.push({ tag, surface, cfg, why: 'EXEMPTION WITHOUT A NAMED REASON AND DATE' }); continue; }
          if (!ex.delegatesTo) { bad.push({ tag, surface, cfg, why: 'EXEMPTION DOES NOT NAME THE HELPER IT DELEGATES TO' }); continue; }
          const helper = enclosingFn(src, src.indexOf('function ' + ex.delegatesTo) + 10);
          const helperReaches = helper && cfg.d1Reach.some((d) => helper.body.indexOf(d) >= 0);
          if (!helperReaches) bad.push({ tag, surface, cfg, why: `EXEMPTION UNPROVEN — ${ex.delegatesTo} does not reach D1 either` });
          continue;
        }
        if (!reaches) bad.push({ tag, surface, cfg, why: 'writes the mirror and never reaches the driver', line: src.slice(0, m.index).split('\n').length });
      }
    }
  }
  for (const tag of Object.keys(D1_EXEMPT)) {
    if (!seenExempt.has(tag)) bad.push({ tag, why: 'STALE EXEMPTION — this function no longer writes a governed key (or no longer exists). Remove the entry.' });
  }
  return bad;
}
if (process.argv.includes('--selftest-d1invariant')) {
  /* AMPUTATION TEST. Strip the D1 call out of a known-good writer and require THAT function to be named —
   * not merely require some failure. An invariant that has never been made to fail is decoration. */
  const TARGET = 'sketch.html', VICTIM = '_doSave';
  const orig = readFileSync(TARGET, 'utf8');
  const baseline = d1Violations();
  const hurt = orig.replace('var _d1Write = _d1WriteSketch(payload);', 'var _d1Write = null;  /* SELFTEST */');
  if (hurt === orig) { console.error('SELFTEST could not apply its poison — the anchor moved.'); process.exit(1); }
  writeFileSync(TARGET, hurt);
  let caught;
  try { caught = d1Violations().filter((b) => b.tag === `${TARGET}::${VICTIM}`); }
  finally { writeFileSync(TARGET, orig); }
  console.log(`SELF-TEST d1 invariant: baseline_violations=${baseline.length} poisoned_caught=${caught.length} (${VICTIM})`);
  // One violation is reported per GOVERNED WRITE, and _doSave makes three, so the floor is 1 not exactly 1.
  if (baseline.length !== 0) { console.error(`RED-FIRST INCONCLUSIVE — the clean tree already has ${baseline.length} violation(s); fix those before trusting this.`); process.exit(1); }
  if (caught.length < 1) { console.error(`RED-FIRST FAILED — stripping D1 from ${VICTIM} was not reported.`); process.exit(1); }
  console.log('RED-FIRST OK — the invariant BITES, and names the exact function.');
  process.exit(0);
}
const d1Bad = d1Violations();
if (d1Bad.length) {
  console.error('');
  console.error('  D1 CUTOVER INVARIANT VIOLATED');
  console.error('  ─────────────────────────────');
  d1Bad.forEach((b) => {
    console.error(`  ${b.tag}${b.line ? ':' + b.line : ''}`);
    console.error(`      ${b.why}`);
    if (b.cfg) {
      console.error(`      driver : ${b.cfg.driver}`);
      console.error(`      mirror : ${b.cfg.mirror}`);
    }
  });
  console.error('');
  console.error('  D1 IS THE DRIVER; THE 4-SLOT CLERK/LS BOOK IS A SOAK-PERIOD MIRROR.');
  console.error('  A WRITE MAY ACCOMPANY IT. A WRITE MAY NEVER SUBSTITUTE FOR IT.');
  console.error('');
  console.error('  A function that persists a saved sketch or blueprint into localStorage must also reach');
  console.error('  D1 in that same function. The sketchbook RENDERS FROM D1 and treats a reachable-empty');
  console.error('  list as authoritative — so a write that lands only in the mirror is not merely untidy,');
  console.error('  it is invisible to the page, and the user is shown an empty sketchbook.');
  console.error('  Reach D1 here, or add a proven exemption (reason + date + delegatesTo) in build-dist.mjs.');
  console.error('');
  process.exit(1);
}

/* ── DANGLING-ASSET GUARD ─────────────────────────────────────────────────────────────────────────────
 * A LIVE-SITE LANDMINE, NOT A FOOTNOTE. The copy loop above publishes `git ls-files` ONLY, so a new file
 * that is written but never staged is silently skipped WHILE THIS BUILD REPORTS SUCCESS. Measured
 * 2026-07-31: scripts/datum-leave-prompt.js existed on disk, the build said OK, and the file was simply
 * absent from dist/. Nothing anywhere would have said so. The moment a page carries
 * <script src="/scripts/datum-leave-prompt.js"> that page ships pointing at a 404 — green build, broken
 * site, and the failure surfaces as a feature that silently does nothing.
 *
 * So it becomes an assert rather than something anyone has to remember — same instinct as replacing the
 * hand-list of bookkeeping fields with a rule.
 *
 * SCOPE IS DELIBERATELY NARROW: <script src> and <link href> only, which is the exact class that bites.
 * Navigation links are NOT checked — a wrong <a href> is a different problem with different false
 * positives, and a guard that cries wolf on the Captain's deploy is worse than no guard (L60). External,
 * protocol-relative, data:, and fragment references are skipped because they are not ours to resolve. */
function assetRefs(html) {
  const out = [];
  const re = /<(?:script[^>]+src|link[^>]+href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function checkDanglingAssets(extraRef) {
  const misses = [];
  const pages = tracked.filter((f) => extname(f).toLowerCase() === '.html' && existsSync(join(OUT, f)));
  for (const page of pages) {
    const refs = assetRefs(readFileSync(join(OUT, page), 'utf8'));
    if (extraRef && page === pages[0]) refs.push(extraRef);          // self-test injection only
    for (const ref of refs) {
      if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^(?:data:|mailto:|tel:|#)/i.test(ref)) continue;
      /* /cdn-cgi/ is CLOUDFLARE'S OWN NAMESPACE, served by the edge and never present in this repo —
       * sketchv2.html carries an injected email-decode script. Real at runtime, absent from dist by
       * definition, so excluding it is correctness rather than a carve-out. Found by this guard on its
       * first run, which is the guard doing its job before it ever reached the Captain's deploy. */
      if (/^\/cdn-cgi\//i.test(ref)) continue;
      const clean = ref.split('?')[0].split('#')[0];
      if (!clean) continue;
      const target = clean.startsWith('/') ? join(OUT, clean) : join(OUT, dirname(page), clean);
      if (!existsSync(target)) misses.push(`${page} -> ${ref}`);
    }
  }
  return misses;
}
/* RED-FIRST, SHIPPED WITH THE CHECK (ratified): every self-check carries its own proof that it can fail.
 * `node scripts/build-dist.mjs --selftest-assets` injects one reference to a file that cannot exist and
 * requires the guard to catch exactly it. A guard that cannot bite is a measurement of the guard. */
if (process.argv.includes('--selftest-assets')) {
  const PHANTOM = '/scripts/__phantom_asset_that_cannot_exist.js';
  const caught = checkDanglingAssets(PHANTOM).filter((s) => s.endsWith(PHANTOM));
  const clean  = checkDanglingAssets();
  console.log(`SELF-TEST dangling-asset guard: injected=1 caught=${caught.length} baseline_misses=${clean.length}`);
  if (caught.length !== 1) { console.error('RED-FIRST FAILED — the guard did not catch an asset that cannot exist.'); process.exit(1); }
  if (clean.length !== 0)  { console.error(`RED-FIRST INCONCLUSIVE — baseline is already dirty: ${clean.join(', ')}`); process.exit(1); }
  console.log('RED-FIRST OK — the guard BITES, and is silent on the real tree.');
  process.exit(0);
}
const dangling = checkDanglingAssets();
if (dangling.length) {
  console.error('DANGLING ASSET — a page references a file that is NOT in the publish output:');
  dangling.forEach((d) => console.error('  ' + d));
  console.error('  -> Almost always an unstaged new file: the copy step publishes `git ls-files` only.');
  console.error('  -> git add the file, or fix the reference. A green build must not ship a 404.');
  process.exit(1);
}

console.log(`OK — ${web} web assets + ${cfg} config files -> ${OUT}/  (sacred hosts byte-identical, leak-guards clean, no dangling assets)`);
