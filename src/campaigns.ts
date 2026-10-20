import {writeSavedValue} from './storage';

const demoNote='The party has reached the eastern shore.\n\n• The black shard reacts to the ruins.\n• A storm is rolling in from the south.\n• R.’s journal: “I saw the same man twice.”';

export function cleanBundledCampaignTemplates(force=false){
 if(!force&&localStorage.getItem('wayfinder-clean-campaigns-v1'))return;
 const save=(key:string,value:unknown)=>force?writeSavedValue(key,value):localStorage.setItem(key,JSON.stringify(value));
 const removeIds=(key:string,ids:string[])=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(value)){const next=value.filter(item=>!item||!ids.includes(String(item.id)));if(next.length!==value.length)save(key,next)}}catch{}}
 removeIds('wf-encounters:Sagara',['treeline']);
 removeIds('wf-characters:Sagara',['cen','rubikainen']);
 removeIds('wf-wiki:Sagara',['shore','copy']);
 try{const battle=JSON.parse(localStorage.getItem('wf-battle:Sagara')||'null'),title=JSON.parse(localStorage.getItem('wf-battle-title:Sagara')||'null');if(Array.isArray(battle)&&title==='Something in the treeline'&&battle.every(item=>['cen','owl','elara','briar'].includes(String(item?.id)))){save('wf-battle:Sagara',[]);save('wf-battle-title:Sagara','No active encounter');save('wf-battle-active:Sagara',false);save('wf-battle-id:Sagara','')}}catch{}
 try{if(JSON.parse(localStorage.getItem('wf-note:Sagara')||'null')===demoNote)save('wf-note:Sagara','')}catch{}
 localStorage.setItem('wayfinder-clean-campaigns-v1','true');
}
