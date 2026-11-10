# Character Sheet V2 Screenshot Layout & Compendium Spell Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Character Sheet UI to match the 3 reference screenshots (9 stacked collapsible sections with inline editing mapped to Wayfinder's theme palettes) and add a Compendium Spell Picker Modal filtered by class and sorted by spell level.

**Architecture:** Extend `Character` in `src/models.ts` with backwards-compatible optional fields (`currency`, `feats`, `characterNotes`, `darkvision`, `armorProficiencies`, `weaponProficiencies`, `spellcastingAbility`, `acNote`). Create `src/CompendiumSpellModal.tsx` patterned on `CompendiumMonsterModal.tsx` to query and preview `kind === 'spell'` entries filtered by class/level. Restructure `src/CharacterSheet.tsx` and `src/theme.css` to render the exact screenshot card layouts using shadcn UI components (`Card`, `Button`, `Input`, `Textarea`, `Badge`).

**Tech Stack:** React 19, TypeScript, Vite, CSS custom properties (`src/theme.css`), shadcn UI (`src/components/ui/*`), Node test runner (`react-test-renderer`).

**Spec:** `docs/superpowers/specs/2026-11-10-character-sheet-v2-layout-design.md`

## Global Constraints

- Keep 100% backwards compatibility with existing `Character` objects and `tests/character-rules.mjs`.
- Map all colors to existing theme variables in `src/theme.css` (`--panel`, `--panel-alt`, `--panel-elevated`, `--line`, `--accent`, `--accent-subtle`, `--status-green`, `--status-red`, `--text`, `--text-muted`).
- Use shadcn UI components (`Card`, `Button`, `Input`, `Textarea`, `Badge` from `./components/ui/*`).
- `CompendiumSpellModal` must only display `kind === 'spell'` records, sorted by spell level (`0`–`9`) then name, and filterable by spellcasting class (`All`, `Artificer`, `Bard`, `Cleric`, `Druid`, `Paladin`, `Ranger`, `Sorcerer`, `Warlock`, `Wizard`).

## Review Focus

- Legacy characters missing `currency`, `feats`, `characterNotes`, `darkvision`, or `spellcastingAbility` render defaults (`0` coins, empty lists, `60` ft darkvision, inferred spellcasting ability from class) without throwing.
- Importing a spell from `CompendiumSpellModal` extracts `level` (`0`–`9`), `school`, `ritual`, and `concentration` from `CompendiumRecord.fields` and avoids duplicate imports by name.
- Currency `Total: X gp` accurately converts `CP / 100 + SP / 10 + EP / 2 + GP + PP * 10`.
- Skills filter input narrows visible skill rows without losing ability grouping or proficiency toggles.
- Notes search and sort (`Date`, `Title`) filter and order character notes while keeping pin/edit/delete interactive.

---

### Task 1: Character Model Extensions & CompendiumSpellModal

**Files:**
- Modify: `src/models.ts:55-120`
- Create: `src/CompendiumSpellModal.tsx`
- Test: `tests/character-sheet-ui.mjs`

**Interfaces:**
- Produces in `src/models.ts`:
  ```ts
  export type CharacterCurrency = { cp: number; sp: number; ep: number; gp: number; pp: number };
  export type CharacterNoteEntry = { id: string; title: string; body: string; date: string; pinned?: boolean };
  // Added optional fields on Character:
  currency?: CharacterCurrency;
  feats?: string[];
  characterNotes?: CharacterNoteEntry[];
  darkvision?: number;
  armorProficiencies?: string;
  weaponProficiencies?: string;
  spellcastingAbility?: AbilityName;
  acNote?: string;
  ```
- Produces in `src/CompendiumSpellModal.tsx`:
  ```ts
  export interface CompendiumSpellModalProps {
    defaultClass?: string;
    indexEntries?: EntryIndex[];
    homebrewRecords?: CompendiumRecord[];
    records?: CompendiumRecord[];
    loadRecord?: (id: string) => Promise<CompendiumRecord | null>;
    onImport: (spells: CharacterSpell[]) => void;
    onClose: () => void;
  }
  export function CompendiumSpellModal(props: CompendiumSpellModalProps): React.JSX.Element;
  export function compendiumRecordToCharacterSpell(record: CompendiumRecord, fallbackSummary?: string): CharacterSpell;
  ```

- [ ] **Step 1: Write the failing test in `tests/character-sheet-ui.mjs`**

Add unit and component assertions in `tests/character-sheet-ui.mjs` importing `CompendiumSpellModal` and `compendiumRecordToCharacterSpell` from `CompendiumSpellModal.js`, verifying:
1. Non-spell records (`kind: 'monster'`, `kind: 'item'`) are excluded.
2. Spells are sorted by level (`0` cantrips before level `1` before level `3`) then alphabetically.
3. Class filter defaults to matching `defaultClass` (e.g. `'Wizard'`) and filters out spells whose classes do not include the selected class.
4. Importing a spell converts `CompendiumRecord` to `CharacterSpell` with level, school, concentration, and ritual flags.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/character-sheet-ui.mjs`
Expected: FAIL with module/export not found for `CompendiumSpellModal.js`.

- [ ] **Step 3: Implement `Character` types in `src/models.ts` and `CompendiumSpellModal` in `src/CompendiumSpellModal.tsx`**

- Add `CharacterCurrency`, `CharacterNoteEntry`, and optional fields on `Character` in `src/models.ts`.
- Create `src/CompendiumSpellModal.tsx` with search input, class filter (`All`, `Artificer`, `Bard`, `Cleric`, `Druid`, `Paladin`, `Ranger`, `Sorcerer`, `Warlock`, `Wizard`), level filter (`All`, `0`, `1`..`9`), sort selector (`level-asc`, `name-asc`), spell detail preview pane, and `+ Import Spell` action.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/character-sheet-ui.mjs && cmd.exe /c "npm run check"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models.ts src/CompendiumSpellModal.tsx tests/character-sheet-ui.mjs
git commit -m "feat: add compendium spell picker modal filtered by class"
```

---

### Task 2: Character Sheet V2 Screenshot Layout & Inline Controls

**Files:**
- Modify: `src/CharacterSheet.tsx`
- Modify: `src/CampaignTools.tsx` (pass `campaign` prop to `CharacterSheet` for homebrew spell lookup if available)
- Modify: `src/theme.css`
- Test: `tests/character-sheet-ui.mjs`

**Interfaces:**
- Consumes: `CompendiumSpellModal` from `./CompendiumSpellModal`, `CharacterCurrency` & `CharacterNoteEntry` from `./models`.
- Produces in `src/CharacterSheet.tsx`:
  - 9 collapsible sections matching the screenshots:
    1. `Character` (Portrait box, Name + Character Level, Class badge, `Edit` & `Level Up` buttons, `Race / Species`, `Subclass / Tradition`, `Walking Speed` + `+ Add Speed`, and collapsible `Character Lore` sub-panel).
    2. `Combat Stats` (3-column top row: Hit Points card with vertical `Damage` / delta / `Heal` stack + HP bar, AC card with `+ Note`, stacked Spellcasting Attack/DC card + Initiative bar; middle 3-segment strip: `Hit Dice` stepper + Short/Long Rest, `Inspiration` stepper, `Death Saves` Succ/Fail pips; `Conditions` row with `Exhaustion` stepper + `+ Add`; `Resistance & Immunities` row with `+ Add`).
    3. `Features & Tracked Resources` (`+ Add Resource` + rest reset in header, resource cards, `Features & Freeform Notes` textarea, `Feats` subsection with `+ Add`).
    4. `Ability Scores & Saving Throws` (`Proficiency +X` header badge, 6-column ability cards with score, modifier, divider, `Save +X` toggle, and proficient card highlight + top-right dot).
    5. `Skills & Senses` (`Filter skills...` search in header, 4-column passives + `Darkvision (ft)`, 2-column skill list grouped by ability: `STR`/`DEX`/`INT` on left, `WIS`/`CHA` on right).
    6. `Items & Inventory` (`Attune: X / 3` badge, `+ Add` button, `Search inventory...` input, `Currency` 5-box row `CP`/`SP`/`EP`/`GP`/`PP` with `Total: X gp`, item rows).
    7. `Spellbook & Spell Slots` (`Prepared: X` badge, `+ Import Spells` button opening `CompendiumSpellModal`, 9-level slots, spell rows, custom spell form).
    8. `Proficiencies & Training` (2x2 grid: `Armor`, `Weapons`, `Tools`, `Languages` chips).
    9. `Notes` (`Search notes...`, sort direction, `Sort By`, `+ New Note`, note cards with title/date/pin/body).

- [ ] **Step 1: Write the failing test in `tests/character-sheet-ui.mjs`**

Update `tests/character-sheet-ui.mjs` to assert:
1. All 9 collapsible sections render (`Character`, `Combat Stats`, `Features & Tracked Resources`, `Ability Scores & Saving Throws`, `Skills & Senses`, `Items & Inventory`, `Spellbook & Spell Slots`, `Proficiencies & Training`, `Notes`).
2. `Character` section renders portrait box, `Race / Species`, `Subclass / Tradition`, `Walking Speed`, `Level Up` button, and `Character Lore` collapsible sub-panel.
3. `Combat Stats` renders HP card with vertical Damage/delta/Heal stack + HP bar, AC card, Spellcasting Attack/DC card, Initiative card, middle strip (`Hit Dice`, `Inspiration`, `Death Saves`), `Conditions` with `Exhaustion` stepper, and `Resistance & Immunities`.
4. `Features & Tracked Resources` includes `Feats` add/remove.
5. `Skills & Senses` includes `Filter skills...` search input, `Darkvision (ft)` input, and two-column ability-grouped skill lists.
6. `Items & Inventory` includes `Search inventory...` and 5 currency inputs (`CP`, `SP`, `EP`, `GP`, `PP`) with calculated `Total: X gp`.
7. `Proficiencies & Training` renders 2x2 grid (`Armor`, `Weapons`, `Tools`, `Languages`).
8. `Notes` section supports adding, searching, pinning, and editing notes.
9. `Spellbook & Spell Slots` opens `CompendiumSpellModal` via `+ Import Spells` and adds imported spells to the character.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/character-sheet-ui.mjs`
Expected: FAIL on section count and new V2 layout elements.

- [ ] **Step 3: Implement V2 layout in `src/CharacterSheet.tsx`, `src/CampaignTools.tsx`, and `src/theme.css`**

Update `src/CharacterSheet.tsx` and `src/theme.css` to match the 9-section screenshot layout using Wayfinder theme tokens and shadcn UI components.

- [ ] **Step 4: Run tests, typecheck, and build to verify**

Run: `node tests/character-sheet-ui.mjs && cmd.exe /c "npm run check" && cmd.exe /c "npm test" && cmd.exe /c "npm run build"`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/CharacterSheet.tsx src/CampaignTools.tsx src/theme.css tests/character-sheet-ui.mjs
git commit -m "feat: redesign character sheet UI to match v2 screenshot layout"
```
