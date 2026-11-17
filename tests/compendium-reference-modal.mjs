import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  key: index => [...store.keys()][index],
  get length() { return store.size; },
};
const listeners = new Map();
const focusedTrigger = { focusCount: 0, focus() { this.focusCount++; } };
globalThis.window = {
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
};
globalThis.document = { activeElement: focusedTrigger, documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 }, querySelector() { return null; } };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });
for (const filename of fs.readdirSync('src').filter(name => /\.tsx?$/.test(name) && name !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync(path.join('src', filename), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
    .replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (_, name) => `from './components/ui/${name.replace(/\.js$/, '')}.js'`)
    .replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, name) => `from './lib/${name.replace(/\.js$/, '')}.js'`)
    .replace(/from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, (_, name) => `from './${name}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const { default: CompendiumDrawer } = await import(pathToFileURL(path.join(out, 'CompendiumDrawer.js')).href);
const { default: CombatTracker } = await import(pathToFileURL(path.join(out, 'CombatTracker.js')).href);
const { default: CampaignTools } = await import(pathToFileURL(path.join(out, 'CampaignTools.js')).href);

const homebrew = { id: 'hb-only', kind: 'monster', name: 'Astral Weaver', edition: 'Homebrew', fields: { type: 'Aberration', ac: '16', hp: '44', speed: '30 ft.', str: '12', dex: '16', con: '14', int: '13', wis: '12', cha: '8', cr: '3' } };
store.set('wf-homebrew:Sagara', JSON.stringify([homebrew]));

let closeCount = 0;
let drawer;
await act(async () => {
  drawer = TestRenderer.create(React.createElement(CompendiumDrawer, { open: true, focus: 'hb-only', campaign: 'Sagara', onClose: () => { closeCount++; } }));
});
await act(async () => {});
const drawerRoot = drawer.root;
assert.equal(drawerRoot.findByProps({ role: 'dialog' }).props.className.includes('compendium-reference-modal'), true, 'Reference renders as centered modal');
assert.ok(drawerRoot.findAll(el => el.type === 'h2' && el.children.includes('Astral Weaver')).length, 'Focused homebrew loads without compendium metadata');

await act(async () => { window.dispatchEvent({ type: 'keydown', key: 'Escape' }); });
assert.equal(closeCount, 1, 'Escape closes reference modal');
await act(async () => { drawerRoot.findByProps({ 'aria-label': 'Close quick compendium' }).props.onClick(); });
assert.equal(closeCount, 2, 'Close button closes reference modal');
await act(async () => { drawerRoot.findByProps({ className: 'compendium-reference-backdrop' }).props.onClick(); });
assert.equal(closeCount, 3, 'Backdrop closes reference modal');
await act(async () => { drawer.update(React.createElement(CompendiumDrawer, { open: false, focus: 'hb-only', campaign: 'Sagara', onClose: () => {} })); });
assert.equal(focusedTrigger.focusCount, 1, 'Closing modal restores trigger focus');

const battle = [{ id: 'm1', name: 'Astral Weaver', role: 'Monster', hp: 44, maxHp: 44, initiative: 12, modifier: 3, conditions: '', concentration: '', reference: { id: 'hb-only', name: 'Astral Weaver' } }];
let combat;
await act(async () => {
  combat = TestRenderer.create(React.createElement(CombatTracker, { battle, setBattle: () => {}, battleTitle: 'Test', battleActive: true, round: 1, setRound: () => {}, turn: 0, setTurn: () => {}, campaign: 'Sagara', onOpenEncounters: () => {}, onEnd: () => {}, notify: () => {} }));
});
await act(async () => { combat.root.findByProps({ 'aria-label': 'Open Astral Weaver stat block' }).props.onClick(); });
assert.ok(combat.root.findByProps({ role: 'dialog' }), 'Live Encounter trigger opens reference dialog');

store.set('wf-encounters:Sagara', JSON.stringify([{ id: 'e1', name: 'Test Encounter', description: '', environment: '', difficulty: 'Medium', ruleset: '2014', partyLevel: 3, partySize: 4, status: 'Prepared', members: battle }]));
let tools;
await act(async () => {
  tools = TestRenderer.create(React.createElement(CampaignTools, { page: 'Encounters', campaign: 'Sagara', onStart: () => {}, onUpdate: () => {}, activeEncounterId: '', battleActive: false, notify: () => {} }));
});
const encounterTrigger = tools.root.findByProps({ 'aria-label': 'Read Astral Weaver compendium stat block' });
await act(async () => { encounterTrigger.props.onClick(); });
assert.ok(tools.root.findByProps({ role: 'dialog' }), 'Encounter trigger opens reference dialog without navigation callback');

console.log('PASS shared compendium reference modal');
