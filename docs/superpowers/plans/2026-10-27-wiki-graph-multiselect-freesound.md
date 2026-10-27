# Wiki Graph, Bulk Removal, and Freesound Ambience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-select & bulk removal for wiki and scenes, complete a system-wide deletion audit, build an interactive Canvas 2D wiki web graph, and integrate Freesound.org API with IndexedDB caching and custom audio tracks with Zero AI Slop.

**Architecture:** 
- Native Canvas 2D force-directed physics engine for wiki graph visualization with zero extra npm dependencies.
- Declarative selection state (`Set<string>`) and Shadcn confirmation dialogs for batch deletion.
- Standalone Freesound API client (`src/freesound.ts`) paired with IndexedDB blob caching for offline playback and Web Audio playback.
- Strictly adheres to `DESIGN.md`: zero AI slop, no side-tab borders, WCAG 2.1 AA touch targets (≥44px), SF Pro system typography.

**Tech Stack:** React 19, Tailwind CSS v4, Radix UI / Shadcn UI Primitives, HTML5 Canvas 2D, Web Audio API, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-10-27-wiki-graph-multiselect-freesound-design.md`

## Global Constraints

- Node >= 22.13.0
- Build tool: Vite 8 + TypeScript 5.9
- Testing: `npm run check`, `npm test`, `npm run build` must remain green at every step
- Zero AI Slop: No thick side-tab borders (`border-left`), no neon orbs, no ambient decorative gradients
- WCAG 2.1 AA: Coarse pointer targets ≥44x44px; high-contrast focus rings
- Supabase sync compatibility: all synced data uses `wf-` prefixes

## Review Focus

1. Deletion of all scenes or all wiki pages: app must not crash when items array is empty; empty state shows cleanly.
2. Circular wiki links (Page A links to Page B which links to Page A): graph parser must handle cyclic graphs without infinite loops.
3. Offline Freesound playback: if offline, previously cached Freesound audio plays from IndexedDB; uncached audio gracefully informs the user without throwing uncaught promises.
4. Freesound search failure or invalid token: errors in API fetch are caught and surfaced via friendly toast notification without breaking the UI.
5. Large graph rendering (>100 pages): Canvas render loop throttles physics once velocity drops below threshold to avoid CPU drain.

---

### Task 1: Wiki & Scene Library Multi-Select and Bulk Deletion

**Files:**
- Modify: `src/CampaignTools.tsx:39-65`
- Modify: `src/App.tsx:490-505`
- Modify: `src/theme.css`
- Test: `tests/multiselect.mjs`

**Interfaces:**
- Produces:
  - `WikiTab`: multi-select toggle, page selection checkboxes, batch delete confirmation dialog.
  - `App.tsx`: scene multi-select toggle, custom & built-in scene checkboxes, batch removal, and "Restore default scenes" capability.

- [ ] **Step 1: Write test for multi-select and batch deletion**

Create `tests/multiselect.mjs` testing:
- Selection set toggle and batch filtering.
- Removal of custom and built-in scenes into `wf-hidden-builtin-scenes`.
- Restoration of default scenes.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/multiselect.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement multi-select in `src/CampaignTools.tsx` and `src/App.tsx`**

- In `src/CampaignTools.tsx`:
  - Add `selectMode: boolean` and `selectedIds: Set<string>`.
  - Add `Select` button in toolbar to toggle mode.
  - In list items, render accessible checkbox when `selectMode` is true.
  - When `selectedIds.size > 0`, render bulk action bar: count, "Select all", "Cancel", and "Delete (N)" with confirmation dialog.
- In `src/App.tsx`:
  - Add `sceneSelectMode: boolean` and `selectedSceneNames: Set<string>`.
  - Add `wf-hidden-builtin-scenes` storage to allow hiding built-in scenes when selected for deletion.
  - Provide "Restore default scenes" button if any built-in scenes are hidden.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/multiselect.mjs`  
Expected: PASS

- [ ] **Step 5: Verify types and commit**

Run: `npm run check && git add src/CampaignTools.tsx src/App.tsx src/theme.css tests/multiselect.mjs && git commit -m "feat(wiki): add multiselect and batch deletion for wiki and scene library"`

---

### Task 2: System-Wide Deletion Audit & Missing Removal Affordances

**Files:**
- Modify: `src/CampaignTools.tsx`
- Modify: `src/CombatTracker.tsx`
- Modify: `src/App.tsx`
- Test: `tests/deletion-audit.mjs`

**Interfaces:**
- Produces:
  - Live combatant remove button in active encounter.
  - Character portrait clear/remove button.
  - Condition remove button on combatants and characters.
  - Custom audio layer deletion button.

- [ ] **Step 1: Write deletion audit test**

Create `tests/deletion-audit.mjs` verifying removal handlers for all entity types.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/deletion-audit.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement missing deletion affordances**

- In `src/CombatTracker.tsx` / `src/App.tsx`:
  - Add combatant delete/dismiss button with accessible label in active initiative list.
- In `src/CampaignTools.tsx`:
  - Add "Remove portrait" button for characters.
  - Add single-click delete for member rows in encounter builder.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/deletion-audit.mjs`  
Expected: PASS

- [ ] **Step 5: Verify types and commit**

Run: `npm run check && git add src/CampaignTools.tsx src/CombatTracker.tsx src/App.tsx tests/deletion-audit.mjs && git commit -m "feat(audit): ensure all created entities have accessible deletion affordances"`

---

### Task 3: Interactive Canvas 2D Wiki Web Graph

**Files:**
- Create: `src/WikiGraph.tsx`
- Modify: `src/CampaignTools.tsx`
- Modify: `src/theme.css`
- Test: `tests/wiki-graph.mjs`

**Interfaces:**
- Produces:
  - `<WikiGraph items={items} onSelectPage={(id) => void} theme={theme} />`
  - Parses `items: WikiPage[]` into graph `{ nodes: Node[], edges: Edge[] }`.
  - Bidirectional link parsing for `[[Page Title]]` and tag co-occurrence.
  - Canvas 2D spring simulation with pan/zoom/drag and click hit-testing.

- [ ] **Step 1: Write test for graph link parsing and node building**

Create `tests/wiki-graph.mjs` testing node extraction, edge linking from `[[Title]]`, tag links, and cycle tolerance.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/wiki-graph.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `src/WikiGraph.tsx` and integrate into `CampaignTools.tsx`**

- Build `src/WikiGraph.tsx`:
  - Extract nodes and links.
  - Canvas 2D animation frame loop with physics relaxation.
  - Mouse/touch interaction: drag node, pan canvas, wheel zoom.
  - Click detection on node triggers `onSelectPage(node.id)`.
  - Palette from `DESIGN.md`: amber `#f59e0b` active, slate nodes `#1e293b` / `#e2e8f0`, category tinted rings.
  - Reduced-motion support: immediately step physics 100 iterations without animation loop.
- In `src/CampaignTools.tsx`:
  - Add `'Graph'` option to view tabs (`Edit` | `Read` | `Graph`).
  - Render `<WikiGraph />` when `view === 'Graph'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/wiki-graph.mjs`  
Expected: PASS

- [ ] **Step 5: Verify types and commit**

Run: `npm run check && git add src/WikiGraph.tsx src/CampaignTools.tsx src/theme.css tests/wiki-graph.mjs && git commit -m "feat(wiki): add interactive Canvas 2D wiki web graph view"`

---

### Task 4: Freesound API Client & IndexedDB Audio Cache

**Files:**
- Create: `src/freesound.ts`
- Test: `tests/freesound.mjs`

**Interfaces:**
- Produces:
  - `searchFreesound(query: string, token: string, options?: { page?: number }): Promise<FreesoundResult[]>`
  - `getOrCacheSound(soundId: number, previewUrl: string): Promise<Blob>`
  - `clearSoundCache(): Promise<void>`
  - `getSoundCacheSize(): Promise<number>`

- [ ] **Step 1: Write test for Freesound client and IndexedDB cache**

Create `tests/freesound.mjs` testing:
- URL query parameter formatting with token and duration filters.
- Result payload normalization.
- In-memory / mock IndexedDB caching and retrieval.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/freesound.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `src/freesound.ts`**

- Standard `fetch` calls to `https://freesound.org/apiv2/search/text/`.
- IndexedDB database `wayfinder-audio-cache` with object store `sounds`.
- Blob fetching, storing, and loading.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/freesound.mjs`  
Expected: PASS

- [ ] **Step 5: Verify types and commit**

Run: `npm run check && git add src/freesound.ts tests/freesound.mjs && git commit -m "feat(freesound): add api client with indexeddb audio blob caching"`

---

### Task 5: Ambience Studio Freesound Engine & Custom Layers

**Files:**
- Create: `src/FreesoundModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/models.ts`
- Modify: `src/theme.css`
- Test: `tests/ambience-freesound.mjs`

**Interfaces:**
- Produces:
  - `<FreesoundModal isOpen={isOpen} onClose={() => void} onSelectSound={(sound) => void} defaultQuery={query} />`
  - Hybrid procedural synth / Freesound buffer playback in `App.tsx`.
  - One-click swap for 4 default layers ("Rainfall", "Forest wind", "Ocean surf", "Hearth fire").
  - "Add sound layer" for custom Freesound ambience layers with volume, mute, and delete.
  - Settings dialog Freesound API token configuration.

- [ ] **Step 1: Write test for Freesound layer state & persistence**

Create `tests/ambience-freesound.mjs` testing layer creation, custom layer deletion, and Freesound audio source resolution.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ambience-freesound.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `FreesoundModal.tsx` and integrate into `App.tsx`**

- In `src/FreesoundModal.tsx`:
  - Search input with quick-pick suggestion pills ("Rain", "Wind", "Ocean Waves", "Campfire", "Tavern", "Dungeon").
  - Results list displaying sound name, duration, username, license, audio preview button, and "Select" button.
- In `src/App.tsx`:
  - Add Freesound token state (`wf-freesound-token`) with default `NrH2cW4xrMy4Nvbt37uwVZTgoQX6mp7rbjkr2OqR`.
  - Add custom layers array (`wf-custom-layers`).
  - Connect `AudioContext` to decode and loop cached Freesound audio buffers.
  - Render "Swap Freesound" button on default layers.
  - Render "Add audio layer" button and individual delete button for each custom layer.
  - Add Freesound API token field in Settings modal.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/ambience-freesound.mjs`  
Expected: PASS

- [ ] **Step 5: Verify types and commit**

Run: `npm run check && git add src/FreesoundModal.tsx src/App.tsx src/models.ts src/theme.css tests/ambience-freesound.mjs && git commit -m "feat(ambience): integrate freesound engine with custom layers and offline decoding"`

---

### Task 6: Zero-AI-Slop Polish, Impeccable Audit & Verification

**Files:**
- Modify: `src/theme.css`, `src/style.css`
- Verification: Impeccable detector, `npm run check`, `npm test`, `npm run build`

- [ ] **Step 1: Run mechanical design detector**

Run: `cmd.exe /c "C:\Users\pmset\.config\opencode\skills\impeccable\scripts\impeccable.cmd detect --json src/WikiGraph.tsx src/FreesoundModal.tsx src/CampaignTools.tsx src/App.tsx src/theme.css"`  
Expected: 0 errors, 0 warnings. Fix any slop immediately if flagged.

- [ ] **Step 2: Verify touch targets & WCAG 2.1 AA**

Ensure all new buttons, check-boxes, and canvas controls satisfy `min-width: 44px; min-height: 44px` on coarse pointers.

- [ ] **Step 3: Run full verification suite**

Run: `npm run check && npm test && npm run build`  
Expected: All clean, 0 type errors, all tests pass, build successful.

- [ ] **Step 4: Final commit**

Run: `git commit -am "chore(polish): verify zero ai slop, wcag compliance, and green test suite"`
