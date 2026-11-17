import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

for (const filename of ['sources.ts', 'sceneLibrary.ts']) {
  const sourcePath = path.resolve('src', filename);
  assert.ok(fs.existsSync(sourcePath), `src/${filename} must exist`);
  const code = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from ['"]\.\/([^'"]+)(?:\.js)?['"]/g, (_, name) => `from './${name}.js'`);
  fs.writeFileSync(path.join(out, filename.replace('.ts', '.js')), code);
}

const {
  findSceneIndexById,
  normalizeScenes,
  removeSceneById,
  updateSceneById,
} = await import(pathToFileURL(path.join(out, 'sceneLibrary.js')).href);

const scene = (name, id) => ({ id, name, tag: 'Exploration', art: '', desc: '', layers: [1, 2] });

const bundled = normalizeScenes([scene('Forest'), scene('Forest')], 'builtin');
assert.deepEqual(bundled.map(item => item.id), ['builtin:forest', 'builtin:forest-2'], 'bundled IDs stay deterministic and distinct');
assert.deepEqual(normalizeScenes([scene('Forest'), scene('Forest')], 'builtin'), bundled, 'same bundled scenes receive same IDs');

const legacy = normalizeScenes([scene('Camp'), scene('Camp')], 'custom');
assert.equal(new Set(legacy.map(item => item.id)).size, 2, 'duplicate legacy custom names receive distinct IDs');
assert.ok(legacy.every(item => item.id?.startsWith('custom:camp')), 'migrated custom IDs retain readable stable prefix');
assert.deepEqual(normalizeScenes(legacy, 'custom'), legacy, 'existing migrated IDs remain stable');

const records = [scene('One', 'custom:one'), scene('Two', 'custom:two'), scene('Three', 'custom:three')];
const updated = updateSceneById(records, 'custom:two', current => ({ ...current, name: 'Changed' }));
assert.deepEqual(updated.map(item => item.name), ['One', 'Changed', 'Three'], 'update changes exactly one matching record');
assert.notEqual(updated, records, 'update returns new array');
assert.equal(updated[0], records[0], 'update preserves untouched records');

const removed = removeSceneById(records, 'custom:two');
assert.deepEqual(removed.map(item => item.id), ['custom:one', 'custom:three'], 'remove deletes exactly one matching record');
assert.equal(removeSceneById(records, 'missing'), records, 'missing remove preserves original array');

assert.equal(findSceneIndexById(records, 'custom:two'), 1, 'selection resolves matching ID');
assert.equal(findSceneIndexById(records, 'missing'), 0, 'missing selection falls back to first scene');
assert.equal(findSceneIndexById([], 'missing'), -1, 'empty library has no valid selection');

const appSource = fs.readFileSync('src/App.tsx', 'utf8');
assert.match(appSource, /id: 'builtin:the-drowned-coast'/, 'bundled scene identity is explicit and independent of display name');
assert.doesNotMatch(appSource, /selectedSceneNames/, 'bulk selection stores stable scene IDs, not names');
assert.match(appSource, /selectedSceneIds\.has\(s\.id!\)/, 'bulk checkbox state resolves by scene ID');
assert.match(appSource, /baseVisibleBuiltinScenes\.length \|\| normalizedCustom\.length \? baseVisibleBuiltinScenes : scenes/, 'library restores bundled visibility instead of activating hidden fallback');

console.log('PASS scene library identity and mutation helpers');
