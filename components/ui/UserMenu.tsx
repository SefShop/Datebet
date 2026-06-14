'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/AppContext'
import { clearProfileState } from '@/lib/profiles'
import { getUnreadCount } from '@/lib/unread'
import { getInviteCount } from '@/lib/gameInvites'

interface Props { onLogout: () => void }

export default function UserMenu({ onLogout }: Props) {
  const { navigate, lang } = useApp()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [invites, setInvites] = useState(0)

  useEffect(() => {
    getUnreadCount().then(n => { console.log('MENU UNREAD:', n); setUnread(n) })
    getInviteCount().then(setInvites)
    const t = setInterval(() => { getUnreadCount().then(setUnread); getInviteCount().then(setInvites) }, 8000)
    return () => clearInterval(t)
  }, [])

  // Refresh when menu opens
  useEffect(() => {
    if (open) { getUnreadCount().then(setUnread); getInviteCount().then(setInvites) }
  }, [open])
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function logout() {
    console.log('LOGOUT: signing out + clearing state')
    clearProfileState()
    await supabase.auth.signOut()
    // Only remove app keys, not Supabase auth tokens (signOut handles those)
    try { localStorage.removeItem('lang') } catch {}
    onLogout()
  }

  const items = [
    { icon: '👤', label: 'Profile', action: () => { setOpen(false); setTimeout(() => navigate('edit_profile'), 50) } },
    { icon: '⚔️', label: `${lang==='gr'?'Προκλήσεις':'Challenges'}${invites > 0 ? ` (${invites})` : ''}`, action: () => { setOpen(false); setTimeout(() => navigate('activity'), 50) } },
    { icon: '💬', label: `Messages${unread > 0 ? ` (${unread})` : ''}`, action: () => { setOpen(false); setTimeout(() => navigate('inbox'), 50) }, badge: unread },
    { icon: '⚙️', label: 'Settings', action: () => setOpen(false) },
    { icon: '🚪', label: 'Logout', action: logout, danger: true },
  ]

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer"
        style={{
          background: open ? 'rgba(253,41,123,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${open ? 'rgba(253,41,123,0.3)' : 'rgba(255,255,255,0.1)'}`,
          backdropFilter: 'blur(12px)',
        }}>
        <span className="text-[14px]">👤</span>
        {(unread > 0 || invites > 0) && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background:'#fd297b', boxShadow:'0 0 6px #fd297b', border:'2px solid #08080f' }} />}
      </button>
      {/* Debug: visible unread count */}
      <span className="text-[9px] font-bold" style={{ color:'rgba(253,41,123,0.7)' }}>
        {(unread + invites) > 0 ? (unread + invites) : ''}
      </span>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-12 right-0 w-[180px] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(15,12,25,0.92)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'menuIn 0.2s ease both',
          }}>
          {items.map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5 cursor-pointer"
              style={{
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                color: item.danger ? '#fd297b' : 'rgba(255,255,255,0.7)',
              }}>
              <span className="text-[14px]">{item.icon}</span>
              <span className="text-[13px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes menuIn { from{opacity:0;transform:translateY(-8px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>
    </div>
  )
}
