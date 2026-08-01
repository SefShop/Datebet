'use client'
import { useState, useEffect, useRef } from 'react'
import {
  PresenceStatus, PRESENCE_STATUS_COLORS,
  getPresenceStatus, setPresenceStatus, subscribePresenceStatus,
  presenceStatusTitle, presenceStatusDescription, presenceStatusToast,
} from '@/lib/presenceStatus'

interface Props {
  userId: string
  interactive: boolean   // true only when viewing your OWN profile
  lang: 'en' | 'gr'
  top?: number
  left?: number
}

const ORDER: PresenceStatus[] = ['online', 'away', 'offline']
const LONG_PRESS_MS = 500

export default function PresenceStatusDot({ userId, interactive, lang, top = 16, left = 16 }: Props) {
  const [status, setStatus] = useState<PresenceStatus>('online')
  const [open, setOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  // Initial fetch + live updates — kept for both read-only and own dot,
  // so a status change made elsewhere (another device, or another
  // currently-mounted view of the same profile) is always reflected.
  useEffect(() => {
    let cancelled = false
    getPresenceStatus(userId).then(s => { if (!cancelled) setStatus(s) })
    const unsubscribe = subscribePresenceStatus(userId, s => { if (!cancelled) setStatus(s) })
    return () => { cancelled = true; unsubscribe() }
  }, [userId])

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  async function choose(next: PresenceStatus) {
    setOpen(false)
    const { ok } = await setPresenceStatus(next)
    if (!ok) return
    setFlash(true)
    setTimeout(() => setFlash(false), 200)
    setStatus(next)
    setToast(presenceStatusToast(next, lang))
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1600)
  }

  function handleClick() {
    if (!interactive) return
    if (longPressFired.current) { longPressFired.current = false; return }
    setOpen(o => !o)
  }

  function handlePointerDown() {
    longPressFired.current = false
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
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
        style={{
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: interactive ? 'pointer' : 'default',
        }}
        onClick={handleClick}
        onMouseEnter={() => { if (!interactive || !open) setShowTooltip(true) }}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? presenceStatusTitle(status, lang) : undefined}
      >
        <div className="w-2 h-2 rounded-full" style={{
          background: colors.dot, boxShadow: colors.glow,
          transition: 'background 180ms ease, box-shadow 180ms ease',
          animation: status === 'online' ? 'presenceDotPulse 2.4s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Tooltip — current status only, small and unobtrusive */}
      {showTooltip && !open && (
        <div className="absolute text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
          style={{
            top: '100%', left: 0, marginTop: 6, zIndex: 21,
            color: '#fff', background: 'rgba(15,12,25,0.92)',
            border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none',
          }}>
          {presenceStatusTitle(status, lang)}
        </div>
      )}

      {/* Own-profile selector popover */}
      {interactive && open && (
        <>
          <div className="fixed inset-0 z-[19]" onClick={() => setOpen(false)} />
          <div className="absolute rounded-2xl overflow-hidden z-[22]"
            style={{
              top: '100%', left: 0, marginTop: 8, width: 220,
              background: 'rgba(15,12,25,0.97)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(253,41,123,0.28)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}>
            {ORDER.map(s => {
              const c = PRESENCE_STATUS_COLORS[s]
              return (
                <button key={s} onClick={() => choose(s)}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left active:opacity-70 cursor-pointer"
                  style={{ background: s === status ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none' }}>
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: c.dot, boxShadow: c.glow }} />
                  <div>
                    <div className="text-[12.5px] font-bold text-white leading-tight">{presenceStatusTitle(s, lang)}</div>
                    <div className="text-[10.5px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {presenceStatusDescription(s, lang)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Confirmation toast */}
      {toast && (
        <div className="fixed text-[12px] font-semibold text-center px-4 py-2 rounded-full"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 80px)', left: '50%', transform: 'translateX(-50%)',
            zIndex: 60, color: '#fff', background: 'rgba(20,14,28,0.9)',
            border: '1px solid rgba(255,51,132,0.35)', boxShadow: '0 4px 20px rgba(253,41,123,0.35)',
            pointerEvents: 'none', maxWidth: 280,
          }}>
          {toast}
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
