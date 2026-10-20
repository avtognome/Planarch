import {plain,type CompendiumRecord} from './compendiumData';
import type {Combatant,Encounter,Ruleset} from './models';

export const difficulties:Record<Ruleset,string[]>={
 '2014':['Easy','Medium','Hard','Deadly'],
 '2024':['Low','Moderate','High']
};

const thresholds2014={
 Easy:[25,50,75,125,250,300,350,450,550,600,800,1000,1100,1250,1400,1600,2000,2100,2400,2800],
 Medium:[50,100,150,250,500,600,750,900,1100,1200,1600,2000,2200,2500,2800,3200,3900,4200,4900,5700],
 Hard:[75,150,225,375,750,900,1100,1400,1600,1900,2400,3000,3400,3800,4300,4800,5900,6300,7300,8500],
 Deadly:[100,200,400,500,1100,1400,1700,2100,2400,2800,3600,4500,5100,5700,6400,7200,8800,9500,10900,12700]
} as const;

const budgets2024={
 Low:[50,100,150,250,500,600,750,1000,1300,1600,1900,2200,2600,2900,3300,3800,4500,5000,5500,6400],
 Moderate:[75,150,225,375,750,1000,1300,1700,2000,2300,2900,3700,4200,4900,5400,6100,7200,8700,10700,13200],
 High:[100,200,400,500,1100,1400,1700,2100,2600,3100,4100,4700,5400,6200,7800,9800,11700,14200,17200,22000]
} as const;

const xpByCr:Record<string,number>={'0':10,'1/8':25,'1/4':50,'1/2':100,'1':200,'2':450,'3':700,'4':1100,'5':1800,'6':2300,'7':2900,'8':3900,'9':5000,'10':5900,'11':7200,'12':8400,'13':10000,'14':11500,'15':13000,'16':15000,'17':18000,'18':20000,'19':22000,'20':25000,'21':33000,'22':41000,'23':50000,'24':62000,'25':75000,'26':90000,'27':105000,'28':120000,'29':135000,'30':155000};

export function normalizeCr(value:string){return value.trim().replace(/^cr\s*/i,'').split(/\s|\(/)[0]}
export function crToXP(value:string){return xpByCr[normalizeCr(value)]??0}
export function monsterXP(monster:Combatant){return Number(monster.xp)||crToXP(monster.cr||'')}

function multiplier2014(count:number,partySize:number){
 const steps=[.5,1,1.5,2,2.5,3,4,5];
 let index=count<=1?1:count===2?2:count<=6?3:count<=10?4:count<=14?5:6;
 if(partySize<3)index=Math.min(steps.length-1,index+1);
 else if(partySize>=6)index=Math.max(0,index-1);
 return steps[index];
}

export type BalanceResult={ruleset:Ruleset,totalXP:number,adjustedXP:number,monsterCount:number,unrated:number,rating:string,budgets:Record<string,number>,targetLow:number,targetHigh:number,targetLabel:string,multiplier:number};

export function encounterBudgets(ruleset:Ruleset,level:number,size:number){
 const index=Math.max(0,Math.min(19,Math.round(level)-1)),party=Math.max(1,Math.round(size));
 const source=ruleset==='2024'?budgets2024:thresholds2014;
 return Object.fromEntries(Object.entries(source).map(([name,values])=>[name,values[index]*party]));
}

export function targetBand(ruleset:Ruleset,difficulty:string,level:number,size:number){
 const budgets=encounterBudgets(ruleset,level,size),names=difficulties[ruleset],index=Math.max(0,names.indexOf(difficulty));
 if(ruleset==='2024')return {low:index===0?1:(budgets[names[index-1]]||0)+1,high:budgets[names[index]]||budgets.Moderate,label:names[index]};
 const low=budgets[names[index]]||budgets.Medium,high=index===names.length-1?Math.round(low*1.25):(budgets[names[index+1]]||low)-1;
 return {low,high,label:names[index]};
}

export function evaluateEncounter(encounter:Pick<Encounter,'ruleset'|'difficulty'|'partyLevel'|'partySize'|'members'>):BalanceResult{
 const ruleset=encounter.ruleset||'2014',monsters=encounter.members.filter(member=>member.role==='Monster');
 const rated=monsters.map(monsterXP).filter(Boolean),totalXP=rated.reduce((sum,xp)=>sum+xp,0);
 const multiplier=ruleset==='2014'?multiplier2014(rated.length,encounter.partySize):1,adjustedXP=Math.round(totalXP*multiplier),budgets=encounterBudgets(ruleset,encounter.partyLevel,encounter.partySize);
 let rating='Trivial';
 if(ruleset==='2014'){
  for(const name of difficulties['2014'])if(adjustedXP>=budgets[name])rating=name;
 }else if(adjustedXP>budgets.High)rating='Beyond high';
 else if(adjustedXP>budgets.Moderate)rating='High';
 else if(adjustedXP>budgets.Low)rating='Moderate';
 else if(adjustedXP>0)rating='Low';
 const target=targetBand(ruleset,encounter.difficulty,encounter.partyLevel,encounter.partySize);
 return {ruleset,totalXP,adjustedXP,monsterCount:monsters.length,unrated:monsters.length-rated.length,rating,budgets,targetLow:target.low,targetHigh:target.high,targetLabel:target.label,multiplier};
}

export function recordXP(record:CompendiumRecord){return crToXP(plain(record.fields.cr))}
function environmentMatches(record:CompendiumRecord,environment:string){
 const wanted=environment.trim().toLowerCase();if(!wanted)return true;
 const habitat=plain(record.fields.environment||record.fields.habitat).toLowerCase();
 if(!habitat)return false;if(/\bany\b/.test(habitat))return true;
 return wanted.split(/[,/&]+/).map(value=>value.trim()).filter(Boolean).some(value=>habitat.includes(value));
}

export function randomizeMonsterRecords(records:CompendiumRecord[],options:{ruleset:Ruleset,difficulty:string,partyLevel:number,partySize:number,environment:string,rng?:()=>number}){
 const rng=options.rng||Math.random,available=records.filter(record=>record.kind==='monster'&&recordXP(record)>0&&environmentMatches(record,options.environment));
 if(!available.length)throw Error(options.environment.trim()?`No rated monsters match “${options.environment.trim()}”. Try a broader environment.`:'No monsters with a valid CR are available in the compendium.');
 const band=targetBand(options.ruleset,options.difficulty,options.partyLevel,options.partySize),maxBase=options.ruleset==='2014'?band.high*2:band.high;
 const pool=available.filter(record=>recordXP(record)<=maxBase);
 if(!pool.length)throw Error('No compendium monster fits this party and difficulty budget.');
 let best:CompendiumRecord[]=[];let bestScore=Number.POSITIVE_INFINITY;
 const score=(chosen:CompendiumRecord[])=>{
  const total=chosen.reduce((sum,record)=>sum+recordXP(record),0);
  const adjusted=Math.round(total*(options.ruleset==='2014'?multiplier2014(chosen.length,options.partySize):1));
  const center=(band.low+band.high)/2,rangePenalty=adjusted<band.low?(band.low-adjusted)*4:adjusted>band.high?(adjusted-band.high)*8:0;
  return rangePenalty+Math.abs(center-adjusted);
 };
 for(let attempt=0;attempt<900;attempt++){
  const chosen:CompendiumRecord[]=[];
  for(let count=0;count<12;count++){
   const next=pool[Math.floor(rng()*pool.length)];chosen.push(next);
   const current=score(chosen);if(current<bestScore){best=[...chosen];bestScore=current}
   const total=chosen.reduce((sum,record)=>sum+recordXP(record),0),adjusted=Math.round(total*(options.ruleset==='2014'?multiplier2014(chosen.length,options.partySize):1));
   if(adjusted>=band.low&&(adjusted>=band.high*.88||rng()<.38))break;
   if(adjusted>band.high)break;
  }
 }
 const bestBase=best.reduce((sum,record)=>sum+recordXP(record),0),bestAdjusted=Math.round(bestBase*(options.ruleset==='2014'?multiplier2014(best.length,options.partySize):1));
 if(!best.length||bestAdjusted<band.low||bestAdjusted>band.high)throw Error('No monster combination matches this difficulty and environment. Try another environment or party setup.');
 return best;
}
