import type {Combatant} from './models';
export const kinds=['monster','spell','item','class','race','feat','background'] as const;
export type Kind=typeof kinds[number];
export type FieldValue=string|number|boolean|null|FieldValue[]|{[key:string]:FieldValue};
export type CompendiumRecord={id:string,kind:Kind,name:string,edition:string,fields:Record<string,FieldValue>};
export type EntryIndex={id:string,kind:Kind,name:string,edition:string,summary:string,search:string};
export type LibraryMeta={generation:string,name:string,count:number,counts:Record<string,number>,index:EntryIndex[]};
export function plain(v:FieldValue|undefined):string{if(v===undefined||v===null)return '';if(Array.isArray(v))return v.map(plain).filter(Boolean).join('\n');if(typeof v==='object')return Object.entries(v).map(([k,x])=>k==='#text'?plain(x):k.startsWith('@_')?`${k.slice(2)}: ${plain(x)}`:`${k}: ${plain(x)}`).filter(Boolean).join('\n');return String(v)}
export function indexRecord(r:CompendiumRecord):EntryIndex{const f=r.fields;const summary=r.kind==='monster'?`${plain(f.type)} · CR ${plain(f.cr)||'—'}`:r.kind==='spell'?`Level ${plain(f.level)||'0'} · ${plain(f.classes)}`:plain(f.detail||f.type||f.proficiency||f.ability);return {id:r.id,kind:r.kind,name:r.name,edition:r.edition,summary:summary.slice(0,220),search:`${r.name} ${summary} ${r.edition}`.toLowerCase()}}
export function monsterToCombatant(record:CompendiumRecord,id:string):Combatant{if(record.kind!=='monster')throw Error('Only monsters can be added as combatants');const hp=Number(plain(record.fields.hp).match(/^\s*(\d+)/)?.[1]||0);const dex=Number(plain(record.fields.dex).match(/^\s*(\d+)/)?.[1]||10),cr=plain(record.fields.cr).trim();return {id,name:record.name,role:'Monster',hp,maxHp:hp,initiative:10,modifier:Math.floor((dex-10)/2),conditions:'',concentration:'',cr,reference:{id:record.id,name:record.name}}}
let database:Promise<IDBDatabase>|undefined;
let legacyDatabase:Promise<IDBDatabase>|undefined;
const recordCache = new Map<string, CompendiumRecord>();

function openCompendiumDb(name:string):Promise<IDBDatabase>{
 return new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(name,1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains('records')){
    request.result.createObjectStore('records',{keyPath:'key'});
   }
   if(!request.result.objectStoreNames.contains('meta')){
    request.result.createObjectStore('meta');
   }
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>{
   reject(Error('IndexedDB is unavailable. Enable browser storage to import your compendium.'));
  };
 });
}

export function openLibrary(){
 if(!database)database=openCompendiumDb('archeron-compendium').catch(err=>{database=undefined;throw err});
 return database;
}

function openLegacyLibrary(){
 if(!legacyDatabase)legacyDatabase=openCompendiumDb('planarch-compendium').catch(err=>{legacyDatabase=undefined;throw err});
 return legacyDatabase;
}

async function migrateCompendium(legacyDb:IDBDatabase,targetDb:IDBDatabase,meta:LibraryMeta){
 try{
  const records=await new Promise<{key:string,record:CompendiumRecord}[]>((resolve,reject)=>{
   const tx=legacyDb.transaction('records','readonly');
   const store=tx.objectStore('records');
   const range=IDBKeyRange.bound(`${meta.generation}|`,`${meta.generation}|\uffff`);
   const req=store.getAll(range);
   req.onsuccess=()=>resolve(req.result||[]);
   req.onerror=()=>reject(req.error);
  });
  for(let i=0;i<records.length;i+=500){
   const batch=records.slice(i,i+500);
   await new Promise<void>((resolve,reject)=>{
    const tx=targetDb.transaction('records','readwrite');
    const store=tx.objectStore('records');
    for(const item of batch)store.put(item);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
   });
  }
  await new Promise<void>((resolve,reject)=>{
   const tx=targetDb.transaction('meta','readwrite');
   tx.objectStore('meta').put(meta,'active');
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error);
  });
 }catch{}
}

export async function readMeta():Promise<LibraryMeta|null>{
 const db=await openLibrary();
 const meta=await new Promise<LibraryMeta|null>((resolve,reject)=>{
  const req=db.transaction('meta').objectStore('meta').get('active');
  req.onsuccess=()=>resolve(req.result??null);
  req.onerror=()=>reject(req.error);
 });
 if(meta)return meta;
 try{
  const legacyDb=await openLegacyLibrary();
  if(legacyDb.objectStoreNames.contains('meta')){
   const legacyMeta=await new Promise<LibraryMeta|null>((resolve,reject)=>{
    const req=legacyDb.transaction('meta').objectStore('meta').get('active');
    req.onsuccess=()=>resolve(req.result??null);
    req.onerror=()=>reject(req.error);
   });
   if(legacyMeta){
    void migrateCompendium(legacyDb,db,legacyMeta);
    return legacyMeta;
   }
  }
 }catch{}
 return null;
}
export async function readRecord(generation:string,id:string):Promise<CompendiumRecord|null>{
  const cacheKey = `${generation}|${id}`;
  if (recordCache.has(cacheKey)) return recordCache.get(cacheKey) || null;
  const db=await openLibrary();
  let rec=await new Promise<CompendiumRecord|null>((resolve,reject)=>{
    const req=db.transaction('records').objectStore('records').get(cacheKey);
    req.onsuccess=()=>resolve(req.result?.record??null);
    req.onerror=()=>reject(req.error);
  });
  if(!rec){
    try{
      const legacyDb=await openLegacyLibrary();
      if(legacyDb.objectStoreNames.contains('records')){
        rec=await new Promise<CompendiumRecord|null>((resolve,reject)=>{
          const req=legacyDb.transaction('records').objectStore('records').get(cacheKey);
          req.onsuccess=()=>resolve(req.result?.record??null);
          req.onerror=()=>reject(req.error);
        });
        if(rec){
          new Promise<void>((resolve)=>{
            const tx=db.transaction('records','readwrite');
            tx.objectStore('records').put({key:cacheKey,record:rec});
            tx.oncomplete=()=>resolve();
            tx.onerror=()=>resolve();
          }).catch(()=>{});
        }
      }
    }catch{}
  }
  if (rec) {
    if (recordCache.size > 1500) recordCache.clear();
    recordCache.set(cacheKey, rec);
  }
  return rec;
}
export async function writeBatch(generation:string,records:CompendiumRecord[]){const db=await openLibrary();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite');const store=tx.objectStore('records');for(const record of records)store.put({key:`${generation}|${record.id}`,record});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Compendium could not be stored. Check available browser space.'))})}
export async function activateLibrary(meta:LibraryMeta,remote=false){
 const db=await openLibrary();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('meta','readwrite');
  tx.objectStore('meta').put(meta,'active');
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
 if(typeof window!=='undefined'){
  if(!remote){
   localStorage.setItem('archeron-compendium-dirty','true');
   localStorage.setItem('planarch-compendium-dirty','true');
  }
  window.dispatchEvent(new CustomEvent('archeron-compendium-changed',{detail:{remote}}));
  window.dispatchEvent(new CustomEvent('planarch-compendium-changed',{detail:{remote}}));
 }
}
export function isCompendiumDirty():boolean{
 return localStorage.getItem('archeron-compendium-dirty')==='true'||localStorage.getItem('planarch-compendium-dirty')==='true';
}
export function clearCompendiumDirty():void{
 localStorage.removeItem('archeron-compendium-dirty');
 localStorage.removeItem('planarch-compendium-dirty');
}
export async function deleteGeneration(generation:string){
 const db=await openLibrary();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('records','readwrite');
  tx.objectStore('records').delete(IDBKeyRange.bound(`${generation}|`,`${generation}|\uffff`));
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
 try{
  const legacyDb=await openLegacyLibrary();
  if(legacyDb.objectStoreNames.contains('records')){
   await new Promise<void>((resolve,reject)=>{
    const tx=legacyDb.transaction('records','readwrite');
    tx.objectStore('records').delete(IDBKeyRange.bound(`${generation}|`,`${generation}|\uffff`));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
   });
  }
 }catch{}
}
export async function importIncluded(progress:(current:number,total:number)=>void):Promise<LibraryMeta>{const previous=await readMeta(),generation=crypto.randomUUID(),index:EntryIndex[]=[],counts:Record<string,number>={};try{const res=await fetch('/compendium/manifest.json');if(!res.ok)throw Error('Included sourcebook could not be loaded. Import your XML file instead.');const manifest=await res.json();if(!Array.isArray(manifest.chunks)||!Number.isInteger(manifest.count))throw Error('Sourcebook manifest is invalid');for(let i=0;i<manifest.chunks.length;i+=4){const chunks=await Promise.all(manifest.chunks.slice(i,i+4).map(async(filename:string)=>{if(!/^chunk-\d+\.json$/.test(filename))throw Error('Invalid chunk name');const response=await fetch(`/compendium/${filename}`);if(!response.ok)throw Error('A sourcebook chunk could not be downloaded. Your existing compendium is unchanged.');return await response.json() as CompendiumRecord[]}));for(const records of chunks){await writeBatch(generation,records);for(const r of records){index.push(indexRecord(r));counts[r.kind]=(counts[r.kind]||0)+1}}progress(index.length,manifest.count)}if(index.length!==manifest.count)throw Error('Sourcebook is incomplete');const meta={generation,name:String(manifest.name),count:index.length,counts,index};await activateLibrary(meta);if(previous)await deleteGeneration(previous.generation).catch(()=>{});return meta}catch(error){await deleteGeneration(generation).catch(()=>{});throw error}}
export async function readLibraryRecords(generation:string):Promise<CompendiumRecord[]>{
 const db=await openLibrary();
 let records=await new Promise<CompendiumRecord[]>((resolve,reject)=>{
  const req=db.transaction('records').objectStore('records').getAll(IDBKeyRange.bound(`${generation}|`,`${generation}|\uffff`));
  req.onsuccess=()=>resolve(req.result.map(v=>v.record));
  req.onerror=()=>reject(req.error);
 });
 if(records.length===0){
  try{
   const legacyDb=await openLegacyLibrary();
   if(legacyDb.objectStoreNames.contains('records')){
    records=await new Promise<CompendiumRecord[]>((resolve,reject)=>{
     const req=legacyDb.transaction('records').objectStore('records').getAll(IDBKeyRange.bound(`${generation}|`,`${generation}|\uffff`));
     req.onsuccess=()=>resolve(req.result.map(v=>v.record));
     req.onerror=()=>reject(req.error);
    });
   }
  }catch{}
 }
 return records;
}
export async function restoreLibrary(records:CompendiumRecord[],name:string){if(!Array.isArray(records)||!records.length||records.length>100000||records.some(r=>!kinds.includes(r.kind)||typeof r.id!=='string'||typeof r.name!=='string'||!r.fields))throw Error('Cloud compendium is invalid');const previous=await readMeta(),generation=crypto.randomUUID(),counts:Record<string,number>={};try{for(let i=0;i<records.length;i+=250)await writeBatch(generation,records.slice(i,i+250));for(const r of records)counts[r.kind]=(counts[r.kind]||0)+1;const meta={generation,name,count:records.length,counts,index:records.map(indexRecord)};await activateLibrary(meta,true);if(previous)await deleteGeneration(previous.generation).catch(()=>{});return meta}catch(e){await deleteGeneration(generation).catch(()=>{});throw e}}
