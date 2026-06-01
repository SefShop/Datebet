'use client'

import { useEffect, useState, useMemo } from 'react'
import { useApp } from '@/lib/AppContext'
import {
  pickRandom, MATCH_HEADLINES, NO_MATCH_HEADLINES,
  MATCH_SUBTEXT, NO_MATCH_SUBTEXT,
  DUEL_CTA, getCompatLabel,
} from '@/lib/voice'
import { APP_COPY } from '@/lib/copy'
import { getMemoryLine, getTensionLine, getAlmostMatchLine, getEndHook, REAL_DUEL_MODAL } from '@/lib/anticipation'

export default function ResultScreen() {
  const { game, question, navigate, personalization, session, lang, playAgain } = useApp()
  const t = APP_COPY[lang]
  const [phase, setPhase] = useState(0)
  const [showRealDuel, setShowRealDuel] = useState(false)

  // Social-presence / anticipation layer (computed once)
  const anticip = useMemo(() => ({
    memory:  getMemoryLine(session, lang),
    tension: getTensionLine(session, lang),
    almost:  getAlmostMatchLine(!!game.isMatch, game.compatibilityScore, lang),
    endHook: getEndHook(session, lang),
  }), [lang])  // re-derive when language switches

  useEffect(() => {
    [100,320,560,820,1050].forEach((ms,i) => setTimeout(()=>setPhase(i+1), ms))
  }, [])

  const copy = useMemo(() => ({
    headline: pickRandom(game.isMatch ? MATCH_HEADLINES[lang] : NO_MATCH_HEADLINES[lang]),
    subtext:  pickRandom(game.isMatch ? MATCH_SUBTEXT[lang]   : NO_MATCH_SUBTEXT[lang]),
    compat:   getCompatLabel(game.compatibilityScore, lang),
    cta:      game.isMatch ? DUEL_CTA[lang].match : DUEL_CTA[lang].noMatch,
  }), [lang])  // re-derive when language switches

  const userOpt = question.options.find(o => o.id === game.userAnswer)
  const oppOpt  = question.options.find(o => o.id === game.opponentAnswer)

  const fadeUp = (visible: boolean, delay = '0ms') => ({
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.5s ease ${delay}, transform 0.5s ease ${delay}`,
  })

  // Which personalization lines to show (max 2 to avoid feeling scripted)
  const personalLines = [
    anticip.memory,
    personalization.progressionObs,
    anticip.tension,
    personalization.boldObs,
    personalization.patternObs ?? personalization.egoHook,
  ].filter(Boolean).slice(0, 3) as string[]

  return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 overflow-y-auto"
      style={{ background:'linear-gradient(170deg, #0a0a10 0%, #100814 60%, #080a14 100%)' }}>

      {/* Headline */}
      <div className="mb-6" style={fadeUp(phase>=1)}>
        <div className="font-extrabold text-white leading-[1.1] mb-3 whitespace-pre-line"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:'clamp(26px,7vw,32px)', letterSpacing:'-0.5px' }}>
          {copy.headline}
        </div>
        <div className="text-[14px] leading-relaxed" style={{ color:'rgba(255,255,255,0.38)' }}>
          {copy.subtext}
        </div>
        {anticip.almost && (
          <div className="text-[13px] font-semibold mt-2.5" style={{ color:'#ff8c42', animation:'fadeIn 0.6s ease 0.4s both' }}>
            {anticip.almost}
          </div>
        )}
      </div>

      {/* Compat arc */}
      <div className="mb-4" style={fadeUp(phase>=2,'60ms')}>
        <CompatArc score={game.compatibilityScore} label={copy.compat.label} color={copy.compat.color} vibeLabel={t.result.vibeReading} />
      </div>

      {/* Answers */}
      <div className="flex flex-col gap-2 mb-4" style={fadeUp(phase>=3,'80ms')}>
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1"
          style={{ color:'rgba(255,255,255,0.2)' }}>
          {game.isMatch ? 'you both said' : 'the comparison'}
        </div>
        <AnswerRow avatar="😎" name="you" gradient="from-[#fd297b] to-[#ff655b]" opt={userOpt} match={!!game.isMatch} />
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.05)' }} />
          <span className="text-[10px] tracking-[1.5px] uppercase font-semibold"
            style={{ color:'rgba(255,255,255,0.15)' }}>
            {game.isMatch ? '= same' : '≠ different'}
          </span>
          <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.05)' }} />
        </div>
        <AnswerRow avatar="👩" name="sofia" gradient="from-[#6c63ff] to-[#a855f7]" opt={oppOpt} match={!!game.isMatch} />
      </div>

      {/* ── Personalization block ── */}
      {personalLines.length > 0 && (
        <div className="mb-5 flex flex-col gap-2" style={fadeUp(phase>=4,'100ms')}>
          {personalLines.map((line, i) => (
            <PersonalizationLine key={i} text={line} index={i} />
          ))}
        </div>
      )}

      {/* FEATURE 6 — end hook (round 3+) */}
      {anticip.endHook && (
        <div className="mb-3" style={fadeUp(phase>=5,'80ms')}>
          <div className="text-center text-[13px] italic mb-2.5" style={{ color:'rgba(255,255,255,0.4)' }}>
            {anticip.endHook.line}
          </div>
          <button onClick={() => setShowRealDuel(true)}
            className="w-full rounded-2xl py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background:'rgba(253,41,123,0.1)',
              color:'#fd297b',
              border:'1px solid rgba(253,41,123,0.3)',
            }}>
            {anticip.endHook.cta}
          </button>
        </div>
      )}

      {/* CTAs */}
      <div className="mt-auto flex flex-col gap-2.5" style={fadeUp(phase>=5,'120ms')}>
        <button onClick={() => navigate('game_select')}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background:'linear-gradient(135deg, #fd297b, #ff655b)',
            color:'white',
            boxShadow:'0 12px 40px rgba(253,41,123,0.35)',
          }}>
          {t.result.continue}
        </button>
        <div className="flex gap-2.5">
          <button onClick={playAgain}
            className="flex-1 rounded-2xl py-[14px] text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
            {t.result.playAgain}
          </button>
          <button onClick={() => navigate('bet')}
            className="flex-1 rounded-2xl py-[14px] text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
            {copy.cta}
          </button>
        </div>
        <button onClick={() => navigate('home')}
          className="w-full text-[13px] font-medium py-1.5 active:opacity-60 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.22)' }}>
          {t.result.nextProfile}
        </button>
      </div>

      {/* FEATURE 6 — real-duel coming-soon modal (UI only) */}
      {showRealDuel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8"
          style={{ background:'rgba(6,6,10,0.82)', backdropFilter:'blur(8px)', animation:'fadeIn 0.25s ease both' }}
          onClick={() => setShowRealDuel(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full rounded-3xl p-7 text-center"
            style={{
              background:'linear-gradient(160deg, #160c16, #0e0814)',
              border:'1px solid rgba(253,41,123,0.25)',
              boxShadow:'0 24px 80px rgba(253,41,123,0.2)',
              animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
            <div className="text-[40px] mb-3">🔥</div>
            <div className="text-[20px] font-extrabold text-white mb-2 tracking-tight"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {REAL_DUEL_MODAL[lang].title}
            </div>
            <div className="text-[14px] leading-relaxed mb-6" style={{ color:'rgba(255,255,255,0.45)' }}>
              {REAL_DUEL_MODAL[lang].body}
            </div>
            <button onClick={() => setShowRealDuel(false)}
              className="w-full rounded-2xl py-3.5 text-[15px] font-bold cursor-pointer active:scale-95 transition-transform"
              style={{ background:'linear-gradient(135deg, #fd297b, #ff655b)', color:'white' }}>
              {REAL_DUEL_MODAL[lang].close}
            </button>
          </div>
          <style>{`
            @keyframes popIn { from{opacity:0;transform:scale(0.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
          `}</style>
        </div>
      )}
    </div>
  )
}

// ── Personalization line component ─────────────────────────────
function PersonalizationLine({ text, index }: { text: string; index: number }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{
        background: index === 0
          ? 'rgba(253,41,123,0.07)'
          : 'rgba(255,255,255,0.03)',
        border: index === 0
          ? '1px solid rgba(253,41,123,0.18)'
          : '1px solid rgba(255,255,255,0.06)',
        animation: `fadeSlideIn 0.45s ease ${index * 0.12}s both`,
      }}
    >
      {/* Small eye icon — "she noticed" */}
      <span className="text-[14px] flex-shrink-0 mt-0.5" style={{ opacity: 0.6 }}>
        {index === 0 ? '👁' : '↳'}
      </span>
      <div className="text-[13px] leading-snug"
        style={{
          color: index === 0 ? 'rgba(253,41,123,0.85)' : 'rgba(255,255,255,0.38)',
          fontFamily:"'Plus Jakarta Sans',sans-serif",
          fontStyle: index === 1 ? 'italic' : 'normal',
        }}>
        {text}
      </div>
    </div>
  )
}

// ── CompatArc ──────────────────────────────────────────────────
function CompatArc({ score, label, color, vibeLabel }: { score:number; label:string; color:string; vibeLabel:string }) {
  const [go, setGo] = useState(false)
  useEffect(() => { setTimeout(()=>setGo(true), 200) }, [])
  const r=52, cx=72, cy=72, total=Math.PI*r, fill=go?(score/100)*total:0

  return (
    <div className="flex items-center gap-5 rounded-2xl p-5 border"
      style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.07)' }}>
      <div className="relative flex-shrink-0" style={{ width:72, height:44 }}>
        <svg width="144" height="88" viewBox="0 0 144 88"
          style={{ transform:'scale(0.5)', transformOrigin:'top left' }}>
          <path d={`M${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
          <path d={`M${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${total}`} strokeDashoffset={total-fill}
            style={{ transition:'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
          <text x={cx} y={cy-4} textAnchor="middle" fill="white"
            fontSize="28" fontWeight="800" fontFamily="'Plus Jakarta Sans',sans-serif">
            {go?score:0}
          </text>
          <text x={cx} y={cy+16} textAnchor="middle" fill="rgba(255,255,255,0.25)"
            fontSize="12" fontWeight="500">%</text>
        </svg>
      </div>
      <div>
        <div className="text-[10px] font-semibold tracking-[1.5px] uppercase mb-1.5"
          style={{ color:'rgba(255,255,255,0.25)' }}>{vibeLabel}</div>
        <div className="text-[16px] font-bold" style={{ color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {label}
        </div>
      </div>
    </div>
  )
}

// ── AnswerRow ──────────────────────────────────────────────────
interface AnswerRowProps {
  avatar:string; name:string; gradient:string
  opt?: { emoji:string; text:string }; match:boolean
}
function AnswerRow({ avatar, name, gradient, opt, match }: AnswerRowProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 border"
      style={{
        background: match?'rgba(253,41,123,0.06)':'rgba(255,255,255,0.03)',
        borderColor: match?'rgba(253,41,123,0.2)':'rgba(255,255,255,0.06)',
      }}>
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[17px] flex-shrink-0`}>
        {avatar}
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-semibold tracking-wide uppercase mb-0.5"
          style={{ color:'rgba(255,255,255,0.25)' }}>{name}</div>
        <div className="text-[14px] font-bold text-white">{opt?.emoji} {opt?.text}</div>
      </div>
      {match && <div className="text-[16px]" style={{ animation:'pulse 2s ease infinite' }}>🔥</div>}
    </div>
  )
}
