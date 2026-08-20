'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession, subscribeCurrentSession, sendGameInvite, respondInvite, enterAcceptedGame, setPendingInvite, clearCurrentSession, setChatOrigin } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'
import { getPresence, isOnlineNow } from '@/lib/presence'
import { setCurrentMatch } from '@/lib/profiles'
import { fetchGamePlayerPhotoAccess } from '@/lib/gamePlayerPhoto'
import { emitScreenReady } from '@/lib/screenReadySignal'
import GamePlayerAvatar from '@/components/ui/GamePlayerAvatar'
import BackControl from '@/components/ui/BackControl'
import GamePresenceBanner from '@/components/game/GamePresenceBanner'
import FloatingChatButton from '@/components/chat/FloatingChatButton'
import FloatingRematchNotification from '@/components/game/FloatingRematchNotification'
import ChatUnlockProgress from '@/components/game/ChatUnlockProgress'
import RematchDeclinedToast from '@/components/game/RematchDeclinedToast'
import { getAnswerEmoji } from '@/lib/answerEmoji'
import { selectRandomResult, getResultById } from '@/lib/mysteryResultLibrary'
import {
  generateMysteryQuestions, toRoundData, computeCompatibilityPercent,
  RoundData,
} from '@/lib/mysteryChoiceQuestions'

// A selection is a single option string (binary / single-select) or an array
// of option strings (multi-select questions, up to round.maxSelect).
type Selection = string | string[] | null

interface RoundHistoryEntry {
  round: number
  category: string   // conversation theme this round belonged to
  weight: number
  outcome: 'match' | 'partial' | 'different'
  question: string
  playerOneChoice: Selection
  playerTwoChoice: Selection
  playerOneTraits: string[]  // traits earned by player one's choice (for the reveal)
  playerTwoTraits: string[]
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
  scoreTotal?: number   // sum of weighted round scores (kept for pair-progress use, not shown as the headline anymore)
  scoreMax?: number
  history?: RoundHistoryEntry[]  // per-round record, used only by the reveal screen
  resultId?: string               // selected ONCE on completion; both players render this same id
  round_transitioning?: string | null  // holds the claiming player's user id while a round transition is in flight — prevents duplicate transitions
}

// Fallback in case a session's state is missing rounds (defensive only)
const FALLBACK_ROUNDS: RoundData[] = [
  { id: 'fallback_weekend', category: 'ice_breaker', type: 'binary', question: 'Coffee date or dinner date?', questionGr: 'Καφές ή δείπνο;',
    conversationGoal: 'Learn their preferred first-date vibe',
    emoji: ['☕','🍽️'], en: ['Coffee date', 'Dinner date'], gr: ['Καφές', 'Δείπνο'],
    options: ['Coffee date', 'Dinner date'], optionsGr: ['Καφές', 'Δείπνο'],
    optionIds: ['fallback_weekend__opt0', 'fallback_weekend__opt1'],
    optionTraits: [['casual'], ['romantic']], maxSelect: 1, weight: 1, tags: ['casual', 'romantic'] },
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

// Resolve which traits a player's choice earned for a given round (single-select only)
function resolveTraits(round: RoundData, choice: Selection): string[] {
  if (!choice) return []
  const id = Array.isArray(choice) ? choice[0] : choice
  const ids = getOptionIds(round)
  const idx = ids.indexOf(id)
  if (idx === -1 || !round.optionTraits) return []
  return round.optionTraits[idx] || []
}

// Resilient accessor: use the stored optionIds if present, otherwise derive
// them on the fly using the same deterministic formula toRoundData() uses.
// This means even a round object saved by an older version of the game
// (before optionIds existed) still resolves to the exact same stable ids —
// no session repair, no lost game.
function getOptionIds(round: RoundData): string[] {
  if (round.optionIds && round.optionIds.length === round.options.length) return round.optionIds
  return round.options.map((_, i) => `${round.id}__opt${i}`)
}

// ── Cross-language answer normalization ──────────────────────────
// Saved answers must always be the stable, language-independent option id
// (e.g. "questionId__opt0"), never the localized display text — otherwise
// "Coffee" (English) and "Καφές" (Greek) would never match even though
// they're the same logical answer. This also transparently upgrades any
// legacy session that still has old localized text saved, without crashing
// or losing the game in progress.
function normalizeSingleAnswer(round: RoundData, raw: string): string | null {
  console.log('MYSTERY RAW SAVED ANSWER:', raw)

  const ids = getOptionIds(round)
  if (ids.includes(raw)) {
    console.log('MYSTERY NORMALIZED ANSWER ID:', raw)
    return raw
  }

  // Legacy session: raw is likely old localized display text — map it back
  // to the correct stable id using either language's option list.
  let idx = round.options.indexOf(raw)
  if (idx === -1) idx = round.optionsGr.indexOf(raw)
  if (idx !== -1 && ids[idx]) {
    const id = ids[idx]
    console.log('MYSTERY LEGACY ANSWER NORMALIZED:', raw, '->', id)
    console.log('MYSTERY NORMALIZED ANSWER ID:', id)
    return id
  }

  console.error('MYSTERY ANSWER ID ERROR:', 'could not resolve saved answer to an option id', raw)
  return null
}

function normalizeAnswer(round: RoundData, raw: Selection): Selection {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const mapped = raw.map(v => normalizeSingleAnswer(round, v)).filter((v): v is string => v !== null)
    return mapped
  }
  return normalizeSingleAnswer(round, raw)
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

// Shared by both the realtime handler and the polling fallback: merges an
// incoming canonical fetch/event against the currently-applied local
// state, preventing an older, in-flight read (started before the other
// player's own RPC write landed) from visually reverting an already-
// applied, newer answer/ready/result — without ever blocking a
// legitimate reset caused by genuinely advancing to a new round (where
// null choices / false ready flags are the correct, expected state).
function mergeCanonicalMysteryState(
  prev: MysteryChoiceState | null,
  incoming: MysteryChoiceState
): MysteryChoiceState {
  if (!prev) return incoming

  // Older round: the canonical state has already moved past this — reject.
  if (incoming.current_round < prev.current_round) return prev
  // Never un-finish an already-finished game.
  if (prev.status === 'finished' && incoming.status !== 'finished') return prev
  // Newer round: adopt as-is — its null choices / false ready flags are
  // the legitimate reset for that new round, not a regression.
  if (incoming.current_round > prev.current_round) return incoming

  // Same round: merge field-by-field, never letting a populated/true
  // value revert back to null/false — this is the exact gap that
  // previously allowed a stale, in-flight fetch to undo an already-
  // applied answer or ready tap.
  const resultRegresses = !!prev.round_result && !incoming.round_result
  return {
    ...incoming,
    player_one_choice: incoming.player_one_choice ?? prev.player_one_choice,
    player_two_choice: incoming.player_two_choice ?? prev.player_two_choice,
    player_one_ready: incoming.player_one_ready || prev.player_one_ready,
    player_two_ready: incoming.player_two_ready || prev.player_two_ready,
    // round_result and the fields the RPC always writes atomically
    // alongside it must regress or hold together, never independently.
    ...(resultRegresses
      ? {
          round_result: prev.round_result,
          matches: prev.matches,
          scoreTotal: prev.scoreTotal,
          scoreMax: prev.scoreMax,
          history: prev.history,
        }
      : {}),
  }
}

export default function MysteryChoiceGame() {
  const { navigate, lang, openChat } = useApp()
  // Reactive — was previously `const session = getCurrentSession()`, only
  // re-read whenever this always-mounted-but-hidden screen happened to
  // re-render for some unrelated reason. Now subscribed directly so a new
  // Play Again session is picked up immediately and reliably.
  const [session, setSessionState] = useState(() => getCurrentSession())
  useEffect(() => {
    const unsubscribe = subscribeCurrentSession((s) => {
      if (s === null) { setSessionState(null); return }
      // Only react to sessions this screen actually owns.
      if (s.game_type && s.game_type !== 'mystery_choice' && s.game_type !== 'mystery') return
      setSessionState(s)
    })
    return unsubscribe
  }, [])

  const [state, setState] = useState<MysteryChoiceState | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [names, setNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [photoAccess, setPhotoAccess] = useState<{ photoUnlocked: boolean; myPhoto: string | null; opponentPhoto: string | null }>({ photoUnlocked: false, myPhoto: null, opponentPhoto: null })
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [sessionRetrying, setSessionRetrying] = useState(false)
  // Tracks completion of the two independent, finished-state-gated
  // display-refresh operations (the dedicated immediate refresh effect,
  // and countMysteryProgress's own refresh) — both must genuinely
  // settle before the signal fires, since the shared pairProgressLoading
  // flag alone can't distinguish which of the two is done.
  const [displayRefreshDone, setDisplayRefreshDone] = useState(false)
  const [countCheckDone, setCountCheckDone] = useState(false)
  // Signals that this screen's final board/result UI has actually
  // rendered — fires from an effect (runs after commit/paint), not
  // synchronously wherever setLoading(false) is called, so listeners
  // react to the real, painted transition rather than the moment the
  // state update was merely requested. Same pattern as TicTacToeScreen
  // and Connect4Screen. Also requires preparing/sessionRetrying to be
  // false, matching the render gate below exactly (loading || preparing
  // || sessionRetrying) — loading alone can become false while the
  // component is still showing the loading UI for one of those two
  // other reasons. For a finished game, additionally waits for both
  // independent pair-progress display refreshes to genuinely settle,
  // since the chat-unlock UI they populate is part of the same result
  // card and can still change after the loading gate alone has cleared.
  useEffect(() => {
    const readyToShow = !loading && !preparing && !sessionRetrying
      && (state?.status !== 'finished' || (displayRefreshDone && countCheckDone))
    if (readyToShow) emitScreenReady('mystery_choice')
  }, [loading, preparing, sessionRetrying, state?.status, displayRefreshDone, countCheckDone])
  const channelRef = useRef<any>(null)
  const activeSessionRef = useRef<string | null>(null)
  // Set the instant the user presses back on a finished game, before the
  // session is cleared — same fix already proven for Tic Tac Toe and
  // Connect4. Prevents the "no session found" fallback below from being
  // briefly visible during the CSS opacity fade-out of an intentional exit.
  const isExitingRef = useRef(false)
  const countLockRef = useRef(false)
  const submittingAnswerRef = useRef(false)  // synchronous guard — blocks a second tap before any async work starts
  const submittingReadyRef = useRef(false)   // same, for the "Next Round" ready button
  const recoveryLockRef = useRef(false)
  const [pairCount, setPairCount] = useState(0)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [pairProgressLoading, setPairProgressLoading] = useState(true)  // final-screen chat unlock display
  const [chatUnlocked, setChatUnlocked] = useState(false)

  // ── UI-only presentational state (does NOT affect game logic / sync / DB) ──
  const [revealing, setRevealing] = useState(false)          // ~800ms freeze before flip reveal
  const [onlineOne, setOnlineOne] = useState(false)
  const [onlineTwo, setOnlineTwo] = useState(false)
  const [pendingMulti, setPendingMulti] = useState<string[]>([])  // local staged picks before Confirm (multi-select only)
  const [submittingChoice, setSubmittingChoice] = useState(false)  // brief "saving" state while an answer write/verify is in flight
  const [submittingReady, setSubmittingReady] = useState(false)    // same, for the "Next Round" ready button
  const [revealStep, setRevealStep] = useState(0)  // 0=analyzing, 1=final result card (reveal-screen presentation only)
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
    setDisplayRefreshDone(false)
    setCountCheckDone(false)
    setLoading(true)  // BUGFIX: must reset to true here — this screen stays mounted permanently,
                       // so without this reset "loading" could still be false from an earlier
                       // render, causing the "Game not found" branch to flash while this fetch runs.
    activeSessionRef.current = sess0.id
    isExitingRef.current = false

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
      // Subscribe to THIS game_session row via Supabase realtime FIRST —
      // before any fetch or repair logic runs. This is what closes the
      // residual race window a write-then-refetch approach alone can't:
      // even if this client's local state momentarily diverges after its
      // own repair write, a later UPDATE from the OTHER client's own
      // repair attempt (landing after this channel is already listening)
      // is what corrects it via the existing realtime handler.
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
          setState((prev) => mergeCanonicalMysteryState(prev, newState))
          // TEMPORARY DIAGNOSTIC
          console.log('[MYSTERY_DIAG] realtime state', JSON.stringify({
            sessionId: sess0.id, currentRound: newState.current_round, questionId: newState.rounds?.[newState.current_round]?.id ?? null,
          }))
          checkAndRecover(newState)
        })
        .subscribe()
      channelRef.current = channel

      try {
        const { data: { user } } = await supabase.auth.getUser()
        setMyId(user?.id ?? null)

        const nm = new Map<string, string>()
        const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [sess0.player_one_id, sess0.player_two_id])
        profs?.forEach(p => nm.set(p.id, p.name))
        setNames({ one: nm.get(sess0.player_one_id) || 'Player 1', two: nm.get(sess0.player_two_id) || 'Player 2' })

        // Shared avatar photo access — reuses the same pair-unlock source of
        // truth as Discover/Profile (getPairProgress). Presentation-only;
        // does not affect gameplay, matching, or unlock thresholds.
        if (user?.id) {
          const oppId = user.id === sess0.player_one_id ? sess0.player_two_id : sess0.player_one_id
          fetchGamePlayerPhotoAccess(user.id, oppId).then(setPhotoAccess)

          // Same real pair-progress source of truth as TicTacToeScreen and
          // Connect4Screen — fetched unconditionally on mount, exactly like
          // theirs, so the FloatingChatButton's isChatUnlocked reflects the
          // real, current value immediately instead of only being set later
          // by flows that only run once the game is already finished.
          const prog = await getPairProgress(oppId)
          setPairCount(prog.games_completed)
        }

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
          const candidate = buildFreshMysteryState()
          await supabase.from('game_sessions').update({ state: candidate }).eq('id', sess0.id)
          // Always re-fetch the row's actual canonical state afterward,
          // rather than trusting this client's own locally-generated
          // candidate directly — if the other client's own repair
          // attempt happens to write after this one, this is what makes
          // both clients still converge on the same final row instead of
          // each silently keeping its own, different local question set.
          const { data: reread } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
          s = (reread && isValidMysteryState(reread.state)) ? reread.state : candidate
          console.log('MYSTERY STATE REPAIRED:', sess0.id)
          setPreparing(false)
        }

        setState(s)
        setLoading(false)
        console.log('SESSION READY', sess0.id)
        // TEMPORARY DIAGNOSTIC — safe identifiers only (no question text).
        console.log('[MYSTERY_DIAG] final state', JSON.stringify({
          sessionId: sess0.id, currentRound: s.current_round, questionId: s.rounds?.[s.current_round]?.id ?? null,
        }))
        checkAndRecover(s)
      } catch (e: any) {
        console.log('MYSTERY ERROR:', e?.message || e)
        setLoading(false)
        setPreparing(false)
      }
    }
    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [session?.id])

  // Polling fallback — covers a missed/delayed realtime event (e.g. a
  // dropped websocket message, or a subscription that wasn't fully
  // established yet when the other client's write landed), since this
  // screen otherwise depends entirely on realtime to ever learn that the
  // other player advanced or finished the game. Same 3s interval already
  // proven safe in TicTacToeScreen/Connect4Screen. This is a bounded,
  // read-only backstop — it never calls any RPC, never triggers a round
  // transition, and never writes anything; it only re-fetches and applies
  // the canonical state, exactly like the realtime handler already does.
  useEffect(() => {
    const t = setInterval(() => {
      const sid = activeSessionRef.current
      if (!sid) return
      supabase.from('game_sessions').select('state').eq('id', sid).maybeSingle().then(({ data, error }) => {
        if (error || !data?.state) return
        if (activeSessionRef.current !== sid) return  // session changed while fetching
        const latest = data.state as any
        if (!isValidMysteryState(latest)) return
        setState((prev) => mergeCanonicalMysteryState(prev, latest))
      })
    }, 3000)
    return () => clearInterval(t)
  }, [])

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
      return
    }

    // Defensive: an orphaned round_transitioning claim (e.g. a client closed
    // mid-transition) with neither ready flag set means a transition already
    // completed successfully — the leftover claim marker is safe to clear.
    if (observed.round_transitioning && !observed.player_one_ready && !observed.player_two_ready) {
      recoveryLockRef.current = true
      const latest = await fetchLatestState()
      if (latest && latest.round_transitioning && !latest.player_one_ready && !latest.player_two_ready) {
        console.log('MYSTERY CHOICE STUCK STATE RECOVERED', session?.id, 'orphaned round_transitioning')
        await writeState({ ...latest, round_transitioning: null })
      }
      recoveryLockRef.current = false
    }
  }

  async function choose(choice: string | string[]) {
    if (!session || !myId) return
    if (submittingAnswerRef.current) return  // synchronous guard — a second tap while saving does nothing
    submittingAnswerRef.current = true
    setSubmittingChoice(true)
    console.log('MYSTERY ANSWER SUBMIT START:', choice)

    try {
      // Atomic, server-side: saves only my own choice, and — if both
      // players have now answered — computes and saves round_result/
      // matches/scoreTotal/scoreMax/history within the same row-locked
      // transaction. Replaces the previous client-side fetch/write/
      // verify/retry sequence plus a separate, later tryComputeRoundResult()
      // write — there is no longer any persisted intermediate state where
      // both answers exist but round_result is still missing, which
      // previously allowed an out-of-order realtime event to briefly
      // revert an already-shown result back to "Waiting for opponent".
      const { data, error } = await supabase.rpc('submit_mystery_choice_answer', {
        p_session_id: session.id,
        p_choice: choice,
      })
      if (error) {
        console.error('MYSTERY ANSWER ERROR:', error.message)
        return
      }
      if (data?.ok && data.state) {
        console.log('MYSTERY ANSWER RPC RESULT:', data.noop ? 'noop' : 'applied', data.state)
        setState(data.state as MysteryChoiceState)
      } else if (data?.error) {
        console.error('MYSTERY ANSWER ERROR:', data.error)
      }
    } finally {
      submittingAnswerRef.current = false
      setSubmittingChoice(false)
    }
  }

  async function markReady() {
    if (!session || !myId) return
    if (submittingReadyRef.current) return  // synchronous guard — a second tap while saving does nothing
    submittingReadyRef.current = true
    setSubmittingReady(true)
    console.log('MYSTERY NEXT ROUND CLICK:', session.id)

    try {
      // Atomic, server-side: marks only my own ready field, and — if both
      // players are now ready — performs the entire round-advance/finish
      // transition within the same row-locked transaction. Replaces the
      // previous client-side fetch/write/verify/retry sequence, which
      // could race against the other player's own write (last-write-wins
      // on the full state object), producing delay and, in some cases, a
      // stuck "Waiting for opponent..." requiring a second tap.
      const { data, error } = await supabase.rpc('mark_mystery_choice_ready', {
        p_session_id: session.id,
      })
      if (error) {
        console.error('MYSTERY NEXT ROUND ERROR:', error.message)
        return
      }
      if (data?.ok && data.state) {
        console.log('MYSTERY READY RPC RESULT:', data.noop ? 'noop' : 'applied', data.state)
        setState(data.state as MysteryChoiceState)
      } else if (data?.error) {
        console.error('MYSTERY NEXT ROUND ERROR:', data.error)
      }
    } finally {
      submittingReadyRef.current = false
      setSubmittingReady(false)
    }
  }

  // Count pair progress ONLY when the full 10-round game finishes (not per round)
  // Count pair progress ONLY when the full 10-round game finishes (not per round)
  useEffect(() => {
    if (!state || !session || !myId) return
    if (state.status !== 'finished') return
    console.log('MYSTERY CHOICE GAME COMPLETE')
    countMysteryProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status])

  // Dedicated read-only fetch for the final screen's chat-unlock display —
  // uses the SAME canonical pair_progress row (via getPairProgress, which
  // already sorts the pair ids) that Discover and Messages read. This runs
  // independently of countMysteryProgress() below, so the correct state
  // always shows even when this pair's progress was already counted before.
  async function refreshPairProgressForDisplay() {
    if (!session || !myId) return
    const otherId = myId === session.player_one_id ? session.player_two_id : session.player_one_id
    console.log('FINAL SCREEN PAIR IDS:', myId, otherId)
    console.log('FINAL SCREEN PAIR PROGRESS LOADING')
    setPairProgressLoading(true)
    try {
      const prog = await getPairProgress(otherId)
      if (prog.error) {
        console.error('FINAL SCREEN PAIR PROGRESS ERROR:', prog.error)
        setProgressError(prog.error)
        return
      }
      console.log('FINAL SCREEN PAIR PROGRESS:', prog.games_completed)
      console.log('FINAL SCREEN CHAT UNLOCKED:', prog.chat_unlocked)
      console.log('FINAL SCREEN CHAT PROGRESS:', prog.games_completed, '/10')
      setPairCount(prog.games_completed)
      setChatUnlocked(prog.chat_unlocked)
      setProgressError(null)
    } catch (e: any) {
      console.error('FINAL SCREEN PAIR PROGRESS ERROR:', e.message)
      setProgressError(e.message)
    } finally {
      setPairProgressLoading(false)
    }
  }

  // Refresh the display the moment the game finishes — independent of
  // whether progress counting has already happened for this session.
  useEffect(() => {
    if (state?.status === 'finished') {
      refreshPairProgressForDisplay().finally(() => setDisplayRefreshDone(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, session?.id])

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
        await refreshPairProgressForDisplay()
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
        await refreshPairProgressForDisplay()
      }
    } finally {
      countLockRef.current = false
      setCountCheckDone(true)
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

  // Reveal screen: reset to the "Analyzing..." step when the game finishes,
  // then auto-advance to the first insight card after ~2s (presentation only)
  useEffect(() => {
    if (state?.status === 'finished' && revealStep === 0) {
      const t = setTimeout(() => setRevealStep(1), 1800)
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
    const result = await sendGameInvite(opponentId, 'mystery_choice', session.id)
    if (!result.ok || !result.inviteId) { console.error('Mystery Choice play again failed:', result.error); return }
    if (result.shouldAccept && result.invite) {
      console.log('PLAY AGAIN: ACCEPTING OPPONENT REQUEST INSTEAD OF WAITING:', result.inviteId)
      const { ok } = await respondInvite(result.inviteId, true)
      if (!ok) return
      await enterAcceptedGame(result.invite, myId)
      return
    }
    const { data: opp } = await supabase.from('profiles').select('name').eq('id', opponentId).maybeSingle()
    setPendingInvite({ id: result.inviteId, receiverName: opp?.name || 'Player', gameType: 'mystery_choice', originalSessionId: session.id })
    navigate('waiting')
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
    if (isExitingRef.current) {
      // Intentional exit after a finished game — not a real error. Render
      // nothing (a neutral background) instead of the error message while
      // this component fades out and 'profile' fades in.
      return <div className="flex flex-col h-full" style={{ background: '#0a0a10' }} />
    }
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
  const myReady = isPlayerOne ? state.player_one_ready : state.player_two_ready
  const oppReady = isPlayerOne ? state.player_two_ready : state.player_one_ready
  const rounds = state.rounds?.length ? state.rounds : FALLBACK_ROUNDS
  const safeRoundIndex = Number.isFinite(state.current_round) ? state.current_round % rounds.length : 0
  const round = rounds[safeRoundIndex] || FALLBACK_ROUNDS[0]
  const roundOptionIds = getOptionIds(round)
  // Normalize both players' saved answers to stable option ids for display/
  // comparison — bridges legacy sessions that may still hold localized text.
  const myChoice = normalizeAnswer(round, isPlayerOne ? state.player_one_choice : state.player_two_choice)
  const oppChoice = normalizeAnswer(round, isPlayerOne ? state.player_two_choice : state.player_one_choice)
  const optA = lang === 'gr' ? round.gr[0] : round.en[0]
  const optB = lang === 'gr' ? round.gr[1] : round.en[1]
  const isBinaryRound = round.type === 'binary' || (round.options.length === 2 && round.maxSelect === 1)
  const progressPct = Math.round(((safeRoundIndex + 1) / rounds.length) * 100)

  // Game complete screen — premium celebration
  if (state.status === 'finished') {
    const matchCount = state.matches || 0

    let resultVariation = state.resultId ? getResultById(state.resultId) : null
    console.log('MYSTERY RESULT LOADED:', state.resultId, resultVariation ? 'found' : 'not found')
    if (!resultVariation) {
      // Defensive fallback only — normal flow always has a saved resultId by
      // the time this screen renders, since performRoundTransition selects
      // and persists it before status ever becomes 'finished'.
      resultVariation = selectRandomResult(matchCount)
    }

    const canChat = chatUnlocked

    console.log('MYSTERY FINAL CHAT STATUS:', pairProgressLoading ? 'loading' : progressError ? 'error' : canChat ? 'unlocked' : `locked ${pairCount}/10`)

    const circumference = 2 * Math.PI * 52
    const dashOffset = circumference - (matchCount / 10) * circumference

    return (
      <div className="desktop-scroll-inner relative flex flex-col h-full items-center justify-center px-5 overflow-hidden" style={{ background: '#0a0a10' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.16) 0%, transparent 60%), radial-gradient(ellipse at 50% 75%, rgba(108,99,255,0.14) 0%, transparent 60%)', animation: 'mcBgPulse 6s ease-in-out infinite' }} />
        <McParticles />

        {/* Step 0 — Analyzing, with a smooth progress bar */}
        {revealStep === 0 && (
          <div className="relative z-10 flex flex-col items-center w-full max-w-[280px]" style={{ animation: 'mcFadeIn 0.4s ease both' }}>
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(255,255,255,0.08)' }} />
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid transparent', borderTopColor: '#ff3384', borderRightColor: '#d84dd8', borderBottomColor: '#7c72ff', animation: 'mcSpin 1.1s linear infinite' }} />
              <div className="absolute inset-0 flex items-center justify-center text-[22px]" style={{ animation: 'mcFloat 2s ease-in-out infinite' }}>💫</div>
            </div>
            <div className="text-[15px] font-bold text-white text-center mb-4">
              {lang === 'gr' ? 'Ανάλυση της σύνδεσής σας...' : 'Analyzing your connection...'}
            </div>
            <div className="w-full h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#ff3384,#d84dd8,#7c72ff)', animation: 'mcProgressFill 1.8s ease-out forwards' }} />
            </div>
          </div>
        )}

        {/* Final result — one cohesive card, no page-within-page scroll */}
        {revealStep === 1 && (
          <div key="result" className="relative z-10 w-full max-w-[400px] h-full flex flex-col justify-center py-4" style={{ animation: 'mcCardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl w-full overflow-y-auto" style={{
              background: 'rgba(15,12,25,0.78)', backdropFilter: 'blur(28px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 60px rgba(253,41,123,0.12)',
              maxHeight: '100%', padding: '24px 20px',
            }}>

              {/* A — Main result: real match count, emoji, and a varied title/description */}
              <div className="text-center mb-6">
                <div className="text-[13px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {lang === 'gr' ? `${matchCount} / 10 Ταιριάσματα` : `${matchCount} / 10 Matches`}
                </div>
                <div className="relative w-[128px] h-[128px] mx-auto mb-4">
                  <svg width="128" height="128" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="url(#mcFinalRingGrad)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)' }} />
                    <defs>
                      <linearGradient id="mcFinalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff3384" />
                        <stop offset="50%" stopColor="#d84dd8" />
                        <stop offset="100%" stopColor="#7c72ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[40px]">
                    {resultVariation.emoji}
                  </div>
                </div>
                <div className="text-[17px] font-extrabold mb-2" style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8,#7c72ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {lang === 'gr' ? resultVariation.titleGr : resultVariation.titleEn}
                </div>
                <div className="text-[12.5px] leading-relaxed px-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {lang === 'gr' ? resultVariation.descriptionGr : resultVariation.descriptionEn}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button onClick={playAgain} className="rounded-2xl py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 28px rgba(253,41,123,0.45)' }}>
                  🎮 {lang === 'gr' ? 'Παίξε Ξανά' : 'Play Again'}
                </button>
                <ChatUnlockProgress currentProgress={pairCount} isUnlocked={pairCount >= 10} lang={lang} />
                <button onClick={() => {
                  // This is a separate button from the header BackControl,
                  // specific to the result screen — it must clear the
                  // session exactly like BackControl already does for a
                  // finished game, or the persisted session reference
                  // stays set and a refresh after this incorrectly
                  // restores the old result. Navigate first, then clear —
                  // same ordering already proven to avoid a CSS-transition
                  // flash of the "no session" fallback.
                  navigate('profile')
                  isExitingRef.current = true
                  clearCurrentSession()
                }} className="rounded-2xl py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
                  style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)' }}>
                  {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes mcBgPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
          @keyframes mcFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes mcCardIn { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
          @keyframes mcProgressFill { from{width:0%} to{width:100%} }
          @keyframes mcSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
          @keyframes mcFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

          /* Desktop only: let this screen's own content grow and scroll
             naturally instead of being clipped by h-full + overflow-hidden.
             Mobile/tablet (below 1024px) are completely untouched. */
          @media (min-width: 1024px) {
            .desktop-scroll-inner {
              height: auto !important;
              min-height: 100% !important;
              overflow-y: visible !important;
              overflow-x: hidden !important;
              padding-bottom: 48px !important;
            }
          }
        `}</style>
      </div>
    )
  }




  const waitingOnOpponent = !!myChoice && !state.round_result
  const revealed = !!state.round_result

  return (
    <div className="desktop-scroll-inner relative flex flex-col h-full overflow-hidden" style={{ background: '#0a0a10' }}>
      <FloatingChatButton openChat={openChat} isChatUnlocked={pairCount >= 10} />
      <FloatingRematchNotification session={session} myId={myId || ''} opponentName={isPlayerOne ? names.two : names.one} />
      <RematchDeclinedToast lang={lang} />
      {/* Animated gradient background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 15%, rgba(253,41,123,0.14) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(108,99,255,0.14) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(216,77,216,0.06) 0%, transparent 60%)',
        backgroundSize: '160% 160%',
        animation: 'mcBgDrift 14s ease-in-out infinite',
      }} />
      <McParticles />

      {/* Header */}
      <div className="mc-header-row relative z-10 flex items-center gap-3 px-5 pt-14 pb-3">
        <BackControl lang={lang} onClick={() => {
          if (state?.status === 'finished') {
            // Same fix already proven for Tic Tac Toe and Connect4: go
            // straight to Profiles instead of via Game Room (which reads
            // the session directly and would show its own "No game
            // session found" fallback the instant it's cleared), and
            // clear the session AFTER navigating so the transition is
            // atomic.
            navigate('profile')
            isExitingRef.current = true
            clearCurrentSession()
          } else {
            navigate('game_room')
          }
        }} />
        <h1 className="mc-header-title text-[16px] font-extrabold text-white flex-1">🎭 Mystery Choice</h1>
      </div>

      {/* Round indicator + progress bar */}
      <div className="mc-round-indicator relative z-10 px-5 pb-4">
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

      <GamePresenceBanner />

      {/* Premium player header */}
      <div className="mc-player-header relative z-10 flex items-center justify-center gap-3 px-6 pb-4">
        <PlayerCard userId={session.player_one_id} name={names.one} colorA="#ff3384" colorB="#ff7a6e" online={onlineOne} active={waitingOnOpponent && isPlayerOne === false && !oppChoice} isMe={isPlayerOne}
          photoUrl={isPlayerOne ? photoAccess.myPhoto : photoAccess.opponentPhoto} photoUnlocked={photoAccess.photoUnlocked} />
        <div className="flex flex-col items-center px-1">
          <div className="text-[15px] font-black" style={{ color: 'rgba(255,255,255,0.7)', animation: 'mcVsPulse 1.8s ease-in-out infinite' }}>VS</div>
        </div>
        <PlayerCard userId={session.player_two_id} name={names.two} colorA="#7c72ff" colorB="#a855f7" online={onlineTwo} active={waitingOnOpponent && isPlayerOne === true && !oppChoice} isMe={!isPlayerOne}
          photoUrl={!isPlayerOne ? photoAccess.myPhoto : photoAccess.opponentPhoto} photoUnlocked={photoAccess.photoUnlocked} />
      </div>

      {/* Question card */}
      <div className="mc-question-wrap relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6 min-h-0 overflow-y-auto">
        <div key={`round-${state.current_round}`} className="mc-question-card w-full max-w-[400px] rounded-3xl p-7 mb-5"
          style={{
            background: 'rgba(15,12,25,0.72)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 50px rgba(253,41,123,0.1)',
            animation: 'mcCardFade 0.4s ease both',
          }}>

          {(() => {
            const displayQuestionText = isBinaryRound
              ? (lang === 'gr' ? `${optA} ή ${optB};` : `${optA} or ${optB}?`)
              : (lang === 'gr' ? round.questionGr : round.question)
            // Mobile-only responsive sizing bucket — desktop always keeps the
            // base text-[19px] class below; these classes only take effect
            // under the max-width:768px media query further down.
            const lengthBucket = displayQuestionText.length <= 30 ? 'mc-q-short'
              : displayQuestionText.length <= 55 ? 'mc-q-medium' : 'mc-q-long'
            return (
              <div className={`mc-question-text text-center text-[19px] font-extrabold mb-6 leading-snug ${lengthBucket}`} style={{ color: '#fff' }}>
                {displayQuestionText}
              </div>
            )
          })()}

          {isBinaryRound ? (
            /* Binary — unchanged two-big-button layout */
            <div className="flex flex-col gap-3">
              {([0, 1] as const).map(idx => {
                const label = idx === 0 ? optA : optB
                const optionId = roundOptionIds[idx]
                const emoji = getAnswerEmoji(label, round.optionTraits?.[idx])
                const isMine = myChoice === optionId
                const isOpp = revealed && oppChoice === optionId
                return (
                  <button key={idx} onClick={() => choose(optionId)} disabled={!!myChoice || submittingChoice}
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
                const optionId = roundOptionIds[idx]
                const alreadySubmitted = !!myChoice
                const mySelectedNow = alreadySubmitted
                  ? Array.isArray(myChoice) ? myChoice.includes(optionId) : myChoice === optionId
                  : pendingMulti.includes(optionId)
                const isOpp = revealed && (Array.isArray(oppChoice) ? oppChoice.includes(optionId) : oppChoice === optionId)
                const canToggle = !alreadySubmitted && !submittingChoice && (mySelectedNow || pendingMulti.length < round.maxSelect)
                return (
                  <button key={idx} disabled={alreadySubmitted || submittingChoice || !canToggle}
                    onClick={() => {
                      if (round.maxSelect <= 1) { choose(optionId); return }
                      setPendingMulti(prev => prev.includes(optionId) ? prev.filter(x => x !== optionId) : [...prev, optionId].slice(0, round.maxSelect))
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
                    <span className="flex items-center gap-2">
                      <span className="text-[16px]">{getAnswerEmoji(label, round.optionTraits?.[idx])}</span>
                      <span>{label}</span>
                    </span>
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
          <button onClick={markReady} disabled={myReady || submittingReady}
            className="mc-next-round-btn rounded-2xl px-8 py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer disabled:cursor-default"
            style={{
              background: (myReady || submittingReady) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#7c72ff,#d84dd8)',
              color: (myReady || submittingReady) ? 'rgba(255,255,255,0.5)' : '#fff',
              boxShadow: (myReady || submittingReady) ? 'none' : '0 10px 30px rgba(108,99,255,0.45)',
              animation: 'mcFadeIn 0.3s ease both',
            }}>
            {(myReady || submittingReady)
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

        /* Desktop only: let this screen's own content grow and scroll
           naturally instead of being clipped by h-full + overflow-hidden.
           Mobile/tablet (below 1024px) are completely untouched. */
        @media (min-width: 1024px) {
          .desktop-scroll-inner {
            height: auto !important;
            min-height: 100% !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
            padding-bottom: 48px !important;
          }
        }

        /* ── Mobile-only layout (max-width: 768px) ─────────────────────
           Desktop is untouched — every rule below is scoped to this query,
           and only reclaims vertical space in the header/player area so the
           full question is always visible without scrolling. */
        @media (max-width: 768px) {
          .mc-header-row { padding-top: 30px !important; padding-bottom: 6px !important; }
          .mc-header-title { font-size: 13px !important; }
          .mc-round-indicator { padding-bottom: 8px !important; }
          .mc-player-header { padding-bottom: 8px !important; gap: 8px !important; }
          .mc-player-card { padding: 10px 11px !important; gap: 4px !important; }
          .mc-player-avatar > div { width: 38px !important; height: 38px !important; }
          .mc-player-avatar > div > span { font-size: 15px !important; }
          .mc-player-name { font-size: 10px !important; max-width: 58px !important; }
          .mc-question-wrap { padding-top: 4px !important; padding-bottom: 16px !important; }
          .mc-question-card { padding: 18px 20px !important; margin-bottom: 12px !important; }
          .mc-question-text {
            margin-bottom: 14px !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          /* Responsive question sizing by text length — never crops the
             first line, always shows the full question. */
          .mc-question-text.mc-q-short { font-size: 29px !important; line-height: 1.25 !important; }
          .mc-question-text.mc-q-medium { font-size: 25px !important; line-height: 1.28 !important; }
          .mc-question-text.mc-q-long { font-size: 21px !important; line-height: 1.3 !important; }
          .mc-next-round-btn { margin-bottom: 16px !important; }
        }
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
function PlayerCard({ userId, name, colorA, colorB, online, active, isMe, photoUrl, photoUnlocked }: { userId: string; name: string; colorA: string; colorB: string; online: boolean; active: boolean; isMe: boolean; photoUrl?: string | null; photoUnlocked: boolean }) {
  return (
    <div className="mc-player-card flex flex-col items-center gap-1.5 rounded-2xl px-3.5 py-3" style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? colorA + '80' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: active ? `0 0 22px ${colorA}55` : 'none',
      transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
    }}>
      <div className="relative">
        <div className="mc-player-avatar">
          <GamePlayerAvatar
            userId={userId}
            displayName={name}
            photoUrl={photoUrl}
            photoUnlocked={photoUnlocked}
            size={44}
            accentColor={colorA}
            accentColor2={colorB}
            isCurrentUser={isMe}
            glow={active}
          />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{
          background: online ? '#4ade80' : '#666',
          border: '2px solid #0a0a10',
          boxShadow: online ? '0 0 6px #4ade80' : 'none',
        }} />
      </div>
      <div className="mc-player-name text-[11px] font-bold text-white text-center max-w-[70px] truncate">{name}{isMe ? ' (you)' : ''}</div>
    </div>
  )
}
