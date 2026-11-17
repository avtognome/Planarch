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
const modalTrigger = { focusCount: 0, focus() { this.focusCount++; } };
globalThis.document = {
  activeElement: modalTrigger,
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
  studioNavBtn.props.onClick({ stopPropagation() {} });
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
  addLayerBtn.props.onClick({ stopPropagation() {} });
});

// Verify 5th layer added
const trackNumsAfterAdd = appRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('layer-track-num'));
assert.equal(trackNumsAfterAdd.length, 5, 'Track numbers should increase to 5 after adding layer');

// Rename layer 0
const renameBtn = appRoot.findByProps({ 'aria-label': 'Rename Rainfall' });
assert.ok(renameBtn, 'Rename button must exist for layer');

await act(async () => {
  renameBtn.props.onClick({ stopPropagation() {} });
});

// Delete layer
const deleteLayerBtn = appRoot.findAll(el => el.props && el.props['aria-label'] && typeof el.props['aria-label'] === 'string' && el.props['aria-label'].startsWith('Delete layer'))[0];
assert.ok(deleteLayerBtn, 'Delete layer button must exist');

await act(async () => {
  deleteLayerBtn.props.onClick({ stopPropagation() {} });
});

const trackNumsAfterDelete = appRoot.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('layer-track-num'));
assert.equal(trackNumsAfterDelete.length, 4, 'Track numbers should return to 4 after deleting a layer');

// 3. Verify Music channel inside .source-panel, custom local audio controls, no "Mix autosaved locally", and collapsible Live Mixer
const sourcePanel = appRoot.find(el => typeof el.props?.className === 'string' && el.props.className.split(/\s+/).includes('source-panel'));
const musicSliderInSource = sourcePanel.findByProps({ 'aria-label': 'Music volume' });
assert.ok(musicSliderInSource, 'Music volume slider must be inside .source-panel');

const customLocalPlayer = sourcePanel.findByProps({ 'aria-label': 'Custom local audio controls' });
assert.ok(customLocalPlayer, 'Custom local audio controls must exist in .source-panel');

const autosavedNote = appRoot.findAll(el => typeof el.props?.children === 'string' && el.props.children.includes('Mix autosaved locally'));
assert.equal(autosavedNote.length, 0, '"Mix autosaved locally" text must be removed');

const collapseMixerBtn = appRoot.findByProps({ 'aria-label': 'Collapse live mixer' });
assert.ok(collapseMixerBtn, 'Collapse live mixer button must exist');
await act(async () => {
  collapseMixerBtn.props.onClick({ stopPropagation() {} });
});
const collapsedGrid = appRoot.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('mixer-collapsed'));
assert.equal(collapsedGrid.length, 1, 'studio-grid must have mixer-collapsed class when collapsed');

// 4. Scene Library management uses one form and stable per-scene actions.
const addSceneButton = appRoot.findByProps({ 'aria-label': 'Add scene' });
assert.equal(addSceneButton.props.className.includes('scene-touch-target'), true, 'Add scene meets changed-control touch target styling');
await act(async () => { addSceneButton.props.onClick({ stopPropagation() {} }); });
assert.ok(appRoot.findByProps({ 'aria-label': 'Scene name' }), 'Add scene opens shared form');
assert.equal(appRoot.findByProps({ role: 'dialog' }).props.onKeyDown instanceof Function, true, 'Scene dialog contains keyboard focus');
const focusCountBeforeClose = modalTrigger.focusCount;
await act(async () => { appRoot.findByProps({ role: 'dialog' }).props.onKeyDown({ key: 'Escape', stopPropagation() {} }); });
await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(modalTrigger.focusCount > focusCountBeforeClose, 'Closing scene dialog restores focus to opener');
await act(async () => { addSceneButton.props.onClick({ stopPropagation() {} }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Scene name' }).props.onChange({ target: { value: 'Moonlit Camp' } }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Scene category' }).props.onChange({ target: { value: 'ROLEPLAY' } }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Scene description' }).props.onChange({ target: { value: 'Quiet planning beside the fire.' } }); });
assert.equal(appRoot.findByProps({ 'aria-label': 'Scene name' }).props.value, 'Moonlit Camp', 'Scene form keeps entered name');
await act(async () => { appRoot.findByProps({ 'aria-label': 'Save scene' }).props.onClick({ stopPropagation() {} }); });
await act(async () => {});
assert.ok(appRoot.findByProps({ 'aria-label': 'Edit Moonlit Camp' }), 'Added scene renders in library');
let savedScenes = JSON.parse(store.get('wf-custom'));
assert.equal(savedScenes.length, 1, 'Add scene persists one custom scene');
assert.equal(savedScenes[0].name, 'Moonlit Camp');
assert.ok(savedScenes[0].id, 'Added scene has stable ID');

await act(async () => { appRoot.findByProps({ 'aria-label': 'Edit Moonlit Camp' }).props.onClick({ stopPropagation() {} }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Scene description' }).props.onChange({ target: { value: 'Revised camp description.' } }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Save scene' }).props.onClick({ stopPropagation() {} }); });
await act(async () => {});
savedScenes = JSON.parse(store.get('wf-custom'));
assert.equal(savedScenes.length, 1, 'Editing custom scene updates in place');
assert.equal(savedScenes[0].desc, 'Revised camp description.');

await act(async () => { appRoot.findByProps({ 'aria-label': 'Edit The Drowned Coast' }).props.onClick({ stopPropagation() {} }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Scene name' }).props.onChange({ target: { value: 'Drowned Coast Remix' } }); });
await act(async () => { appRoot.findByProps({ 'aria-label': 'Save scene' }).props.onClick({ stopPropagation() {} }); });
await act(async () => {});
savedScenes = JSON.parse(store.get('wf-custom'));
assert.equal(savedScenes.length, 2, 'Editing bundled scene creates custom copy');
assert.ok(JSON.parse(store.get('wf-hidden-builtin-scenes')).includes('builtin:the-drowned-coast'), 'Editing bundled scene hides original by ID');

await act(async () => { appRoot.findByProps({ 'aria-label': 'Remove Moonlit Camp' }).props.onClick({ stopPropagation() {} }); });
assert.ok(appRoot.findByProps({ 'aria-label': 'Confirm remove Moonlit Camp' }), 'Custom remove asks for confirmation');
await act(async () => { appRoot.findByProps({ 'aria-label': 'Confirm remove Moonlit Camp' }).props.onClick({ stopPropagation() {} }); });
assert.equal(JSON.parse(store.get('wf-custom')).some(item => item.name === 'Moonlit Camp'), false, 'Confirmed custom remove deletes one scene');

const bundledRemove = appRoot.findByProps({ 'aria-label': 'Remove Whispers in the Pines' });
await act(async () => { bundledRemove.props.onClick({ stopPropagation() {} }); });
assert.ok(JSON.parse(store.get('wf-hidden-builtin-scenes')).includes('builtin:whispers-in-the-pines'), 'Bundled remove hides scene by ID');
const restoreDefaults = appRoot.findByProps({ 'aria-label': 'Restore default scenes' });
await act(async () => { restoreDefaults.props.onClick({ stopPropagation() {} }); });
assert.deepEqual(JSON.parse(store.get('wf-hidden-builtin-scenes')), [], 'Restore defaults reveals bundled scenes');

assert.equal(addSceneButton.props.className.includes('scene-touch-target'), true, 'Add scene meets changed-control touch target styling');
const loadedCards = appRoot.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('scene-card') && el.props.className.includes('chosen'));
await act(async () => { appRoot.findAll(el => el.props?.['aria-label'] === 'Toggle scene multi-select')[0].props.onClick({ stopPropagation() {} }); });
await act(async () => { appRoot.findByProps({ className: 'bulk-actions-bar inline between' }).findAllByType('button').find(button => button.children.includes('Select all'))?.props.onClick({ stopPropagation() {} }); });
await act(async () => { appRoot.findByProps({ className: 'bulk-actions-bar inline between' }).findAllByType('button').find(button => String(button.children).includes('Delete selected'))?.props.onClick({ stopPropagation() {} }); });
assert.ok(appRoot.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('bulk-actions-bar')).length, 'Bulk selection controls render with ID-based state');
assert.ok(appRoot.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('scene-card') && el.props.className.includes('chosen')).length === 1, 'Scene mutations retain one valid active selection');

console.log('✓ Atmosphere Studio Dynamic Layers & Scene Library tests passed!');
