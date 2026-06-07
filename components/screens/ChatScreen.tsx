'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentMatch } from '@/lib/profiles'
import { markAsRead } from '@/lib/unread'

interface Message {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  text: string
}

export default function ChatScreen() {
  const { navigate, lang } = useApp()
  const match = getCurrentMatch()

  const [msgs, setMsgs]       = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [userId, setUserId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const receiverId = match.id !== 'none' ? match.id : null

  // Get current user + load messages
  useEffect(() => {
    let channel: any = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }
      setUserId(user.id)
      console.log('CHAT: user', user.id, '→ receiver', receiverId)

      if (!receiverId) { setLoading(false); return }

      // Fetch existing messages
      const { data, error: e } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100)

      console.log('CHAT: loaded', data?.length ?? 0, 'messages')

      // Mark messages from this partner as read
      markAsRead(receiverId)
      if (e) { console.error('CHAT error:', e); setError(e.message) }
      if (data) setMsgs(data)
      setLoading(false)

      // Subscribe to realtime
      channel = supabase
        .channel(`chat-${user.id}-${receiverId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload: any) => {
          const newMsg = payload.new as Message
          // Only add if it's between these two users
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId && newMsg.receiver_id === user.id)
          ) {
            console.log('CHAT: realtime msg from', newMsg.sender_id)
            if (newMsg.sender_id === receiverId) markAsRead(receiverId)
            setMsgs(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        })
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [receiverId])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function send() {
    if (!input.trim() || !userId || !receiverId) return
    const text = input.trim()
    setInput('')

    // Optimistic update — show immediately
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      created_at: new Date().toISOString(),
      sender_id: userId,
      receiver_id: receiverId,
      text,
    }
    setMsgs(prev => [...prev, tempMsg])

    const { error: e } = await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: receiverId,
      text,
    })

    if (e) { console.error('CHAT send error:', e); setError(e.message) }
  }

  // Quick replies
  const quicks = lang === 'gr'
    ? ['σειρά σου 😏','ρεβάνς;','τύχη ήταν','τι κερδίζω;']
    : ['your move 😏','rematch?','you got lucky','what\'s the prize?']

  return (
    <div className="flex flex-col h-full" style={{ background: '#06060a' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[16px] mr-1 active:opacity-60 cursor-pointer">←</button>
        {receiverId ? (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(253,41,123,0.3)' }}>
              {match.photo ? (
                <img src={match.photo} alt={match.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px]"
                  style={{ background: match.gradient }}>👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-white truncate">{match.name}</div>
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {lang === 'gr' ? 'Πραγματικός παίκτης' : 'Real player'}
              </div>
            </div>
          </>
        ) : (
          <div className="text-[15px] font-bold text-white">Chat</div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ scrollbarWidth: 'none' }}>

        {!receiverId && (
          <div className="text-center py-16">
            <div className="text-[40px] mb-3">💬</div>
            <div className="text-[15px] font-semibold text-white/50">
              {lang === 'gr' ? 'Διάλεξε έναν παίκτη για chat.' : 'Select a player to chat.'}
            </div>
            <button onClick={() => navigate('profile')}
              className="mt-4 rounded-full px-5 py-2.5 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'rgba(253,41,123,0.15)', color: '#fd297b', border: '1px solid rgba(253,41,123,0.25)' }}>
              {lang === 'gr' ? 'Discover →' : 'Discover →'}
            </button>
          </div>
        )}

        {loading && receiverId && (
          <div className="text-center py-8">
            <div className="text-[24px]" style={{ animation: 'pulse 1s infinite' }}>💬</div>
          </div>
        )}

        {error && (
          <div className="text-center text-[12px] px-3 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{error}</div>
        )}

        {!loading && receiverId && msgs.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[14px] text-white/40">
              {lang === 'gr' ? `Ξεκίνα μια κουβέντα με τον/την ${match.name}` : `Start a conversation with ${match.name}`}
            </div>
          </div>
        )}

        {msgs.map(m => {
          const isMine = m.sender_id === userId
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'msgSlide 0.3s ease both' }}>
              {!isMine && (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                  {match.photo ? (
                    <img src={match.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px]"
                      style={{ background: match.gradient }}>👤</div>
                  )}
                </div>
              )}
              <div className="max-w-[78%] rounded-2xl px-4 py-2.5"
                style={{
                  background: isMine ? 'linear-gradient(135deg,#fd297b,#ff655b)' : 'rgba(255,255,255,0.08)',
                  color: isMine ? '#fff' : 'rgba(255,255,255,0.85)',
                  borderBottomRightRadius: isMine ? 4 : 18,
                  borderBottomLeftRadius: !isMine ? 4 : 18,
                  fontSize: 14, lineHeight: '1.45',
                }}>
                {m.text}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick pills */}
      {receiverId && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {quicks.map((q, i) => (
            <button key={i} onClick={() => { setInput(q); }}
              className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {receiverId && (
        <div className="flex items-center gap-2 px-3 pb-6 pt-1.5">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder={lang === 'gr' ? 'πες κάτι...' : 'say something...'}
            className="flex-1 rounded-full px-4 py-3 text-[14px] outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#fd297b' }} />
          <button onClick={send} disabled={!input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-25"
            style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)' }}>
            <span className="text-white text-[16px]">↑</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes msgSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      `}</style>
    </div>
  )
}
