-- PHASE A — Database preparation (safe to run BEFORE deploying new app code)
-- Split from the single approved consolidated migration
-- (2026-08-30-onboarding-preferences-and-profile-fields.sql) for a
-- deployment-safe rollout. NO architecture change — this is the exact
-- same approved Part 1 / Part 3 / Part 4 SQL, unmodified, with ONLY the
-- Part 2 column-level SELECT revokes deliberately deferred to Phase B
-- (see the companion -phase-b-privacy-lock.sql file).
--
-- NOT EXECUTED. Prepared for review only, per explicit instruction.
-- Do NOT run this against any environment (local, staging, or
-- production) without separate, explicit approval.
--
-- WHY THIS IS SAFE TO RUN WHILE THE CURRENTLY-DEPLOYED (OLD) APP IS
-- STILL LIVE:
-- Every statement below is purely additive:
--   - ADD COLUMN IF NOT EXISTS — nine brand-new, nullable-or-defaulted
--     columns (date_of_birth, gender, show_me, preferred_age_min,
--     preferred_age_max, max_distance_km, latitude, longitude). The old
--     app's compiled queries cannot reference columns that did not
--     exist when it was built, so it cannot be affected by their mere
--     existence. Any old `select('*')` against profiles simply starts
--     returning a few extra columns the old code already ignores.
--   - CREATE OR REPLACE FUNCTION (discover_profiles, get_own_private_profile)
--     — brand-new functions the old app never calls; creating them has
--     no effect on any code path the old app exercises.
--   - GRANT/REVOKE ... ON FUNCTION — scoped to these two brand-new
--     functions only. No existing table-level or column-level grant
--     on `profiles` is touched anywhere in this file.
-- No column-level SELECT REVOKE is present in this file. That is the
-- one part of the original consolidated migration intentionally left
-- for Phase B — see that file's own header for why.

-- ════════════════════════════════════════════════════════════════════
-- PART 1 — New profile columns (unchanged from the approved consolidated migration)
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
-- PART 3 — Discovery RPC (SECURITY DEFINER) — unchanged from the
-- approved consolidated migration
-- ════════════════════════════════════════════════════════════════════
--
-- Replaces the client-side `fetchProfiles()` direct table query +
-- client-side Haversine filtering. Derives the viewer strictly from
-- auth.uid() — never trusts a client-supplied id. Runs as SECURITY
-- DEFINER (so it can read latitude/longitude server-side even after
-- Phase B's column revoke lands) with a locked-down search_path, and
-- returns only an explicit, safe column list — raw latitude/longitude
-- are NEVER part of the return type, so there is no accidental leak
-- surface even if this function's body changes later. Safe to create
-- now: the OLD app never calls it, and it works correctly whether or
-- not Phase B has run yet (its own internal SELECT reads profiles as
-- the function owner, independent of any caller-role column grant).
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
  -- Server-side row cap — p_limit is client-controlled (an authenticated
  -- caller can invoke this RPC directly with any integer), so the
  -- LIMIT actually applied is always resolved server-side from it,
  -- never trusted as-is: NULL/omitted -> 50 (the documented default);
  -- <= 0 -> 50 (a non-positive request isn't a meaningful reduced page
  -- size, so it's treated the same as "not specified" rather than
  -- returned literally or turned into an unbounded/negative LIMIT);
  -- 1..50 -> used as requested; > 50 -> clamped down to 50. 50 is a
  -- hard ceiling in every branch — this function can never return more
  -- than 50 rows regardless of what p_limit is called with.
  v_limit INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'discover_profiles requires an authenticated user';
  END IF;

  v_limit := CASE
    WHEN p_limit IS NULL THEN 50
    WHEN p_limit <= 0 THEN 50
    WHEN p_limit > 50 THEN 50
    ELSE p_limit
  END;

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
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION discover_profiles(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION discover_profiles(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION discover_profiles(INTEGER) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- PART 4 — Owner-only private-field RPC (SECURITY DEFINER) — unchanged
-- from the approved consolidated migration
-- ════════════════════════════════════════════════════════════════════
--
-- Lets a signed-in user read back their OWN date_of_birth, gender,
-- show_me, preferred_age_min/max, max_distance_km, latitude, longitude,
-- and onboarding_completed — the exact columns Phase B will lock down
-- for cross-user SELECT — without reopening them to any other user.
-- Safe to create now, before Phase B: it works correctly whether or
-- not the column-level revoke has landed yet (SECURITY DEFINER reads
-- as the function owner, independent of the caller's own grants), and
-- the OLD app never calls it.
--
-- Takes NO parameters at all (not even the caller's own id): identity
-- is derived exclusively from auth.uid() inside the function body, so
-- there is no argument a client could ever manipulate to target another
-- user's row. Runs as SECURITY DEFINER with a locked search_path, and
-- returns only the caller's own single row — never accepts nor uses
-- any other id.
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

-- END OF PHASE A. Deploy the new application code only after this
-- phase has been applied. Do NOT run Phase B until the new code is
-- confirmed production-ready and fully rolled out — see
-- 2026-08-30-onboarding-preferences-and-profile-fields-phase-b-privacy-lock.sql.
