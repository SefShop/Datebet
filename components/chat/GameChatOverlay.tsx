'use client'
import { useState, useEffect, useRef } from 'react'
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

  // Swipe-down-to-dismiss — plain native Pointer Events, no gesture
  // library (none is installed in this project). Scoped entirely to the
  // small grab handle below, never the sheet body, so it can never
  // conflict with ChatPanel's own message-list scrolling. dragY is the
  // live vertical offset in pixels while actively dragging; the sheet's
  // transform uses it directly (transition disabled) so it tracks the
  // finger 1:1, then either finishes closing or snaps back once released.
  const [dragging, setDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef(0)
  const DISMISS_THRESHOLD_PX = 100

  function onHandlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
    setDragging(true)
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const delta = e.clientY - dragStartY.current
    if (delta > 0) setDragY(delta)  // only ever follows downward movement
  }
  function onHandlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (dragY > DISMISS_THRESHOLD_PX) {
      closeChat()  // existing close path — same animation/cleanup as the close button
    }
    setDragY(0)  // if not dismissed, mobileSlidIn is still true, so the sheet's normal transform (translateY(0)) takes over with the transition re-enabled — a smooth snap-back
  }

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
    // chatOpen, no animation, no drag).
    if (!chatOpen) return null
    return (
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#0a0a10', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 300, overflow: 'hidden' }}>
        <ChatPanel onClose={closeChat} isOverlay />
      </div>
    )
  }

  // Bottom sheet — ~75% of viewport height, slides up/down via a
  // transform transition instead of appearing/disappearing instantly.
  // The backdrop shares the exact same mount lifecycle (mobileMounted)
  // and fades with the same mobileSlidIn flag, so it always appears and
  // disappears together with the sheet. Positioned at a lower z-index
  // than the sheet, so it never sits on top of (or intercepts clicks
  // meant for) the chat content itself.
  if (!mobileMounted) return null
  const sheetTransform = dragging ? `translateY(${dragY}px)` : (mobileSlidIn ? 'translateY(0)' : 'translateY(100%)')
  const sheetTransition = dragging ? 'none' : 'transform 0.3s ease'
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 299, opacity: mobileSlidIn ? 1 : 0, transition: 'opacity 0.3s ease' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '75vh', background: '#0a0a10', borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 300, overflow: 'hidden', transform: sheetTransform, transition: sheetTransition }}>
        <div onPointerDown={onHandlePointerDown} onPointerMove={onHandlePointerMove} onPointerUp={onHandlePointerUp} onPointerCancel={onHandlePointerUp}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, touchAction: 'none', cursor: 'grab' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <ChatPanel onClose={closeChat} isOverlay />
      </div>
    </>
  )
}
