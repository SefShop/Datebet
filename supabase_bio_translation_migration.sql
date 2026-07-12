-- Bio language auto-detection + translation cache
-- Run this once in the Supabase SQL editor.

-- 1. Store the auto-detected language of each user's bio.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_language TEXT DEFAULT 'und';

-- 2. Shared translation cache — one row per (profile, exact bio text, target language).
--    If a profile's bio changes, its hash changes too, so old rows are simply
--    never matched again (no explicit cleanup required for correctness).
CREATE TABLE IF NOT EXISTS bio_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio_hash TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, bio_hash, target_lang)
);

ALTER TABLE bio_translations ENABLE ROW LEVEL SECURITY;

-- Same permissive pattern already used by profiles/pair_progress in this app.
DROP POLICY IF EXISTS "bio_translations_select" ON bio_translations;
CREATE POLICY "bio_translations_select" ON bio_translations FOR SELECT USING (true);

DROP POLICY IF EXISTS "bio_translations_insert" ON bio_translations;
CREATE POLICY "bio_translations_insert" ON bio_translations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bio_translations_update" ON bio_translations;
CREATE POLICY "bio_translations_update" ON bio_translations FOR UPDATE USING (true);
