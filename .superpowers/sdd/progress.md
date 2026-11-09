# SDD ledger — plan: docs/superpowers/plans/2026-11-09-rebrand-to-archeron.md

## Preflight
- Plan: `docs/superpowers/plans/2026-11-09-rebrand-to-archeron.md`
- Target Name: Archeron
- Global constraints: Zero data-loss (fallbacks for `planarch-*` and `wayfinder-*`), warn before code execution commands.

## Task 1: Rebrand Asset Files & Brand Components
- Status: DONE
- Files: `public/branding/archeron-*`, `src/ArcheronBrand.tsx`, `index.html`, `src/App.tsx`, `package.json`, `tests/brand-integration.mjs`.

## Task 2: Storage Migration Layer
- Status: DONE
- Files: `src/storage.ts`, `src/cloudFiles.ts`, `src/compendiumData.ts`, `src/freesound.ts`, `src/campaigns.ts`, `src/App.tsx`.

## Task 3: DOM Event Bus Renaming
- Status: DONE
- Files: `src/App.tsx`, `src/CombatTracker.tsx`, `src/CampaignTools.tsx`, `src/Compendium.tsx`, `src/CompendiumDrawer.tsx`, `src/homebrewData.ts`, `src/YouTubeMixer.tsx`, `src/supabaseCloud.ts`, `tests/homebrew-modal.mjs`.

## Task 4: Supabase Cloud Sync Adapter Multi-Tenant Fallback
- Status: DONE
- Files: `src/cloudBlob.ts`, `src/supabaseCloud.ts`, `src/CloudSettings.tsx`, `supabase/setup.sql`, `tests/supabase-schema.mjs`, `tests/cloud-sync.mjs`.

## Task 5: CSS & Theme Classes Clean Up
- Status: DONE
- Files: `src/theme.css`, `DESIGN.md`.

## Task 6: Verification & Test Execution
- Status: DONE
- TypeScript check (`tsc --noEmit`): PASS.
- Test suite (`npm test` - 22 test files): PASS.
- Production build (`npm run build`): PASS (built `dist/` in 1.99s).



## Task 2: Storage Migration Layer (LocalStorage & IndexedDB)
- Status: DONE
- Files: `src/storage.ts`, `src/cloudFiles.ts`, `src/compendiumData.ts`, `src/freesound.ts`, `src/campaigns.ts`, `src/App.tsx`.
- Backward compatibility: Full fallback chain (`archeron-*` -> `planarch-*` -> `wayfinder-*`) and dual-open IndexedDB migrations implemented.

## Task 3: DOM Event Bus Renaming
- Status: DONE
- Files: `src/App.tsx`, `src/CombatTracker.tsx`, `src/CampaignTools.tsx`, `src/Compendium.tsx`, `src/CompendiumDrawer.tsx`, `src/homebrewData.ts`, `src/YouTubeMixer.tsx`, `src/supabaseCloud.ts`, `tests/homebrew-modal.mjs`.
- Backward compatibility: Full dual-listener and dual-dispatch fallback for all 10 custom events; deduplicated to prevent double execution.



