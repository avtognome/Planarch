import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

console.log('Testing Palettes System & Tokens...');

// Check source file exists
const palettesTsPath = path.resolve('src/palettes.ts');
assert.ok(fs.existsSync(palettesTsPath), 'src/palettes.ts must exist');

const outDir = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(outDir, { recursive: true });

const code = ts.transpileModule(fs.readFileSync(palettesTsPath, 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext
  }
}).outputText;

const outJsPath = path.join(outDir, 'palettes.js');
fs.writeFileSync(outJsPath, code);

const { PALETTES, resolvePalette } = await import(pathToFileURL(outJsPath).href);

// 1. Validate PALETTES array
assert.ok(Array.isArray(PALETTES), 'PALETTES must be an array');
assert.equal(PALETTES.length, 8, 'PALETTES must contain exactly 8 palettes');

const expectedIds = [
  'totality',
  'futuristic',
  'spacex',
  'mission-control',
  'apple',
  'premium',
  'cursor',
  'ollama'
];

const foundIds = PALETTES.map(p => p.id);
assert.deepEqual(foundIds, expectedIds, `Palette IDs must match expected: ${expectedIds.join(', ')}`);

const darkPalettes = PALETTES.filter(p => p.mode === 'dark');
const lightPalettes = PALETTES.filter(p => p.mode === 'light');
assert.equal(darkPalettes.length, 4, 'Must have exactly 4 dark palettes');
assert.equal(lightPalettes.length, 4, 'Must have exactly 4 light palettes');

for (const palette of PALETTES) {
  assert.ok(typeof palette.id === 'string' && palette.id.length > 0, `Palette ${palette.id} missing id`);
  assert.ok(typeof palette.name === 'string' && palette.name.length > 0, `Palette ${palette.id} missing name`);
  assert.ok(['dark', 'light'].includes(palette.mode), `Palette ${palette.id} mode must be dark or light`);
  assert.ok(typeof palette.canvas === 'string' && palette.canvas.length > 0, `Palette ${palette.id} missing canvas`);
  assert.ok(typeof palette.surface === 'string' && palette.surface.length > 0, `Palette ${palette.id} missing surface`);
  assert.ok(typeof palette.text === 'string' && palette.text.length > 0, `Palette ${palette.id} missing text`);
  assert.ok(typeof palette.accent === 'string' && palette.accent.length > 0, `Palette ${palette.id} missing accent`);
  assert.ok(typeof palette.description === 'string' && palette.description.length > 0, `Palette ${palette.id} missing description`);
}

// 2. Validate exact colors according to brief
const paletteMap = new Map(PALETTES.map(p => [p.id, p]));

// Totality
const totality = paletteMap.get('totality');
assert.equal(totality.canvas, '#121318');
assert.equal(totality.surface, '#1e1f25');
assert.equal(totality.text, '#e3e1e9');
assert.equal(totality.accent, '#ffd700');

// Futuristic
const futuristic = paletteMap.get('futuristic');
assert.equal(futuristic.canvas, '#090b12');
assert.equal(futuristic.surface, '#121722');
assert.equal(futuristic.text, '#f8fafc');
assert.equal(futuristic.accent, '#3b82f6');

// SpaceX
const spacex = paletteMap.get('spacex');
assert.equal(spacex.canvas, '#000000');
assert.equal(spacex.surface, '#000000');
assert.equal(spacex.text, '#f0f0fa');
assert.equal(spacex.accent, '#f0f0fa');

// Mission Control
const missionControl = paletteMap.get('mission-control');
assert.equal(missionControl.canvas, '#0b1120');
assert.equal(missionControl.surface, '#111827');
assert.equal(missionControl.text, '#e8f0fe');
assert.equal(missionControl.accent, '#ffb800');

// Apple
const apple = paletteMap.get('apple');
assert.equal(apple.canvas, '#ffffff');
assert.equal(apple.surface, '#f5f5f7');
assert.equal(apple.text, '#1d1d1f');
assert.equal(apple.accent, '#0071e3');

// Premium
const premium = paletteMap.get('premium');
assert.equal(premium.canvas, '#faf8f4');
assert.equal(premium.surface, '#ffffff');
assert.equal(premium.text, '#1c1b19');
assert.equal(premium.accent, '#a06a3b');

// Cursor
const cursor = paletteMap.get('cursor');
assert.equal(cursor.canvas, '#f2f1ed');
assert.equal(cursor.surface, '#e6e5e0');
assert.equal(cursor.text, '#26251e');
assert.equal(cursor.accent, '#f54e00');

// Ollama
const ollama = paletteMap.get('ollama');
assert.equal(ollama.canvas, '#ffffff');
assert.equal(ollama.surface, '#fafafa');
assert.equal(ollama.text, '#000000');
assert.equal(ollama.accent, '#000000');

// 3. Test resolvePalette
assert.equal(resolvePalette('dark').id, 'mission-control', "resolvePalette('dark') must return mission-control");
assert.equal(resolvePalette('light').id, 'premium', "resolvePalette('light') must return premium");
assert.equal(resolvePalette('totality').id, 'totality', "resolvePalette('totality') must return totality");
assert.equal(resolvePalette('futuristic').id, 'futuristic', "resolvePalette('futuristic') must return futuristic");
assert.equal(resolvePalette('spacex').id, 'spacex', "resolvePalette('spacex') must return spacex");
assert.equal(resolvePalette('mission-control').id, 'mission-control', "resolvePalette('mission-control') must return mission-control");
assert.equal(resolvePalette('apple').id, 'apple', "resolvePalette('apple') must return apple");
assert.equal(resolvePalette('premium').id, 'premium', "resolvePalette('premium') must return premium");
assert.equal(resolvePalette('cursor').id, 'cursor', "resolvePalette('cursor') must return cursor");
assert.equal(resolvePalette('ollama').id, 'ollama', "resolvePalette('ollama') must return ollama");
assert.equal(resolvePalette(null).id, 'premium', "resolvePalette(null) must return default premium");
assert.equal(resolvePalette(undefined).id, 'premium', "resolvePalette(undefined) must return default premium");
assert.equal(resolvePalette('').id, 'premium', "resolvePalette('') must return default premium");
assert.equal(resolvePalette('invalid-theme').id, 'premium', "resolvePalette('invalid-theme') must return default premium");

console.log('PASS palettes: TypeScript exports and resolution logic correct');

// 4. Test theme.css for required theme classes and tokens
const themeCss = fs.readFileSync('src/theme.css', 'utf8');

// Ensure no em dashes
assert.ok(!themeCss.includes('\u2014'), 'src/theme.css must not contain em dashes');
const palettesTsContent = fs.readFileSync(palettesTsPath, 'utf8');
assert.ok(!palettesTsContent.includes('\u2014'), 'src/palettes.ts must not contain em dashes');

// Ensure .theme-dark and .theme-light baselines exist
assert.ok(themeCss.includes('.theme-dark'), 'src/theme.css missing .theme-dark baseline');
assert.ok(themeCss.includes('.theme-light'), 'src/theme.css missing .theme-light baseline');

// Ensure each of the 8 palette classes exists
for (const id of expectedIds) {
  const className = `.theme-${id}`;
  assert.ok(themeCss.includes(className), `src/theme.css missing class ${className}`);
}

console.log('PASS theme.css: all 8 palette classes and baselines present without em dashes');
