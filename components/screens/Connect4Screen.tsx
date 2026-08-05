'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setCurrentSession, subscribeCurrentSession, clearCurrentSession, sendGameInvite, setPendingInvite, setRematchInProgress, setChatOrigin, acceptRematchIfShouldAccept } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'
import BackControl from '@/components/ui/BackControl'
import GamePresenceBanner from '@/components/game/GamePresenceBanner'
import FloatingChatButton from '@/components/chat/FloatingChatButton'
import FloatingRematchNotification from '@/components/game/FloatingRematchNotification'
import ChatUnlockProgress from '@/components/game/ChatUnlockProgress'
import RematchDeclinedToast from '@/components/game/RematchDeclinedToast'

const COLS = 7, ROWS = 6

interface GameState { board: string[]; currentTurn: string | null; winner: string | null; status: string; moves: number; progressCounted?: boolean; readyPlayers?: string[] }

export default function Connect4Screen() {
  const { navigate, lang, openChat } = useApp()
  // Reactive — mirrors the fix already proven for Tic Tac Toe and Mystery
  // Choice. All game screens stay permanently mounted (hidden via CSS), so
  // reading getCurrentSession() only at render time meant this screen
  // could miss a brand-new session (e.g. after Rematch) until some
  // unrelated re-render happened to occur.
  const [session, setSessionState] = useState(() => getCurrentSession())
  useEffect(() => {
    const unsubscribe = subscribeCurrentSession((s) => {
      if (s === null) { setSessionState(null); return }
      if (s.game_type && s.game_type !== 'connect_4') return
      setSessionState(s)
    })
    return unsubscribe
  }, [])

  const [state, setState] = useState<GameState | null>(null)
  const [myId, setMyId]   = useState<string | null>(null)
  const [names, setNames] = useState<{ one: string; two: string }>({ one: 'P1', two: 'P2' })
  const [loading, setLoading] = useState(true)
  const [pairCount, setPairCount] = useState<number>(0)
  // When both users press Play Again at nearly the same time, the loser
  // of the reconciliation (whose own request wasn't canonical) stays on
  // this completed-game screen with a disabled "waiting" button instead
  // of auto-accepting and jumping into the new game — see playAgain().
  const [waitingForPlayer, setWaitingForPlayer] = useState(false)
  const channelRef = useRef<any>(null)
  const activeSessionRef = useRef<string | null>(null)
  // Tracks the highest `moves` count ever applied to this session, kept in
  // a ref (not React state) so async callbacks always see the live value,
  // not whatever was captured in their closure at effect-setup time. This
  // is the actual fix: any incoming state — realtime, post-subscribe
  // refetch, or visibility reconciliation — is only ever applied if its
  // move count is >= what's already showing, never regressing to a staler
  // snapshot. Moves only ever increase, so this is a reliable ordering
  // guard independent of network/fetch timing.
  const latestMovesRef = useRef<number>(-1)
  function applyIfNotStale(candidate: GameState) {
    if (typeof candidate.moves !== 'number' || candidate.moves < latestMovesRef.current) return
    latestMovesRef.current = candidate.moves
    setState(candidate)
  }
  // Tracks whether this device has already refreshed its own pairCount
  // display for the current session's finish — same fix as Tic Tac Toe.
  // incrementPairGames() is only ever called by the winning move's own
  // device (correctly, to avoid double-counting) — the other player's
  // own pairCount display was never being refreshed to reflect it.
  const progressRefreshedRef = useRef<string | null>(null)
  // Set the instant the user presses back on a finished game, before the
  // session is cleared — same fix as Tic Tac Toe. Prevents this
  // component's own "no session found" fallback from being briefly
  // visible during the CSS opacity fade-out of an entirely expected,
  // intentional exit.
  const isExitingRef = useRef(false)
  // Session-generation guard — incremented every time a new session
  // becomes active. Every async operation (fetch, realtime event, RPC
  // response) captures this value at its own start and checks it before
  // applying any result, so an old session's in-flight async work can
  // never update a newer, currently-active session's screen. Same
  // proven pattern as Tic Tac Toe.
  const sessionGenerationRef = useRef(0)
  // True only while a move RPC call is actually in flight — prevents a
  // duplicate tap from firing a second request before the first
  // resolves. No other local flag decides whether the board is playable
  // (see isMyTurn below).
  const [moveRequestPending, setMoveRequestPending] = useState(false)
  // TEMPORARY DIAGNOSTIC — tracks the previous session id purely for
  // comparison logging below; does not affect any existing logic.
  const prevSessionIdRefDiag = useRef<string | null>(null)

  // TEMPORARY DIAGNOSTIC — logs a ready-RPC attempt/result consistently
  // across all three call sites (SUBSCRIBED callback, visibility
  // recovery, polling recovery). Safe fields only — no tokens, emails,
  // names, or message content.
  async function readyDiagLog(phase: 'before' | 'after', sessionId: string, opts: {
    myRole: 'player_one' | 'player_two' | 'unknown'
    statusBefore?: string | null
    readyBefore?: any
    rpcStarted?: boolean
    rpcOk?: boolean
    rpcError?: string | null
    returnedStatus?: string | null
    returnedReady?: any
    returnedTurn?: string | null
  }) {
    console.log('[C4_READY_DIAG]', JSON.stringify({
      phase,
      timestamp: new Date().toISOString(),
      authenticatedUserId: myId,
      sessionId,
      previousSessionId: prevSessionIdRefDiag.current,
      playerOneId: session?.player_one_id ?? null,
      playerTwoId: session?.player_two_id ?? null,
      myRole: opts.myRole,
      statusBeforeRpc: opts.statusBefore ?? null,
      readyStateBeforeRpc: opts.readyBefore ?? null,
      rpcCallStarted: opts.rpcStarted ?? null,
      rpcOk: opts.rpcOk ?? null,
      rpcErrorMessage: opts.rpcError ?? null,
      returnedStatus: opts.returnedStatus ?? null,
      returnedReadyState: opts.returnedReady ?? null,
      returnedCurrentTurn: opts.returnedTurn ?? null,
      activeSessionIdOnClient: activeSessionRef.current,
      sessionGeneration: sessionGenerationRef.current,
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
    }))
  }

  const myColor = session && myId === session.player_one_id ? 'R' : 'Y'

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const s0 = session

    // GUARD: this screen must only touch connect_4 sessions.
    // All game screens are always-mounted and share the same global session,
    // so without this guard, accepting a different game type (e.g. mystery_choice)
    // would make Connect4 "repair" and overwrite that session's state.
    if (s0.game_type && s0.game_type !== 'connect_4') {
      console.log('CONNECT4 SCREEN SKIP: wrong game_type', s0.game_type, s0.id)
      return
    }

    console.log('CONNECT4 SESSION:', s0.id)
    // TEMPORARY DIAGNOSTIC
    prevSessionIdRefDiag.current = activeSessionRef.current !== s0.id ? activeSessionRef.current : prevSessionIdRefDiag.current
    activeSessionRef.current = s0.id
    progressRefreshedRef.current = null
    isExitingRef.current = false
    const oldChannel = channelRef.current
    channelRef.current = null

    // Clear the previous game's transient state immediately, synchronously,
    // before any async work starts. Without this, the old `state` (still
    // holding the just-finished game's board/winner/status) stays exactly
    // as-is until init()'s async fetch resolves — meaning the previous
    // Result/Game Over screen (which renders purely from `state.status`)
    // would still be showing for that entire window. Resetting to null
    // here means the render falls through to the existing loading state
    // instead, and only the new session's fresh data is ever shown.
    setState(null)
    setLoading(true)
    latestMovesRef.current = -1
    setWaitingForPlayer(false)
    setMoveRequestPending(false)

    // Step 5/6 — session-generation guard: mark the old generation
    // inactive immediately, synchronously, before any async work starts.
    // Captured by this closure as `myGeneration` below; every async
    // operation compares its own captured generation against the current
    // ref value before applying any result. Same proven pattern as Tic
    // Tac Toe.
    sessionGenerationRef.current += 1
    const myGeneration = sessionGenerationRef.current

    // Guards the post-SUBSCRIBED refetch below against applying state
    // after this effect has been cleaned up (unmount, or session changed).
    let cancelled = false
    // Combines the effect-cleanup guard with the session-generation guard.
    function isStale() { return cancelled || sessionGenerationRef.current !== myGeneration }

    async function init() {
      // Await the old channel's removal (server-acknowledged) before ever
      // creating the new one, instead of only relying on React's cleanup
      // function to fire-and-forget it — same fix already proven for Tic
      // Tac Toe. Sequences the teardown rather than letting it race the
      // new subscription's creation.
      if (oldChannel) { await supabase.removeChannel(oldChannel) }
      if (isStale()) return

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setLoading(false); return }
      setMyId(user.id)
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [s0.player_one_id, s0.player_two_id])
      if (isStale()) return
      const nm = new Map(profs?.map(p => [p.id, p.name]) || [])
      setNames({ one: nm.get(s0.player_one_id) || 'P1', two: nm.get(s0.player_two_id) || 'P2' })

      // Load pair progress (for chat unlock gate) — same shared source of
      // truth already used by Tic Tac Toe and Mystery Choice.
      const otherId = user.id === s0.player_one_id ? s0.player_two_id : s0.player_one_id
      const prog = await getPairProgress(otherId)
      if (isStale()) return
      setPairCount(prog.games_completed)

      // Small, bounded retry if the row/state isn't there yet — same
      // fix already proven for Tic Tac Toe's identical fetch pattern.
      // Closes a transient read-after-write lag window (e.g. right
      // after the other client's own session creation) that would
      // otherwise trigger an unnecessary "repair" write here.
      let sess: { state: any } | null = null
      for (let tries = 0; tries < 5; tries++) {
        const { data } = await supabase.from('game_sessions').select('state').eq('id', s0.id).maybeSingle()
        if (isStale()) return
        sess = data
        if (sess?.state) break
        await new Promise(r => setTimeout(r, 400))
      }
      let gs: GameState
      if (sess?.state && sess.state.board && sess.state.board.length === 42) {
        gs = sess.state as GameState
        // A null currentTurn is legitimate and expected while
        // status === 'waiting_for_players' — only treat it as invalid
        // (needing repair to player_one_id) once the game is actually
        // meant to be active.
        const validTurn = gs.status === 'waiting_for_players'
          ? gs.currentTurn === null
          : (gs.currentTurn === s0.player_one_id || gs.currentTurn === s0.player_two_id)
        if (!validTurn) gs.currentTurn = s0.player_one_id
      } else {
        // Preserve whatever readiness progress already exists in the row
        // — board/moves being missing/malformed doesn't mean readyPlayers
        // or an already-'active' status were also corrupted. Blindly
        // resetting them here would silently wipe a player's already-
        // recorded readiness if this rare path ever fired after the
        // other participant had already marked ready.
        const staleReady = Array.isArray(sess?.state?.readyPlayers) ? sess!.state.readyPlayers : []
        const staleStatus = sess?.state?.status === 'active' ? 'active' : 'waiting_for_players'
        const staleTurn = staleStatus === 'active'
          ? (sess?.state?.currentTurn === s0.player_one_id || sess?.state?.currentTurn === s0.player_two_id ? sess.state.currentTurn : s0.player_one_id)
          : null
        gs = { board: Array(42).fill(''), currentTurn: staleTurn, winner: null, status: staleStatus, readyPlayers: staleReady, moves: 0 }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', s0.id)
      }
      if (isStale()) return
      latestMovesRef.current = typeof gs.moves === 'number' ? gs.moves : -1
      setState(gs); setLoading(false)

      let reconnectAttempts = 0
      function subscribeChannel() {
        const channelName = `c4-${s0.id}-${Date.now()}-${reconnectAttempts}`
        const ch = supabase
          .channel(channelName)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${s0.id}` },
            (payload: any) => {
              const updatedId = payload.new?.id
              if (updatedId !== activeSessionRef.current || isStale()) return
              const ns = payload.new?.state
              if (ns && ns.board) {
                console.log('REALTIME GAME UPDATE:', ns.moves)
                // TEMPORARY DIAGNOSTIC — only during the readiness window,
                // to directly prove whether each client's realtime handler
                // actually receives the waiting_for_players → active
                // transition, and whether applyIfNotStale's own guard
                // (moves-based) ever unexpectedly rejects it.
                if (ns.status === 'waiting_for_players' || ns.status === 'active') {
                  const wouldRejectDiag = typeof ns.moves !== 'number' || ns.moves < latestMovesRef.current
                  console.log('[C4_READY_DIAG]', JSON.stringify({
                    phase: 'realtime_received',
                    timestamp: new Date().toISOString(),
                    authenticatedUserId: myId,
                    sessionId: s0.id,
                    myRole: myId === s0.player_one_id ? 'player_one' : myId === s0.player_two_id ? 'player_two' : 'unknown',
                    returnedStatus: ns.status,
                    returnedReadyState: ns.readyPlayers ?? null,
                    returnedCurrentTurn: ns.currentTurn ?? null,
                    latestMovesRefBeforeApply: latestMovesRef.current,
                    incomingMoves: ns.moves,
                    applied: !wouldRejectDiag,
                    activeSessionIdOnClient: activeSessionRef.current,
                    sessionGeneration: sessionGenerationRef.current,
                    visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
                  }))
                }
                applyIfNotStale(ns)
                if (ns.status === 'finished' && ns.progressCounted && progressRefreshedRef.current !== s0.id) {
                  progressRefreshedRef.current = s0.id
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (!user) return
                    const otherId = user.id === s0.player_one_id ? s0.player_two_id : s0.player_one_id
                    getPairProgress(otherId).then(prog => {
                      if (!prog.error) { console.log('PROGRESS REFRESHED (non-mover):', prog.games_completed); setPairCount(prog.games_completed) }
                    })
                  })
                }
              }
            })
          .subscribe(async (status: string) => {
            console.log('[C4_SUBSCRIPTION_STATUS]', status, 'session:', s0.id)
            if (isStale() || activeSessionRef.current !== s0.id) return
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              // A genuinely broken connection (e.g. surfacing after the tab
              // was backgrounded/"Away") — reconnect: tear down this channel
              // and create a fresh one, bounded so a persistent problem
              // doesn't retry forever (the independent polling fallback
              // below still covers recovery either way).
              if (reconnectAttempts >= 5) return
              reconnectAttempts++
              const dead = channelRef.current
              channelRef.current = null
              if (dead) await supabase.removeChannel(dead)
              if (isStale() || activeSessionRef.current !== s0.id) return
              await new Promise(r => setTimeout(r, 1000))
              if (isStale() || activeSessionRef.current !== s0.id) return
              subscribeChannel()
              return
            }
            if (status !== 'SUBSCRIBED') return
            // Closes the gap between the initial SELECT and the moment this
            // channel actually goes live — re-fetch once in case a move
            // landed in that window and was missed. Same fix already proven
            // for Tic Tac Toe.
            const { data: latest, error: latestErr } = await supabase
              .from('game_sessions').select('state').eq('id', s0.id).single()
            if (isStale() || activeSessionRef.current !== s0.id) return
            if (latestErr || !latest?.state?.board) return
            applyIfNotStale(latest.state as GameState)

            // Two-player readiness handshake — this device is now
            // genuinely subscribed and has the latest canonical state, so
            // it's safe to declare itself ready. Idempotent server-side:
            // safe to call again on a later reconnect/visibility-resume
            // for the same session without any effect beyond re-confirming
            // readiness. The session only becomes canonically 'active'
            // once BOTH participants have made this same call.
            const myRoleDiag = myId === s0.player_one_id ? 'player_one' : myId === s0.player_two_id ? 'player_two' : 'unknown'
            // TEMPORARY DIAGNOSTIC
            readyDiagLog('before', s0.id, {
              myRole: myRoleDiag,
              statusBefore: latest.state?.status ?? null,
              readyBefore: latest.state?.readyPlayers ?? null,
              rpcStarted: true,
            })
            const { data: readyData, error: readyErr } = await supabase.rpc('mark_connect_4_player_ready', {
              p_session_id: s0.id,
            })
            // TEMPORARY DIAGNOSTIC
            readyDiagLog('after', s0.id, {
              myRole: myRoleDiag,
              rpcOk: !readyErr && !!readyData?.ok,
              rpcError: readyErr?.message ?? readyData?.error ?? null,
              returnedStatus: readyData?.state?.status ?? null,
              returnedReady: readyData?.state?.readyPlayers ?? null,
              returnedTurn: readyData?.state?.currentTurn ?? null,
            })
            if (isStale() || activeSessionRef.current !== s0.id) return
            if (readyErr) { console.error('READY RPC error:', readyErr.message); return }
            if (readyData?.ok && readyData.state?.board) {
              applyIfNotStale(readyData.state as GameState)
            }
          })
        channelRef.current = ch
      }
      subscribeChannel()
    }
    init()
    return () => {
      cancelled = true
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [session?.id])

  // Visibility reconciliation — when the tab becomes visible again,
  // fetch the exact active session's state once.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const sid = activeSessionRef.current
      if (!sid) return
      const genAtFetch = sessionGenerationRef.current
      supabase.from('game_sessions').select('state').eq('id', sid).maybeSingle().then(async ({ data, error }) => {
        if (error || !data?.state?.board) return
        if (activeSessionRef.current !== sid || sessionGenerationRef.current !== genAtFetch) return
        applyIfNotStale(data.state as GameState)

        // Recovery: if the ORIGINAL ready-call (made once, right after
        // this session's channel first reached SUBSCRIBED) never fired
        // or failed for some transient reason, nothing else would ever
        // retry it — leaving this player permanently stuck waiting. The
        // RPC itself is idempotent, so calling it again here is always
        // safe; only actually calling it while genuinely still waiting
        // avoids any extra call for the common, already-active case.
        if (data.state.status === 'waiting_for_players') {
          const myRoleDiag = myId === session?.player_one_id ? 'player_one' : myId === session?.player_two_id ? 'player_two' : 'unknown'
          // TEMPORARY DIAGNOSTIC
          readyDiagLog('before', sid, { myRole: myRoleDiag, statusBefore: data.state.status, readyBefore: data.state.readyPlayers ?? null, rpcStarted: true })
          const { data: readyData, error: readyErr } = await supabase.rpc('mark_connect_4_player_ready', { p_session_id: sid })
          // TEMPORARY DIAGNOSTIC
          readyDiagLog('after', sid, {
            myRole: myRoleDiag, rpcOk: !readyErr && !!readyData?.ok, rpcError: readyErr?.message ?? readyData?.error ?? null,
            returnedStatus: readyData?.state?.status ?? null, returnedReady: readyData?.state?.readyPlayers ?? null, returnedTurn: readyData?.state?.currentTurn ?? null,
          })
          if (activeSessionRef.current !== sid || sessionGenerationRef.current !== genAtFetch) return
          if (readyErr) { console.error('READY RPC error (visibility recovery):', readyErr.message); return }
          if (readyData?.ok && readyData.state?.board) applyIfNotStale(readyData.state as GameState)
        }
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Polling fallback — the visibility/post-subscribe reconciliations
  // above only cover specific windows (tab returning from background,
  // the gap between initial fetch and the channel going live). Neither
  // recovers a realtime UPDATE broadcast that's genuinely, transiently
  // missed while the tab stays visible the whole time — a real,
  // occasional possibility with any websocket-based realtime channel.
  // Same 3s interval already proven safe in ChatPanel.tsx. Uses the
  // existing applyIfNotStale guard, so this is a safe no-op whenever
  // nothing has actually changed since the last known state.
  useEffect(() => {
    const t = setInterval(() => {
      const sid = activeSessionRef.current
      if (!sid) return
      const genAtFetch = sessionGenerationRef.current
      supabase.from('game_sessions').select('state').eq('id', sid).maybeSingle().then(async ({ data, error }) => {
        if (error || !data?.state?.board) return
        if (activeSessionRef.current !== sid || sessionGenerationRef.current !== genAtFetch) return
        applyIfNotStale(data.state as GameState)

        // Same readiness recovery as the visibility effect — covers even
        // a channel that never reached SUBSCRIBED at all (e.g. stuck in
        // reconnect attempts), since polling is fully independent of
        // channel status. Only calls the RPC while genuinely still
        // waiting, so this adds no extra call for an already-active game.
        if (data.state.status === 'waiting_for_players') {
          const myRoleDiag = myId === session?.player_one_id ? 'player_one' : myId === session?.player_two_id ? 'player_two' : 'unknown'
          // TEMPORARY DIAGNOSTIC
          readyDiagLog('before', sid, { myRole: myRoleDiag, statusBefore: data.state.status, readyBefore: data.state.readyPlayers ?? null, rpcStarted: true })
          const { data: readyData, error: readyErr } = await supabase.rpc('mark_connect_4_player_ready', { p_session_id: sid })
          // TEMPORARY DIAGNOSTIC
          readyDiagLog('after', sid, {
            myRole: myRoleDiag, rpcOk: !readyErr && !!readyData?.ok, rpcError: readyErr?.message ?? readyData?.error ?? null,
            returnedStatus: readyData?.state?.status ?? null, returnedReady: readyData?.state?.readyPlayers ?? null, returnedTurn: readyData?.state?.currentTurn ?? null,
          })
          if (activeSessionRef.current !== sid || sessionGenerationRef.current !== genAtFetch) return
          if (readyErr) { console.error('READY RPC error (polling recovery):', readyErr.message); return }
          if (readyData?.ok && readyData.state?.board) applyIfNotStale(readyData.state as GameState)
        }
      })
    }, 3000)
    return () => clearInterval(t)
  }, [])

  async function drop(col: number) {
    if (!state || !session || !myId) { console.log('[C4_MOVE_BLOCKED]', 'no state/session/user'); return }
    if (moveRequestPending) { console.log('[C4_MOVE_BLOCKED]', 'move request already in flight'); return }
    if (state.status !== 'active') { console.log('[C4_MOVE_BLOCKED]', state.status === 'waiting_for_players' ? 'not ready yet' : 'game finished'); return }
    if (state.currentTurn !== myId) { console.log('[C4_MOVE_BLOCKED]', 'not your turn (turn=' + state.currentTurn + ', me=' + myId + ')'); return }
    // Fast, non-authoritative early exit only — avoids an unnecessary RPC
    // round-trip for an obviously-full column. The RPC itself still
    // independently, authoritatively re-checks this server-side.
    let row = -1
    for (let r = ROWS - 1; r >= 0; r--) { if (!state.board[r * COLS + col]) { row = r; break } }
    if (row < 0) { console.log('[C4_MOVE_BLOCKED]', 'column full'); return }

    console.log('MOVE ATTEMPT (RPC):', col)
    setMoveRequestPending(true)
    const generationAtRequest = sessionGenerationRef.current
    const sessionIdAtRequest = session.id

    try {
      const { data, error } = await supabase.rpc('play_connect_4_move', {
        p_session_id: sessionIdAtRequest,
        p_column: col,
      })

      if (sessionGenerationRef.current !== generationAtRequest || activeSessionRef.current !== sessionIdAtRequest) {
        // A rematch already moved this screen to a new session while this
        // RPC call was in flight — an old-session response must never be
        // applied to the new session's screen.
        console.log('MOVE RPC RESPONSE IGNORED: session changed while in flight')
        return
      }

      if (error) {
        console.error('MOVE RPC error:', error.message)
        return
      }
      if (!data || data.error) {
        // One of the RPC's own structured rejections — not_authenticated,
        // not_a_player, not_your_turn, invalid_column, full_column,
        // finished_game, wrong_game_type, missing_session, invalid_state.
        console.log('[C4_MOVE_BLOCKED] (server)', data?.error || 'unknown')
        return
      }

      const confirmedState = data.state as GameState
      if (!confirmedState?.board || !Array.isArray(confirmedState.board)) {
        console.error('MOVE RPC returned an unexpected shape')
        return
      }
      console.log('MOVE CONFIRMED BY SERVER:', confirmedState.moves, 'moves, status:', confirmedState.status)
      applyIfNotStale(confirmedState)

      // If this move finished the game, count progress once (the
      // finishing mover records it) — a separate, additive metadata
      // write (progressCounted), not part of the move/turn computation
      // the RPC already made authoritative above.
      if (confirmedState.status === 'finished') {
        await countProgress(confirmedState)
      }
    } finally {
      setMoveRequestPending(false)
    }
  }

  async function countProgress(finishedState: GameState) {
    if (!session || !myId) return
    const isRealWin = finishedState.winner === session.player_one_id || finishedState.winner === session.player_two_id

    async function markCounted() {
      const { data: f } = await supabase.from('game_sessions').select('state').eq('id', session!.id).maybeSingle()
      const live = (f?.state || finishedState) as GameState
      const marked = { ...live, progressCounted: true }
      await supabase.from('game_sessions').update({ state: marked }).eq('id', session!.id)
      applyIfNotStale(marked)
    }

    if (!isRealWin) { await markCounted(); return }
    if (finishedState.progressCounted) return
    const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
    if (fresh?.state?.progressCounted) return

    const otherId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    await markCounted()
    const after = await incrementPairGames(otherId)
    if (!after.error) setPairCount(after.games_completed)
  }

  // ── Play Again = new invite (same working flow already proven for
  // Tic Tac Toe and Mystery Choice) — was previously a direct in-place
  // session reset with no invite/accept step at all, meaning a rematch
  // could start without the other player's consent, and two simultaneous
  // "Rematch" presses would race to overwrite the same row.
  async function playAgain() {
    if (!session || !myId) return
    if (waitingForPlayer) return
    setRematchInProgress(true)
    try {
      const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
      const result = await sendGameInvite(opponentId, 'connect_4', session.id)
      if (!result.ok || !result.inviteId) {
        console.error('Play again invite failed:', result.error)
        return
      }
      if (result.shouldAccept && result.invite) {
        // My own request lost the reconciliation to the opponent's
        // competing one — immediately accept and enter their already-
        // canonical invite, same as the normal one-sided accept flow and
        // the same pattern Mystery Choice's own playAgain() already used.
        // Previously this instead set a local "waiting" flag and returned,
        // relying entirely on the separate FloatingRematchNotification
        // component's own polling (up to 3s) to eventually detect and
        // accept the invite later — a meaningfully slower, less direct
        // path that could leave this device's session transition starting
        // well after the opponent's, right when they're about to make the
        // new game's first move.
        console.log('PLAY AGAIN: OPPONENT REQUEST IS CANONICAL — ACCEPTING DIRECTLY:', result.inviteId)
        await acceptRematchIfShouldAccept(result, myId)
        return
      }
      const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
      setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'connect_4', originalSessionId: session.id })
      navigate('waiting')
    } finally {
      setRematchInProgress(false)
    }
  }

  if (!session) {
    if (isExitingRef.current) {
      return <div className="flex flex-col h-full" style={{ background: '#0a0a10' }} />
    }
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">{lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}</div>
        <button onClick={() => navigate('profile')} className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', color: '#fff' }}>{lang === 'gr' ? 'Πίσω' : 'Back'}</button>
      </div>
    )
  }
  if (loading || !state) return <div className="flex items-center justify-center h-full" style={{ background: '#0a0a10' }}><div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>🔴</div></div>

  const isMyTurn = state.currentTurn === myId && state.status === 'active' && !moveRequestPending
  const myName = myId === session.player_one_id ? names.one : names.two
  const oppName = myId === session.player_one_id ? names.two : names.one

  let statusMsg = ''
  if (state.status === 'waiting_for_players') {
    statusMsg = lang === 'gr' ? '⏳ Περιμένουμε τον παίκτη...' : '⏳ Waiting for a player...'
  } else if (state.status === 'finished') {
    if (state.winner === 'draw') statusMsg = lang === 'gr' ? 'Ισοπαλία!' : "It's a draw!"
    else if (state.winner === myId) statusMsg = lang === 'gr' ? '🎉 Νίκησες!' : '🎉 You won!'
    else statusMsg = lang === 'gr' ? `${oppName} κέρδισε.` : `${oppName} won.`
  } else statusMsg = isMyTurn ? (lang === 'gr' ? 'Σειρά σου' : 'Your turn') : (lang === 'gr' ? `Σειρά: ${oppName}` : `${oppName}'s turn`)

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.094) 0%, transparent 55%), #0a0a10' }}>
      <FloatingChatButton openChat={openChat} isChatUnlocked={pairCount >= 10} />
      <FloatingRematchNotification session={session} myId={myId || ''} opponentName={oppName} />
      <RematchDeclinedToast lang={lang} />
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <BackControl lang={lang} onClick={() => {
          if (state?.status === 'finished') {
            // Same fix already proven for Tic Tac Toe: go straight to
            // Profiles instead of via Game Room (which reads the session
            // directly and would show its own "No game session found"
            // fallback the instant it's cleared), and clear the session
            // AFTER navigating so the transition is atomic.
            navigate('profile')
            isExitingRef.current = true
            clearCurrentSession()
          } else {
            navigate('game_room')
          }
        }} />
        <h1 className="text-[16px] font-extrabold text-white flex-1">🔴 Connect 4</h1>
      </div>

      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center"><div className="text-[13px] font-bold" style={{ color: myColor === 'R' ? '#ef4444' : '#fbbf24' }}>{myName}</div><div className="text-[10px] text-white/40">{lang === 'gr' ? 'εσύ' : 'you'}</div></div>
        <div className="text-[18px] font-black text-white/30">VS</div>
        <div className="text-center"><div className="text-[13px] font-bold" style={{ color: myColor === 'R' ? '#fbbf24' : '#ef4444' }}>{oppName}</div><div className="text-[10px] text-white/40">{lang === 'gr' ? 'αντίπαλος' : 'opponent'}</div></div>
      </div>

      <div className="text-center mb-3">
        <span className="text-[14px] font-bold px-4 py-2 rounded-full" style={{ background: isMyTurn ? 'rgba(253,41,123,0.142)' : 'rgba(255,255,255,0.047)', color: isMyTurn ? '#ff3384' : 'rgba(255,255,255,0.708)' }}>{statusMsg}</span>
      </div>

      <GamePresenceBanner />

      {/* Board */}
      <div className="flex items-center justify-center px-3">
        <div className="rounded-2xl p-2 w-full" style={{ background: 'rgba(108,99,255,0.142)', border: '1px solid rgba(108,99,255,0.236)', maxWidth: 460 }}>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: COLS }).map((_, col) => (
              <button key={col} onClick={() => drop(col)} disabled={!isMyTurn} className="flex flex-col gap-1.5 sm:gap-2" style={{ cursor: isMyTurn ? 'pointer' : 'default' }}>
                {Array.from({ length: ROWS }).map((_, row) => {
                  const cell = state.board[row * COLS + col]
                  return <div key={row} className="rounded-full w-full" style={{ aspectRatio: '1 / 1',
                    background: cell === 'R' ? 'radial-gradient(circle at 35% 35%, #ff6b6b, #ef4444)'
                              : cell === 'Y' ? 'radial-gradient(circle at 35% 35%, #fde047, #fbbf24)'
                              : 'rgba(6,6,10,0.72)',
                    border: cell ? '2px solid rgba(255,255,255,0.14)' : '2px solid rgba(255,255,255,0.1)',
                    boxShadow: cell === 'R' ? '0 2px 8px rgba(239,68,68,0.45)' : cell === 'Y' ? '0 2px 8px rgba(251,191,36,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.4)' }} />
                })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state.status === 'finished' && (
        <div className="c4-finished-actions px-6 mt-5 flex flex-col gap-2.5">
          {waitingForPlayer ? (
            <div className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-center" style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.59)', border: '1px solid rgba(255,255,255,0.094)' }}>
              ⏳ {lang === 'gr' ? 'Περιμένουμε τον παίκτη...' : 'Waiting for a player...'}
            </div>
          ) : (
            <button onClick={playAgain} className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>{lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}</button>
          )}
          <ChatUnlockProgress currentProgress={pairCount} isUnlocked={pairCount >= 10} lang={lang} />
        </div>
      )}
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @media (max-width: 767.98px) {
          .c4-finished-actions { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px) !important; }
        }
      `}</style>
    </div>
  )
}

