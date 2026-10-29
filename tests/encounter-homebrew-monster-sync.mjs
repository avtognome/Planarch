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

console.log('Testing Encounter Homebrew Monster Sync...');

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

const { CompendiumMonsterModal } = await import(pathToFileURL(path.join(out, 'CompendiumMonsterModal.js')).href);
const { default: CampaignTools } = await import(pathToFileURL(path.join(out, 'CampaignTools.js')).href);
const { saveHomebrew } = await import(pathToFileURL(path.join(out, 'homebrewData.js')).href);

const campaign = 'Sagara';

// 1. Direct CompendiumMonsterModal test with homebrewRecords prop
const hbMonster = {
  id: 'hb-m-1',
  kind: 'monster',
  name: 'Astral Weaver',
  edition: 'Homebrew',
  fields: {
    type: 'Aberration',
    size: 'Large',
    alignment: 'Chaotic Neutral',
    ac: '17 (natural armor)',
    hp: '95 (10d10 + 40)',
    cr: '6',
    dex: '16 (+3)',
    text: 'A planar spider weaving threads of pure starlight.'
  }
};

let addedCombatants = [];
let modalRenderer;
await act(async () => {
  modalRenderer = TestRenderer.create(
    React.createElement(CompendiumMonsterModal, {
      homebrewRecords: [hbMonster],
      onAdd: (combatants) => { addedCombatants.push(...combatants); },
      onClose: () => {}
    })
  );
});

const modalRoot = modalRenderer.root;
const cards = modalRoot.findAllByProps({ className: 'compendium-picker-card' });
assert.equal(cards.length, 1, 'Homebrew monster should appear in picker');

const addBtn = modalRoot.findByProps({ 'aria-label': 'Add Astral Weaver to encounter' });
assert.ok(addBtn, 'Add button for homebrew monster should exist');

await act(async () => {
  addBtn.props.onClick();
});

assert.equal(addedCombatants.length, 1);
assert.equal(addedCombatants[0].name, 'Astral Weaver');
assert.equal(addedCombatants[0].hp, 95);
assert.equal(addedCombatants[0].modifier, 3); // DEX 16 => +3

// 2. Full Encounter Builder integration test
// Save homebrew monster in campaign storage
saveHomebrew(campaign, hbMonster);

// Seed an encounter in campaign storage so editor is open
store.set(`wf-encounters:${campaign}`, JSON.stringify([{
  id: 'enc-1',
  name: 'Trial of the Weaver',
  description: '',
  environment: '',
  difficulty: 'Medium',
  ruleset: '2014',
  partyLevel: 5,
  partySize: 4,
  status: 'Prepared',
  members: []
}]));

let toolRenderer;
await act(async () => {
  toolRenderer = TestRenderer.create(
    React.createElement(CampaignTools, {
      page: 'Encounters',
      campaign,
      onStart: () => {},
      onUpdate: () => {},
      activeEncounterId: '',
      battleActive: false,
      notify: () => {},
      onReference: () => {}
    })
  );
});

const toolRoot = toolRenderer.root;

// Find "Add from compendium" button in the encounter editor
const compendiumBtn = toolRoot.findAll(el => el.type === 'button' && Array.isArray(el.props?.children) && el.props.children.includes('Add from compendium'))[0];
assert.ok(compendiumBtn, 'Add from compendium button must exist in encounter builder');

await act(async () => {
  await compendiumBtn.props.onClick();
});

// Modal should be open now with the homebrew monster
const pickerModal = toolRoot.findAllByProps({ 'aria-label': 'Compendium Monster Picker' });
assert.ok(pickerModal.length > 0, 'Compendium Monster Picker modal should open when clicking Add from compendium');

const pickerCard = toolRoot.findAll(el => el.props?.className === 'compendium-picker-card');
assert.ok(pickerCard.length > 0, 'Compendium picker cards should be rendered');
const hasAstralWeaver = pickerCard.some(card => {
  const titles = card.findAll(c => c.type === 'strong' && c.props?.children === 'Astral Weaver');
  return titles.length > 0;
});
assert.ok(hasAstralWeaver, 'Astral Weaver homebrew monster should be listed in the opened picker modal');

// 3. Dynamic sync test: add second homebrew monster and trigger event
const secondMonster = {
  id: 'hb-m-2',
  kind: 'monster',
  name: 'Void Golem',
  edition: 'Homebrew',
  fields: {
    type: 'Construct',
    size: 'Large',
    alignment: 'Unaligned',
    ac: '18',
    hp: '120',
    cr: '8',
    dex: '10 (+0)'
  }
};
saveHomebrew(campaign, secondMonster);

await act(async () => {
  window.dispatchEvent(new CustomEvent('planarch-homebrew-changed', { detail: { campaign, record: secondMonster } }));
});

const updatedCards = toolRoot.findAll(el => el.props?.className === 'compendium-picker-card');
const hasVoidGolem = updatedCards.some(card => {
  const titles = card.findAll(c => c.type === 'strong' && c.props?.children === 'Void Golem');
  return titles.length > 0;
});
assert.ok(hasVoidGolem, 'Void Golem homebrew monster should sync dynamically into opened picker');

console.log('✓ Encounter Homebrew Monster Sync tests passed!');
