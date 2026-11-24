import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
const themeCss = fs.readFileSync(path.resolve('src/theme.css'), 'utf8');

// Test 1: App imports and renders shadcn Card for party cards
assert.ok(
  appContent.includes("from './components/ui/card'") ||
  appContent.includes('from "@/components/ui/card"') ||
  appContent.includes("from '@/components/ui/card'"),
  'App.tsx must import Card component from shadcn ui/card'
);

assert.ok(
  /<Card\b[^>]*className=(?:["'][^"']*party-card[^"']*["']|\{`[^`]*party-card[^`]*`\})/.test(appContent),
  'Party cards in App.tsx must use <Card className="...party-card..."> container'
);

// Test 2: theme.css contains responsive layout rules for .party-card and .party-card-stats
assert.ok(
  /\.party-card\s*\{[^}]*flex-wrap:\s*wrap/s.test(themeCss) ||
  /\.party-card-stats\s*\{[^}]*flex-wrap:\s*wrap/s.test(themeCss),
  'Party card or stats must allow wrapping to prevent horizontal overlap on narrow containers'
);

// Test 3: .party-cards-grid exists and .party-status-strip outer box is borderless
assert.ok(themeCss.includes('.party-cards-grid'), 'theme.css must define .party-cards-grid');
assert.match(
  themeCss,
  /\.party-status-strip\s*\{[^}]*background:\s*transparent[^}]*border:\s*0/s,
  '.party-status-strip must remove outer card border and background'
);

// Test 4: Option B elements (44px portrait, micro HP bar, thresholds, condition pills, tabular columns)
assert.match(themeCss, /\.party-card-avatar\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s, '.party-card-avatar must use 44x44px dimensions');
for (const cls of ['.party-hp-track', '.party-hp-fill', '.hp-healthy', '.hp-bloodied', '.hp-critical', '.party-condition-pill', '.party-stat-col']) {
  assert.ok(themeCss.includes(cls), `theme.css must define ${cls}`);
}

// Test 5: App.tsx wires characterFocus to CampaignTools and keyboard-accessible Party Cards
assert.ok(appContent.includes('focusCharacterId={characterFocus}'), 'App.tsx must pass characterFocus to CampaignTools');
assert.match(
  appContent,
  /<Card\b[^>]*party-card[^>]*role="button"[^>]*tabIndex=\{0\}[^>]*onKeyDown=/s,
  'Party cards must be keyboard interactive with role="button", tabIndex, and onKeyDown'
);

// Test 6: CampaignTools focusCharacterId selects target PC sheet on mount and updates
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i],
  get length() { return store.size; },
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const out = path.resolve('.sites-runtime/test-modules');
function transpileDir(dir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      transpileDir(path.join(dir, entry.name), path.join(targetDir, entry.name));
    } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'main.tsx') {
      let code = ts.transpileModule(fs.readFileSync(path.join(dir, entry.name), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText;
      code = code
        .replace(/import ['"]\.\/[^'"]+\.css['"];?/g, '')
        .replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (_, n) => {
          let rel = path.relative(targetDir, path.join(out, 'components', 'ui', n.replace(/\.js$/, '') + '.js')).replace(/\\/g, '/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return `from '${rel}'`;
        })
        .replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (_, n) => {
          let rel = path.relative(targetDir, path.join(out, 'lib', n.replace(/\.js$/, '') + '.js')).replace(/\\/g, '/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return `from '${rel}'`;
        })
        .replace(/from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, (_, n) => `from './${n}.js'`);
      fs.writeFileSync(path.join(targetDir, entry.name.replace(/\.tsx?$/, '.js')), code);
    }
  }
}
transpileDir('src', out);

const { default: CampaignTools } = await import(pathToFileURL(path.join(out, 'CampaignTools.js')).href);

store.set('wf-characters:TestCamp', JSON.stringify([
  { id: 'pc-1', name: 'Kaelen', kind: 'Player', role: 'Paladin', portrait: '', personality: '', motivation: '', relationships: '', notes: '', hp: 34, maxHp: 44, initiative: 2, ac: 18, passivePerception: 12 },
  { id: 'pc-2', name: 'Lyra', kind: 'Player', role: 'Wizard', portrait: '', personality: '', motivation: '', relationships: '', notes: '', hp: 8, maxHp: 26, tempHp: 4, conditions: ['Poisoned'], initiative: 3, ac: 13, passivePerception: 15 },
]));

let handledCount = 0;
let renderer;
await act(async () => {
  renderer = TestRenderer.create(React.createElement(CampaignTools, {
    page: 'Characters & NPCs',
    campaign: 'TestCamp',
    campaignLabel: 'TestCamp',
    onStart: () => {},
    onUpdate: () => {},
    activeEncounterId: '',
    battleActive: false,
    notify: () => {},
    focusCharacterId: 'pc-2',
    onFocusHandled: () => { handledCount++; },
  }));
});

const selectedRows1 = renderer.root.findAll(el => el.type === 'button' && typeof el.props.className === 'string' && el.props.className.includes('record-row') && el.props.className.includes('selected'));
assert.equal(selectedRows1.length, 1);
assert.ok(selectedRows1[0].findAll(el => el.type === 'strong' && el.children.includes('Lyra')).length > 0, 'focusCharacterId="pc-2" selects Lyra on mount');
assert.ok(handledCount >= 1, 'onFocusHandled is called after focusing character');

await act(async () => {
  renderer.update(React.createElement(CampaignTools, {
    page: 'Characters & NPCs',
    campaign: 'TestCamp',
    campaignLabel: 'TestCamp',
    onStart: () => {},
    onUpdate: () => {},
    activeEncounterId: '',
    battleActive: false,
    notify: () => {},
    focusCharacterId: 'pc-1',
    onFocusHandled: () => { handledCount++; },
  }));
});

const selectedRows2 = renderer.root.findAll(el => el.type === 'button' && typeof el.props.className === 'string' && el.props.className.includes('record-row') && el.props.className.includes('selected'));
assert.equal(selectedRows2.length, 1);
assert.ok(selectedRows2[0].findAll(el => el.type === 'strong' && el.children.includes('Kaelen')).length > 0, 'Updating focusCharacterId switches selection to Kaelen');

console.log('PASS party vitals responsive, Option B aesthetics, and character deep-link tests');
