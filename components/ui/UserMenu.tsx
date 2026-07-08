'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/AppContext'
import { clearProfileState } from '@/lib/profiles'
import { getMessagesState, subscribeMessages, refreshMessagesState } from '@/lib/messagesState'
import { getInviteCount } from '@/lib/gameInvites'

interface Props { onLogout: () => void }

export default function UserMenu({ onLogout }: Props) {
  const { navigate, lang } = useApp()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(getMessagesState().unread)
  const [invites, setInvites] = useState(0)

  useEffect(() => {
    // Unread comes from the GLOBAL store (single source of truth)
    setUnread(getMessagesState().unread)
    const unsub = subscribeMessages(() => setUnread(getMessagesState().unread))
    // Invites still polled here
    getInviteCount().then(setInvites)
    const t = setInterval(() => { getInviteCount().then(setInvites) }, 3000)
    return () => { unsub(); clearInterval(t) }
  }, [])

  // Refresh when menu opens
  useEffect(() => {
    if (open) {
      console.log('PROFILE MENU REFRESH CALLED')
      refreshMessagesState()
      getInviteCount().then(setInvites)
    }
  }, [open])

  // Realtime invite badge
  useEffect(() => {
    let channel: any = null
    async function sub() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      channel = supabase
        .channel(`menu-invites-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites' }, (payload: any) => {
          const inv = payload.new
          if (inv && inv.receiver_id === user.id) { console.log('BADGE: new invite'); getInviteCount().then(setInvites) }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invites' }, (payload: any) => {
          const inv = payload.new
          if (inv && inv.receiver_id === user.id) getInviteCount().then(setInvites)
        })
        .subscribe()
    }
    sub()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])
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
          background: open ? 'rgba(253,41,123,0.177)' : 'rgba(255,255,255,0.071)',
          border: `1.5px solid ${open ? 'rgba(253,41,123,0.354)' : 'rgba(255,255,255,0.118)'}`,
          backdropFilter: 'blur(12px)',
        }}>
        <span className="text-[14px]">👤</span>
        {(unread > 0 || invites > 0) && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background:'#ff3384', boxShadow:'0 0 6px #ff3384', border:'2px solid #08080f' }} />}
      </button>
      {/* Debug: visible unread count */}
      <span className="text-[9px] font-bold" style={{ color:'rgba(253,41,123,0.826)' }}>
        {(unread + invites) > 0 ? (unread + invites) : ''}
      </span>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-12 right-0 w-[180px] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(15,12,25,0.92)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.094)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.047)',
            animation: 'menuIn 0.2s ease both',
          }}>
          {items.map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5 cursor-pointer"
              style={{
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.059)' : 'none',
                color: item.danger ? '#ff3384' : 'rgba(255,255,255,0.826)',
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
