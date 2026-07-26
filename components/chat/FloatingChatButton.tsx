'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { getMessagesState, subscribeMessages } from '@/lib/messagesState'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'

interface Props {
  openChat: () => void
  isChatUnlocked: boolean
}

// Reads the unread count for the current game opponent the exact same
// way GameChatBadge.tsx already does — the same existing global
// messages state (lib/messagesState.ts), already kept current by the
// app-wide polling running independently of chat being open. No new
// unread system, no new subscription, no duplicated messaging logic.
//
// isChatUnlocked is passed in by the calling game screen, which already
// tracks it live via its own existing pairCount state (updated on game
// completion via the realtime game session, the same source that already
// drives that screen's own in-game text Chat button) — this component
// never re-derives or re-fetches unlock state itself, it only reacts to
// the single, real source of truth the screen already has.
export default function FloatingChatButton({ openChat, isChatUnlocked }: Props) {
  const { lang } = useApp()

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

  // Unlock transition — detected by comparing against the *previous*
  // value of isChatUnlocked, initialized to the value it already had on
  // first mount (not unconditionally false). This is what prevents a
  // false "just unlocked" reading on mount/refresh/remount when chat was
  // already unlocked — only a genuine false→true change after mount ever
  // triggers the animation and message, exactly once per real transition.
  const [unlockPop, setUnlockPop] = useState(false)
  const [showUnlockMsg, setShowUnlockMsg] = useState(false)
  const prevUnlockedRef = useRef(isChatUnlocked)
  useEffect(() => {
    if (isChatUnlocked && !prevUnlockedRef.current) {
      setUnlockPop(true)
      setShowUnlockMsg(true)
      const t1 = setTimeout(() => setUnlockPop(false), 500)
      const t2 = setTimeout(() => setShowUnlockMsg(false), 3000)
      prevUnlockedRef.current = isChatUnlocked
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevUnlockedRef.current = isChatUnlocked
  }, [isChatUnlocked])

  return (
    <>
      <style>{`
        @keyframes floatingChatPop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes floatingChatUnlockMsg {
          0%   { opacity: 0; transform: translate(-50%, -6px); }
          12%  { opacity: 1; transform: translate(-50%, 0); }
          88%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -6px); }
        }
      `}</style>
      <button onClick={() => { if (isChatUnlocked) openChat() }} aria-label="Chat"
        disabled={!isChatUnlocked}
        className="rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 16,
          width: 52, height: 52,
          zIndex: 40,
          background: 'linear-gradient(135deg,#ff3384,#d84dd8)',
          boxShadow: '0 6px 20px rgba(253,41,123,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
          opacity: isChatUnlocked ? 1 : 0.68,
          animation: pop || unlockPop ? 'floatingChatPop 0.42s ease' : undefined,
        }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>💬</span>
        {!isChatUnlocked && (
          <span className="absolute flex items-center justify-center rounded-full"
            style={{
              bottom: -3, right: -3,
              width: 20, height: 20,
              fontSize: 11,
              background: 'rgba(10,10,16,0.92)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              boxShadow: '0 0 0 2px #0a0a10',
            }}>
            🔒
          </span>
        )}
        {isChatUnlocked && unread > 0 && (
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

      {showUnlockMsg && (
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 80px)',
          left: '50%',
          zIndex: 39,
          animation: 'floatingChatUnlockMsg 3s ease both',
          pointerEvents: 'none',
        }}>
          <div className="text-[12px] font-semibold text-center px-4 py-2 rounded-full"
            style={{
              color: '#fff',
              background: 'rgba(20,14,28,0.88)',
              border: '1px solid rgba(255,51,132,0.35)',
              boxShadow: '0 4px 20px rgba(253,41,123,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
              maxWidth: 300,
            }}>
            {lang === 'gr'
              ? 'Το chat ξεκλειδώθηκε — μπορείτε πλέον να μιλάτε ενώ παίζετε.'
              : 'Chat unlocked — you can now talk while you play.'}
          </div>
        </div>
      )}
    </>
  )
}
