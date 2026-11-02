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

// Check 5: CSS files must not contain legacy font families outside fallback definitions
const cssFiles = [
  path.join(root, 'src', 'style.css'),
  path.join(root, 'src', 'features.css'),
  path.join(root, 'src', 'theme.css'),
];

for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const basename = path.basename(file);

  // No Georgia, Manrope, or monospace families
  assert(!/\b(Georgia|Manrope|ui-monospace|SFMono-Regular|Menlo|Monaco)\b/i.test(content), `${basename} must not contain legacy font families (Georgia/Manrope/monospace)`);

  // No literal -apple-system/BlinkMacSystemFont outside --font-ui token definition
  const withoutFontUiDef = content.replace(/--font-ui:[^;]+;/g, '');
  assert(!/-apple-system|BlinkMacSystemFont|"SF Pro Display"|"SF Pro Text"/i.test(withoutFontUiDef), `${basename} must not contain hardcoded Apple system fonts outside --font-ui definition`);

  // No visible font-size below 13px: regex matches [1-9]px or 1[0-2](\.\d+)?px (excluding 0px / 0)
  // Match font-size: Xpx or font: ... Xpx
  const undersizedMatches = content.match(/(?:font-size:\s*|font:\s*(?:[^;}]*\s+)?)([1-9](?:\.\d+)?|1[0-2](?:\.\d+)?)px\b/gi) || [];
  assert.equal(undersizedMatches.length, 0, `${basename} contains undersized text (< 13px): ${undersizedMatches.slice(0, 10).join(', ')}`);

  // No font-weight other than 400 or 600 (or inherit/normal/bold if mapped, but plan specifies 400/600 only)
  // We check for explicit numbers like 500, 650, 700, 750, 800, 900
  const nonStandardWeights = content.match(/font-weight:\s*(?:100|200|300|500|650|700|750|800|900)\b/gi) || [];
  assert.equal(nonStandardWeights.length, 0, `${basename} contains non-standard font weights: ${nonStandardWeights.slice(0, 10).join(', ')}`);
}

console.log('tests/typography.mjs: all base typography assertions passed.');
