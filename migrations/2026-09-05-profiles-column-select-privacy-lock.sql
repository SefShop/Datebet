-- RECORD OF A PRODUCTION CHANGE ALREADY APPLIED — 2026-09-05
--
-- This migration contains executable REVOKE/GRANT SQL and would apply
-- the permission change described below if run against any environment
-- that does not already have it. The permission change itself was
-- already applied manually to production on 2026-09-05, and already
-- smoke-tested successfully against live production, before this file
-- was written. This file records that same desired database state in
-- version control, using the exact statement pair that was run
-- manually, so the change is reproducible and reviewable going forward.
--
-- Practical effect of running this file:
--   - Against an environment where this lockdown has NOT yet been
--     applied (e.g. a fresh environment, staging, or a rebuilt
--     database): running this file WILL apply the change.
--   - Against production, where the change is already live: running
--     this file again is idempotent in practical effect — REVOKE on a
--     role that already lacks the privilege is a no-op, and re-granting
--     the same column list changes nothing already granted (see
--     "IDEMPOTENCE" note below).
--
-- PURPOSE:
-- Prevent direct client-side SELECT access (from the `anon` and
-- `authenticated` Supabase roles) to the 9 sensitive columns on
-- `public.profiles`:
--   onboarding_completed, date_of_birth, gender, show_me,
--   preferred_age_min, preferred_age_max, max_distance_km,
--   latitude, longitude
--
-- These columns were already unreadable through the application's own
-- code paths before this change (a repository-wide audit found zero
-- direct SELECTs of any of these 9 columns anywhere in the frontend —
-- see the accompanying audit reports). This change closes the same gap
-- at the database layer, so that no ad-hoc/manual query issued as
-- `anon` or `authenticated` (e.g. via the PostgREST API directly, or a
-- future code path that forgets this rule) can retrieve them either.
--
-- HOW THESE COLUMNS ARE STILL READ, WHERE LEGITIMATELY NEEDED:
--   - A user's own private fields: `get_own_private_profile()`
--     (SECURITY DEFINER, derives the caller strictly from auth.uid(),
--     accepts no client-supplied id).
--   - Discovery candidate filtering (show_me / age range / distance /
--     coordinates): `discover_profiles(p_limit integer)` (SECURITY
--     DEFINER, uses the caller's own stored preferences and coordinates
--     internally; never returns another user's raw latitude/longitude,
--     never returns any of the 9 private columns to the client).
-- Both functions run with their owner's privileges, independent of the
-- caller's table-level grants, so this REVOKE does not affect them.
--
-- INTENTIONALLY NOT TOUCHED BY THIS CHANGE:
--   - `service_role` and `postgres` privileges — intentionally left
--     unchanged by this migration. Server-side code (the push-
--     notification API routes) uses the `service_role` client. This
--     migration changes SELECT privileges only for the `anon` and
--     `authenticated` roles; RLS-bypass behavior is separate from, and
--     not altered by, PostgreSQL table/column-level privileges.
--   - RLS policies on `profiles` — unchanged. Existing SELECT policies
--     remain exactly as they were; this is a column-level GRANT/REVOKE
--     change, not a row-level security change.
--   - INSERT / UPDATE / DELETE privileges on `profiles` — unchanged.
--     Onboarding and profile-editing still write these same 9 columns;
--     only direct SELECT is affected.
--   - Realtime publication configuration — unchanged. `public.profiles`
--     is confirmed NOT included in any PostgreSQL publication at the
--     time of this change; this migration does not add it to one and
--     does not alter replica identity.
--   - Any function/RPC definition — unchanged.
--
-- IDEMPOTENCE (practical effect):
-- The statement pair below is safe to re-run: REVOKE on a role that
-- already lacks the privilege is a no-op, and re-granting the same
-- column-level SELECT list to `authenticated` does not widen or narrow
-- anything beyond what is listed. Running this file again against the
-- already-locked-down production database is expected to change nothing.
--
-- VERIFICATION PERFORMED IN PRODUCTION AFTER THIS CHANGE (manual, already
-- completed — listed here for the record, not re-run by this file):
--   - anon:          SELECT = false on all 21 profiles columns
--   - authenticated: SELECT = true only on the 12 columns granted below
--   - authenticated: SELECT = false on all 9 private columns listed above
--   - Existing-user login, Discovery, own-profile load, Edit Profile
--     save, logout, new-account onboarding Steps 2-7 (including private
--     field writes), onboarding completion, and post-onboarding entry
--     into Discovery were all smoke-tested successfully against
--     production after this change was applied.

-- ── The change (already applied; recorded here for history) ─────────

REVOKE SELECT ON TABLE public.profiles
FROM anon, authenticated;

GRANT SELECT (
    id,
    name,
    age,
    bio,
    photo,
    location,
    is_online,
    last_seen,
    interests,
    bio_language,
    photos,
    presence_status
)
ON TABLE public.profiles
TO authenticated;

-- NOTE: `anon` intentionally receives no SELECT grant back on
-- `profiles` at all, on any column — discovery and profile viewing both
-- require an authenticated caller (see `discover_profiles()`), so `anon`
-- has no legitimate read path against this table.

-- ── Verification query (NOT executed by this file — commented out,
-- for manual use only, exactly as requested) ─────────────────────────
--
-- Shows effective SELECT privilege for every column of public.profiles,
-- for both anon and authenticated:
--
-- SELECT
--   c.column_name,
--   has_column_privilege('anon', 'public.profiles', c.column_name, 'SELECT') AS anon_can_select,
--   has_column_privilege('authenticated', 'public.profiles', c.column_name, 'SELECT') AS authenticated_can_select
-- FROM information_schema.columns c
-- WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
-- ORDER BY c.ordinal_position;
