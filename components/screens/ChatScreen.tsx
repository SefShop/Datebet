'use client'
import { useApp } from '@/lib/AppContext'
import { getChatOrigin, setChatOrigin, getCurrentSession } from '@/lib/gameInvites'
import ChatPanel from '@/components/chat/ChatPanel'

export default function ChatScreen() {
  const { navigate, screen } = useApp()

  // Every screen in the app (including this one) stays mounted at all
  // times — only hidden via CSS opacity/pointerEvents when not the
  // active screen. Without this guard, ChatPanel here would stay active
  // in the background even while the user is elsewhere (e.g. inside a
  // game with GameChatOverlay open), independently subscribing to the
  // same realtime channel as the overlay's own ChatPanel instance. Only
  // ever mount ChatPanel here while this is genuinely the active screen
  // — GameChatOverlay already guarantees the reverse (it only renders
  // while chatOpen is true, which requires being on a game screen, never
  // 'chat'), so the two conditions are mutually exclusive and at most
  // one ChatPanel instance can ever exist at a time.
  if (screen !== 'chat') return null

  // Exact same back-navigation logic that previously lived inline in the
  // BackControl's onClick — unchanged, just moved here and passed down as
  // the onClose prop.
  function onClose() {
    const cameFromGameRoom = getChatOrigin() === 'game_room'
    setChatOrigin(null)  // consume — never leaks into a future chat visit from a different origin
    if (cameFromGameRoom && getCurrentSession()) {
      navigate('game_room')
    } else {
      navigate('profile')
    }
  }

  return <ChatPanel onClose={onClose} />
}
