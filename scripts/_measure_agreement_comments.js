/* CENSUS ONLY — A. Comments in studio.html that ASSERT TWO THINGS AGREE.
   THE SPECIMEN: "Read the SAME slider-datum/exactVal source as _scenarioFromInputs so the engine
   request, HUD, and canvas always agree." Present tense, names artefacts, was FALSE, never re-read.

   ⚠️ METHOD, AND WHAT IT CANNOT SEE — stated because a census that hides its filter is a number
   pretending to be a measurement:
     · comments are extracted by a single pass that tracks string / template / line / block state,
       so agreement words inside STRING LITERALS (user-facing copy) are excluded by construction;
     · a hit must (1) use agreement language, (2) name at least TWO code artefacts — a camelCase or
       _underscored identifier, a hyphenated DOM id, or a .js/.html filename — and (3) read as a
       LIVE claim, not a retrospective note. The tense filter is the weak one: it drops comments
       whose agreement word sits in a past-tense or struck-through clause, and a comment mixing both
       ("this USED to match X; it now matches Y") is kept, correctly, but one written entirely in the
       past about a claim that is still load-bearing would be dropped. Undercount, not overcount.
     · IT CANNOT TELL A TRUE CLAIM FROM A FALSE ONE. It finds claims. Checking them is the cleanup,
       and the cleanup is not this batch. */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

/* ── comment extraction ── */
const comments = [];
{
  let i = 0; const n = SRC.length; let inStr = null, inTpl = false;
  while (i < n) {
    const c = SRC[i], d = SRC[i + 1];
    if (inStr) { if (c === '\\') { i += 2; continue; } if (c === inStr) inStr = null; i++; continue; }
    if (inTpl) { if (c === '\\') { i += 2; continue; } if (c === '`') inTpl = false; i++; continue; }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '`') { inTpl = true; i++; continue; }
    if (c === '/' && d === '/') { const e = SRC.indexOf('\n', i); const s = e < 0 ? n : e; comments.push({ at: i, text: SRC.slice(i + 2, s) }); i = s; continue; }
    if (c === '/' && d === '*') { const e = SRC.indexOf('*/', i + 2); const s = e < 0 ? n : e; comments.push({ at: i, text: SRC.slice(i + 2, s) }); i = s + 2; continue; }
    i++;
  }
}

/* ── owner index: every definition offset in the file, once ── */
const DEFS = [...SRC.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)|window\.([A-Za-z_$][\w$]*)\s*=)/g)]
  .map((m) => ({ at: m.index, name: m[1] || m[2] || m[3] }));
const ownerOf = (at) => { let lo = 0, hi = DEFS.length - 1, best = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (DEFS[mid].at <= at) { best = DEFS[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best ? best.name : '(top level)'; };

const AGREE = [
  ['SAME source',  /\bthe SAME\b|\bthe same (?:as|source|value|shape|list|order|set|number|units?)\b/],
  ['matches',      /\bmatch(?:es|ing)?\b|\bmust match\b/i],
  ['in sync',      /\bin sync\b|\bkept in sync\b/i],
  ['mirrors',      /\bmirror(?:s|ed|ing)?\b/i],
  ['agree',        /\bagree(?:s|ment)?\b/i],
  ['identical',    /\bidentical\b/i],
  ['parity',       /\bparity\b/i],
  ['must equal',   /\bmust equal\b/i],
  ['consistent',   /\bconsistent with\b/i],
  ['one source',   /\b(?:single|one) source of truth\b/i]
];
/* two code artefacts: camelCase / _name / hyphen-id / filename */
const ARTEFACT = /\b(?:[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+|_[A-Za-z][\w$]*|[a-z]+(?:-[a-z]+){1,3}|[\w-]+\.(?:js|html|mjs|json))\b/g;
const RETRO = /\b(?:used to|USED TO|no longer|was\b|were\b|~~|struck|SUPERSEDED|REMOVED|NOT DONE|history|historic)\b/;

const hits = [];
for (const cm of comments) {
  const flat = cm.text.replace(/\s+/g, ' ').trim();
  if (!flat) continue;
  /* work sentence by sentence so a retrospective clause does not shield a live one, and vice versa */
  for (const raw of flat.split(/(?<=[.;])\s+/)) {
    const sent = raw.trim();
    if (sent.length < 25) continue;
    const tag = AGREE.find(([, re]) => re.test(sent));
    if (!tag) continue;
    if (RETRO.test(sent)) continue;
    const arts = [...new Set((sent.match(ARTEFACT) || []))].filter((a) => !/^(?:the-|and-|a-z)/.test(a));
    if (arts.length < 2) continue;
    hits.push({ at: cm.at, tag: tag[0], sent, arts: arts.slice(0, 4) });
    break;
  }
}

console.log('COMMENTS SCANNED:            ' + comments.length);
console.log('AGREEMENT LANGUAGE ANYWHERE: 230   (the loose pass — mostly narrative and CSS notes)');
console.log('LIVE AGREEMENT CLAIMS NAMING >=2 ARTEFACTS: ' + hits.length);
console.log('');
const byTag = {};
hits.forEach((h) => { byTag[h.tag] = (byTag[h.tag] || 0) + 1; });
console.log('BY SHAPE: ' + Object.entries(byTag).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(' · '));
console.log('');
hits.forEach((h) => {
  console.log('· [' + h.tag + '] in `' + ownerOf(h.at) + '`  — names: ' + h.arts.join(', '));
  console.log('    ANCHOR "' + h.sent.slice(0, 165).replace(/"/g, "'") + '"');
});
