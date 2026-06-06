'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { getCurrentMatch } from '@/lib/profiles'
import { CARD_DECK, CARD_STYLE, GameCard, CARD_PRESSURE, REACTIONS, pickLine } from '@/lib/games'

type Turn = 'user' | 'sofia'
type Phase = 'play' | 'thinking' | 'done'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CardGameScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].games

  const deckRef = useRef<GameCard[]>(shuffle(CARD_DECK))
  const timers  = useRef<ReturnType<typeof setTimeout>[]>([])
  const [card, setCard]       = useState<GameCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [turn, setTurn]       = useState<Turn>('user')
  const [phase, setPhase]     = useState<Phase>('play')
  const [status, setStatus]   = useState<string | null>(null)
  const [reaction, setReaction] = useState<string | null>(null)
  const [pressure, setPressure] = useState<string | null>(null)
  const [drawn, setDrawn]     = useState(0)
  const [uPts, setUPts]       = useState(0)
  const [sPts, setSPts]       = useState(0)
  const [done, setDone]       = useState(false)

  useEffect(() => { drawForUser() }, [])  // eslint-disable-line
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function later(fn: () => void, ms: number) { timers.current.push(setTimeout(fn, ms)) }

  function show(next: GameCard) {
    setCard(next); setFlipped(false); setDrawn(d => d + 1); setPressure(null); setReaction(null)
    later(() => {
      setFlipped(true)
      if (Math.random() < 0.5) later(() => setPressure(pickLine(CARD_PRESSURE[lang])), 450)
    }, 260)
  }

  function drawForUser() {
    if (deckRef.current.length === 0) { setDone(true); return }
    setTurn('user'); setPhase('play'); setStatus(null)
    show(deckRef.current.shift()!)
  }

  function act(kind: 'accept' | 'skip') {
    if (phase !== 'play' || turn !== 'user') return
    if (kind === 'accept') setUPts(p => p + 1)
    setReaction(pickLine(REACTIONS[lang]))
    setStatus(kind === 'accept' ? t.accepted : t.skipped)
    setPressure(null)
    setPhase('done')
  }

  function sofiaTurn() {
    if (deckRef.current.length === 0) { setDone(true); return }
    setTurn('sofia'); setPhase('thinking'); setStatus(t.thinking); setReaction(null)
    show(deckRef.current.shift()!)
    const delay = 1000 + Math.random() * 1000   // 1-2s
    later(() => {
      const accept = Math.random() < 0.6
      if (accept) setSPts(p => p + 1)
      setStatus(accept ? t.sofiaWent : t.sofiaPassed)
      setReaction(pickLine(REACTIONS[lang]))
      setPhase('done')
    }, delay)
  }

  function onNext() {
    if (phase !== 'done') return
    if (turn === 'user') sofiaTurn()
    else drawForUser()
  }

  function restart() {
    timers.current.forEach(clearTimeout); timers.current = []
    deckRef.current = shuffle(CARD_DECK)
    setDone(false); setUPts(0); setSPts(0); setDrawn(0); setStatus(null); setReaction(null); setPressure(null)
    setTurn('user'); setPhase('play')
    show(deckRef.current.shift()!)
  }

  const style = card ? CARD_STYLE[card.type] : null
  const glow  = style?.glow ?? '#fd297b'
  const winner = uPts > sPts ? 'user' : sPts > uPts ? 'sofia' : 'tie'

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8 items-center"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)' }}>

      <div className="text-[11px] font-bold tracking-[0.5px] mb-3 text-center" style={{ color:'rgba(253,41,123,0.7)' }}>
        {t.goalCard}
      </div>

      <div className="flex items-center gap-4 mb-1">
        <Score emoji="🧑" label={t.you}   pts={uPts} active={turn==='user'}  glow={glow} />
        <div className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color:'rgba(255,255,255,0.25)' }}>{t.vs}</div>
        <Score emoji={"🎮"} label={t.sofia} pts={sPts} active={turn==='sofia'} glow={glow} />
      </div>
      <div className="text-[10px] mb-5" style={{ color:'rgba(255,255,255,0.18)' }}>{drawn} / {CARD_DECK.length}</div>

      {done ? (
        <EndScreen
          title={winner==='user' ? t.youWinCard : winner==='sofia' ? t.sofiaWinCard : t.tieCard}
          msg={winner==='user' ? t.msgWin : winner==='sofia' ? t.msgLose : t.msgTie}
          emoji={winner==='user' ? '🏆' : winner==='sofia' ? '🎴' : '🤝'}
          score={`${t.you} ${uPts}  ·  ${sPts} ${t.sofia}`}
          t={t} onAgain={restart} onAnother={() => navigate('game_select')} onDuel={() => navigate('bet')} />
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center w-full" style={{ perspective:1000 }}>
            <div key={drawn} className="relative"
              style={{
                width:'100%', maxWidth:300, height:360, transformStyle:'preserve-3d',
                transition:'transform 0.5s cubic-bezier(0.34,1.4,0.6,1)',
                transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                animation:'cardIn 0.4s ease both',
              }}>
              <div className="absolute inset-0 rounded-[28px] p-7 flex flex-col"
                style={{ backfaceVisibility:'hidden', background:'linear-gradient(155deg, #181020, #0e0a16)',
                         border:`1px solid ${glow}55`, boxShadow:`0 24px 70px ${glow}33, inset 0 1px 0 rgba(255,255,255,0.06)` }}>
                <div className="flex items-center justify-between mb-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[22px]">{style?.emoji}</span>
                    <span className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color:glow }}>{style?.label[lang]}</span>
                  </div>
                  <span className="text-[18px]">{turn==='user' ? '🧑' : "🎮"}</span>
                </div>
                <div className="text-[22px] font-bold text-white leading-snug text-center my-auto"
                  style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {card?.text[lang]}
                </div>
                <div className="mt-auto h-[3px] rounded-full" style={{ background:`${glow}55` }} />
              </div>
              <div className="absolute inset-0 rounded-[28px] flex items-center justify-center"
                style={{ backfaceVisibility:'hidden', transform:'rotateY(180deg)',
                         background:'linear-gradient(155deg, #1a1022, #0c0814)', border:'1px solid rgba(253,41,123,0.25)' }}>
                <div className="text-[46px]" style={{ opacity:0.5 }}>🃏</div>
              </div>
            </div>
          </div>

          <div className="h-6 mt-3 text-[14px] font-bold flex items-center gap-2" style={{ color: phase==='thinking' ? '#c4a3ff' : glow }}>
            {phase==='thinking' && <Dots />}
            {status}
          </div>
          <div className="h-5 text-[12px] italic" style={{ color: reaction ? '#ff8fb5' : pressure ? '#c4a3ff' : 'transparent', animation:(reaction||pressure)?'fadeIn 0.5s ease both':'none' }}>
            {reaction ?? pressure}
          </div>

          <div className="w-full mt-2">
            {turn==='user' && phase==='play' ? (
              <div className="flex gap-3">
                <button onClick={() => act('skip')}
                  className="flex-1 rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-all cursor-pointer"
                  style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  {t.skip}
                </button>
                <button onClick={() => act('accept')}
                  className="flex-1 rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-all cursor-pointer"
                  style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
                  {t.accept}
                </button>
              </div>
            ) : (
              <button onClick={onNext} disabled={phase!=='done'}
                className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-30"
                style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
                {turn==='user'
                  ? (lang==='gr' ? "σειρά της sofia →" : "sofia's turn →")
                  : (lang==='gr' ? 'επόμενη κάρτα →' : 'next card →')}
              </button>
            )}
          </div>
        </>
      )}

      {!done && (
        <button onClick={() => navigate('game_select')}
          className="mt-4 w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.25)' }}>
          {t.back}
        </button>
      )}

      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(20px) rotateY(180deg) scale(0.95)} to{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink  { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
      `}</style>
    </div>
  )
}

function Dots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:'50%', background:'#c4a3ff', display:'inline-block', animation:`blink 1s ${i*0.15}s infinite` }} />)}
    </span>
  )
}

function Score({ emoji, label, pts, active, glow }: { emoji:string; label:string; pts:number; active:boolean; glow:string }) {
  return (
    <div className="flex items-center gap-2" style={{ opacity: active ? 1 : 0.5, transition:'opacity 0.3s' }}>
      <div className="flex items-center justify-center rounded-full text-[18px]"
        style={{ width:40, height:40, background: active ? `${glow}22` : 'rgba(255,255,255,0.05)',
                 border: active ? `1.5px solid ${glow}` : '1.5px solid transparent',
                 boxShadow: active ? `0 0 16px ${glow}66` : 'none' }}>
        {emoji}
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[12px] font-semibold" style={{ color:'rgba(255,255,255,0.6)' }}>{label}</span>
        <span className="text-[20px] font-extrabold" style={{ color: active ? glow : 'rgba(255,255,255,0.8)' }}>{pts}</span>
      </div>
    </div>
  )
}

function EndScreen({ title, msg, emoji, score, t, onAgain, onAnother, onDuel }:
  { title:string; msg:string; emoji:string; score:string; t:any; onAgain:()=>void; onAnother:()=>void; onDuel:()=>void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center w-full" style={{ animation:'fadeIn 0.5s ease both' }}>
      <div className="text-[52px] mb-3">{emoji}</div>
      <div className="text-[22px] font-extrabold text-white mb-1.5 tracking-tight" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{title}</div>
      <div className="text-[14px] mb-1" style={{ color:'rgba(255,255,255,0.45)' }}>{msg}</div>
      <div className="text-[13px] font-bold mb-8" style={{ color:'#ff8fb5' }}>{score}</div>
      <div className="w-full flex flex-col gap-2.5">
        <button onClick={onAgain}
          className="w-full rounded-2xl py-[16px] text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
          {t.playAgain}
        </button>
        <button onClick={onAnother}
          className="w-full rounded-2xl py-[13px] text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
          {t.tryAnother}
        </button>
        <button onClick={onDuel}
          className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.3)' }}>
          {t.lockDuel}
        </button>
      </div>
    </div>
  )
}
