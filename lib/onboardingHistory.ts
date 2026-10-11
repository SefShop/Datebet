import type { OnboardingResumeScreen } from '@/lib/onboardingResume'

// ── STEP 5B follow-up: browser / Android-system-Back support for the
// 7-step onboarding flow ────────────────────────────────────────────────
//
// The onboarding screens switch with AppContext.navigate(), which only
// changes React state — it never touched browser history. So the real
// Back button (Android system Back, browser Back) had no onboarding
// entry to return to and went straight to whatever older page preceded
// DesireDuel in the history.
//
// STRATEGY (one sentinel entry, created only under a real tap, then re-used)
//   The steps are strictly linear, so the previous step is always known
//   from the order below — no step stack is stored anywhere. History only
//   needs to give the Back button something to "pop":
//
//     [ base ]                      Step 1: nothing pushed; Back leaves the
//                                   app naturally (the onboarding boundary)
//     [ base ][ guard ]             Step 2..7: ONE guard entry on top
//
//   Back from the guard lands on `base` (popstate). That is turned into
//   "go to the previous step". History never holds more than base + guard,
//   no matter how many steps are walked, and nothing grows on re-renders,
//   refreshes or resumes.
//
//   Both entries carry a tiny marker ({ ddOnboarding: 'base' | 'guard' })
//   merged into the existing history.state, which keeps Next.js's own
//   internal keys (a state without them makes Next reload the page on
//   popstate).
//
// WHY THE GUARD IS NEVER RE-PUSHED AFTER A BACK (Chrome / Android)
//   Chrome's history manipulation intervention marks every history entry of
//   a document "skippable" when that document calls pushState without a
//   transient user activation (a tap within the last few seconds). The
//   system Back button then skips the whole document and leaves the app.
//   A popstate caused by the Back button carries NO activation, so the old
//   approach — push a fresh guard from inside the popstate handler — made
//   the FIRST Back work and the SECOND consecutive Back (no tap in between)
//   leave the app; the next tap un-marks the entries, which is why a tap
//   "fixed" it. The fix is that nothing is ever pushed outside a tap:
//     - the guard is pushed only while a transient activation is active
//       (right after a Continue tap), otherwise it waits for the next tap;
//     - after a Back the existing guard entry is re-entered with
//       history.forward() (a programmatic traversal, which the intervention
//       does not touch, and which creates no entry) instead of a new push.
//
// WHAT THIS IS NOT
//   - It is NOT progress persistence. The profile row in Supabase stays the
//     only source of truth: on load/refresh app/app/page.tsx still asks
//     resolveOnboardingResumeScreen() for the earliest incomplete step.
//     History only drives navigation while the user is actively moving
//     around. It never writes anything and never reads or writes profile
//     data, so going Back cannot clear or overwrite saved onboarding data
//     (the screens keep their own state / hydrate from the database).
//   - It is NOT active outside onboarding. Listeners exist only while an
//     onboarding screen is showing, and when onboarding is left the guard
//     this document pushed is popped, so a finished user's Back behaves as
//     in any other page.

export const ONBOARDING_SCREEN_ORDER: readonly OnboardingResumeScreen[] = [
  'onboarding_welcome',
  'onboarding_about_you',
  'onboarding_interested_in',
  'onboarding_location_interests',
  'onboarding_photos',
  'onboarding_bio',
  'onboarding_preferences',
]

function indexOfScreen(screen: string): number {
  return (ONBOARDING_SCREEN_ORDER as readonly string[]).indexOf(screen)
}

export function isOnboardingScreen(screen: string): screen is OnboardingResumeScreen {
  return indexOfScreen(screen) !== -1
}

export function previousOnboardingScreen(screen: string): OnboardingResumeScreen | null {
  const i = indexOfScreen(screen)
  return i > 0 ? ONBOARDING_SCREEN_ORDER[i - 1] : null
}

export function nextOnboardingScreen(screen: string): OnboardingResumeScreen | null {
  const i = indexOfScreen(screen)
  return i !== -1 && i < ONBOARDING_SCREEN_ORDER.length - 1 ? ONBOARDING_SCREEN_ORDER[i + 1] : null
}

type Marker = 'base' | 'guard'

function markerOf(state: unknown): Marker | null {
  if (typeof state !== 'object' || state === null) return null
  const m = (state as { ddOnboarding?: unknown }).ddOnboarding
  return m === 'base' || m === 'guard' ? m : null
}

function stateWith(state: unknown, marker: Marker): Record<string, unknown> {
  const existing = typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {}
  // Spread keeps Next.js's internal keys (__NA, router tree) on our entry.
  return { ...existing, ddOnboarding: marker }
}

export interface OnboardingHistoryEnv {
  history: Pick<History, 'state' | 'pushState' | 'replaceState' | 'back' | 'forward'>
  events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Navigation Timing type of this document's load ('reload', 'back_forward', ...). */
  navigationType: () => string | undefined
  /** navigator.userActivation.isActive (transient activation), or undefined when unsupported. */
  hasTransientActivation: () => boolean | undefined
}

export function browserHistoryEnv(): OnboardingHistoryEnv {
  return {
    history: window.history,
    events: window,
    navigationType: () => {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      return entry?.type
    },
    hasTransientActivation: () => {
      const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
      return ua ? ua.isActive : undefined
    },
  }
}

export interface OnboardingHistory {
  /** Attach the popstate listener (idempotent). `navigate` shows a step. */
  start(navigate: (screen: OnboardingResumeScreen) => void): void
  /** Detach every listener. Never touches history (safe for Strict Mode). */
  stop(): void
  /** Call whenever the visible onboarding screen changes (idempotent). */
  sync(screen: string): void
  /** Onboarding was left (finished / signed out): pop the guard this document pushed. */
  leave(): void
  /**
   * For the first onboarding screen shown in this document: if the user
   * arrived by pressing Back into this app's base entry after a refresh
   * (the guard it came from belonged to a document that no longer exists),
   * show the step before the resume step instead of the resume step itself.
   * Never returns a step later than `resume`.
   */
  adjustInitialScreen(resume: OnboardingResumeScreen): OnboardingResumeScreen
}

const ACTIVATION_EVENTS = ['pointerup', 'touchend', 'keydown'] as const

export function createOnboardingHistory(env: OnboardingHistoryEnv): OnboardingHistory {
  let navigateFn: ((screen: OnboardingResumeScreen) => void) | null = null
  let current: OnboardingResumeScreen | null = null   // screen the history is currently describing
  let reachedIndex = -1                                // furthest step shown in this document
  let guardOwned = false                               // this document pushed a guard that still exists
  let guardAhead = false                               // the entry just ahead of `base` is our guard (re-usable)
  let reanchoring = false                              // a history.forward() back onto the guard is in flight
  let lastMarker: Marker | null = null                 // marker of the entry we are on, as of the last event we handled
  let initialConsumed = false
  let activationArmed = false

  function disarmActivation() {
    if (!activationArmed) return
    activationArmed = false
    for (const type of ACTIVATION_EVENTS) env.events.removeEventListener(type, onActivation, true)
  }

  function armActivation() {
    if (activationArmed) return
    activationArmed = true
    for (const type of ACTIVATION_EVENTS) env.events.addEventListener(type, onActivation, true)
  }

  function pushGuard() {
    if (markerOf(env.history.state) === 'guard') return
    // Tag the entry we are leaving as base (kept as it is otherwise), so a
    // Back that later reloads this entry can be recognised.
    if (markerOf(env.history.state) !== 'base') {
      env.history.replaceState(stateWith(env.history.state, 'base'), '')
    }
    env.history.pushState(stateWith(env.history.state, 'guard'), '')
    guardOwned = true
    guardAhead = false
    lastMarker = 'guard'
  }

  // Step back onto the guard entry that is still ahead of us. A programmatic
  // traversal creates no entry, so Chrome's intervention never applies to it.
  // The guard's popstate (marker 'guard' while `reanchoring`) is ours and is
  // swallowed in onPopState. Activation listeners stay armed as a fail-safe in
  // case that entry is gone and nothing arrives.
  function reanchor() {
    if (reanchoring) return
    reanchoring = true
    guardAhead = false
    armActivation()
    env.history.forward()
  }

  // Only ever called from inside a real tap (see onActivation) or while the
  // tap's transient activation is still live — never from a popstate.
  function onActivation() {
    if (env.hasTransientActivation() === false) return
    disarmActivation()
    if (reanchoring && markerOf(env.history.state) !== 'guard') reanchoring = false   // forward never arrived
    if (current !== null && indexOfScreen(current) >= 1) pushGuard()
  }

  function ensureGuard() {
    if (markerOf(env.history.state) === 'guard') return
    if (reanchoring) return                                   // the guard is on its way back
    if (guardAhead) { reanchor(); return }                    // re-use it: no new entry, no activation needed
    if (env.hasTransientActivation() === false) { armActivation(); return }   // wait for the next tap
    pushGuard()
  }

  function onPopState() {
    if (current === null || !navigateFn) return
    const marker = markerOf(env.history.state)
    const previousMarker = lastMarker
    lastMarker = marker
    if (marker === 'base') {
      // Back out of the guard → previous step (nothing at Step 1: boundary).
      const fromGuard = previousMarker === 'guard'
      if (fromGuard) guardAhead = true
      const prev = previousOnboardingScreen(current)
      if (!prev) return
      current = prev
      navigateFn(prev)
      // Deliberately NO pushState here: a popstate has no user activation and
      // a push now would make Chrome skip this whole document on the next
      // Back. Re-enter the guard that is still ahead instead.
      if (fromGuard && indexOfScreen(prev) >= 1 && markerOf(env.history.state) === 'base') reanchor()
      return
    }
    if (marker === 'guard') {
      if (reanchoring) {                                      // our own history.forward() arrived
        reanchoring = false
        disarmActivation()
        return
      }
      guardAhead = false
      // Browser Forward onto a guard. Only steps already reached in this
      // document are revisitable; anything else is undone.
      const next = nextOnboardingScreen(current)
      if (next && indexOfScreen(next) <= reachedIndex) {
        current = next
        navigateFn(next)
      } else {
        env.history.back()
      }
    }
  }

  return {
    start(navigate) {
      navigateFn = navigate
      lastMarker = markerOf(env.history.state)
      env.events.removeEventListener('popstate', onPopState)   // never double-register
      env.events.addEventListener('popstate', onPopState)
    },
    stop() {
      env.events.removeEventListener('popstate', onPopState)
      disarmActivation()
      navigateFn = null
    },
    sync(screen) {
      if (!isOnboardingScreen(screen)) return
      current = screen
      reachedIndex = Math.max(reachedIndex, indexOfScreen(screen))
      if (indexOfScreen(screen) >= 1) ensureGuard()
    },
    leave() {
      disarmActivation()
      const wasOwned = guardOwned
      guardOwned = false
      guardAhead = false
      reanchoring = false
      current = null
      reachedIndex = -1
      // Only pop a guard THIS document pushed: its base is then in this
      // document too, so the pop is a plain popstate, never a page reload.
      if (wasOwned && markerOf(env.history.state) === 'guard') env.history.back()
    },
    adjustInitialScreen(resume) {
      if (initialConsumed) return resume
      initialConsumed = true
      if (markerOf(env.history.state) === 'base' && env.navigationType() === 'back_forward') {
        return previousOnboardingScreen(resume) ?? resume
      }
      return resume
    },
  }
}
