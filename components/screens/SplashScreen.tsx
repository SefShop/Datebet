'use client'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'

export default function SplashScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang]
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 relative"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.28) 0%, transparent 60%), linear-gradient(165deg, #150a12 0%, #0d0d18 55%, #0a1020 100%)' }}>

      {/* Emoji mark */}
      <div className="text-[88px] mb-8" style={{ filter: 'drop-shadow(0 8px 30px rgba(253,41,123,0.4))' }}>👫</div>

      {/* Title */}
      <h1 className="text-[32px] font-extrabold text-white text-center tracking-[-1px] leading-tight mb-3"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {t.splash.title}
      </h1>

      {/* Subtitle */}
      <p className="text-white/45 text-[16px] text-center mb-12">{t.splash.tagline}</p>

      {/* Single action */}
      <button onClick={() => navigate('profile')}
        className="w-full max-w-[320px] bg-gradient-to-br from-[#fd297b] to-[#ff655b] text-white rounded-2xl py-[18px] text-[17px] font-bold shadow-[0_12px_40px_rgba(253,41,123,0.4)] active:scale-95 transition-transform cursor-pointer"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {t.splash.start}
      </button>
    </div>
  )
}
