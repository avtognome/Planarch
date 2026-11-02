import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fontDir = path.join(root, 'public', 'fonts');
const woff400 = path.join(fontDir, 'ibm-plex-sans-latin-400-normal.woff2');
const woff600 = path.join(fontDir, 'ibm-plex-sans-latin-600-normal.woff2');
const license = path.join(fontDir, 'LICENSE');

// Check 1: Font files and license exist
assert(fs.existsSync(woff400), 'Missing regular 400 woff2 font file');
assert(fs.existsSync(woff600), 'Missing semibold 600 woff2 font file');
assert(fs.existsSync(license), 'Missing font license file');

const licenseContent = fs.readFileSync(license, 'utf8');
assert(licenseContent.includes('SIL OPEN FONT LICENSE Version 1.1'), 'License must be SIL OFL 1.1');

// Check 2: style.css has @font-face declarations for 400 and 600
const styleCssPath = path.join(root, 'src', 'style.css');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

assert(!/https?:\/\/fonts\.(googleapis|gstatic)\.com/i.test(styleCss), 'No external Google Fonts URL in style.css');
assert(/@font-face\s*\{[^}]*font-family:\s*['"]IBM Plex Sans['"][^}]*font-weight:\s*400[^}]*font-display:\s*swap/s.test(styleCss), 'style.css missing @font-face for weight 400 with swap');
assert(/@font-face\s*\{[^}]*font-family:\s*['"]IBM Plex Sans['"][^}]*font-weight:\s*600[^}]*font-display:\s*swap/s.test(styleCss), 'style.css missing @font-face for weight 600 with swap');

// Check 3: style.css defines the four type tokens and font-ui
assert(/--font-ui:\s*['"]IBM Plex Sans['"]/i.test(styleCss), 'style.css missing --font-ui token');
assert(/--type-page:\s*22px\b/.test(styleCss), 'style.css missing --type-page: 22px');
assert(/--type-section:\s*17px\b/.test(styleCss), 'style.css missing --type-section: 17px');
assert(/--type-body:\s*14px\b/.test(styleCss), 'style.css missing --type-body: 14px');
assert(/--type-label:\s*13px\b/.test(styleCss), 'style.css missing --type-label: 13px');

// Check 4: DESIGN.md references IBM Plex Sans
const designMdPath = path.join(root, 'DESIGN.md');
const designMd = fs.readFileSync(designMdPath, 'utf8');
assert(/IBM Plex Sans/i.test(designMd), 'DESIGN.md must reference IBM Plex Sans');

console.log('tests/typography.mjs: all base typography assertions passed.');
