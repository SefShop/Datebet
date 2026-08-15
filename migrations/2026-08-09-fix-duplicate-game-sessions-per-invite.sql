-- Permanent fix for the proven root cause: game_sessions has no unique
-- constraint on invite_id, so createGameSession()'s check-then-insert
-- (lib/gameInvites.ts) can — and, per production evidence, has —
-- created more than one game_sessions row for the same accepted invite.
-- Each participant then converges on a different row, marks itself
-- ready on that row alone, and both remain stuck on
-- "Waiting for a player..." forever, since neither row's readyPlayers
-- can ever contain both participants.
--
-- This migration is destructive-data-safe: it NEVER deletes a
-- game_sessions row. Losing rows in a duplicate group are kept exactly
-- as they are (state, moves, winner, progressCounted — everything) and
-- only have their invite_id column cleared, which is enough to let the
-- unique index below be created. Nothing else in the schema references
-- game_sessions.invite_id as a foreign key (game_invites.original_session_id
-- is a plain, unconstrained uuid column — confirmed directly from
-- migrations/2026-07-27-rematch-original-session-column.sql), and
-- pair_progress is keyed entirely by (user_one_id, user_two_id), never by
-- any specific game_sessions.id (confirmed directly from
-- lib/pairProgress.ts) — so clearing invite_id cannot orphan or break
-- any other table's data.
--
-- Run this once in the Supabase SQL editor. NOT executed automatically.

-- ── Step 1: resolve historical duplicates ───────────────────────────
DO $$
DECLARE
  v_remaining_duplicate_groups integer;
BEGIN
  -- Canonical-row rule, in priority order, for each invite_id group:
  --   1. progressCounted = true wins outright — direct, unambiguous
  --      proof this exact row is the one the game-completion logic
  --      actually ran on (incrementPairGames() was called against it).
  --   2. Otherwise, the row with the most real move progress
  --      (state->>'moves') wins — the row that was actually played,
  --      versus a sibling that was created and then immediately
  --      abandoned at moves = 0 (the exact, structurally-guaranteed
  --      shape of the "waiting_for_players" freeze this migration
  --      exists to fix).
  --   3. Among ties, a finished game is preferred over one still
  --      active/waiting — a completed game is unambiguously "the one
  --      that was actually played to completion."
  --   4. Final, deterministic tiebreaker: earliest created_at, then id —
  --      this exactly matches the application's own existing, long-
  --      standing convention (loadSessionByInvite() and
  --      createGameSession() both already treat "earliest row for this
  --      invite_id" as canonical — see the code comment in
  --      loadSessionByInvite(): "so BOTH users deterministically pick
  --      the SAME (earliest) session").
  WITH ranked AS (
    SELECT
      id,
      invite_id,
      ROW_NUMBER() OVER (
        PARTITION BY invite_id
        ORDER BY
          CASE WHEN coalesce(state->>'progressCounted', 'false') = 'true' THEN 0 ELSE 1 END,
          coalesce((state->>'moves')::int, 0) DESC,
          CASE WHEN state->>'status' = 'finished' THEN 0 ELSE 1 END,
          created_at ASC,
          id ASC
      ) AS rn
    FROM game_sessions
    WHERE invite_id IS NOT NULL
  )
  UPDATE game_sessions gs
  SET invite_id = NULL
  FROM ranked
  WHERE gs.id = ranked.id
    AND ranked.rn > 1;

  -- Fail loudly rather than silently proceeding to an index creation
  -- that would itself fail with a less-informative error — this also
  -- catches any case this rule genuinely could not resolve (it always
  -- resolves deterministically as written, so this should never fire;
  -- it exists purely as a hard safety check before Step 2).
  SELECT count(*) INTO v_remaining_duplicate_groups
  FROM (
    SELECT invite_id
    FROM game_sessions
    WHERE invite_id IS NOT NULL
    GROUP BY invite_id
    HAVING count(*) > 1
  ) remaining;

  IF v_remaining_duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Refusing to create unique index: % invite_id group(s) still have duplicate game_sessions rows after resolution. No data was deleted or further modified — investigate before re-running this migration.',
      v_remaining_duplicate_groups;
  END IF;
END $$;

-- ── Step 2: permanent, database-enforced invariant ──────────────────
-- Partial index (WHERE invite_id IS NOT NULL) — a session row with a
-- null invite_id (either a genuinely inviteless row, if any ever exist,
-- or one of the historical duplicates cleared in Step 1 above) is
-- explicitly allowed to coexist with others; only a real, non-null
-- invite_id must now be unique.
CREATE UNIQUE INDEX IF NOT EXISTS one_session_per_invite
ON game_sessions (invite_id)
WHERE invite_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
