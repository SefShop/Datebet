'use client'

import { useApp } from '@/lib/AppContext'
import { MOCK_PROFILE } from '@/lib/data'
import { APP_COPY } from '@/lib/copy'

export default function GameScreen() {
  const { game, question, setUserAnswer, resolveGame, navigate, session, lang } = useApp()
  const t = APP_COPY[lang]

  // Whisper from previous round — appears subtly above the question
  const whisper = session.roundCount > 0 && session.boldness
    ? session.boldness === 'bold'   ? t.game.whisperBold
    : session.boldness === 'honest' ? t.game.whisperHonest
    : session.boldness === 'safe'   ? t.game.whisperSafe
    : null
    : null
  const picked = game.userAnswer

  return (
    <div className="flex flex-col h-full" style={{
      background: 'linear-gradient(170deg, #0d0d14 0%, #130a18 50%, #0a0d1a 100%)'
    }}>

      {/* Header */}
      <div className="px-6 pt-14 flex-shrink-0">
        <button
          onClick={() => navigate('home')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 text-[18px]
            bg-white/[0.06] border border-white/[0.08] active:scale-90 active:bg-white/10
            transition-all cursor-pointer"
        >←</button>

        {/* Players */}
        <div className="flex items-center justify-center mt-7 mb-8 gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fd297b] to-[#ff655b]
              flex items-center justify-center text-[24px] ring-2 ring-[#fd297b]/30 ring-offset-2 ring-offset-transparent">
              😎
            </div>
            <span className="text-[11px] text-white/30 font-medium tracking-wide">{t.game.you}</span>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="text-[10px] font-black tracking-[3px] text-white/20 uppercase">vs</div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-[#fd297b]/40"
                  style={{ animation: `dotPulse 1.4s ease-in-out ${i*0.18}s infinite` }} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7]
              flex items-center justify-center text-[24px] ring-2 ring-[#6c63ff]/30 ring-offset-2 ring-offset-transparent">
              {MOCK_PROFILE.emoji}
            </div>
            <span className="text-[11px] text-white/30 font-medium tracking-wide">{MOCK_PROFILE.name.toLowerCase()}</span>
          </div>
        </div>

        {/* Question label */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[2px] uppercase px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(253,41,123,0.12)', color: '#fd297b', border: '1px solid rgba(253,41,123,0.2)' }}>
            {question.type}
          </span>
          {/* Previous-round whisper — shows only from round 2 onward */}
          {whisper && (
            <span className="text-[11px] italic"
              style={{ color:'rgba(255,255,255,0.22)', animation:'fadeIn 0.6s ease both' }}>
              {whisper}
            </span>
          )}
        </div>

        {/* Question */}
        <div className="text-white text-[22px] font-extrabold leading-[1.25] tracking-[-0.5px]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {question.question}
        </div>
      </div>

      {/* Timer */}
      <div className="mx-6 mt-5 flex-shrink-0">
        <div className="flex justify-between text-[11px] text-white/20 font-medium mb-1.5">
          <span>{t.game.timer}</span><span>13s</span>
        </div>
        <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full w-[65%] rounded-full"
            style={{ background: 'linear-gradient(90deg, #fd297b, #ff655b)' }} />
        </div>
      </div>

      {/* Options */}
      <div className="flex-1 px-5 mt-5 flex flex-col gap-2.5 overflow-y-auto pb-2">
        {question.options.map((opt) => {
          const sel = picked === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setUserAnswer(opt.id)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left w-full cursor-pointer
                transition-all duration-200 active:scale-[0.97]"
              style={{
                background: sel
                  ? 'linear-gradient(135deg, rgba(253,41,123,0.15), rgba(255,101,91,0.08))'
                  : 'rgba(255,255,255,0.04)',
                border: sel
                  ? '1.5px solid rgba(253,41,123,0.5)'
                  : '1.5px solid rgba(255,255,255,0.07)',
                transform: sel ? 'scale(1.015)' : 'scale(1)',
              }}
            >
              <span className="text-[26px] flex-shrink-0" style={{ filter: sel ? 'none' : 'grayscale(0.3)' }}>
                {opt.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold leading-tight"
                  style={{ color: sel ? 'white' : 'rgba(255,255,255,0.8)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {opt.text}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: sel ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)' }}>
                  {opt.sub}
                </div>
              </div>
              {/* Checkmark */}
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: sel ? 'linear-gradient(135deg, #fd297b, #ff655b)' : 'transparent',
                  border: sel ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                  transform: sel ? 'scale(1)' : 'scale(0.85)',
                  opacity: sel ? 1 : 0.4,
                }}>
                {sel && <span className="text-[10px] text-white font-black">✓</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 pt-4 flex-shrink-0">
        <button
          onClick={() => picked && resolveGame()}
          disabled={!picked}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold transition-all duration-300 cursor-pointer"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: picked
              ? 'linear-gradient(135deg, #fd297b, #ff655b)'
              : 'rgba(255,255,255,0.06)',
            color: picked ? 'white' : 'rgba(255,255,255,0.25)',
            boxShadow: picked ? '0 12px 40px rgba(253,41,123,0.35)' : 'none',
            transform: picked ? 'translateY(0)' : 'translateY(2px)',
            cursor: picked ? 'pointer' : 'not-allowed',
          }}
        >
          {picked ? t.game.ctaPicked : t.game.ctaEmpty}
        </button>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%,100% { opacity:0.25; transform:scale(0.8); }
          50% { opacity:1; transform:scale(1.4); }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
