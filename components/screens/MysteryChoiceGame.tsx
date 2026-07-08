'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/gameInvites'

// 10 sample rounds — bilingual
const ROUNDS: { emoji: [string, string]; en: [string, string]; gr: [string, string] }[] = [
  { emoji: ['☕','🍷'], en: ['Coffee', 'Wine'],               gr: ['Καφές', 'Κρασί'] },
  { emoji: ['🏖️','🏔️'], en: ['Beach', 'Mountains'],           gr: ['Παραλία', 'Βουνό'] },
  { emoji: ['🐶','🐱'], en: ['Dog', 'Cat'],                   gr: ['Σκύλος', 'Γάτα'] },
  { emoji: ['📞','💬'], en: ['Call', 'Text'],                 gr: ['Κλήση', 'Μήνυμα'] },
  { emoji: ['🌃','🛋️'], en: ['Night out', 'Cozy night'],      gr: ['Έξοδος', 'Χαλαρή βραδιά'] },
  { emoji: ['🍕','🍣'], en: ['Pizza', 'Sushi'],                gr: ['Πίτσα', 'Σούσι'] },
  { emoji: ['🧭','🧘'], en: ['Adventure', 'Relax'],            gr: ['Περιπέτεια', 'Χαλάρωση'] },
  { emoji: ['😂','🎬'], en: ['Comedy', 'Thriller'],            gr: ['Κωμωδία', 'Θρίλερ'] },
  { emoji: ['🌅','🌙'], en: ['Early bird', 'Night owl'],       gr: ['Πρωινός τύπος', 'Νυχτοπούλι'] },
  { emoji: ['📋','🌊'], en: ['Plan everything', 'Go with the flow'], gr: ['Σχεδιάζω τα πάντα', 'Πάω με το ρεύμα'] },
]

interface MysteryChoiceState {
  round: number
  player_one_choice: 'a' | 'b' | null
  player_two_choice: 'a' | 'b' | null
  round_result: 'match' | 'different' | null
}

function freshRoundState(round: number): MysteryChoiceState {
  return { round, player_one_choice: null, player_two_choice: null, round_result: null }
}

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

  useEffect(() => {
    if (!session) { setLoading(false); return }
    console.log('MYSTERY CHOICE LOADED')
    const sess0 = session
    activeSessionRef.current = sess0.id

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user?.id ?? null)

      const nm = new Map<string, string>()
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', [sess0.player_one_id, sess0.player_two_id])
      profs?.forEach(p => nm.set(p.id, p.name))
      setNames({ one: nm.get(sess0.player_one_id) || 'Player 1', two: nm.get(sess0.player_two_id) || 'Player 2' })

      // Fresh state from Supabase
      const { data: sess } = await supabase.from('game_sessions').select('state').eq('id', sess0.id).maybeSingle()
      let s: MysteryChoiceState = sess?.state?.round !== undefined ? sess.state : freshRoundState(0)
      setState(s)
      console.log('MYSTERY CHOICE SESSION STATE', s)
      setLoading(false)

      // Realtime subscription
      const channel = supabase
        .channel(`mystery-choice-${sess0.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sess0.id}` }, (payload: any) => {
          if (payload.new?.id !== activeSessionRef.current) return  // hard guard: ignore stale/other-session updates
          const newState = payload.new.state as MysteryChoiceState
          console.log('MYSTERY CHOICE SESSION STATE', newState)
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
    if (!state || !session || !myId) return
    const isPlayerOne = myId === session.player_one_id
    // Already chose this round — ignore
    if (isPlayerOne && state.player_one_choice) return
    if (!isPlayerOne && state.player_two_choice) return

    console.log('MYSTERY CHOICE SELECTED', choice)
    const next: MysteryChoiceState = {
      ...state,
      player_one_choice: isPlayerOne ? choice : state.player_one_choice,
      player_two_choice: !isPlayerOne ? choice : state.player_two_choice,
    }
    setState(next)  // optimistic
    await saveState(next)
  }

  // When both have chosen, compute + write the result once
  useEffect(() => {
    if (!state || !session) return
    if (state.player_one_choice && state.player_two_choice && !state.round_result && !resultWriteLock.current) {
      resultWriteLock.current = true
      const result = state.player_one_choice === state.player_two_choice ? 'match' : 'different'
      console.log('MYSTERY CHOICE RESULT', result)
      const next = { ...state, round_result: result as 'match' | 'different' }
      setState(next)
      saveState(next).finally(() => { resultWriteLock.current = false })
    }
  }, [state?.player_one_choice, state?.player_two_choice])

  function nextRound() {
    if (!state) return
    console.log('MYSTERY CHOICE NEXT ROUND')
    const next = freshRoundState((state.round + 1) % ROUNDS.length)
    setState(next)  // optimistic
    saveState(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a10' }}>
        <div className="text-white/40 text-[13px]">{lang === 'gr' ? 'Φόρτωση...' : 'Loading...'}</div>
      </div>
    )
  }

  if (!session || !state) {
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
  const round = ROUNDS[state.round % ROUNDS.length]
  const optA = lang === 'gr' ? round.gr[0] : round.en[0]
  const optB = lang === 'gr' ? round.gr[1] : round.en[1]

  let statusText = ''
  if (state.round_result) {
    statusText = state.round_result === 'match'
      ? (lang === 'gr' ? 'Ταίριασμα! 🎉' : 'Match! 🎉')
      : (lang === 'gr' ? 'Διαφορετική επιλογή...' : 'Different choice...')
  } else if (myChoice) {
    statusText = lang === 'gr' ? 'Αναμονή για τον άλλο παίκτη...' : 'Waiting for other player...'
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
          {state.round + 1} / {ROUNDS.length}
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

        {/* Next round */}
        {state.round_result && (
          <button onClick={nextRound}
            className="rounded-2xl px-8 py-3.5 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#7c72ff,#d84dd8)', color: '#fff', boxShadow: '0 8px 24px rgba(108,99,255,0.4)' }}>
            {lang === 'gr' ? 'Επόμενος Γύρος →' : 'Next Round →'}
          </button>
        )}
      </div>
    </div>
  )
}
