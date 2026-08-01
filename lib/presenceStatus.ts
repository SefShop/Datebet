import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Automatic presence status (Online / Away / Offline) ────────────
// Fully automatic — derived from real app activity (tab/app visibility)
// and heartbeat freshness. There is no manual selector anymore.
//
// Reuses the EXISTING profiles.last_seen column, already kept fresh
// every ~30s by the untouched automatic presence system in
// lib/presence.ts (startPresence/heartbeat) whenever the user is
// authenticated — regardless of tab visibility. That existing heartbeat
// is the "final source of truth" for staleness/offline detection here;
// this file adds no second heartbeat timer of its own. profiles.
// presence_status itself is only ever written on discrete, meaningful
// transitions (visibility change, logout) — never on a repeating timer.

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

// Stale-heartbeat timeout: if last_seen is older than this, the stored
// presence_status is no longer trusted and the user is shown as Offline
// regardless of what it says — covers app closed/crashed/disconnected,
// which may never get a chance to write an explicit 'offline' value.
// 28s — within the requested 25-30s range. Requires the heartbeat
// interval (lib/presence.ts) to have been reduced to 10s so this stays
// safely above heartbeat + a small buffer, per spec.
const OFFLINE_TIMEOUT_MS = 28 * 1000

function normalizeRaw(value: string | null | undefined): 'online' | 'away' | 'offline' {
  return value === 'away' || value === 'offline' ? value : 'online'
}

// The actual rule combining stored presence_status with heartbeat
// freshness — this is what every read path (fetch + realtime + the
// local re-check timer) funnels through, so "stale wins" is applied
// consistently everywhere.
export function deriveDisplayedPresence(rawStatus: string | null | undefined, lastSeen: string | null | undefined): PresenceStatus {
  if (rawStatus === 'offline') return 'offline'
  if (!lastSeen) return 'offline'  // unknown → default safely to Offline, never flash Online
  const age = Date.now() - new Date(lastSeen).getTime()
  if (age > OFFLINE_TIMEOUT_MS) return 'offline'
  return normalizeRaw(rawStatus)
}

// Fetch a specific user's current displayed presence (for viewers).
export async function getPresenceStatus(userId: string): Promise<PresenceStatus> {
  if (!isSupabaseConfigured()) return 'offline'
  try {
    const { data } = await supabase.from('profiles').select('presence_status, last_seen').eq('id', userId).maybeSingle()
    return deriveDisplayedPresence(data?.presence_status, data?.last_seen)
  } catch { return 'offline' }
}

// Raw fetch (status + last_seen) — used by the dot component's own
// periodic re-check timer, so it can re-derive staleness locally
// without waiting for a new realtime event (a stale transition happens
// purely from time passing, not from a database write).
export async function getRawPresence(userId: string): Promise<{ status: string | null; lastSeen: string | null }> {
  if (!isSupabaseConfigured()) return { status: null, lastSeen: null }
  try {
    const { data } = await supabase.from('profiles').select('presence_status, last_seen').eq('id', userId).maybeSingle()
    return { status: data?.presence_status ?? null, lastSeen: data?.last_seen ?? null }
  } catch { return { status: null, lastSeen: null } }
}

// Explicit logout path — call this and AWAIT it BEFORE supabase.auth.
// signOut(), while the session/user id is still valid. stopAutoPresence()
// alone is not sufficient for logout: it's only triggered afterward,
// indirectly, by the app's authed state changing — by which point
// auth.getUser() returns null and the write silently no-ops. This writes
// presence_status AND last_seen together, directly, using the id passed
// in (captured by the caller before signOut) rather than re-deriving it
// from auth state that may already be gone.
export async function setOfflineBeforeLogout(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return
  try {
    await supabase.from('profiles').update({ presence_status: 'offline', last_seen: new Date().toISOString() }).eq('id', userId)
    console.log('PRESENCE STATUS SET OFFLINE (pre-logout):', userId)
  } catch (e: any) { console.error('setOfflineBeforeLogout:', e.message) }
}

// Write the CURRENT user's presence_status — internal to the automatic
// controller below; not exported for arbitrary manual use.
async function writePresenceStatus(status: 'online' | 'away' | 'offline'): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ presence_status: status }).eq('id', user.id)
    console.log('AUTO PRESENCE STATUS SET:', status)
  } catch (e: any) { console.error('writePresenceStatus:', e.message) }
}

// ── Automatic controller ────────────────────────────────────────────
// Single visibilitychange listener per authenticated session (guarded
// against duplicates). Writes 'online' or 'away' immediately on every
// transition — no repeating timer of its own, reusing lib/presence.ts's
// existing heartbeat for staleness detection instead (see above).
let _visibilityHandler: (() => void) | null = null
let _started = false

export function startAutoPresence() {
  if (_started) return
  _started = true

  function apply() {
    const visible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    writePresenceStatus(visible ? 'online' : 'away')
  }

  apply()
  _visibilityHandler = () => apply()
  document.addEventListener('visibilitychange', _visibilityHandler)
}

export function stopAutoPresence() {
  if (_visibilityHandler) { document.removeEventListener('visibilitychange', _visibilityHandler); _visibilityHandler = null }
  _started = false
  writePresenceStatus('offline')
}

// Live updates for a specific user's presence_status/last_seen — scoped
// to exactly that one profile row, one channel per subscriber, cleaned
// up via the returned unsubscribe function.
export function subscribePresenceStatus(userId: string, onChange: (status: PresenceStatus) => void): () => void {
  if (!isSupabaseConfigured()) return () => {}
  const channel = supabase
    .channel(`presence-status-${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload: any) => {
        if (payload.new) {
          onChange(deriveDisplayedPresence(payload.new.presence_status, payload.new.last_seen))
        }
      })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
