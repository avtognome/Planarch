# Planarch — DM Command Center

A local-first React + TypeScript + Vite application with a customizable modern-medieval DM workspace. It opens in an ivory-and-gold light theme and includes a remembered dark theme. Static hosting compatible with Netlify.

## Run & deploy

Node 22.13+ required.

```sh
npm install
npm run dev
npm run check
npm test
npm run build
```

Netlify builds with `npm run build` and publishes `dist`. `netlify.toml` includes SPA routing. The checked-in pnpm lockfile also supports `pnpm install`.

## Dashboard

Three saved workspace layouts; unlock to drag widget grips and use panel icons to resize. An editable journal, dice roller and live encounter tracker save locally. Every monster remains an independent combatant and initiative entry. During combat, drag or nudge the turn order, edit initiative, mark a readied action, delay a turn, roll one combatant, duplicate a monster as an auto-numbered newcomer, dismiss a combatant, and collapse defeated creatures. Inline HP controls provide −5, −1, direct HP entry, +1, +5, plus a custom damage/healing amount. Clearing the direct HP field does not change combat state; the new value is committed on blur or Enter. Concentration damage produces the correct minimum-DC reminder. Ending an encounter writes its result to the journal and wiki.

The sun/moon button switches themes. Light is the default, and the choice is saved locally and included in workspace synchronization/backups.

## Atmosphere Studio

Five built-in procedural scenes plus reusable custom scenes and provider sources. Scenes use a compact vertical list without artwork previews. Add a YouTube video/playlist or Spotify link, choose a title/category and optionally keep the current ambience mix. The source appears in the selectable list. Each source opens an embedded provider player that stays mounted across navigation; minimize it, stop it, or open the provider directly. Duplicate source links reuse the existing entry. Custom/source scenes can be removed.

Browser-generated rain, wind, surf and fire have independent levels and an ambience master. Local audio uploads use a separate music level and persist in browser storage. Provider players retain their own volume and playback controls. Stop all stops local audio, procedural ambience, and unloads the source player.

## Campaign tools

- **Encounters:** create, edit, duplicate, delete and import JSON encounters; add individual monsters/players; reorder participants; edit HP, initiatives, modifiers, conditions and concentration; roll monster initiative; import campaign players; run in the dashboard and record completion. **Update active encounter** can add, remove, and reorder combatants without resetting current HP or the round; it keeps the active combatant selected whenever possible.
- **Characters & NPCs:** campaign-specific profiles, search/filter, player/NPC type, portrait uploads, personality, motivation, relationships, HP, initiative modifier and private notes.
- **Campaign wiki:** editable pages with categories/tags, full-text search, read/edit views, `[[Page title]]` links and backlinks; chronological session/encounter logs.
- JSON workspace backup export/import includes campaign records and source scenes.

Encounter JSON accepts one object or an array. Each encounter needs `name` and `members`. Each member needs `name` and numeric `hp`; optional fields include `role` (`Player` or `Monster`), `maxHp`, `initiative`, `modifier`, `conditions`, and `concentration`.

## Limits

Supabase cloud synchronization is optional and requires your project configuration and account sign-in. Service-worker offline caching is not implemented. Provider playback needs connectivity and embedding permission and may require interaction or authentication. The selected local audio file is stored in IndexedDB and restored after refresh; Supabase uploads and restores it across devices. Procedural ambience is a prototype, not recorded production audio. Encounter balancing supports a per-encounter 2014/2024 ruleset choice and compendium generation filtered by difficulty and environment; generated rosters still require DM review. Conditions and character relationships use editable text; advanced durations, relationship diagrams and timeline visualization remain future work. Portraits are capped at 2 MB each; wiki posts support an optimized thumbnail plus multiple inline images. Export backups periodically when using many images.

## Architecture

- `App.tsx`: dashboard, atmosphere, navigation and audio orchestration.
- `CombatTracker.tsx`: live roster, independent initiative, turn-order and inline HP controls.
- `CampaignTools.tsx`: encounter, character and wiki editors.
- `theme.css`: persistent light/dark modern-medieval visual system and live combat layout.
- `models.ts`: campaign record types and starter data.
- `storage.ts`: key-aware persistence that preserves independent campaign records.
- `sources.ts`: validated provider URL normalization and embed generation.
- `tests/workflows.mjs`: component interaction tests for source selection, campaign switching, combat execution, wiki links and persistence. These tests do not verify browser audio playback or external provider availability.

Next: move all local records to versioned IndexedDB, split feature components further, and add undo for high-impact edits. Keep provider secrets out of the client bundle.

## XML sourcebook / compendium

The supplied `Complete_Compendium_5e+5.5e.xml` is normalized into 106 bounded JSON chunks in `public/compendium`. It contains 26,393 entries: 7,214 monsters, 4,130 spells, 12,797 items, 84 classes, 660 races, 1,175 feats and 333 backgrounds. Names, repeated fields, abilities, actions, attributes and edition labels are retained; separate variants are not merged. Click **Compendium → Load included compendium** once. Entries and a searchable name/metadata index are stored in IndexedDB rather than localStorage.

Compendium supports category and label filters, paginated search, full recursive detail panels, and adding a monster to a prepared or new encounter. Members link back to the source stat block. XML imports run in a Web Worker; the previous library remains active until all new records are stored. Imported compendiums are shared across campaigns in this browser. Workspace JSON backups do not include IndexedDB: retain the original XML or reload the included compendium on another browser/device.

To rebuild the included library:

```sh
python scripts/prepare-compendium.py /absolute/path/to/compendium.xml public/compendium
```

## Spotify → YouTube matching

Spotify individual song links default to a YouTube matching workflow. Spotify oEmbed supplies the song title when reachable; artist/title can be corrected manually. Add a **YouTube Data API v3 key** in Settings for automatic embeddable video search. Confirm the desired version; the resulting atmosphere scene saves a YouTube source and retains the original Spotify link. Search results can be covers, remixes or other recordings, so the user chooses the version.

The optional API key is entered by the user, stored in sessionStorage for the current tab, and never included in JSON backups or source files. Browser API keys must be restricted to the deployed site's HTTP referrers and the YouTube Data API. Without a key, the interface opens a song-title search on YouTube and accepts a chosen video URL. Direct Spotify embeds remain optional.

For Netlify, `netlify/functions/spotify-title.mjs` supplies a same-origin fallback for Spotify metadata if direct browser oEmbed access fails. The current static Sites preview has no Netlify Functions runtime; if direct oEmbed is blocked there, the UI asks for a song title/artist. Automatic YouTube search uses the official API from the browser and does not depend on this function. Actual external playback/metadata availability and browser audio remain unverified by component tests.

Additional modules: `Compendium.tsx`, `compendiumData.ts`, `compendiumParser.ts`, `compendium.worker.ts`, `SourcePicker.tsx`, `musicLookup.ts`.


## Supabase synchronization

Open Settings & backup → Supabase cloud sync and enter your Project URL and publishable key. Run `supabase/setup.sql` in the project's SQL Editor first, then create/sign in to an account and start sync. See SUPABASE_SETUP.md for the full procedure.

The provider uses Supabase Auth, private Row Level Security, Realtime and a private Storage bucket. The existing offline queue and revision conflict resolution remain. Large records and compendium JSON are compressed when supported; uploads are split into objects no larger than 8 MiB, below the Free plan's per-file limit. Audio uses the same chunked file storage. Credentials and connection settings are excluded from workspace sync.

The Firebase provider and SDK are removed. Browser-local records, the imported compendium and selected audio are preserved. Existing Firebase remote data is not copied automatically; use the old build's backup workflow if that is your only current copy.

Free-plan quotas and project inactivity pausing still apply. Older immutable file versions remain in Storage; clean up unreferenced versions when needed. Actual hosted Supabase auth, Realtime and storage have not been tested against a live user project. Local tests cover configuration validation, atomic database revisions, Row Level Security for records/private file paths, cloud file round-trips, offline queue and conflicts.

Additional modules: `supabaseCloud.ts`, `cloudBlob.ts`, `CloudSettings.tsx`, `syncEngine.ts`, `cloudFiles.ts`.
