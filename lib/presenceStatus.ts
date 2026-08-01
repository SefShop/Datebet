import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Manual presence status (Online / Away / Offline) ───────────────
// This is a SEPARATE, user-controlled field from the existing automatic
// is_online/last_seen presence system in lib/presence.ts, which this
// file never reads from or writes to. Persisted in profiles.presence_status.

export type PresenceStatus = 'online' | 'away' | 'offline'

export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, { dot: string; glow: string }> = {
  online:  { dot: '#4ade80', glow: '0 0 6px #4ade80' },
  away:    { dot: '#fbbf24', glow: 'none' },
  offline: { dot: '#6b7280', glow: 'none' },
}

export function presenceStatusTitle(status: PresenceStatus, lang: 'en' | 'gr'): string {
  if (lang === 'gr') {
    return status === 'online' ? 'Σε σύνδεση' : status === 'away' ? 'Μακριά' : 'Εκτός σύνδεσης'
  }
  return status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'
}

export function presenceStatusDescription(status: PresenceStatus, lang: 'en' | 'gr'): string {
  if (lang === 'gr') {
    return status === 'online' ? 'Εμφανίζεσαι ως ενεργός.' : status === 'away' ? 'Είσαι προσωρινά μακριά.' : 'Δεν εμφανίζεσαι ως ενεργός.'
  }
  return status === 'online' ? 'Appear as active.' : status === 'away' ? 'Temporarily away.' : 'Do not appear as active.'
}

export function presenceStatusToast(status: PresenceStatus, lang: 'en' | 'gr'): string {
  if (lang === 'gr') {
    return status === 'online' ? 'Είσαι τώρα σε σύνδεση.' : status === 'away' ? 'Η κατάσταση άλλαξε σε Μακριά.' : 'Είσαι τώρα εκτός σύνδεσης.'
  }
  return status === 'online' ? "You're now Online." : status === 'away' ? 'Status changed to Away.' : "You're now Offline."
}

function normalize(value: string | null | undefined): PresenceStatus {
  return value === 'away' || value === 'offline' ? value : 'online'
}

// Fetch a specific user's manual presence status. Defaults to 'online'
// for users without a saved value, per spec.
export async function getPresenceStatus(userId: string): Promise<PresenceStatus> {
  if (!isSupabaseConfigured()) return 'online'
  try {
    const { data } = await supabase.from('profiles').select('presence_status').eq('id', userId).maybeSingle()
    return normalize(data?.presence_status)
  } catch { return 'online' }
}

// Set the CURRENT user's manual presence status.
export async function setPresenceStatus(status: PresenceStatus): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }
    const { error } = await supabase.from('profiles').update({ presence_status: status }).eq('id', user.id)
    if (error) { console.error('setPresenceStatus:', error.message); return { ok: false } }
    console.log('PRESENCE STATUS SET:', status)
    return { ok: true }
  } catch (e: any) { console.error('setPresenceStatus:', e.message); return { ok: false } }
}

// Live updates for a specific user's presence_status — scoped to exactly
// that one profile row, one channel per subscriber, cleaned up via the
// returned unsubscribe function.
export function subscribePresenceStatus(userId: string, onChange: (status: PresenceStatus) => void): () => void {
  if (!isSupabaseConfigured()) return () => {}
  const channel = supabase
    .channel(`presence-status-${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload: any) => {
        if (payload.new && 'presence_status' in payload.new) {
          onChange(normalize(payload.new.presence_status))
        }
      })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
