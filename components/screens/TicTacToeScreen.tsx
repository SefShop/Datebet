'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setCurrentSession } from '@/lib/gameInvites'
import { incrementPairGames, getPairProgress } from '@/lib/pairProgress'

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWinner(b: string[]): string | null {
  for (const [a,c,d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  }
  return null
}

interface GameState {
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
  const session = getCurrentSession()

  const [state, setState]   = useState<GameState | null>(null)
  const [myId, setMyId]     = useState<string | null>(null)
  const [names, setNames]   = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [pairCount, setPairCount] = useState<number>(0)
  const [iAmReady, setIAmReady] = useState(false)

  // My symbol: player_one = X, player_two = O
  const mySymbol = session && myId === session.player_one_id ? 'X' : 'O'

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const sess0 = session  // non-null capture for closure
    console.log('TICTACTOE SESSION:', sess0.id)

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

      // Load or initialize state
      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
      let gs: GameState
      if (sess?.state && sess.state.board && sess.state.board.length === 9) {
        gs = sess.state as GameState
        if (!gs.currentTurn) { gs.currentTurn = sess0.player_one_id; await supabase.from('game_sessions').update({ state: gs }).eq('id', sess0.id) }
        console.log('TICTACTOE SESSION LOADED: existing state')
      } else {
        gs = {
          board: ['','','','','','','','',''],
          currentTurn: sess0.player_one_id,
          winner: null, status: 'active', moves: 0,
        }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', sess0.id)
        console.log('TICTACTOE STATE INIT:')
      }
      setState(gs)
      console.log('CURRENT TURN:', gs.currentTurn)
      setLoading(false)

      // Subscribe to realtime updates
      channelRef.current = supabase
        .channel(`ttt-${sess0.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'game_sessions',
          filter: `id=eq.${sess0.id}`,
        }, (payload: any) => {
          const newState = payload.new?.state
          if (newState && newState.board) {
            console.log('TICTACTOE REALTIME UPDATE:', newState.moves, 'moves')
            newState.board = Array.from({ length: 9 }, (_, k) => newState.board?.[k] || '')
            setState(newState)
            // Play Again: react to ready flags / next session
            if (newState.playAgain) {
              if (newState.playAgain.next_session_id) {
                const nextId = newState.playAgain.next_session_id
                console.log('NEXT SESSION DETECTED AFTER WINNER:', nextId)
                console.log('NAVIGATING TO NEXT SESSION:', nextId)
                supabase.from('game_sessions').select('*').eq('id', nextId).maybeSingle().then(({ data }: any) => {
                  if (data) { setCurrentSession(data); navigate('game_room'); setTimeout(() => navigate('tictactoe'), 50) }
                })
              } else if (newState.playAgain.player_one_ready && newState.playAgain.player_two_ready) {
                checkAndCreate()
              }
            }
          }
        })
        .subscribe()
    }

    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [session])

  // Poll fallback while waiting for the other player (hook stays above any early return)
  useEffect(() => {
    if (!iAmReady || !session) return
    const t = setInterval(() => { checkAndCreate() }, 2000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmReady, session])

  async function play(i: number) {
    if (!state || !session || !myId) return
    if (state.status === 'finished') return
    if (state.currentTurn !== myId) { console.log('Not your turn'); return }
    if (state.board[i] !== '') return

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
      board, currentTurn, winner, status, moves,
      progressCounted: state.progressCounted,
      // Initialize playAgain whenever the game finishes (winner OR draw)
      playAgain: status === 'finished'
        ? (state.playAgain || { player_one_ready: false, player_two_ready: false, next_session_id: null })
        : state.playAgain,
    }
    setState(newState) // optimistic
    console.log('MOVE ATTEMPT:', i, mySymbol)

    const { error: e } = await supabase.from('game_sessions').update({ state: newState }).eq('id', session.id)
    if (e) console.error('SESSION UPDATE error:', e)
    else console.log('MOVE SAVED:', session.id)

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

  async function playAgain() {
    if (!session || !myId || !state) return
    console.log('PLAY AGAIN AFTER WINNER:', state.winner)
    console.log('PLAY AGAIN CLICKED:', session.id)

    // Read fresh state (preserves winner, progressCounted, etc.)
    const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
    const cur = (fresh?.state || state) as GameState
    console.log('STATE BEFORE PLAY AGAIN:', JSON.stringify({ winner: cur.winner, progressCounted: cur.progressCounted, playAgain: cur.playAgain }))
    const pa = cur.playAgain || { player_one_ready: false, player_two_ready: false, next_session_id: null }

    // If a next session already exists, just go there
    if (pa.next_session_id) {
      console.log('NAVIGATING TO NEXT SESSION:', pa.next_session_id)
      await navigateToNext(pa.next_session_id)
      return
    }

    // Set my ready flag
    if (myId === session.player_one_id) pa.player_one_ready = true
    if (myId === session.player_two_id) pa.player_two_ready = true
    console.log('READY FLAGS UPDATED:', pa.player_one_ready, pa.player_two_ready)
    setIAmReady(true)

    const updated = { ...cur, playAgain: pa }  // ...cur preserves winner + progressCounted
    await supabase.from('game_sessions').update({ state: updated }).eq('id', session.id)
    setState(updated)
    console.log('STATE AFTER PLAY AGAIN:', JSON.stringify({ winner: updated.winner, progressCounted: updated.progressCounted, playAgain: updated.playAgain }))

    await checkAndCreate()
  }

  // Runs on tap, realtime update, and poll. Only player_one creates.
  async function checkAndCreate() {
    try {
      if (!session || !myId) return
      console.log('APP CRASH FIX CHECK')
      const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
      const cur = (fresh?.state || state) as GameState
      console.log('PLAY AGAIN SAFE STATE:', JSON.stringify(cur?.playAgain || null))
      const pa = cur?.playAgain
      if (!pa) return
    console.log('RELOADED PLAY AGAIN STATE:', JSON.stringify(pa))

    // If next session exists, navigate
    if (pa.next_session_id) {
      console.log('NAVIGATING TO NEXT SESSION:', pa.next_session_id)
      await navigateToNext(pa.next_session_id)
      return
    }

    if (pa.player_one_ready && pa.player_two_ready) {
      console.log('BOTH READY AFTER WINNER:', cur.winner)
      if (myId === session.player_one_id) {
        console.log('CURRENT USER IS CREATOR:')
        await createNextSession(cur)
      } else {
        console.log('CURRENT USER WAITING FOR CREATOR:')
      }
    }
    } catch (e: any) { console.error('PLAY AGAIN ERROR:', e.message) }
  }

  async function createNextSession(cur: GameState) {
    if (!session) return
    // Guard: re-check next_session_id
    const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
    if (fresh?.state?.playAgain?.next_session_id) {
      console.log('NEXT SESSION ID:', fresh.state.playAgain.next_session_id, '(already created)')
      return
    }

    // Alternate starter: swap players
    const newPlayerOne = session.player_two_id
    const newPlayerTwo = session.player_one_id
    const { data, error } = await supabase.from('game_sessions').insert({
      invite_id: session.invite_id,
      player_one_id: newPlayerOne,
      player_two_id: newPlayerTwo,
      game_type: 'tic_tac_toe',
      status: 'active',
      state: {
        board: ['','','','','','','','',''],
        currentTurn: newPlayerOne,
        winner: null, status: 'active', moves: 0, progressCounted: false,
      },
    }).select().single()

    if (error || !data) { console.error('Play again error:', error); return }
    console.log('NEXT SESSION CREATED AFTER WINNER:', data.id)
    console.log('NEW PLAY AGAIN SESSION CREATED:', data.id)

    // Store next_session_id in OLD session so both detect it
    const pa = { ...(cur.playAgain || {}), player_one_ready: true, player_two_ready: true, next_session_id: data.id }
    await supabase.from('game_sessions').update({ state: { ...cur, playAgain: pa } }).eq('id', session.id)
    console.log('NEXT SESSION ID SAVED:', data.id)
    await navigateToNext(data.id)
  }

  async function navigateToNext(nextId: string) {
    console.log('NAVIGATING TO PLAY AGAIN SESSION:', nextId)
    const { data } = await supabase.from('game_sessions').select('*').eq('id', nextId).maybeSingle()
    if (!data) return
    setCurrentSession(data)
    navigate('game_room')
    setTimeout(() => navigate('tictactoe'), 50)
  }

  // ── No session ──
  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#06060a' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}
        </div>
        <button onClick={() => navigate('profile')}
          className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω' : 'Back'}
        </button>
      </div>
    )
  }

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#06060a' }}>
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
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.08) 0%, transparent 55%), #06060a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('game_room')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">⭕ Tic Tac Toe</h1>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-6 py-5">
        <div className="text-center">
          <div className="text-[13px] font-bold" style={{ color: mySymbol === 'X' ? '#fd297b' : '#6c63ff' }}>
            {myName} ({mySymbol})
          </div>
          <div className="text-[10px] text-white/40">{lang === 'gr' ? 'εσύ' : 'you'}</div>
        </div>
        <div className="text-[18px] font-black text-white/30">VS</div>
        <div className="text-center">
          <div className="text-[13px] font-bold" style={{ color: mySymbol === 'X' ? '#6c63ff' : '#fd297b' }}>
            {oppName} ({mySymbol === 'X' ? 'O' : 'X'})
          </div>
          <div className="text-[10px] text-white/40">{lang === 'gr' ? 'αντίπαλος' : 'opponent'}</div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-4">
        <span className="text-[15px] font-bold px-4 py-2 rounded-full"
          style={{
            background: isMyTurn ? 'rgba(253,41,123,0.12)' : 'rgba(255,255,255,0.04)',
            color: isMyTurn ? '#fd297b' : 'rgba(255,255,255,0.6)',
            border: isMyTurn ? '1px solid rgba(253,41,123,0.25)' : '1px solid rgba(255,255,255,0.06)',
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
                  background: cell ? 'rgba(255,255,255,0.04)' : clickable ? 'rgba(253,41,123,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${clickable ? 'rgba(253,41,123,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  color: cell === 'X' ? '#fd297b' : '#6c63ff',
                  textShadow: cell === 'X' ? '0 0 16px rgba(253,41,123,0.5)' : cell === 'O' ? '0 0 16px rgba(108,99,255,0.5)' : 'none',
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
        <div className="px-6 mt-6 flex flex-col gap-2.5">
          {iAmReady ? (
            <div className="w-full rounded-2xl py-3.5 text-[14px] font-bold text-center"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ⏳ {lang === 'gr' ? 'Περιμένουμε τον άλλο παίκτη...' : 'Waiting for the other player...'}
            </div>
          ) : (
            <button onClick={playAgain}
              className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff' }}>
              🔁 {lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}
            </button>
          )}
          <button onClick={() => navigate('chat')}
            className="w-full rounded-2xl py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'rgba(108,99,255,0.12)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.2)' }}>
            💬 {lang === 'gr' ? 'Κουβέντα' : 'Chat'}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  )
}
