-- Rematch gameplay sync bug: database-level atomic protection for
-- session creation. Run this once in the Supabase SQL editor.
--
-- createGameSession() does a "check for existing row by invite_id, then
-- insert if none found" — with no database-level guarantee, this has a
-- race window: if both participants' clients call enterAcceptedGame()
-- near-simultaneously (a very normal timing for a rematch — the sender's
-- WaitingScreen and the receiver's direct Accept can both react to the
-- same accepted invite within moments of each other), both could see "no
-- existing session" and each insert their own, separate game_sessions
-- row for the same invite. The two players then end up isolated on two
-- different rows — each with its own independent currentTurn — instead
-- of one shared game. This is what let one player play normally (moves
-- succeed on their own row) while the other appeared permanently stuck
-- (their row's currentTurn never advances, since no one on their actual
-- channel is the one who's supposed to move first).
--
-- One invite must never have more than one session, ever, unconditionally.

CREATE UNIQUE INDEX IF NOT EXISTS one_session_per_invite
ON game_sessions (invite_id);

NOTIFY pgrst, 'reload schema';
