# Design: Code Audit, Dead Code Purge, and Audio Engine Extraction

## Intent
Clean up technical debt, purge unreferenced components and orphaned CSS styles left over from deleted features, and extract the imperative Web Audio API logic out of `src/App.tsx` into a modular `src/audioEngine.ts` helper.

## Scope & Changes

### 1. Delete Unused / Redundant Component Files
- `src/components/ui/dialog.tsx`: Unused (all dialogs use native lightweight `.modal`).
- `src/components/ui/tabs.tsx`: Unused (all tabs use native button grids).
- `src/components/ui/select.tsx`: Redundant with `src/select.tsx` (which is headless-test-safe and used by `Compendium.tsx`).
- `src/PlanarchBrand.tsx`: Redundant alias re-exporting `ArcheronBrand.tsx`. (Update `tests/brand-integration.mjs` to import `ArcheronBrand` directly).

### 2. Purge Orphaned & Conflicting CSS
- `src/theme.css`:
  - Remove all `.session-control-dock`, `.session-dock-*`, `.session-round-seal`, `.session-turn-controls`, `.session-hp`, `.session-tools-layout`, `.session-history` rules (~150 lines including media queries). The session dock was completely removed from the DOM and is verified as absent in tests.
- `src/style.css`:
  - Remove legacy parchment `.monster-reference` and `.dnd-reference` color styles (`#e8dfc9`, `#2a241d`, etc.) that were conflicting and being overridden by `theme.css`.

### 3. Settle Stubs in `src/models.ts`
- Clean up obsolete empty seed stubs `seedEncounters`, `seedCharacters`, `seedPages` (or consolidate inline where used in `src/App.tsx`).

### 4. Extract Audio Engine (`src/audioEngine.ts`)
- Extract Web Audio API handling from `src/App.tsx`:
  - `AudioEngine` singleton / instance manager:
    - AudioContext lifecycle (`ensureAudio`, `resume`, `suspend`).
    - Gain nodes management (`gains`).
    - Procedural synthetic noise generator (`setupProceduralSource`).
    - Freesound cached audio buffer decoder & playback (`setupFreesoundSource`).
    - Individual layer mute/play, volume control, and master volume.
- `src/App.tsx` imports and interfaces with `audioEngine`, drastically simplifying `App.tsx` and eliminating ~120 lines of imperative audio math and node connections.

## Approaches Considered
1. **Approach 1: Dead Code & Dead CSS Purge Only (Conservative)**:
   - Only delete unused files and CSS without touching `App.tsx` audio logic.
   - *Rejected by Gnome*: Leaves `App.tsx` as a monolithic file mixing audio synthesis with UI logic.
2. **Approach 2: Dead Code Purge + Audio Engine Extraction (Chosen)**:
   - Purge dead files/CSS and isolate Web Audio API into `src/audioEngine.ts`.
   - Leaves `App.tsx` much cleaner while maintaining 100% test passing and identical audio behavior.
3. **Approach 3: Complete App Decomposition (Aggressive)**:
   - Break `App.tsx` into dozens of subcomponents.
   - *Rejected*: Too risky for React TestRenderer tests without added user value.

## Success Criteria & Verification
- `npm.cmd run check` passes with 0 TypeScript errors.
- `npm.cmd test` (all 24+ test suites) passes cleanly.
- `npm.cmd run build` succeeds with zero errors and reduced bundle/asset weight.
- No regression in procedural audio playback, Freesound playback, or mixer controls.
