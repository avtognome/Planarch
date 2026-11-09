let database:Promise<IDBDatabase>|undefined;
function openDb(name:string):Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(name,1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('files')){
    r.result.createObjectStore('files');
   }
  };
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error);
 });
}
function open(){
 if(!database)database=openDb('archeron-files');
 return database;
}
export async function saveAudio(file:Blob,name:string,remote=false){
 const db=await open();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('files','readwrite');
  tx.objectStore('files').put({file,name,id:crypto.randomUUID()},'audio');
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
 if(!remote){
  localStorage.setItem('archeron-audio-dirty','true');
  localStorage.setItem('planarch-audio-dirty','true');
 }
 window.dispatchEvent(new CustomEvent('archeron-audio-changed',{detail:{remote}}));
 window.dispatchEvent(new CustomEvent('planarch-audio-changed',{detail:{remote}}));
}
export async function readAudio():Promise<{file:Blob,name:string,id:string}|null>{
 const db=await open();
 const primary=await new Promise<{file:Blob,name:string,id:string}|null>((resolve,reject)=>{
  const r=db.transaction('files').objectStore('files').get('audio');
  r.onsuccess=()=>resolve(r.result||null);
  r.onerror=()=>reject(r.error);
 });
 if(primary)return primary;
 try{
  const legacyDb=await openDb('planarch-files');
  if(!legacyDb.objectStoreNames.contains('files'))return null;
  const legacy=await new Promise<{file:Blob,name:string,id:string}|null>((resolve,reject)=>{
   const r=legacyDb.transaction('files').objectStore('files').get('audio');
   r.onsuccess=()=>resolve(r.result||null);
   r.onerror=()=>reject(r.error);
  });
  if(legacy){
   await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('files','readwrite');
    tx.objectStore('files').put(legacy,'audio');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
   }).catch(()=>{});
   return legacy;
  }
 }catch{}
 return null;
}
export function isAudioDirty():boolean{
 return localStorage.getItem('archeron-audio-dirty')==='true'||localStorage.getItem('planarch-audio-dirty')==='true';
}
export function clearAudioDirty():void{
 localStorage.removeItem('archeron-audio-dirty');
 localStorage.removeItem('planarch-audio-dirty');
}
