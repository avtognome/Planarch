# Task 3 Report: DOM Event Bus Renaming

## Status
DONE

## Summary
Renamed all internal DOM CustomEvents from `planarch-*` to `archeron-*` with complete dual-dispatch/dual-listen backward compatibility across the entire workspace. Every listener now captures both the new `archeron-*` primary event and legacy `planarch-*` events without duplicate handler executions or regressions.

## Events Renamed & Adapted
1. `planarch-audio-toggle` -> `archeron-audio-toggle` (dispatched on command palette & spacebar; throttled dual-listener in `App.tsx`)
2. `planarch-audio-mute` -> `archeron-audio-mute` (dispatched on command palette; throttled dual-listener in `App.tsx`)
3. `planarch-audio-changed` -> `archeron-audio-changed` (dual-dispatched on audio save; dual-listened in `App.tsx` & `supabaseCloud.ts`)
4. `planarch-command-open` -> `archeron-command-open` (dual-dispatched in `App.tsx`; dual-listened in `CombatTracker.tsx`)
5. `planarch-dice-roll` -> `archeron-dice-roll` (dispatched in `Compendium.tsx` & `CompendiumDrawer.tsx`; deduplicated dual-listener in `App.tsx`)
6. `planarch-homebrew-changed` -> `archeron-homebrew-changed` (dual-dispatched in `homebrewData.ts`; dual-listened in `CampaignTools.tsx` & `Compendium.tsx`)
7. `planarch-compendium-changed` -> `archeron-compendium-changed` (dual-dispatched in `compendiumData.ts`; dual-listened in `Compendium.tsx` & `supabaseCloud.ts`)
8. `planarch-youtube-mixer-open` -> `archeron-youtube-mixer-open` (dual-listened in `App.tsx`)
9. `planarch-youtube-mixer-close` -> `archeron-youtube-mixer-close` (dual-listened in `App.tsx`)
10. `planarch-save-error` -> `archeron-save-error` (dual-dispatched in `storage.ts`; debounced dual-listener in `App.tsx`)

## Attributes Adapted
- `YouTubeMixer.tsx`: Script tags now query `script[data-archeron-youtube],script[data-planarch-youtube]` and mount with both `data-archeron-youtube="true"` and `data-planarch-youtube="true"`.

## Modified Files
- `src/App.tsx`
- `src/CombatTracker.tsx`
- `src/CampaignTools.tsx`
- `src/Compendium.tsx`
- `src/CompendiumDrawer.tsx`
- `src/homebrewData.ts`
- `src/YouTubeMixer.tsx`
- `src/supabaseCloud.ts`
- `tests/homebrew-modal.mjs`
