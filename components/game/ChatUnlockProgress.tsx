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
export default function ChatUnlockProgress({ currentProgress, targetProgress = 10, isUnlocked, lang }: Props) {
  const clamped = Math.max(0, Math.min(currentProgress, targetProgress))
  const remaining = targetProgress - clamped
  const pct = (clamped / targetProgress) * 100

  // Only ever show the completed state if THIS mounted instance actually
  // witnessed the locked→unlocked transition live — never on a mount
  // that's already unlocked (a different, later completed-game screen,
  // or this same one after a refresh). prevRef starts at the CURRENT
  // value, not unconditionally false, which is exactly what prevents a
  // false positive on mount.
  const [justUnlocked, setJustUnlocked] = useState(false)
  const prevUnlockedRef = useRef(isUnlocked)
  useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) setJustUnlocked(true)
    prevUnlockedRef.current = isUnlocked
  }, [isUnlocked])

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

  if (isUnlocked && !justUnlocked) return null

  const showCompleted = isUnlocked && justUnlocked

  const title = lang === 'gr' ? 'Πρόοδος Ξεκλειδώματος Chat' : 'Chat Unlock Progress'
  const helperText = showCompleted
    ? (lang === 'gr' ? 'Το chat ξεκλειδώθηκε' : 'Chat Unlocked')
    : remaining === 1
      ? (lang === 'gr' ? 'Απομένει 1 παιχνίδι για να ξεκλειδώσει το chat' : '1 more game to unlock chat')
      : (lang === 'gr' ? `Απομένουν ${remaining} παιχνίδια για να ξεκλειδώσει το chat` : `${remaining} more games to unlock chat`)

  return (
    <div className="w-full rounded-2xl px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: showCompleted ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(216,77,216,0.22)',
        boxShadow: showCompleted
          ? '0 0 20px rgba(74,222,128,0.18)'
          : (pulse ? '0 0 16px rgba(216,77,216,0.28)' : 'none'),
        transition: 'box-shadow 0.5s ease',
      }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
          <span style={{ fontSize: 13 }}>{showCompleted ? '✓' : '🔒'}</span>
          {title}
        </div>
        {!showCompleted && (
          <div className="text-[12.5px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {clamped} / {targetProgress}
          </div>
        )}
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%',
          width: `${showCompleted ? 100 : pct}%`,
          borderRadius: 999,
          background: showCompleted
            ? 'linear-gradient(90deg,#4ade80,#22c55e)'
            : 'linear-gradient(90deg,#ff3384,#d84dd8)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div className="text-[11px] mt-2" style={{ color: showCompleted ? '#4ade80' : 'rgba(255,255,255,0.45)' }}>
        {helperText}
      </div>
    </div>
  )
}
