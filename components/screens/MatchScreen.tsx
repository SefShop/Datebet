'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { getCurrentMatch } from '@/lib/profiles'
import BrandBoard from '@/components/ui/BrandBoard'

export default function MatchScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].dating
  const match = getCurrentMatch()
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(() => setShow(true), 100) }, [])

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 relative overflow-hidden"
      style={{ background:'radial-gradient(ellipse at 50% 40%, rgba(253,41,123,0.3) 0%, transparent 60%), linear-gradient(170deg, #0a0612 0%, #0d0818 100%)' }}>

      {/* Glow */}
      <div className="absolute rounded-full" style={{
        width:300, height:300, top:'50%', left:'50%', transform:'translate(-50%,-58%)',
        background:'radial-gradient(circle, rgba(253,41,123,0.2) 0%, transparent 70%)',
        animation:'pulse 2s ease-in-out infinite',
      }} />

      {/* Avatars */}
      <div className="flex items-center gap-5 mb-8 relative z-10"
        style={{ animation: show ? 'matchPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' : 'none' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-[48px] overflow-hidden"
          style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', boxShadow:'0 8px 32px rgba(253,41,123,0.5)' }}>
          😎
        </div>
        <div style={{ animation: show ? 'heartBeat 0.8s 0.4s ease both' : 'none' }}><BrandBoard size={28} showHearts={false} animate={false} glow={true} mini={true} /></div>
        <div className="w-24 h-24 rounded-full overflow-hidden"
          style={{ boxShadow:'0 8px 32px rgba(167,139,250,0.4)', border:'3px solid rgba(253,41,123,0.4)' }}>
          <img src={match.photo} alt={match.name} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:48px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">👩</span>' }} />
        </div>
      </div>

      <h1 className="text-[30px] font-extrabold text-white tracking-tight mb-1 relative z-10"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", animation: show ? 'fadeUp 0.5s 0.3s ease both' : 'none' }}>
        {t.matchTitle}
      </h1>
      <p className="text-[14px] mb-2 relative z-10" style={{ color:'rgba(255,255,255,0.5)',
           animation: show ? 'fadeUp 0.5s 0.45s ease both' : 'none' }}>
        {match.name}, {match.age} — {match.location[lang]}
      </p>
      <p className="text-[13px] mb-10 relative z-10" style={{ color:'rgba(255,255,255,0.35)',
           animation: show ? 'fadeUp 0.5s 0.55s ease both' : 'none' }}>
        {t.matchSub}
      </p>

      <div className="w-full max-w-[320px] flex flex-col gap-3 relative z-10"
        style={{ animation: show ? 'fadeUp 0.5s 0.7s ease both' : 'none' }}>
        <button onClick={() => navigate('game_select')}
          className="w-full rounded-2xl py-[17px] text-[16px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 40px rgba(253,41,123,0.4)' }}>
          {t.startGame}
        </button>
        <button onClick={() => navigate('chat')}
          className="w-full rounded-2xl py-[14px] text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)' }}>
          {t.sendMsg}
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:translate(-50%,-58%) scale(1);opacity:0.6} 50%{transform:translate(-50%,-58%) scale(1.12);opacity:1} }
        @keyframes matchPop { from{opacity:0;transform:scale(0.65)} to{opacity:1;transform:scale(1)} }
        @keyframes heartBeat { 0%{transform:scale(0)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
