/* DEV-ONLY. Dump a named sheet from an xlsx as TSV-ish rows. Reuses _spdr_parse readXlsx.
 *
 * ⛔⛔ IT REFUSES A STALE WORKBOOK. Added 2026-09-09 after I read the Datumae/ subfolder copy and
 * reported the Architect's State Tax Tiers sheet MISSING when it was present and complete in the
 * live file. My own memory says "resolve the live workbook by LastWriteTime, NEVER by the name
 * written here" — and a note I have to remember is not a control.
 * 🔑 A STALE COPY OF A SHARED ARTEFACT IS A SECOND SOURCE OF TRUTH, and the failure is SILENT in
 *    the worst way: the stale file PARSES CLEANLY and contains a correct-looking bank. Nothing is
 *    broken. It is a VALID ARTEFACT FROM THE WRONG SOURCE, which is exactly the shape this tool is
 *    used to investigate.
 * ⚠️ THE SAME REASONING AS THE tier-governs-rate ASSERTION IN THE STATE-TAX IMPORTER: where a rule
 *    can be mechanised it must be, or it decorates the mistake it forbids.
 * ⛔ IT WARNS AND CONTINUES RATHER THAN EXITING, DELIBERATELY: reading an OLD workbook on purpose
 *    (archaeology, a diff against a superseded bank) is legitimate. What is not legitimate is doing
 *    it BY ACCIDENT. Pass --any-workbook to silence it when the staleness is the point.
 */
import {readXlsx} from './_spdr_parse.mjs';
import {readdirSync, statSync} from 'node:fs';
import {dirname, basename, join, resolve} from 'node:path';
const FP = process.argv[2];
const WANT = (process.argv[3]||'').toLowerCase();

/* ── the freshness assertion ────────────────────────────────────────────────────────────────── */
if (FP && !process.argv.includes('--any-workbook')) {
  try {
    const HOME = process.env.USERPROFILE || process.env.HOME || '';
    const roots = [join(HOME, 'OneDrive'), dirname(resolve(FP))];
    let newest = null;
    for (const root of roots) {
      let names = [];
      try { names = readdirSync(root); } catch { continue; }
      for (const n of names) {
        if (!/\.xls[mx]$/i.test(n) || n.startsWith('~$')) continue;
        const full = join(root, n);
        let st; try { st = statSync(full); } catch { continue; }
        if (!newest || st.mtimeMs > newest.mtimeMs) newest = {full, mtimeMs: st.mtimeMs, name: n};
      }
    }
    const mine = statSync(resolve(FP));
    if (newest && resolve(newest.full).toLowerCase() !== resolve(FP).toLowerCase()
        && newest.mtimeMs > mine.mtimeMs) {
      const ageH = ((newest.mtimeMs - mine.mtimeMs) / 3600000).toFixed(1);
      console.log('⛔ STALE WORKBOOK — you are reading a copy that is ' + ageH + 'h OLDER than the newest one.');
      console.log('   reading : ' + basename(FP) + '   (' + new Date(mine.mtimeMs).toISOString() + ')');
      console.log('   NEWEST  : ' + newest.full + '   (' + new Date(newest.mtimeMs).toISOString() + ')');
      console.log('   ⚠️ A STALE COPY PARSES CLEANLY AND LOOKS CORRECT. Resolve by LastWriteTime, never by name.');
      console.log('   (pass --any-workbook if reading the older file is deliberate)\n');
    }
  } catch { /* the assertion must never be the reason the tool fails */ }
}

const f = readXlsx(FP);
const dec = s => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#10;/g,'\n').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const ss = f['xl/sharedStrings.xml'] ? f['xl/sharedStrings.xml'].toString('utf8') : '';
const strings = [...ss.matchAll(/<si>(.*?)<\/si>/gs)].map(m=>dec([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>x[1]).join('')));
// workbook sheet name -> rId
const wb = f['xl/workbook.xml'].toString('utf8');
const sheets = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="(rId\d+)"[^>]*\/?>/g)].map(m=>({name:dec(m[1]), rid:m[2]}));
const rels = f['xl/_rels/workbook.xml.rels'].toString('utf8');
const relMap = {};
for (const m of rels.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]*)"[^>]*\/?>/g)) relMap[m[1]] = m[2];
if (!WANT || WANT==='--list') { console.log(sheets.map(s=>s.name).join('\n')); process.exit(0); }
const sheet = sheets.find(s=>s.name.toLowerCase().includes(WANT));
if (!sheet) { console.log('NO SHEET MATCH for', WANT, '\navailable:\n', sheets.map(s=>s.name).join('\n')); process.exit(1); }
let target = relMap[sheet.rid];
if (!target.startsWith('xl/')) target = 'xl/' + target.replace(/^\//,'');
const xml = f[target].toString('utf8');
function colNum(r){let n=0;for(const ch of r.replace(/\d+/g,'')) n=n*26+(ch.charCodeAt(0)-64);return n;}
const rows = [...xml.matchAll(/<row[^>]*>(?:(?!<\/row>).)*<\/row>|<row[^>]*\/>/gs)].map(m=>m[0]);
console.log('=== SHEET:', sheet.name, '===');
for (const rx of rows){
  const o={}; let max=0;
  for (const c of rx.matchAll(/<c r="([A-Z]+)(\d+)"(?:[^>]*t="([^"]*)")?[^>]*?>(?:<v>(.*?)<\/v>|<is>(.*?)<\/is>)?/gs)){
    let val=null;
    if (c[4]!=null) val = c[3]==='s'?strings[+c[4]]:dec(c[4]);
    else if (c[5]!=null) val = dec([...c[5].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>x[1]).join(''));
    if (val==null) continue;
    const cn=colNum(c[1]); o[cn]=val; if(cn>max)max=cn;
  }
  if (max===0) continue;
  const line=[]; for(let i=1;i<=max;i++) line.push((o[i]||'').replace(/\n/g,' ⏎ '));
  const rowNum = rx.match(/<row[^>]*r="(\d+)"/);
  console.log('R'+(rowNum?rowNum[1]:'?')+'\t'+line.join('\t│\t'));
}
