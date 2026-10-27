import React, { useState } from 'react';
import { Search, Play, Pause, Download, AlertCircle, Loader2, X, Volume2 } from 'lucide-react';
import { searchFreesound, fetchAndCacheAudio, type FreesoundSound } from './freesound';

interface FreesoundModalProps {
  onClose: () => void;
  onSelectSound: (sound: FreesoundSound, buffer: ArrayBuffer) => void;
  targetLayerIndex?: number;
}

const PRESET_QUERIES = [
  'Rain roof',
  'Campfire crackle',
  'Tavern crowd',
  'Deep ocean',
  'Wind trees',
  'Dungeon drip',
  'Cathedral chant'
];

export function FreesoundModal({ onClose, onSelectSound, targetLayerIndex }: FreesoundModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FreesoundSound[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const performSearch = async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchFreesound(term);
      setResults(res.results);
      if (res.results.length === 0) {
        setError('No sounds found. Try another search term.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search Freesound. Check internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performSearch(query);
    }
  };

  const togglePreview = (sound: FreesoundSound) => {
    if (previewingId === sound.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(sound.previewUrl);
    audio.volume = 0.8;
    audio.play().catch(e => {
      console.warn('Audio preview playback failed:', e);
    });
    audio.onended = () => setPreviewingId(null);
    audioRef.current = audio;
    setPreviewingId(sound.id);
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPreviewingId(null);
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handleImport = async (sound: FreesoundSound) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setDownloadingId(sound.id);
    setError(null);
    try {
      const buffer = await fetchAndCacheAudio(sound);
      onSelectSound(sound, buffer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download and cache audio.');
      setDownloadingId(null);
    }
  };

  return (
    <div className="modal-overlay modal-backdrop" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="modal-content modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        {/* Header */}
        <div className="inline between" style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
              Freesound Library {targetLayerIndex !== undefined ? `· Slot ${targetLayerIndex + 1}` : ''}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Search CC-licensed community ambiences with offline caching
            </p>
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="tool-search" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 12px', marginBottom: '12px' }}>
          <Search size={16} style={{ color: 'var(--muted)', marginRight: '8px' }} />
          <input
            type="text"
            aria-label="Search Freesound"
            placeholder="Search rain, campfire, wind, tavern, dungeon…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, background: 'transparent', border: 0, color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
          />
          <button className="primary" onClick={() => performSearch(query)} disabled={loading} style={{ padding: '4px 12px', fontSize: '12px' }}>
            {loading ? <Loader2 size={13} className="spin" /> : 'Search'}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="inline" style={{ flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {PRESET_QUERIES.map(q => (
            <button
              key={q}
              className="secondary"
              onClick={() => {
                setQuery(q);
                performSearch(q);
              }}
              style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '12px', height: 'auto' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="inline" style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', marginBottom: '12px', gap: '8px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: '8px', minHeight: '180px' }}>
              <Loader2 size={24} className="spin" />
              <span>Fetching sounds from Freesound.org…</span>
            </div>
          ) : results.length > 0 ? (
            results.map(sound => (
              <div
                key={sound.id}
                className="inline between"
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                  <div className="inline" style={{ gap: '6px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sound.name}
                    </strong>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                      {sound.durationFormatted}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    by {sound.author} · {sound.tags.slice(0, 3).join(', ')}
                  </div>
                </div>

                <div className="inline" style={{ gap: '8px' }}>
                  <button
                    className="icon-button"
                    aria-label={previewingId === sound.id ? `Stop preview ${sound.name}` : `Preview ${sound.name}`}
                    onClick={() => togglePreview(sound)}
                    title={previewingId === sound.id ? 'Stop preview' : 'Play preview'}
                  >
                    {previewingId === sound.id ? <Pause size={15} /> : <Play size={15} />}
                  </button>

                  <button
                    className="primary"
                    disabled={downloadingId === sound.id}
                    onClick={() => handleImport(sound)}
                    style={{ fontSize: '11px', padding: '5px 10px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {downloadingId === sound.id ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                    {downloadingId === sound.id ? 'Caching…' : 'Load Layer'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', minHeight: '180px', textAlign: 'center' }}>
              <Volume2 size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Explore atmospheric loops & background sfx</p>
              <small>Click a chip above or type in the search bar</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
