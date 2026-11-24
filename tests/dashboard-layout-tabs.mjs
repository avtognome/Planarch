globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
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

const R = () => testRenderer.root;
const has = label => R().findAll(n => n.type === 'button' && n.props['aria-label'] === label);
const gridCount = () => R().findAll(n => n.props?.className === 'widget-grid').length;
const openWidgets = () => R().findAll(n => typeof n.props?.className === 'string' && /^widget( span-full)?$/.test(n.props.className));

// Test 1: legacy drag/resize/lock controls are gone
assert.equal(R().findAll(n => n.type === 'button' && /^(Move |Resize )/.test(n.props['aria-label'] || '')).length, 0, 'No move/resize widget buttons');
assert.equal(has('Lock layout').length + has('Unlock layout').length, 0, 'No lock/unlock toggle');
assert.equal(R().findAll(n => n.props?.draggable === true).length, 0, 'No draggable widget handles');
assert.equal(R().findAll(n => n.props?.className === 'widget-masonry-row').length, 0, 'No masonry rows');
console.log('✓ Free-form drag/resize/lock controls removed');

// Test 2: four widgets render as a balanced grid
assert.equal(gridCount(), 1, 'Single widget-grid');
assert.equal(openWidgets().length, 4, 'Four open widgets');
assert.equal(openWidgets().filter(n => n.props.className.includes('span-full')).length, 0, 'No span-full with an even count');
console.log('✓ Even widget count renders balanced 2x2 grid');

// Test 3: minimizing moves a widget into the dock as a pill
await act(async () => { has('Minimize atmosphere widget')[0].props.onClick(); });
assert.equal(R().findAll(n => n.props?.className === 'minimized-widget-dock').length, 1, 'Dock appears');
assert.equal(has('Restore atmosphere widget').length, 1, 'Atmosphere pill present');
assert.equal(openWidgets().length, 3, 'Three open widgets');
assert.equal(openWidgets().filter(n => n.props.className.includes('span-full')).length, 1, 'Exactly one full-width widget when count is odd');
assert.ok(openWidgets()[0].props.className.includes('span-full'), 'First widget spans full width');
console.log('✓ Minimize dock and odd-count full-width promotion verified');

// Test 4: restore via pill, then minimize everything and use Expand all
await act(async () => { has('Restore atmosphere widget')[0].props.onClick(); });
assert.equal(openWidgets().length, 4, 'Restored to four widgets');
assert.equal(R().findAll(n => n.props?.className === 'minimized-widget-dock').length, 0, 'Dock hidden when nothing minimized');
for (const id of ['combat', 'journal', 'atmosphere', 'dice']) { await act(async () => { has('Minimize ' + id + ' widget')[0].props.onClick(); }); }
assert.equal(gridCount(), 0, 'Grid hidden when all minimized');
assert.equal(R().findAll(n => n.props?.className === 'widget-empty').length, 1, 'Empty state shown');
await act(async () => { R().findAll(n => n.type === 'button' && n.props.className === 'text-button dock-expand-all')[0].props.onClick(); });
assert.equal(openWidgets().length, 4, 'Expand all restores every widget');
console.log('✓ Restore pill, empty state and Expand all verified');

// Test 5: tabs and Reset layout
assert.ok(R().findAll(n => n.type === 'button' && n.props['aria-label'] === 'Add tab').length > 0, 'Add tab button must exist');
await act(async () => { has('Minimize journal widget')[0].props.onClick(); });
const resetBtn = R().findAll(n => n.type === 'button' && Array.isArray(n.children) && n.children.includes('Reset layout'))[0];
assert.ok(resetBtn, 'Reset layout button exists');
await act(async () => { resetBtn.props.onClick(); });
assert.equal(openWidgets().length, 4, 'Reset layout restores all widgets');
console.log('✓ Tabs and Reset layout verified');

// Test 6: CSS contract
const themeCss = fs.readFileSync('src/theme.css', 'utf8');
const styleCss = fs.readFileSync('src/style.css', 'utf8');
assert.match(styleCss, /\.widget-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:16px;align-items:stretch\}/, 'widget-grid is a 2-column stretch grid');
assert.match(styleCss, /\.widget\.span-full\{grid-column:1\/-1\}/, 'span-full spans both columns');
assert.match(themeCss, /\.minimized-widget-pill\{/, 'minimized pill styled');
assert.match(themeCss, /\.widget-collapsed[^{]*\{[^}]*align-self:\s*start/i, 'floating dice collapse still defined');
console.log('✓ Cockpit grid CSS verified');

console.log('All dashboard layout & tab tests passed!');
