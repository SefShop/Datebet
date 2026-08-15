-- Fixes the proven root cause from Step 17D: mark_tic_tac_toe_player_ready
-- and mark_connect_4_player_ready both unconditionally overwrite
-- status/currentTurn whenever both participants are already present in
-- readyPlayers — true for any session that ever started, finished or
-- not. A realtime WebSocket reconnect (common: brief network blip, tab
-- backgrounding/foregrounding, device sleep/wake) re-fires the client's
-- post-SUBSCRIBE callback, which unconditionally re-calls this RPC —
-- silently flipping an already-finished game's status back to 'active'
-- while leaving winner/moves/board/progressCounted untouched (since the
-- RPC's own jsonb merge only ever overwrites the keys it explicitly
-- names), which is exactly the corrupted-row shape already observed.
--
-- Fix: each RPC now verifies state->>'status' = 'waiting_for_players'
-- BEFORE doing anything else. If the session has already left that
-- state for any reason (active, finished, or otherwise), the function
-- immediately returns the current, completely unmodified state as a
-- safe no-op — it does not touch readyPlayers, status, currentTurn,
-- winner, board, moves, progressCounted, or any other field. A
-- waiting_for_players session is completely unaffected by this change;
-- its own transition to 'active' via this same RPC works exactly as
-- before.
--
-- This is a forward-only migration — it does not edit or replace the
-- history of either already-applied migration; it simply re-issues
-- CREATE OR REPLACE FUNCTION for both functions with the added guard,
-- which is the same, already-established mechanism the prior migrations
-- for these same two functions used.
--
-- Run this once in the Supabase SQL editor. NOT executed automatically.

-- ── Tic Tac Toe ──────────────────────────────────────────────────────
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

  -- Guard: this RPC may only ever transition a session FROM
  -- waiting_for_players TO active. Once a session has left that state
  -- for any reason (active, finished, or otherwise), it is completely
  -- immutable to this function from this point on — safe no-op,
  -- current state returned unchanged, nothing written.
  IF (v_state ->> 'status') IS DISTINCT FROM 'waiting_for_players' THEN
    RETURN jsonb_build_object('ok', true, 'state', v_state, 'noop', true);
  END IF;

  v_ready := coalesce(v_state -> 'readyPlayers', '[]'::jsonb);

  SELECT array_agg(value) INTO v_ready_ids FROM jsonb_array_elements_text(v_ready);
  IF v_ready_ids IS NULL THEN v_ready_ids := ARRAY[]::text[]; END IF;

  IF NOT (v_user_id::text = ANY(v_ready_ids)) THEN
    v_ready_ids := v_ready_ids || v_user_id::text;
  END IF;

  v_both_ready := v_row.player_one_id::text = ANY(v_ready_ids)
               AND v_row.player_two_id::text = ANY(v_ready_ids);

  v_ready := to_jsonb(v_ready_ids);

  IF v_both_ready THEN
    v_new_state := v_state || jsonb_build_object(
      'readyPlayers', v_ready,
      'status', 'active',
      'currentTurn', v_row.player_one_id::text
    );
  ELSE
    v_new_state := v_state || jsonb_build_object('readyPlayers', v_ready);
  END IF;

  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_tic_tac_toe_player_ready(uuid) TO authenticated;

-- ── Connect 4 ────────────────────────────────────────────────────────
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

  SELECT * INTO v_row FROM game_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  IF v_row.game_type IS DISTINCT FROM 'connect_4' THEN
    RETURN jsonb_build_object('error', 'wrong_game_type');
  END IF;

  IF v_user_id <> v_row.player_one_id AND v_user_id <> v_row.player_two_id THEN
    RETURN jsonb_build_object('error', 'not_a_player');
  END IF;

  v_state := v_row.state;

  -- Guard: identical protection as Tic Tac Toe above — a session that
  -- has already left waiting_for_players is completely immutable to
  -- this function from this point on.
  IF (v_state ->> 'status') IS DISTINCT FROM 'waiting_for_players' THEN
    RETURN jsonb_build_object('ok', true, 'state', v_state, 'noop', true);
  END IF;

  v_ready := coalesce(v_state -> 'readyPlayers', '[]'::jsonb);

  SELECT array_agg(value) INTO v_ready_ids FROM jsonb_array_elements_text(v_ready);
  IF v_ready_ids IS NULL THEN v_ready_ids := ARRAY[]::text[]; END IF;

  IF NOT (v_user_id::text = ANY(v_ready_ids)) THEN
    v_ready_ids := v_ready_ids || v_user_id::text;
  END IF;

  v_both_ready := v_row.player_one_id::text = ANY(v_ready_ids)
               AND v_row.player_two_id::text = ANY(v_ready_ids);

  v_ready := to_jsonb(v_ready_ids);

  IF v_both_ready THEN
    v_new_state := v_state || jsonb_build_object(
      'readyPlayers', v_ready,
      'status', 'active',
      'currentTurn', v_row.player_one_id::text
    );
  ELSE
    v_new_state := v_state || jsonb_build_object('readyPlayers', v_ready);
  END IF;

  UPDATE game_sessions SET state = v_new_state WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'state', v_new_state);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_connect_4_player_ready(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
