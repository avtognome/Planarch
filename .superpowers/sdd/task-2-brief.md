# Task 2 Brief: Storage Migration Layer (LocalStorage & IndexedDB)

## Goal
Implement seamless data persistence migration from `planarch-*` and `wayfinder-*` to `archeron-*`.

## Requirements
1. `src/storage.ts`:
   - Keep key prefixes consistent.
2. `src/cloudFiles.ts`:
   - Primary IndexedDB name: `archeron-files`. Fallback check: if `archeron-files` doesn't exist but `planarch-files` exists, copy/open appropriately or support dual-open fallback without data loss.
   - Update dirty tracker key: `archeron-audio-dirty` (fallback to `planarch-audio-dirty`).
3. `src/compendiumData.ts`:
   - Primary IndexedDB: `archeron-compendium` (fallback to `planarch-compendium`).
   - Dirty tracker key: `archeron-compendium-dirty` (fallback to `planarch-compendium-dirty`).
4. `src/freesound.ts`:
   - DB name: `archeron-audio-cache` (fallback check `planarch-audio-cache`).
5. `src/campaigns.ts`:
   - Check `archeron-clean-campaigns-v1`, fallback `planarch-clean-campaigns-v1`, `wayfinder-clean-campaigns-v1`.
6. `src/App.tsx`:
   - Backup download filename: `archeron-backup.json`.
   - YouTube API key session storage: `archeron-youtube-key` (fallback `planarch-youtube-key`, `wayfinder-youtube-key`).
7. Backward compatibility: ALWAYS read `archeron-*` first; if null, read `planarch-*`; if null, read `wayfinder-*`. When writing, write to `archeron-*`.
8. Do NOT execute shell commands or tests yet. Write report to `.superpowers/sdd/task-2-report.md`.
