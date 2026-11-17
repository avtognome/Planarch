# Scene Library and Reference Modals Design

## Intent

Make scene management complete without crowding Atmosphere Studio, correct three palette/layout regressions, and keep encounter context visible while reading compendium references.

## Goals

- Add, edit, and remove scenes from Scene Library.
- Keep bundled scenes recoverable.
- Fix Scene Library selected-filter color, Compendium Spells search alignment, and Party Vitals shield color.
- Show Live Encounter Quick Reference and Encounter statblocks in centered modals.
- Reuse existing compendium loading and statblock renderers.

## Non-goals

- No separate Scene Manager screen.
- No scene reordering.
- No new dependency.
- No duplicate statblock renderer.

## Chosen Approach

Shared scene form plus shared compendium reference modal.

Alternatives rejected:

- Inline scene editing crowds cards and breaks narrow layouts.
- Dedicated Scene Manager adds unnecessary navigation and code for current library size.

## Scene Library

### Identity and persistence

Add stable scene IDs. Bundled scenes receive deterministic IDs; legacy custom scenes missing IDs receive generated IDs during migration. Selection and mutations use IDs instead of names or mutable array indexes where practical.

### Add

An `Add scene` control in Scene Library opens one scene form modal. Fields:

- Name
- Category: Exploration, Roleplay, Tension, Combat
- Description
- Current ambience layer values

Saving creates a custom scene and activates it. Blank names and duplicate names are rejected with visible validation.

### Edit

Each scene card exposes an accessible Edit action.

- Custom scene: update existing record in place.
- Bundled scene: create a custom copy with edited values, hide bundled original, and activate custom copy.
- Provider source and existing layer values remain attached unless changed by form fields.

### Remove and restore

Each scene card exposes Remove.

- Custom scene: confirmation modal, then permanent removal.
- Bundled scene: hide it from library.
- `Restore defaults` appears when bundled scenes are hidden and restores all hidden bundled scenes.
- Active selection moves to a valid remaining scene after removal.

Bulk selection remains supported but uses stable IDs.

## Palette and Layout Corrections

- `.scene-filters .selected` uses `var(--panel-alt)`, `var(--line-strong)` or active theme tokens, and `var(--text)` rather than legacy warm-charcoal hex values.
- `.party-strip-heading .inline svg` uses `var(--accent)` rather than hardcoded amber.
- Compendium Spells search row gives the input `flex:1; min-width:0; width:auto`, and filter grid tracks use `minmax(0,...)` so icon, gap, and input fit without clipping.

## Shared Compendium Reference Modal

Adapt existing `CompendiumDrawer` loading and rendering into a centered modal shell matching `CompendiumSpellModal`.

### Consumers

- Live Encounter Quick Reference.
- Encounter page `Read compendium statblock` button.

Both remain on their current page while modal is open.

### Loading order

1. Campaign homebrew record matching focused ID.
2. Local compendium record.
3. Cloud compendium record.

Focused statblocks do not depend on metadata index membership.

### Rendering

Reuse exported `MonsterStatBlock` and `ReferenceStatBlock`. No duplicate statblock markup.

### Accessibility

- Inner element owns `role="dialog"`, `aria-modal="true"`, and descriptive label.
- Close button and backdrop close.
- Escape closes.
- Focus moves into modal and returns to trigger.
- Modal content reflows on narrow screens without horizontal overflow.
- Encounter statblock trigger gains an accessible label.

## Validation

Targeted tests cover:

- Add custom scene.
- Edit custom scene.
- Edit bundled scene creates custom copy and hides original.
- Remove custom scene after confirmation.
- Hide and restore bundled scenes.
- Stable selection after mutation.
- Palette selectors use theme tokens.
- Spell search sizing rules.
- Live Encounter reference opens centered modal.
- Encounter statblock opens modal without page navigation.
- Campaign homebrew reference loads in modal.
- Escape and close controls dismiss modal.

Full verification runs `npm.cmd test`, `npm.cmd run check`, and `npm.cmd run build`.
