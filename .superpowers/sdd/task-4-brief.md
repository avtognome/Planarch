# Task 4 Brief: Supabase Cloud Sync Adapter Multi-Tenant Fallback

## Goal
Update Supabase Cloud adapter in `src/supabaseCloud.ts` and `src/CloudSettings.tsx` to target `archeron` as primary, while keeping fallback cascade to `planarch_*` and `wayfinder_*`.

## Requirements
1. In `src/supabaseCloud.ts`:
   - Primary active: `activeBucket = 'archeron-private'`, `activeTable = 'archeron_records'`, `activeRpc = 'archeron_write_record'`.
   - Update fallback logic:
     - On error 404 / bucket not found: check `archeron-private` -> `planarch-private` -> `wayfinder-private`.
     - On table error: check `archeron_records` -> `planarch_records` -> `wayfinder_records`.
     - On RPC error: check `archeron_write_record` -> `planarch_write_record` -> `wayfinder_write_record`.
   - LocalStorage keys:
     - `archeron-supabase-config` (fallback `planarch-supabase-config`, `wayfinder-supabase-config`).
     - `archeron-supabase-owner` (fallback `planarch-supabase-owner`, `wayfinder-supabase-owner`).
     - `archeron-supabase-auth:...` (fallback `planarch-supabase-auth:...`).
     - `archeron-supabase-sync:...` (fallback `planarch-supabase-sync:...`).
     - `archeron-audio-dirty`, `archeron-audio-current`, `archeron-compendium-dirty`, `archeron-compendium-current`.
   - BlobManifest format: `'archeron-blob-v1' | 'planarch-blob-v1' | 'wayfinder-blob-v1'`. Update `src/cloudBlob.ts` as well.
2. In `src/CloudSettings.tsx`:
   - Read from `archeron-supabase-config`, fallback to `planarch-supabase-config`, `wayfinder-supabase-config`.
   - Update setup download link: `download="archeron-setup.sql"`, href `/supabase/setup.sql`.
   - Ensure UI copy and aria-labels reflect Archeron.
3. In `tests/cloud-sync.mjs` & `tests/supabase-schema.mjs`:
   - Support `archeron_*` tables/buckets alongside backwards compatibility tests.
4. Do NOT execute shell commands or tests yet. Write report to `.superpowers/sdd/task-4-report.md`.
