'use client'
import { useApp } from '@/lib/AppContext'
import { getChatOrigin, setChatOrigin, getCurrentSession } from '@/lib/gameInvites'
import ChatPanel from '@/components/chat/ChatPanel'

export default function ChatScreen() {
  const { navigate } = useApp()

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
