import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getUnreadCount } from '@/lib/unread'

// ── Global messages state (single source of truth) ──────────────
export interface Conversation {
  partnerId: string
  partnerName: string
  partnerPhoto: string
  lastMessage: string
  lastTime: string
  unread: number
}

interface MessagesState {
  conversations: Conversation[]
  unread: number
  lastRefresh: number
}

let _state: MessagesState = { conversations: [], unread: 0, lastRefresh: 0 }
const _listeners = new Set<() => void>()

export function getMessagesState(): MessagesState { return _state }

export function subscribeMessages(fn: () => void): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

function notify() { _listeners.forEach(fn => fn()) }

// ── Session identity + generation (STEP 3C) ─────────────────────
// _userId is the authenticated user id the app (app/app/page.tsx, from the
// onAuthStateChange session) handed to startMessagesPolling() — so the
// recurring refresh does NOT have to re-ask supabase.auth.getUser() (a
// network round trip) on every tick. _gen is bumped on every start/stop:
// a refresh captures it before its first await and discards its result if
// it changed, so a request begun for user A can never write into the
// state of a later session (logout, or user B logging in).
let _userId: string | null = null
let _gen = 0
let _lastWarnAt = 0

// Expected transient failures (a dropped request) are logged at most once
// per 30s so a 3s poll can't spam the console; persistent failures still
// show up, just not on every tick.
function warnThrottled(msg: string, detail?: string) {
  const now = Date.now()
  if (now - _lastWarnAt < 30000) return
  _lastWarnAt = now
  console.warn(msg, detail ?? '')
}

// The single global refresh — fetches conversations + unread, updates shared state.
// `userId` is optional: with polling active the known session user is used;
// otherwise (a standalone caller before/without polling) it falls back to
// resolving the user itself, as before.
export async function refreshMessagesState(userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  console.log('GLOBAL MESSAGES REFRESH CALLED')
  const gen = _gen
  try {
    let uid = userId ?? _userId
    if (!uid) {
      const { data: { user }, error } = await supabase.auth.getUser()
      // getUser() does not throw on a dropped request — it returns
      // { user: null, error }. Only a genuinely missing session is
      // "signed out"; anything else is a transient failure to report.
      if (!user && error && (error as any).name !== 'AuthSessionMissingError') {
        warnThrottled('refreshMessagesState: could not resolve user (transient):', error.message)
      }
      uid = user?.id ?? null
    }
    if (!uid || gen !== _gen) return

    // Fetch all messages involving the user
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(500)

    // A failed query must not wipe the existing state to "no messages" —
    // keep what we have; the next tick/event recovers.
    if (msgsError) { warnThrottled('refreshMessagesState: messages query failed:', msgsError.message); return }
    if (gen !== _gen) return

    const convoMap = new Map<string, Conversation>()
    let unreadTotal = 0

    for (const m of msgs || []) {
      const partnerId = m.sender_id === uid ? m.receiver_id : m.sender_id
      const isUnread = m.receiver_id === uid && !m.read_at
      if (isUnread) unreadTotal++
      if (!convoMap.has(partnerId)) {
        convoMap.set(partnerId, {
          partnerId,
          partnerName: 'Player',
          partnerPhoto: '',
          lastMessage: m.text || '',
          lastTime: m.created_at,
          unread: isUnread ? 1 : 0,
        })
      } else if (isUnread) {
        convoMap.get(partnerId)!.unread++
      }
    }

    // Fetch partner profiles
    const ids = Array.from(convoMap.keys())
    if (ids.length > 0) {
      const { data: profs, error: profsError } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
      // Don't commit a state with every partner name reset to 'Player'
      // because this lookup dropped — keep the previous state instead.
      if (profsError) { warnThrottled('refreshMessagesState: profiles query failed:', profsError.message); return }
      for (const p of profs || []) {
        const c = convoMap.get(p.id)
        if (c) { c.partnerName = p.name || 'Player'; c.partnerPhoto = p.photo || '' }
      }
    }

    // Final stale check: logout / account switch while the queries above
    // were in flight must not repopulate state the new session now owns.
    if (gen !== _gen) { console.log('GLOBAL MESSAGES REFRESH DISCARDED (session changed)'); return }

    const conversations = Array.from(convoMap.values())
    console.log('GLOBAL CONVERSATIONS COUNT:', conversations.length)
    console.log('GLOBAL UNREAD COUNT:', unreadTotal)

    _state = { conversations, unread: unreadTotal, lastRefresh: Date.now() }
    notify()
  } catch (e: any) { console.error('refreshMessagesState:', e.message) }
}

// ── Interval management (single interval, no duplicates) ────────
let _interval: any = null

// userId: the authenticated user id from app/app/page.tsx's auth session.
export function startMessagesPolling(userId: string) {
  if (_interval) return  // avoid duplicates
  console.log('MESSAGES INTERVAL STARTED')
  _userId = userId
  _gen++
  refreshMessagesState()
  _interval = setInterval(() => refreshMessagesState(), 3000)
}

export function stopMessagesPolling() {
  if (_interval) { clearInterval(_interval); _interval = null; console.log('MESSAGES INTERVAL CLEARED') }
  // Invalidate any in-flight refresh and forget the user, then drop the
  // previous user's conversations/unread so they can never be shown to (or
  // linger for) the next session. Only notifies if there was anything to clear.
  _gen++
  _userId = null
  if (_state.conversations.length > 0 || _state.unread > 0 || _state.lastRefresh !== 0) {
    _state = { conversations: [], unread: 0, lastRefresh: 0 }
    notify()
  }
}
