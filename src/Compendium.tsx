import {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Search,Upload,Download,Plus,ChevronLeft,ChevronRight,Check,Swords,RotateCcw,X} from 'lucide-react';
import {useSaved} from './storage';
import {uid,seedEncounters,type Encounter} from './models';
import {kinds,readMeta,readRecord,writeBatch,activateLibrary,deleteGeneration,importIncluded,indexRecord,monsterToCombatant,plain,type LibraryMeta,type CompendiumRecord,type EntryIndex,type FieldValue} from './compendiumData';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

const labels:Record<string,string>={monster:'Monsters',spell:'Spells',item:'Items',class:'Classes',race:'Races',feat:'Feats',background:'Backgrounds'};
const sizeNames:Record<string,string>={T:'Tiny',S:'Small',M:'Medium',L:'Large',H:'Huge',G:'Gargantuan'};
const monsterLabels:Record<string,string>={save:'Saving Throws',skill:'Skills',vulnerable:'Damage Vulnerabilities',resist:'Damage Resistances',immune:'Damage Immunities',conditionImmune:'Condition Immunities',senses:'Senses',languages:'Languages',cr:'Challenge'};

function FieldBody({value}:{value:FieldValue}){
 if(Array.isArray(value))return <div className="reference-array">{value.map((entry,index)=><FieldBody key={index} value={entry}/>)}</div>;
 if(value&&typeof value==='object')return <div className="reference-object">{Object.entries(value).map(([key,entry])=><div key={key}>{key!=='#text'&&<h4>{key==='name'?'':key.replace('@_','')}</h4>}<FieldBody value={entry}/></div>)}</div>;
 return <p className="reference-text">{String(value??'')}</p>;
}

export function ability(value:FieldValue){
 const score=Number(plain(value));
 if(!Number.isFinite(score))return plain(value)||'—';
 const modifier=Math.floor((score-10)/2);
 return `${score} (${modifier>=0?'+':''}${modifier})`;
}

function InteractiveActionText({text}:{text:string}){
 const triggerRoll=(expr:string,label:string)=>{
  if(typeof window!=='undefined'){
   window.dispatchEvent(new CustomEvent('planarch-dice-roll',{detail:{expression:expr,label}}));
  }
 };
 const regex=/(([+-]\d+)\s+to\s+hit)|(\b\d{1,2}d\d{1,3}(?:\s*[+-]\s*\d+)?\b)/gi;
 let lastIndex=0,match;
 const parts:React.ReactNode[]=[];
 let key=0;
 while((match=regex.exec(text))!==null){
  if(match.index>lastIndex){
   parts.push(<span key={key++}>{text.substring(lastIndex,match.index)}</span>);
  }
  if(match[1]){
   const atkMod=match[2],label=match[1],expr=`1d20${atkMod}`;
   parts.push(<button key={key++} type="button" className="dice-inline-btn attack-roll-btn" onClick={()=>triggerRoll(expr,`Attack (${label})`)} title={`Roll attack: ${expr}`}>ATK {atkMod}</button>);
  }else if(match[3]){
   const dmgExpr=match[3].replace(/\s+/g,''),label=match[3];
   parts.push(<button key={key++} type="button" className="dice-inline-btn damage-roll-btn" onClick={()=>triggerRoll(dmgExpr,`Damage (${label})`)} title={`Roll damage: ${dmgExpr}`}>DMG {label}</button>);
  }
  lastIndex=regex.lastIndex;
 }
 if(lastIndex<text.length){
  parts.push(<span key={key++}>{text.substring(lastIndex)}</span>);
 }
 return <>{parts}</>;
}

function MonsterEntries({value}:{value:FieldValue}){
 const values=Array.isArray(value)?value:[value];
 return <>{values.map((entry,index)=>{
  if(entry&&typeof entry==='object'){
   const object=entry as Record<string,FieldValue>,name=plain(object.name),body=plain(object.text||object['#text']);
   return <div className="monster-entry" key={index}>{name&&<strong>{name}. </strong>}{body?<InteractiveActionText text={body}/>:<FieldBody value={entry}/>}</div>;
  }
  const str=plain(entry);
  return <p className="monster-entry" key={index}><InteractiveActionText text={str}/></p>;
 })}</>;
}

function MonsterSection({title,value,collapsible=false}:{title:string,value:FieldValue|undefined,collapsible?:boolean}){
 if(!value||!plain(value))return null;
 if(collapsible){
  return <details className="compendium-accordion monster-accordion" open>
   <summary className="accordion-summary"><span>{title}</span></summary>
   <div className="accordion-content"><MonsterEntries value={value}/></div>
  </details>;
 }
 return <section className="monster-section"><h3>{title}</h3><MonsterEntries value={value}/></section>;
}

export function MonsterStatBlock({record,collapsibleSections=false}:{record:CompendiumRecord,collapsibleSections?:boolean}){
 const f=record.fields,size=sizeNames[plain(f.size)]||plain(f.size),typeLine=[size,plain(f.type)].filter(Boolean).join(' '),details=['save','skill','vulnerable','resist','immune','conditionImmune','senses','languages','cr'];
 return <div className="monster-stat-block" aria-label={`${record.name} monster stat block`}>
  <p className="monster-meta"><em>{typeLine}{typeLine&&plain(f.alignment)?', ':''}{plain(f.alignment)}</em></p>
  <div className="monster-rule"/>
  <div className="monster-core"><p><strong>Armor Class</strong> {plain(f.ac)||'—'}</p><p><strong>Hit Points</strong> {plain(f.hp)||'—'}</p><p><strong>Speed</strong> {plain(f.speed)||'—'}</p></div>
  <div className="monster-rule"/>
  <div className="monster-abilities">{['str','dex','con','int','wis','cha'].map(key=><div key={key}><strong>{key.toUpperCase()}</strong><span>{ability(f[key])}</span></div>)}</div>
  <div className="monster-rule"/>
  <div className="monster-details">{details.map(key=>plain(f[key])&&<p key={key}><strong>{monsterLabels[key]}</strong> {plain(f[key])}{key==='senses'&&plain(f.passive)?`, passive Perception ${plain(f.passive)}`:''}</p>)}</div>
  {plain(f.trait)&&(collapsibleSections ? <details className="compendium-accordion monster-accordion" open><summary className="accordion-summary"><span>Traits</span></summary><div className="accordion-content"><MonsterEntries value={f.trait}/></div></details> : <div className="monster-traits"><MonsterEntries value={f.trait}/></div>)}
  <MonsterSection title="Actions" value={f.action} collapsible={collapsibleSections}/>
  <MonsterSection title="Reactions" value={f.reaction} collapsible={collapsibleSections}/>
  <MonsterSection title="Legendary Actions" value={f.legendary} collapsible={collapsibleSections}/>
  <MonsterSection title="Spellcasting" value={f.spells} collapsible={collapsibleSections}/>
  <div className="monster-footer">{plain(f.environment)&&<span><strong>Environment</strong> {plain(f.environment)}</span>}{plain(f.description)&&<span>{plain(f.description)}</span>}</div>
 </div>;
}

const schoolNames:Record<string,string>={A:'Abjuration',C:'Conjuration',D:'Divination',EN:'Enchantment',EV:'Evocation',I:'Illusion',N:'Necromancy',T:'Transmutation'};
const itemTypes:Record<string,string>={$:'Treasure',A:'Ammunition',AT:"Artisan's tools",EXP:'Explosive',G:'Adventuring gear',GS:'Gaming set',HA:'Heavy armor',INS:'Instrument',LA:'Light armor',M:'Melee weapon',MA:'Medium armor',MNT:'Mount',P:'Potion',R:'Ranged weapon',RD:'Rod',RG:'Ring',S:'Shield',SC:'Scroll',SCF:'Spellcasting focus',T:'Tools',TA:'Tack',TG:'Trade good',WD:'Wand'};
const fieldLabels:Record<string,string>={time:'Casting Time',range:'Range',components:'Components',duration:'Duration',classes:'Classes',detail:'Rarity',type:'Type',magic:'Magic',weight:'Weight',value:'Value',ac:'Armor Class',property:'Properties',dmg1:'Damage',dmg2:'Two-handed Damage',dmgType:'Damage Type',stealth:'Stealth',strength:'Strength',hd:'Hit Die',proficiency:'Proficiencies',numSkills:'Skill Choices',armor:'Armor',weapons:'Weapons',tools:'Tools',wealth:'Starting Wealth',spellAbility:'Spellcasting Ability',slotsReset:'Slots Reset',size:'Size',speed:'Speed',speedOther:'Other Movement',ability:'Ability Scores',languages:'Languages',resist:'Damage Resistances',immune:'Damage Immunities',vulnerable:'Damage Vulnerabilities',conditionImmune:'Condition Immunities',conditionResist:'Condition Resistances',prerequisite:'Prerequisite',ancestry:'Ancestry'};

function ReferenceEntries({value}:{value:FieldValue}){
 if(Array.isArray(value))return <div className="dnd-entry-list">{value.map((entry,index)=><ReferenceEntries key={index} value={entry}/>)}</div>;
 if(value&&typeof value==='object'){
  const object=value as Record<string,FieldValue>,name=plain(object.name),body=plain(object.text||object['#text']),attributes=Object.entries(object).filter(([key])=>key.startsWith('@_')),nested=Object.entries(object).filter(([key])=>!['name','text','#text'].includes(key)&&!key.startsWith('@_'));
  return <article className="dnd-entry">{name&&<h4>{name}</h4>}{attributes.length>0&&<div className="dnd-entry-meta">{attributes.map(([key,entry])=><span key={key}>{key.slice(2).replace(/([a-z])([A-Z])/g,'$1 $2')}: {plain(entry)}</span>)}</div>}{body&&<p>{body}</p>}{nested.map(([key,entry])=><div className="dnd-nested" key={key}><h5>{fieldLabels[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2')}</h5><ReferenceEntries value={entry}/></div>)}</article>;
 }
 return <p className="dnd-prose">{plain(value)}</p>;
}

function DndSection({title,value}:{title:string,value:FieldValue|undefined}){
 if(!value||!plain(value))return null;
 return <section className="dnd-section"><h3>{title}</h3><ReferenceEntries value={value}/></section>;
}

function FactGrid({facts}:{facts:Array<[string,string]>}){
 const visible=facts.filter(([,value])=>value);
 if(!visible.length)return null;
 return <div className="dnd-fact-grid">{visible.map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>;
}

function ClassProgression({value}:{value:FieldValue|undefined}){
 if(!value)return null;
 const levels=Array.isArray(value)?value:[value];
 return <section className="dnd-section class-progression"><h3>Class Progression</h3>{levels.map((level,index)=>{if(!level||typeof level!=='object')return <ReferenceEntries key={index} value={level}/>;const object=level as Record<string,FieldValue>,levelNumber=plain(object['@_level']);return <div className="class-level" key={index}><h4>{levelNumber?`Level ${levelNumber}`:'Class Features'}</h4>{object.feature&&<ReferenceEntries value={object.feature}/>}</div>})}</section>;
}

export function ReferenceStatBlock({record}:{record:CompendiumRecord}){
 const f=record.fields;
 if(record.kind==='spell'){
  const level=plain(f.level),school=schoolNames[plain(f.school)]||plain(f.school),subtitle=level==='0'?`${school?school+' ':''}cantrip`:`${level?`${level}${level==='1'?'st':level==='2'?'nd':level==='3'?'rd':'th'}-level `:''}${school}`;
  return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>{subtitle||'Spell'}</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.time,plain(f.time)],[fieldLabels.range,plain(f.range)],[fieldLabels.components,plain(f.components)],[fieldLabels.duration,plain(f.duration)]]}/><DndSection title="Description" value={f.text}/><DndSection title="Special Rules" value={f.special}/><DndSection title="Rolls" value={f.roll}/><DndSection title="Modifiers" value={f.modifier}/>{plain(f.classes)&&<div className="dnd-footer"><strong>Available to</strong><span>{plain(f.classes)}</span></div>}</div>;
 }
 if(record.kind==='item'){
  const itemType=itemTypes[plain(f.type)]||plain(f.type),damage=[plain(f.dmg1),plain(f.dmgType)].filter(Boolean).join(' ');
  return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>{[itemType,plain(f.detail)].filter(Boolean).join(', ')||'Item'}</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.magic,plain(f.magic)],['Weight',plain(f.weight)&&`${plain(f.weight)} lb.`],['Value',plain(f.value)&&`${plain(f.value)} gp`],[fieldLabels.ac,plain(f.ac)],['Damage',damage],['Two-handed',plain(f.dmg2)],['Range',plain(f.range)],['Properties',plain(f.property)],['Strength',plain(f.strength)],['Stealth',plain(f.stealth)]]}/><DndSection title="Description" value={f.text}/><DndSection title="Modifiers" value={f.modifier}/><DndSection title="Rolls" value={f.roll}/></div>;
 }
 if(record.kind==='class')return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>Character Class{plain(f.hd)?` · d${plain(f.hd)} Hit Die`:''}</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.armor,plain(f.armor)],[fieldLabels.weapons,plain(f.weapons)],[fieldLabels.tools,plain(f.tools)],[fieldLabels.proficiency,plain(f.proficiency)],['Skill Choices',plain(f.numSkills)],[fieldLabels.wealth,plain(f.wealth)],[fieldLabels.spellAbility,plain(f.spellAbility)]]}/><DndSection title="Class Overview" value={f.trait}/><ClassProgression value={f.autolevel}/></div>;
 if(record.kind==='race')return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>{plain(f.ancestry)||plain(f.displayname)||'Character Ancestry'}</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.size,sizeNames[plain(f.size)]||plain(f.size)],['Speed',plain(f.speed)&&`${plain(f.speed)} ft.`],[fieldLabels.speedOther,plain(f.speedOther)],[fieldLabels.ability,plain(f.ability)],[fieldLabels.languages,plain(f.languages)],[fieldLabels.proficiency,plain(f.proficiency)],[fieldLabels.weapons,plain(f.weapons)],[fieldLabels.armor,plain(f.armor)],[fieldLabels.tools,plain(f.tools)],[fieldLabels.spellAbility,plain(f.spellAbility)],[fieldLabels.resist,plain(f.resist)],[fieldLabels.immune,plain(f.immune)],[fieldLabels.vulnerable,plain(f.vulnerable)],[fieldLabels.conditionImmune,plain(f.conditionImmune)],[fieldLabels.conditionResist,plain(f.conditionResist)]]}/><DndSection title="Ancestry Traits" value={f.trait}/><DndSection title="Innate Spells" value={f.spells}/></div>;
 if(record.kind==='feat')return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>Character Feat</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.prerequisite,plain(f.prerequisite)],[fieldLabels.proficiency,plain(f.proficiency)],[fieldLabels.tools,plain(f.tools)],[fieldLabels.armor,plain(f.armor)],[fieldLabels.weapons,plain(f.weapons)],[fieldLabels.languages,plain(f.languages)]]}/><DndSection title="Benefit" value={f.text}/><DndSection title="Special" value={f.special}/><DndSection title="Modifiers" value={f.modifier}/><DndSection title="Rolls" value={f.roll}/></div>;
 return <div className="dnd-reference-card" aria-label={`${record.name} D&D reference`}><p className="dnd-subtitle"><em>Character Background{plain(f.ancestry)?` · ${plain(f.ancestry)}`:''}</em></p><div className="monster-rule"/><FactGrid facts={[[fieldLabels.proficiency,plain(f.proficiency)],[fieldLabels.tools,plain(f.tools)],[fieldLabels.languages,plain(f.languages)]]}/><DndSection title="Background Features" value={f.trait}/></div>;
}

function parseCR(summary: string): number | null {
  const m = summary.match(/CR\s+([0-9/]+)/i);
  if (!m) return null;
  const val = m[1];
  if (val.includes('/')) {
    const [num, den] = val.split('/').map(Number);
    return den ? num / den : 0;
  }
  return Number(val);
}

function parseSpellLevel(summary: string): number | null {
  const m = summary.match(/Level\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

export default function Compendium({campaign,focus,onFocusHandled,notify}:{campaign:string,focus:string,onFocusHandled:()=>void,notify:(message:string)=>void}){
 const [meta,setMeta]=useState<LibraryMeta|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState([0,26393]),[error,setError]=useState(''),[kind,setKind]=useState('All'),[edition,setEdition]=useState('All'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[selected,setSelected]=useState(''),[record,setRecord]=useState<CompendiumRecord|null>(null),[encounterId,setEncounterId]=useState('');
 const [monsterCR,setMonsterCR]=useState('All'),[monsterType,setMonsterType]=useState('All'),[spellLevel,setSpellLevel]=useState('All'),[spellClass,setSpellClass]=useState('All'),[itemRarity,setItemRarity]=useState('All'),[itemType,setItemType]=useState('All'),[sort,setSort]=useState('name-asc');
 const [encounters,setEncounters]=useSaved<Encounter[]>(`wf-encounters:${campaign}`,seedEncounters(campaign));
 const worker=useRef<Worker|null>(null),mounted=useRef(true);

 useEffect(()=>{mounted.current=true;readMeta().then(current=>{setMeta(current);setLoading(false);if(current?.index[0])setSelected(current.index[0].id)}).catch(e=>{setError(e.message);setLoading(false)});return()=>{mounted.current=false}},[]);
 useEffect(()=>{const refresh=()=>{readMeta().then(current=>{setMeta(current);if(current?.index[0])setSelected(current.index[0].id)}).catch(e=>setError(e.message))};window.addEventListener('planarch-compendium-changed',refresh);return()=>window.removeEventListener('planarch-compendium-changed',refresh)},[]);
 useEffect(()=>{if(focus&&meta){setSelected(focus);setKind('All');setEdition('All');setQuery('');onFocusHandled()}},[focus,meta]);
 useEffect(()=>{setRecord(null);if(!meta||!selected)return;let cancelled=false;readRecord(meta.generation,selected).then(result=>{if(!cancelled)setRecord(result)}).catch(e=>setError(e.message));return()=>{cancelled=true}},[meta,selected]);
 useEffect(()=>setPage(0),[kind,edition,query,monsterCR,monsterType,spellLevel,spellClass,itemRarity,itemType,sort]);

 const hasActiveFilters = kind !== 'All' || edition !== 'All' || query.trim() !== '' || monsterCR !== 'All' || monsterType !== 'All' || spellLevel !== 'All' || spellClass !== 'All' || itemRarity !== 'All' || itemType !== 'All' || sort !== 'name-asc';

 const clearFilters = () => {
   setKind('All');
   setEdition('All');
   setQuery('');
   setMonsterCR('All');
   setMonsterType('All');
   setSpellLevel('All');
   setSpellClass('All');
   setItemRarity('All');
   setItemType('All');
   setSort('name-asc');
 };

 const matching = useMemo(() => {
   if (!meta?.index) return [];
   const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

   return meta.index.filter(entry => {
     if (kind !== 'All' && entry.kind !== kind) return false;
     if (edition !== 'All' && entry.edition !== edition) return false;
     if (words.length && !words.every(w => entry.search.includes(w))) return false;

     if (kind === 'monster') {
       if (monsterCR !== 'All') {
         const cr = parseCR(entry.summary);
         if (cr === null) return false;
         if (monsterCR === '0-1' && !(cr >= 0 && cr <= 1)) return false;
         if (monsterCR === '2-4' && !(cr >= 2 && cr <= 4)) return false;
         if (monsterCR === '5-9' && !(cr >= 5 && cr <= 9)) return false;
         if (monsterCR === '10-14' && !(cr >= 10 && cr <= 14)) return false;
         if (monsterCR === '15+' && !(cr >= 15)) return false;
       }
       if (monsterType !== 'All') {
         if (!entry.search.includes(monsterType.toLowerCase())) return false;
       }
     }

     if (kind === 'spell') {
       if (spellLevel !== 'All') {
         const lvl = parseSpellLevel(entry.summary);
         if (lvl === null || lvl !== Number(spellLevel)) return false;
       }
       if (spellClass !== 'All') {
         if (!entry.search.includes(spellClass.toLowerCase())) return false;
       }
     }

     if (kind === 'item') {
       if (itemRarity !== 'All') {
         if (!entry.search.includes(itemRarity.toLowerCase())) return false;
       }
       if (itemType !== 'All') {
         if (!entry.search.includes(itemType.toLowerCase())) return false;
       }
     }

     return true;
   }).sort((a, b) => {
     if (sort === 'name-desc') return b.name.localeCompare(a.name);
     if (sort === 'cr-level') {
       if (kind === 'monster') {
         const crA = parseCR(a.summary) ?? 0;
         const crB = parseCR(b.summary) ?? 0;
         if (crA !== crB) return crA - crB;
       } else if (kind === 'spell') {
         const lvlA = parseSpellLevel(a.summary) ?? 0;
         const lvlB = parseSpellLevel(b.summary) ?? 0;
         if (lvlA !== lvlB) return lvlA - lvlB;
       }
     }
     return a.name.localeCompare(b.name);
   });
 }, [meta, kind, edition, query, monsterCR, monsterType, spellLevel, spellClass, itemRarity, itemType, sort]);
 const included=async()=>{setBusy(true);setError('');try{const imported=await importIncluded((current,total)=>{if(mounted.current)setProgress([current,total])});if(mounted.current){setMeta(imported);setSelected(imported.index[0].id);notify(`${imported.count.toLocaleString()} compendium entries ready`)}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Sourcebook could not be loaded')}finally{if(mounted.current)setBusy(false)}};
 const importXML=async(file:File)=>{
  if(file.size>100*1024*1024){setError('Choose a compendium smaller than 100 MB.');return}
  setBusy(true);setError('');setProgress([0,0]);
  const generation=uid(),old=await readMeta();let failed=false,queue=Promise.resolve(),total=0,index:EntryIndex[]=[],counts:Record<string,number>={};
  const instance=new Worker(new URL('./compendium.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
  const fail=async(message:string)=>{if(failed)return;failed=true;instance.terminate();await deleteGeneration(generation).catch(()=>{});if(mounted.current){setError(message);setBusy(false)}};
  instance.onerror=()=>{queue=queue.then(()=>fail('XML parsing failed; your previous sourcebook is unchanged.'))};
  instance.onmessage=event=>{const data=event.data;if(data.type==='parsed'){total=data.total;if(mounted.current)setProgress([0,total])}if(data.type==='batch'){queue=queue.then(async()=>{if(failed)return;await writeBatch(generation,data.records);for(const entry of data.records as CompendiumRecord[]){index.push(indexRecord(entry));counts[entry.kind]=(counts[entry.kind]||0)+1}if(mounted.current)setProgress([index.length,total])}).catch(e=>fail(e.message))}if(data.type==='error')queue=queue.then(()=>fail(data.message));if(data.type==='done'){queue.then(async()=>{if(failed)return;if(index.length!==data.total)throw Error('Compendium import is incomplete.');const next={generation,name:file.name,count:index.length,counts,index};await activateLibrary(next);if(old)await deleteGeneration(old.generation).catch(()=>{});instance.terminate();if(mounted.current){setMeta(next);setSelected(index[0].id);setBusy(false);notify(`${index.length.toLocaleString()} entries imported`)}}).catch(e=>fail(e.message))}};
  instance.postMessage(file);
 };
 const addMonster=()=>{if(!record||record.kind!=='monster')return;const monster=monsterToCombatant(record,uid()),chosen=encounters.find(entry=>entry.id===encounterId);if(chosen){setEncounters(encounters.map(entry=>entry.id===chosen.id?{...entry,members:[...entry.members,monster]}:entry));notify(`${record.name} added to ${chosen.name}`)}else{const fresh:Encounter={id:uid(),name:record.name+' encounter',description:'Prepared from the compendium. Each monster links to its full stat block.',environment:plain(record.fields.environment),difficulty:'Custom',partyLevel:3,partySize:7,status:'Prepared',members:[monster]};setEncounters([...encounters,fresh]);setEncounterId(fresh.id);notify(`${fresh.name} created`)}};

 return <>
  <div className="compendium-filter-toolbar">
   <div className="compendium-search-row">
    <div className="tool-search">
     <Search size={16}/>
     <input aria-label="Search compendium" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names, types, classes, CR…"/>
     {query && <button className="icon-button" aria-label="Clear search" onClick={()=>setQuery('')} style={{padding:'2px',marginRight:'4px'}}><X size={14}/></button>}
    </div>
    <label className={`secondary file-label ${busy?'disabled':''}`}>
     <Upload size={15}/>Import XML
     <input type="file" accept=".xml,text/xml,application/xml" disabled={busy} onChange={e=>{if(e.target.files?.[0])importXML(e.target.files[0]);e.target.value=''}}/>
    </label>
   </div>

   {meta && <div className="compendium-dropdown-row">
    {/* Category Select */}
    <div className="filter-dropdown-wrap">
     <Select value={kind} onValueChange={setKind}>
      <SelectTrigger aria-label="Compendium category" className="compendium-select-trigger">
       <SelectValue placeholder="Category"/>
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="All">All categories ({meta.count.toLocaleString()})</SelectItem>
       {kinds.map(k=><SelectItem key={k} value={k}>{labels[k]} ({(meta.counts[k]||0).toLocaleString()})</SelectItem>)}
      </SelectContent>
     </Select>
    </div>

    {/* Edition Select */}
    <div className="filter-dropdown-wrap">
     <Select value={edition} onValueChange={setEdition}>
      <SelectTrigger aria-label="Compendium edition" className="compendium-select-trigger">
       <SelectValue placeholder="Edition"/>
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="All">All editions</SelectItem>
       <SelectItem value="Legacy">Legacy</SelectItem>
       <SelectItem value="5.5e">5.5e</SelectItem>
       <SelectItem value="Unspecified">Unspecified</SelectItem>
      </SelectContent>
     </Select>
    </div>

    {/* Monster Contextual Filters */}
    {kind === 'monster' && <>
     <div className="filter-dropdown-wrap">
      <Select value={monsterCR} onValueChange={setMonsterCR}>
       <SelectTrigger aria-label="Monster CR" className="compendium-select-trigger">
        <SelectValue placeholder="CR"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All CRs</SelectItem>
        <SelectItem value="0-1">CR 0 – 1</SelectItem>
        <SelectItem value="2-4">CR 2 – 4</SelectItem>
        <SelectItem value="5-9">CR 5 – 9</SelectItem>
        <SelectItem value="10-14">CR 10 – 14</SelectItem>
        <SelectItem value="15+">CR 15+</SelectItem>
       </SelectContent>
      </Select>
     </div>
     <div className="filter-dropdown-wrap">
      <Select value={monsterType} onValueChange={setMonsterType}>
       <SelectTrigger aria-label="Monster type" className="compendium-select-trigger">
        <SelectValue placeholder="Type"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All types</SelectItem>
        {['aberration','beast','celestial','construct','dragon','elemental','fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead'].map(t=>
         <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>
        )}
       </SelectContent>
      </Select>
     </div>
    </>}

    {/* Spell Contextual Filters */}
    {kind === 'spell' && <>
     <div className="filter-dropdown-wrap">
      <Select value={spellLevel} onValueChange={setSpellLevel}>
       <SelectTrigger aria-label="Spell level" className="compendium-select-trigger">
        <SelectValue placeholder="Level"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All spell levels</SelectItem>
        <SelectItem value="0">Cantrip (Level 0)</SelectItem>
        <SelectItem value="1">1st Level</SelectItem>
        <SelectItem value="2">2nd Level</SelectItem>
        <SelectItem value="3">3rd Level</SelectItem>
        <SelectItem value="4">4th Level</SelectItem>
        <SelectItem value="5">5th Level</SelectItem>
        <SelectItem value="6">6th Level</SelectItem>
        <SelectItem value="7">7th Level</SelectItem>
        <SelectItem value="8">8th Level</SelectItem>
        <SelectItem value="9">9th Level</SelectItem>
       </SelectContent>
      </Select>
     </div>
     <div className="filter-dropdown-wrap">
      <Select value={spellClass} onValueChange={setSpellClass}>
       <SelectTrigger aria-label="Spell class" className="compendium-select-trigger">
        <SelectValue placeholder="Class"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All spell classes</SelectItem>
        {['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'].map(c=>
         <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
        )}
       </SelectContent>
      </Select>
     </div>
    </>}

    {/* Item Contextual Filters */}
    {kind === 'item' && <>
     <div className="filter-dropdown-wrap">
      <Select value={itemRarity} onValueChange={setItemRarity}>
       <SelectTrigger aria-label="Item rarity" className="compendium-select-trigger">
        <SelectValue placeholder="Rarity"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All rarities</SelectItem>
        {['common','uncommon','rare','very rare','legendary','artifact'].map(r=>
         <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>
        )}
       </SelectContent>
      </Select>
     </div>
     <div className="filter-dropdown-wrap">
      <Select value={itemType} onValueChange={setItemType}>
       <SelectTrigger aria-label="Item type" className="compendium-select-trigger">
        <SelectValue placeholder="Type"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="All">All item types</SelectItem>
        {['weapon','armor','shield','potion','ring','rod','scroll','wand','wondrous'].map(t=>
         <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>
        )}
       </SelectContent>
      </Select>
     </div>
    </>}

    {/* Sort Order */}
    <div className="filter-dropdown-wrap">
     <Select value={sort} onValueChange={setSort}>
      <SelectTrigger aria-label="Sort order" className="compendium-select-trigger">
       <SelectValue placeholder="Sort"/>
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="name-asc">Name (A → Z)</SelectItem>
       <SelectItem value="name-desc">Name (Z → A)</SelectItem>
       <SelectItem value="cr-level">CR / Spell Level</SelectItem>
      </SelectContent>
     </Select>
    </div>

    {/* Clear / Reset Filter button */}
    {hasActiveFilters && (
     <button
      className="icon-button danger-text"
      onClick={clearFilters}
      title="Reset all filters"
      aria-label="Reset all filters"
      style={{height:'32px',padding:'0 10px',fontSize:'11px',display:'inline-flex',alignItems:'center',gap:'4px'}}
     >
      <RotateCcw size={13}/>
      <span>Reset</span>
     </button>
    )}
   </div>}
  </div>
  {error&&<p className="form-error">{error}</p>}
  {loading?<div className="tool-empty"><BookOpen size={30}/><p>Opening your local compendium…</p></div>:busy?<div className="compendium-import"><BookOpen size={30}/><h2>Preparing your sourcebook</h2><p>{progress[1]?`${progress[0].toLocaleString()} / ${progress[1].toLocaleString()} entries stored locally`:'Parsing XML in the background…'}</p><progress max={progress[1]||1} value={progress[0]}/><small>Your existing library stays available until the new import is complete.</small></div>:!meta?<div className="compendium-import"><BookOpen size={40}/><span className="eyebrow">YOUR SOURCEBOOK IS READY TO LOAD</span><h2>Complete Compendium · 5e + 5.5e</h2><p>26,393 entries from your supplied XML. Monsters, spells, items, classes, races, feats and backgrounds.</p><button className="primary" onClick={included}><Download size={16}/>Load included compendium</button><small>Imported once into this browser. You can also choose a different XML file above.</small></div>:<>
   <div className="compendium-source"><span><Check size={12}/>Stored locally · {meta.name}</span><small>{matching.length.toLocaleString()} matching entries</small></div>
   <div className="compendium-layout"><aside className="record-list"><div className="record-list-title">REFERENCE INDEX<span>{matching.length.toLocaleString()}</span></div>{matching.slice(page*40,(page+1)*40).map(entry=><button key={entry.id} className={`record-row ${selected===entry.id?'selected':''}`} onClick={()=>setSelected(entry.id)}><div><strong>{entry.name}</strong><small>{entry.summary}</small><span className="record-meta">{labels[entry.kind]} · {entry.edition==='Unspecified'?'Original label preserved':entry.edition}</span></div></button>)}{!matching.length&&<div className="tool-empty"><p>No entries match your filters.</p></div>}<div className="index-pagination"><button className="icon-button" aria-label="Previous compendium page" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={18}/></button><small>{matching.length?`${page+1} / ${Math.ceil(matching.length/40)}`:'0 results'}</small><button className="icon-button" aria-label="Next compendium page" disabled={(page+1)*40>=matching.length} onClick={()=>setPage(page+1)}><ChevronRight size={18}/></button></div></aside>
    <section className={`record-editor reference-detail dnd-reference reference-${record?.kind||''} ${record?.kind==='monster'?'monster-reference':''}`}>{record?<><div className="editor-title"><span className="eyebrow">{labels[record.kind].toUpperCase()} · {record.edition.toUpperCase()}</span><BookOpen size={19}/></div><h2>{record.name}</h2>{record.kind==='monster'?<><MonsterStatBlock record={record}/><div className="add-from-compendium"><Swords size={18}/><select aria-label="Target encounter" value={encounterId} onChange={e=>setEncounterId(e.target.value)}><option value="">Create new encounter</option>{encounters.filter(entry=>entry.status==='Prepared').map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><button className="primary" onClick={addMonster}><Plus size={14}/>Add monster</button></div></>:<ReferenceStatBlock record={record}/>}</>:<div className="tool-empty"><p>{selected?'Loading entry…':'Select an entry to read its full details.'}</p></div>}</section>
   </div>
  </>}
 </>;
}
