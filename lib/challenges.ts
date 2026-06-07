import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Challenge {
  id: string
  created_at: string
  challenger_id: string
  challenged_id: string
  status: 'pending' | 'accepted' | 'declined'
  game_type: string | null
  // Joined profile data
  challenger_name?: string
  challenger_photo?: string
  challenged_name?: string
  challenged_photo?: string
}

export async function sendChallenge(challengedId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not logged in' }

    // Check for existing pending challenge
    const { data: existing } = await supabase
      .from('challenges')
      .select('id')
      .eq('challenger_id', user.id)
      .eq('challenged_id', challengedId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) return { ok: false, error: 'Challenge already sent' }

    const { error } = await supabase.from('challenges').insert({
      challenger_id: user.id,
      challenged_id: challengedId,
    })

    if (error) { console.error('CHALLENGE send error:', error); return { ok: false, error: error.message } }
    console.log('CHALLENGE sent to', challengedId)
    return { ok: true }
  } catch (e: any) { return { ok: false, error: e.message } }
}

export async function getIncomingChallenges(): Promise<Challenge[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenged_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) { console.error('CHALLENGES fetch error:', error); return [] }

    // Fetch challenger profiles
    const ids = data.map(c => c.challenger_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(c => ({
      ...c,
      challenger_name: pMap.get(c.challenger_id)?.name || 'Player',
      challenger_photo: pMap.get(c.challenger_id)?.photo || '',
    }))
  } catch { return [] }
}

export async function getOutgoingChallenges(): Promise<Challenge[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenger_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) return []

    const ids = data.map(c => c.challenged_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(c => ({
      ...c,
      challenged_name: pMap.get(c.challenged_id)?.name || 'Player',
      challenged_photo: pMap.get(c.challenged_id)?.photo || '',
    }))
  } catch { return [] }
}

export async function respondChallenge(challengeId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('challenges')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', challengeId)

    if (error) return { ok: false, error: error.message }
    console.log('CHALLENGE', accept ? 'accepted' : 'declined', challengeId)
    return { ok: true }
  } catch (e: any) { return { ok: false, error: e.message } }
}
