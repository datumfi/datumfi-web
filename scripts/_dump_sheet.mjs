/* DEV-ONLY. Dump a named sheet from an xlsx as TSV-ish rows. Reuses _spdr_parse readXlsx. */
import {readXlsx} from './_spdr_parse.mjs';
const FP = process.argv[2];
const WANT = (process.argv[3]||'').toLowerCase();
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
