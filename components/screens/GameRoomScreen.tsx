'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setOpponentName } from '@/lib/gameInvites'

export default function GameRoomScreen() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()
  const [bothNames, setBothNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })

  useEffect(() => {
    if (!session) return
    const s0 = session
    console.log('ENTERING GAME ROOM:', s0.id)
    console.log('GAME TYPE:', s0.game_type)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('id, name').in('id', [s0.player_one_id, s0.player_two_id])
      const map = new Map(data?.map(p => [p.id, p.name]) || [])
      const oneName = map.get(s0.player_one_id) || 'Player 1'
      const twoName = map.get(s0.player_two_id) || 'Player 2'
      setBothNames({ one: oneName, two: twoName })
      const oppName = user?.id === s0.player_one_id ? twoName : oneName
      setOpponentName(oppName)
    }
    init()
  }, [session])

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}
        </div>
        <button onClick={() => navigate('profile')} className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω' : 'Back'}
        </button>
      </div>
    )
  }

  // Map game_type → screen
  const gameMap: Record<string, { screen: string; emoji: string; name: string }> = {
    tic_tac_toe: { screen: 'tictactoe', emoji: '⭕', name: 'Tic Tac Toe' },
    connect_4:   { screen: 'connect4',  emoji: '🔴', name: 'Connect 4' },
    mystery:     { screen: 'tictactoe', emoji: '⭕', name: 'Tic Tac Toe' }, // legacy fallback
  }
  const game = gameMap[session.game_type]

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.094) 0%, transparent 60%), #0a0a10' }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">🎮 {lang === 'gr' ? 'Δωμάτιο Παιχνιδιού' : 'Game Room'}</h1>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-4 py-8 px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] mb-2" style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', boxShadow: '0 0 20px rgba(253,41,123,0.354)' }}>🎭</div>
          <div className="text-[13px] font-bold text-white">{bothNames.one}</div>
          <div className="text-[10px]" style={{ color: '#ff3384' }}>X</div>
        </div>
        <div className="text-[24px] font-black" style={{ color: 'rgba(253,41,123,0.708)' }}>VS</div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] mb-2" style={{ background: 'linear-gradient(135deg,#7c72ff,#a855f7)', boxShadow: '0 0 20px rgba(108,99,255,0.354)' }}>🎭</div>
          <div className="text-[13px] font-bold text-white">{bothNames.two}</div>
          <div className="text-[10px]" style={{ color: '#7c72ff' }}>O</div>
        </div>
      </div>

      {/* Game info */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.083)' }}>
          <div className="flex justify-between text-[12px]">
            <span style={{ color: 'rgba(255,255,255,0.472)' }}>{lang === 'gr' ? 'Παιχνίδι' : 'Game'}</span>
            <span className="font-bold" style={{ color: '#ff3384' }}>{game ? `${game.emoji} ${game.name}` : session.game_type}</span>
          </div>
        </div>
      </div>

      {/* Start / Unsupported */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {game ? (
          <button onClick={() => navigate(game.screen as any)}
            className="w-full max-w-[300px] rounded-2xl py-5 text-[17px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 30px rgba(253,41,123,0.413)' }}>
            {game.emoji} {lang === 'gr' ? 'Ξεκίνα' : 'Start'} {game.name}
          </button>
        ) : (
          <div className="text-center">
            <div className="text-[40px] mb-3">❓</div>
            <div className="text-[15px] font-bold text-white">{lang === 'gr' ? 'Μη υποστηριζόμενο παιχνίδι' : 'Game type not supported'}</div>
          </div>
        )}
        <button onClick={() => navigate('chat')}
          className="w-full max-w-[300px] mt-3 rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background: 'rgba(108,99,255,0.142)', color: '#b79cfc', border: '1px solid rgba(108,99,255,0.236)' }}>
          💬 {lang === 'gr' ? 'Κουβέντα πρώτα' : 'Chat first'}
        </button>
      </div>
    </div>
  )
}
