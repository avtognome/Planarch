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

function transpileDir(dir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      transpileDir(path.join(dir, entry.name), path.join(targetDir, entry.name));
    } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'main.tsx') {
      let code = ts.transpileModule(fs.readFileSync(path.join(dir, entry.name), 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText;
      code = code
        .replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
        .replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (_, n) => {
          let rel = path.relative(targetDir, path.join(out, 'components', 'ui', n.replace(/\.js$/, '') + '.js')).replace(/\\/g, '/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return `from '${rel}'`;
        })
        .replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => {
          let rel = path.relative(targetDir, path.join(out, 'lib', n.replace(/\.js$/, '') + '.js')).replace(/\\/g, '/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return `from '${rel}'`;
        })
        .replace(/from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, (_, n) => `from './${n}.js'`);
      fs.writeFileSync(path.join(targetDir, entry.name.replace(/\.tsx?$/, '.js')), code);
    }
  }
}
transpileDir('src', out);

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

// 2. Collapsible Sections (9 sections matching screenshot layout + Spellbook)
console.log('2. Checking 9 Collapsible Sections & Character Lore...');
const sectionToggles = root.findAll(el => el.type === 'button' && String(el.props?.className || '').includes('char-section-toggle'));
assert.equal(sectionToggles.length, 9, 'Must have 9 collapsible section toggles (Character, Combat, Resources, Abilities, Skills, Inventory, Spells, Proficiencies, Notes)');

const portraitBox = root.find(el => String(el.props?.className || '').includes('char-portrait-box'));
assert.ok(portraitBox, 'Character section must include .char-portrait-box');
const loreToggle = root.find(el => el.type === 'button' && String(el.props?.className || '').includes('char-lore-toggle'));
assert.ok(loreToggle, 'Character section must include collapsible Character Lore sub-panel');

const sheetSource = fs.readFileSync('src/CharacterSheet.tsx', 'utf8');
assert.ok(
  sheetSource.includes("from './components/ui/card'") &&
  sheetSource.includes("from './components/ui/button'") &&
  sheetSource.includes("from './components/ui/input'"),
  'CharacterSheet.tsx must use shadcn UI components (Card, Button, Input)'
);

// Test toggle collapse / expand
await act(async () => {
  sectionToggles[1].props.onClick(); // toggle combat
});
assert.equal(sectionToggles[1].props['aria-expanded'], false);

await act(async () => {
  sectionToggles[1].props.onClick(); // toggle combat back open
});
assert.equal(sectionToggles[1].props['aria-expanded'], true);

// 3. Combat Stats: 3-column Top Grid, HP Bar, Spellcasting, Mid Strip, and Conditions Grouping
console.log('3. Checking Combat Stats 3-column top grid, HP bar, Spellcasting, Recovery, and Conditions...');
const combatTopGrid = root.find(el => String(el.props?.className || '').includes('char-combat-top-grid'));
assert.ok(combatTopGrid, 'Combat Stats must render .char-combat-top-grid (HP | AC | Spellcasting+Initiative)');
const hpBar = root.find(el => String(el.props?.className || '').includes('char-hp-bar-track'));
assert.ok(hpBar, 'HP card must include .char-hp-bar-track progress bar');
const spellcastingCard = root.find(el => String(el.props?.className || '').includes('char-spellcasting-card'));
assert.ok(spellcastingCard && text(spellcastingCard).includes('Spell Attack') && text(spellcastingCard).includes('Spell DC'), 'Combat Stats must include Spellcasting Attack & DC card');

const recoveryCard = root.find(el => String(el.props?.className || '').includes('char-recovery-card'));
assert.ok(recoveryCard, 'Combat section must include .char-recovery-card grouping Hit Dice and Rest actions');
const shortRestBtn = recoveryCard.findAll(el => el.type === 'button').find(b => text(b).includes('Short rest'));
const longRestBtn = recoveryCard.findAll(el => el.type === 'button').find(b => text(b).includes('Long rest'));
assert.ok(shortRestBtn && longRestBtn, 'Short rest and Long rest buttons must live inside .char-recovery-card');

const hpCard = root.find(el => String(el.props?.className || '').includes('char-hp-card'));
const hpDeltaInput = hpCard.findByProps({ 'aria-label': 'Damage or heal amount' });
const damageBtn = hpCard.findAll(el => el.type === 'button' && String(el.props?.className || '').includes('char-damage-btn'))[0];
const healBtn = hpCard.findAll(el => el.type === 'button' && String(el.props?.className || '').includes('char-heal-btn'))[0];

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

// Conditions group inside Combat (with Exhaustion stepper inside Conditions)
const condGroup = root.find(el => String(el.props?.className || '').includes('char-conditions-group'));
assert.ok(condGroup, 'Conditions chips, Exhaustion stepper, and Add control must share .char-conditions-group');
const incExhBtn = condGroup.findByProps({ 'aria-label': 'Increase exhaustion' });
await act(async () => {
  incExhBtn.props.onClick();
});
assert.equal(character.exhaustion, 1);

const addCondToggle = condGroup.findByProps({ 'aria-label': 'Add condition' });
await act(async () => {
  addCondToggle.props.onClick();
});
const proneOpt = condGroup.findAll(el => el.type === 'button').find(b => text(b) === 'Prone');
await act(async () => {
  proneOpt.props.onClick();
});
assert.ok(character.conditions.includes('Prone'));
const removeProneBtn = condGroup.findByProps({ 'aria-label': 'Remove condition Prone' });
await act(async () => {
  removeProneBtn.props.onClick();
});
assert.ok(!character.conditions.includes('Prone'));

// Resource increment/decrement and Short Rest recovery
const resCard = root.find(el => String(el.props?.className || '').includes('char-resource-card'));
const decResBtn = resCard.findByProps({ 'aria-label': 'Decrease Action Surge' });
await act(async () => {
  decResBtn.props.onClick();
});
assert.equal(character.resources[0].current, 0);

await act(async () => {
  shortRestBtn.props.onClick();
});
assert.equal(character.resources[0].current, 1, 'Short rest must recover short-rest resources');

// Feats in Features & Tracked Resources
const featsGroup = root.find(el => String(el.props?.className || '').includes('char-feats-group'));
assert.ok(featsGroup, 'Features & Tracked Resources must include .char-feats-group');
const skillsColumns = root.find(el => String(el.props?.className || '').includes('char-skills-columns'));
assert.ok(skillsColumns, 'Skills & Senses must group skills by ability in two columns (.char-skills-columns)');
const skillFilterInput = root.findByProps({ 'aria-label': 'Filter skills' });
assert.ok(skillFilterInput, 'Skills & Senses header must include Filter skills input');
const cpInput = root.findByProps({ 'aria-label': 'Copper pieces' });
const gpInput = root.findByProps({ 'aria-label': 'Gold pieces' });
assert.ok(cpInput && gpInput, 'Items & Inventory must include Currency inputs (CP, SP, EP, GP, PP)');
await act(async () => {
  gpInput.props.onChange({ target: { value: '15' } });
});
assert.equal(character.currency.gp, 15);
const profGrid2x2 = root.find(el => String(el.props?.className || '').includes('char-prof-grid-2x2'));
assert.ok(profGrid2x2, 'Proficiencies & Training must render 2x2 grid (.char-prof-grid-2x2)');
const newNoteBtn = root.findByProps({ 'aria-label': 'Add character note' });
await act(async () => {
  newNoteBtn.props.onClick();
});
assert.ok(character.characterNotes.length >= 1, 'Notes section must allow adding character notes');

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

// 6. Skills & Senses (P and E buttons)
console.log('6. Checking Skills P/E buttons & passives...');
const stealthBtn = root.findByProps({ 'aria-label': 'Stealth proficiency' });
assert.equal(stealthBtn.type, 'button', 'Skill proficiency toggle must be a P button');
assert.equal(text(stealthBtn), 'P', 'Skill proficiency button label must be P');
assert.ok(!String(stealthBtn.props.className || '').includes('active'));

await act(async () => {
  stealthBtn.props.onClick();
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
const spellModUrl = pathToFileURL(path.join(out, 'CompendiumSpellModal.js')).href + `?t=${Date.now()}`;
const { CompendiumSpellModal, compendiumRecordToCharacterSpell } = await import(spellModUrl);

await act(async () => {
  addSpellBtn.props.onClick();
});
assert.ok(character.spells.some(s => s.name === 'Shield' && s.level === 1));

// 9. Compendium Spell Modal (spells only, sorted by level/name, filtered by class)
console.log('9. Checking CompendiumSpellModal filtering & sorting...');
const sampleRecords = [
  { id: 'm1', kind: 'monster', name: 'Goblin', edition: '2024', fields: { type: 'Humanoid', cr: '1/4' } },
  { id: 's1', kind: 'spell', name: 'Fireball', edition: '2024', fields: { level: '3', school: 'Evocation', classes: 'Wizard, Sorcerer', duration: 'Instantaneous', time: '1 action' } },
  { id: 's2', kind: 'spell', name: 'Cure Wounds', edition: '2024', fields: { level: '1', school: 'Abjuration', classes: 'Cleric, Bard, Druid', duration: 'Instantaneous', time: '1 action' } },
  { id: 's3', kind: 'spell', name: 'Mage Hand', edition: '2024', fields: { level: '0', school: 'Conjuration', classes: 'Wizard, Bard, Sorcerer, Warlock', duration: '1 minute', time: '1 action' } },
  { id: 's4', kind: 'spell', name: 'Bless', edition: '2024', fields: { level: '1', school: 'Enchantment', classes: 'Cleric, Paladin', duration: 'Concentration, up to 1 minute', ritual: 'YES', time: '1 action' } },
];

const convertedBless = compendiumRecordToCharacterSpell(sampleRecords[4]);
assert.equal(convertedBless.name, 'Bless');
assert.equal(convertedBless.level, 1);
assert.equal(convertedBless.concentration, true);
assert.equal(convertedBless.ritual, true);

let importedSpells = [];
let modalRenderer;
await act(async () => {
  modalRenderer = TestRenderer.create(
    React.createElement(CompendiumSpellModal, {
      defaultClass: 'Wizard',
      records: sampleRecords,
      onImport: spells => { importedSpells = spells; },
      onClose: () => {},
    })
  );
});
const modalRoot = modalRenderer.root;
// Default class is Wizard -> only Mage Hand (lvl 0) and Fireball (lvl 3) should appear, sorted by level
const spellRows = modalRoot.findAll(el => el.type === 'button' && String(el.props?.className || '').includes('comp-spell-row'));
assert.equal(spellRows.length, 2, 'Should filter out monsters and non-Wizard spells when defaultClass is Wizard');
assert.ok(text(spellRows[0]).includes('Mage Hand'), 'Level 0 spell must sort before Level 3 spell');
assert.ok(text(spellRows[1]).includes('Fireball'), 'Level 3 spell must sort after Level 0 spell');

const importBtn = modalRoot.findAll(el => el.type === 'button' && String(el.props?.className || '').includes('comp-spell-import-btn'))[0];
await act(async () => {
  importBtn.props.onClick();
});
assert.equal(importedSpells.length, 1);
assert.equal(importedSpells[0].name, 'Mage Hand');

const cssSource = fs.readFileSync('src/theme.css', 'utf8');
assert.ok(
  cssSource.includes('.char-sheet input.char-name-input') &&
  cssSource.includes('.char-sheet input.char-class-badge-input') &&
  cssSource.includes('.char-sheet input.char-speed-inline-input'),
  'theme.css must scope inline Character inputs with .char-sheet input.* to override global width:100% and padding:12px'
);

console.log('ALL Character Sheet UI tests passed successfully!');
