-- Server-authoritative Connect 4 move RPC.
-- Run this once in the Supabase SQL editor. NOT executed automatically.
--
-- Same proven pattern as play_tic_tac_toe_move (already deployed and
-- tested). Replaces the previous client-authoritative model (where each
-- client computed and wrote an entire next game_sessions.state itself)
-- with a single, atomic, server-side function. The database is now the
-- only authority for board/currentTurn/moves/winner/status for Connect 4.
--
-- Concurrency: the `FOR UPDATE` row lock inside the transaction is what
-- makes two near-simultaneous calls for the same session safe — the
-- second caller's SELECT ... FOR UPDATE blocks until the first caller's
-- transaction commits, then re-reads the already-updated row, so its own
-- "is it my turn / is the column full" checks correctly see the first
-- move's result and reject the sane way (not_your_turn or full_column),
-- rather than both writes racing to overwrite one another.
--
-- Board layout: 42 cells (6 rows x 7 columns), same row-major indexing
-- already used by the client (index = row * 7 + col, row 0 = top). A
-- disc dropped in a column occupies the lowest empty row in that column
-- — exactly the same "scan from the bottom row upward" logic the
-- client's own drop() already used.

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
  -- Derive the authenticated user directly from the JWT — never from any
  -- client-supplied value. If there is no authenticated user, reject.
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- 7. Verify column range.
  IF p_column IS NULL OR p_column < 0 OR p_column > 6 THEN
    RETURN jsonb_build_object('error', 'invalid_column');
  END IF;

  -- 1. Lock the row for the duration of this transaction.
  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  -- 2. Verify the session exists.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'missing_session');
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

  -- 5. Verify the game is still active.
  IF (v_state ->> 'status') IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('error', 'finished_game');
  END IF;

  -- 6. Verify it is genuinely this caller's turn.
  IF (v_state ->> 'currentTurn') IS DISTINCT FROM v_user_id::text THEN
    RETURN jsonb_build_object('error', 'not_your_turn');
  END IF;

  v_board := v_state -> 'board';
  IF v_board IS NULL OR jsonb_typeof(v_board) <> 'array' OR jsonb_array_length(v_board) <> 42 THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  -- 8/9. Find the lowest empty row in this column (row 5 = bottom, row 0
  -- = top — same scan-from-bottom-upward logic the client already used).
  -- Reject if the column is full.
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

  -- 10. Apply the correct disc (player_one = R, player_two = Y — same
  -- convention the client already used).
  v_my_symbol := CASE WHEN v_user_id = v_row.player_one_id THEN 'R' ELSE 'Y' END;
  v_idx := v_target_row * 7 + p_column;
  v_board := jsonb_set(v_board, ARRAY[v_idx::text], to_jsonb(v_my_symbol));

  -- 11. Increment move count.
  v_moves := coalesce((v_state ->> 'moves')::integer, 0) + 1;

  -- 12-14. Win detection — 4 in a row, horizontal, vertical, and both
  -- diagonals, checked from every cell as a potential starting point of
  -- a line (same exhaustive scan the client's own checkWin() used).
  v_won := false;
  FOR v_r IN 0..5 LOOP
    EXIT WHEN v_won;
    FOR v_c IN 0..6 LOOP
      v_cell := coalesce(v_board ->> (v_r * 7 + v_c), '');
      IF v_cell = '' OR v_cell <> v_my_symbol THEN CONTINUE; END IF;

      -- horizontal →
      IF v_c + 3 <= 6
        AND coalesce(v_board ->> (v_r*7+v_c+1),'') = v_my_symbol
        AND coalesce(v_board ->> (v_r*7+v_c+2),'') = v_my_symbol
        AND coalesce(v_board ->> (v_r*7+v_c+3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      -- vertical ↓
      IF v_r + 3 <= 5
        AND coalesce(v_board ->> ((v_r+1)*7+v_c),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      -- diagonal ↘
      IF v_r + 3 <= 5 AND v_c + 3 <= 6
        AND coalesce(v_board ->> ((v_r+1)*7+v_c+1),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c+2),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c+3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;

      -- diagonal ↙
      IF v_r + 3 <= 5 AND v_c - 3 >= 0
        AND coalesce(v_board ->> ((v_r+1)*7+v_c-1),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+2)*7+v_c-2),'') = v_my_symbol
        AND coalesce(v_board ->> ((v_r+3)*7+v_c-3),'') = v_my_symbol
      THEN v_won := true; EXIT; END IF;
    END LOOP;
  END LOOP;

  IF v_won THEN
    -- 16. Winner is the mover, since only the mover's own move can ever
    -- complete a winning line.
    v_winner := v_user_id;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSIF v_moves >= 42 THEN
    -- 15. Draw — board full, nobody won.
    v_winner := NULL;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSE
    -- 17. Otherwise pass the turn to the other player.
    v_winner := NULL;
    v_status := 'active';
    v_new_turn := CASE WHEN v_user_id = v_row.player_one_id THEN v_row.player_two_id ELSE v_row.player_one_id END;
  END IF;

  -- Preserve every existing field on the state object (progressCounted,
  -- etc.) — only the fields this move actually changes are overwritten.
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

  -- 18. Update the row once, atomically, still holding the lock from
  -- step 1 — no other caller can interleave a write between this
  -- transaction's read and write of the same row.
  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  -- 19. Return the complete canonical updated state.
  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

-- Callable by any authenticated user — the function itself enforces
-- every authorization check internally (participant check, turn check,
-- etc.), so this grant does not weaken security; it mirrors the same
-- model already used for play_tic_tac_toe_move.
GRANT EXECUTE ON FUNCTION play_connect_4_move(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
