# Task 1 Brief: Rebrand Asset Files & Brand Components

## Goal
Rename branding SVGs to `archeron-*`, create `ArcheronBrand.tsx` (replacing `PlanarchBrand.tsx`), update `index.html` title to "Archeron", and update component usages.

## Requirements
1. In `public/branding/`:
   - Rename/copy `planarch-seal-gold.svg` -> `archeron-seal-gold.svg`
   - Rename/copy `planarch-seal-on-ivory.svg` -> `archeron-seal-on-ivory.svg`
   - Rename/copy `planarch-logo-stacked-on-dark.svg` -> `archeron-logo-stacked-on-dark.svg`
   - Rename/copy `planarch-logo-stacked-on-light.svg` -> `archeron-logo-stacked-on-light.svg`
   - Rename/copy `planarch-logo-horizontal-on-dark.svg` -> `archeron-logo-horizontal-on-dark.svg`
   - Rename/copy `planarch-logo-horizontal-on-light.svg` -> `archeron-logo-horizontal-on-light.svg`
   - Keep legacy SVG copies if needed for backwards compatibility or directly provide clean copies.
2. In `index.html`:
   - Change `<title>Planarch</title>` to `<title>Archeron</title>`.
3. In `src/ArcheronBrand.tsx`:
   - Replace `PlanarchBrand.tsx` with `ArcheronBrand.tsx`. Export `ArcheronBrand`.
   - Update image paths to `/branding/archeron-...`.
   - Keep alt text and aria labels aligned to "Archeron".
4. In `src/App.tsx`:
   - Update imports and usage of `PlanarchBrand` to `ArcheronBrand`.
5. In `package.json`:
   - Check if name or title can be updated to "archeron".
6. Do NOT execute shell commands or tests yet without reporting first.
