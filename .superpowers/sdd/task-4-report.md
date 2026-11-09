# Task 4 Report: Supabase Cloud Sync Adapter Multi-Tenant Fallback

## Status
DONE

## Summary
Updated Supabase Cloud sync layer, blob packing/unpacking, settings UI, and schema setup to target `archeron` as primary, while preserving a 3-tier fallback cascade to `planarch_*` and `wayfinder_*`. Updated database tests and cloud sync unit tests to verify `archeron_*` tables, RPCs, storage buckets, and manifest formats alongside backward compatibility aliases.

## Changes Made
1. `src/cloudBlob.ts`:
   - Updated `BlobManifest` union to `'archeron-blob-v1' | 'planarch-blob-v1' | 'wayfinder-blob-v1'`.
   - Updated `unpackCloudBlob` validation to accept all three format versions.

2. `src/supabaseCloud.ts`:
   - Set active defaults to `activeBucket = 'archeron-private'`, `activeTable = 'archeron_records'`, `activeRpc = 'archeron_write_record'`.
   - Updated upload/fetch/remove blob storage fallback: cascades `archeron-private` -> `planarch-private` -> `wayfinder-private` on 404 / bucket not found.
   - Default blob manifest generation set to `'archeron-blob-v1'`.
   - Updated PostgREST table querying in `adapterFor(uid).list`: cascades `archeron_records` -> `planarch_records` -> `wayfinder_records`.
   - Updated atomic CAS RPC in `adapterFor(uid).write`: cascades `archeron_write_record` -> `planarch_write_record` -> `wayfinder_write_record`.
   - Migrated LocalStorage keys:
     - Config: `archeron-supabase-config` with fallback to `planarch-supabase-config` and `wayfinder-supabase-config`.
     - Owner: `archeron-supabase-owner` with fallback to `planarch-supabase-owner` and `wayfinder-supabase-owner`.
     - Auth: `archeron-supabase-auth:<host>` with automatic session migration from `planarch-supabase-auth:<host>` or `wayfinder-supabase-auth:<host>`.
     - Sync state metadata: `archeron-supabase-sync:<id>` with fallback to `planarch-supabase-sync:<id>` or `wayfinder-supabase-sync:<id>`.
     - Audio/Compendium dirty & current pointers: reads and synchronizes `archeron-audio-dirty`, `archeron-audio-current`, `archeron-compendium-dirty`, `archeron-compendium-current` with legacy `planarch-*` counterparts.

3. `src/CloudSettings.tsx`:
   - Config read prefers `archeron-supabase-config`, falling back to `planarch-supabase-config` and `wayfinder-supabase-config`.
   - Updated SQL setup download link to `archeron-setup.sql` pointing to `/supabase/setup.sql`.

4. `supabase/setup.sql`:
   - Upgraded setup script to automatically migrate from `planarch_records` or `wayfinder_records` to `archeron_records`.
   - Created `public.archeron_records` table, RLS policies, and `public.archeron_write_record` atomic revision CAS function.
   - Provided backward-compatible wrapper functions `public.planarch_write_record` and `public.wayfinder_write_record`.
   - Created `archeron-private` storage bucket and RLS policies across `archeron-private`, `planarch-private`, and `wayfinder-private`.
   - Added publication table for `archeron_records`.

5. `tests/supabase-schema.mjs`:
   - Verified `archeron_write_record`, `planarch_write_record`, and `wayfinder_write_record` atomic CAS.
   - Verified `archeron-private` and `planarch-private` storage bucket object isolation and RLS.
   - Verified `archeron_records` row-level security and anonymous access rejection.

6. `tests/cloud-sync.mjs`:
   - Tested cloud blob packing/unpacking with `'archeron-blob-v1'`, `'planarch-blob-v1'`, and `'wayfinder-blob-v1'`.
   - Tested audio dirty flags tracking with both `archeron-audio-dirty` and `planarch-audio-dirty`.

## Modified Files
- `src/cloudBlob.ts`
- `src/supabaseCloud.ts`
- `src/CloudSettings.tsx`
- `supabase/setup.sql`
- `tests/supabase-schema.mjs`
- `tests/cloud-sync.mjs`
