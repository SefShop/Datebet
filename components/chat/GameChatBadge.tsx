'use client'
import { useState, useEffect } from 'react'
import { getMessagesState, subscribeMessages } from '@/lib/messagesState'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'

// Reads the unread count for the current game opponent directly from the
// existing global messages state (lib/messagesState.ts) — already kept
// up to date by the app-wide polling that's been running independently
// of chat being open since login (started in app/app/page.tsx). No new
// subscription, no new polling, no duplicated messaging logic: this is
// purely a read of state that already exists and already updates.
//
// Clearing on open needs no code here at all — ChatPanel's own existing
// mount effect already calls markAsRead(receiverId) followed by
// refreshMessagesState(), which is the same global state this badge
// reads, so the count already zeroes out the moment the overlay opens.
export default function GameChatBadge() {
  const [opponentId, setOpponentId] = useState<string | null>(() => {
    const m = getCurrentMatch()
    return m && m.id !== 'none' ? m.id : null
  })
  useEffect(() => {
    const unsubscribe = subscribeCurrentMatch((m) => setOpponentId(m && m.id !== 'none' ? m.id : null))
    return unsubscribe
  }, [])

  const [unread, setUnread] = useState(0)
  useEffect(() => {
    function update() {
      if (!opponentId) { setUnread(0); return }
      const convo = getMessagesState().conversations.find(c => c.partnerId === opponentId)
      setUnread(convo?.unread || 0)
    }
    update()
    const unsubscribe = subscribeMessages(update)
    return unsubscribe
  }, [opponentId])

  if (unread <= 0) return null
  return (
    <span
      className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ minWidth: 18, height: 18, padding: '0 4px', background: 'linear-gradient(135deg,#ff3384,#d84dd8)', boxShadow: '0 0 0 2px #0a0a10' }}>
      {unread > 9 ? '9+' : unread}
    </span>
  )
}
