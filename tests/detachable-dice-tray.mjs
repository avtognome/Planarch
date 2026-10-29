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
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  innerWidth: 1200,
  innerHeight: 800
};
globalThis.document = {
  querySelector() { return null; },
  getElementById() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Detachable, Movable & Always-On-Top Dice Tray Widget...');

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

// Set up clean campaign state
store.set('wf-campaign', JSON.stringify('Sagara'));
store.set('wf-campaigns', JSON.stringify(['Sagara']));

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(React.createElement(App));
});

const root = testRenderer.root;

// 1. Find detach button in dice tray widget controls
const detachBtn = root.findByProps({ 'aria-label': 'Detach Dice tray widget' });
assert.ok(detachBtn, 'Detach button should exist in Dice tray widget controls');

// 2. Click detach button
await act(async () => {
  detachBtn.props.onClick();
});

// 3. Floating dice tray should now exist with floating-dice-tray class and high z-index
const floatingTray = root.find(el => typeof el.props.className === 'string' && el.props.className.includes('floating-dice-tray'));
assert.ok(floatingTray, 'Floating dice tray element should be rendered when detached');
assert.equal(floatingTray.props.style.position, 'fixed');
assert.equal(floatingTray.props.style.zIndex, 9990, 'Must stay on top with z-index 9990');

// Test typing into dice expression input while detached
const diceInput = floatingTray.findByProps({ 'aria-label': 'Dice expression' });
assert.ok(diceInput, 'Dice expression input exists inside floating dice tray');
await act(async () => {
  diceInput.props.onChange({ target: { value: '3d8+4' } });
});
assert.equal(diceInput.props.value, '3d8+4', 'Input must update when typed while detached');

// 4. Test dragging / moving
const floatingHead = root.find(el => typeof el.props.className === 'string' && el.props.className.includes('floating-head'));
assert.ok(floatingHead, 'Floating header exists as drag handle');

let captured = false;
const fakeTarget = {
  closest: () => null,
  setPointerCapture: () => { captured = true; },
  releasePointerCapture: () => { captured = false; }
};

// Pointer down to initiate drag
await act(async () => {
  floatingHead.props.onPointerDown({
    clientX: 100,
    clientY: 150,
    pointerId: 1,
    target: fakeTarget,
    currentTarget: fakeTarget
  });
});
assert.equal(captured, true, 'Pointer capture acquired on drag start');

// Pointer move by (+50, +30)
await act(async () => {
  floatingHead.props.onPointerMove({
    clientX: 150,
    clientY: 180,
    pointerId: 1,
    target: fakeTarget,
    currentTarget: fakeTarget
  });
});

// Check updated position in styles
const updatedTray = root.find(el => typeof el.props.className === 'string' && el.props.className.includes('floating-dice-tray'));
assert.equal(updatedTray.props.style.left, `${32 + 50}px`, 'Left position updated by delta X');
assert.equal(updatedTray.props.style.top, `${120 + 30}px`, 'Top position updated by delta Y');

// Pointer up to complete drag
await act(async () => {
  floatingHead.props.onPointerUp({
    pointerId: 1,
    currentTarget: fakeTarget
  });
});
assert.equal(captured, false, 'Pointer capture released on drag end');

// 5. Test dock button
const dockBtn = root.findByProps({ 'aria-label': 'Dock Dice tray widget' });
assert.ok(dockBtn, 'Dock button should exist on floating dice tray');

await act(async () => {
  dockBtn.props.onClick();
});

// Floating tray should be gone after docking
assert.equal(root.findAll(el => typeof el.props.className === 'string' && el.props.className.includes('floating-dice-tray')).length, 0);

console.log('✓ Detachable, Movable & Always-On-Top Dice Tray Widget verified!');
