import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
export type SavedChange={key:string,json:string,remote:boolean};
const listeners=new Set<(change:SavedChange)=>void>();
export function subscribeSaved(fn:(change:SavedChange)=>void){listeners.add(fn);return()=>{listeners.delete(fn)}}
export function writeSavedJSON(key:string,json:string,remote=false){if(localStorage.getItem(key)===json)return;localStorage.setItem(key,json);for(const fn of listeners)fn({key,json,remote})}
export function writeSavedValue(key:string,value:unknown,remote=false){writeSavedJSON(key,JSON.stringify(value),remote)}
export function workspaceKeys(){return Object.keys(localStorage).filter(k=>k.startsWith('wf-'))}
export function useSaved<T>(key:string,initial:T):readonly [T,Dispatch<SetStateAction<T>>]{
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')??initial}catch{return initial}};
 const [state,setState]=useState<{key:string,value:T}>(()=>({key,value:read()}));
 const value=state.key===key?state.value:read();
 useEffect(()=>{if(state.key!==key){setState({key,value:read()});return}try{writeSavedValue(key,state.value)}catch{window.dispatchEvent(new CustomEvent('wayfinder-save-error'))}},[key,state]);
 useEffect(()=>subscribeSaved(change=>{if(change.key===key){try{setState({key,value:JSON.parse(change.json)})}catch{}}}),[key]);
 useEffect(()=>{const fn=(event:StorageEvent)=>{if(event.key===key&&event.newValue!==null){try{setState({key,value:JSON.parse(event.newValue)});for(const listener of listeners)listener({key,json:event.newValue,remote:true})}catch{}}};window.addEventListener('storage',fn);return()=>window.removeEventListener('storage',fn)},[key]);
 const setValue:Dispatch<SetStateAction<T>>=(update)=>setState(prev=>{const current=prev.key===key?prev.value:read();return {key,value:typeof update==='function'?(update as (v:T)=>T)(current):update}});
 return [value,setValue] as const;
}
