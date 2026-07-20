'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setCurrentSession, subscribeCurrentSession, clearCurrentSession, sendGameInvite, setPendingInvite, setRematchInProgress } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'

const COLS = 7, ROWS = 6

function checkWin(b: string[]): string | null {
  const at = (r: number, c: number) => b[r * COLS + c]
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = at(r, c); if (!p) continue
    // horizontal, vertical, two diagonals
    if (c + 3 < COLS && p === at(r,c+1) && p === at(r,c+2) && p === at(r,c+3)) return p
    if (r + 3 < ROWS && p === at(r+1,c) && p === at(r+2,c) && p === at(r+3,c)) return p
    if (r + 3 < ROWS && c + 3 < COLS && p === at(r+1,c+1) && p === at(r+2,c+2) && p === at(r+3,c+3)) return p
    if (r + 3 < ROWS && c - 3 >= 0 && p === at(r+1,c-1) && p === at(r+2,c-2) && p === at(r+3,c-3)) return p
  }
  return null
}

interface GameState { board: string[]; currentTurn: string; winner: string | null; status: string; moves: number; progressCounted?: boolean }

export default function Connect4Screen() {
  const { navigate, lang } = useApp()
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
    activeSessionRef.current = s0.id
    progressRefreshedRef.current = null
    isExitingRef.current = false

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

    // Guards the post-SUBSCRIBED refetch below against applying state
    // after this effect has been cleaned up (unmount, or session changed).
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setMyId(user.id)
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [s0.player_one_id, s0.player_two_id])
      const nm = new Map(profs?.map(p => [p.id, p.name]) || [])
      setNames({ one: nm.get(s0.player_one_id) || 'P1', two: nm.get(s0.player_two_id) || 'P2' })

      // Load pair progress (for chat unlock gate) — same shared source of
      // truth already used by Tic Tac Toe and Mystery Choice.
      const otherId = user.id === s0.player_one_id ? s0.player_two_id : s0.player_one_id
      const prog = await getPairProgress(otherId)
      setPairCount(prog.games_completed)

      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', s0.id).maybeSingle()
      let gs: GameState
      if (sess?.state && sess.state.board && sess.state.board.length === 42) {
        gs = sess.state as GameState
        const validTurn = gs.currentTurn === s0.player_one_id || gs.currentTurn === s0.player_two_id
        if (!validTurn) gs.currentTurn = s0.player_one_id
      } else {
        gs = { board: Array(42).fill(''), currentTurn: s0.player_one_id, winner: null, status: 'active', moves: 0 }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', s0.id)
      }
      if (cancelled) return
      latestMovesRef.current = typeof gs.moves === 'number' ? gs.moves : -1
      setState(gs); setLoading(false)

      channelRef.current = supabase
        .channel(`c4-${s0.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${s0.id}` },
          (payload: any) => {
            const updatedId = payload.new?.id
            if (updatedId !== activeSessionRef.current) return
            const ns = payload.new?.state
            if (ns && ns.board) {
              console.log('REALTIME GAME UPDATE:', ns.moves)
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
          if (status !== 'SUBSCRIBED') return
          // Closes the gap between the initial SELECT and the moment this
          // channel actually goes live — re-fetch once in case a move
          // landed in that window and was missed. Same fix already proven
          // for Tic Tac Toe.
          if (cancelled || activeSessionRef.current !== s0.id) return
          const { data: latest, error: latestErr } = await supabase
            .from('game_sessions').select('state').eq('id', s0.id).single()
          if (cancelled || activeSessionRef.current !== s0.id) return
          if (latestErr || !latest?.state?.board) return
          applyIfNotStale(latest.state as GameState)
        })
    }
    init()
    return () => {
      cancelled = true
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [session?.id])

  // Visibility reconciliation — Connect4 only, no polling. When the tab
  // becomes visible again, fetch the exact active session's state once.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const sid = activeSessionRef.current
      if (!sid) return
      supabase.from('game_sessions').select('state').eq('id', sid).maybeSingle().then(({ data, error }) => {
        if (error || !data?.state?.board) return
        if (activeSessionRef.current !== sid) return
        applyIfNotStale(data.state as GameState)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function drop(col: number) {
    if (!state || !session || !myId) return
    if (state.status === 'finished' || state.currentTurn !== myId) return
    // find lowest empty row in col
    let row = -1
    for (let r = ROWS - 1; r >= 0; r--) { if (!state.board[r * COLS + col]) { row = r; break } }
    if (row < 0) return

    const board = [...state.board]
    board[row * COLS + col] = myColor
    const win = checkWin(board)
    const moves = state.moves + 1
    let winner: string | null = null, status = 'active'
    let currentTurn = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    if (win) { winner = myId; status = 'finished' }
    else if (moves >= 42) { winner = 'draw'; status = 'finished' }

    const newState: GameState = { board, currentTurn, winner, status, moves }
    applyIfNotStale(newState) // optimistic

    const sessionIdAtWrite = session.id
    const { data: confirmed, error } = await supabase
      .from('game_sessions').update({ state: newState }).eq('id', session.id)
      .select('state').single()
    if (error) {
      console.error('SESSION UPDATE error:', error)
    } else {
      console.log('SESSION UPDATED:', session.id)
      if (activeSessionRef.current === sessionIdAtWrite && confirmed?.state?.board) {
        applyIfNotStale(confirmed.state as GameState)
      }
    }

    if (status === 'finished') await countProgress(newState)
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
    setRematchInProgress(true)
    try {
      const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
      const result = await sendGameInvite(opponentId, 'connect_4')
      if (!result.ok || !result.inviteId) {
        console.error('Play again invite failed:', result.error)
        return
      }
      const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
      setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'connect_4' })
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

  const isMyTurn = state.currentTurn === myId && state.status === 'active'
  const myName = myId === session.player_one_id ? names.one : names.two
  const oppName = myId === session.player_one_id ? names.two : names.one

  let statusMsg = ''
  if (state.status === 'finished') {
    if (state.winner === 'draw') statusMsg = lang === 'gr' ? 'Ισοπαλία!' : "It's a draw!"
    else if (state.winner === myId) statusMsg = lang === 'gr' ? '🎉 Νίκησες!' : '🎉 You won!'
    else statusMsg = lang === 'gr' ? `${oppName} κέρδισε.` : `${oppName} won.`
  } else statusMsg = isMyTurn ? (lang === 'gr' ? 'Σειρά σου' : 'Your turn') : (lang === 'gr' ? `Σειρά: ${oppName}` : `${oppName}'s turn`)

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.094) 0%, transparent 55%), #0a0a10' }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => {
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
        }} className="text-white/40 text-[14px] cursor-pointer">←</button>
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
          <button onClick={playAgain} className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>{lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}</button>
          {pairCount >= 10 ? (
            <button onClick={() => navigate('chat')} className="w-full rounded-2xl py-3 text-[14px] font-bold active:scale-95 cursor-pointer" style={{ background: 'rgba(108,99,255,0.142)', color: '#b79cfc', border: '1px solid rgba(108,99,255,0.236)' }}>💬 {lang === 'gr' ? 'Κουβέντα' : 'Chat'}</button>
          ) : (
            <div className="text-center text-[12px] px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.55)' }}>
              🔒 {lang === 'gr' ? `Το chat ξεκλειδώνει μετά από 10 νίκες μαζί (${pairCount}/10)` : `Chat unlocks after 10 wins together (${pairCount}/10)`}
            </div>
          )}
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

