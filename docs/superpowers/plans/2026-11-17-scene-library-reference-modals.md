# Scene Library and Reference Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Scene Library CRUD, fix palette/search regressions, and replace encounter reference navigation/drawer behavior with one reusable centered compendium modal.

**Architecture:** Extract scene identity and mutation rules into pure helpers, then use one App-owned scene form for add/edit and existing confirmation flow for removal. Adapt `CompendiumDrawer` into a centered campaign-aware reference modal reused by CombatTracker and CampaignTools, while retaining existing statblock renderers.

**Tech Stack:** React 19, TypeScript, CSS custom properties, existing shadcn controls, node:test/react-test-renderer.

**Spec:** `docs/superpowers/specs/2026-11-17-scene-library-reference-modals-design.md`

## Global Constraints

- No new dependency.
- Use existing shadcn controls for changed UI.
- Preserve dark/light theme support through semantic CSS variables.
- CSS must satisfy `tests/typography.mjs` and `tests/strict-palette-css.mjs`.
- Dialogs close by button, backdrop, and Escape; focus returns to trigger.
- Touch targets remain at least 44px under coarse pointers.
- Use `npm.cmd` on Windows.

## Review Focus

- Duplicate legacy scene names: migration must assign distinct stable IDs and mutations must touch one record.
- Removing active or final scene: selection must always resolve to valid bundled fallback.
- Focused homebrew ID absent from compendium metadata: modal must still load campaign homebrew directly.
- Modal opened repeatedly from different triggers: focus ID and restored trigger focus must not become stale.
- Narrow spell filters and reference modal: no clipped input, controls, or horizontal page overflow.

---

### Task 1: Stable Scene Identity and Mutation Helpers

**Files:**
- Modify: `src/sources.ts`
- Create: `src/sceneLibrary.ts`
- Create: `tests/scene-library.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `Scene.id?: string`, `normalizeScenes(scenes: Scene[]): Scene[]`, `updateSceneById`, `removeSceneById`, and `findSceneIndexById`.
- Consumers: Task 2 App scene state and controls.

- [ ] **Step 1: Write failing pure tests** for deterministic bundled IDs, unique migration IDs for duplicate legacy custom names, one-record update/remove, and valid index fallback.
- [ ] **Step 2: Run `node tests/scene-library.mjs`** and confirm failure from missing helpers.
- [ ] **Step 3: Implement minimum helpers** in `src/sceneLibrary.ts`; extend `Scene` with optional `id` for stored backward compatibility.
- [ ] **Step 4: Add test to `npm.cmd test` script and rerun targeted test**; expect pass.
- [ ] **Step 5: Commit** `feat(studio): add stable scene library identity`.

### Task 2: Shared Scene Add/Edit/Remove UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/style.css`
- Modify: `src/theme.css`
- Modify: `tests/studio-layers-and-dock.mjs`

**Interfaces:**
- Consumes: Task 1 scene helpers and `Scene.id`.
- Produces: shared scene form modal, card Edit/Remove actions, restore-defaults action.

- [ ] **Step 1: Add failing renderer tests** proving Add scene opens form, custom edit updates one scene, bundled edit clones and hides original, custom remove asks confirmation, bundled remove hides, restore reveals bundled scenes, and active selection remains valid.
- [ ] **Step 2: Run `node tests/studio-layers-and-dock.mjs`** and confirm new assertions fail.
- [ ] **Step 3: Replace name/index mutation paths** with stable IDs and normalize legacy `wf-custom` records once without losing provider source or layer values.
- [ ] **Step 4: Implement shared scene form** using existing shadcn `Button`, `Input`, `Textarea`, and modal shell; fields are name, category, description, and current ambience values.
- [ ] **Step 5: Add card Edit/Remove controls and restore-defaults control** with accessible labels and mobile-safe layout.
- [ ] **Step 6: Implement validation** for blank/duplicate names and safe selection after every mutation.
- [ ] **Step 7: Run targeted test**; expect pass.
- [ ] **Step 8: Commit** `feat(studio): add scene library management`.

### Task 3: Palette and Spell Search Root-Cause Fixes

**Files:**
- Modify: `src/style.css`
- Modify: `src/theme.css`
- Create: `tests/palette-layout-regressions.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces token-correct Scene Library selected state and Party Vitals icon, bounded Compendium Spell search layout.

- [ ] **Step 1: Write failing CSS assertions** requiring tokenized `.scene-filters .selected`, tokenized `.party-strip-heading .inline svg`, `.comp-spell-search input{flex:1;min-width:0;width:auto}`, and `minmax(0,...)` spell-filter tracks.
- [ ] **Step 2: Run `node tests/palette-layout-regressions.mjs`** and confirm failures match legacy rules.
- [ ] **Step 3: Replace legacy hardcoded colors and fix flex/grid minimum sizing** with smallest CSS diff.
- [ ] **Step 4: Add test to `npm.cmd test`; run targeted, typography, and strict palette tests**; expect pass.
- [ ] **Step 5: Commit** `fix(ui): align palette and spell search controls`.

### Task 4: Shared Campaign-Aware Compendium Reference Modal

**Files:**
- Modify: `src/CompendiumDrawer.tsx`
- Modify: `src/CombatTracker.tsx`
- Modify: `src/CampaignTools.tsx`
- Modify: `src/App.tsx`
- Modify: `src/theme.css`
- Create: `tests/compendium-reference-modal.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: centered `CompendiumDrawer({ open, focus, campaign, onClose })` behavior with focused/homebrew record loading.
- Consumers: CombatTracker and CampaignTools encounter UI.

- [ ] **Step 1: Write failing tests** for Live Encounter trigger opening centered dialog, Encounter trigger retaining page and opening dialog, homebrew-only focused record loading, Escape close, close button, backdrop close, and focus restoration.
- [ ] **Step 2: Run `node tests/compendium-reference-modal.mjs`** and confirm current drawer/navigation behavior fails.
- [ ] **Step 3: Add optional `campaign` prop and focused record loading order**: homebrew, local, cloud; do not require metadata membership.
- [ ] **Step 4: Replace side-drawer shell/styles** with centered modal shell matching Compendium Spell modal and narrow-screen reflow.
- [ ] **Step 5: Add Escape and focus lifecycle** without new dialog dependency.
- [ ] **Step 6: Mount shared modal from CombatTracker and CampaignTools**; add accessible Encounter trigger label; pass campaign from App.
- [ ] **Step 7: Remove obsolete App reference-navigation wiring** only after both consumers use modal.
- [ ] **Step 8: Add test to `npm.cmd test` and run targeted test**; expect pass.
- [ ] **Step 9: Commit** `feat(compendium): show encounter references in modal`.

### Task 5: Visual, Accessibility, and Full Verification

**Files:**
- Modify only files required by verified failures.
- Create: `anti-slop/audit-001-2026-11-17.md` because selected antislop mode is After.

**Interfaces:**
- Consumes all prior tasks.
- Produces verified release state.

- [ ] **Step 1: Run app and inspect Atmosphere Studio, Compendium Spell modal, Live Encounter, and Encounter page** in dark/light at desktop, tablet, and phone widths.
- [ ] **Step 2: Keyboard-check all changed controls** including Tab order, Enter/Space activation, Escape close, visible focus, and focus return.
- [ ] **Step 3: Record antislop findings** in numbered audit; fix only approved findings if any require product changes.
- [ ] **Step 4: Run Impeccable detector once**: `.opencode\skills\impeccable\scripts\impeccable.cmd detect --json src/App.tsx src/CompendiumDrawer.tsx src/CombatTracker.tsx src/CampaignTools.tsx src/style.css src/theme.css`.
- [ ] **Step 5: Run `npm.cmd test`, `npm.cmd run check`, and `npm.cmd run build`**; all must pass.
- [ ] **Step 6: Request code review and resolve confirmed issues**.
- [ ] **Step 7: Commit verification fixes** if needed, then push only when Gnome requests or standing repo workflow requires it.
