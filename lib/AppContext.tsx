'use client'
import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'
import { Screen, GameState, GameQuestion, BiQuestion, BetState, SessionProfile, AnswerBoldness, ReturnState } from '@/types'
import { COPY, Lang } from '@/lib/copy'
import { supabase } from '@/lib/supabase'
import { QUESTION_POOL, localizeQuestion } from '@/lib/data'
import { pickRandom } from '@/lib/voice'
import { buildPersonalization } from '@/lib/personalization'
// reengagement removed

interface PersonalizationSnapshot {
  speedObs:       string | null
  boldObs:        string | null
  patternObs:     string | null
  egoHook:        string | null
  progressionObs: string | null
}

interface AppContextType {
  screen: Screen; navigate: (s: Screen) => void
  game: GameState; question: GameQuestion; rawQuestion: BiQuestion
  lang: Lang; setLang: (l: Lang) => void
  setUserAnswer: (id: string) => void; resolveGame: () => void; resetGame: () => void; playAgain: () => void
  bet: BetState; setBetAmount: (n: number) => void; commitBet: () => void; lockBet: () => void
  session: SessionProfile; personalization: PersonalizationSnapshot
  returnState: ReturnState | null; dismissReturn: () => void
}

const Ctx = createContext<AppContextType | null>(null)

// Standalone screens safe to restore after a refresh — each fetches its own
// data fresh on mount and doesn't depend on an in-memory session/match
// object. Deliberately excludes game/session screens (game_room, tictactoe,
// connect4, ludo, mystery_choice, waiting, chat, match, post_game, result,
// bet_locked, lock_date) so a refresh never reopens a broken game screen.
const RESTORABLE_SCREENS: Screen[] = ['profile', 'activity', 'inbox', 'settings', 'edit_profile', 'game_select']
const OPT = ['a','b','c','d']

function calcCompat(u: string, o: string) {
  if (u === o) return Math.floor(Math.random()*14)+83
  const d = Math.abs(OPT.indexOf(u)-OPT.indexOf(o))
  return d===1 ? Math.floor(Math.random()*20)+54 : Math.floor(Math.random()*24)+28
}

const DEFAULT_BET: BetState     = { amount:2, status:'idle', lockedAt:null, expiresAt:null, userIn:false, opponentIn:false }
const DEFAULT_SESSION: SessionProfile = { answerSpeedMs:null, speedTier:null, boldness:null, answerHistory:[], boldnessHistory:[], behaviorHistory:[], roundCount:0 }
const DEFAULT_PERSONA: PersonalizationSnapshot = { speedObs:null, boldObs:null, patternObs:null, egoHook:null, progressionObs:null }

// Picks a question that hasn't been seen this session.
// When all 25 are exhausted, the pool resets (but never repeats the last one back-to-back).
function pickFreshQuestion(usedIds: string[], lastId?: string): BiQuestion {
  let available = QUESTION_POOL.filter(q => !usedIds.includes(q.id))
  if (available.length === 0) {
    // all seen — reset, but avoid immediate repeat of the last question
    available = QUESTION_POOL.filter(q => q.id !== lastId)
  }
  return pickRandom(available)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen,    setScreen]   = useState<Screen>('splash')

  // ── Active top-level screen: persist across refresh ──────────────
  // Previously `screen` always started at 'splash' with no persistence at
  // all, so any refresh (e.g. while on Profiles/Discover) dropped the user
  // back to the "Play a game together" splash screen — that was the entire
  // cause of the bug, not anything related to auth or routing.
  //
  // Only a safe allowlist of standalone screens are restorable — screens
  // that depend on ephemeral in-memory session/match state (game rooms,
  // active games, chat, results, waiting) are intentionally excluded so a
  // refresh never reopens a broken, session-less game screen.
  useEffect(() => {
    let cancelled = false
    async function restoreActiveScreen() {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('dateduel_active_screen') : null
        if (!saved || !RESTORABLE_SCREENS.includes(saved as Screen)) return
        // Auth safety: only restore a protected screen once a session is
        // actually confirmed to exist — this is a read-only check and does
        // not alter the existing authentication flow at all.
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          // Extra safety: never restore a screen for a user who hasn't
          // completed the first-time Play Together intro yet — a brand
          // new/incomplete user must always land there, never skip it via
          // a stale localStorage value.
          const { data: prof } = await supabase.from('profiles').select('onboarding_completed').eq('id', data.session.user.id).maybeSingle()
          if (cancelled) return
          if (prof && prof.onboarding_completed === false) return
          console.log('RESTORE ACTIVE SCREEN:', saved)
          setScreen(saved as Screen)
        }
      } catch {}
    }
    restoreActiveScreen()
    return () => { cancelled = true }
  }, [])

  // ── Language: auto-detect on first visit, then persist ──
  const [lang, setLangState] = useState<Lang>('en')
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) as Lang | null
    if (saved === 'en' || saved === 'gr') { setLangState(saved); return }
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('el')) {
      setLangState('gr')
    }
  }, [])
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('lang', l) } catch {}
  }

  const usedQuestionIds = useRef<string[]>([])
  const [question,  setQuestion] = useState<BiQuestion>(() => {
    const q = pickRandom(QUESTION_POOL)
    usedQuestionIds.current = [q.id]
    return q
  })
  const [game,      setGame]     = useState<GameState>({ userAnswer:null, opponentAnswer:null, isMatch:null, compatibilityScore:0 })
  const [bet,       setBetState] = useState<BetState>(DEFAULT_BET)
  const [session,   setSession]  = useState<SessionProfile>(DEFAULT_SESSION)
  const [personalization, setPersona] = useState(DEFAULT_PERSONA)
  const returnState: ReturnState | null = null
  const questionShownAt = useRef<number>(Date.now())

  // ── On mount: check if user is returning ──────────────────────
  useEffect(() => {
    const ret = null
    
  }, [])

  // save session removed

  const navigate = (s: Screen) => {
    // removed
    setScreen(s)
    try { localStorage.setItem('dateduel_active_screen', s) } catch {}
  }

  const dismissReturn = () => {}  // no-op

  const setUserAnswer = (id: string) => setGame(p=>({...p, userAnswer:id}))

  const resolveGame = () => {
    const speedMs = Date.now() - questionShownAt.current
    const opp     = OPT[Math.floor(Math.random()*4)]
    const match   = opp === game.userAnswer!
    const compat  = calcCompat(game.userAnswer!, opp)
    const p       = buildPersonalization(game.userAnswer!, question.id, speedMs, session.boldnessHistory, lang)

    setGame(prev=>({...prev, opponentAnswer:opp, isMatch:match, compatibilityScore:compat}))
    setSession(prev=>({
      ...prev,
      answerSpeedMs:   speedMs, speedTier: p.speedTier, boldness: p.boldness,
      boldnessHistory: p.history as AnswerBoldness[],
      behaviorHistory: [...prev.behaviorHistory, { speed: p.speedTier, boldness: p.boldness }],
      answerHistory:   [...prev.answerHistory, game.userAnswer!],
      roundCount:      prev.roundCount + 1,
    }))
    setPersona({ speedObs:p.speedObs, boldObs:p.boldObs, patternObs:p.patternObs, egoHook:p.egoHook, progressionObs:p.progressionObs })
    setScreen('profile')
  }

  const resetGame = () => {
    const next = pickFreshQuestion(usedQuestionIds.current, question.id)
    usedQuestionIds.current = [...usedQuestionIds.current, next.id]
    setQuestion(next)
    setGame({ userAnswer:null, opponentAnswer:null, isMatch:null, compatibilityScore:0 })
    questionShownAt.current = Date.now()
  }

  const playAgain = () => {
    resetGame()
    setScreen('profile')
  }

  const setBetAmount = (n: number) => setBetState(p=>({...p, amount:n}))
  const commitBet  = () => { setBetState(p=>({...p, status:'committed'})); setScreen('profile') }
  const lockBet    = () => {
    const now = Date.now()
    setBetState(p=>({...p, status:'waiting', lockedAt:now, expiresAt:now+86_400_000, userIn:true}))
    setScreen('profile')
  }

  return (
    <Ctx.Provider value={{
      screen, navigate, game,
      question: localizeQuestion(question, lang), rawQuestion: question,
      lang, setLang,
      setUserAnswer, resolveGame, resetGame, playAgain,
      bet, setBetAmount, commitBet, lockBet,
      session, personalization,
      returnState, dismissReturn,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}
