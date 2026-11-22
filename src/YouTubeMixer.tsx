import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ExternalLink, Music2, Pause, Play, SlidersHorizontal, X } from 'lucide-react';
import type { Scene } from './sources';

type Player = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (value: number) => void;
};
type PlayerEvent = { data: number };
type PlayerOptions = {
  videoId?: string;
  width: string;
  height: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: () => void;
    onStateChange: (event: PlayerEvent) => void;
    onError: () => void;
  };
};
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: PlayerOptions) => Player;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeAPI> | undefined;
function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise(resolve => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[data-archeron-youtube],script[data-planarch-youtube]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.archeronYoutube = 'true';
      script.dataset.planarchYoutube = 'true';
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export type YouTubeMixerProps = {
  sources: Scene[];
  deckA: string;
  deckB: string;
  setDeckA: (value: string) => void;
  setDeckB: (value: string) => void;
  volumeA: number;
  volumeB: number;
  setVolumeA: (value: number) => void;
  setVolumeB: (value: number) => void;
  master: number;
  crossfade: number;
  setMaster: (value: number) => void;
  setCrossfade: (value: number) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  stopSignal: number;
};

function Deck({
  label,
  sourceId,
  setSourceId,
  sources,
  volume,
  setVolume,
  effective,
  onPlayer,
}: {
  label: 'A' | 'B';
  sourceId: string;
  setSourceId: (value: string) => void;
  sources: Scene[];
  volume: number;
  setVolume: (value: number) => void;
  effective: number;
  onPlayer: (player: Player | null) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const scene = sources.find(item => item.source?.identity === sourceId);
  const identity = scene?.source?.identity || '';

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setPlaying(false);
    setError('');
    player.current?.destroy();
    player.current = null;
    onPlayer(null);
    const wrapper = host.current;
    if (!wrapper || !identity) {
      if (wrapper) wrapper.innerHTML = '';
      return;
    }
    const mount = document.createElement('div');
    wrapper.innerHTML = '';
    wrapper.appendChild(mount);
    void loadYouTubeAPI().then(YT => {
      if (cancelled) return;
      const parts = identity.split(':');
      const playlist = parts[1] === 'playlist';
      const id = playlist ? parts.slice(2).join(':') : parts[1];
      const created = new YT.Player(mount, {
        width: '100%',
        height: '200',
        ...(playlist ? {} : { videoId: id }),
        playerVars: {
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          ...(playlist ? { listType: 'playlist', list: id } : {}),
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            player.current = created;
            created.setVolume(effective);
            setReady(true);
            onPlayer(created);
          },
          onStateChange: event => {
            if (cancelled) return;
            setPlaying(event.data === YT.PlayerState.PLAYING);
          },
          onError: () => setError('This video cannot be played in the embedded mixer.'),
        },
      });
    });
    return () => {
      cancelled = true;
      onPlayer(null);
      player.current?.destroy();
      player.current = null;
      if (wrapper) wrapper.innerHTML = '';
    };
  }, [identity]);

  useEffect(() => {
    if (ready) player.current?.setVolume(Math.round(effective));
  }, [effective, ready]);

  const toggle = () => {
    if (!player.current) return;
    if (playing) player.current.pauseVideo();
    else player.current.playVideo();
  };

  return (
    <section className={`youtube-deck deck-${label.toLowerCase()}`}>
      <div className="youtube-deck-title">
        <span>DECK {label}</span>
        <i className={playing ? 'playing' : ''} />
      </div>
      <select aria-label={`YouTube deck ${label} source`} value={sourceId} onChange={e => setSourceId(e.target.value)}>
        <option value="">Choose a YouTube source…</option>
        {sources.map(item => (
          <option key={item.source!.identity} value={item.source!.identity}>
            {item.name}
          </option>
        ))}
      </select>
      <div className={`youtube-player-shell ${identity ? '' : 'empty'}`}>
        {identity ? <div ref={host} /> : <><Music2 size={27} /><span>Load a source from the scene library</span></>}
      </div>
      {error && <small className="youtube-mixer-error">{error}</small>}
      <div className="youtube-deck-controls">
        <button className="youtube-transport" disabled={!ready} aria-label={`${playing ? 'Pause' : 'Play'} deck ${label}`} onClick={toggle}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <label>
          <span>Channel {volume}%</span>
          <input aria-label={`YouTube deck ${label} volume`} type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)} />
        </label>
        <strong>{Math.round(effective)}%</strong>
      </div>
      {scene?.source && (
        <a href={scene.source.url} target="_blank" rel="noreferrer">
          Open on YouTube <ExternalLink size={11} />
        </a>
      )}
    </section>
  );
}

const STORAGE_POS_KEY = 'wf-youtube-mixer-pos';

export default function YouTubeMixer(props: YouTubeMixerProps) {
  const players = useRef<{ A: Player | null; B: Player | null }>({ A: null, B: null });
  const dockRef = useRef<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // ignore JSON parse errors in SSR or restricted environments
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; dockX: number; dockY: number } | null>(null);

  const sources = props.sources.filter(item => item.source?.provider === 'YouTube');
  const fadeA = Math.min(1, (100 - props.crossfade) / 50);
  const fadeB = Math.min(1, props.crossfade / 50);
  const effectiveA = (props.volumeA * props.master / 100) * fadeA;
  const effectiveB = (props.volumeB * props.master / 100) * fadeB;

  const pauseBoth = () => {
    players.current.A?.pauseVideo();
    players.current.B?.pauseVideo();
  };
  const playBoth = () => {
    players.current.A?.playVideo();
    players.current.B?.playVideo();
  };

  useEffect(() => {
    if (props.stopSignal) pauseBoth();
  }, [props.stopSignal]);

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    if (!dockRef.current) return;

    const rect = dockRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      dockX: rect.left,
      dockY: rect.top,
    };
    setIsDragging(true);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!dragStartRef.current || !dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      const dx = moveEv.clientX - dragStartRef.current.startX;
      const dy = moveEv.clientY - dragStartRef.current.startY;
      const maxX = Math.max(0, window.innerWidth - rect.width - 8);
      const maxY = Math.max(0, window.innerHeight - rect.height - 8);
      const newX = Math.max(8, Math.min(maxX, dragStartRef.current.dockX + dx));
      const newY = Math.max(8, Math.min(maxY, dragStartRef.current.dockY + dy));
      setPosition({ x: newX, y: newY });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDragging(false);
      if (dragStartRef.current && dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        const dx = upEv.clientX - dragStartRef.current.startX;
        const dy = upEv.clientY - dragStartRef.current.startY;
        const maxX = Math.max(0, window.innerWidth - rect.width - 8);
        const maxY = Math.max(0, window.innerHeight - rect.height - 8);
        const finalX = Math.max(8, Math.min(maxX, dragStartRef.current.dockX + dx));
        const finalY = Math.max(8, Math.min(maxY, dragStartRef.current.dockY + dy));
        const finalPos = { x: finalX, y: finalY };
        setPosition(finalPos);
        try {
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(finalPos));
        } catch {}
      }
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (!props.open || !sources.length) return null;

  const dockStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : {};

  return (
    <aside
      ref={dockRef}
      className={`youtube-mixer-dock ${collapsed ? 'collapsed' : ''}`}
      style={dockStyle}
      aria-label="YouTube two-channel mixer"
    >
      <header
        onPointerDown={onHeaderPointerDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        <div>
          <SlidersHorizontal size={16} />
          <div>
            <strong>YouTube mix</strong>
            <small>Two-channel player</small>
          </div>
        </div>
        <div>
          <button className="icon-button" aria-label="Play both YouTube decks" onClick={playBoth}>
            <Play size={15} />
          </button>
          <button className="icon-button" aria-label="Pause both YouTube decks" onClick={pauseBoth}>
            <Pause size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={collapsed ? 'Expand YouTube mixer' : 'Collapse YouTube mixer'}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronDown size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Close YouTube mixer"
            onClick={() => {
              pauseBoth();
              props.setOpen(false);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="youtube-mixer-body">
        <div className="youtube-decks">
          <Deck
            label="A"
            sourceId={props.deckA}
            setSourceId={props.setDeckA}
            sources={sources}
            volume={props.volumeA}
            setVolume={props.setVolumeA}
            effective={effectiveA}
            onPlayer={player => {
              players.current.A = player;
            }}
          />
          <Deck
            label="B"
            sourceId={props.deckB}
            setSourceId={props.setDeckB}
            sources={sources}
            volume={props.volumeB}
            setVolume={props.setVolumeB}
            effective={effectiveB}
            onPlayer={player => {
              players.current.B = player;
            }}
          />
        </div>
        <div className="youtube-mix-controls">
          <label>
            <span><b>A</b> Crossfade <b>B</b></span>
            <input aria-label="YouTube crossfader" type="range" min={0} max={100} value={props.crossfade} onChange={e => props.setCrossfade(+e.target.value)} />
          </label>
          <label>
            <span>Music master <strong>{props.master}%</strong></span>
            <input aria-label="YouTube mixer master volume" type="range" min={0} max={100} value={props.master} onChange={e => props.setMaster(+e.target.value)} />
          </label>
        </div>
        <p>Channel volume × crossfade × music master determines each deck’s final output.</p>
      </div>
    </aside>
  );
}
