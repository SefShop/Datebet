'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/gameInvites'
import { getCurrentMatch } from '@/lib/profiles'

export default function GameRoomScreen() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()
  const match = getCurrentMatch()
  const [myId, setMyId] = useState<string | null>(null)
  const [bothNames, setBothNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user?.id || null)
      if (session) {
        console.log('NAVIGATING TO GAME ROOM:')
        console.log('SESSION ID:', session.id)
        // Fetch both player names
        const { data } = await supabase.from('profiles').select('id, name')
          .in('id', [session.player_one_id, session.player_two_id])
        const map = new Map(data?.map(p => [p.id, p.name]) || [])
        setBothNames({
          one: map.get(session.player_one_id) || 'Player 1',
          two: map.get(session.player_two_id) || 'Player 2',
        })
      }
    }
    init()
  }, [session])

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#06060a' }}>
        <div className="text-center">
          <div className="text-[40px] mb-3">⚠️</div>
          <div className="text-[16px] font-bold text-white mb-2">
            {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'Could not start game session.'}
          </div>
          <button onClick={() => navigate('profile')}
            className="mt-4 rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff' }}>
            {lang === 'gr' ? 'Πίσω' : 'Back'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.08) 0%, transparent 60%), #06060a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          🎮 {lang === 'gr' ? 'Δωμάτιο Παιχνιδιού' : 'Game Room'}
        </h1>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-4 py-8 px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] mb-2"
            style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', boxShadow: '0 0 20px rgba(253,41,123,0.3)' }}>🎭</div>
          <div className="text-[13px] font-bold text-white">{bothNames.one}</div>
        </div>
        <div className="text-[24px] font-black" style={{ color: 'rgba(253,41,123,0.6)' }}>VS</div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] mb-2"
            style={{ background: 'linear-gradient(135deg,#6c63ff,#a855f7)', boxShadow: '0 0 20px rgba(108,99,255,0.3)' }}>🎭</div>
          <div className="text-[13px] font-bold text-white">{bothNames.two}</div>
        </div>
      </div>

      {/* Session info */}
      <div className="px-6 mb-4">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-between text-[12px] mb-1.5">
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{lang === 'gr' ? 'Τύπος' : 'Game type'}</span>
            <span className="font-bold" style={{ color: '#fd297b' }}>{session.game_type}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Session</span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{session.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Game board placeholder + choose game */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-[14px] text-white/50 mb-5 text-center">
          {lang === 'gr' ? 'Διάλεξε παιχνίδι για να ξεκινήσετε:' : 'Choose a game to start:'}
        </div>
        <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
          <button onClick={() => navigate('tictactoe')}
            className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff', boxShadow: '0 8px 24px rgba(253,41,123,0.3)' }}>
            ⭕ Tic Tac Toe
          </button>
          <button onClick={() => navigate('connect4')}
            className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
            🔴 Connect 4
          </button>
          <button onClick={() => navigate('chat')}
            className="w-full rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'rgba(108,99,255,0.12)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.2)' }}>
            💬 {lang === 'gr' ? 'Κουβέντα πρώτα' : 'Chat first'}
          </button>
        </div>
      </div>
    </div>
  )
}
