import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface PairProgress {
  games_completed: number
  photo_unlocked: boolean
  chat_unlocked: boolean
  error?: string
}

// ── Single authoritative unlock calculation ──────────────────────────
// Every screen (Profile/Discover, Mystery Choice, Tic Tac Toe, Game Room,
// Chat access) must use this same derivation. Chat is only ever unlocked
// if the photo stage has ALSO been reached — this makes the rule
// self-correcting even if a stored row's booleans are ever inconsistent
// with games_completed (bad legacy data, a duplicate row, a stale write,
// etc.). Thresholds are unchanged: photo at 5, chat at 10.
export function deriveUnlockState(games_completed: number): { photo_unlocked: boolean; chat_unlocked: boolean } {
  const safeCount = typeof games_completed === 'number' && games_completed > 0 ? games_completed : 0
  const photo_unlocked = safeCount >= 5
  const chat_unlocked = safeCount >= 10 && photo_unlocked
  return { photo_unlocked, chat_unlocked }
}

// Normalize pair ids — identical ordering for both users
function sortPair(a: string, b: string): [string, string] {
  const sorted = [a, b].sort()
  return [sorted[0], sorted[1]]
}

export async function getPairProgress(otherUserId: string): Promise<PairProgress> {
  const fallback: PairProgress = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return fallback
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...fallback, error: 'no user' }
    const [one, two] = sortPair(user.id, otherUserId)
    console.log('PAIR IDS SORTED:', one, two)

    // Read ALL rows for this pair (in case duplicates exist), pick highest
    const { data, error } = await supabase
      .from('pair_progress')
      .select('games_completed, photo_unlocked, chat_unlocked')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .order('games_completed', { ascending: false })

    if (error) { console.error('PAIR PROGRESS error:', error.message); return { ...fallback, error: error.message } }
    if (data && data.length > 1) console.log('DUPLICATE PAIR ROWS FOUND:', data.length)

    const best = data && data.length > 0 ? data[0] : fallback
    // Fail-closed, authoritative: never trust the stored photo_unlocked/
    // chat_unlocked columns directly — always recompute from
    // games_completed. This is what stops a stale or inconsistent stored
    // chat_unlocked=true from ever exposing Chat before games_completed
    // actually reaches 10.
    const derived = deriveUnlockState(best.games_completed)
    console.log('PAIR PROGRESS LOADED:', best.games_completed)
    console.log('EFFECTIVE UNLOCK STATE:', derived)
    console.log('PROGRESS PRIVATE ROW:', one, two)
    return { games_completed: best.games_completed, photo_unlocked: derived.photo_unlocked, chat_unlocked: derived.chat_unlocked }
  } catch (e: any) { return { ...fallback, error: e.message } }
}

export async function incrementPairGames(otherUserId: string): Promise<PairProgress> {
  const fallback: PairProgress = { games_completed: 0, photo_unlocked: false, chat_unlocked: false }
  if (!isSupabaseConfigured()) return { ...fallback, error: 'not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...fallback, error: 'no user' }
    const [one, two] = sortPair(user.id, otherUserId)
    console.log('PAIR IDS SORTED:', one, two)

    // Read all rows for this pair, ordered by highest
    const { data: rows, error: selErr } = await supabase
      .from('pair_progress')
      .select('*')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .order('games_completed', { ascending: false })

    if (selErr) { console.error('SELECT ERROR:', selErr.message); return { ...fallback, error: 'select: ' + selErr.message } }

    if (rows && rows.length > 1) {
      console.log('DUPLICATE PAIR ROWS FOUND:', rows.length)
      // Clean up duplicates: keep the highest, delete the rest
      const keep = rows[0]
      const dupeIds = rows.slice(1).map(r => r.id)
      if (dupeIds.length > 0) await supabase.from('pair_progress').delete().in('id', dupeIds)
    }

    const existing = rows && rows.length > 0 ? rows[0] : null
    console.log('PROGRESS BEFORE:', existing?.games_completed || 0)
    const newCount = (existing?.games_completed || 0) + 1
    const { photo_unlocked, chat_unlocked } = deriveUnlockState(newCount)

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

    if (updErr) { console.error('UPDATE ERROR:', updErr.message); return { ...fallback, error: updErr.message } }

    console.log('PROGRESS AFTER:', newCount)
    if (photo_unlocked && (!existing || !existing.photo_unlocked)) console.log('PHOTO UNLOCKED:')
    if (chat_unlocked && (!existing || !existing.chat_unlocked)) console.log('CHAT UNLOCKED:')

    return { games_completed: newCount, photo_unlocked, chat_unlocked }
  } catch (e: any) { console.error('incrementPairGames:', e); return { ...fallback, error: e.message } }
}
