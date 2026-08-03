/* CALENDAR SWEEP 2026-08-03 — EXPIRY ~2040. The 2040/2055 horizon dates here are long-dated
   fixture inputs, left as literals deliberately; re-date or make relative as 2040 approaches.
   A GATE MUST PRODUCE THE SAME VERDICT ON EVERY DAY OF THE YEAR. Correct shapes to copy:
   _p8_studio_mechanics.js:280 (age derived with the month rule), _gate_heloc_variable_18a.mjs:49
   (dates relative to now). */
/* DEV-ONLY red-first gate — #407 §19.10/§19.11 Mortgage retire-before-you-do horizon states.
   Executes the real _moatDI (retirement injected via _retireOverride) and asserts the RENDERED beat (#380):
     🟢 payoff ≤ retire            -> "before you retire"
     🟡 retire < payoff ≤ retire+30 -> names the year + "N years into retirement" + {targetPayment}
     🟠 payoff > retire+30          -> "generations to clear" + {targetPayment}, NO absurd year named
     🔴 neg-am                      -> §19.9 echo (di-negam), no §19.10 horizon beat
   --redfirst lifts the +30 clamp so the 🟠 case names the absurd year again -> the clamp assertions fail. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
const deps={acceleratedDelta:()=>null,hasEscrow:()=>false,calculateEscrowMonthly:()=>0,_moatPmiUnder20:()=>false,_moatLiveMktRate:()=>null,getBaseType:()=>({id:'mortgage_x',title:'Mortgage'}),state:{accounts:[]},_retireOverride:{retireYear:2035,retireDate:new Date(2035,2,1),currentAge:52}};
// (B) — ROOT ONLY, closure walked from studio.html. Exclude exactly what this gate INJECTS, so the real
// declarations can't shadow the stubs; everything else stays real (the payoff engine is asserted here).
let body=extractClosure(src,['_moatDI'],{exclude:Object.keys(deps)});
if(RED) body=body.replace('months > _SANE_PAYOFF_HORIZON_MONTHS','months > 9e99');   // lift the glacial guard → 🟠 case names the absurd year again
const {_moatDI}=new Function(...Object.keys(deps),body+'\nreturn {_moatDI};')(...Object.values(deps));
const di=(acc)=>_moatDI(acc).replace(/<[^>]+>/g,'');
const green=di({baseId:'mortgage_a',origAmount:200000,value:40000,intRate:4,minPmt:1200,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2040-01-01'});
const yellow=di({baseId:'mortgage_a',origAmount:200000,value:150000,intRate:5.99,minPmt:950,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2055-01-01'});
const orange=di({baseId:'mortgage_a',origAmount:200000,value:150000,intRate:0.01,minPmt:25,addPmt:20,nextPmtDate:'2026-08-01',maturityDate:'2600-01-01'});
const red=di({baseId:'mortgage_a',origAmount:200000,value:150000,intRate:5.99,minPmt:100,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2055-01-01'});
const gray=di({baseId:'mortgage_a',origAmount:200000,value:150000,intRate:6,minPmt:800,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2033-01-01'});   // ~2072: long but under the 50yr horizon → nameable, NOT glacial
const checks=[]; const need=(l,c)=>checks.push([l,!!c]);
need('🟢 on-track: "before you retire"', green.includes('before you retire') && !green.includes('into retirement'));
need('🟡 names the year + years-past + target', yellow.includes("isn't gone until 2052") && yellow.includes('17 years into retirement') && yellow.includes('would clear it by 2035'));
need('🟠 "generations to clear" + target, NO absurd year', orange.includes('would take generations to clear') && orange.includes('would clear it by 2035') && !orange.includes("isn't gone until") && !orange.includes('mortgage-free around') && !orange.includes('pulls your payoff in by'));
need('🔴 neg-am echo, no §19.10 horizon beat', red.includes('stops the bleed') && !red.includes('generations') && !red.includes('would clear it by') && !red.includes('before you retire'));
need('consistency: a long-but-under-50yr loan names the year on BOTH §19.10 and §1.3, never "generations"', gray.includes("isn't gone until") && gray.includes('mortgage-free around') && !gray.includes('generations'));
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
if(RED){ if(allGreen){console.error('❌ RED-FIRST FAILED'); process.exit(1);} console.log('✅ RED-FIRST OK'); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
