import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getMessagesState, subscribeMessages } from '@/lib/messagesState'
import { getInviteCount } from '@/lib/gameInvites'

// ── Global notifications state (single source of truth) ─────────
// Combines: unread messages + pending incoming game invites
// (Play Again requests use the same invite mechanism, so they're
// already included in pendingInvites — no separate counting needed.)

interface NotificationsState {
  unreadMessages: number
  pendingInvites: number
  total: number
  lastRefresh: number
}

let _state: NotificationsState = { unreadMessages: 0, pendingInvites: 0, total: 0, lastRefresh: 0 }
const _listeners = new Set<() => void>()

export function getNotificationsState(): NotificationsState { return _state }

export function subscribeNotifications(fn: () => void): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

function notify() { _listeners.forEach(fn => fn()) }

// ── Session identity + generation (STEP 3C) ─────────────────────
// _userId: the authenticated user id app/app/page.tsx handed to
// startNotificationsPolling() from the auth session — reused for the invite
// count and the realtime channel instead of each calling getUser() again.
// _gen: bumped on every start/stop; a refresh captures it first and drops
// its result if the session changed while it was in flight.
let _userId: string | null = null
let _gen = 0
let _lastWarnAt = 0

export async function refreshNotifications(): Promise<void> {
  if (!isSupabaseConfigured()) return
  console.log('GLOBAL NOTIFICATIONS REFRESH')
  const gen = _gen
  try {
    const unreadMessages = getMessagesState().unread
    console.log('UNREAD MESSAGES COUNT:', unreadMessages)

    const pendingInvites = await getInviteCount(_userId ?? undefined)
    console.log('PENDING INVITES COUNT:', pendingInvites)

    // Session changed (logout / account switch) while the count was in
    // flight: this result belongs to the old session — drop it.
    if (gen !== _gen) { console.log('GLOBAL NOTIFICATIONS REFRESH DISCARDED (session changed)'); return }

    // null = the count could not be determined (transient failure). Keep the
    // previous state rather than showing 0 pending invites; the next tick or
    // realtime event recovers. Logged at most once per 30s.
    if (pendingInvites === null) {
      const now = Date.now()
      if (now - _lastWarnAt >= 30000) { _lastWarnAt = now; console.warn('refreshNotifications: invite count unavailable (transient) — keeping previous value') }
      return
    }

    const total = unreadMessages + pendingInvites
    _state = { unreadMessages, pendingInvites, total, lastRefresh: Date.now() }
    notify()
  } catch (e: any) { console.error('refreshNotifications:', e.message) }
}

// ── Interval + realtime management (single instance, no duplicates) ──
let _interval: any = null
let _channel: any = null
let _unsubMessages: (() => void) | null = null

// userId: the authenticated user id from app/app/page.tsx's auth session.
export function startNotificationsPolling(userId: string) {
  if (_interval) return  // avoid duplicates
  _userId = userId
  _gen++
  refreshNotifications()

  // Poll every 10s
  _interval = setInterval(() => refreshNotifications(), 10000)

  // React instantly whenever the global messages store updates
  _unsubMessages = subscribeMessages(() => refreshNotifications())

  // Realtime: new/updated game invites for the current user. Set up
  // synchronously from the known userId — previously this waited on its own
  // supabase.auth.getUser().then(...) with no catch: a transient failure
  // there silently meant NO realtime channel for the whole session, and if
  // stop ran before it resolved the channel was created AFTER stop and
  // leaked (never removed). No async gap, no floating promise, no leak.
  _channel = supabase
    .channel(`notifications-invites-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites' }, (payload: any) => {
      if (payload.new?.receiver_id === userId) refreshNotifications()
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invites' }, (payload: any) => {
      if (payload.new?.receiver_id === userId) refreshNotifications()
    })
    .subscribe()
}

export function stopNotificationsPolling() {
  if (_interval) { clearInterval(_interval); _interval = null }
  if (_unsubMessages) { _unsubMessages(); _unsubMessages = null }
  if (_channel) { supabase.removeChannel(_channel); _channel = null }
  _gen++
  _userId = null
  const hadState = _state.total !== 0 || _state.unreadMessages !== 0 || _state.pendingInvites !== 0 || _state.lastRefresh !== 0
  _state = { unreadMessages: 0, pendingInvites: 0, total: 0, lastRefresh: 0 }
  // Tell mounted badge subscribers (e.g. the drawer menu keeps a local copy)
  // so the previous user's counts don't linger on screen until the next
  // session's first refresh.
  if (hadState) notify()
}
