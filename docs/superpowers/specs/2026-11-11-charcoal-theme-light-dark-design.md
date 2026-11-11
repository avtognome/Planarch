# Design: Charcoal Dark/Light Mode, Compact Character Sheet Icons, and Color Polish

## Intent
Focus the entire theme system solely on Charcoal (dark mode by default, inverted clean light mode switchable in the topbar). Improve Character Sheet health visualization (lighter HP progress bar track/fill and lighter heal button container), replace verbose HP labels/buttons with compact icons, and remove all blue/slate fonts in favor of crisp white.

## Approaches Considered
1. **Multi-theme support + binary toggle**: Keep old 5 palettes and add light variants.
   - *Rejected*: User explicitly requested to keep only Charcoal and remove any other theme.
2. **Dedicated Charcoal Dark/Light Switch (Topbar Only)**:
   - *Chosen*: Topbar Sun/Moon icon toggle switching between Charcoal Dark (`#101010` canvas, `#272727` surface, `#393939` elevated, `#f2f2f2` text) and Charcoal Light (`#f2f2f2` canvas, `#e5e5e5` surface, `#d4d4d4` elevated, `#101010` text).
   - Character Sheet: replace HP Current, Max, Temp labels and Damage/Heal button text with compact Lucide icons (`Heart`, `Shield`, `Sparkles`, `Flame` / `Minus`, `Plus` / `Cross`).
   - Health progress bar made lighter (`#4ade80` / high contrast chalk green or bright charcoal contrast).
   - Heal button container / button given lighter elevated panel background so it stands out from the card background.
   - All `#94a3b8`, `#cbd5e1`, link blue, and slate font values adjusted to clean white `#f2f2f2` or `#ffffff` in dark mode.

## Implementation Parts
1. `src/palettes.ts`:
   - Keep only `charcoal` (with mode support or a 2-mode entry).
   - Default palette: `charcoal` (dark mode).
2. `src/theme.css`:
   - Define `.theme-charcoal.theme-dark` and `.theme-charcoal.theme-light`.
   - Update `.char-hp-bar-track` and `.char-hp-bar-fill` to lighter, clearer values.
   - Update `.char-heal-btn` and `.char-hp-actions` with lighter container/button styling.
   - Override all slate/blue colors (`#94a3b8`, `#cbd5e1`, etc.) to white `#f2f2f2` / `#ffffff`.
3. `src/CharacterSheet.tsx`:
   - Replace HP labels "Current", "Max", "Temp" with compact icons + tooltip/aria-label.
   - Replace "Damage" and "Heal" buttons with compact action icons (`Minus`/`Swords` and `Plus`/`HeartPulse`).
4. `src/App.tsx`:
   - Add topbar Light/Dark toggle button with `Sun` and `Moon` icons.
   - Remove palette picker modal elements for deleted themes; only Charcoal is active.
5. Tests:
   - Update `tests/palettes.mjs`, `tests/palettes-ui.mjs`, and `tests/strict-palette-css.mjs` to match Charcoal dark/light.
