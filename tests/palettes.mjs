import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

console.log('Testing Palettes System (Charcoal Only)...');

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

// 1. Validate PALETTES array only has charcoal
assert.ok(Array.isArray(PALETTES), 'PALETTES must be an array');
assert.equal(PALETTES.length, 1, 'PALETTES must contain exactly 1 palette: charcoal');
assert.equal(PALETTES[0].id, 'charcoal', 'Palette ID must be charcoal');

// 2. Validate resolvePalette behavior
assert.equal(resolvePalette('charcoal').id, 'charcoal');
assert.equal(resolvePalette('charcoal').mode, 'dark');
assert.equal(resolvePalette('dark').id, 'charcoal');
assert.equal(resolvePalette('dark').mode, 'dark');
assert.equal(resolvePalette('light').id, 'charcoal');
assert.equal(resolvePalette('light').mode, 'light');
assert.equal(resolvePalette(null).id, 'charcoal');
assert.equal(resolvePalette(null).mode, 'dark');
assert.equal(resolvePalette(undefined).id, 'charcoal');
assert.equal(resolvePalette(undefined).mode, 'dark');
assert.equal(resolvePalette('space-cadet').id, 'charcoal');
assert.equal(resolvePalette('space-cadet').mode, 'dark');

console.log('PASS palettes: only charcoal exists and fallback always resolves to charcoal');
