-- Rematch flow rebuild: exact match scoping
-- Run this once in the Supabase SQL editor, in addition to
-- 2026-07-26-rematch-race-condition-fix.sql (still required — it
-- provides the atomic "at most one pending invite per pair+game_type"
-- protection this rebuild continues to rely on for mutual acceptance).
--
-- Adds a dedicated column linking a Play Again / rematch invite to the
-- exact completed game_sessions row it's a rematch for. Previously this
-- link was encoded as a hidden marker string inside the message field —
-- fragile, hard to verify, and easy to get subtly wrong. A real column
-- is directly queryable and indexable, and is what the floating rematch
-- notification now filters by instead of parsing text.
--
-- Null for a normal, brand-new challenge sent via Discover — those never
-- set this column at all, so they can never be mistaken for a rematch.

ALTER TABLE game_invites
ADD COLUMN IF NOT EXISTS original_session_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_game_invites_original_session
ON game_invites (original_session_id)
WHERE original_session_id IS NOT NULL;
