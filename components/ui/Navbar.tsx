'use client'

interface NavbarProps {
  active?: string
  onActivityTap?: () => void
  unread?: number
}

export default function Navbar({ active = 'home', onActivityTap, unread = 0 }: NavbarProps) {
  const items = [
    { icon: '🔥', label: 'Discover', id: 'home' },
    { icon: '🎮', label: 'Games',    id: 'games' },
    { icon: '💬', label: 'Chats',    id: 'chats' },
    { icon: '🔔', label: 'Activity', id: 'activity', badge: unread },
    { icon: '👤', label: 'Profile',  id: 'profile' },
  ]

  return (
    <div className="flex justify-around px-3 pt-2.5 pb-7 flex-shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.071)', background: 'rgba(10,10,16,0.95)' }}>
      {items.map(item => {
        const isOn = active === item.id
        return (
          <div key={item.id}
            onClick={item.id === 'activity' ? onActivityTap : undefined}
            className="flex flex-col items-center gap-1 cursor-pointer px-3 py-1.5 text-[10px] font-medium
              transition-all active:scale-90 relative"
            style={{ color: isOn ? '#ff3384' : 'rgba(255,255,255,0.354)' }}>
            <span className="text-[22px] leading-none relative">
              {item.icon}
              {/* Badge */}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full
                  text-[9px] font-black text-white flex items-center justify-center px-0.5"
                  style={{ background: 'linear-gradient(135deg, #ff3384, #ff7a6e)', boxShadow: '0 1px 6px rgba(253,41,123,0.708)' }}>
                  {item.badge}
                </span>
              )}
            </span>
            {item.label}
          </div>
        )
      })}
    </div>
  )
}
