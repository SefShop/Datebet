'use client'
import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { PROFILES, setCurrentMatch } from '@/lib/profiles'
import { OnlineCounter, ActivityFeed } from '@/components/ui/SocialPresence'
import { getStatus } from '@/lib/social'

export default function ProfileScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].dating
  const [idx, setIdx]     = useState(0)
  const [anim, setAnim]   = useState<'in'|'out-left'|'out-right'>('in')
  const [locked, setLocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const p = PROFILES[idx % PROFILES.length]

  function transition(dir: 'left'|'right', then: () => void) {
    if (locked) return
    setLocked(true)
    setAnim(dir === 'left' ? 'out-left' : 'out-right')
    setTimeout(() => {
      then()
      setAnim('in')
      setTimeout(() => setLocked(false), 350)
    }, 280)
  }

  function pass() { transition('left', () => setIdx(i => i + 1)) }

  function like() {
    setCurrentMatch(p)
    setChecking(true)
    // Delay 1-2s → feels like real matching
    setTimeout(() => {
      setChecking(false)
      const isMatch = Math.random() < 0.35
      transition('right', () => {
        if (isMatch) navigate('match')
        else setIdx(i => i + 1)
      })
    }, 1000 + Math.random() * 1000)
  }

  function playDirect() {
    if (locked) return
    setCurrentMatch(p)
    navigate('game_select')
  }

  const tx = anim==='out-left' ? '-110%' : anim==='out-right' ? '110%' : '0'
  const rot = anim==='out-left' ? '-6deg' : anim==='out-right' ? '6deg' : '0deg'
  const op = anim.startsWith('out') ? 0 : 1

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background:'#06060a' }}>

      {/* Social presence */}
      <div className="flex items-center justify-between px-4 pt-12 pb-1">
        <OnlineCounter lang={lang} />
        <ActivityFeed lang={lang} />
      </div>

      {/* Checking overlay */}
      {checking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(6,6,10,0.7)', backdropFilter:'blur(4px)' }}>
          <div className="text-center">
            <div className="text-[32px] mb-3" style={{ animation:'pulse 1s infinite' }}>💫</div>
            <div className="text-[14px] font-bold text-white/70">{lang==='gr'?'ελέγχουμε...':'checking...'}</div>
          </div>
          <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }`}</style>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 px-3 pb-2 flex items-center justify-center">
        <div key={p.id + idx} className="w-full max-w-[400px] rounded-3xl overflow-hidden relative"
          style={{
            transform: `translateX(${tx}) rotate(${rot})`,
            opacity: op,
            transition: anim === 'in' ? 'none' : 'all 0.28s ease',
            animation: anim === 'in' ? 'cardReveal 0.35s cubic-bezier(0.34,1.3,0.64,1) both' : 'none',
            boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
          }}>

          {/* Photo */}
          <div className="relative h-[340px] overflow-hidden" style={{ background: p.gradient }}>
            <img src={p.photo} alt={p.name}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.85) saturate(0.9)' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            {/* Dark overlay bottom */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, transparent 40%, rgba(6,6,10,0.85) 90%, rgba(6,6,10,1) 100%)'
            }} />
            {/* Online badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: p.online ? '#4ade80' : '#555',
                boxShadow: p.online ? '0 0 6px #4ade80' : 'none' }} />
              <span className="text-[10px] font-bold text-white/70">{getStatus(p.online, lang)}</span>
            </div>
            {/* Name overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-extrabold text-white tracking-tight"
                  style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>
                  {p.name}
                </span>
                <span className="text-[20px] font-semibold text-white/60">{p.age}</span>
              </div>
              <div className="text-[13px] text-white/45 mt-0.5">{p.location[lang]}</div>
            </div>
          </div>

          {/* Info section */}
          <div className="px-5 py-4" style={{ background:'rgba(6,6,10,1)' }}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.interests.map(tag => (
                <span key={tag} className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color:'rgba(255,255,255,0.6)' }}>{p.bio[lang]}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-5 px-6 pb-8 pt-2">
        <button onClick={pass} disabled={locked}
          className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
          style={{ background:'rgba(255,255,255,0.06)', border:'2px solid rgba(255,255,255,0.12)' }}>
          ❌
        </button>
        <button onClick={playDirect} disabled={locked}
          className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
          style={{ background:'rgba(56,189,248,0.15)', border:'2px solid rgba(56,189,248,0.3)' }}>
          ⚡
        </button>
        <button onClick={like} disabled={locked}
          className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
          style={{ background:'rgba(253,41,123,0.15)', border:'2px solid rgba(253,41,123,0.35)', boxShadow:'0 0 20px rgba(253,41,123,0.2)' }}>
          ❤️
        </button>
      </div>

      <style>{`
        @keyframes cardReveal { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  )
}
