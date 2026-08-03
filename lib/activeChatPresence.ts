import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Active chat presence (client side) ──────────────────────────────
// Writes a server-visible record of which conversation this device is
// currently viewing, so the message-push route can suppress a push
// when the recipient is already looking at the exact chat. This is
// intentionally separate from the automatic Online/Away/Offline
// presence system (lib/presenceStatus.ts) — a different concern, a
// different table, no shared code with that system at all.

const DEVICE_KEY_STORAGE = 'dateduel_device_key'
const HEARTBEAT_INTERVAL_MS = 12000  // within the requested 10-15s range

function getDeviceKey(): string {
  try {
    let key = localStorage.getItem(DEVICE_KEY_STORAGE)
    if (!key) {
      key = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(DEVICE_KEY_STORAGE, key)
    }
    return key
  } catch {
    return 'unknown-device'
  }
}

let _heartbeatTimer: ReturnType<typeof setInterval> | null = null
let _activeOtherUserId: string | null = null
let _visibilityHandlerAttached = false

function attachVisibilityHandler() {
  if (_visibilityHandlerAttached || typeof document === 'undefined') return
  _visibilityHandlerAttached = true
  document.addEventListener('visibilitychange', () => {
    if (!_activeOtherUserId) return
    if (document.visibilityState === 'visible') {
      writePresence(_activeOtherUserId, true)
    } else {
      // Backgrounded while a chat is logically still open — write
      // inactive immediately rather than waiting for the row to go
      // stale, without clearing the logical target (markChatActive
      // wasn't called again; the user didn't navigate away).
      writePresence(_activeOtherUserId, false)
    }
  })
}

async function writePresence(otherUserId: string, active: boolean): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('active_chat_presence').upsert({
      user_id: user.id,
      other_user_id: otherUserId,
      device_key: getDeviceKey(),
      active,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,other_user_id,device_key' })
  } catch (e: any) {
    // Never throws to the caller — this is a best-effort suppression
    // signal, not something that should ever affect chat itself.
    console.warn('active_chat_presence write failed:', e?.message)
  }
}

// Call when the exact chat with otherUserId becomes active (opened).
// Ensures only one heartbeat timer runs at a time — switching
// conversations or re-calling this replaces the previous timer/target
// rather than stacking a second one.
export function markChatActive(otherUserId: string) {
  attachVisibilityHandler()
  if (_activeOtherUserId === otherUserId && _heartbeatTimer) return  // already active for this conversation
  // Switching conversations (or first activation) — mark the previous
  // one inactive first, if any, then start fresh for the new one.
  if (_activeOtherUserId && _activeOtherUserId !== otherUserId) {
    writePresence(_activeOtherUserId, false)
  }
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null }

  _activeOtherUserId = otherUserId
  writePresence(otherUserId, true)
  _heartbeatTimer = setInterval(() => writePresence(otherUserId, true), HEARTBEAT_INTERVAL_MS)

  // Best-effort: close any pending notification for this exact
  // conversation now that the user is looking at it directly (covers
  // opening the chat normally, not via the notification click — that
  // path already closes it itself via event.notification.close()).
  // Uses the same tag format the server sets; never throws if the API
  // is unavailable.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const [one, two] = [user.id, otherUserId].sort()
      const tag = `message-${one}-${two}`
      navigator.serviceWorker.ready.then(reg => {
        reg.getNotifications({ tag }).then(notifs => notifs.forEach(n => n.close())).catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  }
}

// Call when the chat is closed/navigated away from/backgrounded/logged
// out of. Marks the row inactive immediately (best-effort) and stops
// the heartbeat, so the row also becomes stale quickly even if this
// specific call is ever missed (e.g. a hard tab close).
export function markChatInactive() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null }
  if (_activeOtherUserId) {
    writePresence(_activeOtherUserId, false)
    _activeOtherUserId = null
  }
}
