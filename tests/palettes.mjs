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
assert.equal(PALETTES.length, 6, 'PALETTES must contain exactly 6 palettes');

const expectedIds = [
  'themberchaud',
  'fulgur',
  'exanimo',
  'celeste',
  'lady-of-silver',
  'kreldo'
];

const foundIds = PALETTES.map(p => p.id);
assert.deepEqual(foundIds, expectedIds, `Palette IDs must match expected: ${expectedIds.join(', ')}`);

const darkPalettes = PALETTES.filter(p => p.mode === 'dark');
assert.equal(darkPalettes.length, 6, 'Must have 6 dark palettes');

for (const palette of PALETTES) {
  assert.ok(typeof palette.id === 'string' && palette.id.length > 0, `Palette ${palette.id} missing id`);
  assert.ok(typeof palette.name === 'string' && palette.name.length > 0, `Palette ${palette.id} missing name`);
  assert.equal(palette.mode, 'dark', `Palette ${palette.id} mode must be dark`);
  assert.ok(typeof palette.canvas === 'string' && palette.canvas.length > 0, `Palette ${palette.id} missing canvas`);
  assert.ok(typeof palette.surface === 'string' && palette.surface.length > 0, `Palette ${palette.id} missing surface`);
  assert.ok(typeof palette.text === 'string' && palette.text.length > 0, `Palette ${palette.id} missing text`);
  assert.ok(typeof palette.accent === 'string' && palette.accent.length > 0, `Palette ${palette.id} missing accent`);
  assert.ok(typeof palette.description === 'string' && palette.description.length > 0, `Palette ${palette.id} missing description`);
}

// 2. Validate exact colors according to brief
const paletteMap = new Map(PALETTES.map(p => [p.id, p]));

const themberchaud = paletteMap.get('themberchaud');
assert.equal(themberchaud.surface, '#304352');
assert.equal(themberchaud.text, '#eebd83');
assert.equal(themberchaud.accent, '#f7a653');

const fulgur = paletteMap.get('fulgur');
assert.equal(fulgur.surface, '#1a284b');
assert.equal(fulgur.accent, '#c3a7e3');
assert.equal(fulgur.secondary, '#4f95b1');

const exanimo = paletteMap.get('exanimo');
assert.equal(exanimo.canvas, '#0f0f0f');
assert.equal(exanimo.text, '#f5f0e6');
assert.equal(exanimo.secondary, '#5d3fd3');

const celeste = paletteMap.get('celeste');
assert.equal(celeste.surface, '#1a2342');
assert.equal(celeste.text, '#e4d3b4');
assert.equal(celeste.accent, '#c2a368');

const ladyOfSilver = paletteMap.get('lady-of-silver');
assert.equal(ladyOfSilver.canvas, '#181818');
assert.equal(ladyOfSilver.surface, '#282828');
assert.equal(ladyOfSilver.text, '#b8b0b0');
assert.equal(ladyOfSilver.accent, '#b8b0a0');

const kreldo = paletteMap.get('kreldo');
assert.equal(kreldo.canvas, '#060d08');
assert.equal(kreldo.surface, '#1d2a10');
assert.equal(kreldo.accent, '#cd8a39');

// 3. Test resolvePalette
assert.equal(resolvePalette('dark').id, 'celeste', "resolvePalette('dark') must return celeste");
assert.equal(resolvePalette('light').id, 'celeste', "resolvePalette('light') must return celeste");
for (const id of expectedIds) {
  assert.equal(resolvePalette(id).id, id, `resolvePalette('${id}') must return ${id}`);
}
assert.equal(resolvePalette(null).id, 'celeste', "resolvePalette(null) must return default celeste");
assert.equal(resolvePalette(undefined).id, 'celeste', "resolvePalette(undefined) must return default celeste");
assert.equal(resolvePalette('').id, 'celeste', "resolvePalette('') must return default celeste");
assert.equal(resolvePalette('invalid-theme').id, 'celeste', "resolvePalette('invalid-theme') must return default celeste");

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

// Ensure each of the 6 palette classes exists
for (const id of expectedIds) {
  const className = `.theme-${id}`;
  assert.ok(themeCss.includes(className), `src/theme.css missing class ${className}`);
}

console.log('PASS theme.css: all 6 palette classes and baselines present without em dashes');
