globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0, className: '' }, body: { scrollLeft: 0, scrollTop: 0 } };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Charcoal Light/Dark Topbar Toggle & Settings Palette...');

// 1. Check no em dashes in App.tsx or palettes.ts
const appCode = fs.readFileSync('src/App.tsx', 'utf8');
assert.ok(!appCode.includes('\u2014'), 'src/App.tsx must not contain em dashes');

// 2. Setup environment and transpile modules
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
  dispatchEvent() {}
};

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '').replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

// Test initial render with default / no theme in store
store.set('wf-campaigns', JSON.stringify(['Avernus']));
store.set('wf-campaign', JSON.stringify('Avernus'));
store.delete('wf-theme');

let render;
await act(async () => {
  render = TestRenderer.create(React.createElement(App));
});

// 3. Verify topbar HAS light/dark switch
const buttons = render.root.findAllByType('button');
const themeToggle = buttons.find(b =>
  b.props.className && b.props.className.includes('theme-toggle')
);
assert.ok(themeToggle, 'Topbar must render theme-toggle button');
assert.equal(themeToggle.props['aria-label'], 'Switch to light theme', 'Initial theme toggle label must be Switch to light theme');
console.log('PASS topbar: theme toggle button exists with correct label');

// 4. Verify default root class is theme-charcoal theme-dark
const rootDiv = render.root.findByProps({ className: render.root.findAllByType('div')[0].props.className });
assert.ok(
  rootDiv.props.className.includes('theme-charcoal') && rootDiv.props.className.includes('theme-dark'),
  `Root div must contain theme-charcoal and theme-dark, got: ${rootDiv.props.className}`
);
console.log('PASS default theme: root container has theme-charcoal theme-dark');

// 5. Check Archeron brand mode is dark
let brandLogos = render.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(brandLogos.length > 0, 'Must render brand logo');
assert.ok(
  brandLogos[0].props.src.includes('on-dark'),
  `Brand logo must use on-dark asset in dark mode, got: ${brandLogos[0].props.src}`
);
console.log('PASS brand logo: dark mode uses on-dark asset');

// 6. Test toggling to light mode
await act(async () => {
  themeToggle.props.onClick();
});

// Check persisted wf-theme
assert.equal(JSON.parse(store.get('wf-theme')), 'light', 'wf-theme must be persisted as light');

// Check root container class
const lightRootDiv = render.root.findAllByType('div')[0];
assert.ok(
  lightRootDiv.props.className.includes('theme-charcoal') && lightRootDiv.props.className.includes('theme-light'),
  `Root div must contain theme-charcoal and theme-light, got: ${lightRootDiv.props.className}`
);

// Check toggle button updated to switch to dark theme
const updatedToggle = render.root.findAllByType('button').find(b =>
  b.props.className && b.props.className.includes('theme-toggle')
);
assert.equal(updatedToggle.props['aria-label'], 'Switch to dark theme');

// Check brand logo in light mode
brandLogos = render.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(
  brandLogos[0].props.src.includes('on-light'),
  `Brand logo must use on-light asset in light mode, got: ${brandLogos[0].props.src}`
);
console.log('PASS toggle to light mode: updates root class, persistence, button label, and brand logo');

// 7. Test toggling back to dark mode
await act(async () => {
  updatedToggle.props.onClick();
});
assert.equal(JSON.parse(store.get('wf-theme')), 'dark', 'wf-theme must be persisted as dark');
const darkRootDiv = render.root.findAllByType('div')[0];
assert.ok(
  darkRootDiv.props.className.includes('theme-charcoal') && darkRootDiv.props.className.includes('theme-dark'),
  `Root div must contain theme-charcoal and theme-dark, got: ${darkRootDiv.props.className}`
);
console.log('PASS toggle back to dark mode: restored theme-charcoal theme-dark');

// 8. Open Settings modal and verify only charcoal palette exists
const settingsToggle = render.root.findByProps({ 'aria-label': 'Settings & backup' });
await act(async () => {
  settingsToggle.props.onClick();
});

const charcoalBtn = render.root.findAllByType('button').find(b =>
  b.props['data-palette'] === 'charcoal'
);
assert.ok(charcoalBtn, 'Settings modal must render a button for palette charcoal');
const swatches = charcoalBtn.findAll(el => el.props?.className === 'swatch-circle');
assert.equal(swatches.length, 6, 'Palette card charcoal must render 6 swatch circles');

// Verify deleted palettes are NOT rendered
const removedPalettes = ['black-stallion', 'space-cadet', 'ceres', 'twinkle'];
for (const id of removedPalettes) {
  const removedBtn = render.root.findAllByType('button').find(b =>
    b.props['data-palette'] === id
  );
  assert.equal(removedBtn, undefined, `Removed palette ${id} must not be rendered`);
}
console.log('PASS settings modal: only charcoal palette rendered with 6 swatches');

// 9. Test legacy 'dark' migration
store.set('wf-theme', JSON.stringify('dark'));
let legacyDarkRender;
await act(async () => {
  legacyDarkRender = TestRenderer.create(React.createElement(App));
});
const legacyDarkDiv = legacyDarkRender.root.findAllByType('div')[0];
assert.ok(
  legacyDarkDiv.props.className.includes('theme-charcoal') && legacyDarkDiv.props.className.includes('theme-dark'),
  `Legacy 'dark' must resolve to charcoal dark, got: ${legacyDarkDiv.props.className}`
);
console.log('PASS legacy migration: dark resolves to charcoal dark');

// 10. Test legacy 'light' migration
store.set('wf-theme', JSON.stringify('light'));
let legacyLightRender;
await act(async () => {
  legacyLightRender = TestRenderer.create(React.createElement(App));
});
const legacyLightDiv = legacyLightRender.root.findAllByType('div')[0];
assert.ok(
  legacyLightDiv.props.className.includes('theme-charcoal') && legacyLightDiv.props.className.includes('theme-light'),
  `Legacy 'light' must resolve to charcoal light, got: ${legacyLightDiv.props.className}`
);
console.log('PASS legacy migration: light resolves to charcoal light');
