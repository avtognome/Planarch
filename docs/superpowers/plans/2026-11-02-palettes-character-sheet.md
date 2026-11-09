# Palettes and Character Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 selectable color palettes (4 dark, 4 light) in Settings and reconstruct a full interactive 2024 D&D character sheet in Planarch based on Mythallar.

**Architecture:** Add typed palette metadata and CSS token definitions, replacing topbar light/dark switch with a Settings palette picker while preserving logo/brand contrast variants. Extend character domain model with optional sheet attributes, isolate 2024 D&D rule calculations into pure functions, and render collapsible character sheet sections in CampaignTools with compendium/manual spell support.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, Vitest/Node test runner, Lucide React icons, Motion for React.

**Spec:** `docs/superpowers/specs/2026-11-02-palettes-character-sheet-design.md`

## Global Constraints
- Remove binary dark/light setting; provide 8 palettes: Dark (Totality Festival, Futuristic, SpaceX, Mission Control) and Light (Apple, Premium, Cursor, Ollama).
- Take color palette information only from OpenDesign links; do not copy typography, layout, or logos.
- Reverse engineer Mythallar character sheet behavior for Planarch; do not copy its styling or external dependencies.
- Use 2024 D&D calculation rules for single-class characters; allow manual DM overrides.
- No player accounts or shared multi-user permissions; DM local autosave in `wf-characters:<campaign>`.
- Antislope rules active during implementation: no em dashes in copy, WCAG AA contrast compliance, keyboard accessibility, no dead controls.

## Review Focus
1. Legacy `wf-theme` values (`light`, `dark`) or absent values must migrate cleanly to valid palette IDs without crash.
2. Character records without sheet properties (legacy data) must render and edit without schema migration errors.
3. HP modifications (damage/heal) must clamp cleanly (HP >= 0, HP <= maxHp unless tempHp applied) without NaN.
4. Spell slots must decrement/increment within bounds and recover on short/long rest based on spellcasting class rules.
5. Manual spell entries must persist even when compendium is empty or filtered.

---

### Task 1: Palette System & Tokens

**Files:**
- Create: `src/palettes.ts`
- Modify: `src/theme.css`
- Test: `tests/palettes.mjs`

**Interfaces:**
- Produces:
  - `export type PaletteId = 'totality' | 'futuristic' | 'spacex' | 'mission-control' | 'apple' | 'premium' | 'cursor' | 'ollama'`
  - `export interface PaletteDef { id: PaletteId; name: string; mode: 'dark' | 'light'; canvas: string; surface: string; text: string; accent: string; description: string }`
  - `export const PALETTES: PaletteDef[]`
  - `export function resolvePalette(raw: string | null | undefined): PaletteDef`

- [ ] **Step 1: Write the failing test**
Create `tests/palettes.mjs` asserting palette definitions exist, `resolvePalette` migrates `'dark'` to `'mission-control'`, `'light'` to `'premium'`, defaults invalid inputs to `'premium'`, and defines all 8 palettes.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/palettes.mjs`
Expected: FAIL (module `src/palettes.ts` missing).

- [ ] **Step 3: Implement `src/palettes.ts` and update `src/theme.css`**
Implement palette metadata and map tokens into `.theme-totality`, `.theme-futuristic`, `.theme-spacex`, `.theme-mission-control`, `.theme-apple`, `.theme-premium`, `.theme-cursor`, `.theme-ollama`, maintaining `.theme-dark` and `.theme-light` compatibility classes.

- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/palettes.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/palettes.ts src/theme.css tests/palettes.mjs
git commit -m "feat: add 8 color palette definitions and theme tokens"
```

---

### Task 2: Settings Palette Selector & Topbar Clean-Up

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/palettes-ui.mjs`

**Interfaces:**
- Consumes: `PaletteId`, `PALETTES`, `resolvePalette` from `src/palettes.ts`
- Produces: Settings modal with 8 palette options (4 dark, 4 light) with swatches; topbar removes binary Sun/Moon switch and links to Settings.

- [ ] **Step 1: Write the failing test**
Create `tests/palettes-ui.mjs` verifying Settings modal renders all 8 palette radio/button swatches, clicking one switches `theme` state and updates root class, and topbar no longer renders binary light/dark toggle button.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/palettes-ui.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement palette selector in `src/App.tsx`**
Update `theme` state type to `PaletteId`, migrate legacy theme in `useSaved`, replace topbar toggle with settings trigger or direct palette popover, and render 4 dark / 4 light swatches in Settings modal.

- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/palettes-ui.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx tests/palettes-ui.mjs
git commit -m "feat: integrate 8-palette picker in settings and remove binary theme toggle"
```

---

### Task 3: 2024 D&D Rules & Character Sheet Calculations

**Files:**
- Create: `src/characterRules.ts`
- Modify: `src/models.ts`
- Test: `tests/character-rules.mjs`

**Interfaces:**
- Produces in `src/models.ts`:
  - Extended `Character` type with optional `CharacterSheetData` (class, level, background, species, stats, skills, saves, hitDice, deathSaves, conditions, exhaustion, defenses, inventory, spells, spellSlots, resources).
- Produces in `src/characterRules.ts`:
  - `export function getModifier(score: number): number`
  - `export function getProficiencyBonus(level: number): number`
  - `export function getPassiveScore(abilityMod: number, isProficient: boolean, profBonus: number, bonus?: number): number`
  - `export function getStandardSpellSlots(className: string, level: number): Record<number, number>`
  - `export function calculateRestRecovery(character: Character, restType: 'short' | 'long'): Character`

- [x] **Step 1: Write the failing test**
Create `tests/character-rules.mjs` asserting ability modifiers, 2024 proficiency progression (+2 at lvl 1, +3 at lvl 5, etc.), wizard vs warlock vs fighter spell slots, and rest resets.

- [x] **Step 2: Run test to verify it fails**
Run: `node tests/character-rules.mjs`
Expected: FAIL.

- [x] **Step 3: Implement `src/characterRules.ts` and `src/models.ts`**
Code pure calculation helpers and type definitions without external dependencies.

- [x] **Step 4: Run test to verify it passes**
Run: `node tests/character-rules.mjs`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/models.ts src/characterRules.ts tests/character-rules.mjs
git commit -m "feat: add 2024 rules calculations and character sheet models"
```

---

### Task 4: Character Sheet Component (Mythallar Architecture)

**Files:**
- Create: `src/CharacterSheet.tsx`
- Modify: `src/CampaignTools.tsx`
- Modify: `src/theme.css`
- Test: `tests/character-sheet-ui.mjs`

**Interfaces:**
- Consumes: `Character`, `characterRules.ts`, compendium search from storage/compendium
- Produces:
  - `export function CharacterSheet({ character, onChange, compendiumSpells }: CharacterSheetProps)`
  - Collapsible sections: Combat Stats (HP adjust, AC, Init, Speed, Hit Dice, Death Saves, Conditions, Exhaustion, Defenses), Ability Scores & Saving Throws, Skills & Senses, Proficiencies, Features & Resources, Inventory & Attunement, Spellbook & Slots.

- [ ] **Step 1: Write the failing test**
Create `tests/character-sheet-ui.mjs` rendering `CharacterSheet` with legacy character, checking all 7 collapsible sections mount, damage/heal updates HP, adding spell/item updates state.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/character-sheet-ui.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement `src/CharacterSheet.tsx` and integrate in `src/CampaignTools.tsx`**
Build the full interactive sheet, render it for Player characters in CampaignTools (or toggled for NPCs), style it cleanly using Planarch palette tokens.

- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/character-sheet-ui.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/CharacterSheet.tsx src/CampaignTools.tsx src/theme.css tests/character-sheet-ui.mjs
git commit -m "feat: implement interactive character sheet reverse engineered from Mythallar"
```

---

### Task 5: Full Integration & Delivery Verification

**Files:**
- Modify: existing test suite runner (`package.json`) if needed
- Test: `tests/*.mjs`

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 2: Run TypeScript check**
Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Run production build**
Run: `npm run build`
Expected: Build succeeds without error.

- [ ] **Step 4: Browser verification**
Open Planarch in browser, switch through all 8 palettes in Settings, create a character, open Character Sheet, test damage/heal, rest, skill toggle, and spell slot tracking.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "chore: verify palettes and character sheet integration"
```
