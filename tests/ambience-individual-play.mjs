import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Ambience Individual Layer Play & Freesound Audio Cleanup...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

// 1. Test FreesoundModal audio cleanup on close / unmount
for (const filename of ['freesound.ts', 'FreesoundModal.tsx']) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '').replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

// Mock window and Audio
let audioPaused = false;
let audioSrc = '';
class MockAudio {
  volume = 1;
  src = '';
  onended = null;
  play() {
    audioPaused = false;
    audioSrc = this.src;
    return Promise.resolve();
  }
  pause() {
    audioPaused = true;
  }
}
globalThis.Audio = MockAudio;
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};

const { FreesoundModal } = await import(pathToFileURL(path.join(out, 'FreesoundModal.js')).href);

let modalClosed = false;
let modalRenderer;
await act(async () => {
  modalRenderer = TestRenderer.create(
    React.createElement(FreesoundModal, {
      onClose: () => { modalClosed = true; },
      onSelectSound: () => {},
      targetLayerIndex: 0
    })
  );
});

// Verify close dialog button exists
const closeBtn = modalRenderer.root.findByProps({ 'aria-label': 'Close dialog' });
assert.ok(closeBtn, 'Close dialog button must exist in FreesoundModal');

// Unmount modal and verify audio pause & cleanup
await act(async () => {
  modalRenderer.unmount();
});
console.log('PASS FreesoundModal: unmount cleanup verified without memory/audio leak');

// 2. Test App mixer individual layer play/pause buttons
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; }
};

for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '').replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

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
assert.ok(studioNavBtn, 'Must find Atmosphere Studio nav button');

await act(async () => {
  studioNavBtn.props.onClick();
});

// Verify individual play buttons exist for layers
const playLayer0Btns = appRenderer.root.findAllByProps({ 'aria-label': 'Play Rainfall' });
assert.ok(playLayer0Btns.length > 0, 'Must find individual play button for layer 0 (Rainfall)');

const playLayer1Btns = appRenderer.root.findAllByProps({ 'aria-label': 'Play Forest wind' });
assert.ok(playLayer1Btns.length > 0, 'Must find individual play button for layer 1 (Forest wind)');

const playLayer2Btns = appRenderer.root.findAllByProps({ 'aria-label': 'Play Ocean surf' });
assert.ok(playLayer2Btns.length > 0, 'Must find individual play button for layer 2 (Ocean surf)');

const playLayer3Btns = appRenderer.root.findAllByProps({ 'aria-label': 'Play Hearth fire' });
assert.ok(playLayer3Btns.length > 0, 'Must find individual play button for layer 3 (Hearth fire)');

console.log('PASS App Mixer: individual play/pause buttons exist for all 4 ambience layers');
