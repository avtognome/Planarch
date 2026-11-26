import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTES, resolvePalette } from '../src/palettes.ts';

const themeCss = fs.readFileSync('src/theme.css', 'utf-8');

for (const selector of ['.theme-charcoal', '.theme-dark']) {
  const match = themeCss.match(new RegExp(`\\${selector}\\s*\\{([^}]+)\\}`, 'm'));
  assert.ok(match, `Missing ${selector} rule`);
  const body = match[1];
  assert.match(body, /--accent:\s*#d4a962\b/i, `${selector} restores antique gold accent`);
  assert.match(body, /--ornament-gold:/, `${selector} defines --ornament-gold`);
  assert.match(body, /--ornament-astral:/, `${selector} defines --ornament-astral`);
  assert.match(body, /--ornament-line:/, `${selector} defines --ornament-line`);
  assert.match(body, /--glow-live:/, `${selector} defines --glow-live`);
}

for (const selector of ['.theme-light', '.theme-charcoal-light']) {
  const match = themeCss.match(new RegExp(`\\${selector}\\s*\\{([^}]+)\\}`, 'm'));
  assert.ok(match, `Missing ${selector} rule`);
  const body = match[1];
  assert.match(body, /--bg:\s*#f6f1e7\b/i, `${selector} uses warm ivory canvas`);
  assert.match(body, /--accent:\s*#825d24\b/i, `${selector} uses AA-contrast aged gold accent`);
}

assert.match(themeCss, /\.app::before\s*\{[^}]*feTurbulence/s, 'Tactile micro-grain overlay is defined on .app::before');
assert.match(themeCss, /\.campaign-hero-header::after[\s\S]*?mask-image:/, 'Engraved astrolabe watermark uses CSS mask-image');
assert.match(themeCss, /\.session-banner::before[\s\S]*?background-image:/, 'Corner filigree brackets defined on major frames');
assert.match(themeCss, /\.party-card-avatar[\s\S]*?box-shadow:\s*0 0 0 2px var\(--panel\),\s*0 0 0 3px var\(--ornament-line\)/, 'Focal badges use double-ring antique-gold framing');
assert.match(themeCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.combatant-live\.current[\s\S]*?animation:\s*none\s*!important/s, 'Live animations honor prefers-reduced-motion');

assert.equal(PALETTES[0].accent, '#d4a962', 'PALETTES[0] dark accent matches antique gold');
assert.equal(PALETTES[0].canvas, '#141517', 'PALETTES[0] dark canvas matches warm obsidian');
const light = resolvePalette('light');
assert.equal(light.canvas, '#f6f1e7', 'Light palette canvas matches warm ivory');
assert.equal(light.accent, '#825d24', 'Light palette accent matches aged gold');

console.log('PASS astral theme tokens and decorative contracts');
