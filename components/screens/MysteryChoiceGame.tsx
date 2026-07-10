'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, sendGameInvite, setPendingInvite } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'
import { getPresence, isOnlineNow } from '@/lib/presence'
import { generateMysteryQuestions, CATEGORY_EMOJI, MysteryQuestion } from '@/lib/mysteryChoiceQuestions'

interface RoundData { emoji: [string, string]; en: [string, string]; gr: [string, string] }

interface MysteryChoiceState {
  game_type: string
  current_round: number
  rounds: RoundData[]
  player_one_choice: 'a' | 'b' | null
  player_two_choice: 'a' | 'b' | null
  player_one_ready: boolean
  player_two_ready: boolean
  round_result: 'match' | 'different' | null
  status: 'active' | 'finished'
  result?: 'completed' | null
  progressCounted?: boolean
  matches?: number
}

// Fallback in case a session's state is missing rounds (defensive only)
const FALLBACK_ROUNDS: RoundData[] = [
  { emoji: ['☕','🍷'], en: ['Coffee', 'Wine'], gr: ['Καφές', 'Κρασί'] },
]

// ── Validation helpers (module-level, no component state needed) ──
function isValidRound(r: any): boolean {
  return !!r
    && typeof r.id === 'string' && r.id.length > 0
    && typeof r.question === 'string' && r.question.length > 0
    && typeof r.optionA === 'string' && r.optionA.length > 0
    && typeof r.optionB === 'string' && r.optionB.length > 0
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
  const questions: MysteryQuestion[] = generateMysteryQuestions()
  const rounds: RoundData[] = questions.map(q => {
    const emoji = CATEGORY_EMOJI[q.category] || ['🎭', '✨']
    return {
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      emoji,
      en: [q.optionA, q.optionB],
      gr: [q.optionAGr, q.optionBGr],
    } as any
  })
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
    status: 'active',
    progressCounted: false,
  }
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

  async function choose(choice: 'a' | 'b') {
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

    // Both now chosen — compute + write the result on the SAME fresh base we just wrote
    if (next.player_one_choice && next.player_two_choice && !next.round_result && !resultWriteLock.current) {
      resultWriteLock.current = true
      console.log('BOTH CHOICES READY')
      const result = next.player_one_choice === next.player_two_choice ? 'match' : 'different'
      console.log('ROUND RESULT', result)
      const matches = (next.matches || 0) + (result === 'match' ? 1 : 0)
      await writeState({ ...next, round_result: result, matches })
      console.log('MYSTERY ROUND COMPLETE:', session.id, 'round', next.current_round, result)
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
          const result = latest.player_one_choice === latest.player_two_choice ? 'match' : 'different'
          console.log('ROUND RESULT', result)
          const matches = (latest.matches || 0) + (result === 'match' ? 1 : 0)
          await writeState({ ...latest, round_result: result, matches })
          console.log('MYSTERY ROUND COMPLETE:', session?.id, 'round', latest.current_round, result)
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
  const progressPct = Math.round(((safeRoundIndex + 1) / rounds.length) * 100)

  // Game complete screen — premium celebration
  if (state.status === 'finished') {
    const scoreOutOf = rounds.length
    const pct = scoreOutOf > 0 ? Math.round((matchTally / scoreOutOf) * 100) : 0
    const circumference = 2 * Math.PI * 54
    const dashOffset = circumference - (pct / 100) * circumference
    return (
      <div className="relative flex flex-col h-full items-center justify-center px-8 overflow-hidden" style={{ background: '#0a0a10' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.16) 0%, transparent 60%), radial-gradient(ellipse at 50% 75%, rgba(108,99,255,0.14) 0%, transparent 60%)', animation: 'mcBgPulse 6s ease-in-out infinite' }} />
        <McParticles />

        <div className="relative z-10 flex flex-col items-center" style={{ animation: 'mcCelebrateIn 0.6s cubic-bezier(0.34,1.4,0.64,1) both' }}>
          <div className="text-[56px] mb-2" style={{ animation: 'mcFloat 3s ease-in-out infinite' }}>🎉</div>
          <div className="text-[22px] font-extrabold text-white mb-1 text-center">
            {lang === 'gr' ? 'Το παιχνίδι ολοκληρώθηκε' : 'Game Complete'}
          </div>
          <div className="text-[12px] mb-7 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lang === 'gr' ? `${scoreOutOf} γύροι μαζί` : `${scoreOutOf} rounds together`}
          </div>

          {/* Animated compatibility ring */}
          <div className="relative w-[160px] h-[160px] mb-5">
            <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="url(#mcRingGrad)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)' }} />
              <defs>
                <linearGradient id="mcRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff3384" />
                  <stop offset="50%" stopColor="#d84dd8" />
                  <stop offset="100%" stopColor="#7c72ff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[30px] font-black text-white leading-none">{matchTally}<span className="text-[16px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>/{scoreOutOf}</span></div>
              <div className="text-[10px] font-bold uppercase tracking-[1.5px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {lang === 'gr' ? 'Ταίριασμα' : 'Matches'}
              </div>
            </div>
          </div>

          <div className="text-[16px] font-extrabold mb-8 text-center" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8,#7c72ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {compatibilityLabel(matchTally)}
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <button onClick={playAgain} className="rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(253,41,123,0.45)' }}>
              🔁 {lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}
            </button>
            <button onClick={() => navigate('profile')} className="rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes mcCelebrateIn { from{opacity:0;transform:scale(0.9) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes mcFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes mcBgPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
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
            {lang === 'gr' ? `${optA} ή ${optB};` : `${optA} or ${optB}?`}
          </div>

          {/* Answer buttons */}
          <div className="flex flex-col gap-3">
            {(['a','b'] as const).map(key => {
              const label = key === 'a' ? optA : optB
              const emoji = key === 'a' ? round.emoji[0] : round.emoji[1]
              const isMine = myChoice === key
              const isOpp = revealed && oppChoice === key
              return (
                <button key={key} onClick={() => choose(key)} disabled={!!myChoice}
                  className="mc-answer-btn w-full rounded-2xl py-5 text-[16px] font-bold flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-default"
                  style={{
                    background: isMine
                      ? 'linear-gradient(135deg,#ff3384,#d84dd8)'
                      : 'rgba(255,255,255,0.05)',
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
