-- Onboarding Steps 1-7 real-profile persistence + discovery matching
-- preferences, WITH exact-location privacy hardening (DateDuel).
--
-- ══════════════════════════════════════════════════════════════════
-- SUPERSEDED FOR EXECUTION PURPOSES — kept only as the historical,
-- fully-consolidated reference. For a deployment-safe rollout, this
-- file's content has been split into two phase files, to be applied
-- in order with the new application code deployed in between:
--   1. 2026-08-30-onboarding-preferences-and-profile-fields-phase-a-db-prep.sql
--   2. (deploy new application code, confirm it is fully live)
--   3. 2026-08-30-onboarding-preferences-and-profile-fields-phase-b-privacy-lock.sql
-- Do NOT run this consolidated file directly — running it as a single
-- statement batch reintroduces the exact deployment-ordering risk the
-- split exists to avoid (the private-column REVOKEs would land before
-- new application code that depends on get_own_private_profile() is
-- live). Use the two phase files instead.
-- ══════════════════════════════════════════════════════════════════
--
-- NOT EXECUTED. Prepared for review only, per explicit instruction.
-- Do NOT run this against any environment (local, staging, or
-- production) without separate, explicit approval.
--
-- Revision note: this file replaces the earlier draft of the same name
-- (never applied anywhere) rather than stacking a corrective migration
-- on top of it. It adds the same profile columns as before, PLUS the
-- database-level fix for the exact-coordinate privacy issue raised
-- after that draft: column-level SELECT revocation on latitude/
-- longitude, and a SECURITY DEFINER discovery RPC that never returns
-- raw coordinates to any client.

-- ════════════════════════════════════════════════════════════════════
-- PART 1 — New profile columns (unchanged from the prior draft)
-- ════════════════════════════════════════════════════════════════════

-- ── Date of birth — new long-term source of truth for age ──────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ── Gender — the user's own gender (distinct from show_me below) ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IS NULL OR gender IN ('woman', 'man', 'nonbinary'));

-- ── Show me — ONE shared discovery preference field, written by both
-- Step 3 (initial selection) and Step 7 (final/authoritative value at
-- onboarding completion). Never duplicated into a second column. ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_me TEXT
  DEFAULT 'everyone'
  CHECK (show_me IS NULL OR show_me IN ('women', 'men', 'everyone'));

-- ── Age range preference ────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_age_min INTEGER
  DEFAULT 18
  CHECK (preferred_age_min IS NULL OR (preferred_age_min >= 18 AND preferred_age_min <= 65));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_age_max INTEGER
  DEFAULT 65
  CHECK (preferred_age_max IS NULL OR (preferred_age_max >= 18 AND preferred_age_max <= 65));

-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, unlike ADD COLUMN above —
-- guarded explicitly so this migration stays safe to re-run without
-- erroring on "constraint already exists".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_age_range_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_age_range_valid
      CHECK (preferred_age_min IS NULL OR preferred_age_max IS NULL OR preferred_age_min <= preferred_age_max);
  END IF;
END $$;

-- ── Distance preference ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_distance_km INTEGER
  DEFAULT 100
  CHECK (max_distance_km IS NULL OR (max_distance_km BETWEEN 1 AND 100));

-- ── Real coordinates — ONLY ever populated from a real, successful
-- navigator.geolocation result (Step 4). Never geocoded from a city
-- string, never fabricated. NULL for any profile that hasn't granted
-- location permission (legacy or new). ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION
  CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
  CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));

-- Backward compatibility: all of the above are NULLable with safe
-- defaults where a default makes sense (show_me/age range/distance).
-- No existing column is dropped, renamed, or made NOT NULL.

-- ════════════════════════════════════════════════════════════════════
-- PART 2 — Owner-only private fields: column-level lockdown
-- ════════════════════════════════════════════════════════════════════
--
-- AUDIT FINDING (see implementation report for full detail): this
-- project's existing `profiles` RLS SELECT policy follows the same
-- permissive pattern documented for other tables in this codebase
-- (supabase_bio_translation_migration.sql explicitly says "Same
-- permissive pattern already used by profiles/pair_progress in this
-- app") — i.e. `USING (true)`, allowing any authenticated user to
-- SELECT any OTHER user's full row. This is independently confirmed by
-- the app's own existing behavior: fetchProfiles() has always been able
-- to read every other user's complete profile row for Discover, which
-- would be impossible under an owner-only SELECT policy. Row-level
-- security therefore does NOT currently prevent one user from directly
-- querying another user's exact date of birth, coordinates, or private
-- discovery preferences with an ordinary authenticated Supabase client
-- call (e.g.
-- `supabase.from('profiles').select('date_of_birth,latitude,longitude').eq('id', otherId)`),
-- and hiding these fields from the app's own client code alone would
-- NOT have closed that hole.
--
-- FIX: revoke SELECT specifically on every owner-only-private column
-- from both roles that can reach this table through the API, at the
-- database level. This is column-level (not row-level) and applies
-- regardless of whose row is being queried — including the row's own
-- owner. This does NOT break legitimate owner-side reads: no shipped
-- client code selects these columns directly any more — every call
-- site that used to read one of its own restricted fields now calls the
-- new `get_own_private_profile()` SECURITY DEFINER RPC added in Part 4
-- below instead (see the implementation report for the exact list of
-- redirected call sites). Every existing `select('*')`/mixed-column
-- call site that could have implicitly or explicitly pulled any of
-- these columns has been converted to an explicit safe column list
-- (own-profile editing, game invitations, presence, existing Discover
-- cards) so this lockdown cannot break unrelated functionality.
--
-- Column-level GRANT/REVOKE is orthogonal to row-level policies: it
-- restricts which COLUMNS may be selected regardless of which ROWS the
-- policy would otherwise allow, so this fix is correct independent of
-- the exact live RLS policy text (see the report for the exact
-- inspection SQL to confirm that policy text directly, which remains
-- recommended but is not required for THIS fix to be sound).
--
-- Columns covered: date_of_birth, gender, show_me, preferred_age_min,
-- preferred_age_max, max_distance_km, onboarding_completed, latitude,
-- longitude. `gender` may still be READ INTERNALLY by SECURITY DEFINER
-- functions (discover_profiles, below) for server-side filtering — a
-- SECURITY DEFINER function executes with the privileges of the role
-- that defined it, not the invoking client's grants, so this revoke
-- does not prevent that internal use. It is never returned to any
-- client by discover_profiles.
--
-- Reconciled against the confirmed live RLS policies (5 policies on
-- `profiles`: enable_insert_for_users, enable_read_for_users,
-- profiles_insert, profiles_select, profiles_update — the two SELECT
-- policies both have qual=true and the two INSERT policies are
-- redundant-but-harmless duplicates; profiles_update is already
-- correctly owner-scoped via auth.uid()=id and is NOT touched here).
-- Row-level policies and column-level grants are independent Postgres
-- subsystems: a permissive `qual = true` SELECT policy only controls
-- which ROWS are visible, never which COLUMNS — so it cannot bypass
-- the column-level REVOKE below regardless of which roles the policy
-- lists. What the supplied pg_policies dump does NOT reveal is the
-- separate GRANT table (information_schema.role_column_grants) — i.e.
-- whether SELECT on these columns was ever ALSO granted to the PUBLIC
-- pseudo-role rather than only to `authenticated`/`anon` directly. A
-- REVOKE issued against a specific role never revokes a privilege the
-- column separately holds via a grant to PUBLIC. Revoking from PUBLIC
-- as well closes that gap unconditionally and is a safe no-op if no
-- such grant exists (REVOKE on a privilege that isn't held does not
-- error) — see the report's inspection SQL to confirm directly.
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

-- ════════════════════════════════════════════════════════════════════
-- PART 3 — Discovery RPC (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════
--
-- Replaces the client-side `fetchProfiles()` direct table query +
-- client-side Haversine filtering. Derives the viewer strictly from
-- auth.uid() — never trusts a client-supplied id. Runs as SECURITY
-- DEFINER (so it can read latitude/longitude server-side despite the
-- column revoke above) with a locked-down search_path, and returns
-- only an explicit, safe column list — raw latitude/longitude are
-- NEVER part of the return type, so there is no accidental leak
-- surface even if this function's body changes later.
CREATE OR REPLACE FUNCTION discover_profiles(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  photo TEXT,
  photos TEXT[],
  location TEXT,
  bio TEXT,
  bio_language TEXT,
  interests TEXT[],
  is_online BOOLEAN,
  last_seen TIMESTAMPTZ,
  distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_show_me TEXT;
  v_age_min INTEGER;
  v_age_max INTEGER;
  v_max_km INTEGER;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'discover_profiles requires an authenticated user';
  END IF;

  SELECT p.show_me, p.preferred_age_min, p.preferred_age_max, p.max_distance_km, p.latitude, p.longitude
  INTO v_show_me, v_age_min, v_age_max, v_max_km, v_lat, v_lng
  FROM profiles p
  WHERE p.id = v_uid;

  RETURN QUERY
  SELECT
    c.id, c.name, c.age, c.photo, c.photos, c.location, c.bio, c.bio_language, c.interests,
    c.is_online, c.last_seen,
    -- Only ever a rounded, computed distance — never raw coordinates,
    -- and never precise enough (1km resolution) to back out an exact
    -- location. NULL whenever either party lacks real coordinates.
    CASE
      WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL THEN
        ROUND((6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(c.latitude - v_lat) / 2), 2) +
          COS(RADIANS(v_lat)) * COS(RADIANS(c.latitude)) *
          POWER(SIN(RADIANS(c.longitude - v_lng) / 2), 2)
        )))::NUMERIC, 0)
      ELSE NULL
    END AS distance_km
  FROM profiles c
  WHERE c.id <> v_uid
    -- Age filter — uses the existing `age` integer (kept synchronized
    -- from date_of_birth by onboarding), so legacy and new profiles
    -- behave identically. age = 0 (never set) is treated as unknown,
    -- never excluded.
    AND (
      v_age_min IS NULL OR v_age_max IS NULL
      OR c.age = 0
      OR c.age BETWEEN v_age_min AND v_age_max
    )
    -- Show-me / gender filter — only restricts when the viewer has a
    -- specific preference. A candidate with no gender on file is
    -- naturally excluded from a "women"/"men" filtered view, but still
    -- appears when show_me is "everyone" (or unset).
    AND (
      v_show_me IS NULL OR v_show_me = 'everyone'
      OR (v_show_me = 'women' AND c.gender = 'woman')
      OR (v_show_me = 'men' AND c.gender = 'man')
    )
    -- Distance filter — only ever excludes a candidate when BOTH the
    -- viewer and that candidate have real coordinates AND the computed
    -- distance exceeds the viewer's max_distance_km. A candidate
    -- missing coordinates is never excluded by this clause — their
    -- distance is unknown, not "too far" — so legacy profiles without
    -- lat/lng still appear in Discover.
    AND (
      v_lat IS NULL OR v_lng IS NULL OR v_max_km IS NULL
      OR c.latitude IS NULL OR c.longitude IS NULL
      OR (6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(c.latitude - v_lat) / 2), 2) +
            COS(RADIANS(v_lat)) * COS(RADIANS(c.latitude)) *
            POWER(SIN(RADIANS(c.longitude - v_lng) / 2), 2)
          ))) <= v_max_km
    )
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION discover_profiles(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION discover_profiles(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION discover_profiles(INTEGER) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- PART 4 — Owner-only private-field RPC (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════
--
-- Lets a signed-in user read back their OWN date_of_birth, gender,
-- show_me, preferred_age_min/max, max_distance_km, latitude, longitude,
-- and onboarding_completed — the exact columns locked down for
-- cross-user SELECT in Part 2 above — without reopening them to any
-- other user.
--
-- Takes NO parameters at all (not even the caller's own id): identity
-- is derived exclusively from auth.uid() inside the function body, so
-- there is no argument a client could ever manipulate to target another
-- user's row. Runs as SECURITY DEFINER (so it can read the
-- column-revoked fields despite Part 2's REVOKE, exactly like
-- discover_profiles already does for latitude/longitude) with a locked
-- search_path, and returns only the caller's own single row — never
-- accepts nor uses any other id.
CREATE OR REPLACE FUNCTION get_own_private_profile()
RETURNS TABLE (
  date_of_birth DATE,
  gender TEXT,
  show_me TEXT,
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
    p.date_of_birth, p.gender, p.show_me,
    p.preferred_age_min, p.preferred_age_max, p.max_distance_km,
    p.latitude, p.longitude, p.onboarding_completed
  FROM profiles p
  WHERE p.id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION get_own_private_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_own_private_profile() FROM anon;
GRANT EXECUTE ON FUNCTION get_own_private_profile() TO authenticated;
