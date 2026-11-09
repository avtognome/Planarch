# Vercel Fallback, First-Launch Bypass, and Party Vitals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Spotify title metadata fallback to a Vercel Function, allow first-launch visitors to dismiss the campaign modal and persist dismissal across reloads, and make Party Vitals cards responsive and collision-free using the shadcn Card container.

**Architecture:** Create `api/spotify-title.mjs` conforming to Vercel Serverless Function format and remove Netlify assets (`netlify.toml`, `netlify/functions/spotify-title.mjs`). In `src/App.tsx`, introduce persistent onboarding dismissal state (`wf-campaign-modal-dismissed`) so closing the initial modal survives reloads while keeping 'New campaign' actionable. Replace direct Party Vitals container markup with shadcn `Card` and update responsive styling in `src/theme.css` so cards adapt to narrow containers without text/badge collisions.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS / Vanilla CSS, Vercel Serverless Function, Node.js assert tests.

**Spec:** `docs/superpowers/specs/2026-11-09-vercel-onboarding-party-vitals-design.md`

## Global Constraints
- Preserve existing Archeron visual design tokens, gold/amber accents, and dual theme support (light and dark).
- Antislop active: during (session override) - zero decorative emoji, valid WCAG contrast, proper touch targets.
- Retain exact endpoint behavior: `/api/spotify-title?url=...` returning `{ title: string }` or `{ error: string }`.
- Do not create dummy campaign data on dismiss.

## Review Focus
1. Invalid or non-Spotify track URLs passed to `api/spotify-title.mjs` must return HTTP 400 with `{ error: 'Use an individual Spotify track URL.' }`.
2. First-time launch modal dismissal must remain dismissed after page reload even when `campaigns.length === 0`.
3. Escape key and clicking backdrop must dismiss the campaign modal when bypass is enabled.
4. Clicking "+ New campaign" from sidebar must open the campaign modal cleanly even when dismissed previously.
5. Party Vitals cards must not overflow horizontally or collide text with stat badges on narrow viewports/containers down to 280px.

---

### Task 1: Migrate Spotify metadata fallback to Vercel and remove Netlify files

**Files:**
- Create: `api/spotify-title.mjs`
- Test: `tests/vercel-spotify-title.mjs`
- Delete: `netlify.toml`, `netlify/functions/spotify-title.mjs`
- Modify: `README.md`, `SUPABASE_SETUP.md`, `src/App.tsx:1119`

**Interfaces:**
- Consumes: Standard Web `Request` / Node request with `url` search query parameter.
- Produces: JSON response with `{ title }` (200) or `{ error }` (400, 502) and `Cache-Control` header.

- [ ] **Step 1: Write the failing test for Vercel Spotify function**

Write `tests/vercel-spotify-title.mjs` asserting:
1. Rejects invalid protocol or host with status 400 and `{ error: 'Use an individual Spotify track URL.' }`.
2. Rejects non-track paths (e.g. albums/playlists) with status 400.
3. Successfully fetches mock oEmbed and returns 200 with `{ title }`.
4. Handles upstream fetch failure with status 502 and `{ error: 'Spotify title lookup is unavailable.' }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/vercel-spotify-title.mjs`
Expected: FAIL (module `api/spotify-title.mjs` not found).

- [ ] **Step 3: Implement `api/spotify-title.mjs`**

Implement standard Vercel Web API handler:
`export default async function handler(request) { ... }` supporting query string `url`, validating Spotify track format, fetching oEmbed upstream, and returning standard `Response.json(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/vercel-spotify-title.mjs`
Expected: PASS.

- [ ] **Step 5: Clean up Netlify configuration and references**

Delete `netlify.toml` and `netlify/functions/spotify-title.mjs`.
Update `src/App.tsx:1119` settings note to reference Vercel instead of Netlify.
Update `README.md` and `SUPABASE_SETUP.md` references to Netlify.

- [ ] **Step 6: Run existing test suite and verify clean build**

Run: `npm run check && npm test && npm run build`
Expected: All tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add api/spotify-title.mjs tests/vercel-spotify-title.mjs README.md SUPABASE_SETUP.md src/App.tsx
git rm netlify.toml netlify/functions/spotify-title.mjs
git commit -m "feat: migrate spotify fallback from netlify to vercel"
```

---

### Task 2: Allow dismiss and persistent bypass for first-launch campaign modal

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/workflows.mjs`

**Interfaces:**
- Consumes: `useSaved<boolean>('wf-campaign-modal-dismissed', false)`
- Produces: Close button on welcome modal, backdrop close, Escape key listener enabled even if `campaigns.length === 0`.

- [ ] **Step 1: Write the failing test for campaign modal bypass**

In `tests/workflows.mjs`, add tests verifying:
1. When `campaigns.length === 0` and dismissed flag is `false`, initial modal is `'campaign'`.
2. Dismissing modal sets `wf-campaign-modal-dismissed` to `'true'` and modal becomes empty `''`.
3. When `campaigns.length === 0` and dismissed flag is `true`, initial modal is empty `''` on startup.
4. Clicking 'New campaign' still sets modal to `'campaign'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/workflows.mjs`
Expected: FAIL (assertion on bypass and persistence fails).

- [ ] **Step 3: Implement bypass in `src/App.tsx`**

1. Read `useSaved<boolean>('wf-campaign-modal-dismissed', false)`.
2. Initialize modal state: `useState(() => startingCampaigns.length > 0 || isDismissed ? '' : 'campaign')`.
3. Provide close action: closing modal when `campaigns.length === 0` sets dismissed flag to `true`.
4. Allow close button `<button className="modal-close icon-button" ...>` to render always.
5. Update backdrop click and Escape key handler so they work when `campaigns.length === 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/workflows.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx tests/workflows.mjs
git commit -m "feat: allow dismiss and persistent bypass for initial campaign modal"
```

---

### Task 3: Use shadcn Card and responsive layout for Party Vitals

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/theme.css`
- Test: `tests/party-vitals-responsive.mjs`

**Interfaces:**
- Consumes: `Card` from `@/components/ui/card`
- Produces: Responsive party card layout that reflows stats below character info when horizontal space is constrained, eliminating overlapping.

- [ ] **Step 1: Write the failing test for Party Vitals structure and responsive styles**

Create `tests/party-vitals-responsive.mjs` verifying:
1. `src/App.tsx` imports and uses `Card` from `./components/ui/card` for party cards.
2. `src/theme.css` contains flex wrapping / container queries / media rules preventing `.party-card-stats` from overflowing `.party-card`.
3. Minimum card minmax threshold and stat badge sizing are resilient.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/party-vitals-responsive.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `src/App.tsx` to use shadcn Card**

Import `{ Card } from './components/ui/card'` and wrap each party member in `<Card className="party-card">...` while preserving character avatar, name/role, and stat badges.

- [ ] **Step 4: Update `src/theme.css` for responsive and adaptive cards**

Update `.party-cards-grid` and `.party-card`:
1. Make `.party-card` flex with wrap or dynamic reflow (`flex-wrap: wrap; justify-content: space-between`).
2. Set `.party-card-info` to flexible basis with truncation.
3. Ensure `.party-card-stats` wraps cleanly without overlapping text or breaking out of container.
4. Keep light and dark theme contrast compliant.

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/party-vitals-responsive.mjs`
Expected: PASS.

- [ ] **Step 6: Run full verification suite**

Run: `npm run check && npm test && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/theme.css tests/party-vitals-responsive.mjs
git commit -m "fix: use shadcn Card and responsive adaptive styling for party vitals"
```

---

### Task 4: Visual & Responsive Verification and Delivery Gate

**Files:**
- Verify: Full visual check in browser across themes (light, dark) and screen widths (320px, 768px, 1280px).

- [ ] **Step 1: Start dev server or inspect build**
Run: `npm run build`
Verify dist output.

- [ ] **Step 2: Delivery Gate check**
Verify Antislop C-1 to C-5 and R-01 to R-38 criteria.
Run all tests: `npm test`.

- [ ] **Step 3: Final commit and push**
Push branch to `origin/master`.
