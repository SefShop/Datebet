'use client'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import BrandBoard from '@/components/ui/BrandBoard'
import { supabase } from '@/lib/supabase'

export default function SplashScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang]

  async function start() {
    console.log('PLAY TOGETHER START PRESSED')
    // Persist per-user, in the database — never mark this before the user
    // actually presses Start, and never rely on localStorage as the source
    // of truth (must work across devices/browsers/logout-login).
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { error } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
        if (error) console.error('ONBOARDING COMPLETE SAVE ERROR:', error.message)
        else console.log('ONBOARDING COMPLETE SAVED:', user.id)
      }
    } catch (e: any) {
      console.error('ONBOARDING COMPLETE SAVE ERROR:', e.message)
    }
    navigate('profile')
  }
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 relative"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.33) 0%, transparent 60%), linear-gradient(165deg, #150a12 0%, #0d0d18 55%, #0a1020 100%)' }}>

      {/* Brand mark */}
      <div className="mb-8"><BrandBoard size={52} showHearts={false} animate={true} glow={true} mini={true} /></div>

      {/* Title */}
      <h1 className="text-[32px] font-extrabold text-white text-center tracking-[-1px] leading-tight mb-3"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {t.splash.title}
      </h1>

      {/* Subtitle */}
      <p className="text-white/45 text-[16px] text-center mb-12">{t.splash.tagline}</p>

      {/* Single action */}
      <button onClick={start}
        className="w-full max-w-[320px] bg-gradient-to-br from-[#ff3384] to-[#ff7a6e] text-white rounded-2xl py-[18px] text-[17px] font-bold shadow-[0_12px_40px_rgba(253,41,123,0.472)] active:scale-95 transition-transform cursor-pointer"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {t.splash.start}
      </button>
    </div>
  )
}
