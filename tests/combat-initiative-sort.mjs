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

console.log('Testing Live Encounter Initiative Draft & Enter/Blur Sorting...');

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
let turnState = 0;

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
const ezrenInput = root.findByProps({ 'aria-label': 'Initiative for Ezren' });
assert.ok(ezrenInput, 'Ezren init input exists');

// 1. Test erase: user clears the input (value becomes '')
await act(async () => {
  ezrenInput.props.onChange({ target: { value: '' } });
});

// Input value must allow empty string (erasable, not stuck at 0)
assert.equal(ezrenInput.props.value, '', 'Input value should be empty string when erased');

// Order should NOT jump yet while typing / before Enter or blur
assert.equal(battleState[2].name, 'Ezren', 'Ezren stays in place until committed');

// 2. User types 22
await act(async () => {
  ezrenInput.props.onChange({ target: { value: '22' } });
});
assert.equal(ezrenInput.props.value, '22');
assert.equal(battleState[2].name, 'Ezren', 'Still in place before enter');

// 3. User hits Enter key
let blurred = false;
await act(async () => {
  ezrenInput.props.onKeyDown({ key: 'Enter', currentTarget: { blur: () => { blurred = true; } } });
});

// Must sort upon Enter
assert.equal(battleState[0].name, 'Ezren', 'Ezren sorted to top after Enter');
assert.equal(battleState[0].initiative, 22);
assert.equal(blurred, true, 'Input should blur on Enter');

console.log('✓ Initiative draft and Enter/blur sort test passed!');
