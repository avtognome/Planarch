const allowed=new Set(['image/jpeg','image/png','image/webp']);
export const MAX_WIKI_IMAGES=5;
export function validateWikiImage(file:Pick<File,'type'|'size'>){
 if(!allowed.has(file.type))throw Error('Use a JPG, PNG, or WebP image.');
 if(file.size>12*1024*1024)throw Error('Choose an image smaller than 12 MB.');
}
function readFile(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('The image could not be read.'));reader.readAsDataURL(file)})}
function loadImage(data:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('The image format could not be decoded.'));image.src=data})}
export async function prepareWikiImage(file:File){
 validateWikiImage(file);const source=await readFile(file),image=await loadImage(source);let max=1600,quality=.84,data='';
 for(let attempt=0;attempt<5;attempt++){
  const scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Image processing is unavailable in this browser.');context.drawImage(image,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',quality);
  if(data.length<=600000)return data;max=Math.round(max*.78);quality=Math.max(.58,quality-.07);
 }
 if(data.length>750000)throw Error('This image remains too large after optimization. Try a smaller image.');return data;
}
