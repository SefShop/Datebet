-- Manual presence status (Online / Away / Offline) for the Profile
-- status dot. Run this once in the Supabase SQL editor.
--
-- This is entirely separate from the existing is_online/last_seen
-- automatic presence columns — those are untouched. presence_status is
-- a user-controlled, manual override that the app never overwrites
-- automatically (no activity/visibility/focus-based logic touches it).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS presence_status text
  CHECK (presence_status IN ('online', 'away', 'offline'));

-- Existing rows and any user who hasn't picked a status yet default to
-- 'online' at the application layer (lib/presenceStatus.ts treats a
-- NULL value as 'online'), so no backfill UPDATE is required here.
