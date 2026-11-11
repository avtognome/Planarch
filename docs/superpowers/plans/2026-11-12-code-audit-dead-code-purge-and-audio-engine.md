# Code Audit, Dead Code Purge, and Audio Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up technical debt by purging dead components and CSS from deleted features, simplify stubs in `src/models.ts`, and extract the procedural & Freesound Web Audio engine out of `src/App.tsx` into `src/audioEngine.ts`.

**Architecture:** 
1. Remove unreferenced component files (`dialog.tsx`, `tabs.tsx`, `components/ui/select.tsx`, `PlanarchBrand.tsx`) and clean up references.
2. Remove orphaned CSS blocks in `src/theme.css` (`.session-control-dock`, `.session-dock-*`, etc.) and conflicting parchment styles in `src/style.css`.
3. Simplify legacy seed stubs in `src/models.ts`.
4. Create an isolated Web Audio manager in `src/audioEngine.ts` providing typed controls (`init`, `setLayerVolume`, `setMasterVolume`, `togglePlay`, `loadCustomAudio`, `resetProcedural`), reducing `src/App.tsx` clutter.

**Tech Stack:** React 19, TypeScript, Web Audio API, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-12-code-audit-dead-code-purge-and-audio-engine-design.md`

## Global Constraints
- Do not break existing features: procedural ambience playback, Freesound sample playback, mixer volume sliders, scene loading, and audio stop actions must remain functional.
- Maintain passing state across all 24 test suites (`npm.cmd test`), TypeScript check (`npm.cmd run check`), and Vite production build (`npm.cmd run build`).
- PowerShell requires `npm.cmd`, not `npm.ps1`.

## Review Focus
1. `tests/brand-integration.mjs` directly checks `src/ArcheronBrand.tsx` once `PlanarchBrand.tsx` is removed.
2. `tests/studio-layers-and-dock.mjs` continues to verify that `.session-control-dock` and `.session-dock-row` are not rendered.
3. Audio engine handles decoding failures gracefully without crashing React state.
4. Procedural ambience fallback generates continuous looped buffers without audio clicks.
5. `npm.cmd run build` asset size shrinks without bundle corruption.

---

### Task 1: Delete Dead Files & Clean Brand References

**Files:**
- Delete: `src/components/ui/dialog.tsx`
- Delete: `src/components/ui/tabs.tsx`
- Delete: `src/components/ui/select.tsx`
- Delete: `src/PlanarchBrand.tsx`
- Modify: `tests/brand-integration.mjs`

- [ ] **Step 1: Check references to deleted files before removal**
Run `grep` across `src/` to confirm no imports exist for `components/ui/dialog`, `components/ui/tabs`, or `components/ui/select`.

- [ ] **Step 2: Update `tests/brand-integration.mjs`**
Update `tests/brand-integration.mjs` to target `src/ArcheronBrand.tsx` directly instead of referencing `PlanarchBrand.tsx`.

- [ ] **Step 3: Remove the 4 dead files**
Delete:
- `src/components/ui/dialog.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/select.tsx`
- `src/PlanarchBrand.tsx`

- [ ] **Step 4: Verify TypeScript compilation and brand test pass**
Run: `npm.cmd run check`
Run: `node tests/brand-integration.mjs`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add tests/brand-integration.mjs
git rm src/components/ui/dialog.tsx src/components/ui/tabs.tsx src/components/ui/select.tsx src/PlanarchBrand.tsx
git commit -m "refactor: delete unused UI components and redundant brand alias"
```

---

### Task 2: Purge Orphaned & Conflicting CSS from `src/theme.css` and `src/style.css`

**Files:**
- Modify: `src/theme.css`
- Modify: `src/style.css`
- Test: `tests/strict-palette-css.mjs`
- Test: `tests/studio-layers-and-dock.mjs`

- [ ] **Step 1: Remove dead Session Dock CSS in `src/theme.css`**
Remove lines defining:
- `.session-control-dock`
- `.session-dock-row`
- `.session-round-seal`
- `.session-turn-controls`
- `.session-hp`
- `.session-dock-actions`
- `.session-dock-tray`
- `.session-tools-layout`
- `.session-utilities`
- `.session-dice`
- `.session-history`
- Associated responsive rules in `@media(max-width: 1180px)`, `@media(max-width: 800px)`, and `@media(max-width: 520px)`.

- [ ] **Step 2: Remove conflicting legacy parchment styles in `src/style.css`**
Remove lines 29-30 in `src/style.css` containing legacy parchment `.monster-reference` and `.dnd-reference` definitions that clash with `theme.css`.

- [ ] **Step 3: Run CSS and studio tests**
Run: `node --test tests/strict-palette-css.mjs`
Run: `node tests/studio-layers-and-dock.mjs`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/theme.css src/style.css
git commit -m "style: remove dead session dock CSS and obsolete parchment styling"
```

---

### Task 3: Simplify Stubs in `src/models.ts` & Clean Usages

**Files:**
- Modify: `src/models.ts`
- Modify: `src/App.tsx`
- Test: `npm.cmd run check`

- [ ] **Step 1: Simplify `src/models.ts`**
Remove empty stub exports `seedEncounters`, `seedCharacters`, `seedPages`.

- [ ] **Step 2: Update `src/App.tsx`**
Remove imports of `seedCharacters`, `seedEncounters`, `seedPages`. Replace initial state defaults with empty array `[]` where used.

- [ ] **Step 3: Verify TypeScript passes**
Run: `npm.cmd run check`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/models.ts src/App.tsx
git commit -m "refactor: remove legacy seed stubs and inline initial empty arrays"
```

---

### Task 4: Extract Web Audio Engine into `src/audioEngine.ts` & Refactor `src/App.tsx`

**Files:**
- Create: `src/audioEngine.ts`
- Modify: `src/App.tsx`
- Test: `tests/ambience-individual-play.mjs`
- Test: `tests/freesound-slot-cache.mjs`
- Test: `tests/studio-layers-and-dock.mjs`

- [ ] **Step 1: Create `src/audioEngine.ts`**
Create clean audio engine manager encapsulating:
- `AudioEngine` class / interface:
  - `ensureAudio(layerCount: number, customSounds: (FreesoundSound | null)[]): Promise<AudioContext | null>`
  - `setLayerVolume(index: number, volume: number): void`
  - `setMasterVolume(masterVolume: number): void`
  - `setupLayerSource(index: number, customSound?: FreesoundSound | null, directBuffer?: ArrayBuffer): Promise<void>`
  - `stopAll(): void`
  - `resume(): Promise<void>`
  - `suspend(): Promise<void>`
  - `getContext(): AudioContext | null`

- [ ] **Step 2: Connect `src/App.tsx` to `src/audioEngine.ts`**
- Replace inline audio ref manipulation, procedural math, and gain creation in `App.tsx` with calls to `audioEngine`.
- Keep existing state (`playing`, `layers`, `master`, `customLayers`, `layerActive`) and event handlers (`toggleAudio`, `toggleLayerPlay`) unchanged so UI and test expectations are 100% preserved.

- [ ] **Step 3: Verify with targeted audio tests**
Run: `node tests/ambience-individual-play.mjs`
Run: `node tests/freesound-slot-cache.mjs`
Run: `node tests/studio-layers-and-dock.mjs`
Expected: All audio tests PASS.

- [ ] **Step 4: Commit**
```bash
git add src/audioEngine.ts src/App.tsx
git commit -m "refactor: extract procedural and Freesound audio logic to audioEngine"
```

---

### Task 5: Comprehensive Verification & Build

**Files:**
- All touched files

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npm.cmd run check`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run entire test suite**
Run: `npm.cmd test`
Expected: All 24 test suites PASS.

- [ ] **Step 3: Run production build**
Run: `npm.cmd run build`
Expected: Build succeeds with reduced file footprint.

- [ ] **Step 4: Push to origin/master**
Run: `git push origin master`
