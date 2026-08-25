/* @gate-pool: node
 *
 * ══ THE CLERK INSTANCE IS NAMED IN EIGHT PLACES AND THEY MUST ALL AGREE ═════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS BECAUSE THE DOMAIN CHANGE HAS NO REHEARSAL. Clerk DEVELOPMENT instances
 * cannot change domain, so the production change is the first and only run. When no rehearsal
 * surface exists the substitute is not more caution — CAUTION IS A FEELING, A RED GATE IS A FACT —
 * it is a check that fails on PARTIAL APPLICATION, which is the exact failure mode of an eight-file
 * atomic commit: seven edited, one forgotten.
 *
 * ── ⭐ IT ASSERTS AN INVARIANT, NOT A VALUE ─────────────────────────────────────────────────────
 * It does not know or care WHICH domain is correct. It cares that ALL EIGHT AGREE.
 *   GREEN today on datumfi · GREEN after the flip on datumae · RED only in the one state that must
 *   never ship — a half-applied migration.
 * 🔑 A GATE THAT SURVIVES ITS OWN SUBJECT CHANGING WILL STILL BE TRUE NEXT YEAR. Pin the value and
 *    it becomes a chore that reds on the day the migration succeeds.
 *
 * ── THE INVARIANT IT GUARDS ─────────────────────────────────────────────────────────────────────
 *     THE INSTANCE THAT ISSUES A SESSION MUST EQUAL THE ONE THE BROWSER LOADS
 *     MUST EQUAL THE ONE THE SERVER VALIDATES.
 * issuer≠loader -> the user signs in and comes back APPARENTLY SIGNED OUT.
 * loader≠validator -> signed in fine and EVERY /api/* call 401s: D1 persistence silently dead while
 * the product looks authenticated.
 *
 * ── WHERE THE INSTANCE IS NAMED ─────────────────────────────────────────────────────────────────
 *   · six pages   `data-clerk-publishable-key` — pk_live_<base64(clerk.<HOST>$)>. THE KEY IS THE
 *                 DOMAIN; proven by round-trip and vendor-confirmed.
 *   · six pages   the clerk-js `src` host
 *   · three pages the <meta> CSP naming a clerk host  (Blueprint/Dossier/sketchbook carry no CSP)
 *   · vault.html  the Account Portal host, accounts.<HOST>
 *   · my-account.html  the CSP `frame-src` Account Portal host, accounts.<HOST>
 *                 ⛔ ADDED 2026-08-25, AND ITS ABSENCE WAS THE HOLE THIS GATE WAS WRITTEN TO NOT
 *                 HAVE. The census counted 16 sites and this was the 17th: flip all 16, leave this
 *                 one, and the gate reported GREEN OVER A HALF-APPLIED MIGRATION — the exact state
 *                 it exists to catch. Silent on screen, too, because a blocked frame is console-only.
 *                 🔑 A CENSUS IS ONLY AS HONEST AS THE LIST IT WAS BUILT FROM. Nothing was broken
 *                 here; something was never counted, and a gate cannot notice a site it does not know
 *                 about. The find came from reading the FILES against the gate, not the gate alone.
 *   · auth.js     ISSUERS must CONTAIN https://clerk.<HOST>
 *                 ⚠️ CONTAIN, not equal — the dual-issuer acceptor legitimately lists two while the
 *                 move is in flight. True BEFORE, DURING and AFTER the concession, so this gate
 *                 needs no edit when the concession is removed.
 *
 * ── ⛔ COMMENTS ARE STRIPPED FIRST, AND IMMUNITY TO PROSE IS A **LEG**, NOT AN OPTION ────────────
 * Three separate times in one day a matcher of mine was defeated by prose QUOTING its own subject —
 * and once it defeated a removal trigger ruled mandatory hours earlier, because vault.html's
 * explanatory comment quotes the old hard-coded origin. A CONCESSION WITH AN UNSATISFIABLE REMOVAL
 * CONDITION IS PERMANENT BY CONSTRUCTION.
 * 🔑 A MATCHER THAT CANNOT DISTINGUISH CODE FROM COMMENTARY ABOUT CODE IS MEASURING THE WRONG
 *    POPULATION. Documentation quotes its subject — that is its job, and it defeats every naive scan
 *    forever. HTML comments are removed, then the house JS tokenizer (scripts/_studio_source.cjs
 *    stripComments, validated against an espree oracle — REUSED, not forked into a fourth copy).
 * ⭐⭐ AND L4 RUNS ON EVERY RUN RATHER THAN BEHIND A FLAG, WHICH IS A CORRECTION. Immunity was first
 * written as a control that had to stay GREEN — and two meta-gates rejected it, correctly:
 * `_gate_controls_still_red` (L4: every declared control names an `expect` this gate understands)
 * and `_gate_poison_anchors_resolve` (L5: every declared control names a NON-EMPTY expected red
 * set). A must-stay-green flag is not a control in this estate's vocabulary, and an opt-in immunity
 * check is one nobody runs. IT IS PART OF THE CLAIM, SO IT IS A LEG.
 *
 * ── ⛔ THREE STATES, NEVER TWO ──────────────────────────────────────────────────────────────────
 * ERROR (could not measure) · ABSENT (measured, nothing there) · PRESENT. An extractor that finds
 * nothing ABORTS at exit 2, never agrees vacuously: a run that reads zero publishable keys and
 * reports "all eight agree" is the empty green this suite has a name for.
 *
 * ── LEGS ────────────────────────────────────────────────────────────────────────────────────────
 *  L1 · every naming site resolves to exactly ONE instance host
 *  L2 · auth.js ISSUERS CONTAINS that host
 *       ⚠️ L2 REDS ALONGSIDE L1 ON ANY DISAGREEMENT, DECLARED RATHER THAN FAKED APART: its claim is
 *       "auth.js contains the host THE FRONT END NAMES", so a disagreeing front end leaves the claim
 *       with no subject. Measurement corrected this declaration, not the gate.
 *  L3 · the full census is present (6 keys · 6 srcs · 3 CSPs · 1 portal) — no silent gaps
 *       ⚠️ THE FRAME SITE IS DELIBERATELY NOT IN THIS CENSUS. See L5.
 *  L4 · injecting commentary that quotes the OTHER domain changes NOTHING (immunity to prose)
 *  L5 · every CSP that frames an Account Portal frames THIS instance's
 *       ⛔ IT ASKS A RELATIONAL QUESTION, AND MEASUREMENT — NOT TASTE — FORCED THAT SHAPE. The
 *       obvious build was to extract accounts.<HOST> into L1's agreement set and add `frame` to the
 *       L3 census. THAT REDS ON A CLEAN TREE: my-account.html's frame-src also names
 *       https://accounts.google.com, so a bare accounts.<host> scan reads 'google.com' as a rival
 *       instance host. THE POPULATION IS CONTAMINATED BY THIRD PARTIES — an agreement set cannot
 *       survive that, so the claim becomes "does this page frame the portal of the instance IT
 *       ALREADY NAMES", which is immune to however many strangers sit beside it in the directive.
 *       🔑 A SITE THAT SHARES A PREFIX WITH THIRD-PARTY HOSTS CANNOT JOIN AN AGREEMENT SET.
 *       ⚠️ Deletion is caught by the SAME leg, not a census count: strip the portal host and Google
 *       and Apple remain, so the page still frames SOMETHING while framing nothing of ours.
 *
 * ── RED-FIRST · each edits exactly ONE naming site, in memory ───────────────────────────────────
 *   --skewkey     one page's publishable key -> the other domain   -> L1, L2, L5
 *   --skewsrc     one page's clerk-js src host                     -> L1, L2, L5
 *   --skewcsp     one page's CSP clerk host                        -> L1, L2, L5
 *   --skewvault   vault.html's Account Portal host                 -> L1, L2, L5
 *   --skewissuer  remove the front end's host from auth.js         -> L2
 *   --dropkey     delete one publishable-key attribute entirely    -> L3  (a census GAP)
 *   --skewframe   my-account.html's frame-src portal host          -> L5  (ISOLATED — L1 stays green)
 *   --dropframe   delete that host, leaving Google and Apple       -> L5  (ISOLATED)
 *   --nostrip     do not strip comments before matching            -> L4  (prose becomes evidence)
 *   --declare-controls
 * ⚠️ THE FOUR SKEW CONTROLS GAINED L5 BY MEASUREMENT, DECLARED RATHER THAN FAKED APART, on the same
 * reasoning L2 already carried: when L1 disagrees there is no single instance to be relational
 * ABOUT, so L5's claim loses its subject. The two NEW controls are isolated to L5 and that is the
 * proof the leg reads its own site rather than riding L1's coat-tails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const { stripComments } = require_(path.join(ROOT, 'scripts/_studio_source.cjs'));

const KEY_PAGES = ['Blueprint.html', 'Dossier.html', 'my-account.html', 'sketch.html', 'sketchbook.html', 'studio.html'];
const CSP_PAGES = ['my-account.html', 'sketch.html', 'studio.html'];
const VAULT = 'vault.html';
const AUTH = 'functions/api/_lib/auth.js';
const EXPECT = { key: 6, src: 6, csp: 3, portal: 1 };
const NL = String.fromCharCode(10);

const argv = process.argv.slice(2);
const F = {
  skewkey: argv.includes('--skewkey'), skewsrc: argv.includes('--skewsrc'),
  skewcsp: argv.includes('--skewcsp'), skewvault: argv.includes('--skewvault'),
  skewissuer: argv.includes('--skewissuer'), dropkey: argv.includes('--dropkey'),
  skewframe: argv.includes('--skewframe'), dropframe: argv.includes('--dropframe'),
  nostrip: argv.includes('--nostrip')
};
const ANY = Object.values(F).some(Boolean);

const CONTROLS = {
  '--skewkey': { what: "rewrites ONE page's publishable key to the other domain — the 7-of-8 world", reds: ['L1', 'L2', 'L5'], expect: 'red' },
  '--skewsrc': { what: "points ONE page's clerk-js src at the other domain", reds: ['L1', 'L2', 'L5'], expect: 'red' },
  '--skewcsp': { what: "names the other domain in ONE page's CSP — the trap that blocks clerk-js silently", reds: ['L1', 'L2', 'L5'], expect: 'red' },
  '--skewvault': { what: "flips vault.html's Account Portal host only", reds: ['L1', 'L2', 'L5'], expect: 'red' },
  '--skewissuer': { what: "removes the front end's host from auth.js ISSUERS — loader != validator", reds: ['L2'], expect: 'red' },
  '--dropkey': { what: 'deletes one publishable-key attribute entirely — a census GAP, not a disagreement', reds: ['L3'], expect: 'red' },
  '--skewframe': { what: "points my-account.html's CSP frame-src at the OTHER instance's Account Portal — the naming site this gate could not see until 2026-08-25", reds: ['L5'], expect: 'red' },
  '--dropframe': { what: "deletes the Account Portal host from my-account.html's frame-src, leaving the Google and Apple entries — the portal iframe silently blocked", reds: ['L5'], expect: 'red' },
  '--nostrip': { what: 'skips comment stripping, so prose quoting the other domain becomes evidence', reds: ['L4'], expect: 'red' }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_clerk_coherence.mjs', controls: CONTROLS }));
  process.exit(0);
}

const poisoned = [];
const keyToHost = (pk) => {
  try {
    const m = Buffer.from(pk.replace(/^pk_(live|test)_/, ''), 'base64').toString('utf8').match(/^clerk\.([a-z0-9.-]+?)\$?$/i);
    return m ? m[1] : null;
  } catch (e) { return null; }
};
const subToHost = (h) => { const m = String(h).match(/^clerk\.(.+)$/i); return m ? m[1] : null; };

/* Prose quoting the subject, in BOTH comment dialects, exactly as real documentation would. */
function addNoise(t) {
  return '<!-- was pk_live_' + Buffer.from('clerk.datumae.com$').toString('base64')
    + ' loading from https://clerk.datumae.com and https://accounts.datumae.com -->' + NL
    + t.replace(/<script>/, '<script>' + NL
      + "/* previously 'https://accounts.datumae.com/sign-in', see clerk.datumae.com */" + NL);
}

function read(rel, noise) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  let t = fs.readFileSync(p, 'utf8');
  if (noise) t = addNoise(t);
  if (!F.nostrip) {
    t = t.replace(/<!--[\s\S]*?-->/g, ' ');
    try { t = stripComments(t); } catch (e) { /* HTML strip above still applied */ }
  }
  return t;
}

/* ── ONE EXTRACTION, RUN TWICE: once clean, once with commentary injected. ───────────────────── */
function extract(noise) {
  const sites = [], errors = [], frames = {};
  for (const f of KEY_PAGES) {
    let t = read(f, noise);
    if (t === null) { errors.push(`${f}: MISSING`); continue; }
    if (F.dropkey && f === 'studio.html') { t = t.replace(/data-clerk-publishable-key="[^"]+"/, ''); if (!noise) poisoned.push('dropped key in studio.html'); }
    if (F.skewkey && f === 'sketch.html') {
      t = t.replace(/data-clerk-publishable-key="pk_live_[^"]+"/, 'data-clerk-publishable-key="pk_live_' + Buffer.from('clerk.datumae.com$').toString('base64') + '"');
      if (!noise) poisoned.push('skewed key in sketch.html');
    }
    if (F.skewsrc && f === 'Dossier.html') { t = t.replace(/src="https:\/\/clerk\.datumfi\.com\//, 'src="https://clerk.datumae.com/'); if (!noise) poisoned.push('skewed src in Dossier.html'); }

    const km = t.match(/data-clerk-publishable-key="(pk_[a-z]+_[A-Za-z0-9+/=]+)"/);
    if (km) { const h = keyToHost(km[1]); if (h) sites.push({ file: f, kind: 'key', host: h }); else errors.push(`${f}: key did not decode to clerk.<host>$`); }
    const sm = t.match(/src="https:\/\/(clerk\.[a-z0-9.-]+)\/npm\/@clerk\//i);
    if (sm) { const h = subToHost(sm[1]); if (h) sites.push({ file: f, kind: 'src', host: h }); }
  }

  for (const f of CSP_PAGES) {
    let t = read(f, noise);
    if (t === null) { errors.push(`${f}: MISSING`); continue; }
    if (F.skewcsp && f === 'my-account.html') { t = t.replace(/https:\/\/clerk\.datumfi\.com/g, 'https://clerk.datumae.com'); if (!noise) poisoned.push('skewed CSP in my-account.html'); }
    if (F.skewframe && f === 'my-account.html') { t = t.replace(/https:\/\/accounts\.datumfi\.com/g, 'https://accounts.datumae.com'); if (!noise) poisoned.push('skewed CSP frame-src in my-account.html'); }
    if (F.dropframe && f === 'my-account.html') { t = t.replace(/\s*https:\/\/accounts\.datumfi\.com/g, ''); if (!noise) poisoned.push('dropped the portal host from my-account.html frame-src'); }
    const cm = t.match(/http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i);
    if (!cm) { errors.push(`${f}: CSP meta not found`); continue; }
    const hosts = [...new Set((cm[1].match(/https:\/\/clerk\.[a-z0-9.-]+/gi) || []).map((u) => subToHost(u.replace('https://', ''))))].filter(Boolean);
    if (!hosts.length) errors.push(`${f}: CSP names no clerk host`);
    hosts.forEach((h) => sites.push({ file: f, kind: 'csp', host: h }));

    /* ⛔ THE PORTAL IFRAME HOST DOES NOT JOIN `sites`, AND THE REASON IS MEASURED, NOT STYLISTIC.
       my-account.html's frame-src also names https://accounts.google.com, so a bare accounts.<host>
       scan reads 'google.com' as an instance host and REDS L1 ON A CLEAN TREE. The population here
       is CONTAMINATED BY THIRD PARTIES, which is exactly what an agreement set cannot tolerate — so
       L5 asks a RELATIONAL question instead (does this page frame the portal of the instance IT
       ALREADY NAMES) and leaves L1's set alone. Pages with no frame-src never enter the map. */
    const fh = [...new Set((cm[1].match(/https:\/\/accounts\.[a-z0-9.-]+/gi) || []).map((u) => u.replace(/^https:\/\//i, '').toLowerCase()))];
    if (fh.length) frames[f] = fh;
  }

  let t = read(VAULT, noise);
  if (t === null) errors.push(`${VAULT}: MISSING`);
  else {
    if (F.skewvault) { t = t.replace(/accounts\.datumfi\.com/g, 'accounts.datumae.com'); if (!noise) poisoned.push('skewed portal in vault.html'); }
    const hosts = [...new Set((t.match(/https:\/\/accounts\.[a-z0-9.-]+/gi) || []).map((u) => u.replace(/^https:\/\/accounts\./i, '')))];
    if (!hosts.length) errors.push(`${VAULT}: no Account Portal host found`);
    hosts.forEach((h) => sites.push({ file: VAULT, kind: 'portal', host: h }));
  }

  let issuers = [];
  let a = read(AUTH, noise);
  if (a === null) errors.push(`${AUTH}: MISSING`);
  else {
    if (F.skewissuer) {
      const fe = [...new Set(sites.map((x) => x.host))];
      if (fe.length === 1) {
        a = a.split("'https://clerk." + fe[0] + "'").join("'https://clerk.removed.example'");
        if (!noise) poisoned.push('removed the front end host from auth.js ISSUERS');
      }
    }
    issuers = (a.match(/'https:\/\/clerk\.[a-z0-9.-]+'/gi) || []).map((s) => s.replace(/'/g, ''));
    if (!issuers.length) errors.push(`${AUTH}: no issuers found`);
  }

  const census = sites.reduce((m, s) => { m[s.kind] = (m[s.kind] || 0) + 1; return m; }, {});
  const hosts = [...new Set(sites.map((s) => s.host))].sort();
  return { sites, errors, issuers, census, hosts, frames };
}

const clean = extract(false);
const noisy = extract(true);

console.log('[RUN] CLERK INSTANCE COHERENCE — do all eight naming sites agree?');
if (ANY) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');
if (ANY && !F.nostrip && !poisoned.length) { console.log('ABORT: poison never landed on any file'); process.exit(1); }
if (poisoned.length) console.log('   poison landed: ' + poisoned.join(', '));
console.log(`   census: key=${clean.census.key || 0}/${EXPECT.key} src=${clean.census.src || 0}/${EXPECT.src} csp=${clean.census.csp || 0}/${EXPECT.csp} portal=${clean.census.portal || 0}/${EXPECT.portal} · issuers=${clean.issuers.length}`);

if (clean.errors.length && !F.dropkey) {
  console.log('ABORT — could not measure (ERROR is not ABSENT):');
  clean.errors.forEach((e) => console.log('     · ' + e));
  process.exit(2);
}

let pass = 0, fail = 0; const results = {};
const ok = (id, msg, cond, obs) => { results[id] = !!cond; if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${obs}]`); } else { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${obs}]`); } };

ok('L1', 'every naming site resolves to exactly ONE instance host',
  clean.hosts.length === 1,
  clean.hosts.length === 1 ? clean.hosts[0]
    : 'DISAGREEMENT: ' + clean.hosts.map((h) => h + ' <- ' + clean.sites.filter((s) => s.host === h).map((s) => s.file + ':' + s.kind).join(', ')).join('  ||  '));

const chosen = clean.hosts.length === 1 ? clean.hosts[0] : null;
ok('L2', 'auth.js ISSUERS CONTAINS the host the front end names',
  !!chosen && clean.issuers.includes('https://clerk.' + chosen),
  `front end=${chosen || '(ambiguous)'} · issuers=[${clean.issuers.join(', ')}]`);

const gaps = Object.entries(EXPECT).filter(([k, n]) => (clean.census[k] || 0) !== n).map(([k, n]) => `${k} ${clean.census[k] || 0}/${n}`);
ok('L3', 'the full census is present — no naming site silently missing',
  gaps.length === 0, gaps.length ? 'GAPS: ' + gaps.join(', ') : 'all sites accounted for');

ok('L4', 'commentary quoting the OTHER domain changes nothing (immunity to prose)',
  noisy.hosts.join(',') === clean.hosts.join(',') && noisy.sites.length === clean.sites.length
    && JSON.stringify(noisy.frames) === JSON.stringify(clean.frames),
  `clean=[${clean.hosts.join(',')}] ${clean.sites.length} sites · with-prose=[${noisy.hosts.join(',')}] ${noisy.sites.length} sites`);

const framePages = Object.keys(clean.frames);
const wantPortal = chosen ? 'accounts.' + chosen : null;
ok('L5', 'every CSP that frames an Account Portal frames THIS instance',
  !!wantPortal && framePages.length > 0 && framePages.every((f) => clean.frames[f].includes(wantPortal)),
  framePages.length === 0
    ? 'ABSENT: no CSP names any accounts.<host> — the portal frame allowance is gone entirely'
    : `want ${wantPortal || '(ambiguous — L1 disagrees)'} · `
      + framePages.map((f) => f + ' -> [' + clean.frames[f].join(', ') + ']').join(' · '));

const total = pass + fail;
if (ANY) {
  const flag = '--' + Object.keys(F).find((k) => F[k]);
  const expected = CONTROLS[flag].reds;
  const actual = Object.keys(results).filter((k) => !results[k]).sort();
  console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actual.join(',') || '(none)'}`);
}
console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);
process.exit(fail === 0 ? 0 : 1);
