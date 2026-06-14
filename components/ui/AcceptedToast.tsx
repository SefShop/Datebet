'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { loadSessionByInvite, setCurrentSession, setOpponentName } from '@/lib/gameInvites'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

export default function AcceptedToast() {
  const { navigate, lang } = useApp()
  const [show, setShow]   = useState(false)
  const [name, setName]   = useState('')
  const [inviteId, setInviteId] = useState<string | null>(null)

  useEffect(() => {
    let channel: any = null
    async function sub() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel(`sender-invites-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'game_invites',
        }, async (payload: any) => {
          const inv = payload.new
          if (inv && inv.sender_id === user.id && inv.status === 'accepted') {
            console.log('SENDER INVITE ACCEPTED:', inv.id)
            const { data: prof } = await supabase.from('profiles').select('name').eq('id', inv.receiver_id).maybeSingle()
            setName(prof?.name || 'Player')
            setInviteId(inv.id)
            setShow(true)
            console.log('ACCEPTED POPUP SHOWN:', inv.id)
          }
        })
        .subscribe()
    }
    sub()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  async function enterRoom() {
    if (!inviteId) return
    console.log('ENTER GAME ROOM:', inviteId)
    const session = await loadSessionByInvite(inviteId)
    if (!session) { console.error('No session found'); return }
    console.log('SENDER GAME SESSION LOADED:', session.id)
    setCurrentSession(session)

    const { data: { user } } = await supabase.auth.getUser()
    const oppId = user?.id === session.player_one_id ? session.player_two_id : session.player_one_id
    const { data: oppProfile } = await supabase.from('profiles').select('*').eq('id', oppId).maybeSingle()
    if (oppProfile) {
      const profile: UserProfile = {
        id: oppProfile.id, name: oppProfile.name || 'Player', age: oppProfile.age || 0,
        photo: oppProfile.photo || '', gradient: 'linear-gradient(135deg,#fd297b,#ff655b)',
        location: { en: oppProfile.location || '', gr: oppProfile.location || '' },
        online: true, interests: [], bio: { en: oppProfile.bio || '', gr: oppProfile.bio || '' },
      }
      setCurrentMatch(profile)
      setOpponentName(oppProfile.name || 'Player')
      console.log('GAME OPPONENT NAME:', oppProfile.name)
    }
    setShow(false)
    navigate('game_room')
  }

  if (!show) return null

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-[120]"
        style={{ background: 'rgba(6,6,10,0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.25s ease both' }}
        onClick={() => setShow(false)} />

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-[121] px-4 pb-6"
        style={{ animation: 'sheetUp 0.4s cubic-bezier(0.34,1.4,0.64,1) both' }}>
        <div className="rounded-3xl p-7 text-center relative overflow-hidden"
          style={{
            background: 'rgba(15,12,25,0.96)', backdropFilter: 'blur(28px)',
            border: '1px solid rgba(253,41,123,0.25)',
            boxShadow: '0 -8px 60px rgba(253,41,123,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
          {/* Glow */}
          <div className="absolute pointer-events-none" style={{
            top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(253,41,123,0.25) 0%, transparent 70%)', filter: 'blur(30px)',
          }} />

          <div className="relative z-10">
            <div className="text-[44px] mb-3">🎮</div>
            <h2 className="text-[20px] font-extrabold text-white mb-1.5"
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {lang === 'gr' ? 'Παιχνίδι αποδεκτό' : 'Game accepted'}
            </h2>
            <p className="text-[14px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ color: '#fd297b', fontWeight: 700 }}>{name}</span>{' '}
              {lang === 'gr' ? 'δέχτηκε την πρόσκλησή σου.' : 'accepted your invite.'}
            </p>

            <button onClick={enterRoom}
              className="w-full rounded-2xl py-4 text-[16px] font-bold active:scale-[0.97] transition-transform cursor-pointer mb-2.5"
              style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff',
                       boxShadow: '0 8px 30px rgba(253,41,123,0.35)' }}>
              {lang === 'gr' ? 'Είσοδος στο Δωμάτιο' : 'Enter Game Room'}
            </button>
            <button onClick={() => setShow(false)}
              className="w-full py-2.5 text-[13px] font-medium active:opacity-60 transition-opacity cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              {lang === 'gr' ? 'Αργότερα' : 'Later'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}
