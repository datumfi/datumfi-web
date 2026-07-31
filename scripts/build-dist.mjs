// Canonical clean publish-root builder for datumfi.com (Cloudflare Pages).
// Ships ONLY tracked web assets (+ deploy-intrinsic config) into dist/.
// NEVER ships the repo root. Runs on Windows and the Cloudflare Linux builder.
//
// Usage:  node scripts/build-dist.mjs   ->   ./dist  (deploy that, never ".")
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
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
  'studio.html': '6d1562fa8c558018fe8984955e5f527d',   // save confirmation is downstream of the write (2026-07-30)
  'sketch.html': '9a58ddca650ed64f737357636f0c6b37',   // sketch dirty signal: trusted pointer/key, no persistence (2026-07-30)
  'scripts/studio-blueprint.js': 'd03f586676d13864564c3a733488cd1b',   // workState: read-only content + unsaved-edits facts (2026-07-31)
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
  'sketchbook.html': 'cb3dfa94fced03cf3835b67449620846',   // Option-2 _skFull hydration guard (2026-07-27)

  // ── MAP CLOSED 2026-07-27 ────────────────────────────────────────────────────────────────────
  // The seven below were declared Sacred in CLAUDE.md and pinned NOWHERE, so any edit to them
  // shipped with zero byte-contract. That is how the sketchbook.html erase edit got through, and
  // how nav.js got through before it — the map was being patched one file at a time, only at the
  // moment someone happened to edit that file. Reconciled all at once instead. Hashes recomputed
  // fresh from source, never pasted. THE RULE FROM HERE: every host declared Sacred in CLAUDE.md is
  // pinned here, and every host pinned here is declared there — the two lists match exactly.
  'vault.html': 'c7a7a9c101a6743c6a6a2d4c9f8453e1',
  'my-account.html': 'aee2279c79d212917686ab2e36f1591a',
  'Blueprint.html': 'd704336e5659bffaebf372062f09f46f',   // cannot-load tile + true counter (2026-07-29)
  'Dossier.html': '5cceff124fd6d158557fa5d58defb1bd',
  'privacy.html': 'e8ad09c3b1881fd53b47b5be9ae0ded4',
  'terms.html': 'f075b5b3a3a919ee586b962aa17bf200',
  'scripts/account-topbar.js': '29a4b5609ba83461c14c2269da2be7d9',   // tab hops routed through the page chokepoint, fail-open (2026-07-30)
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

console.log(`OK — ${web} web assets + ${cfg} config files -> ${OUT}/  (sacred hosts byte-identical, leak-guards clean)`);
