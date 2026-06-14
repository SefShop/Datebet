import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface GameInvite {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  game_type: string
  status: 'pending' | 'accepted' | 'declined'
  message: string | null
  // joined
  sender_name?: string
  sender_photo?: string
  receiver_name?: string
}

export async function sendGameInvite(receiverId: string, gameType = 'mystery'): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not logged in' }

    // Get sender name for message
    const { data: myProfile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    const senderName = myProfile?.name || 'Someone'

    // Avoid duplicate pending
    const { data: existing } = await supabase
      .from('game_invites')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) return { ok: false, error: 'Invite already sent' }

    const { error } = await supabase.from('game_invites').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      game_type: gameType,
      status: 'pending',
      message: `${senderName} invited you to play`,
    })

    if (error) { console.error('GAME INVITE error:', error); return { ok: false, error: error.message } }
    console.log('GAME INVITE SENT:', receiverId, gameType)
    return { ok: true }
  } catch (e: any) { return { ok: false, error: e.message } }
}

export async function getIncomingInvites(): Promise<GameInvite[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) { console.error('INCOMING INVITES error:', error); return [] }

    const ids = data.map(i => i.sender_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const result = data.map(i => ({
      ...i,
      sender_name: pMap.get(i.sender_id)?.name || 'Player',
      sender_photo: pMap.get(i.sender_id)?.photo || '',
    }))
    console.log('INCOMING INVITES:', result.length)
    return result
  } catch { return [] }
}

export async function getOutgoingInvites(): Promise<GameInvite[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('sender_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) return []

    const ids = data.map(i => i.receiver_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(i => ({
      ...i,
      receiver_name: pMap.get(i.receiver_id)?.name || 'Player',
    }))
  } catch { return [] }
}

export async function respondInvite(inviteId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('game_invites')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', inviteId)
    if (error) return { ok: false, error: error.message }
    console.log(accept ? 'INVITE ACCEPTED:' : 'INVITE DECLINED:', inviteId)
    return { ok: true }
  } catch (e: any) { return { ok: false, error: e.message } }
}

export async function getInviteCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { count } = await supabase
      .from('game_invites')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    return count ?? 0
  } catch { return 0 }
}
