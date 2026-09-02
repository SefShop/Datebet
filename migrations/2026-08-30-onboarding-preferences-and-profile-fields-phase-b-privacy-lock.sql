-- PHASE B — Final privacy lock (run ONLY after the new application
-- code is confirmed production-ready and fully rolled out — see the
-- companion -phase-a-db-prep.sql file, which must be applied first,
-- and the new app code, which must be deployed and confirmed serving
-- 100% of traffic before this file runs).
--
-- Split from the single approved consolidated migration
-- (2026-08-30-onboarding-preferences-and-profile-fields.sql) for a
-- deployment-safe rollout. NO architecture change — this is the exact
-- same approved Part 2 SQL (reconciled against the confirmed live RLS
-- policies), unmodified, deferred to its own phase.
--
-- NOT EXECUTED. Prepared for review only, per explicit instruction.
-- Do NOT run this against any environment (local, staging, or
-- production) without separate, explicit approval.
--
-- WHY THIS MUST WAIT UNTIL AFTER THE NEW APP IS FULLY LIVE:
-- Column-level REVOKE SELECT does not silently omit the revoked
-- columns from a `SELECT *` (or any query naming them) for the
-- affected role — Postgres raises "permission denied for column ..."
-- for the whole statement. Of the nine columns below, eight
-- (date_of_birth, gender, show_me, preferred_age_min, preferred_age_max,
-- max_distance_km, latitude, longitude) were brand-new, created only in
-- Phase A, so the OLD (currently-deployed) app cannot reference them —
-- no risk from those eight. `onboarding_completed`, however, is a
-- PRE-EXISTING column the OLD app already reads directly today (its
-- `ensureProfileExists()` does a plain `select('id, name, age,
-- onboarding_completed')`). If this file runs while any OLD app
-- instance is still serving traffic, that instance's very next login
-- check would fail outright with a permission-denied error. This is
-- the specific, concrete reason Phase B must not run until the new
-- app — which reads onboarding_completed exclusively via
-- get_own_private_profile() — has fully replaced the old one.
--
-- AUDIT FINDING (unchanged from the approved architecture): this
-- project's existing `profiles` RLS SELECT policies (`enable_read_for_users`,
-- `profiles_select`) both have qual=true, i.e. permissive for any
-- authenticated/public row. Row-level security therefore does NOT
-- prevent one user from directly querying another user's exact date of
-- birth, coordinates, or private discovery preferences with an ordinary
-- authenticated Supabase client call, and hiding these fields from the
-- app's own client code alone would NOT close that hole.
--
-- FIX: revoke SELECT specifically on every owner-only-private column
-- from every role that can reach this table through the API, at the
-- database level. This is column-level (not row-level) and applies
-- regardless of whose row is being queried — including the row's own
-- owner. By the time this file runs, no shipped client code selects
-- these columns directly any more — every call site that used to read
-- one of its own restricted fields calls get_own_private_profile()
-- instead (added in Phase A).
--
-- Column-level GRANT/REVOKE is orthogonal to row-level policies: it
-- restricts which COLUMNS may be selected regardless of which ROWS the
-- policy would otherwise allow, so this fix is correct independent of
-- — and does not modify — the existing profiles RLS policies
-- (enable_insert_for_users, enable_read_for_users, profiles_insert,
-- profiles_select, profiles_update). profiles_update in particular is
-- already correctly owner-scoped (auth.uid() = id) and is not touched
-- here or anywhere in this file.
--
-- Columns covered: date_of_birth, gender, show_me, preferred_age_min,
-- preferred_age_max, max_distance_km, onboarding_completed, latitude,
-- longitude. `gender` may still be READ INTERNALLY by SECURITY DEFINER
-- functions (discover_profiles, created in Phase A) for server-side
-- filtering — a SECURITY DEFINER function executes with the privileges
-- of the role that defined it, not the invoking client's grants, so
-- this revoke does not prevent that internal use. It is never returned
-- to any client by discover_profiles.
--
-- Revoked from PUBLIC as well as authenticated/anon: a REVOKE issued
-- against a specific role never overrides a privilege that column
-- separately holds via a grant to the PUBLIC pseudo-role. Revoking
-- from PUBLIC too closes that gap unconditionally and is a safe no-op
-- if no such grant exists (REVOKE on a privilege that isn't held does
-- not error).
REVOKE SELECT (
  date_of_birth, gender, show_me,
  preferred_age_min, preferred_age_max, max_distance_km,
  onboarding_completed, latitude, longitude
) ON profiles FROM PUBLIC;
REVOKE SELECT (
  date_of_birth, gender, show_me,
  preferred_age_min, preferred_age_max, max_distance_km,
  onboarding_completed, latitude, longitude
) ON profiles FROM authenticated;
REVOKE SELECT (
  date_of_birth, gender, show_me,
  preferred_age_min, preferred_age_max, max_distance_km,
  onboarding_completed, latitude, longitude
) ON profiles FROM anon;

-- END OF PHASE B. After this runs, direct SELECT of any of the nine
-- columns above is impossible for authenticated, anon, or PUBLIC,
-- regardless of whose row is targeted — the only path back to a user's
-- own values is get_own_private_profile() (Phase A), and cross-user
-- discovery continues exclusively through discover_profiles() (Phase A),
-- which never returns them.
