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
  querySelector() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Compendium Homebrew Integration...');

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

const { default: Compendium } = await import(pathToFileURL(path.join(out, 'Compendium.js')).href);
const { saveHomebrew } = await import(pathToFileURL(path.join(out, 'homebrewData.js')).href);

const campaign = 'Sagara';

// Seed one homebrew monster beforehand
saveHomebrew(campaign, {
  id: 'hb-ghoul',
  kind: 'monster',
  name: 'Crypt Stalker',
  edition: 'Homebrew',
  fields: {
    size: 'M',
    type: 'undead',
    alignment: 'chaotic evil',
    ac: '14',
    hp: '32 (5d8+10)',
    speed: '30 ft.',
    str: 16, dex: 12, con: 14, int: 6, wis: 10, cha: 6,
    cr: '1',
    action: [{ name: 'Claws', text: '+5 to hit, reach 5 ft. Hit: 2d6+3 slashing damage.' }]
  }
});

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(
    React.createElement(Compendium, {
      campaign,
      notify: () => {}
    })
  );
});

const root = testRenderer.root;

// 1. Verify "Add Homebrew" button is present
const addHbBtn = root.findByProps({ 'aria-label': 'Add Homebrew' });
assert.ok(addHbBtn, 'Add Homebrew button must be present in Compendium toolbar');

// 2. Click "Add Homebrew" -> HomebrewModal should open
await act(async () => {
  addHbBtn.props.onClick();
});

const modalTitle = root.findAll(el => el.props?.children === 'Create Homebrew');
assert.ok(modalTitle.length > 0, 'HomebrewModal should be open with "Create Homebrew"');

// Close modal
const closeBtn = root.findByProps({ 'aria-label': 'Close dialog' });
await act(async () => {
  closeBtn.props.onClick();
});

// 3. Check seeded Crypt Stalker is accessible in index even before compendium XML is loaded
const stalkerBtn = root.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('record-row') && el.props.children?.props?.children?.[0]?.props?.children === 'Crypt Stalker')[0];
assert.ok(stalkerBtn, 'Crypt Stalker homebrew should appear in compendium index');

// Select Crypt Stalker
await act(async () => {
  stalkerBtn.props.onClick();
});

// Allow state updates to settle
await act(async () => {
  await Promise.resolve();
});

// Verify stat block and Edit Homebrew button are rendered
const editHbBtn = root.findByProps({ 'aria-label': 'Edit homebrew' });
assert.ok(editHbBtn, 'Edit Homebrew button should appear when viewing a homebrew entry');

const dmgBtn = root.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('damage-roll-btn'))[0];
assert.ok(dmgBtn, 'Damage roll button should be rendered in homebrew stat block');

console.log('✓ Compendium Homebrew Integration tests passed!');
