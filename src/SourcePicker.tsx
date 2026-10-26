import { useState } from 'react';
import { Plus, Search, ArrowUpRight, Music, Check } from 'lucide-react';
import { parseProviderSource, type ProviderSource } from './sources';
import { spotifyTitle, searchYouTube, type YouTubeMatch } from './musicLookup';

export type SourceSelection = {
  provider: ProviderSource;
  name: string;
  category: string;
  keepMix: boolean;
  spotifyOriginal?: string;
};

type Props = {
  apiKey: string;
  initialLink?: string;
  initialName?: string;
  onAdd: (selection: SourceSelection) => void;
  notify: (text: string) => void;
};

export default function SourcePicker({ apiKey, initialLink = '', initialName = '', onAdd, notify }: Props) {
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState(initialLink);
  const [category, setCategory] = useState('EXPLORATION');
  const [keepMix, setKeepMix] = useState(true);
  const [trackQuery, setTrackQuery] = useState('');
  const [matches, setMatches] = useState<YouTubeMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');

  let parsed: ProviderSource | undefined;
  try { parsed = parseProviderSource(link); } catch { /* Wait for a complete URL. */ }
  const spotify = parsed?.provider === 'Spotify';
  const add = (provider: ProviderSource, original?: string) => onAdd({
    provider,
    name: name.trim() || trackQuery.trim(),
    category,
    keepMix,
    spotifyOriginal: original,
  });

  const lookup = async () => {
    setBusy(true);
    setMessage('');
    setMatches([]);
    try {
      const query = trackQuery.trim() || await spotifyTitle(link);
      setTrackQuery(query);
      if (!apiKey.trim()) {
        setMessage('Song title loaded. Add a YouTube API key in Settings for automatic results, or open the title search below and paste your chosen video.');
        return;
      }
      const results = await searchYouTube(`${query} official audio`, apiKey);
      setMatches(results);
      if (!results.length) setMessage('No matching videos returned. Edit the title/artist or choose a video manually.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lookup failed. Enter the song title and artist.');
    } finally {
      setBusy(false);
    }
  };

  const acceptYouTube = (url: string) => {
    try {
      const provider = parseProviderSource(url);
      if (provider.provider !== 'YouTube') throw Error('Choose a YouTube video link.');
      add(provider, parsed?.url);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Use a valid YouTube video link.');
    }
  };

  return <>
    <h2>Add an atmosphere source</h2>
    <p>YouTube sources can be loaded into either mixer deck and played together. Spotify links are matched to a full YouTube version, so no Spotify artwork is embedded.</p>
    <label>Scene title<input autoFocus aria-label="Scene title" value={name} onChange={event => setName(event.target.value)} placeholder="Rainy tavern · evening" /></label>
    <label>Source link<input aria-label="Source link" value={link} onChange={event => { setLink(event.target.value); setMatches([]); setMessage(''); setTrackQuery(''); setYoutubeLink(''); }} placeholder="YouTube video / playlist or Spotify link" /></label>
    <label>Scene category<select aria-label="Scene category" value={category} onChange={event => setCategory(event.target.value)}>{['EXPLORATION', 'ROLEPLAY', 'TENSION', 'COMBAT'].map(tag => <option key={tag}>{tag}</option>)}</select></label>
    <label className="checkbox-field"><input type="checkbox" aria-label="Include the current ambience layer mix" checked={keepMix} onChange={event => setKeepMix(event.target.checked)} />Include the current ambience layer mix</label>
    {spotify ? <div className="music-matching">
      <div className="inline"><Music size={16} /><h3>Spotify → YouTube</h3></div>
      <p>Lookup uses the song title. Add the artist to avoid covers or songs with the same name, then confirm the version you want.</p>
      <label>Song title &amp; artist<input aria-label="Song title and artist" value={trackQuery} onChange={event => setTrackQuery(event.target.value)} placeholder="Title — Artist" /></label>
      <button className="primary" disabled={busy} onClick={lookup}><Search size={15} />{busy ? 'Looking up…' : 'Find YouTube matches'}</button>
      {message && <p role="status" className="lookup-message">{message}</p>}
      {matches.map(match => <div className="youtube-match" key={match.id}><div><strong>{match.title}</strong><small>{match.channel}</small><a href={match.url} target="_blank" rel="noreferrer">Listen on YouTube <ArrowUpRight size={12} /></a></div><button className="secondary" onClick={() => acceptYouTube(match.url)}><Check size={14} />Use this version</button></div>)}
      {trackQuery && <a className="youtube-search-link" target="_blank" rel="noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(trackQuery + ' official audio')}`}>Search this song on YouTube <ArrowUpRight size={13} /></a>}
      <label>Chosen YouTube video<input aria-label="Chosen YouTube video" value={youtubeLink} onChange={event => setYoutubeLink(event.target.value)} placeholder="Paste the matching YouTube video link" /></label>
      <button className="secondary" disabled={!youtubeLink.trim()} onClick={() => acceptYouTube(youtubeLink)}><Plus size={15} />Use chosen YouTube video</button>
    </div> : <button className="primary" disabled={!link.trim()} onClick={() => { try { add(parseProviderSource(link)); } catch (error) { notify(error instanceof Error ? error.message : 'Enter a valid source link'); } }}><Plus size={16} />Add to scene library</button>}
  </>;
}
