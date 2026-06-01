'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { MOCK_PROFILE, BET_AMOUNTS } from '@/lib/data'
import SofiaAvatar from '@/components/ui/SofiaAvatar'
import {
  ScriptEntry, PresenceEvent,
  pickScript, resolveDelay, TONE_COLOR,
} from '@/lib/presence'

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function BetLockedScreen() {
  const { navigate, bet, lang } = useApp()
  const t = APP_COPY[lang]

  // Presence state
  const [currentEvent, setCurrentEvent] = useState<PresenceEvent | null>(null)
  const [locked, setLocked]             = useState(false)
  const [history, setHistory]           = useState<string[]>([])  // status log
  const scriptRef = useRef<ScriptEntry[]>([])
  const stepRef   = useRef(0)

  // Countdown
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Run the presence script ──────────────────────────────────
  useEffect(() => {
    scriptRef.current = pickScript()
    stepRef.current   = 0
    runNextStep()
  }, [])  // eslint-disable-line

  function runNextStep() {
    const script = scriptRef.current
    const idx    = stepRef.current
    if (idx >= script.length) return

    const entry = script[idx]
    const delay = resolveDelay(entry)

    setTimeout(() => {
      const event: PresenceEvent = {
        id:           `${entry.status}-${idx}`,
        status:       entry.status,
        headline:     entry.headline,
        sub:          entry.sub,
        avatarPulse:  entry.avatarPulse,
        avatarGlow:   entry.avatarGlow,
        tone:         entry.tone,
      }

      setCurrentEvent(event)
      setHistory(h => [...h.slice(-4), entry.headline])  // keep last 5

      if (entry.status === 'locked_in') {
        setLocked(true)
      } else {
        stepRef.current = idx + 1
        runNextStep()
      }
    }, delay)
  }

  const expires   = bet.expiresAt ?? (Date.now() + 86_400_000)
  const remaining = Math.max(0, expires - now)
  const pct       = Math.min(100, ((86_400_000 - remaining) / 86_400_000) * 100)
  const toneColor = currentEvent ? TONE_COLOR[currentEvent.tone] : 'rgba(255,255,255,0.3)'

  if (locked) return <BothLockedScreen amount={bet.amount} onNext={() => navigate('home')} />

  return (
    <div className="flex flex-col h-full"
      style={{ background:'linear-gradient(170deg, #080810 0%, #0e0614 60%, #080a14 100%)' }}>

      {/* Status bar */}
      <div className="flex justify-between px-7 pt-4 text-[13px] font-semibold flex-shrink-0"
        style={{ color:'rgba(255,255,255,0.2)' }}>
        <span>9:41</span><span>●●● 100%</span>
      </div>

      {/* Header */}
      <div className="px-6 pt-5 flex-shrink-0">
        <div className="text-[11px] font-bold tracking-[2.5px] uppercase mb-2"
          style={{ color:'rgba(253,41,123,0.6)' }}>bet placed</div>
        <div className="text-[28px] font-extrabold text-white leading-tight tracking-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          duel active.
        </div>
      </div>

      {/* ── Presence card — the main actor ── */}
      <div className="mx-5 mt-5 rounded-3xl overflow-hidden flex-shrink-0"
        style={{
          background:'rgba(255,255,255,0.03)',
          border:`1px solid ${toneColor}40`,
          transition:'border-color 0.8s ease',
        }}>

        {/* Avatar + headline */}
        <div className="flex items-center gap-5 px-5 pt-5 pb-4">
          <SofiaAvatar event={currentEvent} locked={false} />

          <div className="flex-1 min-w-0">
            {/* Headline — fades between states */}
            <div key={currentEvent?.id ?? 'idle'}
              className="text-[17px] font-bold text-white leading-tight mb-1.5"
              style={{
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                animation:'fadeSlideIn 0.4s ease both',
              }}>
              {currentEvent?.headline ?? 'waiting...'}
            </div>
            <div key={`sub-${currentEvent?.id}`}
              className="text-[12px] leading-snug"
              style={{
                color: toneColor,
                animation:'fadeSlideIn 0.4s ease 0.05s both',
                transition:'color 0.8s ease',
              }}>
              {currentEvent?.sub ?? "she'll see it soon."}
            </div>
          </div>
        </div>

        {/* Activity log — scrolls up, last 5 events */}
        {history.length > 1 && (
          <div className="px-5 pb-4 flex flex-col gap-1.5"
            style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:14 }}>
            <div className="text-[9px] font-bold tracking-[2px] uppercase mb-1"
              style={{ color:'rgba(255,255,255,0.15)' }}>activity log</div>
            {history.slice(0,-1).reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background:'rgba(255,255,255,0.15)' }} />
                <div className="text-[11px]"
                  style={{ color:`rgba(255,255,255,${0.22 - i * 0.04})` }}>
                  {h}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="mx-5 mt-3 rounded-2xl px-5 py-4 flex-shrink-0"
        style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-[9px] font-bold tracking-[2px] uppercase mb-1"
              style={{ color:'rgba(255,255,255,0.2)' }}>expires in</div>
            <div className="text-[32px] font-extrabold text-white tabular-nums leading-none"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-1px' }}>
              {formatCountdown(remaining)}
            </div>
          </div>

          {/* Your status */}
          <div className="text-right">
            <div className="text-[9px] font-bold tracking-[2px] uppercase mb-1"
              style={{ color:'rgba(255,255,255,0.2)' }}>{t.locked.you}</div>
            <div className="text-[12px] font-bold" style={{ color:'#4ade80' }}>
              locked in ✓
            </div>
            <div className="text-[11px] font-bold" style={{ color:'#fd297b' }}>
              €{bet.amount}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="h-[2px] rounded-full overflow-hidden"
          style={{ background:'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width:`${pct}%`,
              background: pct>75 ? 'linear-gradient(90deg,#fd297b,#ff3b30)'
                : pct>40 ? 'linear-gradient(90deg,#ff8c42,#fd297b)'
                : 'linear-gradient(90deg,#6c63ff,#ff8c42)',
            }} />
        </div>
      </div>

      {/* Tone indicator — subtle emotional hint */}
      {currentEvent && currentEvent.tone !== 'neutral' && (
        <div className="mx-5 mt-3 flex-shrink-0">
          <div key={currentEvent.tone}
            className="text-center text-[12px] italic"
            style={{
              color: toneColor,
              opacity: 0.7,
              animation:'fadeIn 0.6s ease both',
              fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>
            {currentEvent.tone === 'tense'     && '"the silence says something."'}
            {currentEvent.tone === 'uncertain' && '"could go either way."'}
            {currentEvent.tone === 'hopeful'   && '"this is looking good."'}
            {currentEvent.tone === 'relief'    && '"almost there."'}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-auto px-5 pb-10 flex flex-col gap-3 flex-shrink-0">
        <button onClick={() => navigate('home')}
          className="w-full rounded-2xl py-4 text-[14px] font-semibold cursor-pointer active:scale-95 transition-transform"
          style={{
            background:'rgba(255,255,255,0.04)',
            color:'rgba(255,255,255,0.35)',
            border:'1px solid rgba(255,255,255,0.07)',
            fontFamily:"'Plus Jakarta Sans',sans-serif",
          }}>
          back to home
        </button>
        <div className="text-center text-[10px]" style={{ color:'rgba(255,255,255,0.12)' }}>
          {t.locked.footer}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
      `}</style>
    </div>
  )
}

// ── Both locked in ─────────────────────────────────────────────────────────
function BothLockedScreen({ amount, onNext }: { amount: number; onNext: ()=>void }) {
  const { lang } = useApp()
  const t = APP_COPY[lang]
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(()=>setShow(true), 100) }, [])

  // Fake locked-in event for avatar
  const lockedEvent = {
    id: 'locked', status: 'locked_in' as const,
    headline: "she committed.",
    sub: "you're both in.",
    avatarPulse: 'strong' as const,
    avatarGlow: 'rgba(253,41,123,0.9)',
    tone: 'relief' as const,
  }

  return (
    <div className="flex flex-col h-full items-center justify-center px-8"
      style={{ background:'linear-gradient(170deg, #080810 0%, #0e0614 100%)' }}>

      <div className="absolute rounded-full pointer-events-none"
        style={{
          width:380, height:380, top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          background:'radial-gradient(circle, rgba(253,41,123,0.13) 0%, transparent 65%)',
          animation:'breatheAmbient 2.5s ease-in-out infinite',
        }} />

      <div className="text-center relative z-10 w-full"
        style={{
          opacity:show?1:0, transform:show?'translateY(0)':'translateY(20px)',
          transition:'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

        {/* Two avatars — both lit */}
        <div className="flex items-center justify-center gap-5 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#fd297b] to-[#ff655b]
              flex items-center justify-center text-[28px]"
              style={{ boxShadow:'0 0 24px rgba(253,41,123,0.5)', animation:'float 3s ease-in-out infinite' }}>
              😎
            </div>
            <div className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color:'rgba(255,255,255,0.4)' }}>{t.locked.you}</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="text-[9px] font-black tracking-[3px] uppercase"
              style={{ color:'rgba(255,255,255,0.2)' }}>{t.locked.bothIn}</div>
            <div className="text-[20px]" style={{ animation:'pulse 1.5s ease infinite' }}>🔒</div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <SofiaAvatar event={lockedEvent} locked={true} />
            <div className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color:'rgba(255,255,255,0.4)' }}>{t.locked.sofia}</div>
          </div>
        </div>

        <div className="text-[26px] font-extrabold text-white leading-tight mb-3 tracking-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {t.locked.successTitle}<br />
          <span style={{ color:'rgba(255,255,255,0.35)' }}>{t.locked.successAccent}</span>
        </div>

        <div className="text-[14px] leading-relaxed mb-7"
          style={{ color:'rgba(255,255,255,0.35)' }}>
          <span dangerouslySetInnerHTML={{__html: t.locked.successSub.replace('{x}', String(amount)).replace(String.fromCharCode(10), '<br />')}} />
        </div>

        {/* Stakes */}
        <div className="rounded-2xl px-5 py-4 mb-7 text-left w-full"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[13px] font-bold text-white">{t.locked.rewardLabel}</span>
            <span className="text-[13px] font-bold" style={{ color:'#4ade80' }}>{t.locked.reward.replace('{x}', String(amount*2))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-white">{t.locked.penaltyLabel}</span>
            <span className="text-[13px] font-bold" style={{ color:'#fd297b' }}>{t.locked.penalty.replace('{x}', String(amount))}</span>
          </div>
        </div>

        <button onClick={onNext}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold cursor-pointer active:scale-95 transition-transform"
          style={{
            background:'linear-gradient(135deg, #fd297b, #ff655b)', color:'white',
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            boxShadow:'0 12px 40px rgba(253,41,123,0.4)',
          }}>
          {t.locked.ctaDontGhost}
        </button>
      </div>

      <style>{`
        @keyframes breatheAmbient {
          0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}
          50%{transform:translate(-50%,-50%) scale(1.2);opacity:1}
        }
        @keyframes float {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
        }
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.9)}
        }
      `}</style>
    </div>
  )
}
