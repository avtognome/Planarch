import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};
globalThis.document = {
  querySelector() { return null; }
};

console.log('Testing Live Encounter Widget De-bulking & Beautification...');

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

const { default: CombatTracker } = await import(pathToFileURL(path.join(out, 'CombatTracker.js')).href);

const battle = [
  { id: 'c1', name: 'Aelar', role: 'Player', hp: 25, maxHp: 25, initiative: 18, modifier: 3, conditions: '', concentration: '' },
  { id: 'c2', name: 'Goblin Scout', role: 'Monster', hp: 7, maxHp: 7, initiative: 12, modifier: 2, conditions: '', concentration: '' }
];

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(
    React.createElement(CombatTracker, {
      battle,
      setBattle: () => {},
      battleTitle: 'Ambush at Dawn',
      battleActive: true,
      round: 1,
      setRound: () => {},
      turn: 0,
      setTurn: () => {},
      onOpenEncounters: () => {},
      onEnd: () => {},
      notify: () => {}
    })
  );
});

const root = testRenderer.root;

// 1. Verify footer fluff removed
const footerText = root.findAll(el => el.type === 'small' && typeof el.children?.[0] === 'string' && el.children[0].includes('Drag rows or use arrows'));
assert.equal(footerText.length, 0, 'Footer instructional fluff must be removed');

// 2. Verify streamlined HP controls exist with proper aria-labels
const aelarHpInput = root.findByProps({ 'aria-label': 'Current HP for Aelar' });
assert.ok(aelarHpInput, 'Direct current HP input must exist');

const customHpInput = root.findByProps({ 'aria-label': 'Custom HP amount for Aelar' });
assert.ok(customHpInput, 'Custom HP input must exist');

const dmgBtn = root.findByProps({ 'aria-label': 'Apply damage to Aelar' });
assert.ok(dmgBtn, 'Damage button must exist');

const healBtn = root.findByProps({ 'aria-label': 'Apply healing to Aelar' });
assert.ok(healBtn, 'Heal button must exist');

// 3. Verify scatter buttons (-5, -1, +1, +5) are removed to debulk row
const plusFiveBtn = root.findAllByProps({ 'aria-label': 'Heal 5 Aelar' });
assert.equal(plusFiveBtn.length, 0, 'Scattered +5 buttons must be removed from rows');

// 4. Verify Active Turn badge on current combatant
const activeBadge = root.findAll(el => el.props?.className && typeof el.props.className === 'string' && el.props.className.includes('active-turn-badge'));
assert.ok(activeBadge.length > 0, 'Active turn badge must be present for current actor');

// 5. Verify Encounter Active badge removed from header banner
const appSource = fs.readFileSync('src/App.tsx', 'utf8');
assert.ok(!appSource.includes('Encounter Active'), 'Encounter Active badge must be removed from header');

// 6. Verify blue outline removed from HP amount input
const themeCss = fs.readFileSync('src/theme.css', 'utf8');
assert.ok(themeCss.includes('.hp-quick-adjust input{') && themeCss.includes('outline:none!important'), 'HP quick adjust input must suppress browser focus outline');

console.log('✓ Live Encounter Widget De-bulking & Beautification tests passed!');
