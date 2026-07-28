'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  currentProgress: number
  targetProgress?: number
  isUnlocked: boolean
  lang: string
}

// Presentation only — reuses whatever currentProgress/isUnlocked the
// calling game screen already computes from its own real pairCount
// state (the same source FloatingChatButton's own lock state already
// uses). Never calculates or persists progress itself, never touches
// unlock conditions, never triggers the existing unlock notification —
// it only reflects state that already exists elsewhere.
//
// Renders only while locked. As soon as isUnlocked is true — whether
// that's a live transition witnessed on this screen or the state the
// component mounted with — it renders nothing at all. No completed/10
// state, no flash on mount for an already-unlocked user.
export default function ChatUnlockProgress({ currentProgress, targetProgress = 10, isUnlocked, lang }: Props) {
  const clamped = Math.max(0, Math.min(currentProgress, targetProgress))
  const remaining = targetProgress - clamped
  const pct = (clamped / targetProgress) * 100

  // One-shot pulse only when progress genuinely increases after mount —
  // never on first render, never replayed on an unrelated re-render.
  const [pulse, setPulse] = useState(false)
  const prevProgressRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (prevProgressRef.current !== undefined && clamped > prevProgressRef.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 700)
      prevProgressRef.current = clamped
      return () => clearTimeout(t)
    }
    prevProgressRef.current = clamped
  }, [clamped])

  if (isUnlocked) return null

  const title = lang === 'gr' ? 'Πρόοδος Ξεκλειδώματος Chat' : 'Chat Unlock Progress'
  const helperText = remaining === 1
    ? (lang === 'gr' ? 'Απομένει 1 παιχνίδι για να ξεκλειδώσει το chat' : '1 more game to unlock chat')
    : (lang === 'gr' ? `Απομένουν ${remaining} παιχνίδια για να ξεκλειδώσει το chat` : `${remaining} more games to unlock chat`)

  return (
    <div className="w-full rounded-2xl px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(216,77,216,0.22)',
        boxShadow: pulse ? '0 0 16px rgba(216,77,216,0.28)' : 'none',
        transition: 'box-shadow 0.5s ease',
      }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          {title}
        </div>
        <div className="text-[12.5px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {clamped} / {targetProgress}
        </div>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 999,
          background: 'linear-gradient(90deg,#ff3384,#d84dd8)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div className="text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {helperText}
      </div>
    </div>
  )
}
