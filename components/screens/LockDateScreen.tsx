'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { getCurrentMatch } from '@/lib/profiles'

type Phase = 'intro' | 'confirming' | 'waiting' | 'accepted' | 'postAccept' | 'hesitated'

// Streak tracker (persists across navigations within session)
let _attempts = 0
function getAttempts() { return _attempts }
function addAttempt() { _attempts++ }

export default function LockDateScreen() {
  const { navigate, lang } = useApp()
  const match = getCurrentMatch()
  if (!match) return <div className="flex items-center justify-center h-full" style={{background:"#0a0a10"}}><div className="text-center"><div className="text-[14px] text-white/40">No player selected</div></div></div>
  const [phase, setPhase] = useState<Phase>('intro')
  const [dots, setDots]   = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = useCallback((fn:()=>void,ms:number)=>{timers.current.push(setTimeout(fn,ms))},[])
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[])

  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [phase])

  const attempts = getAttempts()

  function confirm() {
    setPhase('confirming')
    later(() => {
      setPhase('waiting')
      addAttempt()
      // 40% accept — success feels earned
      const waitTime = 3000 + Math.random() * 5000
      later(() => {
        setPhase(Math.random() < 0.40 ? 'accepted' : 'hesitated')
      }, waitTime)
    }, 1200 + Math.random() * 800)
  }

  function onAcceptContinue() { setPhase('postAccept') }

  // Streak-aware hesitate messages
  const hesitateLine = attempts <= 1
    ? (lang==='gr' ? 'δεν ήταν αρκετό ακόμα.' : 'not enough yet.')
    : attempts === 2
    ? (lang==='gr' ? 'ακόμα προσπαθείς;' : 'still trying?')
    : (lang==='gr' ? 'είσαι επίμονος… μου αρέσει αυτό.' : "you're persistent… I like that.")

  // Post-accept Sofia message
  const postMsg = lang==='gr'
    ? (Math.random()<0.5 ? 'λοιπόν… πότε με βγάζεις;' : 'το κλείδωσες. τώρα απόδειξέ το.')
    : (Math.random()<0.5 ? 'so… when are you taking me out?' : 'you locked it. now prove it.')

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 relative overflow-hidden"
      style={{ background:'radial-gradient(ellipse at 50% 40%, rgba(253,41,123,0.142) 0%, transparent 60%), linear-gradient(170deg, #0a0a10 0%, #0a0614 100%)' }}>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="text-center w-full max-w-[340px]" style={{ animation:'fadeUp 0.5s ease both' }}>
          <div className="text-[52px] mb-6">🔒</div>
          <h1 className="text-[26px] font-extrabold text-white tracking-tight mb-3 leading-tight"
            style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {lang==='gr' ? 'Έτοιμος να το κάνεις αληθινό;' : 'Ready to make this real?'}
          </h1>
          <div className="text-[20px] font-bold mb-4" style={{ color:'#ff3384' }}>
            {lang==='gr' ? 'Αυτό δεν είναι πια παιχνίδι.' : "This is not a game anymore."}
          </div>
          <p className="text-[14px] leading-relaxed mb-2" style={{ color:'rgba(255,255,255,0.531)', whiteSpace:'pre-line' }}>
            {lang==='gr' ? 'Αν συμφωνήσετε κι οι δύο, το ραντεβού κλειδώνει.\nΑν κάποιος εξαφανιστεί, χάνει.' : "If you both agree, the date is locked.\nIf someone disappears, they lose."}
          </p>
          {attempts > 0 && (
            <p className="text-[12px] italic mb-3" style={{ color:'rgba(253,41,123,0.708)' }}>
              {lang==='gr' ? `προσπάθεια #${attempts+1}` : `attempt #${attempts+1}`}
            </p>
          )}
          <p className="text-[12px] italic mb-8" style={{ color:'rgba(253,41,123,0.531)' }}>
            {lang==='gr' ? 'αυτό απαιτεί δέσμευση.' : 'this requires commitment.'}
          </p>
          <button onClick={confirm}
            className="w-full rounded-2xl py-[18px] text-[16px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff', boxShadow:'0 12px 40px rgba(253,41,123,0.472)' }}>
            {lang==='gr' ? "Είμαι μέσα. Κλείδωσέ το." : "I'm in. Lock it."}
          </button>
          <button onClick={() => navigate('chat')}
            className="w-full text-[13px] font-medium py-3 mt-2 active:opacity-60 transition-opacity cursor-pointer"
            style={{ color:'rgba(255,255,255,0.295)' }}>
            {lang==='gr' ? '← πίσω' : '← back'}
          </button>
        </div>
      )}

      {/* ── CONFIRMING ── */}
      {phase === 'confirming' && (
        <div className="text-center" style={{ animation:'fadeUp 0.3s ease both' }}>
          <div className="text-[48px] mb-4" style={{ animation:'lockSpin 1.2s ease both' }}>🔐</div>
          <div className="text-[16px] font-bold text-white/60">{lang==='gr' ? 'κλειδώνει...' : 'locking...'}</div>
        </div>
      )}

      {/* ── WAITING ── */}
      {phase === 'waiting' && (
        <div className="text-center w-full max-w-[340px]" style={{ animation:'fadeUp 0.4s ease both' }}>
          <div className="relative inline-block mb-6">
            <div className="absolute inset-[-12px] rounded-full"
              style={{ background:'rgba(253,41,123,0.177)', animation:'waitPulse 2s ease-in-out infinite' }} />
            <div className="w-20 h-20 rounded-full overflow-hidden relative z-10"
              style={{ border:'3px solid rgba(253,41,123,0.472)' }}>
              <img src={match.photo} alt={match.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <h2 className="text-[20px] font-extrabold text-white mb-2">
            {lang==='gr' ? `Περιμένουμε τη ${match.name}...` : `Waiting for ${match.name}...`}
          </h2>
          <div className="text-[14px] mb-4" style={{ color:'rgba(255,255,255,0.472)' }}>
            {lang==='gr' ? 'αυτή αποφασίζει τώρα.' : "she's deciding right now."}
          </div>
          <div className="text-[13px] italic" style={{ color:'rgba(253,41,123,0.708)' }}>
            {match.name} {lang==='gr'?'σκέφτεται':'is thinking'}{dots}
          </div>
        </div>
      )}

      {/* ── ACCEPTED ── */}
      {phase === 'accepted' && (
        <div className="text-center w-full max-w-[340px]" style={{ animation:'celebReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background:'radial-gradient(circle at 50% 40%, rgba(253,41,123,0.236) 0%, transparent 50%)',
            animation:'glowPulse 2s ease-in-out infinite',
          }} />
          <div className="text-[64px] mb-4 relative z-10">🎉</div>
          <h2 className="text-[24px] font-extrabold text-white mb-1 relative z-10">
            {lang==='gr' ? `Η ${match.name} δέχτηκε.` : `${match.name} accepted.`}
          </h2>
          <p className="text-[15px] mb-8 relative z-10" style={{ color:'rgba(253,41,123,0.944)' }}>
            {lang==='gr' ? 'τώρα μην τα χαλάσεις.' : "now don't ruin it."}
          </p>
          <button onClick={onAcceptContinue}
            className="w-full rounded-2xl py-[17px] text-[16px] font-bold active:scale-95 transition-transform cursor-pointer relative z-10"
            style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff', boxShadow:'0 12px 40px rgba(253,41,123,0.472)' }}>
            {lang==='gr' ? 'Συνέχεια →' : 'Continue →'}
          </button>
        </div>
      )}

      {/* ── POST-ACCEPT (match's response) ── */}
      {phase === 'postAccept' && (
        <div className="text-center w-full max-w-[340px]" style={{ animation:'fadeUp 0.5s ease both' }}>
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4"
            style={{ border:'3px solid rgba(253,41,123,0.472)', boxShadow:'0 0 20px rgba(253,41,123,0.354)' }}>
            <img src={match.photo} alt={match.name} className="w-full h-full object-cover" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-2" style={{ color:'rgba(253,41,123,0.708)' }}>
            {match.name}
          </div>
          <div className="text-[20px] font-bold text-white mb-8 italic" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            "{postMsg}"
          </div>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => navigate('chat')}
              className="w-full rounded-2xl py-[16px] text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.413)' }}>
              {lang==='gr' ? 'Συνέχισε κουβέντα' : 'Continue chatting'}
            </button>
            <button onClick={() => navigate('profile')}
              className="w-full rounded-2xl py-[14px] text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background:'rgba(255,255,255,0.071)', color:'rgba(255,255,255,0.708)', border:'1px solid rgba(255,255,255,0.118)' }}>
              {lang==='gr' ? 'Κανόνισε το ραντεβού' : 'Plan the date'}
            </button>
          </div>
        </div>
      )}

      {/* ── HESITATED ── */}
      {phase === 'hesitated' && (
        <div className="text-center w-full max-w-[340px]" style={{ animation:'fadeUp 0.5s ease both' }}>
          <div className="text-[48px] mb-4">😬</div>
          <h2 className="text-[22px] font-extrabold text-white mb-2">
            {lang==='gr' ? `Η ${match.name} δίστασε...` : `${match.name} hesitated…`}
          </h2>
          <p className="text-[15px] font-semibold mb-2" style={{ color:'rgba(253,41,123,0.826)' }}>{hesitateLine}</p>
          <p className="text-[13px] mb-8" style={{ color:'rgba(255,255,255,0.413)' }}>
            {lang==='gr' ? 'ίσως χρειάζεσαι άλλον γύρο.' : 'maybe you need another round.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => navigate('game_select')}
              className="w-full rounded-2xl py-[16px] text-[15px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff', boxShadow:'0 12px 36px rgba(253,41,123,0.413)' }}>
              {lang==='gr' ? 'Παίξε ξανά' : 'Play again'}
            </button>
            <button onClick={() => navigate('chat')}
              className="w-full rounded-2xl py-[14px] text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background:'rgba(255,255,255,0.071)', color:'rgba(255,255,255,0.708)', border:'1px solid rgba(255,255,255,0.118)' }}>
              {lang==='gr' ? 'Προσπάθησε πιο σκληρά' : 'Try harder'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lockSpin { 0%{transform:scale(0.5) rotate(-20deg);opacity:0} 60%{transform:scale(1.15) rotate(5deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes waitPulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.3);opacity:0.6} }
        @keyframes celebReveal { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  )
}
