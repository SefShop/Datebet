'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/gameInvites'
import { getPairProgress, incrementPairGames } from '@/lib/pairProgress'

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
}

// Fallback in case a session's state is missing rounds (defensive only)
const FALLBACK_ROUNDS: RoundData[] = [
  { emoji: ['☕','🍷'], en: ['Coffee', 'Wine'], gr: ['Καφές', 'Κρασί'] },
]

export default function MysteryChoiceGame() {
  const { navigate, lang } = useApp()
  const session = getCurrentSession()

  const [state, setState] = useState<MysteryChoiceState | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [names, setNames] = useState<{ one: string; two: string }>({ one: 'Player 1', two: 'Player 2' })
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)
  const activeSessionRef = useRef<string | null>(null)
  const resultWriteLock = useRef(false)
  const advanceWriteLock = useRef(false)
  const countLockRef = useRef(false)
  const [pairCount, setPairCount] = useState(0)
  const [progressError, setProgressError] = useState<string | null>(null)

  // Require a session_id — otherwise show "No game session found."
  useEffect(() => {
    if (!session?.id) { setLoading(false); return }
    console.log('MYSTERY CHOICE SESSION LOADED')
    const sess0 = session
    activeSessionRef.current = sess0.id

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user?.id ?? null)

      const nm = new Map<string, string>()
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [sess0.player_one_id, sess0.player_two_id])
      profs?.forEach(p => nm.set(p.id, p.name))
      setNames({ one: nm.get(sess0.player_one_id) || 'Player 1', two: nm.get(sess0.player_two_id) || 'Player 2' })

      // Both users load the SAME game_session by session_id
      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
      let s: MysteryChoiceState = sess?.state?.current_round !== undefined
        ? sess.state
        : {
            game_type: 'mystery_choice', current_round: 0, rounds: FALLBACK_ROUNDS,
            player_one_choice: null, player_two_choice: null,
            player_one_ready: false, player_two_ready: false,
            round_result: null, status: 'active',
          }
      setState(s)
      console.log('MYSTERY CHOICE SESSION LOADED', s)
      setLoading(false)

      // Subscribe to THIS game_session row via Supabase realtime
      const channel = supabase
        .channel(`mystery-choice-${sess0.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sess0.id}` }, (payload: any) => {
          if (payload.new?.id !== activeSessionRef.current) return  // hard guard: ignore stale/other-session updates
          const newState = payload.new.state as MysteryChoiceState
          console.log('MYSTERY CHOICE REALTIME UPDATE', newState)
          setState(newState)
        })
        .subscribe()
      channelRef.current = channel
    }
    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [session?.id])

  async function saveState(next: MysteryChoiceState) {
    if (!session) return
    await supabase.from('game_sessions').update({ state: next }).eq('id', session.id)
  }

  async function choose(choice: 'a' | 'b') {
    if (!state || !session || !myId || state.status === 'finished') return
    const isPlayerOne = myId === session.player_one_id
    if (isPlayerOne && state.player_one_choice) return
    if (!isPlayerOne && state.player_two_choice) return

    const next: MysteryChoiceState = {
      ...state,
      player_one_choice: isPlayerOne ? choice : state.player_one_choice,
      player_two_choice: !isPlayerOne ? choice : state.player_two_choice,
    }
    console.log('PLAYER CHOICE SAVED', isPlayerOne ? 'player_one' : 'player_two', choice)
    setState(next)  // optimistic
    await saveState(next)
  }

  // When both have chosen, compute + write the result once
  useEffect(() => {
    if (!state || !session) return
    if (state.player_one_choice && state.player_two_choice) {
      if (!state.round_result && !resultWriteLock.current) {
        console.log('BOTH CHOICES READY')
        resultWriteLock.current = true
        const result = state.player_one_choice === state.player_two_choice ? 'match' : 'different'
        console.log('ROUND RESULT', result)
        const next = { ...state, round_result: result as 'match' | 'different' }
        setState(next)
        saveState(next).finally(() => { resultWriteLock.current = false })
      }
    }
  }, [state?.player_one_choice, state?.player_two_choice])

  function markReady() {
    if (!state || !session || !myId) return
    const isPlayerOne = myId === session.player_one_id
    console.log('NEXT ROUND READY', isPlayerOne ? 'player_one' : 'player_two')
    const next: MysteryChoiceState = {
      ...state,
      player_one_ready: isPlayerOne ? true : state.player_one_ready,
      player_two_ready: !isPlayerOne ? true : state.player_two_ready,
    }
    setState(next)  // optimistic
    saveState(next)
  }

  // When both are ready, advance to next round (or complete the game)
  useEffect(() => {
    if (!state || !session) return
    if (state.player_one_ready && state.player_two_ready && !advanceWriteLock.current) {
      advanceWriteLock.current = true
      const isLastRound = state.current_round + 1 >= state.rounds.length
      let next: MysteryChoiceState
      if (isLastRound) {
        console.log('GAME COMPLETE')
        next = { ...state, status: 'finished' as const, result: 'completed' as const }
      } else {
        console.log('NEXT ROUND STARTED')
        next = {
          ...state,
          current_round: state.current_round + 1,
          player_one_choice: null,
          player_two_choice: null,
          player_one_ready: false,
          player_two_ready: false,
          round_result: null,
        }
      }
      setState(next)
      saveState(next).finally(() => { advanceWriteLock.current = false })
    }
  }, [state?.player_one_ready, state?.player_two_ready])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a10' }}>
        <div className="text-white/40 text-[13px]">{lang === 'gr' ? 'Φόρτωση...' : 'Loading...'}</div>
      </div>
    )
  }

  // No session_id → "No game session found."
  if (!session?.id || !state) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: '#0a0a10' }}>
        <div className="text-[40px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold text-white mb-4 text-center">
          {lang === 'gr' ? 'Δεν βρέθηκε παιχνίδι.' : 'No game session found.'}
        </div>
        <button onClick={() => navigate('profile')} className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#ff7a6e)', color: '#fff' }}>
          {lang === 'gr' ? 'Πίσω' : 'Back'}
        </button>
      </div>
    )
  }

  const isPlayerOne = myId === session.player_one_id
  const myChoice = isPlayerOne ? state.player_one_choice : state.player_two_choice
  const oppChoice = isPlayerOne ? state.player_two_choice : state.player_one_choice
  const myReady = isPlayerOne ? state.player_one_ready : state.player_two_ready
  const rounds = state.rounds?.length ? state.rounds : FALLBACK_ROUNDS
  const round = rounds[state.current_round % rounds.length]
  const optA = lang === 'gr' ? round.gr[0] : round.en[0]
  const optB = lang === 'gr' ? round.gr[1] : round.en[1]

  // Game complete screen
  if (state.status === 'finished') {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.12) 0%, transparent 60%), #0a0a10' }}>
        <div className="text-[48px] mb-4">🎉</div>
        <div className="text-[20px] font-extrabold text-white mb-2 text-center">
          {lang === 'gr' ? 'Το παιχνίδι ολοκληρώθηκε' : 'Game complete'}
        </div>
        <div className="text-[13px] mb-6 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {lang === 'gr' ? `Παίξατε ${rounds.length} γύρους μαζί.` : `You played ${rounds.length} rounds together.`}
        </div>
        <button onClick={() => navigate('profile')} className="rounded-2xl px-8 py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', boxShadow: '0 8px 24px rgba(253,41,123,0.4)' }}>
          {lang === 'gr' ? 'Πίσω στο Discover' : 'Back to Discover'}
        </button>
      </div>
    )
  }

  let statusText = ''
  if (state.round_result) {
    statusText = state.round_result === 'match'
      ? (lang === 'gr' ? 'Ταίριασμα! 🎉' : 'Match! 🎉')
      : (lang === 'gr' ? 'Διαφορετική επιλογή...' : 'Different choice...')
  } else if (myChoice) {
    statusText = lang === 'gr' ? 'Αναμονή για τον άλλο παίκτη...' : 'Waiting for the other player...'
  } else {
    statusText = lang === 'gr' ? 'Διάλεξε την απάντησή σου' : 'Choose your answer'
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(253,41,123,0.12) 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, rgba(108,99,255,0.12) 0%, transparent 55%), #0a0a10' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[14px] cursor-pointer">←</button>
        <h1 className="text-[16px] font-extrabold text-white flex-1">🎭 Mystery Choice</h1>
        <div className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {state.current_round + 1} / {rounds.length}
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center justify-center gap-4 pt-6 pb-2 px-6">
        <div className="text-center">
          <div className="text-[12px] font-bold text-white">{names.one}</div>
          <div className="text-[10px]" style={{ color: '#ff3384' }}>{lang==='gr'?'Παίκτης 1':'Player 1'}</div>
        </div>
        <div className="text-[16px] font-black" style={{ color: 'rgba(253,41,123,0.7)' }}>VS</div>
        <div className="text-center">
          <div className="text-[12px] font-bold text-white">{names.two}</div>
          <div className="text-[10px]" style={{ color: '#7c72ff' }}>{lang==='gr'?'Παίκτης 2':'Player 2'}</div>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[380px] rounded-3xl p-7 mb-6"
          style={{
            background: 'rgba(15,12,25,0.7)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.5), 0 0 40px rgba(253,41,123,0.08)',
          }}>

          <div className="text-center text-[13px] font-bold uppercase tracking-[2px] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lang === 'gr' ? `${optA} ή ${optB};` : `${optA} or ${optB}?`}
          </div>

          {/* Two big choice buttons */}
          <div className="flex flex-col gap-3">
            {(['a','b'] as const).map(key => {
              const label = key === 'a' ? optA : optB
              const emoji = key === 'a' ? round.emoji[0] : round.emoji[1]
              const isMine = myChoice === key
              const revealed = !!state.round_result
              const isOpp = revealed && oppChoice === key
              return (
                <button key={key} onClick={() => choose(key)} disabled={!!myChoice}
                  className="w-full rounded-2xl py-5 text-[16px] font-bold flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer disabled:cursor-default"
                  style={{
                    background: isMine
                      ? 'linear-gradient(135deg,#ff3384,#d84dd8)'
                      : 'rgba(255,255,255,0.05)',
                    color: isMine ? '#fff' : 'rgba(255,255,255,0.85)',
                    border: isOpp && !isMine ? '2px solid #7c72ff' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isMine ? '0 8px 24px rgba(253,41,123,0.4)' : 'none',
                    opacity: myChoice && !isMine && !revealed ? 0.5 : 1,
                  }}>
                  <span className="text-[22px]">{emoji}</span>
                  <span>{label}</span>
                  {isOpp && !isMine && <span className="text-[11px] ml-1" style={{ color: '#7c72ff' }}>{lang==='gr'?'(αυτός/ή)':'(them)'}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <div className="text-[15px] font-bold"
            style={{ color: state.round_result === 'match' ? '#4ade80' : state.round_result === 'different' ? '#ff3384' : 'rgba(255,255,255,0.6)' }}>
            {statusText}
          </div>
        </div>

        {/* Next round — both users see it after a result; tapping sets ready flag */}
        {state.round_result && (
          <button onClick={markReady} disabled={myReady}
            className="rounded-2xl px-8 py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer disabled:cursor-default"
            style={{
              background: myReady ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#7c72ff,#d84dd8)',
              color: myReady ? 'rgba(255,255,255,0.5)' : '#fff',
              boxShadow: myReady ? 'none' : '0 8px 24px rgba(108,99,255,0.4)',
            }}>
            {myReady
              ? (lang === 'gr' ? 'Αναμονή για τον άλλο...' : 'Waiting for other player...')
              : (lang === 'gr' ? 'Επόμενος Γύρος →' : 'Next Round →')}
          </button>
        )}
      </div>
    </div>
  )
}
