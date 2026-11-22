import assert from 'node:assert/strict';
import fs from 'node:fs';

const style = fs.readFileSync('src/style.css', 'utf8');
const theme = fs.readFileSync('src/theme.css', 'utf8');

const rule = (css, selector) => {
  const match = css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm'));
  assert.ok(match, `Missing ${selector} rule`);
  return match[1].replace(/\s+/g, '');
};

const selected = rule(style, '.scene-filters .selected');
assert.match(selected, /background:var\(--panel-alt\)/, 'Scene filter selected background uses theme token');
assert.match(selected, /border-color:var\(--line-strong\)/, 'Scene filter selected border uses theme token');
assert.match(selected, /color:var\(--text\)/, 'Scene filter selected text uses theme token');
assert.doesNotMatch(selected, /#[0-9a-f]{3,8}/i, 'Scene filter selected state has no hardcoded color');

const shield = rule(theme, '.party-strip-heading .inline svg');
assert.match(shield, /color:var\(--accent\)/, 'Party Vitals shield follows active palette accent');

const searchInput = rule(theme, '.comp-spell-search input');
assert.match(searchInput, /flex:1/, 'Spell search input consumes remaining row width');
assert.match(searchInput, /min-width:0/, 'Spell search input may shrink without clipping');
assert.match(searchInput, /width:auto/, 'Spell search input overrides global full width');
assert.match(searchInput, /margin:0!important/, 'Spell search input resets margin');
assert.match(searchInput, /background:transparent!important/, 'Spell search input resets background');

const modalToolSearch = rule(theme, '.modal .tool-search input');
assert.match(modalToolSearch, /margin-bottom:0!important/, 'Modal tool-search input resets bottom margin');

const filters = rule(theme, '.comp-spell-filters');
assert.match(filters, /grid-template-columns:minmax\(0,1\.5fr\)repeat\(3,minmax\(0,1fr\)\)/, 'Spell filters use zero-minimum grid tracks');

console.log('PASS palette and spell layout regressions');
