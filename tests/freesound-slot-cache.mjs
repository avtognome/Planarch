import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Freesound slot caching & reset behavior...');

// Transpile src files
const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '').replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

// Track mock AudioContext and created buffer types
const createdSources = [];
class MockBufferSource {
  buffer = null;
  loop = false;
  connect(dest) { return dest; }
  start() {
    createdSources.push({ type: this.buffer?.__isCustom ? 'custom' : 'procedural', buffer: this.buffer });
  }
  stop() {}
  disconnect() {}
}

class MockGainNode {
  gain = {
    value: 1,
    setTargetAtTime() {}
  };
  connect() {}
}

class MockBiquadFilter {
  type = 'lowpass';
  frequency = { value: 1000 };
  connect(dest) { return dest; }
}

class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  destination = {};
  state = 'running';
  createGain() { return new MockGainNode(); }
  createBuffer(channels, length, rate) {
    return {
      length,
      getChannelData() { return new Float32Array(length); }
    };
  }
  createBufferSource() { return new MockBufferSource(); }
  createBiquadFilter() { return new MockBiquadFilter(); }
  decodeAudioData(arrayBuffer) {
    return Promise.resolve({
      __isCustom: true,
      length: arrayBuffer.byteLength
    });
  }
  resume() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; }
};

globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

store.set('wf-campaigns', JSON.stringify(['TestCampaign']));
store.set('wf-campaign', JSON.stringify('TestCampaign'));
store.set('wf-layers', JSON.stringify([72, 36, 48, 0]));

let appRenderer;
await act(async () => {
  appRenderer = TestRenderer.create(React.createElement(App));
});

// Navigate to Atmosphere Studio
const studioNavBtn = appRenderer.root.findAllByType('button').find(b => {
  const txt = b.children?.filter(c => typeof c === 'string').join('') || '';
  return txt.includes('Atmosphere Studio');
});
assert.ok(studioNavBtn, 'Must find Atmosphere Studio button');

await act(async () => {
  studioNavBtn.props.onClick();
});

// Start audio so audio context and layer gains are instantiated
const playSceneBtn = appRenderer.root.findAllByType('button').find(b => {
  const txt = b.children?.filter(c => typeof c === 'string').join('') || '';
  return txt.includes('Play scene') || txt.includes('Play ambience');
});
assert.ok(playSceneBtn, 'Must find Play scene button');

await act(async () => {
  await playSceneBtn.props.onClick();
});

// Initial sources created should all be procedural (4 layers)
assert.equal(createdSources.length, 4);
assert.ok(createdSources.every(s => s.type === 'procedural'), 'Initial 4 layers must be procedural');

// Open Freesound modal for slot 0
await act(async () => {
  const pickSoundBtn = appRenderer.root.findByProps({ 'aria-label': 'Change sound for Rainfall' });
  pickSoundBtn.props.onClick();
});

// In FreesoundModal, simulate onSelectSound with mock buffer
const { FreesoundModal } = await import(pathToFileURL(path.join(out, 'FreesoundModal.js')).href);
const modalInstance = appRenderer.root.findByType(FreesoundModal);
assert.ok(modalInstance, 'FreesoundModal must be open');

const mockSound = { id: '99999', name: 'Rain on Roof.mp3', previewUrl: '' };
const mockBuffer = new ArrayBuffer(1024);

await act(async () => {
  await modalInstance.props.onSelectSound(mockSound, mockBuffer);
});

// Check that the newest source created for slot 0 is CUSTOM (NOT procedural!)
const latestSource = createdSources[createdSources.length - 1];
assert.equal(latestSource.type, 'custom', 'Newly loaded sound must be decoded as custom audio, not fallback procedural');
console.log('PASS Caching Freesound: slot immediately plays decoded custom audio');

// Now click Reset button for slot 0
await act(async () => {
  const resetBtn = appRenderer.root.findByProps({ 'aria-label': 'Reset Rain on Roof.mp3 to default' });
  assert.ok(resetBtn, 'Reset button must be visible for custom layer');
  await resetBtn.props.onClick();
});

// Check that the source created after reset is PROCEDURAL (NOT the cached custom sound!)
const resetSource = createdSources[createdSources.length - 1];
assert.equal(resetSource.type, 'procedural', 'Resetting slot must return layer to procedural audio');
console.log('PASS Resetting slot: slot immediately returns to procedural audio');
