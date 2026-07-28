type RematchDeclinedListener = (opponentName: string) => void

const _listeners = new Set<RematchDeclinedListener>()

export function subscribeRematchDeclined(fn: RematchDeclinedListener): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

export function emitRematchDeclined(opponentName: string) {
  _listeners.forEach(fn => { try { fn(opponentName) } catch (e) { console.error('rematch declined listener error:', e) } })
}
