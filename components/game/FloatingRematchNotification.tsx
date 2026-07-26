'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { respondInvite, enterAcceptedGame, GameInvite } from '@/lib/gameInvites'
import { subscribeNotifications } from '@/lib/notificationsState'

interface SessionLike {
  id: string
  player_one_id: string
  player_two_id: string
  game_type: string
}

interface Props {
  session: SessionLike
  myId: string
  opponentName: string
}

// Reuses the existing "Play Again" mechanism entirely — a Play Again
// press already just inserts a normal row into game_invites (same table,
// same shape ActivityScreen's Challenges list already reads via
// getIncomingInvites). This component only adds a targeted read for the
// one pending invite specifically from the current game's opponent, for
// the current game_type — no second rematch system, no new table.
//
// Detection is triggered by the existing global notifications pub/sub
// (lib/notificationsState.ts), which already runs a single, real-time
// game_invites subscription for the whole app since login. Reusing that
// as the trigger avoids opening a second, colliding realtime channel for
// the same table.
export default function FloatingRematchNotification({ session, myId, opponentName }: Props) {
  const { lang } = useApp()
  const [invite, setInvite] = useState<GameInvite | null>(null)
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id

  useEffect(() => {
    let cancelled = false
    async function check() {
      // Only ever the sender's own pending invite to me, for this same
      // game — a sender can never match this query for their own
      // request, since it's filtered by sender_id = opponentId, not
      // myId. That's what prevents self-notifications structurally,
      // without any extra flag or check.
      const { data } = await supabase
        .from('game_invites')
        .select('*')
        .eq('sender_id', opponentId)
        .eq('receiver_id', myId)
        .eq('game_type', session.game_type)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      setInvite(data && data.length > 0 ? (data[0] as GameInvite) : null)
    }
    check()
    const unsubscribe = subscribeNotifications(check)
    return () => { cancelled = true; unsubscribe() }
  }, [opponentId, myId, session.game_type])

  // One-shot pop animation only on a genuine new arrival — never on the
  // first observation after mount (nothing to compare against yet), so
  // a request that was already pending before this screen loaded never
  // replays the animation.
  const [pop, setPop] = useState(false)
  const prevInviteIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const id = invite?.id ?? null
    if (prevInviteIdRef.current !== undefined && id && id !== prevInviteIdRef.current) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 450)
      prevInviteIdRef.current = id
      return () => clearTimeout(t)
    }
    prevInviteIdRef.current = id
  }, [invite?.id])

  async function accept() {
    if (!invite || processing) return
    setProcessing(true)
    try {
      const { ok } = await respondInvite(invite.id, true)
      if (!ok) return
      // enterAcceptedGame() sets the current session; the existing
      // top-level session subscription (app/app/page.tsx) reacts to
      // that and performs the game transition itself — no separate
      // navigation call needed here, same as the existing Challenges
      // accept flow.
      await enterAcceptedGame(invite, myId)
      setInvite(null)
      setOpen(false)
    } finally {
      setProcessing(false)
    }
  }

  function dismiss() {
    // "Not now" only closes the popover — it does not alter or delete
    // the existing pending request, so the notification button remains
    // available afterward.
    setOpen(false)
  }

  if (!invite) return null

  return (
    <>
      <style>{`
        @keyframes rematchNotifPop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>
      <button onClick={() => setOpen(true)} aria-label="Rematch request"
        className="rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 17px)',
          right: 80,
          width: 46, height: 46,
          zIndex: 40,
          background: 'linear-gradient(135deg,#7c72ff,#d84dd8)',
          boxShadow: '0 6px 20px rgba(124,114,255,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: pop ? 'rematchNotifPop 0.45s ease' : undefined,
        }}>
        <span style={{ fontSize: 19, lineHeight: 1 }}>🔄</span>
        <span className="absolute flex items-center justify-center rounded-full font-bold text-white"
          style={{
            top: -4, right: -4,
            minWidth: 18, height: 18, padding: '0 4px',
            fontSize: 10,
            background: 'linear-gradient(135deg,#ff3384,#d84dd8)',
            boxShadow: '0 0 0 2px #0a0a10',
          }}>
          1
        </span>
      </button>

      {open && (
        <div className="flex items-center justify-center px-6"
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(5,4,10,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={dismiss}>
          <div onClick={e => e.stopPropagation()}
            className="w-full rounded-3xl p-6 text-center"
            style={{
              maxWidth: 320,
              background: 'rgba(18,14,28,0.92)',
              border: '1px solid rgba(124,114,255,0.28)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,114,255,0.18)',
            }}>
            <div className="text-[17px] font-extrabold text-white mb-2">
              {lang === 'gr' ? 'Νέα παρτίδα;' : 'Play again?'}
            </div>
            <div className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {lang === 'gr' ? `Ο/Η ${opponentName} θέλει να παίξετε ξανά.` : `${opponentName} wants another round.`}
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={accept} disabled={processing}
                className="rounded-full py-3 text-[14px] font-bold cursor-pointer active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', opacity: processing ? 0.7 : 1 }}>
                {lang === 'gr' ? 'Αποδοχή' : 'Accept'}
              </button>
              <button onClick={dismiss} disabled={processing}
                className="rounded-full py-3 text-[14px] font-semibold cursor-pointer active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {lang === 'gr' ? 'Όχι τώρα' : 'Not now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
