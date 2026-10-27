# PLANARCH — OpenCode Brand Implementation Brief

> **Task type:** Implement an approved visual brand identity into an existing, functioning digital Dungeon Master Screen web application.  
> **Project:** Planarch  
> **Brand direction:** Royal Compass / The Cartographer's Seal  
> **Priority:** Non-destructive integration. Keep the application working.

## 0. Agent instructions — read first

You are an experienced frontend engineer and visual identity implementer working in an existing repository. **Inspect the project before making changes.** This is an implementation brief, **not** permission to rebuild Planarch or replace its design architecture.

1. Identify the framework (React, Vite, Next.js, etc.), app entry point, route/layout structure, global styles, current logo/header/sidebar components, theme handling, favicon metadata, and existing PWA config if present.
2. Follow established project conventions for components, asset paths, import aliases, CSS/styling, routing, and theme persistence.
3. **Integrate the supplied SVG/PNG brand assets** (included under `assets/branding/` in this kit). They are production-friendly vector interpretations of the chosen brand concept. The source concept board is in `reference/planarch-brand-concept-reference.png`; use it as a **visual reference**, not as an image to crop and display as the logo.
4. Make conservative, targeted changes to branding and the existing shell. **Do not modify gameplay logic or data flows**: encounters, initiative, HP, compendium, campaigns, dashboard widgets, dice, atmosphere/audio, session notes, cloud sync/Supabase, authentication, or persistence.
5. Do not invent new features, rewrite app structure, or add heavy dependencies just to display the brand.
6. Implement and test in the actual repository. If required context is missing, choose the most reversible approach and document the decision. Do not claim features or builds passed unless verified.

## 1. Finalized brand decisions — do not reopen discovery

| Attribute | Approved decision |
| --- | --- |
| Brand name | **PLANARCH** |
| Brand identity | Modern-medieval, premium fantasy software |
| Brand concept | **The Cartographer's Seal** |
| Concept variant | **Royal Compass** |
| Mood | Regal, premium, authoritative, crafted |
| Shape | Circular compass medallion / navigational seal |
| Symbol geometry | Balanced: sharp enough to command attention, elegant rather than aggressive |
| Ornament | Balanced engraving, not an excessively busy fantasy illustration |
| Letters in icon | **None** — no monograms or hidden P/A |
| Wordmark | Clean, modern, **wide-tracked uppercase sans-serif** |
| Primary colors | Antique gold, ivory, charcoal |
| Icon backgrounds | Both charcoal (dark) and ivory (light) |
| Users | Both novice and experienced DMs |

**Core brand statement:** Planarch feels like a royal cartographer's precision instrument made for modern Dungeon Masters — a command center for planning and running worlds.

The symbol is a **compass seal**, not a d20, wizard hat, sword, dragon, shield, or generic decorative rune. Keep the seal legible and balanced at small sizes.

## 2. Assets included

The kit's `assets/branding/` directory contains:

| File | Intended use |
| --- | --- |
| `planarch-seal-gold.svg` | Transparent gold seal on dark surfaces |
| `planarch-seal-on-ivory.svg` | Transparent darker seal on light surfaces |
| `planarch-logo-horizontal-on-dark.svg` | Horizontal logo + PLANARCH wordmark for dark backgrounds |
| `planarch-logo-horizontal-on-light.svg` | Horizontal logo + PLANARCH wordmark for light backgrounds |
| `planarch-logo-stacked-on-dark.svg` | Vertical/stacked logo for dark splash/onboarding contexts |
| `planarch-logo-stacked-on-light.svg` | Vertical/stacked logo for light splash/onboarding contexts |
| `planarch-icon-dark.svg` | App icon: antique gold compass on charcoal rounded square |
| `planarch-icon-light.svg` | App icon: compass on ivory rounded square |
| `planarch-favicon.svg` | **Simplified** dark square icon for browser tabs and tiny sizes |
| `planarch-icon-192.png` | 192px PNG for web app manifest if already used |
| `planarch-icon-512.png` | 512px PNG for web app manifest if already used |
| `planarch-icon-light-512.png` | Optional light app tile asset |
| `planarch-apple-touch-icon.png` | 180px PNG for Apple touch icon |

These assets are original vector interpretations based on the previously approved *visual mockup*. They do not claim to be exact autotraces of the concept-board rendering. **Do not substitute the full concept board as a logo asset.**

### Asset location

Copy the included branding files to the repo's static/public directory. Recommended public URLs:

```text
public/
  branding/
    planarch-seal-gold.svg
    planarch-seal-on-ivory.svg
    planarch-logo-horizontal-on-dark.svg
    planarch-logo-horizontal-on-light.svg
    planarch-logo-stacked-on-dark.svg
    planarch-logo-stacked-on-light.svg
    planarch-icon-dark.svg
    planarch-icon-light.svg
    planarch-favicon.svg
    planarch-icon-192.png
    planarch-icon-512.png
    planarch-icon-light-512.png
    planarch-apple-touch-icon.png
```

If your app doesn't use `public/`, adapt to the framework's correct asset convention. Don't leave broken paths.

## 3. Design tokens

Use a **restrained** brand palette; the original application defaults to a *light* interface, with an optional dark theme. **Do not force the whole app into dark mode.** Brand colors should harmonize with both themes.

Suggested brand tokens (the source SVGs already use these tones):

```css
:root {
  --planarch-charcoal: #17191a;
  --planarch-deep-charcoal: #101214;
  --planarch-ivory: #f1e8d8;
  --planarch-antique-gold: #be9454;
  --planarch-gold-highlight: #e2bc7c;
  --planarch-aged-gold: #826039;
  --planarch-warm-ink: #302c27;
}
```

Map these into the app's **existing theme tokens** rather than applying blanket global overrides. Suggested treatment:

- **Light UI:** use light/ivory or neutral surfaces, warm ink for high-contrast copy, antique/aged gold as controlled accents and outlines.
- **Dark UI:** keep charcoal/deep charcoal surfaces, readable ivory typography, muted antique gold for branding and selected accents.
- Gold is an **accent**, not a replacement for all labels or body text. Ensure sufficient text contrast in both modes.
- No neon, emerald, lime, saturated green, aggressive metallic glow, thick skeuomorphic frames, or excessively ornate components. Preserve functional semantic colors where necessary (e.g., error/success indicators), separate from decorative branding.
- Avoid adding heavy parchment textures to data-dense screens: decorative map texture, if used at all, is limited to splash/about/empty-state contexts and must never reduce readability.

## 4. Logo integration rules

### 4.1 Primary header/sidebar logo

- Place the appropriate horizontal wordmark in the existing primary brand slot (typically top of sidebar or app header).
- Select `planarch-logo-horizontal-on-light.svg` for the light UI and `planarch-logo-horizontal-on-dark.svg` for dark UI **based on the actual surface color**, not only OS appearance.
- Preserve aspect ratio. Use `width: auto; height: auto; max-width: 100%` or equivalent to avoid distortion. Target a comfortable readable size within existing sidebar/header constraints.
- If the sidebar collapses, show the **seal alone** instead of compressing the complete wordmark. The gold transparent seal is acceptable only when contrast is sufficient; use icon tiles if the background demands it.
- Ensure wordmark legibility on 360px-wide screens without creating horizontal overflow.
- Avoid duplicate brand labels such as a rendered SVG wordmark immediately followed by the same text.

### 4.2 Brand component (optional)

If the app uses React, prefer a tiny reusable component wrapping existing asset files rather than copying URLs repeatedly:

```tsx
// Illustrative example: adapt to actual app conventions and language.
type PlanarchBrandProps = {
  mode?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
};

export function PlanarchBrand({
  mode = 'light',
  compact = false,
  className = '',
}: PlanarchBrandProps) {
  const isDark = mode === 'dark';
  const src = compact
    ? isDark
      ? '/branding/planarch-seal-gold.svg'
      : '/branding/planarch-seal-on-ivory.svg'
    : isDark
      ? '/branding/planarch-logo-horizontal-on-dark.svg'
      : '/branding/planarch-logo-horizontal-on-light.svg';

  return (
    <img
      src={src}
      alt="Planarch"
      className={className}
      draggable={false}
    />
  );
}
```

**Important:** `mode` refers to the **background/surface behind the logo**, not necessarily the app preference. Determine it from the actual sidebar/header theme. When it changes, the correct asset should update without a reload. Use existing theme APIs.

### 4.3 Do not use the raster concept board as branding

The reference picture includes layout examples, textures, text, and mocked-up app tiles; it is a design **presentation**, not a correctly cropped or scalable production logo. Use the supplied independent assets above.

## 5. App icon, browser favicon, and installable app

- Add/update browser favicon using `planarch-favicon.svg`, optimized for small tabs.
- Set the browser document title to include **Planarch** where needed; preserve route-level document title logic if it already exists.
- Add Apple touch icon with `planarch-apple-touch-icon.png` where appropriate.
- **If** the app already has a PWA manifest, update its `name`, `short_name`, `icons`, and `theme_color` to match Planarch without destroying existing manifest settings or service worker behavior.
- Reuse `planarch-icon-192.png` and `planarch-icon-512.png` in that manifest as appropriate. Do not fabricate `maskable` compatibility; either test safe-zone compliance or leave purpose as `any`.
- Keep existing `manifest.webmanifest`, `site.webmanifest`, `public/manifest.json`, or equivalent path rather than creating multiple conflicting manifests.
- **If the app is not a PWA, do not add a PWA dependency or service worker just to install an icon.**
- Avoid showing full-wordmark graphics at 16×16; show the simplified compass seal.

HTML only if relevant to the framework:

```html
<link rel="icon" type="image/svg+xml" href="/branding/planarch-favicon.svg" />
<link rel="apple-touch-icon" href="/branding/planarch-apple-touch-icon.png" />
<meta name="theme-color" content="#17191a" />
```

For a Next.js metadata API project, use its metadata/favicon conventions instead of pasting tags into unrelated components.

## 6. Where to apply visual branding

**Required:**

1. Existing top navigation/sidebar/primary brand display, including its collapsed variant.
2. Browser tab/favicon and document/site title.
3. Relevant app metadata, installation icons, and manifest **if those systems already exist**.
4. Light and dark theme asset switching on brand/logo surfaces.
5. Responsive sizing and accessible alt text/ARIA.

**Optional, only where the app already has such views:**

- Login/auth header or existing landing screen: use stacked or horizontal logo in its normal header slot.
- Existing loading/splash screen: use icon or stacked wordmark, with subtle non-distracting motion only if animation infrastructure exists.
- Existing About/Settings brand section: use stacked brand asset.

**Do not** plaster compass emblems onto every card, encounter row, or stat block. Don't redesign the DM tools themselves under the guise of branding.

## 7. Preserve Planarch's product identity

Planarch is an existing digital DM Screen/command center. Its functionality may include campaign management, session notes, initiative/HP tracking, encounter building, D&D compendium, dice, ambience controls, dashboard, keyboard shortcuts, and optional cloud sync. These existing features are **out of scope** for brand implementation.

- Do not reset encounter or monster state.
- Do not alter condition, damage, healing, initiative, or dice calculations.
- Do not alter cloud sync auth/session/storage configuration.
- Do not change dashboard widgets and persistence.
- Do not alter audio playback behavior.
- Do not alter route names or data formats unless necessary for brand asset URLs.
- Avoid unrelated refactoring, mass renames, and dependency churn.

## 8. Technical quality bar

- Use the supplied SVGs as-is by default. Modify only when required to fix a verified integration issue.
- No SVG embedded external images, remote asset loading, or dependence on third-party icon services.
- Logo/icons must look crisp on standard and high-density displays.
- Provide adequate padding and avoid clipping at rounded corners.
- Test: 16px, 32px, 48px favicon/icon visibility; 180px, 192px, 512px tile fidelity.
- Keep the UI readable and keyboard accessible. Any interactive brand control (e.g., logo linking to home) must have proper accessible naming and focus behavior.
- Respect the app's existing reduced-motion settings; no mandatory animated logo.
- Do not introduce hard-coded path assumptions that break when the app is hosted at a nested base URL; use existing asset/base-path conventions where needed.
- Do not add a logo image to every page if an existing shared shell already renders it once.

## 9. Completion checklist

**Implementation**

- [ ] Existing project architecture and theme strategy inspected.
- [ ] Branding files copied/imported correctly.
- [ ] Header/sidebar logo integrated and sized appropriately.
- [ ] Collapsed sidebar uses mark/icon instead of squashed wordmark.
- [ ] Logo resolves correctly in both light and dark themes.
- [ ] Browser favicon and tab title updated.
- [ ] Existing manifest/apple icon updated if applicable.
- [ ] No duplicate or broken images/paths.
- [ ] No unrelated gameplay or data behavior changed.

**Visual QA**

- [ ] Desktop and narrow/mobile widths checked for overflow.
- [ ] Icon tested at small browser-tab sizes.
- [ ] Gold/ivory/charcoal styling is consistent without harming readability.
- [ ] Existing light-default theme remains light; dark theme remains functional.
- [ ] Brand still feels like sophisticated **software**, not a decorative fantasy poster.

**Verification**

- [ ] Run existing formatter/linter/typechecker as available.
- [ ] Run existing app build if available.
- [ ] Verify asset requests are served (not 404s).
- [ ] Verify core navigation still works.
- [ ] Summarize which exact files were changed and why.
- [ ] Report tests that passed, tests that failed, and tests that could not be run.

## 10. Your final report to me (OpenCode)

When completed, report concisely:

1. Where the Planarch logo and icon now appear.
2. Exact project files added/changed (list paths).
3. Any pre-existing conflicting branding removed or replaced.
4. Light/dark and responsive verification results.
5. Build/lint/test results, with failures if any.
6. Any remaining manual steps (e.g., redeploy or clear favicon cache).

**Success criterion:** When a DM opens Planarch, they see a professional, coherent Royal Compass brand identity on the browser tab and app shell, and all existing DM Screen functionality works exactly as before.
