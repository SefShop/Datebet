'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, setOpponentName } from '@/lib/gameInvites'
import { fetchGamePlayerPhotoAccess } from '@/lib/gamePlayerPhoto'
import GamePlayerAvatar from '@/components/ui/GamePlayerAvatar'

export default function GameRoomScreen() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()
  const [bothNames, setBothNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [photoAccess, setPhotoAccess] = useState<{ photoUnlocked: boolean; myPhoto: string | null; opponentPhoto: string | null }>({ photoUnlocked: false, myPhoto: null, opponentPhoto: null })
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) { console.log('GAME ROOM MOUNT: no session'); return }
    const s0 = session
    console.log('GAME ROOM MOUNT: session present', { id: s0.id, game_type: s0.game_type })
    console.log('ENTERING GAME ROOM:', s0.id)
    console.log('GAME TYPE:', s0.game_type)
    console.log('GAME ROOM GAME TYPE:', s0.game_type)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user?.id ?? null)
      const { data } = await supabase.from('profiles').select('id, name').in('id', [s0.player_one_id, s0.player_two_id])
      const map = new Map(data?.map(p => [p.id, p.name]) || [])
      const oneName = map.get(s0.player_one_id) || 'Player 1'
      const twoName = map.get(s0.player_two_id) || 'Player 2'
      setBothNames({ one: oneName, two: twoName })
      const oppName = user?.id === s0.player_one_id ? twoName : oneName
      setOpponentName(oppName)

      // Shared avatar photo access — reuses the same pair-unlock source of
      // truth as Discover/Profile. Presentation-only.
      if (user?.id) {
        const oppId = user.id === s0.player_one_id ? s0.player_two_id : s0.player_one_id
        fetchGamePlayerPhotoAccess(user.id, oppId).then(setPhotoAccess)
      }
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
    mystery_choice: { screen: 'mystery_choice', emoji: '🎭', name: 'Mystery Choice' },
    mystery:     { screen: 'tictactoe', emoji: '⭕', name: 'Tic Tac Toe' }, // legacy fallback
  }
  const game = gameMap[session.game_type]

  return (
    <div className="flex flex-col h-full desktop-game-room-shell" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.094) 0%, transparent 60%), #0a0a10' }}>
      <div className="desktop-game-room-card flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">🎮 {lang === 'gr' ? 'Δωμάτιο Παιχνιδιού' : 'Game Room'}</h1>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-4 py-8 px-6">
        <div className="text-center">
          <GamePlayerAvatar
            userId={session?.player_one_id || ''}
            displayName={bothNames.one}
            photoUrl={myId === session?.player_one_id ? photoAccess.myPhoto : photoAccess.opponentPhoto}
            photoUnlocked={photoAccess.photoUnlocked}
            size={64}
            accentColor="#ff3384"
            accentColor2="#ff7a6e"
            isCurrentUser={myId === session?.player_one_id}
          />
          <div className="text-[13px] font-bold text-white mt-2">{bothNames.one}</div>
          <div className="text-[10px]" style={{ color: '#ff3384' }}>X</div>
        </div>
        <div className="text-[24px] font-black" style={{ color: 'rgba(253,41,123,0.708)' }}>VS</div>
        <div className="text-center">
          <GamePlayerAvatar
            userId={session?.player_two_id || ''}
            displayName={bothNames.two}
            photoUrl={myId === session?.player_two_id ? photoAccess.myPhoto : photoAccess.opponentPhoto}
            photoUnlocked={photoAccess.photoUnlocked}
            size={64}
            accentColor="#7c72ff"
            accentColor2="#a855f7"
            isCurrentUser={myId === session?.player_two_id}
          />
          <div className="text-[13px] font-bold text-white mt-2">{bothNames.two}</div>
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

      <style>{`
        /* Desktop only: this screen's "Start [game]" section uses flex-1 to
           vertically center itself, which made its size (and the button's
           position) shift with browser height. Below 1024px this is
           entirely untouched — same flex-1 behavior as before. */
        @media (min-width: 1024px) {
          .desktop-game-room-shell {
            height: auto !important;
            min-height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 40px 20px !important;
          }
          .desktop-game-room-card {
            width: 390px !important;
            height: 700px !important;
            flex: none !important;
            position: relative !important;
            overflow: hidden !important;
            border-radius: 32px !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 30px 90px rgba(0,0,0,0.5) !important;
          }
        }
      `}</style>
    </div>
  )
}
