# Character sheet composition

## Intent
Make Character Sheet easier for a DM to scan and edit during play. Current seven open stacked sections place small inputs and actions in competing boxes; Gnome identified composition and button/form placement across whole sheet as main friction.

## Goals and boundaries
- Name, class, level, HP, AC, and active conditions should be quick to find; fields remain directly editable.
- Use focused two-column composition: combat and abilities primary; skills and senses alongside; short reference panels where room allows. Resource, inventory, and spell lists get full width below. Stack columns when sheet viewport is narrow.
- Place related controls together: HP with damage/heal, conditions with Add, resources with their count controls, rests near combat recovery. Maintain visible labels, keyboard access, light/dark themes, and existing persistence/character rules.
- Scope: `CharacterSheet.tsx` and sheet styles in `src/theme.css`, with existing character-sheet tests. Do not alter surrounding character list, profile tab, data schema, or rules. No new edit mode or dependency.

## Approaches
- Reflow existing sections only: smallest diff, but scattered control placement remains. Rejected.
- Reflow and regroup related controls: chosen by Gnome; addresses layout and action placement while preserving direct edits.
- Separate read/edit modes: rejected because Gnome wants always-editable fields.

## Builder discretion
Exact column ratio, which short reference groups occupy remaining right-column space, and responsive threshold follow actual available editor width rather than viewport width. Avoid squeezing long forms into columns. No new assets.
