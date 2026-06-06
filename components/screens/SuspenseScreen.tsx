'use client'

import { useEffect, useState, useMemo } from 'react'
import { useApp } from '@/lib/AppContext'
import { getCurrentMatch } from '@/lib/profiles'
import { pickRandom, SUSPENSE_LINES } from '@/lib/voice'
import { THINKING_LINES, getRemembersLine } from '@/lib/anticipation'

export default function SuspenseScreen() {
  const { navigate, personalization, lang, session } = useApp()
  const line = useMemo(() => pickRandom(SUSPENSE_LINES[lang]), [lang])
  // FEATURE 2 — two "thinking" beats over a human-feeling 1.5-3s delay
  const thinking = useMemo(() => {
    const pool = [...THINKING_LINES[lang]]
    const a = pool.splice(Math.floor(Math.random()*pool.length), 1)[0]
    const b = pool.splice(Math.floor(Math.random()*pool.length), 1)[0]
    return [a, b]
  }, [lang])
  const [beat,  setBeat]  = useState(0)
  const [show,  setShow]  = useState(false)
  const [leave, setLeave] = useState(false)
  const [dots,  setDots]  = useState('')

  // Show speed observation if we have one (replaces generic sub-line)
  const remembers = getRemembersLine(session, lang)
  const subLine = remembers ?? personalization.progressionObs ?? personalization.speedObs ?? line.bottom
  const isPersonal = !!(remembers || personalization.progressionObs || personalization.speedObs)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Visual beats only — NO automatic navigation. User taps to reveal.
    const t0 = setTimeout(() => setShow(true), 80)
    const tb = setTimeout(() => setBeat(1), 900)
    const tr = setTimeout(() => setReady(true), 1400)   // reveal the button (no redirect)
    return () => [t0, tb, tr].forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(t)
  }, [])

  const vis = show && !leave

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 relative overflow-hidden"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 60%, #080610 100%)' }}>

      <div className="absolute pointer-events-none"
        style={{
          width:400, height:400, top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          background:'radial-gradient(circle, rgba(253,41,123,0.14) 0%, transparent 65%)',
          animation:'breathe 2s ease-in-out infinite',
        }} />

      {/* Avatars */}
      <div className="flex items-center mb-12 relative"
        style={{
          opacity: vis?1:0,
          transform: vis?'translateY(0) scale(1)':'translateY(16px) scale(0.96)',
          transition:'all 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#fd297b] to-[#ff655b]
          flex items-center justify-center text-[30px] relative z-10"
          style={{ animation:'floatA 2.2s ease-in-out infinite', boxShadow:'0 0 30px rgba(253,41,123,0.4)' }}>
          😎
        </div>
        <div className="flex items-center gap-2 px-4 relative z-0">
          <div className="w-10 h-px" style={{ background:'linear-gradient(90deg, rgba(253,41,123,0.4), transparent)' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#fd297b', animation:'ping 1.2s ease-in-out infinite' }} />
          <div className="w-10 h-px" style={{ background:'linear-gradient(90deg, transparent, rgba(109,99,255,0.4))' }} />
        </div>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7]
          flex items-center justify-center text-[30px] relative z-10"
          style={{ animation:'floatB 2.2s ease-in-out infinite', boxShadow:'0 0 30px rgba(109,99,255,0.4)' }}>
          {"🎮"}
        </div>
      </div>

      {/* Copy */}
      <div className="text-center"
        style={{
          opacity: vis?1:0,
          transform: vis?'translateY(0)':'translateY(12px)',
          transition:'all 0.5s ease 0.1s',
        }}>
        <div className="text-white text-[21px] font-bold tracking-[-0.3px] mb-3 leading-tight"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {getCurrentMatch().name} {thinking[beat]}{dots}
        </div>
        {/* Speed observation — personalised if available */}
        <div key={subLine}
          className="text-[14px] leading-relaxed font-normal"
          style={{
            color: isPersonal
              ? 'rgba(253,41,123,0.7)'   // pink if personalised
              : 'rgba(255,255,255,0.28)',
            animation: 'fadeIn 0.5s ease both',
          }}>
          {subLine}
        </div>
      </div>

      {/* Reveal button — user taps to continue (no auto-navigation) */}
      <div className="absolute left-0 right-0 px-6" style={{ bottom: 40 }}>
        <button onClick={() => navigate('result')}
          disabled={!ready}
          className="w-full rounded-2xl py-[17px] text-[16px] font-bold active:scale-95 transition-all cursor-pointer disabled:cursor-default"
          style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background: ready ? 'linear-gradient(135deg, #fd297b, #ff655b)' : 'rgba(255,255,255,0.05)',
            color: ready ? '#fff' : 'rgba(255,255,255,0.25)',
            boxShadow: ready ? '0 12px 40px rgba(253,41,123,0.35)' : 'none',
            opacity: ready ? 1 : 0.6,
            transition: 'all 0.4s ease',
          }}>
          {ready ? (lang==='gr' ? 'δες το αποτέλεσμα →' : 'see the result →') : (lang==='gr' ? '...' : '...')}
        </button>
      </div>

      <style>{`
        @keyframes breathe { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6} 50%{transform:translate(-50%,-50%) scale(1.2);opacity:1} }
        @keyframes floatA  { 0%,100%{transform:translateX(0) translateY(0) rotate(-1deg)} 50%{transform:translateX(-5px) translateY(-4px) rotate(1deg)} }
        @keyframes floatB  { 0%,100%{transform:translateX(0) translateY(0) rotate(1deg)}  50%{transform:translateX(5px) translateY(-4px) rotate(-1deg)} }
        @keyframes ping    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.4} }
        @keyframes fill    { from{width:0%} to{width:100%} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
