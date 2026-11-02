# Planarch palettes and character sheet

## Intent and boundaries

Give DMs eight app-wide color choices and a usable character sheet in existing Characters & NPCs workspace. Keep Planarch branding, layout, typography, spacing, and campaign-local storage. Copy color information only from OpenDesign references. Adapt observed Mythallar character-sheet behaviors, not its code, brand, or visual style. No player accounts or shared editing.

## Evidence and limits

Observed `https://mythallar.netlify.app/` in browser on 2026-11-02: created a level-1 Wizard, opened Character Sheet, and saw collapsible Combat Stats, Ability Scores & Saving Throws, Skills & Senses, Proficiencies & Training, Features & Tracked Resources, Items & Inventory; separate spellbook panel contains slot counts, short/long rest, prepared spell count, and empty-state guidance. Combat sheet exposes HP damage/heal, AC, initiative, speed, hit dice, death saves, inspiration, conditions, exhaustion, defenses, skills, items, and attunement. This is observed UI behavior, not a claim about its internal implementation. Planarch currently stores sparse `Character` records in `wf-characters:<campaign>` and uses `wf-theme` for light/dark.

## Color system

Replace topbar light/dark toggle with Settings picker. Choices: dark Totality Festival, Futuristic, SpaceX, Mission Control; light Apple, Premium, Cursor, Ollama. Each choice maps source background, surface, foreground, muted text, border, accent, and semantic colors into Planarch's existing CSS tokens. Source URLs are exactly those supplied in request. Use each page's detailed color-role guide when it conflicts with generic token table; use token table for missing roles. Preserve existing non-color design properties. When source text/accent fails WCAG AA on a real surface, adjust that role enough for 4.5:1 normal text and 3:1 large text, while keeping color family. Show labeled swatches and dark/light grouping; selecting immediately applies and persists. Existing `wf-theme` values migrate: `light` to Premium and `dark` to Mission Control; absent preference defaults to Premium. Do not create duplicate preference keys. Existing logo assets still select their light/dark contrast variant according to chosen palette. Keep current `.theme-light`/`.theme-dark` compatibility only where needed while replacing hard-coded color overrides with tokens. Focus indicators must remain visible across all eight choices.

Reference palette anchors (from detailed guide when present): Totality `#121318` canvas, `#1e1f25` surface, `#e3e1e9` text, `#fff6df` primary, `#bdf4ff` secondary; Futuristic `#3b82f6` primary with dark token canvas `#090b12` and surface `#121722`; SpaceX `#000000` canvas, `#f0f0fa` text/accent; Mission Control `#0b1120` canvas, `#111827` surface, `#e8f0fe` text, `#ffb800` primary, `#00d4ff` secondary; Apple `#ffffff` canvas, `#f5f5f7` surface, `#1d1d1f` text, `#0071e3` accent; Premium `#faf8f4` canvas, `#ffffff` surface, `#1c1b19` text, `#a06a3b` accent; Cursor `#f2f1ed` canvas, `#e6e5e0` surface, `#26251e` text, `#f54e00` accent; Ollama `#ffffff` canvas, `#fafafa` surface, `#000000` text/accent. Futuristic's guide lists a white surface despite dark token table; dark surface tokens take precedence to fulfill dark-choice requirement. Source palette anchors are not a request to adopt source typography, layouts, shadows, or logos.

## Character data and UI

Extend existing `Character` with optional sheet fields. Old characters render with defaults without rewriting their records until edited. Preserve portrait, profile, existing HP/AC/initiative, relationships, and notes. Keep character list, search, and Player/NPC filter. Player records show collapsible sheet sections modeled on observed workflow; NPCs retain current profile, with explicit opt-in to full sheet. No parallel record store.

Sections: combat (current/max/temp HP, damage/heal, AC, initiative, speed, hit dice, death saves, inspiration, conditions, exhaustion, defenses); abilities and saving throws; skills/senses and training; proficiency/languages; features and tracked resources; inventory, quantity, and attunement; spells known/prepared and slots. Each interaction updates selected character via existing campaign autosave. Clamp damage at zero HP, heal at max HP unless temp HP is explicitly edited, expended slots between zero and maximum, and attunement at three items. Preserve text inputs while typing and reject invalid values on commit, with clear feedback.

2024 rules: one class and character level per sheet, no automatic multiclass calculations. Ability modifiers use `floor((score - 10) / 2)`. Proficiency bonus follows 2024 level bands; trained skills and class saving-throw proficiencies add proficiency. Calculate passive scores from relevant skill bonuses. Derive standard single-class spell-slot maxima for full, half, and third casters; noncasters get none. Warlock pact slots use separate progression; class/subclass features and item bonuses remain manual adjustments rather than guessed automation. Short/long rest restores slots according to class rules and explicitly tracked resource rest type. DM can edit slot maxima and prepared flags to handle exceptional features. Do not overwrite manual changes during level changes without confirmation.

Spellbook supports compendium picker when imported spells exist and manual entries otherwise. Store stable local spell details needed to display names and levels even if compendium is removed; retain compendium reference when available. Prepared spells are explicit per-entry toggles; show count. Missing compendium should show manual-entry path, never erase spell entries. No external Mythallar data import.

## Architecture and verification

Keep palette definitions in CSS custom properties with a small typed palette ID list for Settings and persistence. Avoid new dependencies. Separate character sheet UI and pure 2024 calculation helpers from current large `CampaignTools.tsx`; keep character list and persistence ownership there. Update existing tests plus focused runnable tests for migration, math, rest/slots, spell retention, and palette selection. Run `npm test`, `npm run check`, `npm run build`; inspect and click through Settings and sheet in browser at desktop/mobile, check console, and verify every palette's text/controls/focus contrast. Preserve unrelated uncommitted workspace changes.

## Design rationale

- Color choices belong in Settings because eight options would crowd primary navigation.
- Existing character records remain source of truth to avoid two-record sync and deletion races.
- Mythallar-style grouped sections put frequently edited combat values before reference material.
- Source palettes change color only so Planarch remains recognizable across choices.
- Moderate visual energy and motion (ENERGY 2 / RHYTHM 2 / MOTION 2) match existing dense DM workspace; no new decorative assets.
