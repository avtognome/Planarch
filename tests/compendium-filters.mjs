import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import ReactDOM from 'react-dom';
import TestRenderer, { act } from 'react-test-renderer';

// Polyfill ReactDOM.createPortal for react-test-renderer
ReactDOM.createPortal = children => children;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Compendium Dropdown Filters & Contextual Selects...');

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

for (const filename of fs.readdirSync('src/components/ui').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/components/ui/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from '../../lib/${n}.js'`)
             .replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, 'components/ui', filename.replace(/\.tsx?$/, '.js')), code);
}

for (const filename of fs.readdirSync('src/lib').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/lib/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  fs.writeFileSync(path.join(out, 'lib', filename.replace(/\.tsx?$/, '.js')), code);
}

// Mock test compendium metadata
const mockIndex = [
  { id: '1', kind: 'monster', name: 'Goblin Scout', edition: 'Legacy', summary: 'humanoid (goblinoid) · CR 1/4', search: 'goblin scout humanoid (goblinoid) · cr 1/4 legacy' },
  { id: '2', kind: 'monster', name: 'Adult Red Dragon', edition: '5.5e', summary: 'dragon · CR 17', search: 'adult red dragon dragon · cr 17 5.5e' },
  { id: '3', kind: 'monster', name: 'Dire Wolf', edition: 'Legacy', summary: 'beast · CR 1', search: 'dire wolf beast · cr 1 legacy' },
  { id: '4', kind: 'monster', name: 'Ogre Brute', edition: 'Legacy', summary: 'giant · CR 2', search: 'ogre brute giant · cr 2 legacy' },
  { id: '5', kind: 'spell', name: 'Fireball', edition: '5.5e', summary: 'Level 3 · Wizard, Sorcerer', search: 'fireball level 3 · wizard, sorcerer 5.5e' },
  { id: '6', kind: 'spell', name: 'Cure Wounds', edition: 'Legacy', summary: 'Level 1 · Cleric, Bard, Druid', search: 'cure wounds level 1 · cleric, bard, druid legacy' },
  { id: '7', kind: 'spell', name: 'Light', edition: 'Legacy', summary: 'Level 0 · Cleric, Wizard', search: 'light level 0 · cleric, wizard legacy' },
  { id: '8', kind: 'item', name: 'Flame Tongue Longsword', edition: 'Legacy', summary: 'Weapon (martial, melee), Rare', search: 'flame tongue longsword weapon (martial, melee), rare legacy' },
  { id: '9', kind: 'item', name: 'Potion of Healing', edition: '5.5e', summary: 'Potion, Common', search: 'potion of healing potion, common 5.5e' }
];

const mockMeta = {
  generation: 'gen-test-123',
  name: 'SRD Test Compendium',
  count: mockIndex.length,
  counts: {
    monster: 4,
    spell: 3,
    item: 2,
    class: 0,
    race: 0,
    feat: 0,
    background: 0
  },
  index: mockIndex
};

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
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (...args) => globalThis.clearTimeout(...args)
};

globalThis.HTMLFormElement = class HTMLFormElement {};
globalThis.HTMLElement = class HTMLElement {};
globalThis.document = {
  createElement: tag => ({
    tagName: tag.toUpperCase(),
    setAttribute() {},
    getAttribute() {},
    removeAttribute() {},
    style: {},
    appendChild() {},
    removeChild() {},
    addEventListener() {},
    removeEventListener() {}
  }),
  body: {
    appendChild() {},
    removeChild() {}
  }
};

// Polyfill pointerCapture for Radix Select
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
}

// Mock compendiumData module exports so Compendium reads mockMeta
const compDataPath = path.join(out, 'compendiumData.js');
let compDataCode = fs.readFileSync(compDataPath, 'utf8');
compDataCode = compDataCode.replace(
  'export async function readMeta()',
  'export async function readMeta() { return ' + JSON.stringify(mockMeta) + '; }\nexport async function _orig_readMeta()'
);
fs.writeFileSync(compDataPath, compDataCode);

const { default: Compendium } = await import(pathToFileURL(path.join(out, 'Compendium.js')).href);

let compRenderer;
await act(async () => {
  compRenderer = TestRenderer.create(
    React.createElement(Compendium, {
      campaign: 'TestCampaign',
      focus: '',
      onFocusHandled: () => {},
      notify: () => {}
    })
  );
});

// Wait for useEffect readMeta to resolve
await act(async () => {
  await new Promise(r => setTimeout(r, 20));
});

// 1. Verify Category and Edition Shadcn Select triggers exist
const catTrigger = compRenderer.root.findByProps({ 'aria-label': 'Compendium category' });
assert.ok(catTrigger, 'Must render Shadcn Select for Compendium category');

const edTrigger = compRenderer.root.findByProps({ 'aria-label': 'Compendium edition' });
assert.ok(edTrigger, 'Must render Shadcn Select for Compendium edition');

const sortTrigger = compRenderer.root.findByProps({ 'aria-label': 'Sort order' });
assert.ok(sortTrigger, 'Must render Shadcn Select for Sort order');

console.log('PASS Dropdown layout: Category, Edition, and Sort Select triggers present');

// 2. Verify all initial 9 entries rendered in index list
let recordRows = compRenderer.root.findAllByProps({ className: 'record-row selected' }).concat(
  compRenderer.root.findAllByProps({ className: 'record-row ' })
);
assert.equal(recordRows.length, 9, 'All 9 mock entries should be rendered in index list initially');

// 3. Switch Category to 'monster' using Select's onValueChange
const { Select } = await import(pathToFileURL(path.join(out, 'components/ui/select.js')).href);
const selects = compRenderer.root.findAllByType(Select);
const catSelect = selects.find(s => s.props['aria-label'] === 'Compendium category' || s.findAllByProps({ 'aria-label': 'Compendium category' }).length > 0);
assert.ok(catSelect, 'Category Select component found');

await act(async () => {
  catSelect.props.onValueChange('monster');
});

// Verify only 4 monsters displayed
recordRows = compRenderer.root.findAllByProps({ className: 'record-row selected' }).concat(
  compRenderer.root.findAllByProps({ className: 'record-row ' })
);
assert.equal(recordRows.length, 4, 'Only 4 monsters should match category=monster');

// Verify contextual monster dropdowns (CR and Type) appeared!
const crTrigger = compRenderer.root.findByProps({ 'aria-label': 'Monster CR' });
assert.ok(crTrigger, 'Monster CR dropdown must appear when monster category selected');

const typeTrigger = compRenderer.root.findByProps({ 'aria-label': 'Monster type' });
assert.ok(typeTrigger, 'Monster Type dropdown must appear when monster category selected');

console.log('PASS Monster contextual filtering: CR and Type dropdowns appear dynamically');

// 4. Test CR filter: select CR 0-1
const crSelect = compRenderer.root.findAllByType(Select).find(s => s.findAllByProps({ 'aria-label': 'Monster CR' }).length > 0);
await act(async () => {
  crSelect.props.onValueChange('0-1');
});

recordRows = compRenderer.root.findAllByProps({ className: 'record-row selected' }).concat(
  compRenderer.root.findAllByProps({ className: 'record-row ' })
);
// Goblin Scout (CR 1/4) and Dire Wolf (CR 1) match 0-1. Dragon (17) and Ogre (2) excluded.
assert.equal(recordRows.length, 2, 'Only Goblin Scout and Dire Wolf should match CR 0-1');
console.log('PASS Numeric CR parsing: CR 0-1 filter correctly matched Goblin Scout and Dire Wolf');

// 5. Test Reset all filters button
const resetBtn = compRenderer.root.findByProps({ 'aria-label': 'Reset all filters' });
assert.ok(resetBtn, 'Reset all filters button must be visible when filters active');

await act(async () => {
  resetBtn.props.onClick();
});

// After reset, all 9 entries should be displayed again
recordRows = compRenderer.root.findAllByProps({ className: 'record-row selected' }).concat(
  compRenderer.root.findAllByProps({ className: 'record-row ' })
);
assert.equal(recordRows.length, 9, 'Resetting filters must restore all 9 entries');
console.log('PASS Reset button: clears filters and restores full compendium index');
