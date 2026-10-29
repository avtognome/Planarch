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

let dispatchedEvents = [];
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent(event) {
    dispatchedEvents.push(event);
  }
};
globalThis.document = {
  querySelector() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing HomebrewModal Component with Stat Block & Interactive Dice...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

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

const { default: HomebrewModal } = await import(pathToFileURL(path.join(out, 'HomebrewModal.js')).href);

const campaign = 'Sagara';
let savedRecord = null;
let notified = '';

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(
    React.createElement(HomebrewModal, {
      open: true,
      onClose: () => {},
      campaign,
      onSaved: r => { savedRecord = r; },
      notify: msg => { notified = msg; }
    })
  );
});

const root = testRenderer.root;

// 1. Check title and form exists
const titleInput = root.findByProps({ 'aria-label': 'Homebrew name' });
assert.ok(titleInput, 'Name input exists');

// Type name "Aether Drake"
await act(async () => {
  titleInput.props.onChange({ target: { value: 'Aether Drake' } });
});

// 2. Set HP and Actions with dice expression
const hpInput = root.findByProps({ 'aria-label': 'Hit points' });
await act(async () => {
  hpInput.props.onChange({ target: { value: '68 (8d10+24)' } });
});

const actionTextInput = root.findByProps({ 'aria-label': 'Action text 0' });
await act(async () => {
  actionTextInput.props.onChange({ target: { value: '+7 to hit, reach 10 ft. Hit: 2d10+4 piercing damage.' } });
});

// 3. Verify Live Preview has interactive dice button for the action
const attackBtn = root.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('attack-roll-btn'))[0];
assert.ok(attackBtn, 'Preview should render interactive attack roll button');

// Click attack roll button
dispatchedEvents = [];
await act(async () => {
  attackBtn.props.onClick();
});

assert.equal(dispatchedEvents.length, 1);
assert.equal(dispatchedEvents[0].type, 'planarch-dice-roll');
assert.equal(dispatchedEvents[0].detail.expression, '1d20+7');

// 4. Save Homebrew
const saveBtn = root.findByProps({ 'aria-label': 'Save homebrew' });
await act(async () => {
  saveBtn.props.onClick();
});

assert.ok(savedRecord, 'onSaved should be called with record');
assert.equal(savedRecord.name, 'Aether Drake');
assert.equal(savedRecord.edition, 'Homebrew');

// 5. Verify local storage and wiki sync occurred
const storedHB = JSON.parse(store.get(`wf-homebrew:${campaign}`));
assert.equal(storedHB[0].name, 'Aether Drake');

const storedWiki = JSON.parse(store.get(`wf-wiki:${campaign}`));
assert.ok(storedWiki.some(p => p.title === 'Aether Drake'));

console.log('✓ HomebrewModal component and interactive dice preview test passed!');
