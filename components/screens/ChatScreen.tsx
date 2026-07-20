'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { refreshMessagesState } from '@/lib/messagesState'
import { supabase } from '@/lib/supabase'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'
import { getPresence, isOnlineNow, presenceLabel } from '@/lib/presence'
import { getPairProgress } from '@/lib/pairProgress'
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
  // Reactive — was previously `const match = getCurrentMatch()`, read once
  // per render. ChatScreen, like every other game screen, stays
  // permanently mounted (hidden via CSS) between visits — reading the
  // module variable directly meant it could still show a stale opponent
  // (or none at all) from an earlier visit until some unrelated re-render
  // happened to occur, which is exactly what could leave the chat-access
  // verification effect below checking the wrong pair (or none), stuck at
  // "Loading..." forever.
  const [match, setMatchState] = useState(() => getCurrentMatch())
  useEffect(() => {
    const unsubscribe = subscribeCurrentMatch((m) => setMatchState(m))
    return unsubscribe
  }, [])

  const [msgs, setMsgs]       = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [userId, setUserId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerPresence, setPartnerPresence] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const receiverId = match && match.id !== 'none' ? match.id : null

  // ── Fail-closed access guard ──────────────────────────────────────
  // Verifies effectiveChatUnlocked === true directly against the same
  // authoritative pair-progress calculation used everywhere else, before
  // ever rendering the conversation. This protects actual entry into Chat
  // regardless of how this screen was reached (button click, browser
  // refresh, or any other path) — not just the button's disabled state.
  const [chatAccessVerified, setChatAccessVerified] = useState(false)
  useEffect(() => {
    if (!receiverId) { setChatAccessVerified(true); return }  // no specific pair to check — matches original behavior
    console.log('[PROFILES_REDIRECT_TRACE] file: ChatScreen.tsx | function: access-verification useEffect | fired because receiverId changed to:', receiverId)
    let cancelled = false
    getPairProgress(receiverId).then(prog => {
      if (cancelled) return
      if (!prog.chat_unlocked) {
        console.log('CHAT ACCESS BLOCKED: chat not unlocked for this pair')
        console.log('[PROFILES_REDIRECT_TRACE] file: ChatScreen.tsx | function: access-verification useEffect | REDIRECTING to profile | reason: chat_unlocked=false for receiverId:', receiverId, '| games_completed:', prog.games_completed)
        navigate('profile')
        return
      }
      console.log('CHAT ACCESS VERIFIED')
      setChatAccessVerified(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId])

  // Poll partner presence every 20s
  useEffect(() => {
    if (!receiverId) return
    let active = true
    async function load() {
      const p = await getPresence(receiverId!)
      if (!active) return
      setPartnerOnline(isOnlineNow(p.isOnline, p.lastSeen))
      setPartnerPresence(presenceLabel(p.isOnline, p.lastSeen, lang as 'en' | 'gr'))
    }
    load()
    const t = setInterval(load, 20000)
    return () => { active = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId, lang])

  // Get current user + load messages
  useEffect(() => {
    let channel: any = null
    let poll: any = null
    let activeUser: string | null = null

    async function fetchLatest(uid: string) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) {
        console.log('CHAT OPEN POLL RESULT:', data.length, 'messages')
        setMsgs(prev => {
          if (prev.length === data.length && prev.every((m, i) => m.id === data[i].id)) return prev
          console.log('CHAT UPDATED:', data.length, 'messages')
          return data
        })
        if (receiverId) markAsRead(receiverId)
      }
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }
      setUserId(user.id)
      activeUser = user.id
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
      refreshMessagesState()
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
            console.log('NEW MESSAGE RECEIVED:', newMsg.sender_id)
            if (newMsg.sender_id === receiverId) markAsRead(receiverId)
            setMsgs(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              console.log('CHAT UPDATED:', prev.length + 1, 'messages')
              return [...prev, newMsg]
            })
          }
        })
        .subscribe((status: string) => { if (status === 'SUBSCRIBED') console.log('CHAT REALTIME CONNECTED') })

      // Polling fallback (every 3s while chat is open)
      console.log('CHAT POLLING ACTIVE')
      poll = setInterval(() => { if (activeUser) fetchLatest(activeUser) }, 3000)
    }

    init()
    return () => {
      if (channel) supabase.removeChannel(channel)
      if (poll) clearInterval(poll)
    }
  }, [receiverId])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  if (!match) return <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">No player selected</div></div></div>

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
    else { console.log('MESSAGE SENT REFRESH CALLED'); refreshMessagesState() }
  }

  // Quick replies
  const quicks = lang === 'gr'
    ? ['σειρά σου 😏','ρεβάνς;','τύχη ήταν','τι κερδίζω;']
    : ['your move 😏','rematch?','you got lucky','what\'s the prize?']

  return (
    !chatAccessVerified ? (
      <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">{lang === 'gr' ? 'Φόρτωση...' : 'Loading...'}</div></div></div>
    ) : (
    <div className="flex flex-col h-full" style={{ background: '#0a0a10' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.071)', background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[16px] mr-1 active:opacity-60 cursor-pointer">←</button>
        {receiverId ? (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(253,41,123,0.354)' }}>
              {match.photo ? (
                <img src={match.photo} alt={match.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px]"
                  style={{ background: match.gradient }}>👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-white truncate">{match.name}</div>
              <div className="text-[11px] flex items-center gap-1.5" style={{ color: partnerOnline ? '#4ade80' : 'rgba(255,255,255,0.472)' }}>
                {partnerOnline && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />}
                {partnerPresence}
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
              style={{ background: 'rgba(253,41,123,0.177)', color: '#ff3384', border: '1px solid rgba(253,41,123,0.295)' }}>
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
                  background: isMine ? 'linear-gradient(135deg,#ff3384,#ff7a6e)' : 'rgba(255,255,255,0.094)',
                  color: isMine ? '#fff' : 'rgba(255,255,255,1)',
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
          style={{ scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.047)' }}>
          {quicks.map((q, i) => (
            <button key={i} onClick={() => { setInput(q); }}
              className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.059)', color: 'rgba(255,255,255,0.59)', border: '1px solid rgba(255,255,255,0.071)' }}>
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
            style={{ background: 'rgba(255,255,255,0.071)', color: '#fff', border: '1px solid rgba(255,255,255,0.094)', caretColor: '#ff3384' }} />
          <button onClick={send} disabled={!input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-25"
            style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)' }}>
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
  )
}
