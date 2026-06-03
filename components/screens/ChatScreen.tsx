'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { getCurrentMatch } from '@/lib/profiles'
import { generateResponse, getMood, resetMood, QUICK, FLIRT_QUICK } from '@/lib/chatAI'

interface Msg { from: 'user'|'sofia'; text: string; type?: 'read' }

export default function ChatScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].dating
  const match = getCurrentMatch()

  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const [flirt, setFlirt]     = useState(false)
  const [showExit, setShowExit] = useState(false)
  const sheLeftFired = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([])
  const msgCount  = useRef(0)
  const later = useCallback((fn:()=>void,ms:number)=>{timers.current.push(setTimeout(fn,ms))},[])

  useEffect(() => { resetMood(); return () => timers.current.forEach(clearTimeout) }, [])
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'})},[msgs,typing])

  function pushMsg(m: Msg) { setMsgs(prev => [...prev, m]) }

  function send(text: string) {
    if (!text.trim()) return
    pushMsg({ from:'user', text:text.trim() })
    setInput(''); setFlirt(false)

    const resp = generateResponse(msgCount.current, text.trim(), lang)
    msgCount.current++

    // IGNORE behavior (20%)
    if (resp.behavior === 'ignore') {
      later(() => pushMsg({ from:'sofia', text: lang==='gr'?'διαβάστηκε':'read', type:'read' }), 800)
      return
    }

    // TYPING pattern: start → maybe pause → resume → send
    const typingStart = Math.min(resp.delay * 0.3, 600)
    later(() => setTyping(true), typingStart)

    // 30% chance: stop/start typing (feels like rethinking)
    if (Math.random() < 0.30) {
      later(() => setTyping(false), typingStart + 500 + Math.random() * 400)
      later(() => setTyping(true), typingStart + 900 + Math.random() * 300)
    }

    // Send messages with correction + stagger
    let offset = resp.delay
    resp.messages.forEach((text, i) => {
      const t2 = i === 0 && resp.correction ? `${resp.correction} ${text}` : text
      later(() => {
        setTyping(false)
        pushMsg({ from:'sofia', text:t2 })
        // If more messages coming, restart typing briefly
        if (i < resp.messages.length - 1) later(() => setTyping(true), 300)
      }, offset)
      offset += 800 + Math.random() * 600  // stagger between double msgs
    })

    // Exit CTA after enough exchanges
    if (msgCount.current >= 5 && !showExit) {
      later(() => setShowExit(true), offset + 2000)
    }

    // "She left" moment: rare, creates tension (once per session)
    if (msgCount.current >= 7 && !sheLeftFired.current && Math.random() < 0.3) {
      sheLeftFired.current = true
      const comeback = 20000 + Math.random() * 20000  // 20-40s
      later(() => {
        pushMsg({ from:'sofia', text: lang==='gr' ? 'sorry, αποσπάστηκα 😅' : 'got distracted 😅' })
      }, comeback)
    }
  }

  const pills = flirt ? FLIRT_QUICK[lang] : QUICK[lang]
  const mood = getMood()
  const moodEmoji = mood === 'playful' ? '😄' : mood === 'cold' ? '😐' : '😏'

  return (
    <div className="flex flex-col h-full" style={{ background:'#06060a' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(6,6,10,0.95)', backdropFilter:'blur(12px)' }}>
        <button onClick={() => navigate('profile')} className="text-white/40 text-[16px] mr-1 active:opacity-60 cursor-pointer">←</button>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ border:'2px solid rgba(253,41,123,0.3)' }}>
          <img src={match.photo} alt={match.name} className="w-full h-full object-cover"
            onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-white truncate">{match.name} <span className="text-[12px]">{moodEmoji}</span></div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: match.online?'#4ade80':'#555' }} />
            <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.4)' }}>
              {typing ? (lang==='gr'?'γράφει...':'typing...') : match.online ? (lang==='gr'?'online':'online now') : (lang==='gr'?'πρόσφατα':'active 2m ago')}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ scrollbarWidth:'none' }}>
        {msgs.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[40px] mb-3">👋</div>
            <div className="text-[14px] text-white/40">
              {lang==='gr' ? `Γράψε στη ${match.name}` : `Message ${match.name}`}
            </div>
          </div>
        )}

        {msgs.map((m,i) => (
          <div key={i}>
            {m.type === 'read' ? (
              <div className="text-center text-[11px] py-1" style={{ color:'rgba(255,255,255,0.25)', animation:'msgSlide 0.3s ease both' }}>
                ✓✓ {m.text}
              </div>
            ) : (
              <div className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}
                style={{ animation:'msgSlide 0.3s ease both' }}>
                {m.from==='sofia' && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                    <img src={match.photo} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="max-w-[78%] rounded-2xl px-4 py-2.5"
                  style={{
                    background: m.from==='user' ? 'linear-gradient(135deg,#fd297b,#ff655b)' : 'rgba(255,255,255,0.07)',
                    color: m.from==='user' ? '#fff' : 'rgba(255,255,255,0.85)',
                    borderBottomRightRadius: m.from==='user' ? 4 : 18,
                    borderBottomLeftRadius: m.from==='sofia' ? 4 : 18,
                    fontSize:14, lineHeight:'1.45',
                  }}>
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="flex justify-start" style={{ animation:'msgSlide 0.2s ease both' }}>
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
              <img src={match.photo} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl px-4 py-2.5" style={{ background:'rgba(255,255,255,0.05)' }}>
              <span className="inline-flex gap-1">
                {[0,1,2].map(i=><span key={i} className="inline-block rounded-full bg-white/30"
                  style={{width:5,height:5,animation:`dot 0.8s ${i*0.18}s infinite ease-in-out`}} />)}
              </span>
            </div>
          </div>
        )}

        {showExit && (
          <div className="text-center py-4" style={{ animation:'fadeUp 0.5s ease both' }}>
            <div className="text-[13px] italic mb-3" style={{ color:'rgba(253,41,123,0.55)' }}>
              {lang==='gr' ? 'φαντάσου αυτό… στην πραγματικότητα.' : "imagine this… in real life."}
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigate('game_select')}
                className="px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
                style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
                {t.rematchBtn}
              </button>
              <button onClick={() => navigate('lock_date')}
                className="px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
                style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff' }}>
                {t.lockDate}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick pills */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto"
        style={{ scrollbarWidth:'none', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={() => setFlirt(!flirt)}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] active:scale-90 transition-transform cursor-pointer"
          style={{ background:flirt?'rgba(253,41,123,0.25)':'rgba(253,41,123,0.1)', border:`1px solid ${flirt?'rgba(253,41,123,0.4)':'rgba(253,41,123,0.2)'}` }}>
          🔥
        </button>
        {pills.map((q,i) => (
          <button key={`${flirt}-${i}`} onClick={() => send(q)}
            className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            style={{ background:flirt?'rgba(253,41,123,0.1)':'rgba(255,255,255,0.05)',
                     color:flirt?'#ff8fb5':'rgba(255,255,255,0.5)',
                     border:`1px solid ${flirt?'rgba(253,41,123,0.2)':'rgba(255,255,255,0.06)'}` }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 pb-6 pt-1.5">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') send(input) }}
          placeholder={lang==='gr' ? 'πες κάτι...' : 'say something...'}
          className="flex-1 rounded-full px-4 py-3 text-[14px] outline-none"
          style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', caretColor:'#fd297b' }} />
        <button onClick={() => send(input)} disabled={!input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-25"
          style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)' }}>
          <span className="text-white text-[16px]">↑</span>
        </button>
      </div>

      <style>{`
        @keyframes msgSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dot { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
