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
  dispatchEvent() {}
};
globalThis.document = {
  querySelector() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Live Encounter Initiative Auto-Sort...');

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

const { default: CombatTracker } = await import(pathToFileURL(path.join(out, 'CombatTracker.js')).href);

const initialBattle = [
  { id: 'p1', name: 'Valeros', role: 'Player', hp: 25, maxHp: 25, initiative: 12, modifier: 2, conditions: '', concentration: '' },
  { id: 'm1', name: 'Goblin', role: 'Monster', hp: 7, maxHp: 7, initiative: 15, modifier: 2, conditions: '', concentration: '' },
  { id: 'p2', name: 'Ezren', role: 'Player', hp: 18, maxHp: 18, initiative: 8, modifier: 1, conditions: '', concentration: '' }
];

let battleState = [...initialBattle];
let roundState = 1;
let turnState = 0; // currently on Goblin (index 0 if sorted by init 15, or initial array)

const setBattle = (updater) => {
  battleState = typeof updater === 'function' ? updater(battleState) : updater;
};
const setRound = (updater) => {
  roundState = typeof updater === 'function' ? updater(roundState) : updater;
};
const setTurn = (updater) => {
  turnState = typeof updater === 'function' ? updater(turnState) : updater;
};

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(
    React.createElement(CombatTracker, {
      battle: battleState,
      setBattle,
      battleTitle: 'Ambush',
      battleActive: true,
      round: roundState,
      setRound,
      turn: turnState,
      setTurn,
      onOpenEncounters: () => {},
      onEnd: () => {},
      notify: () => {}
    })
  );
});

const root = testRenderer.root;

// Change Ezren's initiative from 8 to 22 (highest)
const ezrenInput = root.findByProps({ 'aria-label': 'Initiative for Ezren' });
assert.ok(ezrenInput, 'Ezren init input exists');

await act(async () => {
  ezrenInput.props.onChange({ target: { value: '22' } });
});

// Ezren (22) should now be at index 0, followed by Goblin (15), then Valeros (12)
assert.equal(battleState[0].name, 'Ezren', 'Ezren should be sorted to top position with init 22');
assert.equal(battleState[1].name, 'Goblin', 'Goblin should be second position with init 15');
assert.equal(battleState[2].name, 'Valeros', 'Valeros should be third position with init 12');

console.log('✓ Initiative auto-sort verified!');
