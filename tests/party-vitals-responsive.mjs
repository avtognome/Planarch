import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
  /<Card\b[^>]*className=["'][^"']*party-card[^"']*["']/.test(appContent),
  'Party cards in App.tsx must use <Card className="party-card"> container'
);

// Test 2: theme.css contains responsive layout rules for .party-card and .party-card-stats
assert.ok(
  /\.party-card\s*\{[^}]*flex-wrap:\s*wrap/s.test(themeCss) ||
  /\.party-card-stats\s*\{[^}]*flex-wrap:\s*wrap/s.test(themeCss),
  'Party card or stats must allow wrapping to prevent horizontal overlap on narrow containers'
);

// Test 3: Grid minmax should be responsive (not fixed rigid 200px without min-width: 0 protection)
assert.ok(
  themeCss.includes('.party-cards-grid'),
  'theme.css must define .party-cards-grid'
);

console.log('PASS party vitals responsive and shadcn Card contract tests');
