-- Rematch race-condition fix: database-level atomic protection
-- Run this once in the Supabase SQL editor.
--
-- Enforces at most one PENDING game_invites row per unordered pair of
-- users + game_type, regardless of which direction (sender/receiver) it
-- was created in. This is what makes a genuine simultaneous "Play Again"
-- press from both users safe: whichever insert reaches Postgres first
-- wins, and the second is rejected with a unique-violation error (code
-- 23505) instead of silently creating a second, conflicting row — the
-- application already catches this specific error and recovers by
-- fetching and reusing the canonical row that won.
--
-- LEAST/GREATEST make the index direction-independent: a pending invite
-- from A→B and one from B→A for the same game_type collide on the same
-- index entry, so only one can exist at a time.

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_rematch_per_pair
ON game_invites (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  game_type
)
WHERE status = 'pending';
