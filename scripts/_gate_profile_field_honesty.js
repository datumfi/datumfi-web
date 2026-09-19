/* _gate_profile_field_honesty.js — THE CAPTAIN'S OWN DISCIPLINE, ENFORCED.
 *
 * ⛔⛔ WHY THIS EXISTS, IN HIS WORDS (2026-09-19):
 *    "we went through EACH FIELD inch by inch. They ALL had a sub heading that still exists for
 *     Location 'recorded not modeled' that was supposed to be removed once they were fully
 *     modelled. That was my plan. So if you note, in joint, plan through and retire for Co Arch do
 *     NOT have that statement which means, former you and Arch told me it was fully [modelled].
 *     And yet ... NOPE, it should have had that recorded not modeled all along."
 *
 * HE IS RIGHT, AND THE MEASURED TRUTH IS WORSE THAN HIS READING OF IT. He assumed the label had
 * been REMOVED from #co-ret and #co-plan-end. It never existed on them — checked across every
 * commit that has ever touched `architect-nm-note`, all six, and the count is zero in all six.
 *   🔑 A REMOVAL IS A DECISION SOMEBODY MADE AND CAN BE AUDITED. AN OMISSION IS NOTHING AT ALL —
 *      no commit, no author, no moment. The two co-architect date fields arrived and the discipline
 *      simply did not follow them.
 *   ⛔⛔ AND THAT IS THE STRUCTURAL DEFECT, NOT THE TWO FIELDS: **THE ABSENCE OF A WARNING LABEL IS
 *      THE DEFAULT STATE**, so the discipline FAILS OPEN. Every field added after the convention was
 *      invented is born silently claiming to be finished. This gate inverts that: a field it does
 *      not recognise FAILS, so a new field is born claiming nothing until somebody says otherwise.
 *
 * ⚠️ THE OTHER TWO HISTORIES, BECAUSE "IT WAS REMOVED" IS TRUE OF THEM AND THE SHAPE IS DIFFERENT:
 *    #pri-salary and #co-salary DID carry the note. It came off in 955a49e (2026-09-05 12:32) and
 *    was replaced, in the same commit, by a section-level note — "We record these for your plan's
 *    history and for features still being drawn." That replacement is DEFENSIBLE. Eleven hours
 *    later, 836eb0b (2026-09-05 23:49) removed the section note as part of a tax-block cleanup,
 *    and nobody noticed it was carrying the salary disclosure.
 *      🔑 A DISCLOSURE THAT MOVES BECOMES A DISCLOSURE THAT CAN BE SWEPT. The per-field note was
 *         attached to the thing it described; the section note was attached to a section, and
 *         sections get reorganised. NEITHER STEP WAS WRONG ON ITS OWN. The erosion is the product
 *         of two reasonable commits eleven hours apart.
 *
 * ── WHAT THIS GATE ASSERTS ────────────────────────────────────────────────────────────────────
 * For every id'd, user-editable field in the Architect Profile:
 *      THE PRODUCT DEMANDS IT   (a refusal fires on that control in a real walk from an empty
 *                                Studio — so it is asked for, carried and consumed)
 *   OR IT SAYS SO ON SCREEN     (a disclosure note inside its own field container)
 *   OR IT IS EXEMPT, BY NAME, WITH A WRITTEN REASON, IN THIS FILE.
 *
 * ⛔ THE DEMANDED SET IS NOT A LIST. It is read from `datum-payload-observed.json`, written by
 *    _gate_payload_accounted's walk, which answers the product's own refusals from an EMPTY Studio
 *    and records the control id each one targeted. A field only counts as demanded because the
 *    PRODUCT refused on it — never because a map here names it. §82.2694 the other way up.
 * ⛔ THE FIELD POPULATION IS NOT A LIST EITHER. It is every id'd input/select inside the Architect
 *    Profile section, read out of the live DOM. That is what makes a newly added field appear here
 *    without anybody remembering to add it.
 *
 * ⚠️ THE EXEMPTIONS ARE A NOMINATED LIST AND THAT IS A REAL WEAKNESS, DECLARED RATHER THAN HIDDEN.
 *    It is the smallest nominated surface I could find: a name is not a model input and no one
 *    expects it to move a Range. Every entry carries its reason, so the exemption is auditable in
 *    a way "no label" never was. ⛔ ADDING A FIELD HERE IS A RULING AND MUST BE TREATED AS ONE.
 *
 * ⚠️ WHAT IT DOES NOT PROVE: that a demanded field is modelled CORRECTLY, or that its value moves
 *    the answer by the right amount. Demanded means the door refuses without it. The engine harness
 *    owns whether the number is right. NAMED SO THIS GATE IS NOT READ AS MORE THAN IT IS.
 *
 * Run: node scripts/_gate_profile_field_honesty.js   (exit 0 = GREEN)
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8261;
const OBSERVED = path.join(os.tmpdir(), 'datum-payload-observed.json');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

/* ⛔ EXEMPT, BY NAME, WITH A REASON. Read the warning above before adding to this. */
const EXEMPT = {
  'primary-name': 'A NAME IS NOT A MODEL INPUT. It is stored and displayed, nothing derives from '
    + 'it, and no household expects their name to move a Range. Exempt on the substance, not on '
    + 'convenience.',
  'co-name': 'Same as primary-name — the co-architect\'s name is a label on their column.',
  'co-arch-toggle': 'NOT A VALUE, A CONFIGURATION SWITCH. It decides whether a second person '
    + 'exists at all; every field it reveals is measured on its own row below.'
};

let pass = 0, fail = 0; const lines = [];
function check(id, msg, cond, observed) {
  if (cond) { pass++; lines.push('  PASS  ' + id + ' · ' + msg + (observed ? '\n          ' + observed : '')); }
  else { fail++; lines.push('  FAIL  ' + id + ' · ' + msg + (observed ? '\n          ' + observed : '')); }
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

(async () => {
  /* ── L0 · THE DEMANDED SET MUST COME FROM A REAL WALK, AND IT MUST BE FRESH ─────────────────
     ⛔ A STALE OBSERVATION IS INDISTINGUISHABLE FROM A FRESH ONE IN THE OUTPUT, so it is REFUSED
        rather than warned about. This gate would otherwise report yesterday's demanded set against
        today's markup and call the disagreement a defect. Same rule the engine-surface census
        already enforces on the same file. */
  let obs = null, obsAgeMin = Infinity;
  try {
    obs = JSON.parse(fs.readFileSync(OBSERVED, 'utf8'));
    obsAgeMin = Math.round((Date.now() - fs.statSync(OBSERVED).mtimeMs) / 60000);
  } catch (e) { obs = null; }
  const demanded = new Set(((obs && obs.dual && obs.dual.asked) || []));
  check('L0', 'INSTRUMENT: a FRESH refusal walk supplies the demanded set',
        !!obs && demanded.size > 0 && obsAgeMin <= 60,
        obs ? `${demanded.size} control(s) demanded, observation ${obsAgeMin} min old`
            : 'NO OBSERVATION — run scripts/_gate_payload_accounted.js first. Every row below would '
              + 'read "not demanded" because nobody walked, not because nothing is demanded.');
  if (!demanded.size || obsAgeMin > 60) {
    lines.forEach((l) => console.log(l));
    console.log(`\nRED — cannot run (${pass} pass / ${fail} fail)`);
    process.exit(1);
  }

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon|sentry/i.test(u)) return r.abort();
    return r.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* THE POPULATION, READ OFF THE LIVE DOM. Reveal the co-architect column first: a field that is
     display:none is still a field the product collects, and measuring only what happens to be
     visible on a cold page is how the second person went unmeasured everywhere else. */
  const fields = await page.evaluate(() => {
    const tog = document.getElementById('co-arch-toggle');
    if (tog && !tog.checked) { tog.checked = true; tog.dispatchEvent(new Event('change')); }
    /* ⛔⛔ THE POPULATION IS `.architect-field`, NOT THE WHOLE SECTION, AND THE FIRST VERSION OF
       THIS GATE GOT IT WRONG IN THE EXPENSIVE DIRECTION. Scoped to #sec-architect it swept in the
       Shape sliders, the D2 panel's mirrors, the market tiles and the FEEDBACK SURVEY radio
       buttons, and reported 46 SILENT FIELDS. That number is not a finding, it is an instrument
       with a bad denominator producing a frightening figure that means nothing — the same defect
       this gate exists to catch, pointed at the Captain instead of at the product.
       🔑 AN INFLATED POPULATION IS WORSE THAN NO INSTRUMENT: it spends the one thing that is
          actually scarce here, which is trust in the number. §82.2760 — a denominator is part of
          the result.
       ⭐ `.architect-field` is the Profile's own container class, so this is still DERIVED from the
          markup rather than from a list, and a new Profile field lands in it automatically. */
    const out = [];
    document.querySelectorAll('.architect-field').forEach((box) => {
      const el = box.querySelector('input[id], select[id]');
      if (!el || el.type === 'hidden') return;
      if (/-warn$|-tt$/.test(el.id)) return;              // warning hosts and tooltips are not fields
      const note = box.querySelector('.architect-nm-note, .architect-span-note, .architect-section-note');
      const lab = box.querySelector('label');
      out.push({
        id: el.id,
        label: lab ? (lab.textContent || '').trim() : '',
        hasNote: !!note,
        noteText: note ? (note.textContent || '').trim().slice(0, 60) : ''
      });
    });
    return out;
  });

  check('L1', 'INSTRUMENT: the profile population was read from the DOM and is not empty',
        fields.length >= 8, `${fields.length} id'd field(s) found in the Architect Profile`);

  /* ── L2 · THE RULE, ONE ROW PER FIELD ──────────────────────────────────────────────────────── */
  const offenders = [];
  for (const f of fields) {
    const isDemanded = demanded.has(f.id);
    const isExempt = Object.prototype.hasOwnProperty.call(EXEMPT, f.id);
    const ok = isDemanded || f.hasNote || isExempt;
    const how = isDemanded ? 'DEMANDED' : f.hasNote ? 'LABELLED' : isExempt ? 'EXEMPT' : '⛔ SILENT';
    if (!ok) offenders.push(f);
    lines.push('          ' + (ok ? '·' : '⛔') + ' ' + (f.id + '                    ').slice(0, 20)
      + (how + '        ').slice(0, 10) + (f.label || '(no label)'));
  }
  check('L2', 'EVERY COLLECTED PROFILE FIELD IS DEMANDED, LABELLED, OR EXEMPT BY NAME',
        offenders.length === 0,
        offenders.length
          ? `${offenders.length} SILENT: ${offenders.map((o) => o.id).join(', ')}\n`
            + '          ⛔ A field the product collects, never demands, and does not label is a field '
            + 'the household believes is working.\n'
            + '          ⛔ THE FIX IS A DOOR OR A LABEL, NEVER A DELETION — removing the field removes '
            + 'the evidence and keeps the default.'
          : 'every field accounts for itself');

  /* ── L3 · THE LABEL MUST NOT OUTLIVE THE GAP EITHER ────────────────────────────────────────── */
  const staleLabels = fields.filter((f) => f.hasNote && demanded.has(f.id));
  check('L3', 'NO FIELD IS BOTH DEMANDED AND LABELLED "not yet modelled"',
        staleLabels.length === 0,
        staleLabels.length
          ? `${staleLabels.length} contradict themselves: ${staleLabels.map((f) => f.id).join(', ')}\n`
            + '          ⚠️ A LABEL THAT OUTLIVES ITS GAP TEACHES THE HOUSEHOLD TO IGNORE LABELS, which '
            + 'costs more than the one it is wrong about.\n'
            + '          ⚠️ RETIREMENT LOCATION IS THE CASE TO THINK ABOUT: it IS demanded and it answers '
            + 'in 41 of 51 jurisdictions, so "not yet modelled" is wrong and "modelled" is too. '
            + 'THAT IS A COPY RULING, NOT A CODE FIX.'
          : 'no label sits on a field the product demands');

  await browser.close(); server.close();
  lines.forEach((l) => console.log(l));
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_x) {} process.exit(2); });
