import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const root = process.cwd();

console.log('Testing Accessible Action Buttons across App...');

// 1. Audit JSX source files for bare text-button actions that should be proper buttons
const appTsx = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const campaignToolsTsx = fs.readFileSync(path.join(root, 'src', 'CampaignTools.tsx'), 'utf8');
const cloudSettingsTsx = fs.readFileSync(path.join(root, 'src', 'CloudSettings.tsx'), 'utf8');
const homebrewModalTsx = fs.readFileSync(path.join(root, 'src', 'HomebrewModal.tsx'), 'utf8');

// Check CloudSettings: Reset password, Change project, Disconnect project must be proper buttons (e.g. secondary)
assert(!cloudSettingsTsx.includes('className="text-button"'), 'CloudSettings.tsx must not use text-button for password/project actions');
assert(!cloudSettingsTsx.includes('className="text-button disconnect"'), 'CloudSettings.tsx must not use text-button disconnect');
assert(cloudSettingsTsx.includes('Reset password'), 'CloudSettings.tsx must retain Reset password action');
assert(cloudSettingsTsx.includes('Change Supabase project'), 'CloudSettings.tsx must retain Change Supabase project action');
assert(cloudSettingsTsx.includes('Disconnect project'), 'CloudSettings.tsx must retain Disconnect project action');

// Check HomebrewModal: Add Trait and Add Action must use proper button classes
assert(!homebrewModalTsx.includes('className="text-button"'), 'HomebrewModal.tsx must not use text-button for adding traits/actions');
assert(homebrewModalTsx.includes('Add Trait'), 'HomebrewModal.tsx must retain Add Trait button');
assert(homebrewModalTsx.includes('Add Action'), 'HomebrewModal.tsx must retain Add Action button');

// Check CampaignTools: Roll monsters, Remove portrait, Insert in post, Set thumbnail, Backlinks
assert(!campaignToolsTsx.includes('className="text-button"'), 'CampaignTools.tsx must not use bare text-button class');
assert(campaignToolsTsx.includes('Roll monsters'), 'CampaignTools.tsx must retain Roll monsters action');
assert(campaignToolsTsx.includes('Remove portrait'), 'CampaignTools.tsx must retain Remove portrait action');
assert(campaignToolsTsx.includes('Insert in post'), 'CampaignTools.tsx must retain Insert in post action');
assert(campaignToolsTsx.includes('Set thumbnail'), 'CampaignTools.tsx must retain Set thumbnail action');

// Check App.tsx: Journal timestamp, layout reset, Atmosphere links, console actions
assert(!appTsx.includes('className="text-button"'), 'App.tsx must not use bare text-button class');
assert(!appTsx.includes('className="text-button widget-link"'), 'App.tsx must not use text-button widget-link');
assert(!appTsx.includes('className="text-button party-manage-btn"'), 'App.tsx must not use text-button party-manage-btn');

// 2. Real navigation links remain <a> links
assert(cloudSettingsTsx.includes('<a href="/supabase/setup.sql" download="archeron-setup.sql">Download setup SQL</a>'), 'True file downloads must remain <a> links');
assert(appTsx.includes('href={active.source.url}'), 'External provider links must remain <a> links');

// 3. CSS rules check: No padding:0 or unbordered link-styled action buttons
const styleCss = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'src', 'theme.css'), 'utf8');

// Check that button focus-visible is defined
assert(
  styleCss.includes(':focus-visible') || themeCss.includes(':focus-visible') || styleCss.includes('outline-offset:4px'),
  'Accessible focus states must be defined for keyboard navigation'
);

// Coarse pointer (touch) target must be >= 44px for action buttons
assert(
  themeCss.includes('44px'),
  'Touch targets for controls must satisfy >= 44px standard'
);
assert(
  themeCss.includes('.primary,.secondary,.text-button,.wiki-backlink-btn{min-height:44px}'),
  'theme.css must declare min-height: 44px for primary/secondary/backlink action buttons on coarse pointer'
);

// 4. React rendering tests for CloudSettings and HomebrewModal
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

// Render CloudSettings
const { default: CloudSettings } = await import(pathToFileURL(path.join(out, 'CloudSettings.js')).href);

let cloudRenderer;
await act(async () => {
  cloudRenderer = TestRenderer.create(React.createElement(CloudSettings));
});

const cloudRoot = cloudRenderer.root;

// Download link must be an <a> element, not a button
const downloadLinks = cloudRoot.findAll(el => el.type === 'a' && el.props.href === '/supabase/setup.sql');
assert.equal(downloadLinks.length, 1, 'Download setup SQL must be an <a> link');

// Action buttons must all be <button> elements with proper classes
const cloudButtons = cloudRoot.findAll(el => el.type === 'button');
for (const btn of cloudButtons) {
  const cls = btn.props.className || '';
  assert(
    cls.includes('primary') || cls.includes('secondary') || cls.includes('icon-button'),
    `CloudSettings button "${btn.props.children}" must have proper button class, got: "${cls}"`
  );
  assert(!cls.includes('text-button'), 'No button in CloudSettings should have text-button class');
}

// Render HomebrewModal
const { default: HomebrewModal } = await import(pathToFileURL(path.join(out, 'HomebrewModal.js')).href);

let homebrewRenderer;
await act(async () => {
  homebrewRenderer = TestRenderer.create(
    React.createElement(HomebrewModal, {
      campaign: 'Sagara',
      open: true,
      onClose: () => {},
      onSaved: () => {},
      initialRecord: null
    })
  );
});

const hbRoot = homebrewRenderer.root;
const traitAddBtn = hbRoot.findAll(el => el.type === 'button' && (
  (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('Add Trait'))) ||
  (typeof el.props?.children === 'string' && el.props.children.includes('Add Trait'))
))[0];
assert(traitAddBtn, 'Add Trait button must exist');
assert(traitAddBtn.props.className.includes('secondary'), 'Add Trait button must have secondary class');

const actionAddBtn = hbRoot.findAll(el => el.type === 'button' && (
  (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('Add Action'))) ||
  (typeof el.props?.children === 'string' && el.props.children.includes('Add Action'))
))[0];
assert(actionAddBtn, 'Add Action button must exist');
assert(actionAddBtn.props.className.includes('secondary'), 'Add Action button must have secondary class');

// Render App and check Dashboard action buttons
const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

let appRenderer;
await act(async () => {
  appRenderer = TestRenderer.create(React.createElement(App));
});

const appRoot = appRenderer.root;

// Reset layout button
const resetLayoutBtn = appRoot.findAll(el => el.type === 'button' && (
  (typeof el.props?.children === 'string' && el.props.children.includes('Reset layout')) ||
  (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('Reset layout')))
))[0];
assert(resetLayoutBtn, 'Reset layout button must exist on Dashboard');
assert(resetLayoutBtn.props.className.includes('secondary'), 'Reset layout button must have secondary class');
assert(!resetLayoutBtn.props.className.includes('text-button'), 'Reset layout button must not have text-button class');

// Timestamp button on Journal
const timestampBtn = appRoot.findAll(el => el.type === 'button' && (
  (typeof el.props?.children === 'string' && el.props.children.includes('+ Timestamp')) ||
  (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('+ Timestamp')))
))[0];
assert(timestampBtn, '+ Timestamp button must exist in Journal widget');
assert(timestampBtn.props.className.includes('secondary'), '+ Timestamp button must have secondary class');
assert(!timestampBtn.props.className.includes('text-button'), '+ Timestamp button must not have text-button class');

// Atmosphere Studio link button
const atmosphereLinkBtn = appRoot.findAll(el => el.type === 'button' && (
  (typeof el.props?.children === 'string' && el.props.children.includes('Open Atmosphere Studio')) ||
  (Array.isArray(el.props?.children) && el.props.children.some(c => typeof c === 'string' && c.includes('Open Atmosphere Studio')))
))[0];
assert(atmosphereLinkBtn, 'Open Atmosphere Studio button must exist');
assert(atmosphereLinkBtn.props.className.includes('secondary'), 'Open Atmosphere Studio button must have secondary class');
assert(!atmosphereLinkBtn.props.className.includes('text-button'), 'Open Atmosphere Studio button must not have text-button class');

console.log('✓ All action button assertions and React render tests passed!');
