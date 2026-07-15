'use client'
import { useState, useEffect } from 'react'
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
import { reconcilePendingAcceptedInvite, enterAcceptedGame } from '@/lib/gameInvites'
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
async function ensureProfileExists(user: any) {
  console.log('PROFILE ENSURE START')
  try {
    const { data: existing } = await supabase.from('profiles').select('id, name, age').eq('id', user.id).maybeSingle()
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
      return
    }

    await supabase.from('profiles').insert({
      id: user.id,
      name: metaName || 'Player',
      age: meta.age || 0, bio: '', photo: meta.avatar_url || meta.picture || '', location: '',
    })
    console.log('PROFILE ENSURE SUCCESS')
  } catch (e: any) { console.error('ensureProfileExists:', e.message) }
}

function AppShell() {
  const { screen, navigate, lang } = useApp()

  // ── Auth gate (skip if Supabase not configured) ──
  const [authed, setAuthed] = useState(!isSupabaseConfigured())
  const [authKey, setAuthKey] = useState(0)  // true = skip auth if no config
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured())

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
      }
      // After sign-in (email or Google OAuth), make sure a profile row exists
      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        ensureProfileExists(session.user)
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
    reconcilePendingAcceptedInvite().then(async (result) => {
      if (!result) return
      const { invite } = result
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { return }
      const gameResult = await enterAcceptedGame(invite, user.id)
      if (!gameResult.ok || !gameResult.screen) {
        return
      }
      navigate(gameResult.screen as any)
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
        {!authChecked && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center" style={{background:'#0a0a10'}}>
            <div className="text-white/30 text-[14px]">...</div>
          </div>
        )}

        {/* Normal screens — key forces remount on auth change */}
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
