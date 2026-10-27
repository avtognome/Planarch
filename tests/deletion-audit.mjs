import assert from 'node:assert/strict';

// Test removal of combatant from live battle
export function removeCombatantFromBattle(battle, combatantId) {
  return battle.filter(m => m.id !== combatantId);
}

// Test clearing of character portrait
export function clearCharacterPortrait(character) {
  return { ...character, portrait: '' };
}

// Test removal of custom condition from character/combatant
export function removeConditionTag(conditionsStr, conditionToRemove) {
  return conditionsStr
    .split(',')
    .map(c => c.trim())
    .filter(c => c && c.toLowerCase() !== conditionToRemove.toLowerCase())
    .join(', ');
}

// Verification 1: Combatant removal from battle
const battle = [
  { id: 'c1', name: 'Goblin 1', hp: 7 },
  { id: 'c2', name: 'Goblin 2', hp: 7 }
];
const updatedBattle = removeCombatantFromBattle(battle, 'c1');
assert.deepEqual(updatedBattle, [{ id: 'c2', name: 'Goblin 2', hp: 7 }]);
console.log('PASS: Combatant removal from live battle works');

// Verification 2: Character portrait removal
const char = { id: 'p1', name: 'Valeros', portrait: 'data:image/png;base64,...' };
const clearedChar = clearCharacterPortrait(char);
assert.equal(clearedChar.portrait, '');
console.log('PASS: Character portrait clear works');

// Verification 3: Condition removal
const conditions = 'Poisoned, Exhaustion 1, Blinded';
const afterConditionRemove = removeConditionTag(conditions, 'Exhaustion 1');
assert.equal(afterConditionRemove, 'Poisoned, Blinded');
console.log('PASS: Condition removal works cleanly');
