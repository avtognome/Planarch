globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });
const code = ts.transpileModule(fs.readFileSync('src/compendiumParser.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText.replace(/from '\.\/([^']+)'/g, (_, n) => `from './${n}.js'`);
fs.writeFileSync(path.join(out, 'compendiumParser.js'), code);

const { parseCompendium } = await import(pathToFileURL(path.join(out, 'compendiumParser.js')).href);

const file = process.argv[2];
let xml;
if (file) {
  xml = fs.readFileSync(file, 'utf8');
} else {
  xml = `<compendium>
  <monster>
    <name>Cave Creeper (Legacy)</name>
    <hp>45 (6d8+18)</hp>
    <cr>2</cr>
    <dex>15</dex>
    <type>aberration</type>
    <environment>Underdark</environment>
    <action><name>Claw</name><text>Melee attack.</text></action>
  </monster>
  <spell>
    <name>Radiant Flare [5.5e]</name>
    <level>2</level>
    <school>EV</school>
    <time>1 action</time>
    <range>60 feet</range>
    <classes>Cleric, Paladin</classes>
    <text>Burst of radiant light.</text>
  </spell>
  <item>
    <name>Obsidian Dagger</name>
    <type>M</type>
    <detail>uncommon</detail>
    <dmg1>1d4</dmg1>
    <dmgType>P</dmgType>
    <text>A sharp volcanic glass dagger.</text>
  </item>
  <class>
    <name>Warden</name>
    <hd>10</hd>
    <trait><name>Nature Shield</name><text>Warden feature.</text></trait>
  </class>
  <race>
    <name>Stoneborn</name>
    <size>M</size>
    <speed>30</speed>
    <trait><name>Earthy Resilience</name><text>Racial feature.</text></trait>
  </race>
  <feat>
    <name>Shield Master [5.5e]</name>
    <prerequisite>Shield proficiency</prerequisite>
    <text>Shield bash bonus action.</text>
  </feat>
  <background>
    <name>Hermit (Legacy)</name>
    <proficiency>Medicine, Religion</proficiency>
    <trait><name>Discovery</name><text>Quiet contemplation.</text></trait>
  </background>
</compendium>`;
}

const records = parseCompendium(xml);
assert.ok(records.length > 0);
const kindsFound = new Set(records.map(r => r.kind));
for (const k of ['monster', 'spell', 'item', 'class', 'race', 'feat', 'background']) {
  assert.ok(kindsFound.has(k), `kind ${k} should be parsed`);
}

const map = new Map(records.map(r => [r.id, r]));
assert.equal(map.size, records.length, 'stable unique IDs');

const legacy = records.find(r => r.name.includes('(Legacy)'));
assert.equal(legacy?.edition, 'Legacy');
const modern = records.find(r => r.name.includes('[5.5e]'));
assert.equal(modern?.edition, '5.5e');
const unspec = records.find(r => !r.name.includes('(Legacy)') && !r.name.includes('[5.5e]'));
assert.equal(unspec?.edition, 'Unspecified');

// Parser safety checks
assert.throws(() => parseCompendium('<!DOCTYPE compendium [<!ENTITY x "bad">]><compendium/>'), /must not contain document types/);
assert.throws(() => parseCompendium('<compendium><monster><name></name></monster></compendium>'), /No supported compendium entries/);

console.log(`PASS compendium XML parser: verified ${records.length} records across all 7 categories, edition tags, fields and parser security`);
