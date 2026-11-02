# Planarch typography unification

## Intent

Planarch must remain readable at arm's length during tabletop sessions without losing its compact DM console layout. Current 7–11px labels and scattered font sizes make navigation and combat data hard to scan and give the app an inconsistent feel. Success: one coherent face and role scale across every screen, with no visible text below 13px.

## Scope and direction

- Whole app: shell, dashboard, combat, dice, atmosphere, character sheets, forms, dialogs, wiki, and compendium.
- Keep existing colors, structure, interactions, and content. Typography is an Operate-mode refinement, not a page redesign.
- Replace system UI, Georgia reference text, and monospace roll-history text with locally bundled IBM Plex Sans. Do not load fonts from a network at runtime. Use system sans fallback while local files load and if they fail.
- Use regular 400 and semibold 600 only. Bundle only these used weights and required character sets. Keep font licensing and attribution with shipped assets.
- Reason: IBM Plex Sans has open letterforms for table-distance reading and precise numerals for combat data, without a second decorative voice.

## Type roles

| Role | Size | Weight | Purpose |
| --- | --- | --- | --- |
| Page title | 22px | 600 | Screen and campaign identity |
| Section title | 17px | 600 | Widget, card, and subsection structure |
| Body/control | 14px | 400 or 600 for actionable emphasis | Reading, inputs, buttons, rows, rules prose |
| Secondary label | 13px | 400 or 600 when needed | Metadata, captions, timestamps, badges |

Critical HP, initiative, and dice totals may exceed page-title size where glanceability requires it. These are data emphasis, not additional font families or general-purpose heading roles. No visible word or number may render under 13px, including `small`, uppercase microcopy, field hints, and compact sheet labels. Icons do not count as text. Avoid extreme letter spacing and uppercase as a substitute for hierarchy. Use tabular numerals for changing counters if the font supports them.

## Application

- Establish shared font and type-role tokens in existing style files; migrate existing CSS selectors by purpose rather than stacking a broad override layer.
- Remove or replace local font-family declarations in `src/style.css`, `src/theme.css`, `src/features.css`, and any inline styles that bypass the shared family. Audit actual imports and styles before changing files; this list is illustrative, not permission for unrelated edits.
- Replace undersized literal font sizes with role values, including theme-specific `!important` overrides and character sheet rules. Preserve distinct semantic roles even where old selectors share a numerical size.
- Keep four principal roles recognizable by size, weight, and spacing, with body line height appropriate for dense UI and longer reference prose. Limit long-form prose measure to roughly 45–75 characters where layout permits.
- When increased text needs room, reduce decorative spacing and redundant badges first. On narrow screens, wrap and grow rows instead of clipping, hiding data, or adding nested scroll regions. Preserve at least 44px touch targets on coarse pointers.
- Support browser zoom and text resizing to 200%; avoid fixed-height containers that clip text. Preserve visible focus and readable contrast in every shipped palette.

## Implementation boundaries

No changes to persisted data, D&D calculations, routes, component behavior, or copy. No new typography setting or font picker. Font acquisition and license verification happen during implementation, after explicit model-switch pause. If usable offline font files cannot be obtained or licensed, stop and ask rather than silently switching face.

## Verification

- Inspect representative screens and computed styles on desktop, tablet, and phone, including 200% zoom, long names, empty fields, and light/dark palettes.
- Confirm local font assets load offline and fallback does not hide text. Confirm all visible text measures at least 13px and only 400/600 weights are requested, apart from browser-native exceptions outside app control.
- Check keyboard focus, text contrast to WCAG AA, and coarse-pointer target sizes. Confirm compact character sheet and combat controls still work and no horizontal overflow appears.
- Run typography detector on changed UI, `npm test`, `npm run check`, and `npm run build`. Record any pre-existing unrelated warnings separately.

## Handoff gate

Writing this spec does not authorize product-code edits. After spec review, create implementation plan for approval. Before any product-code execution, warn user and pause so they can switch model.
