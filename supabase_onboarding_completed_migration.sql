-- First-time onboarding completion (Landing -> Sign in -> Play Together -> Discover)
-- Run this once in the Supabase SQL editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Existing users should never be shown the Play Together intro again — they
-- already have profile data, so treat them as already completed.
UPDATE profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NOT true
  AND name IS NOT NULL AND name <> '' AND name <> 'Player';
