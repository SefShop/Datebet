'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import ChatPanel from '@/components/chat/ChatPanel'

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

  // Mobile-only slide transition. The sheet needs to stay mounted for a
  // brief moment after chatOpen becomes false so its slide-down animation
  // can actually play — chatOpen itself flips instantly (it's the same
  // shared signal desktop uses), so this is tracked as separate, local,
  // mobile-only state. Desktop's own mount/unmount timing (still gated
  // directly on chatOpen, below) is completely untouched by this.
  const [mobileMounted, setMobileMounted] = useState(false)
  const [mobileSlidIn, setMobileSlidIn] = useState(false)
  useEffect(() => {
    if (isDesktop) return
    if (chatOpen) {
      setMobileMounted(true)
      const raf = requestAnimationFrame(() => setMobileSlidIn(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setMobileSlidIn(false)
      const t = setTimeout(() => setMobileMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [chatOpen, isDesktop])

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
    // Fixed right-side panel, fills the full viewport height — unchanged
    // from before, exact same mount/unmount timing (gated directly on
    // chatOpen, no animation).
    if (!chatOpen) return null
    return (
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#0a0a10', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 300, overflow: 'hidden' }}>
        <ChatPanel onClose={closeChat} isOverlay />
      </div>
    )
  }

  // Bottom sheet — ~75% of viewport height, slides up/down via a
  // transform transition instead of appearing/disappearing instantly.
  if (!mobileMounted) return null
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '75vh', background: '#0a0a10', borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 300, overflow: 'hidden', transform: mobileSlidIn ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s ease' }}>
      <ChatPanel onClose={closeChat} isOverlay />
    </div>
  )
}
