'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Lang } from '@/lib/copy'
import { GameEvent, QUICK_MSGS, FLIRT_OPTIONS, getSofiaResponse, getPrompt, getToast, shouldRespond } from '@/lib/chat'

interface Msg { from: 'user' | 'sofia'; text: string }

interface Props {
  lang: Lang
  event: GameEvent
  eventKey: number
}

export default function GameChat({ lang, event, eventKey }: Props) {
  const [msgs, setMsgs]         = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [typing, setTyping]     = useState(false)
  const [prompt, setPrompt]     = useState(getPrompt('idle', lang))
  const [flirtOpen, setFlirtOpen] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = useCallback((fn:()=>void,ms:number) => { timers.current.push(setTimeout(fn,ms)) }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  // React to game events
  useEffect(() => {
    if (eventKey === 0) return
    setPrompt(getPrompt(event, lang))

    // Skip some responses (60% for moves, 100% for wins/context)
    if (!shouldRespond(event)) return

    // Small floating toast (~40% of the time)
    if (Math.random() < 0.4) {
      setToast(getToast(lang))
      later(() => setToast(null), 1500)
    }

    // Sofia typing → response (variable realistic delay)
    const baseDelay = 800 + Math.random() * 1200   // 0.8–2s
    const pauseChance = Math.random() < 0.25        // 25% chance of pause-type-pause

    if (pauseChance) {
      // Pause → typing → pause → message (feels like rethinking)
      later(() => setTyping(true), 300)
      later(() => setTyping(false), 300 + 600)       // brief stop
      later(() => setTyping(true), 300 + 600 + 400)  // resume
      later(() => {
        setTyping(false)
        setMsgs(m => [...m, { from: 'sofia', text: getSofiaResponse(event, lang) }])
      }, baseDelay + 800)
    } else {
      // Normal: type → message
      later(() => setTyping(true), 300)
      later(() => {
        setTyping(false)
        setMsgs(m => [...m, { from: 'sofia', text: getSofiaResponse(event, lang) }])
      }, baseDelay)
    }
  }, [eventKey]) // eslint-disable-line

  function send(text: string) {
    if (!text.trim()) return
    setMsgs(m => [...m, { from: 'user', text: text.trim() }])
    setInput(''); setFlirtOpen(false)
    // Sofia occasionally replies to user messages too
    if (Math.random() < 0.5) {
      later(() => setTyping(true), 600)
      later(() => {
        setTyping(false)
        setMsgs(m => [...m, { from: 'sofia', text: getSofiaResponse('idle', lang) }])
      }, 1200 + Math.random() * 800)
    }
  }

  const pills = flirtOpen ? FLIRT_OPTIONS[lang] : QUICK_MSGS[lang]

  return (
    <div className="flex flex-col w-full flex-shrink-0" style={{ maxHeight: '40vh' }}>

      {/* Toast */}
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold pointer-events-none z-50"
          style={{ top:48, background:'rgba(253,41,123,0.12)', color:'rgba(253,41,123,0.75)',
                   border:'1px solid rgba(253,41,123,0.2)', animation:'toast 1.5s ease both' }}>
          {toast}
        </div>
      )}

      {/* Prompt */}
      <div className="px-3 py-1.5 text-center">
        <span className="text-[10px] font-bold tracking-[0.3px] italic" style={{ color:'rgba(253,41,123,0.55)' }}>
          💡 {prompt}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 space-y-1" style={{ scrollbarWidth:'none', minHeight:60, maxHeight:120 }}>
        {msgs.slice(-10).map((m, i) => (
          <div key={i} className={`flex ${m.from==='user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation:'msgSlide 0.3s ease both' }}>
            <div className="max-w-[78%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug"
              style={{
                background: m.from==='user' ? 'linear-gradient(135deg,#fd297b,#ff655b)' : 'rgba(255,255,255,0.07)',
                color: m.from==='user' ? '#fff' : 'rgba(255,255,255,0.75)',
                borderBottomRightRadius: m.from==='user' ? 4 : 14,
                borderBottomLeftRadius: m.from==='sofia' ? 4 : 14,
              }}>
              {m.from==='sofia' && <span className="text-[9px] font-bold block mb-0.5" style={{color:'#a78bfa'}}>Sofia</span>}
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start" style={{animation:'msgSlide 0.2s ease both'}}>
            <div className="rounded-2xl px-3 py-1.5 text-[11px]" style={{background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.35)'}}>
              <span className="inline-flex items-center gap-1">
                Sofia {lang==='gr'?'γράφει':'is typing'}
                <span className="inline-flex gap-px ml-0.5">
                  {[0,1,2].map(i=><span key={i} className="inline-block rounded-full bg-white/30"
                    style={{width:3,height:3,animation:`dot ${0.8}s ${i*0.15}s infinite ease-in-out`}} />)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pills */}
      <div className="flex items-center gap-1 px-3 py-1 overflow-x-auto" style={{scrollbarWidth:'none'}}>
        <button onClick={() => setFlirtOpen(!flirtOpen)}
          className="flex-shrink-0 text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          style={{background: flirtOpen ? 'rgba(253,41,123,0.25)' : 'rgba(253,41,123,0.12)',
                  border:`1px solid ${flirtOpen?'rgba(253,41,123,0.4)':'rgba(253,41,123,0.2)'}`}}>
          🔥
        </button>
        {pills.map((q, i) => (
          <button key={`${flirtOpen}-${i}`} onClick={() => send(q)}
            className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            style={{background: flirtOpen ? 'rgba(253,41,123,0.1)' : 'rgba(255,255,255,0.05)',
                    color: flirtOpen ? '#ff8fb5' : 'rgba(255,255,255,0.5)',
                    border:`1px solid ${flirtOpen?'rgba(253,41,123,0.2)':'rgba(255,255,255,0.06)'}`}}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-3 pb-1">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') send(input) }}
          placeholder={lang==='gr' ? 'πες κάτι...' : 'say something...'}
          className="flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none"
          style={{background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid rgba(255,255,255,0.07)', caretColor:'#fd297b'}} />
        <button onClick={() => send(input)} disabled={!input.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-25"
          style={{background:'linear-gradient(135deg,#fd297b,#ff655b)'}}>
          <span className="text-white text-[13px]">↑</span>
        </button>
      </div>

      <style>{`
        @keyframes msgSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dot { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }
        @keyframes toast { 0%{opacity:0;transform:translate(-50%,6px)} 12%{opacity:1;transform:translate(-50%,0)} 82%{opacity:1} 100%{opacity:0;transform:translate(-50%,-4px)} }
      `}</style>
    </div>
  )
}
