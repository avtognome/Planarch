globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0, className: '' }, body: { scrollLeft: 0, scrollTop: 0 } };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Settings Palette Selector & Topbar Clean-Up...');

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

// Test initial render with default / legacy migration
store.set('wf-campaigns', JSON.stringify(['Avernus']));
store.set('wf-campaign', JSON.stringify('Avernus'));
store.delete('wf-theme');

let render;
await act(async () => {
  render = TestRenderer.create(React.createElement(App));
});

// 3. Verify topbar does NOT have binary light/dark switch
const buttons = render.root.findAllByType('button');
const themeToggle = buttons.find(b =>
  b.props['aria-label'] === 'Switch to dark theme' ||
  b.props['aria-label'] === 'Switch to light theme' ||
  (b.props.className && b.props.className.includes('theme-toggle'))
);
assert.equal(themeToggle, undefined, 'Topbar must not render binary light/dark theme-toggle button');
console.log('PASS topbar: binary light/dark switch removed');

// 4. Verify default root class is theme-charcoal theme-dark
const rootDiv = render.root.findByProps({ className: render.root.findAllByType('div')[0].props.className });
assert.ok(
  rootDiv.props.className.includes('theme-charcoal') && rootDiv.props.className.includes('theme-dark'),
  `Root div must contain theme-charcoal and theme-dark, got: ${rootDiv.props.className}`
);
console.log('PASS default theme: root container has theme-charcoal theme-dark');

// 5. Open Settings modal
const settingsToggle = render.root.findByProps({ 'aria-label': 'Settings & backup' });
await act(async () => {
  settingsToggle.props.onClick();
});

// Verify 5 palettes are rendered in Settings modal
const expectedPalettes = [
  'black-stallion',
  'space-cadet',
  'ceres',
  'twinkle',
  'charcoal'
];

for (const id of expectedPalettes) {
  const paletteBtn = render.root.findAllByType('button').find(b =>
    b.props['data-palette'] === id ||
    b.props['aria-label']?.toLowerCase().includes(id.replace('-', ' '))
  );
  assert.ok(paletteBtn, `Settings modal must render a button for palette ${id}`);
  const swatches = paletteBtn.findAll(el => el.props?.className === 'swatch-circle');
  assert.equal(swatches.length, 6, `Palette card ${id} must render 6 swatch circles`);
}
console.log('PASS settings modal: all 5 palettes rendered with 6 swatches each');

// 6. Test selecting a palette (Twinkle)
const twinkleBtn = render.root.findAllByType('button').find(b =>
  b.props['data-palette'] === 'twinkle' ||
  b.props['aria-label']?.toLowerCase().includes('twinkle')
);
assert.ok(twinkleBtn, 'Missing Twinkle palette button');

await act(async () => {
  twinkleBtn.props.onClick();
});

// Check persisted wf-theme
assert.equal(JSON.parse(store.get('wf-theme')), 'twinkle', 'wf-theme must be persisted as twinkle');

// Check root container class
const updatedRootDiv = render.root.findAllByType('div')[0];
assert.ok(
  updatedRootDiv.props.className.includes('theme-twinkle') && updatedRootDiv.props.className.includes('theme-dark'),
  `Root div must contain theme-twinkle and theme-dark, got: ${updatedRootDiv.props.className}`
);

// Check Archeron/Planarch brand mode is dark
const brandLogos = render.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(brandLogos.length > 0, 'Must render brand logo');
assert.ok(
  brandLogos[0].props.src.includes('on-dark'),
  `Brand logo must use on-dark asset in dark mode, got: ${brandLogos[0].props.src}`
);
console.log('PASS palette selection: switching to twinkle updates root classes, persistence, and brand logo');

// 7. Test legacy 'dark' migration
store.set('wf-theme', JSON.stringify('dark'));
let legacyDarkRender;
await act(async () => {
  legacyDarkRender = TestRenderer.create(React.createElement(App));
});
const legacyDarkDiv = legacyDarkRender.root.findAllByType('div')[0];
assert.ok(
  legacyDarkDiv.props.className.includes('theme-charcoal') && legacyDarkDiv.props.className.includes('theme-dark'),
  `Legacy 'dark' must resolve to charcoal, got: ${legacyDarkDiv.props.className}`
);
console.log('PASS legacy migration: dark resolves to charcoal');

// 8. Test legacy 'light' migration
store.set('wf-theme', JSON.stringify('light'));
let legacyLightRender;
await act(async () => {
  legacyLightRender = TestRenderer.create(React.createElement(App));
});
const legacyLightDiv = legacyLightRender.root.findAllByType('div')[0];
assert.ok(
  legacyLightDiv.props.className.includes('theme-charcoal') && legacyLightDiv.props.className.includes('theme-dark'),
  `Legacy 'light' must resolve to charcoal, got: ${legacyLightDiv.props.className}`
);
console.log('PASS legacy migration: light resolves to charcoal');
