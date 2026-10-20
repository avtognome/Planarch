# Connect Wayfinder to Supabase Free

The website stays on Netlify. Supabase provides account sign-in, database synchronization and private file storage.

## 1. Create your Supabase project

Open https://supabase.com/dashboard and create a Free project. Save your database password securely; the browser app does not need it.

In your project's Connect dialog or Settings → API Keys, copy:

- Project URL, such as `https://your-project.supabase.co`
- Publishable key, beginning `sb_publishable_`

The app also accepts a legacy anon key. Never paste a secret key or service_role key into the app.

## 2. Run the included SQL

Open Supabase → SQL Editor → New query.

Paste the full contents of `supabase/setup.sql`, then select Run. It creates:

- `public.wayfinder_records` for account-specific workspace data
- Row Level Security that limits records to their signed-in owner
- `wayfinder_write_record`, an atomic revision-aware save function
- A Realtime publication for live updates
- The private `wayfinder-private` Storage bucket, plus user-folder policies

The script is repeatable. The connection screen also offers a Download setup SQL link.

## 3. Set up sign-in URLs

In Authentication → Sign-in / Providers, enable Email sign-in.

In Authentication → URL Configuration:

- Site URL: your Netlify website origin, for example `https://your-dm-screen.netlify.app`
- Redirect URLs: add that same website and any custom domain you use

Email confirmation may be enabled by default. If enabled, confirm your account from the signup email before signing in. Password reset emails return you to the app; open Settings after following the email link, then use Change or reset your password.

## 4. Connect from Wayfinder

1. Open Settings & backup → Supabase cloud sync.
2. Paste Project URL and publishable key.
3. Select Connect Supabase project.
4. Create an account, confirm email if requested, then sign in.
5. Select Start cloud sync. A new cloud workspace uploads the device's existing data. Existing cloud records are restored where keys overlap by default; unmatched local keys upload. Select Use this device's records only when you want this device to be the starting workspace.
6. Keep the page open until records show synced and file transfers finish.

Use the same Supabase project and account on another device. Connect and sign in there to restore the workspace; subsequent visits resume your session and sync automatically.

## What synchronizes

Campaign records, encounters, active combat, HP, initiative/rounds, conditions/concentration, character/NPC profiles and portraits, journal/wiki notes, dice history, saved atmosphere scenes/source links/mixes, widget layouts, the compendium and the currently selected uploaded audio file.

Passwords, API keys and project connection settings are excluded from workspace synchronization. Playing/paused state and audio playback position remain device-local.

## How large files fit the Free plan

The sourcebook is approximately 60 MB uncompressed. JSON files are gzip-compressed where supported, then every upload is split into parts no larger than 8 MiB. Audio is also split into bounded parts. A small manifest reconstructs the original file when it is downloaded; browsers without compression still use bounded uncompressed parts. Each individual object is below Supabase Free's 50 MB per-file limit.

Workspace records larger than 120 KB use a private file reference, keeping Realtime payloads small. The full compendium is stored as files rather than thousands of database rows.

Free quotas still apply: the current plan includes a 500 MB database, 1 GB file storage and limited egress. Projects pause after a week of inactivity; resume a paused project from Supabase before playing. Review https://supabase.com/pricing for current limits. Versioned file uploads retain older versions; remove unreferenced objects if your bucket approaches its quota. Do not delete an object referenced by an active record or manifest.

## Offline and simultaneous edits

Edits remain on the device when offline and retry on reconnect. If another device changed the same persisted record key, Settings offers Keep this device or Use cloud. The local draft is retained until you choose. Granularity is a saved key, such as a campaign's character collection.

Large file transfers need a working connection. Partial upload failures are cleaned up where possible. The cloud file reference is updated only after every part and the manifest have been uploaded. A page refresh can retry a file transfer from the cached local file.

## Migrating from the Firebase build

The provider change keeps local campaign records, IndexedDB compendium data and the selected cached audio file. Supabase uses its own account and cloud storage; it does not copy Firebase's remote database automatically.

If your latest data exists only on a different device or in Firebase, open the old build on that device and export a workspace backup first. Import it in the Supabase build. Restore or reselect files on that device, then let the new Supabase connection upload them. The included sourcebook can always be reloaded from the app.

## Troubleshooting

- Missing table/function/bucket: run the entire setup.sql in SQL Editor.
- Permission error: use the publishable key, sign in, and confirm all RLS and Storage policies were created.
- No email/session after signup: confirm the signup email, then sign in.
- Realtime not updating: confirm wayfinder_records belongs to the supabase_realtime publication. Use Retry / sync now after reconnecting.
- Paused project or quota error: check your Supabase project dashboard.

The SQL and sync behavior are tested locally. A real Supabase connection still requires your own project configuration; no live project credentials are preconfigured in this download.
