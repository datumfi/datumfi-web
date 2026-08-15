'use strict';
/* _gate_clerk_sdk_pinned.js — STANDING GATE
 *
 * THE CLAIM: every Clerk SDK load in this repo names an EXACT version. No `@latest`, no range.
 *
 * WHY THIS IS A GATE AND NOT A ONE-TIME EDIT. `@clerk/clerk-js@latest` means the day Clerk
 * publishes a new version, datumfi.com serves it on the next page load — no commit, no deploy, no
 * warning — on the one script that decides whether anybody can sign in at all.
 *   🔑 AN UNPINNED DEPENDENCY IS A DEPLOY YOU DID NOT SCHEDULE, PERFORMED BY A STRANGER, ON A DATE
 *      THEY CHOOSE.
 * Fixing the seven current call sites without this gate would leave the next page somebody writes
 * free to paste `@latest` back in, and nothing would notice.
 *
 * ── THE POPULATION IS DERIVED, NEVER ENUMERATED ──────────────────────────────────────────────
 * The file list comes from `git ls-files -z`, so a NEW page carrying an unpinned Clerk tag is
 * caught the day it is added. A hard-coded list of the seven files known today would be a
 * hand-maintained list wearing a filename — the exact defect this project keeps paying for.
 *   ⚠️ `-z` (NUL-delimited) is not decoration: git QUOTES paths containing spaces, and this repo
 *      has several ("Datum FI — The Range.html"). A newline-split population silently mis-parses
 *      them, which is how a 15-page arc was once planned against 14 pages.
 * UNTRACKED files are deliberately out of scope: they are not published (build-dist copies
 * `git ls-files` only), so an unpinned tag in one cannot reach a user. Stated so the exclusion
 * reads as a decision rather than an oversight.
 *
 * ── WHAT "PINNED" MEANS HERE ─────────────────────────────────────────────────────────────────
 * An exact semver triple. `@latest`, `@next`, `@4`, `@^4.73.14`, `@~4.73` and a bare `@` are all
 * REJECTED — every one of them lets somebody else choose the bytes. This is deliberately stricter
 * than "not @latest", because "not the word latest" is the kind of assertion that passes over
 * `@4` and reads as coverage.
 *
 * ── VERIFIED BEFORE THE PIN WAS CHOSEN, NOT AFTER ────────────────────────────────────────────
 * 2026-08-15, against the live CDN: @4.73.14 -> HTTP 200, and its bytes are MD5-IDENTICAL to what
 * @latest resolved to (df49dcb8b3d8d3f5c465cff18a5f6baf). So the pin changes nothing today — which
 * is exactly the property a pin should have. It also matches the version CLAUDE.md's D3 already
 * recorded, so doctrine and reality agree for the first time rather than by coincidence.
 * ⚠️ CSP NEEDED NO CHANGE, CHECKED RATHER THAN ASSUMED: script-src allows the HOST
 * `https://clerk.datumfi.com` with no path constraint, so the version segment is invisible to it.
 *
 * CONTROL
 *   --unpin : serves the check a synthetic `@latest` tag, proving the matcher actually bites.
 *
 * @gate-pool: node
 *
 * Run: node scripts/_gate_clerk_sdk_pinned.js        (exit 0 = GREEN)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UNPIN = process.argv.includes('--unpin');

/* Any clerk-js reference, however it is versioned — the point is to FIND them all first and judge
   second. A regex that only matched the pinned shape would never see the thing it exists to catch. */
const ANY = /@clerk\/clerk-js@([^/'"\s)]*)/g;
const EXACT = /^\d+\.\d+\.\d+$/;

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

let files;
try {
  files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 26 })
    .toString('utf8').split('\0').filter(Boolean);
} catch (e) {
  console.error('POPULATION UNAVAILABLE — git ls-files failed. A gate that cannot build its population is not a pass.');
  console.error(e.message);
  process.exit(1);
}

const scanned = files.filter((f) => /\.(html|js|mjs)$/i.test(f) && !/^scripts\/_/.test(f) && !/^dist\//.test(f));
const hits = [];
for (const f of scanned) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
  if (UNPIN && /@clerk\/clerk-js@/.test(src)) {
    src = src.replace(/@clerk\/clerk-js@[^/'"\s)]*/, '@clerk/clerk-js@latest');
  }
  ANY.lastIndex = 0;
  let m;
  while ((m = ANY.exec(src))) hits.push({ file: f, ver: m[1] });
}

console.log('\n_gate_clerk_sdk_pinned — ' + (UNPIN ? '--unpin' : 'baseline') + '\n');
console.log('    scanned ' + scanned.length + ' tracked html/js file(s); found ' + hits.length + ' Clerk SDK reference(s)');
hits.forEach((h) => console.log('       ' + (EXACT.test(h.ver) ? 'PINNED  ' : 'FLOATING') + '  @' + (h.ver || '<empty>') + '   ' + h.file));

/* PAIRED PRESENCE. Every leg below is an ABSENCE assertion ("nothing floats"), and a population of
   zero satisfies all of them perfectly — which is precisely what happens if the regex drifts, the
   tag moves to a loader, or somebody renames the package. A gate that goes green because it found
   nothing is not measuring the product. */
check('C0 · the scan found Clerk SDK references at all (a population of zero passes every absence leg)',
  hits.length > 0, hits.length + ' reference(s)');

const floating = hits.filter((h) => !EXACT.test(h.ver));
check('C1 · every Clerk SDK reference names an EXACT version (no @latest, no range, no bare @)',
  floating.length === 0,
  floating.map((h) => h.file + ' -> @' + (h.ver || '<empty>')).join(' · '));

/* One version across the site. Two pinned-but-different versions would be worse than @latest: the
   auth SDK would differ between pages and nobody would see it in a diff. */
const versions = Array.from(new Set(hits.filter((h) => EXACT.test(h.ver)).map((h) => h.ver)));
check('C2 · all pinned references agree on ONE version (a split auth SDK is invisible in a diff)',
  versions.length <= 1, versions.join(', ') || 'none pinned');

console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
fails.forEach((f) => console.log('   RED · ' + f));
process.exit(fails.length ? 1 : 0);
