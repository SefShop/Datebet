'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import ChatPanel from '@/components/chat/ChatPanel'

// Not yet wired to any game's Chat button — chatOpen can only become true
// via a direct call to openChat() from useApp(), which nothing calls yet.
export default function GameChatOverlay() {
  const { chatOpen, closeChat } = useApp()

  // Same detection pattern already used in ProfileScreenNew.tsx — reused
  // exactly, not a second mechanism.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!chatOpen) return null

  // ChatPanel's own root div is h-full (height: 100%), which only
  // resolves correctly against a parent that itself has an explicit
  // height — not merely a flex container centering content (that was
  // fine for Step 2's placeholder text, but would leave ChatPanel's
  // height undefined here). Both shells below are therefore plain block
  // containers with a concrete height (top/bottom for the fixed panel,
  // an explicit height for the sheet), plus overflow: hidden so
  // ChatPanel's own internal scrolling message list is what scrolls —
  // never the shell itself.
  if (isDesktop) {
    // Fixed right-side panel, fills the full viewport height
    return (
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#0a0a10', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 300, overflow: 'hidden' }}>
        <ChatPanel onClose={closeChat} isOverlay />
      </div>
    )
  }

  // Bottom sheet — ~72% of viewport height
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '72vh', background: '#0a0a10', borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 300, overflow: 'hidden' }}>
      <ChatPanel onClose={closeChat} isOverlay />
    </div>
  )
}
