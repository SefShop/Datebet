'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getIncomingInvites, getOutgoingInvites, respondInvite, createGameSession,
         loadSessionByInvite, setCurrentSession, setOpponentName, gameScreenFor, GameInvite } from '@/lib/gameInvites'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

// Human-readable label for an invite's game_type
function gameLabel(gameType: string): { emoji: string; name: string } {
  if (gameType === 'connect_4') return { emoji: '🔴', name: 'Connect 4' }
  if (gameType === 'mystery_choice') return { emoji: '🎭', name: 'Mystery Choice' }
  return { emoji: '⭕', name: 'Tic Tac Toe' }
}

export default function ActivityScreen() {
  const { navigate, lang } = useApp()
  const [incoming, setIncoming] = useState<GameInvite[]>([])
  const [outgoing, setOutgoing] = useState<GameInvite[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'in'|'out'>('in')
  const [myId, setMyId]         = useState<string | null>(null)

  useEffect(() => {
    load()
    let channel: any = null
    async function sub() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)
      channel = supabase
        .channel(`challenges-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites' }, (payload: any) => {
          const inv = payload.new
          if (inv && inv.receiver_id === user.id) {
            console.log('GAME INVITE INSERT RECEIVED:', inv.id)
            load()
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invites' }, (payload: any) => {
          const inv = payload.new
          if (inv && (inv.receiver_id === user.id || inv.sender_id === user.id)) {
            console.log('GAME INVITE UPDATE RECEIVED:', inv.status)
            load()
          }
        })
        .subscribe((status: string) => { if (status === 'SUBSCRIBED') console.log('GAME INVITE REALTIME SUBSCRIBED:', user.id) })
    }
    sub()
    function onVisible() { if (document.visibilityState === 'visible') { console.log('INVITES REFRESHED: visibility'); load() } }
    document.addEventListener('visibilitychange', onVisible)

    // Polling (reliable, every 3s)
    console.log('INVITE POLLING STARTED:')
    const poll = setInterval(() => load(), 3000)

    return () => {
      if (channel) supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(poll)
      console.log('INVITE POLLING STOPPED:')
    }
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    setMyId(user?.id || null)
    const [inc, out] = await Promise.all([getIncomingInvites(), getOutgoingInvites()])
    const pending = inc.filter(i => i.status === 'pending')
    console.log('INVITE POLL RESULT:', inc.length, 'total')
    console.log('PENDING INVITES COUNT:', pending.length)
    console.log('INVITES STATE UPDATED FROM POLL:', pending.length, 'pending')
    setIncoming(inc); setOutgoing(out); setLoading(false)
  }

  async function respond(c: GameInvite, accept: boolean) {
    if (accept) console.log('B ACCEPT CLICKED:', c.id)
    if (accept) {
      // Create (or find the deterministic existing) session BEFORE marking
      // the invite accepted. Previously this order was reversed, so the
      // sender's realtime listener could see status='accepted' before any
      // session row existed yet — the exact race behind the "only one user
      // enters the game" bug on a pair's first invite.
      console.log('ACCEPT FLOW: createGameSession start', c.id, 'game_type:', c.game_type)
      console.log('CREATING SESSION', c.id)
      const { session, error } = await createGameSession(c)
      console.log('ACCEPT FLOW: createGameSession result', { sessionId: session?.id, sessionGameType: session?.game_type, error })
      if (error || !session) { alert(lang === 'gr' ? 'Δεν μπόρεσε να ξεκινήσει το Tic Tac Toe.' : 'Could not start Tic Tac Toe.'); load(); return }
      console.log('TICTACTOE SESSION CREATED:', session.id)
      console.log('SESSION CREATED', session.id)

      console.log('ACCEPT FLOW: respondInvite start', c.id, 'game_type:', c.game_type)
      const { ok } = await respondInvite(c.id, accept)
      console.log('ACCEPT FLOW: respondInvite result', ok)
      if (!ok) return
      console.log('INVITE ACCEPTED', c.id, 'game_type:', c.game_type)
      if (c.game_type === 'mystery_choice') console.log('MYSTERY CHOICE INVITE ACCEPTED:', c.id)
      await enterGame(c)
    } else {
      console.log('ACCEPT FLOW: respondInvite start', c.id, 'game_type:', c.game_type)
      const { ok } = await respondInvite(c.id, accept)
      console.log('ACCEPT FLOW: respondInvite result', ok)
      if (!ok) return
      load()
    }
  }

  async function enterGame(c: GameInvite) {
    console.log('ROUTING: enterGame start', c.id, 'game_type:', c.game_type)
    let session = await loadSessionByInvite(c.id)
    if (!session) {
      const created = await createGameSession(c)
      session = created.session || null
    }
    if (!session) { alert(lang === 'gr' ? 'Δεν μπόρεσε να ξεκινήσει το Tic Tac Toe.' : 'Could not start Tic Tac Toe.'); return }
    console.log('SAME SESSION ID:', session.id)
    console.log('ROUTING: session loaded', { id: session.id, game_type: session.game_type })
    setCurrentSession(session)

    const oppId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
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
    }
    const screen = gameScreenFor(session.game_type)
    console.log('NAVIGATE TO TICTACTOE:', screen)
    if (session.game_type === 'mystery_choice') console.log('OPENING MYSTERY CHOICE:', screen)
    navigate(screen as any)
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
    empty:    lang === 'gr' ? 'Τίποτα εδώ ακόμα.' : 'Nothing here yet.',
    wants:    lang === 'gr' ? 'θέλει να παίξει' : 'wants to play',
    enter:    lang === 'gr' ? 'Είσοδος' : 'Enter Game Room',
    waiting:  lang === 'gr' ? 'Αναμονή παίκτη...' : 'Waiting for player...',
    accepted: lang === 'gr' ? 'Αποδέχτηκε' : 'Accepted',
    declined: lang === 'gr' ? 'Απέρριψε' : 'Declined',
  }

  const pendingCount = incoming.filter(i => i.status === 'pending').length

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a10' }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[18px] font-extrabold text-white">⚔️ {t.title}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Tabs */}
      <div className="flex mx-5 mt-3 mb-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.047)', border: '1px solid rgba(255,255,255,0.071)' }}>
        {(['in', 'out'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className="flex-1 py-2.5 text-[13px] font-bold transition-all cursor-pointer relative"
            style={{ color: tab === tb ? '#fff' : 'rgba(255,255,255,0.413)' }}>
            {tb === 'in' ? `${t.incoming}${pendingCount > 0 ? ` (${pendingCount})` : ''}` : t.outgoing}
            {tab === tb && <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#ff3384,#d84dd8)' }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {loading && <div className="flex justify-center py-16"><div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>⚔️</div></div>}

        {!loading && tab === 'in' && incoming.length === 0 && (
          <div className="text-center px-8 py-16"><div className="text-[40px] mb-3">⚔️</div><div className="text-[15px] text-white/50">{t.empty}</div></div>
        )}
        {!loading && tab === 'out' && outgoing.length === 0 && (
          <div className="text-center px-8 py-16"><div className="text-[40px] mb-3">📤</div><div className="text-[15px] text-white/50">{t.empty}</div></div>
        )}

        {/* INCOMING */}
        {tab === 'in' && incoming.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.047)' }}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(253,41,123,0.354)' }}>
              {c.sender_photo ? <img src={c.sender_photo} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[20px]" style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)' }}>👤</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-white">{c.sender_name}</div>
              <div className="text-[12px] text-white/40">{t.wants} · {timeAgo(c.created_at)}</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(253,41,123,0.75)' }}>
                {gameLabel(c.game_type).emoji} {gameLabel(c.game_type).name}
              </div>
            </div>
            {c.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => respond(c, true)} className="rounded-full px-4 py-2 text-[12px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', color: '#fff' }}>{t.accept}</button>
                <button onClick={() => respond(c, false)} className="rounded-full px-3 py-2 text-[12px] font-medium active:scale-95 cursor-pointer" style={{ background: 'rgba(255,255,255,0.059)', color: 'rgba(255,255,255,0.472)' }}>{t.decline}</button>
              </div>
            )}
            {c.status === 'accepted' && (
              <button onClick={() => enterGame(c)} className="rounded-full px-4 py-2 text-[12px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#0a0a10' }}>{t.enter}</button>
            )}
            {c.status === 'declined' && <span className="text-[12px] px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.354)' }}>{t.declined}</span>}
          </div>
        ))}

        {/* OUTGOING */}
        {tab === 'out' && outgoing.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.047)' }}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(108,99,255,0.354)' }}>
              <div className="w-full h-full flex items-center justify-center text-[20px]" style={{ background: 'linear-gradient(135deg,#7c72ff,#a855f7)' }}>👤</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-white">{c.receiver_name}</div>
              <div className="text-[12px] text-white/40">{timeAgo(c.created_at)}</div>
            </div>
            {c.status === 'pending' && <span className="text-[11px] font-medium px-3 py-1.5 rounded-full" style={{ background: 'rgba(253,41,123,0.118)', color: 'rgba(253,41,123,0.708)' }}>{t.waiting}</span>}
            {c.status === 'accepted' && (
              <button onClick={() => enterGame(c)} className="rounded-full px-4 py-2 text-[12px] font-bold active:scale-95 cursor-pointer" style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#0a0a10' }}>{t.enter}</button>
            )}
            {c.status === 'declined' && <span className="text-[12px] px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.047)', color: 'rgba(255,255,255,0.354)' }}>{t.declined}</span>}
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  )
}
