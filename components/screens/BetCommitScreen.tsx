'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { getCurrentMatch } from '@/lib/profiles'
import { APP_COPY } from '@/lib/copy'

export default function BetCommitScreen() {
  const { navigate, bet, lockBet, lang } = useApp()
  const t = APP_COPY[lang]
  const RULES = t.commit.rules
  const [read, setRead]       = useState(false)
  const [locking, setLocking] = useState(false)
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    if (countdown <= 0) { setRead(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleLock = () => {
    setLocking(true)
    setTimeout(() => lockBet(), 1400)
  }

  if (locking) return <LockAnimation />

  return (
    <div className="flex flex-col h-full overflow-y-auto"
      style={{ background: '#08080f' }}>

      <div className="px-6 pt-14 pb-6 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('bet')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] mb-6 active:scale-90 cursor-pointer"
          style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.35)', border:'1px solid rgba(255,255,255,0.07)' }}>
          ←
        </button>

        <div className="text-[11px] font-bold tracking-[2.5px] uppercase mb-3"
          style={{ color:'rgba(253,41,123,0.7)' }}>{t.commit.eyebrow}</div>

        <div className="text-[30px] font-extrabold text-white leading-[1.1] tracking-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {t.commit.titleA}<br />
          {t.commit.titleB}<br />
          <span style={{ color:'rgba(255,255,255,0.25)' }}>{t.commit.titleC}</span>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed"
          style={{ color:'rgba(255,255,255,0.38)' }}>
          <span dangerouslySetInnerHTML={{__html: t.commit.intro.replace('{x}', String(bet.amount)).replace('{name}', getCurrentMatch().name)}} />
        </p>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-3">
        {RULES.map((rule, i) => (
          <div key={i} className="flex gap-4 items-start rounded-2xl px-5 py-4"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[22px] flex-shrink-0 mt-0.5">{rule.icon}</span>
            <div>
              <div className="text-[14px] font-bold text-white mb-1"
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {rule.title}
              </div>
              <div className="text-[13px] leading-relaxed"
                style={{ color:'rgba(255,255,255,0.38)' }}>
                {rule.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-10 flex-shrink-0">
        {!read && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex-1 h-[2px] rounded-full overflow-hidden"
              style={{ background:'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  width: `${((4 - countdown) / 4) * 100}%`,
                  transition: 'width 1s linear',
                }} />
            </div>
            <div className="text-[12px] font-bold flex-shrink-0"
              style={{ color:'rgba(255,255,255,0.25)' }}>
              {t.commit.countdown.replace('{s}', String(countdown))}
            </div>
          </div>
        )}

        <button
          onClick={read ? handleLock : undefined}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold transition-all duration-300"
          style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background: read
              ? 'linear-gradient(135deg, #fd297b, #ff655b)'
              : 'rgba(255,255,255,0.06)',
            color: read ? 'white' : 'rgba(255,255,255,0.2)',
            boxShadow: read ? '0 12px 40px rgba(253,41,123,0.4)' : 'none',
            cursor: read ? 'pointer' : 'not-allowed',
          }}>
          {read ? t.commit.ctaReady : t.commit.ctaWait}
        </button>

        <div className="text-center text-[11px] mt-3"
          style={{ color:'rgba(255,255,255,0.15)' }}>
          {t.commit.fine}
        </div>
      </div>
    </div>
  )
}

function LockAnimation() {
  const { lang } = useApp()
  const t = APP_COPY[lang]
  const [phase, setPhase] = useState<'pulse'|'lock'|'done'>('pulse')

  useEffect(() => {
    setTimeout(() => setPhase('lock'), 400)
    setTimeout(() => setPhase('done'), 900)
  }, [])

  return (
    <div className="flex flex-col h-full items-center justify-center"
      style={{ background:'#08080f' }}>
      <div className="relative mb-8" style={{
        transform: phase==='pulse' ? 'scale(0.8)' : 'scale(1)',
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div className="absolute rounded-full"
          style={{
            inset: -20,
            background: 'radial-gradient(circle, rgba(253,41,123,0.25) 0%, transparent 70%)',
            opacity: phase === 'done' ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }} />
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-[44px]"
          style={{
            background: phase === 'done'
              ? 'linear-gradient(135deg, rgba(253,41,123,0.2), rgba(255,101,91,0.1))'
              : 'rgba(255,255,255,0.05)',
            border: phase === 'done'
              ? '2px solid rgba(253,41,123,0.4)'
              : '2px solid rgba(255,255,255,0.08)',
            transition: 'all 0.4s ease',
            boxShadow: phase === 'done' ? '0 0 40px rgba(253,41,123,0.3)' : 'none',
          }}>
          {phase === 'done' ? '🔒' : '🔓'}
        </div>
      </div>

      <div className="text-center px-10"
        style={{
          opacity: phase === 'done' ? 1 : 0,
          transform: phase === 'done' ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s ease 0.1s',
        }}>
        <div className="text-[24px] font-extrabold text-white mb-3 tracking-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {t.commit.locked}
        </div>
        <div className="text-[14px] leading-relaxed"
          style={{ color:'rgba(255,255,255,0.38)' }}>
          <span dangerouslySetInnerHTML={{__html: t.commit.lockedSub.replace(String.fromCharCode(10), '<br />')}} />
        </div>
      </div>
    </div>
  )
}
