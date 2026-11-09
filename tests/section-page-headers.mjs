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

// Check no breadcrumbs
const breadcrumbs = root.findAll(el => typeof el.props?.className === 'string' && el.props.className.split(/\s+/).includes('breadcrumb'));
assert.equal(breadcrumbs.length, 0, 'No breadcrumb elements should exist in the app');

// Check campaign switch status (idle state: no "Ready to plan", no campaign-status)
const readyToPlan = root.findAll(el => (typeof el.props?.children === 'string' && el.props.children.includes('Ready to plan')) || (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('Ready to plan'))));
assert.equal(readyToPlan.length, 0, 'Idle "Ready to plan" status should not exist');

const idleStatus = root.findAll(el => typeof el.props?.className === 'string' && el.props.className.split(/\s+/).includes('campaign-status'));
assert.equal(idleStatus.length, 0, 'campaign-status element should not be rendered when encounter is idle');

const navigateTo = async (pageName) => {
  const btn = root.findAll(el => el.type === 'button' && Array.isArray(el.props?.children) && el.props.children.includes(pageName))[0];
  assert.ok(btn, `Nav button for ${pageName} exists`);
  await act(async () => {
    btn.props.onClick();
  });
};

// Test the four campaign pages: Encounters, Characters & NPCs, Campaign wiki, Compendium
const campaignPages = ['Encounters', 'Characters & NPCs', 'Campaign wiki', 'Compendium'];
for (const pageName of campaignPages) {
  await navigateTo(pageName);

  const heroEyebrow = root.find(el => typeof el.props?.className === 'string' && el.props.className.includes('campaign-hero-eyebrow'));
  assert.equal(heroEyebrow.props.children, 'Sagara', `Eyebrow on ${pageName} must equal campaignLabel alone with no category/suffix`);

  const heroHeaderEl = root.find(el => typeof el.props?.className === 'string' && el.props.className.includes('campaign-hero-header'));
  const heroBadges = heroHeaderEl.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('badge') && el.props.className.includes('subtle'));
  assert.equal(heroBadges.length, 0, `Decorative header badge subtle must be absent on ${pageName}`);
}

// Atmosphere Studio eyebrow remains "ATMOSPHERE STUDIO" and retains in-content badge
await navigateTo('Atmosphere Studio');
const studioEyebrow = root.find(el => typeof el.props?.className === 'string' && el.props.className.includes('campaign-hero-eyebrow'));
assert.equal(studioEyebrow.props.children, 'ATMOSPHERE STUDIO', 'Atmosphere Studio eyebrow must remain ATMOSPHERE STUDIO');
const studioBadges = root.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('badge') && el.props.className.includes('subtle') && typeof el.props?.children === 'string' && el.props.children.includes('Campaign + global'));
assert.ok(studioBadges.length > 0, 'Atmosphere Studio in-content badge "Campaign + global" must still exist');

// In-content badges still present: Session notes on Dashboard journal
await navigateTo('Dashboard');
const journalBadges = root.findAll(el => typeof el.props?.className === 'string' && el.props.className.includes('badge') && el.props.className.includes('subtle') && typeof el.props?.children === 'string' && el.props.children.includes('Session notes'));
assert.ok(journalBadges.length > 0, 'In-content "Session notes" badge must still exist on journal widget');

// Test active encounter status retention
let activeRenderer;
store.set('wf-battle-active:Sagara', JSON.stringify(true));
await act(async () => {
  activeRenderer = TestRenderer.create(React.createElement(App));
});
const activeRoot = activeRenderer.root;
const activeStatus = activeRoot.findAll(el => typeof el.props?.className === 'string' && el.props.className.split(/\s+/).includes('campaign-status'));
assert.equal(activeStatus.length, 1, 'campaign-status element must be present when encounter is active');
const activeStatusText = activeStatus[0].props.children;
const statusCombined = Array.isArray(activeStatusText) ? activeStatusText.join('') : String(activeStatusText);
assert.ok(statusCombined.includes('Encounter in progress'), 'Active campaign status must display "Encounter in progress"');

// Reset battle for remaining assertions
store.set('wf-battle-active:Sagara', JSON.stringify(false));

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
