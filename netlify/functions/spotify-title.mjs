// Optional same-origin fallback for Spotify oEmbed metadata; no Spotify login needed.
export default async function(request){
 const raw=new URL(request.url).searchParams.get('url');let source;
 try{source=new URL(raw);if(source.protocol!=='https:'||source.hostname!=='open.spotify.com'||!/^\/track\/[A-Za-z0-9]{22}$/.test(source.pathname))throw Error()}catch{return Response.json({error:'Use an individual Spotify track URL.'},{status:400})}
 try{const upstream=await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(source.href)}`,{signal:AbortSignal.timeout(10000)});if(!upstream.ok)throw Error();const data=await upstream.json();return Response.json({title:String(data.title||'')},{headers:{'Cache-Control':'private, max-age=3600'}})}catch{return Response.json({error:'Spotify title lookup is unavailable.'},{status:502})}
}
export const config={path:'/api/spotify-title'};
