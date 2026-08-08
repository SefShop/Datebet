-- Atomic game_invites resolution — closes the upstream race that let two
-- participants in one intended match/rematch end up on two different
-- game_sessions rows (proven via real two-client diagnostic traces —
-- Case H: PC 1 and PC 2 ended up on different session IDs for what was
-- meant to be the same rematch).
--
-- ROOT CAUSE (proven from code reading, not guessed):
-- The existing unique index `one_pending_rematch_per_pair` on
-- game_invites correctly prevents two PENDING rows from coexisting for
-- the same pair+game_type — but sendGameInvite()'s own post-insert
-- "competing invite" reconciliation check (in lib/gameInvites.ts) is a
-- plain, independent SELECT that runs after a successful insert, with NO
-- causal ordering guarantee against the other participant's own,
-- concurrent insert transaction. Unlike this migration's genuinely safe
-- unique-violation recovery paths elsewhere in the same file (which are
-- triggered BY a constraint violation, guaranteeing the winning row is
-- already committed and visible by the time the recovery SELECT runs),
-- this reconciliation SELECT has no such guarantee — it can genuinely
-- execute before the other participant's own INSERT has committed,
-- returning "no competing invite found" to BOTH participants
-- simultaneously if the unique index doesn't (for any reason) block one
-- of the two inserts. Each participant then believes their own,
-- different invite is canonical, and each independently creates its own
-- game_sessions row for it — exactly the proven Case H failure.
--
-- FIX: this RPC replaces the entire "check pending (either direction) →
-- insert if none → best-effort post-insert reconcile" application-level
-- sequence with one atomic, server-side operation. Run this once in the
-- Supabase SQL editor. NOT executed automatically.

CREATE OR REPLACE FUNCTION resolve_game_invite(
  p_other_user_id uuid,
  p_game_type text,
  p_original_session_id uuid DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing game_invites%ROWTYPE;
  v_new game_invites%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = v_user_id THEN
    RETURN jsonb_build_object('error', 'invalid_other_user');
  END IF;
  IF p_game_type IS NULL OR p_game_type = '' THEN
    RETURN jsonb_build_object('error', 'invalid_game_type');
  END IF;

  LOOP
    -- Lock any existing pending invite for this exact pair + game_type
    -- (either direction — a pending invite between two users for one
    -- game_type is inherently the same conceptual request regardless of
    -- who happens to be sender vs receiver). The lock is what makes two
    -- near-simultaneous callers converge on one single, consistent view
    -- of "does a pending invite already exist" — a genuine ordering
    -- guarantee, not an independent read that could race the other
    -- caller's own in-flight transaction.
    SELECT * INTO v_existing FROM game_invites
    WHERE status = 'pending'
      AND game_type = p_game_type
      AND ((sender_id = v_user_id AND receiver_id = p_other_user_id)
        OR (sender_id = p_other_user_id AND receiver_id = v_user_id))
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing.sender_id = v_user_id THEN
        -- Mine — refresh it (same existing behavior: moves it to the
        -- top, resets its expiry clock, and — for a rematch — keeps its
        -- original_session_id if this call didn't supply a new one).
        UPDATE game_invites
        SET created_at = now(),
            message = coalesce(p_message, message),
            original_session_id = coalesce(p_original_session_id, original_session_id)
        WHERE id = v_existing.id
        RETURNING * INTO v_existing;
        RETURN jsonb_build_object('ok', true, 'invite', to_jsonb(v_existing), 'mine', true, 'created', false);
      ELSE
        -- Theirs — caller must accept it instead of creating a competing
        -- one. No write here; the caller's own respondInvite() handles
        -- the accept.
        RETURN jsonb_build_object('ok', true, 'invite', to_jsonb(v_existing), 'mine', false, 'created', false);
      END IF;
    END IF;

    -- No existing pending invite for this pair+game_type — safe to
    -- create the canonical one now.
    BEGIN
      INSERT INTO game_invites (sender_id, receiver_id, game_type, status, message, original_session_id)
      VALUES (v_user_id, p_other_user_id, p_game_type, 'pending', p_message, p_original_session_id)
      RETURNING * INTO v_new;
      RETURN jsonb_build_object('ok', true, 'invite', to_jsonb(v_new), 'mine', true, 'created', true);
    EXCEPTION WHEN unique_violation THEN
      -- Lost a genuine simultaneous race to the unique index — loop back
      -- and re-select; the winning row is now guaranteed committed and
      -- visible (this exception only fires after Postgres has already
      -- resolved the conflict against a committed transaction), so the
      -- next iteration's SELECT ... FOR UPDATE above will find it
      -- deterministically rather than needing a second, separate
      -- recovery code path.
      CONTINUE;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_game_invite(uuid, text, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
