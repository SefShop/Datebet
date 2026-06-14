'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { getOpponentName } from '@/lib/gameInvites'
import { APP_COPY } from '@/lib/copy'
import { setLastGameResult } from '@/lib/chatAI'
import GameChat from '@/components/ui/GameChat'
import type { GameEvent } from '@/lib/chat'

const ROWS=6, COLS=7, EMPTY=0, P1=1, P2=2, BEST_OF=3
type Board = number[][]
const mk = (): Board => Array.from({length:ROWS},()=>Array(COLS).fill(EMPTY))

function drop(b:Board,col:number,p:number):[Board,number]|null {
  for(let r=ROWS-1;r>=0;r--) if(b[r][col]===EMPTY){ const n=b.map(r=>[...r]); n[r][col]=p; return [n,r] }
  return null
}

function check4(b:Board): {winner:number; cells:[number,number][]}|null {
  const dirs=[[0,1],[1,0],[1,1],[1,-1]]
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(b[r][c]===EMPTY) continue
    const p=b[r][c]
    for(const [dr,dc] of dirs){
      const cells:Array<[number,number]>=[]
      let ok=true
      for(let i=0;i<4;i++){ const nr=r+dr*i,nc=c+dc*i; if(nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p){ok=false;break}; cells.push([nr,nc]) }
      if(ok) return {winner:p, cells}
    }
  }
  return null
}

function isFull(b:Board){return b[0].every(c=>c!==EMPTY)}

function aiMove(b:Board): number {
  const valid=(col:number)=>b[0][col]===EMPTY
  // Win if possible
  for(let c=0;c<COLS;c++){ if(!valid(c))continue; const r=drop(b,c,P2); if(r&&check4(r[0])?.winner===P2)return c }
  // Block player
  for(let c=0;c<COLS;c++){ if(!valid(c))continue; const r=drop(b,c,P1); if(r&&check4(r[0])?.winner===P1)return c }
  // Center preference
  const pref=[3,2,4,1,5,0,6]
  for(const c of pref) if(valid(c)) return c
  return 0
}

function nearWin(b:Board,player:number):boolean {
  for(let c=0;c<COLS;c++){ const r=drop(b,c,player); if(r&&check4(r[0])?.winner===player) return true }
  return false
}

export default function Connect4Screen() {
  const { navigate, lang } = useApp()
  const oppName = getOpponentName() || (lang==='gr'?'Αντίπαλος':'Opponent')
  const t = APP_COPY[lang].games
  const [board, setBoard] = useState<Board>(mk)
  const [turn, setTurn]   = useState<1|2>(1)
  const [result, setResult] = useState<{winner:number;cells:[number,number][]}|null>(null)
  const [score, setScore] = useState([0,0])
  const [round, setRound] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const streakRef = useRef(0)
  const [chatEvent, setChatEvent] = useState<GameEvent>('idle')
  const [chatKey, setChatKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

  function play(col:number) {
    if(turn!==1||result||aiThinking) return
    const r=drop(board,col,P1)
    if(!r) return
    const [nb]=r
    setBoard(nb)
    setChatEvent(nearWin(nb,P1)?'near_win':'user_move');setChatKey(k=>k+1)
    const w=check4(nb)
    if(w){ endRound(w); return }
    if(isFull(nb)){ endRound(null); return }
    setTurn(2); setAiThinking(true)
    timer.current=setTimeout(()=>{
      const ac=aiMove(nb)
      const ar=drop(nb,ac,P2)
      if(!ar){setAiThinking(false);return}
      const [ab]=ar
      setBoard(ab); setAiThinking(false)
      setChatEvent(score[1]-score[0]>=2?'losing_bad':'ai_move');setChatKey(k=>k+1)
      const aw=check4(ab)
      if(aw){ endRound(aw); return }
      if(isFull(ab)){ endRound(null); return }
      setTurn(1)
    }, 600+Math.random()*600)
  }

  function endRound(w:{winner:number;cells:[number,number][]}|null) {
    setResult(w)
    if(w){
      if(w.winner===P1){ streakRef.current++; setChatEvent(streakRef.current>=2?'streak':'user_win');setChatKey(k=>k+1) }
      else{ streakRef.current=0; setChatEvent('ai_win');setChatKey(k=>k+1) }
    }
    if(w) {
      const ns=[...score]; ns[w.winner-1]++; setScore(ns)
      if(ns[0]>=Math.ceil(BEST_OF/2)||ns[1]>=Math.ceil(BEST_OF/2)) { setGameOver(true); if(ns[0]>=Math.ceil(BEST_OF/2))setLastGameResult('won');else setLastGameResult('lost') }
    }
  }

  function nextRound() {
    setBoard(mk()); setResult(null); setTurn(1); setRound(r=>r+1); setAiThinking(false)
  }

  function restart() {
    setBoard(mk()); setResult(null); setScore([0,0]); setRound(1); setTurn(1); setGameOver(false); setAiThinking(false); setChatKey(0); setChatEvent('idle'); streakRef.current=0
  }

  const winSet = new Set(result?.cells?.map(([r,c])=>`${r}-${c}`)??[])
  const seriesWinner = score[0]>=Math.ceil(BEST_OF/2) ? 'you' : score[1]>=Math.ceil(BEST_OF/2) ? 'sofia' : null

  return (
    <div className="flex flex-col h-full px-4 pt-10 pb-2 items-center overflow-y-auto"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)' }}>

      <div className="flex items-center justify-between w-full mb-3">
        <button onClick={()=>navigate('game_select')} className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">← {t.back}</button>
        <div className="text-[11px] font-bold tracking-[1px] uppercase" style={{color:'rgba(255,255,255,0.3)'}}>
          {lang==='gr'?'γύρος':'round'} {round}/{BEST_OF}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{background:'#fd297b'}} />
          <span className="text-white font-bold text-[18px]">{score[0]}</span>
          <span className="text-white/40 text-[12px]">{t.you}</span>
        </div>
        <span className="text-white/20 text-[12px] font-bold">{t.vs}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[12px]">{oppName}</span>
          <span className="text-white font-bold text-[18px]">{score[1]}</span>
          <div className="w-6 h-6 rounded-full" style={{background:'#facc15'}} />
        </div>
      </div>

      {/* Turn indicator */}
      <div className="text-[13px] font-bold mb-3" style={{color: aiThinking ? '#facc15' : '#fd297b'}}>
        {aiThinking ? t.thinking : result ? '' : turn===1 ? t.yourTurn : t.sofiaTurn}
      </div>

      {/* Board */}
      <div className="rounded-2xl p-2 mb-4" style={{background:'rgba(30,40,80,0.5)', border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${COLS}, 1fr)`}}>
          {board.flatMap((row,r)=>row.map((_,c)=>{
            const v=board[r][c]
            const isWin=winSet.has(`${r}-${c}`)
            return (
              <button key={`${r}-${c}`} onClick={()=>play(c)}
                className="rounded-full transition-all duration-200"
                style={{
                  width:34, height:34,
                  background: v===P1 ? '#fd297b' : v===P2 ? '#facc15' : 'rgba(255,255,255,0.06)',
                  border: isWin ? '2px solid #fff' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isWin ? '0 0 12px rgba(255,255,255,0.5)' : v ? `0 2px 8px ${v===P1?'rgba(253,41,123,0.4)':'rgba(250,204,21,0.4)'}` : 'none',
                  cursor: turn===1&&!result&&!aiThinking ? 'pointer' : 'default',
                  animation: v && !isWin ? 'dropIn 0.3s ease both' : isWin ? 'winPulse 0.6s ease infinite alternate' : 'none',
                }} />
            )
          }))}
        </div>
      </div>

      {/* Round result */}
      {result && !gameOver && (
        <div className="text-center mb-4" style={{animation:'fadeIn 0.4s ease both'}}>
          <div className="text-[18px] font-bold text-white mb-2">
            {result.winner===P1 ? (lang==='gr'?'Κέρδισες τον γύρο!':'You won this round!') : (lang==='gr'?'Ο αντίπαλος κέρδισε.':'Opponent won this one.')}
          </div>
          <button onClick={nextRound}
            className="rounded-2xl px-8 py-3 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff'}}>
            {lang==='gr'?'Επόμενος γύρος →':'Next round →'}
          </button>
        </div>
      )}
      {result && !result.winner && !gameOver && (
        <div className="text-center mb-4" style={{animation:'fadeIn 0.4s ease both'}}>
          <div className="text-[18px] font-bold text-white mb-2">{lang==='gr'?'Ισοπαλία!':'Draw!'}</div>
          <button onClick={nextRound}
            className="rounded-2xl px-8 py-3 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff'}}>
            {lang==='gr'?'Επόμενος γύρος →':'Next round →'}
          </button>
        </div>
      )}

      {/* Series over */}
      {gameOver && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full" style={{animation:'fadeIn 0.4s ease both'}}>
          <div className="text-[48px] mb-2">{seriesWinner==='you'?'🏆':'🎲'}</div>
          <div className="text-[20px] font-extrabold text-white mb-1">
            {seriesWinner==='you' ? (lang==='gr'?'Νίκησες!':'You won!') : (lang==='gr'?'Ο αντίπαλος κέρδισε τη σειρά.':'Opponent won the series.')}
          </div>
          <div className="text-[14px] mb-6" style={{color:'rgba(255,255,255,0.4)'}}>
            {score[0]} – {score[1]}
          </div>
          <div className="w-full flex flex-col gap-2.5">
            <button onClick={restart} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.35)'}}>{t.playAgain}</button>
            <button onClick={()=>navigate('game_select')} className="w-full rounded-2xl py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)'}}>{t.tryAnother}</button>
            <button onClick={()=>navigate('post_game')} className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
              style={{color:'rgba(255,255,255,0.35)'}}>{lang==='gr'?'Συνέχεια →':'Continue →'}</button>
          </div>
        </div>
      )}

      <GameChat lang={lang} event={chatEvent} eventKey={chatKey} />

      <style>{`
        @keyframes dropIn { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes winPulse { from{transform:scale(1)} to{transform:scale(1.12)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
