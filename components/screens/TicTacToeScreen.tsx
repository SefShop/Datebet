'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { getOpponentName } from '@/lib/gameInvites'
import { APP_COPY } from '@/lib/copy'
import { setLastGameResult } from '@/lib/chatAI'
import GameChat from '@/components/ui/GameChat'
import type { GameEvent } from '@/lib/chat'

const EMPTY='', X='X', O='O', BEST_OF=5
type Cell = ''|'X'|'O'
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWin(b:Cell[]):{winner:Cell;line:number[]}|null {
  for(const l of WINS) if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[1]]===b[l[2]]) return {winner:b[l[0]],line:l}
  return null
}
function isDraw(b:Cell[]){return b.every(c=>c!==EMPTY)&&!checkWin(b)}

function aiMove(b:Cell[]):number {
  const empty=(i:number)=>b[i]===EMPTY
  // Win
  for(let i=0;i<9;i++){if(!empty(i))continue;const t=[...b];t[i]=O;if(checkWin(t)?.winner===O)return i}
  // Block
  for(let i=0;i<9;i++){if(!empty(i))continue;const t=[...b];t[i]=X;if(checkWin(t)?.winner===X)return i}
  // Center, corners, edges
  if(empty(4))return 4
  const corners=[0,2,6,8].filter(empty)
  if(corners.length)return corners[Math.floor(Math.random()*corners.length)]
  const edges=[1,3,5,7].filter(empty)
  return edges[Math.floor(Math.random()*edges.length)]
}

function nearWinTTT(b:Cell[]):boolean {
  for(let i=0;i<9;i++){if(b[i]!==EMPTY)continue;const t=[...b];t[i]=X;if(checkWin(t)?.winner===X)return true}
  return false
}

export default function TicTacToeScreen() {
  const { navigate, lang } = useApp()
  const oppName = getOpponentName() || (lang==='gr'?'Αντίπαλος':'Opponent')
  const t = APP_COPY[lang].games
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(EMPTY))
  const [turn, setTurn]   = useState<'X'|'O'>('X')
  const [result, setResult] = useState<{winner:Cell;line:number[]}|null>(null)
  const [draw, setDraw]   = useState(false)
  const [score, setScore] = useState([0,0])
  const [round, setRound] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const streakRef = useRef(0)
  const [chatEvent, setChatEvent] = useState<GameEvent>('idle')
  const [chatKey, setChatKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

  function play(i:number) {
    if(board[i]!==EMPTY||turn!=='X'||result||draw||aiThinking) return
    const nb=[...board]; nb[i]=X; setBoard(nb)
    setChatEvent(nearWinTTT(nb)?'near_win':'user_move'); setChatKey(k=>k+1)
    const w=checkWin(nb)
    if(w){endRound(w);return}
    if(isDraw(nb)){endRound(null);return}
    setTurn('O'); setAiThinking(true)
    timer.current=setTimeout(()=>{
      const ac=aiMove(nb)
      const ab=[...nb]; ab[ac]=O; setBoard(ab); setAiThinking(false)
      setChatEvent(score[1]-score[0]>=2?'losing_bad':'ai_move'); setChatKey(k=>k+1)
      const aw=checkWin(ab)
      if(aw){endRound(aw);return}
      if(isDraw(ab)){endRound(null);return}
      setTurn('X')
    }, 400+Math.random()*400)
  }

  function endRound(w:{winner:Cell;line:number[]}|null) {
    if(w){setResult(w)
      if(w.winner===X){streakRef.current++;setChatEvent(streakRef.current>=2?'streak':'user_win')}else{streakRef.current=0;setChatEvent('ai_win')}
      setChatKey(k=>k+1);const ns=[...score];ns[w.winner===X?0:1]++;setScore(ns);if(ns[0]>=Math.ceil(BEST_OF/2)||ns[1]>=Math.ceil(BEST_OF/2))setGameOver(true); if(ns[0]>=Math.ceil(BEST_OF/2))setLastGameResult('won');else setLastGameResult('lost')}
    else { setDraw(true); setChatEvent('draw'); setChatKey(k=>k+1) }
  }

  function nextRound() {
    setBoard(Array(9).fill(EMPTY)); setResult(null); setDraw(false); setTurn('X'); setRound(r=>r+1); setAiThinking(false)
  }
  function restart() {
    nextRound(); setScore([0,0]); setRound(1); setGameOver(false); setChatKey(0); setChatEvent('idle'); streakRef.current=0
  }

  const winSet=new Set(result?.line??[])
  const sw=score[0]>=Math.ceil(BEST_OF/2)?'you':score[1]>=Math.ceil(BEST_OF/2)?'sofia':null

  return (
    <div className="flex flex-col h-full px-5 pt-10 pb-2 items-center overflow-y-auto"
      style={{background:'linear-gradient(170deg, #06060a 0%, #0d0614 55%, #080610 100%)'}}>

      <div className="flex items-center justify-between w-full mb-3">
        <button onClick={()=>navigate('game_select')} className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">← {t.back}</button>
        <div className="text-[11px] font-bold tracking-[1px] uppercase" style={{color:'rgba(255,255,255,0.3)'}}>
          {lang==='gr'?'γύρος':'round'} {round}/{BEST_OF}
        </div>
      </div>

      <div className="flex items-center gap-5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[22px] font-black" style={{color:'#fd297b'}}>✕</span>
          <span className="text-white font-bold text-[18px]">{score[0]}</span>
          <span className="text-white/40 text-[12px]">{t.you}</span>
        </div>
        <span className="text-white/20 text-[12px] font-bold">{t.vs}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[12px]">{oppName}</span>
          <span className="text-white font-bold text-[18px]">{score[1]}</span>
          <span className="text-[22px] font-black" style={{color:'#38bdf8'}}>○</span>
        </div>
      </div>

      <div className="text-[13px] font-bold mb-5" style={{color: aiThinking?'#38bdf8':'#fd297b'}}>
        {aiThinking ? t.thinking : result||draw ? '' : turn==='X' ? t.yourTurn : t.sofiaTurn}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 mb-6" style={{width:224}}>
        {board.map((cell,i) => {
          const isWin=winSet.has(i)
          return (
            <button key={i} onClick={()=>play(i)}
              className="rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{
                width:70, height:70,
                background: isWin ? 'rgba(253,41,123,0.2)' : 'rgba(255,255,255,0.04)',
                border: isWin ? '2px solid #fd297b' : '1px solid rgba(255,255,255,0.08)',
                cursor: cell===EMPTY&&turn==='X'&&!result&&!draw&&!aiThinking ? 'pointer' : 'default',
              }}>
              {cell && (
                <span className="text-[36px] font-black" style={{
                  color: cell==='X' ? '#fd297b' : '#38bdf8',
                  animation:'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>{cell==='X'?'✕':'○'}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Round result */}
      {(result||draw) && !gameOver && (
        <div className="text-center mb-4" style={{animation:'fadeIn 0.4s ease both'}}>
          <div className="text-[18px] font-bold text-white mb-2">
            {draw ? (lang==='gr'?'Ισοπαλία!':'Draw!') :
             result?.winner===X ? (lang==='gr'?'Κέρδισες!':'You won!') : (lang==='gr'?'Ο αντίπαλος κέρδισε.':'Opponent won.')}
          </div>
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
          <div className="text-[48px] mb-2">{sw==='you'?'🏆':'❌'}</div>
          <div className="text-[20px] font-extrabold text-white mb-1">
            {sw==='you' ? (lang==='gr'?'Νίκησες!':'You win!') : (lang==='gr'?'Ο αντίπαλος κέρδισε.':'Opponent wins.')}
          </div>
          <div className="text-[14px] mb-6" style={{color:'rgba(255,255,255,0.4)'}}>{score[0]} – {score[1]}</div>
          <div className="w-full flex flex-col gap-2.5">
            <button onClick={restart} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'linear-gradient(135deg,#fd297b,#ff655b)',color:'#fff',boxShadow:'0 12px 36px rgba(253,41,123,0.35)'}}>{t.playAgain}</button>
            <button onClick={()=>navigate('game_select')} className="w-full rounded-2xl py-3 text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.1)'}}>{t.tryAnother}</button>
            <button onClick={()=>navigate('post_game')} className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
              style={{color:'rgba(255,255,255,0.35)'}}>{lang==='gr'?'Συνέχεια →':'Continue →'}</button>
          </div>
        </div>
      )}

      <GameChat lang={lang} event={chatEvent} eventKey={chatKey} />

      <style>{`
        @keyframes popIn { from{transform:scale(0)} to{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
