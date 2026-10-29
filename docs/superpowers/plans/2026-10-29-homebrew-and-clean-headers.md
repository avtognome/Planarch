# Homebrew Components & Clean Section Page Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean section page headers to match Dashboard's hero style without AI slop/slogans, add a homebrew creator modal with full monster stat block fields and live interactive dice preview, and auto-sync homebrew into campaign wiki.

**Architecture:** 
- Strip slogan subtitles and sparkle symbols from section page headers in `src/App.tsx` and styling in `src/style.css` / `src/theme.css`.
- Create `src/homebrewData.ts` to manage campaign-scoped homebrew records in `wf-homebrew:${campaign}`, format markdown stat blocks, and sync them into `wf-wiki:${campaign}` as wiki pages.
- Create `src/HomebrewModal.tsx` providing a fillable 5e/5.5e stat block form with auto-calculated modifiers, traits/actions editor supporting dice expressions, and a live preview pane with clickable dice roll buttons.
- Connect the "Add Homebrew" action into `src/Compendium.tsx` and merge campaign homebrew entries into the Compendium index and detail view under the "Homebrew" edition.

**Tech Stack:** React 19, TypeScript, CSS variables/classes, Radix UI Dialog & Select, TestRenderer.

**Spec:** `docs/superpowers/specs/2026-10-29-homebrew-and-clean-headers-design.md`

## Global Constraints
- No external libraries for homebrew logic; use existing `CompendiumRecord` and `WikiPage` models.
- All dice rolls in preview and wiki must dispatch standard `planarch-dice-roll` event with `{ expression, label }`.
- Preserved campaign isolation: Homebrew records are stored under `wf-homebrew:${campaign}` and synced to `wf-wiki:${campaign}`.
- Every section page header must eliminate slogan text (`Every great story deserves a soundscape...`) and decorative star characters (`✧`).
- All existing tests in `package.json` must remain green.

## Review Focus
- Homebrew monster AC/HP parsing: non-numeric or complex dice expressions (e.g. `15 (natural armor)`, `27 (5d8+5)`) must parse gracefully into combatant HP without crashing.
- Live modifier calculation: ability score inputs must dynamically calculate standard 5e modifiers `Math.floor((score - 10) / 2)`.
- Interactive dice buttons in traits/actions: expressions like `+6 to hit` and `2d8+3 slashing` must be converted to clickable buttons that roll dice.
- Wiki syncing: saving an edited homebrew updates the existing wiki page rather than duplicating pages with the same title.
- Compendium edition filtering: selecting edition "Homebrew" or "All editions" properly displays homebrew entries.

---

### Task 1: Clean Section Page Headers

**Files:**
- Modify: `src/App.tsx:770-800`
- Modify: `src/style.css`
- Modify: `src/theme.css`
- Test: `tests/section-page-headers.mjs`

**Interfaces:**
- Produces: Clean `.campaign-hero-header.page-hero-header` on non-dashboard pages with eyebrow and title, without `.heading-star` or slogan `<p>` tags.

- [ ] **Step 1: Write the failing test**

Create `tests/section-page-headers.mjs` testing that when navigating to 'Encounters', 'Compendium', 'Atmosphere Studio', and 'Campaign wiki', headers contain `.campaign-hero-header` and `.campaign-hero-title`, and do not contain slogan text or `.heading-star`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/section-page-headers.mjs`
Expected: FAIL

- [ ] **Step 3: Update `src/App.tsx` and styles**

Replace `<div className="page-heading">...</div>` with `<div className="campaign-hero-header page-hero-header">...</div>` containing `<div className="campaign-hero-eyebrow">` and `<h1 className="campaign-hero-title">{page}</h1>`. Retain right-side tool actions cleanly in an inline wrapper. Remove obsolete slogan conditionals and sparkle glyphs.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/section-page-headers.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/section-page-headers.mjs src/App.tsx src/style.css src/theme.css
git commit -m "style: standardize section headers to match dashboard hero style without slogans"
```

---

### Task 2: Homebrew Data Helper & Wiki Sync

**Files:**
- Create: `src/homebrewData.ts`
- Modify: `src/models.ts`
- Test: `tests/homebrew-data-sync.mjs`

**Interfaces:**
- Produces:
  - `readHomebrew(campaign: string): CompendiumRecord[]`
  - `saveHomebrew(campaign: string, record: CompendiumRecord): { homebrew: CompendiumRecord[]; wikiPage: WikiPage }`
  - `deleteHomebrew(campaign: string, recordId: string): void`
  - `recordToWikiMarkdown(record: CompendiumRecord): string`

- [ ] **Step 1: Write the failing test**

Create `tests/homebrew-data-sync.mjs` testing `saveHomebrew`:
- Generates markdown stat block from `CompendiumRecord` fields (abilities, vitals, actions, clickable dice tags).
- Saves record in `wf-homebrew:${campaign}`.
- Creates or updates a corresponding `WikiPage` in `wf-wiki:${campaign}` under category `'Homebrew'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/homebrew-data-sync.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/homebrewData.ts`**

Implement `readHomebrew`, `saveHomebrew`, `deleteHomebrew`, and `recordToWikiMarkdown`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/homebrew-data-sync.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/homebrewData.ts tests/homebrew-data-sync.mjs
git commit -m "feat(homebrew): add homebrew storage and automatic wiki sync helper"
```

---

### Task 3: Homebrew Modal Component with Stat Block Form & Live Preview

**Files:**
- Create: `src/HomebrewModal.tsx`
- Modify: `src/features.css`
- Test: `tests/homebrew-modal.mjs`

**Interfaces:**
- Produces: `<HomebrewModal open={boolean} onClose={() => void} campaign={string} onSaved={(record: CompendiumRecord) => void} notify={(msg: string) => void} />`

- [ ] **Step 1: Write the failing test**

Create `tests/homebrew-modal.mjs` testing:
- Renders category select (Monster/NPC, Spell, Item, Generic).
- In Monster mode: inputs for Name, Size, Type, Alignment, AC, HP, Speed, Ability Scores (calculates modifiers), Traits, and Actions.
- Interactive live preview: renders stat block with action text containing `dice-inline-btn` roll buttons.
- Submitting form calls `saveHomebrew` and triggers `onSaved`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/homebrew-modal.mjs`
Expected: FAIL

- [ ] **Step 3: Implement `src/HomebrewModal.tsx` and styling**

Build modal dialog with split layout (form on left, live preview on right). Connect input state to live preview via `MonsterStatBlock` or `ReferenceStatBlock`. Wire save button to `saveHomebrew`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/homebrew-modal.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/HomebrewModal.tsx src/features.css tests/homebrew-modal.mjs
git commit -m "feat(homebrew): create HomebrewModal with live preview and stat block form"
```

---

### Task 4: Compendium Integration & Full Verification

**Files:**
- Modify: `src/Compendium.tsx`
- Modify: `package.json`
- Test: Full test suite (`npm test`)

**Interfaces:**
- Consumes: `HomebrewModal`, `readHomebrew` from `src/homebrewData.ts`.
- In `src/Compendium.tsx`:
  - Add "Add Homebrew" button to toolbar.
  - Load homebrew records from `readHomebrew(campaign)` and merge their index entries into the matching list.
  - Selecting a homebrew record in Compendium displays its full stat block and allows adding it to Encounters as a combatant.

- [ ] **Step 1: Update `src/Compendium.tsx`**

Integrate `HomebrewModal` and state (`homebrewModalOpen`). Read homebrew from active campaign, include in index, handle reading cached/local homebrew records.

- [ ] **Step 2: Add new tests to `package.json` test script**

Append `node tests/section-page-headers.mjs && node tests/homebrew-data-sync.mjs && node tests/homebrew-modal.mjs` to `npm test`.

- [ ] **Step 3: Run full verification suite**

Run: `npm test && npm run check && npm run build`
Expected: All tests pass, type-check succeeds, production bundle builds cleanly.

- [ ] **Step 4: Commit and Push**

```bash
git add src/Compendium.tsx package.json
git commit -m "feat(compendium): integrate homebrew creation, indexing, and wiki sync"
git push origin master
```
