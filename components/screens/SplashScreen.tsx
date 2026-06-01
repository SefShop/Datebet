'use client'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'

export default function SplashScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang]
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] items-center justify-end pb-16 relative">
      <div className="absolute inset-0 flex items-center justify-center text-[160px]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(253,41,123,0.35) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(255,101,91,0.25) 0%, transparent 60%), linear-gradient(160deg, #1a0a12 0%, #0f0f1a 50%, #0a1020 100%)' }} />
        <span className="relative z-10">👫</span>
      </div>
      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.92) 100%)' }} />
      <div className="relative z-20 text-center w-full px-8">
        <div className="text-[48px] font-extrabold text-white tracking-[-2px] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Date<span style={{ background: 'linear-gradient(135deg, #fd297b, #ff655b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Duel</span>
        </div>
        <div className="text-white/50 text-[15px] mb-9">{t.splash.tagline}</div>
        <button onClick={() => navigate('home')} className="w-full bg-gradient-to-br from-[#fd297b] to-[#ff655b] text-white rounded-2xl py-[18px] text-[17px] font-bold shadow-[0_12px_40px_rgba(253,41,123,0.4)] active:scale-95 transition-transform cursor-pointer" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {t.splash.start}
        </button>
        <button className="w-full text-white/50 py-[14px] text-[15px] mt-2 cursor-pointer active:text-white/70 transition-colors">
          {t.splash.haveAccount}
        </button>
      </div>
    </div>
  )
}
