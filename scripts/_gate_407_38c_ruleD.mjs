/* DEV-ONLY red-first gate — #407 Yard §3.5 Rule D "the line" de-jargon (Captain #417 — missed by G/H pass).
   Rule D fires when a HELOC is drawn or available. Executes the real _yardIntelligence and asserts on the RENDERED
   Rule D beat (#380): teaches "a home-equity line (a HELOC)" on first mention, no bare "A line"/"the same line"/
   "undrawn line". --redfirst reverts the de-jargon -> the old bare-"line" phrases return -> assertions fail. */
import { readFileSync } from 'node:fs';
import { lift } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
/* §13.21 — ONE SHARED EXTRACTOR (see _gate_extract.mjs). Replaces a private copy of ex() that could
   only see `function NAME(`, and with it the hand-written `var RULE_SCOPE` regex this gate used to
   carry. lift() handles both forms; the resolver below pulls RULE_SCOPE on its own. */
const ex = (s, n) => lift(s, n);
const names=['_num','_groundsLinkedDebt','_yardLiens','_yardMortgage','_yardHeloc','_yardRealMonthly','_yardNetEquity','_yardHouseholdIncome','_yardYearsToRetire','calculateTotalPmt','payoffMonths','_retireInfo','_targetPayment','_payoffYearOf','_yardIntelligence'];
let body=names.map(n=>ex(src,n)).join('\n');
if(RED) body=body.replace('A home-equity line (a HELOC) against','A line against').replace('The same home-equity line','The same line').replace('an undrawn home-equity line','an undrawn line');
const getBaseType=(baseId)=>{const s=String(baseId);if(s.indexOf('heloc')===0)return{id:'heloc_x',taxCode:'debt',title:'HELOC'};if(s.indexOf('mortgage')===0)return{id:'mortgage_x',taxCode:'debt',title:'Mortgage'};return{id:'property_x',taxCode:'physical',title:'Real Estate'};};
const ACCTS=[{id:'p',baseId:'property_a',value:500000},{id:'h',baseId:'heloc_a',linkedAssetId:'p',value:20000,intRate:7,helocCreditLimit:50000,helocPhase:'Draw',minPmt:120}];
const mk=()=>new Function('getBaseType','document','window','state','_retireOverride','calcCarryTotal',body+'\nreturn _yardIntelligence;')(getBaseType,{getElementById:()=>({value:'',checked:false})},{parseAgeFromDob:()=>null},{accounts:ACCTS},null,()=>6000);
/* AUTO-RESOLVE — the hand-listed callee list above ROTTED the moment studio.html gained
   _yardRentMonthly (cff1030, Rule F's named-absent rent seam). This gate then died on a ReferenceError
   having asserted NOTHING, and rode three commits inside a red count nobody diffed by name.
   ⚖️ A GATE THAT DIES BEFORE ITS FIRST ASSERTION IS NOT A FAILING GATE, IT IS AN ABSENT GATE (§13.15).
   Same resolver as _gate_407_38_yardruleH.mjs (L48 reuse, do not fork). IT MUST INVOKE, NOT MERELY
   COMPILE — a missing name inside _yardIntelligence only surfaces when the function is CALLED. */
const _auto=[]; let out=null;
for(let i=0;i<40;i++){
  try{ out=mk()('p'); break; }
  catch(e){ const m=/(\w+) is not defined/.exec(String(e&&e.message)); if(!m) throw e; body+=ex(src,m[1])+'\n'; _auto.push(m[1]); }
}
if(out===null){ console.error('❌ AUTO-RESOLVER EXHAUSTED after 40 passes — last pulled: '+(_auto.join(', ')||'(none)')+'.');
  console.error('   THE GATE ASSERTED NOTHING. THIS IS AN ABSENT GATE, NOT A RED ONE.'); process.exit(1); }
if(_auto.length) console.log('[auto-resolved from studio.html] '+_auto.join(', '));
const ruleD=[...out.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(x=>x[1]).find(t=>t.includes('two very different edges'))||'';
/* The third slot is the MUTATION TAG: which red-first this assertion is the target of. It is DECLARED
   here, at the assertion, never inferred from the label's prose downstream — a text predicate over
   labels can be satisfied by accident (measured: a throwaway leg named "...nothing to do with jargon"
   matched /jargon/ and certified a masked red). Declare the audience, do not guess it from wording. */
const checks=[]; const need=(l,c,tag)=>checks.push([l,!!c,tag||null]);
need('Rule D beat renders', ruleD.includes('two very different edges'));
need('teaches "A home-equity line (a HELOC) against"', ruleD.includes('A home-equity line (a HELOC) against'), 'dejargon');
need('"The same home-equity line"', ruleD.includes('The same home-equity line'), 'dejargon');
need('"an undrawn home-equity line"', ruleD.includes('an undrawn home-equity line'), 'dejargon');
need('NO bare "A line against"', !ruleD.includes('A line against'), 'dejargon');
need('NO bare "The same line"', !ruleD.includes('The same line'), 'dejargon');
need('NO bare "undrawn line"', !ruleD.includes('undrawn line') || ruleD.includes('undrawn home-equity line') && !/undrawn line\b/.test(ruleD), 'dejargon');
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
/* §13.17 — A RED-FIRST PROVES NOTHING UNLESS IT PROVES WHICH ASSERTION FAILED.
   The inversion guard alone (allGreen -> exit 1) catches a mutation that matched nothing ONLY while
   every other leg is green. The moment any unrelated leg reds, allGreen is false and the red-first
   certifies itself on somebody else's failure -- a green wearing a red badge. So name the legs the
   mutation TARGETS and require THOSE to be the ones that fell. Same shape as
   _p5_sketch_picker_parity's /REUSED an id/. The one non-targeted leg here is "Rule D beat renders". */
if(RED){
  const red=checks.filter(([,ok])=>!ok).map(([l])=>l);
  const onTarget=checks.filter(([,ok,tag])=>!ok&&tag==='dejargon').map(([l])=>l);
  if(allGreen){console.error('❌ RED-FIRST FAILED — the de-jargon mutation left every assertion green. Its anchor is dead.'); process.exit(1);}
  if(!onTarget.length){console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a de-jargon assertion.');
    console.error('   The mutation may never have landed; this red belongs to something else.');
    console.error('   red legs: '+red.join(' | ')); process.exit(1);}
  console.log('✅ RED-FIRST OK — bit on '+onTarget.length+' de-jargon assertion(s): '+onTarget.join(' | ')); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
