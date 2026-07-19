'use client'
import { useState, useEffect, useRef } from 'react'
import { startMessagesPolling, stopMessagesPolling, refreshMessagesState } from '@/lib/messagesState'
import { startNotificationsPolling, stopNotificationsPolling } from '@/lib/notificationsState'
import { startPresence, stopPresence, setOnline, setOffline, heartbeat } from '@/lib/presence'
import { useApp, AppProvider } from '@/lib/AppContext'
import SplashScreen    from '@/components/screens/SplashScreen'
import GameSelectionScreen from '@/components/screens/GameSelectionScreen'
import Connect4Screen   from '@/components/screens/Connect4Screen'
import TicTacToeScreen  from '@/components/screens/TicTacToeScreen'
import MysteryChoiceGame from '@/components/screens/MysteryChoiceGame'
import LudoScreen       from '@/components/screens/LudoScreen'
import ProfileScreen    from '@/components/screens/ProfileScreen'
import MatchScreen      from '@/components/screens/MatchScreen'
import PostGameScreen   from '@/components/screens/PostGameScreen'
import ChatScreen       from '@/components/screens/ChatScreen'
import LockDateScreen   from '@/components/screens/LockDateScreen'
import EditProfileScreen from '@/components/screens/EditProfileScreen'
import SettingsScreen from '@/components/screens/SettingsScreen'
import InboxScreen       from '@/components/screens/InboxScreen'
import ActivityScreen    from '@/components/screens/ActivityScreen'
import GameRoomScreen    from '@/components/screens/GameRoomScreen'
import WaitingScreen     from '@/components/screens/WaitingScreen'
// ReturnScreen removed
import UserMenu        from '@/components/ui/UserMenu'
import AuthScreen      from '@/components/screens/AuthScreen'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { clearProfileState } from '@/lib/profiles'
import { reconcilePendingAcceptedInvite, enterAcceptedGame, subscribeCurrentSession, gameScreenFor, getCurrentSession, clearGameState, isValidActiveGameSession } from '@/lib/gameInvites'
// SocialPresence removed

const SCREENS = {
  splash:     <SplashScreen />,
  game_select:<GameSelectionScreen />,
  connect4:   <Connect4Screen />,
  tictactoe:  <TicTacToeScreen />,
  mystery_choice: <MysteryChoiceGame />,
  ludo:       <LudoScreen />,
  profile:    <ProfileScreen />,
  match:      <MatchScreen />,
  post_game:  <PostGameScreen />,
  chat:       <ChatScreen />,
  lock_date:  <LockDateScreen />,
  edit_profile: <EditProfileScreen />,
  settings:     <SettingsScreen />,
  inbox:        <InboxScreen />,
  activity:     <ActivityScreen />,
  game_room:    <GameRoomScreen />,
  waiting:      <WaitingScreen />,
}

// Create a profile row for a signed-in user if missing (Google OAuth / email)
async function ensureProfileExists(user: any): Promise<boolean> {
  console.log('PROFILE ENSURE START')
  try {
    const { data: existing } = await supabase.from('profiles').select('id, name, age, onboarding_completed').eq('id', user.id).maybeSingle()
    const meta = user.user_metadata || {}
    const metaName = meta.full_name || meta.name || ''

    if (existing) {
      // Legacy/incomplete accounts only: if the saved name is empty/generic
      // but the auth account has a real name in its metadata (e.g. from an
      // earlier Google sign-in, or from signup metadata set at account
      // creation), safely fill in just the missing field — never touches a
      // genuinely different name the user already has.
      const existingIsGeneric = !existing.name || existing.name.trim() === '' || existing.name === 'Player'
      if (existingIsGeneric && metaName) {
        console.log('LEGACY PROFILE BACKFILL:', user.id, metaName)
        const { error } = await supabase.from('profiles').update({ name: metaName }).eq('id', user.id)
        if (error) throw error
        console.log('ONBOARDING PROFILE SAVE SUCCESS:')
      } else {
        console.log('PROFILE ENSURE SUCCESS (exists)')
      }
      // onboarding_completed is intentionally never written here — only
      // read. Never reset it for a returning user; a legacy row with no
      // value at all is treated as already-completed (see requirement 7 —
      // an existing account should never be forced through Play Together).
      return existing.onboarding_completed !== false
    }

    await supabase.from('profiles').insert({
      id: user.id,
      name: metaName || 'Player',
      age: meta.age || 0, bio: '', photo: meta.avatar_url || meta.picture || '', location: '',
      onboarding_completed: false,
    })
    console.log('PROFILE ENSURE SUCCESS')
    return false
  } catch (e: any) {
    console.error('ensureProfileExists:', e.message)
    return true // fail safe: never trap a user on an error, default to Profiles
  }
}

function AppShell() {
  const { screen, navigate, lang } = useApp()

  // ── Auth gate (skip if Supabase not configured) ──
  const [authed, setAuthed] = useState(!isSupabaseConfigured())
  const [authKey, setAuthKey] = useState(0)  // true = skip auth if no config
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured())
  // Tri-state, never treated as a boolean: 'loading' means genuinely
  // unknown — nothing may render Profiles or Play Together while it's
  // this value. Only 'complete'/'incomplete' are decisions. This is what
  // was missing before: the app rendered the default screen (Play
  // Together) immediately on auth, then navigated away later once the
  // async check resolved — visible as a flash for completed users, and as
  // "sent to Profiles first" for new users whenever that later navigation
  // raced awkwardly with something else.
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'incomplete' | 'complete'>(
    isSupabaseConfigured() ? 'loading' : 'complete'
  )
  // Always reflects the LATEST authKey, readable from inside async
  // callbacks (which otherwise only see the value captured when the
  // effect first ran) — used to detect "auth changed again since this
  // async call started" and discard stale results instead of acting on
  // them.
  const authKeyRef = useRef(authKey)
  useEffect(() => { authKeyRef.current = authKey }, [authKey])

  // ── Safe guard: never leave the user staring at a game screen's own
  // "No game session found" fallback. If the active top-level screen is
  // one that requires a real session to render meaningfully, but no
  // session currently exists, redirect to Profiles/Discover instead. This
  // covers every way screen/session could end up mismatched (stale
  // restored screen, a session cleared via the back arrow or logout,
  // etc.) without needing to find every individual cause. Never fires for
  // a legitimate entry — setCurrentSession() always happens before
  // navigating to one of these screens, so by the time `screen` actually
  // changes to one of them, getCurrentSession() is already non-null.
  useEffect(() => {
    const sessionRequiredScreens = ['tictactoe', 'mystery_choice', 'connect4', 'game_room']
    if (!sessionRequiredScreens.includes(screen)) return
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      const session = getCurrentSession()
      if (!isValidActiveGameSession(session, user?.id)) {
        console.log('SCREEN/SESSION MISMATCH — redirecting to profile:', screen, 'sessionId:', session?.id, 'userId:', user?.id)
        navigate('profile')
      }
    })
    return () => { cancelled = true }
  }, [screen])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AUTH STATE CHANGE:', event, session?.user?.id)
      if (event === 'SIGNED_OUT' || !session) {
        console.log('AUTH: signed out, clearing profile state')
        clearProfileState()
        clearGameState()
        // Reset the top-level screen to Profiles/Discover so a finished or
        // in-progress game can never reopen on the next login — this runs
        // before setAuthKey below remounts the screens, so the clean state
        // is already in place when they come back up.
        navigate('profile')
        // Also reset onboarding status back to unknown — the NEXT login
        // (same user or a different one) must re-resolve it from scratch,
        // never reuse a previous user's completion state.
        setOnboardingStatus('loading')
      }
      // After sign-in (email or Google OAuth), make sure a profile row
      // exists, then set BOTH onboardingStatus and the destination screen
      // together, synchronously, in this one callback — not in a separate
      // effect reacting to onboardingStatus afterward. That separation was
      // the actual bug: React commits the gate-lifting render (triggered
      // by onboardingStatus leaving 'loading') BEFORE a later effect gets
      // a chance to call navigate(), leaving one real render where the
      // gate is down but `screen` is still the old/default value. Setting
      // both here means React batches them into the exact same render —
      // the gate and the correct screen change together, never apart.
      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        ensureProfileExists(session.user).then((completed) => {
          if (completed) {
            console.log('ONBOARDING COMPLETE — navigating to profile')
            navigate('profile')
          } else {
            console.log('ONBOARDING INCOMPLETE — navigating to play-together')
            navigate('splash')
          }
          setOnboardingStatus(completed ? 'complete' : 'incomplete')
        })
      }
      setAuthed(!!session)
      setAuthKey(k => k + 1)  // force remount all screens
    })
    return () => subscription.unsubscribe()
  }, [])

  // Global messages polling — single source of truth for inbox/menu/badge
  useEffect(() => {
    if (!authed) { stopMessagesPolling(); stopPresence(); stopNotificationsPolling(); return }
    startMessagesPolling()
    startPresence()
    startNotificationsPolling()

    // Reconciliation: recover a missed "invite accepted" realtime event —
    // e.g. the sender wasn't on WaitingScreen when it happened, or the
    // very first accept between a brand-new pair raced the listener's own
    // subscription setup. Runs once per auth completion; the function
    // itself guards against acting on the same invite twice (including if
    // WaitingScreen's own live listener already handled it).
    const generationAtStart = authKeyRef.current
    const loginStartedAt = new Date().toISOString()
    reconcilePendingAcceptedInvite(loginStartedAt).then(async (result) => {
      if (!result) return
      // Auth changed (logout, or a different account logged in) while this
      // async call was in flight — discard the result rather than resurface
      // a session that belongs to a login that's no longer active.
      if (authKeyRef.current !== generationAtStart) {
        console.log('RECONCILIATION: discarded — auth changed since this call started')
        return
      }
      const { invite } = result
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { return }
      if (authKeyRef.current !== generationAtStart) return
      // enterAcceptedGame() calls setCurrentSession() internally, which the
      // session subscription below reacts to and performs navigation from
      // — no need to navigate here too (that would be a second navigation
      // implementation for the same event).
      await enterAcceptedGame(invite, user.id)
    })

    // ── Single authoritative navigation trigger for entering a game ────
    // Reacts to setCurrentSession() being called from ANYWHERE (receiver's
    // direct Accept, sender's realtime event, or reconciliation above) —
    // this is what makes an already-mounted-but-hidden game screen (all
    // game screens stay mounted, only hidden via CSS) get navigated to
    // reliably, instead of depending on an unrelated parent re-render to
    // happen to notice a new session.
    let lastNavigatedSessionId: string | null = null
    const unsubscribeSession = subscribeCurrentSession((s) => {
      if (!s?.id || !s.game_type) return
      if (s.id === lastNavigatedSessionId) return  // guard: same session already navigated
      lastNavigatedSessionId = s.id
      const dest = gameScreenFor(s.game_type)
      console.log('SESSION PUBLISHED — NAVIGATING:', s.id, '->', dest)
      navigate(dest as any)
    })

    function onVisible() {
      if (document.visibilityState === 'visible') {
        console.log('VISIBILITY REFRESH CALLED')
        refreshMessagesState()
        setOnline()
      } else {
        // Tab hidden: just update last_seen (2-min window handles going offline naturally)
        heartbeat()
      }
    }
    function onLeave() { setOffline() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onLeave)
      unsubscribeSession()
      stopMessagesPolling()
      stopPresence()
      stopNotificationsPolling()
    }
  }, [authed])

  // ReturnScreen handler removed

  return (
    <main className="min-h-screen bg-[#111] flex items-center justify-center">
      <div
        className="desktop-scroll-shell w-[390px] h-[844px] overflow-hidden relative
          shadow-[0_50px_150px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]
          rounded-[52px] max-sm:w-full max-sm:h-dvh max-sm:rounded-none max-sm:shadow-none"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'#08080f' }}
      >
        {/* Account menu — language switch now lives only inside Settings.
            Positioned as a pure overlay (position:absolute, no reserved
            flow height) — mobile gets safe-area-aware placement below. */}
        <div className="mc-account-icon-wrap absolute z-[60]" style={{ top: 16, right: 16, margin: 0, padding: 0 }}>
          {authed && <UserMenu onLogout={() => setAuthed(false)} />}
        </div>


        {/* Auth gate */}
        {authChecked && !authed && (
          <div className="absolute inset-0 z-[100]">
            <AuthScreen onAuth={() => setAuthed(true)} lang={lang} />
          </div>
        )}
        {(() => {
          const initializing = !authChecked || (authed && onboardingStatus === 'loading')
          return <>
            {initializing && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center" style={{background:'#0a0a10'}}>
                <div className="text-white/30 text-[14px]">...</div>
              </div>
            )}

            {/* Normal screens — key forces remount on auth change. Not
                mounted at all until initialization finishes: `screen` is
                already 'profile' or 'splash' (whichever is correct) by
                the moment this first renders, in the SAME batch as
                `initializing` turning false. Every screen div has a CSS
                opacity transition — if this wrapper stayed mounted the
                whole time (hidden only behind the opaque loading overlay
                above), the very first change away from the default
                'splash' screen would still be a real style change on an
                ALREADY-MOUNTED element, so the browser would visibly
                animate the crossfade the instant the overlay disappears —
                that 0.32s crossfade was the entire "flash". A fresh mount
                has no prior style to transition from, so there is nothing
                to animate. */}
            {!initializing && (
              <div key={authKey} className="absolute inset-0">
              {(Object.entries(SCREENS) as [string, React.ReactNode][]).map(([key, comp]) => (
                <div key={key} className="absolute inset-0"
                  style={{
                    opacity:       screen===key ? 1 : 0,
                    transform:     screen===key ? 'translateX(0)' : 'translateX(24px)',
                    pointerEvents: screen===key ? 'all' : 'none',
                    transition:    'opacity 0.32s cubic-bezier(0.4,0,0.2,1), transform 0.32s cubic-bezier(0.4,0,0.2,1)',
                  }}>
                  {comp}
                </div>
              ))}
              </div>
            )}
          </>
        })()}

        {/* Return overlay — sits on top, slides in from below */}
        { /* ReturnScreen removed */ }
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        /* Mobile only: account icon becomes a true safe-area-aware overlay.
           It never reserved layout space (it was already position:absolute),
           but on mobile it now sits closer to the real notch/status-bar
           boundary rather than a fixed 16px that ignores device safe areas. */
        @media (max-width: 767.98px) {
          .mc-account-icon-wrap {
            position: absolute !important;
            top: calc(env(safe-area-inset-top, 0px) + 3px) !important;
            right: 10px !important;
            z-index: 60 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        /* Desktop only: the "phone frame" shell is normally a fixed-height,
           clipped box (h-[844px] overflow-hidden) — this is what was
           blocking access to Next Round / Play Again / anything below the
           fold whenever a screen's content exceeded 844px. Below this
           breakpoint (mobile, tablet) the shell is completely untouched. */
        @media (min-width: 1024px) {
          .desktop-scroll-shell {
            height: auto !important;
            min-height: 844px !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-bottom: 48px !important;
          }
        }
      `}</style>
    </main>
  )
}

export default function Page() {
  return <AppProvider><AppShell /></AppProvider>
}
