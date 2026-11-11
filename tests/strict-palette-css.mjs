import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('strict palette CSS variable mapping', () => {
  const css = readFileSync('src/theme.css', 'utf-8');

  // 1. Only charcoal palette class defines semantic variables
  const palettes = [
    'charcoal',
  ];

  const requiredTokens = [
    '--status-green',
    '--status-yellow',
    '--status-red',
    '--brand-mark-color',
    '--button-primary-bg',
    '--button-primary-text',
    '--input-bg',
    '--input-border',
    '--input-text',
    '--tab-selected-bg',
    '--sidebar-bg',
    '--topbar-bg',
  ];

  for (const pal of palettes) {
    const palRegex = new RegExp(`\\.theme-${pal}\\s*\\{([^}]+)\\}`, 'm');
    const match = css.match(palRegex);
    assert.ok(match, `Missing theme class: .theme-${pal}`);
    const body = match[1];
    for (const token of requiredTokens) {
      assert.ok(
        body.includes(token),
        `Theme .theme-${pal} missing token: ${token}`
      );
    }
  }

  // 2. .sync-status-* classes do not use hardcoded hex
  const syncMatches = css.match(/\.sync-status-(green|yellow|red)\s*\{[^}]+\}/g);
  assert.ok(syncMatches && syncMatches.length >= 3, 'Missing .sync-status classes');
  for (const rule of syncMatches) {
    assert.ok(
      !/#([0-9a-fA-F]{3,8})\b/.test(rule),
      `.sync-status rule contains hardcoded hex: ${rule}`
    );
  }

  // 3. .theme-light and .theme-dark scoped rules (outside the root token definitions)
  // should not contain hardcoded hex colors
  // Split CSS into rules: selector { declarations }
  const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let m;
  const offendingRules = [];

  while ((m = ruleRegex.exec(cleanCss)) !== null) {
    const selector = m[1].trim();
    const body = m[2].trim();

    // Check rules starting with or containing .theme-light or .theme-dark
    // Except root property definitions: `.theme-light{--bg:...}` and `.theme-dark{--bg:...}`
    const isThemeScope = /(\.theme-light|\.theme-dark)\b/.test(selector);
    const isRootTokenDef = /^(\.theme-light|\.theme-dark)$/.test(selector);

    if (isThemeScope && !isRootTokenDef) {
      if (/#([0-9a-fA-F]{3,8})\b/.test(body)) {
        offendingRules.push(`${selector} { ${body} }`);
      }
    }
  }

  assert.equal(
    offendingRules.length,
    0,
    `Found hardcoded hex in .theme-light / .theme-dark rules:\n` + offendingRules.slice(0, 10).join('\n')
  );
});
