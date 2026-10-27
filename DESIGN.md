---
name: "Planarch DM Command Center"
description: "Precision macOS-native tactical console for tabletop Dungeon Masters"
colors:
  primary: "#f59e0b"
  primary-light: "#d97706"
  neutral-bg: "#090d16"
  neutral-bg-light: "#f8fafc"
  panel-bg: "#0d131f"
  panel-bg-light: "#ffffff"
  card-bg: "#121929"
  card-bg-light: "#ffffff"
  border-line: "#1e293b"
  border-line-light: "#e2e8f0"
  text-main: "#f1f5f9"
  text-main-light: "#0f172a"
  text-muted: "#94a3b8"
  text-muted-light: "#64748b"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  reference:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card-default:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Planarch DM Command Center

## Overview

**Creative North Star: "The Cartographer's Glass Console"**

Planarch balances the dense utility of a tactical flight deck with the quiet refinement of a native macOS utility. It discards decorative fantasy parchment and loud neon sci-fi glows in favor of hairline borders, vibrant translucent sidebars, and restrained amber accents that direct the eye during high-stress table combat.

### Key Characteristics:
- **Restraint Over Spectacle:** Color is reserved strictly for interactive focus, status indicators, and HP danger thresholds.
- **Mac-Native Vibrancy:** Apple System Font hierarchy, subtle panel contrast, and segmented controls.
- **Table-Ready Density:** Compact layout that fits essential combat, atmosphere, and compendium data into the viewport with zero accidental mis-taps (strict ≥44px touch targets).

## Colors

The palette pairs deep slate backgrounds with refined amber/gold accents to deliver dark-mode comfort in dim game rooms and crisp high-contrast legibility in bright rooms.

### Primary
- **Refined Amber** (`#f59e0b` dark / `#d97706` light): Used exclusively for active navigation states, dice results, and key actions.

### Neutral
- **Slate Void** (`#090d16`): Root application background in dark mode.
- **Panel Surface** (`#0d131f` dark / `#ffffff` light): Sidebar and modal dialog backgrounds.
- **Card Surface** (`#121929` dark / `#ffffff` light): Elevated widget containers.
- **Hairline Border** (`#1e293b` dark / `#e2e8f0` light): 1px structural boundary lines.
- **Text Main** (`#f1f5f9` dark / `#0f172a` light): Primary reading text.
- **Text Muted** (`#94a3b8` dark / `#64748b` light): Labels, timestamps, and secondary captions.

### Named Rules
**The Rarity Rule:** Amber accent color is restricted to less than 10% of any single viewport. If everything is amber, nothing is important.

## Typography

**Primary Stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, sans-serif`  
**Reference Body:** `Georgia, "Times New Roman", serif` (exclusive to SRD monster stat blocks and spell compendium cards).

### Hierarchy
- **Display** (Bold 700, 24-28px, line-height 1.2): Module headers and campaign titles.
- **Headline** (Semi-bold 600, 18-20px, line-height 1.25): Encounter names, creature titles.
- **Title** (Semi-bold 600, 14-16px, line-height 1.3): Card headings, section labels.
- **Body** (Regular 400, 13-14px, line-height 1.45): Descriptions, notes, compendium text.
- **Label / Micro** (Medium 500, 10-12px, uppercase, letter-spacing 0.04em): Combat initiative order, metadata badges.

## Layout

- **Shell Architecture:** Fixed header (session banner + party vitals), adaptive collapsible sidebar (off-canvas drawer on ≤900px), and flexible main workspace.
- **Responsive Breakpoint:** Below 900px, sidebar collapses into a drawer with backdrop blur. Touch controls automatically expand to ≥44px minimum hit targets.

## Elevation & Depth

Surfaces rely on tonal layering and hairline borders rather than ambient blur shadows. Depth is achieved via background luminance steps (`--bg` → `--panel` → `--card`).

### Shadow Vocabulary
- **Modal Elevation:** `0 20px 48px -12px rgba(0, 0, 0, 0.5)` for floating dialogs.
- **Focus Ring:** `0 0 0 2px var(--background), 0 0 0 4px #f59e0b` for visible keyboard accessibility.

## Shapes

- **Base Radius:** 8px (`rounded-md` / `rounded-lg`) on buttons, inputs, and segmented controls.
- **Card Radius:** 12px (`rounded-xl`) on main modular panels.
- **Pill Radius:** 9999px on badges and status pills.
- **No Decorative Side Stripes:** Absolutely no `border-left` slop on card edges.

## Components

### Buttons
- **Shape:** 8px radius.
- **Primary:** Amber background with dark text, active scaling `scale(0.98)`.
- **Secondary / Ghost:** Transparent with hairline border or subtle hover fill.
- **Touch Target:** Minimum 44x44px for touch pointers (`pointer: coarse`).

### Cards
- **Structure:** Hairline border (`1px solid var(--line)`), 12px corner radius, internal padding 12-16px.

## Do's and Don'ts

### Do:
- Use CSS variables (`var(--accent)`, `var(--panel)`, etc.) for theme compatibility.
- Ensure all interactive elements include an `aria-label` or accessible text node.
- Guard animations with `@media (prefers-reduced-motion: reduce)`.

### Don't:
- Don't add thick colored left/top card borders (anti-pattern).
- Don't hardcode hex colors in component files.
- Don't allow click targets smaller than 44x44px on mobile/touch viewports.
