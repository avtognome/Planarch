globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Planarch Brand Integration...');

// 1. Verify branding assets exist in public/branding
const requiredAssets = [
  'archeron-seal-gold.svg',
  'archeron-seal-on-ivory.svg',
  'archeron-logo-horizontal-on-dark.svg',
  'archeron-logo-horizontal-on-light.svg',
  'archeron-logo-stacked-on-dark.svg',
  'archeron-logo-stacked-on-light.svg',
  'planarch-seal-gold.svg',
  'planarch-seal-on-ivory.svg',
  'planarch-logo-horizontal-on-dark.svg',
  'planarch-logo-horizontal-on-light.svg',
  'planarch-logo-stacked-on-dark.svg',
  'planarch-logo-stacked-on-light.svg',
  'planarch-icon-dark.svg',
  'planarch-icon-light.svg',
  'planarch-favicon.svg',
  'planarch-icon-192.png',
  'planarch-icon-512.png',
  'planarch-icon-light-512.png',
  'planarch-apple-touch-icon.png'
];

for (const asset of requiredAssets) {
  const fullPath = path.join('public', 'branding', asset);
  assert.ok(fs.existsSync(fullPath), `Missing required brand asset: ${fullPath}`);
  const stat = fs.statSync(fullPath);
  assert.ok(stat.size > 0, `Asset ${fullPath} is empty`);
}
console.log(`PASS assets: all ${requiredAssets.length} brand files present in public/branding`);

// 2. Verify index.html contains brand favicon, apple-touch-icon, and theme-color
const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.includes('/branding/archeron-favicon.svg') || html.includes('/branding/planarch-favicon.svg'), 'index.html missing favicon');
assert.ok(html.includes('/branding/planarch-apple-touch-icon.png'), 'index.html missing planarch-apple-touch-icon.png');
assert.ok(html.includes('#17191a'), 'index.html missing #17191a theme-color');
assert.ok(html.includes('Archeron') || html.includes('Planarch'), 'index.html title missing Archeron/Planarch');
console.log('PASS index.html: favicon, touch-icon, theme-color, and title properly configured');

// 3. Test ArcheronBrand component
const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

const brandTsxPath = path.join('src', 'ArcheronBrand.tsx');
assert.ok(fs.existsSync(brandTsxPath), `Missing ${brandTsxPath}`);

const transpiled = ts.transpileModule(fs.readFileSync(brandTsxPath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
fs.writeFileSync(path.join(out, 'ArcheronBrand.js'), transpiled);

const brandModule = await import(pathToFileURL(path.join(out, 'ArcheronBrand.js')).href);
const BrandComponent = brandModule.ArcheronBrand || brandModule.default;

// Test horizontal logo on light
let renderLight;
await act(async () => { renderLight = TestRenderer.create(React.createElement(BrandComponent, { mode: 'light' })); });
const imgLight = renderLight.root.findByType('img');
assert.ok(imgLight.props.src.endsWith('logo-horizontal-on-light.svg'), 'Wrong light logo src');
assert.ok(imgLight.props.alt === 'Archeron' || imgLight.props.alt === 'Planarch', 'Wrong alt');

// Test horizontal logo on dark
let renderDark;
await act(async () => { renderDark = TestRenderer.create(React.createElement(BrandComponent, { mode: 'dark' })); });
const imgDark = renderDark.root.findByType('img');
assert.ok(imgDark.props.src.endsWith('logo-horizontal-on-dark.svg'), 'Wrong dark logo src');

// Test compact seal on light
let renderCompactLight;
await act(async () => { renderCompactLight = TestRenderer.create(React.createElement(BrandComponent, { mode: 'light', compact: true })); });
const imgCompactLight = renderCompactLight.root.findByType('img');
assert.ok(imgCompactLight.props.src.endsWith('seal-on-ivory.svg'), 'Wrong compact light src');

// Test compact seal on dark
let renderCompactDark;
await act(async () => { renderCompactDark = TestRenderer.create(React.createElement(BrandComponent, { mode: 'dark', compact: true })); });
const imgCompactDark = renderCompactDark.root.findByType('img');
assert.ok(imgCompactDark.props.src.endsWith('seal-gold.svg'), 'Wrong compact dark src');

// Test stacked on light
let renderStackedLight;
await act(async () => { renderStackedLight = TestRenderer.create(React.createElement(BrandComponent, { mode: 'light', variant: 'stacked' })); });
const imgStackedLight = renderStackedLight.root.findByType('img');
assert.ok(imgStackedLight.props.src.endsWith('logo-stacked-on-light.svg'), 'Wrong stacked light src');

// Test stacked on dark
let renderStackedDark;
await act(async () => { renderStackedDark = TestRenderer.create(React.createElement(BrandComponent, { mode: 'dark', variant: 'stacked' })); });
const imgStackedDark = renderStackedDark.root.findByType('img');
assert.ok(imgStackedDark.props.src.endsWith('logo-stacked-on-dark.svg'), 'Wrong stacked dark src');

console.log('PASS Brand component: renders correct brand variants in light and dark modes');

// 4. Verify CSS design tokens are declared in src/theme.css
const css = fs.readFileSync('src/theme.css', 'utf8');
const requiredTokens = [
  '--archeron-charcoal: #17191a',
  '--archeron-deep-charcoal: #101214',
  '--archeron-ivory: #f1e8d8',
  '--archeron-antique-gold: #be9454',
  '--archeron-gold-highlight: #e2bc7c',
  '--archeron-aged-gold: #826039',
  '--archeron-warm-ink: #302c27'
];
for (const token of requiredTokens) {
  assert.ok(css.includes(token), `Missing CSS design token: ${token}`);
}
console.log('PASS design tokens: all Archeron palette variables present in src/theme.css');

// 5. Verify App renders brand logo in primary brand slot
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

for (const filename of fs.readdirSync('src').filter(n => /\.tsx?$/.test(n) && n !== 'main.tsx')) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '').replace(/from ['"]\.\/([^'"]+)['"]/g, (_, n) => `from './${n}.js'`);
  fs.writeFileSync(path.join(out, filename.replace(/\.tsx?$/, '.js')), code);
}

const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);

let appRender;
store.set('wf-campaigns', JSON.stringify(['Avernus']));
store.set('wf-campaign', JSON.stringify('Avernus'));
store.set('wf-theme', JSON.stringify('dark'));

await act(async () => {
  appRender = TestRenderer.create(React.createElement(App));
});

let brandImgs = appRender.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(brandImgs.length > 0, 'App failed to render brand image in DOM');
assert.ok(brandImgs[0].props.src.endsWith('logo-horizontal-on-dark.svg'), 'Wrong dark brand logo in App');
console.log('PASS app integration: App renders horizontal brand logo on dark surface');

// Switch to light theme via topbar and verify logo switches to light asset
const themeToggleBtn = appRender.root.findAllByType('button').find(b => b.props.className && b.props.className.includes('theme-toggle'));
await act(async () => {
  themeToggleBtn.props.onClick();
});

brandImgs = appRender.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(brandImgs[0].props.src.endsWith('logo-horizontal-on-light.svg'), 'Wrong light brand logo in App');

// Switch back to dark theme via topbar and verify logo switches back to dark asset
await act(async () => {
  themeToggleBtn.props.onClick();
});

brandImgs = appRender.root.findAllByType('img').filter(img => img.props.alt === 'Archeron' || img.props.alt === 'Planarch');
assert.ok(brandImgs[0].props.src.endsWith('logo-horizontal-on-dark.svg'), 'Wrong dark brand logo in App');
console.log('PASS theme switching: brand logo automatically switches between dark and light assets without reload');

