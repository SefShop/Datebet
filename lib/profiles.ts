// ─────────────────────────────────────────────────────────────────
// Profiles — real users from Supabase ONLY. Zero demo data.
// ─────────────────────────────────────────────────────────────────
import type { Lang } from '@/lib/copy'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface UserProfile {
  id: string; name: string; age: number
  photo: string; gradient: string
  location: { en: string; gr: string }
  online: boolean; lastSeen?: string | null; interests: string[]
  bio: { en: string; gr: string }
}

const GRADIENTS = [
  'linear-gradient(135deg,#6c63ff,#a855f7)',
  'linear-gradient(135deg,#fd297b,#ff655b)',
  'linear-gradient(135deg,#38bdf8,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#f472b6,#c084fc)',
]

// ── Fetch OTHER users (for Discover) ────────────────────────────
export type FetchResult = { profiles: UserProfile[]; error: string | null }

export async function fetchProfiles(): Promise<FetchResult> {
  if (!isSupabaseConfigured()) {
    console.log('PROFILES: Supabase not configured')
    return { profiles: [], error: 'Supabase not configured' }
  }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('AUTH USER:', user?.id, user?.email)

    let query = supabase.from('profiles').select('*').limit(50)
    if (user?.id) query = query.neq('id', user.id)

    const { data, error } = await query
    console.log('DISCOVER PROFILES:', data?.map(p => ({ id: p.id, name: p.name })))

    if (error) { console.error('PROFILES error:', error); return { profiles: [], error: error.message } }
    if (!data || data.length === 0) return { profiles: [], error: null }

    return {
      error: null,
      profiles: data.map((row: any, i: number) => {
        // Real presence: is_online AND last_seen within 2 min
        const lastSeen = row.last_seen ? new Date(row.last_seen).getTime() : 0
        const online = !!row.is_online && (Date.now() - lastSeen) <= 2 * 60 * 1000
        return {
          id: row.id,
          name: row.name || 'Player',
          age: row.age || 0,
          photo: row.photo || '',
          gradient: GRADIENTS[i % GRADIENTS.length],
          location: { en: row.location || '', gr: row.location || '' },
          online,
          lastSeen: row.last_seen || null,
          interests: Array.isArray(row.interests) ? row.interests : [],
          bio: { en: row.bio || '', gr: row.bio || '' },
        }
      }),
    }
  } catch (e: any) {
    console.error('PROFILES catch:', e)
    return { profiles: [], error: e?.message || 'Unknown error' }
  }
}

// ── Current match state (who user is playing against) ───────────
let _match: UserProfile | null = null

export function setCurrentMatch(p: UserProfile) {
  console.log('SET MATCH:', p.id, p.name)
  _match = p
}

export function getCurrentMatch(): UserProfile | null {
  return _match
}

// ── Clear ALL profile state (call on logout / auth change) ──────
export function clearProfileState() {
  console.log('CLEAR PROFILE STATE')
  _match = null
}
