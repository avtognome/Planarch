import assert from 'node:assert/strict';

export function buildFreesoundSearchUrl(query, apiKey, page = 1) {
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

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function parseFreesoundSound(raw) {
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

// Test URL generator
const testUrl = buildFreesoundSearchUrl('tavern rain', 'test-token', 1);
assert.ok(testUrl.startsWith('https://freesound.org/apiv2/search/text/?'));
assert.ok(testUrl.includes('token=test-token'));
assert.ok(testUrl.includes('page_size=15'));
assert.ok(testUrl.includes('fields=id%2Cname%2Cdescription%2Cpreviews%2Cduration%2Clicense%2Cusername%2Ctags'));
console.log('PASS: Freesound search URL constructed with correct parameters');

// Test sound parser
const rawSound = {
  id: 12345,
  name: 'Heavy Campfire.wav',
  previews: {
    'preview-hq-mp3': 'https://freesound.org/preview/12345.mp3',
    'preview-lq-mp3': 'https://freesound.org/preview/12345-low.mp3'
  },
  duration: 65.4,
  license: 'http://creativecommons.org/publicdomain/zero/1.0/',
  username: 'soundmaster',
  tags: ['fire', 'camp', 'wood']
};

const parsed = parseFreesoundSound(rawSound);
assert.equal(parsed.id, '12345');
assert.equal(parsed.name, 'Heavy Campfire.wav');
assert.equal(parsed.previewUrl, 'https://freesound.org/preview/12345.mp3');
assert.equal(parsed.durationFormatted, '1:05');
assert.equal(parsed.author, 'soundmaster');
console.log('PASS: Freesound raw item parsed cleanly into standard schema');
