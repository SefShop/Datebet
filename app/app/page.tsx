'use client'
import { useState, useEffect } from 'react'
import { useApp, AppProvider } from '@/lib/AppContext'
import SplashScreen    from '@/components/screens/SplashScreen'
import HomeScreen      from '@/components/screens/HomeScreen'
import GameScreen      from '@/components/screens/GameScreen'
import SuspenseScreen  from '@/components/screens/SuspenseScreen'
import ResultScreen    from '@/components/screens/ResultScreen'
import BetScreen       from '@/components/screens/BetScreen'
import BetCommitScreen from '@/components/screens/BetCommitScreen'
import BetLockedScreen from '@/components/screens/BetLockedScreen'
import ActivityScreen  from '@/components/screens/ActivityScreen'
import GameSelectionScreen from '@/components/screens/GameSelectionScreen'
import Connect4Screen   from '@/components/screens/Connect4Screen'
import TicTacToeScreen  from '@/components/screens/TicTacToeScreen'
import LudoScreen       from '@/components/screens/LudoScreen'
import ProfileScreen    from '@/components/screens/ProfileScreen'
import MatchScreen      from '@/components/screens/MatchScreen'
import PostGameScreen   from '@/components/screens/PostGameScreen'
import ChatScreen       from '@/components/screens/ChatScreen'
import LockDateScreen   from '@/components/screens/LockDateScreen'
import EditProfileScreen from '@/components/screens/EditProfileScreen'
import InboxScreen       from '@/components/screens/InboxScreen'
import ReturnScreen    from '@/components/screens/ReturnScreen'
import LangToggle      from '@/components/ui/LangToggle'
import UserMenu        from '@/components/ui/UserMenu'
import AuthScreen      from '@/components/screens/AuthScreen'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { clearProfileState } from '@/lib/profiles'
import { NotificationToast } from '@/components/ui/SocialPresence'

const SCREENS = {
  splash:     <SplashScreen />,
  home:       <HomeScreen />,
  game:       <GameScreen />,
  suspense:   <SuspenseScreen />,
  result:     <ResultScreen />,
  bet:        <BetScreen />,
  bet_commit: <BetCommitScreen />,
  bet_locked: <BetLockedScreen />,
  activity:   <ActivityScreen />,
  game_select:<GameSelectionScreen />,
  connect4:   <Connect4Screen />,
  tictactoe:  <TicTacToeScreen />,
  ludo:       <LudoScreen />,
  profile:    <ProfileScreen />,
  match:      <MatchScreen />,
  post_game:  <PostGameScreen />,
  chat:       <ChatScreen />,
  lock_date:  <LockDateScreen />,
  edit_profile: <EditProfileScreen />,
  inbox:        <InboxScreen />,
}

function AppShell() {
  const { screen, returnState, dismissReturn, navigate, lang } = useApp()

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
      setAuthed(!!session)
      setAuthKey(k => k + 1)  // force remount all screens
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReturnContinue = () => {
    dismissReturn()
    // Route to the most relevant screen based on what they left
    navigate('home')
  }

  return (
    <main className="min-h-screen bg-[#111] flex items-center justify-center">
      <div
        className="w-[390px] h-[844px] overflow-hidden relative
          shadow-[0_50px_150px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]
          rounded-[52px] max-sm:w-full max-sm:h-dvh max-sm:rounded-none max-sm:shadow-none"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'#08080f' }}
      >
        {/* Persistent language toggle — top right, above all screens */}
        <div className="absolute z-[60]" style={{ top: 16, right: 16 }}>
          <LangToggle />
          {authed && <UserMenu onLogout={() => setAuthed(false)} />}
        </div>
        <NotificationToast lang={lang} />

        {/* Auth gate */}
        {authChecked && !authed && (
          <div className="absolute inset-0 z-[100]">
            <AuthScreen onAuth={() => setAuthed(true)} lang={lang} />
          </div>
        )}
        {!authChecked && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center" style={{background:'#06060a'}}>
            <div className="text-white/30 text-[14px]">...</div>
          </div>
        )}

        {/* Normal screens — key forces remount on auth change */}
        <div key={authKey} className="absolute inset-0">
        {(Object.entries(SCREENS) as [string, React.ReactNode][]).map(([key, comp]) => (
          <div key={key} className="absolute inset-0"
            style={{
              opacity:       screen===key && !returnState ? 1 : 0,
              transform:     screen===key && !returnState ? 'translateX(0)' : 'translateX(24px)',
              pointerEvents: screen===key && !returnState ? 'all' : 'none',
              transition:    'opacity 0.32s cubic-bezier(0.4,0,0.2,1), transform 0.32s cubic-bezier(0.4,0,0.2,1)',
            }}>
            {comp}
          </div>
        ))}
        </div>

        {/* Return overlay — sits on top, slides in from below */}
        {returnState && (
          <div className="absolute inset-0 z-50"
            style={{
              animation: 'slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
            <ReturnScreen
              returnState={returnState}
              onContinue={handleReturnContinue}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default function Page() {
  return <AppProvider><AppShell /></AppProvider>
}
