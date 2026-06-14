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
          // Only react if I'm the sender and it just got accepted
          if (inv && inv.sender_id === user.id && inv.status === 'accepted') {
            console.log('SENDER INVITE ACCEPTED:', inv.id)
            // Fetch receiver name
            const { data: prof } = await supabase.from('profiles').select('name').eq('id', inv.receiver_id).maybeSingle()
            setName(prof?.name || 'Player')
            setInviteId(inv.id)
            setShow(true)
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

    // Set receiver as current match + opponent
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
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[120] w-[90%] max-w-[340px]"
      style={{ animation: 'acceptSlide 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(15,12,25,0.95)', backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(253,41,123,0.3)', boxShadow: '0 16px 48px rgba(253,41,123,0.2)' }}>
        <div className="text-[28px]">🎮</div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-white">
            {name} {lang === 'gr' ? 'δέχτηκε!' : 'accepted!'}
          </div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {lang === 'gr' ? 'Η πρόσκλησή σου έγινε δεκτή' : 'Your invite was accepted'}
          </div>
        </div>
        <button onClick={enterRoom}
          className="flex-shrink-0 rounded-full px-4 py-2 text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', color: '#fff' }}>
          {lang === 'gr' ? 'Είσοδος' : 'Enter'}
        </button>
      </div>
      <style>{`@keyframes acceptSlide { from{opacity:0;transform:translate(-50%,-16px)} to{opacity:1;transform:translate(-50%,0)} }`}</style>
    </div>
  )
}
