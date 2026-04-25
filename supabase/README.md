# Supabase setup

The app works fully offline against IndexedDB. Adding Supabase enables cloud
sync so your clients and session data are backed up and accessible across
devices.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. From **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key

## 2. Configure the app

Create `.env.local` in the repo root:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

If these vars are missing, the app keeps working — it just stays in
local-only mode and the sync UI is hidden.

## 3. Run the migration

In the Supabase dashboard, open **SQL Editor → New query**, paste the
contents of `supabase/migrations/001_init.sql`, and run it. This creates
the tables (`clients`, `sessions`, `treatment_plans`, `treatment_goals`,
`behavior_definitions`, `parent_training_programs`) and enables row-level
security so each therapist only sees their own data.

## 4. Use it

Restart `npm run dev`. A **Sync** item will appear in the bottom nav. Tap
it to sign up / sign in. On first sign-in, all of your existing local
data (including the fictitious test data) will be uploaded automatically.
