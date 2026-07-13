// Fetches whether the CURRENT authenticated user and a given opponent have
// photo access unlocked, plus both players' primary profile photo URLs, for
// use by the shared <GamePlayerAvatar> component across all game screens.
//
// This does NOT introduce a new unlock system — it reuses getPairProgress()
// from lib/pairProgress.ts, the exact same source of truth already used by
// the Discover/Profile screen's Reveal Progress and photo-unlock gate.
import { supabase } from '@/lib/supabase'
import { getPairProgress } from '@/lib/pairProgress'

export interface GamePlayerPhotoAccess {
  photoUnlocked: boolean
  myPhoto: string | null
  opponentPhoto: string | null
}

/**
 * Call once when entering a game screen (or when the opponent changes).
 * Safe to re-call on demand (e.g. re-entering a game) — this is a plain
 * fetch, not a new polling loop.
 */
export async function fetchGamePlayerPhotoAccess(
  myId: string | null,
  opponentId: string | null
): Promise<GamePlayerPhotoAccess> {
  const fallback: GamePlayerPhotoAccess = { photoUnlocked: false, myPhoto: null, opponentPhoto: null }
  if (!myId || !opponentId) return fallback

  try {
    const progress = await getPairProgress(opponentId)
    console.log('GAME AVATAR PHOTO UNLOCKED:', progress.photo_unlocked)

    if (!progress.photo_unlocked) {
      // Locked — never fetch or expose the real photo URLs at all.
      return { photoUnlocked: false, myPhoto: null, opponentPhoto: null }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, photo')
      .in('id', [myId, opponentId])

    if (error || !data) return { photoUnlocked: true, myPhoto: null, opponentPhoto: null }

    const myRow = data.find(r => r.id === myId)
    const oppRow = data.find(r => r.id === opponentId)
    const myPhoto = myRow?.photo || null
    const opponentPhoto = oppRow?.photo || null

    console.log('GAME AVATAR PRIMARY PHOTO:', myId, myPhoto ? 'present' : 'none')
    console.log('GAME AVATAR PRIMARY PHOTO:', opponentId, opponentPhoto ? 'present' : 'none')

    return { photoUnlocked: true, myPhoto, opponentPhoto }
  } catch (e: any) {
    console.error('GAME AVATAR FALLBACK ERROR:', e?.message)
    return fallback
  }
}
