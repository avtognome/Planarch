import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; }
};
globalThis.window = {
  dispatchEvent() {}
};

console.log('Testing Homebrew Data Storage & Wiki Sync...');

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

const { readHomebrew, saveHomebrew, deleteHomebrew, recordToWikiMarkdown } = await import(pathToFileURL(path.join(out, 'homebrewData.js')).href);

const campaign = 'Sagara';

// 1. Initial state empty
const initial = readHomebrew(campaign);
assert.deepEqual(initial, [], 'Initial homebrew should be empty');

// 2. Create homebrew monster
const testMonster = {
  id: 'hb-1',
  kind: 'monster',
  name: 'Void Stalker',
  edition: 'Homebrew',
  fields: {
    size: 'M',
    type: 'aberration',
    alignment: 'neutral evil',
    ac: '16 (natural armor)',
    hp: '45 (6d8+18)',
    speed: '40 ft., climb 30 ft.',
    str: 14,
    dex: 18,
    con: 16,
    int: 10,
    wis: 12,
    cha: 8,
    cr: '3',
    trait: [{ name: 'Shadow Camouflage', text: 'Has advantage on Stealth checks in dim light or darkness.' }],
    action: [
      { name: 'Multiattack', text: 'The stalker makes two claw attacks.' },
      { name: 'Claw', text: '+6 to hit, reach 5 ft., one target. Hit: 2d6+4 slashing damage.' }
    ]
  }
};

const result = saveHomebrew(campaign, testMonster);
assert.equal(result.homebrew.length, 1);
assert.equal(result.homebrew[0].name, 'Void Stalker');

// Check localStorage homebrew persistence
const storedHB = JSON.parse(store.get(`wf-homebrew:${campaign}`));
assert.equal(storedHB.length, 1);
assert.equal(storedHB[0].name, 'Void Stalker');

// Check automatic wiki sync
const storedWiki = JSON.parse(store.get(`wf-wiki:${campaign}`));
assert.ok(Array.isArray(storedWiki), 'Wiki storage should be created');
const wikiPage = storedWiki.find(p => p.title === 'Void Stalker');
assert.ok(wikiPage, 'Wiki page for Void Stalker should be automatically created');
assert.equal(wikiPage.category, 'Homebrew');
assert.ok(wikiPage.body.includes('**Armor Class** 16'), 'Wiki body should contain AC');
assert.ok(wikiPage.body.includes('2d6+4 slashing damage'), 'Wiki body should preserve dice expressions');

// 3. Update homebrew preserves and updates the existing wiki page (no duplicates)
const updatedMonster = {
  ...testMonster,
  fields: {
    ...testMonster.fields,
    hp: '52 (7d8+21)'
  }
};

const updatedResult = saveHomebrew(campaign, updatedMonster);
assert.equal(updatedResult.homebrew.length, 1);
const updatedWiki = JSON.parse(store.get(`wf-wiki:${campaign}`));
assert.equal(updatedWiki.filter(p => p.title === 'Void Stalker').length, 1, 'Should update existing wiki page, not duplicate');
assert.ok(updatedWiki[0].body.includes('52 (7d8+21)'));

// 4. Delete homebrew
const afterDelete = deleteHomebrew(campaign, 'hb-1');
assert.equal(afterDelete.length, 0);
assert.equal(readHomebrew(campaign).length, 0);

console.log('✓ Homebrew Data Storage & Wiki Sync tests passed!');
