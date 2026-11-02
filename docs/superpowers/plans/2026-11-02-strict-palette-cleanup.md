# Strict Palette Variable Elimination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded CSS colors in `src/theme.css` and `src/features.css`, binding buttons, inputs, sidebars, modals, and status indicators strictly to active palette CSS variables (`--bg`, `--panel`, `--panel-alt`, `--line`, `--text`, `--muted`, `--accent`, `--secondary`, etc.).

**Architecture:** 
1. Expand CSS root token definitions in `src/theme.css` to define semantic variables for status indicators (`--status-green`, `--status-yellow`, `--status-red`, `--status-green-glow`, etc.) that derive from each palette's accent/secondary/muted tokens.
2. Refactor `.theme-light` and `.theme-dark` blocks in `src/theme.css` and `src/features.css`: replace hardcoded hex values (`#ffffff`, `#1c1917`, `#57534e`, `#d97706`, `#f59e0b`, `#ef4444`, etc.) with `var(--...)` tokens.
3. Eliminate hardcoded colors in floating dice tray, campaign actions, balance panels, and wiki media previews.

**Tech Stack:** CSS3 Custom Properties, Node.js unit tests.

**Spec:** User interview requirements:
- CSS Theme Variables: convert legacy `.theme-light` / `.theme-dark` overrides into dynamic palette CSS variables.
- Strict Palette Everywhere: map status indicators (HP, death saves, sync dot) to palette tokens.

## Global Constraints
- No em dashes in copy or comments.
- Zero hardcoded hex values in `.theme-light` / `.theme-dark` rule declarations in `src/theme.css` and `src/features.css` (except palette definitions themselves in `.theme-<palette>`).
- All 21 test suites (`npm test`), `npm run check`, and `npm run build` must pass.

---

### Task 1: Semantic Variable Mapping & Automated Style Audit Test

**Files:**
- Create: `tests/strict-palette-css.mjs`
- Modify: `src/theme.css:1-40`

- [ ] **Step 1: Write test checking for hardcoded hex in legacy theme override blocks**
- [ ] **Step 2: Run test and observe failures**
- [ ] **Step 3: Define semantic CSS variables in `.theme-<palette>` declarations in `src/theme.css`**
- [ ] **Step 4: Verify test passes**
- [ ] **Step 5: Commit**

### Task 2: Refactor `src/theme.css` Component Styles to Use Variables

**Files:**
- Modify: `src/theme.css:40-200`
- Test: `tests/strict-palette-css.mjs`

- [ ] **Step 1: Replace all hardcoded hex in `src/theme.css` (.sidebar, .topbar, .brand-mark, .campaign-switch, nav button, input, .tabs, .session-banner, .sync-status-*) with CSS variables**
- [ ] **Step 2: Run `tests/strict-palette-css.mjs`**
- [ ] **Step 3: Verify all tests in `npm test` pass**
- [ ] **Step 4: Commit**

### Task 3: Refactor `src/features.css` Hardcoded Overrides

**Files:**
- Modify: `src/features.css`
- Test: `tests/strict-palette-css.mjs`

- [ ] **Step 1: Replace hardcoded colors in `.campaign-actions`, `.delete-campaign-button`, `.balance-budgets`, `.wiki-image-card`, and `.theme-light .floating-dice-tray` with `var(--line)`, `var(--panel)`, `var(--accent)`, `var(--text)`, `var(--muted)`**
- [ ] **Step 2: Run `node tests/strict-palette-css.mjs` and `npm test`**
- [ ] **Step 3: Commit**

### Task 4: Whole-Branch Build and Verification

**Files:**
- Verify: `npm test`, `npm run check`, `npm run build`

- [ ] **Step 1: Run full test suite, typecheck, and Vite production build**
- [ ] **Step 2: Verify zero regression in palette switching across all 8 themes**
