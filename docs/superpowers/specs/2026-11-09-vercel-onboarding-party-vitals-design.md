# Vercel fallback, campaign bypass, Party Vitals

## Intent
Keep Spotify title fallback working on Vercel, let a first-time visitor skip campaign creation across reloads, and stop Party Vitals cards from overlapping on narrow panels. Preserve Archeron's existing visual language.

## Scope
- Port the validated `/api/spotify-title` handler to a Vercel Function at `api/spotify-title.mjs`; keep `src/musicLookup.ts` unchanged. Remove tracked Netlify deployment files and update Netlify-specific documentation and UI copy.
- Add a close control to the welcome campaign modal. Remember dismissal when no campaign exists; leave New campaign available to reopen it. Escape and backdrop close it too. Do not create a dummy campaign or save campaign-scoped data on bypass.
- Use the shadcn Card registry component for Party Vitals containers. Preserve current data and styling; make inner content reflow at narrow container widths so avatar/name and AC/PP/HP never collide. Check narrow, intermediate, and wide widths in both themes.

## Approaches
- **Chosen:** shadcn Card for container plus minimum responsive CSS for content. Reuses registry component while fixing collision that Card alone cannot solve.
- CSS-only existing card: smaller diff, but rejects requested shadcn container.
- Full replacement with a fixed two-row card: predictable, but larger markup change and unnecessarily tall cards at wide widths.

## Constraints and checks
No new UI library beyond existing shadcn setup. Preserve Spotify input validation and 400/502 responses. Verify bypass on reload, reopening modal, successful campaign creation, Spotify handler outcomes, and layout without clipping or horizontal overflow. Run type check, tests, build, and visual checks before completion. No redesign outside touched UI.
