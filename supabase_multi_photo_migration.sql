-- Multi-photo profile support (up to 9 photos)
-- Run this once in the Supabase SQL editor.

-- Ordered array of photo URLs. Index 0 is always the primary photo and
-- stays mirrored into the existing `photo` column so games, invites, and
-- any other code that only ever read `profiles.photo` keep working
-- unchanged — they continue to see exactly the primary photo.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Backfill: existing single-photo profiles get a one-element photos array
-- so they immediately work with the new gallery without needing a re-save.
UPDATE profiles
SET photos = ARRAY[photo]
WHERE photo IS NOT NULL AND photo <> '' AND (photos IS NULL OR array_length(photos, 1) IS NULL);
