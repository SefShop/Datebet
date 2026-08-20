// Minimal, generic "screen ready" signal — a game screen calls
// emitScreenReady(name) once its own async loading has finished and its
// final UI has actually rendered (not merely once loading=false is set,
// but from an effect that runs after that render has committed and
// painted). Listeners (e.g. the desktop repaint workaround in
// app/app/page.tsx) can react to that exact moment instead of guessing
// at a fixed delay.
//
// Deliberately generic — not tied to any one screen name — so the same
// mechanism can be reused for other screens later without changing this
// file again. Mirrors the same plain module-level pub/sub pattern
// already proven elsewhere in this codebase (see setCurrentSession /
// subscribeCurrentSession in lib/gameInvites.ts).

type ScreenReadyListener = (screenName: string) => void

const listeners = new Set<ScreenReadyListener>()

export function emitScreenReady(screenName: string) {
  listeners.forEach(fn => {
    try { fn(screenName) } catch (e) { console.error('screen ready listener error:', e) }
  })
}

export function subscribeScreenReady(fn: ScreenReadyListener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}