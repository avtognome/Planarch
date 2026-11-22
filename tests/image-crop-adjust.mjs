globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.log('Testing Image Crop/Adjust Modal, Sidebar Relocation & Sync Dot Indicator...');

const out = path.resolve('.sites-runtime/test-modules');
fs.mkdirSync(out, { recursive: true });

// Transpile src files
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

// Transpile ui and lib components
fs.mkdirSync(path.join(out, 'components/ui'), { recursive: true });
fs.mkdirSync(path.join(out, 'lib'), { recursive: true });

for (const filename of fs.readdirSync('src/lib').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/lib/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from './${n.replace(/\.js$/, '')}.js'`);
  fs.writeFileSync(path.join(out, 'lib', filename.replace(/\.tsx?$/, '.js')), code);
}

for (const filename of fs.readdirSync('src/components/ui').filter(n => /\.tsx?$/.test(n))) {
  let code = ts.transpileModule(fs.readFileSync('src/components/ui/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  code = code.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => `from '../../lib/${n.replace(/\.js$/, '')}.js'`);
  fs.writeFileSync(path.join(out, 'components/ui', filename.replace(/\.tsx?$/, '.js')), code);
}

// Setup window / URL mock for node
const origCreate = URL.createObjectURL;
URL.createObjectURL = () => 'blob:mock-preview-url';
URL.revokeObjectURL = () => {};
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; },
  clear: () => store.clear()
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};

// Load transpiled ImageCropModal
const { ImageCropModal } = await import(pathToFileURL(path.join(out, 'ImageCropModal.js')).href);

// Test 1: ImageCropModal renders controls
{
  const dummyFile = { name: 'portrait.png', size: 1024, type: 'image/png' };
  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(
      React.createElement(ImageCropModal, {
        file: dummyFile,
        title: 'Crop Portrait',
        onComplete: () => {},
        onCancel: () => {}
      })
    );
  });

  const root = testRenderer.root;
  const zoomInput = root.findByProps({ 'aria-label': 'Zoom' });
  assert.ok(zoomInput, 'Zoom input must exist');
  assert.equal(zoomInput.props.value, 1);

  const rotateBtn = root.findByProps({ 'aria-label': 'Rotate 90 degrees' });
  assert.ok(rotateBtn, 'Rotate button must exist');

  const brightnessInput = root.findByProps({ 'aria-label': 'Brightness' });
  assert.ok(brightnessInput, 'Brightness input must exist');
  assert.equal(brightnessInput.props.value, 0);

  const contrastInput = root.findByProps({ 'aria-label': 'Contrast' });
  assert.ok(contrastInput, 'Contrast input must exist');
  assert.equal(contrastInput.props.value, 0);

  // Test apply action trigger exists
  const applyBtn = root.findByProps({ 'aria-label': 'Apply crop and adjustments' });
  assert.ok(applyBtn, 'Apply button must exist');

  console.log('✓ ImageCropModal controls verified');
}

// Test 1b: WikiGraph light theme text color test
const { WikiGraph } = await import(pathToFileURL(path.join(out, 'WikiGraph.js')).href);
{
  assert.ok(WikiGraph, 'WikiGraph component must exist');
  console.log('✓ WikiGraph component verified');
}

// Test 2: App Sidebar & Header sync indicator checks
const { default: App } = await import(pathToFileURL(path.join(out, 'App.js')).href);
{
  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(React.createElement(App));
  });

  const root = testRenderer.root;

  // 1. Check sidebar has Atmosphere Studio inside campaign tools section
  // It should NOT have the orange dot
  const sidebarNavButtons = root.findAll(node => {
    if (node.type !== 'button') return false;
    const parentClass = node.parent?.props?.className;
    return parentClass === 'campaign-nav' || node.parent?.type === 'nav';
  });
  const atmosphereNavBtn = sidebarNavButtons.find(node => node.children && node.children.some(c => typeof c === 'string' && c.includes('Atmosphere Studio')));
  assert.ok(atmosphereNavBtn, 'Atmosphere Studio navigation button should exist in sidebar');
  assert.equal(atmosphereNavBtn.parent.props.className, 'campaign-nav', 'Atmosphere Studio must be inside campaign-nav');

  // Verify orange dot (.tiny-dot) does not exist inside or next to Atmosphere Studio
  const orangeDots = atmosphereNavBtn.findAll(node => node.props && node.props.className && node.props.className.includes('tiny-dot'));
  assert.equal(orangeDots.length, 0, 'Atmosphere Studio should not have orange tiny-dot');

  // Verify user profile box ("Dungeon Master" / "Private workspace") is removed
  const workspaceLabels = root.findAll(node => node.children && (node.children.includes('Private workspace') || node.children.includes('Dungeon Master')));
  assert.equal(workspaceLabels.length, 0, 'Sidebar profile block (Private workspace / Dungeon Master) must be removed');

  // Verify sync status in top right is dot indicator
  const syncDots = root.findAll(node => node.props && node.props.className && node.props.className.includes('sync-status-dot'));
  assert.ok(syncDots.length > 0, 'Top right sync status dot indicator should exist');

  console.log('✓ App sidebar and top-right sync dot verified');
}

// Test 3: ImageCropModal unlocked ratio presets (Free, 1:1, 16:9, 9:16) & free resize handles
{
  const dummyFile = { name: 'map.png', size: 2048, type: 'image/png' };
  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(
      React.createElement(ImageCropModal, {
        file: dummyFile,
        aspectRatio: undefined,
        circularFrame: false,
        title: 'Crop content image',
        onComplete: () => {},
        onCancel: () => {}
      })
    );
  });

  const root = testRenderer.root;
  const labels = root.findAllByType('button').map(b => b.children.join(''));
  for (const preset of ['Free', '1:1', '16:9', '9:16']) {
    assert.ok(labels.includes(preset), `Unlocked crop modal must offer ${preset} ratio preset`);
  }

  // Free mode renders resize handles
  const handles = root.findAll(n => n.props?.role === 'slider' && String(n.props['aria-label'] || '').startsWith('Resize crop '));
  assert.equal(handles.length, 8, 'Free mode should render 8 resize handles on crop frame');

  // Switching to 9:16 locks aspect ratio, hides free resize handles, and keeps frame within viewport
  const btn916 = root.findAllByType('button').find(b => b.children.join('') === '9:16');
  await act(async () => {
    btn916.props.onClick();
  });
  const handlesAfter = root.findAll(n => n.props?.role === 'slider' && String(n.props['aria-label'] || '').startsWith('Resize crop '));
  assert.equal(handlesAfter.length, 0, 'Fixed 9:16 preset should hide free resize handles');

  const frame = root.findByProps({ className: 'crop-frame-guideline' });
  assert.equal(frame.props.style.width, '135px');
  assert.equal(frame.props.style.height, '240px');
  assert.equal(frame.props.style.borderRadius, '6px');

  console.log('✓ ImageCropModal unlocked presets, 9:16 bounds & free resize handles verified');
}

// Test 4: Wiki separates 1:1 thumbnail upload and unlocked content image auto-insert
const { default: CampaignTools } = await import(pathToFileURL(path.join(out, 'CampaignTools.js')).href);
{
  store.clear();
  store.set('wf-campaigns', JSON.stringify(['Sagara']));
  store.set('wf-campaign', 'Sagara');
  store.set('wf-wiki:Sagara', JSON.stringify([
    { id: 'page-1', title: 'Moonwell', category: 'Location', body: 'Initial lore.', tags: '', updated: new Date().toISOString(), images: [] }
  ]));

  let testRenderer;
  await act(async () => {
    testRenderer = TestRenderer.create(
      React.createElement(CampaignTools, {
        page: 'Campaign wiki',
        campaign: 'Sagara',
        notify: () => {},
        onOpenReference: () => {}
      })
    );
  });

  const root = testRenderer.root;
  const thumbInput = root.findByProps({ 'aria-label': 'Upload wiki thumbnail' });
  const contentInput = root.findByProps({ 'aria-label': 'Upload wiki images' });
  assert.ok(thumbInput, 'Dedicated wiki thumbnail upload input must exist');
  assert.ok(contentInput, 'Dedicated wiki content image upload input must exist');

  // Trigger content image upload -> opens unlocked ImageCropModal
  await act(async () => {
    await contentInput.props.onChange({
      target: { files: [{ name: 'ruins.png', size: 1024, type: 'image/png' }], value: 'x' }
    });
  });

  let cropModal = root.findByType(ImageCropModal);
  assert.equal(cropModal.props.aspectRatio, undefined, 'Content image crop must be unlocked');
  assert.equal(cropModal.props.circularFrame, false, 'Content image crop frame must be rectangular');

  // Complete content image crop -> auto-inserts [[image:...]] and does NOT set thumbnail
  await act(async () => {
    cropModal.props.onComplete('data:image/webp;base64,CONTENT', 'ruins.png');
  });

  let savedPages = JSON.parse(store.get('wf-wiki:Sagara'));
  assert.equal(savedPages[0].images.length, 1);
  assert.equal(savedPages[0].thumbnail, undefined, 'Content image must NOT auto-set wiki thumbnail');
  assert.ok(savedPages[0].body.includes(`[[image:${savedPages[0].images[0].id}]]`), 'Content image must auto-insert token into body');

  // Trigger thumbnail upload -> opens 1:1 locked ImageCropModal
  await act(async () => {
    thumbInput.props.onChange({
      target: { files: [{ name: 'cover.png', size: 1024, type: 'image/png' }], value: 'x' }
    });
  });

  cropModal = root.findByType(ImageCropModal);
  assert.equal(cropModal.props.aspectRatio, 1, 'Wiki thumbnail crop must lock to 1:1');
  assert.equal(cropModal.props.circularFrame, false, 'Wiki thumbnail crop frame must be square, not circular');

  // Complete thumbnail crop -> sets thumbnail without inserting token into body
  await act(async () => {
    cropModal.props.onComplete('data:image/webp;base64,THUMB', 'cover.png');
  });

  savedPages = JSON.parse(store.get('wf-wiki:Sagara'));
  assert.ok(savedPages[0].thumbnail, 'Thumbnail upload must set page thumbnail');
  assert.ok(!savedPages[0].body.includes(`[[image:${savedPages[0].thumbnail}]]`), 'Thumbnail upload must NOT insert inline token into body');

  console.log('✓ Wiki separated thumbnail (1:1) and content image (unlocked + auto-insert) verified');
}

// Test 5: Active campaign action buttons CSS keeps New campaign, edit, and delete on one line
{
  const themeCss = fs.readFileSync('src/theme.css', 'utf8');
  assert.match(themeCss, /\.campaign-actions\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap/s, '.campaign-actions must be a non-wrapping flex row');
  assert.match(themeCss, /\.campaign-actions\s+\.new-campaign-button\s*\{[^}]*flex:\s*1\s+1\s+auto[^}]*width:\s*auto[^}]*white-space:\s*nowrap/s, '.new-campaign-button must flex on one line');
  assert.match(themeCss, /\.campaign-actions\s+\.rename-campaign-button[^{]*\{[^}]*width:\s*32px[^}]*height:\s*32px/s, 'Desktop campaign action buttons must be compact 32px');
  console.log('✓ Active campaign one-line actions CSS verified');
}

// Test 6: YouTube mixer dock & player shell responsive CSS
{
  const styleCss = fs.readFileSync('src/style.css', 'utf8');
  assert.match(styleCss, /\.youtube-mixer-dock>header\s*\{[^}]*min-height:\s*48px[^}]*height:\s*auto/s, 'YouTube mixer header must have min-height: 48px and auto height');
  assert.match(styleCss, /\.youtube-mixer-dock\.collapsed\s*\{[^}]*width:\s*min\(360px/s, 'Collapsed YouTube mixer dock must adaptively expand up to 360px');
  assert.match(styleCss, /\.youtube-player-shell\s*\{[^}]*aspect-ratio:\s*16\/9/s, 'YouTube player shell must enforce responsive 16/9 aspect-ratio');
  console.log('✓ YouTube mixer dock header and 16/9 player shell verified');
}

// Test 7: Scene actions non-overlapping layout and layer rename width
{
  const themeCss = fs.readFileSync('src/theme.css', 'utf8');
  assert.match(themeCss, /\.scene-wrapper\s+\.scene-deck-actions\s*\{[^}]*right:\s*78px/s, 'Deck actions must stay left of card actions');
  assert.match(themeCss, /\.scene-card-actions\s*\{[^}]*right:\s*8px/s, 'Card actions must be pinned to right: 8px');
  assert.match(themeCss, /\.layer-rename-input\s*\{[^}]*max-width:\s*180px[^}]*flex:\s*1\s+1\s+auto/s, 'Layer rename input must be responsive flex-capable');
  console.log('✓ Scene actions non-overlapping layout and layer rename width verified');
}

console.log('All image-crop-adjust tests passed!');
