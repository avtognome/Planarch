# Design Spec: Homebrew Components & Clean Section Page Headers

**Date:** 2026-10-29  
**Status:** Approved  
**Topic:** Campaign-Scoped Homebrew Creation, Auto-Wiki Sync, Stat Block Modal with Live Preview & Clickable Dice, and Section Page Header Alignment

---

## 1. Overview & Goals

1. **Clean Section Headers (Kill AI Slop)**:
   - Match the header style in `Atmosphere Studio`, `Encounters`, `Characters & NPCs`, `Campaign wiki`, and `Compendium` to the clean typographic hero header on the Dashboard.
   - Remove decorative sparkles (`✧`) and AI-generated taglines/slogans.
   - Retain clean uppercase eyebrow (`{CAMPAIGN} · {PAGE}`) and clean page title `<h1>{page}</h1>`, with right-aligned action buttons.

2. **Compendium Homebrew Creation**:
   - Provide an "Add Homebrew" button in the Compendium view.
   - Support multiple categories: `monster`, `npc`, `spell`, `item`, `feat`, etc.
   - For `monster` and `npc`, provide a full 5e/5.5e stat block fillable form:
     - Core meta: Size, Type, Alignment, CR
     - Vitals: AC, HP + Hit Dice formula, Speed
     - Ability scores: STR, DEX, CON, INT, WIS, CHA with auto-calculated modifiers
     - Defenses/Senses: Saves, Skills, Resistances, Immunities, Senses, Languages
     - Features/Actions: Traits, Actions, Bonus Actions, Reactions, Legendary Actions
   - Clickable dice expressions: All attacks, damage rolls, and formulas (e.g. `+5 to hit`, `2d6+3 slashing`) render as interactive roll buttons that dispatch rolls to the dice engine.
   - Live Preview: Split-view modal showing form on left and live rendered stat block on right.

3. **Campaign Wiki Sync**:
   - Automatically create/update an equivalent Wiki page in `wf-wiki:${campaign}` whenever a Homebrew entry is saved.
   - Formatted with markdown headers, ability table, traits, actions, and interactive tags so it can be viewed, linked with `[[Page Name]]`, and browsed in the wiki and wiki graph.
   - Saved campaign-scoped under `wf-homebrew:${campaign}` and merged into Compendium index under the `Homebrew` edition filter.

---

## 2. Architecture & Data Structures

### 2.1 Storage
- **Campaign Homebrew Store**:
  - Key: `wf-homebrew:${campaign}` (JSON array of `CompendiumRecord`).
  - Each record has:
    - `id`: unique string (`uid()`)
    - `kind`: `'monster' | 'spell' | 'item' | 'feat' | 'race' | 'class'` (for `npc`, stored as kind `'monster'` with tag/type `NPC` or role `NPC`)
    - `name`: string
    - `edition`: `'Homebrew'`
    - `fields`: record of fields matching Compendium schema
- **Campaign Wiki Store**:
  - Key: `wf-wiki:${campaign}` (JSON array of `WikiPage`).
  - Homebrew pages have:
    - `category`: `'Homebrew'` (or `'Monster · Homebrew'`, etc.)
    - `title`: record name
    - `body`: formatted Markdown stat block including clickable dice and abilities
    - `tags`: `'homebrew, ' + record.kind`

### 2.2 Header Refactor
- Update `src/App.tsx`:
  - Replace `<div className="page-heading">...</div>` with `<div className="campaign-hero-header page-hero-header">...</div>`.
  - Eyebrow: `{campaign ? campaign.toUpperCase() + ' · ' : ''}{page.toUpperCase()}`
  - Title: `<h1 className="campaign-hero-title">{page}</h1>`
  - Inline action buttons rendered cleanly alongside.
- Update `src/style.css` / `src/theme.css`:
  - Delete `.heading-star` and slogan styles.
  - Apply clean spacing and typography.

### 2.3 Homebrew Modal Component (`src/HomebrewModal.tsx`)
- Props:
  - `open: boolean`
  - `onClose: () => void`
  - `campaign: string`
  - `onSave: (record: CompendiumRecord) => void`
  - `notify: (msg: string) => void`
- Modal includes:
  - Category selector: Monster / NPC, Spell, Item, Generic / Feat
  - Monster Stat Block Form:
    - Basic info, Vitals, Abilities, Defenses, Traits & Actions editor
  - Live Preview Panel:
    - Live render of stat block with `InteractiveActionText`
    - Roll buttons trigger `planarch-dice-roll` event
  - Save action:
    - Writes to `wf-homebrew:${campaign}`
    - Creates/updates corresponding `WikiPage` in `wf-wiki:${campaign}`
    - Updates Compendium state

---

## 3. Testing & Verification

1. **Header Consistency Test**:
   - Assert all non-dashboard pages render clean hero headers without sparkle stars or slogans.
2. **Homebrew Creation & Preview Test**:
   - Create a monster homebrew with stat block attributes and dice actions (e.g. `Bite: +5 to hit, 1d8+3 piercing`).
   - Verify dice button existence and click trigger.
3. **Wiki & Compendium Sync Test**:
   - Verify homebrew appears in Compendium index under `Homebrew` edition filter.
   - Verify matching page is created in Wiki storage `wf-wiki:${campaign}` with formatted markdown.
