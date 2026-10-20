export type ProviderSource={provider:'YouTube'|'Spotify',url:string,embed:string,identity:string};
export function parseProviderSource(input:string):ProviderSource{
 const u=new URL(input.trim());if(u.protocol!=='https:')throw Error('Use an HTTPS YouTube or Spotify link.');
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname)){
  const parts=u.pathname.split('/').filter(Boolean);
  const video=u.hostname==='youtu.be'?parts[0]:u.searchParams.get('v')||(['embed','shorts','live'].includes(parts[0])?parts[1]:'');
  const playlist=u.searchParams.get('list');
  if(video&&/^[A-Za-z0-9_-]{11}$/.test(video))return {provider:'YouTube',url:`https://www.youtube.com/watch?v=${video}`,embed:`https://www.youtube.com/embed/${video}?rel=0`,identity:`youtube:${video}`};
  if(playlist&&/^[A-Za-z0-9_-]{10,100}$/.test(playlist))return {provider:'YouTube',url:`https://www.youtube.com/playlist?list=${playlist}`,embed:`https://www.youtube.com/embed/videoseries?list=${playlist}`,identity:`youtube:playlist:${playlist}`};
  throw Error('Use a YouTube video or playlist link.');
 }
 if(u.hostname==='open.spotify.com'){
  const parts=u.pathname.split('/').filter(Boolean).filter(p=>!/^intl-/.test(p)&&p!=='embed');
  if(['track','album','playlist','episode','show','artist'].includes(parts[0])&&/^[A-Za-z0-9]{22}$/.test(parts[1]||''))return {provider:'Spotify',url:`https://open.spotify.com/${parts[0]}/${parts[1]}`,embed:`https://open.spotify.com/embed/${parts[0]}/${parts[1]}`,identity:`spotify:${parts[0]}:${parts[1]}`};
  throw Error('Use a Spotify track, album, playlist, artist, show or episode link.');
 }
 throw Error('Use a YouTube or Spotify source link.');
}
export type Scene={name:string,tag:string,art:string,desc:string,layers:number[],source?:ProviderSource,spotifyOriginal?:string};
