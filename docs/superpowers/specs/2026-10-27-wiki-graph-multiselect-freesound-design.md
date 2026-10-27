# Design Spec: Wiki Graph View, Bulk Removal, and Freesound.org Ambience Engine

**Date:** 2026-10-27  
**Status:** Approved for Implementation Planning  
**Target:** Wayfinder DM Command Center  
**UI Standard:** Shadcn UI + macOS Native Aesthetic (`DESIGN.md`, `PRODUCT.md`, Impeccable Standards)

---

## 1. Overview & Goals

This specification adds four major feature sets to Wayfinder without sacrificing offline-first performance, test suites, or Supabase cloud synchronization:

1. **Multi-Select & Bulk Removal**:
   - Provide bulk-selection mode for Campaign Wiki pages and Atmosphere Scene Library.
   - Batch-delete items with a confirmation dialog, freeing DM headspace from tedious one-by-one deletion.
2. **Comprehensive Deletion Audit**:
   - Verify every user-created entity (wiki pages, scenes, encounters, combatants, characters, custom conditions, audio layers) has an explicit, accessible removal mechanism.
3. **Interactive Wiki Web Graph View**:
   - Dynamic 2D Canvas force-directed visualizer mapping wiki page connections via bidirectional `[[Wiki Page]]` links and shared category/tags.
   - Zoom, pan, search highlight, and click-to-open page integration.
4. **Freesound.org Ambience Integration**:
   - Native integration with the Freesound.org API (using configured Token `NrH2cW4xrMy4Nvbt37uwVZTgoQX6mp7rbjkr2OqR`).
   - Search Freesound sound library by query, duration, and tags.
   - Cache MP3/OGG preview audio blobs into local IndexedDB (`wf-freesound-cache`) for offline playback.
   - Swap procedural noise layers with high-fidelity Freesound loops ("Rainfall", "Forest wind", "Ocean surf", "Hearth fire") or add new custom ambience layers.
   - Cloud sync: Sync layer descriptors via Supabase JSON without streaming massive binary files across sync queues.

---

## 2. Architecture & Data Model

### 2.1 Storage & Sync Model

All entities integrate with Wayfinder's existing `useSaved` and `syncEngine` mechanisms:

- **Wiki Pages**: `wf-wiki:${campaign}` (Existing `WikiPage[]`).
- **Scene Library**:
  - `wf-custom`: `Scene[]` (stores user scenes).
  - Built-in scenes (5 defaults) can now be toggled/hidden or cleared into `wf-hidden-builtin-scenes` (`string[]`).
- **Custom Ambience Layers**:
  - `wf-ambience-layers`: Array of layer descriptors:
    ```ts
    export interface AmbienceLayer {
      id: string;
      name: string;
      type: 'synth' | 'freesound';
      synthType?: number; // 0=rain, 1=wind, 2=surf, 3=fire
      freesoundId?: number;
      audioUrl?: string; // Freesound preview URL or cached blob key
      volume: number; // 0-100
      muted: boolean;
      loop: boolean;
    }
    ```
- **Freesound Token**: `wf-freesound-token` (`string`, defaults to the user's provided token, editable in Settings).
- **IndexedDB Blob Cache**: Database `wayfinder-audio-cache` with store `sounds` storing `{ id: string, blob: Blob, timestamp: number }`.

---

## 3. Detailed Subsystem Specifications

### 3.1 Multi-Select & Bulk Delete (Wiki & Scenes)

#### Wiki Multiselect
- **UI & State**:
  - `selectionMode: boolean` toggle button in Wiki toolbar (`Select mode`).
  - `selectedIds: Set<string>` tracking checked pages.
  - When `selectionMode === true`:
    - Checkbox appears on each `record-row`.
    - Floating / top action bar displays: `X pages selected`, `Select All`, `Cancel`, and `Delete Selected` (Shadcn `Button variant="destructive"`).
    - Clicking `Delete Selected` triggers Shadcn `Dialog` confirmation: *"Delete X pages? This cannot be undone."*
    - On confirmation: `setItems(items.filter(p => !selectedIds.has(p.id)))`, sync enqueues deletion, notifications display success.

#### Scene Library Multiselect
- **UI & State**:
  - Toggle `Select mode` in Scene Library panel.
  - Checkboxes on custom and built-in scene cards.
  - Action bar with `Delete Selected`.
  - Built-in scenes marked for deletion are added to `wf-hidden-builtin-scenes` so DMs can completely tailor their scene deck.
  - A `"Restore default scenes"` option is provided in the library footer.

### 3.2 Deletion Audit Across All Entities

The audit ensures 100% deletion coverage:
1. **Wiki Pages**: Single delete (`DeleteButton`) and multi-select delete.
2. **Wiki Images**: Each uploaded image in a wiki page already has a remove button.
3. **Scenes**: Single delete on cards + multi-select delete for custom/built-in scenes.
4. **Encounters**: Single encounter delete + member delete in encounter setup.
5. **Characters**: Single character delete + portrait clear button.
6. **Live Combatants**: Delete/remove combatant from active initiative tracker without ending battle.
7. **Ambience Layers**: Delete button for any custom Freesound or procedural layer.
8. **Campaigns**: Verified working typed-confirmation deletion.

### 3.3 Wiki Web Graph View

#### Layout & Interaction
- Located in `CampaignTools.tsx` under the Wiki toolbar view switcher (`Edit` | `Read` | `Graph`).
- Renders an interactive `<canvas>` covering the full main workspace.
- **Node Structure**:
  - Each `WikiPage` is a node.
  - Radius scaled by degree of connections (number of links/tags).
  - Node color tinted by `category` (Location: Gold/Amber, Faction: Slate/Cyan, Lore: Emerald/Green, Session log: Purple).
  - Label rendered beneath node in system font (`SF Pro Text`, 11px).
- **Edge Structure**:
  - Directed/undirected link created whenever page A contains `[[Page B Title]]` in its markdown body.
  - Soft secondary link (dashed/subtle) created when two pages share the same non-empty tag.
- **Physics Engine**:
  - Lightweight 2D spring-electrical force loop:
    - Coulomb repulsion between all nodes.
    - Hooke attraction along edges.
    - Center gravitational pull.
    - Velocity damping (0.85) to stabilize quickly.
- **User Controls**:
  - Drag node with mouse/touch to pin or reposition.
  - Mouse wheel / touch pinch for smooth zoom & pan.
  - Search input filters and highlights matching nodes.
  - Clicking a node opens that page in `Read` or `Edit` mode immediately.
  - Accessibility: Keyboard navigation list fallback for screen readers.

### 3.4 Freesound.org Ambience Engine

#### API Client (`src/freesound.ts`)
- Freesound API v2 endpoints:
  - `GET https://freesound.org/apiv2/search/text/?query={q}&filter=duration:[5.0 TO 300.0]&fields=id,name,previews,duration,username,license,tags&token={token}`
- Caching:
  - When a sound is selected, download `previews['preview-hq-mp3']`.
  - Save `Blob` to IndexedDB store `wayfinder-audio-cache`.
  - Retrieve blob and decode via `AudioContext.decodeAudioData` for seamless looping.

#### Ambience Studio Integration
- **Replace Existing Layer**:
  - On each of the 4 standard layers ("Rainfall", "Forest wind", "Ocean surf", "Hearth fire"), add a "Freesound" button.
  - Clicking opens the Freesound search dialog pre-populated with optimal search keywords (e.g., "gentle rain loop", "wind howling trees", "ocean waves beach", "campfire crackling").
  - Preview audio before selecting.
  - One-click swap switches that layer to the Freesound audio loop, while keeping procedural synth as fallback toggle.
- **Add New Ambience Layer**:
  - "Add sound layer" button (Shadcn `Button`) in the Ambience Console.
  - Search any sound on Freesound (e.g., "crowded tavern", "dripping cave", "clockwork gears").
  - Adds a new independent mixer track with volume slider, mute, and delete button.
- **Settings Screen**:
  - Freesound API Token field in App Settings dialog with status indicator (Connected / Rate limited / Offline).

---

## 4. Design & Anti-Slop Hygiene

In compliance with `DESIGN.md` and Impeccable guidelines:
- **No Side-Tab Slop**: Selection indicators use border outlines and tinting, zero `border-left` slop.
- **Touch Target Minimum**: All selection checkboxes and delete buttons comply with `min-width: 44px; min-height: 44px` on coarse pointers.
- **Focus Rings**: Strict `ring-2 ring-amber-500 ring-offset-2` on all interactive buttons and modals.
- **Colors & Tokens**: Amber `#f59e0b` / `#d97706` for selected nodes and active playback; neutral slate `#090d16` canvas background with subtle grid lines.
- **Reduced Motion**: When `prefers-reduced-motion` is enabled, the graph layout converges immediately without spring animation.

---

## 5. Verification Plan

1. **Automated Testing**:
   - `npm run check` (TypeScript typecheck 100% clean).
   - `npm test` (All 21 existing suites pass without regression).
   - New unit tests for Freesound API client, IndexedDB caching fallback, and Wiki graph edge parsing.
2. **Build Verification**:
   - `npm run build` exits 0 with no bundling issues.
3. **Impeccable Detector**:
   - Mechanical audit check via `impeccable detect` reports 0 errors and 0 warnings.
