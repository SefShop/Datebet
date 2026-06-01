'use client'

import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { MOCK_PROFILE } from '@/lib/data'

export default function GameSelectionScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].games

  const cards = [
    { key: 'card',  emoji: '🃏', title: t.cardTitle,  desc: t.cardDesc,  glow: '#fd297b', go: () => navigate('card_game')  },
    { key: 'board', emoji: '🎲', title: t.boardTitle, desc: t.boardDesc, glow: '#a78bfa', go: () => navigate('board_game') },
  ]

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 60%, #080610 100%)' }}>

      {/* Header */}
      <div className="mb-1">
        <div className="text-[11px] font-bold tracking-[2px] uppercase mb-2" style={{ color:'rgba(253,41,123,0.7)' }}>
          {t.you} + {MOCK_PROFILE.name}
        </div>
        <h1 className="text-[30px] font-extrabold text-white leading-tight tracking-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {t.selectTitle}
        </h1>
        <p className="text-[14px] mt-2" style={{ color:'rgba(255,255,255,0.4)' }}>{t.selectSub}</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4 mt-8">
        {cards.map((c, i) => (
          <button key={c.key} onClick={c.go}
            className="relative w-full text-left rounded-3xl p-6 active:scale-[0.97] transition-transform cursor-pointer overflow-hidden"
            style={{
              background:'linear-gradient(150deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border:`1px solid ${c.glow}40`,
              boxShadow:`0 16px 50px ${c.glow}22`,
              animation:`fadeSlideUp 0.5s ease ${i*120}ms both`,
            }}>
            <div className="absolute pointer-events-none" style={{
              width:160, height:160, top:-40, right:-40, borderRadius:'50%',
              background:`radial-gradient(circle, ${c.glow}33 0%, transparent 70%)`,
            }} />
            <div className="text-[42px] mb-3">{c.emoji}</div>
            <div className="text-[20px] font-extrabold text-white mb-1.5 tracking-tight"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {c.title}
            </div>
            <div className="text-[14px] mb-4" style={{ color:'rgba(255,255,255,0.45)' }}>{c.desc}</div>
            <div className="text-[14px] font-bold" style={{ color:c.glow }}>{t.play}</div>
          </button>
        ))}
      </div>

      <button onClick={() => navigate('home')}
        className="mt-auto w-full text-[13px] font-medium py-3 active:opacity-60 transition-opacity cursor-pointer"
        style={{ color:'rgba(255,255,255,0.25)' }}>
        {t.back}
      </button>

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
