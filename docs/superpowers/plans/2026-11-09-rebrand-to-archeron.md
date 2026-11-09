# Archeron Rebranding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the application from Planarch to Archeron across the UI, assets, internal event bus, storage migration layer, and cloud adapter while maintaining zero data-loss compatibility with existing local/cloud states.

**Architecture:** Update user-facing identity, HTML titles, and branding SVGs to Archeron. Implement a seamless read/write migration bridge in `localStorage`, `IndexedDB`, and Supabase schema adapters (`archeron` primary with `planarch` and `wayfinder` fallbacks) so existing user campaigns, compendiums, and configurations transfer uninterrupted.

**Tech Stack:** TypeScript, React 19, Vite, IndexedDB, LocalStorage, Supabase JS, Tailwind CSS.

**Spec:** Direct user interview requirements (Name: Archeron; Subdomain target: `archeron.vercel.app`; Auto-migration with legacy fallbacks enabled; Asset renaming enabled).

## Global Constraints
- Primary identity is "Archeron" across all headings, titles, labels, and aria attributes.
- Backward compatibility: Never discard or corrupt existing local data under `planarch-*` or `wayfinder-*`. If an `archeron-*` key is absent, migrate seamlessly from legacy keys.
- Supabase queries must try `archeron_*` tables/buckets first and transparently fall back to `planarch_*` and `wayfinder_*`.
- Warn user before code execution commands (`npm test`, build scripts) so model changes can be performed.

## Review Focus
- LocalStorage migration: Existing configs (`planarch-supabase-config`) auto-resolve into `archeron-supabase-config`.
- IndexedDB stores: Fallback migration logic ensures existing compendiums (`planarch-compendium`) and media caches load without re-import.
- DOM CustomEvents: All custom event listeners and dispatches (`archeron-audio-toggle`, etc.) are consistently updated without broken listeners.
- Backup import/export: Backup JSON files export as `archeron-backup.json` while accepting legacy backup imports.
- Offline tests: Automated test suite passes and verifies branding and cloud-sync continuity.

---

### Task 1: Rebrand Asset Files & Brand Components

**Files:**
- Rename / Create: `public/branding/archeron-*.svg`
- Modify: `src/PlanarchBrand.tsx` -> `src/ArcheronBrand.tsx`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Produces: `<ArcheronBrand />` component rendering Archeron seals and horizontal/stacked logos.

- [ ] **Step 1: Copy and rename branding SVGs in `public/branding/`**
  - Rename `planarch-seal-*.svg` and `planarch-logo-*.svg` to `archeron-seal-*.svg` and `archeron-logo-*.svg`.
- [ ] **Step 2: Update `index.html`**
  - Replace `<title>Planarch</title>` with `<title>Archeron</title>`.
  - Update any metadata or favicon references to Archeron.
- [ ] **Step 3: Update `ArcheronBrand.tsx` and usages**
  - Rename `PlanarchBrand.tsx` to `ArcheronBrand.tsx`.
  - Update asset paths to `/branding/archeron-...`.
  - Update `src/App.tsx` imports from `PlanarchBrand` to `ArcheronBrand`.

---

### Task 2: Storage Migration Layer (LocalStorage & IndexedDB)

**Files:**
- Modify: `src/storage.ts`
- Modify: `src/cloudFiles.ts`
- Modify: `src/compendiumData.ts`
- Modify: `src/freesound.ts`
- Modify: `src/campaigns.ts`

**Interfaces:**
- Consumes: Legacy keys `planarch-*`, `wayfinder-*`.
- Produces: Migration getters and primary writers for `archeron-*`.

- [ ] **Step 1: Update `src/storage.ts` & LocalStorage keys**
  - Ensure config reads check `archeron-*`, fallback to `planarch-*`, fallback to `wayfinder-*`.
  - Write new configurations directly to `archeron-*`.
- [ ] **Step 2: Update IndexedDB database names in `src/cloudFiles.ts` & `src/compendiumData.ts`**
  - Add smooth DB migration/fallback check for `archeron-files` and `archeron-compendium` if `planarch-*` exists.
- [ ] **Step 3: Update backup export/import naming in `src/App.tsx`**
  - Download as `archeron-backup.json`.

---

### Task 3: DOM Event Bus Renaming

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/CombatTracker.tsx`
- Modify: `src/CampaignTools.tsx`
- Modify: `src/Compendium.tsx`
- Modify: `src/CompendiumDrawer.tsx`
- Modify: `src/homebrewData.ts`
- Modify: `src/storage.ts`
- Modify: `src/YouTubeMixer.tsx`

**Interfaces:**
- CustomEvents: `archeron-command-open`, `archeron-audio-toggle`, `archeron-audio-mute`, `archeron-audio-changed`, `archeron-compendium-changed`, `archeron-homebrew-changed`, `archeron-dice-roll`, `archeron-save-error`.

- [ ] **Step 1: Replace all `planarch-*` CustomEvent dispatches and listeners with `archeron-*`**
- [ ] **Step 2: Ensure cross-component communication remains intact**

---

### Task 4: Supabase Cloud Sync Adapter Multi-Tenant Fallback

**Files:**
- Modify: `src/supabaseCloud.ts`
- Modify: `src/CloudSettings.tsx`
- Modify: `tests/cloud-sync.mjs`
- Modify: `tests/supabase-schema.mjs`

**Interfaces:**
- Tables: Primary `archeron_records`, fallbacks `planarch_records`, `wayfinder_records`.
- Buckets: Primary `archeron-private`, fallbacks `planarch-private`, `wayfinder-private`.
- RPC: Primary `archeron_write_record`, fallbacks `planarch_write_record`, `wayfinder_write_record`.

- [ ] **Step 1: Update `src/supabaseCloud.ts` with primary `archeron_*` targets**
  - Update `activeBucket`, `activeTable`, `activeRpc`.
  - Maintain the existing automatic error detection & retry fallback cascade.
- [ ] **Step 2: Update `src/CloudSettings.tsx` copy and download script link**
  - Rename download link to `archeron-setup.sql`.
- [ ] **Step 3: Update test mocks in `tests/cloud-sync.mjs` and `tests/supabase-schema.mjs`**

---

### Task 5: CSS & Theme Classes Clean Up

**Files:**
- Modify: `src/theme.css`
- Modify: `src/style.css`

**Interfaces:**
- Variables: `--archeron-charcoal`, `--archeron-antique-gold`, etc.

- [ ] **Step 1: Rename `--planarch-*` color variables to `--archeron-*` with fallback aliases**
- [ ] **Step 2: Verify typography and color variables match DESIGN.md**

---

### Task 6: Verification & Test Execution

- [ ] **Step 1: Ask user confirmation before executing test commands (Model Warning Gate)**
- [ ] **Step 2: Run test suite (`npm test`) and type check (`npm run check`)**
- [ ] **Step 3: Run production build verification (`npm run build`)**
