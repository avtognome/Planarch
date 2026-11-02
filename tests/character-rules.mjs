import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

console.log('Testing 2024 D&D Rules & Character Sheet Calculations...');

const rulesTsPath = path.resolve('src/characterRules.ts');
const modelsTsPath = path.resolve('src/models.ts');

assert.ok(fs.existsSync(rulesTsPath), 'src/characterRules.ts must exist');
assert.ok(fs.existsSync(modelsTsPath), 'src/models.ts must exist');

const outDir = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(outDir, { recursive: true });

for (const filename of ['models.ts', 'characterRules.ts']) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve('src', filename), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText.replace(/from '\.\/([^']+)'/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(outDir, filename.replace('.ts', '.js')), code);
}

const {
  getModifier,
  getProficiencyBonus,
  getPassiveScore,
  getStandardSpellSlots,
  calculateRestRecovery,
  SKILL_DEFINITIONS,
} = await import(pathToFileURL(path.join(outDir, 'characterRules.js')).href);

// 1. Ability Modifiers (formula: Math.floor((score - 10) / 2))
console.log('Checking ability modifiers...');
assert.equal(getModifier(1), -5);
assert.equal(getModifier(8), -1);
assert.equal(getModifier(9), -1);
assert.equal(getModifier(10), 0);
assert.equal(getModifier(11), 0);
assert.equal(getModifier(12), 1);
assert.equal(getModifier(13), 1);
assert.equal(getModifier(14), 2);
assert.equal(getModifier(18), 4);
assert.equal(getModifier(20), 5);
assert.equal(getModifier(30), 10);

// 2. Proficiency Progression (2024 bands: 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6)
console.log('Checking proficiency bonuses...');
assert.equal(getProficiencyBonus(1), 2);
assert.equal(getProficiencyBonus(4), 2);
assert.equal(getProficiencyBonus(5), 3);
assert.equal(getProficiencyBonus(8), 3);
assert.equal(getProficiencyBonus(9), 4);
assert.equal(getProficiencyBonus(12), 4);
assert.equal(getProficiencyBonus(13), 5);
assert.equal(getProficiencyBonus(16), 5);
assert.equal(getProficiencyBonus(17), 6);
assert.equal(getProficiencyBonus(20), 6);

// 3. Passive Scores
console.log('Checking passive scores...');
// Passive = 10 + abilityMod + (isProficient ? profBonus : 0) + (bonus ?? 0)
assert.equal(getPassiveScore(2, false, 2), 12);
assert.equal(getPassiveScore(2, true, 3), 15);
assert.equal(getPassiveScore(3, true, 4, 5), 22);
assert.equal(getPassiveScore(-1, false, 2), 9);
assert.equal(getPassiveScore(0, false, 2, 0), 10);

// 4. Standard Spell Slots
console.log('Checking spell slot tables for classes...');
// Full Casters (Wizard)
assert.deepEqual(getStandardSpellSlots('Wizard', 1), { 1: 2 });
assert.deepEqual(getStandardSpellSlots('wizard', 2), { 1: 3 });
assert.deepEqual(getStandardSpellSlots('Wizard', 3), { 1: 4, 2: 2 });
assert.deepEqual(getStandardSpellSlots('Wizard', 5), { 1: 4, 2: 3, 3: 2 });
assert.deepEqual(getStandardSpellSlots('Wizard', 20), {
  1: 4,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
  6: 2,
  7: 2,
  8: 1,
  9: 1,
});

// Half Casters (Ranger / Paladin - 2024 rules: spellcasting starts at level 1)
assert.deepEqual(getStandardSpellSlots('Ranger', 1), { 1: 2 });
assert.deepEqual(getStandardSpellSlots('ranger', 2), { 1: 2 });
assert.deepEqual(getStandardSpellSlots('Ranger', 3), { 1: 3 });
assert.deepEqual(getStandardSpellSlots('Ranger', 5), { 1: 4, 2: 2 });
assert.deepEqual(getStandardSpellSlots('Paladin', 20), {
  1: 4,
  2: 3,
  3: 3,
  4: 3,
  5: 2,
});

// Pact Magic (Warlock)
assert.deepEqual(getStandardSpellSlots('Warlock', 1), { 1: 1 });
assert.deepEqual(getStandardSpellSlots('warlock', 2), { 1: 2 });
assert.deepEqual(getStandardSpellSlots('Warlock', 3), { 2: 2 });
assert.deepEqual(getStandardSpellSlots('Warlock', 5), { 3: 2 });
assert.deepEqual(getStandardSpellSlots('Warlock', 9), { 5: 2 });
assert.deepEqual(getStandardSpellSlots('Warlock', 11), { 5: 3 });
assert.deepEqual(getStandardSpellSlots('Warlock', 17), { 5: 4 });
assert.deepEqual(getStandardSpellSlots('Warlock', 20), { 5: 4 });

// Non-Casters (Fighter, Barbarian, Rogue, Monk)
assert.deepEqual(getStandardSpellSlots('Fighter', 1), {});
assert.deepEqual(getStandardSpellSlots('fighter', 5), {});
assert.deepEqual(getStandardSpellSlots('Monk', 10), {});

// 5. Skill list and bindings
console.log('Checking skill definitions...');
assert.equal(SKILL_DEFINITIONS.length, 18);
const skillMap = Object.fromEntries(SKILL_DEFINITIONS.map(s => [s.name, s.ability]));
assert.equal(skillMap['Athletics'], 'str');
assert.equal(skillMap['Acrobatics'], 'dex');
assert.equal(skillMap['Sleight of Hand'], 'dex');
assert.equal(skillMap['Stealth'], 'dex');
assert.equal(skillMap['Arcana'], 'int');
assert.equal(skillMap['History'], 'int');
assert.equal(skillMap['Investigation'], 'int');
assert.equal(skillMap['Nature'], 'int');
assert.equal(skillMap['Religion'], 'int');
assert.equal(skillMap['Animal Handling'], 'wis');
assert.equal(skillMap['Insight'], 'wis');
assert.equal(skillMap['Medicine'], 'wis');
assert.equal(skillMap['Perception'], 'wis');
assert.equal(skillMap['Survival'], 'wis');
assert.equal(skillMap['Deception'], 'cha');
assert.equal(skillMap['Intimidation'], 'cha');
assert.equal(skillMap['Performance'], 'cha');
assert.equal(skillMap['Persuasion'], 'cha');

// 6. Rest Recovery: Short Rest
console.log('Checking short rest recovery...');
const warlockChar = {
  id: 'c1',
  name: 'Wyrmling',
  kind: 'Player',
  role: 'Warlock',
  className: 'Warlock',
  level: 5,
  portrait: '',
  personality: '',
  motivation: '',
  relationships: '',
  notes: '',
  hp: 15,
  maxHp: 30,
  initiative: 2,
  spellSlots: {
    3: { max: 2, used: 2 },
  },
  resources: [
    { id: 'r1', name: 'Fey Presence', current: 0, max: 1, resetOn: 'short' },
    { id: 'r2', name: 'Mystic Arcanum', current: 0, max: 1, resetOn: 'long' },
  ],
  hitDice: { current: 3, max: 5, die: 'd8' },
};

const shortRestedWarlock = calculateRestRecovery(warlockChar, 'short');
assert.equal(shortRestedWarlock.spellSlots[3].used, 0, 'Warlock pact slots reset to 0 used on short rest');
assert.equal(shortRestedWarlock.resources[0].current, 1, 'Short rest resource reset to max');
assert.equal(shortRestedWarlock.resources[1].current, 0, 'Long rest resource remains unreset on short rest');

// Wizard short rest should NOT reset spell slots
const wizardChar = {
  id: 'c2',
  name: 'Gondor',
  kind: 'Player',
  role: 'Wizard',
  className: 'Wizard',
  level: 5,
  portrait: '',
  personality: '',
  motivation: '',
  relationships: '',
  notes: '',
  hp: 20,
  maxHp: 28,
  initiative: 1,
  spellSlots: {
    1: { max: 4, used: 3 },
    2: { max: 3, used: 2 },
  },
};
const shortRestedWizard = calculateRestRecovery(wizardChar, 'short');
assert.equal(shortRestedWizard.spellSlots[1].used, 3, 'Wizard slots do not reset on short rest');
assert.equal(shortRestedWizard.spellSlots[2].used, 2, 'Wizard slots do not reset on short rest');

// 7. Rest Recovery: Long Rest
console.log('Checking long rest recovery...');
const damagedChar = {
  id: 'c3',
  name: 'Elminster',
  kind: 'Player',
  role: 'Wizard',
  className: 'Wizard',
  level: 6,
  portrait: '',
  personality: '',
  motivation: '',
  relationships: '',
  notes: '',
  hp: 5,
  maxHp: 35,
  tempHp: 8,
  initiative: 2,
  exhaustion: 2,
  deathSaves: { successes: 2, failures: 1 },
  spellSlots: {
    1: { max: 4, used: 4 },
    2: { max: 3, used: 3 },
    3: { max: 3, used: 2 },
  },
  resources: [
    { id: 'r1', name: 'Arcane Recovery', current: 0, max: 1, resetOn: 'short' },
    { id: 'r2', name: 'Item Charge', current: 0, max: 3, resetOn: 'long' },
    { id: 'r3', name: 'Potion', current: 1, max: 5, resetOn: 'none' },
  ],
  hitDice: { current: 1, max: 6, die: 'd6' },
};

const longRested = calculateRestRecovery(damagedChar, 'long');
assert.equal(longRested.hp, 35, 'HP restored to max on long rest');
assert.equal(longRested.tempHp, 0, 'Temp HP cleared on long rest');
assert.equal(longRested.deathSaves.successes, 0, 'Death saves reset');
assert.equal(longRested.deathSaves.failures, 0, 'Death saves reset');
assert.equal(longRested.exhaustion, 0, 'Exhaustion cleared on long rest');
assert.equal(longRested.spellSlots[1].used, 0, 'All spell slots restored');
assert.equal(longRested.spellSlots[2].used, 0, 'All spell slots restored');
assert.equal(longRested.spellSlots[3].used, 0, 'All spell slots restored');
assert.equal(longRested.resources[0].current, 1, 'Short rest resource reset on long rest');
assert.equal(longRested.resources[1].current, 3, 'Long rest resource reset on long rest');
assert.equal(longRested.resources[2].current, 1, 'Non-reset resource untouched');
// Hit dice restored: floor(6 / 2) = 3 restored; 1 + 3 = 4
assert.equal(longRested.hitDice.current, 4, 'Restores half max hit dice on long rest');

// 8. Legacy character compatibility
console.log('Checking legacy character backwards compatibility...');
const legacyChar = {
  id: 'legacy-1',
  name: 'Old Bob',
  kind: 'NPC',
  role: 'Villager',
  portrait: '',
  personality: 'Calm',
  motivation: 'Farming',
  relationships: 'Family',
  notes: 'None',
  hp: 10,
  initiative: 0,
};

const legacyRested = calculateRestRecovery(legacyChar, 'long');
assert.equal(legacyRested.hp, 10, 'Legacy character remains intact');
assert.equal(legacyRested.name, 'Old Bob');

console.log('All character-rules tests PASSED successfully!');
