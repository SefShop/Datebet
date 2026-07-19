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
  bioLanguage?: string  // ISO 639-1 code detected when the bio was saved (or "und"/absent = unknown)
  photos?: string[]     // up to 9, ordered — photos[0] is always the same as `photo` (the primary)
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

// Shared row→UserProfile mapping — used by both the initial fetch and the
// realtime subscription below, so a newly-arrived profile is normalized
// exactly the same way as ones loaded on first render.
function mapProfileRow(row: any, i: number = 0): UserProfile {
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
    bioLanguage: row.bio_language || 'und',
    photos: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos : (row.photo ? [row.photo] : []),
  }
}

// A row counts as "discoverable" once it has the minimum fields the
// existing Discover UI already relies on — matches the same lax standard
// the initial fetch already uses (it doesn't filter incomplete rows out
// either), just guards against an empty placeholder row with no name yet.
function isDiscoverableRow(row: any): boolean {
  return !!row?.id && typeof row.name === 'string' && row.name.trim().length > 0
}

// ── Realtime: new profiles becoming discoverable ─────────────────
// Subscribes to INSERT and UPDATE on `profiles` so a newly-registered user
// appears for everyone currently on Discover without a refresh, even if
// their profile row is created in stages (auto-created blank, then
// upserted with real onboarding data — see AuthScreen.tsx/app/page.tsx).
export function subscribeToNewProfiles(
  myId: string | null,
  onNewProfile: (p: UserProfile) => void
) {
  const channel = supabase
    .channel(`discover-new-profiles-${myId || 'anon'}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload: any) => {
      const row = payload.new
      if (!row || row.id === myId) return
      if (!isDiscoverableRow(row)) { console.log('DISCOVER NEW PROFILE SKIPPED (incomplete):', row?.id); return }
      console.log('DISCOVER NEW PROFILE INSERT:', row.id, row.name)
      onNewProfile(mapProfileRow(row))
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
      const row = payload.new
      if (!row || row.id === myId) return
      if (!isDiscoverableRow(row)) return
      // Covers staged creation: a blank row inserted first, then filled in
      // via a later UPDATE (e.g. onboarding finishing after the auto-create).
      console.log('DISCOVER NEW PROFILE UPDATE:', row.id, row.name)
      onNewProfile(mapProfileRow(row))
    })
    .subscribe()

  return () => {
    console.log('DISCOVER NEW PROFILES UNSUBSCRIBE')
    supabase.removeChannel(channel)
  }
}

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
      profiles: data.map((row: any, i: number) => mapProfileRow(row, i)),
    }
  } catch (e: any) {
    console.error('PROFILES catch:', e)
    return { profiles: [], error: e?.message || 'Unknown error' }
  }
}

// ── Current match state (who user is playing against) ───────────
let _match: UserProfile | null = null
type MatchListener = (m: UserProfile | null) => void
const _matchListeners = new Set<MatchListener>()

export function setCurrentMatch(p: UserProfile) {
  console.log('SET MATCH:', p.id, p.name)
  _match = p
  _matchListeners.forEach(fn => { try { fn(p) } catch (e) { console.error('match listener error:', e) } })
}

export function getCurrentMatch(): UserProfile | null {
  return _match
}

// Subscribe to be notified immediately whenever setCurrentMatch() is
// called anywhere in the app — mirrors subscribeCurrentSession /
// subscribePendingInvite. ChatScreen (like every other game screen) stays
// permanently mounted, hidden via CSS, between uses — reading
// getCurrentMatch() only at render time meant it could still be showing a
// stale opponent (or none) from an earlier render, since nothing forced
// it to notice a fresh setCurrentMatch() call until some unrelated
// re-render happened to occur.
export function subscribeCurrentMatch(listener: MatchListener): () => void {
  _matchListeners.add(listener)
  return () => { _matchListeners.delete(listener) }
}

// ── Clear ALL profile state (call on logout / auth change) ──────
export function clearProfileState() {
  console.log('CLEAR PROFILE STATE')
  _match = null
  _matchListeners.forEach(fn => { try { fn(null) } catch (e) { console.error('match listener error:', e) } })
}
