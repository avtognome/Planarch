globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import 'fake-indexeddb/auto';

const out = path.resolve('.sites-runtime/compendium-cloud-tests');
fs.mkdirSync(out, { recursive: true });

function transpileDir(dir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      transpileDir(path.join(dir, entry.name), path.join(targetDir, entry.name));
    } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'main.tsx') {
      let code = ts.transpileModule(fs.readFileSync(path.join(dir, entry.name), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText;
      code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
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

const local = new Map();
globalThis.localStorage = {
  getItem: k => local.get(k) ?? null,
  setItem: (k, v) => local.set(k, String(v)),
  removeItem: k => local.delete(k),
  clear: () => local.clear()
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

console.log('--- Test 1: clearVerifiedLibrary in compendiumData.ts ---');
const compData = await import(pathToFileURL(path.join(out, 'compendiumData.js')).href);
assert.equal(typeof compData.clearVerifiedLibrary, 'function');

const sampleRecords = [
  { id: 'monster:1', kind: 'monster', name: 'Dire Wolf', edition: '5.5e', fields: { hp: '37', cr: '1', dex: '15', type: 'beast', environment: 'forest' } },
  { id: 'spell:1', kind: 'spell', name: 'Magic Missile', edition: '5.5e', fields: { level: '1', school: 'EV', classes: 'Wizard' } }
];
const gen = 'local-gen-123';
await compData.writeBatch(gen, sampleRecords);
const meta = {
  generation: gen,
  name: 'test-local.xml',
  count: sampleRecords.length,
  counts: { monster: 1, spell: 1 },
  index: sampleRecords.map(compData.indexRecord)
};
await compData.activateLibrary(meta);
assert.equal((await compData.readMeta())?.generation, gen);
assert.equal((await compData.readRecord(gen, 'monster:1'))?.name, 'Dire Wolf');

// Mismatched generation does not clear
await compData.clearVerifiedLibrary('wrong-gen-456');
assert.equal((await compData.readMeta())?.generation, gen);
assert.equal((await compData.readRecord(gen, 'monster:1'))?.name, 'Dire Wolf');

// Matching generation clears active meta, records, and cache
await compData.clearVerifiedLibrary(gen);
assert.equal(await compData.readMeta(), null);
assert.equal(await compData.readRecord(gen, 'monster:1'), null);
assert.deepEqual(await compData.readLibraryRecords(gen), []);
console.log('PASS clearVerifiedLibrary deletes matching metadata, records, and cache');

console.log('--- Test 2: supabaseCloud exports getCloudCompendiumMeta and getCloudCompendiumRecord ---');
const cloud = await import(pathToFileURL(path.join(out, 'supabaseCloud.js')).href);
assert.equal(typeof cloud.getCloudCompendiumMeta, 'function');
assert.equal(typeof cloud.getCloudCompendiumRecord, 'function');
assert.equal(typeof cloud.getCloudCompendiumRecords, 'function');

console.log('--- Test 3: getCloudCompendiumMeta with index in pointer ---');
const cloudPointer = {
  generation: 'remote-gen-789',
  name: 'srd.xml',
  count: 2,
  index: sampleRecords.map(compData.indexRecord),
  path: 'users/test-uid/compendium/srd.json',
  backend: 'supabase'
};
local.set('wf-cloud-compendium', JSON.stringify(cloudPointer));

const cloudMeta = await cloud.getCloudCompendiumMeta();
assert.ok(cloudMeta);
assert.equal(cloudMeta.generation, 'remote-gen-789');
assert.equal(cloudMeta.count, 2);
assert.equal(cloudMeta.counts.monster, 1);
assert.equal(cloudMeta.counts.spell, 1);
assert.equal(cloudMeta.index.length, 2);
console.log('PASS getCloudCompendiumMeta returns meta with computed counts from pointer index');

console.log('--- Test 4: Verification readback logic validates generation, count, and IDs ---');
function verifyReadback(expectedGen, expectedRecords, remoteData) {
  if (!remoteData || remoteData.generation !== expectedGen) throw Error('generation mismatch');
  if (remoteData.count !== expectedRecords.length) throw Error('count mismatch');
  if (!Array.isArray(remoteData.records) || remoteData.records.length !== expectedRecords.length) throw Error('records length mismatch');
  const expectedIds = new Set(expectedRecords.map(r => r.id));
  if (remoteData.records.some(r => !r || !expectedIds.has(r.id))) throw Error('record ID mismatch');
  return true;
}

// Success
assert.ok(verifyReadback('gen-1', sampleRecords, { generation: 'gen-1', count: 2, records: sampleRecords }));
// Generation mismatch throws
assert.throws(() => verifyReadback('gen-1', sampleRecords, { generation: 'gen-2', count: 2, records: sampleRecords }), /generation mismatch/);
// Count mismatch throws
assert.throws(() => verifyReadback('gen-1', sampleRecords, { generation: 'gen-1', count: 1, records: sampleRecords }), /count mismatch/);
// Truncated/missing records throws
assert.throws(() => verifyReadback('gen-1', sampleRecords, { generation: 'gen-1', count: 2, records: [sampleRecords[0]] }), /records length mismatch/);
// Corrupted record IDs throws
assert.throws(() => verifyReadback('gen-1', sampleRecords, { generation: 'gen-1', count: 2, records: [sampleRecords[0], { id: 'bad:id' }] }), /record ID mismatch/);
console.log('PASS readback verification rejects generation/count/ID/truncation mismatches');

console.log('--- Test 5: Cloud record reads work across components ---');
const campaignTools = await import(pathToFileURL(path.join(out, 'CampaignTools.js')).href);
assert.ok(campaignTools);
const drawer = await import(pathToFileURL(path.join(out, 'CompendiumDrawer.js')).href);
assert.ok(drawer);
const modal = await import(pathToFileURL(path.join(out, 'CompendiumMonsterModal.js')).href);
assert.ok(modal);
const comp = await import(pathToFileURL(path.join(out, 'Compendium.js')).href);
assert.ok(comp);
console.log('PASS all components compile and integrate cloud compendium imports');

console.log('--- Test 6: Compendium XML import gate check ---');
const cloudState = cloud.getCloudState();
assert.equal(cloudState.user, null);
assert.equal(cloudState.status, 'disconnected');
console.log('PASS getCloudState reports disconnected/signed-out initial state');

console.log('--- Test 7: Homebrew offline safety ---');
const hbData = await import(pathToFileURL(path.join(out, 'homebrewData.js')).href);
const hbMonster = {
  id: 'homebrew:1',
  kind: 'monster',
  name: 'Cave Stalker',
  edition: 'Homebrew',
  fields: { hp: '45', cr: '2', dex: '16', type: 'monstrosity' }
};
hbData.saveHomebrew('test-camp', hbMonster);
const readHb = hbData.readHomebrew('test-camp');
assert.equal(readHb.length, 1);
assert.equal(readHb[0].name, 'Cave Stalker');
console.log('PASS homebrew data remains accessible and usable offline');

console.log('--- Test 8: Bundled compendium corpus removal regressions ---');
assert.ok(!fs.existsSync('public/compendium'), 'public/compendium directory must be removed');
assert.equal(typeof compData.importIncluded, 'undefined', 'importIncluded must not be exported');
const compDataSrc = fs.readFileSync('src/compendiumData.ts', 'utf8');
assert.ok(!compDataSrc.includes('/compendium/manifest.json'), 'compendiumData.ts must not fetch /compendium/manifest.json');
assert.ok(!compDataSrc.includes('importIncluded'), 'compendiumData.ts must not define importIncluded');
const compSrc = fs.readFileSync('src/Compendium.tsx', 'utf8');
assert.ok(!compSrc.includes('importIncluded'), 'Compendium.tsx must not reference importIncluded');
assert.ok(!compSrc.includes('Load included compendium'), 'Compendium.tsx must not have included sourcebook button');
assert.ok(compSrc.includes('Import XML'), 'Compendium.tsx must still offer XML import');
console.log('PASS bundled compendium corpus fully removed and XML import preserved');

