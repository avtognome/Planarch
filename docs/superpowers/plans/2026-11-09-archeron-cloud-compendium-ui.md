# Archeron Cloud Compendium and UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink Vercel deploy, move imported compendiums to verified cloud-only storage, clean controls and headers, and rename campaign display labels without moving data.

**Architecture:** Keep existing Supabase auth/connection and workspace sync. Compendium cloud pointer supplies index and remote record reads; local IndexedDB remains staging for XML imports and legacy libraries until cloud readback and pointer sync are verified. Campaign storage keys remain stable while a synced `wf-campaign-labels` map supplies display names.

**Tech Stack:** React, TypeScript, Vite, IndexedDB, Supabase Storage/records, Node assert tests, CSS.

**Spec:** `docs/superpowers/specs/2026-11-09-archeron-cloud-compendium-ui-design.md`

## Global Constraints
- No new dependencies or Google OAuth changes; preserve current Supabase URL/key, email/password, RLS, schema fallbacks, and unrelated offline campaign/homebrew data.
- Never delete local compendium before remote readback verifies generation, count and record identities, and pointer sync has acknowledged chosen path; offline cloud-only access not required.
- No data deletion on initial page load without verified remote copy. Legacy browser DB and backup remain readable.
- UI: existing IBM Plex Sans/theme, 13px minimum text, 44px touch targets, light/dark contrast, keyboard focus; remove only decorative header badges on four destinations.
- Before **every** code execution, test or build command, tell Gnome and allow model switch. Do not run commands until this warning has been given. Do not overwrite unrelated work. Measure total `dist/` bytes before and after a fresh build.

## Review Focus
- Upload success but readback failure: keep local library and dirty marker; retry safely (Task 1 test).
- Pointer sync conflict or different account: never delete or display another account's library (Task 1 test).
- Legacy IndexedDB migration in flight: deletion cannot race copy-back or leave active metadata pointing at missing records (Task 1 test).
- Cloud record download failure/offline: display actionable error while campaign and homebrew remain usable (Task 1 test).
- Rename collision/backup with old mapping: reject duplicate display name and restore old-key records unchanged (Task 3 test).

---

### Task 1: Cloud-only compendium with verified migration

**Files:** Modify `src/compendiumData.ts`, `src/supabaseCloud.ts`, `src/Compendium.tsx`, `src/CompendiumDrawer.tsx`, `src/CompendiumMonsterModal.tsx`, `src/CampaignTools.tsx`; test `tests/cloud-sync.mjs`, `tests/workflows.mjs`, plus focused `tests/compendium-cloud.mjs` (register in `package.json` test script).

**Interfaces:** `getCloudState()`/`subscribeCloud()` supply active user and sync status. Export `getCloudCompendiumMeta(): Promise<LibraryMeta|null>`, `getCloudCompendiumRecord(id:string):Promise<CompendiumRecord|null>` from `supabaseCloud.ts`; preserve existing `readMeta`/`readRecord` for pending local staging. Cloud pointer `wf-cloud-compendium` must include `generation`, `name`, `count`, `index`, `path`, `backend:'supabase'`; older pointer lacking index derives it from validated blob. Never store whole remote library in persistent IndexedDB. Export `clearVerifiedLibrary(generation:string):Promise<void>` from `compendiumData.ts`, which removes active metadata only if matching generation, and records from current + legacy databases after awaited migration; clear record cache.

- [ ] **Step 1: Write failing tests.** Assert signed-out or inactive-sync XML import cannot start; upload + download readback verifies generation/count/IDs; missing, mismatched, truncated blob keeps local meta/records/dirty flag; pointer conflict or user switch blocks deletion; legacy migration race leaves library accessible; online cloud reads work across Compendium, drawer, monster picker and campaign tools; offline error does not block homebrew. Existing previous library survives failed import.
- [ ] **Step 2: Warn Gnome; run `node tests/compendium-cloud.mjs` and `node tests/cloud-sync.mjs`.** Expected: new tests fail for missing behavior.
- [ ] **Step 3: Implement minimal cloud read API and migration.** Validate pointer owner path via `fetchBlob`; validate blob format and record identities/count before displaying. Stage XML in IndexedDB only when authenticated and sync engine ready; do not remove previous generation until new upload and pointer acknowledgment. Upload blob with generation and records, read it back, compare count and record IDs (not only size); publish pointer, await remote revision acknowledgement without conflict; recheck user/epoch and active local generation, then delete verified local copy. For older pointer, validate and read index once from remote. Keep local dirty state on any failure; retry on sync/online events; avoid automatic restoring cloud library to IndexedDB. If selected remote pointer and unsynced local library differ, keep both until conflict resolution, never auto-overwrite.
- [ ] **Step 4: Warn Gnome; rerun focused tests.** Expected: PASS; failures leave local records intact. Update UI copy for signed-out, sync-pending, failed import, and offline states. Check no component still assumes `readRecord` alone is enough for remote records.
- [ ] **Step 5: Commit only task files** after reviewing staged diff: `feat: verify cloud compendium before clearing local copy`.

### Task 2: Remove shipped sourcebook and measure deploy

**Files:** Delete `public/compendium/` tracked files; modify `src/Compendium.tsx`, `src/compendiumData.ts`, `tests/full-compendium.mjs`, `tests/full-cloud-blob.mjs`, and any test with bundled manifest assumptions; test `tests/compendium-filters.mjs`. Keep useful parser coverage with small fixture, not shipped corpus.

**Interfaces:** Task 1 cloud import remains. Remove `importIncluded` export, button, and obsolete included-book progress wording; retain XML import and user records.

- [ ] **Step 1: Write failing regression assertion.** No `/compendium/manifest.json` fetch, included-sourcebook button, or shipped `public/compendium/`; XML import still offered when sync ready. Rework full-corpus tests to use small generated fixture or retire corpus-only assertion, never silently drop parser/cloud validation.
- [ ] **Step 2: Warn Gnome; run affected test files.** Expected: fail on present bundled assets.
- [ ] **Step 3: Remove included import code and bundled files.** Preserve unrelated public assets and local user data. Measure fresh baseline before deletion/build or use archived baseline build in separate location; existing `dist/` snapshot currently totals 62,358,348 bytes, including 60,761,717 bytes in `dist/compendium/`, but cannot be treated as fresh baseline without checking source revision.
- [ ] **Step 4: Warn Gnome; run affected tests and production build.** Expected: PASS; report exact total before/after bytes and removed sourcebook bytes, confirm no `dist/compendium/` after clean build. Do not claim savings if baseline incomparable.
- [ ] **Step 5: Commit only task files:** `chore: remove bundled compendium corpus`.

### Task 3: Campaign display-name map, synced and backed up

**Files:** Modify `src/App.tsx`, `src/storage.ts` only if required for existing `useSaved`, `tests/workflows.mjs`, `tests/cloud-sync.mjs`. Existing backup code in `src/App.tsx:848,1045-1067` must accept mapping; sync already includes all `wf-*` keys.

**Interfaces:** `wf-campaign-labels` is JSON `Record<string,string>` from immutable storage key to display label; missing entry defaults to key. `campaign` remains original key for scoped data, children receive display label separately where they render campaign headings. Rename form changes map only; `wf-campaigns` and `wf-campaign` retain storage keys.

- [ ] **Step 1: Write failing tests.** Rename persists after switch/reload; existing encounters, notes, wiki and homebrew remain under old key; empty/>80-char/case-insensitive duplicate label rejected; a new campaign cannot collide with renamed label; export/import and sync round-trip mapping; old backup without mapping defaults to keys; delete removes mapping only for deleted key.
- [ ] **Step 2: Warn Gnome; run `node tests/workflows.mjs` and `node tests/cloud-sync.mjs`.** Expected: new tests fail.
- [ ] **Step 3: Implement map and rename dialog in `App.tsx`.** Keep storage identity in hooks and child data props; use mapped display label in selector, hero eyebrow, user-facing titles and other campaign labels. Validate backup mapping as a safe string-to-string record with 80-character values; do not change existing keys on restore. Remove stale mapping only on deliberate campaign delete.
- [ ] **Step 4: Warn Gnome; rerun focused tests.** Expected: PASS.
- [ ] **Step 5: Commit only task files:** `feat: rename campaign display labels without moving records`.

### Task 4: Remove breadcrumbs, idle status, and decorative campaign header badges

**Files:** Modify `src/App.tsx`, `src/style.css`, `src/theme.css` if obsolete selectors, `tests/section-page-headers.mjs`, `tests/workflows.mjs`.

**Interfaces:** Use Task 3 mapped label in eyebrow on Encounters, Characters & NPCs, Campaign wiki, Compendium; Atmosphere Studio behavior unchanged. Preserve in-content status badges.

- [ ] **Step 1: Write failing header assertions.** No breadcrumb anywhere; no idle “Ready to plan”; active encounter status remains; four specified hero eyebrows equal current display label alone; header decorative `badge subtle` absent; in-content badges still present.
- [ ] **Step 2: Warn Gnome; run `node tests/section-page-headers.mjs`.** Expected: new assertions fail.
- [ ] **Step 3: Remove markup and dead styles; adjust eyebrow using Task 3 display label.** Avoid touching content badges and Atmosphere Studio buttons.
- [ ] **Step 4: Warn Gnome; rerun header/workflow tests.** Expected: PASS.
- [ ] **Step 5: Commit only task files:** `style: simplify campaign headers and navigation chrome`.

### Task 5: Proper action buttons across app

**Files:** Modify actual action sites found via search in `src/*.tsx` and shared rules in `src/style.css`, `src/theme.css`, `src/features.css` as needed; test `tests/section-page-headers.mjs` and focused `tests/action-buttons.mjs` (register in `package.json`). Do not refactor unrelated components.

**Interfaces:** Use existing `button` elements and `.secondary`/`.icon-button` patterns. Change action appearance, not behavior or link semantics; icon-only controls need accessible labels.

- [ ] **Step 1: Inventory clickable text controls in rendered app across dashboard, campaign tools, compendium, dialogs, settings, cloud controls. Write failing assertions for representative small action sites and keyboard/button semantics; distinguish true `<a href>` navigation from actions.**
- [ ] **Step 2: Warn Gnome; run `node tests/action-buttons.mjs`.** Expected: fail for text-action styling/targets.
- [ ] **Step 3: Replace text-like action styling with existing proper button variants; ensure 13px text, 44px touch areas and visible focus in both themes.** Keep disabled/busy states and keyboard activation. Avoid blanket styling of spans, nav links, or status labels.
- [ ] **Step 4: Warn Gnome; run focused tests; inspect rendered UI at phone and desktop widths in both themes, keyboard focus and disabled states.** Expected: no overflow or hidden controls.
- [ ] **Step 5: Commit only task files:** `style: make text actions usable buttons`.

### Task 6: Integration verification and handoff

**Files:** No new product code unless verification reveals a bug; update relevant tests minimally. No unrelated files.

- [ ] **Step 1: Warn Gnome; run `npm run check`, `npm test`, and `npm run build`, separately.** Expected: all PASS; compare clean `dist/` total with recorded comparable baseline and report bytes.
- [ ] **Step 2: Inspect git diff/status and confirm no user work overwritten, no bundled corpus, no Google auth changes, no unverified deletion.** Recheck destructive cloud behavior and manual UI at desktop/phone.
- [ ] **Step 3: Request fresh code review focused on loss prevention, sync conflicts, account switching and layout; fix verified findings; rerun affected checks after warning Gnome.**

## Self-review
Spec coverage: cloud import/migration, deploy size, UI controls, breadcrumbs/status/badges/eyebrow, rename/sync/backup each have owner. Task 1 and 2 share `Compendium.tsx`; execute sequentially. Task 3 and 4 share `App.tsx`; execute sequentially. Review Focus items have explicit Task 1 or Task 3 tests. No OAuth or new dependency. Baseline snapshot is preliminary, not verified measurement.
