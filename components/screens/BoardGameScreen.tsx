'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { MOCK_PROFILE } from '@/lib/data'
import { BOARD_TILES, TILE_STYLE, BOARD_SIZE, TILE_PRESSURE, BOARD_FEEDBACK, pickLine } from '@/lib/games'

type Turn = 'user' | 'opponent'
const LAST = BOARD_SIZE - 1
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function BoardGameScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].games

  const [posUser, setPosUser]   = useState(0)
  const [posOpp,  setPosOpp]    = useState(0)
  const [turn,    setTurn]      = useState<Turn>('user')
  const [dice,    setDice]      = useState(0)
  const [rolling, setRolling]   = useState(false)
  const [moving,  setMoving]    = useState(false)
  const [tileMsg, setTileMsg]   = useState<{ emoji:string; label:string; text:string; color:string } | null>(null)
  const [winner,  setWinner]    = useState<Turn | 'both' | null>(null)
  const [pressure, setPressure] = useState<string | null>(null)
  const [micro, setMicro]       = useState<string | null>(null)
  const oppTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sofia auto-plays on her turn
  useEffect(() => {
    if (turn === 'opponent' && !winner) {
      oppTimer.current = setTimeout(() => roll(), 1100)
    }
    return () => { if (oppTimer.current) clearTimeout(oppTimer.current) }
  }, [turn, winner]) // eslint-disable-line

  function landOn(pos: number, who: Turn) {
    const tile = BOARD_TILES[pos]
    const st   = TILE_STYLE[tile.type]
    setTileMsg({ emoji: st.emoji, label: st.label[lang], text: tile.text[lang], color: st.color })
    setPressure(Math.random() < 0.55 ? pickLine(TILE_PRESSURE[lang]) : null)
    if (who === 'user') { setMicro(pickLine(BOARD_FEEDBACK[lang])); setTimeout(() => setMicro(null), 1500) }

    // light effects
    let adjusted = pos
    if (tile.type === 'bonus'   && pos < LAST) adjusted = Math.min(LAST, pos + 1)
    if (tile.type === 'penalty' && pos > 0)    adjusted = Math.max(0, pos - 1)

    const commit = (finalPos: number) => {
      if (who === 'user') setPosUser(finalPos); else setPosOpp(finalPos)
      if (finalPos >= LAST) { finishGame(who); return }
      // hand over turn
      setTimeout(() => { setMoving(false); setTurn(who === 'user' ? 'opponent' : 'user') }, 900)
    }

    if (adjusted !== pos) {
      setTimeout(() => commit(adjusted), 650)
    } else {
      commit(pos)
    }
  }

  function finishGame(who: Turn) {
    const other = who === 'user' ? posOpp : posUser
    setWinner(other >= LAST ? 'both' : who)
    setMoving(false)
  }

  function restart() {
    setPosUser(0); setPosOpp(0); setTurn('user'); setDice(0)
    setRolling(false); setMoving(false); setTileMsg(null); setPressure(null); setMicro(null); setWinner(null)
  }

  function roll() {
    if (rolling || moving || winner) return
    setRolling(true)
    let ticks = 0
    const spin = setInterval(() => {
      setDice(1 + Math.floor(Math.random() * 6))
      if (++ticks > 8) {
        clearInterval(spin)
        const value = 1 + Math.floor(Math.random() * 4)   // 1-4 keeps the game tight
        setDice(value)
        setRolling(false)
        stepMove(value)
      }
    }, 70)
  }

  function stepMove(steps: number) {
    setMoving(true)
    setTileMsg(null)
    const who = turn
    const from = who === 'user' ? posUser : posOpp
    const target = Math.min(LAST, from + steps)
    let cur = from
    const walk = setInterval(() => {
      cur += 1
      if (who === 'user') setPosUser(cur); else setPosOpp(cur)
      if (cur >= target) {
        clearInterval(walk)
        setTimeout(() => landOn(target, who), 250)
      }
    }, 230)
  }

  return (
    <div className="flex flex-col h-full px-5 pt-14 pb-6"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)' }}>

      {/* Turn bar */}
      <div className="flex items-center justify-between mb-4">
        <Token emoji="🧑" label={t.you} active={turn==='user'} />
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color:'rgba(255,255,255,0.35)' }}>
          {winner ? t.finish : turn==='user' ? t.yourTurn : t.sofiaTurn}
        </div>
        <Token emoji={MOCK_PROFILE.emoji} label={t.sofia} active={turn==='opponent'} />
      </div>

      {/* Board — serpentine 4x4 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Array.from({ length: BOARD_SIZE }).map((_, raw) => {
          const row = Math.floor(raw / 4)
          const col = raw % 4
          // serpentine index
          const idx = row % 2 === 0 ? raw : row * 4 + (3 - col)
          const st  = TILE_STYLE[BOARD_TILES[idx].type]
          const here = []
          if (posUser === idx) here.push('🧑')
          if (posOpp === idx)  here.push(MOCK_PROFILE.emoji)
          const isEnd = idx === LAST
          return (
            <div key={raw} className="relative rounded-xl flex items-center justify-center"
              style={{
                aspectRatio:'1', fontSize:11,
                background:`${st.color}14`,
                border:`1px solid ${st.color}${isEnd?'aa':'33'}`,
                transition:'all 0.3s ease',
              }}>
              <span style={{ position:'absolute', top:3, left:5, fontSize:9, color:`${st.color}cc`, fontWeight:700 }}>
                {idx === 0 ? '★' : isEnd ? '🏁' : idx}
              </span>
              <span style={{ fontSize:13, opacity:0.5 }}>{st.emoji}</span>
              {here.length > 0 && (
                <div className="absolute flex gap-0.5" style={{ bottom:2 }}>
                  {here.map((e,i)=>(
                    <span key={i} style={{ fontSize:15, filter:`drop-shadow(0 0 4px ${st.color})` }}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tile event panel */}
      <div className="rounded-2xl px-5 py-4 min-h-[78px] flex flex-col justify-center"
        style={{
          background:'rgba(255,255,255,0.04)',
          border:`1px solid ${tileMsg ? tileMsg.color+'55' : 'rgba(255,255,255,0.08)'}`,
          transition:'border-color 0.4s ease',
        }}>
        {tileMsg ? (
          <div style={{ animation:'fadeIn 0.4s ease both' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[15px]">{tileMsg.emoji}</span>
              <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color:tileMsg.color }}>{tileMsg.label}</span>
            </div>
            <div className="text-[15px] font-semibold text-white leading-snug">{tileMsg.text}</div>
            {pressure && <div className="text-[12px] italic mt-1.5" style={{ color:'#c4a3ff', animation:'fadeIn 0.5s ease both' }}>{pressure}</div>}
          </div>
        ) : (
          <div className="text-[13px] text-center" style={{ color:'rgba(255,255,255,0.3)' }}>
            {rolling ? t.rolling : moving ? '...' : turn==='user' ? t.roll + ' 🎲' : t.sofiaTurn}
          </div>
        )}
      </div>

      {/* Dice + roll */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center justify-center rounded-2xl text-[34px]"
          style={{ width:64, height:64, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                   transform: rolling ? 'rotate(12deg)' : 'none', transition:'transform 0.1s' }}>
          {DICE[dice] || '🎲'}
        </div>
        <button onClick={roll} disabled={turn!=='user' || rolling || moving || !!winner}
          className="flex-1 rounded-2xl py-4 text-[16px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-30"
          style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
          {rolling ? t.rolling : turn==='user' ? t.roll : t.sofiaTurn}
        </button>
      </div>

      <button onClick={() => navigate('game_select')}
        className="mt-3 w-full text-[13px] font-medium py-1.5 active:opacity-60 transition-opacity cursor-pointer"
        style={{ color:'rgba(255,255,255,0.25)' }}>
        {t.back}
      </button>

      {/* Win overlay */}
      {winner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8"
          style={{ background:'rgba(6,6,10,0.85)', backdropFilter:'blur(8px)', animation:'fadeIn 0.3s ease both' }}>
          <div className="w-full rounded-3xl p-7 text-center"
            style={{ background:'linear-gradient(160deg,#160c16,#0e0814)', border:'1px solid rgba(253,41,123,0.3)',
                     animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="text-[44px] mb-3">{winner==='both' ? '🤝' : winner==='user' ? '🏆' : '🎲'}</div>
            <div className="text-[19px] font-extrabold text-white mb-5 leading-snug"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {winner==='both' ? t.bothWin : winner==='user' ? t.youWin : `${MOCK_PROFILE.name} ${t.finish}`}
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={restart}
                className="w-full rounded-2xl py-3.5 text-[15px] font-bold cursor-pointer active:scale-95 transition-transform"
                style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)' }}>
                {t.playAgain}
              </button>
              <button onClick={() => navigate('game_select')}
                className="w-full rounded-2xl py-3 text-[13px] font-bold cursor-pointer active:scale-95 transition-transform"
                style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.12)' }}>
                {t.tryAnother}
              </button>
              <button onClick={() => navigate('bet')}
                className="w-full text-[13px] font-medium py-1.5 active:opacity-60 transition-opacity cursor-pointer"
                style={{ color:'rgba(255,255,255,0.35)' }}>
                {t.lockDuel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(0.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes microPop { 0%{opacity:0;transform:translate(-50%,8px)} 15%{opacity:1;transform:translate(-50%,0)} 80%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* Micro-feedback toast (dopamine) */}
      {micro && !winner && (
        <div className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-bold pointer-events-none z-40"
          style={{ bottom:120, background:'rgba(253,41,123,0.15)', color:'#ff8fb5',
                   border:'1px solid rgba(253,41,123,0.3)', animation:'microPop 1.5s ease both' }}>
          {micro}
        </div>
      )}
    </div>
  )
}

function Token({ emoji, label, active }: { emoji:string; label:string; active:boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ opacity: active ? 1 : 0.4, transition:'opacity 0.3s' }}>
      <div className="flex items-center justify-center rounded-full text-[16px]"
        style={{ width:34, height:34,
                 background: active ? 'rgba(253,41,123,0.2)' : 'rgba(255,255,255,0.05)',
                 border: active ? '1.5px solid #fd297b' : '1.5px solid transparent',
                 boxShadow: active ? '0 0 14px rgba(253,41,123,0.5)' : 'none' }}>
        {emoji}
      </div>
      <span className="text-[12px] font-semibold" style={{ color:'rgba(255,255,255,0.6)' }}>{label}</span>
    </div>
  )
}
