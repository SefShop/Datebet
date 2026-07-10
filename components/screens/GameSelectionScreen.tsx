'use client'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'

export default function GameSelectionScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].games

  const games = [
    { key:'c4',  emoji:'🔴', title:t.c4Title,  desc:t.c4Desc,  label:t.c4Label,  glow:'#ff3384', go:()=>navigate('connect4')  },
    { key:'ttt', emoji:'❌', title:t.tttTitle, desc:t.tttDesc, label:t.tttLabel, glow:'#38bdf8', go:()=>navigate('tictactoe') },
  ]

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8"
      style={{ background:'linear-gradient(170deg, #0a0a10 0%, #0d0614 60%, #080610 100%)' }}>
      <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-1"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t.selectTitle}</h1>
      <p className="text-[14px] mb-7" style={{ color:'rgba(255,255,255,0.472)' }}>{t.selectSub}</p>

      <div className="flex flex-col gap-3.5 flex-1">
        {games.map((g,i) => (
          <button key={g.key} onClick={g.go}
            className="relative w-full text-left rounded-2xl p-5 active:scale-[0.97] transition-transform cursor-pointer overflow-hidden"
            style={{
              background:'rgba(255,255,255,0.047)', border:`1px solid ${g.glow}30`,
              animation:`fadeSlideUp 0.4s ease ${i*80}ms both`,
            }}>
            <div className="absolute pointer-events-none" style={{
              width:120, height:120, top:-30, right:-30, borderRadius:'50%',
              background:`radial-gradient(circle, ${g.glow}22 0%, transparent 70%)`,
            }} />
            <div className="flex items-center gap-4">
              <div className="text-[36px]">{g.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[17px] font-extrabold text-white tracking-tight">{g.title}</span>
                  <span className="text-[9px] font-bold tracking-[1px] uppercase px-2 py-0.5 rounded-full"
                    style={{ background:`${g.glow}18`, color:g.glow, border:`1px solid ${g.glow}33` }}>{g.label}</span>
                </div>
                <div className="text-[13px]" style={{ color:'rgba(255,255,255,0.531)' }}>{g.desc}</div>
              </div>
              <div className="text-white/30 text-[18px]">→</div>
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => navigate('profile')}
        className="mt-auto w-full text-[13px] font-medium py-3 active:opacity-60 transition-opacity cursor-pointer"
        style={{ color:'rgba(255,255,255,0.295)' }}>{t.back}</button>
      <style>{`@keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}
