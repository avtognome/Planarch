# Implementation Plan: Charcoal Dark/Light, Compact Icons, and Character Sheet Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip all palettes down to Charcoal only, implement a dedicated topbar Light/Dark toggle (Charcoal Dark as default, Charcoal Light as inverted crisp theme), polish Character Sheet HP progress bar track/fill to lighter tones, elevate the Heal button container so it stands out, replace HP text labels/buttons with compact icons, and convert all blue/slate fonts to crisp white in dark mode.

**Architecture:** 
- `src/palettes.ts`: Retain solely the `charcoal` palette with dark/light variants or resolution to Charcoal dark/light, eliminating the other 4 palettes (`black-stallion`, `space-cadet`, `ceres`, `twinkle`).
- `src/theme.css`: Implement `.theme-charcoal.theme-dark` and `.theme-charcoal.theme-light`, replace dark mode blue/slate `#94a3b8` / `#cbd5e1` colors with white `#f2f2f2`, style HP progress bar with lighter track and bright fill, style `.char-hp-actions` with an elevated background card.
- `src/CharacterSheet.tsx`: Replace Current, Max, Temp with compact Lucide icons (`Heart`, `Shield`, `Sparkles`), and replace Damage and Heal button text with compact action icons (`Minus`/`Swords`, `Plus`/`HeartPulse`).
- `src/App.tsx`: Add a dedicated topbar theme toggle button with `Sun` and `Moon` icons next to Settings.

**Tech Stack:** React 19, TypeScript, Lucide React icons, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-11-charcoal-theme-light-dark-design.md`

## Global Constraints
- Only `charcoal` theme exists.
- Default theme mode is Dark Charcoal (`#101010` canvas, `#272727` surface, `#393939` elevated).
- Inverted light mode is Light Charcoal (`#f2f2f2` canvas, `#e5e5e5` surface, `#d4d4d4` elevated, `#101010` text).
- Topbar only holds the Light/Dark mode switch.
- No em dashes in code or CSS.
- Keep all unit and UI test suites passing.

---

### Task 1: Update Palettes Definition to Charcoal Only (Dark and Light)
**Files:**
- Modify: `src/palettes.ts`
- Test: `tests/palettes.mjs`

- [x] **Step 1: Update `tests/palettes.mjs` for Charcoal only**
Expect `PALETTES` length 1 (or 2 for dark/light), fallback resolves to `charcoal`, other IDs removed.

- [x] **Step 2: Update `src/palettes.ts`**
Keep only `charcoal` in `PALETTES`. Default resolution always returns `charcoal`.

- [x] **Step 3: Run `node tests/palettes.mjs`**
Verify passes.

### Task 2: CSS Styles for Charcoal Light & Dark, Lighter HP Bar, Lighter Heal Container, White Fonts
**Files:**
- Modify: `src/theme.css`
- Test: `tests/strict-palette-css.mjs`

- [x] **Step 1: Update `tests/strict-palette-css.mjs`**
Palettes array only contains `charcoal`.

- [x] **Step 2: Edit `src/theme.css`**
- Remove `.theme-black-stallion`, `.theme-space-cadet`, `.theme-ceres`, `.theme-twinkle`.
- Add `.theme-charcoal.theme-dark` and `.theme-charcoal.theme-light`.
- Make `.char-hp-bar-track` lighter (`#393939` in dark) and `.char-hp-bar-fill` lighter/brighter (`#4ade80`).
- Make `.char-hp-actions` use an elevated background (`background: var(--panel); border: 1px solid var(--line-strong); padding: 4px; border-radius: 6px;`).
- Replace `#94a3b8` and `#cbd5e1` with `#f2f2f2` / `#ffffff` in dark contexts.

- [x] **Step 3: Run `node --test tests/strict-palette-css.mjs`**
Verify passes.

### Task 3: Character Sheet Compact Icons
**Files:**
- Modify: `src/CharacterSheet.tsx`

- [x] **Step 1: Replace text in HP subboxes with compact Lucide icons**
- Replace "Current" label with `<Heart size={11} title="Current HP" />` or tooltip icon.
- Replace "Max" label with `<Shield size={11} title="Max HP" />`.
- Replace "Temp" label with `<Sparkles size={11} title="Temporary HP" />`.
- Replace "Damage" button text with `<Minus size={14} />` (or `<Flame size={14} />`) with `aria-label="Damage"`.
- Replace "Heal" button text with `<Plus size={14} />` with `aria-label="Heal"`.

- [x] **Step 2: Run `npm.cmd run check`**
Verify TypeScript types pass.

### Task 4: App Topbar Light/Dark Switch & Clean Up Settings Modal
**Files:**
- Modify: `src/App.tsx`
- Test: `tests/palettes-ui.mjs`

- [x] **Step 1: Update `src/App.tsx`**
- Add topbar theme toggle button with `Sun` (when dark) / `Moon` (when light) next to Settings icon button.
- Toggle between dark and light modes.
- Remove multi-palette selector from Settings modal or simplify to dark/light toggle.

- [x] **Step 2: Update `tests/palettes-ui.mjs`**
Test topbar toggle button toggling dark/light, default being charcoal dark.

- [x] **Step 3: Run test suite**
Run `node tests/palettes-ui.mjs`, `npm.cmd test`, `npm.cmd run check`, `npm.cmd run build`.

### Task 5: Final Verification and Git Push
- [x] **Step 1: Verify all tests clean**
- [ ] **Step 2: Commit and push to master**
