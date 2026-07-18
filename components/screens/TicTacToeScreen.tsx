'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setCurrentSession, subscribeCurrentSession, clearCurrentSession, sendGameInvite, setPendingInvite } from '@/lib/gameInvites'
import { incrementPairGames, getPairProgress } from '@/lib/pairProgress'
import { fetchGamePlayerPhotoAccess } from '@/lib/gamePlayerPhoto'
import GamePlayerAvatar from '@/components/ui/GamePlayerAvatar'

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWinner(b: string[]): string | null {
  for (const [a,c,d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  }
  return null
}

interface GameState {
  gameNumber?: number
  parentSessionId?: string | null
  board: string[]
  currentTurn: string
  winner: string | null
  status: string
  moves: number
  progressCounted?: boolean
  playAgain?: {
    player_one_ready: boolean
    player_two_ready: boolean
    next_session_id: string | null
  }
}

export default function TicTacToeScreen() {
  const { navigate, lang } = useApp()
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
  const channelRef = useRef<any>(null)
  const activeSessionRef = useRef<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [pairCount, setPairCount] = useState<number>(0)
  const [photoAccess, setPhotoAccess] = useState<{ photoUnlocked: boolean; myPhoto: string | null; opponentPhoto: string | null }>({ photoUnlocked: false, myPhoto: null, opponentPhoto: null })
  const [iAmReady, setIAmReady] = useState(false)

  // My symbol: player_one = X, player_two = O
  const mySymbol = session && myId === session.player_one_id ? 'X' : 'O'

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const sess0 = session  // non-null capture for closure

    // GUARD: this screen must only touch tic_tac_toe sessions.
    // All game screens are always-mounted and share the same global session,
    // so without this guard, accepting a different game type (e.g. mystery_choice)
    // would make TicTacToe "repair" and overwrite that session's state.
    if (sess0.game_type && sess0.game_type !== 'tic_tac_toe' && sess0.game_type !== 'mystery') {
      console.log('TICTACTOE SCREEN SKIP: wrong game_type', sess0.game_type, sess0.id)
      return
    }

    // Clear old state when session changes (fresh board for new game)
    console.log('SESSION SWITCH DETECTED:', sess0.id)
    console.log('OLD SESSION CLEANED:')
    setState(null)
    setLoading(true)
    setIAmReady(false)
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }

    // Hard guard: mark the active session id
    activeSessionRef.current = sess0.id
    console.log('ACTIVE SESSION ID:', sess0.id)

    // Guards the post-SUBSCRIBED refetch below against applying state after
    // this effect has been cleaned up (unmount, or session/game changed).
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }
      setMyId(user.id)

      // Fetch player names
      const { data: profs } = await supabase.from('profiles').select('id, name')
        .in('id', [sess0.player_one_id, sess0.player_two_id])
      const nm = new Map(profs?.map(p => [p.id, p.name]) || [])
      setNames({
        one: nm.get(sess0.player_one_id) || 'Player 1',
        two: nm.get(sess0.player_two_id) || 'Player 2',
      })

      // Load pair progress (for chat unlock gate)
      const otherId = user.id === sess0.player_one_id ? sess0.player_two_id : sess0.player_one_id
      const prog = await getPairProgress(otherId)
      setPairCount(prog.games_completed)
      console.log('CHAT LOCK CHECK:', prog.games_completed, '/10, unlocked:', prog.chat_unlocked)

      // Shared avatar photo access — same source of truth and same shared
      // component already used by Mystery Choice. Presentation-only.
      fetchGamePlayerPhotoAccess(user.id, otherId).then(setPhotoAccess)

      // Always fetch FRESH state from Supabase by session_id
      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
      console.log('NEW SESSION FRESH LOADED:', sess0.id)

      let gs: GameState
      const raw = sess?.state as any
      const validBoard = raw?.board && Array.isArray(raw.board) && raw.board.length === 9
      const validTurn = raw?.currentTurn === sess0.player_one_id || raw?.currentTurn === sess0.player_two_id

      if (raw && validBoard && validTurn) {
        gs = raw as GameState
        console.log('VALID STATE: loaded existing')
      } else {
        // Repair / initialize
        gs = {
          gameNumber: typeof raw?.gameNumber === 'number' ? raw.gameNumber : 1,
          parentSessionId: raw?.parentSessionId ?? null,
          board: validBoard ? raw.board : ['','','','','','','','',''],
          currentTurn: validTurn ? raw.currentTurn : sess0.player_one_id,
          winner: raw?.winner ?? null,
          status: raw?.status || 'active',
          moves: typeof raw?.moves === 'number' ? raw.moves : 0,
          progressCounted: raw?.progressCounted || false,
        }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', sess0.id)
        console.log('VALID STATE: repaired/initialized')
      }
      console.log('GAME NUMBER:', gs.gameNumber ?? 1)
      setState(gs)
      console.log('CURRENT TURN:', gs.currentTurn)
      setLoading(false)

      // Subscribe to realtime updates for THIS session
      channelRef.current = supabase
        .channel(`ttt-${sess0.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'game_sessions',
          filter: `id=eq.${sess0.id}`,
        }, (payload: any) => {
          const updatedId = payload.new?.id
          console.log('REALTIME UPDATE SESSION ID:', updatedId)
          // HARD GUARD: ignore updates that aren't for the active session
          if (updatedId !== activeSessionRef.current) {
            console.log('IGNORED OLD SESSION UPDATE:', updatedId)
            return
          }
          const newState = payload.new?.state
          if (newState && newState.board) {
            console.log('TICTACTOE REALTIME UPDATE:', newState.moves, 'moves')
            newState.board = Array.from({ length: 9 }, (_, k) => newState.board?.[k] || '')
            setState(newState)
          }
        })
        .subscribe(async (status: string) => {
          if (status !== 'SUBSCRIBED') return
          console.log('TICTACTOE CHANNEL SUBSCRIBED:', sess0.id)
          // Closes the gap between the initial SELECT and the moment this
          // channel actually goes live: re-fetch once, right now, in case
          // the opponent's move landed in that window and was missed.
          if (cancelled || activeSessionRef.current !== sess0.id) return
          const { data: latest, error: latestErr } = await supabase
            .from('game_sessions')
            .select('state')
            .eq('id', sess0.id)
            .single()
          if (cancelled || activeSessionRef.current !== sess0.id) return
          if (latestErr || !latest?.state) return
          const latestState = latest.state as any
          if (!latestState.board || !Array.isArray(latestState.board)) return
          console.log('TICTACTOE POST-SUBSCRIBE REFETCH:', latestState.moves, 'moves')
          latestState.board = Array.from({ length: 9 }, (_, k) => latestState.board?.[k] || '')
          setState(latestState)
        })
    }

    init()
    return () => {
      cancelled = true
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  // Visibility reconciliation — Tic Tac Toe only, no polling. When the tab
  // becomes visible again, fetch the exact active session's state once and
  // apply it if it's still the current session. Realtime can be missed
  // while a tab is backgrounded on some browsers/devices; this recovers
  // without requiring a page refresh.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const sid = activeSessionRef.current
      if (!sid) return
      supabase.from('game_sessions').select('state').eq('id', sid).maybeSingle().then(({ data, error }) => {
        if (error || !data?.state) return
        if (activeSessionRef.current !== sid) return  // session changed while fetching
        const latest = data.state as any
        if (!latest.board || !Array.isArray(latest.board)) return
        console.log('TICTACTOE VISIBILITY RECONCILE:', latest.moves, 'moves')
        latest.board = Array.from({ length: 9 }, (_, k) => latest.board?.[k] || '')
        setState(latest)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function play(i: number) {
    if (!state || !session || !myId) { console.log('MOVE BLOCKED REASON: no state/session/user'); return }
    if (state.status === 'finished') { console.log('MOVE BLOCKED REASON: game finished'); return }
    if (state.currentTurn !== myId) { console.log('MOVE BLOCKED REASON: not your turn (turn=' + state.currentTurn + ', me=' + myId + ')'); return }
    if (state.board[i] !== '') { console.log('MOVE BLOCKED REASON: cell taken'); return }

    const board = Array.from({ length: 9 }, (_, k) => state.board?.[k] || '')
    board[i] = mySymbol

    const win = checkWinner(board)
    const moves = state.moves + 1
    let winner: string | null = null
    let status = 'active'
    let currentTurn = myId === session.player_one_id ? session.player_two_id : session.player_one_id

    if (win) {
      winner = myId
      status = 'finished'
      console.log('WINNER FOUND:', myId)
    } else if (moves >= 9) {
      winner = 'draw'
      status = 'finished'
      console.log('DRAW FOUND:')
    }

    const newState: GameState = {
      gameNumber: state.gameNumber ?? 1,
      parentSessionId: state.parentSessionId ?? null,
      board, currentTurn, winner, status, moves,
      progressCounted: state.progressCounted,
      // Initialize playAgain whenever the game finishes (winner OR draw)
      playAgain: status === 'finished'
        ? (state.playAgain || { player_one_ready: false, player_two_ready: false, next_session_id: null })
        : state.playAgain,
    }
    setState(newState) // optimistic
    console.log('MOVE ATTEMPT:', i, mySymbol)

    const sessionIdAtWrite = session.id
    const { data: confirmed, error: e } = await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', session.id)
      .select('state')
      .single()
    if (e) {
      console.error('SESSION UPDATE error:', e)
    } else {
      console.log('MOVE SAVED TO SESSION:', session.id)
      // Reconcile with the confirmed database row instead of leaving this
      // device permanently dependent on its own optimistic update. Guard
      // against applying a stale write's confirmation if the session has
      // since changed (e.g. a fast Play Again transition).
      if (activeSessionRef.current === sessionIdAtWrite && confirmed?.state) {
        const confirmedState = confirmed.state as any
        if (confirmedState.board && Array.isArray(confirmedState.board)) {
          confirmedState.board = Array.from({ length: 9 }, (_, k) => confirmedState.board?.[k] || '')
          setState(confirmedState)
        }
      }
    }

    // If this move finished the game, count progress once (the finishing mover records it)
    if (status === 'finished') {
      console.log('GAME ENDED')
      console.log('winner:', winner)
      await countProgress(newState)
    }
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
    console.log('PLAY AGAIN REQUESTED')
    console.log('PLAY AGAIN CLICKED:', session.id)
    setIAmReady(true)

    const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    console.log('PLAY AGAIN OPPONENT:', opponentId)

    const result = await sendGameInvite(opponentId, 'tic_tac_toe')
    if (!result.ok || !result.inviteId) {
      console.error('Play again invite failed:', result.error)
      setIAmReady(false)
      return
    }
    console.log('NEW GAME SESSION CREATED (invite):', result.inviteId)
    console.log('PLAY AGAIN INVITE CREATED:', result.inviteId)
    console.log('NO LIMIT REACHED')

    // Opponent name for waiting screen
    const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
    setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'tic_tac_toe' })
    console.log('PLAY AGAIN WAITING SCREEN:', result.inviteId)
    navigate('waiting')
  }


  // ── No session ──
  if (!session) {
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

  const isMyTurn = state.currentTurn === myId && state.status === 'active'
  const myName = myId === session.player_one_id ? names.one : names.two
  const oppName = myId === session.player_one_id ? names.two : names.one

  // Status message
  let statusMsg = ''
  if (state.status === 'finished') {
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

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => {
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
            clearCurrentSession()
          } else {
            navigate('game_room')
          }
        }} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">⭕ Tic Tac Toe</h1>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-6 py-5">
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
      <div className="text-center mb-4">
        <span className="text-[15px] font-bold px-4 py-2 rounded-full"
          style={{
            background: isMyTurn ? 'rgba(253,41,123,0.142)' : 'rgba(255,255,255,0.047)',
            color: isMyTurn ? '#ff3384' : 'rgba(255,255,255,0.708)',
            border: isMyTurn ? '1px solid rgba(253,41,123,0.295)' : '1px solid rgba(255,255,255,0.071)',
          }}>
          {statusMsg}
        </span>
      </div>

      {/* Board */}
      <div className="flex items-center justify-center px-6">
        <div style={{
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
          {iAmReady ? (
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
          {pairCount >= 10 ? (
            <button onClick={() => navigate('chat')}
              className="w-full rounded-2xl py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'rgba(108,99,255,0.142)', color: '#b79cfc', border: '1px solid rgba(108,99,255,0.236)' }}>
              💬 {lang === 'gr' ? 'Κουβέντα' : 'Chat'}
            </button>
          ) : (
            <div className="w-full rounded-2xl py-3 text-[13px] font-medium text-center"
              style={{ background: 'rgba(255,255,255,0.035)', color: 'rgba(255,255,255,0.472)', border: '1px solid rgba(255,255,255,0.071)' }}>
              🔒 {lang === 'gr' ? `Το chat ξεκλειδώνει μετά από 10 νίκες μαζί (${pairCount}/10)` : `Chat unlocks after 10 wins together (${pairCount}/10)`}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @media (max-width: 767.98px) {
          .ttt-finished-actions {
            margin-top: 8px !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
          }
        }
      `}</style>
    </div>
  )
}
