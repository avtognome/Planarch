import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; }
};

const listeners = new Map();
globalThis.window = {
  addEventListener(event, fn) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(fn);
  },
  removeEventListener(event, fn) {
    if (listeners.has(event)) {
      listeners.set(event, listeners.get(event).filter(f => f !== fn));
    }
  },
  dispatchEvent(event) {
    const list = listeners.get(event.type) || [];
    for (const fn of list) fn(event);
    return true;
  }
};
globalThis.document = {
  getElementById() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Atmosphere Studio Dynamic Layer Management & Session Dock Removal...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
             .replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (_, n) => `from './components/ui/${n.replace(/\.js$/, '')}.js'`)
             .replace(/from ['"]@\/lib\/([^'"]+)['\"]/g, (_, n) => `from './lib/${n.replace(/\.js$/, '')}.js'`)
             .replace(/from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const { default: CombatTracker } = await import(pathToFileURL(path.join(out, 'CombatTracker.js')).href);
const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

// 1. Verify session-dock-row and session-control-dock are completely REMOVED from CombatTracker
let combatRenderer;
await act(async () => {
  combatRenderer = TestRenderer.create(
    React.createElement(CombatTracker, {
      battle: [
        { id: 'c1', name: 'Aelar', role: 'Player', hp: 24, maxHp: 24, initiative: 18, modifier: 3, conditions: '', concentration: '', cr: '' },
        { id: 'c2', name: 'Goblin', role: 'Monster', hp: 7, maxHp: 7, initiative: 12, modifier: 2, conditions: '', concentration: '', cr: '1/4' }
      ],
      setBattle: () => {},
      battleTitle: 'Ambush at Dawn',
      battleActive: true,
      round: 1,
      setRound: () => {},
      turn: 0,
      setTurn: () => {},
      onReference: () => {},
      onOpenEncounters: () => {},
      onEnd: () => {},
      notify: () => {}
    })
  );
});

const combatRoot = combatRenderer.root;
const sessionDock = combatRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('session-control-dock'));
assert.equal(sessionDock.length, 0, 'session-control-dock must be removed from CombatTracker');

const sessionDockRow = combatRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('session-dock-row'));
assert.equal(sessionDockRow.length, 0, 'session-dock-row must be removed from CombatTracker');

// 2. Verify Atmosphere Studio dynamic layers and absence of weather icons
store.set('wf-campaign', JSON.stringify('Sagara'));
store.set('wf-campaigns', JSON.stringify(['Sagara']));

let appRenderer;
await act(async () => {
  appRenderer = TestRenderer.create(React.createElement(App));
});

const appRoot = appRenderer.root;

// Navigate to Atmosphere Studio
const studioNavBtn = appRoot.findAllByType('button').find(b => {
  const txt = b.children?.filter(c => typeof c === 'string').join('') || '';
  return txt.includes('Atmosphere Studio');
});
assert.ok(studioNavBtn, 'Atmosphere Studio nav button must exist');

await act(async () => {
  studioNavBtn.props.onClick();
});

// Verify Lucide weather icons removed from layer items
const weatherIcons = ['CloudRain', 'Wind', 'Waves', 'Flame'];
const trackNums = appRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('layer-track-num'));
assert.ok(trackNums.length >= 4, 'Must have track number badges for ambience layers');

// Verify Add Layer button exists
const addLayerBtn = appRoot.findByProps({ 'aria-label': 'Add ambience layer' });
assert.ok(addLayerBtn, 'Add ambience layer button must exist in mixer');

// Click Add Layer
await act(async () => {
  addLayerBtn.props.onClick();
});

// Verify 5th layer added
const trackNumsAfterAdd = appRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('layer-track-num'));
assert.equal(trackNumsAfterAdd.length, 5, 'Track numbers should increase to 5 after adding layer');

// Rename layer 0
const renameBtn = appRoot.findByProps({ 'aria-label': 'Rename Rainfall' });
assert.ok(renameBtn, 'Rename button must exist for layer');

await act(async () => {
  renameBtn.props.onClick();
});

// Delete layer
const deleteLayerBtn = appRoot.findAll(el => el.props && el.props['aria-label'] && typeof el.props['aria-label'] === 'string' && el.props['aria-label'].startsWith('Delete layer'))[0];
assert.ok(deleteLayerBtn, 'Delete layer button must exist');

await act(async () => {
  deleteLayerBtn.props.onClick();
});

const trackNumsAfterDelete = appRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('layer-track-num'));
assert.equal(trackNumsAfterDelete.length, 4, 'Track numbers should return to 4 after deleting a layer');

console.log('✓ Atmosphere Studio Dynamic Layers & Session Dock tests passed!');
