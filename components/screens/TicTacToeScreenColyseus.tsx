'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setCurrentSession, subscribeCurrentSession, clearCurrentSession, sendGameInvite, setPendingInvite, setChatOrigin, acceptRematchIfShouldAccept } from '@/lib/gameInvites'
import { incrementPairGames, getPairProgress } from '@/lib/pairProgress'
import { fetchGamePlayerPhotoAccess } from '@/lib/gamePlayerPhoto'
import GamePlayerAvatar from '@/components/ui/GamePlayerAvatar'
import BackControl from '@/components/ui/BackControl'
import GamePresenceBanner from '@/components/game/GamePresenceBanner'
import FloatingChatButton from '@/components/chat/FloatingChatButton'
import FloatingRematchNotification from '@/components/game/FloatingRematchNotification'
import ChatUnlockProgress from '@/components/game/ChatUnlockProgress'
import RematchDeclinedToast from '@/components/game/RematchDeclinedToast'
import { joinTicTacToeRoom, leaveRoom } from '@/lib/colyseusClient'

interface GameState {
  gameNumber?: number
  parentSessionId?: string | null
  board: string[]
  currentTurn: string | null
  winner: string | null
  status: string
  moves: number
  progressCounted?: boolean
  readyPlayers?: string[]
  playAgain?: {
    player_one_ready: boolean
    player_two_ready: boolean
    next_session_id: string | null
  }
}

export default function TicTacToeScreen() {
  const { navigate, lang, openChat } = useApp()

  // Diagnostic only — proves whether this component mounts fresh (a real
  // remount) or was already mounted the whole time (the always-mounted
  // architecture, no remount at all) when a Tic Tac Toe session becomes
  // active. Also logs the browser's own navigation-type record, which
  // would show "reload" only if an actual full-page reload occurred —
  // it does not change on in-app React state transitions.
  useEffect(() => {
    console.log('[TIC_TAC_TOE_REFRESH_TRACE] TicTacToeScreen component MOUNTED')
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      console.log('[TIC_TAC_TOE_REFRESH_TRACE] performance.getEntriesByType("navigation")[0]?.type =', navEntry?.type)
    } catch (e) { console.log('[TIC_TAC_TOE_REFRESH_TRACE] performance navigation API unavailable') }
    return () => { console.log('[TIC_TAC_TOE_REFRESH_TRACE] TicTacToeScreen component UNMOUNTED') }
  }, [])

  // Reactive session — was previously `const session = getCurrentSession()`,
  // re-read only when this component happened to render for some other
  // reason. Since all game screens stay permanently mounted (just hidden
  // via CSS), that could mean this screen didn't notice a brand-new
  // session promptly. Now subscribed directly: setCurrentSession() being
  // called anywhere immediately updates this component's own state.
  const [session, setSessionState] = useState(() => getCurrentSession())

  useEffect(() => {
    const unsubscribe = subscribeCurrentSession((s) => {
      if (s === null) { setSessionState(null); return }
      // Only react to sessions this screen actually owns — mirrors the
      // existing game_type guard used below for channel setup, so a
      // Mystery Choice/Connect4 session being published elsewhere doesn't
      // needlessly touch this screen's state.
      if (s.game_type && s.game_type !== 'tic_tac_toe' && s.game_type !== 'mystery') return
      setSessionState(s)
    })
    return unsubscribe
  }, [])

  const [state, setState]   = useState<GameState | null>(null)
  const [myId, setMyId]     = useState<string | null>(null)
  const [names, setNames]   = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const activeSessionRef = useRef<string | null>(null)
  // Tracks whether this device has already refreshed its own pairCount
  // display for the current session's finish — needed because
  // incrementPairGames() is only ever called by the winning move's own
  // device (correctly — calling it from both devices would double-count).
  // The other player's pairCount was never being refreshed at all, so
  // their own "x/10" display stayed stale even though the shared database
  // row was already correctly updated by the mover.
  const progressRefreshedRef = useRef<string | null>(null)
  // Set the instant the user presses back on a finished game, before the
  // session is cleared. Screen divs use a CSS opacity transition (not an
  // instant display:none) — clearing the session and navigating away both
  // land in the same batched render, so this component's own "no session
  // found" fallback would otherwise still render (just fading out over
  // ~0.3s), making a real error message briefly visible during an
  // entirely expected, intentional exit. This ref lets that fallback
  // recognize this specific case and render nothing instead.
  const isExitingRef = useRef(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [pairCount, setPairCount] = useState<number>(0)
  const [photoAccess, setPhotoAccess] = useState<{ photoUnlocked: boolean; myPhoto: string | null; opponentPhoto: string | null }>({ photoUnlocked: false, myPhoto: null, opponentPhoto: null })
  const [iAmReady, setIAmReady] = useState(false)
  // When both users press Play Again at nearly the same time, the loser
  // of the reconciliation (whose own request wasn't canonical) stays on
  // this completed-game screen with a disabled "waiting" button instead
  // of auto-accepting and jumping into the new game — see playAgain().
  // Kept separate from iAmReady, which is tied to the existing, unchanged
  // normal one-user Play Again flow's own (differently worded) UI.
  const [waitingForPlayer, setWaitingForPlayer] = useState(false)
  // Session-generation guard — incremented every time a new session
  // becomes active. Every async operation (fetch, realtime event, RPC
  // response) captures this value at its own start and checks it before
  // applying any result, so an old session's in-flight async work can
  // never update a newer, currently-active session's screen.
  const sessionGenerationRef = useRef(0)
  // True only while a move RPC call is actually in flight — prevents a
  // duplicate tap from firing a second request before the first
  // resolves. No other local flag decides whether the board is playable
  // (see isMyTurn below).
  const [moveRequestPending, setMoveRequestPending] = useState(false)
  // Minimum visual wait — purely cosmetic. Starts false on every new
  // session, flips true after ~1.5s regardless of readiness state. Used
  // ONLY to keep the waiting indicator visible for a minimum window so it
  // doesn't flash by unnoticed if both players happen to become ready
  // almost instantly — never used as the activation condition itself
  // (see isMyTurn/board-disabled logic below, which depends purely on
  // canonical state.status/readyPlayers).
  const [minWaitElapsed, setMinWaitElapsed] = useState(false)

  // My symbol: player_one = X, player_two = O
  const mySymbol = session && myId === session.player_one_id ? 'X' : 'O'

  const roomRef = useRef<any>(null)
  // Guards against this same device calling countProgress() more than
  // once for the same finished game (e.g. if onStateChange fires again
  // after the game already finished, for an unrelated field change).
  // countProgress() itself is already safe to call from BOTH devices
  // concurrently — see its own progressCounted re-check — this ref only
  // prevents redundant same-device calls, not a correctness requirement.
  const finishTriggeredRef = useRef<string | null>(null)

  function mapColyseusState(cs: any): GameState {
    // Maps Colyseus's own schema field names/values onto the exact same
    // GameState shape the existing (unmodified) JSX below already
    // expects — this is what lets that JSX render identically regardless
    // of which engine is active.
    const board = Array.from({ length: 9 }, (_, i) => (cs.board && cs.board[i]) || '')
    const status = cs.status === 'waiting' ? 'waiting_for_players' : cs.status
    return {
      board,
      currentTurn: cs.status === 'active' ? (cs.currentTurnUserId || null) : null,
      winner: cs.status === 'finished' ? (cs.isDraw ? 'draw' : (cs.winnerUserId || null)) : null,
      status,
      moves: typeof cs.moveCount === 'number' ? cs.moveCount : 0,
      progressCounted: false, // tracked separately client-side via finishTriggeredRef/countProgress's own DB check — Colyseus's own schema has no equivalent field
    }
  }

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const sess0 = session  // non-null capture for closure

    // GUARD: this screen must only touch tic_tac_toe sessions — same
    // reasoning as the Supabase engine's own identical guard.
    if (sess0.game_type && sess0.game_type !== 'tic_tac_toe' && sess0.game_type !== 'mystery') {
      console.log('[COLYSEUS] TICTACTOE SCREEN SKIP: wrong game_type', sess0.game_type, sess0.id)
      return
    }

    console.log('[COLYSEUS] SESSION SWITCH DETECTED:', sess0.id)
    setState(null)
    setLoading(true)
    setIAmReady(false)
    setWaitingForPlayer(false)
    setMoveRequestPending(false)
    setMinWaitElapsed(false)
    const minWaitTimer = setTimeout(() => setMinWaitElapsed(true), 1500)
    finishTriggeredRef.current = null

    // Step 5/6 — session-generation guard, same pattern as the Supabase
    // engine: every async operation below captures myGeneration and
    // checks it before applying any result, so an old session's
    // in-flight join/callbacks can never update a newer session's screen.
    sessionGenerationRef.current += 1
    const myGeneration = sessionGenerationRef.current
    activeSessionRef.current = sess0.id
    progressRefreshedRef.current = null
    isExitingRef.current = false

    let cancelled = false
    function isStale() { return cancelled || sessionGenerationRef.current !== myGeneration }

    const oldRoom = roomRef.current
    roomRef.current = null

    async function init() {
      // Leave the previous room completely before joining the new one —
      // "ignore callbacks from an old room after a new match starts" is
      // enforced both by this explicit leave AND by the isStale() guard
      // below on every callback.
      if (oldRoom) { await leaveRoom(oldRoom) }
      if (isStale()) return

      const { data: { user } } = await supabase.auth.getUser()
      if (isStale()) return
      if (!user) { setError('Not logged in'); setLoading(false); return }
      setMyId(user.id)

      const { data: profs } = await supabase.from('profiles').select('id, name')
        .in('id', [sess0.player_one_id, sess0.player_two_id])
      if (isStale()) return
      const nm = new Map(profs?.map(p => [p.id, p.name]) || [])
      setNames({
        one: nm.get(sess0.player_one_id) || 'Player 1',
        two: nm.get(sess0.player_two_id) || 'Player 2',
      })

      const otherId = user.id === sess0.player_one_id ? sess0.player_two_id : sess0.player_one_id
      const prog = await getPairProgress(otherId)
      if (isStale()) return
      setPairCount(prog.games_completed)

      fetchGamePlayerPhotoAccess(user.id, otherId).then(setPhotoAccess)

      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (isStale()) return
      const accessToken = authSession?.access_token
      if (!accessToken) { setError('Not logged in'); setLoading(false); return }

      let room: any
      try {
        room = await joinTicTacToeRoom(sess0.id, accessToken)
      } catch (e: any) {
        console.error('[COLYSEUS] join failed:', e?.message || e)
        if (isStale()) return
        setError(lang === 'gr' ? 'Αποτυχία σύνδεσης με τον διακομιστή παιχνιδιού.' : 'Failed to connect to the game server.')
        setLoading(false)
        return
      }
      if (isStale()) { leaveRoom(room); return }
      roomRef.current = room
      console.log('[COLYSEUS] joined room for matchId:', sess0.id, 'sessionId:', room.sessionId)

      room.onStateChange((cs: any) => {
        if (isStale()) return
        const mapped = mapColyseusState(cs)
        setState(mapped)
        setLoading(false)
        setMoveRequestPending(false)

        if (mapped.status === 'finished' && finishTriggeredRef.current !== sess0.id) {
          finishTriggeredRef.current = sess0.id
          countProgress(mapped)
        }
      })

      room.onMessage('play_rejected', (payload: { reason: string }) => {
        if (isStale()) return
        console.log('[COLYSEUS] MOVE REJECTED BY SERVER:', payload?.reason)
        setMoveRequestPending(false)
      })
    }

    init()
    return () => {
      cancelled = true
      clearTimeout(minWaitTimer)
      leaveRoom(roomRef.current)
      roomRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  async function play(i: number) {
    if (!state || !session || !myId) { console.log('MOVE BLOCKED REASON: no state/session/user'); return }
    if (moveRequestPending) { console.log('MOVE BLOCKED REASON: move request already in flight'); return }
    if (state.status !== 'active') { console.log('MOVE BLOCKED REASON: game finished'); return }
    if (state.currentTurn !== myId) { console.log('MOVE BLOCKED REASON: not your turn (turn=' + state.currentTurn + ', me=' + myId + ')'); return }
    if (state.board[i] !== '') { console.log('MOVE BLOCKED REASON: cell taken'); return }

    const room = roomRef.current
    if (!room) { console.log('MOVE BLOCKED REASON: no active room connection'); return }

    console.log('[COLYSEUS] MOVE ATTEMPT (send):', i)
    setMoveRequestPending(true)
    // send() has no direct response promise — the server's authoritative
    // outcome arrives either as a 'play_rejected' message (see the
    // listener registered in init() above) or as the next onStateChange
    // broadcast (accepted move). Both paths clear moveRequestPending;
    // this timeout is only a safety net against a silently dropped
    // message (e.g. a genuine connection loss right at send time) so the
    // board can never be left permanently disabled by a lost message.
    room.send('play', { cellIndex: i })
    setTimeout(() => setMoveRequestPending((p) => p ? false : p), 5000)
  }

  async function countProgress(finishedState: GameState) {
    if (!session || !myId) return
    console.log('ABOUT TO COUNT PROGRESS')

    // WINNER CHECK — only real wins count, draws do NOT
    console.log('WINNER CHECK:', finishedState.winner)
    const isRealWin = finishedState.winner === session.player_one_id || finishedState.winner === session.player_two_id

    // Helper: write progressCounted while PRESERVING playAgain (read fresh)
    async function markCounted() {
      const { data: f } = await supabase.from('game_sessions').select('state').eq('id', session!.id).maybeSingle()
      const live = (f?.state || finishedState) as GameState
      const marked = {
        ...live,
        progressCounted: true,
        playAgain: live.playAgain || finishedState.playAgain || { player_one_ready: false, player_two_ready: false, next_session_id: null },
      }
      console.log('PROGRESS COUNTED PRESERVED: playAgain kept')
      await supabase.from('game_sessions').update({ state: marked }).eq('id', session!.id)
      setState(marked)
    }

    if (!isRealWin) {
      console.log('DRAW NO POINT:', finishedState.winner)
      await markCounted()
      return
    }

    if (finishedState.progressCounted) { console.log('SESSION ALREADY COUNTED:', session.id); return }
    const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
    if (fresh?.state?.progressCounted) { console.log('SESSION ALREADY COUNTED:', session.id); return }

    console.log('COUNTING WIN POINT:', session.id)
    const otherId = myId === session.player_one_id ? session.player_two_id : session.player_one_id

    // Mark counted FIRST (preserving playAgain)
    await markCounted()

    const after = await incrementPairGames(otherId)
    if (after.error) {
      console.error('PROGRESS UPDATE FAILED:', after.error)
      setProgressError(after.error)
    } else {
      console.log('PROGRESS AFTER:', after.games_completed)
      setPairCount(after.games_completed)
      setProgressError(null)
    }
  }

  // ── Play Again = new invite (uses working invite flow) ──────────
  async function playAgain() {
    if (!session || !myId) return
    if (waitingForPlayer) return
    console.log('PLAY AGAIN REQUESTED')
    console.log('PLAY AGAIN CLICKED:', session.id)
    setIAmReady(true)

    const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    console.log('PLAY AGAIN OPPONENT:', opponentId)

    const result = await sendGameInvite(opponentId, 'tic_tac_toe', session.id)
    if (!result.ok || !result.inviteId) {
      console.error('Play again invite failed:', result.error)
      setIAmReady(false)
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
      setIAmReady(false)
      return
    }

    console.log('NEW GAME SESSION CREATED (invite):', result.inviteId)
    console.log('PLAY AGAIN INVITE CREATED:', result.inviteId)
    console.log('NO LIMIT REACHED')

    // Opponent name for waiting screen
    const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
    setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'tic_tac_toe', originalSessionId: session.id })
    console.log('PLAY AGAIN WAITING SCREEN:', result.inviteId)
    navigate('waiting')
  }


  // TEMPORARY DEV DIAGNOSTIC — remove after investigation.
  // Must be here, before any conditional return below, so it's always
  // called on every render (Rules of Hooks) — this is the exact fix for
  // the app-wide crash the previous placement (after an early return)
  // caused.
  useEffect(() => {
    console.log('[TTT_MOVE_DIAG]', JSON.stringify({
      sessionId: session?.id,
      currentTurn: state?.currentTurn,
      playerOne: session?.player_one_id,
      playerTwo: session?.player_two_id,
      myUserId: myId,
      myRole: myId === session?.player_one_id ? 'X (player_one)' : myId === session?.player_two_id ? 'O (player_two)' : 'UNKNOWN',
      loading,
      gameStatus: state?.status,
      isMyTurn: !!state && state.currentTurn === myId && state.status === 'active',
      colyseusConnected: !!roomRef.current,
    }))
  }, [session?.id, state?.currentTurn, state?.status, myId, loading])

  // ── No session ──
  if (!session) {
    if (isExitingRef.current) {
      // Intentional exit after a finished game — not a real error. Render
      // nothing (a neutral background) instead of the error message while
      // this component fades out and 'profile' fades in.
      return <div className="flex flex-col h-full" style={{ background: '#0a0a10' }} />
    }
    console.log('[TTT_DIAG] TicTacToeScreen rendering no-session fallback — this screen is active but has no session')
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}
        </div>
        <button onClick={() => navigate('profile')}
          className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω' : 'Back'}
        </button>
      </div>
    )
  }

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a10' }}>
        <div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>⭕</div>
      </div>
    )
  }

  const isMyTurn = state.currentTurn === myId && state.status === 'active' && !moveRequestPending && minWaitElapsed
  const myName = myId === session.player_one_id ? names.one : names.two
  const oppName = myId === session.player_one_id ? names.two : names.one

  // Status message
  let statusMsg = ''
  if (state.status === 'waiting_for_players') {
    statusMsg = lang === 'gr' ? '⏳ Περιμένουμε τον παίκτη...' : '⏳ Waiting for a player...'
  } else if (state.status === 'finished') {
    if (state.winner === 'draw') statusMsg = lang === 'gr' ? 'Ισοπαλία!' : "It's a draw!"
    else if (state.winner === myId) statusMsg = lang === 'gr' ? '🎉 Νίκησες!' : '🎉 You won!'
    else statusMsg = lang === 'gr' ? `${oppName} κέρδισε.` : `${oppName} won.`
  } else {
    statusMsg = isMyTurn
      ? (lang === 'gr' ? 'Σειρά σου' : 'Your turn')
      : (lang === 'gr' ? `Σειρά: ${oppName}` : `${oppName}'s turn`)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.094) 0%, transparent 55%), #0a0a10' }}>
      <FloatingChatButton openChat={openChat} isChatUnlocked={pairCount >= 10} />
      <FloatingRematchNotification session={session} myId={myId || ''} opponentName={oppName} />
      <RematchDeclinedToast lang={lang} />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <BackControl lang={lang} onClick={() => {
          if (state?.status === 'finished') {
            // Navigate FIRST, then clear the session — not the other way
            // around. React 18 batches both calls into one render, but
            // ordering it this way guarantees that by the instant the
            // session actually becomes null, `screen` has already moved to
            // 'profile' and this component is already hidden
            // (opacity:0, pointerEvents:none) — there is no window,
            // however brief, where a visible screen could reflect the
            // cleared session. Also goes straight to 'profile' instead of
            // via Game Room, which reads getCurrentSession() directly and
            // would show its own identical fallback otherwise.
            navigate('profile')
            isExitingRef.current = true
            clearCurrentSession()
          } else {
            navigate('game_room')
          }
        }} />
        <h1 className="text-[16px] font-extrabold text-white flex-1">⭕ Tic Tac Toe</h1>
      </div>

      {/* Players */}
      <div className="ttt-players-row flex items-center justify-center gap-6 py-5">
        <div className="text-center">
          <div className="flex justify-center mb-1.5">
            <GamePlayerAvatar
              userId={myId || ''}
              displayName={myName}
              photoUrl={photoAccess.myPhoto}
              photoUnlocked={photoAccess.photoUnlocked}
              size={32}
              accentColor={mySymbol === 'X' ? '#ff3384' : '#7c72ff'}
              isCurrentUser
              glow={false}
            />
          </div>
          <div className="text-[13px] font-bold" style={{ color: mySymbol === 'X' ? '#ff3384' : '#7c72ff' }}>
            {myName} ({mySymbol})
          </div>
          <div className="text-[10px] text-white/40">{lang === 'gr' ? 'εσύ' : 'you'}</div>
        </div>
        <div className="text-[18px] font-black text-white/30">VS</div>
        <div className="text-center">
          <div className="flex justify-center mb-1.5">
            <GamePlayerAvatar
              userId={(myId === session.player_one_id ? session.player_two_id : session.player_one_id) || ''}
              displayName={oppName}
              photoUrl={photoAccess.opponentPhoto}
              photoUnlocked={photoAccess.photoUnlocked}
              size={32}
              accentColor={mySymbol === 'X' ? '#7c72ff' : '#ff3384'}
              glow={false}
            />
          </div>
          <div className="text-[13px] font-bold" style={{ color: mySymbol === 'X' ? '#7c72ff' : '#ff3384' }}>
            {oppName} ({mySymbol === 'X' ? 'O' : 'X'})
          </div>
          <div className="text-[10px] text-white/40">{lang === 'gr' ? 'αντίπαλος' : 'opponent'}</div>
        </div>
      </div>

      {/* Status */}
      <div className="ttt-status-row text-center mb-4">
        <span className="text-[15px] font-bold px-4 py-2 rounded-full"
          style={{
            background: isMyTurn ? 'rgba(253,41,123,0.142)' : 'rgba(255,255,255,0.047)',
            color: isMyTurn ? '#ff3384' : 'rgba(255,255,255,0.708)',
            border: isMyTurn ? '1px solid rgba(253,41,123,0.295)' : '1px solid rgba(255,255,255,0.071)',
          }}>
          {statusMsg}
        </span>
      </div>

      <GamePresenceBanner />

      {/* Board */}
      <div className="flex items-center justify-center px-6">
        <div className={`ttt-board-grid${pairCount >= 10 ? ' ttt-board-unlocked' : ''}`} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 12,
          width: '100%',
          maxWidth: 360,
          margin: '0 auto',
        }}>
          {Array.from({ length: 9 }, (_, i) => state.board?.[i] || '').map((cell, i) => {
            const clickable = isMyTurn && cell === ''
            return (
              <button key={i} onClick={() => play(i)} disabled={!clickable}
                style={{
                  aspectRatio: '1 / 1',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  fontWeight: 900,
                  borderRadius: 18,
                  transition: 'all 0.15s',
                  background: cell ? 'rgba(255,255,255,0.047)' : clickable ? 'rgba(253,41,123,0.071)' : 'rgba(255,255,255,0.024)',
                  border: `1px solid ${clickable ? 'rgba(253,41,123,0.295)' : 'rgba(255,255,255,0.094)'}`,
                  color: cell === 'X' ? '#ff3384' : '#7c72ff',
                  textShadow: cell === 'X' ? '0 0 16px rgba(253,41,123,0.59)' : cell === 'O' ? '0 0 16px rgba(108,99,255,0.59)' : 'none',
                  cursor: clickable ? 'pointer' : 'default',
                }}>
                {cell}
              </button>
            )
          })}
        </div>
      </div>

      {/* Finished actions */}
      {state.status === 'finished' && (
        <div className="ttt-finished-actions px-6 mt-6 flex flex-col gap-2.5">
          {waitingForPlayer ? (
            <div className="w-full rounded-2xl py-3.5 text-[14px] font-bold text-center"
              style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.59)', border: '1px solid rgba(255,255,255,0.094)' }}>
              ⏳ {lang === 'gr' ? 'Περιμένουμε τον παίκτη...' : 'Waiting for a player...'}
            </div>
          ) : iAmReady ? (
            <div className="w-full rounded-2xl py-3.5 text-[14px] font-bold text-center"
              style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.59)', border: '1px solid rgba(255,255,255,0.094)' }}>
              ⏳ {lang === 'gr' ? 'Περιμένουμε τον παίκτη...' : 'Waiting for player...'}
            </div>
          ) : (
            <button onClick={playAgain}
              className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>
              🔁 {lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}
            </button>
          )}
          <ChatUnlockProgress currentProgress={pairCount} isUnlocked={pairCount >= 10} lang={lang} />
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @media (max-width: 767.98px) {
          /* The app-shell frame uses overflow:hidden on mobile (no page
             scroll) — so the earlier fix of only adding bottom padding
             could never work by itself: it just made the total content
             taller, pushing the message further into the clipped region
             instead of closer to visible. The actual fix is to reduce
             genuinely unnecessary spacing ABOVE the action group, pulling
             the whole "Play Again + chat-unlock message" block upward so
             it fits inside the frame's fixed height in the first place. */
          .ttt-players-row { padding-top: 10px !important; padding-bottom: 10px !important; }
          .ttt-status-row { margin-bottom: 8px !important; }
          .ttt-finished-actions {
            margin-top: 8px !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px) !important;
          }
          .ttt-board-grid {
            max-width: 288px !important;
          }
          .ttt-board-grid.ttt-board-unlocked {
            max-width: 360px !important;
          }
        }
      `}</style>
    </div>
  )
}
