'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

interface Conversation {
  partnerId: string
  partnerName: string
  partnerPhoto: string
  partnerGradient: string
  lastMessage: string
  lastTime: string
  isUnread: boolean
}

export default function InboxScreen() {
  const { navigate, lang } = useApp()
  const [convos, setConvos]   = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => { loadConversations() }, [])

  async function loadConversations() {
    setLoading(true)
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
      const partnerMap = new Map<string, { lastMsg: any; isUnread: boolean }>()
      for (const m of msgs) {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            lastMsg: m,
            isUnread: m.sender_id !== user.id, // last msg from them = unread
          })
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
        'linear-gradient(135deg,#6c63ff,#a855f7)',
        'linear-gradient(135deg,#fd297b,#ff655b)',
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
        }
      })

      console.log('INBOX:', list.length, 'conversations')
      setConvos(list)
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
    <div className="flex flex-col h-full" style={{ background: '#06060a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
              style={{ background: 'rgba(253,41,123,0.15)', color: '#fd297b', border: '1px solid rgba(253,41,123,0.25)' }}>
              {lang === 'gr' ? 'Discover →' : 'Discover →'}
            </button>
          </div>
        )}

        {/* Conversation list */}
        {convos.map((c, i) => (
          <button key={c.partnerId} onClick={() => openChat(c)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-white/[0.03] transition-colors cursor-pointer"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              animation: `fadeSlide 0.3s ${i * 50}ms ease both`,
            }}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden"
                style={{ border: c.isUnread ? '2px solid #fd297b' : '2px solid rgba(255,255,255,0.1)' }}>
                {c.partnerPhoto ? (
                  <img src={c.partnerPhoto} alt={c.partnerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[22px]"
                    style={{ background: c.partnerGradient }}>👤</div>
                )}
              </div>
              {c.isUnread && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                  style={{ background: '#fd297b', boxShadow: '0 0 6px #fd297b', border: '2px solid #06060a' }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[14px] font-bold truncate"
                  style={{ color: c.isUnread ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                  {c.partnerName}
                </span>
                <span className="text-[11px] flex-shrink-0 ml-2"
                  style={{ color: c.isUnread ? '#fd297b' : 'rgba(255,255,255,0.25)' }}>
                  {c.lastTime}
                </span>
              </div>
              <div className="text-[13px] truncate"
                style={{ color: c.isUnread ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
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
