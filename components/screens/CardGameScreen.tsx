'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { MOCK_PROFILE } from '@/lib/data'
import { CARD_DECK, CARD_STYLE, GameCard, CARD_PRESSURE, CARD_FEEDBACK, pickLine } from '@/lib/games'

type Turn = 'user' | 'opponent'

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
  const [card, setCard]       = useState<GameCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [turn, setTurn]       = useState<Turn>('user')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [drawn, setDrawn]     = useState(0)
  const [done, setDone]       = useState(false)
  const [pressure, setPressure] = useState<string | null>(null)
  const [micro, setMicro]       = useState<string | null>(null)

  // Draw the first card on mount
  useEffect(() => { drawCard() }, [])  // eslint-disable-line

  function restart() {
    deckRef.current = shuffle(CARD_DECK)
    setDone(false); setTurn('user'); setFeedback(null); setPressure(null); setMicro(null); setDrawn(0)
    drawCard()
  }

  function drawCard() {
    if (deckRef.current.length === 0) { setDone(true); return }
    const next = deckRef.current.shift()!
    setCard(next)
    setFlipped(false)
    setFeedback(null)
    setDrawn(d => d + 1)
    setPressure(null)
    // flip shortly after it lands, then maybe show pressure
    setTimeout(() => {
      setFlipped(true)
      if (Math.random() < 0.55) setTimeout(() => setPressure(pickLine(CARD_PRESSURE[lang])), 450)
    }, 280)
  }

  function act(kind: 'accept' | 'skip') {
    if (turn !== 'user') return
    setFeedback(kind === 'accept' ? t.accepted : t.skipped)
    setPressure(null)
    setMicro(pickLine(CARD_FEEDBACK[lang]))
    setTimeout(() => setMicro(null), 1500)
    // hand over to Sofia
    setTimeout(() => {
      setTurn('opponent')
      setFlipped(false)
      setTimeout(() => {
        drawCard()
        setTurn('opponent')
        setFeedback(t.sofiaThinking)
        // Sofia "decides" then passes back
        setTimeout(() => {
          setFeedback(null)
          setTurn('user')
        }, 1600 + Math.random() * 900)
      }, 360)
    }, 900)
  }

  const style = card ? CARD_STYLE[card.type] : null
  const glow  = style?.glow ?? '#fd297b'

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8 items-center"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)' }}>

      {/* Turn indicator */}
      <div className="flex items-center gap-3 mb-1">
        <Avatar emoji="🧑" label={t.you}            active={turn==='user'}     glow={glow} />
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color:'rgba(255,255,255,0.35)' }}>
          {turn==='user' ? t.yourTurn : t.sofiaTurn}
        </div>
        <Avatar emoji={MOCK_PROFILE.emoji} label={t.sofia} active={turn==='opponent'} glow={glow} />
      </div>
      <div className="text-[11px] mb-6" style={{ color:'rgba(255,255,255,0.2)' }}>
        {drawn} / {CARD_DECK.length}
      </div>

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
          <div className="text-[44px] mb-3">🎴</div>
          <div className="text-[18px] font-bold text-white mb-8">{t.deckEmpty}</div>
          <div className="w-full flex flex-col gap-2.5">
            <button onClick={restart}
              className="w-full rounded-2xl py-[16px] text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
              {t.playAgain}
            </button>
            <button onClick={() => navigate('game_select')}
              className="w-full rounded-2xl py-[13px] text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
              {t.tryAnother}
            </button>
            <button onClick={() => navigate('bet')}
              className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
              style={{ color:'rgba(255,255,255,0.3)' }}>
              {t.lockDuel}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Card */}
          <div className="flex-1 flex items-center justify-center w-full" style={{ perspective:1000 }}>
            <div key={drawn}
              className="relative"
              style={{
                width:'100%', maxWidth:300, height:380,
                transformStyle:'preserve-3d',
                transition:'transform 0.5s cubic-bezier(0.34,1.4,0.6,1)',
                transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                animation:'cardIn 0.4s ease both',
              }}>
              {/* Front (content) */}
              <div className="absolute inset-0 rounded-[28px] p-7 flex flex-col"
                style={{
                  backfaceVisibility:'hidden',
                  background:'linear-gradient(155deg, #181020, #0e0a16)',
                  border:`1px solid ${glow}55`,
                  boxShadow:`0 24px 70px ${glow}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}>
                <div className="flex items-center gap-2 mb-auto">
                  <span className="text-[22px]">{style?.emoji}</span>
                  <span className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color:glow }}>
                    {style?.label[lang]}
                  </span>
                </div>
                <div className="text-[22px] font-bold text-white leading-snug text-center my-auto"
                  style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {card?.text[lang]}
                </div>
                <div className="mt-auto h-[3px] rounded-full" style={{ background:`${glow}55` }} />
              </div>
              {/* Back */}
              <div className="absolute inset-0 rounded-[28px] flex items-center justify-center"
                style={{
                  backfaceVisibility:'hidden', transform:'rotateY(180deg)',
                  background:'linear-gradient(155deg, #1a1022, #0c0814)',
                  border:'1px solid rgba(253,41,123,0.25)',
                }}>
                <div className="text-[46px]" style={{ opacity:0.5 }}>🃏</div>
              </div>
            </div>
          </div>

          {/* Pressure line (tension) */}
          <div className="h-5 mt-3 text-[12px] italic" style={{ color: pressure ? '#c4a3ff' : 'transparent', animation: pressure ? 'fadeIn 0.5s ease both' : 'none' }}>
            {pressure}
          </div>

          {/* Feedback line */}
          <div className="h-6 mt-1 text-[13px] font-semibold" style={{ color:glow }}>
            {feedback}
          </div>

          {/* Actions */}
          <div className="w-full flex gap-3 mt-2">
            <button onClick={() => act('skip')} disabled={turn!=='user'}
              className="flex-1 rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-30"
              style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', border:'1px solid rgba(255,255,255,0.1)' }}>
              {t.skip}
            </button>
            <button onClick={() => act('accept')} disabled={turn!=='user'}
              className="flex-1 rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-30"
              style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
              {t.accept}
            </button>
          </div>
        </>
      )}

      <button onClick={() => navigate('game_select')}
        className="mt-4 w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
        style={{ color:'rgba(255,255,255,0.25)' }}>
        {t.back}
      </button>

      {/* Micro-feedback toast (dopamine) */}
      {micro && (
        <div className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-bold pointer-events-none"
          style={{ bottom:130, background:'rgba(253,41,123,0.15)', color:'#ff8fb5',
                   border:'1px solid rgba(253,41,123,0.3)', animation:'microPop 1.5s ease both' }}>
          {micro}
        </div>
      )}

      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(20px) rotateY(180deg) scale(0.95)} to{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes microPop { 0%{opacity:0;transform:translate(-50%,8px)} 15%{opacity:1;transform:translate(-50%,0)} 80%{opacity:1} 100%{opacity:0} }
      `}</style>
    </div>
  )
}

function Avatar({ emoji, label, active, glow }: { emoji:string; label:string; active:boolean; glow:string }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ transition:'all 0.3s ease', opacity: active ? 1 : 0.4 }}>
      <div className="flex items-center justify-center rounded-full text-[18px]"
        style={{
          width:38, height:38,
          background: active ? `${glow}22` : 'rgba(255,255,255,0.05)',
          border: active ? `1.5px solid ${glow}` : '1.5px solid transparent',
          boxShadow: active ? `0 0 16px ${glow}66` : 'none',
        }}>
        {emoji}
      </div>
    </div>
  )
}
