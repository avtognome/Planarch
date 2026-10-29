import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Compendium Monster Picker Modal...');

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

const { CompendiumMonsterModal } = await import(pathToFileURL(path.join(out, 'CompendiumMonsterModal.js')).href);

const mockMonsters = [
  {
    id: 'm-goblin',
    generation: 'gen-1',
    name: 'Goblin',
    kind: 'monster',
    normalized: 'goblin',
    source: 'SRD',
    fields: {
      type: 'Humanoid',
      size: 'Small',
      alignment: 'Neutral Evil',
      ac: '15',
      hp: '7 (2d6)',
      cr: '1/4',
      dex: '14 (+2)',
      text: 'Sneaky little goblin'
    }
  },
  {
    id: 'm-dragon',
    generation: 'gen-1',
    name: 'Adult Red Dragon',
    kind: 'monster',
    normalized: 'adult red dragon',
    source: 'SRD',
    fields: {
      type: 'Dragon',
      size: 'Huge',
      alignment: 'Chaotic Evil',
      ac: '19',
      hp: '256 (17d12 + 136)',
      cr: '17',
      dex: '10 (+0)',
      text: 'Fearsome red dragon'
    }
  }
];

let added = [];
let testRenderer;

await act(async () => {
  testRenderer = TestRenderer.create(
    React.createElement(CompendiumMonsterModal, {
      records: mockMonsters,
      onAdd: (combatants) => { added.push(...combatants); },
      onClose: () => {}
    })
  );
});

const root = testRenderer.root;

// Search input exists
const searchInput = root.findByProps({ 'aria-label': 'Search compendium monsters' });
assert.ok(searchInput, 'Search input should exist');

// Both monsters initially visible
let monsterCards = root.findAllByProps({ className: 'compendium-picker-card' });
assert.equal(monsterCards.length, 2);

// Filter by search query "dragon"
await act(async () => {
  searchInput.props.onChange({ target: { value: 'dragon' } });
});

monsterCards = root.findAllByProps({ className: 'compendium-picker-card' });
assert.equal(monsterCards.length, 1);

// Multi-add quantity test: add 3 Goblins
await act(async () => {
  searchInput.props.onChange({ target: { value: 'goblin' } });
});

const qtyInput = root.findByProps({ 'aria-label': 'Quantity for Goblin' });
await act(async () => {
  qtyInput.props.onChange({ target: { value: '3' } });
});

const addBtn = root.findByProps({ 'aria-label': 'Add Goblin to encounter' });
await act(async () => {
  addBtn.props.onClick();
});

assert.equal(added.length, 3);
assert.equal(added[0].name, 'Goblin 1');
assert.equal(added[1].name, 'Goblin 2');
assert.equal(added[2].name, 'Goblin 3');
assert.equal(added[0].hp, 7);
assert.equal(added[0].modifier, 2); // DEX 14 => +2

console.log('✓ CompendiumMonsterModal tests passed successfully!');
