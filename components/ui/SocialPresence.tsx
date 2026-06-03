'use client'
import { useState, useEffect, useRef } from 'react'
import { Lang } from '@/lib/copy'
import { getOnlineCount, getActivityLine, getNotification } from '@/lib/social'

// ── Online Counter ──────────────────────────────────────────────
export function OnlineCounter({ lang }: { lang: Lang }) {
  const [count, setCount] = useState(getOnlineCount)
  useEffect(() => {
    const t = setInterval(() => setCount(getOnlineCount()), 5000 + Math.random() * 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background:'rgba(253,41,123,0.08)', border:'1px solid rgba(253,41,123,0.15)' }}>
      <div className="w-2 h-2 rounded-full" style={{ background:'#fd297b', animation:'blink 2s infinite' }} />
      <span className="text-[11px] font-bold" style={{ color:'rgba(253,41,123,0.8)' }}>
        🔥 {count} {lang==='gr'?'online τώρα':'people online'}
      </span>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

// ── Activity Feed (1 line, rotating) ────────────────────────────
export function ActivityFeed({ lang }: { lang: Lang }) {
  const [line, setLine] = useState(getActivityLine(lang))
  const [key, setKey]   = useState(0)
  useEffect(() => {
    const t = setInterval(() => { setLine(getActivityLine(lang)); setKey(k => k + 1) }, 3000 + Math.random() * 3000)
    return () => clearInterval(t)
  }, [lang])
  return (
    <div key={key} className="text-[11px] px-3 py-1"
      style={{ color:'rgba(255,255,255,0.3)', animation:'feedIn 0.4s ease both' }}>
      {line}
      <style>{`@keyframes feedIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}

// ── Notification Toast ──────────────────────────────────────────
export function NotificationToast({ lang }: { lang: Lang }) {
  const [show, setShow] = useState(false)
  const [text, setText] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    function schedule() {
      timer.current = setTimeout(() => {
        setText(getNotification(lang))
        setShow(true)
        setTimeout(() => { setShow(false); schedule() }, 3500)
      }, 12000 + Math.random() * 18000)  // every 12-30s
    }
    schedule()
    return () => { if(timer.current) clearTimeout(timer.current) }
  }, [lang])

  if (!show) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl max-w-[90%]"
      style={{
        background:'rgba(20,15,30,0.95)', backdropFilter:'blur(12px)',
        border:'1px solid rgba(253,41,123,0.2)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
        animation:'notifSlide 3.5s ease both',
      }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:'#fd297b', boxShadow:'0 0 6px #fd297b' }} />
        <span className="text-[12px] font-medium text-white/75">{text}</span>
      </div>
      <style>{`@keyframes notifSlide { 0%{opacity:0;transform:translate(-50%,-20px)} 8%{opacity:1;transform:translate(-50%,0)} 85%{opacity:1;transform:translate(-50%,0)} 100%{opacity:0;transform:translate(-50%,-10px)} }`}</style>
    </div>
  )
}
