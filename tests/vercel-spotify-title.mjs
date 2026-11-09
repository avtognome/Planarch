import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const endpointPath = path.resolve('api/spotify-title.mjs');
const endpointUrl = pathToFileURL(endpointPath).href;

const { default: handler } = await import(endpointUrl);

// Test 1: Missing or invalid URL param
{
  const req = new Request('https://example.com/api/spotify-title');
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Use an individual Spotify track URL.');
}

// Test 2: Invalid hostname or non-track URL
{
  const req = new Request('https://example.com/api/spotify-title?url=' + encodeURIComponent('https://youtube.com/watch?v=12345678901'));
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Use an individual Spotify track URL.');
}

// Test 3: Album or playlist URL rejected
{
  const req = new Request('https://example.com/api/spotify-title?url=' + encodeURIComponent('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'));
  const res = await handler(req);
  assert.equal(res.status, 400);
}

// Test 4: Successful track oEmbed resolution
{
  const validUrl = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.ok(String(url).startsWith('https://open.spotify.com/oembed'));
    return new Response(JSON.stringify({ title: 'Song Title - Artist' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const req = new Request('https://example.com/api/spotify-title?url=' + encodeURIComponent(validUrl));
    const res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'private, max-age=3600');
    const data = await res.json();
    assert.equal(data.title, 'Song Title - Artist');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 5: Upstream fetch failure returns 502
{
  const validUrl = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Error', { status: 500 });

  try {
    const req = new Request('https://example.com/api/spotify-title?url=' + encodeURIComponent(validUrl));
    const res = await handler(req);
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.error, 'Spotify title lookup is unavailable.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('PASS Vercel Spotify fallback handler conforms to API spec');
