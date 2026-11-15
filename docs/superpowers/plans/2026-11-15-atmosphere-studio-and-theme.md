# Atmosphere Studio & Theme Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Atmosphere Studio layout/controls with shadcn components (campaign eyebrow, collapsible Live Mixer, relocated Music channel slider, top-right Music sources actions, full-width description, custom local audio player, prominent Stop all button) and swap theme colors to Slate Dark + Alabaster Light.

**Architecture:** Update palette definitions in `src/palettes.ts` and root token blocks in `src/theme.css` so dark mode uses Slate/Charcoal and light mode uses Alabaster/White. Make `src/components/ui/slider.tsx` SSR/TestRenderer-safe while retaining shadcn track/thumb styling, and update `src/App.tsx` + `src/style.css` + `src/theme.css` for the Atmosphere Studio layout changes.

**Tech Stack:** React 19, TypeScript, CSS custom properties, shadcn UI (`Button`, `Slider`, `Card`).

## Global Constraints
- `tests/typography.mjs`: No CSS `font-size` below `13px`, only `font-weight: 400` or `600`.
- `tests/strict-palette-css.mjs`: No hardcoded `#hex` inside `.theme-light` or `.theme-dark` rules outside the root `.theme-light` and `.theme-dark` token definitions.
- `react-test-renderer` compatibility: All UI components rendered in `App.tsx` must work without DOM `ResizeObserver`.

---

### Task 1: Theme Color Swap & New Alabaster Light Theme
**Files:**
- Modify: `src/palettes.ts`
- Modify: `src/theme.css`
- Test: `tests/palettes.mjs`, `tests/palettes-ui.mjs`, `tests/strict-palette-css.mjs`

- [ ] **Step 1: Update `src/palettes.ts` dark and light palette definitions**
- [ ] **Step 2: Update `.theme-dark`, `.theme-charcoal`, `.theme-light`, and `.theme-charcoal-light` root tokens in `src/theme.css`**
- [ ] **Step 3: Verify palette tests pass**

### Task 2: Atmosphere Studio UI & Shadcn Local Audio Player
**Files:**
- Modify: `src/components/ui/slider.tsx`
- Modify: `src/App.tsx`
- Modify: `src/style.css`
- Modify: `src/theme.css`
- Modify: `tests/section-page-headers.mjs`
- Modify: `tests/studio-layers-and-dock.mjs`

- [ ] **Step 1: Make `src/components/ui/slider.tsx` compatible with `react-test-renderer` and native range props**
- [ ] **Step 2: Update `src/App.tsx` Atmosphere Studio eyebrow, collapsible Live Mixer, Music sources top-right buttons, Music channel volume slider relocation, custom local audio player, and prominent Stop all button**
- [ ] **Step 3: Update `src/style.css` and `src/theme.css` for full-width `.source-panel p`, `.studio-grid.mixer-collapsed`, and custom audio player styling**
- [ ] **Step 4: Update `tests/section-page-headers.mjs` and `tests/studio-layers-and-dock.mjs` to assert the new behavior**
- [ ] **Step 5: Run full test suite (`npm.cmd test`), typecheck (`npm.cmd run check`), and build (`npm.cmd run build`)**
