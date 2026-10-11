-- ONBOARDING STEP 3 RESUME FIX — profiles.show_me_confirmed
--
-- NOT EXECUTED. Prepared for review only. Do NOT run this against any
-- environment (local, staging, or production) without separate, explicit
-- approval.
--
-- PROBLEM:
-- profiles.show_me is TEXT, nullable, DEFAULT 'everyone'. A brand-new profile
-- that has never answered onboarding Step 3 therefore stores 'everyone' —
-- exactly the same value a user stores by explicitly choosing "Everyone" and
-- pressing Continue. Resume (lib/onboardingResume.ts) cannot tell the two
-- apart, so a user who explicitly chose Everyone was sent back to Step 3
-- after a refresh.
--
-- FIX (data model):
-- A new, separate onboarding-PROGRESS flag:
--     profiles.show_me_confirmed BOOLEAN NOT NULL DEFAULT false
-- Meaning: "the user has successfully completed onboarding Step 3". It is
-- written (true) by the same single UPDATE as show_me, only after a
-- successful Step 3 Continue. show_me itself is UNCHANGED — same meaning,
-- same default, still the discovery preference (women / men / everyone).
--
-- WHAT THIS FILE CHANGES (and nothing else):
--   1. ADD COLUMN IF NOT EXISTS public.profiles.show_me_confirmed
--   2. Redefines get_own_private_profile() so it additionally returns
--      show_me_confirmed. PostgreSQL cannot change the RETURNS TABLE shape
--      with CREATE OR REPLACE (it fails with "cannot change return type of
--      existing function"), so the function is DROPped and re-CREATEd, and
--      its REVOKE/GRANT statements are re-applied — the Phase A function
--      body, plus the one new column, with the permissions of the LIVE
--      function (see LIVE FUNCTION below). Everything
--      runs in ONE transaction, so no other session ever observes the
--      function missing and a failure rolls everything back.
--
-- LIVE FUNCTION (verified manually against production, authoritative):
--   LANGUAGE plpgsql, SECURITY DEFINER, SET search_path TO 'public','pg_temp',
--   owner postgres, proacl
--   {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   i.e. EXECUTE for postgres (owner), authenticated and service_role; NO
--   anon and NO PUBLIC execute. DROP FUNCTION discards that ACL, so this file
--   re-establishes it explicitly: REVOKE from PUBLIC and anon, GRANT to
--   authenticated and service_role. Nothing broader than the live state.
--
-- OWNER: no ALTER OWNER is used. A function is owned by the role that runs
--   CREATE FUNCTION. The Supabase SQL Editor runs as postgres, which is the
--   current live owner, so the recreated function is owned by postgres. If
--   you run this file through any other role the owner would differ — the
--   post-run check below (owner column) confirms it; only then would an
--   explicit ALTER FUNCTION ... OWNER TO postgres be justified.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT TOUCH:
--   - discover_profiles() — not modified.
--   - RLS policies — not modified.
--   - Column-level SELECT grants on profiles — not modified. The new column
--     is NOT in the 12-column SELECT grant list from
--     2026-09-05-profiles-column-select-privacy-lock.sql and a column added
--     afterwards carries no SELECT privilege for anon/authenticated, so it
--     stays private: it is readable only through get_own_private_profile().
--   - show_me's default, nullability or CHECK constraint.
--   - onboarding_completed or any other column.
--   - INSERT/UPDATE privileges: the owner-scoped profiles_update policy and
--     the table-level UPDATE privilege already cover a newly added column
--     (the same way show_me itself is written today).
--
-- EXISTING ROWS:
-- Every existing row receives show_me_confirmed = false (NOT NULL DEFAULT).
--   - Completed users (onboarding_completed = true): unaffected — the resume
--     logic only runs for onboarding_completed = false.
--   - Incomplete users with show_me 'women' or 'men': resume unchanged.
--   - Incomplete users with show_me 'everyone': see Step 3 once more (the
--     old schema cannot prove they chose it); pressing Continue sets the
--     flag to true. No backfill is attempted on purpose.
--
-- DEPLOYMENT ORDER / COMPATIBILITY:
-- Apply this BEFORE deploying the new application code.
--   - OLD code + NEW database: safe. The old code never references the new
--     column; get_own_private_profile() returns one extra key that the old
--     code ignores (it reads named fields).
--   - NEW code + NEW database: the intended state.
--   - NEW code + OLD database (migration not applied yet): NOT a supported
--     deployment state. The resolver reads a missing flag as "not confirmed"
--     (fails safe to Step 3), and Step 3's single UPDATE of
--     {show_me, show_me_confirmed} is rejected, so Continue shows an error
--     and does NOT advance. There is deliberately no show_me-only fallback.
--
-- BEFORE RUNNING — read-only checks worth doing in the SQL editor, to
-- confirm the live function matches what is recreated below (the repo copy
-- is 2026-08-30-...-phase-a-db-prep.sql, PART 4):
--
--   SELECT pg_get_functiondef('public.get_own_private_profile()'::regprocedure);
--   SELECT p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, p.proacl
--   FROM pg_proc p WHERE p.oid = 'public.get_own_private_profile()'::regprocedure;
--   (live values already verified: true / {search_path=public, pg_temp} /
--    postgres / {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres})
--
-- ROLLBACK (manual, if ever needed — run the code revert first):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.get_own_private_profile();
--   -- recreate the previous 9-column function from the Phase A migration
--   -- (PART 4), then re-apply the SAME REVOKE/GRANT lines as below
--   -- (PUBLIC, anon revoked; authenticated + service_role granted), then:
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS show_me_confirmed;
--   COMMIT;

BEGIN;

-- ── 1. Onboarding-progress flag (additive; existing rows become false) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_me_confirmed BOOLEAN NOT NULL DEFAULT false;

-- ── 2. get_own_private_profile() — same function, one extra column ─────
DROP FUNCTION IF EXISTS public.get_own_private_profile();

CREATE FUNCTION public.get_own_private_profile()
RETURNS TABLE (
  date_of_birth DATE,
  gender TEXT,
  show_me TEXT,
  show_me_confirmed BOOLEAN,
  preferred_age_min INTEGER,
  preferred_age_max INTEGER,
  max_distance_km INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  onboarding_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_own_private_profile requires an authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    p.date_of_birth, p.gender, p.show_me, p.show_me_confirmed,
    p.preferred_age_min, p.preferred_age_max, p.max_distance_km,
    p.latitude, p.longitude, p.onboarding_completed
  FROM public.profiles p
  WHERE p.id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_private_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_own_private_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_own_private_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_private_profile() TO service_role;

COMMIT;

-- Ask PostgREST to refresh its schema cache so the new column is accepted
-- immediately (Supabase normally does this automatically after DDL).
NOTIFY pgrst, 'reload schema';

-- ── Verification queries (NOT executed by this file — commented out,
-- for manual use after running) ──────────────────────────────────────
--
--   -- column exists, NOT NULL, default false:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'profiles'
--     AND column_name = 'show_me_confirmed';
--
--   -- the column is NOT directly readable by clients (expect both false):
--   SELECT
--     has_column_privilege('anon', 'public.profiles', 'show_me_confirmed', 'SELECT') AS anon_can_select,
--     has_column_privilege('authenticated', 'public.profiles', 'show_me_confirmed', 'SELECT') AS authenticated_can_select;
--
--   -- function permissions unchanged (anon/PUBLIC must NOT be able to execute):
--   SELECT
--     has_function_privilege('anon', 'public.get_own_private_profile()', 'EXECUTE') AS anon_can_execute,
--     has_function_privilege('authenticated', 'public.get_own_private_profile()', 'EXECUTE') AS authenticated_can_execute,
--     has_function_privilege('service_role', 'public.get_own_private_profile()', 'EXECUTE') AS service_role_can_execute;
--   -- expected: false / true / true
--
--   -- security properties identical to the live function before this file:
--   SELECT p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, p.proacl
--   FROM pg_proc p WHERE p.oid = 'public.get_own_private_profile()'::regprocedure;
--   -- expected: true / {search_path=public, pg_temp} / postgres /
--   --           {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
--   -- return shape (10 columns, show_me_confirmed 4th):
--   SELECT pg_get_function_result('public.get_own_private_profile()'::regprocedure);
