-- Tic Tac Toe two-player readiness handshake.
-- Run this once in the Supabase SQL editor, AFTER the existing
-- 2026-08-04-tic-tac-toe-server-authoritative-move.sql migration.
-- NOT executed automatically.
--
-- Same proven readiness-handshake pattern already deployed for Connect 4
-- (mark_connect_4_player_ready). A freshly created Tic Tac Toe session
-- now starts as status = 'waiting_for_players' with an empty readyPlayers
-- list, and only transitions to status = 'active' (with currentTurn set
-- to player_one_id) once BOTH participants have called
-- mark_tic_tac_toe_player_ready(). This closes the same timing gap
-- Connect4 had: Player 1 being able to make the first move before Player
-- 2's client had actually finished subscribing to the new session's
-- realtime channel.

-- ── Step 1: mark_tic_tac_toe_player_ready ───────────────────────────
CREATE OR REPLACE FUNCTION mark_tic_tac_toe_player_ready(
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

  -- Lock the row for the duration of this transaction — makes two
  -- near-simultaneous ready calls (one per player, or a duplicate call
  -- from the same player after a reconnect) safe.
  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  IF v_row.game_type IS DISTINCT FROM 'tic_tac_toe' THEN
    RETURN jsonb_build_object('error', 'wrong_game_type');
  END IF;

  IF v_user_id <> v_row.player_one_id AND v_user_id <> v_row.player_two_id THEN
    RETURN jsonb_build_object('error', 'not_a_player');
  END IF;

  v_state := v_row.state;
  v_ready := coalesce(v_state -> 'readyPlayers', '[]'::jsonb);

  -- Add this user idempotently — never add the same player twice.
  SELECT array_agg(value) INTO v_ready_ids FROM jsonb_array_elements_text(v_ready);
  IF v_ready_ids IS NULL THEN v_ready_ids := ARRAY[]::text[]; END IF;

  IF NOT (v_user_id::text = ANY(v_ready_ids)) THEN
    v_ready_ids := v_ready_ids || v_user_id::text;
  END IF;

  v_both_ready := v_row.player_one_id::text = ANY(v_ready_ids)
               AND v_row.player_two_id::text = ANY(v_ready_ids);

  v_ready := to_jsonb(v_ready_ids);

  IF v_both_ready THEN
    -- Both players ready — atomically activate the session. Preserves
    -- the fresh empty board and moves = 0 already set at creation time
    -- (this function never touches board/moves itself), plus any other
    -- existing fields (gameNumber, parentSessionId, progressCounted).
    v_new_state := v_state || jsonb_build_object(
      'readyPlayers', v_ready,
      'status', 'active',
      'currentTurn', v_row.player_one_id::text
    );
  ELSE
    -- Only one player ready so far — status/currentTurn stay exactly as
    -- they were (waiting_for_players / null for a fresh session).
    v_new_state := v_state || jsonb_build_object('readyPlayers', v_ready);
  END IF;

  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_tic_tac_toe_player_ready(uuid) TO authenticated;

-- ── Step 2: play_tic_tac_toe_move — clearer rejection for the new state ──
-- The existing "status IS DISTINCT FROM 'active'" check already,
-- correctly rejects a move attempted while status = 'waiting_for_players'
-- — no behavioral gap existed here. This only replaces the previously-
-- reused 'game_finished' error with a more accurate 'not_ready' for this
-- specific case. Board rules, win detection, and move logic below this
-- point are completely unchanged from the existing deployed function.
CREATE OR REPLACE FUNCTION play_tic_tac_toe_move(
  p_session_id uuid,
  p_cell_index integer
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
  v_winner_symbol text;
  v_winner uuid;
  v_status text;
  v_new_turn uuid;
  v_new_state jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_cell_index IS NULL OR p_cell_index < 0 OR p_cell_index > 8 THEN
    RETURN jsonb_build_object('error', 'invalid_cell');
  END IF;

  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  IF v_row.game_type IS DISTINCT FROM 'tic_tac_toe' THEN
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
    RETURN jsonb_build_object('error', 'game_finished');
  END IF;

  IF (v_state ->> 'currentTurn') IS DISTINCT FROM v_user_id::text THEN
    RETURN jsonb_build_object('error', 'not_your_turn');
  END IF;

  v_board := v_state -> 'board';
  IF v_board IS NULL OR jsonb_typeof(v_board) <> 'array' OR jsonb_array_length(v_board) <> 9 THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  IF coalesce(v_board ->> p_cell_index, '') <> '' THEN
    RETURN jsonb_build_object('error', 'cell_occupied');
  END IF;

  v_my_symbol := CASE WHEN v_user_id = v_row.player_one_id THEN 'X' ELSE 'O' END;
  v_board := jsonb_set(v_board, ARRAY[p_cell_index::text], to_jsonb(v_my_symbol));

  v_moves := coalesce((v_state ->> 'moves')::integer, 0) + 1;

  v_winner_symbol := NULL;
  IF (v_board->>0 <> '' AND v_board->>0 = v_board->>1 AND v_board->>0 = v_board->>2) THEN v_winner_symbol := v_board->>0;
  ELSIF (v_board->>3 <> '' AND v_board->>3 = v_board->>4 AND v_board->>3 = v_board->>5) THEN v_winner_symbol := v_board->>3;
  ELSIF (v_board->>6 <> '' AND v_board->>6 = v_board->>7 AND v_board->>6 = v_board->>8) THEN v_winner_symbol := v_board->>6;
  ELSIF (v_board->>0 <> '' AND v_board->>0 = v_board->>3 AND v_board->>0 = v_board->>6) THEN v_winner_symbol := v_board->>0;
  ELSIF (v_board->>1 <> '' AND v_board->>1 = v_board->>4 AND v_board->>1 = v_board->>7) THEN v_winner_symbol := v_board->>1;
  ELSIF (v_board->>2 <> '' AND v_board->>2 = v_board->>5 AND v_board->>2 = v_board->>8) THEN v_winner_symbol := v_board->>2;
  ELSIF (v_board->>0 <> '' AND v_board->>0 = v_board->>4 AND v_board->>0 = v_board->>8) THEN v_winner_symbol := v_board->>0;
  ELSIF (v_board->>2 <> '' AND v_board->>2 = v_board->>4 AND v_board->>2 = v_board->>6) THEN v_winner_symbol := v_board->>2;
  END IF;

  IF v_winner_symbol IS NOT NULL THEN
    v_winner := v_user_id;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSIF v_moves >= 9 THEN
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
                  WHEN v_winner_symbol IS NOT NULL THEN v_winner::text
                  ELSE 'draw'
                END
    );

  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION play_tic_tac_toe_move(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
