'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { getCurrentMatch } from '@/lib/profiles'
import { APP_COPY } from '@/lib/copy'

const TOTAL = 3   // 3 questions max — then straight to game selection

export default function GameScreen() {
  const { game, question, setUserAnswer, resetGame, navigate, lang } = useApp()
  const t = APP_COPY[lang]
  const [qNum, setQNum] = useState(1)
  const picked = game.userAnswer
  const isLast = qNum >= TOTAL

  const onNext = () => {
    if (!picked) return
    if (isLast) { navigate('game_select') }
    else { resetGame(); setQNum(n => n + 1) }
  }

  return (
    <div className="flex flex-col h-full" style={{
      background: 'linear-gradient(170deg, #0d0d14 0%, #130a18 50%, #0a0d1a 100%)'
    }}>

      {/* Header */}
      <div className="px-6 pt-14 flex-shrink-0">
        <button onClick={() => navigate('profile')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 text-[18px]
            bg-white/[0.06] border border-white/[0.08] active:scale-90 active:bg-white/10 transition-all cursor-pointer">←</button>

        {/* Players */}
        <div className="flex items-center justify-center mt-7 mb-6 gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fd297b] to-[#ff655b]
              flex items-center justify-center text-[24px] ring-2 ring-[#fd297b]/30 ring-offset-2 ring-offset-transparent">😎</div>
            <span className="text-[11px] text-white/30 font-medium tracking-wide">{t.game.you}</span>
          </div>
          <div className="text-[10px] font-black tracking-[3px] text-white/20 uppercase px-2">vs</div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7]
              flex items-center justify-center text-[24px] ring-2 ring-[#6c63ff]/30 ring-offset-2 ring-offset-transparent">{(getCurrentMatch()?.name || "Player")[0]?.toUpperCase() || "?"}</div>
            <span className="text-[11px] text-white/30 font-medium tracking-wide">{(getCurrentMatch()?.name || "Player").toLowerCase()}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i + 1 === qNum ? 22 : 7,
                       background: i < qNum ? 'linear-gradient(90deg,#fd297b,#ff655b)' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>

        {/* Question */}
        <div className="text-white text-[23px] font-extrabold leading-[1.25] tracking-[-0.5px] text-center"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {question.question}
        </div>
      </div>

      {/* Options */}
      <div className="flex-1 px-5 mt-6 flex flex-col gap-2.5 overflow-y-auto pb-2">
        {question.options.map((opt) => {
          const sel = picked === opt.id
          return (
            <button key={opt.id} onClick={() => setUserAnswer(opt.id)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left w-full cursor-pointer
                transition-all duration-200 active:scale-[0.97]"
              style={{
                background: sel ? 'linear-gradient(135deg, rgba(253,41,123,0.15), rgba(255,101,91,0.08))' : 'rgba(255,255,255,0.04)',
                border: sel ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                transform: sel ? 'scale(1.015)' : 'scale(1)',
              }}>
              <span className="text-[26px] flex-shrink-0" style={{ filter: sel ? 'none' : 'grayscale(0.3)' }}>{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold leading-tight"
                  style={{ color: sel ? 'white' : 'rgba(255,255,255,0.8)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{opt.text}</div>
                <div className="text-[12px] mt-0.5" style={{ color: sel ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)' }}>{opt.sub}</div>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{ background: sel ? 'linear-gradient(135deg, #fd297b, #ff655b)' : 'transparent',
                         border: sel ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                         transform: sel ? 'scale(1)' : 'scale(0.85)', opacity: sel ? 1 : 0.4 }}>
                {sel && <span className="text-[10px] text-white font-black">✓</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Single CTA */}
      <div className="px-5 pb-10 pt-4 flex-shrink-0">
        <button onClick={onNext} disabled={!picked}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold transition-all duration-300"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: picked ? 'linear-gradient(135deg, #fd297b, #ff655b)' : 'rgba(255,255,255,0.06)',
            color: picked ? 'white' : 'rgba(255,255,255,0.25)',
            boxShadow: picked ? '0 12px 40px rgba(253,41,123,0.35)' : 'none',
            cursor: picked ? 'pointer' : 'not-allowed',
          }}>
          {picked ? (isLast ? t.game.lastQ : t.game.next) : t.game.ctaEmpty}
        </button>
      </div>
    </div>
  )
}
