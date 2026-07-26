// Local, per-client pub/sub bridging GameChatOverlay's single Realtime
// Broadcast channel subscription for game-presence events to any
// component that needs to react to them (currently GamePresenceBanner,
// rendered inside each active game screen) — without that component
// creating its own, colliding channel object for the same topic.
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
