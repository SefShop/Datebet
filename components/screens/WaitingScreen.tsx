'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getPendingInvite, subscribePendingInvite, markInviteReconciled, enterAcceptedGame, GameInvite } from '@/lib/gameInvites'

const GAME_NAMES: Record<string, string> = { tic_tac_toe: '⭕ Tic Tac Toe', connect_4: '🔴 Connect 4', mystery: '🎮 Game' }

export default function WaitingScreen() {
  const { navigate, lang } = useApp()
  // Reactive — was previously `const pending = getPendingInvite()`, only
  // re-read whenever this always-mounted-but-hidden screen happened to
  // re-render for some other reason. Now subscribed directly, so a new
  // Play Again invite is picked up the instant it's set, never leaving
  // this screen watching a stale invite id from a previous game.
  const [pending, setPendingState] = useState(() => getPendingInvite())
  useEffect(() => {
    const unsubscribe = subscribePendingInvite((p) => setPendingState(p))
    return unsubscribe
  }, [])
  const [status, setStatus] = useState<'waiting'|'declined'>('waiting')
  useEffect(() => { setStatus('waiting') }, [pending?.id])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    console.log('WAITING SCREEN DATA:', pending)
    if (!pending) { console.log('WAITING SCREEN ERROR: no pending invite'); return }
    console.log('WAITING FOR INVITE ACCEPT:', pending.id)

    let poll: ReturnType<typeof setInterval> | null = null

    channelRef.current = supabase
      .channel(`waiting-${pending.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_invites', filter: `id=eq.${pending.id}`,
      }, async (payload: any) => {
        const inv = payload.new as GameInvite
        console.log('A INVITE STATUS UPDATE:', inv.status)
        if (inv.status === 'accepted') {
          console.log('INVITE ACCEPTED:', inv.id)
          if (poll) { clearInterval(poll); poll = null }
          await enterRoom(inv)
        } else if (inv.status === 'declined') {
          console.log('DECLINED:', inv.id)
          if (poll) { clearInterval(poll); poll = null }
          setStatus('declined')
        }
      })
      .subscribe()

    // Poll fallback — check THIS invite's status every 2s (realtime may miss)
    poll = setInterval(async () => {
      const { data } = await supabase.from('game_invites').select('*').eq('id', pending.id).maybeSingle()
      if (!data) return
      if (data.status === 'accepted') {
        console.log('INVITE ACCEPTED (poll):', data.id)
        if (poll) { clearInterval(poll); poll = null }
        await enterRoom(data as GameInvite)
      } else if (data.status === 'declined') {
        if (poll) { clearInterval(poll); poll = null }
        setStatus('declined')
      }
    }, 2000)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (poll) clearInterval(poll)
    }
  }, [pending])

  async function enterRoom(inv: GameInvite) {
    const isTTT = inv.game_type === 'tic_tac_toe'
    if (isTTT) console.log('[TIC_TAC_TOE_ENTRY] sender realtime event received, invite id:', inv.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { console.error('WAITING: no authenticated user, cannot enter'); return }

    markInviteReconciled(inv.id)
    if (isTTT) console.log('[TIC_TAC_TOE_ENTRY] session creation started (sender), invite id:', inv.id)
    // enterAcceptedGame() calls setCurrentSession() internally — the
    // top-level session subscription (app/app/page.tsx) reacts to that and
    // performs navigation. No direct navigate() call needed here.
    const result = await enterAcceptedGame(inv, user.id)
    if (isTTT) console.log('[TIC_TAC_TOE_ENTRY] session creation result (sender):', result.ok, 'session id:', result.session?.id, 'skipped:', result.skipped, 'error:', result.error)
    if (result.skipped) {
      // Another concurrent call (realtime + poll both firing) is already
      // handling entry into this same game — do nothing, this is not a
      // failure and must never show the rejected screen.
      if (isTTT) console.log('[TIC_TAC_TOE_ENTRY] sender entry skipped — already being handled elsewhere')
      return
    }
    if (!result.ok) {
      console.error('WAITING: could not enter game:', result.error)
      if (isTTT) console.log('[TIC_TAC_TOE_ENTRY] sender entry failed, no navigation will occur. reason:', result.error)
      // Genuine failure to start the game — not the same as the receiver
      // declining. Log it, but do not show the "invite rejected" UI for a
      // technical failure; leave the user on the waiting state instead.
    } else if (isTTT) {
      console.log('[TIC_TAC_TOE_ENTRY] active session set (sender), session id:', result.session?.id, 'game type: tic_tac_toe, navigation requested to:', result.screen)
    }
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
