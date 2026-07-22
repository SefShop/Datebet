'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { getMessagesState, subscribeMessages, refreshMessagesState } from '@/lib/messagesState'
import { supabase } from '@/lib/supabase'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'
import { setChatOrigin } from '@/lib/gameInvites'

interface Conversation {
  partnerId: string
  partnerName: string
  partnerPhoto: string
  partnerGradient: string
  lastMessage: string
  lastTime: string
  isUnread: boolean
  unreadCount: number
}

export default function InboxScreen() {
  const { navigate, lang } = useApp()
  const [convos, setConvos]   = useState<Conversation[]>([])
  const [lastRefresh, setLastRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    loadConversations()
    console.log('MESSAGES POLLING STARTED')
    refreshMessagesState()
    // Re-render when global store updates
    const unsub = subscribeMessages(() => { setLastRefresh(Date.now()); loadConversations(true) })
    const poll = setInterval(() => loadConversations(true), 3000)
    return () => { unsub(); clearInterval(poll); console.log('MESSAGES POLLING STOPPED') }
  }, [])

  async function loadConversations(silent = false) {
    if (!silent) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }

      // Fetch all messages involving this user
      const { data: msgs, error: e } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500)

      if (e) { console.error('INBOX error:', e); setError(e.message); setLoading(false); return }
      if (!msgs || msgs.length === 0) { setConvos([]); setLoading(false); return }

      // Group by partner
      const partnerMap = new Map<string, { lastMsg: any; isUnread: boolean; unreadCount: number }>()
      for (const m of msgs) {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
        const existing = partnerMap.get(partnerId)
        const isFromThem = m.sender_id !== user.id && !m.read_at
        if (!existing) {
          partnerMap.set(partnerId, {
            lastMsg: m,
            isUnread: m.sender_id !== user.id && !m.read_at,
            unreadCount: isFromThem ? 1 : 0,
          })
        } else {
          if (isFromThem) existing.unreadCount++
        }
      }

      // Fetch partner profiles
      const partnerIds = Array.from(partnerMap.keys())
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, photo, age, location')
        .in('id', partnerIds)

      const profileMap = new Map<string, any>()
      profiles?.forEach(p => profileMap.set(p.id, p))

      // Build conversation list
      const gradients = [
        'linear-gradient(135deg,#7c72ff,#a855f7)',
        'linear-gradient(135deg,#ff3384,#ff7a6e)',
        'linear-gradient(135deg,#38bdf8,#6366f1)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
      ]

      const list: Conversation[] = Array.from(partnerMap.entries()).map(([pid, data], i) => {
        const profile = profileMap.get(pid)
        return {
          partnerId: pid,
          partnerName: profile?.name || 'Player',
          partnerPhoto: profile?.photo || '',
          partnerGradient: gradients[i % gradients.length],
          lastMessage: data.lastMsg.text,
          lastTime: formatTime(data.lastMsg.created_at),
          isUnread: data.isUnread,
          unreadCount: data.unreadCount,
        }
      })

      console.log('INBOX:', list.length, 'conversations')
      console.log('MESSAGES POLL RESULT:', list.length, 'conversations')
      setConvos(list)
      console.log('CONVERSATIONS UPDATED:', list.length)
      setLoading(false)
    } catch (err: any) {
      console.error('INBOX catch:', err)
      setError(err.message); setLoading(false)
    }
  }

  function openChat(c: Conversation) {
    const profile: UserProfile = {
      id: c.partnerId, name: c.partnerName, age: 0,
      photo: c.partnerPhoto, gradient: c.partnerGradient,
      location: { en: '', gr: '' }, online: true, interests: [],
      bio: { en: '', gr: '' },
    }
    setCurrentMatch(profile)
    setChatOrigin(null)
    navigate('chat')
  }

  function formatTime(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return lang === 'gr' ? 'τώρα' : 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a10' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.071)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">
          ← {lang === 'gr' ? 'Πίσω' : 'Back'}
        </button>
        <h1 className="text-[18px] font-extrabold text-white"
          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          💬 {lang === 'gr' ? 'Μηνύματα' : 'Messages'}
        </h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-[28px]" style={{ animation: 'pulse 1s infinite' }}>💬</div>
          </div>
        )}

        {error && (
          <div className="text-center px-5 py-8">
            <div className="text-[12px] px-3 py-2 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{error}</div>
          </div>
        )}

        {!loading && !error && convos.length === 0 && (
          <div className="text-center px-8 py-16">
            <div className="text-[48px] mb-4">💬</div>
            <div className="text-[16px] font-bold text-white mb-2">
              {lang === 'gr' ? 'Δεν υπάρχουν μηνύματα ακόμα.' : 'No messages yet.'}
            </div>
            <div className="text-[13px] text-white/40 mb-6">
              {lang === 'gr' ? 'Ξεκίνα ένα παιχνίδι ή πες ένα γεια.' : 'Start a game or say hello to a player.'}
            </div>
            <button onClick={() => navigate('profile')}
              className="rounded-full px-5 py-2.5 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'rgba(253,41,123,0.177)', color: '#ff3384', border: '1px solid rgba(253,41,123,0.295)' }}>
              {lang === 'gr' ? 'Discover →' : 'Discover →'}
            </button>
          </div>
        )}

        {/* Conversation list */}
        {convos.map((c, i) => (
          <button key={c.partnerId} onClick={() => openChat(c)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-white/[0.03] transition-colors cursor-pointer"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.047)',
              animation: `fadeSlide 0.3s ${i * 50}ms ease both`,
            }}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden"
                style={{ border: c.isUnread ? '2px solid #ff3384' : '2px solid rgba(255,255,255,0.118)' }}>
                {c.partnerPhoto ? (
                  <img src={c.partnerPhoto} alt={c.partnerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[22px]"
                    style={{ background: c.partnerGradient }}>👤</div>
                )}
              </div>
              {c.isUnread && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                  style={{ background: '#ff3384', boxShadow: '0 0 6px #ff3384', border: '2px solid #0a0a10' }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[14px] font-bold truncate"
                  style={{ color: c.isUnread ? '#fff' : 'rgba(255,255,255,0.826)' }}>
                  {c.partnerName}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {c.unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                      style={{ background: '#ff3384', boxShadow: '0 0 8px rgba(253,41,123,0.472)' }}>
                      {c.unreadCount}
                    </span>
                  )}
                  <span className="text-[11px]"
                    style={{ color: c.isUnread ? '#ff3384' : 'rgba(255,255,255,0.295)' }}>
                    {c.lastTime}
                  </span>
                </div>
              </div>
              <div className="text-[13px] truncate"
                style={{ color: c.isUnread ? 'rgba(255,255,255,0.708)' : 'rgba(255,255,255,0.354)' }}>
                {c.lastMessage}
              </div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      `}</style>
    </div>
  )
}
