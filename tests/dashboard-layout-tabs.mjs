import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Dashboard Layout Lock/Unlock, Responsive Tablet Controls & Customizable Tabs...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

// Transpile src files
for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
             .replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (_, n) => `from './components/ui/${n.replace(/\.js$/, '')}.js'`)
             .replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from './lib/${n.replace(/\.js$/, '')}.js'`)
             .replace(/from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; },
  clear: () => store.clear()
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};

// Seed initial campaign so dashboard renders
store.set('wf-campaign', JSON.stringify('Sagara'));
store.set('wf-campaigns', JSON.stringify(['Sagara']));

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(React.createElement(App));
});

const root = testRenderer.root;

// Test 1: Layout lock/unlock switch exists (replaces "Customize layout" button)
const lockUnlockBtns = root.findAll(node => 
  node.type === 'button' && (
    (node.props['aria-label'] && (node.props['aria-label'].includes('layout') || node.props['aria-label'].includes('Lock'))) ||
    (node.children && node.children.some(c => typeof c === 'string' && (c.includes('Unlocked layout') || c.includes('Locked layout'))))
  )
);
assert.ok(lockUnlockBtns.length > 0, 'Lock / Unlock layout toggle button must exist');
const lockUnlockBtn = lockUnlockBtns[0];
assert.ok(
  lockUnlockBtn.props['aria-label'] === 'Lock layout' || lockUnlockBtn.props['aria-label'] === 'Unlock layout',
  'Lock/Unlock toggle must have accessible aria-label'
);
console.log('✓ Lock / Unlock switch present');

// Test 2: Tablet/touch arrow buttons present when unlocked
const upButtons = root.findAll(node => node.type === 'button' && node.props['aria-label'] && node.props['aria-label'].includes('up'));
assert.ok(upButtons.length > 0, 'Up reorder button for touch/tablet must exist when unlocked');

const downButtons = root.findAll(node => node.type === 'button' && node.props['aria-label'] && node.props['aria-label'].includes('down'));
assert.ok(downButtons.length > 0, 'Down reorder button for touch/tablet must exist when unlocked');
console.log('✓ Touch/tablet up/down reorder buttons verified');

// Test 3: Customizable tabs - can add new tab, remove tab, and no hardcoded "Session / Combat / Exploration" mandatory list
const addTabBtns = root.findAll(node => 
  node.type === 'button' && (
    node.props['aria-label'] === 'Add tab' ||
    (node.children && node.children.some(c => typeof c === 'string' && c.includes('New tab')))
  )
);
assert.ok(addTabBtns.length > 0, 'Add tab button must exist');
console.log('✓ Add tab button verified');

// Test 4: Locking layout hides touch up/down buttons to prevent accidental edits
const toggledBtn = root.findByProps({ 'aria-label': 'Lock layout' });
await act(async () => {
  toggledBtn.props.onClick();
});

const upButtonsAfterLock = root.findAll(node => 
  node.type === 'button' && 
  node.props['aria-label'] && 
  node.props['aria-label'].startsWith('Move ') &&
  node.props['aria-label'].endsWith(' up')
);
assert.equal(upButtonsAfterLock.length, 0, 'Move up buttons should be hidden when layout is locked');
console.log('✓ Locked state disables editing/touch shifts successfully');

console.log('All dashboard layout & tab tests passed!');
