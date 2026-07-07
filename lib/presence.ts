import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Real online/offline presence ────────────────────────────────

// Set current user online + timestamp
export async function setOnline(): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id)
    console.log('PRESENCE ONLINE SET')
  } catch (e: any) { console.error('setOnline:', e.message) }
}

// Heartbeat — update last_seen (keeps online fresh)
export async function heartbeat(): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id)
    console.log('PRESENCE HEARTBEAT')
  } catch { /* silent */ }
}

// Set offline (logout / tab hidden / close)
export async function setOffline(): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id)
    console.log('PRESENCE OFFLINE SET')
  } catch { /* silent */ }
}

// ── Heartbeat interval management (single, no duplicates) ────────
let _hb: any = null

export function startPresence() {
  if (_hb) return
  setOnline()
  _hb = setInterval(() => heartbeat(), 30000)  // every 30s
}

export function stopPresence() {
  if (_hb) { clearInterval(_hb); _hb = null }
  setOffline()
}

// ── Display helpers ─────────────────────────────────────────────

// Is a profile online right now? (is_online AND last_seen within 2 min)
export function isOnlineNow(isOnline: boolean | null, lastSeen: string | null): boolean {
  if (!isOnline || !lastSeen) return false
  const diff = Date.now() - new Date(lastSeen).getTime()
  return diff <= 2 * 60 * 1000  // 2 minutes
}

// "online" or "last seen X ago"
export function presenceLabel(isOnline: boolean | null, lastSeen: string | null, lang: 'en' | 'gr' = 'en'): string {
  if (isOnlineNow(isOnline, lastSeen)) return lang === 'gr' ? 'σε σύνδεση' : 'online'
  if (!lastSeen) return lang === 'gr' ? 'εκτός σύνδεσης' : 'offline'
  const mins = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000)
  if (mins < 1) return lang === 'gr' ? 'μόλις τώρα' : 'just now'
  if (mins < 60) return lang === 'gr' ? `εθεάθη πριν ${mins}λ` : `last seen ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return lang === 'gr' ? `εθεάθη πριν ${hrs}ω` : `last seen ${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return lang === 'gr' ? `εθεάθη πριν ${days}μ` : `last seen ${days}d ago`
}

// Fetch presence for a specific user
export async function getPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: string | null }> {
  if (!isSupabaseConfigured()) return { isOnline: false, lastSeen: null }
  try {
    const { data } = await supabase.from('profiles').select('is_online, last_seen').eq('id', userId).maybeSingle()
    const online = isOnlineNow(data?.is_online ?? false, data?.last_seen ?? null)
    console.log('PRESENCE STATUS CHECK:', online ? 'online' : 'offline')
    return { isOnline: data?.is_online ?? false, lastSeen: data?.last_seen ?? null }
  } catch { return { isOnline: false, lastSeen: null } }
}
