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

export async function refreshNotifications(): Promise<void> {
  if (!isSupabaseConfigured()) return
  console.log('GLOBAL NOTIFICATIONS REFRESH')
  try {
    const unreadMessages = getMessagesState().unread
    console.log('UNREAD MESSAGES COUNT:', unreadMessages)

    const pendingInvites = await getInviteCount()
    console.log('PENDING INVITES COUNT:', pendingInvites)

    const total = unreadMessages + pendingInvites
    _state = { unreadMessages, pendingInvites, total, lastRefresh: Date.now() }
    notify()
  } catch (e: any) { console.error('refreshNotifications:', e.message) }
}

// ── Interval + realtime management (single instance, no duplicates) ──
let _interval: any = null
let _channel: any = null
let _unsubMessages: (() => void) | null = null

export function startNotificationsPolling() {
  if (_interval) return  // avoid duplicates
  refreshNotifications()

  // Poll every 10s
  _interval = setInterval(() => refreshNotifications(), 10000)

  // React instantly whenever the global messages store updates
  _unsubMessages = subscribeMessages(() => refreshNotifications())

  // Realtime: new/updated game invites for the current user
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return
    _channel = supabase
      .channel(`notifications-invites-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites' }, (payload: any) => {
        if (payload.new?.receiver_id === user.id) refreshNotifications()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invites' }, (payload: any) => {
        if (payload.new?.receiver_id === user.id) refreshNotifications()
      })
      .subscribe()
  })
}

export function stopNotificationsPolling() {
  if (_interval) { clearInterval(_interval); _interval = null }
  if (_unsubMessages) { _unsubMessages(); _unsubMessages = null }
  if (_channel) { supabase.removeChannel(_channel); _channel = null }
  _state = { unreadMessages: 0, pendingInvites: 0, total: 0, lastRefresh: 0 }
}
