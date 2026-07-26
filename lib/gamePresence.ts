// Local, per-client pub/sub bridging GameChatOverlay's single realtime
// channel subscription for game-presence events to any component that
// needs to react to them (currently only ChatPanel) — without that
// component creating its own, colliding channel object for the same
// topic. This is not itself the transport: the transport is a Realtime
// Broadcast channel (same proven mechanism already used for the typing
// indicator), owned exclusively by GameChatOverlay. This module only
// relays what that channel receives to whoever's listening locally.
type GamePresenceEvent = 'left_game' | 'returned_game'
type GamePresenceListener = (event: GamePresenceEvent, sessionId: string, userId: string) => void

const _listeners = new Set<GamePresenceListener>()

export function subscribeGamePresence(fn: GamePresenceListener): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

export function emitGamePresence(event: GamePresenceEvent, sessionId: string, userId: string) {
  _listeners.forEach(fn => { try { fn(event, sessionId, userId) } catch (e) { console.error('game presence listener error:', e) } })
}
