import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; }
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  innerWidth: 1200,
  innerHeight: 800
};
globalThis.document = {
  querySelector() { return null; },
  getElementById() { return null; }
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Section Page Headers without AI Slop...');

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

store.set('wf-campaign', JSON.stringify('Sagara'));
store.set('wf-campaigns', JSON.stringify(['Sagara']));

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

let testRenderer;
await act(async () => {
  testRenderer = TestRenderer.create(React.createElement(App));
});

const root = testRenderer.root;

// Navigate to 'Encounters'
const encountersBtn = root.findAll(el => el.type === 'button' && Array.isArray(el.props?.children) && el.props.children.includes('Encounters'))[0];
assert.ok(encountersBtn, 'Encounters nav button exists');

await act(async () => {
  encountersBtn.props.onClick();
});

// Check header style
const slopStar = root.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('heading-star'));
assert.equal(slopStar.length, 0, 'Sparkle star ✧ should not exist in headers');

const heroHeader = root.find(el => typeof el.props?.className === 'string' && el.props.className.includes('campaign-hero-header'));
assert.ok(heroHeader, 'Section page should use clean campaign-hero-header');

const title = root.find(el => typeof el.props?.className === 'string' && el.props.className.includes('campaign-hero-title'));
assert.equal(title.props.children, 'Encounters');

// Check no slogans
const sloganPhrases = [
  'Every great story deserves a soundscape',
  'Prepare the challenge',
  'Remember the people',
  'Your sourcebook',
  'Keep the clues'
];
for (const phrase of sloganPhrases) {
  const matches = root.findAll(el => typeof el.props?.children === 'string' && el.props.children.includes(phrase));
  assert.equal(matches.length, 0, `Header should not contain slogan: "${phrase}"`);
}

console.log('✓ Section Page Headers clean test passed!');
