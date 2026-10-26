# Shadcn UI & Tailwind CSS v4 Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul seluruh antarmuka Wayfinder DM Command Center menggunakan Tailwind CSS v4 dan komponen atomik Shadcn UI dengan mempertahankan styling macOS native clean slate dan amber accent.

**Architecture:** Menggunakan `@tailwindcss/vite` untuk build styling native Tailwind v4 yang dikombinasikan dengan token warna CSS variable Wayfinder yang sudah ada. Mengintegrasikan komponen atomik Shadcn berbasis Radix UI (`Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `Slider`, `Input`, `Textarea`) ke seluruh shell navigasi, dashboard vitals, session banner, audio studio, dan compendium drawer.

**Tech Stack:** React 19, Tailwind CSS v4, `@tailwindcss/vite`, Radix UI Primitives, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-10-26-shadcn-ui-overhaul-design.md`

## Global Constraints
- Node >= 22.13.0
- Build tool: Vite 8 + TypeScript 5.9
- Testing: Semua pengujian pada `npm test` dan `npm run check` (`tsc --noEmit`) wajib lulus di setiap task
- Tidak boleh mematahkan state offline-first local storage maupun sinkronisasi Supabase yang ada

## Review Focus
1. Backward-compatibility untuk custom test suite yang mengandalkan class selector legasi tertentu (`.sidebar`, `.tabs`, `.party-status-strip`, `.session-banner`).
2. Slider audio atmosphere tidak boleh merusak kontrol volume web audio / html audio.
3. Modal Dialog Radix harus dapat dibuka/tutup dengan ESC, klik luar, atau tombol close tanpa mengganggu state form input.
4. Rendering Accordion compendium drawer dan floating dice roll overlay tetap responsif dan bebas bug layout.
5. Tailwind CSS v4 tidak boleh merusak layout CSS grid eksisting di dark maupun light mode.

---

### Task 1: Setup Tailwind CSS v4, Path Aliases, and Core Shadcn Utilities

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: `src/style.css`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` di `src/lib/utils.ts`

- [ ] **Step 1: Install runtime & dev dependencies**
Run: `npm install clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-slider @radix-ui/react-tabs && npm install -D tailwindcss @tailwindcss/vite @types/node`
Expected: Dependencies installed successfully

- [ ] **Step 2: Configure path aliases `@/*` and Vite Tailwind plugin**
Update `vite.config.ts` to include `@tailwindcss/vite` plugin and `@` alias to `./src`.
Update `tsconfig.json` to include `"paths": { "@/*": ["./src/*"] }`.

- [ ] **Step 3: Create `components.json` and `src/lib/utils.ts`**
Create `components.json` specifying React, Vite, and CSS variable styling.
Create `src/lib/utils.ts` exporting `cn` helper.

- [ ] **Step 4: Update `src/style.css` to import Tailwind CSS**
Add `@import "tailwindcss";` at top of `src/style.css`.

- [ ] **Step 5: Verify build & tests**
Run: `npm run check && npm test && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json vite.config.ts tsconfig.json components.json src/lib/utils.ts src/style.css
git commit -m "chore: setup tailwindcss v4 and shadcn core utils"
```

---

### Task 2: Implement Atomic Shadcn UI Components

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/slider.tsx`
- Create: `src/components/ui/tabs.tsx`

**Interfaces:**
- Produces: `Button`, `Badge`, `Card`, `Input`, `Textarea`, `Dialog`, `Slider`, `Tabs` primitives in `src/components/ui/*`

- [ ] **Step 1: Create Button and Badge components**
Implement `Button` with CVA variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and `Badge`.

- [ ] **Step 2: Create Card, Input, Textarea, and Slider components**
Implement standard shadcn Card subcomponents (`CardHeader`, `CardTitle`, `CardContent`, etc.), `Input`, `Textarea`, and Radix-based `Slider`.

- [ ] **Step 3: Create Dialog and Tabs components**
Implement Radix-based `Dialog` (`DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, etc.) and `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`).

- [ ] **Step 4: Run typecheck and tests**
Run: `npm run check && npm test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/ui/
git commit -m "feat: add shadcn ui atomic components"
```

---

### Task 3: Migrate Shell Navigasi, Topbar, dan Modal Dialogs

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/theme.css`

**Interfaces:**
- Consumes: `Button`, `Dialog`, `Input`, `Textarea` from `src/components/ui/*`

- [ ] **Step 1: Migrate Topbar and Sidebar Action Buttons to Shadcn `Button`**
Replace `.collapse-sidebar-button`, `.toggle-sidebar-button`, `.theme-toggle`, `.settings-toggle`, and `.new-campaign-button` with `Button` component with appropriate variants.

- [ ] **Step 2: Migrate Workspace Modals to Shadcn `Dialog`**
Refactor modal views ('settings', 'campaign', 'delete-campaign', 'scene', 'source', 'journal') into accessible Shadcn `Dialog` overlays.

- [ ] **Step 3: Run typecheck and tests**
Run: `npm run check && npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/App.tsx src/theme.css
git commit -m "feat: migrate shell navigation, topbar, and dialogs to shadcn"
```

---

### Task 4: Migrate Dashboard Widgets, Party Vitals Bar, & Session Controls

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/CampaignTools.tsx`
- Modify: `src/theme.css`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `Tabs`, `Slider` from `src/components/ui/*`

- [ ] **Step 1: Modernize Session Banner and Party Vitals Bar with `Card` and `Badge`**
Convert `.party-card` items and `.session-banner` to use Shadcn `Card` styling, and `.party-stat` (AC, PP, HP) into Shadcn `Badge`.

- [ ] **Step 2: Refactor Atmosphere Studio Mixers with Shadcn `Slider` and `Button`**
Replace raw HTML `<input type="range">` in the atmosphere studio with Shadcn `Slider`.

- [ ] **Step 3: Run typecheck, tests, and build**
Run: `npm run check && npm test && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/App.tsx src/CampaignTools.tsx src/theme.css
git commit -m "feat: migrate dashboard widgets, vitals, and sliders to shadcn"
```

---

### Task 5: Final Clean-up and Verification

**Files:**
- Modify: `src/theme.css`
- Modify: `src/style.css`

- [ ] **Step 1: Remove redundant legacy CSS rules that are replaced by Tailwind & Shadcn**
- [ ] **Step 2: Full regression test & verification**
Run: `npm run check && npm test && npm run build`
Expected: All suites PASS

- [ ] **Step 3: Final Commit**
```bash
git add src/
git commit -m "chore: finalize shadcn overhaul and clean up legacy styles"
```
