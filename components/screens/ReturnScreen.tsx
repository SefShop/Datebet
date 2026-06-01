'use client'

import { useEffect, useState } from 'react'
import { ReturnState } from '@/types'
import { formatAbsence } from '@/lib/reengagement'

interface ReturnScreenProps {
  returnState: ReturnState
  onContinue: () => void
}

export default function ReturnScreen({ returnState, onContinue }: ReturnScreenProps) {
  const [show, setShow]       = useState(false)
  const [eventShow, setEv]    = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true),  80)
    setTimeout(() => setEv(true),    700)
  }, [])

  const absenceLabel = formatAbsence(returnState.absenceMs)

  // Tier-specific visual intensity
  const isUrgent = ['long','very_long'].includes(returnState.absenceTier)
  const accentColor = isUrgent ? '#ff655b' : '#fd297b'

  return (
    <div className="flex flex-col h-full items-center justify-between py-16 px-7 relative overflow-hidden"
      style={{ background: isUrgent
        ? 'linear-gradient(170deg, #0f0808 0%, #180a0a 60%, #0a0810 100%)'
        : 'linear-gradient(170deg, #080810 0%, #0e0614 60%, #080a14 100%)'
      }}>

      {/* Ambient glow — colour reflects urgency */}
      <div className="absolute pointer-events-none"
        style={{
          width: 420, height: 420,
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
          animation: 'breathe 3s ease-in-out infinite',
        }} />

      {/* Top — time badge + headline */}
      <div className="w-full relative z-10"
        style={{
          opacity:   show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

        {/* Absence badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}30`,
          }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="text-[11px] font-bold tracking-[1.5px] uppercase"
            style={{ color: accentColor }}>
            away for {absenceLabel}
          </span>
        </div>

        {/* Headline — large, stark */}
        <div className="text-[30px] font-extrabold text-white leading-[1.1] tracking-tight mb-4"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {returnState.headline}
        </div>

        <div className="text-[15px] leading-relaxed"
          style={{ color:'rgba(255,255,255,0.38)' }}>
          {returnState.sub}
        </div>
      </div>

      {/* Middle — what happened card */}
      <div className="w-full relative z-10"
        style={{
          opacity:   eventShow ? 1 : 0,
          transform: eventShow ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.55s ease',
        }}>

        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-3"
          style={{ color:'rgba(255,255,255,0.2)' }}>
          while you were gone
        </div>

        {/* Single event card — feels like a notification */}
        <div className="rounded-2xl px-5 py-4 flex items-start gap-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${accentColor}25`,
          }}>
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[20px]"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
            👀
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-white mb-1"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {returnState.event}
            </div>
            <div className="text-[11px]" style={{ color:'rgba(255,255,255,0.3)' }}>
              {absenceLabel} ago
            </div>
          </div>
          {/* Unread dot */}
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
            style={{ background: accentColor, boxShadow:`0 0 6px ${accentColor}` }} />
        </div>

        {/* Tension line */}
        <div className="mt-4 text-center text-[12px] italic"
          style={{ color:'rgba(255,255,255,0.2)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {returnState.absenceTier === 'very_long' && '"a day is long in this game."'}
          {returnState.absenceTier === 'long'      && '"the longer you wait, the more changes."'}
          {returnState.absenceTier === 'medium'    && '"a few hours changes the dynamic."'}
          {returnState.absenceTier === 'short'     && '"even a few minutes matters here."'}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full relative z-10"
        style={{
          opacity:   eventShow ? 1 : 0,
          transform: eventShow ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.55s ease 0.15s',
        }}>
        <button
          onClick={onContinue}
          className="w-full rounded-2xl py-[18px] text-[17px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background: `linear-gradient(135deg, ${accentColor}, #fd297b)`,
            color: 'white',
            boxShadow: `0 12px 40px ${accentColor}40`,
          }}>
          {returnState.cta}
        </button>

        <button
          onClick={onContinue}
          className="w-full text-[13px] py-3 mt-1 active:opacity-50 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.2)' }}>
          ignore it
        </button>
      </div>

      <style>{`
        @keyframes breathe {
          0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}
          50%{transform:translate(-50%,-50%) scale(1.15);opacity:1}
        }
      `}</style>
    </div>
  )
}
