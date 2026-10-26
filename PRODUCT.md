# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dungeon Masters (DMs) running tabletop role-playing games (primarily D&D 5e/2024), both during active live gameplay sessions at the table and during pre-session world-building/preparation.

## Product Purpose

Wayfinder is an offline-first DM Command Center dashboard that minimizes administrative bookkeeping so DMs can focus on storytelling. Success means zero-friction access to party vitals, audio atmosphere, encounter initiative, dice rolling, and rules reference in a single viewport without lag or clutter.

## Positioning

A zero-install, private, local-first command console with procedural soundscape mixing, Spotify-to-YouTube matching, and full D&D SRD compendium tools that runs entirely in the browser with optional peerless cloud sync via Supabase.

## Operating Context

Live table sessions or online voice calls (Discord/Roll20/Foundry companion) on desktop laptops and tablets. Environment requires high contrast, instant keyboard shortcuts (e.g. ⌘K search, Esc to close), and quick tactile dice rolling.

## Capabilities and Constraints

- **Local Storage & Offline-First**: All campaign data (encounters, characters, wiki, notes, roll history) persists in browser local storage and IndexedDB.
- **Atmosphere Studio**: Multi-layer procedural ambience generator (rain, wind, waves, fire) plus dual-deck YouTube audio mixer.
- **Compendium Engine**: Web worker-backed search over XML-imported monsters, spells, items, and rules with instant markdown/stat-block rendering.
- **Combat Tracker**: Real-time initiative order, inline HP manipulation, condition tracking, and encounter balance calculations.
- **Responsive Architecture**: Desktop sidebar transitions to collapsible off-canvas drawer on mobile/tablet screen sizes.

## Brand Commitments

- **Tone & Identity**: Professional macOS native software feel, refined amber/gold accent (#d97706 light, #f59e0b dark) on clean slate surfaces (#090d16 dark, #f8fafc light).
- **Anti-Slop Standard**: No generic AI glows, no bloated card borders, strict WCAG 2.1 AA touch targets (≥44px), and native system typography (`-apple-system`, `SF Pro`).

## Evidence on Hand

- Verified runnable Vite + React 19 codebase with 21 unit/integration test suites passing cleanly.
- Strict typecheck passing via `npm run check`.
- Installed Impeccable CLI v0.1.16 with zero detector anti-pattern warnings.

## Product Principles

1. **Table-Ready Speed**: Every vital action (HP adjustment, dice roll, condition check) must complete in 1-2 clicks with immediate feedback.
2. **Local Ownership**: User data belongs to the user on their machine. Works 100% offline; cloud is strictly an opt-in backup/sync layer.
3. **Calm Precision**: The interface recedes behind the DM's imagination. High information density without visual noise or gratuitous decoration.
