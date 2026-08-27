'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isMobileDevice } from '@/lib/deviceGate'

// Entry gate for `/`: real mobile devices go straight to `/app` (bypassing
// the marketing Landing page); desktop/laptop browsers keep going to
// `/landing`, which itself still gates to DesktopComingSoon exactly as
// before. This is DEVICE classification (see lib/deviceGate.ts), never a
// viewport-width/matchMedia check — a desktop browser window resized
// narrow must never be routed to `/app`.
//
// Same tri-state pattern already used by app/app/page.tsx and
// app/landing/page.tsx: null means "not resolved yet", during which
// nothing renders but a neutral shell — avoiding any flash of Landing or
// AuthScreen before classification completes. router.replace() (not
// push/redirect) is used once resolved so this transient `/` visit never
// becomes a Back-button loop.
export default function Home() {
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsDesktop(!isMobileDevice())
  }, [])

  useEffect(() => {
    if (isDesktop === null) return
    router.replace(isDesktop ? '/landing' : '/app')
  }, [isDesktop, router])

  return <div style={{ minHeight: '100vh', width: '100%', background: '#0a0a10' }} />
}
