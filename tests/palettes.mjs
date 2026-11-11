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
assert.equal(PALETTES.length, 5, 'PALETTES must contain exactly 5 palettes');

const expectedIds = [
  'black-stallion',
  'space-cadet',
  'ceres',
  'twinkle',
  'charcoal'
];

const foundIds = PALETTES.map(p => p.id);
assert.deepEqual(foundIds, expectedIds, `Palette IDs must match expected: ${expectedIds.join(', ')}`);

const darkPalettes = PALETTES.filter(p => p.mode === 'dark');
assert.equal(darkPalettes.length, 5, 'Must have 5 dark palettes');

for (const palette of PALETTES) {
  assert.ok(typeof palette.id === 'string' && palette.id.length > 0, `Palette ${palette.id} missing id`);
  assert.ok(typeof palette.name === 'string' && palette.name.length > 0, `Palette ${palette.id} missing name`);
  assert.equal(palette.mode, 'dark', `Palette ${palette.id} mode must be dark`);
  assert.ok(typeof palette.canvas === 'string' && palette.canvas.length > 0, `Palette ${palette.id} missing canvas`);
  assert.ok(typeof palette.surface === 'string' && palette.surface.length > 0, `Palette ${palette.id} missing surface`);
  assert.ok(typeof palette.text === 'string' && palette.text.length > 0, `Palette ${palette.id} missing text`);
  assert.ok(typeof palette.accent === 'string' && palette.accent.length > 0, `Palette ${palette.id} missing accent`);
  assert.ok(Array.isArray(palette.swatches) && palette.swatches.length === 6, `Palette ${palette.id} must have 6 swatches`);
  assert.ok(typeof palette.description === 'string' && palette.description.length > 0, `Palette ${palette.id} missing description`);
}

// 2. Validate exact colors according to brief
const paletteMap = new Map(PALETTES.map(p => [p.id, p]));

const blackStallion = paletteMap.get('black-stallion');
assert.equal(blackStallion.canvas, '#081919');
assert.equal(blackStallion.surface, '#223330');
assert.equal(blackStallion.text, '#d8d5ce');
assert.equal(blackStallion.accent, '#ce1a1e');
assert.equal(blackStallion.secondary, '#65060e');

const spaceCadet = paletteMap.get('space-cadet');
assert.equal(spaceCadet.canvas, '#101323');
assert.equal(spaceCadet.surface, '#23294e');
assert.equal(spaceCadet.text, '#e8eaff');
assert.equal(spaceCadet.accent, '#646894');
assert.equal(spaceCadet.secondary, '#3f436e');

const ceres = paletteMap.get('ceres');
assert.equal(ceres.canvas, '#0a1b22');
assert.equal(ceres.surface, '#132530');
assert.equal(ceres.text, '#cbd1d2');
assert.equal(ceres.accent, '#cbd1d2');
assert.equal(ceres.secondary, '#4a5d6b');

const twinkle = paletteMap.get('twinkle');
assert.equal(twinkle.canvas, '#141722');
assert.equal(twinkle.surface, '#1e2233');
assert.equal(twinkle.text, '#ead7c0');
assert.equal(twinkle.accent, '#c59b76');
assert.equal(twinkle.secondary, '#96a5ac');

const charcoal = paletteMap.get('charcoal');
assert.equal(charcoal.canvas, '#101010');
assert.equal(charcoal.surface, '#272727');
assert.equal(charcoal.text, '#f2f2f2');
assert.equal(charcoal.accent, '#f2f2f2');
assert.equal(charcoal.secondary, '#393939');

// 3. Test resolvePalette
assert.equal(resolvePalette('dark').id, 'charcoal', "resolvePalette('dark') must return charcoal");
assert.equal(resolvePalette('light').id, 'charcoal', "resolvePalette('light') must return charcoal");
for (const id of expectedIds) {
  assert.equal(resolvePalette(id).id, id, `resolvePalette('${id}') must return ${id}`);
}
assert.equal(resolvePalette(null).id, 'charcoal', "resolvePalette(null) must return default charcoal");
assert.equal(resolvePalette(undefined).id, 'charcoal', "resolvePalette(undefined) must return default charcoal");
assert.equal(resolvePalette('').id, 'charcoal', "resolvePalette('') must return default charcoal");
assert.equal(resolvePalette('invalid-theme').id, 'charcoal', "resolvePalette('invalid-theme') must return default charcoal");

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

// Ensure each of the 5 palette classes exists
for (const id of expectedIds) {
  const className = `.theme-${id}`;
  assert.ok(themeCss.includes(className), `src/theme.css missing class ${className}`);
}

console.log('PASS theme.css: all 5 palette classes and baselines present without em dashes');
