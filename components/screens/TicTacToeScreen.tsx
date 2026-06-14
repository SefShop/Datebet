'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/gameInvites'

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
      if (sess?.state && sess.state.board) {
        gs = sess.state as GameState
        console.log('TICTACTOE: loaded existing state')
      } else {
        gs = {
          board: ['','','','','','','','',''],
          currentTurn: sess0.player_one_id,
          winner: null, status: 'active', moves: 0,
        }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', sess0.id)
        console.log('TICTACTOE: initialized new state')
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
            console.log('REALTIME GAME UPDATE:', newState.moves, 'moves')
            setState(newState)
          }
        })
        .subscribe()
    }

    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [session])

  async function play(i: number) {
    if (!state || !session || !myId) return
    if (state.status === 'finished') return
    if (state.currentTurn !== myId) { console.log('Not your turn'); return }
    if (state.board[i] !== '') return

    const board = [...state.board]
    board[i] = mySymbol

    const win = checkWinner(board)
    const moves = state.moves + 1
    let winner: string | null = null
    let status = 'active'
    let currentTurn = myId === session.player_one_id ? session.player_two_id : session.player_one_id

    if (win) {
      winner = myId
      status = 'finished'
      console.log('WINNER:', myId)
    } else if (moves >= 9) {
      winner = 'draw'
      status = 'finished'
      console.log('WINNER: draw')
    }

    const newState: GameState = { board, currentTurn, winner, status, moves }
    setState(newState) // optimistic
    console.log('MOVE SENT:', i, mySymbol)

    const { error: e } = await supabase.from('game_sessions').update({ state: newState }).eq('id', session.id)
    if (e) console.error('SESSION UPDATE error:', e)
    else console.log('SESSION UPDATED:', session.id)
  }

  async function rematch() {
    if (!session) return
    const gs: GameState = {
      board: ['','','','','','','','',''],
      currentTurn: session.player_one_id,
      winner: null, status: 'active', moves: 0,
    }
    setState(gs)
    await supabase.from('game_sessions').update({ state: gs }).eq('id', session.id)
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
        <div className="grid grid-cols-3 gap-2" style={{ width: 300, height: 300 }}>
          {state.board.map((cell, i) => {
            const clickable = isMyTurn && cell === ''
            return (
              <button key={i} onClick={() => play(i)} disabled={!clickable}
                className="rounded-2xl flex items-center justify-center text-[40px] font-black transition-all"
                style={{
                  background: cell ? 'rgba(255,255,255,0.04)' : clickable ? 'rgba(253,41,123,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${clickable ? 'rgba(253,41,123,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  color: cell === 'X' ? '#fd297b' : '#6c63ff',
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
          <button onClick={rematch}
            className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff' }}>
            {lang === 'gr' ? 'Ρεβάνς' : 'Rematch'}
          </button>
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
