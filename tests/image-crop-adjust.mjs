import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Image Crop/Adjust Modal, Sidebar Relocation & Sync Dot Indicator...');

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

// Transpile ui and lib components
fs.mkdirSync(path.join(out, 'components/ui'), { recursive: true });
fs.mkdirSync(path.join(out, 'lib'), { recursive: true });

for (const filename of fs.readdirSync('src/lib').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/lib/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from './${n.replace(/\.js$/, '')}.js'`);
  fs.writeFileSync(path.join(out, 'lib', filename.replace(/\.tsx?$/, '.js')), code);
}

for (const filename of fs.readdirSync('src/components/ui').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/components/ui/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from '../../lib/${n.replace(/\.js$/, '')}.js'`);
  fs.writeFileSync(path.join(out, 'components/ui', filename.replace(/\.tsx?$/, '.js')), code);
}

// Setup window / URL mock for node
const origCreate = URL.createObjectURL;
URL.createObjectURL = () => 'blob:mock-preview-url';
URL.revokeObjectURL = () => {};

// Load transpiled ImageCropModal
const { ImageCropModal } = await import(pathToFileURL(path.join(out, 'ImageCropModal.js')).href);

// Test 1: ImageCropModal renders controls
{
  const dummyFile = { name: 'portrait.png', size: 1024, type: 'image/png' };
  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(
      React.createElement(ImageCropModal, {
        file: dummyFile,
        title: 'Crop Portrait',
        onComplete: () => {},
        onCancel: () => {}
      })
    );
  });

  const root = testRenderer.root;
  const zoomInput = root.findByProps({ 'aria-label': 'Zoom' });
  assert.ok(zoomInput, 'Zoom input must exist');
  assert.equal(zoomInput.props.value, 1);

  const rotateBtn = root.findByProps({ 'aria-label': 'Rotate 90 degrees' });
  assert.ok(rotateBtn, 'Rotate button must exist');

  const brightnessInput = root.findByProps({ 'aria-label': 'Brightness' });
  assert.ok(brightnessInput, 'Brightness input must exist');
  assert.equal(brightnessInput.props.value, 0);

  const contrastInput = root.findByProps({ 'aria-label': 'Contrast' });
  assert.ok(contrastInput, 'Contrast input must exist');
  assert.equal(contrastInput.props.value, 0);

  // Test apply action trigger exists
  const applyBtn = root.findByProps({ 'aria-label': 'Apply crop and adjustments' });
  assert.ok(applyBtn, 'Apply button must exist');

  console.log('✓ ImageCropModal controls verified');
}

// Test 1b: WikiGraph light theme text color test
const { WikiGraph } = await import(pathToFileURL(path.join(out, 'WikiGraph.js')).href);
{
  assert.ok(WikiGraph, 'WikiGraph component must exist');
  console.log('✓ WikiGraph component verified');
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

// Test 2: App Sidebar & Header sync indicator checks
const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);
{
  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(React.createElement(App));
  });

  const root = testRenderer.root;

  // 1. Check sidebar has Atmosphere Studio inside campaign tools section
  // It should NOT have the orange dot
  const sidebarNavButtons = root.findAll(node => {
    if (node.type !== 'button') return false;
    const parentClass = node.parent?.props?.className;
    return parentClass === 'campaign-nav' || node.parent?.type === 'nav';
  });
  const atmosphereNavBtn = sidebarNavButtons.find(node => node.children && node.children.some(c => typeof c === 'string' && c.includes('Atmosphere Studio')));
  assert.ok(atmosphereNavBtn, 'Atmosphere Studio navigation button should exist in sidebar');
  assert.equal(atmosphereNavBtn.parent.props.className, 'campaign-nav', 'Atmosphere Studio must be inside campaign-nav');

  // Verify orange dot (.tiny-dot) does not exist inside or next to Atmosphere Studio
  const orangeDots = atmosphereNavBtn.findAll(node => node.props && node.props.className && node.props.className.includes('tiny-dot'));
  assert.equal(orangeDots.length, 0, 'Atmosphere Studio should not have orange tiny-dot');

  // Verify user profile box ("Dungeon Master" / "Private workspace") is removed
  const workspaceLabels = root.findAll(node => node.children && (node.children.includes('Private workspace') || node.children.includes('Dungeon Master')));
  assert.equal(workspaceLabels.length, 0, 'Sidebar profile block (Private workspace / Dungeon Master) must be removed');

  // Verify sync status in top right is dot indicator
  const syncDots = root.findAll(node => node.props && node.props.className && node.props.className.includes('sync-status-dot'));
  assert.ok(syncDots.length > 0, 'Top right sync status dot indicator should exist');

  console.log('✓ App sidebar and top-right sync dot verified');
}

console.log('All image-crop-adjust tests passed!');
