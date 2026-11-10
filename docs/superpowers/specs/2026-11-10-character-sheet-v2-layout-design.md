# Character Sheet V2 Screenshot Layout & Compendium Spell Import — Design Spec

## Intent & Goal
Make `src/CharacterSheet.tsx` match the exact stacked card layout, visual hierarchy, and inline control arrangement shown in Gnome's three reference screenshots, mapped to Wayfinder's existing color palettes, while keeping all fields inline-editable and adding a dedicated **Compendium Spell Picker Modal** (showing only spells, sorted and filtered by class).

## Non-Goals & Anti-Goals
- Do not break backwards compatibility with existing `Character` records or existing tests (`tests/character-rules.mjs`, `tests/character-sheet-ui.mjs`).
- Do not hardcode non-theme colors; map all surfaces, borders, accents, and semantic statuses (`--status-green`, `--status-red`, `--accent`, `--panel`, `--panel-alt`, `--line`) to the app's available color palettes.
- Do not show non-spell entries in the Compendium Spell Picker Modal.

## Approaches Considered
1. **Approach 1: Full Screenshot Layout + Extended Optional `Character` Fields + Dedicated `CompendiumSpellModal` (Selected)**
   - Adds optional backwards-compatible fields to `Character` in `src/models.ts` (`currency`, `feats`, `characterNotes`, `darkvision`, `armorProficiencies`, `weaponProficiencies`, `spellcastingAbility`, `acNote`, `extraSpeeds`).
   - Rebuilds `src/CharacterSheet.tsx` into the 9 collapsible stacked sections matching the screenshots (`Character` + `Character Lore`, `Combat Stats`, `Features & Tracked Resources`, `Ability Scores & Saving Throws`, `Skills & Senses`, `Items & Inventory`, `Spellbook & Spell Slots`, `Proficiencies & Training`, `Notes`) using shadcn UI primitives (`Card`, `Button`, `Input`, `Textarea`, `Badge`).
   - Adds `src/CompendiumSpellModal.tsx` to import spells from the active Compendium + Homebrew library, restricted to `kind === 'spell'`, sorted by spell level and name, and filtered by class (auto-defaulting to the character's class when recognized) and level.
2. **Approach 2: Minimal Model + Inline Dropdown**
   - Serializes new fields into freeform notes and uses a basic `<select>` for spells. Rejected because it cannot preview full spell descriptions or filter cleanly by class/level.

## Section-by-Section Specification

### 1. Character & Character Lore (`sections.character`)
- **Identity Card**:
  - **Left**: Square portrait box (`Add Portrait` placeholder with user icon or `character.portrait` image; clicking allows setting/uploading portrait).
  - **Right**:
    - Top row: Inline-editable Character Name + `Character Level <level>` readout, and right-aligned action buttons (`Edit` toggle for extra details, `↑ Level Up` button to increment level, and `-` level step-down control).
    - Class badge pill (`<className> Lvl <level>`).
    - Two-column fields: `Race / Species` input (`None` placeholder) and `Subclass / Tradition` input (`None` placeholder).
    - Bottom speed bar: `Walking Speed <speed> ft` inline input on left, `+ Add Speed` button on right for extra movement speeds.
- **Character Lore sub-panel** (`Character Lore >`):
  - Collapsible sub-card inside `Character` exposing `Background`, `Alignment`, `Personality`, `Motivation`, and `Relationships`.

### 2. Combat Stats (`sections.combat`)
- **Top 3-column grid**:
  1. **Hit Points Card** (`.char-hp-card`):
     - Left area: `Hit Points` header with heart icon, inner box with `Current` / `Max` inputs and separate `Temp` box, plus a bottom HP progress bar (`currentHp / maxHp`).
     - Right area (vertical action stack): red `Damage` button, numeric delta input (`0`), green `Heal` button.
  2. **AC Card**:
     - Header: `AC` with shield icon on left, `+ Note` button on right.
     - Large hero `Armor Class` input (`10`), `Armor Class` subtitle, and optional editable AC note.
  3. **Right Stacked Column**:
     - **Spellcasting Card**: Header `Spellcasting` on left, clickable ability pill (`INT` / `WIS` / `CHA`) on right; two columns inside showing calculated `+X Spell Attack` (`profBonus + abilityMod`) and `X Spell DC` (`8 + profBonus + abilityMod`).
     - **Initiative Card**: Horizontal bar with `Initiative` label on left and `+X` editable input on right.
- **Middle 3-segment strip**:
  - **Hit Dice**: `Hit Dice` label with `[-  current/max dX  +]` stepper pill and Short / Long Rest recovery buttons.
  - **Inspiration**: `Inspiration` label with `[-  0/1  +]` stepper (maps cleanly to `character.inspiration`).
  - **Death Saves**: `Death Saves` header with `Succ ●●●` and `Fail ●●●` interactive pips.
- **Conditions Row** (`.char-conditions-group`):
  - `Conditions:` header with `+ Add` button on right; contains `Exhaustion [- 0 +]` stepper pill and active condition chips.
- **Resistance & Immunities Row** (`.char-defenses-group`):
  - `Resistance & Immunities:` header with `+ Add` button on right; displays defense chips or `None recorded`.

### 3. Features & Tracked Resources (`sections.resources`)
- Header with `+ Add Resource` button and rest reset trigger button on right.
- Tracked resources list (`.char-resource-card` with `-`, `current / max`, `+`, delete) and inline add-resource bar.
- `Features & Freeform Notes:` full-width `Textarea`.
- `Feats:` subsection with `+ Add` button on right and feat chips/entries (`No feats recorded.` when empty).

### 4. Ability Scores & Saving Throws (`sections.abilities`)
- Header includes `Proficiency +<profBonus>` pill badge.
- 6-column ability card grid (`STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`):
  - Each card shows Ability code, large editable score (`10`), accent modifier (`+0`), horizontal divider, and `Save +X` button/toggle at bottom.
  - Proficient saves display an accent border, top-right indicator dot, and accent `Save +X` label.

### 5. Skills & Senses (`sections.skills`)
- Header includes `Filter skills...` search input on right.
- 4-column passives row: `Passive Perception`, `Passive Investigation`, `Passive Insight`, and editable `Darkvision (ft)`.
- Two-column skill rows grouped by Ability:
  - Left column: `STR` (`Athletics`), `DEX` (`Acrobatics`, `Sleight of Hand`, `Stealth`), `INT` (`Arcana`, `History`, `Investigation`, `Nature`, `Religion`).
  - Right column: `WIS` (`Animal Handling`, `Insight`, `Medicine`, `Perception`, `Survival`), `CHA` (`Deception`, `Intimidation`, `Performance`, `Persuasion`).
  - Each skill pill has proficiency/expertise controls on left, `Skill Name ABILITY` label, and `+X` total bonus on right.

### 6. Items & Inventory (`sections.inventory`)
- Header includes `Attune: X / 3` badge, `Filters >` toggle, and `+ Add` button.
- Full-width `Search inventory...` input.
- **Currency Row**: `Currency` label on left, calculated `Total: X gp` on right, and 5 editable boxes (`CP`, `SP`, `EP`, `GP`, `PP`).
- Item list + inline add-item form.

### 7. Spellbook & Spell Slots (`sections.spells`) + Compendium Spell Import
- Header includes `Prepared: X` badge, `+ Import Spells` button, and `+ Add Spell` button.
- 9-level spell slots grid, spells list, and custom spell form.
- **`CompendiumSpellModal`**:
  - Loads spells (`kind === 'spell'`) from IndexedDB compendium (`readMeta` / `readRecord`), cloud fallback (`getCloudCompendiumMeta` / `getCloudCompendiumRecord`), and campaign homebrew (`readHomebrew`).
  - Filters by **Class** (`All`, `Artificer`, `Bard`, `Cleric`, `Druid`, `Paladin`, `Ranger`, `Sorcerer`, `Warlock`, `Wizard` — defaulting to character's class if it matches), **Spell Level** (`All`, `Cantrip (0)`, `1`–`9`), and **Search query**, sorted by **Spell Level then Name** (`level-asc` default, or `name-asc`).
  - Shows spell details on right (Level, School, Casting Time, Range, Components, Duration, Classes, Description) and imports selected spell(s) directly into `character.spells`.

### 8. Proficiencies & Training (`sections.proficiencies`)
- 2x2 card grid:
  - `Armor` | `Weapons`
  - `Tools` | `Languages` (renders language chips like `Common` + inline edit).

### 9. Notes (`sections.notes`)
- Toolbar with `Search notes...` input, sort direction toggle, `Sort By` selector (`Date`, `Title`), and `+ New Note` button.
- Renders structured note cards (Title, Date, Pin toggle, Body textarea, Delete).
