# Full Technical Polish & Audit Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all P1, P2, and P3 findings from the Impeccable Technical Quality Audit to achieve a pristine audit score (>18/20) while preserving existing test passes and functionality.

**Architecture:** Address WCAG 2.1 AA touch target violations, add missing accessibility labels across form controls and media players, eliminate legacy `border-left` AI-slop side-tabs, add `prefers-reduced-motion` guards to animations, and polish focus rings.

**Tech Stack:** React 19, Tailwind CSS v4, Radix UI Primitives, CSS Variables.

## Global Constraints
- Node >= 22.13.0
- Build tool: Vite 8 + TypeScript 5.9
- Testing: `npm run check`, `npm test`, `npm run build` MUST remain 100% green at every step
- Zero regression on local storage persistence or Supabase sync

---

### Task 1: Fix P1 Touch Targets (< 44x44px) across Mobile/Tablet UI
- Increase hit zones of compact controls (`.collapse-sidebar-button`, `.toggle-sidebar-button`, `.theme-toggle`, `.settings-toggle`, `.new-campaign-button`, `.delete-campaign-button`, `.quick-roll-close`, `.party-manage-btn`) to ensure minimum 44px tap targets on touch devices or via pseudo-padding.

### Task 2: Fix P1 Form Accessibility & Missing Aria Labels
- Add explicit `aria-label` or accessible names to:
  - Audio element `#local-audio` (`aria-label="Local procedural audio player"`)
  - Provider & file input controls in `src/SourcePicker.tsx`
  - Modal inputs and compendium search inputs lacking explicit aria associations.

### Task 3: Remove P1 Visual Slop (Side-Tab Borders)
- Remove `border-left: 2px solid #d97706` in `src/theme.css:15`
- Replace heavy `border-left: 2px solid #b99b6b` and `border-left: 4px solid #7b251d` in `src/style.css:17` with subtle borders/tinting.
- Remove `.scene-card.chosen` left-stripe box-shadow (`box-shadow: inset 3px 0 0 ...`).

### Task 4: Fix P2 & P3 (Reduced Motion, Focus Rings, and Token Cleanups)
- Add `@media (prefers-reduced-motion: reduce)` rules for dice rolls, quick roll overlay, and footer animations.
- Refine button focus rings in `src/components/ui/button.tsx` to high-contrast `ring-2 ring-amber-500 ring-offset-2`.
- Verify everything with `npm run check && npm test && npm run build` and run Impeccable detector.
