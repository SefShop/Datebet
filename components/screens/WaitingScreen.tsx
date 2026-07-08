'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getPendingInvite, loadSessionByInvite, createGameSession,
         setCurrentSession, setOpponentName, gameScreenFor, GameInvite } from '@/lib/gameInvites'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

const GAME_NAMES: Record<string, string> = { tic_tac_toe: '⭕ Tic Tac Toe', connect_4: '🔴 Connect 4', mystery: '🎮 Game' }

export default function WaitingScreen() {
  const { navigate, lang } = useApp()
  const pending = getPendingInvite()
  const [status, setStatus] = useState<'waiting'|'declined'>('waiting')
  const channelRef = useRef<any>(null)

  useEffect(() => {
    console.log('WAITING SCREEN DATA:', pending)
    if (!pending) { console.log('WAITING SCREEN ERROR: no pending invite'); return }
    console.log('WAITING FOR INVITE ACCEPT:', pending.id)

    channelRef.current = supabase
      .channel(`waiting-${pending.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_invites', filter: `id=eq.${pending.id}`,
      }, async (payload: any) => {
        const inv = payload.new as GameInvite
        console.log('A INVITE STATUS UPDATE:', inv.status)
        if (inv.status === 'accepted') {
          console.log('INVITE ACCEPTED:', inv.id)
          await enterRoom(inv)
        } else if (inv.status === 'declined') {
          console.log('DECLINED:', inv.id)
          setStatus('declined')
        }
      })
      .subscribe()

    // Poll fallback — check THIS invite's status every 2s (realtime may miss)
    const poll = setInterval(async () => {
      const { data } = await supabase.from('game_invites').select('*').eq('id', pending.id).maybeSingle()
      if (!data) return
      if (data.status === 'accepted') {
        console.log('INVITE ACCEPTED (poll):', data.id)
        clearInterval(poll)
        await enterRoom(data as GameInvite)
      } else if (data.status === 'declined') {
        clearInterval(poll)
        setStatus('declined')
      }
    }, 2000)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      clearInterval(poll)
    }
  }, [pending])

  async function enterRoom(inv: GameInvite) {
    console.log('PLAY AGAIN SENDER:', inv.sender_id)
    console.log('PLAY AGAIN RECEIVER:', inv.receiver_id)

    // Sender waits for the receiver's session (retry, do NOT create a duplicate)
    let session = await loadSessionByInvite(inv.id)
    let tries = 0
    while (!session && tries < 5) {
      await new Promise(r => setTimeout(r, 500))
      session = await loadSessionByInvite(inv.id)
      tries++
    }
    // Last resort: create it (receiver may have failed)
    if (!session) {
      const created = await createGameSession(inv)
      session = created.session || null
    }
    if (!session) { console.error('Could not start Tic Tac Toe.'); setStatus('declined'); return }
    console.log('ROUTING: session loaded (sender)', { id: session.id, game_type: session.game_type })
    console.log('NEW SESSION PLAYER_ONE:', session.player_one_id)
    console.log('NEW SESSION PLAYER_TWO:', session.player_two_id)
    console.log('NEW SESSION CURRENT TURN:', session.state?.currentTurn)
    setCurrentSession(session)

    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.id === session.player_one_id ? 'player_one (X)' : 'player_two (O)'
    console.log('CURRENT USER ROLE:', role)
    const oppId = user?.id === session.player_one_id ? session.player_two_id : session.player_one_id
    const { data: opp } = await supabase.from('profiles').select('*').eq('id', oppId).maybeSingle()
    if (opp) {
      const profile: UserProfile = {
        id: opp.id, name: opp.name || 'Player', age: opp.age || 0,
        photo: opp.photo || '', gradient: 'linear-gradient(135deg,#ff3384,#ff7a6e)',
        location: { en: opp.location || '', gr: opp.location || '' },
        online: true, interests: [], bio: { en: opp.bio || '', gr: opp.bio || '' },
      }
      setCurrentMatch(profile)
      setOpponentName(opp.name || 'Player')
      console.log('OPPONENT RESOLVED FROM NEW SESSION:', opp.name)
    }
    const screen = gameScreenFor(session.game_type)
    console.log('NAVIGATE TO TICTACTOE:', screen)
    if (session.game_type === 'mystery_choice') console.log('OPENING MYSTERY CHOICE:', screen)
    navigate(screen as any)
  }

  async function cancelInvite() {
    if (pending) {
      await supabase.from('game_invites').update({ status: 'declined' }).eq('id', pending.id)
    }
    navigate('profile')
  }

  if (!pending) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Λείπει η πρόσκληση.' : 'Missing invite.'}
        </div>
        <button onClick={() => navigate('profile')} className="rounded-full px-6 py-3 text-[14px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
        </button>
      </div>
    )
  }

  // Guard: missing fields
  if (!pending.id || !pending.receiverName || !pending.gameType) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Ελλιπή στοιχεία πρόσκλησης.' : 'Missing invite data.'}
        </div>
        <button onClick={() => navigate('profile')} className="rounded-full px-6 py-3 text-[14px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full items-center justify-center px-8"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(253,41,123,0.118) 0%, transparent 60%), #0a0a10' }}>

      {status === 'waiting' ? (
        <>
          {/* Pulsing icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(253,41,123,0.354) 0%, transparent 70%)', filter: 'blur(20px)', animation: 'waitGlow 2s ease-in-out infinite' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-[44px]"
              style={{ background: 'linear-gradient(135deg, rgba(253,41,123,0.177), rgba(108,99,255,0.118))', border: '1px solid rgba(253,41,123,0.295)', animation: 'waitPulse 2s ease-in-out infinite' }}>
              🎮
            </div>
          </div>

          <h1 className="text-[20px] font-extrabold text-white text-center mb-2" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {lang === 'gr' ? 'Περιμένουμε τον παίκτη...' : 'Waiting for player...'}
          </h1>
          <p className="text-[14px] text-center mb-1" style={{ color: 'rgba(255,255,255,0.59)' }}>
            {lang === 'gr' ? 'Πρόσκληση προς' : 'Invited'} <span style={{ color: '#ff3384', fontWeight: 700 }}>{pending.receiverName}</span>
          </p>
          <p className="text-[13px] mb-10" style={{ color: 'rgba(255,255,255,0.413)' }}>
            {GAME_NAMES[pending.gameType] || pending.gameType}
          </p>

          {/* Animated dots */}
          <div className="flex gap-2 mb-10">
            {[0,1,2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff3384', animation: `dotBounce 1.4s ${i*0.2}s ease-in-out infinite` }} />
            ))}
          </div>

          <button onClick={cancelInvite}
            className="rounded-full px-6 py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.059)', color: 'rgba(255,255,255,0.59)', border: '1px solid rgba(255,255,255,0.118)' }}>
            {lang === 'gr' ? 'Ακύρωση πρόσκλησης' : 'Cancel Invite'}
          </button>
        </>
      ) : (
        <>
          <div className="text-[48px] mb-4">😕</div>
          <h1 className="text-[20px] font-extrabold text-white mb-2">
            {lang === 'gr' ? 'Η πρόσκληση απορρίφθηκε' : 'Invite declined'}
          </h1>
          <p className="text-[14px] text-center mb-8" style={{ color: 'rgba(255,255,255,0.59)' }}>
            {pending.receiverName} {lang === 'gr' ? 'δεν μπορεί τώρα.' : "can't play right now."}
          </p>
          <button onClick={() => navigate('profile')}
            className="rounded-full px-6 py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff' }}>
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
