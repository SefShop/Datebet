'use client'
import { useState, useEffect, useRef } from 'react'
import { getMessagesState, subscribeMessages } from '@/lib/messagesState'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'

interface Props {
  openChat: () => void
}

// Reads the unread count for the current game opponent the exact same
// way GameChatBadge.tsx already does — the same existing global
// messages state (lib/messagesState.ts), already kept current by the
// app-wide polling running independently of chat being open. No new
// unread system, no new subscription, no duplicated messaging logic.
export default function FloatingChatButton({ openChat }: Props) {
  const [opponentId, setOpponentId] = useState<string | null>(() => {
    const m = getCurrentMatch()
    return m && m.id !== 'none' ? m.id : null
  })
  useEffect(() => subscribeCurrentMatch(m => setOpponentId(m && m.id !== 'none' ? m.id : null)), [])

  const [unread, setUnread] = useState(0)
  useEffect(() => {
    function update() {
      if (!opponentId) { setUnread(0); return }
      const convo = getMessagesState().conversations.find(c => c.partnerId === opponentId)
      setUnread(convo?.unread || 0)
    }
    update()
    return subscribeMessages(update)
  }, [opponentId])

  // One-shot pop animation whenever unread goes up — never on a
  // decrease (e.g. opening chat clears it), never looping.
  const [pop, setPop] = useState(false)
  const prevUnreadRef = useRef(unread)
  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 420)
      prevUnreadRef.current = unread
      return () => clearTimeout(t)
    }
    prevUnreadRef.current = unread
  }, [unread])

  return (
    <>
      <style>{`
        @keyframes floatingChatPop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>
      <button onClick={openChat} aria-label="Chat"
        className="rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 16,
          width: 52, height: 52,
          zIndex: 40,
          background: 'linear-gradient(135deg,#ff3384,#d84dd8)',
          boxShadow: '0 6px 20px rgba(253,41,123,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: pop ? 'floatingChatPop 0.42s ease' : undefined,
        }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>💬</span>
        {unread > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full font-bold text-white"
            style={{
              top: -4, right: -4,
              minWidth: 20, height: 20, padding: '0 5px',
              fontSize: 11,
              background: 'linear-gradient(135deg,#ff3384,#d84dd8)',
              boxShadow: '0 0 0 2px #0a0a10',
            }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </>
  )
}
