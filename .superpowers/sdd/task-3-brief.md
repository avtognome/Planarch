# Task 3 Brief: DOM Event Bus Renaming

## Goal
Rename all internal CustomEvent names from `planarch-*` to `archeron-*`, maintaining fallback or dual-dispatch/dual-listen where appropriate so no listener misses events.

## Requirements
1. Events to rename:
   - `planarch-audio-toggle` -> `archeron-audio-toggle`
   - `planarch-audio-mute` -> `archeron-audio-mute`
   - `planarch-audio-changed` -> `archeron-audio-changed`
   - `planarch-command-open` -> `archeron-command-open`
   - `planarch-dice-roll` -> `archeron-dice-roll`
   - `planarch-homebrew-changed` -> `archeron-homebrew-changed`
   - `planarch-compendium-changed` -> `archeron-compendium-changed`
   - `planarch-youtube-mixer-open` -> `archeron-youtube-mixer-open`
   - `planarch-youtube-mixer-close` -> `archeron-youtube-mixer-close`
   - `planarch-save-error` -> `archeron-save-error`
2. Files to update:
   - `src/App.tsx`
   - `src/CombatTracker.tsx`
   - `src/CampaignTools.tsx`
   - `src/Compendium.tsx`
   - `src/CompendiumDrawer.tsx`
   - `src/homebrewData.ts`
   - `src/storage.ts`
   - `src/cloudFiles.ts`
   - `src/compendiumData.ts`
   - `src/YouTubeMixer.tsx` (attribute `data-archeron-youtube`)
   - `src/supabaseCloud.ts` (event listeners/triggers for audio & compendium changes)
3. Ensure every listener also listens to legacy `planarch-*` or everything is cleanly upgraded.
4. Do NOT execute shell commands or tests yet. Write report to `.superpowers/sdd/task-3-report.md`.
