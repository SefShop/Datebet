'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { refreshMessagesState } from '@/lib/messagesState'
import { supabase } from '@/lib/supabase'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'
import { getPresence, isOnlineNow, presenceLabel } from '@/lib/presence'
import { getPairProgress } from '@/lib/pairProgress'
import { markAsRead } from '@/lib/unread'
import BackControl from '@/components/ui/BackControl'

interface Message {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  text: string
}

interface Props {
  onClose: () => void
  // True only when rendered inside GameChatOverlay. The overlay
  // intentionally never changes `screen` (it stays on the active game
  // screen the whole time) — the access-verification effect below was
  // originally gated on screen === 'chat' to stop the always-mounted
  // full-screen ChatScreen from verifying/redirecting when the user
  // wasn't actually viewing it. This flag lets that same effect also run
  // correctly in the overlay context, where chatOpen being true is
  // itself the equivalent signal that the user is genuinely viewing
  // chat. Defaults to false so ChatScreen's existing usage (which never
  // passes this) is completely unaffected.
  isOverlay?: boolean
}

export default function ChatPanel({ onClose, isOverlay = false }: Props) {
  const { navigate, lang, screen } = useApp()
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
  // Typing indicator — reuses the same realtime channel the message
  // subscription already opens (via broadcast, not a new channel or a
  // new postgres_changes subscription), so this never duplicates the
  // existing message subscription.
  const [otherTyping, setOtherTyping] = useState(false)
  const channelRef = useRef<any>(null)
  const otherTypingTimeoutRef = useRef<any>(null)
  const iAmTypingRef = useRef(false)
  const lastTypingSentRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerPresence, setPartnerPresence] = useState('')
  // Instant, conversation-scoped presence (Realtime Presence on the same
  // channel as messages/typing) — combined with the existing 20s-poll
  // partnerOnline below only as an OR, never a toggle between the two,
  // so a brief gap in either source can't cause the displayed status to
  // flicker: whichever source currently says "online" wins.
  const [opponentInChannel, setOpponentInChannel] = useState(false)
  const opponentOfflineTimeoutRef = useRef<any>(null)
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
    // Only perform this check (and thus only ever redirect) while the
    // user is genuinely viewing chat — either the full-screen ChatScreen
    // (screen === 'chat') or the overlay (isOverlay === true, since the
    // overlay deliberately never changes `screen` at all). Re-running
    // whenever either condition becomes true means it's still verified
    // correctly if reached later without receiverId changing again.
    if (!isOverlay && screen !== 'chat') return
    let cancelled = false
    getPairProgress(receiverId).then(prog => {
      if (cancelled) return
      if (!prog.chat_unlocked) {
        console.log('CHAT ACCESS BLOCKED: chat not unlocked for this pair')
        navigate('profile')
        return
      }
      setChatAccessVerified(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId, screen, isOverlay])

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
        // Sorted so both participants compute the identical channel name
        // regardless of who's "me" vs "them" — required for broadcast
        // (used by the typing indicator below) to actually reach the
        // other user. The previous chat-${user.id}-${receiverId} name was
        // asymmetric: each side computed a different string, so neither
        // ever received the other's broadcasts. postgres_changes (the
        // message subscription) was unaffected by this, since it's
        // driven by the database, not by matching another client's
        // channel name — that's why messages worked while typing never
        // did.
        .channel(`chat-${[user.id, receiverId].sort().join('-')}`, { config: { presence: { key: user.id } } })
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
        .on('broadcast', { event: 'typing' }, (msg: any) => {
          // Broadcasts on this channel are received by every subscriber,
          // including ourselves — only ever show the OTHER user's typing,
          // never our own.
          if (msg.payload?.userId !== user.id) {
            if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current)
            if (msg.payload?.stopped) {
              setOtherTyping(false)
            } else {
              setOtherTyping(true)
              otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000)
            }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          // Sole source of truth for online/offline display — real,
          // conversation-scoped Realtime Presence, not the global
          // app-wide poll (which was the actual bug: it stayed true as
          // long as the opponent was logged in anywhere, e.g. still
          // playing the game after closing chat, permanently masking
          // this signal). Detected by user ID only, never display name.
          const state = channel.presenceState()
          const present = Object.values(state).some((entries: any) =>
            entries.some((e: any) => e.userId === receiverId)
          )
          if (present) {
            // Coming online is shown immediately — no reason to delay
            // good news, and no risk of a stale "online" value here.
            if (opponentOfflineTimeoutRef.current) { clearTimeout(opponentOfflineTimeoutRef.current); opponentOfflineTimeoutRef.current = null }
            setOpponentInChannel(true)
          } else if (opponentOfflineTimeoutRef.current === null) {
            // Short grace period before flipping to offline, so a
            // momentary presence-sync gap (e.g. a brief network blip)
            // doesn't flicker the status — but never so long that a
            // genuine close/navigate-away/unmount goes undetected.
            opponentOfflineTimeoutRef.current = setTimeout(() => {
              setOpponentInChannel(false)
              opponentOfflineTimeoutRef.current = null
            }, 2500)
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('CHAT REALTIME CONNECTED')
            // Announces "I'm actively in this conversation" — scoped
            // entirely to this channel/component lifetime. Automatically
            // removed when the channel is unsubscribed (existing cleanup
            // below via supabase.removeChannel), no separate untrack call
            // needed for that path.
            await channel.track({ userId: user.id })
          }
        })
      channelRef.current = channel

      // Polling fallback (every 3s while chat is open)
      console.log('CHAT POLLING ACTIVE')
      poll = setInterval(() => { if (activeUser) fetchLatest(activeUser) }, 3000)
    }

    init()
    return () => {
      if (channel && iAmTypingRef.current && userId) {
        channel.send({ type: 'broadcast', event: 'typing', payload: { userId, stopped: true } })
        iAmTypingRef.current = false
      }
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current)
      if (opponentOfflineTimeoutRef.current) { clearTimeout(opponentOfflineTimeoutRef.current); opponentOfflineTimeoutRef.current = null }
      if (channel) {
        channel.untrack()  // explicit — lets the other client detect our absence promptly, on close/unmount/navigation alike
        supabase.removeChannel(channel)
      }
      if (poll) clearInterval(poll)
      setOpponentInChannel(false)
    }
  }, [receiverId])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  if (!match) return <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">No player selected</div></div></div>

  // Sends a lightweight "typing" broadcast on the same existing channel —
  // throttled to at most once every 2 seconds so rapid keystrokes don't
  // flood the channel. Only ever called from the input's onChange below;
  // send() itself is untouched.
  function notifyTyping() {
    if (!channelRef.current || !userId) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    iAmTypingRef.current = true
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId } })
  }

  // Covers "clear immediately after sending a message" without touching
  // send() at all: send() already does setInput('') on success, so input
  // becoming empty after having had content is used as that same signal.
  const prevInputRef = useRef('')
  useEffect(() => {
    if (prevInputRef.current !== '' && input === '' && iAmTypingRef.current && channelRef.current && userId) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId, stopped: true } })
      iAmTypingRef.current = false
    }
    prevInputRef.current = input
  }, [input, userId])

  async function send() {
    console.log('[CHAT DEBUG] send() entered')
    console.log('[CHAT DEBUG] input.trim():', JSON.stringify(input.trim()))
    console.log('[CHAT DEBUG] userId:', userId)
    console.log('[CHAT DEBUG] receiverId:', receiverId)
    if (!input.trim() || !userId || !receiverId) {
      console.log('[CHAT DEBUG] early-return TRIGGERED — one of input/userId/receiverId is falsy')
      return
    }
    console.log('[CHAT DEBUG] early-return NOT triggered — proceeding')
    const text = input.trim()
    setInput('')
    console.log('[CHAT DEBUG] setInput(\'\') reached')

    // Optimistic update — show immediately
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      created_at: new Date().toISOString(),
      sender_id: userId,
      receiver_id: receiverId,
      text,
    }
    setMsgs(prev => [...prev, tempMsg])

    console.log('[CHAT DEBUG] about to call supabase.from(\'messages\').insert()', { sender_id: userId, receiver_id: receiverId })
    const { data, error: e } = await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: receiverId,
      text,
    })
    console.log('[CHAT DEBUG] insert result — data:', data, 'error:', e)

    if (e) { console.error('CHAT send error:', e); setError(e.message) }
    else { console.log('MESSAGE SENT REFRESH CALLED'); refreshMessagesState() }
  }

  // Quick replies
  const quicks = lang === 'gr'
    ? ['σειρά σου 😏','ρεβάνς;','τύχη ήταν','τι κερδίζω;']
    : ['your move 😏','rematch?','you got lucky','what\'s the prize?']

  // Instant conversation-scoped signal wins immediately when present;
  // otherwise falls back to the existing 20s-poll baseline. Simple OR,
  // not a source toggle, so a brief gap in either can't flicker the
  // displayed status.
  // Sole source of truth for online/offline — real, conversation-scoped
  // Realtime Presence. The global app-wide poll (partnerOnline) is no
  // longer used here for the online/offline determination itself — that
  // was the actual bug, since it stayed true as long as the opponent was
  // logged in anywhere in the app, not specifically in this chat. It's
  // still used below only for its richer "last seen Nm ago" text in the
  // offline case.
  const effectiveOnline = opponentInChannel
  // Keeps the text label consistent with the dot above — reuses the
  // exact same localized "online" string presenceLabel() already
  // returns for its own online case, rather than showing a stale
  // "last seen Nm ago" text next to a green dot if the instant signal
  // arrives before the next poll catches up.
  const displayedPresence = effectiveOnline ? (lang === 'gr' ? 'σε σύνδεση' : 'online') : partnerPresence

  return (
    !chatAccessVerified ? (
      <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">{lang === 'gr' ? 'Φόρτωση...' : 'Loading...'}</div></div></div>
    ) : (
    <div className="flex flex-col h-full" style={{ background: '#0a0a10' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.071)', background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(12px)' }}>
        <BackControl lang={lang} onClick={onClose} />
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
              <div className="text-[11px] flex items-center gap-1.5" style={{ color: effectiveOnline ? '#4ade80' : 'rgba(255,255,255,0.472)' }}>
                {effectiveOnline && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />}
                {displayedPresence}
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

      {/* Typing indicator — compact, only takes space while active */}
      {otherTyping && (
        <div className="px-4 pb-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {lang === 'gr' ? 'γράφει...' : 'typing...'}
        </div>
      )}

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
          <input value={input} onChange={e => { setInput(e.target.value); notifyTyping() }}
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
