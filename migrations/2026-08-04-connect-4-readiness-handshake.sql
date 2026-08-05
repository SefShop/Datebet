-- Connect 4 two-player readiness handshake.
-- Run this once in the Supabase SQL editor, AFTER the existing
-- 2026-08-04-connect-4-server-authoritative-move.sql migration.
-- NOT executed automatically.
--
-- Adds a server-authoritative readiness gate: a freshly created Connect 4
-- session now starts as status = 'waiting_for_players' with an empty
-- readyPlayers list, and only transitions to status = 'active' (with
-- currentTurn set to player_one_id) once BOTH participants have called
-- mark_connect_4_player_ready(). This closes the timing gap where Player
-- 1 could make the first move before Player 2's client had actually
-- finished subscribing to the new session's realtime channel — the move
-- RPC itself was always safe (correctly atomic), but nothing previously
-- prevented Player 1 from calling it before Player 2 was truly ready to
-- receive its result.

-- ── Step 1: mark_connect_4_player_ready ─────────────────────────────
CREATE OR REPLACE FUNCTION mark_connect_4_player_ready(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_row game_sessions%ROWTYPE;
  v_state jsonb;
  v_ready jsonb;
  v_ready_ids text[];
  v_both_ready boolean;
  v_new_state jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- 1. Lock the row for the duration of this transaction — makes two
  -- near-simultaneous ready calls (one per player, or a duplicate call
  -- from the same player after a reconnect) safe: the second call's
  -- lock acquisition waits for the first to commit, then reads the
  -- already-updated readyPlayers list.
  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  -- 2. Verify the session exists.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  -- 3. Verify game_type.
  IF v_row.game_type IS DISTINCT FROM 'connect_4' THEN
    RETURN jsonb_build_object('error', 'wrong_game_type');
  END IF;

  -- 4. Verify the caller is a participant.
  IF v_user_id <> v_row.player_one_id AND v_user_id <> v_row.player_two_id THEN
    RETURN jsonb_build_object('error', 'not_a_player');
  END IF;

  v_state := v_row.state;
  v_ready := coalesce(v_state -> 'readyPlayers', '[]'::jsonb);

  -- 5/6. Add this user idempotently — never add the same player twice.
  -- Read the existing list into a text[] to check membership simply and
  -- safely, then rebuild it as jsonb.
  SELECT array_agg(value) INTO v_ready_ids FROM jsonb_array_elements_text(v_ready);
  IF v_ready_ids IS NULL THEN v_ready_ids := ARRAY[]::text[]; END IF;

  IF NOT (v_user_id::text = ANY(v_ready_ids)) THEN
    v_ready_ids := v_ready_ids || v_user_id::text;
  END IF;

  v_both_ready := v_row.player_one_id::text = ANY(v_ready_ids)
               AND v_row.player_two_id::text = ANY(v_ready_ids);

  v_ready := to_jsonb(v_ready_ids);

  IF v_both_ready THEN
    -- 8. Both players ready — atomically activate the session.
    -- Preserve the fresh empty board and moves = 0 already set at
    -- creation time — this function never touches board/moves itself.
    v_new_state := v_state || jsonb_build_object(
      'readyPlayers', v_ready,
      'status', 'active',
      'currentTurn', v_row.player_one_id::text
    );
  ELSE
    -- 7. Only one player ready so far — status stays exactly as it was
    -- (waiting_for_players for a fresh session; if this is called again
    -- after the session is already active — e.g. a reconnect calling it
    -- redundantly — status/currentTurn are left untouched, not reset).
    v_new_state := v_state || jsonb_build_object('readyPlayers', v_ready);
  END IF;

  -- 9. Update the row once.
  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  -- 10. Return the complete canonical state.
  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_connect_4_player_ready(uuid) TO authenticated;

-- ── Step 2: play_connect_4_move — clearer rejection for the new state ──
-- The existing "status IS DISTINCT FROM 'active'" check already,
-- correctly rejects a move attempted while status = 'waiting_for_players'
-- (since that isn't 'active' either) — no behavioral gap existed here.
-- This only replaces the previously-reused 'finished_game' error with a
-- more accurate one for this specific case, so client-side logging/
-- debugging isn't misleading (a game that hasn't started yet is not the
-- same condition as one that has already ended). Board rules, win
-- detection, draw detection, and column behavior are completely
-- unchanged below this point.
CREATE OR REPLACE FUNCTION play_connect_4_move(
  p_session_id uuid,
  p_column integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_row game_sessions%ROWTYPE;
  v_state jsonb;
  v_board jsonb;
  v_my_symbol text;
  v_moves integer;
  v_target_row integer;
  v_r integer;
  v_c integer;
  v_idx integer;
  v_won boolean;
  v_winner uuid;
  v_status text;
  v_new_turn uuid;
  v_new_state jsonb;
  v_cell text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_column IS NULL OR p_column < 0 OR p_column > 6 THEN
    RETURN jsonb_build_object('error', 'invalid_column');
  END IF;

  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'missing_session');
  END IF;

  IF v_row.game_type IS DISTINCT FROM 'connect_4' THEN
    RETURN jsonb_build_object('error', 'wrong_game_type');
  END IF;

  IF v_user_id <> v_row.player_one_id AND v_user_id <> v_row.player_two_id THEN
    RETURN jsonb_build_object('error', 'not_a_player');
  END IF;

  v_state := v_row.state;

  -- Explicit, clearer rejection for a session still waiting on the
  -- readiness handshake — same underlying condition (status <> 'active')
  -- as before, just a more accurate error code for this specific case.
  IF (v_state ->> 'status') = 'waiting_for_players' THEN
    RETURN jsonb_build_object('error', 'not_ready');
  END IF;

  IF (v_state ->> 'status') IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('error', 'finished_game');
  END IF;

  IF (v_state ->> 'currentTurn') IS DISTINCT FROM v_user_id::text THEN
    RETURN jsonb_build_object('error', 'not_your_turn');
  END IF;

  v_board := v_state -> 'board';
  IF v_board IS NULL OR jsonb_typeof(v_board) <> 'array' OR jsonb_array_length(v_board) <> 42 THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  v_target_row := NULL;
  FOR v_r IN REVERSE 5..0 LOOP
    v_idx := v_r * 7 + p_column;
    v_cell := coalesce(v_board ->> v_idx, '');
    IF v_cell = '' THEN
      v_target_row := v_r;
      EXIT;
    END IF;
  END LOOP;

  IF v_target_row IS NULL THEN
    RETURN jsonb_build_object('error', 'full_column');
  END IF;

  v_my_symbol := CASE WHEN v_user_id = v_row.player_one_id THEN 'R' ELSE 'Y' END;
  v_idx := v_target_row * 7 + p_column;
  v_board := jsonb_set(v_board, ARRAY[v_idx::text], to_jsonb(v_my_symbol));

  v_moves := coalesce((v_state ->> 'moves')::integer, 0) + 1;

  v_won := false;
  FOR v_r IN 0..5 LOOP
    EXIT WHEN v_won;
    FOR v_c IN 0..6 LOOP
      v_cell := coalesce(v_board ->> (v_r * 7 + v_c), '');
      IF v_cell = '' OR v_cell <> v_my_symbol THEN CONTINUE; END IF;

      IF v_c + 3 <= 6
        AND coalesce(v_board ->> (v_r*7+v_c+1),'') = v_my_symbol
        AND coalesce(v_board ->> (v_r*7+v_c+2),'') = v_my_symbol
        AND coalesce(v_board ->> (v_r*7+v_c+3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      IF v_r + 3 <= 5
        AND coalesce(v_board ->> ((v_r+1)*7+v_c),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      IF v_r + 3 <= 5 AND v_c + 3 <= 6
        AND coalesce(v_board ->> ((v_r+1)*7+v_c+1),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c+2),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c+3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      IF v_r + 3 <= 5 AND v_c - 3 >= 0
        AND coalesce(v_board ->> ((v_r+1)*7+v_c-1),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c-2),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c-3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;
    END LOOP;
  END LOOP;

  IF v_won THEN
    v_winner := v_user_id;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSIF v_moves >= 42 THEN
    v_winner := NULL;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSE
    v_winner := NULL;
    v_status := 'active';
    v_new_turn := CASE WHEN v_user_id = v_row.player_one_id THEN v_row.player_two_id ELSE v_row.player_one_id END;
  END IF;

  v_new_state := v_state
    || jsonb_build_object(
      'board', v_board,
      'moves', v_moves,
      'status', v_status,
      'currentTurn', v_new_turn::text,
      'winner', CASE
                  WHEN v_status <> 'finished' THEN NULL
                  WHEN v_won THEN v_winner::text
                  ELSE 'draw'
                END
    );

  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION play_connect_4_move(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
