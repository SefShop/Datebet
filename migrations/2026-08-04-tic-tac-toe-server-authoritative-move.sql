-- Server-authoritative Tic Tac Toe move RPC.
-- Run this once in the Supabase SQL editor. NOT executed automatically.
--
-- Replaces the previous client-authoritative model (where each client
-- computed and wrote an entire next game_sessions.state itself) with a
-- single, atomic, server-side function. The database is now the only
-- authority for board/currentTurn/moves/winner/status for Tic Tac Toe.
--
-- Concurrency: the `FOR UPDATE` row lock inside the transaction is what
-- makes two near-simultaneous calls for the same session safe — the
-- second caller's SELECT ... FOR UPDATE blocks until the first caller's
-- transaction commits, then re-reads the already-updated row, so its own
-- "is it my turn / is the cell empty" checks correctly see the first
-- move's result and reject the sane way (not_your_turn or cell_occupied),
-- rather than both writes racing to overwrite one another.

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
  -- 1/2. Derive the authenticated user directly from the JWT — never
  -- from any client-supplied value. If there is no authenticated user
  -- at all, reject immediately.
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_cell_index IS NULL OR p_cell_index < 0 OR p_cell_index > 8 THEN
    RETURN jsonb_build_object('error', 'invalid_cell');
  END IF;

  -- 1. Lock the row for the duration of this transaction.
  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  -- 2. Verify the session exists.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  -- 3. Verify game_type.
  IF v_row.game_type IS DISTINCT FROM 'tic_tac_toe' THEN
    RETURN jsonb_build_object('error', 'wrong_game_type');
  END IF;

  -- 4. Verify the caller is a participant.
  IF v_user_id <> v_row.player_one_id AND v_user_id <> v_row.player_two_id THEN
    RETURN jsonb_build_object('error', 'not_a_player');
  END IF;

  v_state := v_row.state;

  -- 5. Verify the game is still active.
  IF (v_state ->> 'status') IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('error', 'game_finished');
  END IF;

  -- 6. Verify it is genuinely this caller's turn.
  IF (v_state ->> 'currentTurn') IS DISTINCT FROM v_user_id::text THEN
    RETURN jsonb_build_object('error', 'not_your_turn');
  END IF;

  v_board := v_state -> 'board';
  IF v_board IS NULL OR jsonb_typeof(v_board) <> 'array' OR jsonb_array_length(v_board) <> 9 THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  -- 8. Verify the target cell is empty.
  IF coalesce(v_board ->> p_cell_index, '') <> '' THEN
    RETURN jsonb_build_object('error', 'cell_occupied');
  END IF;

  -- 9. Apply the correct mark based on player assignment
  -- (player_one = X, player_two = O — same convention the client already
  -- used).
  v_my_symbol := CASE WHEN v_user_id = v_row.player_one_id THEN 'X' ELSE 'O' END;
  v_board := jsonb_set(v_board, ARRAY[p_cell_index::text], to_jsonb(v_my_symbol));

  -- 10. Increment move count.
  v_moves := coalesce((v_state ->> 'moves')::integer, 0) + 1;

  -- 11. Detect a win — the same 8 lines the client's own checkWinner()
  -- already checked, replicated exactly (rows, columns, two diagonals).
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
    -- 13. Set winner/status — winner is the mover, since only the mover's
    -- own move can ever complete a winning line. Turn value is no longer
    -- meaningful once status='finished', but kept as the mover's own id
    -- for consistency with existing client expectations.
    v_winner := v_user_id;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSIF v_moves >= 9 THEN
    -- 12. Detect a draw.
    v_winner := NULL;
    v_status := 'finished';
    v_new_turn := v_user_id;
  ELSE
    -- 14. Otherwise pass the turn to the other player.
    v_winner := NULL;
    v_status := 'active';
    v_new_turn := CASE WHEN v_user_id = v_row.player_one_id THEN v_row.player_two_id ELSE v_row.player_one_id END;
  END IF;

  -- Preserve every existing field on the state object (gameNumber,
  -- parentSessionId, progressCounted, playAgain, etc.) — only the fields
  -- this move actually changes are overwritten. This is what keeps the
  -- RPC additive/compatible with the existing client-side metadata
  -- (progressCounted/playAgain) that remains a separate, later write.
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

  -- 15. Update the row once, atomically, still holding the lock from
  -- step 1 — no other caller can interleave a write between this
  -- transaction's read and write of the same row.
  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  -- 16. Return the complete canonical updated state.
  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

-- Callable by any authenticated user — the function itself enforces
-- every authorization check internally (participant check, turn check,
-- etc.), so this grant does not weaken security; it mirrors the same
-- model the existing RLS-protected tables already rely on.
GRANT EXECUTE ON FUNCTION play_tic_tac_toe_move(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
