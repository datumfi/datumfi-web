/* DEV-ONLY red-first gate — Property §31 · A MODULE MAY NEVER BE OLDER THAN THE PAGE THAT CALLS IT.
 * @gate-pool: node
 *
 * THE HAZARD, MEASURED 2026-08-08 RATHER THAN ASSUMED. Cloudflare Pages' default for static assets
 * is `Cache-Control: public, max-age=14400, must-revalidate` — four hours — while every HTML page
 * answers with NO Cache-Control at all (cf-cache-status: DYNAMIC). HTML is therefore ALWAYS fresh and
 * JS can be FOUR HOURS STALE, so a returning user runs new markup against an old renderer. That is
 * not a stale pixel: it is two halves of a financial tool disagreeing about what exists.
 *
 * WHY A GATE AND NOT A ONE-TIME FIX. The `_headers` rule is three lines and would be trivially easy
 * to lose — to a reformat, a merge, or a new module landing under a path nobody added a rule for.
 * 🔑 ASSERT THE POPULATION, NOT THE INSTANCE: this does not check "are the three rules present", it
 * checks that EVERY module any shipped page actually loads is covered. So module nineteen cannot be
 * born bare, which is precisely how we ended up with 13 uncovered modules and 21 wrong placeholders —
 * per-instance conventions decay silently the moment somebody adds one.
 *
 * ⚠️ TWO JOBS, DELIBERATELY SEPARATED — AND THE SECOND IS THE ONLY ONE THAT PROVES ANYTHING LIVE.
 *   REPO-SIDE (always): the invariant. Every referenced module is covered by a max-age=0 rule.
 *   --live (publish proof): the SERVED header. A `_headers` rule that Cloudflare silently ignores
 *   looks EXACTLY like one that works, and no repo-side check could ever tell the difference. This
 *   half needs the network, so it is opt-in and run at publish time alongside the marker grep — the
 *   same shape as every other publish proof here. It is NOT optional rigour; it is a different job.
 *
 * Usage: node scripts/_gate_asset_freshness.mjs [--live] [control]
 *   --dropscripts  delete the /scripts/* rule            -> the coverage leg must RED
 *   --stalemax     restore max-age=14400 on /scripts/*   -> the coverage leg must RED
 *   --newmodule    a page loads a module no rule covers  -> the coverage leg must RED
 *   --clobbersec   drop the /* security block            -> the security leg must RED
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const DROPSCRIPTS = argv.includes('--dropscripts');
const STALEMAX = argv.includes('--stalemax');
const NEWMODULE = argv.includes('--newmodule');
const CLOBBERSEC = argv.includes('--clobbersec');

let headersSrc = readFileSync('_headers', 'utf8');
const checks = [];
const need = (l, c, d) => checks.push([l, !!c, d]);
const die = (m) => { console.error('❌ ' + m); process.exit(1); };

function mutate(a, b, label) {
  const n = headersSrc.split(a).length - 1;
  if (n !== 1) die('anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.');
  headersSrc = headersSrc.replace(a, b);
  console.log('[' + label + '] applied');
}
if (DROPSCRIPTS) mutate('/scripts/*\n  Cache-Control: public, max-age=0, must-revalidate\n', '', '--dropscripts');
if (STALEMAX) mutate('/scripts/*\n  Cache-Control: public, max-age=0, must-revalidate',
  '/scripts/*\n  Cache-Control: public, max-age=14400, must-revalidate', '--stalemax');
if (CLOBBERSEC) mutate('  X-Content-Type-Options: nosniff\n', '', '--clobbersec');

/* ── PARSE _headers ──────────────────────────────────────────────────────────────────────────────
 * A rule is a line starting at column 0 with '/', followed by indented `Header: value` lines.
 * Comments (#) and blanks are skipped. Deliberately NOT a regex over the whole file: this must know
 * which header belongs to which path, and a flat scan cannot. */
function parseHeaders(txt) {
  const rules = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line || /^\s*#/.test(line)) continue;
    if (/^\//.test(line)) { cur = { path: line.trim(), headers: {} }; rules.push(cur); continue; }
    const m = line.match(/^\s+([A-Za-z0-9-]+):\s*(.*)$/);
    if (m && cur) cur.headers[m[1].toLowerCase()] = m[2];
  }
  return rules;
}
const rules = parseHeaders(headersSrc);
need('[PRESENCE] _headers parsed into rule blocks', rules.length > 0, rules.length + ' rules');
if (!rules.length) die('PRESENCE — parsed 0 rules from _headers. Refusing to validate coverage against an empty ruleset.');

/* Cloudflare Pages globbing: `*` matches any run of characters. Anchored both ends. */
const matches = (pattern, url) =>
  new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(url);

const maxAgeOf = (v) => { const m = /max-age\s*=\s*(\d+)/i.exec(v || ''); return m ? parseInt(m[1], 10) : null; };

/* ── THE CENSUS — every local module any SHIPPED page actually loads ─────────────────────────────
 * Derived from the pages themselves, never hand-listed. Tracked files only, and the build's own
 * drops applied, so an untracked scratch page cannot redden this and a dropped one cannot either. */
const tracked = execFileSync('git', ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
const DROP_EXACT = new Set(['masterlogo.html']);
const pages = tracked.filter((f) => /\.html$/i.test(f) && !DROP_EXACT.has(f) && !/^scripts\/_/.test(f));
const refs = new Map();                                   // module url -> Set(pages)
for (const p of pages) {
  let html;
  try { html = readFileSync(p, 'utf8'); } catch { continue; }
  if (NEWMODULE && p === pages[0]) html += '\n<script src="/vendor/brandnew.js"></script>\n';
  for (const m of html.matchAll(/<script[^>]*\ssrc="(\/[^"]+\.js)(\?[^"]*)?"/g)) {
    if (/^\/cdn-cgi\//.test(m[1])) continue;              // Cloudflare's own injected decoder, not ours
    if (!refs.has(m[1])) refs.set(m[1], new Set());
    refs.get(m[1]).add(p);
  }
}
const modules = [...refs.keys()].sort();
need('[PRESENCE] the script-tag census found the shipped pages', pages.length >= 10, pages.length + ' pages');
need('[PRESENCE] the census is non-trivial (>= 10 distinct modules) — a thin parse is a parse failure wearing a pass',
  modules.length >= 10, modules.length + ' modules');

// ── THE INVARIANT — every referenced module is covered by a max-age=0 rule ───────────────────────
const uncovered = [];
for (const url of modules) {
  const applicable = rules.filter((r) => matches(r.path, url) && r.headers['cache-control'] !== undefined);
  // LAST MATCHING RULE WINS, which is how Pages resolves a duplicate header name.
  const winner = applicable.length ? applicable[applicable.length - 1] : null;
  const age = winner ? maxAgeOf(winner.headers['cache-control']) : null;
  if (age === null || age > 0) {
    uncovered.push(url + ' (' + (winner ? winner.path + ' -> max-age=' + age : 'NO Cache-Control rule') +
      ') loaded by ' + [...refs.get(url)].slice(0, 2).join(', '));
  }
}
need('EVERY module a shipped page loads is covered by a max-age=0 rule — uncovered: ' + uncovered.length +
     (uncovered.length ? ' [' + uncovered.join(' | ') + ']' : ''),
  uncovered.length === 0, modules.length + ' modules checked');

/* The security block must survive. This gate edits the same file, and a cache fix that quietly
   dropped nosniff or SAMEORIGIN would be a strictly worse trade than the staleness it cured. */
const star = rules.find((r) => r.path === '/*');
need('the /* security block survives (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy)',
  !!star && ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']
    .every((h) => star.headers[h] !== undefined),
  star ? Object.keys(star.headers).length + ' headers on /*' : 'NO /* rule');

/* HTML MUST NOT BE PINNED LONG. The whole hazard is the ASYMMETRY between always-fresh HTML and
   stale JS; a rule that started caching HTML would close the gap from the wrong end and hide it. */
const htmlPinned = rules.filter((r) => /\.html$/.test(r.path) && (maxAgeOf(r.headers['cache-control']) || 0) > 0);
need('no rule gives an HTML page a nonzero max-age (the asymmetry must never be closed from the wrong end)',
  htmlPinned.length === 0, htmlPinned.map((r) => r.path).join(',') || 'none');

// ── --live · THE ONLY HALF THAT PROVES THE EDGE AGREES ───────────────────────────────────────────
if (LIVE) {
  const probe = modules.slice(0, 6);
  for (const url of probe) {
    let cc = null, status = 0;
    try {
      const res = await fetch('https://datumfi.com' + url, { method: 'HEAD', cache: 'no-store' });
      status = res.status;
      cc = res.headers.get('cache-control');
    } catch (e) { cc = 'FETCH FAILED: ' + e.message; }
    const age = maxAgeOf(cc);
    need('[LIVE] served ' + url + ' -> max-age=0 (edge honours _headers)',
      status === 200 && age === 0, 'HTTP ' + status + '  Cache-Control: ' + cc);
  }
}

let bad = 0;
for (const [l, c, d] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + l + (d ? '  (' + d + ')' : '')); }
console.log('-------------------------------------');
console.log('[asset_freshness] ' + (bad === 0 ? 'GREEN' : 'RED') + '  ' + (checks.length - bad) + '/' + checks.length +
  (LIVE ? '  [+live]' : '  [repo-side only — run --live after publish]'));
process.exit(bad === 0 ? 0 : 1);
