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

// The single global refresh — fetches conversations + unread, updates shared state
export async function refreshMessagesState(): Promise<void> {
  if (!isSupabaseConfigured()) return
  console.log('GLOBAL MESSAGES REFRESH CALLED')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch all messages involving the user
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500)

    const convoMap = new Map<string, Conversation>()
    let unreadTotal = 0

    for (const m of msgs || []) {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
      const isUnread = m.receiver_id === user.id && !m.read_at
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
      const { data: profs } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
      for (const p of profs || []) {
        const c = convoMap.get(p.id)
        if (c) { c.partnerName = p.name || 'Player'; c.partnerPhoto = p.photo || '' }
      }
    }

    const conversations = Array.from(convoMap.values())
    console.log('GLOBAL CONVERSATIONS COUNT:', conversations.length)
    console.log('GLOBAL UNREAD COUNT:', unreadTotal)

    _state = { conversations, unread: unreadTotal, lastRefresh: Date.now() }
    notify()
  } catch (e: any) { console.error('refreshMessagesState:', e.message) }
}

// ── Interval management (single interval, no duplicates) ────────
let _interval: any = null

export function startMessagesPolling() {
  if (_interval) return  // avoid duplicates
  console.log('MESSAGES INTERVAL STARTED')
  refreshMessagesState()
  _interval = setInterval(() => refreshMessagesState(), 3000)
}

export function stopMessagesPolling() {
  if (_interval) { clearInterval(_interval); _interval = null; console.log('MESSAGES INTERVAL CLEARED') }
}
