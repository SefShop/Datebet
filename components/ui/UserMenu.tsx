'use client'
import { useState, useEffect } from 'react'
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

  // Refresh when drawer opens
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

  // Escape key closes the drawer (desktop)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  async function logout() {
    console.log('LOGOUT: signing out + clearing state')
    clearProfileState()
    await supabase.auth.signOut()
    // Only remove app keys, not Supabase auth tokens (signOut handles those)
    try { localStorage.removeItem('lang') } catch {}
    onLogout()
  }

  function go(screen: Parameters<typeof navigate>[0]) {
    setOpen(false)
    setTimeout(() => navigate(screen), 220)
  }

  const items = [
    { icon: '👤', label: lang==='gr'?'Το Προφίλ μου':'My Profile', action: () => go('edit_profile') },
    { icon: '💬', label: lang==='gr'?'Μηνύματα':'Messages', action: () => go('inbox'), badge: unread },
    { icon: '🏆', label: lang==='gr'?'Προκλήσεις':'Challenges', action: () => go('activity'), badge: invites },
    { icon: '🎮', label: lang==='gr'?'Τα Παιχνίδια μου':'My Games', action: () => go('game_select') },
    { icon: '⭐', label: 'Premium', action: () => setOpen(false) },
    { icon: '⚙️', label: lang==='gr'?'Ρυθμίσεις':'Settings', action: () => setOpen(false) },
    { icon: '❓', label: lang==='gr'?'Βοήθεια':'Help', action: () => setOpen(false) },
    { icon: '🚪', label: lang==='gr'?'Αποσύνδεση':'Logout', action: logout, danger: true },
  ]

  const totalBadge = unread + invites

  return (
    <>
      {/* Trigger — small floating avatar, same top-right position */}
      <button onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(255,51,132,0.25), rgba(216,77,216,0.25))',
          border: '1.5px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(12px)',
          boxShadow: open ? '0 0 0 3px rgba(255,51,132,0.25)' : 'none',
        }}>
        <span className="text-[14px]">👤</span>
        {totalBadge > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ background:'#ff3384', boxShadow:'0 0 8px #ff3384', border:'2px solid #08080f' }} />
        )}
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[200] transition-opacity duration-300"
        style={{
          background: 'rgba(6,6,12,0.6)',
          backdropFilter: open ? 'blur(3px)' : 'none',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Slide-out drawer */}
      <div
        className="fixed top-0 right-0 z-[210] h-full flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: 'min(88vw, 340px)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          background: 'rgba(13,10,22,0.86)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderTopLeftRadius: 24,
          borderBottomLeftRadius: 24,
          boxShadow: '-16px 0 60px rgba(0,0,0,0.55), 0 0 40px rgba(255,51,132,0.08)',
        }}
        role="dialog" aria-modal="true">

        {/* Neon accent glow strip */}
        <div className="absolute inset-y-0 left-0 w-[2px]" style={{
          background: 'linear-gradient(180deg, #ff3384, #d84dd8, #7c72ff)',
          borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-7 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[18px]"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', boxShadow: '0 0 18px rgba(255,51,132,0.4)' }}>
              👤
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-white">DateDuel</div>
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {lang==='gr'?'Ο λογαριασμός μου':'My Account'}
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            ✕
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {items.map((item, i) => (
            <button key={i} onClick={item.action}
              className="group w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] cursor-pointer mb-1"
              style={{ color: item.danger ? '#ff5c8d' : 'rgba(255,255,255,0.88)' }}
              onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(255,51,132,0.1)' : 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <span className="text-[18px] w-6 text-center transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
              <span className="text-[14px] font-semibold flex-1">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 0 8px rgba(255,51,132,0.5)' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer accent */}
        <div className="px-6 py-4 text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          DateDuel · v1
        </div>
      </div>
    </>
  )
}
