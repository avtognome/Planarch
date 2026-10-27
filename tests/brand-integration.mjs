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
assert.ok(html.includes('/branding/planarch-favicon.svg'), 'index.html missing planarch-favicon.svg');
assert.ok(html.includes('/branding/planarch-apple-touch-icon.png'), 'index.html missing planarch-apple-touch-icon.png');
assert.ok(html.includes('#17191a'), 'index.html missing #17191a theme-color');
assert.ok(html.includes('Planarch'), 'index.html title missing Planarch');
console.log('PASS index.html: favicon, touch-icon, theme-color, and title properly configured');

// 3. Test PlanarchBrand component
const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

const brandTsxPath = path.join('src', 'PlanarchBrand.tsx');
assert.ok(fs.existsSync(brandTsxPath), 'Missing src/PlanarchBrand.tsx');

const transpiled = ts.transpileModule(fs.readFileSync(brandTsxPath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
fs.writeFileSync(path.join(out, 'PlanarchBrand.js'), transpiled);

const { PlanarchBrand } = await import(pathToFileURL(path.join(out, 'PlanarchBrand.js')).href);

// Test horizontal logo on light
let renderLight;
await act(async () => { renderLight = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'light' })); });
const imgLight = renderLight.root.findByType('img');
assert.equal(imgLight.props.src, '/branding/planarch-logo-horizontal-on-light.svg');
assert.equal(imgLight.props.alt, 'Planarch');

// Test horizontal logo on dark
let renderDark;
await act(async () => { renderDark = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'dark' })); });
const imgDark = renderDark.root.findByType('img');
assert.equal(imgDark.props.src, '/branding/planarch-logo-horizontal-on-dark.svg');

// Test compact seal on light
let renderCompactLight;
await act(async () => { renderCompactLight = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'light', compact: true })); });
const imgCompactLight = renderCompactLight.root.findByType('img');
assert.equal(imgCompactLight.props.src, '/branding/planarch-seal-on-ivory.svg');

// Test compact seal on dark
let renderCompactDark;
await act(async () => { renderCompactDark = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'dark', compact: true })); });
const imgCompactDark = renderCompactDark.root.findByType('img');
assert.equal(imgCompactDark.props.src, '/branding/planarch-seal-gold.svg');

// Test stacked on light
let renderStackedLight;
await act(async () => { renderStackedLight = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'light', variant: 'stacked' })); });
const imgStackedLight = renderStackedLight.root.findByType('img');
assert.equal(imgStackedLight.props.src, '/branding/planarch-logo-stacked-on-light.svg');

// Test stacked on dark
let renderStackedDark;
await act(async () => { renderStackedDark = TestRenderer.create(React.createElement(PlanarchBrand, { mode: 'dark', variant: 'stacked' })); });
const imgStackedDark = renderStackedDark.root.findByType('img');
assert.equal(imgStackedDark.props.src, '/branding/planarch-logo-stacked-on-dark.svg');

console.log('PASS PlanarchBrand component: renders correct brand variants in light and dark modes');

// 4. Verify CSS design tokens are declared in src/theme.css
const css = fs.readFileSync('src/theme.css', 'utf8');
const requiredTokens = [
  '--planarch-charcoal: #17191a',
  '--planarch-deep-charcoal: #101214',
  '--planarch-ivory: #f1e8d8',
  '--planarch-antique-gold: #be9454',
  '--planarch-gold-highlight: #e2bc7c',
  '--planarch-aged-gold: #826039',
  '--planarch-warm-ink: #302c27'
];
for (const token of requiredTokens) {
  assert.ok(css.includes(token), `Missing CSS design token: ${token}`);
}
console.log('PASS design tokens: all Planarch palette variables present in src/theme.css');

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
store.set('wf-theme', JSON.stringify('light'));

await act(async () => {
  appRender = TestRenderer.create(React.createElement(App));
});

const brandImgs = appRender.root.findAllByType('img').filter(img => img.props.alt === 'Planarch');
assert.ok(brandImgs.length > 0, 'App failed to render Planarch brand image in DOM');
assert.equal(brandImgs[0].props.src, '/branding/planarch-logo-horizontal-on-light.svg');
console.log('PASS app integration: App renders Planarch horizontal brand logo on light surface');

// Switch to dark theme and verify logo updates
const themeToggle = appRender.root.findByProps({ 'aria-label': 'Switch to dark theme' });
await act(async () => {
  themeToggle.props.onClick();
});

const darkBrandImgs = appRender.root.findAllByType('img').filter(img => img.props.alt === 'Planarch');
assert.equal(darkBrandImgs[0].props.src, '/branding/planarch-logo-horizontal-on-dark.svg');
console.log('PASS theme switching: brand logo automatically switches to dark asset without reload');

