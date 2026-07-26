'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { getCurrentMatch, subscribeCurrentMatch } from '@/lib/profiles'
import { subscribeGamePresence } from '@/lib/gamePresence'

// Purely a display component — reads GameChatOverlay's broadcast events
// via the shared pub/sub, applies no detection logic of its own. Placed
// inside each active game screen (below the turn indicator, above the
// board), not inside chat.
export default function GamePresenceBanner() {
  const { lang } = useApp()

  const [opponent, setOpponent] = useState(() => getCurrentMatch())
  useEffect(() => subscribeCurrentMatch(setOpponent), [])

  const [leftVisible, setLeftVisible] = useState(false)
  const [returnedVisible, setReturnedVisible] = useState(false)
  const returnedTimeoutRef = useRef<any>(null)

  useEffect(() => {
    const opponentId = opponent && opponent.id !== 'none' ? opponent.id : null
    if (!opponentId) return
    const unsubscribe = subscribeGamePresence((event, _sessionId, eventUserId) => {
      if (eventUserId !== opponentId) return
      if (returnedTimeoutRef.current) { clearTimeout(returnedTimeoutRef.current); returnedTimeoutRef.current = null }
      if (event === 'left_game') {
        setLeftVisible(true)
        setReturnedVisible(false)
      } else {
        setLeftVisible(false)
        setReturnedVisible(true)
        returnedTimeoutRef.current = setTimeout(() => setReturnedVisible(false), 3000)
      }
    })
    return () => {
      unsubscribe()
      if (returnedTimeoutRef.current) clearTimeout(returnedTimeoutRef.current)
    }
  }, [opponent])

  if (!leftVisible && !returnedVisible) return null

  const name = opponent?.name || 'Player'
  const text = leftVisible
    ? (lang === 'gr' ? `Ο/Η ${name} έφυγε από το παιχνίδι.` : `${name} left the game.`)
    : (lang === 'gr' ? `Ο/Η ${name} επέστρεψε στο παιχνίδι.` : `${name} returned to the game.`)

  return (
    <div className="flex justify-center px-4 py-1.5">
      <div className="text-[12px] px-3.5 py-1.5 rounded-full text-center"
        style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(10,10,16,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {text}
      </div>
    </div>
  )
}
