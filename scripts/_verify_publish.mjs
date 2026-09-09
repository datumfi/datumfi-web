/* _verify_publish.mjs — MARKER-GREP A PUBLISHED HTML HOST, AGAINST CODE ONLY.
 *
 * ⛔⛔ WHY THIS EXISTS: §82.2156 — THE STRING YOU VERIFY WITH MUST NOT BE THE STRING YOU EDITED.
 * A marker that appears in BOTH the fix and the prose describing the fix proves nothing in either
 * direction. Measured three times in one day (2026-09-09):
 *   · 'a balanced estimate'          — struck in a comment that QUOTED it, so the "absent" marker
 *                                      was still present. Caught mid-verification.
 *   · 'we will not guess one for you'— the authored copy, quoted again in the comment explaining it.
 *   · "location: 'FL'"               — deleted from the payload, quoted in TWO comments about its
 *                                      deletion, so the "must be absent" marker read 2.
 * 🔑 THE FIRST TIME I NOTICED AND SWITCHED MARKERS. THE SECOND AND THIRD TIMES I DID NOT, WHICH IS
 *    THE ARGUMENT FOR MECHANISING IT: this house style STRIKES defective code in place and explains
 *    every change in prose beside it, so the more carefully a change is documented, THE MORE LIKELY
 *    ITS OWN MARKERS COLLIDE. The discipline cannot be "choose better strings".
 *
 * ⭐ SO IT STRIPS COMMENTS FIRST AND COUNTS ONLY CODE. A marker cannot collide with the prose about
 * itself if the prose is not in the corpus.
 *
 * ⛔ AND IT COMPARES SERVED-CODE COUNTS TO LOCAL-CODE COUNTS RATHER THAN TO NUMBERS I TYPE IN.
 * An expected count typed by hand is a guess that looks like a measurement — which is exactly how
 * the last two "failures" were produced: the publish was correct and my expectation was wrong.
 * THE LOCAL FILE IS THE ORACLE; the question is only whether the edge is serving it.
 *
 * ⚠️ SERVED-HTML MD5 REMAINS UNCHASEABLE and this does not pretend otherwise. Cloudflare rewrites
 * every response (email-obfuscation with a per-request key + bot-management JSD), so the hash
 * changes per request at a constant byte length. Marker-grep over stripped code IS the verification
 * for an HTML host, not a fallback. JS/CSS assets are still verified by served-md5 == local.
 *
 * Usage: node scripts/_verify_publish.mjs <url> <localfile> "marker" ["marker" ...]
 */
import { readFileSync } from 'node:fs';

const [url, local, ...markers] = process.argv.slice(2);
if (!url || !local || !markers.length) {
  console.log('usage: node scripts/_verify_publish.mjs <url> <localfile> "marker" ...');
  process.exit(2);
}

function stripComments(s) {
  let o = '', i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '*') { const e = s.indexOf('*/', i + 2); const stop = e === -1 ? n : e + 2;
      for (let k = i; k < stop; k++) o += (s[k] === '\n' ? '\n' : ' '); i = stop; continue; }
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') { o += ' '; i++; } continue; }
    if (c === '<' && s.substr(i, 4) === '<!--') { const e = s.indexOf('-->', i + 4); const stop = e === -1 ? n : e + 3;
      for (let k = i; k < stop; k++) o += (s[k] === '\n' ? '\n' : ' '); i = stop; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; o += c; i++;
      while (i < n) { if (s[i] === '\\') { o += s[i] + (s[i + 1] || ''); i += 2; continue; }
        o += s[i]; if (s[i] === q) { i++; break; } if (s[i] === '\n' && q !== '`') { i++; break; } i++; }
      continue; }
    o += c; i++;
  }
  return o;
}

const count = (hay, needle) => hay.split(needle).length - 1;

const localCode = stripComments(readFileSync(local, 'utf8'));
const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) { console.log('⛔ FETCH ' + res.status + ' ' + url); process.exit(1); }
const servedCode = stripComments(await res.text());

/* ⛔ THE INSTRUMENT MUST NOT HAVE EATEN THE SUBJECT — a runaway comment blanks the rest of the
   file and every marker then reads 0 on both sides, which would "agree" perfectly. */
const sane = localCode.replace(/\s/g, '').length > 1000 && servedCode.replace(/\s/g, '').length > 1000;

console.log('VERIFY PUBLISH — code only, comments stripped from both sides');
console.log('  url    ' + url);
console.log('  local  ' + local);
console.log('  code bytes: local ' + localCode.replace(/\s/g, '').length
          + '  served ' + servedCode.replace(/\s/g, '').length + (sane ? '' : '   ⛔ ONE SIDE IS EMPTY'));
console.log('');

let bad = 0;
for (const m of markers) {
  const l = count(localCode, m), s = count(servedCode, m);
  const ok = sane && l === s;
  if (!ok) bad++;
  console.log('  ' + (ok ? 'MATCH ' : '⛔ DIFF') + '  local=' + String(l).padEnd(3)
    + ' served=' + String(s).padEnd(3) + '  ' + JSON.stringify(m).slice(0, 78));
}
console.log('\n' + (bad === 0
  ? 'SERVING THE LOCAL FILE — every marker agrees on code, comments excluded.'
  : '⛔ ' + bad + ' marker(s) DISAGREE — the edge is not serving this file (or the marker is in prose on one side).'));
process.exit(bad === 0 ? 0 : 1);
