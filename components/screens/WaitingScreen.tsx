'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getPendingInvite, loadSessionByInvite, createGameSession,
         setCurrentSession, setOpponentName, GameInvite } from '@/lib/gameInvites'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

const GAME_NAMES: Record<string, string> = { tic_tac_toe: '⭕ Tic Tac Toe', connect_4: '🔴 Connect 4', mystery: '🎮 Game' }

export default function WaitingScreen() {
  const { navigate, lang } = useApp()
  const pending = getPendingInvite()
  const [status, setStatus] = useState<'waiting'|'declined'>('waiting')
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!pending) { navigate('profile'); return }
    console.log('WAITING SCREEN OPENED:', pending.id)

    channelRef.current = supabase
      .channel(`waiting-${pending.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_invites', filter: `id=eq.${pending.id}`,
      }, async (payload: any) => {
        const inv = payload.new as GameInvite
        console.log('INVITE STATUS UPDATED:', inv.status)
        if (inv.status === 'accepted') {
          await enterRoom(inv)
        } else if (inv.status === 'declined') {
          console.log('DECLINED:', inv.id)
          setStatus('declined')
        }
      })
      .subscribe()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [pending])

  async function enterRoom(inv: GameInvite) {
    console.log('ACCEPTED - ENTERING GAME ROOM:', inv.id)
    let session = await loadSessionByInvite(inv.id)
    if (!session) {
      const created = await createGameSession(inv)
      session = created.session || null
    }
    if (!session) { console.error('No session'); return }
    console.log('SESSION ID:', session.id)
    setCurrentSession(session)

    const { data: { user } } = await supabase.auth.getUser()
    const oppId = user?.id === session.player_one_id ? session.player_two_id : session.player_one_id
    const { data: opp } = await supabase.from('profiles').select('*').eq('id', oppId).maybeSingle()
    if (opp) {
      const profile: UserProfile = {
        id: opp.id, name: opp.name || 'Player', age: opp.age || 0,
        photo: opp.photo || '', gradient: 'linear-gradient(135deg,#fd297b,#ff655b)',
        location: { en: opp.location || '', gr: opp.location || '' },
        online: true, interests: [], bio: { en: opp.bio || '', gr: opp.bio || '' },
      }
      setCurrentMatch(profile)
      setOpponentName(opp.name || 'Player')
    }
    navigate('game_room')
  }

  async function cancelInvite() {
    if (pending) {
      await supabase.from('game_invites').update({ status: 'declined' }).eq('id', pending.id)
    }
    navigate('profile')
  }

  if (!pending) return null

  return (
    <div className="flex flex-col h-full items-center justify-center px-8"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(253,41,123,0.1) 0%, transparent 60%), #06060a' }}>

      {status === 'waiting' ? (
        <>
          {/* Pulsing icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(253,41,123,0.3) 0%, transparent 70%)', filter: 'blur(20px)', animation: 'waitGlow 2s ease-in-out infinite' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-[44px]"
              style={{ background: 'linear-gradient(135deg, rgba(253,41,123,0.15), rgba(108,99,255,0.1))', border: '1px solid rgba(253,41,123,0.25)', animation: 'waitPulse 2s ease-in-out infinite' }}>
              🎮
            </div>
          </div>

          <h1 className="text-[20px] font-extrabold text-white text-center mb-2" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {lang === 'gr' ? 'Περιμένουμε τον παίκτη...' : 'Waiting for player...'}
          </h1>
          <p className="text-[14px] text-center mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {lang === 'gr' ? 'Πρόσκληση προς' : 'Invited'} <span style={{ color: '#fd297b', fontWeight: 700 }}>{pending.receiverName}</span>
          </p>
          <p className="text-[13px] mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {GAME_NAMES[pending.gameType] || pending.gameType}
          </p>

          {/* Animated dots */}
          <div className="flex gap-2 mb-10">
            {[0,1,2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: '#fd297b', animation: `dotBounce 1.4s ${i*0.2}s ease-in-out infinite` }} />
            ))}
          </div>

          <button onClick={cancelInvite}
            className="rounded-full px-6 py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {lang === 'gr' ? 'Ακύρωση πρόσκλησης' : 'Cancel Invite'}
          </button>
        </>
      ) : (
        <>
          <div className="text-[48px] mb-4">😕</div>
          <h1 className="text-[20px] font-extrabold text-white mb-2">
            {lang === 'gr' ? 'Η πρόσκληση απορρίφθηκε' : 'Invite declined'}
          </h1>
          <p className="text-[14px] text-center mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {pending.receiverName} {lang === 'gr' ? 'δεν μπορεί τώρα.' : "can't play right now."}
          </p>
          <button onClick={() => navigate('profile')}
            className="rounded-full px-6 py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff' }}>
            {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
          </button>
        </>
      )}

      <style>{`
        @keyframes waitPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes waitGlow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes dotBounce { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-8px);opacity:1} }
      `}</style>
    </div>
  )
}
