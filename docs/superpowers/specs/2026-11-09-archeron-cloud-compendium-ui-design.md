# Archeron cloud compendium and UI cleanup

## Intent
Reduce Vercel deployment size, remove small text-actions and header noise, and let DMs rename campaigns without losing records. User deferred Google OAuth: existing per-user Supabase URL/key and email/password connection stays.

## Decisions and scope
- Remove shipped `public/compendium/` sourcebook and its import action, not user-imported data. XML import remains, but new imports require active Supabase sign-in and sync. If sync fails, keep local import and retry; never delete before remote upload has been confirmed by reading the uploaded manifest/record and matching generation/count. Existing local libraries stay until their cloud copy is verified. After verification, delete local records and metadata. Opening cloud-only compendium requires network; show actionable signed-out/offline/error states. Homebrew data and unrelated campaign records remain usable offline. No automatic data deletion on initial page load without a verified remote copy.
- Preserve current Supabase setup, RLS, authentication and credentials UI. No OAuth change.
- Rename current campaign by changing display label only; keep stable old storage key. Persist label-to-key mapping in `wf-*` workspace data so backup and sync carry it. Reject empty, >80-character and case-insensitive duplicate labels. Existing campaign records, references, and active selection remain associated with original key. Backups from before mapping remain readable.
- Replace tiny text-only action controls across app with accessible button presentation, keeping behavior, ≥13px type and ≥44px touch targets. Real navigation links stay links. Preserve existing IBM Plex Sans and theme identity.
- Remove all breadcrumbs across app. Remove idle `Ready to plan` campaign switch status; retain active encounter status. Remove decorative header `badge subtle` only in Encounters, Characters & NPCs, Campaign wiki, Compendium; do not strip meaningful badges inside content. Campaign hero eyebrow on those pages contains only current campaign display name, not category or decorative prefix. Interpret 'Encounters till Compendium' as four nav destinations presently present in app; Atmosphere Studio sits before Encounters.

## Approaches
- **Selected: cloud-first import with safe migration.** Small deployment and no new local libraries unless upload pending. More cloud coupling and offline compendium loss.
- Alternative: retain local import until cloud sync, then delete. Better offline import, but postpones cloud-only behavior.
- Alternative: keep local library permanently and only remove bundled sourcebook. Simpler and offline-friendly but fails requested cloud-only storage.

## Constraints and validation
- No new dependency. Do not remove user data until verified remote copy. Existing cloud sync must continue to work on old Supabase schemas. Require connected Supabase user for new import and block clearly if absent. Preserve compatibility with existing local/remote compendiums and backup format. Check final Vercel `dist/` bytes against baseline, tests and production build; never claim size savings without measured before/after. Warn Gnome before running code/tests/build so model can be switched.
- UI mode Operate: reading as DM console for table use, restrained slate/amber, ENERGY 1 / RHYTHM 2 / MOTION 1. No new visual assets. Maintain light/dark contrast and keyboard focus.

## Builder calls
- Separate sourcebook shipped files from IndexedDB user data: only shipped files influence deploy size.
- Existing `PRODUCT.md` and old prose inside `DESIGN.md` contradict current IBM Plex Sans/13px floor and Archeron name; current implemented typography and approved typography spec win. Do not silently revert to 10–12px microcopy.
- Sourcebook `public/compendium/` deletion is approved; leave unrelated public assets and user browser data intact until verified sync.
