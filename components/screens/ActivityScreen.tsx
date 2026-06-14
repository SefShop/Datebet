'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getIncomingInvites, getOutgoingInvites, respondInvite, createGameSession, setCurrentSession, GameInvite } from '@/lib/gameInvites'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

export default function ActivityScreen() {
  const { navigate, lang } = useApp()
  const [incoming, setIncoming] = useState<GameInvite[]>([])
  const [outgoing, setOutgoing] = useState<GameInvite[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'in'|'out'>('in')

  useEffect(() => {
    load()
    // Realtime subscription for new invites
    let channel: any = null
    async function sub() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      channel = supabase
        .channel(`invites-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites' }, (payload: any) => {
          const inv = payload.new
          if (inv && inv.receiver_id === user.id) {
            console.log('NEW INCOMING INVITE LIVE:', inv.id)
            load()
          }
          if (inv && inv.sender_id === user.id) {
            console.log('INVITE STATUS CHANGE:', inv.status)
            load()
          }
        })
        .subscribe((status: string) => { if (status === 'SUBSCRIBED') console.log('INVITE SUBSCRIPTION ACTIVE:', user.id) })
    }
    sub()

    // Refetch on tab focus / return from background
    function onVisible() { if (document.visibilityState === 'visible') { console.log('VISIBILITY: refetch'); load() } }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (channel) supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  async function load() {
    setLoading(true)
    const [inc, out] = await Promise.all([getIncomingInvites(), getOutgoingInvites()])
    console.log('PENDING INVITES UPDATED:', inc.length, 'incoming')
    setIncoming(inc); setOutgoing(out); setLoading(false)
  }

  async function respond(c: GameInvite, accept: boolean) {
    console.log('ACCEPTING INVITE:', c.id)
    const { ok } = await respondInvite(c.id, accept)
    if (!ok) return
    setIncoming(prev => prev.filter(x => x.id !== c.id))  // remove from pending
    if (accept) {
      // Set the sender as current match
      const profile: UserProfile = {
        id: c.sender_id, name: c.sender_name || 'Player', age: 0,
        photo: c.sender_photo || '', gradient: 'linear-gradient(135deg,#fd297b,#ff655b)',
        location: { en: '', gr: '' }, online: true, interests: [], bio: { en: '', gr: '' },
      }
      setCurrentMatch(profile)
      // Create shared game session
      const { session, error } = await createGameSession(c)
      if (error || !session) {
        alert(lang === 'gr' ? 'Δεν μπόρεσε να ξεκινήσει το παιχνίδι.' : 'Could not start game session.')
        return
      }
      setCurrentSession(session)
      navigate('game_room')
    } else {
      setIncoming(prev => prev.filter(x => x.id !== c.id))
    }
  }

  function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return lang === 'gr' ? 'τώρα' : 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  const t = {
    title:    lang === 'gr' ? 'Προκλήσεις' : 'Challenges',
    incoming: lang === 'gr' ? 'Εισερχόμενες' : 'Incoming',
    outgoing: lang === 'gr' ? 'Απεσταλμένες' : 'Sent',
    accept:   lang === 'gr' ? 'Αποδοχή' : 'Accept',
    decline:  lang === 'gr' ? 'Όχι' : 'Decline',
    empty:    lang === 'gr' ? 'Δεν υπάρχουν προκλήσεις ακόμα.' : 'No challenges yet.',
    emptySub: lang === 'gr' ? 'Πρόκληνε κάποιον να παίξει!' : 'Challenge someone to play!',
    pending:  lang === 'gr' ? 'αναμονή...' : 'pending...',
    wants:    lang === 'gr' ? 'θέλει να παίξει μαζί σου' : 'wants to play with you',
    sentTo:   lang === 'gr' ? 'πρόκληση σταλμένη' : 'challenge sent',
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#06060a' }}>

      <div className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">←</button>
        <h1 className="text-[18px] font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          ⚔️ {t.title}
        </h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Tabs */}
      <div className="flex mx-5 mt-3 mb-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['in', 'out'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className="flex-1 py-2.5 text-[13px] font-bold transition-all cursor-pointer relative"
            style={{ color: tab === tb ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            {tb === 'in' ? `${t.incoming}${incoming.length > 0 ? ` (${incoming.length})` : ''}` : `${t.outgoing}${outgoing.length > 0 ? ` (${outgoing.length})` : ''}`}
            {tab === tb && <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#fd297b,#c850c0)' }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>⚔️</div>
          </div>
        )}

        {!loading && tab === 'in' && incoming.length === 0 && tab === 'in' && (
          <div className="text-center px-8 py-16">
            <div className="text-[40px] mb-3">⚔️</div>
            <div className="text-[15px] font-semibold text-white/50 mb-1">{t.empty}</div>
            <div className="text-[13px] text-white/30">{t.emptySub}</div>
          </div>
        )}

        {!loading && tab === 'out' && outgoing.length === 0 && (
          <div className="text-center px-8 py-16">
            <div className="text-[40px] mb-3">📤</div>
            <div className="text-[15px] font-semibold text-white/50">{t.empty}</div>
          </div>
        )}

        {/* Incoming */}
        {tab === 'in' && incoming.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', animation: `fadeSlide 0.3s ${i * 50}ms ease both` }}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(253,41,123,0.3)' }}>
              {c.sender_photo ? (
                <img src={c.sender_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px]"
                  style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)' }}>👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-white">{c.sender_name}</div>
              <div className="text-[12px] text-white/40">{t.wants} · {timeAgo(c.created_at)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => respond(c, true)}
                className="rounded-full px-4 py-2 text-[12px] font-bold active:scale-95 cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff' }}>
                {t.accept}
              </button>
              <button onClick={() => respond(c, false)}
                className="rounded-full px-3 py-2 text-[12px] font-medium active:scale-95 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                {t.decline}
              </button>
            </div>
          </div>
        ))}

        {/* Outgoing */}
        {tab === 'out' && outgoing.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', animation: `fadeSlide 0.3s ${i * 50}ms ease both` }}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(108,99,255,0.3)' }}>
              {c.receiver_name ? (
                <img src={c.receiver_name} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px]"
                  style={{ background: 'linear-gradient(135deg,#6c63ff,#a855f7)' }}>👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-white">{c.receiver_name}</div>
              <div className="text-[12px] text-white/40">{t.sentTo} · {timeAgo(c.created_at)}</div>
            </div>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(253,41,123,0.1)', color: 'rgba(253,41,123,0.6)' }}>
              {t.pending}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      `}</style>
    </div>
  )
}
