'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/gameInvites'

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

interface GameState { board: string[]; currentTurn: string; winner: string | null; status: string; moves: number }

export default function Connect4Screen() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()
  const [state, setState] = useState<GameState | null>(null)
  const [myId, setMyId]   = useState<string | null>(null)
  const [names, setNames] = useState<{ one: string; two: string }>({ one: 'P1', two: 'P2' })
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const myColor = session && myId === session.player_one_id ? 'R' : 'Y'

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const s0 = session
    console.log('CONNECT4 SESSION:', s0.id)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setMyId(user.id)
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [s0.player_one_id, s0.player_two_id])
      const nm = new Map(profs?.map(p => [p.id, p.name]) || [])
      setNames({ one: nm.get(s0.player_one_id) || 'P1', two: nm.get(s0.player_two_id) || 'P2' })

      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', s0.id).maybeSingle()
      let gs: GameState
      if (sess?.state && sess.state.board && sess.state.board.length === 42) {
        gs = sess.state as GameState
        if (!gs.currentTurn) gs.currentTurn = s0.player_one_id
      } else {
        gs = { board: Array(42).fill(''), currentTurn: s0.player_one_id, winner: null, status: 'active', moves: 0 }
        await supabase.from('game_sessions').update({ state: gs }).eq('id', s0.id)
      }
      setState(gs); setLoading(false)

      channelRef.current = supabase
        .channel(`c4-${s0.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${s0.id}` },
          (payload: any) => {
            const ns = payload.new?.state
            if (ns && ns.board) { console.log('REALTIME GAME UPDATE:', ns.moves); setState(ns) }
          })
        .subscribe()
    }
    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [session])

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
    setState(newState)
    await supabase.from('game_sessions').update({ state: newState }).eq('id', session.id)
    console.log('SESSION UPDATED:', session.id)
  }

  async function rematch() {
    if (!session) return
    const gs: GameState = { board: Array(42).fill(''), currentTurn: session.player_one_id, winner: null, status: 'active', moves: 0 }
    setState(gs)
    await supabase.from('game_sessions').update({ state: gs }).eq('id', session.id)
  }

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#06060a' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">{lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}</div>
        <button onClick={() => navigate('profile')} className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff' }}>{lang === 'gr' ? 'Πίσω' : 'Back'}</button>
      </div>
    )
  }
  if (loading || !state) return <div className="flex items-center justify-center h-full" style={{ background: '#06060a' }}><div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>🔴</div></div>

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
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.08) 0%, transparent 55%), #06060a' }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('game_room')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">🔴 Connect 4</h1>
      </div>

      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center"><div className="text-[13px] font-bold" style={{ color: myColor === 'R' ? '#ef4444' : '#fbbf24' }}>{myName}</div><div className="text-[10px] text-white/40">{lang === 'gr' ? 'εσύ' : 'you'}</div></div>
        <div className="text-[18px] font-black text-white/30">VS</div>
        <div className="text-center"><div className="text-[13px] font-bold" style={{ color: myColor === 'R' ? '#fbbf24' : '#ef4444' }}>{oppName}</div><div className="text-[10px] text-white/40">{lang === 'gr' ? 'αντίπαλος' : 'opponent'}</div></div>
      </div>

      <div className="text-center mb-3">
        <span className="text-[14px] font-bold px-4 py-2 rounded-full" style={{ background: isMyTurn ? 'rgba(253,41,123,0.12)' : 'rgba(255,255,255,0.04)', color: isMyTurn ? '#fd297b' : 'rgba(255,255,255,0.6)' }}>{statusMsg}</span>
      </div>

      {/* Board */}
      <div className="flex items-center justify-center px-4">
        <div className="rounded-2xl p-2" style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)' }}>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: COLS }).map((_, col) => (
              <button key={col} onClick={() => drop(col)} disabled={!isMyTurn} className="flex flex-col gap-1.5" style={{ cursor: isMyTurn ? 'pointer' : 'default' }}>
                {Array.from({ length: ROWS }).map((_, row) => {
                  const cell = state.board[row * COLS + col]
                  return <div key={row} className="rounded-full" style={{ width: 36, height: 36,
                    background: cell === 'R' ? 'radial-gradient(circle at 35% 35%, #ff6b6b, #ef4444)'
                              : cell === 'Y' ? 'radial-gradient(circle at 35% 35%, #fde047, #fbbf24)'
                              : 'rgba(6,6,10,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)' }} />
                })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state.status === 'finished' && (
        <div className="px-6 mt-5 flex flex-col gap-2.5">
          <button onClick={rematch} className="w-full rounded-2xl py-3.5 text-[15px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff' }}>{lang === 'gr' ? 'Ρεβάνς' : 'Rematch'}</button>
          <button onClick={() => navigate('chat')} className="w-full rounded-2xl py-3 text-[14px] font-bold active:scale-95 cursor-pointer" style={{ background: 'rgba(108,99,255,0.12)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.2)' }}>💬 {lang === 'gr' ? 'Κουβέντα' : 'Chat'}</button>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  )
}
