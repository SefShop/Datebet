import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface PairProgress {
  games_completed: number
  photo_unlocked: boolean
  chat_unlocked: boolean
}

// Always order pair consistently: lowest UUID first
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// Load progress for the pair (current user + other user)
export async function getPairProgress(otherUserId: string): Promise<PairProgress> {
  const fallback = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return fallback
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback
    const [one, two] = orderPair(user.id, otherUserId)

    const { data, error } = await supabase
      .from('pair_progress')
      .select('games_completed, photo_unlocked, chat_unlocked')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .maybeSingle()

    if (error) { console.error('PAIR PROGRESS error:', error.message); return fallback }
    const result = data || fallback
    console.log('PAIR PROGRESS LOADED:', result.games_completed, '/10')
    return result
  } catch { return fallback }
}

// Increment games_completed for the pair when a game finishes
export async function incrementPairGames(otherUserId: string): Promise<PairProgress> {
  const fallback = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return fallback
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback
    const [one, two] = orderPair(user.id, otherUserId)

    console.log('GAME COMPLETED: pair', one.slice(0,6), two.slice(0,6))

    // Load existing
    const { data: existing } = await supabase
      .from('pair_progress')
      .select('*')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .maybeSingle()

    const newCount = (existing?.games_completed || 0) + 1
    const photo_unlocked = newCount >= 5
    const chat_unlocked = newCount >= 10

    if (existing) {
      await supabase.from('pair_progress')
        .update({ games_completed: newCount, photo_unlocked, chat_unlocked, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('pair_progress').insert({
        user_one_id: one, user_two_id: two,
        games_completed: newCount, photo_unlocked, chat_unlocked,
      })
    }

    console.log('PROGRESS UPDATED:', newCount, '/10')
    if (photo_unlocked && (!existing || !existing.photo_unlocked)) console.log('PHOTO UNLOCKED:')
    if (chat_unlocked && (!existing || !existing.chat_unlocked)) console.log('CHAT UNLOCKED:')

    return { games_completed: newCount, photo_unlocked, chat_unlocked }
  } catch (e: any) { console.error('incrementPairGames:', e); return fallback }
}
