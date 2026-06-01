'use client'

import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'dark' | 'icon'
  className?: string
  fullWidth?: boolean
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const base =
    'font-bold font-jakarta transition-transform active:scale-95 cursor-pointer select-none'

  const variants = {
    primary:
      'bg-gradient-to-br from-[#fd297b] to-[#ff655b] text-white rounded-2xl py-[18px] px-6 shadow-[0_12px_40px_rgba(253,41,123,0.35)] text-[17px]',
    ghost:
      'bg-transparent text-white/60 text-[15px] py-[14px] px-6',
    dark:
      'bg-[#0f0f0f] text-white rounded-full w-14 h-14 flex items-center justify-center text-[22px]',
    icon:
      'bg-[#f5f5f7] text-[#1a1a1a] rounded-full w-14 h-14 flex items-center justify-center text-[22px]',
  }

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
