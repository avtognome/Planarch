globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

console.log('Testing Character Sheet UI reverse engineered from Mythallar...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

for (const filename of ['models.ts', 'characterRules.ts', 'conditions.ts', 'CharacterSheet.tsx']) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  code = code
    .replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
    .replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const { CharacterSheet } = await import(
  pathToFileURL(path.join(out, 'CharacterSheet.js')).href
);

let character = {
  id: 'char-1',
  name: 'Valeros',
  kind: 'Player',
  role: 'Fighter',
  portrait: '',
  personality: 'Brave',
  motivation: 'Glory',
  relationships: 'Loyal',
  notes: 'Second Wind',
  hp: 20,
  maxHp: 20,
  tempHp: 5,
  initiative: 2,
  ac: 16,
  speed: 30,
  level: 3,
  stats: {
    str: 16,
    dex: 14,
    con: 14,
    int: 10,
    wis: 12,
    cha: 8,
  },
  savingThrowProficiencies: ['str', 'con'],
  skillProficiencies: ['athletics', 'survival'],
  skillExpertise: ['athletics'],
  hitDice: { current: 3, max: 3, die: 'd10' },
  deathSaves: { successes: 1, failures: 0 },
  resources: [
    { id: 'res-1', name: 'Action Surge', current: 1, max: 1, resetOn: 'short' },
  ],
  inventory: [
    { id: 'item-1', name: 'Longsword', qty: 1, weight: 3, attuned: false },
    { id: 'item-2', name: 'Ring of Protection', qty: 1, weight: 0, attuned: true },
  ],
  spells: [
    { id: 'spell-1', name: 'Fireball', level: 3, prepared: true },
  ],
  spellSlots: {
    1: { max: 4, used: 1 },
    2: { max: 2, used: 0 },
  },
};

const handleUpdate = (patch) => {
  character = { ...character, ...patch };
  render.update(
    React.createElement(CharacterSheet, {
      character,
      onUpdate: handleUpdate,
      notify: () => {},
    })
  );
};

let render;
await act(async () => {
  render = TestRenderer.create(
    React.createElement(CharacterSheet, {
      character,
      onUpdate: handleUpdate,
      notify: () => {},
    })
  );
});

const root = render.root;
const text = (node) =>
  typeof node === 'string' ? node : node?.children?.map(text).join('') || '';

// 1. Verify mounting and Header
console.log('1. Checking Sheet Mounting and Header...');
const region = root.findByProps({ role: 'region' });
assert.ok(region, 'Character sheet region should be rendered');

const nameInput = root.findByProps({ 'aria-label': 'Character name' });
assert.equal(nameInput.props.value, 'Valeros');

await act(async () => {
  nameInput.props.onChange({ target: { value: 'Valeros the Bold' } });
});
assert.equal(character.name, 'Valeros the Bold');

// Level up
const levelPlus = root.findByProps({ 'aria-label': 'Increase level' });
await act(async () => {
  levelPlus.props.onClick();
});
assert.equal(character.level, 4);

// 2. Collapsible Sections (7 sections exist)
console.log('2. Checking 7 Collapsible Sections...');
const sectionToggles = root.findAllByProps({ className: 'char-section-toggle' });
assert.equal(sectionToggles.length, 7, 'Must have 7 collapsible section toggles');

// Test toggle collapse / expand
await act(async () => {
  sectionToggles[0].props.onClick(); // toggle combat
});
assert.equal(sectionToggles[0].props['aria-expanded'], false);

await act(async () => {
  sectionToggles[0].props.onClick(); // toggle combat back open
});
assert.equal(sectionToggles[0].props['aria-expanded'], true);

// 3. Combat Stats: HP Damage and Heal
console.log('3. Checking HP damage and heal actions...');
const hpDeltaInput = root.findByProps({ 'aria-label': 'Damage or heal amount' });
const damageBtn = root.findAllByProps({ className: 'char-damage-btn' })[0];
const healBtn = root.findAllByProps({ className: 'char-heal-btn' })[0];

// Temp HP was 5, HP was 20. Take 8 damage -> tempHp becomes 0, HP becomes 17.
await act(async () => {
  hpDeltaInput.props.onChange({ target: { value: '8' } });
});
await act(async () => {
  damageBtn.props.onClick();
});
assert.equal(character.tempHp, 0);
assert.equal(character.hp, 17);

// Heal 2 HP -> HP becomes 19.
await act(async () => {
  hpDeltaInput.props.onChange({ target: { value: '2' } });
});
await act(async () => {
  healBtn.props.onClick();
});
assert.equal(character.hp, 19);

// 4. Death Saves
console.log('4. Checking death saves toggling...');
const succ2Pip = root.findByProps({ 'aria-label': 'Death save success 2' });
await act(async () => {
  succ2Pip.props.onClick();
});
assert.equal(character.deathSaves.successes, 2);

const fail1Pip = root.findByProps({ 'aria-label': 'Death save failure 1' });
await act(async () => {
  fail1Pip.props.onClick();
});
assert.equal(character.deathSaves.failures, 1);

// 5. Ability Scores & Saving Throws
console.log('5. Checking Ability Scores & Saves...');
const strScoreInput = root.findByProps({ 'aria-label': 'STR score' });
assert.equal(strScoreInput.props.value, 16);

await act(async () => {
  strScoreInput.props.onChange({ target: { value: 18 } });
});
assert.equal(character.stats.str, 18);

const dexSaveCheck = root.findByProps({ 'aria-label': 'DEX save proficiency' });
assert.equal(dexSaveCheck.props.checked, false);

await act(async () => {
  dexSaveCheck.props.onChange({ target: { checked: true } });
});
assert.ok(character.savingThrowProficiencies.includes('dex'));

// 6. Skills & Senses
console.log('6. Checking Skills toggling & passives...');
const stealthCheck = root.findByProps({ 'aria-label': 'Stealth proficiency' });
assert.equal(stealthCheck.props.checked, false);

await act(async () => {
  stealthCheck.props.onChange({ target: { checked: true } });
});
assert.ok(character.skillProficiencies.includes('stealth'));

// 7. Inventory Add & Attunement
console.log('7. Checking Inventory adding & attunement count...');
const itemNameInput = root.findByProps({ 'aria-label': 'Item name' });
const itemQtyInput = root.findByProps({ 'aria-label': 'Item quantity' });
const itemAttuneCheck = root.findByProps({ 'aria-label': 'Requires attunement' });
const addItemBtn = root.findAllByType('button').find(b => text(b).includes('Add Item'));

await act(async () => {
  itemNameInput.props.onChange({ target: { value: 'Potion of Healing' } });
  itemQtyInput.props.onChange({ target: { value: 2 } });
  itemAttuneCheck.props.onChange({ target: { checked: false } });
});
await act(async () => {
  addItemBtn.props.onClick();
});
assert.ok(character.inventory.some(i => i.name === 'Potion of Healing' && i.qty === 2));

// 8. Spellbook & Spells
console.log('8. Checking Spell slots & adding a spell...');
const slot1UsedInput = root.findByProps({ 'aria-label': 'Level 1 spell slots used' });
await act(async () => {
  slot1UsedInput.props.onChange({ target: { value: 2 } });
});
assert.equal(character.spellSlots[1].used, 2);

const spellNameInput = root.findByProps({ 'aria-label': 'Spell name' });
const spellLevelSelect = root.findByProps({ 'aria-label': 'Spell level' });
const addSpellBtn = root.findAllByType('button').find(b => text(b).includes('Add Spell'));

await act(async () => {
  spellNameInput.props.onChange({ target: { value: 'Shield' } });
  spellLevelSelect.props.onChange({ target: { value: 1 } });
});
await act(async () => {
  addSpellBtn.props.onClick();
});
assert.ok(character.spells.some(s => s.name === 'Shield' && s.level === 1));

console.log('ALL Character Sheet UI tests passed successfully!');
