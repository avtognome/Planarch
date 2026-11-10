# Character Sheet Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make editable character sheet easier to scan by grouping related controls and arranging short panels in two responsive columns, long lists below.

**Architecture:** Preserve `CharacterSheet` props, character model, handlers, and seven collapsible sections. Add layout wrappers/classes in its JSX and container-aware CSS in existing theme file. Keep current character-list shell untouched.

**Tech Stack:** React 19, TypeScript, Motion, CSS, existing Node assert/react-test-renderer tests.

**Spec:** `docs/superpowers/specs/2026-11-10-character-sheet-composition-design.md`

## Global Constraints

- Always-editable fields, existing update semantics and character rules; no new edit mode or dependency.
- Only `src/CharacterSheet.tsx`, character-sheet styles in `src/theme.css`, and their tests change. Do not change `CampaignTools.tsx` or surrounding character list.
- Archeron light/dark variables, accessible keyboard order/focus, responsive within editor width, not viewport width. No new assets.

## Review Focus

- Narrow editor with sidebar visible: no horizontal overflow, groups stack in DOM reading order (Task 1 test).
- Long class/species/background text: inputs wrap without overlapping level controls (Task 1 test).
- Empty resources, inventory, or spells: full-width sections retain add controls (Task 1 test).
- Collapsed Combat or Abilities: remaining column does not leave a blank full-height slot (Task 1 test).
- Damage/heal, rest, condition, resource edits: handlers still update same fields (Task 2 test).

---

### Task 1: Compose responsive sheet

**Files:** Modify `src/CharacterSheet.tsx:350-1290`, `src/theme.css:834-1800`; Test `tests/character-sheet-ui.mjs`.

**Interfaces:** Consumes existing `CharacterSheetProps` and seven section states. Produces layout class `char-sheet-main` wrapping Combat, Abilities, Skills/Senses, Proficiencies; `char-sheet-longform` wrapping Resources, Inventory, Spells. No public API change.

- [ ] **Step 1: Write failing test.** Assert wrapper contains four short sections in DOM order Combat, Abilities, Skills, Proficiencies; longform contains three remaining sections; CSS uses `@container` on `.char-sheet` (or parent) and stacks at a width that accommodates editor beside record list. Assert existing section toggles and empty add controls remain rendered. Add source/CSS assertions for min-width and wrapping header inputs, and no fixed-height column tracks when section collapses.
- [ ] **Step 2: Run `node tests/character-sheet-ui.mjs`; expect assertion failure for absent wrappers.**
- [ ] **Step 3: Add minimal wrappers and layout rules.** Primary column Combat + Abilities; secondary Skills/Senses + Proficiencies. Longform sections full width. Preserve DOM order, seven section toggles and animations. Use a sheet container query for stack behavior, fluid child widths, and labels that wrap rather than clip.
- [ ] **Step 4: Run `node tests/character-sheet-ui.mjs` and `npm run check`; expect PASS.**
- [ ] **Step 5: Commit `src/CharacterSheet.tsx`, `src/theme.css`, `tests/character-sheet-ui.mjs` with `git commit -m "refactor: compose character sheet for narrow editors"`.**

### Task 2: Group inputs and actions within sections

**Files:** Modify `src/CharacterSheet.tsx:390-775,1015-1148`, `src/theme.css:909-1800`; Test `tests/character-sheet-ui.mjs`.

**Interfaces:** Uses existing `onUpdate`, `applyDamage`, `applyHeal`, `handleRest`, `addCondition`, `updateResource`; no signatures change.

- [ ] **Step 1: Write failing test.** Assert rest buttons are inside Combat recovery group (not header); HP input and damage/heal bar share one HP group; condition add control and chips share one group; resource count and increment/decrement controls share a resource row. Exercise damage/heal, short/long rest, condition add/remove, and resource increment/decrement with existing fixture.
- [ ] **Step 2: Run `node tests/character-sheet-ui.mjs`; expect failure from absent grouped structure.**
- [ ] **Step 3: Move rest controls from header into Combat recovery area. Align labeled HP action bar, conditions, and resource controls inside existing groups, using CSS for compact but clear placement.** Do not alter handlers, persistence, field labels, or values.
- [ ] **Step 4: Run `node tests/character-sheet-ui.mjs`, `npm run check`, `npm test`, `npm run build`; expect exit 0.** Run app, inspect sheet at desktop/narrow editor/mobile and light/dark; verify keyboard focus and control actions. Run `.opencode/skills/impeccable/scripts/impeccable.cmd detect --json src/CharacterSheet.tsx src/theme.css` once after UI is finished. Record any visual limits.
- [ ] **Step 5: Commit modified files with `git commit -m "refactor: align character sheet actions with fields"`.**

## Self-review

Coverage: all approved goals, boundaries and responsive behavior mapped to tasks. No new model/API; collapse and empty states covered. Keep assertions about CSS structural rather than pixel-perfect; visual checks confirm actual layout.
