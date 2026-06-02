'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'

const TRACK = 20
const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅']

type Turn = 'user' | 'sofia'

export default function LudoScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].games

  const [posU, setPosU]       = useState(0)
  const [posS, setPosS]       = useState(0)
  const [turn, setTurn]       = useState<Turn>('user')
  const [dice, setDice]       = useState(0)
  const [rolling, setRolling] = useState(false)
  const [moving, setMoving]   = useState(false)
  const [winner, setWinner]   = useState<Turn|null>(null)
  const [thinking, setThinking] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[])
  const later=(fn:()=>void,ms:number)=>{timers.current.push(setTimeout(fn,ms))}

  function roll() {
    if(rolling||moving||winner) return
    if(turn==='sofia') { setThinking(true); later(()=>{setThinking(false); doRoll()}, 800+Math.random()*800); return }
    doRoll()
  }

  function doRoll() {
    setRolling(true)
    let ticks=0
    const spin=setInterval(()=>{
      setDice(1+Math.floor(Math.random()*6))
      if(++ticks>8){
        clearInterval(spin)
        const val=1+Math.floor(Math.random()*6)
        setDice(val); setRolling(false); stepMove(val)
      }
    },70)
  }

  function stepMove(steps:number) {
    setMoving(true)
    const from = turn==='user' ? posU : posS
    const target = Math.min(TRACK, from+steps)
    let cur=from
    const walk=setInterval(()=>{
      cur+=1
      if(turn==='user') setPosU(cur); else setPosS(cur)
      if(cur>=target){
        clearInterval(walk)
        later(()=>{
          setMoving(false)
          if(target>=TRACK){ setWinner(turn); return }
          setTurn(turn==='user'?'sofia':'user')
        },300)
      }
    },180)
  }

  function restart() {
    timers.current.forEach(clearTimeout); timers.current=[]
    setPosU(0);setPosS(0);setTurn('user');setDice(0);setRolling(false);setMoving(false);setWinner(null);setThinking(false)
  }

  return (
    <div className="flex flex-col h-full px-5 pt-14 pb-6 items-center"
      style={{background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)'}}>

      <div className="flex items-center justify-between w-full mb-4">
        <button onClick={()=>navigate('game_select')} className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">← {t.back}</button>
        <div className="text-[11px] font-bold tracking-[0.5px]" style={{color:'rgba(167,139,250,0.85)'}}>
          {lang==='gr'?'🏁 πρώτος στο τέλος κερδίζει':'🏁 first to finish wins'}
        </div>
      </div>

      {/* Turn */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2" style={{opacity:turn==='user'?1:0.4,transition:'opacity 0.3s'}}>
          <span className="text-[20px]">🧑</span>
          <span className="text-white/60 text-[12px] font-bold">{t.you}</span>
        </div>
        <div className="text-[12px] font-bold" style={{color:thinking?'#a78bfa':'#fd297b'}}>
          {thinking ? t.thinking : turn==='user' ? t.yourTurn : t.sofiaTurn}
        </div>
        <div className="flex items-center gap-2" style={{opacity:turn==='sofia'?1:0.4,transition:'opacity 0.3s'}}>
          <span className="text-white/60 text-[12px] font-bold">{t.sofia}</span>
          <span className="text-[20px]">👩</span>
        </div>
      </div>

      {/* Track */}
      <div className="w-full flex flex-wrap gap-1.5 justify-center mb-6">
        {Array.from({length:TRACK+1}).map((_,i)=>{
          const here:string[]=[]
          if(posU===i) here.push('🧑')
          if(posS===i) here.push('👩')
          const isStart=i===0, isEnd=i===TRACK
          return (
            <div key={i} className="relative rounded-lg flex items-center justify-center"
              style={{
                width:48, height:42,
                background: isEnd ? 'rgba(253,41,123,0.2)' : isStart ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                border: isEnd ? '1px solid rgba(253,41,123,0.5)' : '1px solid rgba(255,255,255,0.08)',
                transition:'all 0.2s',
              }}>
              <span style={{position:'absolute',top:2,left:4,fontSize:8,color:'rgba(255,255,255,0.25)',fontWeight:700}}>
                {isStart?'★':isEnd?'🏁':i}
              </span>
              {here.length>0 ? (
                <div className="flex gap-0.5">{here.map((e,j)=><span key={j} style={{fontSize:18,filter:'drop-shadow(0 0 4px rgba(253,41,123,0.5))'}}>{e}</span>)}</div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Dice + roll */}
      {!winner && (
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl text-[34px]"
            style={{width:64,height:64,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',
                    transform:rolling?'rotate(12deg)':'none',transition:'transform 0.1s'}}>
            {DICE_FACE[dice]||'🎲'}
          </div>
          <button onClick={roll} disabled={rolling||moving||thinking}
            className="flex-1 rounded-2xl py-4 text-[16px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-30"
            style={{background:'linear-gradient(135deg,#fd297b,#ff655b)',color:'#fff',boxShadow:'0 12px 36px rgba(253,41,123,0.35)'}}>
            {thinking ? t.thinking : rolling ? t.rolling : turn==='user' ? t.roll : (lang==='gr'?'ρίξε για τη sofia':'roll for sofia')}
          </button>
        </div>
      )}

      {/* Winner */}
      {winner && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full" style={{animation:'fadeIn 0.4s ease both'}}>
          <div className="text-[48px] mb-2">{winner==='user'?'🏆':'🎲'}</div>
          <div className="text-[20px] font-extrabold text-white mb-1">
            {winner==='user' ? (lang==='gr'?'Κέρδισες!':'You win!') : (lang==='gr'?'Η Sofia κέρδισε.':'Sofia wins.')}
          </div>
          <div className="text-[14px] mb-6" style={{color:'rgba(255,255,255,0.4)'}}>
            {lang==='gr'?'Πρώτη στο τέλος.':'First to the finish.'}
          </div>
          <div className="w-full flex flex-col gap-2.5">
            <button onClick={restart} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'linear-gradient(135deg,#fd297b,#ff655b)',color:'#fff',boxShadow:'0 12px 36px rgba(253,41,123,0.35)'}}>{t.playAgain}</button>
            <button onClick={()=>navigate('game_select')} className="w-full rounded-2xl py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.1)'}}>{t.tryAnother}</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}
