'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { getCurrentMatch } from '@/lib/profiles'
import { setChatOrigin } from '@/lib/gameInvites'
import { supabase } from '@/lib/supabase'
import { fetchGamePlayerPhotoAccess } from '@/lib/gamePlayerPhoto'
import GamePlayerAvatar from '@/components/ui/GamePlayerAvatar'

export default function PostGameScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].dating
  const match = getCurrentMatch()
  const [photoAccess, setPhotoAccess] = useState<{ photoUnlocked: boolean; myPhoto: string | null; opponentPhoto: string | null }>({ photoUnlocked: false, myPhoto: null, opponentPhoto: null })

  useEffect(() => {
    if (!match?.id) return
    // Shared avatar photo access — reuses the same pair-unlock source of
    // truth as Discover/Profile. Presentation-only.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) fetchGamePlayerPhotoAccess(user.id, match.id).then(setPhotoAccess)
    })
  }, [match?.id])

  if (!match) return <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">No player selected</div></div></div>

  return (
    <div className="desktop-scroll-inner flex flex-col h-full items-center justify-center px-8 relative overflow-hidden"
      style={{ background:'radial-gradient(ellipse at 50% 60%, rgba(253,41,123,0.177) 0%, transparent 60%), linear-gradient(170deg, #0a0a10 0%, #0d0614 100%)' }}>

      {/* Avatars small */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-[32px]"
          style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)' }}>😎</div>
        <div className="text-white/20 text-[12px] font-bold">+</div>
        <div style={{ border:'2px solid rgba(253,41,123,0.354)', borderRadius: '9999px' }}>
          <GamePlayerAvatar
            userId={match.id}
            displayName={match.name}
            photoUrl={photoAccess.opponentPhoto}
            photoUnlocked={photoAccess.photoUnlocked}
            size={64}
            accentColor="#ff3384"
            accentColor2="#ff7a6e"
            glow={false}
          />
        </div>
      </div>

      <h1 className="text-[26px] font-extrabold text-white tracking-tight text-center mb-2"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", animation:'fadeUp 0.5s ease both' }}>
        {t.postTitle}
      </h1>
      <p className="text-[15px] text-center mb-10" style={{ color:'rgba(255,255,255,0.531)', animation:'fadeUp 0.5s 0.15s ease both' }}>
        {t.postSub}
      </p>

      <div className="w-full max-w-[320px] flex flex-col gap-3" style={{ animation:'fadeUp 0.5s 0.3s ease both' }}>
        <button onClick={() => navigate('game_select')}
          className="w-full rounded-2xl py-[17px] text-[16px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff', boxShadow:'0 12px 40px rgba(253,41,123,0.472)' }}>
          {t.lockDate}
        </button>
        <button onClick={() => navigate('game_select')}
          className="w-full rounded-2xl py-[14px] text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background:'rgba(255,255,255,0.071)', color:'rgba(255,255,255,0.708)', border:'1px solid rgba(255,255,255,0.118)' }}>
          {t.rematchBtn}
        </button>
        <button onClick={() => { setChatOrigin(null); navigate('chat') }}
          className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.354)' }}>
          {t.chatBtn}
        </button>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @media (min-width: 1024px) {
          .desktop-scroll-inner {
            height: auto !important;
            min-height: 100% !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
            padding-bottom: 48px !important;
          }
        }
      `}</style>
    </div>
  )
}
