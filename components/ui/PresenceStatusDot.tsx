'use client'
import { useState, useEffect, useRef } from 'react'
import {
  PresenceStatus, PRESENCE_STATUS_COLORS,
  getPresenceStatus, getRawPresence, subscribePresenceStatus,
  deriveDisplayedPresence, presenceStatusTitle,
} from '@/lib/presenceStatus'

interface Props {
  userId: string
  lang: 'en' | 'gr'
  top?: number
  left?: number
}

const LONG_PRESS_MS = 500
// How often to locally re-derive staleness even without a new realtime
// event — a stale (→ Offline) transition happens purely from time
// passing, not from a database write, so this is required in addition
// to the realtime subscription below.
const RECHECK_INTERVAL_MS = 8000

// Fully automatic, read-only presence dot. No manual selector — status
// is entirely derived from real app activity + heartbeat freshness (see
// lib/presenceStatus.ts). Used for both viewing other users' profiles
// and the current user's own — nobody can change any status by
// interacting with this component.
export default function PresenceStatusDot({ userId, lang, top = 16, left = 16 }: Props) {
  const [status, setStatus] = useState<PresenceStatus>('offline')
  const [showTooltip, setShowTooltip] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rawRef = useRef<{ status: string | null; lastSeen: string | null }>({ status: null, lastSeen: null })

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const raw = await getRawPresence(userId)
      if (cancelled) return
      rawRef.current = raw
      setStatus(deriveDisplayedPresence(raw.status, raw.lastSeen))
    }
    loadInitial()

    const unsubscribe = subscribePresenceStatus(userId, s => {
      if (cancelled) return
      setStatus(s)
    })

    // Fallback: every 15s, re-fetch this user's current presence directly
    // — the realtime subscription above is the primary path, but a
    // missed event (network blip, reconnect, etc.) would otherwise leave
    // the dot stuck on a stale value indefinitely. Resolves through the
    // exact same canonical helper as every other read path; only updates
    // if the resolved status actually changed, so this never flashes or
    // shows a loading state.
    const recheck = setInterval(async () => {
      if (cancelled) return
      const raw = await getRawPresence(userId)
      if (cancelled) return
      rawRef.current = raw
      const next = deriveDisplayedPresence(raw.status, raw.lastSeen)
      setStatus(prev => (prev === next ? prev : next))
    }, RECHECK_INTERVAL_MS)

    return () => { cancelled = true; unsubscribe(); clearInterval(recheck) }
  }, [userId])

  useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }, [])

  function handlePointerDown() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 1400)
    }, LONG_PRESS_MS)
  }
  function handlePointerUp() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  const colors = PRESENCE_STATUS_COLORS[status]

  return (
    <div className="presence-status-dot-wrap absolute z-20" style={{ top, left }}>
      <div
        className="online-badge-v2 flex items-center justify-center p-1.5 rounded-full"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      >
        <div className="w-2 h-2 rounded-full" style={{
          background: colors.dot, boxShadow: colors.glow,
          transition: 'background 180ms ease, box-shadow 180ms ease',
          animation: status === 'online' ? 'presenceDotPulse 2.4s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Read-only tooltip — current status only */}
      {showTooltip && (
        <div className="absolute text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
          style={{
            top: '100%', left: 0, marginTop: 6, zIndex: 21,
            color: '#fff', background: 'rgba(15,12,25,0.92)',
            border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none',
          }}>
          {presenceStatusTitle(status, lang)}
        </div>
      )}

      <style>{`
        @keyframes presenceDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.25); }
        }
      `}</style>
    </div>
  )
}
