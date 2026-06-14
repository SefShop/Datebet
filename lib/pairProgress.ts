import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface PairProgress {
  games_completed: number
  photo_unlocked: boolean
  chat_unlocked: boolean
  error?: string  // for debugging
}

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function getPairProgress(otherUserId: string): Promise<PairProgress> {
  const fallback: PairProgress = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return fallback
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...fallback, error: 'no user' }
    const [one, two] = orderPair(user.id, otherUserId)
    console.log('PAIR IDS: user_one_id:', one, 'user_two_id:', two)

    const { data, error } = await supabase
      .from('pair_progress')
      .select('games_completed, photo_unlocked, chat_unlocked')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .maybeSingle()

    if (error) { console.error('PAIR PROGRESS error:', error.message); return { ...fallback, error: error.message } }
    const result = { ...(data || fallback) }
    console.log('PAIR PROGRESS BEFORE:', result.games_completed)
    return result
  } catch (e: any) { return { ...fallback, error: e.message } }
}

export async function incrementPairGames(otherUserId: string): Promise<PairProgress> {
  const fallback: PairProgress = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return { ...fallback, error: 'not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...fallback, error: 'no user' }
    const [one, two] = orderPair(user.id, otherUserId)

    console.log('PAIR IDS: user_one_id:', one, 'user_two_id:', two)

    // Load existing
    const { data: existing, error: selErr } = await supabase
      .from('pair_progress')
      .select('*')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .maybeSingle()

    if (selErr) { console.error('SELECT ERROR:', selErr.message); return { ...fallback, error: 'select: ' + selErr.message } }

    const newCount = (existing?.games_completed || 0) + 1
    const photo_unlocked = newCount >= 5
    const chat_unlocked = newCount >= 10
    console.log('PAIR PROGRESS BEFORE:', existing?.games_completed || 0)

    let updErr: any = null
    if (existing) {
      const { error } = await supabase.from('pair_progress')
        .update({ games_completed: newCount, photo_unlocked, chat_unlocked, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      updErr = error
    } else {
      const { error } = await supabase.from('pair_progress').insert({
        user_one_id: one, user_two_id: two,
        games_completed: newCount, photo_unlocked, chat_unlocked,
      })
      updErr = error
    }

    if (updErr) {
      console.error('UPDATE ERROR:', updErr.message)
      return { ...fallback, error: updErr.message }
    }

    console.log('PAIR PROGRESS AFTER:', newCount)
    if (photo_unlocked && (!existing || !existing.photo_unlocked)) console.log('PHOTO UNLOCKED:')
    if (chat_unlocked && (!existing || !existing.chat_unlocked)) console.log('CHAT UNLOCKED:')

    return { games_completed: newCount, photo_unlocked, chat_unlocked }
  } catch (e: any) { console.error('incrementPairGames:', e); return { ...fallback, error: e.message } }
}
