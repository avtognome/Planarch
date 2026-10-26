# Spec: Full App UI Overhaul Menggunakan Shadcn UI & Tailwind CSS v4

- **Status**: Approved by User
- **Tanggal**: 2026-10-26
- **Lingkup**: Full App Overhaul (DM Dashboard Wayfinder)

---

## 1. Tujuan
Memodernisasi seluruh antarmuka Wayfinder menggunakan komponen resmi Shadcn UI dan Tailwind CSS v4, mempertahankan tema macOS Native / Clean Slate & Refined Amber, tanpa merusak fungsionalitas offline-first, audio persistence, session combat, maupun compendium reader.

---

## 2. Arsitektur & Fondasi
1. **Tailwind CSS v4 Integration**:
   - Integrasi langsung via `@tailwindcss/vite`.
   - Setup styling root dengan `@import "tailwindcss";` dan `@theme` mapping CSS variables yang kompatibel dengan tema light/dark yang ada.
2. **Shadcn Primitives & Utility**:
   - `src/lib/utils.ts` menyediakan helper standar `cn()` (`clsx` + `tailwind-merge`).
   - `components.json` dikonfigurasi untuk proyek React + Vite.
   - Pustaka pendukung: `class-variance-authority`, `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-tabs`, `@radix-ui/react-slot`.

---

## 3. Komponen Shadcn yang Digunakan
1. **Button** (`src/components/ui/button.tsx`):
   - Variant: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
   - Menggantikan tombol `.primary`, `.secondary`, `.session-action-btn`, `.icon-button`.
2. **Badge** (`src/components/ui/badge.tsx`):
   - Menggantikan status chips, `.session-pill`, `.combat-chip`, `.badge`.
3. **Card** (`src/components/ui/card.tsx`):
   - Digunakan untuk `.widget`, `.scene-card`, `.party-card`.
4. **Dialog** (`src/components/ui/dialog.tsx`):
   - Menggantikan modal manual: Settings, New Campaign, Delete Campaign, Session Notes, Add Provider Source.
5. **Tabs** (`src/components/ui/tabs.tsx`):
   - Menggantikan tab bar manual di Workspace, Compendium, dan Encounters.
6. **Slider** (`src/components/ui/slider.tsx`):
   - Menggantikan native HTML range slider untuk volume audio layers, music channel, dan master atmosphere.
7. **Input & Textarea** (`src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`):
   - Form controls berstandar accessible shadcn.

---

## 4. Langkah Migrasi & Tahapan Implementasi
- **Tahap 1**: Install dependensi (`@tailwindcss/vite`, `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-tabs`).
- **Tahap 2**: Update `vite.config.ts`, `tsconfig.json` (alias `@/*`), dan root CSS file. Buat `components.json` dan `src/lib/utils.ts`.
- **Tahap 3**: Buat komponen atomik shadcn di `src/components/ui/`.
- **Tahap 4**: Migrasi Shell Navigasi: Topbar, Sidebar, Modal Dialogs (Settings, Campaign).
- **Tahap 5**: Migrasi Dashboard Vitals, Widgets, Session Banner, Controls.
- **Tahap 6**: Migrasi Audio Atmosphere Console, Encounters, Wiki, dan Compendium.
- **Tahap 7**: Verifikasi menyeluruh (`npm run check`, `npm test`, `npm run build`).
