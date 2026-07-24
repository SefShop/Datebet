// Minimal, module-level pub/sub exposing GameChatOverlay's own
// game-presence channel state to anyone who needs to read it (currently
// only ChatPanel), without them creating a second RealtimeChannel object
// for the exact same topic. Two separate channel objects subscribed to
// the identical name on the same client is exactly the class of bug
// already found and fixed once before in this codebase (the
// dual-mounted ChatPanel chat-channel collision) — this is the fix for
// the same pattern recurring here. Kept in its own file (rather than
// exported from GameChatOverlay.tsx directly) so ChatPanel can import it
// without a circular dependency, since GameChatOverlay already imports
// ChatPanel.
type GamePresenceListener = (sessionId: string | null, presentUserIds: Set<string>) => void

const _listeners = new Set<GamePresenceListener>()

export function subscribeGamePresence(fn: GamePresenceListener): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

export function notifyGamePresence(sessionId: string | null, presentUserIds: Set<string>) {
  _listeners.forEach(fn => { try { fn(sessionId, presentUserIds) } catch (e) { console.error('game presence listener error:', e) } })
}
