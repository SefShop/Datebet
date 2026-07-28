'use client'
import { useState, useEffect, useRef } from 'react'
import { subscribeRematchDeclined } from '@/lib/rematchDeclinedToast'

interface Props {
  lang: string
}

export default function RematchDeclinedToast({ lang }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return subscribeRematchDeclined((opponentName) => {
      setMessage(lang === 'gr'
        ? `Ο/Η ${opponentName} δεν αποδέχτηκε τη νέα παρτίδα.`
        : `${opponentName} declined the rematch.`)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setMessage(null), 3500)
    })
  }, [lang])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  if (!message) return null

  return (
    <>
      <style>{`
        @keyframes rematchDeclinedToast {
          0%   { opacity: 0; transform: translate(-50%, -6px); }
          10%  { opacity: 1; transform: translate(-50%, 0); }
          88%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -6px); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 80px)',
        left: '50%',
        zIndex: 39,
        animation: 'rematchDeclinedToast 3.5s ease both',
        pointerEvents: 'none',
      }}>
        <div className="text-[12px] font-semibold text-center px-4 py-2 rounded-full"
          style={{
            color: '#fff',
            background: 'rgba(20,14,28,0.88)',
            border: '1px solid rgba(255,51,132,0.35)',
            boxShadow: '0 4px 20px rgba(253,41,123,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
            maxWidth: 300,
          }}>
          {message}
        </div>
      </div>
    </>
  )
}
