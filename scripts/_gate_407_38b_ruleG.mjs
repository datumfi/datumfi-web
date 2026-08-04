/* DEV-ONLY red-first gate — #407 Yard §3.5 Rule G "the line" de-jargon (Captain #415).
   Rule G fires when BOTH liens are drawn. Executes the real _yardIntelligence and asserts on the RENDERED Rule G
   beat (#380): it teaches "your home-equity line (a HELOC)" on first mention and carries no bare "the line".
   --redfirst reintroduces the old jargon in the Rule G string -> the no-bare-"the line" assertion fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
function ex(s, n){ const st=s.indexOf('function '+n+'('); if(st<0) throw new Error('missing '+n); let d=0,b=false; for(let j=s.indexOf('{',st);j<s.length;j++){ if(s[j]==='{'){d++;b=true;} else if(s[j]==='}'){d--; if(b&&d===0) return s.slice(st,j+1);} } }
const names=['_num','_groundsLinkedDebt','_yardLiens','_yardMortgage','_yardHeloc','_yardRealMonthly','_yardNetEquity','_yardHouseholdIncome','_yardYearsToRetire','calculateTotalPmt','payoffMonths','_retireInfo','_targetPayment','_payoffYearOf','_yardIntelligence'];
/* RULE_SCOPE is a `var`, not a function, so ex() cannot reach it — and _ruleInScope reads it. Lift the
   declaration VERBATIM rather than restating the table here: a second copy in a gate would be exactly
   the maintained document the constant exists to replace. */
const _scopeLine=(src.match(/var RULE_SCOPE = \{[^}]*\};/)||[])[0];
if(!_scopeLine){ console.error('RULE_SCOPE not found in studio.html — cannot run.'); process.exit(1); }
let body=_scopeLine+'\n'+names.map(n=>ex(src,n)).join('\n');
if(RED) body=body.replace('your mortgage and your home-equity line (a HELOC) move', 'the mortgage and the line move').replace('(usually the home-equity line)', '(usually the line)');
const getBaseType=(baseId)=>{const s=String(baseId); if(s.indexOf('heloc')===0)return{id:'heloc_x',taxCode:'debt',title:'HELOC'}; if(s.indexOf('mortgage')===0)return{id:'mortgage_x',taxCode:'debt',title:'Mortgage'}; return{id:'property_x',taxCode:'physical',title:'Real Estate'};};
const doc={getElementById:()=>({value:'',checked:false})};
const ACCTS=[
  {id:'p',baseId:'property_a',value:500000},
  {id:'m',baseId:'mortgage_a',linkedAssetId:'p',value:200000,intRate:6,minPmt:1500,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2050-01-01'},
  {id:'h',baseId:'heloc_a',linkedAssetId:'p',value:50000,intRate:8,helocPhase:'Repayment',minPmt:600,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2050-01-01'}];
const mk=()=>new Function('getBaseType','document','window','state','_retireOverride','calcCarryTotal', body+'\nreturn _yardIntelligence;')(getBaseType,doc,{parseAgeFromDob:()=>null},{accounts:ACCTS},null,()=>6000);
/* AUTO-RESOLVE — the hand-listed callee list above ROTTED the moment studio.html gained
   _yardRentMonthly (cff1030, Rule F's named-absent rent seam). This gate then died on a ReferenceError
   having asserted NOTHING, and rode three commits inside a red count nobody diffed by name.
   ⚖️ A GATE THAT DIES BEFORE ITS FIRST ASSERTION IS NOT A FAILING GATE, IT IS AN ABSENT GATE (§13.15).
   A hand-listed callee list is a MAINTAINED DOCUMENT, and documents rot. Pull whatever the sandbox
   reports missing, bounded, and PRINT it — a resolver that silently swallowed a name would hide a real
   extraction failure. Same resolver as _gate_407_38_yardruleH.mjs (L48 reuse, do not fork).
   ⚠️ IT MUST INVOKE, NOT MERELY COMPILE. _yardRentMonthly is a RUNTIME reference inside
   _yardIntelligence, so a missing name only surfaces when the function is CALLED. A resolver that
   compiles and stops is the same error, one level up, as the one it was written to fix. */
const _auto=[]; let out=null;
for(let i=0;i<40;i++){
  try{ out=mk()('p'); break; }
  catch(e){ const m=/(\w+) is not defined/.exec(String(e&&e.message)); if(!m) throw e; body+=ex(src,m[1])+'\n'; _auto.push(m[1]); }
}
if(out===null){ console.error('❌ AUTO-RESOLVER EXHAUSTED after 40 passes — last pulled: '+(_auto.join(', ')||'(none)')+'.');
  console.error('   THE GATE ASSERTED NOTHING. THIS IS AN ABSENT GATE, NOT A RED ONE.'); process.exit(1); }
if(_auto.length) console.log('[auto-resolved from studio.html] '+_auto.join(', '));
const ruleG=[...out.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(x=>x[1]).find(t=>t.includes('Two liens ride on this house')) || '';
/* The third slot is the MUTATION TAG: which red-first this assertion is the target of. It is DECLARED
   here, at the assertion, never inferred from the label's prose downstream — a text predicate over
   labels can be satisfied by accident (measured: a throwaway leg named "...nothing to do with jargon"
   matched /jargon/ and certified a masked red). Declare the audience, do not guess it from wording. */
const checks=[]; const need=(l,c,tag)=>checks.push([l,!!c,tag||null]);
need('Rule G beat renders (both liens drawn)', ruleG.includes('Two liens ride on this house'));
need('Rule G teaches "your mortgage and your home-equity line (a HELOC)"', ruleG.includes('your mortgage and your home-equity line (a HELOC) move'), 'dejargon');
need('Rule G "(usually the home-equity line)"', ruleG.includes('(usually the home-equity line)'), 'dejargon');
need('Rule G: NO bare "the line" jargon', !ruleG.includes('the line'), 'dejargon');
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
/* §13.17 — A RED-FIRST PROVES NOTHING UNLESS IT PROVES WHICH ASSERTION FAILED.
   The inversion guard alone (allGreen -> exit 1) catches a mutation that matched nothing ONLY while
   every other leg is green. The moment any unrelated leg reds, allGreen is false and the red-first
   certifies itself on somebody else's failure -- a green wearing a red badge, and the same disguise
   as the three absent gates this suite just recovered. So name the legs the mutation TARGETS and
   require THOSE to be the ones that fell. Same shape as _p5_sketch_picker_parity's /REUSED an id/. */
if(RED){
  const red=checks.filter(([,ok])=>!ok).map(([l])=>l);
  const onTarget=checks.filter(([,ok,tag])=>!ok&&tag==='dejargon').map(([l])=>l);
  if(allGreen){console.error('❌ RED-FIRST FAILED — the de-jargon mutation left every assertion green. Its anchor is dead.'); process.exit(1);}
  if(!onTarget.length){console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a de-jargon assertion.');
    console.error('   The mutation may never have landed; this red belongs to something else.');
    console.error('   red legs: '+red.join(' | ')); process.exit(1);}
  console.log('✅ RED-FIRST OK — bit on '+onTarget.length+' de-jargon assertion(s): '+onTarget.join(' | ')); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
