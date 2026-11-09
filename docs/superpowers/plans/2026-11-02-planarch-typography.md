# Planarch Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make whole app readable at table distance with one offline IBM Plex Sans face and four consistent type roles.

**Architecture:** Local 400/600 font files and CSS variables define type system. Migrate existing selectors in cascade order (`style.css`, `features.css`, `theme.css`) by semantic role; avoid blanket overrides. Preserve existing components and behavior; adjust cramped layouts only where new text causes overflow.

**Tech Stack:** React 19, Vite 8, CSS, Node tests, Playwright/browser inspection if available.

**Spec:** `docs/superpowers/specs/2026-11-02-planarch-typography-design.md`

## Global Constraints

- Whole app: shell, dashboard, combat, dice, atmosphere, character sheets, forms, dialogs, wiki, compendium.
- One locally bundled IBM Plex Sans family including reference cards and roll history; system sans fallback; no runtime font network requests. Keep license attribution with font assets.
- Only 400/600 weights. Four roles: page 22px/600, section 17px/600, body/control 14px/400 or 600, secondary 13px/400 or 600. Critical HP/initiative/dice totals may exceed 22px.
- Every visible word and number at least 13px; retain 44px touch targets on coarse pointers; wrap and grow narrow rows.
- No changes to persisted data, rules, routes, behavior, or copy. Keep palette colors and visual identity.
- Before any product-code execution, warn user and pause for model change. Do not start Task 1 without explicit go-ahead after this plan's review.
- Existing working tree has unrelated changes. Inspect diff before edits; commit only task-owned paths/hunks and never discard unrelated work.

## Review Focus

- Offline cold load: font resolves from local assets, no external request, readable fallback before load (Task 1 test).
- Long character/monster names at narrow widths: no clipping or horizontal overflow (Task 3 browser check).
- 200% zoom and mobile: labels wrap, controls remain reachable and coarse-pointer targets remain at least 44px (Task 3 browser check).
- Theme variants: text and focus retain WCAG AA contrast in light/dark and each shipped palette (Task 3 browser check).
- Narrow combat/character panels with 13px labels: values remain readable, no nested scrolling (Task 2 and 3 browser checks).

## File map

- `public/fonts/`: licensed IBM Plex Sans Latin WOFF2 regular and semibold plus upstream license/attribution, only if verified source and license available.
- `src/style.css`: base font declaration, type role tokens, old base and reference typography.
- `src/features.css`: feature-level typography, cramped layouts.
- `src/theme.css`: palette/theme typography, combat and character sheet overrides. Last-loaded CSS wins; check precedence before editing.
- `DESIGN.md`: replace old typeface and scale direction with approved system, without changing other brand fields.
- `tests/typography.mjs`: one runnable source/build regression check, using Node stdlib assertions; test task-owned invariants without mistaking CSS text for computed browser styles.
- Other CSS/TSX files: touch only if inspection reveals actual visible font or size overrides; record reason in task commit.

### Task 1: Local face and base roles

**Files:** Create `public/fonts/` IBM Plex Sans 400/600 WOFF2 files and upstream license; modify `src/style.css`, `DESIGN.md`; create `tests/typography.mjs`.

**Interfaces:** Produces `--font-ui` and `--type-page`, `--type-section`, `--type-body`, `--type-label` on `:root`, consumed in Tasks 2–3; font uses `font-display: swap` with system sans fallback.

- [ ] **Step 1: Inspect source, licensing, existing font declarations, and working-tree diffs.** Obtain IBM Plex Sans Latin regular/semibold WOFF2 from official licensed source; if unavailable or license unclear, stop and ask user. Do not use Google Fonts runtime import.
- [ ] **Step 2: Write failing `tests/typography.mjs` assertions.** Verify two local files exist, license exists, CSS contains two `@font-face` declarations with weights 400/600 and `font-display: swap`, no `@import`/remote URL, four tokens with exact 22/17/14/13px values, and `DESIGN.md` names IBM Plex Sans only for visible UI/reference text.
- [ ] **Step 3: Run `node tests/typography.mjs`.** Expect failure before assets/tokens exist.
- [ ] **Step 4: Add local font files, license, `@font-face`, shared tokens, base inheritance/fallback; update `DESIGN.md`.** Use 400/600; avoid faux 500/700. Preserve original palette and non-type design guidance.
- [ ] **Step 5: Run `node tests/typography.mjs` and `cmd.exe /c "npm run build"`.** Expect pass; inspect `dist` for both fonts and absence of external font URL.
- [ ] **Step 6: Commit only Task 1 changes.** `git add -- public/fonts src/style.css DESIGN.md tests/typography.mjs`, then `git commit -m "style: define offline Planarch typography"`; if `src/style.css` or `DESIGN.md` had unrelated edits, stage only owned hunks.

### Task 2: Map existing UI typography by role

**Files:** Modify `src/style.css`, `src/features.css`, `src/theme.css`, `tests/typography.mjs`; any additional files only when audit finds live inline styles.

**Interfaces:** Consumes Task 1 tokens; no component API changes. Existing large combat totals remain exceptional numeric displays, using same family and weight 600.

- [ ] **Step 1: Inventory selectors and precedence.** Inspect all live `font-family`, `font-size`, `font-weight`, `font:` shorthands, inline styles, `!important` theme overrides, and pseudo-element text in imported CSS and TSX; distinguish visible text from icon glyphs and hidden elements. Preserve unrelated changes already in files.
- [ ] **Step 2: Extend failing test.** Assert imported styles contain no live Georgia/Manrope/monospace/system-specific family declarations outside fallback, no visible literal font-size below 13px (account for one-line/minified rules and shorthands), and no explicit weights other than 400/600; review false positives manually rather than weakening rule silently.
- [ ] **Step 3: Run `node tests/typography.mjs`.** Expect failure on existing 7–11px values and family overrides.
- [ ] **Step 4: Migrate typography in cascade order.** Use roles by purpose: page headings 22, section headings 17, readable controls/prose 14, secondary labels 13. Replace `font:` shorthands and later theme overrides as needed; maintain large HP/dice/initiative totals and tabular numerals. Trim decorative padding where safe; do not globally scale layout or add extra roles.
- [ ] **Step 5: Run `node tests/typography.mjs`, `cmd.exe /c "npm run check"`, and `cmd.exe /c "npm test"`.** Expect pass; inspect generated CSS for remote font URLs and unexpected weights.
- [ ] **Step 6: Commit only owned hunks/files.** `git commit -m "style: unify Planarch type roles"` after selective staging; leave unrelated working tree intact.

### Task 3: Rendered stress pass and verification

**Files:** Modify only affected CSS selectors in `src/style.css`, `src/features.css`, `src/theme.css`; update `tests/typography.mjs` for reproducible regressions if needed.

**Interfaces:** Consumes Tasks 1–2 role tokens; no new APIs.

- [ ] **Step 1: Run app and inspect computed styles.** Check desktop/tablet/phone widths, 200% zoom, long names, empty fields, compendium prose, combat/character panels, light/dark and every palette, keyboard focus, and coarse-pointer simulation. Record actual computed font families/sizes/weights and overflow/contrast results, not visual guesses.
- [ ] **Step 2: Add failing regression assertions for any reproducible CSS defects found.** Pin selector and expected role or layout behavior in `tests/typography.mjs`; for browser-only failures, document viewport and element reproduction before editing.
- [ ] **Step 3: Fix only observed issues.** Prefer reducing decoration and letting rows wrap/grow; preserve 44px coarse-pointer targets, reading measure, controls, data, and 13px floor. Recheck each affected viewport and theme.
- [ ] **Step 4: Run final verification.** `node tests/typography.mjs`, `cmd.exe /c "npm test"`, `cmd.exe /c "npm run check"`, `cmd.exe /c "npm run build"`, and `.opencode/skills/impeccable/scripts/impeccable.cmd detect --json --scope type src`. Confirm no unexplained findings; record pre-existing unrelated warnings separately.
- [ ] **Step 5: Commit only Task 3 changes.** `git commit -m "style: harden typography across viewports"` if changes exist; otherwise no empty commit. Provide brief evidence with tested viewports, computed font results, controls, palette contrast, and build/test outcomes.
