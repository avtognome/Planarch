import {parseCompendium} from './compendiumParser';
const scope=self as unknown as {onmessage:(event:MessageEvent)=>void,postMessage:(data:unknown)=>void};
scope.onmessage=async(event:MessageEvent<File>)=>{try{const entries=parseCompendium(await event.data.text());scope.postMessage({type:'parsed',total:entries.length});for(let i=0;i<entries.length;i+=250)scope.postMessage({type:'batch',records:entries.slice(i,i+250)});scope.postMessage({type:'done',total:entries.length})}catch(error){scope.postMessage({type:'error',message:error instanceof Error?error.message:'XML import failed'})}};
