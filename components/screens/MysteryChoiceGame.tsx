'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, sendGameInvite, setPendingInvite } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'
import { getPresence, isOnlineNow } from '@/lib/presence'
import { setCurrentMatch } from '@/lib/profiles'
import {
  generateMysteryQuestions, toRoundData, computeRoundScore, computeCompatibilityPercent,
  RoundData, RoundScoreResult,
} from '@/lib/mysteryChoiceQuestions'

// A selection is a single option string (binary / single-select) or an array
// of option strings (multi-select questions, up to round.maxSelect).
type Selection = string | string[] | null

interface RoundHistoryEntry {
  round: number
  category: string
  weight: number
  outcome: 'match' | 'partial' | 'different'
  question: string
  playerOneChoice: Selection
  playerTwoChoice: Selection
}

interface MysteryChoiceState {
  game_type: string
  current_round: number
  rounds: RoundData[]
  player_one_choice: Selection
  player_two_choice: Selection
  player_one_ready: boolean
  player_two_ready: boolean
  round_result: 'match' | 'partial' | 'different' | null
  status: 'active' | 'finished'
  result?: 'completed' | null
  progressCounted?: boolean
  matches?: number
  scoreTotal?: number   // sum of weighted round scores (for the compatibility %)
  scoreMax?: number     // sum of round weights so far
  history?: RoundHistoryEntry[]  // per-round record, used only by the reveal screen
}

// Fallback in case a session's state is missing rounds (defensive only)
const FALLBACK_ROUNDS: RoundData[] = [
  { id: 'fallback_coffee_wine', category: 'food', type: 'binary', question: 'Coffee or Wine?', questionGr: 'Καφές ή Κρασί;',
    emoji: ['☕','🍷'], en: ['Coffee', 'Wine'], gr: ['Καφές', 'Κρασί'],
    options: ['Coffee', 'Wine'], optionsGr: ['Καφές', 'Κρασί'], maxSelect: 1, weight: 1, tags: [] },
]

// ── Validation helpers (module-level, no component state needed) ──
function isValidRound(r: any): boolean {
  return !!r
    && typeof r.id === 'string' && r.id.length > 0
    && typeof r.question === 'string' && r.question.length > 0
    && Array.isArray(r.options) && r.options.length >= 2
    && Array.isArray(r.optionsGr) && r.optionsGr.length >= 2
    && typeof r.maxSelect === 'number' && r.maxSelect >= 1
}

function isValidMysteryState(s: any): s is MysteryChoiceState {
  return !!s
    && s.game_type === 'mystery_choice'
    && typeof s.current_round === 'number' && s.current_round >= 0
    && Array.isArray(s.rounds) && s.rounds.length === 10
    && s.rounds.every(isValidRound)
}

// Build a complete, valid Mystery Choice state from the question engine
// (does NOT modify the question bank — only reads from it) for safe
// initialization or repair when a session's stored state is missing/invalid.
function buildFreshMysteryState(): MysteryChoiceState {
  const rounds: RoundData[] = generateMysteryQuestions().map(toRoundData)
  return {
    game_type: 'mystery_choice',
    current_round: 0,
    rounds,
    player_one_choice: null,
    player_two_choice: null,
    player_one_ready: false,
    player_two_ready: false,
    round_result: null,
    matches: 0,
    scoreTotal: 0,
    scoreMax: 0,
    history: [],
    status: 'active',
    progressCounted: false,
  }
}

// ── Reveal-screen helpers (pure, presentation-only — no game logic) ──

const CATEGORY_LABEL: Record<string, { en: string; gr: string }> = {
  relationships: { en: 'relationships', gr: 'σχέσεις' },
  communication: { en: 'communication', gr: 'επικοινωνία' },
  hobbies: { en: 'hobbies', gr: 'χόμπι' },
  lifestyle: { en: 'lifestyle', gr: 'τρόπο ζωής' },
  travel: { en: 'traveling', gr: 'ταξίδια' },
  food: { en: 'food', gr: 'φαγητό' },
  music: { en: 'music', gr: 'μουσική' },
  movies_tv: { en: 'movies & shows', gr: 'ταινίες & σειρές' },
  personality: { en: 'personality', gr: 'προσωπικότητα' },
  fitness: { en: 'fitness', gr: 'γυμναστική' },
  pets: { en: 'pets', gr: 'κατοικίδια' },
  career: { en: 'career', gr: 'καριέρα' },
  family: { en: 'family', gr: 'οικογένεια' },
  future: { en: 'the future', gr: 'το μέλλον' },
  dating_preferences: { en: 'what you look for in dating', gr: 'ό,τι ψάχνεις σε ένα ραντεβού' },
}

function catLabel(category: string, lang: 'en' | 'gr'): string {
  return CATEGORY_LABEL[category]?.[lang] || category
}

// Which of the 4 summary buckets a question's category rolls up into
function categoryBucket(category: string): 'communication' | 'lifestyle' | 'values' | 'adventure' | null {
  if (category === 'communication') return 'communication'
  if (category === 'lifestyle' || category === 'food' || category === 'music' || category === 'movies_tv') return 'lifestyle'
  if (['relationships', 'dating_preferences', 'family', 'future', 'personality'].includes(category)) return 'values'
  if (['travel', 'hobbies', 'fitness', 'career', 'pets'].includes(category)) return 'adventure'
  return null
}

function choiceLabel(choice: Selection, lang: 'en' | 'gr'): string {
  if (!choice) return ''
  return Array.isArray(choice) ? choice.join(', ') : choice
}

interface CategoryBreakdown { communication: number; lifestyle: number; values: number; adventure: number }

function computeCategoryBreakdown(history: RoundHistoryEntry[], overallPct: number): CategoryBreakdown {
  const buckets: Record<string, { score: number; max: number }> = {
    communication: { score: 0, max: 0 }, lifestyle: { score: 0, max: 0 },
    values: { score: 0, max: 0 }, adventure: { score: 0, max: 0 },
  }
  for (const h of history) {
    const b = categoryBucket(h.category)
    if (!b) continue
    buckets[b].max += h.weight
    buckets[b].score += h.outcome === 'match' ? h.weight : h.outcome === 'partial' ? h.weight * 0.5 : 0
  }
  const pct = (b: { score: number; max: number }) => b.max > 0 ? Math.round((b.score / b.max) * 100) : overallPct
  return {
    communication: pct(buckets.communication),
    lifestyle: pct(buckets.lifestyle),
    values: pct(buckets.values),
    adventure: pct(buckets.adventure),
  }
}

function topSimilarities(history: RoundHistoryEntry[], lang: 'en' | 'gr'): string[] {
  const matched = history.filter(h => h.outcome === 'match').sort((a, b) => b.weight - a.weight).slice(0, 3)
  return matched.map(h => {
    const label = catLabel(h.category, lang)
    return lang === 'gr' ? `Και οι δύο απολαμβάνετε ${label}.` : `You both enjoy ${label}.`
  })
}

function biggestDifference(history: RoundHistoryEntry[], myId: string | null, session: any, lang: 'en' | 'gr'): { line: string; category: string } | null {
  const diffs = history.filter(h => h.outcome === 'different').sort((a, b) => b.weight - a.weight)
  if (diffs.length === 0) return null
  const d = diffs[0]
  const isPlayerOne = myId === session?.player_one_id
  const mine = isPlayerOne ? d.playerOneChoice : d.playerTwoChoice
  const theirs = isPlayerOne ? d.playerTwoChoice : d.playerOneChoice
  const mineLabel = choiceLabel(mine, lang)
  const theirsLabel = choiceLabel(theirs, lang)
  const line = lang === 'gr'
    ? `Εσύ διάλεξες "${mineLabel}".\nΟ/Η σύντροφός σου διάλεξε "${theirsLabel}".`
    : `You chose "${mineLabel}".\nYour partner chose "${theirsLabel}".`
  return { line, category: d.category }
}

function generateSummary(pct: number, breakdown: CategoryBreakdown, diffCategory: string | null, lang: 'en' | 'gr'): string {
  const tier = pct >= 85 ? (lang === 'gr' ? 'πολύ ισχυρή' : 'strong long-term')
    : pct >= 65 ? (lang === 'gr' ? 'καλή' : 'good')
    : (lang === 'gr' ? 'αναδυόμενη' : 'developing')
  const entries = Object.entries(breakdown) as [keyof CategoryBreakdown, number][]
  const top = entries.sort((a, b) => b[1] - a[1])[0][0]
  const topLabel = { communication: lang === 'gr' ? 'επικοινωνίας' : 'communication', lifestyle: lang === 'gr' ? 'τρόπου ζωής' : 'lifestyle',
    values: lang === 'gr' ? 'αξιών' : 'values', adventure: lang === 'gr' ? 'περιπέτειας' : 'adventure' }[top]
  const diffLabel = diffCategory ? catLabel(diffCategory, lang) : (lang === 'gr' ? 'κάποιες προτιμήσεις' : 'a few preferences')

  if (lang === 'gr') {
    return `Έχετε ${tier} συμβατότητα. Τα στιλ ${topLabel} σας μοιάζουν πολύ. Η μεγαλύτερη πρόκλησή σας θα είναι να ισορροπήσετε γύρω από ${diffLabel}.`
  }
  return `You have ${tier} compatibility. Your ${topLabel} styles are very similar. Your biggest challenge will be balancing ${diffLabel}.`
}

export default function MysteryChoiceGame() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()

  const [state, setState] = useState<MysteryChoiceState | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [names, setNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [sessionRetrying, setSessionRetrying] = useState(false)
  const channelRef = useRef<any>(null)
  const activeSessionRef = useRef<string | null>(null)
  const resultWriteLock = useRef(false)
  const advanceWriteLock = useRef(false)
  const countLockRef = useRef(false)
  const recoveryLockRef = useRef(false)
  const [pairCount, setPairCount] = useState(0)
  const [progressError, setProgressError] = useState<string | null>(null)

  // ── UI-only presentational state (does NOT affect game logic / sync / DB) ──
  const [revealing, setRevealing] = useState(false)          // ~800ms freeze before flip reveal
  const [matchTally, setMatchTally] = useState(0)             // session-local "compatibility" tally for the celebration screen
  const [onlineOne, setOnlineOne] = useState(false)
  const [onlineTwo, setOnlineTwo] = useState(false)
  const [pendingMulti, setPendingMulti] = useState<string[]>([])  // local staged picks before Confirm (multi-select only)
  const [revealStep, setRevealStep] = useState(0)  // 0=analyzing, 1-3=insight cards, 4=final card (reveal-screen presentation only)
  const tallyRoundRef = useRef<number>(-1)
  const revealTimerRef = useRef<any>(null)

  // Require a session_id — otherwise show "No game session found."
  useEffect(() => {
    if (!session?.id) { setLoading(false); return }

    // GUARD: this screen must only touch mystery_choice sessions.
    // All game screens are always-mounted and share the same global session,
    // so without this guard, accepting a Tic Tac Toe / Connect 4 session
    // would make this screen try to read it as Mystery Choice data.
    if (session.game_type && session.game_type !== 'mystery_choice') {
      console.log('MYSTERY CHOICE SCREEN SKIP: wrong game_type', session.game_type, session.id)
      setLoading(false)
      return
    }

    // Both player IDs must exist on the session itself
    if (!session.player_one_id || !session.player_two_id) {
      console.log('MYSTERY ERROR:', 'session missing player ids', session.id)
      setLoading(false)
      return
    }

    // Session switching: clear all previous local state before loading the new one
    console.log('MYSTERY CHOICE SESSION LOADED')
    const sess0 = session
    console.log('LOADING SESSION', sess0.id)
    setState(null)
    setPreparing(false)
    setLoading(true)  // BUGFIX: must reset to true here — this screen stays mounted permanently,
                       // so without this reset "loading" could still be false from an earlier
                       // render, causing the "Game not found" branch to flash while this fetch runs.
    activeSessionRef.current = sess0.id

    async function fetchSessionRow(retriesLeft: number, attempt = 0): Promise<any> {
      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
      if (sess) {
        if (attempt > 0) setSessionRetrying(false)
        console.log('SESSION FOUND', sess0.id)
        return sess
      }
      if (retriesLeft > 0) {
        // The session row may still be mid-insert on the other client — retry briefly
        // instead of immediately declaring "not found".
        setSessionRetrying(true)
        await new Promise(res => setTimeout(res, 400))
        return fetchSessionRow(retriesLeft - 1, attempt + 1)
      }
      setSessionRetrying(false)
      console.log('SESSION NOT FOUND', sess0.id)
      return null
    }

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setMyId(user?.id ?? null)

        const nm = new Map<string, string>()
        const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [sess0.player_one_id, sess0.player_two_id])
        profs?.forEach(p => nm.set(p.id, p.name))
        setNames({ one: nm.get(sess0.player_one_id) || 'Player 1', two: nm.get(sess0.player_two_id) || 'Player 2' })

        // Both users load the SAME game_session by session_id — retry a few times
        // before concluding the session truly doesn't exist.
        const sess = await fetchSessionRow(5)
        console.log('MYSTERY SESSION LOADED:', sess0.id)

        if (!sess) {
          // Only now — after every retry — do we allow the "not found" state to show.
          setLoading(false)
          setState(null)
          return
        }

        let s: MysteryChoiceState
        if (isValidMysteryState(sess.state)) {
          s = sess.state
          console.log('MYSTERY STATE VALIDATED:', sess0.id)
        } else {
          console.log('MYSTERY ERROR:', 'invalid or incomplete session state', sess0.id)
          setPreparing(true)
          s = buildFreshMysteryState()
          await supabase.from('game_sessions').update({ state: s }).eq('id', sess0.id)
          console.log('MYSTERY STATE REPAIRED:', sess0.id)
          setPreparing(false)
        }

        setState(s)
        setLoading(false)
        console.log('SESSION READY', sess0.id)
        checkAndRecover(s)
      } catch (e: any) {
        console.log('MYSTERY ERROR:', e?.message || e)
        setLoading(false)
        setPreparing(false)
      }

      // Subscribe to THIS game_session row via Supabase realtime
      const channel = supabase
        .channel(`mystery-choice-${sess0.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sess0.id}` }, (payload: any) => {
          if (payload.new?.id !== activeSessionRef.current) return  // hard guard: ignore stale/other-session updates
          const newState = payload.new.state as MysteryChoiceState
          console.log('MYSTERY CHOICE REALTIME UPDATE', newState)
          if (!isValidMysteryState(newState)) {
            console.log('MYSTERY ERROR:', 'invalid realtime state received', sess0.id)
            return  // ignore malformed broadcasts; local state stays as last-known-good
          }
          setState(newState)
          checkAndRecover(newState)
        })
        .subscribe()
      channelRef.current = channel
    }
    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [session?.id])

  // ── Fetch-merge-write helpers (never overwrite using stale local React state) ──
  async function fetchLatestState(): Promise<MysteryChoiceState | null> {
    if (!session) return null
    const { data } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
    const latest = (data?.state || null) as MysteryChoiceState | null
    console.log('MYSTERY CHOICE LATEST STATE BEFORE UPDATE', latest)
    return latest
  }

  async function writeState(next: MysteryChoiceState) {
    if (!session) return
    await supabase.from('game_sessions').update({ state: next }).eq('id', session.id)
    setState(next)
  }

  // Detect + repair an impossible combination: a ready flag stuck true while
  // choices are empty (can happen after a race or interrupted transition).
  async function checkAndRecover(observed: MysteryChoiceState) {
    if (!observed || observed.status === 'finished' || recoveryLockRef.current) return

    // Guard: current_round overflowed the rounds array — force finish.
    if (observed.current_round >= (observed.rounds?.length || FALLBACK_ROUNDS.length)) {
      recoveryLockRef.current = true
      const latest = await fetchLatestState()
      if (latest && latest.status !== 'finished') {
        await writeState({ ...latest, status: 'finished', result: 'completed' })
      }
      recoveryLockRef.current = false
      return
    }

    const stuck = (observed.player_one_ready || observed.player_two_ready)
      && !observed.player_one_choice && !observed.player_two_choice && !observed.round_result

    if (stuck) {
      recoveryLockRef.current = true
      const latest = await fetchLatestState()
      if (latest && (latest.player_one_ready || latest.player_two_ready)
        && !latest.player_one_choice && !latest.player_two_choice && !latest.round_result) {
        console.log('MYSTERY CHOICE STUCK STATE RECOVERED', session?.id)
        await writeState({ ...latest, player_one_ready: false, player_two_ready: false })
      }
      recoveryLockRef.current = false
    }
  }

  async function choose(choice: string | string[]) {
    if (!session || !myId) return
    const latest = await fetchLatestState()
    if (!latest || latest.status === 'finished') return
    const isPlayerOne = myId === session.player_one_id
    if (isPlayerOne && latest.player_one_choice) return
    if (!isPlayerOne && latest.player_two_choice) return

    const next: MysteryChoiceState = {
      ...latest,
      player_one_choice: isPlayerOne ? choice : latest.player_one_choice,
      player_two_choice: !isPlayerOne ? choice : latest.player_two_choice,
    }
    console.log('PLAYER CHOICE SAVED', isPlayerOne ? 'player_one' : 'player_two', choice)
    console.log('MYSTERY CHOICE SAVED:', session.id, isPlayerOne ? 'player_one' : 'player_two', choice)
    await writeState(next)

    // Both now chosen — compute the WEIGHTED score on the SAME fresh base we just wrote
    if (next.player_one_choice && next.player_two_choice && !next.round_result && !resultWriteLock.current) {
      resultWriteLock.current = true
      console.log('BOTH CHOICES READY')
      const round = next.rounds[next.current_round]
      const scoreResult: RoundScoreResult = computeRoundScore(round, next.player_one_choice, next.player_two_choice)
      console.log('ROUND RESULT', scoreResult.outcome, 'score', scoreResult.score, '/', scoreResult.maxScore)
      const matches = (next.matches || 0) + (scoreResult.outcome === 'match' ? 1 : 0)
      const scoreTotal = (next.scoreTotal || 0) + scoreResult.score
      const scoreMax = (next.scoreMax || 0) + scoreResult.maxScore
      const historyEntry: RoundHistoryEntry = {
        round: next.current_round, category: round.category,
        weight: round.weight, outcome: scoreResult.outcome, question: round.question,
        playerOneChoice: next.player_one_choice, playerTwoChoice: next.player_two_choice,
      }
      const history = [...(next.history || []), historyEntry]
      await writeState({ ...next, round_result: scoreResult.outcome, matches, scoreTotal, scoreMax, history })
      console.log('MYSTERY ROUND COMPLETE:', session.id, 'round', next.current_round, scoreResult.outcome)
      resultWriteLock.current = false
    }
  }

  // Safety net: if a client ever observes both choices present but no result yet
  // (e.g. the writer above got interrupted), any client can complete it — always
  // against a freshly fetched base, never the stale local `state`.
  useEffect(() => {
    if (!state || !session) return
    if (state.player_one_choice && state.player_two_choice && !state.round_result && !resultWriteLock.current) {
      resultWriteLock.current = true
      ;(async () => {
        const latest = await fetchLatestState()
        if (latest && latest.player_one_choice && latest.player_two_choice && !latest.round_result) {
          console.log('BOTH CHOICES READY')
          const round = latest.rounds[latest.current_round]
          const scoreResult: RoundScoreResult = computeRoundScore(round, latest.player_one_choice, latest.player_two_choice)
          console.log('ROUND RESULT', scoreResult.outcome, 'score', scoreResult.score, '/', scoreResult.maxScore)
          const matches = (latest.matches || 0) + (scoreResult.outcome === 'match' ? 1 : 0)
          const scoreTotal = (latest.scoreTotal || 0) + scoreResult.score
          const scoreMax = (latest.scoreMax || 0) + scoreResult.maxScore
          const historyEntry: RoundHistoryEntry = {
            round: latest.current_round, category: round.category,
            weight: round.weight, outcome: scoreResult.outcome, question: round.question,
            playerOneChoice: latest.player_one_choice, playerTwoChoice: latest.player_two_choice,
          }
          const history = [...(latest.history || []), historyEntry]
          await writeState({ ...latest, round_result: scoreResult.outcome, matches, scoreTotal, scoreMax, history })
          console.log('MYSTERY ROUND COMPLETE:', session?.id, 'round', latest.current_round, scoreResult.outcome)
        }
        resultWriteLock.current = false
      })()
    }
  }, [state?.player_one_choice, state?.player_two_choice])

  async function markReady() {
    if (!session || !myId) return
    const latest = await fetchLatestState()
    if (!latest || latest.status === 'finished') return
    const isPlayerOne = myId === session.player_one_id

    // Only set MY OWN ready flag — do NOT clear choices immediately
    const next: MysteryChoiceState = {
      ...latest,
      player_one_ready: isPlayerOne ? true : latest.player_one_ready,
      player_two_ready: !isPlayerOne ? true : latest.player_two_ready,
    }
    console.log('MYSTERY CHOICE PLAYER READY SET', isPlayerOne ? 'player_one' : 'player_two')
    console.log('NEXT ROUND READY', isPlayerOne ? 'player_one' : 'player_two')
    await writeState(next)
  }

  // When both ready flags are observed true, perform ONE atomic round transition
  // (always against a freshly refetched row, never the stale local state).
  useEffect(() => {
    if (!state || !session) return
    console.log('MYSTERY CHOICE BOTH READY CHECK', state.player_one_ready, state.player_two_ready)
    if (state.player_one_ready && state.player_two_ready && !advanceWriteLock.current) {
      advanceWriteLock.current = true
      performRoundTransition().finally(() => { advanceWriteLock.current = false })
    }
  }, [state?.player_one_ready, state?.player_two_ready])

  async function performRoundTransition() {
    const latest = await fetchLatestState()
    if (!latest) return
    // Re-verify against the FRESH row — avoid transitioning on stale local flags
    if (!(latest.player_one_ready && latest.player_two_ready)) return
    if (latest.status === 'finished') return

    console.log('MYSTERY CHOICE ROUND TRANSITION START')
    const isLastRound = latest.current_round + 1 >= (latest.rounds?.length || FALLBACK_ROUNDS.length)
    let next: MysteryChoiceState
    if (isLastRound) {
      console.log('GAME COMPLETE')
      console.log('MYSTERY GAME COMPLETE:', session?.id, 'matches', latest.matches || 0)
      next = { ...latest, status: 'finished', result: 'completed' }
    } else {
      console.log('NEXT ROUND STARTED')
      console.log('MYSTERY NEXT ROUND:', session?.id, 'round', latest.current_round + 1)
      next = {
        ...latest,
        current_round: latest.current_round + 1,
        player_one_choice: null,
        player_two_choice: null,
        player_one_ready: false,
        player_two_ready: false,
        round_result: null,
      }
    }
    await writeState(next)
    console.log('MYSTERY CHOICE ROUND TRANSITION COMPLETE')
  }

  // Count pair progress ONLY when the full 10-round game finishes (not per round)
  useEffect(() => {
    if (!state || !session || !myId) return
    if (state.status !== 'finished') return
    console.log('MYSTERY CHOICE GAME COMPLETE')
    countMysteryProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status])

  async function countMysteryProgress() {
    if (!session || !myId || countLockRef.current) return
    countLockRef.current = true
    try {
      console.log('MYSTERY CHOICE PROGRESS CHECK')

      // Re-read fresh state to guard against double counting (same pattern as Tic Tac Toe)
      const { data: fresh } = await supabase.from('game_sessions').select('state').eq('id', session.id).maybeSingle()
      const freshState = (fresh?.state || state) as MysteryChoiceState

      if (freshState.progressCounted) {
        console.log('MYSTERY CHOICE PROGRESS CHECK: already counted', session.id)
        return
      }

      console.log('MYSTERY CHOICE COUNTING PROGRESS')
      const otherId = myId === session.player_one_id ? session.player_two_id : session.player_one_id

      // Mark progressCounted FIRST to prevent double counting from the other client
      const marked: MysteryChoiceState = { ...freshState, progressCounted: true }
      await supabase.from('game_sessions').update({ state: marked }).eq('id', session.id)
      setState(marked)

      const before = await getPairProgress(otherId)
      console.log('PAIR PROGRESS BEFORE', before.games_completed)

      const after = await incrementPairGames(otherId)
      if (after.error) {
        console.error('MYSTERY CHOICE PROGRESS UPDATE FAILED:', after.error)
        setProgressError(after.error)
      } else {
        console.log('PAIR PROGRESS AFTER', after.games_completed)
        setPairCount(after.games_completed)
        setProgressError(null)
        console.log('MYSTERY CHOICE PROGRESS COUNTED')
      }
    } finally {
      countLockRef.current = false
    }
  }

  // ── UI-only effects (no writes to game_sessions, no effect on sync/scoring) ──

  // Freeze briefly, then play the flip-reveal animation whenever a round result appears
  useEffect(() => {
    if (state?.round_result) {
      setRevealing(true)
      revealTimerRef.current = setTimeout(() => setRevealing(false), 800)
    } else {
      setRevealing(false)
    }
    return () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current) }
  }, [state?.round_result, state?.current_round])

  // Session-local match tally for the celebration screen (view-only, not persisted)
  useEffect(() => {
    if (!state) return
    if (state.round_result === 'match' && tallyRoundRef.current !== state.current_round) {
      tallyRoundRef.current = state.current_round
      setMatchTally(t => t + 1)
    }
  }, [state?.round_result, state?.current_round])

  // Reset the tally if we land on a brand-new session
  useEffect(() => { setMatchTally(0); tallyRoundRef.current = -1 }, [session?.id])

  // Reveal screen: reset to the "Analyzing..." step when the game finishes,
  // then auto-advance to the first insight card after ~2s (presentation only)
  useEffect(() => {
    if (state?.status === 'finished' && revealStep === 0) {
      const t = setTimeout(() => setRevealStep(1), 2000)
      return () => clearTimeout(t)
    }
  }, [state?.status, revealStep])

  // Reset staged multi-select picks whenever the round changes
  useEffect(() => { setPendingMulti([]) }, [state?.current_round, session?.id])

  // Diagnostic: log whenever the active round changes (load or transition)
  useEffect(() => {
    if (state && session?.id) console.log('MYSTERY ROUND:', session.id, state.current_round + 1, '/', state.rounds?.length || 10)
  }, [state?.current_round, session?.id])

  // Read-only presence indicators for the player header (reuses existing presence API)
  useEffect(() => {
    if (!session) return
    let active = true
    async function poll() {
      const [p1, p2] = await Promise.all([getPresence(session!.player_one_id), getPresence(session!.player_two_id)])
      if (!active) return
      setOnlineOne(isOnlineNow(p1.isOnline, p1.lastSeen))
      setOnlineTwo(isOnlineNow(p2.isOnline, p2.lastSeen))
    }
    poll()
    const t = setInterval(poll, 15000)
    return () => { active = false; clearInterval(t) }
  }, [session?.id])

  async function playAgain() {
    if (!session || !myId) return
    console.log('MYSTERY CHOICE PLAY AGAIN CLICKED:', session.id)
    const opponentId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    const result = await sendGameInvite(opponentId, 'mystery_choice')
    if (!result.ok || !result.inviteId) { console.error('Mystery Choice play again failed:', result.error); return }
    const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
    setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'mystery_choice' })
    navigate('waiting')
  }

  function compatibilityLabel(score: number): string {
    if (score >= 8) return lang === 'gr' ? 'Τέλειο Ταίριασμα' : 'Perfect Match'
    if (score >= 6) return lang === 'gr' ? 'Καταπληκτική Χημεία' : 'Amazing Chemistry'
    if (score >= 4) return lang === 'gr' ? 'Υπέροχη Σύνδεση' : 'Great Connection'
    if (score >= 2) return lang === 'gr' ? 'Καλές Προοπτικές' : 'Good Potential'
    return lang === 'gr' ? 'Συνέχισε να Ανακαλύπτεις' : 'Keep Discovering'
  }

  if (loading || preparing || sessionRetrying) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a10' }}>
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(255,255,255,0.08)' }} />
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid transparent', borderTopColor: '#ff3384', borderRightColor: '#d84dd8', animation: 'mcSpin 0.9s linear infinite' }} />
        </div>
        <div className="text-white/40 text-[13px] mt-4 absolute" style={{ marginTop: 64 }}>
          {sessionRetrying
            ? (lang === 'gr' ? 'Προετοιμασία παιχνιδιού...' : 'Preparing game...')
            : preparing
            ? (lang === 'gr' ? 'Προετοιμασία του Mystery Choice...' : 'Preparing Mystery Choice...')
            : (lang === 'gr' ? 'Φόρτωση...' : 'Loading...')}
        </div>
      </div>
    )
  }

  // No session_id → "No game session found."
  if (!session?.id || !state) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(253,41,123,0.1) 0%, transparent 60%), #0a0a10' }}>
        <div className="rounded-3xl p-8 text-center" style={{ background: 'rgba(15,12,25,0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 50px rgba(0,0,0,0.5)' }}>
          <div className="text-[44px] mb-3">⚠️</div>
          <div className="text-[16px] font-bold text-white mb-5 text-center">
            {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}
          </div>
          <button onClick={() => navigate('profile')} className="rounded-full px-6 py-3 text-[13px] font-bold cursor-pointer active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 24px rgba(253,41,123,0.4)' }}>
            {lang === 'gr' ? 'Πίσω' : 'Back'}
          </button>
        </div>
      </div>
    )
  }

  const isPlayerOne = myId === session.player_one_id
  const myChoice = isPlayerOne ? state.player_one_choice : state.player_two_choice
  const oppChoice = isPlayerOne ? state.player_two_choice : state.player_one_choice
  const myReady = isPlayerOne ? state.player_one_ready : state.player_two_ready
  const oppReady = isPlayerOne ? state.player_two_ready : state.player_one_ready
  const rounds = state.rounds?.length ? state.rounds : FALLBACK_ROUNDS
  const safeRoundIndex = Number.isFinite(state.current_round) ? state.current_round % rounds.length : 0
  const round = rounds[safeRoundIndex] || FALLBACK_ROUNDS[0]
  const optA = lang === 'gr' ? round.gr[0] : round.en[0]
  const optB = lang === 'gr' ? round.gr[1] : round.en[1]
  const isBinaryRound = round.type === 'binary' || (round.options.length === 2 && round.maxSelect === 1)
  const progressPct = Math.round(((safeRoundIndex + 1) / rounds.length) * 100)

  // Game complete screen — premium celebration
  if (state.status === 'finished') {
    const scoreOutOf = rounds.length
    const matchCount = state.matches || 0
    // Weighted compatibility % — uses each round's weight (and, for multi-select
    // rounds, partial overlap credit) instead of only counting identical answers.
    const pct = (state.scoreMax || 0) > 0 ? Math.round(((state.scoreTotal || 0) / (state.scoreMax || 1)) * 100) : 0
    const history = state.history || []
    const breakdown = computeCategoryBreakdown(history, pct)
    const similarities = topSimilarities(history, lang as 'en' | 'gr')
    const difference = biggestDifference(history, myId, session, lang as 'en' | 'gr')
    const summary = generateSummary(pct, breakdown, difference?.category || null, lang as 'en' | 'gr')
    const canChat = pairCount >= 10

    const shortExplanation = similarities.length > 0
      ? (lang === 'gr' ? `Και οι δύο δίνετε αξία σε ${catLabel(history.find(h => h.outcome === 'match')?.category || 'relationships', 'gr')} και ειλικρινή επικοινωνία.` : `You both value ${catLabel(history.find(h => h.outcome === 'match')?.category || 'relationships', 'en')} and honest communication.`)
      : (lang === 'gr' ? 'Ανακαλύψατε πολλά ο ένας για τον άλλον.' : 'You discovered a lot about each other.')

    return (
      <div className="relative flex flex-col h-full items-center justify-center px-6 overflow-hidden" style={{ background: '#0a0a10' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.16) 0%, transparent 60%), radial-gradient(ellipse at 50% 75%, rgba(108,99,255,0.14) 0%, transparent 60%)', animation: 'mcBgPulse 6s ease-in-out infinite' }} />
        <McParticles />

        {/* Step 0 — Analyzing */}
        {revealStep === 0 && (
          <div className="relative z-10 flex flex-col items-center" style={{ animation: 'mcFadeIn 0.4s ease both' }}>
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(255,255,255,0.08)' }} />
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid transparent', borderTopColor: '#ff3384', borderRightColor: '#d84dd8', borderBottomColor: '#7c72ff', animation: 'mcSpin 1.1s linear infinite' }} />
              <div className="absolute inset-0 flex items-center justify-center text-[26px]" style={{ animation: 'mcFloat 2s ease-in-out infinite' }}>💫</div>
            </div>
            <div className="text-[16px] font-bold text-white text-center" style={{ animation: 'mcPulseText 1.6s ease-in-out infinite' }}>
              {lang === 'gr' ? 'Ανάλυση της συμβατότητάς σας...' : 'Analyzing your compatibility...'}
            </div>
          </div>
        )}

        {/* Step 1 — Relationship Compatibility */}
        {revealStep === 1 && (
          <div key="card1" className="relative z-10 flex flex-col items-center w-full max-w-[380px]" style={{ animation: 'mcCardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl p-8 w-full text-center" style={{ background: 'rgba(15,12,25,0.75)', backdropFilter: 'blur(28px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 50px rgba(253,41,123,0.12)' }}>
              <div className="text-[36px] mb-2">❤️</div>
              <div className="text-[13px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {lang === 'gr' ? 'Συμβατότητα Σχέσης' : 'Relationship Compatibility'}
              </div>
              <div className="text-[52px] font-black mb-4" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8,#7c72ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {pct}%
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {shortExplanation}
              </div>
            </div>
            <button onClick={() => setRevealStep(2)} className="rounded-2xl px-10 py-3.5 text-[14px] font-bold mt-6 active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(253,41,123,0.4)' }}>
              {lang === 'gr' ? 'Συνέχεια →' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Step 2 — Biggest Similarities */}
        {revealStep === 2 && (
          <div key="card2" className="relative z-10 flex flex-col items-center w-full max-w-[380px]" style={{ animation: 'mcCardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl p-8 w-full" style={{ background: 'rgba(15,12,25,0.75)', backdropFilter: 'blur(28px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 50px rgba(124,114,255,0.1)' }}>
              <div className="text-center mb-5">
                <div className="text-[36px] mb-2">✨</div>
                <div className="text-[15px] font-extrabold text-white">
                  {lang === 'gr' ? 'Οι Μεγαλύτερες Ομοιότητές σας' : 'Your Biggest Similarities'}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {(similarities.length > 0 ? similarities : [lang === 'gr' ? 'Μοιραστήκατε αρκετά κοινά σημεία.' : 'You shared quite a few common answers.']).map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', animation: `mcFadeIn 0.4s ease ${0.1 * i}s both` }}>
                    <span style={{ color: '#4ade80' }}>•</span>
                    <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setRevealStep(3)} className="rounded-2xl px-10 py-3.5 text-[14px] font-bold mt-6 active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#7c72ff,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(108,99,255,0.4)' }}>
              {lang === 'gr' ? 'Συνέχεια →' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Step 3 — Biggest Difference */}
        {revealStep === 3 && (
          <div key="card3" className="relative z-10 flex flex-col items-center w-full max-w-[380px]" style={{ animation: 'mcCardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl p-8 w-full text-center" style={{ background: 'rgba(15,12,25,0.75)', backdropFilter: 'blur(28px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 50px rgba(253,41,123,0.1)' }}>
              <div className="text-[36px] mb-2">🔥</div>
              <div className="text-[15px] font-extrabold text-white mb-4">
                {lang === 'gr' ? 'Η Μεγαλύτερη Διαφορά' : 'Biggest Difference'}
              </div>
              <div className="text-[14px] leading-relaxed whitespace-pre-line mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {difference?.line || (lang === 'gr' ? 'Ταιριάξατε σε όλες σχεδόν τις ερωτήσεις!' : 'You matched on almost everything!')}
              </div>
              <div className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {lang === 'gr' ? 'Το διαφορετικό δεν σημαίνει ασύμβατο.' : "Different doesn't mean incompatible."}
              </div>
            </div>
            <button onClick={() => setRevealStep(4)} className="rounded-2xl px-10 py-3.5 text-[14px] font-bold mt-6 active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(253,41,123,0.4)' }}>
              {lang === 'gr' ? 'Συνέχεια →' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Step 4 — Final Card */}
        {revealStep === 4 && (
          <div key="card4" className="relative z-10 flex flex-col items-center w-full max-w-[380px] overflow-y-auto" style={{ animation: 'mcCardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both', maxHeight: '100%' }}>
            <div className="rounded-3xl p-7 w-full" style={{ background: 'rgba(15,12,25,0.78)', backdropFilter: 'blur(28px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 60px rgba(253,41,123,0.14)' }}>
              <div className="text-center mb-5">
                <div className="text-[40px] mb-1" style={{ animation: 'mcFloat 3s ease-in-out infinite' }}>🎉</div>
                <div className="text-[18px] font-extrabold" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8,#7c72ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {compatibilityLabel(matchCount)}
                </div>
              </div>

              {/* Percentage bars */}
              <div className="flex flex-col gap-3 mb-5">
                {[
                  { label: lang === 'gr' ? 'Συμβατότητα' : 'Compatibility', value: pct, color: '#ff3384' },
                  { label: lang === 'gr' ? 'Επικοινωνία' : 'Communication', value: breakdown.communication, color: '#d84dd8' },
                  { label: lang === 'gr' ? 'Τρόπος Ζωής' : 'Lifestyle', value: breakdown.lifestyle, color: '#7c72ff' },
                  { label: lang === 'gr' ? 'Αξίες Σχέσης' : 'Relationship Values', value: breakdown.values, color: '#4ade80' },
                  { label: lang === 'gr' ? 'Περιπέτεια' : 'Adventure', value: breakdown.adventure, color: '#38bdf8' },
                ].map((row, i) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: row.color }}>{row.value}%</span>
                    </div>
                    <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${row.value}%`, background: row.color, transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${0.1 * i}s` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-2xl px-4 py-3.5 mb-5 text-[12px] leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}>
                {summary}
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => {
                    if (!canChat || !session) return
                    const isPlayerOne = myId === session.player_one_id
                    const oppId = isPlayerOne ? session.player_two_id : session.player_one_id
                    const oppName = isPlayerOne ? names.two : names.one
                    setCurrentMatch({ id: oppId, name: oppName, age: 0, photo: '', gradient: 'linear-gradient(135deg,#ff3384,#ff7a6e)', location: { en: '', gr: '' }, online: false, interests: [], bio: { en: '', gr: '' } })
                    navigate('chat')
                  }}
                  disabled={!canChat}
                  className="rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer disabled:cursor-default"
                  style={{ background: canChat ? 'linear-gradient(135deg,#7c72ff,#d84dd8)' : 'rgba(255,255,255,0.06)', color: canChat ? '#fff' : 'rgba(255,255,255,0.35)', boxShadow: canChat ? '0 8px 24px rgba(108,99,255,0.4)' : 'none' }}>
                  💬 {canChat ? (lang === 'gr' ? 'Έναρξη Chat' : 'Start Chat') : (lang === 'gr' ? `Chat στα ${pairCount}/10` : `Chat unlocks at ${pairCount}/10`)}
                </button>
                <button onClick={playAgain} className="rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(253,41,123,0.45)' }}>
                  🎮 {lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}
                </button>
                <button onClick={() => navigate('profile')} className="rounded-2xl py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
                  style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)' }}>
                  {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes mcCelebrateIn { from{opacity:0;transform:scale(0.9) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes mcFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes mcBgPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
          @keyframes mcCardIn { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
          @keyframes mcPulseText { 0%,100%{opacity:0.6} 50%{opacity:1} }
        `}</style>
      </div>
    )
  }


  const waitingOnOpponent = !!myChoice && !state.round_result
  const revealed = !!state.round_result

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: '#0a0a10' }}>
      {/* Animated gradient background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 15%, rgba(253,41,123,0.14) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(108,99,255,0.14) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(216,77,216,0.06) 0%, transparent 60%)',
        backgroundSize: '160% 160%',
        animation: 'mcBgDrift 14s ease-in-out infinite',
      }} />
      <McParticles />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-14 pb-3">
        <button onClick={() => navigate('profile')} className="text-white/50 text-[16px] cursor-pointer w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-transform" style={{ background: 'rgba(255,255,255,0.06)' }}>←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">🎭 Mystery Choice</h1>
      </div>

      {/* Round indicator + progress bar */}
      <div className="relative z-10 px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lang === 'gr' ? 'Γύρος' : 'Round'} {safeRoundIndex + 1} / {rounds.length}
          </span>
        </div>
        <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full" style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg,#ff3384,#d84dd8,#7c72ff)',
            boxShadow: '0 0 12px rgba(253,41,123,0.5)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      </div>

      {/* Premium player header */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 pb-4">
        <PlayerCard name={names.one} colorA="#ff3384" colorB="#ff7a6e" online={onlineOne} active={waitingOnOpponent && isPlayerOne === false && !oppChoice} isMe={isPlayerOne} />
        <div className="flex flex-col items-center px-1">
          <div className="text-[15px] font-black" style={{ color: 'rgba(255,255,255,0.7)', animation: 'mcVsPulse 1.8s ease-in-out infinite' }}>VS</div>
        </div>
        <PlayerCard name={names.two} colorA="#7c72ff" colorB="#a855f7" online={onlineTwo} active={waitingOnOpponent && isPlayerOne === true && !oppChoice} isMe={!isPlayerOne} />
      </div>

      {/* Question card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6 min-h-0 overflow-y-auto">
        <div key={`round-${state.current_round}`} className="w-full max-w-[400px] rounded-3xl p-7 mb-5"
          style={{
            background: 'rgba(15,12,25,0.72)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 50px rgba(253,41,123,0.1)',
            animation: 'mcCardFade 0.4s ease both',
          }}>

          <div className="text-center text-[19px] font-extrabold mb-6 leading-snug" style={{ color: '#fff' }}>
            {isBinaryRound
              ? (lang === 'gr' ? `${optA} ή ${optB};` : `${optA} or ${optB}?`)
              : (lang === 'gr' ? round.questionGr : round.question)}
          </div>

          {isBinaryRound ? (
            /* Binary — unchanged two-big-button layout */
            <div className="flex flex-col gap-3">
              {([0, 1] as const).map(idx => {
                const label = idx === 0 ? optA : optB
                const emoji = round.emoji[idx]
                const isMine = myChoice === label
                const isOpp = revealed && oppChoice === label
                return (
                  <button key={idx} onClick={() => choose(label)} disabled={!!myChoice}
                    className="mc-answer-btn w-full rounded-2xl py-5 text-[16px] font-bold flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-default"
                    style={{
                      background: isMine ? 'linear-gradient(135deg,#ff3384,#d84dd8)' : 'rgba(255,255,255,0.05)',
                      color: isMine ? '#fff' : 'rgba(255,255,255,0.88)',
                      border: isOpp && !isMine ? '2px solid #7c72ff' : '1px solid rgba(255,255,255,0.12)',
                      boxShadow: isMine ? '0 10px 30px rgba(253,41,123,0.45)' : 'none',
                      opacity: myChoice && !isMine && !revealed ? 0.45 : 1,
                      transform: revealed && revealing ? 'rotateX(6deg)' : 'none',
                      transition: 'transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                    }}>
                    <span className="text-[24px]">{emoji}</span>
                    <span>{label}</span>
                    {isOpp && !isMine && <span className="text-[11px] ml-1" style={{ color: '#7c72ff' }}>{lang==='gr'?'(αυτός/ή)':'(them)'}</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Multi-select / preference — up to 6 chip options, same premium visual language */
            <div className="flex flex-col gap-2.5">
              {(lang === 'gr' ? round.optionsGr : round.options).map((label, idx) => {
                const alreadySubmitted = !!myChoice
                const mySelectedNow = alreadySubmitted
                  ? Array.isArray(myChoice) ? myChoice.includes(label) : myChoice === label
                  : pendingMulti.includes(label)
                const isOpp = revealed && (Array.isArray(oppChoice) ? oppChoice.includes(label) : oppChoice === label)
                const canToggle = !alreadySubmitted && (mySelectedNow || pendingMulti.length < round.maxSelect)
                return (
                  <button key={idx} disabled={alreadySubmitted || !canToggle}
                    onClick={() => {
                      if (round.maxSelect <= 1) { choose(label); return }
                      setPendingMulti(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label].slice(0, round.maxSelect))
                    }}
                    className="mc-answer-btn w-full rounded-2xl py-4 px-5 text-[14px] font-bold flex items-center justify-between gap-2.5 cursor-pointer disabled:cursor-default text-left"
                    style={{
                      background: mySelectedNow ? 'linear-gradient(135deg,#ff3384,#d84dd8)' : 'rgba(255,255,255,0.05)',
                      color: mySelectedNow ? '#fff' : 'rgba(255,255,255,0.88)',
                      border: isOpp && !mySelectedNow ? '2px solid #7c72ff' : '1px solid rgba(255,255,255,0.12)',
                      boxShadow: mySelectedNow ? '0 8px 24px rgba(253,41,123,0.4)' : 'none',
                      opacity: alreadySubmitted && !mySelectedNow && !revealed ? 0.45 : 1,
                      transition: 'all 0.2s ease',
                    }}>
                    <span>{label}</span>
                    {isOpp && !mySelectedNow && <span className="text-[11px]" style={{ color: '#7c72ff' }}>{lang==='gr'?'(αυτός/ή)':'(them)'}</span>}
                  </button>
                )
              })}
              {!myChoice && round.maxSelect > 1 && (
                <button onClick={() => choose(pendingMulti)} disabled={pendingMulti.length === 0}
                  className="rounded-2xl py-3.5 text-[13px] font-bold mt-1 cursor-pointer disabled:cursor-default"
                  style={{
                    background: pendingMulti.length > 0 ? 'linear-gradient(135deg,#7c72ff,#d84dd8)' : 'rgba(255,255,255,0.05)',
                    color: pendingMulti.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}>
                  {lang === 'gr' ? `Επιβεβαίωση (${pendingMulti.length}/${round.maxSelect})` : `Confirm (${pendingMulti.length}/${round.maxSelect})`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Waiting state */}
        {waitingOnOpponent && !revealing && (
          <div className="flex items-center gap-2.5 mb-4" style={{ animation: 'mcFadeIn 0.3s ease both' }}>
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.15)' }} />
              <div className="absolute inset-0 rounded-full" style={{ border: '2px solid transparent', borderTopColor: '#ff3384', animation: 'mcSpin 0.8s linear infinite' }} />
            </div>
            <span className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {lang === 'gr' ? 'Αναμονή για τον αντίπαλο' : 'Waiting for your opponent'}
              <span className="mc-dots" />
            </span>
          </div>
        )}

        {/* Prompt before choosing */}
        {!myChoice && !revealed && (
          <div className="text-[14px] font-semibold mb-4 text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {lang === 'gr' ? 'Διάλεξε την απάντησή σου' : 'Choose your answer'}
          </div>
        )}

        {/* Reveal result */}
        {revealed && !revealing && (
          <div className="flex flex-col items-center gap-2 mb-5" style={{ animation: 'mcResultPop 0.4s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-full px-5 py-2 text-[15px] font-black flex items-center gap-2"
              style={{
                background: state.round_result === 'match' ? 'rgba(74,222,128,0.14)' : 'rgba(253,41,123,0.14)',
                color: state.round_result === 'match' ? '#4ade80' : '#ff3384',
                border: `1.5px solid ${state.round_result === 'match' ? 'rgba(74,222,128,0.4)' : 'rgba(253,41,123,0.4)'}`,
                boxShadow: state.round_result === 'match' ? '0 0 24px rgba(74,222,128,0.3)' : '0 0 24px rgba(253,41,123,0.25)',
              }}>
              {state.round_result === 'match' ? '✓ MATCH' : '✕ DIFFERENT'}
            </div>
            <div className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {state.round_result === 'match'
                ? (lang === 'gr' ? '+1 Ταίριασμα' : '+1 Match')
                : (lang === 'gr' ? 'Διαφορετικές επιλογές' : 'Different choices')}
            </div>
          </div>
        )}

        {/* Next round — both users see it after a result; tapping sets ready flag */}
        {revealed && !revealing && (
          <button onClick={markReady} disabled={myReady}
            className="rounded-2xl px-8 py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer disabled:cursor-default"
            style={{
              background: myReady ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#7c72ff,#d84dd8)',
              color: myReady ? 'rgba(255,255,255,0.5)' : '#fff',
              boxShadow: myReady ? 'none' : '0 10px 30px rgba(108,99,255,0.45)',
              animation: 'mcFadeIn 0.3s ease both',
            }}>
            {myReady
              ? (lang === 'gr' ? 'Αναμονή για τον άλλο...' : 'Waiting for other player...')
              : (lang === 'gr' ? 'Επόμενος Γύρος →' : 'Next Round →')}
          </button>
        )}
      </div>

      <style>{`
        @keyframes mcSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes mcFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mcCardFade { from{opacity:0;transform:translateY(10px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mcResultPop { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
        @keyframes mcVsPulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes mcBgDrift { 0%,100%{background-position:0% 0%} 50%{background-position:30% 20%} }
        @keyframes mcDotBlink { 0%,20%{opacity:0} 50%{opacity:1} 100%{opacity:0} }
        .mc-answer-btn:active { transform: scale(0.97); }
        .mc-dots::after { content:'...'; display:inline-block; width:1.2em; text-align:left; animation: mcDotsCycle 1.2s steps(4) infinite; }
        @keyframes mcDotsCycle { 0%{content:''} }
      `}</style>
    </div>
  )
}

// Small floating particles — purely decorative, cheap CSS-only animation
function McParticles() {
  const particles = [
    { l: '8%', t: '15%', d: '0s', s: 3 }, { l: '85%', t: '20%', d: '1.2s', s: 4 },
    { l: '15%', t: '75%', d: '2.1s', s: 3 }, { l: '75%', t: '65%', d: '0.6s', s: 5 },
    { l: '45%', t: '10%', d: '1.8s', s: 3 }, { l: '92%', t: '80%', d: '2.6s', s: 4 },
    { l: '30%', t: '90%', d: '0.9s', s: 3 }, { l: '60%', t: '35%', d: '3.1s', s: 4 },
  ]
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: p.l, top: p.t, width: p.s, height: p.s,
          background: i % 2 === 0 ? 'rgba(253,41,123,0.5)' : 'rgba(124,114,255,0.5)',
          filter: 'blur(1px)',
          animation: `mcParticleFloat 6s ease-in-out ${p.d} infinite`,
        }} />
      ))}
      <style>{`@keyframes mcParticleFloat { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-14px);opacity:0.9} }`}</style>
    </div>
  )
}

// Premium player card — avatar, name, online dot, subtle glow when it's this player we're waiting on
function PlayerCard({ name, colorA, colorB, online, active, isMe }: { name: string; colorA: string; colorB: string; online: boolean; active: boolean; isMe: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl px-3.5 py-3" style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? colorA + '80' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: active ? `0 0 22px ${colorA}55` : 'none',
      transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
    }}>
      <div className="relative">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[18px]" style={{
          background: `linear-gradient(135deg,${colorA},${colorB})`,
          boxShadow: active ? `0 0 18px ${colorA}80` : `0 0 10px ${colorA}30`,
        }}>🎭</div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{
          background: online ? '#4ade80' : '#666',
          border: '2px solid #0a0a10',
          boxShadow: online ? '0 0 6px #4ade80' : 'none',
        }} />
      </div>
      <div className="text-[11px] font-bold text-white text-center max-w-[70px] truncate">{name}{isMe ? ' (you)' : ''}</div>
    </div>
  )
}
