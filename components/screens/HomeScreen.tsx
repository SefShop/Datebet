'use client'

import { useState, useEffect } from 'react'
import ProfileCard from '@/components/ui/ProfileCard'
import Navbar from '@/components/ui/Navbar'
import { getCurrentMatch } from '@/lib/profiles'
import { HOME_HOOKS, UNREAD_COUNT } from '@/lib/activity'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'

export default function HomeScreen() {
  const { navigate, resetGame, lang } = useApp()
  const t = APP_COPY[lang]
  const [hookIndex, setHookIndex] = useState(0)
  const [hookVisible, setHookVisible] = useState(true)

  // Rotate hooks every 4s — creates restlessness
  useEffect(() => {
    const interval = setInterval(() => {
      setHookVisible(false)
      setTimeout(() => {
        setHookIndex(i => (i + 1) % HOME_HOOKS[lang].length)
        setHookVisible(true)
      }, 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const hook = HOME_HOOKS[lang][hookIndex]

  const handlePlay = () => {
    resetGame()
    navigate('profile')
  }

  return (
    <div className="flex flex-col h-full"
      style={{ background: 'linear-gradient(170deg, #0a0a10 0%, #100814 60%, #080a14 100%)' }}>

      {/* Status bar */}
      <div className="flex justify-between px-7 pt-4 text-[13px] font-semibold flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        <span>9:41</span><span>●●● 100%</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start px-6 mt-3 mb-4 flex-shrink-0">
        <div>
          <div className="text-[13px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {t.home.greeting}
          </div>
          <div className="text-[28px] font-extrabold text-white tracking-tight leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t.home.titleTop}<br />
            <span style={{
              background: 'linear-gradient(135deg, #fd297b, #ff655b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>{t.home.titleBottom}</span>
          </div>
        </div>

        {/* Notification bell with badge */}
        <button
          onClick={() => navigate('inbox')}
          className="relative w-11 h-11 rounded-full flex items-center justify-center text-[18px]
            active:scale-90 transition-transform cursor-pointer mt-1"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          🔔
          {UNREAD_COUNT > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center
              text-[10px] font-black text-white px-1"
              style={{ background: 'linear-gradient(135deg, #fd297b, #ff655b)', boxShadow: '0 2px 8px rgba(253,41,123,0.5)' }}>
              {UNREAD_COUNT}
            </div>
          )}
        </button>
      </div>

      {/* Activity hook banner — rotating */}
      <div className="mx-5 mb-4 flex-shrink-0">
        <button
          onClick={() => navigate('inbox')}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all"
          style={{
            background: hook.urgency === 'high'
              ? 'linear-gradient(135deg, rgba(253,41,123,0.15), rgba(255,101,91,0.08))'
              : hook.urgency === 'mid'
              ? 'rgba(255,140,66,0.1)'
              : 'rgba(255,255,255,0.05)',
            border: hook.urgency === 'high'
              ? '1px solid rgba(253,41,123,0.3)'
              : hook.urgency === 'mid'
              ? '1px solid rgba(255,140,66,0.2)'
              : '1px solid rgba(255,255,255,0.08)',
            opacity: hookVisible ? 1 : 0,
            transform: hookVisible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
          <span className="text-[20px] flex-shrink-0">{hook.icon}</span>
          <span className="flex-1 text-[13px] font-semibold text-left"
            style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {hook.text}
          </span>
          <span className="text-[11px] font-bold flex-shrink-0"
            style={{
              color: hook.urgency === 'high' ? '#fd297b' : hook.urgency === 'mid' ? '#ff8c42' : '#6c63ff'
            }}>
            {hook.cta} →
          </span>
        </button>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-5 min-h-0">
        <ProfileCard profile={{ ...(getCurrentMatch() || {name:"Player",photo:"",gradient:"linear-gradient(135deg,#fd297b,#ff655b)",location:{en:"",gr:""},online:false,interests:[],bio:{en:"",gr:""},id:"none",age:0}), emoji: '🧑', distance: '', compatibility: 85 } as any} isBack />
        <ProfileCard profile={{...(getCurrentMatch() || {name:"Player",photo:"",gradient:"linear-gradient(135deg,#fd297b,#ff655b)",location:{en:"",gr:""},online:false,interests:[],bio:{en:"",gr:""},id:"none",age:0}), distance: '', compatibility: 85} as any} onClick={handlePlay} />
      </div>

      {/* Action row */}
      <div className="flex gap-3 px-5 py-3 flex-shrink-0">
        <button className="w-14 h-14 rounded-full flex items-center justify-center text-[22px]
          active:scale-90 transition-transform cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ✕
        </button>
        <button onClick={handlePlay}
          className="flex-1 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2
            active:scale-95 transition-transform cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #fd297b, #ff655b)',
            color: 'white',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 8px 24px rgba(253,41,123,0.35)',
          }}>
          {t.home.play}
        </button>
        <button onClick={() => navigate('profile')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-[22px]
            active:scale-90 transition-transform cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          🎲
        </button>
      </div>

      <Navbar active="home" onActivityTap={() => navigate('inbox')} unread={UNREAD_COUNT} />
    </div>
  )
}
