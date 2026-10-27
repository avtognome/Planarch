export const FREESOUND_API_KEY = 'NrH2cW4xrMy4Nvbt37uwVZTgoQX6mp7rbjkr2OqR';

export interface FreesoundSound {
  id: string;
  name: string;
  previewUrl: string;
  duration: number;
  durationFormatted: string;
  license: string;
  author: string;
  tags: string[];
}

export interface FreesoundSearchResponse {
  count: number;
  results: FreesoundSound[];
  next: string | null;
  previous: string | null;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function buildFreesoundSearchUrl(query: string, apiKey: string = FREESOUND_API_KEY, page: number = 1): string {
  const params = new URLSearchParams({
    query,
    token: apiKey,
    page: String(page),
    page_size: '15',
    fields: 'id,name,description,previews,duration,license,username,tags',
    filter: 'duration:[3.0 TO 300.0]'
  });
  return `https://freesound.org/apiv2/search/text/?${params.toString()}`;
}

export function parseFreesoundSound(raw: any): FreesoundSound {
  return {
    id: String(raw.id),
    name: raw.name,
    previewUrl: raw.previews?.['preview-hq-mp3'] || raw.previews?.['preview-lq-mp3'] || '',
    duration: raw.duration,
    durationFormatted: formatDuration(raw.duration),
    license: raw.license,
    author: raw.username,
    tags: raw.tags || []
  };
}

export async function searchFreesound(query: string, page: number = 1, apiKey: string = FREESOUND_API_KEY): Promise<FreesoundSearchResponse> {
  const url = buildFreesoundSearchUrl(query, apiKey, page);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Freesound request failed with status ${res.status}`);
  }
  const data = await res.json();
  return {
    count: data.count || 0,
    results: (data.results || []).map(parseFreesoundSound),
    next: data.next,
    previous: data.previous
  };
}

// IndexedDB Audio Cache
const DB_NAME = 'planarch-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in current context'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedAudioBlob(id: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openAudioDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function cacheAudioBlob(id: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openAudioDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(buffer, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to cache audio blob in IndexedDB:', e);
  }
}

export async function fetchAndCacheAudio(sound: FreesoundSound): Promise<ArrayBuffer> {
  const cached = await getCachedAudioBlob(sound.id);
  if (cached) {
    return cached;
  }
  const res = await fetch(sound.previewUrl);
  if (!res.ok) {
    throw new Error(`Failed to download audio preview: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  await cacheAudioBlob(sound.id, buf);
  return buf;
}
