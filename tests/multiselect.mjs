import assert from 'node:assert/strict';

// Test 1: Wiki batch deletion logic
export function batchDeleteWiki(items, selectedIds) {
  const set = new Set(selectedIds);
  return items.filter(item => !set.has(item.id));
}

// Test 2: Scene library removal (custom scenes deleted, built-in scenes hidden)
export function batchRemoveScenes(allScenes, customScenes, hiddenBuiltinNames, selectedNames) {
  const selected = new Set(selectedNames);
  const nextCustom = customScenes.filter(s => !selected.has(s.name));
  const nextHidden = new Set(hiddenBuiltinNames);
  
  for (const name of selected) {
    // If not in custom scenes, it was a built-in scene
    if (!customScenes.some(s => s.name === name)) {
      nextHidden.add(name);
    }
  }
  return {
    custom: nextCustom,
    hiddenBuiltins: Array.from(nextHidden)
  };
}

export function restoreBuiltinScenes() {
  return [];
}

const sampleWiki = [
  { id: '1', title: 'Tavern' },
  { id: '2', title: 'Forest' },
  { id: '3', title: 'Dungeon' }
];

const afterWikiDelete = batchDeleteWiki(sampleWiki, ['1', '3']);
assert.deepEqual(afterWikiDelete, [{ id: '2', title: 'Forest' }]);
console.log('PASS: Wiki batch deletion filters items correctly');

const defaultScenes = [
  { name: 'The Drowned Coast' },
  { name: 'Whispers in the Pines' }
];
const customScenes = [
  { name: 'Custom Cave' },
  { name: 'Custom Tavern' }
];

const result = batchRemoveScenes(
  [...defaultScenes, ...customScenes],
  customScenes,
  [],
  ['Custom Cave', 'The Drowned Coast']
);

assert.deepEqual(result.custom, [{ name: 'Custom Tavern' }]);
assert.deepEqual(result.hiddenBuiltins, ['The Drowned Coast']);
console.log('PASS: Scene removal handles custom and built-in scenes cleanly');

assert.deepEqual(restoreBuiltinScenes(), []);
console.log('PASS: Restore built-in scenes clears hidden list');
